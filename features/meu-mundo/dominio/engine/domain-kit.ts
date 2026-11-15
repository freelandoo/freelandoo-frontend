// features/meu-mundo/dominio/engine/domain-kit.ts — lore v2 D1: o KIT de um Domínio.
//
// Limpeza 3 (2026-11-14): o Domínio fechado (domain-game.ts) e o carregador do kit do Tripo
// (loadDomainKit, KitPlacer) saíram — as 18 cenas e os 6 palcos são em código. Fica o look, o céu
// e o chão pintado que o palco de luta e o mundo aberto dividem. Histórico abaixo.
//
// Um tema = um kit de peças feito uma vez e usado em todo jogo (skill
// meu-mundo-cenario). A Floresta da Lua usa as MESMAS peças do Jetpack
// (`public/meu-mundo/jetpack/floresta2/`, carregador de grupos do
// canyon-assets.ts): sem arte nova na D1. Aqui ficam o que a cena do Domínio
// (domain-game.ts) e os palcos de luta (laminas/engine/domain-stage.ts) dividem:
// carregar o kit com a versão de longe mais cedo (a câmera anda no chão, não voa),
// pôr uma peça (instância com escala uniforme, em pé no chão), o chão pintado e a
// luz de lua parada. Nada colide aqui: a colisão do Domínio é a do jogo.
//
// Tema novo (D5…D9) = uma entrada em KITS + o `look`; o motor não muda.
//
// D2 (2026-11-11): a Floresta do Domínio lê o kit do TEMA (`public/meu-mundo/temas/floresta/v1/`):
// as mesmas peças do Jetpack (crus de `build/jetpack/floresta2`), empacotadas pelo
// `pipeline/pack.js --kind cenario -- -kn -kv -vtf` com textura KTX2 UASTC de 512 (era JPEG de
// 512–1024: ~2 MB de placa por arquivo, agora ~0,3 MB). Os palcos de luta passavam do teto de
// 32 MB no low por causa disso. O Jetpack segue no floresta2 até a trilha visual migrar.
//
// B6 (2026-11-11): tema v2 (`pipeline/temas/build_floresta_tema_v2.py`): sombreamento suave com vinco nas
// quinas (a v1 tinha normal por face: árvore colossal facetada de perto), UV refeita com margem (a do Tripo
// era um mosaico sem margem que vazava ao reduzir), cor reassada e MAPA DE NORMAL assado do Tripo inteiro
// nas peças grandes; árvores, casa e portão com cor 1024. O carregador passa o mapa adiante (canyon-assets).

import type { Scene } from "@babylonjs/core/scene"
import type { Mesh } from "@babylonjs/core/Meshes/mesh"
import { CreateGround } from "@babylonjs/core/Meshes/Builders/groundBuilder"
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial"
import { DynamicTexture } from "@babylonjs/core/Materials/Textures/dynamicTexture"
import { Texture } from "@babylonjs/core/Materials/Textures/texture"
import { Color3, Color4 } from "@babylonjs/core/Maths/math.color"
import { Vector3 } from "@babylonjs/core/Maths/math.vector"
import type { SkyRegionId, SkyVariant } from "../../engine/sky/sky-registry"
import type { HemisphericLight } from "@babylonjs/core/Lights/hemisphericLight"
import type { DirectionalLight } from "@babylonjs/core/Lights/directionalLight"
import { Scene as SceneClass } from "@babylonjs/core/scene"
import { Sky } from "../../engine/steampunk/atmosphere"

export type DomainKitId = "floresta" | "canion"
export type DomainSpot = "entrada" | "fundo" | "palacio"

/** O kit (luz, chão, céu) do palco de luta de cada Domínio: o Cânion tem o seu; os outros usam o da Floresta. */
export function sceneKitOf(id: string | null | undefined): DomainKitId {
  return id === "canion" ? "canion" : "floresta"
}

/** Gerador pseudoaleatório pequeno (a cena sai igual para todo mundo). */
export function seeded(seed: number) {
  let s = seed >>> 0 || 1
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 4294967296
  }
}

/** Como cada tema se acende (Floresta da Lua: noite parada, lua cheia, névoa verde-azulada). */
export interface DomainLook {
  clear: [number, number, number]
  fog: [number, number, number]
  fogStart: number
  fogEnd: number
  hemi: { sky: [number, number, number]; ground: [number, number, number]; k: number }
  moon: { color: [number, number, number]; k: number }
  /** Chão pintado: terra, musgo e o caminho. */
  ground: { soil: string; moss: string; path: string; glow: string; track?: string }
}

export const LOOKS: Record<DomainKitId, DomainLook> = {
  floresta: {
    clear: [0.04, 0.09, 0.13],
    fog: [0.09, 0.2, 0.24],
    fogStart: 26,
    fogEnd: 92,
    hemi: { sky: [0.62, 0.9, 0.92], ground: [0.22, 0.18, 0.32], k: 0.95 },
    moon: { color: [0.78, 0.92, 1], k: 0.7 },
    ground: { soil: "#1f2a1d", moss: "#2f4a2a", path: "#4a3b2b", glow: "#3ff2c4" },
  },
  canion: {
    clear: [0.32, 0.16, 0.12],
    fog: [0.45, 0.24, 0.18],
    fogStart: 30,
    fogEnd: 110,
    hemi: { sky: [1, 0.82, 0.7], ground: [0.4, 0.2, 0.15], k: 1 },
    moon: { color: [1, 0.85, 0.7], k: 0.8 },
    // D5: o trilho da Pista do Céu esculpido na rocha — dois sulcos acesos de ciano no caminho
    ground: { soil: "#6a3424", moss: "#7a4430", path: "#8a5a3a", glow: "#5fe0ff", track: "#5fe0ff" },
  },
}

/** Luz, névoa e céu do tema (as luzes vêm do chamador, achadas pelo nome). */
/** Céu panorâmico do palco: a área (engine/sky) e a arte fixa de dia ou de noite. */
export interface StageSky {
  region: SkyRegionId
  mode: SkyVariant
}

export function applyDomainLook(scene: Scene, look: DomainLook, hemi: HemisphericLight | null, moon: DirectionalLight | null, art?: StageSky | null, low = false): Sky {
  scene.clearColor = new Color4(look.clear[0], look.clear[1], look.clear[2], 1)
  scene.fogMode = SceneClass.FOGMODE_LINEAR
  scene.fogColor = new Color3(...look.fog)
  scene.fogStart = look.fogStart
  scene.fogEnd = look.fogEnd
  scene.ambientColor = new Color3(0.2, 0.24, 0.26)
  if (hemi) {
    hemi.intensity = look.hemi.k
    hemi.direction = new Vector3(0.1, 1, -0.2)
    hemi.diffuse = new Color3(...look.hemi.sky)
    hemi.groundColor = new Color3(...look.hemi.ground)
  }
  if (moon) {
    moon.direction = new Vector3(0.35, -0.8, 0.45)
    moon.intensity = look.moon.k
    moon.diffuse = new Color3(...look.moon.color)
  }
  // o céu do Domínio da luta (engine/sky; dia ou noite da cena) — sem arte, a cúpula da cidade presa na noite
  const sky = new Sky(scene, 180, art ? { region: art.region, mode: art.mode, tier: low ? "low" : "mid" } : {})
  sky.set(1)
  return sky
}

/**
 * Chão pintado num retângulo (w × d, centro em cx, cz): terra, manchas de musgo,
 * folhas acesas e o caminho do meio (largura `path` em metros; 0 = sem caminho).
 * Uma malha, um material; a textura repete `rep` vezes no comprimento.
 */
export function paintedGround(scene: Scene, name: string, look: DomainLook, w: number, d: number, cx: number, cz: number, path: number, rep: number, seed = 7): { mesh: Mesh; dispose: () => void } {
  const W = 512
  const H = 512
  const tex = new DynamicTexture(`${name}-tex`, { width: W, height: H }, scene, true)
  const g = tex.getContext() as unknown as CanvasRenderingContext2D
  const r = seeded(seed)
  g.fillStyle = look.ground.soil
  g.fillRect(0, 0, W, H)
  for (let i = 0; i < 260; i++) {
    const x = r() * W
    const y = r() * H
    const rad = 10 + r() * 46
    const gr = g.createRadialGradient(x, y, 0, x, y, rad)
    gr.addColorStop(0, look.ground.moss)
    gr.addColorStop(1, "rgba(0,0,0,0)")
    g.fillStyle = gr
    g.fillRect(x - rad, y - rad, 2 * rad, 2 * rad)
  }
  if (path > 0) {
    const pw = (path / w) * W
    const x0 = W / 2 - pw / 2
    for (let y = 0; y < H; y += 4) {
      const wob = Math.sin(y / 37) * 6 + Math.sin(y / 11) * 2
      g.fillStyle = look.ground.path
      g.globalAlpha = 0.85
      g.fillRect(x0 + wob, y, pw, 4)
    }
    g.globalAlpha = 1
    // D5: os sulcos do trilho (Cânion), rentes às duas beiras do caminho
    if (look.ground.track) {
      g.fillStyle = look.ground.track
      g.globalAlpha = 0.55
      for (let y = 0; y < H; y += 4) {
        const wob = Math.sin(y / 37) * 6 + Math.sin(y / 11) * 2
        g.fillRect(x0 + wob + pw * 0.14, y, 3, 4)
        g.fillRect(x0 + wob + pw * 0.86 - 3, y, 3, 4)
      }
      g.globalAlpha = 1
    }
    // pedras pisadas no caminho
    for (let i = 0; i < 90; i++) {
      g.fillStyle = `rgba(150,140,120,${0.18 + r() * 0.2})`
      g.beginPath()
      g.ellipse(x0 + r() * pw, r() * H, 3 + r() * 7, 2 + r() * 5, r() * 3, 0, Math.PI * 2)
      g.fill()
    }
  }
  // folhas e cogumelinhos acesos
  for (let i = 0; i < 70; i++) {
    g.fillStyle = r() < 0.6 ? look.ground.glow : "rgba(176,106,255,0.9)"
    g.globalAlpha = 0.35 + r() * 0.45
    g.beginPath()
    g.ellipse(r() * W, r() * H, 1.5 + r() * 2.5, 2.5 + r() * 3.5, r() * 3, 0, Math.PI * 2)
    g.fill()
  }
  g.globalAlpha = 1
  tex.update(true)
  tex.wrapU = Texture.WRAP_ADDRESSMODE
  tex.wrapV = Texture.WRAP_ADDRESSMODE
  tex.vScale = rep
  tex.anisotropicFilteringLevel = 4
  const mat = new StandardMaterial(`${name}-mat`, scene)
  mat.diffuseTexture = tex
  mat.specularColor = new Color3(0, 0, 0)
  mat.emissiveColor = new Color3(0.08, 0.1, 0.1)
  const mesh = CreateGround(name, { width: w, height: d }, scene)
  mesh.position.set(cx, 0, cz)
  mesh.material = mat
  mesh.isPickable = false
  mesh.freezeWorldMatrix()
  mat.freeze()
  return {
    mesh,
    dispose() {
      mesh.dispose()
      mat.dispose()
      tex.dispose()
    },
  }
}
