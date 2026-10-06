"use client"

import { useLayoutEffect, useRef } from "react"

/**
 * Portão do movimento. Script inline que roda durante o PARSE — antes da
 * primeira pintura — e escreve `data-rv-motion="on"` no invólucro da página.
 * É esse atributo que habilita o estado escondido dos `[data-rv]` no CSS.
 * Num useEffect chegaria tarde: o conteúdo apareceria, sumiria e voltaria
 * animando. Sem JS (ou com movimento reduzido) o atributo nunca existe e a
 * página aparece inteira — que é o que importa para quem tem JS bloqueado e
 * para o robô.
 */
export function MotionGate() {
  return (
    <script
      // conteúdo estático, sem dado de usuário
      dangerouslySetInnerHTML={{
        __html:
          "(function(s){try{if(!matchMedia('(prefers-reduced-motion: reduce)').matches&&s&&s.parentElement){s.parentElement.setAttribute('data-rv-motion','on')}}catch(e){}})(document.currentScript)",
      }}
    />
  )
}

/**
 * UM observador para a página inteira (e não um por card). Marca `data-in`
 * quando o elemento entra, e esquece dele — revelar é evento de uma vez.
 *
 * ⚠️ As páginas atrás do guard de login (`(protected)`) NÃO saem no HTML do
 * servidor: o guard renderiza "Carregando…" e só monta a página no cliente —
 * e script inserido pelo React não executa. Então aqui, num layout effect
 * (que roda ANTES da pintura daquele commit), o portão é ligado se ainda não
 * estiver. Nas páginas que saem do servidor quem liga é o MotionGate, cedo.
 */
export function RealityMotion() {
  const probe = useRef<HTMLSpanElement>(null)

  useLayoutEffect(() => {
    const root = probe.current?.closest<HTMLElement>(".rv")
    if (!root) return
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    if (reduce) {
      root.removeAttribute("data-rv-motion")
      return
    }
    if (!root.hasAttribute("data-rv-motion")) root.setAttribute("data-rv-motion", "on")
    const els = Array.from(root.querySelectorAll<HTMLElement>("[data-rv]:not([data-in])"))
    if (!("IntersectionObserver" in window)) {
      els.forEach((el) => el.setAttribute("data-in", ""))
      return
    }
    // ⚠️ A máscara nasce recortada a ZERO de área (clip-path), e o observador
    // não acha interseção em área nenhuma: ela nunca seria revelada. Quem é
    // observado no lugar dela é o PAI, que tem a caixa inteira.
    const watch = new Map<Element, HTMLElement[]>()
    for (const el of els) {
      const target = el.dataset.rv === "mask" && el.parentElement ? el.parentElement : el
      watch.set(target, [...(watch.get(target) || []), el])
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue
          watch.get(e.target)?.forEach((el) => el.setAttribute("data-in", ""))
          io.unobserve(e.target)
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.12 },
    )
    watch.forEach((_, target) => io.observe(target))
    return () => io.disconnect()
  }, [])

  return <span ref={probe} hidden />
}
