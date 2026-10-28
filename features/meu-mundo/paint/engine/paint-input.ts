// features/meu-mundo/paint/engine/paint-input.ts — PAINT (mm3d-35d): os controles.
//
// Pedido do Alex (2026-10-26): ao entrar no jogo o CURSOR VIRA A MIRA — a
// setinha some e a mira do jogo anda com o mouse; mexeu o mouse, a mira mexe
// (e o personagem vira para ela), mesmo sem atirar. Botão esquerdo atira, E
// troca a cor (1/2/3/4 e rodinha também; 4 = muro, mm3d-46), W/A/S/D anda, Shift corre, Espaço pula
// (dois pulos), F soco. Botão direito arrastando, ou a mira perto da borda,
// gira a câmera.
// Celular: o joystick anda; arrastar o dedo gira a mira; tocar e segurar sem
// arrastar atira no ponto tocado (toque rápido = um tiro).
//
// Cada evento é tratado pelo QUE ELE É (pointerType), não pelo aparelho:
// notebook com tela de toque se diz "toque" ao navegador, e o mouse dele
// ficava se comportando como dedo (mm3d-35c, "mexo o mouse e não faz nada").

import type { PaintColor } from "../sim/tuning"

export interface PaintInput {
  keys: Set<string>
  joyX: number
  joyY: number
  /** Giro de câmera acumulado desde o último quadro (px). */
  lookDX: number
  lookDY: number
  /** Ponto da mira na tela (px do canvas); null = o meio da tela. */
  aimX: number | null
  aimY: number | null
  /** A mira está com o mouse (PC): o corpo segue a mira o tempo todo. */
  mouseAim: boolean
  /** Mira encostada na borda (−1..1, mais perto da borda = mais rápido): a câmera gira. */
  edge: number
  /** Cor escolhida e se está atirando agora. */
  color: PaintColor
  firing: boolean
  /** Toque rápido (celular): um tiro no ponto da mira. */
  tapQueued: boolean
  jumpQueued: boolean
  punchQueued: boolean
  blocked: boolean
}

export function createPaintInput(): PaintInput {
  return {
    keys: new Set(),
    joyX: 0,
    joyY: 0,
    lookDX: 0,
    lookDY: 0,
    aimX: null,
    aimY: null,
    mouseAim: false,
    edge: 0,
    color: 0,
    firing: false,
    tapQueued: false,
    jumpQueued: false,
    punchQueued: false,
    blocked: false,
  }
}

export function clearPaintInput(s: PaintInput) {
  s.keys.clear()
  s.joyX = 0
  s.joyY = 0
  s.lookDX = 0
  s.lookDY = 0
  s.edge = 0
  s.firing = false
  s.tapQueued = false
  s.jumpQueued = false
  s.punchQueued = false
}

/** Eixo de andar: x = direita, y = frente (teclado + joystick). */
export function paintMoveAxis(s: PaintInput) {
  const k = s.keys
  let x = (k.has("KeyD") || k.has("ArrowRight") ? 1 : 0) - (k.has("KeyA") || k.has("ArrowLeft") ? 1 : 0)
  let y = (k.has("KeyW") || k.has("ArrowUp") ? 1 : 0) - (k.has("KeyS") || k.has("ArrowDown") ? 1 : 0)
  const jm = Math.hypot(s.joyX, s.joyY)
  if (jm > 0.12) {
    const g = Math.min(1, jm / 0.5) / jm
    x += s.joyX * g
    y += s.joyY * g
  }
  const m = Math.hypot(x, y)
  if (m > 1) {
    x /= m
    y /= m
  }
  return { x, y }
}

export function paintWantsRun(s: PaintInput) {
  return s.keys.has("ShiftLeft") || s.keys.has("ShiftRight") || Math.hypot(s.joyX, s.joyY) >= 0.85
}

export function nextColor(c: PaintColor): PaintColor {
  return ((c + 1) % 4) as PaintColor
}

const KEYS = new Set(["KeyW", "KeyA", "KeyS", "KeyD", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "ShiftLeft", "ShiftRight"])
/** Faixa das bordas em que a mira gira a câmera (fração da largura). */
const EDGE = 0.14
/** Toque que andou mais que isto (px) vira mira e para de atirar. */
const TAP_SLOP = 12
/** Dedo parado por isto (ms) começa a atirar; antes disso pode virar mira. */
const HOLD_MS = 120

function isEditable(t: EventTarget | null) {
  const el = t as HTMLElement | null
  if (!el) return false
  const tag = el.tagName
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || el.isContentEditable || !!el.closest?.("[data-mm-panel]")
}

/**
 * A mira do PC: um anel com ponto, desenhado por cima do jogo e colado no
 * mouse (a setinha some sobre o canvas). `setColor` pinta na cor da tinta.
 */
export function createReticle(host: HTMLElement) {
  const el = document.createElement("div")
  el.setAttribute("aria-hidden", "true")
  el.dataset.paintReticle = ""
  el.style.cssText = "position:absolute;left:0;top:0;width:40px;height:40px;margin:-20px 0 0 -20px;pointer-events:none;z-index:5;display:none;will-change:transform"
  el.innerHTML =
    '<svg width="40" height="40" viewBox="0 0 40 40"><circle cx="20" cy="20" r="12" fill="none" stroke="rgba(0,0,0,0.5)" stroke-width="5"/><circle data-ring cx="20" cy="20" r="12" fill="none" stroke="#fff" stroke-width="2.6"/><path d="M20 2v9M20 29v9M2 20h9M29 20h9" stroke="rgba(0,0,0,0.5)" stroke-width="4"/><path d="M20 3v8M20 29v8M3 20h8M29 20h8" stroke="#fff" stroke-width="2"/><circle data-dot cx="20" cy="20" r="2.6" fill="#fff" stroke="rgba(0,0,0,0.55)" stroke-width="1"/></svg>'
  host.appendChild(el)
  const ring = el.querySelector("[data-ring]") as SVGCircleElement
  const dot = el.querySelector("[data-dot]") as SVGCircleElement
  return {
    move(x: number, y: number) {
      el.style.display = "block"
      el.style.transform = `translate(${x}px, ${y}px)`
    },
    hide() {
      el.style.display = "none"
    },
    setColor(hex: string) {
      ring.setAttribute("stroke", hex)
      dot.setAttribute("fill", hex)
    },
    dispose() {
      el.remove()
    },
  }
}
export type Reticle = ReturnType<typeof createReticle>

/** Liga os ouvintes (mouse e toque juntos). Devolve o desligar. */
export function attachPaintInput(canvas: HTMLCanvasElement, s: PaintInput, reticle: Reticle | null): () => void {
  const ac = new AbortController()
  const o = { signal: ac.signal }
  const local = (e: { clientX: number; clientY: number }) => {
    const r = canvas.getBoundingClientRect()
    return { x: e.clientX - r.left, y: e.clientY - r.top, w: r.width }
  }

  window.addEventListener(
    "keydown",
    (e) => {
      if (s.blocked || isEditable(e.target) || e.ctrlKey || e.metaKey || e.altKey) return
      if (KEYS.has(e.code)) {
        s.keys.add(e.code)
        e.preventDefault()
      } else if (e.code === "Space") {
        if (!e.repeat) s.jumpQueued = true
        e.preventDefault()
      } else if (e.code === "KeyE" && !e.repeat) {
        s.color = nextColor(s.color)
      } else if (e.code === "Digit1" || e.code === "Digit2" || e.code === "Digit3" || e.code === "Digit4") {
        s.color = (Number(e.code.slice(5)) - 1) as PaintColor
      } else if ((e.code === "KeyF" || e.code === "KeyQ") && !e.repeat) {
        s.punchQueued = true
      }
    },
    o,
  )
  window.addEventListener("keyup", (e) => s.keys.delete(e.code), o)
  window.addEventListener("blur", () => clearPaintInput(s), o)
  document.addEventListener(
    "visibilitychange",
    () => {
      if (document.hidden) clearPaintInput(s)
    },
    o,
  )

  // ── mouse ──
  let dragging = false
  let lx = 0
  let ly = 0
  const mouseAt = (e: PointerEvent) => {
    const p = local(e)
    s.aimX = p.x
    s.aimY = p.y
    s.mouseAim = true
    const fx = p.x / Math.max(1, p.w)
    s.edge = dragging ? 0 : fx < EDGE ? -(EDGE - fx) / EDGE : fx > 1 - EDGE ? (fx - (1 - EDGE)) / EDGE : 0
    reticle?.move(p.x, p.y)
    canvas.style.cursor = "none"
  }
  const mouseOut = () => {
    s.edge = 0
    s.aimX = null
    s.aimY = null
    s.mouseAim = false
    reticle?.hide()
  }

  // ── toque ──
  const fingers = new Map<number, { x: number; y: number; sx: number; sy: number; aiming: boolean }>()
  let shooter: number | null = null
  let hold: ReturnType<typeof setTimeout> | null = null
  const stopHold = () => {
    if (hold) clearTimeout(hold)
    hold = null
  }
  ac.signal.addEventListener("abort", stopHold)

  canvas.addEventListener(
    "pointermove",
    (e) => {
      if (e.pointerType === "mouse") {
        mouseAt(e)
        if (dragging && !s.blocked) {
          s.lookDX += e.clientX - lx
          s.lookDY += e.clientY - ly
        }
        lx = e.clientX
        ly = e.clientY
        return
      }
      const f = fingers.get(e.pointerId)
      if (!f) return
      if (!f.aiming && Math.hypot(e.clientX - f.sx, e.clientY - f.sy) > TAP_SLOP) {
        f.aiming = true
        if (shooter === e.pointerId) {
          stopHold()
          s.firing = false
          s.aimX = null
          s.aimY = null
        }
      }
      if (f.aiming && !s.blocked) {
        s.lookDX += (e.clientX - f.x) * 1.6
        s.lookDY += (e.clientY - f.y) * 1.6
      }
      f.x = e.clientX
      f.y = e.clientY
    },
    o,
  )
  canvas.addEventListener(
    "pointerdown",
    (e) => {
      if (s.blocked) return
      if (e.pointerType === "mouse") {
        mouseAt(e)
        if (e.button === 0) s.firing = true
        else if (e.button === 2) {
          dragging = true
          lx = e.clientX
          ly = e.clientY
          canvas.setPointerCapture(e.pointerId)
        } else if (e.button === 1) s.punchQueued = true
        e.preventDefault()
        return
      }
      // dedo: parado atira no ponto, arrastou mira
      s.mouseAim = false
      reticle?.hide()
      fingers.set(e.pointerId, { x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY, aiming: false })
      canvas.setPointerCapture(e.pointerId)
      if (shooter === null) {
        shooter = e.pointerId
        const p = local(e)
        s.aimX = p.x
        s.aimY = p.y
        const id = e.pointerId
        stopHold()
        hold = setTimeout(() => {
          hold = null
          const f = fingers.get(id)
          if (shooter === id && f && !f.aiming && !s.blocked) s.firing = true
        }, HOLD_MS)
      }
    },
    o,
  )
  const fingerEnd = (e: PointerEvent) => {
    const f = fingers.get(e.pointerId)
    if (!f) return
    fingers.delete(e.pointerId)
    if (shooter === e.pointerId) {
      if (hold && !f.aiming && e.type === "pointerup" && !s.blocked) s.tapQueued = true
      stopHold()
      shooter = null
      s.firing = false
    }
    if (canvas.hasPointerCapture(e.pointerId)) canvas.releasePointerCapture(e.pointerId)
  }
  window.addEventListener(
    "pointerup",
    (e) => {
      if (e.pointerType === "mouse") {
        if (e.button === 0) s.firing = false
        if (e.button === 2) {
          dragging = false
          if (canvas.hasPointerCapture(e.pointerId)) canvas.releasePointerCapture(e.pointerId)
        }
        return
      }
      fingerEnd(e)
    },
    o,
  )
  window.addEventListener("pointercancel", (e) => e.pointerType !== "mouse" && fingerEnd(e), o)
  canvas.addEventListener("pointerleave", (e) => e.pointerType === "mouse" && !dragging && mouseOut(), o)
  canvas.addEventListener(
    "wheel",
    (e) => {
      e.preventDefault()
      if (s.blocked || !e.deltaY) return
      s.color = (((s.color + (e.deltaY > 0 ? 1 : 3)) % 4) as PaintColor)
    },
    { signal: ac.signal, passive: false },
  )
  canvas.addEventListener("contextmenu", (e) => e.preventDefault(), o)

  return () => {
    ac.abort()
    canvas.style.cursor = ""
  }
}
