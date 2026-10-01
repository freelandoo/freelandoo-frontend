"use client"

// 05 GLASS CONVEYOR — a esteira de joalheria.
//
// Um trilho de prata polida; as caixas passam na horizontal e a do centro
// cresce e mostra nome, preço e o convite. Anda por rolagem horizontal
// NATIVA (com snap), arraste do mouse e setas.
//
// ⚠️ NÃO SEQUESTRA A ROLAGEM VERTICAL: a roda do mouse continua descendo a
// página. É o mesmo componente no celular — lá o dedo já arrasta a esteira.
//
// ⚠️ O FOCO DE CADA CAIXA É ESCRITO NO DOM (`--focus`) no quadro da rolagem;
// o estado do React só muda quando a caixa CENTRAL troca (é ela que troca o
// nome e o preço embaixo).

import { useEffect, useRef, useState } from "react"

import AcrylicProductCase from "../case"
import { Price, TakeoverLink } from "../commerce"
import { displayId } from "../content/display"
import type { Product } from "../content/products.mock"
import { pageHref, type TemplateLinks } from "../lib"

export default function GlassConveyor({ links, products }: { links: TemplateLinks; products: Product[] }) {
  const track = useRef<HTMLUListElement>(null)
  const [active, setActive] = useState(0)

  useEffect(() => {
    const el = track.current
    if (!el) return
    const items = Array.from(el.querySelectorAll<HTMLElement>("[data-conv-item]"))
    let raf = 0
    let last = -1
    const measure = () => {
      raf = 0
      const r = el.getBoundingClientRect()
      const mid = r.left + r.width / 2
      let best = 0
      let bestD = Infinity
      items.forEach((it, i) => {
        const b = it.getBoundingClientRect()
        const d = Math.abs(b.left + b.width / 2 - mid)
        const f = Math.max(0, 1 - d / (r.width * 0.55))
        it.style.setProperty("--focus", f.toFixed(3))
        if (d < bestD) {
          bestD = d
          best = i
        }
      })
      if (best !== last) {
        last = best
        setActive(best)
      }
    }
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(measure)
    }
    measure()
    el.addEventListener("scroll", onScroll, { passive: true })
    window.addEventListener("resize", onScroll)

    // arraste com o mouse (o dedo já rola nativamente)
    let down = false
    let moved = false
    let sx = 0
    let sl = 0
    const pd = (e: PointerEvent) => {
      if (e.pointerType !== "mouse" || e.button !== 0) return
      down = true
      moved = false
      sx = e.clientX
      sl = el.scrollLeft
      el.classList.add("is-dragging")
    }
    const pm = (e: PointerEvent) => {
      if (!down) return
      const dx = e.clientX - sx
      if (Math.abs(dx) > 5) moved = true
      el.scrollLeft = sl - dx
    }
    const pu = () => {
      if (!down) return
      down = false
      el.classList.remove("is-dragging")
    }
    // arrastou de verdade? o clique que fecha o gesto não abre a caixa
    const click = (e: MouseEvent) => {
      if (moved) {
        e.preventDefault()
        e.stopPropagation()
        moved = false
      }
    }
    el.addEventListener("pointerdown", pd)
    window.addEventListener("pointermove", pm, { passive: true })
    window.addEventListener("pointerup", pu)
    el.addEventListener("click", click, true)
    return () => {
      cancelAnimationFrame(raf)
      el.removeEventListener("scroll", onScroll)
      window.removeEventListener("resize", onScroll)
      el.removeEventListener("pointerdown", pd)
      window.removeEventListener("pointermove", pm)
      window.removeEventListener("pointerup", pu)
      el.removeEventListener("click", click, true)
    }
  }, [products.length])

  const go = (dir: number) => {
    const el = track.current
    const it = el?.querySelector<HTMLElement>("[data-conv-item]")
    if (!el || !it) return
    el.scrollBy({ left: dir * (it.offsetWidth + 24), behavior: "smooth" })
  }

  const p = products[active]
  if (!products.length) return null

  return (
    <section className="pk-conveyor" aria-labelledby="pk-conv-title">
      <div className="pk-section-head pk-section-head--row">
        <div>
          <p className="pk-eyebrow pk-mono">05 — Display line</p>
          <h2 id="pk-conv-title" className="pk-display pk-display--md">
            The conveyor
          </h2>
        </div>
        <div className="pk-conveyor__arrows">
          <button type="button" className="pk-chip" onClick={() => go(-1)} aria-label="Caixa anterior">
            ←
          </button>
          <button type="button" className="pk-chip" onClick={() => go(1)} aria-label="Próxima caixa">
            →
          </button>
        </div>
      </div>
      <ul ref={track} className="pk-conveyor__track" data-cursor="DRAG" aria-label="Sets na esteira">
        {products.map((prod) => (
          <li key={prod.id} className="pk-conveyor__item" data-conv-item>
            <TakeoverLink product={prod} className="pk-conveyor__link">
              <AcrylicProductCase product={prod} size="md" />
            </TakeoverLink>
          </li>
        ))}
      </ul>
      <div className="pk-conveyor__rail" aria-hidden="true" />
      {p ? (
        <div className="pk-conveyor__info" aria-live="polite">
          <span className="pk-mono">{displayId(p.number)}</span>
          <a className="pk-conveyor__name" href={pageHref(links, p.slug)}>
            {p.name}
          </a>
          <Price product={p} className="pk-conveyor__price" />
          <a className="pk-btn pk-btn--ink" href={pageHref(links, p.slug)}>
            Ver o set
          </a>
        </div>
      ) : null}
    </section>
  )
}
