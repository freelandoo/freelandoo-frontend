// features/meu-mundo/laminas/engine/impact-fx.ts — o impacto dos golpes comuns (apresentação 08, 2026-11-11).
//
// Camadas curtas, uma depois da outra (Anexo A §5.1 e §5.5 do plano de apresentação):
//  - fita em meia-lua NO CHÃO, da cor de quem joga, que nasce cheia e afina até sumir (não é partícula);
//  - quadro de cor chapada de 1 a 2 quadros (DOM, só opacidade) no golpe que fecha o combo, no S e no nocaute;
//  - palavra de estado curta e inclinada em cima de quem ficou no estado (DOM, transform/opacity).
// Só desenho: dano, alcance e tempo são de sim/fight.ts. A fita nasce uma vez no warm() e é reaproveitada.

import type { Scene } from "@babylonjs/core/scene"
import { Vector3 } from "@babylonjs/core/Maths/math.vector"
import { Color3 } from "@babylonjs/core/Maths/math.color"
import { TransformNode } from "@babylonjs/core/Meshes/transformNode"
import type { Mesh } from "@babylonjs/core/Meshes/mesh"
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial"
import { Texture } from "@babylonjs/core/Materials/Textures/texture"
import { DynamicTexture } from "@babylonjs/core/Materials/Textures/dynamicTexture"
import type { FxBuilder, FxEffect, FxStage } from "../../engine/fx/fx-core"
import { moonMesh } from "../abilities/signature-fx"
import type { Signature } from "../abilities/signatures"

/** Cor exclusiva do aviso de golpe pesado ("verde-alarme"): não é de nenhum personagem nem de dano. */
export const HEAVY_WARN = "#C8FF24"

const ARCS = 3
/** Faixa da textura que cobre a fita: a malha vai de y = -0,24 (halo de fora) a 1 (miolo). */
const Y0 = -0.24
const YS = 1.24

export interface ArcArgs {
  /** Pés de quem golpeia. */
  at: Vector3
  facing: number
  /** Raio do fio da fita (m). */
  radius: number
  /** Alterna o sentido a cada golpe do combo. */
  mirror: boolean
  /** Vida da fita (s). */
  life: number
}

interface Arc {
  node: TransformNode
  mesh: Mesh
  mat: StandardMaterial
  tex: Texture
  on: boolean
  t: number
  life: number
}

/** Corte da fita: fio quase branco, corpo na cor de quem joga, rabo escuro que some; halo fino por fora. */
function ribbonTexture(scene: Scene, sig: Signature) {
  const H = 128
  const tex = new DynamicTexture("ia-ribbon", { width: 4, height: H }, scene, false)
  const g = tex.getContext() as CanvasRenderingContext2D
  const [, mid, hot, , top] = sig.pal.map((c) => Color3.FromHexString(c))
  const mix = (p: Color3, q: Color3, k: number) => Color3.Lerp(p, q, Math.max(0, Math.min(1, k)))
  for (let r = 0; r < H; r++) {
    // DynamicTexture vira o eixo: a linha de cima do quadro é o v = 1
    const y = (1 - (r + 0.5) / H) * YS + Y0
    let c: Color3
    let al: number
    if (y < 0) {
      c = hot
      al = 0.45 * Math.pow(1 + y / -Y0, 2)
    } else if (y < 0.06) {
      c = mix(top, hot, y / 0.06)
      al = 1
    } else if (y < 0.34) {
      c = mix(hot, mid, (y - 0.06) / 0.28)
      al = 0.95
    } else {
      c = mid
      al = Math.max(0, 0.95 * (1 - (y - 0.34) / 0.36))
    }
    g.fillStyle = `rgba(${Math.round(c.r * 255)},${Math.round(c.g * 255)},${Math.round(c.b * 255)},${al.toFixed(3)})`
    g.fillRect(0, r, 4, 1)
  }
  tex.hasAlpha = true
  tex.wrapU = Texture.CLAMP_ADDRESSMODE
  tex.wrapV = Texture.CLAMP_ADDRESSMODE
  tex.update()
  return tex
}

function buildArcs(scene: Scene, sig: Signature): FxEffect<ArcArgs> {
  const base = ribbonTexture(scene, sig)
  const arcs: Arc[] = []
  for (let i = 0; i < ARCS; i++) {
    const node = new TransformNode(`ia-node-${i}`, scene)
    const mesh = moonMesh(scene, `ia-arc-${i}`)
    // cada fita afina no seu tempo: textura própria (o mesmo desenho), deslocada em v
    const tex = i ? base.clone() : base
    tex.vScale = 1 / YS
    const mat = new StandardMaterial(`ia-arc-mat-${i}`, scene)
    mat.diffuseTexture = tex
    mat.useAlphaFromDiffuseTexture = true
    mat.diffuseColor = Color3.White()
    // sem luz, a cor final = emissiva × textura: emissiva branca deixa o desenho da textura como está
    mat.emissiveColor = Color3.White()
    mat.specularColor = Color3.Black()
    mat.disableLighting = true
    mat.backFaceCulling = false
    mat.disableDepthWrite = true
    mesh.material = mat
    mesh.parent = node
    mesh.isPickable = false
    mesh.alwaysSelectAsActiveMesh = true
    mesh.setEnabled(false)
    arcs.push({ node, mesh, mat, tex, on: false, t: 0, life: 1 })
  }
  const hide = (a: Arc) => {
    a.on = false
    a.mesh.setEnabled(false)
  }
  const thin = (a: Arc, u: number) => {
    // afinar = puxar o desenho para o fio: o miolo some primeiro, o fio por último
    a.tex.vOffset = -Y0 / YS + 0.42 * u * u
    a.mat.alpha = 1 - Math.pow(u, 2.5)
  }
  return {
    play({ at, facing, radius, mirror, life }) {
      const a = arcs.find((x) => !x.on) ?? arcs.reduce((p, q) => (p.t > q.t ? p : q))
      a.on = true
      a.t = 0
      a.life = life
      // um palmo acima do chão: não briga com o piso nem com os círculos de luz
      a.node.position.set(at.x, 0.06, at.z)
      a.node.rotation.set(0, facing, 0)
      a.node.scaling.set(mirror ? -radius : radius, 1, radius)
      thin(a, 0)
      a.mesh.setEnabled(true)
    },
    step(dt) {
      let any = false
      for (const a of arcs) {
        if (!a.on) continue
        a.t += dt
        const u = a.t / a.life
        if (u >= 1) {
          hide(a)
          continue
        }
        any = true
        thin(a, u)
      }
      return any
    },
    stop() {
      for (const a of arcs) hide(a)
    },
    warm() {
      for (const a of arcs) {
        a.mesh.setEnabled(true)
        a.mat.forceCompilation(a.mesh)
        a.mesh.setEnabled(false)
      }
    },
    dispose() {
      for (const a of arcs) {
        a.mesh.dispose()
        a.mat.dispose()
        a.node.dispose()
        if (a.tex !== base) a.tex.dispose()
      }
      base.dispose()
    },
  }
}

export interface GroundArcs {
  warm: () => void
  play: (args: ArcArgs) => void
}

export function groundArcs(stage: FxStage, sig: Signature): GroundArcs {
  const build: FxBuilder<ArcArgs> = ({ scene }) => buildArcs(scene, sig)
  return {
    warm: () => stage.warm("ground-arc", build),
    play: (args) => stage.play("ground-arc", build, args),
  }
}

/** Duração de um "quadro" de cor chapada: 2 quadros a 60, 1 a 30 (o celular médio ainda mostra). */
const FRAME_MS = 34

/**
 * Tela inteira de uma cor, um quadro por cor, na ordem. `alpha` = quanto cobre.
 * É o "soco no olho": não pode virar regra de todo golpe.
 */
export function flatFrame(layer: HTMLElement, colors: readonly string[], alpha: number) {
  colors.forEach((c, i) => {
    const el = document.createElement("div")
    el.style.cssText = `position:absolute;inset:0;background:${c};opacity:0;will-change:opacity;pointer-events:none`
    layer.appendChild(el)
    const anim = el.animate(
      [
        { opacity: alpha, offset: 0 },
        { opacity: alpha, offset: 0.99 },
        { opacity: 0, offset: 1 },
      ],
      { duration: FRAME_MS, delay: i * FRAME_MS, easing: "steps(1,end)", fill: "backwards" },
    )
    anim.onfinish = () => el.remove()
    anim.oncancel = () => el.remove()
  })
}

/**
 * Palavra de estado: curta, inclinada, na cor do efeito, logo acima de quem está no estado.
 * Entra deslizando (0,12 s), fica (0,7 s) e sai subindo (0,2 s): o resto dura mais que o impacto.
 * `stack` empilha palavras que caem juntas no mesmo alvo.
 */
export function stateWord(layer: HTMLElement, x: number, y: number, text: string, color: string, font: string, stack = 0) {
  const el = document.createElement("span")
  el.textContent = text
  const top = y - stack * 28
  el.style.cssText = `position:absolute;left:${x}px;top:${top}px;font:400 24px/1 ${font};letter-spacing:.04em;text-transform:uppercase;color:${color};-webkit-text-stroke:3px #160a10;paint-order:stroke fill;text-shadow:0 2px 0 rgba(0,0,0,.45);white-space:nowrap;will-change:transform,opacity;pointer-events:none`
  layer.appendChild(el)
  const base = "translate(-50%,-50%) rotate(-8deg) skewX(-10deg)"
  const anim = el.animate(
    [
      { transform: `${base} translateX(-26px)`, opacity: 0, offset: 0 },
      { transform: `${base} translateX(0)`, opacity: 1, offset: 0.12 },
      { transform: `${base} translateX(4px)`, opacity: 1, offset: 0.8 },
      { transform: `${base} translate(8px,-12px)`, opacity: 0, offset: 1 },
    ],
    { duration: 1020, easing: "cubic-bezier(.2,.8,.2,1)" },
  )
  anim.onfinish = () => el.remove()
  anim.oncancel = () => el.remove()
}
