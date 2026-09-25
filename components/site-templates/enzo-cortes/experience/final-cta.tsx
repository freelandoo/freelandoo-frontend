"use client";

// O FECHAMENTO — "SEU PRÓXIMO CORTE COMEÇA AQUI."
//
// A linguagem da abertura (tipo gigante e a lâmina) numa composição nova, com
// a luz seguindo o cursor e o botão magnético (`data-magnetic`, tratado em
// `motion.tsx`).
//
// Se a pessoa deixou um serviço em destaque na roda, o botão diz qual
// ("Agendar · Corte") — ver `selection.ts` para por que isso é contexto e não
// pré-seleção na agenda.
//
// ⚠️ O WHATSAPP SÓ APARECE COM NÚMERO DE VERDADE. Enquanto o telefone do
// negócio for o espaço reservado, um `wa.me` levaria o cliente do Enzo a um
// número que não existe. `PHONE_IS_PLACEHOLDER` é a chave.

import { useEffect, useRef } from "react";
import gsap from "gsap";

import { PHONE_IS_PLACEHOLDER, whatsappLink } from "../content/business";
import { getService } from "../content/services";
import { Blade } from "./blade";
import { useSelectedService } from "./selection";

export default function FinalCta({
  bookingHref,
  bookingExternal,
}: {
  bookingHref: string;
  bookingExternal: boolean;
}) {
  const ref = useRef<HTMLElement>(null);
  const lightRef = useRef<HTMLDivElement>(null);
  const selected = useSelectedService();
  const service = selected ? getService(selected) : undefined;

  useEffect(() => {
    const root = ref.current;
    const light = lightRef.current;
    if (!root || !light) return;
    const fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!fine || reduced) return;
    const lx = gsap.quickTo(light, "x", { duration: 0.9, ease: "power3.out" });
    const ly = gsap.quickTo(light, "y", { duration: 0.9, ease: "power3.out" });
    const tilts = Array.from(root.querySelectorAll<HTMLElement>("[data-blade-tilt]")).map((el) => ({
      rx: gsap.quickTo(el, "rotationX", { duration: 0.8 }),
      ry: gsap.quickTo(el, "rotationY", { duration: 0.8 }),
    }));
    const onMove = (e: PointerEvent) => {
      const r = root.getBoundingClientRect();
      lx(e.clientX - r.left);
      ly(e.clientY - r.top);
      const px = (e.clientX - r.left) / r.width - 0.5;
      const py = (e.clientY - r.top) / r.height - 0.5;
      tilts.forEach((t) => {
        t.ry(px * 36);
        t.rx(-py * 20);
      });
    };
    root.addEventListener("pointermove", onMove);
    return () => root.removeEventListener("pointermove", onMove);
  }, []);

  return (
    <section
      ref={ref}
      id="agendar"
      data-own-cta
      aria-labelledby="final-titulo"
      className="relative isolate overflow-hidden border-t border-[var(--ec-line-soft)] py-24 md:py-36"
    >
      <div ref={lightRef} className="hero-light" style={{ transform: "translate3d(50vw, 50%, 0)" }} aria-hidden="true" />
      <Blade className="pointer-events-none absolute right-[8%] top-[12%] hidden h-64 w-20 opacity-80 lg:block" />

      <div className="relative mx-auto w-full max-w-[90rem]" style={{ paddingInline: "var(--ec-pad)" }}>
        <p className="eyebrow" data-reveal="up">
          Agendar
        </p>
        <h2
          id="final-titulo"
          className="display mt-6 max-w-[12ch] text-[clamp(3.5rem,11vw,10rem)] leading-[0.85] text-[var(--ec-paper)]"
          data-reveal="mask"
        >
          Seu próximo corte <span className="text-[var(--ec-volt)]">começa aqui.</span>
        </h2>

        <p className="mt-8 max-w-[34rem] text-[1.0625rem] leading-relaxed text-[var(--ec-metal)]" data-reveal="up">
          Escolha o dia e a hora na agenda e a cadeira fica reservada no seu nome.
          Marcar não é obrigatório — mas no sábado faz diferença.
        </p>

        <div className="mt-12 flex flex-wrap items-center gap-4" data-reveal="up">
          <span data-magnetic="0.45" className="inline-block">
            <a
              href={bookingHref}
              {...(bookingExternal ? { target: "_blank", rel: "noopener" } : {})}
              className="btn btn-solid !min-h-[64px] !px-10 !text-[0.875rem]"
            >
              {service ? `Agendar · ${service.label}` : "Agendar horário"}
              <span aria-hidden="true">→</span>
            </a>
          </span>
          {!PHONE_IS_PLACEHOLDER ? (
            <a
              href={whatsappLink(
                service
                  ? `Olá, Enzo! Queria marcar: ${service.label}.`
                  : "Olá, Enzo! Vi o site e queria marcar um horário.",
              )}
              target="_blank"
              rel="noopener"
              className="btn btn-ghost !min-h-[64px]"
            >
              Chamar no WhatsApp
            </a>
          ) : null}
        </div>
      </div>
    </section>
  );
}
