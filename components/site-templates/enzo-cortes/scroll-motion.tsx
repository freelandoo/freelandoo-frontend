"use client";

import { useEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

/**
 * Camada de movimento do site (GSAP + ScrollTrigger).
 *
 * Três gestos, e só três:
 *
 *   [data-reveal]    o bloco entra — up | left | right | fade | scale
 *   [data-rule]      o filete dourado se abre da esquerda para a direita
 *   [data-parallax]  a camada anda mais devagar que a rolagem
 *
 * ── REGRAS ───────────────────────────────────────────────────────────────
 *
 * ⚠️ SÓ `transform` E `opacity`. São as duas coisas que o navegador COMPÕE
 * sem recalcular layout nem repintar. Animar altura, largura ou margem custa
 * o DOCUMENTO INTEIRO por quadro — e numa página com muito conteúdo o
 * sintoma é a rolagem travada, que ninguém relaciona com a animação.
 *
 * ⚠️ O CONTEXTO É ESCOPADO NO ELEMENTO DO TEMA, e isto é o que separa esta
 * versão da do projeto de origem. Lá o gate era uma classe no `<html>` e os
 * seletores varriam o documento — aqui o site roda DENTRO da aplicação da
 * Freelandoo, e um `gsap.utils.toArray("[data-reveal]")` solto capturaria
 * elementos da plataforma que por acaso tivessem o atributo. `gsap.context`
 * com elemento de escopo resolve as duas coisas de uma vez: os seletores só
 * enxergam a subárvore do tema, e o `revert()` só desfaz o que criou.
 *
 * ⚠️ QUEM ESCONDE O BLOCO ANTES DA ANIMAÇÃO É O CSS, e o gate é o atributo
 * `data-motion="on"` posto por um script INLINE (ver `index.tsx`), que roda
 * durante o parse do HTML — antes da primeira pintura. Posto aqui, num
 * efeito, ele chegaria DEPOIS da primeira pintura: o conteúdo apareceria,
 * sumiria e voltaria animando. E sem JavaScript nenhum o atributo nunca é
 * escrito, então a página aparece inteira em vez de ficar em branco — que é
 * o que importa para quem tem JS bloqueado e para o robô do buscador.
 */
export default function ScrollMotion() {
  useEffect(() => {
    const root = document.querySelector<HTMLElement>(".tpl-enzo");
    if (!root) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    gsap.registerPlugin(ScrollTrigger);

    const ctx = gsap.context(() => {
      const nodes = gsap.utils.toArray<HTMLElement>("[data-reveal]");

      // Movimento reduzido: revela tudo de uma vez, sem deslocamento. Não é
      // "animação mais curta" — é ausência de animação, que é o que a
      // preferência pede.
      if (reduced) {
        gsap.set(nodes, { opacity: 1, x: 0, y: 0, scale: 1, clearProps: "transform" });
        gsap.set(gsap.utils.toArray<HTMLElement>("[data-rule]"), { scaleX: 1 });
        return;
      }

      nodes.forEach((el) => {
        const delay = Number(el.dataset.revealDelay ?? 0);
        const kind = el.dataset.reveal || "up";

        const from: gsap.TweenVars =
          kind === "left"
            ? { opacity: 0, x: -24 }
            : kind === "right"
              ? { opacity: 0, x: 24 }
              : kind === "fade"
                ? { opacity: 0 }
                : kind === "scale"
                  ? { opacity: 0, scale: 0.97, y: 16 }
                  : { opacity: 0, y: 22 };

        gsap.fromTo(el, from, {
          opacity: 1,
          x: 0,
          y: 0,
          scale: 1,
          duration: 0.85,
          delay,
          ease: "power3.out",
          scrollTrigger: { trigger: el, start: "top 88%", once: true },
        });
      });

      // Os filetes dourados que abrem da esquerda para a direita. É o gesto
      // que dá o tempo déco à página — a régua entrando antes do texto.
      gsap.utils.toArray<HTMLElement>("[data-rule]").forEach((el) => {
        gsap.fromTo(
          el,
          { scaleX: 0, transformOrigin: "left center" },
          {
            scaleX: 1,
            duration: 1.1,
            ease: "power3.out",
            scrollTrigger: { trigger: el, start: "top 92%", once: true },
          },
        );
      });

      // Paralaxe discreta. `yPercent` e não pixels: em pixels fixos o mesmo
      // número dá efeito forte no celular e imperceptível num monitor grande,
      // e a correção viraria um número por breakpoint.
      gsap.utils.toArray<HTMLElement>("[data-parallax]").forEach((el) => {
        const amount = Number(el.dataset.parallax || 6);
        gsap.to(el, {
          yPercent: amount,
          ease: "none",
          scrollTrigger: {
            trigger: el.parentElement ?? el,
            start: "top bottom",
            end: "bottom top",
            scrub: 0.6,
          },
        });
      });
    }, root);

    // O ScrollTrigger precisa remedir depois que as fontes assentam: a
    // Bodoni tem métricas bem diferentes da fallback, e sem isto os gatilhos
    // ficam calculados sobre a altura errada — os blocos do fim da página
    // entram cedo demais ou não entram.
    const refresh = () => ScrollTrigger.refresh();
    if (document.fonts?.ready) document.fonts.ready.then(refresh).catch(() => {});
    const tmr = window.setTimeout(refresh, 600);

    return () => {
      window.clearTimeout(tmr);
      ctx.revert();
    };
  }, []);

  return null;
}
