"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import type { TourConfig } from "./tourConfig";
import { useTranslations } from "@/components/i18n/I18nProvider";

interface TourManagerProps {
  tour: TourConfig | null;
  stepIndex: number;
  onStepChange: (idx: number) => void;
  onComplete: () => void;
  onSkip: () => void;
  onStepViewed?: (stepId: string) => void;
  onCtaClick?: (stepId: string) => void;
}

type Pos = { top: number; left: number };

function getStepPosition(target?: string): Pos {
  if (!target) return { top: 24, left: 24 };
  const el = document.querySelector(target);
  if (!el) return { top: 24, left: 24 };
  const rect = el.getBoundingClientRect();
  return {
    top: Math.min(window.innerHeight - 220, Math.max(24, rect.bottom + 12)),
    left: Math.min(window.innerWidth - 360, Math.max(24, rect.left)),
  };
}

export function TourManager({ tour, stepIndex, onStepChange, onComplete, onSkip, onStepViewed, onCtaClick }: TourManagerProps) {
  const t = useTranslations("Tour");
  const [pos, setPos] = useState<Pos>({ top: 24, left: 24 });
  const [spotlight, setSpotlight] = useState<{ top: number; left: number; width: number; height: number } | null>(null);
  const step = useMemo(() => (tour ? tour.steps[stepIndex] : null), [tour, stepIndex]);

  useEffect(() => {
    if (!step) return;
    setPos(getStepPosition(step.target || step.fallbackTarget));
    const target = step.target || step.fallbackTarget;
    if (!target) {
      setSpotlight(null);
    } else {
      const el = document.querySelector(target);
      if (!el) {
        setSpotlight(null);
      } else {
        const rect = el.getBoundingClientRect();
        setSpotlight({
          top: Math.max(6, rect.top - 6),
          left: Math.max(6, rect.left - 6),
          width: rect.width + 12,
          height: rect.height + 12,
        });
      }
    }
    onStepViewed?.(step.id);
  }, [step, onStepViewed]);

  useEffect(() => {
    function onEsc(event: KeyboardEvent) {
      if (event.key === "Escape") onSkip();
    }
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [onSkip]);

  if (!tour || !step) return null;
  const isFirst = stepIndex === 0;
  const isLast = stepIndex >= tour.steps.length - 1;

  return (
    <>
      <div className="fixed inset-0 z-[110] bg-zinc-950/55 pointer-events-none" />
      {spotlight ? (
        <div
          className="fixed z-[111] rounded-xl border border-amber-300/65 shadow-[0_0_0_9999px_rgba(0,0,0,0.52)] pointer-events-none"
          style={spotlight}
        />
      ) : null}
      <section
        aria-label={`Tour ${tour.title}`}
        className="fixed z-[120] w-[min(92vw,340px)] rounded-2xl border border-amber-400/45 bg-zinc-900/95 p-4 shadow-[0_18px_70px_rgba(0,0,0,0.5)]"
        style={{ top: pos.top, left: pos.left }}
      >
        <p className="text-xs uppercase tracking-wide text-amber-300/90">{t("label", "Tour da Colmeia")}</p>
        <h3 className="mt-1 text-base font-semibold text-amber-50">{t(`${step.id}.title`, step.title)}</h3>
        <p className="mt-2 text-sm leading-relaxed text-zinc-200">{t(`${step.id}.content`, step.content)}</p>
        <div className="mt-4 flex items-center justify-between gap-2">
          <Button variant="ghost" size="sm" className="text-zinc-200 hover:text-white" onClick={() => { onCtaClick?.(step.id); onSkip(); }}>
            {t("skip", "Pular")}
          </Button>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => onStepChange(Math.max(0, stepIndex - 1))} disabled={isFirst}>
              {t("back", "Voltar")}
            </Button>
            {!isLast ? (
              <Button size="sm" className="bg-amber-400 text-zinc-950 hover:bg-amber-300" onClick={() => { onCtaClick?.(step.id); onStepChange(stepIndex + 1); }}>
                {t("next", "Próximo")}
              </Button>
            ) : (
              <Button size="sm" className="bg-amber-400 text-zinc-950 hover:bg-amber-300" onClick={() => { onCtaClick?.(step.id); onComplete(); }}>
                {t("finish", "Finalizar")}
              </Button>
            )}
          </div>
        </div>
      </section>
    </>
  );
}
