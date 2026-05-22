"use client"

import { useEffect } from "react"

/**
 * Reveal de scroll baseado em IntersectionObserver + transição CSS.
 *
 * Por que não GSAP ScrollTrigger: o ScrollTrigger cacheia a posição de cada
 * gatilho no mount. Quando a web font carrega depois e o layout desloca, os
 * gatilhos ficam defasados — o conteúdo trava invisível, e um `refresh()` no
 * meio de uma animação a congela pela metade. O IntersectionObserver não
 * cacheia posição nenhuma e a transição CSS sempre roda até o fim: à prova
 * de trava.
 *
 * Marca cada elemento com `.sr-init` (estado escondido) e `.sr-in` quando
 * entra na viewport. O CSS de `.sr-init`/`.sr-in` vive em globals.css.
 *
 * Cobre automaticamente:
 *  - `[data-reveal]` — revela individual.
 *  - `[data-stagger] > [data-card]` — revela com atraso escalonado por índice.
 *  - `extraSelectors` — outros seletores revelados individualmente.
 */
export function useScrollReveal(extraSelectors: string[] = []) {
  // String estável: evita re-rodar o efeito a cada render por causa de um
  // array literal novo.
  const selectorKey = extraSelectors.join("|")

  useEffect(() => {
    const extras = selectorKey ? selectorKey.split("|") : []
    const targets = new Set<HTMLElement>()

    document
      .querySelectorAll<HTMLElement>("[data-reveal]")
      .forEach((el) => targets.add(el))

    extras.forEach((sel) => {
      document.querySelectorAll<HTMLElement>(sel).forEach((el) => targets.add(el))
    })

    document.querySelectorAll<HTMLElement>("[data-stagger]").forEach((box) => {
      box.querySelectorAll<HTMLElement>("[data-card]").forEach((card, i) => {
        card.style.transitionDelay = `${Math.min(i, 8) * 80}ms`
        targets.add(card)
      })
    })

    const all = [...targets]
    if (all.length === 0) return

    const prefersReduced =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches

    // Sem suporte / movimento reduzido: tudo visível, nada é escondido.
    if (prefersReduced || typeof IntersectionObserver === "undefined") {
      all.forEach((el) => el.classList.add("sr-in"))
      return
    }

    all.forEach((el) => el.classList.add("sr-init"))

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return
          entry.target.classList.add("sr-in")
          observer.unobserve(entry.target)
        })
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.01 },
    )
    all.forEach((el) => observer.observe(el))

    // O que já está na viewport no carregamento revela no próximo frame.
    const raf = requestAnimationFrame(() => {
      const vh = window.innerHeight || 0
      all.forEach((el) => {
        const r = el.getBoundingClientRect()
        if (r.top < vh && r.bottom > 0) {
          el.classList.add("sr-in")
          observer.unobserve(el)
        }
      })
    })

    return () => {
      cancelAnimationFrame(raf)
      observer.disconnect()
    }
  }, [selectorKey])
}
