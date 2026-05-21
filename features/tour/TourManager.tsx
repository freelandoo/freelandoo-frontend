"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import type { TourConfig, TourStepAction } from "./tourConfig";
import { useTranslations } from "@/components/i18n/I18nProvider";

interface TourManagerProps {
  tour: TourConfig | null;
  stepIndex: number;
  onStepChange: (idx: number) => void;
  onComplete: () => void;
  onSkip: () => void;
  onDontShowAgain?: () => void;
  onStepAction?: (action: TourStepAction | undefined) => void;
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

export function TourManager({ tour, stepIndex, onStepChange, onComplete, onSkip, onDontShowAgain, onStepAction, onStepViewed, onCtaClick }: TourManagerProps) {
  const t = useTranslations("Tour");
  const [pos, setPos] = useState<Pos>({ top: 24, left: 24 });
  const [spotlight, setSpotlight] = useState<{ top: number; left: number; width: number; height: number } | null>(null);
  const step = useMemo(() => (tour ? tour.steps[stepIndex] : null), [tour, stepIndex]);
  const prevStepRef = useRef<{ id: string; onLeave?: TourStepAction } | null>(null);

  useEffect(() => {
    if (!step) {
      const prev = prevStepRef.current;
      if (prev?.onLeave) onStepAction?.(prev.onLeave);
      prevStepRef.current = null;
      return;
    }
    const prev = prevStepRef.current;
    if (prev && prev.id !== step.id && prev.onLeave) onStepAction?.(prev.onLeave);
    if (step.onEnter) onStepAction?.(step.onEnter);
    prevStepRef.current = { id: step.id, onLeave: step.onLeave };

    const recompute = () => {
      setPos(getStepPosition(step.target || step.fallbackTarget));
      const target = step.target || step.fallbackTarget;
      if (!target) {
        setSpotlight(null);
        return;
      }
      const el = document.querySelector(target);
      if (!el) {
        setSpotlight(null);
        return;
      }
      const rect = el.getBoundingClientRect();
      setSpotlight({
        top: Math.max(6, rect.top - 6),
        left: Math.max(6, rect.left - 6),
        width: rect.width + 12,
        height: rect.height + 12,
      });
    };

    // Recompute on next frame to let `onEnter` mutate the DOM (e.g., open a dropside).
    const raf = requestAnimationFrame(() => {
      recompute();
      // Second pass after open animations (~250ms).
      const timeout = window.setTimeout(recompute, 280);
      (recompute as unknown as { __timeout?: number }).__timeout = timeout;
    });

    onStepViewed?.(step.id);

    return () => {
      cancelAnimationFrame(raf);
      const timeout = (recompute as unknown as { __timeout?: number }).__timeout;
      if (typeof timeout === "number") window.clearTimeout(timeout);
    };
  }, [step, onStepViewed, onStepAction]);

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
            {t("seeLater", "Ver depois")}
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
        {onDontShowAgain ? (
          <button
            type="button"
            onClick={() => { onCtaClick?.(step.id); onDontShowAgain(); }}
            className="mt-3 block w-full text-center text-[11px] uppercase tracking-[0.14em] text-zinc-400 underline-offset-4 hover:text-amber-200 hover:underline"
          >
            {t("dontWant", "Não quero")}
          </button>
        ) : null}
      </section>
    </>
  );
}
