"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
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
type SpotlightBox = { top: number; left: number; width: number; height: number };

const MODAL_GAP = 12;
const SAFE_MARGIN = 16;

function clampPosition(target: Element | null, modalW: number, modalH: number): Pos {
  const vw = typeof window === "undefined" ? 0 : window.innerWidth;
  const vh = typeof window === "undefined" ? 0 : window.innerHeight;
  const maxLeft = Math.max(SAFE_MARGIN, vw - modalW - SAFE_MARGIN);
  const maxTop = Math.max(SAFE_MARGIN, vh - modalH - SAFE_MARGIN);

  if (!target) {
    // Sem alvo: centraliza horizontalmente, posiciona perto do topo.
    return {
      top: Math.min(SAFE_MARGIN * 4, maxTop),
      left: Math.max(SAFE_MARGIN, Math.min((vw - modalW) / 2, maxLeft)),
    };
  }

  const rect = target.getBoundingClientRect();
  // Preferência: abaixo do alvo, alinhado à esquerda. Se não couber abaixo,
  // tenta acima. Se ainda não couber, recolhe ao topo da viewport.
  let top = rect.bottom + MODAL_GAP;
  if (top + modalH > vh - SAFE_MARGIN) {
    const above = rect.top - modalH - MODAL_GAP;
    top = above >= SAFE_MARGIN ? above : SAFE_MARGIN;
  }
  let left = rect.left;
  // Centraliza horizontalmente em viewports onde o alvo está colado na borda.
  if (left + modalW > vw - SAFE_MARGIN) left = vw - modalW - SAFE_MARGIN;
  if (left < SAFE_MARGIN) left = Math.max(SAFE_MARGIN, Math.min((vw - modalW) / 2, maxLeft));

  return {
    top: Math.max(SAFE_MARGIN, Math.min(top, maxTop)),
    left: Math.max(SAFE_MARGIN, Math.min(left, maxLeft)),
  };
}

export function TourManager({ tour, stepIndex, onStepChange, onComplete, onSkip, onDontShowAgain, onStepAction, onStepViewed, onCtaClick }: TourManagerProps) {
  const t = useTranslations("Tour");
  const [pos, setPos] = useState<Pos>({ top: SAFE_MARGIN * 4, left: SAFE_MARGIN });
  const [spotlight, setSpotlight] = useState<SpotlightBox | null>(null);
  const [mounted, setMounted] = useState(false);
  const sectionRef = useRef<HTMLElement | null>(null);
  const step = useMemo(() => (tour ? tour.steps[stepIndex] : null), [tour, stepIndex]);
  const prevStepRef = useRef<{ id: string; onLeave?: TourStepAction } | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Recompute spotlight e posição quando step muda, com 2ª pass após onEnter
  // mutar o DOM (ex.: abrir dropside).
  useEffect(() => {
    if (!step) {
      const prev = prevStepRef.current;
      if (prev?.onLeave) onStepAction?.(prev.onLeave);
      // Cleanup obrigatório ao sair de qualquer tour: fecha dropside e
      // sidebar mesmo que o step de saída não declare onLeave. Sem isso,
      // se o usuário pular o tour exatamente em um passo com
      // onEnter=openDropside (ex.: welcome-dropside-open), o dropside
      // fica aberto com backdrop fullscreen z-100 bloqueando todos os
      // cliques da página.
      onStepAction?.("closeDropside");
      onStepAction?.("closeSidebar");
      prevStepRef.current = null;
      return;
    }
    const prev = prevStepRef.current;
    if (prev && prev.id !== step.id && prev.onLeave) onStepAction?.(prev.onLeave);
    if (step.onEnter) onStepAction?.(step.onEnter);
    prevStepRef.current = { id: step.id, onLeave: step.onLeave };

    const recompute = () => {
      const selector = step.target || step.fallbackTarget;
      const el = selector ? document.querySelector(selector) : null;
      const modalW = sectionRef.current?.offsetWidth || 340;
      const modalH = sectionRef.current?.offsetHeight || 200;
      setPos(clampPosition(el, modalW, modalH));
      if (!el) {
        setSpotlight(null);
        return;
      }
      const rect = el.getBoundingClientRect();
      // Se o alvo está com tamanho 0 (oculto), não desenha spotlight.
      if (rect.width <= 1 || rect.height <= 1) {
        setSpotlight(null);
        return;
      }
      setSpotlight({
        top: Math.max(6, rect.top - 6),
        left: Math.max(6, rect.left - 6),
        width: rect.width + 12,
        height: rect.height + 12,
      });
    };

    const raf = requestAnimationFrame(() => {
      recompute();
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

  // Reposiciona em scroll/resize enquanto o tour está visível.
  useLayoutEffect(() => {
    if (!step) return;
    const onChange = () => {
      const selector = step.target || step.fallbackTarget;
      const el = selector ? document.querySelector(selector) : null;
      const modalW = sectionRef.current?.offsetWidth || 340;
      const modalH = sectionRef.current?.offsetHeight || 200;
      setPos(clampPosition(el, modalW, modalH));
      if (!el) {
        setSpotlight(null);
        return;
      }
      const rect = el.getBoundingClientRect();
      if (rect.width <= 1 || rect.height <= 1) {
        setSpotlight(null);
        return;
      }
      setSpotlight({
        top: Math.max(6, rect.top - 6),
        left: Math.max(6, rect.left - 6),
        width: rect.width + 12,
        height: rect.height + 12,
      });
    };
    window.addEventListener("resize", onChange);
    window.addEventListener("scroll", onChange, true);
    return () => {
      window.removeEventListener("resize", onChange);
      window.removeEventListener("scroll", onChange, true);
    };
  }, [step]);

  useEffect(() => {
    function onEsc(event: KeyboardEvent) {
      if (event.key === "Escape") onSkip();
    }
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [onSkip]);

  if (!tour || !step || !mounted) return null;
  const isFirst = stepIndex === 0;
  const isLast = stepIndex >= tour.steps.length - 1;

  // Renderiza via portal pra escapar de qualquer stacking context herdado.
  // Overlay e spotlight com pointer-events:none em INLINE style — alguns
  // navegadores ignoram a classe utilitária quando há especificidade maior
  // em CSS global. Section com pointer-events:auto explícito.
  return createPortal(
    <div
      // Container raiz: pointer-events none para NÃO bloquear clicks no
      // resto da página por trás. Os filhos interativos (modal) ligam
      // explicitamente pointer-events:auto.
      style={{ pointerEvents: "none" }}
    >
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 9990,
          background: "rgba(9, 9, 11, 0.55)",
          pointerEvents: "none",
        }}
      />
      {spotlight ? (
        <div
          style={{
            position: "fixed",
            top: spotlight.top,
            left: spotlight.left,
            width: spotlight.width,
            height: spotlight.height,
            zIndex: 9991,
            borderRadius: 12,
            border: "1px solid rgba(252, 211, 77, 0.65)",
            boxShadow: "0 0 0 9999px rgba(0,0,0,0.52)",
            pointerEvents: "none",
          }}
        />
      ) : null}
      <section
        ref={sectionRef}
        aria-label={`Tour ${tour.title}`}
        className="rounded-2xl border border-amber-400/45 bg-zinc-900/95 p-4 shadow-[0_18px_70px_rgba(0,0,0,0.5)]"
        style={{
          position: "fixed",
          top: pos.top,
          left: pos.left,
          width: "min(92vw, 340px)",
          zIndex: 9999,
          pointerEvents: "auto",
        }}
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
    </div>,
    document.body,
  );
}
