"use client"

// O ESTADO DA LOJA: carrinho ("Pinkora Case"), lista salva, quick view e busca.
//
// ⚠️ UM PROVIDER SÓ, montado na porta do tema, porque as quatro coisas se
// cruzam: o quick view adiciona ao carrinho, o carrinho abre depois de
// adicionar, a busca fecha o quick view. Em quatro contextos soltos a ordem
// de montagem decidiria quem enxerga quem.
//
// ⚠️ O CARRINHO MORA NO `localStorage` DESTA ORIGEM, e só é preferência de
// quem visita — nunca é pedido. O pedido de verdade acontece na Loja (ou
// chega por e-mail enquanto o catálogo for prévia). Toda leitura e escrita vai
// em try/catch: janela anônima e armazenamento bloqueado devolvem exceção, e
// o site tem que continuar vendendo sem ele.

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react"
import { flushSync } from "react-dom"

import { PRODUCT_BY_ID, PRODUCT_BY_SLUG, type Product } from "./content/products.mock"
import type { TemplateLinks } from "./lib"

export type CartLine = { id: string; size: string; qty: number }

type Store = {
  links: TemplateLinks
  lines: CartLine[]
  count: number
  subtotal: number
  saved: string[]
  cartOpen: boolean
  searchOpen: boolean
  quick: Product | null
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
 * A cápsula que voa até o Case.
 *
 * É um elemento `fixed` de 18px criado na hora e removido no fim — nunca
 * cresce além da viewport, então não abre rolagem horizontal. WAAPI em
 * `transform`/`opacity` só: nada que custe layout.
 */
function flyToCase(from: HTMLElement) {
  const target = document.querySelector<HTMLElement>(".tpl-pinkora [data-case-target]")
  if (!target) return
  const a = from.getBoundingClientRect()
  const b = target.getBoundingClientRect()
  const dot = document.createElement("div")
  dot.className = "pk-capsule"
  dot.style.left = `${a.left + a.width / 2 - 9}px`
  dot.style.top = `${a.top + a.height / 2 - 9}px`
  document.querySelector(".tpl-pinkora")?.appendChild(dot)
  const dx = b.left + b.width / 2 - (a.left + a.width / 2)
  const dy = b.top + b.height / 2 - (a.top + a.height / 2)
  const anim = dot.animate(
    [
      { transform: "translate(0,0) scale(1.6)", opacity: 0 },
      { transform: `translate(${dx * 0.35}px, ${dy * 0.35 - 80}px) scale(1.2)`, opacity: 1, offset: 0.35 },
      { transform: `translate(${dx}px, ${dy}px) scale(0.5)`, opacity: 0.2 },
    ],
    { duration: 560, easing: "cubic-bezier(.6,0,.3,1)" },
  )
  anim.onfinish = () => {
    dot.remove()
    target.animate([{ transform: "scale(1)" }, { transform: "scale(1.25)" }, { transform: "scale(1)" }], {
      duration: 280,
    })
  }
}

type VTDocument = Document & { startViewTransition?: (cb: () => void) => unknown }

export function StoreProvider({ links, children }: { links: TemplateLinks; children: React.ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([])
  const [saved, setSaved] = useState<string[]>([])
  const [cartOpen, setCartOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [quick, setQuick] = useState<Product | null>(null)
  const loaded = useRef(false)

  // Lido depois da hidratação: `localStorage` não existe no servidor, e ler no
  // render faria o HTML discordar do cliente.
  useEffect(() => {
    setLines(read<CartLine[]>(CART_KEY, []).filter((l) => PRODUCT_BY_ID.has(l.id)))
    setSaved(read<string[]>(SAVE_KEY, []).filter((id) => PRODUCT_BY_ID.has(id)))
    loaded.current = true
  }, [])

  useEffect(() => {
    if (loaded.current) write(CART_KEY, lines)
  }, [lines])
  useEffect(() => {
    if (loaded.current) write(SAVE_KEY, saved)
  }, [saved])

  const add = useCallback((id: string, size: string, qty: number, from?: HTMLElement | null) => {
    const p = PRODUCT_BY_ID.get(id)
    if (!p) return
    setLines((prev) => {
      const hit = prev.find((l) => l.id === id && l.size === size)
      if (hit) {
        return prev.map((l) => (l === hit ? { ...l, qty: Math.min(p.stock, l.qty + qty) } : l))
      }
      return [...prev, { id, size, qty: Math.min(p.stock, qty) }]
    })
    if (from && !reducedMotion()) flyToCase(from)
  }, [])

  const setQty = useCallback((id: string, size: string, qty: number) => {
    const p = PRODUCT_BY_ID.get(id)
    if (!p) return
    setLines((prev) =>
      prev
        .map((l) => (l.id === id && l.size === size ? { ...l, qty: Math.max(0, Math.min(p.stock, qty)) } : l))
        .filter((l) => l.qty > 0),
    )
  }, [])

  const remove = useCallback((id: string, size: string) => {
    setLines((prev) => prev.filter((l) => !(l.id === id && l.size === size)))
  }, [])

  const toggleSave = useCallback((id: string) => {
    setSaved((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }, [])

  /**
   * O quick view nasce DO CARD, não no lugar dele.
   *
   * ⚠️ O NOME DA TRANSIÇÃO É POSTO NA HORA DO CLIQUE, e só no card clicado. O
   * mesmo produto aparece em várias vitrines da home (órbita, parede, runway)
   * — com `view-transition-name` fixo, dois elementos teriam o mesmo nome e o
   * navegador ABORTA a transição inteira. Sem a API, o modal só entra com o
   * próprio movimento de CSS.
   */
  const openQuick = useCallback((slug: string | null, from?: HTMLElement | null) => {
    const next = slug ? PRODUCT_BY_SLUG.get(slug) || null : null
    const doc = document as VTDocument
    const media = from?.querySelector<HTMLElement>("[data-media]") || from || null
    if (next && media && doc.startViewTransition && !reducedMotion()) {
      media.style.viewTransitionName = "pk-quick"
      doc.startViewTransition(() => {
        media.style.viewTransitionName = ""
        flushSync(() => setQuick(next))
      })
      return
    }
    setQuick(next)
  }, [])

  const value = useMemo<Store>(() => {
    const count = lines.reduce((s, l) => s + l.qty, 0)
    const subtotal = lines.reduce((s, l) => s + l.qty * (PRODUCT_BY_ID.get(l.id)?.priceCents || 0), 0)
    return {
      links,
      lines,
      count,
      subtotal,
      saved,
      cartOpen,
      searchOpen,
      quick,
      add,
      setQty,
      remove,
      toggleSave,
      openCart: setCartOpen,
      openSearch: setSearchOpen,
      openQuick,
    }
  }, [links, lines, saved, cartOpen, searchOpen, quick, add, setQty, remove, toggleSave, openQuick])

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useStore(): Store {
  const s = useContext(Ctx)
  if (!s) throw new Error("useStore fora do StoreProvider do tema pinkoracats")
  return s
}
