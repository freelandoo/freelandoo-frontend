"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { EXPLORE_CHAIN, TOUR_CONFIGS, type TourConfig, type TourKey } from "./tourConfig";
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
import { isTourSnoozed, snoozeTour as persistSnooze } from "./snoozedTours";
import { fetchIntentStatus } from "@/features/intent/intentApi";

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
  const router = useRouter();
  const [progress, setProgress] = useState<ProgressMap>({});
  const [hideAllTours, setHideAllToursState] = useState(false);
  const [activeTour, setActiveTour] = useState<TourConfig | null>(null);
  const [stepIndex, setStepIndex] = useState(0);
  // Auto-start só pode rodar depois que carregamos o progress do backend —
  // senão uma resposta lenta sobrescreve um "skipped" recém-aplicado e o
  // tour volta a disparar.
  const [progressLoaded, setProgressLoaded] = useState(false);
  // Gate adicional: nenhum tour auto-start pode rodar antes do
  // BirthdateGate e do IntentModal serem resolvidos. Resolvido =
  // status do intent retornou com dismissed=true OU selected_path_key set
  // (= usuário já passou pelo modal "ganhar dinheiro"). Se age ainda não
  // foi preenchida, fetchIntentStatus retorna null/paths vazios →
  // continuamos esperando. Tours disparados manualmente via startTour()
  // (ex.: affiliate_path/explore_path_* do IntentModal) NÃO são gateados
  // por aqui — esses devem rodar imediatamente quando o usuário clica.
  const [onboardingResolved, setOnboardingResolved] = useState(false);

  useEffect(() => {
    let mounted = true;
    fetchTourProgress().then((items) => {
      if (!mounted) return;
      // Merge: não apaga entradas que o usuário acabou de mudar localmente
      // (ex.: clicou "Não quero" enquanto o GET ainda estava em voo).
      setProgress((prev) => {
        const next: ProgressMap = { ...prev };
        items.forEach((item) => {
          next[item.tour_key] = {
            status: item.status,
            current_step: item.current_step,
            seen_version: item.seen_version ?? 1,
          };
        });
        return next;
      });
      setProgressLoaded(true);
    });
    fetchTourSettings().then((settings) => {
      if (!mounted) return;
      setHideAllToursState(!!settings.hide_all_tours);
    });
    return () => {
      mounted = false;
    };
  }, []);

  // Verifica resolução do onboarding (BirthdateGate + IntentModal). Refaz
  // o fetch quando "auth:changed" (login/logout) ou "intent:resolved"
  // (dispatched pelo IntentModal após escolher/dispensar) disparam.
  useEffect(() => {
    let mounted = true;
    const check = async () => {
      const status = await fetchIntentStatus();
      if (!mounted) return;
      if (!status) {
        // status null = age ainda não resolvida OU sem token. Não libera.
        setOnboardingResolved(false);
        return;
      }
      const resolved =
        !!status.state.dismissed || !!status.state.selected_path_key;
      setOnboardingResolved(resolved);
    };
    void check();
    const onResolved = () => setOnboardingResolved(true);
    const onAuth = () => void check();
    window.addEventListener("intent:resolved", onResolved);
    window.addEventListener("auth:changed", onAuth);
    return () => {
      mounted = false;
      window.removeEventListener("intent:resolved", onResolved);
      window.removeEventListener("auth:changed", onAuth);
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

    // Encadeamento dos mini-tours "Explorar": após completar o tour atual,
    // navega para a próxima rota e dispara o próximo tour. O delay dá
    // tempo do router.push trocar a página antes do balão reaparecer.
    const chain = EXPLORE_CHAIN[tourKey];
    if (chain) {
      router.push(chain.route);
      window.setTimeout(() => startTour(chain.nextKey), 450);
    }
  };

  const skipTour = (tourKey: TourKey) => {
    const version = tourVersion(tourKey);
    // Trava na sessão também: se a persistência falhar, o ref ainda impede
    // o auto-start de re-disparar antes do usuário sair e voltar.
    dismissedThisVisitRef.current.add(tourKey);
    setProgress((prev) => ({ ...prev, [tourKey]: { status: "skipped", current_step: stepIndex, seen_version: version } }));
    setActiveTour(null);
    void skipTourProgress(tourKey, stepIndex, version);
    trackTourEvent("tour_skipped", { tour_key: tourKey, step_id: String(stepIndex), page: pathname || "" });
  };

  // Tours "Pulados" nesta sessão de navegação: não re-disparam até o usuário
  // sair e voltar à página (ou recarregar). Reseta quando o pathname muda.
  const dismissedThisVisitRef = useRef<Set<TourKey>>(new Set());

  // "Ver depois" no botão do tour: fecha agora, reaparece automaticamente
  // após 24h (persistido em localStorage via snoozedTours). Não persiste
  // como "skipped" — para skip permanente existe "Não quero".
  const snoozeTour = (tourKey: TourKey) => {
    persistSnooze(tourKey);
    dismissedThisVisitRef.current.add(tourKey);
    setProgress((prev) => ({ ...prev, [tourKey]: { status: "not_started", current_step: 0, seen_version: 1 } }));
    setActiveTour(null);
    void resetTourProgress(tourKey);
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

  // Limpa o set de tours dismissados quando o usuário troca de página
  // (sair e voltar reabre a possibilidade de auto-start).
  useEffect(() => {
    dismissedThisVisitRef.current = new Set();
  }, [pathname]);

  useEffect(() => {
    if (!progressLoaded) return;
    // Gate: nenhum auto-start até o BirthdateGate e o IntentModal serem
    // resolvidos. Manual startTour() (via IntentModal) não passa por aqui.
    if (!onboardingResolved) return;
    if (hideAllTours) return;
    if (activeTour) return;
    if (!pathname) return;
    const candidate = eligibleTours.find((tour) => {
      if (!pathMatches(tour.pagePath, pathname)) return false;
      if (dismissedThisVisitRef.current.has(tour.tourKey)) return false;
      if (isTourSnoozed(tour.tourKey)) return false;
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
  }, [pathname, hideAllTours, activeTour, eligibleTours, progress, progressLoaded, onboardingResolved]);

  const value = {
    startTour,
    completeTour,
    skipTour,
    snoozeTour,
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
        // "Ver depois" / ESC: fecha agora e reaparece após 24h.
        onSkip={() => activeTour && snoozeTour(activeTour.tourKey)}
        // "Não quero" / "Não mostrar novamente": skip permanente.
        onDontShowAgain={() => {
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
