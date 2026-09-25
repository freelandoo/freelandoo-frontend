"use client";

// A RODA DE SERVIÇOS — os seis cards percorrendo um anel no espaço.
//
// ── UM DOM, DOIS MODOS ───────────────────────────────────────────────────
// A mesma lista `<ol>` de cards serve os dois:
//
//   · RODA (desktop, com cursor e sem movimento reduzido): a seção é fixada e
//     a rolagem vira POSIÇÃO CONTÍNUA no anel (0 → 5). Cada card é posto por
//     `rotateY(Δ·passo) translateZ(R)` a partir do centro; nada de estado
//     discreto no meio do gesto — é o que faz a volta não dar salto.
//   · TRILHO (celular, movimento reduzido e sem JavaScript): rolagem
//     horizontal NATIVA com snap. O dedo vertical continua rolando a página;
//     a profundidade é só um `rotateY`/`scale` escrito conforme a distância
//     do card ao centro do trilho.
//
// ⚠️ OS PREÇOS E TEXTOS ESTÃO NO HTML DO SERVIDOR, nos dois modos. A roda é
// aprimoramento: sem JavaScript a lista inteira está lá, legível e indexável.
//
// ⚠️ TROCAR DE MODO LIMPA O QUE O OUTRO ESCREVEU. `gsap.matchMedia` reverte a
// cena ao sair da consulta, e as transformações escritas à mão são zeradas no
// cleanup — sem isso, girar o tablet deixaria cards presos em ângulos do
// modo anterior.

import { useCallback, useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

import { SERVICES, sumOfParts, type Service } from "../content/services";
import { brl, pageHref, type TemplateLinks } from "../lib";
import { setSelectedService } from "./selection";

const STEP = 34; // graus entre um card e o próximo no anel
const RADIUS = 620; // px — raio do anel no desktop

function priceLabel(s: Service) {
  return s.priceFrom ? `a partir de ${brl(s.price)}` : brl(s.price);
}

export default function ServicesWheel({
  links,
  bookingHref,
  bookingExternal,
}: {
  links: TemplateLinks;
  bookingHref: string;
  bookingExternal: boolean;
}) {
  const sectionRef = useRef<HTMLElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLOListElement>(null);
  const triggerRef = useRef<ScrollTrigger | null>(null);
  const [active, setActive] = useState(0);
  const activeRef = useRef(0);
  const n = SERVICES.length;

  const setActiveIdx = useCallback((i: number) => {
    if (i === activeRef.current) return;
    activeRef.current = i;
    setActive(i);
    setSelectedService(SERVICES[i]?.slug ?? null);
  }, []);

  useEffect(() => {
    const section = sectionRef.current;
    const track = trackRef.current;
    if (!section || !track) return;
    gsap.registerPlugin(ScrollTrigger);

    const cards = () => Array.from(track.querySelectorAll<HTMLElement>("[data-card]"));
    const mm = gsap.matchMedia();

    // ── MODO RODA ─────────────────────────────────────────────────────────
    mm.add(
      "(min-width: 1024px) and (hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)",
      () => {
        // O modo é CLASSE, posta antes de criar o gatilho: o pin mede a seção
        // já no layout de palco. Por estado do React ela chegaria um render
        // depois, e o gatilho mediria o layout de trilho.
        section.classList.add("is-wheel");
        const list = cards();
        const shades = list.map((c) => c.querySelector<HTMLElement>("[data-shade]"));

        const place = (p: number) => {
          list.forEach((card, i) => {
            const d = i - p;
            const ad = Math.abs(d);
            const hidden = ad > 2.6;
            card.style.transform = `rotateY(${d * STEP}deg) translateZ(${RADIUS}px)`;
            card.style.opacity = hidden ? "0" : String(1 - Math.max(0, ad - 1.6) * 1);
            card.style.visibility = hidden ? "hidden" : "visible";
            card.style.zIndex = String(100 - Math.round(ad * 10));
            const sh = shades[i];
            if (sh) sh.style.opacity = String(Math.min(0.72, ad * 0.42));
          });
          setActiveIdx(Math.max(0, Math.min(n - 1, Math.round(p))));
        };

        if (ringRef.current) {
          ringRef.current.style.transform = `translateZ(-${RADIUS}px) rotateX(-4deg)`;
        }
        place(0);

        const st = ScrollTrigger.create({
          trigger: section,
          start: "top top",
          end: () => `+=${window.innerHeight * 0.75 * (n - 1)}`,
          pin: true,
          scrub: 0.6,
          anticipatePin: 1,
          onUpdate: (self) => place(self.progress * (n - 1)),
        });
        triggerRef.current = st;

        // Arrastar no palco = rolar. O gesto move a MESMA rolagem que a roda
        // lê, então nunca existem duas posições discordando.
        let startX = 0;
        let startY = 0;
        let dragging = false;
        const onDown = (e: PointerEvent) => {
          if ((e.target as HTMLElement).closest("a,button")) return;
          dragging = true;
          startX = e.clientX;
          startY = window.scrollY;
        };
        const onMove = (e: PointerEvent) => {
          if (!dragging) return;
          const span = st.end - st.start;
          const perCard = span / (n - 1);
          window.scrollTo({ top: startY - ((e.clientX - startX) / 280) * perCard });
        };
        const onUp = () => {
          dragging = false;
        };
        track.addEventListener("pointerdown", onDown);
        window.addEventListener("pointermove", onMove);
        window.addEventListener("pointerup", onUp);

        return () => {
          track.removeEventListener("pointerdown", onDown);
          window.removeEventListener("pointermove", onMove);
          window.removeEventListener("pointerup", onUp);
          st.kill();
          triggerRef.current = null;
          list.forEach((c) => {
            c.style.transform = "";
            c.style.opacity = "";
            c.style.visibility = "";
            c.style.zIndex = "";
          });
          shades.forEach((s) => s && (s.style.opacity = ""));
          if (ringRef.current) ringRef.current.style.transform = "";
          section.classList.remove("is-wheel");
        };
      },
    );

    // ── MODO TRILHO ───────────────────────────────────────────────────────
    mm.add("(max-width: 1023px), (hover: none), (pointer: coarse), (prefers-reduced-motion: reduce)", () => {
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const list = cards();
      let raf = 0;
      const update = () => {
        raf = 0;
        const tr = track.getBoundingClientRect();
        const cx = tr.left + tr.width / 2;
        let best = 0;
        let bestD = Infinity;
        list.forEach((card, i) => {
          const r = card.getBoundingClientRect();
          const d = (r.left + r.width / 2 - cx) / tr.width;
          if (Math.abs(d) < bestD) {
            bestD = Math.abs(d);
            best = i;
          }
          if (!reduced) {
            const k = Math.max(-1, Math.min(1, d));
            card.style.transform = `rotateY(${-k * 18}deg) scale(${1 - Math.abs(k) * 0.08})`;
          }
        });
        setActiveIdx(best);
      };
      // O `scroll` do trilho só AGENDA a conta para o próximo quadro do
      // ticker — o mesmo relógio das outras animações.
      const onScroll = () => {
        if (!raf) {
          raf = 1;
          gsap.ticker.add(tick);
        }
      };
      const tick = () => {
        gsap.ticker.remove(tick);
        update();
      };
      update();
      track.addEventListener("scroll", onScroll, { passive: true });
      return () => {
        track.removeEventListener("scroll", onScroll);
        gsap.ticker.remove(tick);
        list.forEach((c) => (c.style.transform = ""));
      };
    });

    return () => mm.revert();
  }, [n, setActiveIdx]);

  /** Ir a um serviço: na roda, rola até a posição dele; no trilho, desliza. */
  const goTo = useCallback(
    (i: number) => {
      const idx = Math.max(0, Math.min(n - 1, i));
      const st = triggerRef.current;
      if (st) {
        const top = st.start + ((st.end - st.start) * idx) / (n - 1);
        const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        window.scrollTo({ top, behavior: reduced ? "auto" : "smooth" });
        return;
      }
      const card = trackRef.current?.querySelectorAll<HTMLElement>("[data-card]")[idx];
      card?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
    },
    [n],
  );

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowRight") {
      e.preventDefault();
      goTo(activeRef.current + 1);
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      goTo(activeRef.current - 1);
    }
  };

  return (
    <section
      id="servicos"
      ref={sectionRef}
      aria-labelledby="servicos-titulo"
      data-own-cta
      className="wheel-section relative"
    >
      <div className="wheel-layout relative mx-auto w-full max-w-[90rem]">
        {/* ── O PAINEL DE LEITURA ─────────────────────────────────────── */}
        <div className="wheel-panel relative z-10">
          <p className="eyebrow">Serviços · a tabela em movimento</p>
          <h2
            id="servicos-titulo"
            className="display mt-4 text-[clamp(3rem,8vw,6.5rem)] text-[var(--ec-paper)]"
          >
            Preço na <span className="text-[var(--ec-volt)]">mesa</span>
          </h2>
          <p className="mt-5 max-w-[28rem] text-[1rem] leading-relaxed text-[var(--ec-metal)]">
            Sem “consulte valores”, sem pacote e sem fidelidade. O que está aqui é
            o que se paga.
          </p>

          <div className="mt-8 flex items-end gap-4" aria-live="polite">
            <span className="display tnum text-[4.5rem] leading-none text-[var(--ec-volt)]">
              {String(active + 1).padStart(2, "0")}
            </span>
            <span className="mono pb-2 text-[0.75rem] text-[var(--ec-metal-dim)]">
              / {String(n).padStart(2, "0")} · {SERVICES[active]?.label}
            </span>
          </div>

          {/* Acesso direto — todos os serviços a um clique. */}
          <ul className="mt-6 hidden grid-cols-1 border-t border-[var(--ec-line-soft)] lg:grid">
            {SERVICES.map((s, i) => (
              <li key={s.slug}>
                <button
                  type="button"
                  onClick={() => goTo(i)}
                  aria-current={i === active ? "true" : undefined}
                  className={`flex min-h-[44px] w-full items-center justify-between gap-3 border-b border-[var(--ec-line-soft)] py-2 text-left transition-colors ${
                    i === active ? "text-[var(--ec-volt)]" : "text-[var(--ec-metal)] hover:text-[var(--ec-paper)]"
                  }`}
                >
                  <span className="mono text-[0.75rem]">
                    {String(i + 1).padStart(2, "0")} · {s.label}
                  </span>
                  <span className="mono tnum text-[0.75rem]">{priceLabel(s)}</span>
                </button>
              </li>
            ))}
          </ul>

          <div className="mt-6 flex gap-2">
            <button
              type="button"
              onClick={() => goTo(active - 1)}
              disabled={active === 0}
              aria-label="Serviço anterior"
              className="grid h-12 w-12 place-items-center border border-[var(--ec-line)] text-[var(--ec-paper)] transition-colors hover:border-[var(--ec-volt)] hover:text-[var(--ec-volt)] disabled:opacity-30"
            >
              ←
            </button>
            <button
              type="button"
              onClick={() => goTo(active + 1)}
              disabled={active === n - 1}
              aria-label="Próximo serviço"
              className="grid h-12 w-12 place-items-center border border-[var(--ec-line)] text-[var(--ec-paper)] transition-colors hover:border-[var(--ec-volt)] hover:text-[var(--ec-volt)] disabled:opacity-30"
            >
              →
            </button>
          </div>
        </div>

        {/* ── O PALCO ──────────────────────────────────────────────────── */}
        <div
          className="wheel-stage relative"
          tabIndex={0}
          role="group"
          aria-roledescription="carrossel"
          aria-label="Serviços e preços — use as setas do teclado"
          onKeyDown={onKey}
        >
          <div ref={trackRef} className="wheel-track">
            <ol ref={ringRef} className="wheel-list">
              {SERVICES.map((s, i) => {
                const sum = sumOfParts(s);
                return (
                  <li
                    key={s.slug}
                    data-card
                    className={`wheel-card chamfer ${i === active ? "is-active" : ""}`}
                    aria-current={i === active ? "true" : undefined}
                  >
                    <span className="outline-num pointer-events-none absolute right-4 top-3 text-[7rem]" aria-hidden="true">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span className="mono text-[0.6875rem] uppercase text-[var(--ec-metal-dim)]">
                      {s.eyebrow}
                    </span>
                    <h3 className="display mt-auto pt-16 text-[2.5rem] leading-[0.9] text-[var(--ec-paper)]">
                      {s.label}
                    </h3>
                    <p className="mt-4 text-[0.9375rem] leading-relaxed text-[var(--ec-metal)]">{s.cardText}</p>
                    <div className="mt-6 border-t border-[var(--ec-line-soft)] pt-4">
                      {sum ? (
                        <span className="mono block text-[0.75rem] text-[var(--ec-metal-dim)] line-through">
                          {brl(sum)} avulsos
                        </span>
                      ) : null}
                      <span className="wheel-price display tnum text-[3rem] leading-none text-[var(--ec-volt)]">
                        {s.priceFrom ? (
                          <span className="mono mr-2 align-middle text-[0.75rem] text-[var(--ec-metal)]">a partir de</span>
                        ) : null}
                        {brl(s.price)}
                      </span>
                    </div>
                    <div className="mt-5 flex flex-wrap gap-2">
                      <a
                        href={bookingHref}
                        {...(bookingExternal ? { target: "_blank", rel: "noopener" } : {})}
                        className="btn btn-solid !min-h-[44px] !px-4 !py-3"
                      >
                        Agendar
                      </a>
                      <a href={pageHref(links, s.slug)} className="btn btn-ghost !min-h-[44px] !px-4 !py-3">
                        Detalhes
                      </a>
                    </div>
                    <span data-shade className="wheel-shade" aria-hidden="true" />
                  </li>
                );
              })}
            </ol>
          </div>
        </div>
      </div>
    </section>
  );
}
