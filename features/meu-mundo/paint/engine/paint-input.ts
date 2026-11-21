// features/meu-mundo/paint/engine/paint-input.ts — PAINT (mm3d-35d): os controles.
//
// PC (Alex, 2026-11-21, vídeo: "a mira vira mas a tela não acompanha"): a MIRA
// FICA FIXA no meio da tela, um pouco acima da arma, e o MOUSE GIRA A CÂMERA —
// como apontar uma arma de verdade. O 1º clique no jogo trava o mouse
// (pointer lock; Esc solta, outro clique trava de novo). Solto, o botão
// direito arrastando ainda gira. Botão esquerdo atira, E
// troca a cor (1/2/3/4 e rodinha também; 4 = muro, mm3d-46), W/A/S/D anda, Shift corre, Espaço pula
// (dois pulos), F soco.
// (Antes, 2026-10-26: o cursor era a mira e a câmera só girava na borda.)
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
  /** Jogando com mouse (PC): a mira é o meio da tela e o corpo segue a câmera o tempo todo. */
  mouseAim: boolean
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
 * A mira do PC: um anel com ponto, desenhado por cima do jogo, FIXO no meio
 * da tela (é para onde a câmera olha). `setColor` pinta na cor da tinta.
 */
export function createReticle(host: HTMLElement) {
  const el = document.createElement("div")
  el.setAttribute("aria-hidden", "true")
  el.dataset.paintReticle = ""
  el.style.cssText = "position:absolute;left:50%;top:50%;width:40px;height:40px;margin:-20px 0 0 -20px;pointer-events:none;z-index:5;display:none"
  el.innerHTML =
    '<svg width="40" height="40" viewBox="0 0 40 40"><circle cx="20" cy="20" r="12" fill="none" stroke="rgba(0,0,0,0.5)" stroke-width="5"/><circle data-ring cx="20" cy="20" r="12" fill="none" stroke="#fff" stroke-width="2.6"/><path d="M20 2v9M20 29v9M2 20h9M29 20h9" stroke="rgba(0,0,0,0.5)" stroke-width="4"/><path d="M20 3v8M20 29v8M3 20h8M29 20h8" stroke="#fff" stroke-width="2"/><circle data-dot cx="20" cy="20" r="2.6" fill="#fff" stroke="rgba(0,0,0,0.55)" stroke-width="1"/></svg>'
  host.appendChild(el)
  const ring = el.querySelector("[data-ring]") as SVGCircleElement
  const dot = el.querySelector("[data-dot]") as SVGCircleElement
  return {
    show() {
      el.style.display = "block"
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
  // Travado (pointer lock): o mouse só gira a câmera; a mira é o meio da tela.
  let dragging = false
  const locked = () => document.pointerLockElement === canvas
  const lock = () => {
    if (locked() || s.blocked) return
    try {
      const r = canvas.requestPointerLock() as unknown as Promise<void> | undefined
      r?.catch?.(() => {})
    } catch {
      /* navegador sem pointer lock: fica o botão direito */
    }
  }
  const mouseOn = () => {
    s.aimX = null
    s.aimY = null
    s.mouseAim = true
    reticle?.show()
    canvas.style.cursor = locked() ? "none" : ""
  }
  document.addEventListener(
    "pointerlockchange",
    () => {
      canvas.style.cursor = locked() ? "none" : ""
      if (!locked()) {
        dragging = false
        s.firing = false
      }
    },
    o,
  )
  ac.signal.addEventListener("abort", () => {
    if (locked()) document.exitPointerLock()
  })

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
        mouseOn()
        if ((locked() || dragging) && !s.blocked) {
          s.lookDX += e.movementX
          s.lookDY += e.movementY
        }
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
        mouseOn()
        if (!locked()) lock()
        if (e.button === 0) s.firing = true
        else if (e.button === 2) {
          dragging = true
          if (!locked()) canvas.setPointerCapture(e.pointerId)
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
