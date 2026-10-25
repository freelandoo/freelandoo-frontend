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
  /** Dirigindo (mm3d-12): Espaço vira freio de mão em vez de interagir. */
  driving: boolean
  /**
   * Toques/cliques curtos no canvas (mm3d-31), em px da janela: menos de
   * TAP_PX de deslocamento e TAP_MS de duração — arrastar continua sendo câmera.
   */
  taps: { x: number; y: number }[]
}

const TAP_PX = 8
const TAP_MS = 450

export function createInputState(): InputState {
  return {
    keys: new Set(),
    joyX: 0,
    joyY: 0,
    camDX: 0,
    camDY: 0,
    zoom: 0,
    interactQueued: false,
    blocked: false,
    runToggle: false,
    driving: false,
    taps: [],
  }
}

export function clearInput(s: InputState) {
  s.keys.clear()
  s.joyX = 0
  s.joyY = 0
  s.camDX = 0
  s.camDY = 0
  s.zoom = 0
  s.interactQueued = false
  s.taps.length = 0
}

/** Zona morta do joystick, reescalada para o eixo ainda ir de 0 a 1. */
const dead = (v: number, z: number) => (Math.abs(v) <= z ? 0 : (Math.sign(v) * (Math.abs(v) - z)) / (1 - z))
const clamp1 = (v: number) => Math.max(-1, Math.min(1, v))

/**
 * Comandos de direção. Teclado: W/↑ acelera, S/↓ freia (parado, engata a ré),
 * A/D ou ←/→ esterçam, Espaço puxa o freio de mão. Celular (mm3d-25): o MESMO
 * joystick de andar, sem pedal nem botão — para a frente acelera, para trás
 * freia e, parado, dá ré; para os lados vira. Igual em carro, bike, skate e
 * patins (a física de cada um sai de `paramsFor`).
 */
export function driveAxis(s: InputState) {
  const k = s.keys
  const t = k.has("KeyW") || k.has("ArrowUp") ? 1 : 0
  const b = k.has("KeyS") || k.has("ArrowDown") ? 1 : 0
  const right = k.has("KeyD") || k.has("ArrowRight") ? 1 : 0
  const left = k.has("KeyA") || k.has("ArrowLeft") ? 1 : 0
  // Na diagonal o joystick dá ~0,7 em cada eixo: 1,4× devolve o curso inteiro
  // (acelerar e virar tudo ao mesmo tempo) sem tirar a precisão perto do centro.
  const jx = clamp1(dead(s.joyX, 0.12) * 1.4)
  const jy = clamp1(dead(s.joyY, 0.2) * 1.4)
  return { t: Math.max(t, jy > 0 ? jy : 0), b: Math.max(b, jy < 0 ? -jy : 0), s: clamp1(right - left + jx), h: k.has("Space") }
}

const MOVE_KEYS = new Set([
  "KeyW", "KeyA", "KeyS", "KeyD", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight",
])

function isEditable(t: EventTarget | null) {
  const el = t as HTMLElement | null
  if (!el) return false
  const tag = el.tagName
  // Teclado dentro de um painel do jogo (card de perfil etc.) não comanda o personagem.
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || el.isContentEditable || !!el.closest?.("[data-mm-panel]")
}

/** Corrida lenta: Shift segurado no teclado ou o botão do celular ligado. */
/**
 * Joystick do celular (pedido do Alex, 2026-10-25): sem botão de correr — até
 * JOY_WALK_AT da borda ele acelera até a caminhada cheia, de JOY_RUN_AT em
 * diante corre. No computador o Shift corre.
 */
export const JOY_WALK_AT = 0.5
export const JOY_RUN_AT = 0.85

export function wantsRun(s: InputState) {
  return s.runToggle || s.keys.has("ShiftLeft") || s.keys.has("ShiftRight") || Math.hypot(s.joyX, s.joyY) >= JOY_RUN_AT
}

/** Eixo de movimento do teclado + joystick: x = direita, y = frente. */
export function moveAxis(s: InputState) {
  const k = s.keys
  let x = (k.has("KeyD") || k.has("ArrowRight") ? 1 : 0) - (k.has("KeyA") || k.has("ArrowLeft") ? 1 : 0)
  let y = (k.has("KeyW") || k.has("ArrowUp") ? 1 : 0) - (k.has("KeyS") || k.has("ArrowDown") ? 1 : 0)
  // Joystick: metade do curso já é a caminhada cheia (a velocidade a pé é
  // proporcional ao tamanho da intenção — meuMundoMotion.step).
  const jm = Math.hypot(s.joyX, s.joyY)
  if (jm > 0) {
    const g = Math.min(1, jm / JOY_WALK_AT) / jm
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
      } else if (e.code === "Space" && s.driving) {
        // Dirigindo, Espaço é o freio de mão (segurar).
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
  let downX = 0
  let downY = 0
  let downT = 0
  let travel = 0
  canvas.addEventListener(
    "pointerdown",
    (e) => {
      if (s.blocked || dragId !== null) return
      if (e.pointerType === "mouse" && e.button !== 0 && e.button !== 2) return
      dragId = e.pointerId
      lastX = downX = e.clientX
      lastY = downY = e.clientY
      downT = performance.now()
      travel = 0
      canvas.setPointerCapture(e.pointerId)
    },
    opts,
  )
  canvas.addEventListener(
    "pointermove",
    (e) => {
      if (e.pointerId !== dragId) return
      travel = Math.max(travel, Math.hypot(e.clientX - downX, e.clientY - downY))
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
    // Toque curto e parado = escolher (o arraste de câmera nunca vira toque).
    if (e.type === "pointerup" && (e.pointerType !== "mouse" || e.button === 0) && travel < TAP_PX && performance.now() - downT < TAP_MS && !s.blocked) {
      s.taps.push({ x: e.clientX, y: e.clientY })
      if (s.taps.length > 4) s.taps.shift()
    }
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
