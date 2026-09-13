/**
 * Peças compartilhadas da prancha.
 *
 * Todas são componentes de SERVIDOR: nenhuma tem gesto, e mantê-las fora
 * do cliente é o que segura o JS da página baixo — o que decide o INP, que
 * é a métrica de Core Web Vitals que mais site reprova.
 */

import Link from "next/link";
import { BOOKING_URL, BUSINESS, TEL_HREF, whatsappLink } from "./content/business";

/* ───────────────────────────────── layout ──────────────────────────────── */

export function Shell({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`mx-auto max-w-[1400px] px-[var(--sheet-pad)] ${className}`}>
      {children}
    </div>
  );
}

export function Section({
  children,
  className = "",
  id,
}: {
  children: React.ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <section id={id} className={`py-20 md:py-28 ${className}`}>
      {children}
    </section>
  );
}

/**
 * Título de seção preso ao datum.
 *
 * ⚠️ Sem eyebrow em caixa alta e sem numeração. Numerar só onde existe
 * sequência de verdade — uma lista de serviços não é sequência, e numerá-la
 * afirma uma ordem que não existe.
 */
export function Head({
  title,
  lead,
  level = 2,
}: {
  title: string;
  lead?: string;
  level?: 1 | 2;
}) {
  const H = level === 1 ? "h1" : "h2";
  return (
    <header className="datum relative">
      <span className="tick" aria-hidden="true" />
      <H className={level === 1 ? "d-lg text-[var(--rf-chalk)]" : "d-lg text-[var(--rf-chalk)]"}>
        {title}
      </H>
      {lead ? (
        <p className="mt-5 max-w-[62ch] text-lg leading-relaxed text-[var(--rf-chalk-dim)]">
          {lead}
        </p>
      ) : null}
    </header>
  );
}

/** Linha de cota. Só onde existe distância ou grandeza de verdade. */
export function Dim({ children }: { children: React.ReactNode }) {
  return (
    <p className="dim note my-8">
      <span className="shrink-0">{children}</span>
    </p>
  );
}

/* ────────────────────────────────── ações ──────────────────────────────── */

/**
 * A fileira de ação.
 *
 * ⚠️ `BOOKING_URL` nulo NÃO deixa um botão morto: o botão some e o WhatsApp
 * assume o lugar principal. Agendar leva à agenda do perfil na Freelandoo,
 * e sem agenda configurada o passo 1 abriria vazio — botão que abre o nada
 * é pior que botão nenhum, ainda mais no ramo em que boa parte do trabalho
 * sai por orçamento.
 */
export function Actions({
  waMessage,
  className = "",
  compact = false,
}: {
  waMessage: string;
  className?: string;
  compact?: boolean;
}) {
  return (
    <div className={`flex flex-wrap items-center gap-3 ${className}`}>
      {BOOKING_URL ? (
        <a href={BOOKING_URL} className="btn btn-primary">
          Agendar visita
        </a>
      ) : null}
      <a
        href={whatsappLink(waMessage)}
        target="_blank"
        rel="noopener"
        className={BOOKING_URL ? "btn btn-wa" : "btn btn-primary"}
      >
        Chamar no WhatsApp
      </a>
      {compact ? null : (
        <a href={TEL_HREF} className="btn btn-ghost">
          {BUSINESS.phoneDisplay}
        </a>
      )}
    </div>
  );
}

/**
 * Bloco de fechamento de página.
 *
 * Repetido no fim de toda página interna de propósito: quem chega por busca
 * cai no meio do site, lê uma página e precisa de uma saída ali mesmo —
 * voltar ao topo para achar o telefone é onde o lead se perde.
 */
export function CallToAction({
  title,
  lead,
  waMessage,
}: {
  title: string;
  lead: string;
  waMessage: string;
}) {
  return (
    <Section>
      <Shell>
        <div className="border-y border-[var(--rf-line)] py-14 md:py-16">
          <div className="datum relative">
            <span className="tick" aria-hidden="true" />
            <h2 className="d-lg max-w-[18ch] text-[var(--rf-chalk)]">{title}</h2>
            <p className="mt-5 max-w-[58ch] text-lg leading-relaxed text-[var(--rf-chalk-dim)]">
              {lead}
            </p>
            <Actions waMessage={waMessage} className="mt-8" />
            <p className="note mt-6">
              {BUSINESS.hoursShort} · {BUSINESS.scheduling}
            </p>
          </div>
        </div>
      </Shell>
    </Section>
  );
}

/* ─────────────────────────────── navegação ─────────────────────────────── */

export function Breadcrumb({
  trail,
}: {
  trail: { name: string; path: string }[];
}) {
  return (
    <nav aria-label="Você está em" className="note flex flex-wrap gap-x-2 gap-y-1">
      {trail.map((t, i) => {
        const last = i === trail.length - 1;
        return (
          <span key={t.path} className="flex items-center gap-2">
            {last ? (
              <span className="text-[var(--rf-chalk-dim)]">{t.name}</span>
            ) : (
              <Link href={t.path} className="transition-colors hover:text-[var(--rf-chalk-dim)]">
                {t.name}
              </Link>
            )}
            {last ? null : <span aria-hidden="true">/</span>}
          </span>
        );
      })}
    </nav>
  );
}

/* ───────────────────────────────── listas ──────────────────────────────── */

/** Lista de escopo. O traço é de cota, não marcador decorativo. */
export function ScopeList({ items }: { items: string[] }) {
  return (
    <ul className="mt-6 border-t border-[var(--rf-line)]">
      {items.map((it) => (
        <li
          key={it}
          className="flex items-start gap-4 border-b border-[var(--rf-line)] py-3.5"
        >
          <span
            aria-hidden="true"
            className="mt-[0.7rem] h-px w-6 shrink-0 bg-[var(--rf-line-hi)]"
          />
          <span className="text-[var(--rf-chalk-dim)]">{it}</span>
        </li>
      ))}
    </ul>
  );
}

/** Perguntas frequentes. O conteúdo também vai para o FAQPage do JSON-LD. */
export function FaqList({ items }: { items: { q: string; a: string }[] }) {
  return (
    <div className="mt-8 border-t border-[var(--rf-line)]">
      {items.map((f) => (
        <details key={f.q} className="group border-b border-[var(--rf-line)]">
          <summary className="flex cursor-pointer list-none items-start justify-between gap-6 py-5">
            <span className="d-sm max-w-[46ch] text-[var(--rf-chalk)]">{f.q}</span>
            <span
              aria-hidden="true"
              className="relative mt-2 block h-3 w-3 shrink-0"
            >
              <span className="absolute left-0 top-1/2 block h-px w-3 bg-[var(--rf-line-hi)]" />
              <span className="absolute left-1/2 top-0 block h-3 w-px bg-[var(--rf-line-hi)] transition-transform duration-300 group-open:rotate-90 group-open:opacity-0" />
            </span>
          </summary>
          <p className="max-w-[70ch] pb-6 leading-relaxed text-[var(--rf-chalk-dim)]">
            {f.a}
          </p>
        </details>
      ))}
    </div>
  );
}
