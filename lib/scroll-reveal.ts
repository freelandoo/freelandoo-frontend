import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"

/**
 * Blinda os reveals de scroll feitos com GSAP ScrollTrigger.
 *
 * Problema que resolve: os gatilhos calculam a posição de cada elemento no
 * mount. Quando a web font do display carrega depois, os títulos trocam de
 * altura, todo o layout desloca e os gatilhos das seções abaixo nunca
 * disparam — o conteúdo fica preso em `opacity:0`.
 *
 * - `ScrollTrigger.refresh()` em rAF, timeout curto e em `document.fonts.ready`
 *   recalcula as posições depois que o layout assenta.
 * - A "varredura de segurança" destrava qualquer elemento que ficou invisível
 *   dentro da viewport — animação nunca esconde conteúdo de vez.
 *
 * `safetySelectors`: seletores dos elementos animados (ex.: "[data-reveal]").
 * Retorna uma função de cleanup para o `useEffect`.
 */
export function armScrollReveal(safetySelectors: string[] = []): () => void {
  const refresh = () => {
    try {
      ScrollTrigger.refresh()
    } catch {
      /* ScrollTrigger pode não estar pronto — ignora */
    }
  }

  const timers: number[] = []
  const raf = requestAnimationFrame(refresh)
  timers.push(window.setTimeout(refresh, 400))

  if (typeof document !== "undefined" && document.fonts?.ready) {
    document.fonts.ready.then(refresh).catch(() => {})
  }

  if (safetySelectors.length > 0) {
    const sweep = () => {
      refresh()
      const vh = window.innerHeight || 0
      document
        .querySelectorAll<HTMLElement>(safetySelectors.join(","))
        .forEach((el) => {
          if (getComputedStyle(el).opacity !== "0") return
          const rect = el.getBoundingClientRect()
          // Só destrava o que já está na viewport — o que está abaixo da
          // dobra continua revelando no scroll normalmente.
          if (rect.top < vh && rect.bottom > 0) {
            gsap.set(el, {
              opacity: 1,
              y: 0,
              x: 0,
              scale: 1,
              clearProps: "opacity,transform",
            })
          }
        })
    }
    timers.push(window.setTimeout(sweep, 1400))
    timers.push(window.setTimeout(sweep, 3000))
  }

  return () => {
    cancelAnimationFrame(raf)
    timers.forEach((t) => window.clearTimeout(t))
  }
}
