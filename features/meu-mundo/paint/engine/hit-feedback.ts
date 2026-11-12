// features/meu-mundo/paint/engine/hit-feedback.ts — mm3d-59: o ACERTO CONFIRMADO no Paint.
//
// Só dispara com o evento "hit" que veio da SALA (ou da partida local no
// treino) e só quando o tiro/soco foi MEU: anel de impacto no alvo (cena 3D),
// número do dano subindo, X de acerto na mira e um "tic" curto. As cores de
// regra do jogo (tintas) não mudam: o anel usa a cor da tinta que acertou e o
// número é branco/vermelho; nocaute vira número maior e anel duplo.

import type { Scene } from "@babylonjs/core/scene"
import type { Camera } from "@babylonjs/core/Cameras/camera"
import { Matrix, Vector3 } from "@babylonjs/core/Maths/math.vector"
import { Color3 } from "@babylonjs/core/Maths/math.color"
import { CreateTorus } from "@babylonjs/core/Meshes/Builders/torusBuilder"
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial"
import type { Mesh } from "@babylonjs/core/Meshes/mesh"
import { audioBus, audioContext, unlockAudio } from "../../engine/audio"

const RING_S = 0.38
const POOL = 4

export function createHitFeedback(scene: Scene, camera: Camera, host: HTMLElement, canvas: HTMLCanvasElement) {
  const reduced = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches
  // ── anéis 3D (pool pequeno; nada criado por acerto) ──
  const rings: { mesh: Mesh; mat: StandardMaterial; t: number; big: boolean }[] = []
  for (let i = 0; i < POOL; i++) {
    const mesh = CreateTorus(`paint-hit-ring-${i}`, { diameter: 1, thickness: 0.07, tessellation: 28 }, scene)
    const mat = new StandardMaterial(`paint-hit-ring-mat-${i}`, scene)
    mat.disableLighting = true
    mat.emissiveColor = new Color3(1, 1, 1)
    mat.alpha = 0
    mesh.material = mat
    mesh.isPickable = false
    mesh.setEnabled(false)
    rings.push({ mesh, mat, t: RING_S, big: false })
  }
  let next = 0

  // ── camada dos números ──
  const layer = document.createElement("div")
  layer.setAttribute("aria-hidden", "true")
  layer.style.cssText = "position:absolute;inset:0;pointer-events:none;overflow:hidden;z-index:6"
  host.appendChild(layer)

  // ── som curto (o tiro já é um gesto: o contexto pode abrir) ──
  const tick = (ko: boolean) => {
    try {
      // contexto do jogo (engine/audio): um só, canal de efeitos
      unlockAudio()
      const audio = audioContext()
      const out = audioBus("sfx")
      if (!audio || !out) return
      const o = audio.createOscillator()
      const g = audio.createGain()
      o.type = "square"
      o.frequency.setValueAtTime(ko ? 520 : 1250, audio.currentTime)
      o.frequency.exponentialRampToValueAtTime(ko ? 180 : 700, audio.currentTime + 0.08)
      g.gain.setValueAtTime(0.06, audio.currentTime)
      g.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + (ko ? 0.22 : 0.09))
      o.connect(g).connect(out)
      o.start()
      o.stop(audio.currentTime + 0.25)
    } catch {
      /* sem áudio */
    }
  }

  const pop = (at: Vector3, text: string, color: string, size: number) => {
    const w = canvas.clientWidth
    const h = canvas.clientHeight
    const p = Vector3.Project(at, Matrix.Identity(), scene.getTransformMatrix(), camera.viewport.toGlobal(w, h))
    if (p.z < 0 || p.z > 1) return
    const el = document.createElement("span")
    el.textContent = text
    el.style.cssText = `position:absolute;left:${p.x}px;top:${p.y}px;font:900 ${size}px/1 "Arial Black",system-ui,sans-serif;color:${color};-webkit-text-stroke:4px #120a16;paint-order:stroke fill;transform:translate(-50%,-50%);white-space:nowrap`
    layer.appendChild(el)
    if (reduced) {
      setTimeout(() => el.remove(), 700)
      return
    }
    el.animate(
      [
        { transform: "translate(-50%,-50%) scale(0.5)" },
        { transform: "translate(-50%,-110%) scale(1.25)", offset: 0.18 },
        { transform: "translate(-50%,-170%) scale(1)", opacity: 1, offset: 0.7 },
        { transform: "translate(-50%,-200%) scale(0.9)", opacity: 0 },
      ],
      { duration: 800, easing: "ease-out" },
    ).onfinish = () => el.remove()
  }

  /** X de acerto na mira (o elemento da mira é do paint-input). */
  const marker = (ko: boolean) => {
    const ret = host.querySelector<HTMLElement>("[data-paint-reticle]")
    if (!ret) return
    const x = document.createElement("div")
    x.style.cssText = "position:absolute;inset:-6px;pointer-events:none"
    const c = ko ? "#ff3344" : "#ffffff"
    x.innerHTML = `<svg width="52" height="52" viewBox="0 0 52 52"><path d="M10 10l9 9M42 10l-9 9M10 42l9-9M42 42l-9-9" stroke="#000" stroke-width="7" stroke-linecap="round"/><path d="M10 10l9 9M42 10l-9 9M10 42l9-9M42 42l-9-9" stroke="${c}" stroke-width="3.5" stroke-linecap="round"/></svg>`
    ret.appendChild(x)
    setTimeout(() => x.remove(), ko ? 320 : 180)
  }

  return {
    /** Acerto meu confirmado em `at` (peito do alvo). */
    confirm(at: { x: number; y: number; z: number }, dmg: number, color: Color3, ko: boolean) {
      const r = rings[next++ % POOL]
      r.t = 0
      r.big = ko
      r.mat.emissiveColor = color
      r.mesh.position.set(at.x, at.y, at.z)
      r.mesh.setEnabled(true)
      pop(new Vector3(at.x, at.y + 0.5, at.z), ko ? `−${dmg} K.O.` : `−${dmg}`, ko ? "#ff3344" : "#ffffff", ko ? 46 : 34)
      marker(ko)
      tick(ko)
    },
    /** A cada quadro: os anéis abrem e somem; viram para a câmera. */
    update(dt: number) {
      for (const r of rings) {
        if (r.t >= RING_S) continue
        r.t += dt
        const k = Math.min(1, r.t / RING_S)
        const s = (r.big ? 2.6 : 1.6) * (0.3 + 0.7 * (1 - (1 - k) * (1 - k)))
        r.mesh.scaling.setAll(s)
        r.mesh.lookAt(camera.position)
        r.mesh.rotation.x += Math.PI / 2
        r.mat.alpha = 1 - k
        if (k >= 1) r.mesh.setEnabled(false)
      }
    },
    dispose() {
      for (const r of rings) {
        r.mesh.dispose()
        r.mat.dispose()
      }
      layer.remove()
      // o contexto é o do jogo (engine/audio): não fecha
    },
  }
}
