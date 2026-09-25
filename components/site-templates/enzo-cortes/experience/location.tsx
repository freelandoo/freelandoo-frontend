"use client";

// ONDE FICA — "JARDIM PINHEIROS" em tipografia monumental, e o mapa atrás.
//
// ⚠️ O MAPA NÃO CARREGA SOZINHO. Um iframe do Google Maps baixa centenas de
// KB e scripts de terceiro; com carga automática ele entraria no custo de
// toda visita, inclusive de quem nunca rola até aqui. No lugar dele fica uma
// representação gráfica (a grade e o marcador, em SVG) e dois botões: abrir
// no aplicativo de mapas — o que quase todo mundo quer — e, só se pedir, o
// mapa interativo ali mesmo. `www.google.com` já está no `frame-src` da CSP
// da plataforma.
//
// ⚠️ O ENDEREÇO E O HORÁRIO SÃO TEXTO NO HTML, dentro de `<address>`. A
// revelação é só `clip-path` num painel decorativo; nada que o buscador
// precise ler depende dela.

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

import { AREAS } from "../content/areas";
import { BUSINESS } from "../content/business";
import { pageHref, type TemplateLinks } from "../lib";

export default function Location({ links }: { links: TemplateLinks }) {
  const ref = useRef<HTMLElement>(null);
  const [mapOn, setMapOn] = useState(false);
  const query = encodeURIComponent(
    `${BUSINESS.street}, ${BUSINESS.neighborhood}, ${BUSINESS.city} - ${BUSINESS.state}, ${BUSINESS.postalCode}`,
  );
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${query}`;

  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    gsap.registerPlugin(ScrollTrigger);
    const mm = gsap.matchMedia();
    mm.add("(prefers-reduced-motion: no-preference)", () => {
      const words = gsap.utils.toArray<HTMLElement>("[data-loc-word]", root);
      const panel = root.querySelector<HTMLElement>("[data-loc-map]");
      const tl = gsap.timeline({
        scrollTrigger: { trigger: root, start: "top 80%", end: "center 55%", scrub: 0.6 },
      });
      words.forEach((w, i) => {
        tl.fromTo(w, { xPercent: i ? 18 : -18, opacity: 0.25 }, { xPercent: 0, opacity: 1, ease: "none" }, 0);
      });
      if (panel) tl.fromTo(panel, { clipPath: "inset(0 0 100% 0)" }, { clipPath: "inset(0 0 0% 0)", ease: "none" }, 0.1);
    });
    return () => mm.revert();
  }, []);

  return (
    <section ref={ref} id="onde" aria-labelledby="onde-titulo" className="relative overflow-hidden py-20 md:py-28">
      <div className="mx-auto w-full max-w-[90rem]" style={{ paddingInline: "var(--ec-pad)" }}>
        <p className="eyebrow">Onde fica</p>
        <h2 id="onde-titulo" className="mt-4">
          <span data-loc-word className="hero-word block text-[clamp(4rem,17vw,14rem)] text-[var(--ec-paper)]">
            Jardim
          </span>
          <span
            data-loc-word
            className="hero-word block text-right text-[clamp(4rem,17vw,14rem)] text-[var(--ec-volt)]"
          >
            Pinheiros
          </span>
        </h2>

        <div className="mt-12 grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
          <div>
            <address className="not-italic">
              <p className="display text-[clamp(2rem,4vw,2.75rem)] text-[var(--ec-paper)]">{BUSINESS.street}</p>
              <p className="mt-2 text-[1rem] text-[var(--ec-metal)]">
                {BUSINESS.neighborhood}
                <br />
                {BUSINESS.city} — {BUSINESS.state}
                <br />
                <span className="mono tnum">{BUSINESS.postalCode}</span>
              </p>
            </address>

            <dl className="mt-8 grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 border-t border-[var(--ec-line-soft)] pt-6">
              <dt className="mono text-[0.75rem] uppercase text-[var(--ec-metal-dim)]">Seg — Sáb</dt>
              <dd className="mono tnum text-[0.875rem] text-[var(--ec-paper)]">09h — 19h</dd>
              <dt className="mono text-[0.75rem] uppercase text-[var(--ec-metal-dim)]">Domingo</dt>
              <dd className="mono text-[0.875rem] text-[var(--ec-paper)]">Fechado</dd>
            </dl>

            <div className="mt-8 flex flex-wrap gap-3">
              <a href={mapsUrl} target="_blank" rel="noopener" className="btn btn-solid">
                Abrir no mapa <span aria-hidden="true">↗</span>
              </a>
              {!mapOn ? (
                <button type="button" onClick={() => setMapOn(true)} className="btn btn-ghost">
                  Ver mapa aqui
                </button>
              ) : null}
            </div>

            <div className="mt-10">
              <p className="mono text-[0.6875rem] uppercase text-[var(--ec-metal-dim)]">
                Quem vem da região
              </p>
              <ul className="mt-3 flex flex-wrap gap-2">
                {AREAS.map((a) => (
                  <li key={a.slug}>
                    <a
                      href={pageHref(links, a.slug)}
                      className="mono inline-flex min-h-[44px] items-center border border-[var(--ec-line-soft)] px-3 text-[0.75rem] uppercase text-[var(--ec-metal)] transition-colors hover:border-[var(--ec-volt)] hover:text-[var(--ec-volt)]"
                    >
                      {a.name}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* A REPRESENTAÇÃO — ou o mapa, se a pessoa pedir. */}
          <div
            data-loc-map
            className="relative aspect-[4/3] w-full overflow-hidden border border-[var(--ec-line-soft)] bg-[var(--ec-ink-up)]"
          >
            {mapOn ? (
              <iframe
                title={`Mapa — ${BUSINESS.name}, ${BUSINESS.street}`}
                src={`https://www.google.com/maps?q=${query}&output=embed`}
                className="absolute inset-0 h-full w-full border-0 grayscale"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            ) : (
              <svg viewBox="0 0 400 300" className="absolute inset-0 h-full w-full" aria-hidden="true">
                <defs>
                  <pattern id="ec-grid" width="20" height="20" patternUnits="userSpaceOnUse">
                    <path d="M20 0H0V20" fill="none" stroke="rgb(173 178 180 / 0.12)" strokeWidth="1" />
                  </pattern>
                </defs>
                <rect width="400" height="300" fill="url(#ec-grid)" />
                {/* ruas estilizadas — é representação, não cartografia */}
                <path d="M-10 190 C 90 170, 170 210, 410 150" stroke="rgb(173 178 180 / 0.35)" strokeWidth="10" fill="none" />
                <path d="M130 -10 L 175 310" stroke="rgb(173 178 180 / 0.22)" strokeWidth="6" fill="none" />
                <path d="M290 -10 C 270 100, 320 200, 300 310" stroke="rgb(173 178 180 / 0.18)" strokeWidth="4" fill="none" />
                <circle cx="220" cy="178" r="34" fill="rgb(199 255 65 / 0.1)" />
                <circle cx="220" cy="178" r="9" fill="#c7ff41" />
                <line x1="220" y1="178" x2="220" y2="96" stroke="#c7ff41" strokeWidth="1" />
                <text x="228" y="100" fill="#f3f2ee" fontSize="11" fontFamily="monospace">
                  AV. VITÓRIA, 144
                </text>
              </svg>
            )}
            <span className="mono pointer-events-none absolute bottom-3 left-3 bg-[var(--ec-ink)] px-2 py-1 text-[0.625rem] uppercase text-[var(--ec-metal)]">
              {mapOn ? "Mapa interativo" : "Representação — não é escala"}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
