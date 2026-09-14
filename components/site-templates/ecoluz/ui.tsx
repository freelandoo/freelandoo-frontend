// AS PEÇAS COMPARTILHADAS entre as páginas.
//
// Componentes de SERVIDOR — nenhum tem estado nem gesto. O que tem gesto vive
// em `chrome.tsx` e `calculator.tsx`, que são de cliente.
//
// ⚠️ ELAS EXISTEM PARA QUE A DÉCIMA PÁGINA SEJA IGUAL À PRIMEIRA. Este site
// tem 14 páginas; com o cabeçalho de seção escrito à mão em cada uma, a
// terceira já teria outro espaçamento e a sexta outro corpo de tipo — e a
// diferença é invisível enquanto se escreve, porque ninguém abre duas páginas
// lado a lado.

import type { ReactNode } from "react";

import { Icon, type IconName } from "./icons";

/* ─────────────────────────────── FAIXA ──────────────────────────────────── */

/**
 * A faixa de conteúdo.
 *
 * `tone` decide o fundo: `dark` é a promessa (o padrão), `paper` é a
 * explicação. Alternar as duas é o que dá ritmo à rolagem — uma página inteira
 * escura vira um borrão, e uma inteira clara perde a marca.
 */
export function Section({
  id,
  tone = "dark",
  className = "",
  children,
}: {
  id?: string;
  tone?: "dark" | "paper" | "deep";
  className?: string;
  children: ReactNode;
}) {
  const bg =
    tone === "paper"
      ? "bg-[var(--el-paper)] text-[var(--el-paper-ink)]"
      : tone === "deep"
        ? "bg-[var(--el-ink-deep)]"
        : "";

  // ⚠️ O HALO É LOCAL, E SÓ NAS FAIXAS ESCURAS.
  //
  // É daqui que vem a profundidade da rolagem — e é o que permite ter
  // paralaxe SEM tocar na camada do tamanho da janela (`.tpl-ecoluz__bg`),
  // que segue pintada uma vez e nunca animada. Este halo é recortado pela
  // própria seção, então o custo é o da área dela, não o da tela.
  //
  // Numa faixa de papel ele seria uma mancha amarela no meio do branco, por
  // isso `tone === "paper"` não recebe nenhum.
  const glow = tone !== "paper";

  return (
    <section id={id} className={`relative py-20 md:py-28 ${bg} ${className}`}>
      {glow ? (
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
          <span className="el-glow" data-parallax="10" />
        </div>
      ) : null}

      {/* ⚠️ `relative` AQUI NÃO É ENFEITE: o halo é posicionado e, sem isto, ele
          pintaria POR CIMA do conteúdo da seção — elemento posicionado vence
          conteúdo em fluxo na ordem de pintura, mesmo sem z-index. */}
      <div
        className="relative mx-auto w-full max-w-[78rem]"
        style={{ paddingInline: "var(--el-pad)" }}
      >
        {children}
      </div>
    </section>
  );
}

/* ──────────────────────────── CABEÇALHO ─────────────────────────────────── */

/**
 * O cabeçalho de seção, em três degraus: sobretítulo → título → apoio.
 *
 * ⚠️ `as` EXISTE PORQUE SÓ PODE HAVER UM `<h1>` POR PÁGINA. O mesmo
 * componente desenha o título da home (h1) e o de cada seção interna (h2), e
 * fixar `h2` aqui obrigaria cada página a escrever o próprio h1 à mão — que é
 * como duas delas acabariam sem nenhum.
 */
export function SectionHead({
  eyebrow,
  title,
  lead,
  as: Tag = "h2",
  tone = "dark",
  align = "split",
}: {
  eyebrow?: string;
  title: ReactNode;
  lead?: ReactNode;
  as?: "h1" | "h2";
  tone?: "dark" | "paper";
  align?: "split" | "stack";
}) {
  const dim = tone === "paper" ? "text-[var(--el-paper-dim)]" : "text-[var(--el-cream-dim)]";
  const accent = tone === "paper" ? "text-[var(--el-amber-ink)]" : "text-[var(--el-sun)]";

  return (
    <header
      className={
        align === "split"
          ? "grid gap-6 md:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] md:items-end md:gap-12"
          : "max-w-3xl"
      }
    >
      <div data-reveal="up">
        {/* ⚠️ A RÉGUA ABRE ANTES DO TEXTO, e é o gesto mais fiel à tese deste
            site: ela não decora, ela MEDE. Sobre papel o amarelo da marca
            some (1,5:1), então ali o fio vira âmbar — a mesma troca que o
            texto de destaque já faz. */}
        <div className={`rule mb-5 w-16 ${tone === "paper" ? "rule-ink" : ""}`} data-rule />
        {eyebrow ? <p className={`eyebrow mb-4 ${accent}`}>{eyebrow}</p> : null}
        <Tag
          className={`display text-[2.25rem] sm:text-[2.9rem] md:text-[3.4rem] ${
            tone === "paper" ? "text-[var(--el-paper-ink)]" : "text-[var(--el-cream)]"
          }`}
        >
          {title}
        </Tag>
      </div>
      {lead ? (
        <p className={`text-[1.0625rem] leading-relaxed ${dim}`} data-reveal="up" data-reveal-delay="80">
          {lead}
        </p>
      ) : null}
    </header>
  );
}

/* ───────────────────────────── CARTÕES ──────────────────────────────────── */

export function FeatureCard({
  icon,
  title,
  text,
  tone = "dark",
  delay = 0,
}: {
  icon: IconName;
  title: string;
  text: string;
  tone?: "dark" | "paper";
  delay?: number;
}) {
  const paper = tone === "paper";
  return (
    <article
      className={`flex gap-4 border p-6 ${
        paper
          ? "border-[var(--el-paper-line)] bg-[var(--el-paper-up)]"
          : "border-[var(--el-line-soft)] bg-[rgb(23_17_10/0.6)]"
      }`}
      data-reveal="up"
      data-reveal-delay={delay}
    >
      <span
        className={`mt-0.5 shrink-0 ${paper ? "text-[var(--el-amber-ink)]" : "text-[var(--el-sun)]"}`}
      >
        <Icon name={icon} className="h-6 w-6" />
      </span>
      <div>
        <h3
          className={`display mb-1.5 text-[1.0625rem] ${
            paper ? "text-[var(--el-paper-ink)]" : "text-[var(--el-cream)]"
          }`}
        >
          {title}
        </h3>
        <p
          className={`text-[0.9375rem] leading-relaxed ${
            paper ? "text-[var(--el-paper-dim)]" : "text-[var(--el-cream-dim)]"
          }`}
        >
          {text}
        </p>
      </div>
    </article>
  );
}

/** O item de lista com marcador próprio — "para quem é", "quando chamar". */
export function CheckList({
  items,
  tone = "dark",
}: {
  items: string[];
  tone?: "dark" | "paper";
}) {
  const paper = tone === "paper";
  return (
    <ul className="grid gap-3">
      {items.map((item, i) => (
        <li
          key={item}
          className="flex gap-3"
          data-reveal="up"
          data-reveal-delay={i * 60}
        >
          <span
            aria-hidden="true"
            className={`mt-[0.55rem] h-[3px] w-4 shrink-0 ${
              paper ? "bg-[var(--el-amber-ink)]" : "bg-[var(--el-sun)]"
            }`}
          />
          <span
            className={`text-[0.9375rem] leading-relaxed ${
              paper ? "text-[var(--el-paper-dim)]" : "text-[var(--el-cream-dim)]"
            }`}
          >
            {item}
          </span>
        </li>
      ))}
    </ul>
  );
}

/* ─────────────────────────────── FAQ ────────────────────────────────────── */

/**
 * O FAQ visível.
 *
 * ⚠️ `<details>` NATIVO, e não um acordeão com estado. Três razões, todas
 * práticas: o conteúdo está no HTML mesmo fechado (o buscador lê, e é por isso
 * que o FAQ existe), o Ctrl+F do navegador acha o texto, e a peça não precisa
 * ser de cliente — o que mantém a página inteira renderizada no servidor.
 *
 * ⚠️ O `FAQPage` do JSON-LD é montado em `schema.tsx` a partir da MESMA lista.
 * Duas listas dariam uma pergunta marcada que a página não mostra, que é
 * exatamente o que rende aviso na ficha do negócio.
 */
export function FaqList({
  items,
  tone = "dark",
}: {
  items: { q: string; a: string }[];
  tone?: "dark" | "paper";
}) {
  const paper = tone === "paper";
  return (
    <div className="grid gap-px" style={{ background: paper ? "var(--el-paper-line)" : "var(--el-line-soft)" }}>
      {items.map((item, i) => (
        <details
          key={item.q}
          className={`group ${paper ? "bg-[var(--el-paper)]" : "bg-[var(--el-ink)]"}`}
          data-reveal="fade"
          data-reveal-delay={i * 40}
        >
          <summary
            className={`flex cursor-pointer list-none items-start justify-between gap-6 px-1 py-5 text-[1rem] font-medium transition-colors ${
              paper
                ? "text-[var(--el-paper-ink)] hover:text-[var(--el-amber-ink)]"
                : "text-[var(--el-cream)] hover:text-[var(--el-sun-hi)]"
            }`}
          >
            {item.q}
            <span
              aria-hidden="true"
              className={`mt-1 shrink-0 transition-transform duration-200 group-open:rotate-45 ${
                paper ? "text-[var(--el-amber-ink)]" : "text-[var(--el-sun)]"
              }`}
            >
              <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M8 2v12M2 8h12" strokeLinecap="round" />
              </svg>
            </span>
          </summary>
          <p
            className={`px-1 pb-6 pr-10 text-[0.9375rem] leading-relaxed ${
              paper ? "text-[var(--el-paper-dim)]" : "text-[var(--el-cream-dim)]"
            }`}
          >
            {item.a}
          </p>
        </details>
      ))}
    </div>
  );
}

/* ────────────────────────── CHAMADA FINAL ───────────────────────────────── */

/**
 * A faixa de chamada que fecha toda página.
 *
 * ⚠️ ELA TERMINA TODAS AS 14 DE PROPÓSITO. Quem chega numa página de serviço
 * por busca não passou pela home e não viu o WhatsApp em lugar nenhum: sem
 * esta faixa, a página informa e não oferece o próximo passo, que é a forma
 * mais cara de ter tráfego.
 */
export function CtaBand({
  title,
  text,
  href,
  label = "Chamar no WhatsApp",
}: {
  title: string;
  text: string;
  href: string;
  label?: string;
}) {
  return (
    <section className="relative border-t border-[var(--el-line-soft)] bg-[var(--el-ink-deep)] py-20 md:py-24">
      <div
        className="mx-auto grid w-full max-w-[78rem] gap-8 md:grid-cols-[minmax(0,1fr)_auto] md:items-center"
        style={{ paddingInline: "var(--el-pad)" }}
      >
        <div data-reveal="up">
          <div className="rule mb-7 w-24" data-rule />
          <h2 className="display text-[2rem] text-[var(--el-cream)] sm:text-[2.5rem] md:text-[2.9rem]">
            {title}
          </h2>
          <p className="mt-4 max-w-xl text-[1.0625rem] leading-relaxed text-[var(--el-cream-dim)]">
            {text}
          </p>
        </div>
        <a
          href={href}
          target="_blank"
          rel="noopener"
          className="btn btn-solid justify-self-start md:justify-self-end"
          data-reveal="up"
          data-reveal-delay="80"
        >
          {label}
        </a>
      </div>
    </section>
  );
}

/* ─────────────────────────── VEJA TAMBÉM ────────────────────────────────── */

/**
 * Os links do fim da página.
 *
 * ⚠️ ELES SÃO ESCOLHIDOS, não "os primeiros da lista". A barra mostra cinco
 * destinos; as outras oito páginas só são alcançadas por aqui — e página que
 * ninguém aponta é página que nem o visitante nem o buscador encontram, que é
 * o oposto da razão de ela existir.
 */
export function SeeAlso({
  title = "Veja também",
  items,
  tone = "dark",
}: {
  title?: string;
  items: { href: string; label: string; text?: string }[];
  tone?: "dark" | "paper";
}) {
  if (!items.length) return null;
  const paper = tone === "paper";

  return (
    <div>
      <p className={`eyebrow mb-6 ${paper ? "text-[var(--el-amber-ink)]" : "text-[var(--el-sun)]"}`}>
        {title}
      </p>
      <div className="grid gap-px sm:grid-cols-2 lg:grid-cols-3" style={{ background: paper ? "var(--el-paper-line)" : "var(--el-line-soft)" }}>
        {items.map((item, i) => (
          <a
            key={item.href}
            href={item.href}
            className={`group flex flex-col gap-2 p-6 transition-colors ${
              paper
                ? "bg-[var(--el-paper)] hover:bg-[var(--el-paper-up)]"
                : "bg-[var(--el-ink)] hover:bg-[var(--el-ink-up)]"
            }`}
            data-reveal="up"
            data-reveal-delay={i * 60}
          >
            <span
              className={`display text-[1.0625rem] ${
                paper
                  ? "text-[var(--el-paper-ink)] group-hover:text-[var(--el-amber-ink)]"
                  : "text-[var(--el-cream)] group-hover:text-[var(--el-sun-hi)]"
              }`}
            >
              {item.label}
            </span>
            {item.text ? (
              <span
                className={`text-[0.875rem] leading-relaxed ${
                  paper ? "text-[var(--el-paper-dim)]" : "text-[var(--el-cream-faint)]"
                }`}
              >
                {item.text}
              </span>
            ) : null}
          </a>
        ))}
      </div>
    </div>
  );
}
