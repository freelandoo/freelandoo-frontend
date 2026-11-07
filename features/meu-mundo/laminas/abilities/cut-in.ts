// features/meu-mundo/laminas/abilities/cut-in.ts — a faixa com os olhos antes do poder (2026-11-07).
//
// Linguagem de anime em DOM, por cima do canvas: nenhuma segunda cena 3D, só transform e
// opacity, e a faixa some sozinha. A arte é o retrato do próprio personagem.

export interface CutIn {
  src: string
  name: string
  color: string
  /** Altura dos olhos no retrato (0–1) e o centro do rosto (0–1). */
  eyes: [number, number]
}

/** Baixa o retrato antes da hora: a faixa dura menos de um segundo. */
export function preloadCutIn(src: string) {
  const img = new Image()
  img.src = src
}

/** Clarão do impacto: a tela inteira acende e desfaz em manchas de cor. Só opacity e transform. */
export function playFlash(layer: HTMLElement, pal: readonly string[]) {
  const el = document.createElement("div")
  const [, mid, hot, edge, top] = pal
  el.style.cssText = `position:absolute;inset:-8%;will-change:transform,opacity;background:radial-gradient(circle at 58% 46%,#fff 0,${top} 16%,transparent 44%),radial-gradient(circle at 26% 28%,${edge}e6,transparent 32%),radial-gradient(circle at 82% 70%,${hot}f2,transparent 38%),radial-gradient(circle at 72% 18%,${hot}cc,transparent 26%),${mid}80`
  layer.appendChild(el)
  const anim = el.animate(
    [
      { transform: "scale(1)", opacity: 1 },
      { transform: "scale(1.06)", opacity: 0.92, offset: 0.2 },
      { transform: "scale(1.24)", opacity: 0 },
    ],
    { duration: 520, easing: "ease-out" },
  )
  anim.onfinish = () => el.remove()
  anim.oncancel = () => el.remove()
}

export function playCutIn(layer: HTMLElement, o: CutIn) {
  const narrow = layer.clientWidth < layer.clientHeight
  const h = Math.round(layer.clientHeight * (narrow ? 0.15 : 0.26))
  const band = document.createElement("div")
  band.style.cssText = `position:absolute;left:-6%;width:112%;top:${narrow ? 16 : 11}%;height:${h}px;overflow:hidden;will-change:transform,opacity;clip-path:polygon(0 12%,100% 0,100% 88%,0 100%);background:linear-gradient(100deg,#0c0208 0%,#1d040e 46%,${o.color} 100%);box-shadow:0 0 0 2px ${o.color}`
  const lines = document.createElement("div")
  lines.style.cssText = "position:absolute;inset:0;opacity:.2;background:repeating-linear-gradient(97deg,transparent 0 22px,#fff 22px 23px,transparent 23px 61px)"
  band.appendChild(lines)
  const img = document.createElement("img")
  // os olhos enchem a faixa: o retrato fica bem maior que ela
  const size = h * (narrow ? 5 : 4.6)
  // quem não tem retrato bravo fica só com a faixa e o nome
  img.onerror = () => img.remove()
  img.src = o.src
  img.alt = ""
  img.draggable = false
  img.style.cssText = `position:absolute;height:${size}px;width:auto;max-width:none;left:${narrow ? 24 : 30}%;top:${h / 2 - size * o.eyes[0]}px;transform:translateX(-${o.eyes[1] * 100}%);filter:contrast(1.1) saturate(1.15)`
  band.appendChild(img)
  const name = document.createElement("span")
  name.textContent = o.name
  name.style.cssText = `position:absolute;right:${narrow ? 7 : 9}%;bottom:12%;font:italic 900 ${Math.round(h * (narrow ? 0.2 : 0.24))}px/1 "Arial Black",system-ui,sans-serif;letter-spacing:.01em;color:#fff;-webkit-text-stroke:3px #16030b;paint-order:stroke fill;text-transform:uppercase;white-space:nowrap`
  band.appendChild(name)
  layer.appendChild(band)
  const anim = band.animate(
    [
      { transform: "translateX(-104%) skewX(-14deg)", opacity: 1 },
      { transform: "translateX(0) skewX(0)", opacity: 1, offset: 0.16 },
      { transform: "translateX(1.6%) skewX(0)", opacity: 1, offset: 0.82 },
      { transform: "translateX(104%) skewX(14deg)", opacity: 0.9 },
    ],
    { duration: 860, easing: "cubic-bezier(.2,.75,.25,1)" },
  )
  anim.onfinish = () => band.remove()
  anim.oncancel = () => band.remove()
}
