// features/meu-mundo/laminas/abilities/cinema-fx.ts — o Poder Máximo de cinema (apresentação 09, 2026-11-11).
//
// Peças de tela do poder, todas em DOM por cima do canvas, animando só transform e opacity:
//  - screenArc: o golpe do tamanho da tela, uma meia-lua de canto a canto, cada vez de um lado;
//  - lightCross: a cruz de luz da pausa de aviso ("vem o último");
//  - climaxStreaks: a imitação do clímax no nível `low` (riscos radiais avermelhado e azulado),
//    no lugar do passe de tela inteira de engine/climax-pass.ts.
// Nada aqui muda dano, alcance ou tempo da regra: é só o desenho em cima do `p.t` de sim/fight.ts.

/** Quanto dura cada golpe do tamanho da tela (ms): nasce em 18%, apaga até o fim. */
const ARC_MS = 300
/** Cruz de luz: abre em 90 ms, segura e apaga até 260 ms. */
const CROSS_MS = 260
/** Clímax: janela inteira ≤ 0,4 s (Anexo A §9.5). */
export const CLIMAX_MS = 360

let arcSeq = 0

/**
 * Golpe do tamanho da tela. `i` escolhe o lado: 0 = de baixo-esquerda para cima-direita,
 * 1 = de baixo-direita para cima-esquerda, 2 = por cima. Em pé a meia-lua corre na diagonal
 * (cobre mais área); deitado ela fica mais perto do horizontal.
 */
export function screenArc(layer: HTMLElement, i: number, pal: readonly string[]) {
  const w = layer.clientWidth
  const h = layer.clientHeight
  if (!w || !h) return
  const diag = Math.hypot(w, h)
  const tilt = (Math.atan2(h, w) * 180) / Math.PI
  const side = i % 3
  // ângulo da corda da meia-lua e espelho (a lua sempre "abre" para o centro)
  const rot = side === 2 ? 0 : side === 0 ? -tilt * 0.82 : tilt * 0.82
  const flipY = side === 2 ? 1 : -1
  const lift = side === 2 ? -0.16 * h : 0.04 * h
  const id = `mm-arc-${++arcSeq}`
  const [, body, hot, edge, top] = pal
  const el = document.createElementNS("http://www.w3.org/2000/svg", "svg")
  el.setAttribute("viewBox", "0 0 200 100")
  el.setAttribute("preserveAspectRatio", "none")
  const W = diag * 1.18
  const H = W * 0.32
  el.style.cssText = `position:absolute;left:${w / 2 - W / 2}px;top:${h / 2 - H / 2 + lift}px;width:${W}px;height:${H}px;overflow:visible;pointer-events:none;will-change:transform,opacity;opacity:0`
  // fio quase branco na ponta que corre → cor de quem joga → rabo escuro que some
  const dir = side === 1 ? ["100%", "0%"] : ["0%", "100%"]
  el.innerHTML =
    `<defs><linearGradient id="${id}" x1="${dir[0]}" x2="${dir[1]}" y1="0" y2="0">` +
    `<stop offset="0" stop-color="${body}" stop-opacity="0"/><stop offset=".22" stop-color="${body}" stop-opacity=".9"/>` +
    `<stop offset=".55" stop-color="${hot}"/><stop offset=".85" stop-color="${top}"/><stop offset="1" stop-color="#fff"/></linearGradient></defs>` +
    `<path d="M0,100 Q100,-40 200,100 Q100,30 0,100Z" fill="url(#${id})"/>` +
    `<path d="M16,95 Q100,-26 184,95 Q100,4 16,95Z" fill="#fff" fill-opacity=".85"/>` +
    `<path d="M0,100 Q100,-34 200,100" fill="none" stroke="${edge}" stroke-opacity=".55" stroke-width="1.4"/>`
  layer.appendChild(el)
  const base = `rotate(${rot}deg) scaleY(${flipY})`
  const anim = el.animate(
    [
      { transform: `${base} rotate(-14deg) scale(.9)`, opacity: 0 },
      { transform: `${base} rotate(0deg) scale(1)`, opacity: 1, offset: 0.16 },
      { transform: `${base} rotate(5deg) scale(1.02)`, opacity: 0.9, offset: 0.5 },
      { transform: `${base} rotate(9deg) scale(1.05)`, opacity: 0 },
    ],
    { duration: ARC_MS, easing: "cubic-bezier(.2,.8,.2,1)" },
  )
  anim.onfinish = () => el.remove()
  anim.oncancel = () => el.remove()
}

/** Cruz de luz no ponto (x, y) da tela: o aviso de que o golpe final vem agora. */
export function lightCross(layer: HTMLElement, x: number, y: number, color: string) {
  const w = layer.clientWidth
  const h = layer.clientHeight
  const el = document.createElement("div")
  el.style.cssText = `position:absolute;left:${x}px;top:${y}px;width:0;height:0;pointer-events:none;will-change:transform,opacity`
  const lineH = Math.round(w * 0.9)
  const lineV = Math.round(h * 0.5)
  el.innerHTML =
    `<div style="position:absolute;left:${-lineH / 2}px;top:-2.5px;width:${lineH}px;height:5px;background:linear-gradient(90deg,transparent,${color} 30%,#fff 50%,${color} 70%,transparent)"></div>` +
    `<div style="position:absolute;top:${-lineV / 2}px;left:-2.5px;height:${lineV}px;width:5px;background:linear-gradient(180deg,transparent,${color} 30%,#fff 50%,${color} 70%,transparent)"></div>` +
    `<div style="position:absolute;left:-30px;top:-30px;width:60px;height:60px;border-radius:50%;border:3px solid #fff;box-shadow:0 0 0 3px ${color},0 0 18px 4px ${color}"></div>`
  layer.appendChild(el)
  const anim = el.animate(
    [
      { transform: "scale(.2) rotate(-20deg)", opacity: 0 },
      { transform: "scale(1) rotate(0)", opacity: 1, offset: 0.35 },
      { transform: "scale(1.04) rotate(0)", opacity: 1, offset: 0.7 },
      { transform: "scale(1.12) rotate(0)", opacity: 0 },
    ],
    { duration: CROSS_MS, easing: "cubic-bezier(.2,.8,.2,1)" },
  )
  anim.onfinish = () => el.remove()
  anim.oncancel = () => el.remove()
}

/**
 * Clímax no nível `low`: dois planos de riscos radiais (avermelhado e azulado), um para cada
 * lado, no lugar das cores deslocadas e do borrão de verdade. Centro em (x, y).
 */
export function climaxStreaks(layer: HTMLElement, x: number, y: number) {
  const w = layer.clientWidth
  const h = layer.clientHeight
  const px = Math.round((x / Math.max(1, w)) * 100)
  const py = Math.round((y / Math.max(1, h)) * 100)
  for (const [tint, dx, turn] of [
    ["rgba(255,64,92,.6)", -6, 0],
    ["rgba(72,170,255,.6)", 6, 4.5],
  ] as const) {
    const el = document.createElement("div")
    el.style.cssText = `position:absolute;inset:-12%;pointer-events:none;will-change:transform,opacity;opacity:0;transform-origin:${px}% ${py}%;background:repeating-conic-gradient(from ${turn}deg at ${px}% ${py}%,${tint} 0 1.1deg,transparent 1.1deg 9deg);-webkit-mask:radial-gradient(circle at ${px}% ${py}%,transparent 0 12%,#000 34%);mask:radial-gradient(circle at ${px}% ${py}%,transparent 0 12%,#000 34%)`
    layer.appendChild(el)
    const anim = el.animate(
      [
        { transform: `translateX(0) scale(.86)`, opacity: 0 },
        { transform: `translateX(${dx}px) scale(1)`, opacity: 0.95, offset: 0.16 },
        { transform: `translateX(${dx * 1.6}px) scale(1.22)`, opacity: 0 },
      ],
      { duration: CLIMAX_MS, easing: "cubic-bezier(.2,.8,.2,1)" },
    )
    anim.onfinish = () => el.remove()
    anim.oncancel = () => el.remove()
  }
}
