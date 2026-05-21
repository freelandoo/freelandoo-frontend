"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { TOUR_CONFIGS, type TourConfig, type TourKey } from "./tourConfig";
import {
  completeTourProgress,
  fetchTourProgress,
  fetchTourSettings,
  resetTourProgress,
  setHideAllTours as persistHideAllTours,
  skipTourProgress,
  startTourProgress,
  type TourStatus,
} from "./tourService";
import { TourContext, type TourActionName } from "./useTour";
import { TourManager } from "./TourManager";
import { trackTourEvent } from "./tourAnalytics";
import { markPathVisited } from "./visitedPaths";

type ProgressMap = Record<string, { status: TourStatus; current_step: number; seen_version: number }>;

function pathMatches(pagePaths: string[] | undefined, currentPath: string | null) {
  if (!currentPath || !pagePaths || pagePaths.length === 0) return false;
  return pagePaths.some((prefix) => currentPath === prefix || currentPath.startsWith(`${prefix}/`));
}

function tourVersion(tourKey: TourKey) {
  return TOUR_CONFIGS.find((tour) => tour.tourKey === tourKey)?.version ?? 1;
}

export function TourProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [progress, setProgress] = useState<ProgressMap>({});
  const [hideAllTours, setHideAllToursState] = useState(false);
  const [activeTour, setActiveTour] = useState<TourConfig | null>(null);
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    let mounted = true;
    fetchTourProgress().then((items) => {
      if (!mounted) return;
      const next: ProgressMap = {};
      items.forEach((item) => {
        next[item.tour_key] = {
          status: item.status,
          current_step: item.current_step,
          seen_version: item.seen_version ?? 1,
        };
      });
      setProgress(next);
    });
    fetchTourSettings().then((settings) => {
      if (!mounted) return;
      setHideAllToursState(!!settings.hide_all_tours);
    });
    return () => {
      mounted = false;
    };
  }, []);

  const startTour = useCallback((tourKey: TourKey) => {
    const found = TOUR_CONFIGS.find((tour) => tour.tourKey === tourKey);
    if (!found) return;
    setActiveTour(found);
    setStepIndex(0);
    setProgress((prev) => ({ ...prev, [tourKey]: { status: "in_progress", current_step: 0, seen_version: found.version } }));
    void startTourProgress(tourKey, 0, found.version);
    trackTourEvent("tour_started", { tour_key: tourKey, step_id: found.steps[0]?.id || "", page: pathname || "" });
  }, [pathname]);

  const completeTour = (tourKey: TourKey) => {
    const version = tourVersion(tourKey);
    setProgress((prev) => ({ ...prev, [tourKey]: { status: "completed", current_step: stepIndex, seen_version: version } }));
    setActiveTour(null);
    void completeTourProgress(tourKey, stepIndex, version);
    trackTourEvent("tour_completed", { tour_key: tourKey, step_id: String(stepIndex), page: pathname || "" });
  };

  const skipTour = (tourKey: TourKey) => {
    const version = tourVersion(tourKey);
    setProgress((prev) => ({ ...prev, [tourKey]: { status: "skipped", current_step: stepIndex, seen_version: version } }));
    setActiveTour(null);
    void skipTourProgress(tourKey, stepIndex, version);
    trackTourEvent("tour_skipped", { tour_key: tourKey, step_id: String(stepIndex), page: pathname || "" });
  };

  const resetTour = (tourKey: TourKey) => {
    setProgress((prev) => ({ ...prev, [tourKey]: { status: "not_started", current_step: 0, seen_version: 1 } }));
    void resetTourProgress(tourKey);
  };

  const actionsRef = useRef<Map<TourActionName, Set<() => void>>>(new Map());

  const registerAction = useCallback((name: TourActionName, fn: () => void) => {
    const map = actionsRef.current;
    if (!map.has(name)) map.set(name, new Set());
    map.get(name)!.add(fn);
    return () => {
      map.get(name)?.delete(fn);
    };
  }, []);

  const runAction = useCallback((name: TourActionName | undefined) => {
    if (!name) return;
    actionsRef.current.get(name)?.forEach((fn) => {
      try {
        fn();
      } catch {
        // ignore — ação registrada falhou; tour segue
      }
    });
  }, []);

  const eligibleTours = useMemo(
    () => TOUR_CONFIGS.filter((tour) => tour.autoStart && tour.pagePath && tour.pagePath.length > 0),
    [],
  );

  const previousPathRef = useRef<string | null>(null);
  useEffect(() => {
    const prev = previousPathRef.current;
    if (prev && prev !== pathname) markPathVisited(prev);
    previousPathRef.current = pathname || null;
  }, [pathname]);

  useEffect(() => {
    if (hideAllTours) return;
    if (activeTour) return;
    if (!pathname) return;
    const candidate = eligibleTours.find((tour) => {
      if (!pathMatches(tour.pagePath, pathname)) return false;
      const p = progress[tour.tourKey];
      // Nunca visto → dispara.
      if (!p || p.status === "not_started") return true;
      // Já visto, mas o tour subiu de versão desde então → reexibe.
      return (p.seen_version ?? 1) < tour.version;
    });
    if (!candidate) return;
    setActiveTour(candidate);
    setStepIndex(0);
    setProgress((prev) => ({
      ...prev,
      [candidate.tourKey]: { status: "in_progress", current_step: 0, seen_version: candidate.version },
    }));
    void startTourProgress(candidate.tourKey, 0, candidate.version);
    trackTourEvent("tour_started", { tour_key: candidate.tourKey, step_id: candidate.steps[0]?.id || "", page: pathname });
  }, [pathname, hideAllTours, activeTour, eligibleTours, progress]);

  const value = {
    startTour,
    completeTour,
    skipTour,
    resetTour,
    hideAllTours,
    setHideAllTours: (value: boolean) => {
      setHideAllToursState(value);
      void persistHideAllTours(value);
    },
    getStatus: (tourKey: TourKey) => progress[tourKey]?.status || "not_started",
    registerAction,
    runAction,
  };

  return (
    <TourContext.Provider value={value}>
      {children}
      <TourManager
        tour={activeTour}
        stepIndex={stepIndex}
        onStepChange={setStepIndex}
        onComplete={() => activeTour && completeTour(activeTour.tourKey)}
        onSkip={() => activeTour && skipTour(activeTour.tourKey)}
        onDontShowAgain={() => {
          // Por-página: encerra apenas o tour atual (skipped). Os tours de
          // outras páginas seguem aparecendo. O opt-out global de todos os
          // tours fica no toggle da Central de Ajuda (hide_all_tours).
          if (activeTour) skipTour(activeTour.tourKey);
        }}
        onStepAction={runAction}
        onStepViewed={(stepId) =>
          trackTourEvent("tour_step_viewed", {
            tour_key: activeTour?.tourKey || "",
            step_id: stepId,
            page: pathname || "",
            step_index: stepIndex,
          })
        }
        onCtaClick={(stepId) =>
          trackTourEvent("tour_cta_clicked", { tour_key: activeTour?.tourKey || "", step_id: stepId, page: pathname || "" })
        }
      />
    </TourContext.Provider>
  );
}
