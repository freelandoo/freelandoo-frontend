"use client";

/**
 * A CASCA: barra fixa, menu do celular, rodapé e botão flutuante.
 *
 * ⚠️ ESTE É O ÚNICO ARQUIVO DE CLIENTE COM GESTO no site (o outro, o de
 * movimento, não desenha nada). Tudo mais é componente de servidor, porque
 * fonte, folha e JSON-LD precisam estar no HTML que o buscador lê.
 */

import { useEffect, useState } from "react";

import { ADDRESS_LINE, BUSINESS, TEL_HREF, bookingCta, navFor, whatsappLink } from "./content/business";
import { AREAS } from "./content/areas";
import { SERVICES } from "./content/services";
import { DecoDivider, Monogram } from "./deco";
import { PAGE, pageHref, type TemplateLinks } from "./lib";

/* ───────────────────────────── BARRA FIXA ──────────────────────────────── */

export function SiteHeader({ links }: { links: TemplateLinks }) {
  const [solid, setSolid] = useState(false);
  const [open, setOpen] = useState(false);
  const nav = navFor(links);
  // ⚠️ UM SÓ DECISOR para o botão da barra — ver `bookingCta`. Com serviço
  // reservável ele AGENDA; sem, cai no WhatsApp.
  const cta = bookingCta(links);

  useEffect(() => {
    const onScroll = () => setSolid(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Esc fecha o menu. Sem isto, quem abriu pelo teclado fica preso dentro
  // dele — a saída seria caçar o botão de fechar com Tab.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <header
      className="fixed inset-x-0 top-0 z-50 transition-colors duration-300"
      style={{
        background: solid || open ? "rgb(5 4 3 / 0.94)" : "transparent",
        borderBottom: `1px solid ${solid || open ? "var(--ec-line-soft)" : "transparent"}`,
      }}
    >
      <div
        className="mx-auto flex w-full max-w-[80rem] items-center justify-between gap-4 py-3"
        style={{ paddingInline: "var(--ec-pad)" }}
      >
        <a
          href={links.home}
          className="flex items-center gap-3 text-[var(--ec-gold)]"
          aria-label={`${BUSINESS.name} — início`}
        >
          <Monogram className="h-9 w-9" />
          <span className="display hidden text-[1.25rem] leading-none text-[var(--ec-cream)] sm:block">
            Enzo <span className="display-italic text-[var(--ec-gold-hi)]">Cortes</span>
          </span>
        </a>

        <nav className="hidden items-center gap-8 md:flex" aria-label="Navegação principal">
          {nav.map((n) => (
            <a
              key={n.href}
              href={n.href}
              className="text-[0.8125rem] uppercase tracking-[0.16em] text-[var(--ec-cream-dim)] transition-colors duration-200 hover:text-[var(--ec-gold-hi)]"
            >
              {n.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <a
            href={cta.href}
            {...(cta.external ? { target: "_blank", rel: "noopener" } : {})}
            className="btn btn-solid !px-4 !py-2.5 !text-[0.6875rem]"
          >
            {cta.label}
          </a>

          {/* O botão do menu só existe abaixo do md — acima dele a navegação
              está toda visível, e um botão que abre o que já está na tela é
              um passo a mais para nada. */}
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-controls="menu-celular"
            aria-label={open ? "Fechar o menu" : "Abrir o menu"}
            className="flex h-10 w-10 items-center justify-center border border-[var(--ec-line)] text-[var(--ec-gold-hi)] md:hidden"
          >
            <svg viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5">
              {open ? (
                <path d="M4 4l12 12M16 4L4 16" strokeLinecap="square" />
              ) : (
                <path d="M2 5h16M2 10h16M2 15h16" strokeLinecap="square" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {open ? (
        <nav
          id="menu-celular"
          aria-label="Navegação"
          className="border-t border-[var(--ec-line-soft)] md:hidden"
          style={{ background: "rgb(5 4 3 / 0.98)" }}
        >
          <ul className="flex flex-col" style={{ paddingInline: "var(--ec-pad)" }}>
            {nav.map((n) => (
              <li key={n.href} className="border-b border-[var(--ec-line-soft)] last:border-0">
                <a
                  href={n.href}
                  onClick={() => setOpen(false)}
                  className="block py-4 text-[0.9375rem] uppercase tracking-[0.14em] text-[var(--ec-cream)]"
                >
                  {n.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      ) : null}
    </header>
  );
}

/* ────────────────────────── BOTÃO FLUTUANTE ────────────────────────────── */

/**
 * ⚠️⚠️ O BRILHO É `box-shadow`, NUNCA `transform: scale`.
 *
 * Este botão é `fixed` e encosta na borda. O `overflow-x: clip` mora no
 * `main` e no `footer` — ele é IRMÃO deles e não é recortado por NADA.
 * A conta já foi medida na plataforma: um anel `animate-ping` (que é
 * `scale(2)`) num botão de 56px a 16px da borda chega a 112px, 28px para
 * cada lado, 12px além da tela — e o DOCUMENTO INTEIRO ganha 8px de rolagem
 * horizontal. O sintoma aparece só no celular, só em algumas páginas, e não
 * parece ter nada a ver com o botão.
 *
 * Sombra é pintada FORA da caixa e não entra na região rolável. Mesmo efeito
 * visual, custo zero de layout.
 *
 * ⚠️ O host TEM que ser `wa.me` — é por ele que o painel de Indicadores da
 * Freelandoo reconhece o clique como lead. Outro host e o lead some da conta
 * sem erro nenhum.
 */
export function WhatsappFab() {
  const [shown, setShown] = useState(false);

  useEffect(() => {
    // Só aparece depois que a pessoa desceu do topo: no primeiro quadro ela
    // já tem o botão da barra e o do banner à vista, e um terceiro flutuando
    // por cima só tapa conteúdo.
    const onScroll = () => setShown(window.scrollY > 560);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <a
      href={whatsappLink("Olá, Enzo! Vi o site e queria marcar um horário.")}
      target="_blank"
      rel="noopener"
      aria-label="Falar no WhatsApp"
      className="fixed bottom-5 right-5 z-40 grid h-14 w-14 place-items-center transition-[opacity,box-shadow] duration-300"
      style={{
        background: "#25D366",
        color: "#0b2e18",
        opacity: shown ? 1 : 0,
        pointerEvents: shown ? "auto" : "none",
        boxShadow: shown
          ? "0 0 0 6px rgb(37 211 102 / 0.16), 0 10px 30px rgb(0 0 0 / 0.5)"
          : "0 0 0 0 rgb(37 211 102 / 0)",
      }}
    >
      <svg viewBox="0 0 24 24" width="26" height="26" fill="currentColor">
        <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38a9.9 9.9 0 0 0 4.79 1.22h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2Zm0 18.15h-.01a8.2 8.2 0 0 1-4.19-1.15l-.3-.18-3.11.82.83-3.04-.2-.31a8.2 8.2 0 0 1-1.26-4.38c0-4.54 3.7-8.23 8.24-8.23 2.2 0 4.27.86 5.83 2.41a8.19 8.19 0 0 1 2.41 5.83c0 4.54-3.7 8.23-8.24 8.23Zm4.52-6.16c-.25-.12-1.47-.72-1.69-.81-.23-.08-.39-.12-.56.13-.16.24-.64.8-.78.97-.15.16-.29.19-.53.06-.25-.12-1.05-.39-1.99-1.23-.74-.66-1.23-1.47-1.38-1.72-.14-.25-.01-.38.11-.5.11-.11.25-.29.37-.43.13-.15.17-.25.25-.41.08-.17.04-.31-.02-.43-.06-.12-.56-1.34-.76-1.84-.2-.48-.4-.42-.56-.42l-.47-.01c-.16 0-.43.06-.65.31-.23.25-.86.84-.86 2.04s.88 2.37 1 2.53c.12.17 1.73 2.64 4.19 3.7.59.25 1.04.4 1.4.52.59.19 1.12.16 1.55.1.47-.07 1.47-.6 1.67-1.18.21-.58.21-1.07.15-1.18-.06-.1-.22-.16-.47-.29Z" />
      </svg>
    </a>
  );
}

/* ──────────────────────────────── RODAPÉ ───────────────────────────────── */

/**
 * O rodapé.
 *
 * ⚠️ ELE LISTA AS 13 PÁGINAS INTERNAS, e isso não é enfeite: a barra mostra
 * três itens, e sem esta lista as seis páginas de serviço e as quatro de
 * bairro dependeriam só dos links do corpo da página. Página que ninguém
 * aponta é página que nem o visitante nem o BUSCADOR alcançam — e é o
 * oposto da razão de elas existirem.
 */
export function SiteFooter({ links }: { links: TemplateLinks }) {
  return (
    <footer className="relative border-t border-[var(--ec-line-soft)] pt-16">
      <div
        className="mx-auto w-full max-w-[80rem] pb-12"
        style={{ paddingInline: "var(--ec-pad)" }}
      >
        <div className="flex flex-col items-center text-center">
          <Monogram className="h-12 w-12 text-[var(--ec-gold)]" />
          <p className="display mt-4 text-[1.75rem] text-[var(--ec-cream)]">
            Enzo <span className="display-italic text-[var(--ec-gold-hi)]">Cortes</span>
          </p>
          <DecoDivider className="mt-6 w-full max-w-[22rem]" />
        </div>

        <div className="mt-12 grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <h2 className="eyebrow mb-4">A casa</h2>
            <address className="not-italic text-[0.875rem] leading-relaxed text-[var(--ec-cream-dim)]">
              {BUSINESS.street}
              <br />
              {BUSINESS.neighborhood}
              <br />
              {BUSINESS.city}/{BUSINESS.state} · {BUSINESS.postalCode}
            </address>
            <p className="mt-4 text-[0.875rem] text-[var(--ec-cream-dim)]">
              {BUSINESS.hoursHuman}
              <br />
              <span className="text-[var(--ec-cream-faint)]">{BUSINESS.closedHuman}</span>
            </p>
            <p className="mt-4">
              <a
                href={TEL_HREF}
                className="text-[0.875rem] text-[var(--ec-gold-hi)] hover:underline"
              >
                {BUSINESS.phoneDisplay}
              </a>
            </p>
          </div>

          <div>
            <h2 className="eyebrow mb-4">Serviços</h2>
            <ul className="space-y-2">
              {SERVICES.map((s) => (
                <li key={s.slug}>
                  <a
                    href={pageHref(links, s.slug)}
                    className="text-[0.875rem] text-[var(--ec-cream-dim)] transition-colors hover:text-[var(--ec-gold-hi)]"
                  >
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
                  <a
                    href={pageHref(links, a.slug)}
                    className="text-[0.875rem] text-[var(--ec-cream-dim)] transition-colors hover:text-[var(--ec-gold-hi)]"
                  >
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
                <a
                  href={links.home}
                  className="text-[0.875rem] text-[var(--ec-cream-dim)] transition-colors hover:text-[var(--ec-gold-hi)]"
                >
                  Início
                </a>
              </li>
              <li>
                <a
                  href={pageHref(links, PAGE.servicos)}
                  className="text-[0.875rem] text-[var(--ec-cream-dim)] transition-colors hover:text-[var(--ec-gold-hi)]"
                >
                  Serviços e preços
                </a>
              </li>
              <li>
                <a
                  href={pageHref(links, PAGE.sobre)}
                  className="text-[0.875rem] text-[var(--ec-cream-dim)] transition-colors hover:text-[var(--ec-gold-hi)]"
                >
                  A barbearia
                </a>
              </li>
              <li>
                <a
                  href={pageHref(links, PAGE.contato)}
                  className="text-[0.875rem] text-[var(--ec-cream-dim)] transition-colors hover:text-[var(--ec-gold-hi)]"
                >
                  Onde fica
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 border-t border-[var(--ec-line-soft)] pt-6 text-center">
          <p className="text-[0.75rem] text-[var(--ec-cream-faint)]">
            {BUSINESS.name} · {ADDRESS_LINE}
          </p>
        </div>
      </div>
    </footer>
  );
}
