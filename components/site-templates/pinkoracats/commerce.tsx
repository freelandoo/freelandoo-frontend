"use client"

// AS PEÇAS DE COMPRA: card de produto, botões, caixa de compra, Case (carrinho),
// quick view e busca.
//
// ⚠️ A EXPERIÊNCIA TERMINA ANTES DO DINHEIRO. Nenhuma peça aqui cobra nada:
// o pagamento acontece na Loja da Freelandoo (produto com `storeProductId`) ou,
// enquanto o catálogo for prévia, o pedido segue por e-mail para a Taiz. O
// briefing pede checkout convencional e rápido — reinventar pagamento dentro
// de um site de vitrine é o jeito mais caro de perder a venda.
//
// ⚠️ PRODUTO É LINK DE VERDADE e botão é botão de verdade: o card é um `<a>`
// para a página do produto, e o "ver rápido" é um `<button>` IRMÃO dele, nunca
// filho (botão dentro de link não existe em HTML).

import { useEffect, useMemo, useRef, useState } from "react"

import { COLLECTION_BY_SLUG } from "./content/collections"
import { PRODUCTS, PRODUCT_BY_ID, type Product } from "./content/products.mock"
import { BRAND, PLACEHOLDER_CATALOG, mailtoOrder, storeProductUrl, whatsappLink } from "./content/brand"
import { brl, pageHref } from "./lib"
import ProductMedia, { type Composition } from "./media"
import { useStore } from "./store"

// ─── cartão ─────────────────────────────────────────────────────────────────

export function ProductCard({
  product,
  aspect = "4/5",
  composition = "set",
  size = "md",
  showPrice = true,
  priority,
  className = "",
}: {
  product: Product
  aspect?: string
  composition?: Composition
  size?: "sm" | "md" | "lg"
  showPrice?: boolean
  priority?: boolean
  className?: string
}) {
  const { links, openQuick, saved, toggleSave } = useStore()
  const col = COLLECTION_BY_SLUG.get(product.collection)
  const isSaved = saved.includes(product.id)
  return (
    <article className={`pk-card pk-card--${size} ${className}`} data-card data-tilt>
      <a href={pageHref(links, product.slug)} className="pk-card__link" data-cursor="VIEW">
        <ProductMedia
          src={product.image}
          hoverSrc={product.hoverImage}
          alt={`${product.name} — ${product.tagline}`}
          variant={product.variant}
          aspect={aspect}
          media={product.media}
          shape={product.shape}
          tint={product.tint}
          number={product.number}
          label={product.name}
          kicker={col?.kicker}
          composition={composition}
          priority={priority}
        />
        <div className="pk-card__meta">
          <span className="pk-card__num">{product.number}</span>
          <h3 className="pk-card__name">{product.name}</h3>
          {showPrice ? <span className="pk-card__price">{brl(product.priceCents)}</span> : null}
        </div>
        <p className="pk-card__reveal">
          <span>{product.tagline}</span>
          <span className="pk-card__cta">Ver detalhes →</span>
        </p>
      </a>
      <div className="pk-card__actions">
        <button
          type="button"
          className="pk-chip"
          data-cursor="SELECT"
          onClick={(e) => openQuick(product.slug, e.currentTarget.closest<HTMLElement>("[data-card]"))}
        >
          Ver rápido
        </button>
        <button
          type="button"
          className={`pk-chip pk-chip--icon ${isSaved ? "is-on" : ""}`}
          aria-pressed={isSaved}
          aria-label={isSaved ? `Tirar ${product.name} do Case salvo` : `Salvar ${product.name} no Case`}
          onClick={() => toggleSave(product.id)}
        >
          <SaveGlyph on={isSaved} />
        </button>
      </div>
    </article>
  )
}

function SaveGlyph({ on }: { on: boolean }) {
  return (
    <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
      <path d="M4 1.5h8v13l-4-3-4 3z" fill={on ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.4" />
    </svg>
  )
}

/**
 * "Abrir" o produto em destaque: o próprio bloco cresce até virar quick view
 * (o `data-card` ancestral é a origem da transição).
 */
export function QuickOpenButton({ slug, label = "Abrir a peça" }: { slug: string; label?: string }) {
  const { openQuick } = useStore()
  return (
    <button
      type="button"
      className="pk-btn pk-btn--hot"
      data-cursor="SELECT"
      onClick={(e) => openQuick(slug, e.currentTarget.closest<HTMLElement>("[data-card]"))}
    >
      {label}
    </button>
  )
}

// ─── botões da barra ───────────────────────────────────────────────────────

export function CaseButton() {
  const { count, openCart } = useStore()
  return (
    <button type="button" className="pk-nav__case" onClick={() => openCart(true)} data-cursor="SELECT">
      <span>Case</span>
      <span className="pk-nav__count" data-case-target aria-label={`${count} itens no Case`}>
        {count}
      </span>
    </button>
  )
}

export function SearchButton() {
  const { openSearch } = useStore()
  return (
    <button type="button" className="pk-nav__link" onClick={() => openSearch(true)}>
      Buscar
    </button>
  )
}

// ─── caixa de compra (página e quick view) ────────────────────────────────

export function BuyBox({ product, compact = false }: { product: Product; compact?: boolean }) {
  const { add, openCart, saved, toggleSave } = useStore()
  const [size, setSize] = useState(product.sizes[1] || product.sizes[0] || "M")
  const [qty, setQty] = useState(1)
  const [done, setDone] = useState(false)
  const btn = useRef<HTMLButtonElement>(null)
  const isSaved = saved.includes(product.id)
  const soldOut = product.stock <= 0

  useEffect(() => {
    if (!done) return
    const t = window.setTimeout(() => setDone(false), 2200)
    return () => window.clearTimeout(t)
  }, [done])

  return (
    <div className={`pk-buy ${compact ? "pk-buy--compact" : ""}`}>
      <div className="pk-buy__price">
        <span>{brl(product.priceCents)}</span>
        <span className={`pk-buy__stock ${product.stock <= 3 ? "is-low" : ""}`}>
          {soldOut ? "Esgotado" : product.stock <= 3 ? `Últimas ${product.stock} unidades` : "Em estoque"}
        </span>
      </div>

      <fieldset className="pk-buy__group">
        <legend>Tamanho das tips</legend>
        <div className="pk-buy__sizes">
          {product.sizes.map((s) => (
            <button
              key={s}
              type="button"
              className={`pk-size ${s === size ? "is-on" : ""}`}
              aria-pressed={s === size}
              onClick={() => setSize(s)}
            >
              {s}
            </button>
          ))}
        </div>
      </fieldset>

      <div className="pk-buy__row">
        <div className="pk-qty" role="group" aria-label="Quantidade">
          <button type="button" onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label="Diminuir">
            −
          </button>
          <span aria-live="polite">{qty}</span>
          <button
            type="button"
            onClick={() => setQty((q) => Math.min(product.stock, q + 1))}
            aria-label="Aumentar"
          >
            +
          </button>
        </div>
        <button
          ref={btn}
          type="button"
          className="pk-btn pk-btn--hot"
          disabled={soldOut}
          data-cursor="SELECT"
          onClick={() => {
            add(product.id, size, qty, btn.current)
            setDone(true)
          }}
        >
          {done ? "No Case ✓" : "Adicionar ao Case"}
        </button>
      </div>

      <div className="pk-buy__row pk-buy__row--quiet">
        <button type="button" className="pk-link" onClick={() => toggleSave(product.id)} aria-pressed={isSaved}>
          {isSaved ? "Salvo no Case ✓" : "Salvar para depois"}
        </button>
        {done ? (
          <button type="button" className="pk-link" onClick={() => openCart(true)}>
            Abrir o Case →
          </button>
        ) : null}
      </div>

      <p className="pk-buy__note">
        Retirada combinada em {BRAND.city}/{BRAND.state}. Prazo de produção confirmado no fechamento do pedido.
      </p>
    </div>
  )
}

// ─── modais ─────────────────────────────────────────────────────────────────

/** Esc fecha, a rolagem do fundo trava e o foco entra no painel. */
function useDialog(open: boolean, close: () => void, panel: React.RefObject<HTMLElement | null>) {
  useEffect(() => {
    if (!open) return
    const prev = document.activeElement as HTMLElement | null
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close()
    }
    document.addEventListener("keydown", onKey)
    const html = document.documentElement
    const was = html.style.overflow
    html.style.overflow = "hidden"
    panel.current?.focus()
    return () => {
      document.removeEventListener("keydown", onKey)
      html.style.overflow = was
      prev?.focus?.()
    }
  }, [open, close, panel])
}

export function CaseDrawer() {
  const { links, lines, subtotal, cartOpen, openCart, setQty, remove } = useStore()
  const panel = useRef<HTMLDivElement>(null)
  const close = useMemo(() => () => openCart(false), [openCart])
  useDialog(cartOpen, close, panel)

  const rows = lines
    .map((l) => ({ l, p: PRODUCT_BY_ID.get(l.id) }))
    .filter((r): r is { l: typeof r.l; p: Product } => !!r.p)

  const summary = rows
    .map(({ l, p }) => `• ${l.qty}× ${p.name} (${p.number}) — tamanho ${l.size} — ${brl(p.priceCents * l.qty)}`)
    .join("\n")
  const body = `Olá, Taiz! Quero fechar este pedido do site:\n\n${summary}\n\nSubtotal: ${brl(subtotal)}\n\nMeu nome:\nComo prefiro combinar a retirada:`
  const wa = whatsappLink(body)
  const linked = rows.filter(({ p }) => p.storeProductId)

  return (
    <div className={`pk-drawer ${cartOpen ? "is-open" : ""}`} aria-hidden={!cartOpen}>
      <button type="button" className="pk-drawer__scrim" onClick={close} tabIndex={-1} aria-label="Fechar o Case" />
      <div
        ref={panel}
        className="pk-drawer__panel"
        role="dialog"
        aria-modal="true"
        aria-label="Pinkora Case — seu carrinho"
        tabIndex={-1}
      >
        <header className="pk-drawer__head">
          <p className="pk-eyebrow">Pinkora</p>
          <h2 className="pk-drawer__title">Case</h2>
          <button type="button" className="pk-x" onClick={close} aria-label="Fechar">
            ×
          </button>
        </header>

        {rows.length === 0 ? (
          <div className="pk-drawer__empty">
            <div className="pk-empty-orb" aria-hidden="true" />
            <p className="pk-drawer__emptytitle">Your case is empty.</p>
            <p>Nada aqui ainda — as peças novas estão no drop.</p>
            <a className="pk-btn pk-btn--hot" href={pageHref(links, "new-drop")} onClick={close}>
              Ver o drop
            </a>
          </div>
        ) : (
          <>
            <ul className="pk-drawer__list">
              {rows.map(({ l, p }) => (
                <li key={`${l.id}-${l.size}`} className="pk-line">
                  <ProductMedia
                    src={p.image}
                    alt=""
                    variant={p.variant}
                    aspect="3/4"
                    shape={p.shape}
                    tint={p.tint}
                    composition="single"
                    tilt={false}
                    className="pk-line__media"
                  />
                  <div className="pk-line__info">
                    <a href={pageHref(links, p.slug)} className="pk-line__name" onClick={close}>
                      {p.name}
                    </a>
                    <span className="pk-line__sub">
                      {p.number} · tamanho {l.size}
                    </span>
                    <div className="pk-line__row">
                      <div className="pk-qty pk-qty--sm" role="group" aria-label={`Quantidade de ${p.name}`}>
                        <button type="button" onClick={() => setQty(l.id, l.size, l.qty - 1)} aria-label="Diminuir">
                          −
                        </button>
                        <span>{l.qty}</span>
                        <button type="button" onClick={() => setQty(l.id, l.size, l.qty + 1)} aria-label="Aumentar">
                          +
                        </button>
                      </div>
                      <span className="pk-line__price">{brl(p.priceCents * l.qty)}</span>
                    </div>
                    <button type="button" className="pk-link pk-link--sm" onClick={() => remove(l.id, l.size)}>
                      Remover
                    </button>
                  </div>
                </li>
              ))}
            </ul>
            <footer className="pk-drawer__foot">
              <div className="pk-drawer__total">
                <span>Subtotal</span>
                <span>{brl(subtotal)}</span>
              </div>
              {linked.length > 0 ? (
                <div className="pk-drawer__store">
                  <p className="pk-drawer__hint">Pagamento seguro na loja, peça por peça:</p>
                  {linked.map(({ p }) => (
                    <a key={p.id} className="pk-btn pk-btn--line" href={storeProductUrl(p.storeProductId as string)}>
                      Pagar {p.name}
                    </a>
                  ))}
                </div>
              ) : null}
              {linked.length < rows.length ? (
                <>
                  {wa ? (
                    <a className="pk-btn pk-btn--hot" href={wa} target="_blank" rel="noopener noreferrer">
                      Fechar pedido no WhatsApp
                    </a>
                  ) : null}
                  <a
                    className={`pk-btn ${wa ? "pk-btn--line" : "pk-btn--hot"}`}
                    href={mailtoOrder("Pedido pelo site — Pinkoracats", body)}
                  >
                    Enviar pedido por e-mail
                  </a>
                  <p className="pk-drawer__hint">
                    {PLACEHOLDER_CATALOG
                      ? "O pagamento online abre quando o catálogo definitivo entrar. Por enquanto o pedido chega direto para a Taiz, que confirma valores e prazo."
                      : "Estas peças são fechadas direto com a Taiz, que confirma prazo e retirada."}
                  </p>
                </>
              ) : null}
            </footer>
          </>
        )}
      </div>
    </div>
  )
}

export function QuickView() {
  const { links, quick, openQuick } = useStore()
  const panel = useRef<HTMLDivElement>(null)
  const close = useMemo(() => () => openQuick(null), [openQuick])
  useDialog(!!quick, close, panel)
  if (!quick) return null
  const col = COLLECTION_BY_SLUG.get(quick.collection)
  return (
    <div className="pk-quick" role="presentation">
      <button type="button" className="pk-quick__scrim" onClick={close} tabIndex={-1} aria-label="Fechar" />
      <div
        ref={panel}
        className="pk-quick__panel"
        role="dialog"
        aria-modal="true"
        aria-label={`${quick.name} — visualização rápida`}
        tabIndex={-1}
      >
        <button type="button" className="pk-x" onClick={close} aria-label="Fechar">
          ×
        </button>
        <div className="pk-quick__media" style={{ viewTransitionName: "pk-quick" }}>
          <ProductMedia
            src={quick.image}
            hoverSrc={quick.hoverImage}
            alt={quick.name}
            variant={quick.variant}
            aspect="4/5"
            media={quick.media}
            shape={quick.shape}
            tint={quick.tint}
            number={quick.number}
            label={quick.name}
            kicker={col?.kicker}
            priority
          />
        </div>
        <div className="pk-quick__info">
          <p className="pk-eyebrow">
            {quick.number} · {col?.name}
          </p>
          <h2 className="pk-quick__title">{quick.name}</h2>
          <p className="pk-quick__desc">{quick.description}</p>
          <BuyBox product={quick} compact />
          <a className="pk-link" href={pageHref(links, quick.slug)}>
            Página completa do produto →
          </a>
        </div>
      </div>
    </div>
  )
}

function norm(s: string) {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
}

export function SearchOverlay() {
  const { links, searchOpen, openSearch } = useStore()
  const [q, setQ] = useState("")
  const panel = useRef<HTMLDivElement>(null)
  const input = useRef<HTMLInputElement>(null)
  const close = useMemo(() => () => openSearch(false), [openSearch])
  useDialog(searchOpen, close, panel)

  useEffect(() => {
    if (searchOpen) window.setTimeout(() => input.current?.focus(), 30)
  }, [searchOpen])

  const results = useMemo(() => {
    const t = norm(q.trim())
    if (!t) return PRODUCTS.filter((p) => p.featured)
    return PRODUCTS.filter((p) =>
      norm(`${p.name} ${p.tagline} ${COLLECTION_BY_SLUG.get(p.collection)?.name || ""}`).includes(t),
    )
  }, [q])

  if (!searchOpen) return null
  return (
    <div className="pk-search" role="dialog" aria-modal="true" aria-label="Buscar no catálogo" ref={panel} tabIndex={-1}>
      <button type="button" className="pk-x" onClick={close} aria-label="Fechar a busca">
        ×
      </button>
      <label className="pk-search__label" htmlFor="pk-search-input">
        Buscar
      </label>
      <input
        id="pk-search-input"
        ref={input}
        className="pk-search__input"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="chrome, cereja, stiletto…"
        autoComplete="off"
      />
      <p className="pk-search__count" aria-live="polite">
        {q.trim() ? `${results.length} resultado${results.length === 1 ? "" : "s"}` : "Em destaque"}
      </p>
      <ul className="pk-search__list">
        {results.map((p) => (
          <li key={p.id}>
            <a href={pageHref(links, p.slug)} onClick={close} className="pk-search__item">
              <span className="pk-search__num">{p.number}</span>
              <span className="pk-search__name">{p.name}</span>
              <span className="pk-search__col">{COLLECTION_BY_SLUG.get(p.collection)?.name}</span>
              <span className="pk-search__price">{brl(p.priceCents)}</span>
            </a>
          </li>
        ))}
      </ul>
    </div>
  )
}
