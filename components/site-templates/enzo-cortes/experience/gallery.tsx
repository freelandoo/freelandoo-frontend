"use client";

// A GALERIA EDITORIAL — trabalhos reais, em composição de revista.
//
// Recebe as fotos por prop (a fonte é `content/gallery.ts`) e NÃO É DESENHADA
// quando a lista está vazia: galeria de placeholder num site publicado é pior
// que galeria nenhuma. Ver o arquivo de conteúdo para o porquê.
//
//   · até 4 fotos: composição editorial em tamanhos diferentes, com paralaxe
//     e revelação por máscara (os gestos genéricos de `motion.tsx`)
//   · 4 ou mais: além disso, uma passagem HORIZONTAL fixada no desktop — a
//     rolagem vertical atravessa as fotos de lado. O deslocamento é MEDIDO
//     (`scrollWidth - innerWidth`) e remedido no refresh, então a seção nunca
//     fica mais longa que as fotos nem termina com a faixa fora da tela.
//   · no celular a passagem vira trilho com snap, rolagem nativa.
//
// A foto ampliada abre por transição de elemento compartilhado (a caixa sai
// da posição da miniatura), com Esc, setas, foco preso e devolvido.
//
// ⚠️ O VISOR VAI POR PORTAL PARA A RAIZ DO TEMA. A passagem horizontal é
// fixada, e ancestral com `transform` deixa de ser a janela para um filho
// `fixed` — preso no fluxo, o visor abriria dentro da faixa.

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

import type { GalleryPhoto } from "../content/gallery";

const SPANS = [
  "md:col-span-7 md:row-span-2",
  "md:col-span-5",
  "md:col-span-4 md:col-start-9",
  "md:col-span-5 md:col-start-2",
];

export default function Gallery({ photos }: { photos: readonly GalleryPhoto[] }) {
  const stripRef = useRef<HTMLDivElement>(null);
  const railRef = useRef<HTMLUListElement>(null);
  const [open, setOpen] = useState<number | null>(null);
  const [host, setHost] = useState<HTMLElement | null>(null);
  const originRef = useRef<HTMLElement | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  const editorial = photos.slice(0, 4);
  const hasStrip = photos.length >= 4;

  // ── A PASSAGEM HORIZONTAL ──────────────────────────────────────────────
  useEffect(() => {
    const strip = stripRef.current;
    const rail = railRef.current;
    if (!hasStrip || !strip || !rail) return;
    gsap.registerPlugin(ScrollTrigger);
    const mm = gsap.matchMedia();
    mm.add("(min-width: 1024px) and (prefers-reduced-motion: no-preference)", () => {
      const distance = () => Math.max(0, rail.scrollWidth - window.innerWidth);
      gsap.to(rail, {
        x: () => -distance(),
        ease: "none",
        scrollTrigger: {
          trigger: strip,
          start: "top top",
          end: () => `+=${distance()}`,
          pin: true,
          scrub: 0.6,
          invalidateOnRefresh: true,
          anticipatePin: 1,
        },
      });
    });
    return () => mm.revert();
  }, [hasStrip]);

  // ── O VISOR ────────────────────────────────────────────────────────────
  const openAt = (i: number, origin: HTMLElement) => {
    originRef.current = origin;
    setHost(origin.closest<HTMLElement>(".tpl-enzo"));
    setOpen(i);
  };

  const close = () => {
    const box = boxRef.current;
    const origin = originRef.current;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (box && origin && !reduced) {
      const a = origin.getBoundingClientRect();
      const b = box.getBoundingClientRect();
      gsap.to(box, {
        x: a.left - b.left,
        y: a.top - b.top,
        scaleX: a.width / b.width,
        scaleY: a.height / b.height,
        transformOrigin: "0 0",
        duration: 0.35,
        ease: "power3.inOut",
        onComplete: () => setOpen(null),
      });
    } else {
      setOpen(null);
    }
    origin?.focus();
  };

  useEffect(() => {
    if (open === null) return;
    const box = boxRef.current;
    const origin = originRef.current;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (box && origin && !reduced) {
      const a = origin.getBoundingClientRect();
      const b = box.getBoundingClientRect();
      gsap.fromTo(
        box,
        {
          x: a.left - b.left,
          y: a.top - b.top,
          scaleX: a.width / b.width,
          scaleY: a.height / b.height,
          transformOrigin: "0 0",
        },
        { x: 0, y: 0, scaleX: 1, scaleY: 1, duration: 0.5, ease: "power3.out" },
      );
    }
    closeRef.current?.focus();
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      // Esc aperta o MESMO botão de fechar: um caminho só para a animação
      // de saída, e o efeito não depende de uma função recriada a cada render.
      if (e.key === "Escape") closeRef.current?.click();
      else if (e.key === "ArrowRight") setOpen((v) => (v === null ? v : (v + 1) % photos.length));
      else if (e.key === "ArrowLeft") setOpen((v) => (v === null ? v : (v - 1 + photos.length) % photos.length));
      else if (e.key === "Tab") {
        // Foco preso: o visor tem três botões e nada mais recebe Tab.
        const f = Array.from(box?.parentElement?.querySelectorAll<HTMLElement>("button") ?? []);
        if (!f.length) return;
        const i = f.indexOf(document.activeElement as HTMLElement);
        e.preventDefault();
        f[(i + (e.shiftKey ? -1 : 1) + f.length) % f.length]?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
    // `open` muda ao navegar pelas setas; a animação de entrada só faz
    // sentido na abertura, mas refazê-la na troca é inofensivo.
  }, [open, photos.length]);

  if (!photos.length) return null;

  const photo = open !== null ? photos[open] : null;

  return (
    <section id="trabalhos" aria-labelledby="trabalhos-titulo" className="relative py-20 md:py-28">
      <div className="mx-auto w-full max-w-[90rem]" style={{ paddingInline: "var(--ec-pad)" }}>
        <p className="eyebrow" data-reveal="up">
          Trabalhos
        </p>
        <h2
          id="trabalhos-titulo"
          className="display mt-4 text-[clamp(3rem,8vw,6.5rem)] text-[var(--ec-paper)]"
          data-reveal="up"
        >
          Da <span className="text-[var(--ec-volt)]">cadeira</span>
        </h2>

        <ul className="mt-12 grid grid-cols-2 gap-3 md:grid-cols-12 md:gap-5">
          {editorial.map((p, i) => (
            <li key={p.src} className={`relative ${SPANS[i] ?? "md:col-span-4"} ${i === 0 ? "col-span-2" : ""}`}>
              <span className="outline-num pointer-events-none absolute -top-6 left-2 z-10 text-[5rem]" aria-hidden="true">
                {String(i + 1).padStart(2, "0")}
              </span>
              <button
                type="button"
                onClick={(e) => openAt(i, e.currentTarget)}
                className="block w-full overflow-hidden bg-[var(--ec-graphite)]"
                aria-label={`Ampliar: ${p.alt}`}
                data-reveal="mask"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={p.src}
                  width={p.width}
                  height={p.height}
                  alt={p.alt}
                  loading="lazy"
                  decoding="async"
                  className="block h-auto w-full scale-[1.12] object-cover"
                  data-parallax="5"
                />
              </button>
              {p.caption ? (
                <p className="mono mt-2 text-[0.6875rem] uppercase text-[var(--ec-metal-dim)]">{p.caption}</p>
              ) : null}
            </li>
          ))}
        </ul>
      </div>

      {hasStrip ? (
        <div ref={stripRef} className="relative mt-16 overflow-hidden lg:flex lg:h-[100svh] lg:items-center">
          <ul
            ref={railRef}
            className="flex gap-4 overflow-x-auto px-[var(--ec-pad)] pb-4 [scroll-snap-type:x_mandatory] [scrollbar-width:none] lg:w-max lg:gap-8 lg:overflow-visible lg:pb-0"
          >
            {photos.map((p, i) => (
              <li key={`${p.src}-strip`} className="shrink-0 [scroll-snap-align:center]">
                <button
                  type="button"
                  onClick={(e) => openAt(i, e.currentTarget)}
                  className="block overflow-hidden bg-[var(--ec-graphite)]"
                  aria-label={`Ampliar: ${p.alt}`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={p.src}
                    width={p.width}
                    height={p.height}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    className="block h-[60svh] w-auto max-w-none lg:h-[70svh]"
                  />
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {photo && host
        ? createPortal(
            <div
              role="dialog"
              aria-modal="true"
              aria-label={photo.alt}
              className="fixed inset-0 z-[80] flex items-center justify-center bg-[rgb(5_6_6/0.94)] p-4 md:p-10"
              onClick={(e) => {
                if (e.target === e.currentTarget) close();
              }}
            >
              <div ref={boxRef} className="relative max-h-full max-w-full">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photo.src}
                  width={photo.width}
                  height={photo.height}
                  alt={photo.alt}
                  className="block max-h-[82svh] w-auto max-w-full"
                />
                {photo.caption ? (
                  <p className="mono mt-3 text-[0.75rem] uppercase text-[var(--ec-metal)]">{photo.caption}</p>
                ) : null}
              </div>
              <button
                ref={closeRef}
                type="button"
                onClick={close}
                aria-label="Fechar"
                className="absolute right-4 top-4 grid h-12 w-12 place-items-center border border-[var(--ec-line)] text-[var(--ec-paper)] hover:border-[var(--ec-volt)] hover:text-[var(--ec-volt)]"
              >
                ✕
              </button>
              {photos.length > 1 ? (
                <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-2">
                  <button
                    type="button"
                    onClick={() => setOpen((v) => (v === null ? v : (v - 1 + photos.length) % photos.length))}
                    aria-label="Foto anterior"
                    className="grid h-12 w-12 place-items-center border border-[var(--ec-line)] text-[var(--ec-paper)] hover:border-[var(--ec-volt)]"
                  >
                    ←
                  </button>
                  <button
                    type="button"
                    onClick={() => setOpen((v) => (v === null ? v : (v + 1) % photos.length))}
                    aria-label="Próxima foto"
                    className="grid h-12 w-12 place-items-center border border-[var(--ec-line)] text-[var(--ec-paper)] hover:border-[var(--ec-volt)]"
                  >
                    →
                  </button>
                </div>
              ) : null}
            </div>,
            host,
          )
        : null}
    </section>
  );
}
