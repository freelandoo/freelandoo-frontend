"use client"

/**
 * Vitrine da Loja de Funções — cards GRANDES de rolagem, na estética tabloide.
 *
 * A rolagem é nativa (scroll-snap), não GSAP: o dedo/trackpad arrasta de
 * verdade, o teclado funciona sozinho e não há timeline pra dessincronizar.
 * O que voltou do carrossel antigo é o formato — um card por vez, grande —,
 * não a linguagem visual (fundo por produto, blur 3D, janela de browser).
 */

import { useCallback, useEffect, useRef, useState } from "react"
import Link from "next/link"
import { ArrowLeft, ArrowRight, BadgeCheck } from "lucide-react"
import {
  FUNCTION_ICONS,
  formatPriceBRL,
  padIndex,
  type FunctionProduct,
} from "./function-product"

export function FunctionCarousel({
  products,
  owned,
  locale,
  t,
}: {
  products: FunctionProduct[]
  owned: Record<string, boolean>
  locale: string
  t: (key: string, fallback: string) => string
}) {
  const scrollerRef = useRef<HTMLUListElement>(null)
  const cardRefs = useRef<(HTMLLIElement | null)[]>([])
  const [active, setActive] = useState(0)

  // Qual card está no centro. O root É o scroller (a página não rola aqui) —
  // sem isso o observer mede contra a viewport e nunca dispara.
  useEffect(() => {
    const root = scrollerRef.current
    if (!root) return
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0]
        if (!visible) return
        const index = Number((visible.target as HTMLElement).dataset.index)
        if (Number.isInteger(index)) setActive(index)
      },
      { root, threshold: [0.35, 0.6, 0.9] },
    )
    for (const el of cardRefs.current) if (el) observer.observe(el)
    return () => observer.disconnect()
  }, [products.length])

  const goTo = useCallback((index: number) => {
    const total = cardRefs.current.length
    if (!total) return
    const clamped = Math.max(0, Math.min(total - 1, index))
    cardRefs.current[clamped]?.scrollIntoView({
      behavior: "smooth",
      inline: "center",
      block: "nearest",
    })
  }, [])

  const onKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === "ArrowRight") {
        event.preventDefault()
        goTo(active + 1)
      } else if (event.key === "ArrowLeft") {
        event.preventDefault()
        goTo(active - 1)
      }
    },
    [active, goTo],
  )

  const total = products.length

  return (
    <div className="relative">
      <ul
        ref={scrollerRef}
        aria-label={t("navAria", "Funções")}
        tabIndex={0}
        onKeyDown={onKeyDown}
        className="scrollbar-hide flex snap-x snap-mandatory gap-6 overflow-x-auto scroll-smooth pb-6 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#F2B705]"
        style={{ scrollPaddingInline: "1rem" }}
      >
        {products.map((product, index) => (
          <li
            key={product.id}
            data-index={index}
            ref={(el) => {
              cardRefs.current[index] = el
            }}
            aria-current={index === active ? "true" : undefined}
            className="w-[86vw] max-w-[980px] shrink-0 snap-center first:ml-4 last:mr-4 sm:w-[80vw]"
          >
            <BigFunctionCard
              product={product}
              index={index}
              total={total}
              owned={owned[product.feature_key] === true}
              locale={locale}
              t={t}
            />
          </li>
        ))}
      </ul>

      {/* Controles: setas, contador e trilho de indicadores */}
      <div className="mt-2 flex flex-wrap items-center justify-between gap-4 px-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => goTo(active - 1)}
            disabled={active === 0}
            aria-label={t("prevAria", "Função anterior")}
            className="inline-flex h-11 w-11 items-center justify-center border-2 border-[#F1EDE2]/35 text-[#F1EDE2] transition hover:border-[#F2B705] hover:text-[#F2B705] disabled:cursor-not-allowed disabled:opacity-35"
          >
            <ArrowLeft aria-hidden="true" className="h-5 w-5" strokeWidth={2.5} />
          </button>
          <button
            type="button"
            onClick={() => goTo(active + 1)}
            disabled={active === total - 1}
            aria-label={t("nextAria", "Próxima função")}
            className="inline-flex h-11 w-11 items-center justify-center border-2 border-[#F1EDE2]/35 text-[#F1EDE2] transition hover:border-[#F2B705] hover:text-[#F2B705] disabled:cursor-not-allowed disabled:opacity-35"
          >
            <ArrowRight aria-hidden="true" className="h-5 w-5" strokeWidth={2.5} />
          </button>
          <p
            aria-live="polite"
            className="fl-display ml-1 text-2xl leading-none text-[#F1EDE2]"
          >
            {padIndex(active + 1)}
            <span className="text-[#F1EDE2]/35"> / {padIndex(total)}</span>
            <span className="sr-only">
              {t("counterAria", "Função {n} de {total}")
                .replace("{n}", String(active + 1))
                .replace("{total}", String(total))}
            </span>
          </p>
        </div>

        <nav
          aria-label={t("indicatorsAria", "Indicadores de função")}
          className="scrollbar-hide flex max-w-full items-center gap-1 overflow-x-auto"
        >
          {products.map((product, index) => (
            <button
              key={product.id}
              type="button"
              onClick={() => goTo(index)}
              aria-label={t("goToAria", "Ir para {name}").replace("{name}", product.nav_label)}
              aria-current={index === active ? "true" : undefined}
              className={
                index === active
                  ? "shrink-0 border-2 border-[#0B0B0D] bg-[#F2B705] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-[#0B0B0D]"
                  : "shrink-0 border-2 border-transparent px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-[#F1EDE2]/50 transition hover:text-[#F1EDE2]"
              }
            >
              {product.nav_label}
            </button>
          ))}
        </nav>
      </div>
    </div>
  )
}

/** Card grande: recorte de jornal com arte, manchete, preço e chamada. */
function BigFunctionCard({
  product,
  index,
  total,
  owned,
  locale,
  t,
}: {
  product: FunctionProduct
  index: number
  total: number
  owned: boolean
  locale: string
  t: (key: string, fallback: string) => string
}) {
  const Icon = FUNCTION_ICONS[product.feature_key]

  return (
    <article className="fl-card fl-hard flex h-full flex-col gap-5 border-[#0B0B0D] bg-[#F1EDE2] p-5 text-[#0B0B0D] md:flex-row md:items-stretch md:gap-7 md:p-6">
      {/* Arte */}
      <div
        className="relative flex aspect-[16/10] w-full shrink-0 items-center justify-center overflow-hidden border-2 border-[#0B0B0D] bg-[#1D1810] md:aspect-auto md:w-[46%]"
        style={product.image_url ? undefined : { backgroundColor: product.placeholder_color }}
      >
        {product.image_url ? (
          // Mídia do R2 — política de imagem: não passa pelo otimizador da Vercel.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.image_url}
            alt={product.nav_label}
            className="h-full w-full object-cover"
            loading="lazy"
            draggable={false}
          />
        ) : (
          Icon && (
            <Icon
              aria-hidden="true"
              className="h-24 w-24 md:h-32 md:w-32"
              strokeWidth={1.1}
              style={{ color: product.accent_color }}
            />
          )
        )}
        <span className="fl-display absolute left-3 top-2 text-3xl leading-none text-[#F1EDE2]/25">
          {padIndex(index + 1)}
          <span className="sr-only"> / {padIndex(total)}</span>
        </span>
      </div>

      {/* Texto + compra */}
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="mb-2 flex items-center gap-3">
          <span className="text-[10px] font-black uppercase tracking-[0.24em] text-[#0B0B0D]/55">
            {product.eyebrow}
          </span>
          {owned && (
            <span className="inline-flex items-center gap-1 border-2 border-[#0B0B0D] bg-[#F2B705] px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.16em]">
              <BadgeCheck aria-hidden="true" className="h-3.5 w-3.5" />
              {t("ownedBadge", "Sua")}
            </span>
          )}
        </div>

        <h2 className="fl-display text-[clamp(34px,6vw,64px)] leading-[0.9]">
          {product.nav_label}
        </h2>

        <p className="mt-3 flex-1 text-[14px] leading-[1.55] text-[#0B0B0D]/78 md:text-[15px]">
          {product.short_description}
        </p>

        <div className="mt-5 flex flex-wrap items-end justify-between gap-4 border-t-2 border-[#0B0B0D]/12 pt-4">
          {owned ? (
            <p className="text-[12px] font-black uppercase tracking-[0.14em] text-[#0B0B0D]/70">
              {t("ownedLine", "Você já tem esta função")}
            </p>
          ) : (
            <div>
              <p className="fl-display text-[clamp(30px,4.4vw,46px)] leading-none">
                {formatPriceBRL(product.price_cents, locale)}
              </p>
              <p className="mt-1 text-[10px] font-black uppercase tracking-[0.18em] text-[#0B0B0D]/55">
                {t("lifetimeShort", "pagamento único")}
              </p>
            </div>
          )}

          <Link
            href={`/funcoes/${product.feature_key}`}
            className={
              owned
                ? "inline-flex min-h-[48px] items-center gap-3 border-2 border-[#0B0B0D] px-6 text-[12px] font-black uppercase tracking-[0.14em] transition hover:bg-[#0B0B0D] hover:text-[#F1EDE2]"
                : "inline-flex min-h-[48px] items-center gap-3 border-2 border-[#0B0B0D] bg-[#F2B705] px-6 text-[12px] font-black uppercase tracking-[0.14em] shadow-[4px_4px_0_0_#0B0B0D] transition hover:-translate-y-0.5 hover:shadow-[6px_6px_0_0_#0B0B0D]"
            }
          >
            {owned ? t("ctaOwned", "Ver função") : t("ctaBuy", "Comprar")}
            <ArrowRight aria-hidden="true" className="h-4 w-4" strokeWidth={2.5} />
          </Link>
        </div>
      </div>
    </article>
  )
}
