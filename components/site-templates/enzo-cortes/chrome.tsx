"use client";

// A CASCA do site: a barra fixa, o menu de tela cheia do celular, as ações
// flutuantes e o rodapé.
//
// ⚠️ A BARRA NÃO MUDA DE ALTURA AO ROLAR. Encolher é o gesto óbvio e é o
// proibido: altura é layout, e sujá-la a cada quadro trava a rolagem no lugar
// mais visível. O que muda é a SUPERFÍCIE (transparente → grafite) e a linha
// de progresso de leitura, que é `scaleX` — composição pura.
//
// ⚠️ SEM `backdrop-filter`: sobre um fundo já 92% opaco ele não muda nada na
// tela e cobra uma camada desfocada da largura da janela a cada quadro.
//
// ⚠️ O WHATSAPP SÓ EXISTE COM NÚMERO DE VERDADE (`PHONE_IS_PLACEHOLDER`).
// Enquanto o número for o espaço reservado, a ação persistente é "Agendar" —
// que leva à agenda real da Freelandoo — e o telefone some do rodapé.

import { useEffect, useRef, useState } from "react";

import {
  ADDRESS_LINE,
  BUSINESS,
  PHONE_IS_PLACEHOLDER,
  TEL_HREF,
  bookingCta,
  navFor,
  whatsappLink,
} from "./content/business";
import { AREAS } from "./content/areas";
import { SERVICES } from "./content/services";
import { Monogram } from "./deco";
import { PAGE, pageHref, type TemplateLinks } from "./lib";

/* ───────────────────────────── BARRA FIXA ──────────────────────────────── */

export function SiteHeader({ links }: { links: TemplateLinks }) {
  const [solid, setSolid] = useState(false);
  const [open, setOpen] = useState(false);
  const progressRef = useRef<HTMLSpanElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const nav = navFor(links);
  const cta = bookingCta(links);

  useEffect(() => {
    let queued = false;
    const paint = () => {
      queued = false;
      const y = window.scrollY;
      setSolid(y > 24);
      const max = document.documentElement.scrollHeight - window.innerHeight;
      if (progressRef.current) {
        progressRef.current.style.transform = `scaleX(${max > 0 ? Math.min(1, y / max) : 0})`;
      }
    };
    const onScroll = () => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(paint);
    };
    paint();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        toggleRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <header className="fixed inset-x-0 top-0 z-50">
      <div
        className="relative transition-colors duration-300"
        style={{
          background: solid && !open ? "rgb(9 10 11 / 0.92)" : "transparent",
          borderBottom: `1px solid ${solid && !open ? "var(--ec-line-soft)" : "transparent"}`,
        }}
      >
        <div
          className="relative z-10 mx-auto flex w-full max-w-[90rem] items-center justify-between gap-4 py-3"
          style={{ paddingInline: "var(--ec-pad)" }}
        >
          <a
            href={links.home}
            className="flex min-h-[44px] items-center gap-3 text-[var(--ec-volt)]"
            aria-label={`${BUSINESS.name} — início`}
          >
            <Monogram className="h-8 w-8" />
            <span className="display text-[1.375rem] leading-none text-[var(--ec-paper)]">
              Enzo <span className="text-[var(--ec-volt)]">Cortes</span>
            </span>
          </a>

          <nav className="hidden items-center gap-7 lg:flex" aria-label="Navegação principal">
            {nav.map((n) => (
              <a
                key={n.href}
                href={n.href}
                className="mono text-[0.6875rem] uppercase text-[var(--ec-metal)] transition-colors duration-150 hover:text-[var(--ec-volt)]"
              >
                {n.label}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <a
              href={cta.href}
              {...(cta.external ? { target: "_blank", rel: "noopener" } : {})}
              className="btn btn-solid !min-h-[44px] !px-4 !py-2.5 !text-[0.6875rem]"
            >
              {cta.label}
            </a>
            <button
              ref={toggleRef}
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-expanded={open}
              aria-controls="menu-celular"
              aria-label={open ? "Fechar o menu" : "Abrir o menu"}
              className="grid h-11 w-11 place-items-center border border-[var(--ec-line)] text-[var(--ec-paper)] lg:hidden"
            >
              <svg viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5">
                {open ? (
                  <path d="M4 4l12 12M16 4L4 16" strokeLinecap="square" />
                ) : (
                  <path d="M2 6h16M2 14h16" strokeLinecap="square" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* A linha de progresso de leitura. */}
        <span
          ref={progressRef}
          aria-hidden="true"
          className="absolute bottom-0 left-0 block h-px w-full origin-left bg-[var(--ec-volt)]"
          style={{ transform: "scaleX(0)" }}
        />
      </div>

      {/* ── MENU DE TELA CHEIA (celular) ─────────────────────────────── */}
      <nav
        id="menu-celular"
        aria-label="Navegação"
        aria-hidden={!open}
        className={`menu-sheet fixed inset-0 -z-0 flex flex-col bg-[var(--ec-ink)] pt-24 lg:hidden ${open ? "is-open" : ""}`}
        style={{ paddingInline: "var(--ec-pad)" }}
      >
        <ul className="flex flex-col">
          {nav.map((n, i) => (
            <li key={n.href} style={{ ["--i" as string]: i }} className="border-b border-[var(--ec-line-soft)]">
              <a
                href={n.href}
                tabIndex={open ? 0 : -1}
                onClick={() => setOpen(false)}
                className="flex min-h-[64px] items-center justify-between py-3"
              >
                <span className="display text-[clamp(2.5rem,12vw,4rem)] leading-none text-[var(--ec-paper)]">
                  {n.label}
                </span>
                <span className="mono text-[0.75rem] text-[var(--ec-volt)]">{String(i + 1).padStart(2, "0")}</span>
              </a>
            </li>
          ))}
        </ul>
        <p className="mono mt-auto pb-8 text-[0.75rem] uppercase text-[var(--ec-metal)]">
          {ADDRESS_LINE}
          <br />
          {BUSINESS.hoursShort}
        </p>
      </nav>
    </header>
  );
}

/* ───────────────────────── AÇÕES FLUTUANTES ────────────────────────────── */

/**
 * O botão de agendar persistente (celular) e, com número real, o WhatsApp.
 *
 * Aparece só depois do hero (que já tem o botão à vista) e fica no canto,
 * pequeno: acessível sempre, sem cobrir o conteúdo.
 */
export function FloatingActions({ links }: { links: TemplateLinks }) {
  const [past, setPast] = useState(false);
  const [covered, setCovered] = useState(false);
  const shown = past && !covered;
  const cta = bookingCta(links);

  // Some onde a própria seção já oferece "Agendar" (`data-own-cta`): ali o
  // botão flutuante só cobriria o botão de verdade.
  useEffect(() => {
    const zones = Array.from(document.querySelectorAll("[data-own-cta]"));
    if (!zones.length) return;
    const on = new Set<Element>();
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => (e.isIntersecting ? on.add(e.target) : on.delete(e.target)));
      setCovered(on.size > 0);
    });
    zones.forEach((z) => io.observe(z));
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    let queued = false;
    const check = () => {
      queued = false;
      setPast(window.scrollY > window.innerHeight * 0.85);
    };
    const onScroll = () => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(check);
    };
    check();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div
      className="fixed bottom-4 right-4 z-40 flex flex-col items-end gap-2 transition-opacity duration-300"
      style={{ opacity: shown ? 1 : 0, pointerEvents: shown ? "auto" : "none" }}
      aria-hidden={!shown}
    >
      {!PHONE_IS_PLACEHOLDER ? (
        <a
          href={whatsappLink("Olá, Enzo! Vi o site e queria marcar um horário.")}
          target="_blank"
          rel="noopener"
          tabIndex={shown ? 0 : -1}
          aria-label="Falar no WhatsApp"
          className="grid h-12 w-12 place-items-center"
          style={{ background: "#25D366", color: "#0b2e18" }}
        >
          <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor" aria-hidden="true">
            <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38a9.9 9.9 0 0 0 4.79 1.22h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2Zm4.52 11.99c-.25-.12-1.47-.72-1.69-.81-.23-.08-.39-.12-.56.13-.16.24-.64.8-.78.97-.15.16-.29.19-.53.06-.25-.12-1.05-.39-1.99-1.23-.74-.66-1.23-1.47-1.38-1.72-.14-.25-.01-.38.11-.5.11-.11.25-.29.37-.43.13-.15.17-.25.25-.41.08-.17.04-.31-.02-.43-.06-.12-.56-1.34-.76-1.84-.2-.48-.4-.42-.56-.42l-.47-.01c-.16 0-.43.06-.65.31-.23.25-.86.84-.86 2.04s.88 2.37 1 2.53c.12.17 1.73 2.64 4.19 3.7.59.25 1.04.4 1.4.52.59.19 1.12.16 1.55.1.47-.07 1.47-.6 1.67-1.18.21-.58.21-1.07.15-1.18-.06-.1-.22-.16-.47-.29Z" />
          </svg>
        </a>
      ) : null}
      <a
        href={cta.href}
        {...(cta.external ? { target: "_blank", rel: "noopener" } : {})}
        tabIndex={shown ? 0 : -1}
        className="btn btn-solid !min-h-[48px] !px-5 shadow-[0_12px_32px_-8px_rgb(199_255_65/0.45)] lg:!hidden"
      >
        {cta.label}
      </a>
    </div>
  );
}

/* ──────────────────────────────── RODAPÉ ───────────────────────────────── */

const FOOT_LINK =
  "text-[0.875rem] text-[var(--ec-metal)] transition-colors duration-150 hover:text-[var(--ec-volt)]";

export function SiteFooter({ links }: { links: TemplateLinks }) {
  return (
    <footer className="relative border-t border-[var(--ec-line-soft)] pt-16">
      <div className="mx-auto w-full max-w-[90rem] pb-10" style={{ paddingInline: "var(--ec-pad)" }}>
        <p className="hero-word text-[clamp(4rem,16vw,13rem)] text-[var(--ec-ink-hi)]" aria-hidden="true">
          Enzo Cortes
        </p>

        <div className="mt-12 grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <h2 className="eyebrow mb-4">A casa</h2>
            <address className="not-italic text-[0.875rem] leading-relaxed text-[var(--ec-metal)]">
              {BUSINESS.street}
              <br />
              {BUSINESS.neighborhood}
              <br />
              {BUSINESS.city}/{BUSINESS.state} · {BUSINESS.postalCode}
            </address>
            <p className="mt-4 text-[0.875rem] text-[var(--ec-metal)]">
              {BUSINESS.hoursHuman}
              <br />
              <span className="text-[var(--ec-metal-dim)]">{BUSINESS.closedHuman}</span>
            </p>
            {!PHONE_IS_PLACEHOLDER ? (
              <p className="mt-4">
                <a href={TEL_HREF} className="text-[0.875rem] text-[var(--ec-volt)] hover:underline">
                  {BUSINESS.phoneDisplay}
                </a>
              </p>
            ) : null}
          </div>

          <div>
            <h2 className="eyebrow mb-4">Serviços</h2>
            <ul className="space-y-2">
              {SERVICES.map((s) => (
                <li key={s.slug}>
                  <a href={pageHref(links, s.slug)} className={FOOT_LINK}>
                    {s.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h2 className="eyebrow mb-4">Bairros</h2>
            <ul className="space-y-2">
              {AREAS.map((a) => (
                <li key={a.slug}>
                  <a href={pageHref(links, a.slug)} className={FOOT_LINK}>
                    {a.name}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h2 className="eyebrow mb-4">O site</h2>
            <ul className="space-y-2">
              <li>
                <a href={links.home} className={FOOT_LINK}>
                  Início
                </a>
              </li>
              <li>
                <a href={pageHref(links, PAGE.servicos)} className={FOOT_LINK}>
                  Serviços e preços
                </a>
              </li>
              <li>
                <a href={pageHref(links, PAGE.sobre)} className={FOOT_LINK}>
                  A barbearia
                </a>
              </li>
              <li>
                <a href={pageHref(links, PAGE.contato)} className={FOOT_LINK}>
                  Onde fica
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 border-t border-[var(--ec-line-soft)] pt-6">
          <p className="mono text-[0.6875rem] uppercase text-[var(--ec-metal-dim)]">
            {BUSINESS.name} · {ADDRESS_LINE}
          </p>
        </div>
      </div>
    </footer>
  );
}
