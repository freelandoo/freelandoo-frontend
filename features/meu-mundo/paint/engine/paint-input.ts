// features/meu-mundo/paint/engine/paint-input.ts — PAINT (mm3d-35b): os controles.
//
// Pedido do Alex (2026-10-26):
//  - Computador: a MIRA É O CURSOR do mouse (o tiro vai para onde ele aponta);
//    botão esquerdo atira, E troca a cor (1/2/3 também), W/A/S/D anda, Shift
//    corre, Espaço pula, F soco. A câmera gira com o botão direito arrastando
//    e quando o cursor encosta na borda esquerda/direita da tela.
//  - Celular: o joystick anda; arrastar o dedo na tela gira a mira; tocar e
//    SEGURAR sem arrastar atira no ponto tocado (arrastou além de um pouco,
//    vira mira e para de atirar). As cores embaixo, do outro lado, só escolhem.
// Tudo vira um estado que o laço lê a cada quadro.

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
  /** Cursor encostado na borda (−1 esquerda, 1 direita, 0 não): a câmera gira. */
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
  return { keys: new Set(), joyX: 0, joyY: 0, lookDX: 0, lookDY: 0, aimX: null, aimY: null, edge: 0, color: 0, firing: false, tapQueued: false, jumpQueued: false, punchQueued: false, blocked: false }
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
  return ((c + 1) % 3) as PaintColor
}

const KEYS = new Set(["KeyW", "KeyA", "KeyS", "KeyD", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "ShiftLeft", "ShiftRight"])
/** Borda da tela que gira a câmera (fração da largura). */
const EDGE = 0.06
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

/** Liga os ouvintes. `touch` = celular. Devolve o desligar. */
export function attachPaintInput(canvas: HTMLCanvasElement, s: PaintInput, touch: boolean): () => void {
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
      } else if (e.code === "Digit1" || e.code === "Digit2" || e.code === "Digit3") {
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

  if (!touch) {
    let dragging = false
    let lx = 0
    let ly = 0
    canvas.addEventListener(
      "pointermove",
      (e) => {
        const p = local(e)
        s.aimX = p.x
        s.aimY = p.y
        s.edge = dragging ? 0 : p.x < p.w * EDGE ? -1 : p.x > p.w * (1 - EDGE) ? 1 : 0
        if (dragging && !s.blocked) {
          s.lookDX += e.clientX - lx
          s.lookDY += e.clientY - ly
        }
        lx = e.clientX
        ly = e.clientY
      },
      o,
    )
    canvas.addEventListener(
      "pointerdown",
      (e) => {
        if (s.blocked || e.pointerType !== "mouse") return
        const p = local(e)
        s.aimX = p.x
        s.aimY = p.y
        if (e.button === 0) s.firing = true
        else if (e.button === 2) {
          dragging = true
          lx = e.clientX
          ly = e.clientY
          canvas.setPointerCapture(e.pointerId)
        } else if (e.button === 1) s.punchQueued = true
        e.preventDefault()
      },
      o,
    )
    const up = (e: PointerEvent) => {
      if (e.button === 0) s.firing = false
      if (e.button === 2) {
        dragging = false
        if (canvas.hasPointerCapture(e.pointerId)) canvas.releasePointerCapture(e.pointerId)
      }
    }
    window.addEventListener("pointerup", up, o)
    canvas.addEventListener(
      "pointerleave",
      () => {
        s.edge = 0
      },
      o,
    )
    canvas.addEventListener(
      "wheel",
      (e) => {
        e.preventDefault()
        if (s.blocked || !e.deltaY) return
        s.color = (((s.color + (e.deltaY > 0 ? 1 : 2)) % 3) as PaintColor)
      },
      { signal: ac.signal, passive: false },
    )
    canvas.addEventListener("contextmenu", (e) => e.preventDefault(), o)
  } else {
    // Cada dedo no jogo: parado = atira no ponto; arrastou = mira (gira a câmera).
    const fingers = new Map<number, { x: number; y: number; sx: number; sy: number; aiming: boolean }>()
    let shooter: number | null = null
    let hold: ReturnType<typeof setTimeout> | null = null
    const stopHold = () => {
      if (hold) clearTimeout(hold)
      hold = null
    }
    ac.signal.addEventListener("abort", stopHold)
    canvas.addEventListener(
      "pointerdown",
      (e) => {
        if (s.blocked) return
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
    canvas.addEventListener(
      "pointermove",
      (e) => {
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
    const end = (e: PointerEvent) => {
      const f = fingers.get(e.pointerId)
      fingers.delete(e.pointerId)
      if (shooter === e.pointerId) {
        // toque rápido e parado: um tiro
        if (hold && f && !f.aiming && e.type === "pointerup" && !s.blocked) s.tapQueued = true
        stopHold()
        shooter = null
        s.firing = false
      }
      if (canvas.hasPointerCapture(e.pointerId)) canvas.releasePointerCapture(e.pointerId)
    }
    canvas.addEventListener("pointerup", end, o)
    canvas.addEventListener("pointercancel", end, o)
  }

  return () => ac.abort()
}
