"use client";

// O MOVIMENTO GENÉRICO do site — o que vale em qualquer página do tema.
//
//   [data-reveal]    o bloco entra — up | left | right | fade | scale | mask
//   [data-rule]      o fio se abre da esquerda para a direita
//   [data-parallax]  a camada anda em outra velocidade (yPercent)
//   [data-magnetic]  o botão se inclina para o cursor, com limite
//   [data-tilt]      o card inclina em 3D com o cursor
//
// As CENAS (hero, roda, combinados, passos, localização) têm componente
// próprio, cada uma com seu `gsap.context` — mas TODAS andam no MESMO relógio,
// o `gsap.ticker`. Nenhuma peça do tema abre um `requestAnimationFrame`
// próprio (o fundo WebGPU inclusive se pendura no ticker): dois laços
// independentes disputando o quadro é como a rolagem engasga.
//
// ⚠️ SÓ `transform` E `opacity`, e escopo no elemento do tema: o site roda
// dentro da aplicação da Freelandoo, e um seletor solto capturaria elementos
// da plataforma que por acaso tivessem o atributo.

import { useEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

export default function Motion() {
  useEffect(() => {
    const root = document.querySelector<HTMLElement>(".tpl-enzo");
    if (!root) return;

    gsap.registerPlugin(ScrollTrigger);
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    const cleanups: Array<() => void> = [];

    const ctx = gsap.context(() => {
      const nodes = gsap.utils.toArray<HTMLElement>("[data-reveal]");

      if (reduced) {
        gsap.set(nodes, { opacity: 1, clearProps: "transform,clipPath" });
        gsap.set(gsap.utils.toArray<HTMLElement>("[data-rule]"), { scaleX: 1 });
        return;
      }

      nodes.forEach((el) => {
        const delay = Number(el.dataset.revealDelay ?? 0);
        const kind = el.dataset.reveal || "up";
        const from: gsap.TweenVars =
          kind === "left"
            ? { opacity: 0, x: -32 }
            : kind === "right"
              ? { opacity: 0, x: 32 }
              : kind === "fade"
                ? { opacity: 0 }
                : kind === "scale"
                  ? { opacity: 0, scale: 0.96, y: 18 }
                  : kind === "mask"
                    ? { opacity: 1, clipPath: "inset(100% 0 0 0)", y: 30 }
                    : { opacity: 0, y: 26 };
        const to: gsap.TweenVars = {
          opacity: 1,
          x: 0,
          y: 0,
          scale: 1,
          duration: 0.9,
          delay,
          ease: "power3.out",
          scrollTrigger: { trigger: el, start: "top 88%", once: true },
        };
        if (kind === "mask") {
          to.clipPath = "inset(0% 0 0 0)";
          // Terminado o gesto, o recorte SAI: parado em `inset(0)` ele ainda
          // corta o que passa da caixa — o acento de "PRÓXIMO" num título de
          // entrelinha curta some.
          to.clearProps = "clipPath";
        }
        gsap.fromTo(el, from, to);
      });

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

      gsap.utils.toArray<HTMLElement>("[data-parallax]").forEach((el) => {
        const amount = Number(el.dataset.parallax || 8);
        gsap.fromTo(
          el,
          { yPercent: -amount },
          {
            yPercent: amount,
            ease: "none",
            scrollTrigger: {
              trigger: el.parentElement ?? el,
              start: "top bottom",
              end: "bottom top",
              scrub: 0.6,
            },
          },
        );
      });

      // Cursor: só onde existe cursor. No toque não há hover, e um efeito
      // que depende dele só atrasaria o toque.
      if (!finePointer) return;

      gsap.utils.toArray<HTMLElement>("[data-magnetic]").forEach((el) => {
        const strength = Number(el.dataset.magnetic || 0.35);
        const max = 14;
        const xTo = gsap.quickTo(el, "x", { duration: 0.4, ease: "power3.out" });
        const yTo = gsap.quickTo(el, "y", { duration: 0.4, ease: "power3.out" });
        const onMove = (e: PointerEvent) => {
          const r = el.getBoundingClientRect();
          const dx = (e.clientX - (r.left + r.width / 2)) * strength;
          const dy = (e.clientY - (r.top + r.height / 2)) * strength;
          xTo(gsap.utils.clamp(-max, max, dx));
          yTo(gsap.utils.clamp(-max, max, dy));
        };
        const onLeave = () => {
          xTo(0);
          yTo(0);
        };
        el.addEventListener("pointermove", onMove);
        el.addEventListener("pointerleave", onLeave);
        cleanups.push(() => {
          el.removeEventListener("pointermove", onMove);
          el.removeEventListener("pointerleave", onLeave);
        });
      });

      gsap.utils.toArray<HTMLElement>("[data-tilt]").forEach((el) => {
        gsap.set(el, { transformPerspective: 900 });
        const rx = gsap.quickTo(el, "rotationX", { duration: 0.5, ease: "power3.out" });
        const ry = gsap.quickTo(el, "rotationY", { duration: 0.5, ease: "power3.out" });
        const onMove = (e: PointerEvent) => {
          const r = el.getBoundingClientRect();
          const px = (e.clientX - r.left) / r.width - 0.5;
          const py = (e.clientY - r.top) / r.height - 0.5;
          ry(px * 8);
          rx(-py * 8);
        };
        const onLeave = () => {
          rx(0);
          ry(0);
        };
        el.addEventListener("pointermove", onMove);
        el.addEventListener("pointerleave", onLeave);
        cleanups.push(() => {
          el.removeEventListener("pointermove", onMove);
          el.removeEventListener("pointerleave", onLeave);
        });
      });
    }, root);

    // Remede depois que as fontes assentam: a display condensada tem métrica
    // bem diferente da reserva, e as cenas fixadas calculam a própria altura
    // sobre ela.
    const refresh = () => ScrollTrigger.refresh();
    if (document.fonts?.ready) document.fonts.ready.then(refresh).catch(() => {});
    const tmr = window.setTimeout(refresh, 700);

    return () => {
      window.clearTimeout(tmr);
      cleanups.forEach((fn) => fn());
      ctx.revert();
    };
  }, []);

  return null;
}
