/**
 * AS PEÇAS COMPARTILHADAS.
 *
 * Tudo aqui é componente de SERVIDOR (nenhum tem estado nem gesto). O que
 * tem gesto — a barra que encolhe, o botão flutuante, o movimento — mora em
 * `chrome.tsx` e `experience/motion.tsx`, marcados com `"use client"`.
 *
 * ⚠️ A COLUNA DE TEXTO TEM TETO DE LARGURA, e não é preferência: linha de
 * texto corrido com mais de ~75 caracteres faz o olho perder a volta ao
 * início da linha seguinte. Num site de leitura curta isso não aparece; numa
 * página de serviço com quatro parágrafos, aparece como "cansativo" sem que
 * a pessoa saiba dizer por quê.
 */

import type { ReactNode } from "react";

import { DecoDivider } from "./deco";

/* ── ESTRUTURA ───────────────────────────────────────────────────────────── */

export function Container({
  children,
  className = "",
  wide = false,
}: {
  children: ReactNode;
  className?: string;
  /** `true` abre para 80rem — grades de card. O padrão, 64rem, é para texto. */
  wide?: boolean;
}) {
  return (
    <div
      className={`mx-auto w-full ${wide ? "max-w-[80rem]" : "max-w-[64rem]"} ${className}`}
      style={{ paddingInline: "var(--ec-pad)" }}
    >
      {children}
    </div>
  );
}

export function Section({
  children,
  className = "",
  id,
  tone = "flat",
}: {
  children: ReactNode;
  className?: string;
  id?: string;
  /** `raised` levanta a superfície um degrau — usado para alternar o ritmo. */
  tone?: "flat" | "raised";
}) {
  return (
    <section
      id={id}
      className={`relative py-16 md:py-24 ${className}`}
      style={tone === "raised" ? { background: "var(--ec-ink-up)" } : undefined}
    >
      {children}
    </section>
  );
}

/**
 * O cabeçalho de seção em três degraus: rótulo → título → linha de apoio.
 *
 * É a mesma estrutura em toda seção do site. Escrita à mão em cada uma, a
 * primeira mudança de ritmo tipográfico deixaria metade das seções para trás.
 */
export function SectionHead({
  eyebrow,
  title,
  lead,
  align = "center",
  as: Tag = "h2",
}: {
  eyebrow?: string;
  title: ReactNode;
  lead?: ReactNode;
  align?: "center" | "left";
  /** A página de serviço precisa que o título da PRIMEIRA seção seja o h1. */
  as?: "h1" | "h2";
}) {
  const centered = align === "center";
  return (
    <div
      className={`${centered ? "mx-auto text-center" : "text-left"} max-w-[46rem]`}
      data-reveal="up"
    >
      {eyebrow ? <p className="eyebrow mb-5">{eyebrow}</p> : null}
      <Tag className="display text-[clamp(2rem,6vw,3.5rem)] text-[var(--ec-paper)]">
        {title}
      </Tag>
      {lead ? (
        <p className="mt-6 text-[1.0625rem] leading-relaxed text-[var(--ec-metal)]">
          {lead}
        </p>
      ) : null}
      <DecoDivider className={`mt-8 ${centered ? "" : "justify-start"}`} />
    </div>
  );
}

/** Parágrafos de texto corrido, com a coluna no teto de leitura. */
export function Prose({
  body,
  className = "",
}: {
  body: readonly string[];
  className?: string;
}) {
  return (
    <div className={`prose max-w-[42rem] space-y-5 ${className}`}>
      {body.map((p, i) => (
        <p
          key={i}
          className="text-[1.0625rem] leading-[1.75] text-[var(--ec-metal)]"
          data-reveal="up"
          data-reveal-delay={Math.min(i * 0.06, 0.18)}
        >
          {p}
        </p>
      ))}
    </div>
  );
}

/* ── AÇÃO ────────────────────────────────────────────────────────────────── */

/**
 * O botão.
 *
 * ⚠️ É SEMPRE UM `<a>`, nunca um `<button>`: todo destino deste site é um
 * lugar (WhatsApp, telefone, outra página). Um `<button>` com `onClick` que
 * navega quebra o "abrir em nova aba", o "copiar link" e o leitor de tela,
 * que anuncia botão e entrega navegação.
 */
export function Btn({
  href,
  children,
  variant = "solid",
  external = false,
  className = "",
  ariaLabel,
}: {
  href: string;
  children: ReactNode;
  variant?: "solid" | "ghost";
  external?: boolean;
  className?: string;
  ariaLabel?: string;
}) {
  return (
    <a
      href={href}
      aria-label={ariaLabel}
      {...(external ? { target: "_blank", rel: "noopener" } : {})}
      className={`btn ${variant === "solid" ? "btn-solid" : "btn-ghost"} ${className}`}
    >
      {children}
    </a>
  );
}

/* ── CAIXAS ──────────────────────────────────────────────────────────────── */

/**
 * Painel com o fio déco e os cantos marcados.
 *
 * ⚠️ ELE REPASSA OS ATRIBUTOS EXTRAS (`...rest`), e isso não é conveniência:
 * é o que permite marcar o painel com `data-reveal` sem precisar de uma div
 * de invólucro só para carregar o atributo. Invólucro extra em volta de um
 * elemento com borda quebra o `gap` das grades em que ele vive.
 */
export function Panel({
  children,
  className = "",
  tone = "up",
  ...rest
}: {
  children: ReactNode;
  className?: string;
  tone?: "up" | "hi" | "deep";
} & Omit<React.HTMLAttributes<HTMLDivElement>, "className" | "children" | "style">) {
  const bg =
    tone === "hi" ? "var(--ec-ink-hi)" : tone === "deep" ? "var(--ec-ink-deep)" : "var(--ec-ink-up)";
  return (
    <div className={`deco-frame ${className}`} style={{ background: bg }} {...rest}>
      {children}
    </div>
  );
}

/**
 * A lista de "o que dá para pedir" — título + texto, em duas colunas.
 *
 * O número de ordem sai em Bodoni itálico, que é a voz editorial do site.
 * Ele é `aria-hidden` porque a ordem já está na marcação da lista: lido em
 * voz alta, viraria "um, a altura da transição" — a informação duas vezes.
 */
export function TitledList({
  items,
}: {
  items: readonly { title: string; text: string }[];
}) {
  return (
    <ul className="grid gap-px sm:grid-cols-2" style={{ background: "var(--ec-line-soft)" }}>
      {items.map((it, i) => (
        <li
          key={it.title}
          className="p-6 md:p-8"
          style={{ background: "var(--ec-ink)" }}
          data-reveal="up"
          data-reveal-delay={Math.min(i * 0.07, 0.28)}
        >
          <span
            className="display-italic block text-[1.75rem] leading-none text-[var(--ec-volt-deep)]"
            aria-hidden="true"
          >
            {String(i + 1).padStart(2, "0")}
          </span>
          <h3 className="mt-3 text-[1.0625rem] font-semibold text-[var(--ec-paper)]">
            {it.title}
          </h3>
          <p className="mt-2 text-[0.9375rem] leading-relaxed text-[var(--ec-metal)]">
            {it.text}
          </p>
        </li>
      ))}
    </ul>
  );
}

/**
 * O FAQ.
 *
 * ⚠️ `<details>` NATIVO, não um acordeão em JavaScript. São três ganhos de
 * uma vez: funciona sem JS, o Ctrl+F do navegador encontra texto dentro do
 * bloco fechado (o acordeão em JS esconde do próprio buscador da página), e
 * o teclado já navega sem nenhum `tabindex` escrito à mão.
 *
 * O mesmo conteúdo é marcado como `FAQPage` no JSON-LD pela página — aqui é
 * só a versão que a pessoa lê.
 */
export function FaqList({ items }: { items: readonly { q: string; a: string }[] }) {
  if (!items.length) return null;
  return (
    <div className="mx-auto max-w-[46rem]">
      {items.map((f, i) => (
        <details
          key={f.q}
          className="group border-b border-[var(--ec-line-soft)]"
          data-reveal="up"
          data-reveal-delay={Math.min(i * 0.05, 0.2)}
        >
          <summary className="flex cursor-pointer list-none items-start gap-4 py-5 text-[1.0625rem] font-medium text-[var(--ec-paper)] marker:content-['']">
            {/* ⚠️ `--ec-volt`, e NÃO `--ec-volt-deep` como nos outros numerais
                do site. Medido: o dourado profundo dá 3,99:1 sobre o fundo, e
                este numeral tem 18px — texto NORMAL para a régua de contraste,
                que exige 4,5:1. Os outros numerais (28px, 32px, 40px) contam
                como texto GRANDE, onde 3:1 basta, e por isso podem ficar no
                tom profundo. Mesma cor em corpos diferentes é exatamente como
                um deles reprova sem ninguém notar. */}
            <span
              className="display-italic mt-0.5 shrink-0 text-[1.125rem] text-[var(--ec-volt)]"
              aria-hidden="true"
            >
              {String(i + 1).padStart(2, "0")}
            </span>
            <span className="flex-1">{f.q}</span>
            <span
              className="mt-1 shrink-0 text-[var(--ec-volt)] transition-transform duration-300 group-open:rotate-45"
              aria-hidden="true"
            >
              <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.4">
                <path d="M8 2v12M2 8h12" strokeLinecap="square" />
              </svg>
            </span>
          </summary>
          <p className="prose pb-6 pl-10 pr-8 text-[0.9375rem] leading-relaxed text-[var(--ec-metal)]">
            {f.a}
          </p>
        </details>
      ))}
    </div>
  );
}

/** A anotação pequena — endereço no rodapé de um bloco, aviso de preço. */
export function Note({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <p className={`text-[0.8125rem] leading-relaxed text-[var(--ec-metal-dim)] ${className}`}>
      {children}
    </p>
  );
}

/* ── TRILHA ──────────────────────────────────────────────────────────────── */

/**
 * A trilha de navegação, visível.
 *
 * ⚠️ O ÚLTIMO DEGRAU NÃO É LINK, e recebe `aria-current="page"`: link para a
 * página em que já se está é o botão que não faz nada, e o leitor de tela
 * anuncia um destino que é o lugar de onde a pessoa não saiu.
 *
 * O mesmo caminho é marcado como `BreadcrumbList` no JSON-LD pela página —
 * aqui é só a versão que a pessoa lê. Os dois saem da MESMA lista, passada
 * por quem desenha: montadas em separado, a trilha visível e a estruturada
 * divergiriam na primeira página nova.
 */
export function Breadcrumb({ trail }: { trail: { name: string; path: string }[] }) {
  if (trail.length < 2) return null;
  return (
    <nav aria-label="Você está em" data-reveal="fade">
      <ol className="flex flex-wrap items-center gap-2 text-[0.75rem] uppercase tracking-[0.14em]">
        {trail.map((t, i) => {
          const last = i === trail.length - 1;
          return (
            <li key={t.path} className="flex items-center gap-2">
              {last ? (
                <span aria-current="page" className="text-[var(--ec-metal-dim)]">
                  {t.name}
                </span>
              ) : (
                <a
                  href={t.path}
                  className="text-[var(--ec-volt)] transition-colors hover:text-[var(--ec-volt)]"
                >
                  {t.name}
                </a>
              )}
              {last ? null : (
                <span className="text-[var(--ec-volt-deep)]" aria-hidden="true">
                  /
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
