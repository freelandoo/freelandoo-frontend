"use client";

/**
 * BARRA DA PRANCHA.
 *
 * Ela é fina de propósito: num site cujo trabalho é fazer o telefone tocar,
 * a barra existe para carregar o telefone, não para hospedar um menu grande.
 *
 * ⚠️ ELEMENTO FIXO NA BORDA NÃO É RECORTADO POR NADA. O `overflow-x: clip`
 * mora no `main` e no `footer`; esta barra é IRMÃ deles. Qualquer coisa
 * aqui que cresça lateralmente além da janela abre rolagem horizontal no
 * documento inteiro — e o sintoma aparece só no celular, só em algumas
 * páginas, e não parece ter nada a ver com a barra.
 */

import Link from "next/link";
import { useEffect, useState } from "react";
import BrandMark from "./draw/brand-mark";
import { BUSINESS, BOOKING_URL, navFor, TEL_HREF, whatsappLink } from "./content/business";
import type { TemplateLinks } from "@/types/site-template";

export default function SiteHeader({ links }: { links: TemplateLinks }) {
  const NAV = navFor(links);
  const [solid, setSolid] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setSolid(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Fecha o menu ao trocar de página: o Link navega sem desmontar a barra.
  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    window.addEventListener("resize", close);
    return () => window.removeEventListener("resize", close);
  }, [open]);

  return (
    <header
      className="fixed inset-x-0 top-0 z-40 transition-colors duration-300"
      style={{
        background: solid ? "rgb(25 28 31 / 0.92)" : "transparent",
        backdropFilter: solid ? "blur(8px)" : undefined,
        borderBottom: `1px solid ${solid ? "var(--rf-line)" : "transparent"}`,
      }}
    >
      <div className="mx-auto flex h-16 max-w-[1400px] items-center gap-4 px-[var(--sheet-pad)]">
        <Link
          href={links.home}
          className="flex shrink-0 items-center gap-2.5"
          aria-label={`${BUSINESS.name} — página inicial`}
        >
          <BrandMark size={26} />
          {/*
            ⚠️ O nome NÃO some no celular. Ele estava atrás de `sm:block` e,
            num aparelho de 390px, a barra mostrava só o símbolo — quem chega
            por busca não tem como saber de quem é o site. O que cede espaço
            é o corpo do texto, não o nome do negócio.
          */}
          <span className="font-[family-name:var(--rf-display)] text-[0.95rem] font-bold uppercase tracking-tight text-[var(--rf-chalk)] sm:text-[1.125rem]">
            {BUSINESS.name}
          </span>
        </Link>

        <nav className="ml-auto hidden items-center gap-7 lg:flex">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className="text-sm text-[var(--rf-chalk-dim)] transition-colors hover:text-[var(--rf-chalk)]"
            >
              {n.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2 lg:ml-0">
          <a
            href={TEL_HREF}
            className="hidden text-sm text-[var(--rf-chalk)] transition-colors hover:text-[var(--rf-flame-hi)] md:block"
          >
            {BUSINESS.phoneDisplay}
          </a>
          {BOOKING_URL ? (
            <a href={BOOKING_URL} className="btn btn-primary hidden py-2.5 sm:inline-flex">
              Agendar
            </a>
          ) : null}
          <a
            href={whatsappLink(
              `Olá, Ricardo! Vi o site e preciso de atendimento no meu fogão.`,
            )}
            target="_blank"
            rel="noopener"
            className="btn btn-wa py-2.5"
          >
            WhatsApp
          </a>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-label={open ? "Fechar menu" : "Abrir menu"}
            className="grid h-10 w-10 place-items-center border border-[var(--rf-line-mid)] lg:hidden"
          >
            <span className="relative block h-3 w-4">
              <span
                className="absolute left-0 block h-px w-4 bg-[var(--rf-chalk)] transition-transform duration-200"
                style={{ top: open ? 6 : 1, transform: open ? "rotate(45deg)" : "none" }}
              />
              <span
                className="absolute left-0 block h-px w-4 bg-[var(--rf-chalk)] transition-opacity duration-200"
                style={{ top: 6, opacity: open ? 0 : 1 }}
              />
              <span
                className="absolute left-0 block h-px w-4 bg-[var(--rf-chalk)] transition-transform duration-200"
                style={{ top: open ? 6 : 11, transform: open ? "rotate(-45deg)" : "none" }}
              />
            </span>
          </button>
        </div>
      </div>

      {open ? (
        <nav
          className="border-t border-[var(--rf-line)] lg:hidden"
          style={{ background: "rgb(25 28 31 / 0.98)" }}
        >
          <ul className="px-[var(--sheet-pad)] py-2">
            {NAV.map((n) => (
              <li key={n.href} className="border-b border-[var(--rf-line)] last:border-0">
                <Link
                  href={n.href}
                  onClick={() => setOpen(false)}
                  className="block py-3.5 text-[var(--rf-chalk)]"
                >
                  {n.label}
                </Link>
              </li>
            ))}
            <li className="pt-3.5 pb-2">
              <a href={TEL_HREF} className="d-sm block text-[var(--rf-flame-hi)]">
                {BUSINESS.phoneDisplay}
              </a>
              <span className="note mt-1 block">{BUSINESS.hoursShort}</span>
            </li>
          </ul>
        </nav>
      ) : null}
    </header>
  );
}
