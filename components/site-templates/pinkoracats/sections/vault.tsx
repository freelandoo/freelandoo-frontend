"use client"

// 01 THE VAULT → 02 OPEN THE SET — o herói e a primeira transição.
//
// Branco, espaço negativo, PINKORA / CATS monumental em preto e, no centro,
// UMA caixa acrílica flutuando sobre um piso espelhado. Ao rolar, ela se
// aproxima e a tampa abre: 0% fechada · 25% entreaberta · 65% abrindo · 100%
// aberta, com "Open the set" aparecendo no fim.
//
// ⚠️ NÃO É SCROLL-HIJACKING. A seção é alta e o palco é `position: sticky` —
// a rolagem continua nativa; o GSAP só ESCREVE duas variáveis (`--pk-lid` e
// `--approach`) conforme o progresso. Nenhum `pin`, nenhum quadro preso.
//
// TRÊS COMPORTAMENTOS, um conteúdo:
//   computador (≥1024px, sem movimento reduzido)  a cena acompanha a rolagem
//   celular / toque                                a tampa abre sozinha uma
//                                                   vez, logo depois de chegar
//   movimento reduzido / sem JS                    a caixa já está aberta
//
// ⚠️ O MOUSE NÃO ARRASTA A CAIXA: só inclina (±6°/±4°, `data-tilt`) e move a
// luz global. A reação da luz é maior que a da rotação, de propósito.

import { useEffect, useRef } from "react"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"

import AcrylicProductCase from "../case"
import type { Collection } from "../content/collections"
import type { Product } from "../content/products.mock"
import { pageHref, type TemplateLinks } from "../lib"
import { currentTier, reducedMotion } from "../tokens"

export default function Vault({
  links,
  product,
  drop,
}: {
  links: TemplateLinks
  product: Product | null
  drop: Collection | null
}) {
  const section = useRef<HTMLElement>(null)

  useEffect(() => {
    const sec = section.current
    if (!sec) return
    if (reducedMotion() || currentTier() === "low") {
      sec.classList.add("is-static")
      return
    }
    const desktop = window.matchMedia("(min-width: 1024px)").matches
    if (!desktop) {
      // toque: a tampa abre sozinha, uma vez
      const t = window.setTimeout(() => sec.classList.add("is-opened"), 900)
      return () => window.clearTimeout(t)
    }
    gsap.registerPlugin(ScrollTrigger)
    sec.classList.add("is-scrolly")
    const stage = sec.querySelector<HTMLElement>("[data-vault-stage]")
    if (!stage) return
    const ctx = gsap.context(() => {
      gsap.fromTo(
        stage,
        { "--pk-lid": 0, "--approach": 0 },
        {
          "--pk-lid": 1,
          "--approach": 1,
          ease: "none",
          scrollTrigger: { trigger: sec, start: "top top", end: "bottom bottom", scrub: 0.7 },
        },
      )
    }, sec)
    ScrollTrigger.refresh()
    return () => ctx.revert()
  }, [])

  return (
    <section ref={section} className="pk-vault" aria-labelledby="pk-vault-title">
      <div className="pk-vault__sticky" data-vault-stage>
        <div className="pk-vault__type">
          <p className="pk-eyebrow pk-mono" data-reveal="fade">
            Press-on objects · {drop ? drop.kicker : "Drop 001"}
          </p>
          <h1 id="pk-vault-title" className="pk-display pk-display--hero" data-lines>
            <span>
              <span>Pinkora</span>
            </span>
            <span>
              <span>cats</span>
            </span>
          </h1>
        </div>

        {product ? (
          <div className="pk-vault__case" data-tilt>
            <AcrylicProductCase product={product} size="xl" lid="live" reflect plate priority />
          </div>
        ) : null}

        <p className="pk-vault__open" aria-hidden="true">
          Open the set
        </p>

        <div className="pk-vault__copy">
          <p className="pk-vault__lead">
            Press-on nails artesanais, expostas como joia: cada set mora numa caixa acrílica e sai da bancada em
            tiragem curta.
          </p>
          <div className="pk-hero__cta">
            <a className="pk-btn pk-btn--ink" href={pageHref(links, drop ? drop.slug : "loja")} data-cursor="VIEW">
              {drop ? `Ver ${drop.name}` : "Ver o drop"}
            </a>
            <a className="pk-btn pk-btn--line" href={pageHref(links, "loja")}>
              Todo o catálogo
            </a>
          </div>
        </div>

        <p className="pk-vault__hint pk-mono" aria-hidden="true">
          Scroll — open the case
        </p>
      </div>
    </section>
  )
}
