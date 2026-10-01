"use client"

// NAIL ORBIT — a primeira vitrine. Os produtos percorrem uma elipse; o do
// centro é grande e nítido, os laterais menores e girados, os de trás quase
// apagados.
//
// ⚠️ NASCE ESTÁTICO E VIRA ÓRBITA DEPOIS. O HTML do servidor é uma fileira
// rolável com snap (`is-static`) — é o que o robô lê, o que quem tem JS
// bloqueado usa e o que o movimento reduzido mantém. Só depois da hidratação,
// e só sem movimento reduzido, a classe `is-live` posiciona os cards na
// elipse.
//
// ⚠️ A POSIÇÃO É ESCRITA DIRETO NO DOM a cada quadro, nunca em estado do
// React: sete cards a 60fps por `setState` remontariam a vitrine inteira por
// quadro. O estado só muda quando o produto ATIVO muda (é ele que troca o
// nome e o preço embaixo).
//
// ⚠️ SCROLL SÓ NO COMPUTADOR. No celular a órbita anda por arraste e pelas
// setas — sequestrar a rolagem num aparelho de toque é o que faz a pessoa
// sair do site achando que ele travou.

import { useEffect, useRef, useState } from "react"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"

import type { Product } from "../content/products.mock"
import { brl, pageHref } from "../lib"
import { ProductCard } from "../commerce"
import { useStore } from "../store"

export default function NailOrbit({ products }: { products: Product[] }) {
  const { links } = useStore()
  const section = useRef<HTMLElement>(null)
  const stage = useRef<HTMLDivElement>(null)
  const rot = useRef({ v: 0 })
  const [live, setLive] = useState(false)
  const [active, setActive] = useState(0)
  const n = products.length

  useEffect(() => {
    const st = stage.current
    const sec = section.current
    if (!st || !sec) return
    const r = rot.current
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
    setLive(true)
    const cards = Array.from(st.querySelectorAll<HTMLElement>("[data-orbit-item]"))
    const high = document.querySelector<HTMLElement>(".tpl-pinkora")?.dataset.tier !== "medium"
    let lastActive = -1

    const layout = () => {
      const w = st.clientWidth
      const R = Math.min(w * 0.4, 560)
      const step = (Math.PI * 2) / n
      cards.forEach((el, i) => {
        let d = i - r.v
        d = ((((d + n / 2) % n) + n) % n) - n / 2
        const a = d * step
        const z = Math.cos(a)
        const depth = (z + 1) / 2
        const x = Math.sin(a) * R
        const scale = 0.48 + 0.52 * depth
        el.style.transform = `translate3d(${x.toFixed(1)}px, ${((1 - depth) * -30).toFixed(1)}px, 0) rotateY(${(-a * 38).toFixed(1)}deg) scale(${scale.toFixed(3)})`
        el.style.opacity = (0.18 + 0.82 * depth ** 1.6).toFixed(3)
        el.style.zIndex = String(Math.round(depth * 100))
        el.style.filter = high && depth < 0.6 ? `blur(${((0.6 - depth) * 6).toFixed(1)}px)` : ""
        el.toggleAttribute("inert", depth < 0.9)
      })
      const act = ((Math.round(r.v) % n) + n) % n
      if (act !== lastActive) {
        lastActive = act
        setActive(act)
      }
    }

    layout()
    const onResize = () => layout()
    window.addEventListener("resize", onResize)

    gsap.registerPlugin(ScrollTrigger)
    const desktop = window.matchMedia("(min-width: 1024px)").matches
    let trigger: ScrollTrigger | null = null
    if (desktop) {
      trigger = ScrollTrigger.create({
        trigger: sec,
        start: "top top",
        end: () => `+=${window.innerHeight * 0.45 * (n - 1)}`,
        pin: true,
        scrub: 0.6,
        onUpdate: (self) => {
          r.v = self.progress * (n - 1)
          layout()
        },
      })
    }

    // arraste (toque e mouse): inércia curta, sempre termina num produto
    let startX = 0
    let startRot = 0
    let dragging = false
    const down = (e: PointerEvent) => {
      if (desktop && trigger?.isActive) return
      dragging = true
      startX = e.clientX
      startRot = r.v
      gsap.killTweensOf(r)
    }
    const move = (e: PointerEvent) => {
      if (!dragging) return
      r.v = startRot - (e.clientX - startX) / 220
      layout()
    }
    // Arrastou de verdade? Então o clique que fecha o gesto não navega — senão
    // girar a órbita levaria a pessoa para o produto em que o dedo parou.
    let moved = false
    const click = (e: MouseEvent) => {
      if (moved) {
        e.preventDefault()
        e.stopPropagation()
        moved = false
      }
    }
    st.addEventListener("click", click, true)
    const up = (e: PointerEvent) => {
      if (!dragging) return
      dragging = false
      moved = Math.abs(e.clientX - startX) > 6
      gsap.to(r, { v: Math.round(r.v), duration: 0.6, ease: "expo.out", onUpdate: layout })
    }
    st.addEventListener("pointerdown", down)
    window.addEventListener("pointermove", move, { passive: true })
    window.addEventListener("pointerup", up)

    const goTo = (e: Event) => {
      const dir = (e as CustomEvent<number>).detail
      gsap.to(r, {
        v: Math.round(r.v) + dir,
        duration: 0.7,
        ease: "expo.out",
        onUpdate: layout,
      })
    }
    sec.addEventListener("pk-orbit", goTo)

    return () => {
      window.removeEventListener("resize", onResize)
      st.removeEventListener("pointerdown", down)
      st.removeEventListener("click", click, true)
      window.removeEventListener("pointermove", move)
      window.removeEventListener("pointerup", up)
      sec.removeEventListener("pk-orbit", goTo)
      trigger?.kill()
      gsap.killTweensOf(r)
    }
  }, [n])

  const go = (dir: number) => section.current?.dispatchEvent(new CustomEvent("pk-orbit", { detail: dir }))
  const p = products[active]

  return (
    <section ref={section} className="pk-orbit pk-silver" aria-labelledby="pk-orbit-title">
      <div className="pk-orbit__head">
        <p className="pk-eyebrow">02 — New drop</p>
        <h2 id="pk-orbit-title" className="pk-display pk-display--md">
          Nail
          <br />
          orbit
        </h2>
      </div>
      <div
        ref={stage}
        className={`pk-orbit__stage ${live ? "is-live" : "is-static"}`}
        data-cursor="DRAG"
        onKeyDown={(e) => {
          if (e.key === "ArrowRight") go(1)
          if (e.key === "ArrowLeft") go(-1)
        }}
      >
        {products.map((prod) => (
          <div key={prod.id} className="pk-orbit__item" data-orbit-item>
            <ProductCard product={prod} size="lg" showPrice={false} />
          </div>
        ))}
      </div>
      {live && p ? (
        <div className="pk-orbit__info" aria-live="polite">
          <span className="pk-orbit__num">{p.number}</span>
          <a className="pk-orbit__name" href={pageHref(links, p.slug)}>
            {p.name}
          </a>
          <span className="pk-orbit__price">{brl(p.priceCents)}</span>
          <a className="pk-btn pk-btn--hot" href={pageHref(links, p.slug)}>
            Ver detalhes
          </a>
          <div className="pk-orbit__arrows">
            <button type="button" className="pk-chip" onClick={() => go(-1)} aria-label="Produto anterior">
              ←
            </button>
            <button type="button" className="pk-chip" onClick={() => go(1)} aria-label="Próximo produto">
              →
            </button>
          </div>
        </div>
      ) : null}
    </section>
  )
}
