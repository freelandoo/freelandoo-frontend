"use client";

// COMO FUNCIONA — três passos contados como uma cena.
//
// No desktop a seção é fixada e a rolagem troca o estado: o número gigante
// gira de 01 para 03, a régua de progresso avança e o texto do passo entra.
// No celular (e sem movimento) os três passos ficam empilhados — a mesma
// informação, sem cena.
//
// ⚠️ OS TRÊS TEXTOS ESTÃO NO HTML SEMPRE. A cena só controla qual está à
// frente; o leitor de tela e o buscador leem os três.
//
// ⚠️ "RECOMENDADO", NUNCA "OBRIGATÓRIO". A barbearia atende quem chega; marcar
// é o que evita a cadeira ocupada no sábado. Escrever que é obrigatório seria
// mentir e ainda afastar quem ia passar na porta.

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

export type Step = { n: string; title: string; text: string };

export default function Journey({
  steps,
  bookingHref,
  bookingExternal,
}: {
  steps: readonly Step[];
  bookingHref: string;
  bookingExternal: boolean;
}) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    gsap.registerPlugin(ScrollTrigger);
    const mm = gsap.matchMedia();
    mm.add("(min-width: 1024px) and (prefers-reduced-motion: no-preference)", () => {
      const panels = gsap.utils.toArray<HTMLElement>("[data-step]", root);
      const nums = gsap.utils.toArray<HTMLElement>("[data-step-num]", root);
      const bar = root.querySelector<HTMLElement>("[data-step-bar]");
      const stage = root.querySelector<HTMLElement>("[data-step-stage]");
      if (!stage) return;
      // A cena é CLASSE: sem ela (celular, movimento reduzido, sem JS) os
      // três passos ficam empilhados e legíveis, em vez de sobrepostos.
      root.classList.add("is-scene");

      gsap.set(panels.slice(1), { autoAlpha: 0, yPercent: 20 });
      gsap.set(nums.slice(1), { yPercent: 100 });

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: stage,
          start: "top top",
          end: `+=${window.innerHeight * 1.6}`,
          pin: true,
          scrub: 0.6,
          anticipatePin: 1,
          invalidateOnRefresh: true,
        },
      });
      if (bar) tl.fromTo(bar, { scaleX: 1 / steps.length }, { scaleX: 1, ease: "none", duration: steps.length - 1 }, 0);
      for (let i = 1; i < steps.length; i++) {
        const at = i - 1 + 0.35;
        tl.to(panels[i - 1], { autoAlpha: 0, yPercent: -20, duration: 0.45 }, at);
        tl.to(nums[i - 1], { yPercent: -100, duration: 0.45 }, at);
        tl.to(panels[i], { autoAlpha: 1, yPercent: 0, duration: 0.45 }, at + 0.1);
        tl.to(nums[i], { yPercent: 0, duration: 0.45 }, at);
      }
      return () => root.classList.remove("is-scene");
    });
    return () => mm.revert();
  }, [steps.length]);

  return (
    <section ref={ref} id="como-funciona" aria-labelledby="como-titulo" className="relative">
      <div data-step-stage className="journey-stage relative flex items-center py-20 md:py-28">
        <div
          className="mx-auto grid w-full max-w-[90rem] gap-10 lg:grid-cols-[1fr_1.1fr] lg:items-center"
          style={{ paddingInline: "var(--ec-pad)" }}
        >
          <div>
            <p className="eyebrow">Como funciona</p>
            <h2
              id="como-titulo"
              className="display mt-4 text-[clamp(3rem,8vw,6.5rem)] text-[var(--ec-paper)]"
            >
              Três passos, <span className="text-[var(--ec-volt)]">sem mistério</span>
            </h2>

            {/* O numeral gigante: uma janela, e os três números passando nela. */}
            <div className="journey-scene-only relative mt-8 h-[16rem] overflow-hidden" aria-hidden="true">
              {steps.map((s) => (
                <span
                  key={s.n}
                  data-step-num
                  className="display tnum absolute left-0 top-0 block text-[16rem] text-[var(--ec-volt)]"
                  style={{ lineHeight: 1 }}
                >
                  {s.n}
                </span>
              ))}
            </div>

            <div className="journey-scene-only mt-6 h-px w-full bg-[var(--ec-line-soft)]" aria-hidden="true">
              <span data-step-bar className="block h-px w-full origin-left bg-[var(--ec-volt)]" />
            </div>
          </div>

          {/* O reveal fica na LISTA, não nos passos: a cena escreve a opacidade de
              cada passo, e dois donos da mesma propriedade brigam. */}
          <ol className="journey-list relative grid gap-4" data-reveal="up">
            {steps.map((s, i) => (
              <li
                key={s.n}
                data-step
                className="journey-step chamfer relative border border-[var(--ec-line-soft)] bg-[var(--ec-graphite)] p-7 md:p-9"
              >
                <span className="journey-noscene display tnum block text-[3.5rem] leading-none text-[var(--ec-volt)]" aria-hidden="true">
                  {s.n}
                </span>
                <span className="mono block text-[0.6875rem] uppercase text-[var(--ec-metal-dim)]">
                  Passo {s.n} / {String(steps.length).padStart(2, "0")}
                </span>
                <h3 className="display mt-4 text-[clamp(2rem,4vw,3.25rem)] text-[var(--ec-paper)]">{s.title}</h3>
                <p className="mt-4 max-w-[34rem] text-[1rem] leading-relaxed text-[var(--ec-metal)]">{s.text}</p>
                {i === 1 ? (
                  <a
                    href={bookingHref}
                    {...(bookingExternal ? { target: "_blank", rel: "noopener" } : {})}
                    className="btn btn-solid mt-6"
                  >
                    Ver horários
                  </a>
                ) : null}
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
