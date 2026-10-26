// features/meu-mundo/paint/engine/paint-input.ts — PAINT (mm3d-35): os controles.
//
// Computador: clique no jogo prende o mouse (mira livre); W/A/S/D anda, Shift
// corre, Espaço pula, botão esquerdo atira a cor escolhida, 1/2/3 (ou a
// rodinha) trocam a cor, F (ou o botão do meio/direito) dá soco, Esc solta.
// Celular: o joystick (componente React) anda; arrastar o dedo no resto da
// tela mira; os botões de cor ATIRAM enquanto estão apertados (e escolhem a
// cor), mais Pular e Soco. Tudo vira um estado que o laço lê a cada quadro.

import type { PaintColor } from "../sim/tuning"

export interface PaintInput {
  keys: Set<string>
  joyX: number
  joyY: number
  /** Mira acumulada desde o último quadro (px). */
  lookDX: number
  lookDY: number
  /** Cor escolhida (computador) e cor sendo atirada agora (null = nenhuma). */
  color: PaintColor
  firing: PaintColor | null
  jumpQueued: boolean
  punchQueued: boolean
  /** Mouse preso no jogo (computador). */
  locked: boolean
  blocked: boolean
}

export function createPaintInput(): PaintInput {
  return { keys: new Set(), joyX: 0, joyY: 0, lookDX: 0, lookDY: 0, color: 0, firing: null, jumpQueued: false, punchQueued: false, locked: false, blocked: false }
}

export function clearPaintInput(s: PaintInput) {
  s.keys.clear()
  s.joyX = 0
  s.joyY = 0
  s.lookDX = 0
  s.lookDY = 0
  s.firing = null
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

const KEYS = new Set(["KeyW", "KeyA", "KeyS", "KeyD", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "ShiftLeft", "ShiftRight"])

function isEditable(t: EventTarget | null) {
  const el = t as HTMLElement | null
  if (!el) return false
  const tag = el.tagName
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || el.isContentEditable || !!el.closest?.("[data-mm-panel]")
}

/** Liga os ouvintes. `touch` = celular (sem trava de mouse). Devolve o desligar. */
export function attachPaintInput(canvas: HTMLCanvasElement, s: PaintInput, touch: boolean): () => void {
  const ac = new AbortController()
  const o = { signal: ac.signal }

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
      } else if (e.code === "Digit1" || e.code === "Digit2" || e.code === "Digit3") {
        s.color = (Number(e.code.slice(5)) - 1) as PaintColor
        if (s.firing !== null) s.firing = s.color
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
    document.addEventListener(
      "pointerlockchange",
      () => {
        s.locked = document.pointerLockElement === canvas
        if (!s.locked) s.firing = null
      },
      o,
    )
    canvas.addEventListener(
      "mousedown",
      (e) => {
        if (s.blocked) return
        if (!s.locked) {
          void (canvas.requestPointerLock?.() as Promise<void> | undefined)?.catch?.(() => {})
          return
        }
        if (e.button === 0) s.firing = s.color
        else s.punchQueued = true
        e.preventDefault()
      },
      o,
    )
    window.addEventListener(
      "mouseup",
      (e) => {
        if (e.button === 0) s.firing = null
      },
      o,
    )
    document.addEventListener(
      "mousemove",
      (e) => {
        if (!s.locked || s.blocked) return
        s.lookDX += e.movementX
        s.lookDY += e.movementY
      },
      o,
    )
    canvas.addEventListener(
      "wheel",
      (e) => {
        e.preventDefault()
        if (s.blocked || !e.deltaY) return
        s.color = (((s.color + (e.deltaY > 0 ? 1 : 2)) % 3) as PaintColor)
        if (s.firing !== null) s.firing = s.color
      },
      { signal: ac.signal, passive: false },
    )
    canvas.addEventListener("contextmenu", (e) => e.preventDefault(), o)
  } else {
    // Arrastar no jogo = mirar (cada dedo é dele; joystick e botões são outros elementos).
    const last = new Map<number, { x: number; y: number }>()
    canvas.addEventListener(
      "pointerdown",
      (e) => {
        if (s.blocked) return
        last.set(e.pointerId, { x: e.clientX, y: e.clientY })
        canvas.setPointerCapture(e.pointerId)
      },
      o,
    )
    canvas.addEventListener(
      "pointermove",
      (e) => {
        const p = last.get(e.pointerId)
        if (!p) return
        s.lookDX += (e.clientX - p.x) * 1.6
        s.lookDY += (e.clientY - p.y) * 1.6
        p.x = e.clientX
        p.y = e.clientY
      },
      o,
    )
    const end = (e: PointerEvent) => {
      last.delete(e.pointerId)
      if (canvas.hasPointerCapture(e.pointerId)) canvas.releasePointerCapture(e.pointerId)
    }
    canvas.addEventListener("pointerup", end, o)
    canvas.addEventListener("pointercancel", end, o)
  }

  return () => {
    ac.abort()
    if (document.pointerLockElement === canvas) document.exitPointerLock?.()
  }
}
