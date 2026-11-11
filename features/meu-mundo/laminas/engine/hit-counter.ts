// features/meu-mundo/laminas/engine/hit-counter.ts — o contador da esquerda (apresentação 07, 2026-11-11).
//
// Um número só, à esquerda a 35% da altura, com dois modos (Anexo A §4, item 3):
//  - GOLPES: acertos seguidos de quem joga; aparece a partir do 2º, some 1,6 s
//    depois do último acerto ou na hora em que quem joga leva um golpe;
//  - DANO: durante o Poder Máximo soma o dano de cada acerto do poder, um degrau
//    a cada 0,2 s (vários acertos no mesmo quadro sobem um por um), com o número
//    rolando até o valor novo; fica 1 s depois do último degrau e some.
// Só desenho: o dano e os acertos são os eventos da regra (sim/fight.ts).
// O total do poder fica enquanto o close está no ar e mais 1 s.
// DOM com transform/opacity apenas, na mesma camada dos números de dano.

const STEP = 0.2 // s entre dois degraus do dano do poder
const ROLL = 0.16 // s do número rolando até o degrau novo
const HITS_KEEP = 1.6 // s sem acertar até o contador de golpes sumir
const POWER_KEEP = 1.0 // s parado no total do poder antes de sumir

export interface HitCounter {
  /** Acerto de quem joga num inimigo (`ult` = acerto do Poder Máximo). */
  hit(dmg: number, ult: boolean): void
  /** Quem joga levou um golpe: a sequência acaba. */
  hurt(): void
  /** O Poder Máximo começou: o contador passa a somar o dano. */
  power(): void
  /** `hold` = o close do poder ainda está no ar: o total fica na tela até ele acabar (+1 s). */
  tick(dt: number, hold?: boolean): void
  dispose(): void
}

export function createHitCounter(layer: HTMLElement, opts: { font: string; hitsLabel: string; damageLabel: string }): HitCounter {
  const box = document.createElement("div")
  box.setAttribute("data-counter", "")
  // 35% da altura, colado à margem; inclinado como os letreiros da placa
  box.style.cssText =
    "position:absolute;left:max(16px,env(safe-area-inset-left));top:35%;display:flex;flex-direction:column;align-items:flex-start;opacity:0;transform:translate3d(-24px,-50%,0) skewX(-9deg);transition:opacity 180ms ease-out,transform 180ms cubic-bezier(.2,.8,.2,1);will-change:transform,opacity;pointer-events:none"
  const num = document.createElement("span")
  num.style.cssText = `font:400 40px/1 ${opts.font};color:#f5f1ed;-webkit-text-stroke:4px rgba(0,0,0,.92);paint-order:stroke fill;text-shadow:0 3px 0 rgba(0,0,0,.45);font-variant-numeric:tabular-nums;transform-origin:0 100%;display:block`
  const tag = document.createElement("span")
  tag.style.cssText = `font:400 11px/1 ${opts.font};letter-spacing:.14em;color:#f2d39a;-webkit-text-stroke:3px rgba(0,0,0,.9);paint-order:stroke fill;margin-top:2px;display:block`
  box.append(num, tag)
  layer.appendChild(box)

  let mode: "hits" | "power" = "hits"
  let hits = 0
  let idle = 0 // s desde o último acerto/degrau
  let shown = false
  // dano do poder
  let total = 0
  let from = 0
  let to = 0
  let roll = 1
  let wait = 0
  let any = false // o poder já deu algum degrau
  const queue: number[] = []

  const show = (on: boolean) => {
    if (on === shown) return
    shown = on
    box.style.opacity = on ? "1" : "0"
    box.style.transform = on ? "translate3d(0,-50%,0) skewX(-9deg)" : "translate3d(-24px,-50%,0) skewX(-9deg)"
  }
  const punch = (k: number) => {
    num.animate([{ transform: `scale(${k})` }, { transform: "scale(1)" }], { duration: 140, easing: "cubic-bezier(.2,.8,.2,1)" })
  }
  const setMode = (m: "hits" | "power") => {
    mode = m
    num.style.color = m === "power" ? "#ffcf5a" : "#f5f1ed"
    tag.textContent = m === "power" ? opts.damageLabel : opts.hitsLabel
  }
  setMode("hits")

  return {
    hit(dmg, ult) {
      if (ult && mode === "power") {
        queue.push(Math.max(0, Math.round(dmg)))
        return
      }
      if (mode === "power") return // golpe comum no meio do poder não conta
      hits++
      idle = 0
      if (hits >= 2) {
        num.textContent = String(hits)
        show(true)
        punch(1.3)
      }
    },
    hurt() {
      if (mode !== "hits") return
      hits = 0
      show(false)
    },
    power() {
      setMode("power")
      hits = 0
      total = from = to = 0
      roll = 1
      wait = 0
      idle = 0
      any = false
      queue.length = 0
      num.textContent = "0"
      show(false)
    },
    tick(dt, hold = false) {
      idle += dt
      if (mode === "hits") {
        if (shown && idle > HITS_KEEP) {
          hits = 0
          show(false)
        }
        return
      }
      // poder: um degrau a cada STEP, o número rolando até ele; parado enquanto o close dura
      if (hold) idle = 0
      wait -= dt
      if (queue.length && wait <= 0) {
        from = total
        total += queue.shift()!
        to = total
        roll = 0
        wait = STEP
        idle = 0
        any = true
        show(true)
        punch(1.18)
      }
      if (roll < 1) {
        roll = Math.min(1, roll + dt / ROLL)
        num.textContent = String(Math.round(from + (to - from) * (1 - (1 - roll) * (1 - roll))))
      }
      if (!queue.length && roll >= 1 && idle > POWER_KEEP + (any ? 0 : 3)) {
        // terminou (ou o poder não acertou ninguém em 4 s): some e, depois do sumiço, volta a contar golpes
        show(false)
        if (idle > POWER_KEEP + (any ? 0 : 3) + 0.2) {
          setMode("hits")
          hits = 0
        }
      }
    },
    dispose() {
      box.remove()
    },
  }
}
