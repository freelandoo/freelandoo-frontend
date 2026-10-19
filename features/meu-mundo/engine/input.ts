// features/meu-mundo/engine/input.ts
//
// Entrada de teclado, mouse e toque, reduzida a um estado simples que o laço
// do jogo lê a cada quadro. O joystick e o botão de interagir do celular são
// componentes React: eles escrevem direto aqui (joyX/joyY, interactQueued).
//
// Enquanto um painel está aberto (`blocked`), a entrada é ignorada — é isso
// que impede o jogo de capturar teclas de um menu — e ao fechar ela recomeça
// do zero, sem tecla "presa" de antes.

export interface InputState {
  keys: Set<string>
  joyX: number
  joyY: number
  camDX: number
  camDY: number
  zoom: number
  interactQueued: boolean
  blocked: boolean
  /** Botão de corrida lenta do celular (alterna). Shift faz o mesmo no teclado. */
  runToggle: boolean
}

export function createInputState(): InputState {
  return { keys: new Set(), joyX: 0, joyY: 0, camDX: 0, camDY: 0, zoom: 0, interactQueued: false, blocked: false, runToggle: false }
}

export function clearInput(s: InputState) {
  s.keys.clear()
  s.joyX = 0
  s.joyY = 0
  s.camDX = 0
  s.camDY = 0
  s.zoom = 0
  s.interactQueued = false
}

const MOVE_KEYS = new Set([
  "KeyW", "KeyA", "KeyS", "KeyD", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight",
])

function isEditable(t: EventTarget | null) {
  const el = t as HTMLElement | null
  if (!el) return false
  const tag = el.tagName
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || el.isContentEditable
}

/** Corrida lenta: Shift segurado no teclado ou o botão do celular ligado. */
export function wantsRun(s: InputState) {
  return s.runToggle || s.keys.has("ShiftLeft") || s.keys.has("ShiftRight")
}

/** Eixo de movimento do teclado + joystick: x = direita, y = frente. */
export function moveAxis(s: InputState) {
  const k = s.keys
  let x = (k.has("KeyD") || k.has("ArrowRight") ? 1 : 0) - (k.has("KeyA") || k.has("ArrowLeft") ? 1 : 0)
  let y = (k.has("KeyW") || k.has("ArrowUp") ? 1 : 0) - (k.has("KeyS") || k.has("ArrowDown") ? 1 : 0)
  x += s.joyX
  y += s.joyY
  const m = Math.hypot(x, y)
  if (m > 1) {
    x /= m
    y /= m
  }
  return { x, y }
}

/** Liga os ouvintes. Devolve a função que desliga todos. */
export function attachInput(canvas: HTMLCanvasElement, s: InputState): () => void {
  const ac = new AbortController()
  const opts = { signal: ac.signal }

  window.addEventListener(
    "keydown",
    (e) => {
      if (s.blocked || isEditable(e.target) || e.ctrlKey || e.metaKey || e.altKey) return
      if (e.code === "ShiftLeft" || e.code === "ShiftRight") {
        s.keys.add(e.code)
      } else if (MOVE_KEYS.has(e.code)) {
        s.keys.add(e.code)
        e.preventDefault()
      } else if ((e.code === "KeyE" || e.code === "Enter" || e.code === "Space") && !e.repeat) {
        s.interactQueued = true
        e.preventDefault()
      }
    },
    opts,
  )
  window.addEventListener("keyup", (e) => s.keys.delete(e.code), opts)
  window.addEventListener("blur", () => clearInput(s), opts)
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) clearInput(s)
  }, opts)

  // Arraste no canvas gira a câmera (mouse e dedo). O joystick é outro
  // elemento, então os toques dele nunca chegam aqui.
  let dragId: number | null = null
  let lastX = 0
  let lastY = 0
  canvas.addEventListener(
    "pointerdown",
    (e) => {
      if (s.blocked || dragId !== null) return
      if (e.pointerType === "mouse" && e.button !== 0 && e.button !== 2) return
      dragId = e.pointerId
      lastX = e.clientX
      lastY = e.clientY
      canvas.setPointerCapture(e.pointerId)
    },
    opts,
  )
  canvas.addEventListener(
    "pointermove",
    (e) => {
      if (e.pointerId !== dragId) return
      s.camDX += e.clientX - lastX
      s.camDY += e.clientY - lastY
      lastX = e.clientX
      lastY = e.clientY
    },
    opts,
  )
  const end = (e: PointerEvent) => {
    if (e.pointerId !== dragId) return
    dragId = null
    if (canvas.hasPointerCapture(e.pointerId)) canvas.releasePointerCapture(e.pointerId)
  }
  canvas.addEventListener("pointerup", end, opts)
  canvas.addEventListener("pointercancel", end, opts)
  canvas.addEventListener(
    "wheel",
    (e) => {
      e.preventDefault()
      if (!s.blocked) s.zoom += Math.sign(e.deltaY) * Math.min(Math.abs(e.deltaY), 120) / 120
    },
    { signal: ac.signal, passive: false },
  )
  canvas.addEventListener("contextmenu", (e) => e.preventDefault(), opts)

  return () => ac.abort()
}
