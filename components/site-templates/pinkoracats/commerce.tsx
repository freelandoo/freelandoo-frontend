"use client"

// AS PEÇAS DE COMPRA: card (uma caixa exposta), link de takeover, preço,
// caixa de compra, Your Case (carrinho), Digital Unboxing (quick view), recibo
// e busca.
//
// ⚠️ NENHUMA PEÇA AQUI COBRA NADA. O Case manda ids e quantidades para
// `/store-carts/checkout` (mig 271), o backend RECALCULA o preço e devolve a
// página do Mercado Pago — um pagamento só para o carrinho inteiro, sem a
// compradora precisar de conta. Enquanto o catálogo for prévia (`catalog.live`
// falso), o pedido segue por e-mail/WhatsApp para a Taiz.
//
// ⚠️ O CHECKOUT É CONVENCIONAL DE PROPÓSITO: nada de 3D nem cena — ali o que
// vende é clareza, confiança e velocidade.
//
// ⚠️ PRODUTO É LINK DE VERDADE e botão é botão de verdade: o card é um `<a>`
// para a página do produto, e o "ver rápido" é um `<button>` IRMÃO dele, nunca
// filho (botão dentro de link não existe em HTML).

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react"
import gsap from "gsap"

import AcrylicProductCase, { type CaseSize } from "./case"
import { catalogIndex, dropCollection } from "./content/catalog"
import { displayId, vtProduct } from "./content/display"
import type { Product } from "./content/products.mock"
import { BRAND, mailtoOrder, whatsappLink } from "./content/brand"
import { PAGE, brl, pageHref } from "./lib"
import { useStore } from "./store"
import { DUR, registerEase, reducedMotion } from "./tokens"

// ─── preço ──────────────────────────────────────────────────────────────────

/** O preço — claro, sempre. O "de" só aparece se for de fato maior. */
export function Price({ product, className = "" }: { product: Product; className?: string }) {
  const was = product.compareAtPriceCents
  return (
    <span className={`pk-price ${className}`}>
      {was && was > product.priceCents ? (
        <s aria-label={`Antes ${brl(was)}`}>{brl(was)}</s>
      ) : null}
      <span>{brl(product.priceCents)}</span>
    </span>
  )
}

// ─── takeover ───────────────────────────────────────────────────────────────

/**
 * O link que vira TAKEOVER: clique simples abre o produto no lugar (a caixa
 * sai da vitrine e cresce até o quick view); Ctrl/⌘-clique, botão do meio e
 * o robô continuam vendo um link para a página do produto.
 */
export function TakeoverLink({
  product,
  className = "",
  children,
  cursor = "OPEN",
  originClosest,
}: {
  product: Product
  className?: string
  children: React.ReactNode
  cursor?: string
  /** Seletor do ancestral que contém a caixa (quando o link não é a caixa). */
  originClosest?: string
}) {
  const { links, openQuick } = useStore()
  return (
    <a
      href={pageHref(links, product.slug)}
      className={className}
      data-cursor={cursor}
      onClick={(e) => {
        if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
        e.preventDefault()
        openQuick(
          product.slug,
          (originClosest && e.currentTarget.closest<HTMLElement>(originClosest)) || e.currentTarget,
        )
      }}
    >
      {children}
    </a>
  )
}

// ─── card ───────────────────────────────────────────────────────────────────

export function ProductCard({
  product,
  size = "md",
  showPrice = true,
  priority,
  className = "",
}: {
  product: Product
  size?: CaseSize
  showPrice?: boolean
  priority?: boolean
  className?: string
}) {
  const { links, openQuick, saved, toggleSave } = useStore()
  const isSaved = saved.includes(product.id)
  return (
    <article className={`pk-card pk-card--${size} ${className}`} data-card data-tilt data-pickup>
      <a
        href={pageHref(links, product.slug)}
        className="pk-card__link"
        data-cursor="VIEW"
        onClick={(e) => {
          // a caixa clicada vira o palco da página do produto (View Transition
          // entre documentos) — nome posto só agora, só nela (ver `vt.tsx`)
          if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
          const c = e.currentTarget.querySelector<HTMLElement>("[data-case]")
          if (c) c.style.viewTransitionName = vtProduct(product.id)
        }}
      >
        <AcrylicProductCase product={product} size={size} priority={priority} />
        <div className="pk-card__meta">
          <span className="pk-mono pk-card__num">{displayId(product.number)}</span>
          <h3 className="pk-card__name">{product.name}</h3>
          {showPrice ? <Price product={product} className="pk-card__price" /> : null}
        </div>
      </a>
      <div className="pk-card__actions">
        <button
          type="button"
          className="pk-chip"
          data-cursor="OPEN"
          onClick={(e) => openQuick(product.slug, e.currentTarget.closest<HTMLElement>("[data-card]"))}
        >
          Ver rápido
        </button>
        <SaveButton product={product} on={isSaved} toggle={toggleSave} />
      </div>
    </article>
  )
}

function SaveButton({ product, on, toggle }: { product: Product; on: boolean; toggle: (id: string) => void }) {
  return (
    <button
      type="button"
      className={`pk-chip pk-chip--save ${on ? "is-on" : ""}`}
      aria-pressed={on}
      aria-label={on ? `Tirar ${product.name} da coleção salva` : `Salvar ${product.name} na coleção`}
      onClick={() => toggle(product.id)}
    >
      {on ? "Saved" : "Save"}
    </button>
  )
}

/** "Abrir" uma peça destacada: a caixa mais próxima vira o quick view. */
export function QuickOpenButton({ slug, label = "Abrir o set" }: { slug: string; label?: string }) {
  const { openQuick } = useStore()
  return (
    <button
      type="button"
      className="pk-btn pk-btn--ink"
      data-cursor="OPEN"
      onClick={(e) =>
        openQuick(
          slug,
          e.currentTarget.closest<HTMLElement>("[data-card]") || e.currentTarget.closest<HTMLElement>("section"),
        )
      }
    >
      {label}
    </button>
  )
}

// ─── botões da barra ───────────────────────────────────────────────────────

export function CaseButton() {
  const { count, openCart } = useStore()
  return (
    <button type="button" className="pk-nav__case" onClick={() => openCart(true)} data-cursor="OPEN">
      <span>
        <span className="pk-nav__your">Your </span>
        <b>Case</b>
      </span>
      <span className="pk-nav__count" data-case-target aria-label={`${count} itens no Case`}>
        {count}
      </span>
    </button>
  )
}

export function SearchButton({ className = "pk-nav__link" }: { className?: string }) {
  const { openSearch } = useStore()
  return (
    <button type="button" className={className} onClick={() => openSearch(true)}>
      Search
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
    const t = window.setTimeout(() => setDone(false), 2400)
    return () => window.clearTimeout(t)
  }, [done])

  return (
    <div className={`pk-buy ${compact ? "pk-buy--compact" : ""}`}>
      <div className="pk-buy__price">
        <Price product={product} />
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
            onClick={() => setQty((q) => Math.min(Math.max(1, product.stock), q + 1))}
            aria-label="Aumentar"
          >
            +
          </button>
        </div>
        <button
          ref={btn}
          type="button"
          className="pk-btn pk-btn--ink"
          disabled={soldOut}
          data-cursor="ADD"
          onClick={() => {
            add(product.id, size, qty, btn.current)
            setDone(true)
          }}
        >
          {soldOut ? "Esgotado" : done ? "No Case ✓" : "Adicionar ao Case"}
        </button>
      </div>

      <div className="pk-buy__row pk-buy__row--quiet">
        <button type="button" className="pk-link" onClick={() => toggleSave(product.id)} aria-pressed={isSaved}>
          {isSaved ? "Salvo na coleção ✓" : "Save — salvar para depois"}
        </button>
        {done ? (
          <button type="button" className="pk-link" onClick={() => openCart(true)}>
            Abrir o Case →
          </button>
        ) : null}
      </div>

      <dl className="pk-buy__facts">
        <div>
          <dt>Retirada</dt>
          <dd>
            Combinada em {BRAND.city}/{BRAND.state}
          </dd>
        </div>
        <div>
          <dt>Prazo</dt>
          <dd>Confirmado pela Taiz no fechamento do pedido</dd>
        </div>
      </dl>
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

type Step = "cart" | "form" | "sending"

/** O que a API devolve no checkout. */
type CheckoutApi = { checkout_url?: string; error?: string }

export function CaseDrawer() {
  const { links, catalog, lines, subtotal, cartOpen, openCart, setQty, remove } = useStore()
  const { byId } = catalogIndex(catalog)
  const panel = useRef<HTMLDivElement>(null)
  const close = useMemo(() => () => openCart(false), [openCart])
  useDialog(cartOpen, close, panel)
  const [step, setStep] = useState<Step>("cart")
  const [error, setError] = useState<string | null>(null)
  const [buyer, setBuyer] = useState({ name: "", email: "", whatsapp: "" })
  const drop = dropCollection(catalog)

  // Fechar e reabrir volta para a lista: um formulário pela metade, aberto do
  // nada na próxima visita ao Case, parece pedido em andamento.
  useEffect(() => {
    if (!cartOpen) {
      setStep("cart")
      setError(null)
    }
  }, [cartOpen])

  const rows = lines
    .map((l) => ({ l, p: byId.get(l.id) }))
    .filter((r): r is { l: typeof r.l; p: Product } => !!r.p)

  const summary = rows
    .map(({ l, p }) => `• ${l.qty}× ${p.name} (${displayId(p.number)}) — tamanho ${l.size} — ${brl(p.priceCents * l.qty)}`)
    .join("\n")
  const body = `Olá, Taiz! Quero fechar este pedido do site:\n\n${summary}\n\nSubtotal: ${brl(subtotal)}\n\nMeu nome:\nComo prefiro combinar a retirada:`
  const wa = whatsappLink(body)

  /**
   * Fecha o pedido no backend e manda a compradora para o Mercado Pago.
   *
   * ⚠️ SÓ VAI ID E QUANTIDADE: o preço é recalculado no backend. O tamanho da
   * tip não existe na Loja (é uma escolha do set), então ele viaja como a
   * observação do pedido — é ali que a Taiz lê.
   */
  async function pay(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setStep("sending")
    const items = new Map<string, number>()
    for (const { l, p } of rows) {
      if (!p.storeProductId) continue
      items.set(p.storeProductId, (items.get(p.storeProductId) || 0) + l.qty)
    }
    const note = rows.map(({ l, p }) => `${l.qty}× ${p.name} — tamanho ${l.size}`).join("; ")
    try {
      const res = await fetch("/api/store-carts/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id_community: links.communityId,
          buyer,
          note: note.slice(0, 500),
          items: [...items.entries()].map(([id, quantity]) => ({ id_profile_product: Number(id), quantity })),
          // A volta do pagamento: esta mesma página. O backend confere que a
          // origem é do site antes de usar.
          return_url: `${window.location.origin}${window.location.pathname}`,
        }),
      })
      const data = (await res.json().catch(() => ({}))) as CheckoutApi
      if (!res.ok || !data.checkout_url) {
        setError(data.error || "Não foi possível abrir o pagamento. Tente de novo.")
        setStep("form")
        return
      }
      window.location.assign(data.checkout_url)
    } catch {
      setError("Sem conexão. Confira a internet e tente de novo.")
      setStep("form")
    }
  }

  const count = rows.reduce((s, r) => s + r.l.qty, 0)

  return (
    <div className={`pk-drawer ${cartOpen ? "is-open" : ""}`} aria-hidden={!cartOpen}>
      <button type="button" className="pk-drawer__scrim" onClick={close} tabIndex={-1} aria-label="Fechar o Case" />
      <div
        ref={panel}
        className="pk-drawer__panel"
        role="dialog"
        aria-modal="true"
        aria-label="Your Case — seu carrinho"
        tabIndex={-1}
      >
        <header className="pk-drawer__head">
          <p className="pk-eyebrow">{step === "cart" ? `${count} ${count === 1 ? "set" : "sets"}` : "Pinkoracats"}</p>
          <h2 className="pk-drawer__title">{step === "cart" ? "Your Case" : "Checkout"}</h2>
          <button type="button" className="pk-x" onClick={close} aria-label="Fechar">
            ×
          </button>
        </header>

        {rows.length === 0 ? (
          <div className="pk-drawer__empty">
            <AcrylicProductCase product={null} size="sm" lid="open" />
            <p className="pk-drawer__emptytitle">Your case is empty.</p>
            <p>Nada aqui ainda — as peças novas estão no drop.</p>
            <a className="pk-btn pk-btn--ink" href={pageHref(links, drop ? drop.slug : PAGE.loja)} onClick={close}>
              Discover the drop
            </a>
          </div>
        ) : step === "cart" ? (
          <>
            <ul className="pk-drawer__list">
              {rows.map(({ l, p }) => (
                <li key={`${l.id}-${l.size}`} className="pk-line">
                  <AcrylicProductCase product={p} size="xs" className="pk-line__case" />
                  <div className="pk-line__info">
                    <a href={pageHref(links, p.slug)} className="pk-line__name" onClick={close}>
                      {p.name}
                    </a>
                    <span className="pk-line__sub pk-mono">
                      {displayId(p.number)} · tamanho {l.size}
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
              {catalog.live ? (
                <>
                  <button type="button" className="pk-btn pk-btn--ink" onClick={() => setStep("form")}>
                    Finalizar compra
                  </button>
                  <p className="pk-drawer__hint">
                    Pagamento pelo Mercado Pago — Pix, cartão ou boleto. Retirada combinada com a Taiz em {BRAND.city}/
                    {BRAND.state}.
                  </p>
                </>
              ) : (
                <>
                  {wa ? (
                    <a className="pk-btn pk-btn--ink" href={wa} target="_blank" rel="noopener noreferrer">
                      Fechar pedido no WhatsApp
                    </a>
                  ) : null}
                  <a
                    className={`pk-btn ${wa ? "pk-btn--line" : "pk-btn--ink"}`}
                    href={mailtoOrder("Pedido pelo site — Pinkoracats", body)}
                  >
                    Enviar pedido por e-mail
                  </a>
                  <p className="pk-drawer__hint">
                    O pagamento online abre quando o catálogo definitivo entrar. Por enquanto o pedido chega direto
                    para a Taiz, que confirma valores e prazo.
                  </p>
                </>
              )}
            </footer>
          </>
        ) : (
          <form className="pk-checkout" onSubmit={pay}>
            <p className="pk-checkout__lead">
              {count} {count === 1 ? "peça" : "peças"} · <strong>{brl(subtotal)}</strong>
            </p>
            <label className="pk-field">
              <span>Seu nome</span>
              <input
                required
                autoComplete="name"
                value={buyer.name}
                onChange={(e) => setBuyer((b) => ({ ...b, name: e.target.value }))}
              />
            </label>
            <label className="pk-field">
              <span>E-mail</span>
              <input
                required
                type="email"
                autoComplete="email"
                value={buyer.email}
                onChange={(e) => setBuyer((b) => ({ ...b, email: e.target.value }))}
              />
            </label>
            <label className="pk-field">
              <span>WhatsApp com DDD</span>
              <input
                required
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                placeholder="(11) 99999-9999"
                value={buyer.whatsapp}
                onChange={(e) => setBuyer((b) => ({ ...b, whatsapp: e.target.value }))}
              />
            </label>
            <p className="pk-drawer__hint">
              É por ele que a Taiz combina a retirada em {BRAND.city}/{BRAND.state}. Não precisa criar conta.
            </p>
            {error ? (
              <p className="pk-checkout__error" role="alert">
                {error}
              </p>
            ) : null}
            <button type="submit" className="pk-btn pk-btn--ink" disabled={step === "sending"}>
              {step === "sending" ? "Abrindo o pagamento…" : "Pagar com Mercado Pago"}
            </button>
            <button type="button" className="pk-link" onClick={() => setStep("cart")} disabled={step === "sending"}>
              ← Voltar ao Case
            </button>
          </form>
        )}
      </div>
    </div>
  )
}

/**
 * O RECIBO: o que a compradora vê quando volta do Mercado Pago.
 *
 * Pago → "pedido confirmado" e o próximo passo (a Taiz chama no WhatsApp).
 * Pendente → o webhook ainda não chegou, ou é boleto/Pix aguardando.
 * Voltou sem pagar → o carrinho continua, e o botão leva de volta a ele.
 */
export function OrderPanel() {
  const { order, closeOrder, openCart } = useStore()
  const panel = useRef<HTMLDivElement>(null)
  useDialog(!!order, closeOrder, panel)
  if (!order) return null

  const title =
    order.status === "paid"
      ? "Pedido confirmado"
      : order.status === "cancel"
        ? "Pagamento não concluído"
        : order.status === "canceled" || order.status === "refunded"
          ? "Pedido cancelado"
          : order.status === "error"
            ? "Pedido recebido"
            : "Confirmando o pagamento…"
  const text =
    order.status === "paid"
      ? `A Taiz recebeu o seu pedido e vai chamar você no WhatsApp para combinar a retirada em ${BRAND.city}/${BRAND.state}.`
      : order.status === "cancel"
        ? "Nada foi cobrado. As peças continuam no seu Case."
        : order.status === "canceled"
          ? "Uma das peças esgotou antes de o pagamento confirmar. O valor é devolvido integralmente pelo Mercado Pago."
          : order.status === "refunded"
            ? "Este pedido foi reembolsado."
            : order.status === "error"
              ? "Não conseguimos ler o estado do pedido agora. Se o pagamento foi feito, você recebe o comprovante do Mercado Pago por e-mail."
              : "Se você pagou com Pix ou cartão, isso leva alguns segundos. Boleto confirma quando é compensado."

  return (
    <div className="pk-quick" role="presentation">
      <button type="button" className="pk-quick__scrim" onClick={closeOrder} tabIndex={-1} aria-label="Fechar" />
      <div ref={panel} className="pk-quick__panel pk-order" role="dialog" aria-modal="true" aria-label={title} tabIndex={-1}>
        <button type="button" className="pk-x" onClick={closeOrder} aria-label="Fechar">
          ×
        </button>
        <div className="pk-order__body" aria-live="polite">
          <p className="pk-eyebrow pk-mono">Pedido {order.id.slice(0, 8)}</p>
          <h2 className="pk-quick__title">{title}</h2>
          <p className="pk-quick__desc">{text}</p>
          {order.items.length ? (
            <ul className="pk-order__list">
              {order.items.map((i, n) => (
                <li key={n}>
                  <span>
                    {i.quantity}× {i.name}
                  </span>
                  <span>{brl(i.unitCents * i.quantity)}</span>
                </li>
              ))}
              <li className="pk-order__total">
                <span>Total</span>
                <span>{brl(order.totalCents)}</span>
              </li>
            </ul>
          ) : null}
          {order.status === "cancel" ? (
            <button
              type="button"
              className="pk-btn pk-btn--ink"
              onClick={() => {
                closeOrder()
                openCart(true)
              }}
            >
              Voltar ao Case
            </button>
          ) : (
            <button type="button" className="pk-btn pk-btn--line" onClick={closeOrder}>
              Continuar no site
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

/**
 * DIGITAL UNBOXING — o quick view.
 *
 * A caixa chega (View Transition a partir da caixa clicada; sem a API, o FLIP
 * é feito aqui com GSAP a partir do retângulo guardado), a tampa abre, o set
 * aparece. "Explorar o set" aproxima a peça e deixa o ponteiro passear por
 * ela; com as 10 unhas em arquivo (`product.nails`), elas saem da caixa.
 */
export function QuickView() {
  const { links, catalog, quick, quickOrigin, openQuick } = useStore()
  const panel = useRef<HTMLDivElement>(null)
  const stage = useRef<HTMLDivElement>(null)
  const close = useMemo(() => () => openQuick(null), [openQuick])
  useDialog(!!quick, close, panel)
  const [open, setOpen] = useState(false)
  const [explore, setExplore] = useState(false)

  // a tampa abre depois que a caixa chega
  useEffect(() => {
    setExplore(false)
    if (!quick) {
      setOpen(false)
      return
    }
    if (reducedMotion()) {
      setOpen(true)
      return
    }
    setOpen(false)
    const t = window.setTimeout(() => setOpen(true), 380)
    return () => window.clearTimeout(t)
  }, [quick])

  // FALLBACK do takeover: sem View Transition, a caixa voa do nicho até aqui.
  useLayoutEffect(() => {
    const el = stage.current
    const from = quickOrigin.rect
    if (!quick || !el || !from || quickOrigin.viaVT || reducedMotion()) return
    const to = el.getBoundingClientRect()
    if (!to.width || !to.height) return
    const ease = registerEase()
    gsap.fromTo(
      el,
      {
        x: from.left - to.left,
        y: from.top - to.top,
        scaleX: from.width / to.width,
        scaleY: from.height / to.height,
        transformOrigin: "0 0",
      },
      { x: 0, y: 0, scaleX: 1, scaleY: 1, duration: DUR.cinematic, ease, clearProps: "transform" },
    )
  }, [quick, quickOrigin])

  if (!quick) return null
  const col = catalogIndex(catalog).colBySlug.get(quick.collection)
  const nails = quick.nails || []

  return (
    <div className="pk-quick" role="presentation">
      <button type="button" className="pk-quick__scrim" onClick={close} tabIndex={-1} aria-label="Fechar" />
      <div
        ref={panel}
        className="pk-quick__panel pk-unbox"
        role="dialog"
        aria-modal="true"
        aria-label={`${quick.name} — visualização rápida`}
        tabIndex={-1}
      >
        <button type="button" className="pk-x" onClick={close} aria-label="Fechar">
          ×
        </button>
        <div
          ref={stage}
          className={`pk-unbox__stage ${open ? "is-open" : ""} ${explore ? "is-exploring" : ""}`}
          style={{ viewTransitionName: "pk-quick" }}
          onPointerMove={(e) => {
            if (!explore) return
            const r = e.currentTarget.getBoundingClientRect()
            e.currentTarget.style.setProperty("--px", `${(((e.clientX - r.left) / r.width) * 100).toFixed(1)}%`)
            e.currentTarget.style.setProperty("--py", `${(((e.clientY - r.top) / r.height) * 100).toFixed(1)}%`)
          }}
        >
          <AcrylicProductCase product={quick} size="xl" lid="live" plate priority />
          {explore && nails.length ? (
            <ul className="pk-unbox__nails" aria-label="As unhas do set">
              {nails.slice(0, 10).map((src, i) => (
                <li key={src} style={{ "--i": i } as React.CSSProperties}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src} alt={`Unha ${i + 1} de ${quick.name}`} loading="lazy" decoding="async" />
                </li>
              ))}
            </ul>
          ) : null}
        </div>
        <div className="pk-quick__info">
          <p className="pk-eyebrow pk-mono">
            {displayId(quick.number)} · {col?.name || "Coleção"}
          </p>
          <h2 className="pk-quick__title">{quick.name}</h2>
          {quick.description ? <p className="pk-quick__desc">{quick.description}</p> : null}
          <button
            type="button"
            className="pk-link"
            aria-pressed={explore}
            onClick={() => {
              setOpen(true)
              setExplore((x) => !x)
            }}
          >
            {explore ? "Voltar à caixa" : "Explore set — ver de perto"}
          </button>
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

/**
 * A BUSCA — tela cheia, branca, um campo enorme em preto. Os resultados são
 * pequenas vitrines (caixas fechadas). Nada anima enquanto se digita: o filtro
 * é instantâneo, o movimento ficaria atrás das teclas.
 */
export function SearchOverlay() {
  const { links, catalog, searchOpen, openSearch } = useStore()
  const { colBySlug } = catalogIndex(catalog)
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
    if (!t) return catalog.products.filter((p) => p.featured).slice(0, 8)
    return catalog.products.filter((p) =>
      norm(`${p.name} ${p.tagline} ${p.description} ${p.details.join(" ")} ${colBySlug.get(p.collection)?.name || ""}`).includes(t),
    )
  }, [q, catalog, colBySlug])

  if (!searchOpen) return null
  return (
    <div className="pk-search" role="dialog" aria-modal="true" aria-label="Buscar no catálogo" ref={panel} tabIndex={-1}>
      <button type="button" className="pk-x" onClick={close} aria-label="Fechar a busca">
        ×
      </button>
      <label className="pk-search__label" htmlFor="pk-search-input">
        Search
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
      <p className="pk-search__count pk-mono" aria-live="polite">
        {q.trim() ? `${results.length} resultado${results.length === 1 ? "" : "s"}` : "Em destaque"}
      </p>
      <ul className="pk-search__list">
        {results.map((p) => (
          <li key={p.id}>
            <a href={pageHref(links, p.slug)} onClick={close} className="pk-search__item">
              <AcrylicProductCase product={p} size="xs" />
              <span className="pk-search__num pk-mono">{displayId(p.number)}</span>
              <span className="pk-search__name">{p.name}</span>
              <span className="pk-search__col">{colBySlug.get(p.collection)?.name}</span>
              <Price product={p} className="pk-search__price" />
            </a>
          </li>
        ))}
      </ul>
    </div>
  )
}
