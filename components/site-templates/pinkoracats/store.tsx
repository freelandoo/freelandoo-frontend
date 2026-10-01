"use client"

// O ESTADO DA LOJA: carrinho ("Pinkora Case"), lista salva, quick view e busca.
//
// ⚠️ UM PROVIDER SÓ, montado na porta do tema, porque as quatro coisas se
// cruzam: o quick view adiciona ao carrinho, o carrinho abre depois de
// adicionar, a busca fecha o quick view. Em quatro contextos soltos a ordem
// de montagem decidiria quem enxerga quem.
//
// ⚠️ O CARRINHO MORA NO `localStorage` DESTA ORIGEM, e só é preferência de
// quem visita — nunca é pedido. O pedido de verdade nasce no backend
// (`/store-carts/checkout`, mig 271), que RECALCULA o preço: o que está aqui
// é só a lista de ids e quantidades. Toda leitura e escrita vai em try/catch:
// janela anônima e armazenamento bloqueado devolvem exceção, e o site tem que
// continuar vendendo sem ele.
//
// ⚠️ O CATÁLOGO CHEGA POR PROP, nunca por import: ele é a Loja ao vivo (ver
// `content/catalog.ts`). Importar a prévia aqui faria o carrinho validar
// contra produtos que não existem mais.

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react"
import { flushSync } from "react-dom"

import { catalogIndex, type Catalog } from "./content/catalog"
import type { Product } from "./content/products.mock"
import type { TemplateLinks } from "./lib"

export type CartLine = { id: string; size: string; qty: number }

/** O pedido que voltou do Mercado Pago (`?pedido=<id>`). */
export type OrderReceipt = {
  id: string
  /** `loading` até a primeira leitura; `cancel` = voltou sem pagar. */
  status: "loading" | "pending" | "paid" | "canceled" | "refunded" | "cancel" | "error"
  totalCents: number
  items: { name: string; quantity: number; unitCents: number }[]
}

type Store = {
  links: TemplateLinks
  catalog: Catalog
  order: OrderReceipt | null
  closeOrder: () => void
  clearCart: () => void
  lines: CartLine[]
  count: number
  subtotal: number
  saved: string[]
  cartOpen: boolean
  searchOpen: boolean
  quick: Product | null
  /**
   * De onde o quick view nasceu (o retângulo da caixa clicada) e se a View
   * Transition API cuidou da passagem. Sem a API, o QuickView faz o FLIP à mão
   * a partir deste retângulo.
   */
  quickOrigin: { rect: DOMRect | null; viaVT: boolean }
  add: (id: string, size: string, qty: number, from?: HTMLElement | null) => void
  setQty: (id: string, size: string, qty: number) => void
  remove: (id: string, size: string) => void
  toggleSave: (id: string) => void
  openCart: (v: boolean) => void
  openSearch: (v: boolean) => void
  openQuick: (slug: string | null, from?: HTMLElement | null) => void
}

const Ctx = createContext<Store | null>(null)

const CART_KEY = "pinkora:case"
const SAVE_KEY = "pinkora:saved"

function read<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

function write(key: string, value: unknown) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* armazenamento indisponível: o carrinho vive só nesta visita */
  }
}

function reducedMotion() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches
}

/**
 * ADD TO CASE — a caixinha fecha, dá o "clique", encolhe e voa até o Case.
 *
 * ⚠️ O ITEM JÁ ENTROU NO CARRINHO antes disto começar: a animação é só
 * confirmação visual, nunca a condição para a compra existir.
 *
 * É um elemento `fixed` de 56px criado na hora e removido no fim — nunca
 * cresce além da viewport, então não abre rolagem horizontal. WAAPI em
 * `transform`/`opacity` só. ~520ms no total.
 */
function flyToCase(from: HTMLElement) {
  const target = document.querySelector<HTMLElement>(".tpl-pinkora [data-case-target]")
  const host = document.querySelector(".tpl-pinkora")
  if (!target || !host) return
  const a = from.getBoundingClientRect()
  const b = target.getBoundingClientRect()
  const box = document.createElement("div")
  box.className = "pk-flycase"
  box.innerHTML = '<span class="pk-flycase__lid"></span>'
  box.style.left = `${a.left + a.width / 2 - 28}px`
  box.style.top = `${a.top + a.height / 2 - 28}px`
  host.appendChild(box)
  const dx = b.left + b.width / 2 - (a.left + a.width / 2)
  const dy = b.top + b.height / 2 - (a.top + a.height / 2)
  const ease = "cubic-bezier(.22,1,.36,1)"
  // 1) a tampa fecha
  box.querySelector<HTMLElement>(".pk-flycase__lid")?.animate(
    [{ transform: "rotateX(-100deg)" }, { transform: "rotateX(0deg)" }],
    { duration: 170, easing: ease, fill: "forwards" },
  )
  // 2) clique, encolhe e voa
  const anim = box.animate(
    [
      { transform: "translate(0,0) scale(1)", opacity: 0, offset: 0 },
      { transform: "translate(0,0) scale(1)", opacity: 1, offset: 0.2 },
      { transform: "translate(0,0) scale(0.9)", opacity: 1, offset: 0.34 },
      { transform: "translate(0,0) scale(1)", opacity: 1, offset: 0.42 },
      { transform: `translate(${dx}px, ${dy}px) scale(0.32)`, opacity: 0.35, offset: 1 },
    ],
    { duration: 520, easing: ease },
  )
  anim.onfinish = () => {
    box.remove()
    target.animate([{ transform: "scale(1)" }, { transform: "scale(1.22)" }, { transform: "scale(1)" }], {
      duration: 260,
    })
  }
}

type VTDocument = Document & { startViewTransition?: (cb: () => void) => unknown }

type CartApiItem = { name?: string; quantity?: number; unit_price_cents?: number }
type CartApi = { cart?: { status?: string; total_cents?: number; items?: CartApiItem[] } }

/**
 * Lê o recibo do pedido. O id é um UUID (não se adivinha) e a resposta do
 * backend já vem sem e-mail e WhatsApp.
 */
async function fetchReceipt(id: string): Promise<OrderReceipt | null> {
  try {
    const res = await fetch(`/api/store-carts/${encodeURIComponent(id)}`, { cache: "no-store" })
    if (!res.ok) return null
    const data = (await res.json()) as CartApi
    const c = data.cart
    if (!c) return null
    const status = (["pending", "paid", "canceled", "refunded"] as const).find((s) => s === c.status) || "pending"
    return {
      id,
      status,
      totalCents: Number(c.total_cents) || 0,
      items: (c.items || []).map((i) => ({
        name: String(i.name || ""),
        quantity: Number(i.quantity) || 0,
        unitCents: Number(i.unit_price_cents) || 0,
      })),
    }
  } catch {
    return null
  }
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function StoreProvider({
  links,
  catalog,
  children,
}: {
  links: TemplateLinks
  catalog: Catalog
  children: React.ReactNode
}) {
  const { byId, bySlug } = catalogIndex(catalog)
  const [order, setOrder] = useState<OrderReceipt | null>(null)
  const [lines, setLines] = useState<CartLine[]>([])
  const [saved, setSaved] = useState<string[]>([])
  const [cartOpen, setCartOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [quick, setQuick] = useState<Product | null>(null)
  const [quickOrigin, setQuickOrigin] = useState<{ rect: DOMRect | null; viaVT: boolean }>({
    rect: null,
    viaVT: false,
  })
  const loaded = useRef(false)

  // Lido depois da hidratação: `localStorage` não existe no servidor, e ler no
  // render faria o HTML discordar do cliente.
  useEffect(() => {
    setLines(read<CartLine[]>(CART_KEY, []).filter((l) => byId.has(l.id)))
    setSaved(read<string[]>(SAVE_KEY, []).filter((id) => byId.has(id)))
    loaded.current = true
    // O catálogo é fixo durante a visita (é o HTML que chegou); o índice muda
    // de identidade a cada render do servidor, nunca durante a visita.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── a volta do Mercado Pago ──────────────────────────────────────────────
  // `?pedido=<id>` (pago ou pendente) e `&pedido_status=cancel` (desistiu).
  // ⚠️ A query sai da URL na hora: deixada lá, o F5 reabriria o recibo, e o
  // link copiado da barra levaria o pedido de alguém para outra pessoa.
  useEffect(() => {
    const url = new URL(window.location.href)
    const id = url.searchParams.get("pedido")
    if (!id || !UUID.test(id)) return
    const canceled = url.searchParams.get("pedido_status") === "cancel"
    url.searchParams.delete("pedido")
    url.searchParams.delete("pedido_status")
    window.history.replaceState(null, "", url.pathname + (url.search || "") + url.hash)

    if (canceled) {
      // Voltou sem pagar: o carrinho continua, para tentar de novo.
      setOrder({ id, status: "cancel", totalCents: 0, items: [] })
      return
    }
    // Pagou (ou está processando, como no boleto): o carrinho já virou pedido.
    setLines([])
    write(CART_KEY, [])
    setOrder({ id, status: "loading", totalCents: 0, items: [] })

    let alive = true
    let tries = 0
    let timer = 0
    const tick = async () => {
      const r = await fetchReceipt(id)
      if (!alive) return
      tries += 1
      if (r) setOrder(r)
      else if (tries === 1) setOrder({ id, status: "error", totalCents: 0, items: [] })
      // O webhook chega alguns segundos depois do redirecionamento: enquanto
      // pendente, pergunta de novo — com teto, nunca para sempre.
      if ((!r || r.status === "pending") && tries < 10) timer = window.setTimeout(tick, 3000)
    }
    tick()
    return () => {
      alive = false
      window.clearTimeout(timer)
    }
  }, [])

  useEffect(() => {
    if (loaded.current) write(CART_KEY, lines)
  }, [lines])
  useEffect(() => {
    if (loaded.current) write(SAVE_KEY, saved)
  }, [saved])

  const add = useCallback((id: string, size: string, qty: number, from?: HTMLElement | null) => {
    const p = byId.get(id)
    if (!p) return
    setLines((prev) => {
      const hit = prev.find((l) => l.id === id && l.size === size)
      if (hit) {
        return prev.map((l) => (l === hit ? { ...l, qty: Math.min(p.stock, l.qty + qty) } : l))
      }
      return [...prev, { id, size, qty: Math.min(p.stock, qty) }]
    })
    if (from && !reducedMotion()) flyToCase(from)
  }, [byId])

  const setQty = useCallback((id: string, size: string, qty: number) => {
    const p = byId.get(id)
    if (!p) return
    setLines((prev) =>
      prev
        .map((l) => (l.id === id && l.size === size ? { ...l, qty: Math.max(0, Math.min(p.stock, qty)) } : l))
        .filter((l) => l.qty > 0),
    )
  }, [byId])

  const remove = useCallback((id: string, size: string) => {
    setLines((prev) => prev.filter((l) => !(l.id === id && l.size === size)))
  }, [])

  const toggleSave = useCallback((id: string) => {
    setSaved((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }, [])

  /**
   * PRODUCT TAKEOVER: a caixa clicada SAI do nicho e vira o quick view — não
   * um modal que aparece do nada.
   *
   * ⚠️ O NOME DA TRANSIÇÃO É POSTO NA HORA DO CLIQUE, e só na caixa clicada. O
   * mesmo produto aparece em várias vitrines da home — com
   * `view-transition-name` fixo, dois elementos teriam o mesmo nome e o
   * navegador ABORTA a transição inteira. Sem a API, o QuickView faz o FLIP a
   * partir do retângulo guardado aqui (fallback com GSAP).
   */
  const openQuick = useCallback((slug: string | null, from?: HTMLElement | null) => {
    const next = slug ? bySlug.get(slug) || null : null
    const doc = document as VTDocument
    const media =
      from?.querySelector<HTMLElement>("[data-case]") ||
      from?.querySelector<HTMLElement>("[data-media]") ||
      from ||
      null
    const rect = media ? media.getBoundingClientRect() : null
    if (next && media && doc.startViewTransition && !reducedMotion()) {
      media.style.viewTransitionName = "pk-quick"
      setQuickOrigin({ rect, viaVT: true })
      doc.startViewTransition(() => {
        media.style.viewTransitionName = ""
        flushSync(() => setQuick(next))
      })
      return
    }
    setQuickOrigin({ rect: next ? rect : null, viaVT: false })
    setQuick(next)
  }, [bySlug])

  const clearCart = useCallback(() => setLines([]), [])
  const closeOrder = useCallback(() => setOrder(null), [])

  const value = useMemo<Store>(() => {
    const count = lines.reduce((s, l) => s + l.qty, 0)
    const subtotal = lines.reduce((s, l) => s + l.qty * (byId.get(l.id)?.priceCents || 0), 0)
    return {
      links,
      catalog,
      order,
      closeOrder,
      clearCart,
      lines,
      count,
      subtotal,
      saved,
      cartOpen,
      searchOpen,
      quick,
      quickOrigin,
      add,
      setQty,
      remove,
      toggleSave,
      openCart: setCartOpen,
      openSearch: setSearchOpen,
      openQuick,
    }
  }, [links, catalog, order, closeOrder, clearCart, byId, lines, saved, cartOpen, searchOpen, quick, quickOrigin, add, setQty, remove, toggleSave, openQuick])

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

/** O catálogo da visita (a Loja ao vivo, ou a prévia). */
export function useCatalog(): Catalog {
  return useStore().catalog
}

export function useStore(): Store {
  const s = useContext(Ctx)
  if (!s) throw new Error("useStore fora do StoreProvider do tema pinkoracats")
  return s
}
