"use client";

// O que o hero faz com o cursor e com a rolagem.
//
// Monta DENTRO da seção do hero e age sobre ela (`closest("[data-hero]")`):
// o markup do hero é servidor — é ele que põe o `<h1>` e o texto no HTML que
// o buscador lê —, e este componente só acrescenta o gesto.
//
//   · a luz de CSS segue o cursor (sempre montada; é o fallback de tudo)
//   · a lâmina 3D e as camadas gráficas inclinam levemente
//   · a superfície WebGPU entra DEPOIS do ocioso, só se o aparelho aguenta
//   · rolando, a tipografia se fragmenta em camadas e a arte avança — a
//     passagem para os serviços
//
// Nada disto roda no toque nem com movimento reduzido.

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

export default function HeroFx() {
  const lightRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const light = lightRef.current;
    const canvas = canvasRef.current;
    const hero = light?.closest<HTMLElement>("[data-hero]");
    if (!light || !canvas || !hero) return;

    gsap.registerPlugin(ScrollTrigger);
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    const desktop = window.matchMedia("(min-width: 1024px)").matches;
    if (reduced) return;

    const cleanups: Array<() => void> = [];
    let surface: { stop: () => void } | null = null;
    let cancelled = false;

    const ctx = gsap.context(() => {
      // ── CURSOR ─────────────────────────────────────────────────────────
      if (fine) {
        const lx = gsap.quickTo(light, "x", { duration: 0.9, ease: "power3.out" });
        const ly = gsap.quickTo(light, "y", { duration: 0.9, ease: "power3.out" });
        const tilts = gsap.utils.toArray<HTMLElement>("[data-blade-tilt]", hero);
        const layers = gsap.utils.toArray<HTMLElement>("[data-depth]", hero);
        const tiltTo = tilts.map((el) => ({
          rx: gsap.quickTo(el, "rotationX", { duration: 0.8, ease: "power3.out" }),
          ry: gsap.quickTo(el, "rotationY", { duration: 0.8, ease: "power3.out" }),
        }));
        const layerTo = layers.map((el) => ({
          d: Number(el.dataset.depth || 1),
          x: gsap.quickTo(el, "x", { duration: 1, ease: "power3.out" }),
          y: gsap.quickTo(el, "y", { duration: 1, ease: "power3.out" }),
        }));

        const onMove = (e: PointerEvent) => {
          const r = hero.getBoundingClientRect();
          lx(e.clientX - r.left);
          ly(e.clientY - r.top);
          const px = (e.clientX - r.left) / r.width - 0.5;
          const py = (e.clientY - r.top) / r.height - 0.5;
          tiltTo.forEach((t) => {
            t.ry(px * 30);
            t.rx(-py * 20);
          });
          layerTo.forEach((l) => {
            l.x(px * 14 * l.d);
            l.y(py * 10 * l.d);
          });
        };
        hero.addEventListener("pointermove", onMove);
        cleanups.push(() => hero.removeEventListener("pointermove", onMove));
      }

      // ── A PASSAGEM PARA OS SERVIÇOS ────────────────────────────────────
      // Só no desktop: no celular a mesma fragmentação vira ruído numa tela
      // estreita, e custaria quadro em aparelho intermediário.
      if (desktop) {
        const glyphs = gsap.utils.toArray<HTMLElement>("[data-frag]", hero);
        const tl = gsap.timeline({
          scrollTrigger: { trigger: hero, start: "top top", end: "bottom top", scrub: 0.5 },
        });
        glyphs.forEach((g, i) => {
          const dir = i % 2 ? 1 : -1;
          tl.to(
            g,
            {
              yPercent: -30 - (i % 3) * 22,
              x: dir * (20 + (i % 4) * 16),
              opacity: 0.12,
              ease: "none",
            },
            0,
          );
        });
        const art = hero.querySelector("[data-hero-art]");
        if (art) tl.to(art, { scale: 1.28, yPercent: 18, ease: "none" }, 0);
        const cortes = hero.querySelector("[data-hero-cortes]");
        if (cortes) tl.to(cortes, { xPercent: 12, ease: "none" }, 0);
        const fades = gsap.utils.toArray<HTMLElement>("[data-hero-fade]", hero);
        if (fades.length) tl.to(fades, { opacity: 0, y: -30, ease: "none" }, 0);
      }
    }, hero);

    // ── WEBGPU, DEPOIS DO OCIOSO ─────────────────────────────────────────
    // O hero é a pintura principal (LCP). A GPU só entra quando a página já
    // está de pé, e só com cursor e tela larga — no celular a luz de CSS
    // basta e a bateria agradece.
    if (fine && desktop && "gpu" in navigator) {
      const start = () => {
        import("./gpu-surface")
          .then(({ startSurface }) =>
            startSurface(canvas, hero, () => {
              canvas.style.opacity = "1";
              light.style.opacity = "0";
            }),
          )
          .then((s) => {
            if (cancelled) s?.stop();
            else surface = s;
          })
          .catch(() => {});
      };
      const w = window as Window & {
        requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number;
        cancelIdleCallback?: (id: number) => void;
      };
      if (w.requestIdleCallback) {
        const id = w.requestIdleCallback(start, { timeout: 2500 });
        cleanups.push(() => w.cancelIdleCallback?.(id));
      } else {
        const id = window.setTimeout(start, 1200);
        cleanups.push(() => window.clearTimeout(id));
      }
    }

    return () => {
      cancelled = true;
      surface?.stop();
      cleanups.forEach((fn) => fn());
      ctx.revert();
    };
  }, []);

  return (
    <>
      <div ref={lightRef} className="hero-light transition-opacity duration-700" aria-hidden="true" />
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 h-full w-full opacity-0 transition-opacity duration-1000"
      />
    </>
  );
}
