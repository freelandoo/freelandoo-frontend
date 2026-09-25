"use client";

// OS COMBINADOS — as peças avulsas se juntam e viram o preço fechado.
//
// Duas cenas (corte + barba; corte + barba + sobrancelha). No desktop cada
// uma é fixada por um trecho de rolagem: as peças começam afastadas, se
// aproximam, se empilham, e o resultado (preço combinado + economia) entra
// na frente delas. A rolagem conduz nos dois sentidos, sem estado discreto.
//
// ⚠️ OS NÚMEROS SÃO LIDOS DA TABELA E ESTÃO NO HTML. `sumOfParts` e `saving`
// são as mesmas contas da página do serviço — a economia é CALCULADA, nunca
// digitada, porque ela aparece em quatro lugares e o cliente refaz a conta
// de cabeça na cadeira.
//
// ⚠️ SEM ANIMAÇÃO, O LAYOUT ESTÁTICO JÁ É A RESPOSTA: peças lado a lado, um
// "=" e o resultado. Movimento reduzido, celular e JS bloqueado veem isso.
//
// Por que transformações com scrub e não GSAP Flip: Flip anima entre DOIS
// LAYOUTS medidos, e aqui o gesto precisa ser reversível quadro a quadro pela
// rolagem. Um `x/y` interpolado entre posições calculadas faz o mesmo sem
// reescrever o DOM no meio do gesto.

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

import { SERVICES, getService, saving, sumOfParts } from "../content/services";
import { brl, pageHref, type TemplateLinks } from "../lib";

export default function Combos({ links }: { links: TemplateLinks }) {
  const ref = useRef<HTMLElement>(null);
  const combos = SERVICES.filter((s) => s.sumOf?.length);

  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    gsap.registerPlugin(ScrollTrigger);
    const mm = gsap.matchMedia();

    mm.add(
      "(min-width: 1024px) and (prefers-reduced-motion: no-preference)",
      () => {
        // A sobreposição das peças é CLASSE, posta antes dos gatilhos: sem a
        // cena (celular, movimento reduzido, sem JS) elas ficam lado a lado.
        root.classList.add("combo-scene");
        gsap.utils.toArray<HTMLElement>("[data-combo]", root).forEach((scene) => {
          const parts = gsap.utils.toArray<HTMLElement>("[data-part]", scene);
          const result = scene.querySelector<HTMLElement>("[data-result]");
          const equals = scene.querySelector<HTMLElement>("[data-equals]");
          const k = parts.length;

          const tl = gsap.timeline({
            scrollTrigger: {
              trigger: scene,
              start: "top top",
              end: "+=110%",
              pin: true,
              scrub: 0.6,
              anticipatePin: 1,
            },
          });

          // 1) as peças partem espalhadas…
          parts.forEach((p, i) => {
            const spread = (i - (k - 1) / 2) * 1.35;
            tl.fromTo(
              p,
              { xPercent: spread * 115, yPercent: (i % 2 ? 1 : -1) * 22, rotation: (i - 1) * 7 },
              // O leque final deixa o nome de cada peça à vista.
              { xPercent: (i - (k - 1) / 2) * 64, yPercent: (i - (k - 1) / 2) * 6, rotation: (i - (k - 1) / 2) * 5, ease: "power2.inOut", duration: 1 },
              0,
            );
          });
          if (equals) tl.fromTo(equals, { opacity: 0, scale: 0.6 }, { opacity: 1, scale: 1, duration: 0.4 }, 0.6);
          // 2) …e o resultado entra por cima delas.
          if (result) {
            tl.fromTo(
              result,
              { opacity: 0, yPercent: 30, scale: 0.92 },
              { opacity: 1, yPercent: 0, scale: 1, ease: "power3.out", duration: 0.7 },
              0.75,
            );
          }
          tl.to({}, { duration: 0.3 });
        });
        return () => root.classList.remove("combo-scene");
      },
    );

    return () => mm.revert();
  }, []);

  return (
    <section ref={ref} id="combinados" aria-labelledby="combinados-titulo" className="relative">
      <div className="mx-auto w-full max-w-[90rem] pt-20 md:pt-28" style={{ paddingInline: "var(--ec-pad)" }}>
        <p className="eyebrow" data-reveal="up">
          Combinados
        </p>
        <h2
          id="combinados-titulo"
          className="display mt-4 max-w-[14ch] text-[clamp(3rem,8vw,6.5rem)] text-[var(--ec-paper)]"
          data-reveal="up"
        >
          Junto sai <span className="text-[var(--ec-volt)]">mais em conta</span>
        </h2>
      </div>

      {combos.map((c, idx) => {
        const parts = (c.sumOf ?? []).map((slug) => getService(slug)).filter((s): s is NonNullable<typeof s> => !!s);
        const sum = sumOfParts(c);
        const eco = saving(c);
        return (
          <div
            key={c.slug}
            data-combo
            className="relative flex min-h-[70svh] items-center py-16 lg:min-h-[100svh]"
          >
            <div
              className="mx-auto grid w-full max-w-[80rem] items-center gap-10 lg:grid-cols-[1fr_auto_1fr]"
              style={{ paddingInline: "var(--ec-pad)" }}
            >
              {/* AS PEÇAS */}
              <ul className="combo-parts flex flex-wrap justify-center gap-3">
                {parts.map((p, i) => (
                  <li
                    key={p.slug}
                    data-part
                    className="combo-part chamfer relative w-[9.5rem] border border-[var(--ec-line)] bg-[var(--ec-graphite)] p-4"
                    style={{ zIndex: i + 1 }}
                  >
                    <span className="mono block text-[0.625rem] text-[var(--ec-metal-dim)]">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span className="display mt-6 block text-[1.75rem] leading-none text-[var(--ec-paper)]">
                      {p.label}
                    </span>
                    <span className="mono tnum mt-2 block text-[0.875rem] text-[var(--ec-metal)]">{brl(p.price)}</span>
                  </li>
                ))}
              </ul>

              <span
                data-equals
                className="display text-center text-[3rem] leading-none text-[var(--ec-volt-deep)]"
                aria-hidden="true"
              >
                =
              </span>

              {/* O RESULTADO */}
              <div data-result className="relative" data-tilt>
                <div className="chamfer relative border border-[var(--ec-line-volt)] bg-[linear-gradient(160deg,rgb(227_185_79/0.08),transparent_45%),var(--ec-ink-up)] p-7 md:p-9">
                  <span className="mono text-[0.6875rem] uppercase text-[var(--ec-volt)]">
                    Combinado {String(idx + 1).padStart(2, "0")}
                  </span>
                  <h3 className="display mt-3 text-[clamp(2rem,4vw,3rem)] text-[var(--ec-paper)]">{c.label}</h3>
                  <dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-4 border-t border-[var(--ec-line-soft)] pt-5">
                    <div>
                      <dt className="mono text-[0.6875rem] uppercase text-[var(--ec-metal-dim)]">Avulsos</dt>
                      <dd className="mono tnum mt-1 text-[1.125rem] text-[var(--ec-metal)] line-through">{brl(sum)}</dd>
                    </div>
                    <div>
                      <dt className="mono text-[0.6875rem] uppercase text-[var(--ec-metal-dim)]">Economia</dt>
                      <dd className="mono tnum mt-1 text-[1.125rem] text-[var(--ec-volt)]">{brl(eco)}</dd>
                    </div>
                    <div className="col-span-2">
                      <dt className="mono text-[0.6875rem] uppercase text-[var(--ec-metal-dim)]">Combinado</dt>
                      <dd className="display tnum mt-1 text-[clamp(3.5rem,8vw,5.5rem)] leading-none text-[var(--ec-volt)]">
                        {brl(c.price)}
                      </dd>
                    </div>
                  </dl>
                  <a
                    href={pageHref(links, c.slug)}
                    className="mono mt-6 inline-flex min-h-[44px] items-center gap-2 text-[0.75rem] uppercase text-[var(--ec-paper)] hover:text-[var(--ec-volt)]"
                  >
                    O que está incluído <span aria-hidden="true">→</span>
                  </a>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </section>
  );
}
