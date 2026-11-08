// features/meu-mundo/jetpack/engine/jet-perf.ts — JETPACK 2.0: a sonda de desempenho.
//
// Mede FPS, tempo do quadro, chamadas de desenho, malhas ativas, partículas e
// memória do JS. Só liga quando alguém pergunta (`window.__jetPerf()` no
// harness) ou com `?perf=1` na URL (um quadrinho no canto). Sem pedido, custo
// zero: a instrumentação do Babylon só nasce na primeira leitura.

import type { Engine } from "@babylonjs/core/Engines/engine"
import type { Scene } from "@babylonjs/core/scene"
import { SceneInstrumentation } from "@babylonjs/core/Instrumentation/sceneInstrumentation"

export interface PerfSample {
  fps: number
  frameMs: number
  drawCalls: number
  activeMeshes: number
  particles: number
  heapMB: number | null
}

export interface PerfProbe {
  sample: () => PerfSample
  dispose: () => void
}

/**
 * Chamadas de desenho por quadro, contadas pelo que está à vista: cada malha
 * ativa desenha as suas submalhas; cópias instanciadas de uma mesma malha vão
 * numa chamada só; cada sistema de partículas ativo é mais uma. (O contador do
 * Babylon não roda com o laço de render manual deste jogo.)
 */
function drawCalls(scene: Scene) {
  const seen = new Set<unknown>()
  let n = 0
  for (const m of scene.getActiveMeshes().data) {
    if (!m) continue
    const src = (m as unknown as { sourceMesh?: unknown }).sourceMesh ?? m
    if (seen.has(src)) continue
    seen.add(src)
    n += Math.max(1, m.subMeshes?.length ?? 1)
  }
  for (const ps of scene.particleSystems) if (ps.isStarted() && ps.getActiveCount() > 0) n++
  return n
}

export function createPerfProbe(scene: Scene, engine: Engine, host: HTMLElement | null): PerfProbe {
  let inst: SceneInstrumentation | null = null
  const ensure = () => {
    if (!inst) {
      inst = new SceneInstrumentation(scene)
      inst.captureFrameTime = true
    }
    return inst
  }
  const sample = (): PerfSample => {
    const i = ensure()
    let particles = 0
    for (const ps of scene.particleSystems) particles += ps.getActiveCount()
    const mem = (performance as unknown as { memory?: { usedJSHeapSize: number } }).memory
    return {
      fps: Math.round(engine.getFps()),
      frameMs: Math.round(i.frameTimeCounter.lastSecAverage * 10) / 10,
      drawCalls: drawCalls(scene),
      activeMeshes: scene.getActiveMeshes().length,
      particles,
      heapMB: mem ? Math.round(mem.usedJSHeapSize / 1048576) : null,
    }
  }
  let box: HTMLDivElement | null = null
  let timer: ReturnType<typeof setInterval> | null = null
  const wantOverlay = typeof location !== "undefined" && /[?&]perf=1/.test(location.search)
  if (wantOverlay && host) {
    box = document.createElement("div")
    box.style.cssText = "position:absolute;left:8px;bottom:8px;z-index:5;pointer-events:none;font:11px/1.35 monospace;color:#9ff;background:rgba(0,0,0,.6);padding:4px 6px;white-space:pre"
    host.appendChild(box)
    timer = setInterval(() => {
      const s = sample()
      if (box) box.textContent = `fps ${s.fps}  ${s.frameMs} ms\ndraw ${s.drawCalls}  malhas ${s.activeMeshes}\npartículas ${s.particles}${s.heapMB !== null ? `  heap ${s.heapMB} MB` : ""}`
    }, 500)
  }
  return {
    sample,
    dispose() {
      if (timer) clearInterval(timer)
      box?.remove()
      inst?.dispose()
    },
  }
}
