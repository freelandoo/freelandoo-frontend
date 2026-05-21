"use client";

import { useCallback, useEffect, useState } from "react";
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
import { TourContext } from "./useTour";
import { TourManager } from "./TourManager";
import { trackTourEvent } from "./tourAnalytics";

type ProgressMap = Record<string, { status: TourStatus; current_step: number }>;

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
        next[item.tour_key] = { status: item.status, current_step: item.current_step };
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
    setProgress((prev) => ({ ...prev, [tourKey]: { status: "in_progress", current_step: 0 } }));
    void startTourProgress(tourKey, 0);
    trackTourEvent("tour_started", { tour_key: tourKey, step_id: found.steps[0]?.id || "", page: pathname || "" });
  }, [pathname]);

  const completeTour = (tourKey: TourKey) => {
    setProgress((prev) => ({ ...prev, [tourKey]: { status: "completed", current_step: stepIndex } }));
    setActiveTour(null);
    void completeTourProgress(tourKey, stepIndex);
    trackTourEvent("tour_completed", { tour_key: tourKey, step_id: String(stepIndex), page: pathname || "" });
  };

  const skipTour = (tourKey: TourKey) => {
    setProgress((prev) => ({ ...prev, [tourKey]: { status: "skipped", current_step: stepIndex } }));
    setActiveTour(null);
    void skipTourProgress(tourKey, stepIndex);
    trackTourEvent("tour_skipped", { tour_key: tourKey, step_id: String(stepIndex), page: pathname || "" });
  };

  const resetTour = (tourKey: TourKey) => {
    setProgress((prev) => ({ ...prev, [tourKey]: { status: "not_started", current_step: 0 } }));
    void resetTourProgress(tourKey);
  };

  // Auto-start do walkthrough desativado em 2026-05-21. A descoberta agora é via
  // hover-hints (<HoverHint>) e o walkthrough completo só inicia manualmente
  // pela Central de Ajuda — sem modal surpresa ao navegar.

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
