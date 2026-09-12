"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

/**
 * Camada de movimento do site (GSAP + ScrollTrigger).
 *
 * Regras:
 *  - o CSS só esconde o bloco quando a classe `js-reveal` existe NO WRAPPER
 *    DO TEMA, e quem a adiciona é este componente. Sem JS, ou se o GSAP
 *    falhar, o conteúdo aparece normalmente — nada de página em branco;
 *
 * ⚠️ TUDO É ESCOPADO AO WRAPPER, e não ao documento. Este componente roda
 * dentro da aplicação que serve a Freelandoo inteira: marcar o <html> e
 * varrer `[data-reveal]` solto alcançaria o produto, e um dia o GSAP estaria
 * animando uma tela que nada tem a ver com o site de um cliente.
 *  - anima só `transform` e `opacity` (composição), nunca altura/margem,
 *    que são layout e custariam o documento inteiro a cada quadro;
 *  - prefers-reduced-motion apenas revela, sem deslocamento.
 */
export default function ScrollMotion() {
  const pathname = usePathname();

  useEffect(() => {
    const root = document.querySelector<HTMLElement>(".tpl-oficina");
    if (!root) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    gsap.registerPlugin(ScrollTrigger);
    root.classList.add("js-reveal");

    // O segundo argumento do `context` é o ESCOPO: os seletores abaixo passam
    // a ser relativos ao wrapper do tema.
    const ctx = gsap.context(() => {
      const nodes = gsap.utils.toArray<HTMLElement>("[data-reveal]");

      if (reduced) {
        gsap.set(nodes, { opacity: 1, y: 0, clearProps: "transform" });
        return;
      }

      nodes.forEach((el) => {
        const delay = Number(el.dataset.revealDelay ?? 0);
        const kind = el.dataset.reveal || "up";

        const from: gsap.TweenVars =
          kind === "left"
            ? { opacity: 0, x: -28 }
            : kind === "right"
              ? { opacity: 0, x: 28 }
              : kind === "fade"
                ? { opacity: 0 }
                : kind === "scale"
                  ? { opacity: 0, scale: 0.965, y: 18 }
                  : { opacity: 0, y: 26 };

        gsap.fromTo(el, from, {
          opacity: 1,
          x: 0,
          y: 0,
          scale: 1,
          duration: 0.85,
          delay,
          ease: "power3.out",
          scrollTrigger: {
            trigger: el,
            start: "top 88%",
            once: true,
          },
        });
      });

      // filetes dourados que "abrem" da esquerda para a direita
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

      // paralaxe muito discreta em imagens marcadas
      if (!reduced) {
        gsap.utils.toArray<HTMLElement>("[data-parallax]").forEach((el) => {
          const amount = Number(el.dataset.parallax || 8);
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
      }
    }, root);

    // o ScrollTrigger precisa remedir depois que as fontes assentam
    const refresh = () => ScrollTrigger.refresh();
    if (document.fonts?.ready) document.fonts.ready.then(refresh).catch(() => {});
    const tmr = window.setTimeout(refresh, 600);

    return () => {
      window.clearTimeout(tmr);
      ctx.revert();
    };
  }, [pathname]);

  return null;
}
