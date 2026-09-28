"use client";

import { useEffect, useRef } from "react";

/**
 * O PONTO DE ENERGIA — um brilho discreto que segue o cursor, só no computador.
 *
 * ⚠️ ELE NÃO SUBSTITUI O CURSOR. O ponteiro do sistema continua lá; isto é um
 * ponto de luz a mais, atrasado de leve, que cresce sobre o que é clicável. Um
 * cursor customizado no lugar do nativo erra o alvo do clique em telas de alta
 * densidade e some quando o script trava — e aí a pessoa fica sem ponteiro.
 *
 * ⚠️ SÓ EXISTE COM PONTEIRO FINO E HOVER (`(pointer: fine) and (hover:
 * hover)`). Em toque não há cursor para seguir, e um ponto parado no último
 * toque parece defeito. Com movimento reduzido, não existe.
 *
 * ⚠️ O LAÇO SÓ RODA ENQUANTO O PONTO ESTÁ ANDANDO. O `requestAnimationFrame`
 * se desliga sozinho quando o ponto alcança o cursor — parado, custa zero. E
 * ele escreve só `transform` num elemento de 10 pixels.
 */

/** O que conta como "interativo" — o ponto cresce sobre isto. */
const INTERACTIVE = "a, button, input, select, textarea, summary, [role='tab'], label";

export default function EnergyCursor() {
  const dotRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const dot = dotRef.current;
    if (!dot) return;
    const mq = window.matchMedia("(pointer: fine) and (hover: hover)");
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (!mq.matches || reduced.matches) return;

    const root = dot.closest<HTMLElement>(".tpl-ecoluz");
    if (!root) return;

    let tx = -100;
    let ty = -100;
    let x = tx;
    let y = ty;
    let raf = 0;
    let shown = false;

    const tick = () => {
      x += (tx - x) * 0.22;
      y += (ty - y) * 0.22;
      dot.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
      if (Math.abs(tx - x) > 0.3 || Math.abs(ty - y) > 0.3) {
        raf = window.requestAnimationFrame(tick);
      } else {
        raf = 0;
      }
    };

    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      tx = e.clientX;
      ty = e.clientY;
      if (!shown) {
        shown = true;
        x = tx;
        y = ty;
        dot.setAttribute("data-on", "true");
      }
      const target = e.target instanceof Element ? e.target.closest(INTERACTIVE) : null;
      dot.toggleAttribute("data-hot", !!target);
      if (!raf) raf = window.requestAnimationFrame(tick);
    };

    const onLeave = () => {
      shown = false;
      dot.removeAttribute("data-on");
    };

    root.addEventListener("pointermove", onMove, { passive: true });
    root.addEventListener("pointerleave", onLeave);
    return () => {
      root.removeEventListener("pointermove", onMove);
      root.removeEventListener("pointerleave", onLeave);
      if (raf) window.cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div ref={dotRef} className="el-cursor" aria-hidden="true">
      <span />
    </div>
  );
}
