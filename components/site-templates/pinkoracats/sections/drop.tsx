"use client"

// 03 NEW DROP — a experiência de assinatura.
//
// DROP 001: uma caixa entra, para no centro, abre; aparecem nome, preço e o
// convite. Rolando: ela fecha e sai, e o DROP 002 entra. No máximo TRÊS —
// sequência longa vira obstáculo entre a pessoa e a loja.
//
// ⚠️ SEM SEQUESTRO DE ROLAGEM: no computador a seção é alta e o palco é
// `sticky`; o GSAP só lê o progresso. No celular, no toque e com movimento
// reduzido é uma lista vertical — cada caixa abre ao passar (`data-lid-scrub`),
// sem prender nada. O HTML do servidor É essa lista: é o que o robô lê.

import { useEffect, useRef } from "react"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"

import AcrylicProductCase from "../case"
import { Price, TakeoverLink } from "../commerce"
import { displayId } from "../content/display"
import type { Product } from "../content/products.mock"
import { pageHref, type TemplateLinks } from "../lib"
import { currentTier, reducedMotion, registerEase } from "../tokens"

export default function NewDrop({
  links,
  products,
  title,
}: {
  links: TemplateLinks
  products: Product[]
  title: string
}) {
  const section = useRef<HTMLElement>(null)
  const items = products.slice(0, 3)

  useEffect(() => {
    const sec = section.current
    if (!sec || items.length < 2) return
    if (reducedMotion() || currentTier() === "low") return
    if (!window.matchMedia("(min-width: 1024px)").matches) return
    gsap.registerPlugin(ScrollTrigger)
    const ease = registerEase()
    sec.classList.add("is-scrolly")

    const ctx = gsap.context(() => {
      const cases = gsap.utils.toArray<HTMLElement>("[data-drop-case]")
      const infos = gsap.utils.toArray<HTMLElement>("[data-drop-info]")
      gsap.set(cases, { xPercent: 130, rotateY: -16, opacity: 0, "--pk-lid": 0 })
      gsap.set(infos, { opacity: 0, y: 24 })
      const tl = gsap.timeline({
        defaults: { ease },
        scrollTrigger: { trigger: sec, start: "top top", end: "bottom bottom", scrub: 0.7 },
      })
      cases.forEach((c, i) => {
        const info = infos[i]
        const last = i === cases.length - 1
        tl.to(c, { xPercent: 0, rotateY: 0, opacity: 1, duration: 1 })
          .to(c, { "--pk-lid": 1, duration: 0.8, ease: "none" })
          .to(info, { opacity: 1, y: 0, duration: 0.5 }, "<0.3")
          .to({}, { duration: 0.7 })
        if (!last) {
          tl.to(info, { opacity: 0, y: -16, duration: 0.4 })
            .to(c, { "--pk-lid": 0, duration: 0.6, ease: "none" }, "<")
            .to(c, { xPercent: -130, rotateY: 16, opacity: 0, duration: 1 })
        }
      })
    }, sec)
    ScrollTrigger.refresh()
    return () => {
      ctx.revert()
      sec.classList.remove("is-scrolly")
    }
  }, [items.length])

  if (!items.length) return null

  return (
    <section
      ref={section}
      className="pk-dropx"
      style={{ "--n": items.length } as React.CSSProperties}
      aria-labelledby="pk-dropx-title"
    >
      <div className="pk-dropx__sticky">
        <div className="pk-dropx__head">
          <p className="pk-eyebrow pk-mono">03 — New drop</p>
          <h2 id="pk-dropx-title" className="pk-display pk-display--lg">
            {title}
          </h2>
        </div>
        <ol className="pk-dropx__list">
          {items.map((p, i) => (
            <li key={p.id} className="pk-dropx__item" data-drop-item>
              <div className="pk-dropx__case" data-drop-case data-lid-scrub>
                <AcrylicProductCase product={p} size="lg" lid="live" plate />
              </div>
              <div className="pk-dropx__info" data-drop-info>
                <p className="pk-mono pk-dropx__num">DROP / {String(i + 1).padStart(3, "0")}</p>
                <h3 className="pk-dropx__name">{p.name}</h3>
                {p.tagline ? <p className="pk-dropx__tag">{p.tagline}</p> : null}
                <Price product={p} className="pk-dropx__price" />
                <div className="pk-hero__cta">
                  <TakeoverLink product={p} className="pk-btn pk-btn--ink" originClosest="[data-drop-item]">
                    Abrir o set
                  </TakeoverLink>
                  <a className="pk-link" href={pageHref(links, p.slug)}>
                    {displayId(p.number)} — detalhes →
                  </a>
                </div>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}
