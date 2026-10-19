// features/meu-mundo/engine/game.ts
//
// Ciclo de vida do Meu Mundo 3D: cria o motor, monta o bairro, roda UM laço
// de renderização e, ao sair, desmonta tudo que criou.
//
// Esta peça não sabe nada de React nem da Freelandoo: recebe um canvas, a
// definição do bairro e callbacks. É isso que permite levar as regras do jogo
// para um aplicativo depois sem reescrever o mundo.
//
// ═══ O QUE O DESCARTE GARANTE ═══
// Ao sair: o laço para, os ouvintes saem (um AbortController só), o observador
// de tamanho desconecta, a cena e o motor são descartados e nenhum callback é
// chamado depois disso. `liveGames()` conta quantas instâncias estão de pé —
// entrar e sair várias vezes tem que deixar o número em zero ou um.

import { Engine } from "@babylonjs/core/Engines/engine"
import { Scene } from "@babylonjs/core/scene"
import { HemisphericLight } from "@babylonjs/core/Lights/hemisphericLight"
import { DirectionalLight } from "@babylonjs/core/Lights/directionalLight"
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial"
import { SceneInstrumentation } from "@babylonjs/core/Instrumentation/sceneInstrumentation"
import { Color3, Color4 } from "@babylonjs/core/Maths/math.color"
import { Vector3 } from "@babylonjs/core/Maths/math.vector"
import { buildWorld } from "./world"
import { Player } from "./player"
import { FollowCamera } from "./camera"
import { attachInput, clearInput, createInputState, moveAxis, type InputState } from "./input"
import type { GameStats, Interactable, Neighborhood } from "../types"

let live = 0
export const liveGames = () => live

export interface GameOptions {
  canvas: HTMLCanvasElement
  neighborhood: Neighborhood
  exitLabel: string
  /** Teto da resolução interna (pixels de tela por pixel CSS). */
  maxPixelRatio?: number
  onReady?: () => void
  onNearbyChange?: (item: Interactable | null) => void
  onInteract?: (item: Interactable) => void
  onStats?: (stats: GameStats) => void
  onError?: (reason: "context-lost") => void
}

export interface GameHandle {
  input: InputState
  /** Joystick virtual do celular: x = direita, y = frente, módulo até 1. */
  setJoystick: (x: number, y: number) => void
  setBlocked: (blocked: boolean) => void
  interact: () => void
  respawn: () => void
  setStatsEnabled: (on: boolean) => void
  dispose: () => void
}

const SKY = new Color3(0.66, 0.83, 0.95)

export function createMeuMundoGame(opts: GameOptions): GameHandle {
  const { canvas, neighborhood: nb } = opts
  const engine = new Engine(
    canvas,
    true,
    { stencil: false, preserveDrawingBuffer: false, powerPreference: "default" },
    false,
  )
  live++
  // Só leitura, para conferir de fora (teste e painel técnico) que entrar e
  // sair não acumula instâncias.
  ;(window as unknown as { __mmLiveGames?: () => number }).__mmLiveGames = liveGames
  let disposed = false

  // Resolução interna limitada: em tela de alta densidade o custo por pixel é
  // o que pesa, e a cena (cores sólidas) não ganha nada acima de 1,5×.
  const ratio = Math.min(window.devicePixelRatio || 1, opts.maxPixelRatio ?? 1.5)
  engine.setHardwareScalingLevel(1 / ratio)

  const scene = new Scene(engine)
  scene.clearColor = new Color4(SKY.r, SKY.g, SKY.b, 1)
  scene.ambientColor = new Color3(0.2, 0.2, 0.22)
  scene.fogMode = Scene.FOGMODE_LINEAR
  scene.fogColor = SKY
  scene.fogStart = 70
  scene.fogEnd = 165
  // A seleção por ponteiro do Babylon não é usada (o jogo faz a própria).
  scene.skipPointerMovePicking = true
  scene.skipPointerDownPicking = true
  scene.skipPointerUpPicking = true
  scene.skipFrustumClipping = false
  scene.autoClear = true

  const hemi = new HemisphericLight("mm-hemi", new Vector3(0.25, 1, 0.15), scene)
  hemi.intensity = 0.78
  hemi.groundColor = new Color3(0.5, 0.48, 0.55)
  const sun = new DirectionalLight("mm-sun", new Vector3(-0.55, -1, -0.35), scene)
  sun.intensity = 0.55

  const world = buildWorld(scene, nb, opts.exitLabel)

  const characterMat = new StandardMaterial("mm-character", scene)
  characterMat.diffuseColor = new Color3(1, 1, 1)
  characterMat.specularColor = new Color3(0.08, 0.08, 0.08)
  const player = new Player(scene, characterMat)
  const follow = new FollowCamera(scene)
  scene.activeCamera = follow.camera

  const spawn = () => {
    player.teleport(nb.spawn.x, nb.spawn.z, nb.spawn.rotationY)
    follow.snapBehind(nb.spawn.x, nb.spawn.z, nb.spawn.rotationY)
    follow.update(1, player.x, player.z, world.viewBoxes)
  }
  spawn()

  const input = createInputState()
  const detachInput = attachInput(canvas, input)

  let nearby: Interactable | null = null
  const findNearby = () => {
    let best: Interactable | null = null
    let bestD = Infinity
    for (const it of world.interactables) {
      const d = Math.hypot(it.x - player.x, it.z - player.z)
      if (d <= it.radius && d < bestD) {
        best = it
        bestD = d
      }
    }
    return best
  }

  // Estatísticas só quando o painel técnico está aberto: a instrumentação tem
  // custo e ninguém precisa dela com o painel fechado.
  let instr: SceneInstrumentation | null = null
  let statsTimer = 0

  scene.onBeforeRenderObservable.add(() => {
    // Até 0,1 s o movimento acompanha o relógio (o personagem divide em
    // subpassos); acima disso é um engasgo (aba voltando) e não vale pular.
    const dt = Math.min(engine.getDeltaTime() / 1000, 0.1)
    if (input.blocked) {
      player.stop()
      player.update(dt, 0, 0, world.boxes)
    } else {
      if (input.camDX || input.camDY) {
        follow.rotate(input.camDX * 0.006, input.camDY * 0.004)
        input.camDX = 0
        input.camDY = 0
      }
      if (input.zoom) {
        follow.zoom(input.zoom * 1.1)
        input.zoom = 0
      }
      const axis = moveAxis(input)
      const f = follow.forward()
      // direita = cima × frente (mão esquerda): (f.z, -f.x)
      const mx = f.x * axis.y + f.z * axis.x
      const mz = f.z * axis.y - f.x * axis.x
      player.update(dt, mx, mz, world.boxes)
    }
    follow.update(dt, player.x, player.z, world.viewBoxes)

    const next = findNearby()
    if (next?.id !== nearby?.id) {
      nearby = next
      opts.onNearbyChange?.(nearby)
    }
    if (input.interactQueued) {
      input.interactQueued = false
      if (nearby && !input.blocked) opts.onInteract?.(nearby)
    }

    if (instr && opts.onStats) {
      statsTimer += dt
      if (statsTimer >= 0.5) {
        statsTimer = 0
        opts.onStats({
          fps: engine.getFps(),
          frameMs: instr.frameTimeCounter.lastSecAverage || null,
          meshes: scene.meshes.length,
          activeMeshes: scene.getActiveMeshes().length,
          materials: scene.materials.length,
          // No Babylon 9 só o motor nativo conta draw calls; no WebGL o contador
          // fica em zero. Zero aqui seria mentira — vira "indisponível".
          drawCalls: Math.round(instr.drawCallsCounter.lastSecAverage) || null,
          webgl: engine.webGLVersion,
          liveGames: live,
          x: player.x,
          z: player.z,
        })
      }
    }
  })

  scene.executeWhenReady(() => {
    if (!disposed) opts.onReady?.()
  })

  engine.runRenderLoop(() => {
    if (!disposed) scene.render()
  })

  const ro = new ResizeObserver(() => {
    if (!disposed) engine.resize()
  })
  ro.observe(canvas)

  const lost = engine.onContextLostObservable.add(() => {
    if (!disposed) opts.onError?.("context-lost")
  })

  const handle: GameHandle = {
    input,
    setJoystick(x, y) {
      input.joyX = x
      input.joyY = y
    },
    setBlocked(blocked) {
      input.blocked = blocked
      clearInput(input)
    },
    interact() {
      if (nearby && !input.blocked) opts.onInteract?.(nearby)
    },
    respawn() {
      clearInput(input)
      spawn()
    },
    setStatsEnabled(on) {
      if (on && !instr) {
        instr = new SceneInstrumentation(scene)
        instr.captureFrameTime = true
        statsTimer = 1
      } else if (!on && instr) {
        instr.dispose()
        instr = null
      }
    },
    dispose() {
      if (disposed) return
      disposed = true
      engine.stopRenderLoop()
      detachInput()
      ro.disconnect()
      engine.onContextLostObservable.remove(lost)
      instr?.dispose()
      instr = null
      player.dispose()
      world.dispose()
      characterMat.dispose()
      scene.dispose()
      engine.dispose()
      live--
    },
  }
  return handle
}
