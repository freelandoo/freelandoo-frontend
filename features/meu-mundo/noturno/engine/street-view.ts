// features/meu-mundo/noturno/engine/street-view.ts — ROLÊ NOTURNO (mm3d-40): a rua de noite.
//
// Tudo anda junto com o jogador sem criar nada novo: o asfalto e as calçadas
// são uma faixa longa que pula de 12 em 12 m (a textura repete no mesmo
// passo, então ninguém vê o pulo); prédios, letreiros, postes, poças de luz
// e faixas de pedestre são INSTÂNCIAS FINAS em vagas de passo fixo — quando o
// jogador avança uma vaga, os buffers são refeitos (umas 2 vezes por segundo).
// Sem luz de verdade nos postes: a poça no chão é uma textura somada (barato
// no celular). Céu estrelado e lua fora da neblina.
//
// mm3d-42 (pedido do Alex: "redesign, outdoors, aprimoramento"): OUTDOORS
// acesos no alto de alguns prédios (virados para quem vem), PÓRTICOS de LED
// atravessando a avenida com a marca a cada 240 m, e o neon dos letreiros
// refletido no asfalto molhado (faixa somada no chão, na cor do letreiro). As
// artes são as da Antigravidade (corrida/engine/billboards.ts).
//
// mm3d-55 — STEAMPUNK: rua de paralelepípedo escuro e molhado com faixas de
// latão e marfim, calçada de lajes, prédios de TIJOLO com janelas em arco
// (luz de lampião, sem azul), letreiros de latão aceso no lugar do neon,
// marquises de cobre, vitrines âmbar, postes de ferro com lanterna a gás,
// pórticos de ferro com engrenagens de latão e o friso âmbar, céu de cobre e
// fumaça com a lua e a neblina quente.

import type { Scene } from "@babylonjs/core/scene"
import "@babylonjs/core/Meshes/thinInstanceMesh"
import type { Mesh } from "@babylonjs/core/Meshes/mesh"
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial"
import { DynamicTexture } from "@babylonjs/core/Materials/Textures/dynamicTexture"
import { Texture } from "@babylonjs/core/Materials/Textures/texture"
import { Color3, Color4 } from "@babylonjs/core/Maths/math.color"
import { Matrix, Quaternion, Vector3, Vector4 } from "@babylonjs/core/Maths/math.vector"
import { CreateBox } from "@babylonjs/core/Meshes/Builders/boxBuilder"
import { CreateGround } from "@babylonjs/core/Meshes/Builders/groundBuilder"
import { CreatePlane } from "@babylonjs/core/Meshes/Builders/planeBuilder"
import { CreateSphere } from "@babylonjs/core/Meshes/Builders/sphereBuilder"
import { CreateCylinder } from "@babylonjs/core/Meshes/Builders/cylinderBuilder"
import { Constants } from "@babylonjs/core/Engines/constants"
import { ARTS } from "../../corrida/engine/billboards"
import { SteamGeo, facing } from "../../engine/steampunk/geo"
import { SP } from "../../engine/steampunk/palette"

/** Passo da textura do asfalto (m): a faixa longa pula de tanto em tanto. */
const TILE = 12
const ROAD_LEN = TILE * 36
const BEHIND = 36
export const ROAD_HALF = 4
const WALK = 3.6
const CURB = 0.16
/** Prédios: vagas de 12 m de cada lado. */
const B_PITCH = 12
const B_SLOTS = 36
const B_HEIGHTS = [10, 17, 26] as const
const B_X = ROAD_HALF + WALK + 6.6
const B_DEPTH = 12
const B_WIDTH = 11
/** Textura das janelas: 4 colunas × 8 andares cobrem 11 × 27,2 m. */
const WIN_H = 27.2
const L_PITCH = 24
const L_SLOTS = 19
const POLE_X = ROAD_HALF + 1.0
/** Pórtico de LED sobre a avenida: de tantos em tantos metros. */
const G_PITCH = 240
const G_SLOTS = 3
/** Outdoor no telhado: tamanho do painel. */
const BB_W = 10
const BB_H = 5

const hash = (k: number, s: number) => {
  let h = Math.imul(k ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul(s + 17, 0xc2b2ae35)
  h ^= h >>> 13
  h = Math.imul(h, 0x27d4eb2d)
  h ^= h >>> 15
  return (h >>> 0) / 4294967296
}

function asphaltTexture(scene: Scene) {
  const tex = new DynamicTexture("noturno-road", { width: 256, height: 512 }, scene, true)
  const c = tex.getContext() as CanvasRenderingContext2D
  c.fillStyle = "#1c1916"
  c.fillRect(0, 0, 256, 512)
  // paralelepípedos em fiadas desencontradas (cada pedra num tom), rejunte escuro
  for (let r = 0; r < 32; r++) {
    const off = r % 2 ? 7 : 0
    for (let x = -off; x < 256; x += 15) {
      const v = 48 + Math.floor(Math.random() * 26)
      c.fillStyle = `rgb(${v + 4},${v},${v - 4})`
      c.fillRect(x + 1.5, r * 16 + 1.5, 12, 13)
      c.fillStyle = "rgba(255,230,190,0.05)"
      c.fillRect(x + 2, r * 16 + 2, 11, 3)
    }
  }
  // poça escura
  c.fillStyle = "rgba(8,6,5,0.35)"
  c.fillRect(150, 300, 50, 90)
  // bordas contínuas (amarelo à esquerda, branco à direita) e divisórias tracejadas
  const u = (x: number) => ((x + ROAD_HALF) / (2 * ROAD_HALF)) * 256
  c.fillStyle = "#c69a37"
  c.fillRect(u(-ROAD_HALF) + 5, 0, 5, 512)
  c.fillStyle = "#e6dcc4"
  c.fillRect(u(ROAD_HALF) - 10, 0, 5, 512)
  for (const x of [-1.25, 1.25]) c.fillRect(u(x) - 3, 40, 6, 210)
  tex.update(true)
  tex.wrapU = Texture.CLAMP_ADDRESSMODE
  tex.anisotropicFilteringLevel = 8
  return tex
}

function walkTexture(scene: Scene) {
  const tex = new DynamicTexture("noturno-walk", { width: 128, height: 128 }, scene, true)
  const c = tex.getContext() as CanvasRenderingContext2D
  c.fillStyle = "#6b6156"
  c.fillRect(0, 0, 128, 128)
  c.strokeStyle = "#433b33"
  c.lineWidth = 3
  for (let i = 0; i <= 128; i += 32) {
    c.beginPath()
    c.moveTo(i, 0)
    c.lineTo(i, 128)
    c.moveTo(0, i)
    c.lineTo(128, i)
    c.stroke()
  }
  tex.update(true)
  return tex
}

/** Janelas: `lit` = só as acesas (emissivo), senão a fachada (parede clara, vidro escuro). */
function windowTexture(scene: Scene, seed: number, lit: boolean) {
  const W = 256
  const H = 512
  const tex = new DynamicTexture(`noturno-win-${seed}-${lit ? "l" : "d"}`, { width: W, height: H }, scene, true)
  const c = tex.getContext() as CanvasRenderingContext2D
  c.fillStyle = lit ? "#000" : "#b46a4a"
  c.fillRect(0, 0, W, H)
  if (!lit) {
    // fiadas de tijolo (rejunte claro) e uma cinta de cantaria por andar
    c.fillStyle = "rgba(60,30,20,0.45)"
    for (let y = 0; y < H; y += 8) c.fillRect(0, y, W, 1.5)
    for (let y = 0; y < H; y += 8) for (let x = (y / 8) % 2 ? 8 : 0; x < W; x += 16) c.fillRect(x, y, 1.5, 8)
    c.fillStyle = "#cdbb9c"
    for (let r = 0; r < 8; r++) c.fillRect(0, r * (H / 8), W, 4)
  }
  const cols = 4
  const rows = 8
  const cw = W / cols
  const rh = H / rows
  let s = seed * 9973
  const rnd = () => {
    s = (s * 16807) % 2147483647
    return s / 2147483647
  }
  for (let r = 0; r < rows; r++) {
    for (let k = 0; k < cols; k++) {
      const x = k * cw + cw * 0.18
      const y = r * rh + rh * 0.22
      const w = cw * 0.64
      const h = rh * 0.5
      const on = rnd() < 0.42
      if (lit) {
        if (!on) continue
        // lampião: âmbar, mel e cobre (nenhum azul)
        const t = rnd()
        c.fillStyle = t < 0.6 ? `rgb(255,${180 + Math.floor(rnd() * 40)},${90 + Math.floor(rnd() * 40)})` : t < 0.85 ? `rgb(255,${210 + Math.floor(rnd() * 30)},${140 + Math.floor(rnd() * 40)})` : `rgb(235,${120 + Math.floor(rnd() * 30)},60)`
        c.fillRect(x, y + h * 0.18, w, h * 0.82)
        c.beginPath()
        c.arc(x + w / 2, y + h * 0.2, w / 2, Math.PI, 0)
        c.fill()
        // cortina: metade de baixo mais fraca
        c.fillStyle = "rgba(0,0,0,0.35)"
        c.fillRect(x, y + h * 0.62, w, h * 0.38)
      } else {
        // janela em arco: vidro escuro, caixilho de ferro e o peitoril de pedra
        c.fillStyle = "#cdbb9c"
        c.beginPath()
        c.arc(x + w / 2, y + h * 0.2, w / 2 + 4, Math.PI, 0)
        c.fill()
        c.fillStyle = "#231d18"
        c.fillRect(x, y + h * 0.18, w, h * 0.82)
        c.beginPath()
        c.arc(x + w / 2, y + h * 0.2, w / 2, Math.PI, 0)
        c.fill()
        c.fillStyle = "#3a332c"
        c.fillRect(x + w / 2 - 1.5, y, 3, h)
        c.fillRect(x, y + h * 0.55, w, 3)
        c.fillStyle = "#cdbb9c"
        c.fillRect(x - 4, y + h, w + 8, 6)
      }
    }
  }
  tex.update(true)
  return tex
}

function glowTexture(scene: Scene, name: string, inner: string) {
  const tex = new DynamicTexture(name, { width: 128, height: 128 }, scene, true)
  const c = tex.getContext() as CanvasRenderingContext2D
  const g = c.createRadialGradient(64, 64, 2, 64, 64, 64)
  g.addColorStop(0, inner)
  g.addColorStop(0.45, "rgba(255,190,110,0.35)")
  g.addColorStop(1, "rgba(0,0,0,0)")
  c.fillStyle = g
  c.fillRect(0, 0, 128, 128)
  tex.hasAlpha = true
  tex.update(true)
  return tex
}

function skyTexture(scene: Scene) {
  const tex = new DynamicTexture("noturno-sky", { width: 512, height: 512 }, scene, true)
  const c = tex.getContext() as CanvasRenderingContext2D
  const g = c.createLinearGradient(0, 0, 0, 512)
  g.addColorStop(0, "#07050a")
  g.addColorStop(0.42, "#1a100e")
  g.addColorStop(0.5, "#3a2014")
  g.addColorStop(0.56, "#24150f")
  g.addColorStop(1, "#0a0706")
  c.fillStyle = g
  c.fillRect(0, 0, 512, 512)
  for (let i = 0; i < 520; i++) {
    const y = Math.random() * 230
    const a = 0.35 + Math.random() * 0.65
    c.fillStyle = `rgba(255,255,${200 + Math.floor(Math.random() * 55)},${a})`
    const s = Math.random() < 0.08 ? 2 : 1
    c.fillRect(Math.random() * 512, y, s, s)
  }
  tex.update(true)
  return tex
}

function moonTexture(scene: Scene) {
  const tex = new DynamicTexture("noturno-moon", { width: 256, height: 256 }, scene, true)
  const c = tex.getContext() as CanvasRenderingContext2D
  const halo = c.createRadialGradient(128, 128, 40, 128, 128, 128)
  halo.addColorStop(0, "rgba(255,220,170,0.32)")
  halo.addColorStop(1, "rgba(255,220,170,0)")
  c.fillStyle = halo
  c.fillRect(0, 0, 256, 256)
  c.fillStyle = "#f3f1e4"
  c.beginPath()
  c.arc(128, 128, 44, 0, Math.PI * 2)
  c.fill()
  c.fillStyle = "rgba(170,170,160,0.45)"
  for (const [x, y, r] of [[112, 116, 9], [142, 140, 12], [134, 104, 6], [116, 146, 5]]) {
    c.beginPath()
    c.arc(x, y, r, 0, Math.PI * 2)
    c.fill()
  }
  tex.hasAlpha = true
  tex.update(true)
  return tex
}

function zebraTexture(scene: Scene) {
  const tex = new DynamicTexture("noturno-zebra", { width: 256, height: 64 }, scene, true)
  const c = tex.getContext() as CanvasRenderingContext2D
  c.clearRect(0, 0, 256, 64)
  c.fillStyle = "rgba(235,238,242,0.85)"
  for (let i = 0; i < 8; i++) c.fillRect(i * 32 + 6, 0, 20, 64)
  tex.hasAlpha = true
  tex.update(true)
  return tex
}

/** Cores das fachadas e dos letreiros. */
// mm3d-55: tons de tijolo e cantaria (multiplicam a textura de tijolo, de noite).
const WALLS: [number, number, number][] = [
  [0.62, 0.52, 0.46],
  [0.7, 0.5, 0.42],
  [0.54, 0.5, 0.46],
  [0.68, 0.6, 0.52],
  [0.5, 0.42, 0.38],
  [0.6, 0.54, 0.48],
]
/** Letreiros: latão e cobre acesos (lampião), não neon. */
const NEONS: [number, number, number][] = [
  [1, 0.72, 0.3],
  [0.95, 0.5, 0.2],
  [1, 0.86, 0.52],
  [0.86, 0.6, 0.26],
  [0.92, 0.4, 0.2],
]

/** Arte de outdoor numa textura (a da marca redesenha quando a imagem do logo chega). */
function artTexture(scene: Scene, k: number, logo: HTMLImageElement | null) {
  const tex = new DynamicTexture(`noturno-outdoor-${k}`, { width: 1024, height: 512 }, scene, true)
  ARTS[k](tex.getContext() as CanvasRenderingContext2D, 1024, 512, logo)
  tex.update(true)
  return tex
}

/** Faixa de reflexo no asfalto: mais forte no meio, some nas pontas. */
function reflexTexture(scene: Scene) {
  const tex = new DynamicTexture("noturno-reflex", { width: 64, height: 256 }, scene, true)
  const c = tex.getContext() as CanvasRenderingContext2D
  const g = c.createRadialGradient(32, 128, 2, 32, 128, 128)
  g.addColorStop(0, "rgba(255,255,255,0.75)")
  g.addColorStop(0.35, "rgba(255,255,255,0.3)")
  g.addColorStop(1, "rgba(255,255,255,0)")
  c.fillStyle = g
  c.fillRect(0, 0, 64, 256)
  // estrias de poça (o reflexo quebra no asfalto)
  c.globalCompositeOperation = "destination-out"
  for (let y = 0; y < 256; y += 9) {
    c.fillStyle = `rgba(0,0,0,${0.25 + Math.random() * 0.4})`
    c.fillRect(0, y, 64, 3 + Math.random() * 3)
  }
  tex.hasAlpha = true
  tex.update(true)
  return tex
}

export interface StreetView {
  /** Põe a rua no lugar para o jogador em `z`; `cam` = posição da câmera (céu e lua). */
  update(z: number, cam: Vector3): void
  neon: Mesh[]
  dispose(): void
}

export function buildStreet(scene: Scene, low: boolean): StreetView {
  const owned: { dispose(): void }[] = []
  const own = <T extends { dispose(): void }>(x: T) => {
    owned.push(x)
    return x
  }

  // ── asfalto e calçadas ─────────────────────────────────────────────────────
  const roadMat = own(new StandardMaterial("noturno-road", scene))
  const roadTex = own(asphaltTexture(scene))
  roadTex.vScale = ROAD_LEN / TILE
  roadMat.diffuseTexture = roadTex
  roadMat.emissiveColor = new Color3(0.34, 0.31, 0.28)
  // pedra molhada: brilho do lampião
  roadMat.specularColor = new Color3(0.2, 0.16, 0.1)
  const road = own(CreateGround("noturno-road", { width: ROAD_HALF * 2, height: ROAD_LEN }, scene))
  road.material = roadMat
  road.isPickable = false

  const walkMat = own(new StandardMaterial("noturno-walk", scene))
  const walkTex = own(walkTexture(scene))
  walkTex.uScale = WALK / 2
  walkTex.vScale = ROAD_LEN / 2
  walkMat.diffuseTexture = walkTex
  walkMat.emissiveColor = new Color3(0.24, 0.21, 0.18)
  walkMat.specularColor = new Color3(0, 0, 0)
  const curbMat = own(new StandardMaterial("noturno-curb", scene))
  curbMat.diffuseColor = new Color3(0.7, 0.62, 0.5)
  curbMat.emissiveColor = new Color3(0.28, 0.24, 0.2)
  curbMat.specularColor = new Color3(0, 0, 0)
  const walks: Mesh[] = []
  for (const s of [-1, 1]) {
    const w = own(CreateGround(`noturno-walk-${s}`, { width: WALK, height: ROAD_LEN }, scene))
    w.material = walkMat
    w.position.x = s * (ROAD_HALF + WALK / 2)
    w.position.y = CURB
    w.isPickable = false
    walks.push(w)
    const curb = own(CreateBox(`noturno-curb-${s}`, { width: 0.22, height: CURB, depth: ROAD_LEN }, scene))
    curb.material = curbMat
    curb.position.x = s * (ROAD_HALF + 0.11)
    curb.position.y = CURB / 2
    curb.isPickable = false
    walks.push(curb)
  }

  // ── prédios: 3 alturas × 2 padrões de janela, vagas dos dois lados ─────────
  const variants: { mesh: Mesh; h: number; m: Float32Array; c: Float32Array }[] = []
  for (let pat = 0; pat < 2; pat++) {
    const mat = own(new StandardMaterial(`noturno-bld-${pat}`, scene))
    mat.diffuseTexture = own(windowTexture(scene, 11 + pat * 7, false))
    mat.emissiveTexture = own(windowTexture(scene, 11 + pat * 7, true))
    // o emissivo SOMA por cima (senão é multiplicado pela difusa, onde a janela é escura)
    mat.useEmissiveAsIllumination = true
    mat.specularColor = new Color3(0, 0, 0)
    mat.ambientColor = new Color3(0.24, 0.2, 0.18)
    for (const h of B_HEIGHTS) {
      const v = h / WIN_H
      const side = new Vector4(0, 0, 1, v)
      const top = new Vector4(0.01, 0.99, 0.02, 1)
      const mesh = own(CreateBox(`noturno-bld-${pat}-${h}`, { width: B_DEPTH, height: h, depth: B_WIDTH, faceUV: [side, side, side, side, top, top], wrap: true }, scene))
      mesh.material = mat
      mesh.isPickable = false
      mesh.alwaysSelectAsActiveMesh = true
      const m = new Float32Array(B_SLOTS * 2 * 16)
      const c = new Float32Array(B_SLOTS * 2 * 4).fill(1)
      mesh.thinInstanceSetBuffer("matrix", m, 16, false)
      mesh.thinInstanceSetBuffer("color", c, 4, false)
      variants.push({ mesh, h, m, c })
    }
  }
  // letreiros neon na altura da loja (um por prédio, às vezes nenhum)
  const neonMat = own(new StandardMaterial("noturno-neon", scene))
  neonMat.disableLighting = true
  neonMat.emissiveColor = new Color3(1, 1, 1)
  const neon = own(CreateBox("noturno-neon", { width: 0.25, height: 1, depth: 1 }, scene))
  neon.material = neonMat
  neon.isPickable = false
  neon.alwaysSelectAsActiveMesh = true
  const neonM = new Float32Array(B_SLOTS * 2 * 16)
  const neonC = new Float32Array(B_SLOTS * 2 * 4).fill(1)
  neon.thinInstanceSetBuffer("matrix", neonM, 16, false)
  neon.thinInstanceSetBuffer("color", neonC, 4, false)
  // marquise escura em cima da loja
  const awnMat = own(new StandardMaterial("noturno-awn", scene))
  // marquise de cobre
  awnMat.diffuseColor = new Color3(0.36, 0.2, 0.12)
  awnMat.emissiveColor = new Color3(0.06, 0.03, 0.02)
  awnMat.specularColor = new Color3(0, 0, 0)
  const awn = own(CreateBox("noturno-awn", { width: 1.4, height: 0.25, depth: B_WIDTH - 1 }, scene))
  awn.material = awnMat
  awn.isPickable = false
  awn.alwaysSelectAsActiveMesh = true
  const awnM = new Float32Array(B_SLOTS * 2 * 16)
  awn.thinInstanceSetBuffer("matrix", awnM, 16, false)
  // vitrine acesa embaixo
  const shopMat = own(new StandardMaterial("noturno-shop", scene))
  shopMat.disableLighting = true
  shopMat.emissiveColor = new Color3(1, 1, 1)
  const shop = own(CreatePlane("noturno-shop", { width: B_WIDTH - 2.4, height: 2.4 }, scene))
  shop.material = shopMat
  shop.isPickable = false
  shop.alwaysSelectAsActiveMesh = true
  const shopM = new Float32Array(B_SLOTS * 2 * 16)
  const shopC = new Float32Array(B_SLOTS * 2 * 4).fill(1)
  shop.thinInstanceSetBuffer("matrix", shopM, 16, false)
  shop.thinInstanceSetBuffer("color", shopC, 4, false)

  // reflexo do letreiro no asfalto molhado (um por letreiro, na cor dele)
  const reflexMat = own(new StandardMaterial("noturno-reflex", scene))
  reflexMat.disableLighting = true
  reflexMat.emissiveColor = new Color3(1, 1, 1)
  const reflexTex = own(reflexTexture(scene))
  reflexMat.diffuseTexture = reflexTex
  reflexMat.opacityTexture = reflexTex
  reflexMat.alphaMode = Constants.ALPHA_ADD
  reflexMat.disableDepthWrite = true
  reflexMat.zOffset = -3
  const reflex = own(CreateGround("noturno-reflex", { width: 1.4, height: 1 }, scene))
  reflex.material = reflexMat
  reflex.isPickable = false
  reflex.alwaysSelectAsActiveMesh = true
  const reflexM = new Float32Array(B_SLOTS * 2 * 16)
  const reflexC = new Float32Array(B_SLOTS * 2 * 4).fill(1)
  reflex.thinInstanceSetBuffer("matrix", reflexM, 16, false)
  reflex.thinInstanceSetBuffer("color", reflexC, 4, false)

  // outdoors no telhado: um painel por arte (instâncias finas) + moldura de neon atrás
  const logoImg = typeof Image !== "undefined" ? new Image() : null
  const artMats: StandardMaterial[] = []
  const boards: { mesh: Mesh; m: Float32Array }[] = []
  for (let k = 0; k < ARTS.length; k++) {
    const mat = own(new StandardMaterial(`noturno-outdoor-${k}`, scene))
    mat.diffuseColor = new Color3(0, 0, 0)
    mat.specularColor = new Color3(0, 0, 0)
    mat.emissiveTexture = own(artTexture(scene, k, null))
    mat.disableLighting = true
    artMats.push(mat)
    const mesh = own(CreatePlane(`noturno-outdoor-${k}`, { width: BB_W, height: BB_H }, scene))
    mesh.material = mat
    mesh.isPickable = false
    mesh.alwaysSelectAsActiveMesh = true
    const m = new Float32Array(B_SLOTS * 2 * 16)
    mesh.thinInstanceSetBuffer("matrix", m, 16, false)
    boards.push({ mesh, m })
  }
  const frameMat = own(new StandardMaterial("noturno-outdoor-frame", scene))
  frameMat.disableLighting = true
  frameMat.emissiveColor = new Color3(1, 1, 1)
  const frame = own(CreateBox("noturno-outdoor-frame", { width: BB_W + 0.6, height: BB_H + 0.6, depth: 0.3 }, scene))
  frame.material = frameMat
  frame.isPickable = false
  frame.alwaysSelectAsActiveMesh = true
  const frameM = new Float32Array(B_SLOTS * 2 * 16)
  const frameC = new Float32Array(B_SLOTS * 2 * 4).fill(1)
  frame.thinInstanceSetBuffer("matrix", frameM, 16, false)
  frame.thinInstanceSetBuffer("color", frameC, 4, false)
  const legMat = own(new StandardMaterial("noturno-outdoor-leg", scene))
  legMat.diffuseColor = new Color3(0.16, 0.14, 0.13)
  legMat.emissiveColor = new Color3(0.06, 0.05, 0.04)
  legMat.specularColor = new Color3(0, 0, 0)
  const leg = own(CreateBox("noturno-outdoor-leg", { width: 0.3, height: 1, depth: 0.3 }, scene))
  leg.bakeTransformIntoVertices(Matrix.Translation(0, 0.5, 0))
  leg.material = legMat
  leg.isPickable = false
  leg.alwaysSelectAsActiveMesh = true
  const legM = new Float32Array(B_SLOTS * 2 * 2 * 16)
  leg.thinInstanceSetBuffer("matrix", legM, 16, false)

  // pórticos de LED sobre a avenida: dois pilares, a viga e o painel com a marca
  const gPost = own(CreateBox("noturno-gantry-post", { width: 0.45, height: 1, depth: 0.45 }, scene))
  gPost.bakeTransformIntoVertices(Matrix.Translation(0, 0.5, 0))
  gPost.material = legMat
  gPost.isPickable = false
  gPost.alwaysSelectAsActiveMesh = true
  const gPostM = new Float32Array(G_SLOTS * 2 * 16)
  gPost.thinInstanceSetBuffer("matrix", gPostM, 16, false)
  const gBeam = own(CreateBox("noturno-gantry-beam", { width: ROAD_HALF * 2 + 3.2, height: 0.5, depth: 0.5 }, scene))
  gBeam.material = legMat
  gBeam.isPickable = false
  gBeam.alwaysSelectAsActiveMesh = true
  const gBeamM = new Float32Array(G_SLOTS * 16)
  gBeam.thinInstanceSetBuffer("matrix", gBeamM, 16, false)
  const gStripMat = own(new StandardMaterial("noturno-gantry-strip", scene))
  gStripMat.disableLighting = true
  gStripMat.emissiveColor = new Color3(1, 0.68, 0.28)
  const gStrip = own(CreateBox("noturno-gantry-strip", { width: 7.4, height: 0.12, depth: 0.12 }, scene))
  gStrip.material = gStripMat
  gStrip.isPickable = false
  gStrip.alwaysSelectAsActiveMesh = true
  const gStripM = new Float32Array(G_SLOTS * 2 * 16)
  gStrip.thinInstanceSetBuffer("matrix", gStripM, 16, false)
  const gearMat = own(new StandardMaterial("noturno-gantry-gear", scene))
  gearMat.diffuseColor = new Color3(1, 1, 1)
  gearMat.specularColor = new Color3(0.4, 0.32, 0.18)
  gearMat.emissiveColor = new Color3(0.12, 0.08, 0.03)
  const gg = new SteamGeo()
  gg.gear(0.9, 0.18, 12, facing(0, 0, 0), SP.brass, SP.bronze)
  const gGear = own(gg.build("noturno-gantry-gear", scene, gearMat, false))
  gGear.isPickable = false
  gGear.alwaysSelectAsActiveMesh = true
  const gGearM = new Float32Array(G_SLOTS * 3 * 16)
  gGear.thinInstanceSetBuffer("matrix", gGearM, 16, false)
  const gPanel = own(CreatePlane("noturno-gantry-panel", { width: 7, height: 3.5 }, scene))
  gPanel.material = artMats[0]
  gPanel.isPickable = false
  gPanel.alwaysSelectAsActiveMesh = true
  const gPanelM = new Float32Array(G_SLOTS * 16)
  gPanel.thinInstanceSetBuffer("matrix", gPanelM, 16, false)
  if (logoImg) {
    logoImg.onload = () => {
      const tex = artMats[0]?.emissiveTexture as DynamicTexture | null
      if (!tex || !tex.getScene()) return
      ARTS[0](tex.getContext() as CanvasRenderingContext2D, 1024, 512, logoImg)
      tex.update(true)
    }
    logoImg.src = "/freelandoo-logo.png"
  }

  // ── postes, poças de luz e faixas de pedestre ─────────────────────────────
  const poleMat = own(new StandardMaterial("noturno-pole", scene))
  poleMat.diffuseColor = new Color3(0.18, 0.16, 0.15)
  poleMat.emissiveColor = new Color3(0.07, 0.06, 0.05)
  poleMat.specularColor = new Color3(0, 0, 0)
  const pole = own(CreateCylinder("noturno-pole", { height: 6.6, diameterTop: 0.14, diameterBottom: 0.2, tessellation: 8 }, scene))
  pole.material = poleMat
  pole.isPickable = false
  pole.alwaysSelectAsActiveMesh = true
  const arm = own(CreateBox("noturno-arm", { width: 2.2, height: 0.1, depth: 0.12 }, scene))
  arm.material = poleMat
  arm.isPickable = false
  arm.alwaysSelectAsActiveMesh = true
  const headMat = own(new StandardMaterial("noturno-lamp", scene))
  headMat.disableLighting = true
  headMat.emissiveColor = new Color3(1, 0.76, 0.4)
  // lanterna a gás: a caixa de vidro âmbar pendurada no braço
  const head = own(CreateBox("noturno-head", { width: 0.42, height: 0.5, depth: 0.42 }, scene))
  head.material = headMat
  head.isPickable = false
  head.alwaysSelectAsActiveMesh = true
  const poolMat = own(new StandardMaterial("noturno-pool", scene))
  poolMat.disableLighting = true
  poolMat.emissiveColor = new Color3(1, 0.74, 0.42)
  poolMat.diffuseTexture = own(glowTexture(scene, "noturno-pool", "rgba(255,214,150,0.55)"))
  poolMat.diffuseTexture.hasAlpha = true
  poolMat.useAlphaFromDiffuseTexture = true
  poolMat.opacityTexture = poolMat.diffuseTexture
  poolMat.alphaMode = Constants.ALPHA_ADD
  poolMat.disableDepthWrite = true
  const pool = own(CreateGround("noturno-pool", { width: 8, height: 8 }, scene))
  pool.material = poolMat
  pool.isPickable = false
  pool.alwaysSelectAsActiveMesh = true
  const zebraMat = own(new StandardMaterial("noturno-zebra", scene))
  zebraMat.diffuseTexture = own(zebraTexture(scene))
  zebraMat.diffuseTexture.hasAlpha = true
  zebraMat.useAlphaFromDiffuseTexture = true
  zebraMat.emissiveColor = new Color3(0.4, 0.4, 0.42)
  zebraMat.specularColor = new Color3(0, 0, 0)
  zebraMat.zOffset = -2
  const zebra = own(CreateGround("noturno-zebra", { width: ROAD_HALF * 2 - 0.6, height: 3.2 }, scene))
  zebra.material = zebraMat
  zebra.isPickable = false
  zebra.alwaysSelectAsActiveMesh = true
  const nL = L_SLOTS * 2
  const poleM = new Float32Array(nL * 16)
  const armM = new Float32Array(nL * 16)
  const headM = new Float32Array(nL * 16)
  const poolM = new Float32Array(nL * 16)
  const zebraM = new Float32Array(3 * 16)
  pole.thinInstanceSetBuffer("matrix", poleM, 16, false)
  arm.thinInstanceSetBuffer("matrix", armM, 16, false)
  head.thinInstanceSetBuffer("matrix", headM, 16, false)
  pool.thinInstanceSetBuffer("matrix", poolM, 16, false)
  zebra.thinInstanceSetBuffer("matrix", zebraM, 16, false)

  // ── céu e lua ──────────────────────────────────────────────────────────────
  const skyMat = own(new StandardMaterial("noturno-sky", scene))
  skyMat.disableLighting = true
  skyMat.backFaceCulling = false
  skyMat.emissiveTexture = own(skyTexture(scene))
  skyMat.fogEnabled = false
  const sky = own(CreateSphere("noturno-sky", { diameter: 900, segments: 12 }, scene))
  sky.material = skyMat
  sky.infiniteDistance = true
  sky.isPickable = false
  sky.rotation.x = Math.PI
  const moonMat = own(new StandardMaterial("noturno-moon", scene))
  moonMat.disableLighting = true
  moonMat.emissiveColor = new Color3(1, 1, 1)
  moonMat.diffuseTexture = own(moonTexture(scene))
  moonMat.diffuseTexture.hasAlpha = true
  moonMat.useAlphaFromDiffuseTexture = true
  moonMat.opacityTexture = moonMat.diffuseTexture
  moonMat.emissiveTexture = moonMat.diffuseTexture
  moonMat.fogEnabled = false
  moonMat.disableDepthWrite = true
  const moon = own(CreatePlane("noturno-moon", { size: 70 }, scene))
  moon.material = moonMat
  moon.billboardMode = 7
  moon.isPickable = false

  // ── encaixe nas vagas ──────────────────────────────────────────────────────
  const mtx = new Matrix()
  const q = new Quaternion()
  const one = new Vector3(1, 1, 1)
  const zero = new Vector3(0, 0, 0)
  const at = new Vector3()
  const sc = new Vector3()
  const put = (buf: Float32Array, i: number, x: number, y: number, z: number, rotY = 0, s: Vector3 = one) => {
    Quaternion.RotationYawPitchRollToRef(rotY, 0, 0, q)
    at.set(x, y, z)
    Matrix.ComposeToRef(s, q, at, mtx)
    mtx.copyToArray(buf, i * 16)
  }
  const hide = (buf: Float32Array, i: number) => {
    at.set(0, -500, 0)
    Matrix.ComposeToRef(zero, Quaternion.Identity(), at, mtx)
    mtx.copyToArray(buf, i * 16)
  }

  let bK = Number.NaN
  const placeBuildings = (k0: number) => {
    for (let side = 0; side < 2; side++) {
      const s = side ? 1 : -1
      for (let j = 0; j < B_SLOTS; j++) {
        const k = k0 + j
        const i = side * B_SLOTS + j
        const z = k * B_PITCH + B_PITCH / 2
        const r = hash(k, side)
        // às vezes um vão (beco) sem prédio
        const gap = hash(k, side + 9) < 0.08
        const vi = Math.floor(r * 3) + (hash(k, side + 3) < 0.5 ? 0 : 3)
        const wall = WALLS[Math.floor(hash(k, side + 5) * WALLS.length)]
        for (let v = 0; v < variants.length; v++) {
          const V = variants[v]
          if (v !== vi || gap) {
            hide(V.m, i)
            continue
          }
          put(V.m, i, s * B_X, V.h / 2, z)
          V.c.set([wall[0], wall[1], wall[2], 1], i * 4)
        }
        const face = s * (B_X - B_DEPTH / 2)
        const hasSign = !gap && hash(k, side + 13) < 0.7
        if (hasSign) {
          const ncol = NEONS[Math.floor(hash(k, side + 21) * NEONS.length)]
          const len = 2.5 + hash(k, side + 23) * 4
          const nz = z + (hash(k, side + 25) - 0.5) * 3
          sc.set(1, 0.8, len)
          put(neonM, i, face - s * 0.2, 3.6, nz, 0, sc)
          neonC.set([ncol[0], ncol[1], ncol[2], 1], i * 4)
          // o reflexo esticado no asfalto, perto do meio-fio do lado do letreiro
          sc.set(1.3, 1, len * 2.2)
          put(reflexM, i, s * (ROAD_HALF - 0.9), 0.02, nz, 0, sc)
          reflexC.set([ncol[0] * 0.55, ncol[1] * 0.55, ncol[2] * 0.55, 1], i * 4)
        } else {
          hide(neonM, i)
          hide(reflexM, i)
        }
        // outdoor aceso no telhado (de vez em quando), virado para quem vem e um pouco para a rua
        const bh = B_HEIGHTS[Math.floor(r * 3)]
        const art = Math.floor(hash(k, side + 43) * ARTS.length)
        const hasBoard = !gap && hash(k, side + 41) < 0.24
        for (let a = 0; a < boards.length; a++) {
          if (!hasBoard || a !== art) hide(boards[a].m, i)
        }
        if (hasBoard) {
          const yaw = s * 0.5
          const bx = s * (B_X - 2.4)
          const by = bh + 1.4 + BB_H / 2
          put(boards[art].m, i, bx, by, z, yaw)
          // a moldura fica 0,2 m atrás do painel (o painel olha para −z)
          put(frameM, i, bx + Math.sin(yaw) * 0.2, by, z + Math.cos(yaw) * 0.2, yaw)
          const fc = NEONS[Math.floor(hash(k, side + 45) * NEONS.length)]
          frameC.set([fc[0], fc[1], fc[2], 1], i * 4)
          for (const lx of [-1, 1]) {
            sc.set(1, 1.4 + 0.2, 1)
            put(legM, i * 2 + (lx > 0 ? 1 : 0), bx + Math.cos(yaw) * lx * BB_W * 0.33, bh, z - Math.sin(yaw) * lx * BB_W * 0.33 + 0.3, yaw, sc)
          }
        } else {
          hide(frameM, i)
          hide(legM, i * 2)
          hide(legM, i * 2 + 1)
        }
        if (!gap) {
          put(awnM, i, face - s * 0.7, 2.95, z)
          const warm = hash(k, side + 31)
          put(shopM, i, face - s * 0.02, 1.35, z, s > 0 ? Math.PI / 2 : -Math.PI / 2)
          shopC.set(warm < 0.33 ? [1, 0.78, 0.46, 1] : warm < 0.66 ? [0.9, 0.56, 0.3, 1] : [0.2, 0.16, 0.14, 1], i * 4)
        } else {
          hide(awnM, i)
          hide(shopM, i)
        }
      }
    }
    for (const V of variants) {
      V.mesh.thinInstanceBufferUpdated("matrix")
      V.mesh.thinInstanceBufferUpdated("color")
    }
    neon.thinInstanceBufferUpdated("matrix")
    neon.thinInstanceBufferUpdated("color")
    reflex.thinInstanceBufferUpdated("matrix")
    reflex.thinInstanceBufferUpdated("color")
    for (const b of boards) b.mesh.thinInstanceBufferUpdated("matrix")
    frame.thinInstanceBufferUpdated("matrix")
    frame.thinInstanceBufferUpdated("color")
    leg.thinInstanceBufferUpdated("matrix")
    awn.thinInstanceBufferUpdated("matrix")
    shop.thinInstanceBufferUpdated("matrix")
    shop.thinInstanceBufferUpdated("color")
  }

  let lK = Number.NaN
  const placeLamps = (k0: number) => {
    for (let side = 0; side < 2; side++) {
      const s = side ? 1 : -1
      for (let j = 0; j < L_SLOTS; j++) {
        const i = side * L_SLOTS + j
        const z = (k0 + j) * L_PITCH + side * (L_PITCH / 2)
        put(poleM, i, s * POLE_X, CURB + 3.3, z)
        put(armM, i, s * (POLE_X - 1.0), CURB + 6.5, z)
        put(headM, i, s * (POLE_X - 1.9), CURB + 6.1, z)
        put(poolM, i, s * (POLE_X - 2.1), 0.025, z)
      }
    }
    for (let j = 0; j < 3; j++) {
      const k = Math.floor(k0 / 4) * 4 + j * 4 + 2
      put(zebraM, j, 0, 0.012, k * L_PITCH + 6)
    }
    pole.thinInstanceBufferUpdated("matrix")
    arm.thinInstanceBufferUpdated("matrix")
    head.thinInstanceBufferUpdated("matrix")
    pool.thinInstanceBufferUpdated("matrix")
    zebra.thinInstanceBufferUpdated("matrix")
  }

  let gK = Number.NaN
  const placeGantries = (k0: number) => {
    for (let j = 0; j < G_SLOTS; j++) {
      const z = (k0 + j) * G_PITCH + G_PITCH / 2
      const top = 9.4
      for (const side of [0, 1]) {
        sc.set(1, top, 1)
        put(gPostM, j * 2 + side, (side ? 1 : -1) * (ROAD_HALF + 1.3), 0, z, 0, sc)
        put(gStripM, j * 2 + side, 0, side ? top + 0.32 : top - 3.95, z - 0.3)
      }
      put(gBeamM, j, 0, top, z)
      put(gPanelM, j, 0, top - 1.95, z - 0.28)
      for (let e = 0; e < 3; e++) put(gGearM, j * 3 + e, (e - 1) * (ROAD_HALF + 1.3), top + (e === 1 ? 1.1 : 0.6), z - 0.32, 0, e === 1 ? one : sc.set(0.6, 0.6, 0.6))
    }
    gPost.thinInstanceBufferUpdated("matrix")
    gBeam.thinInstanceBufferUpdated("matrix")
    gStrip.thinInstanceBufferUpdated("matrix")
    gPanel.thinInstanceBufferUpdated("matrix")
    gGear.thinInstanceBufferUpdated("matrix")
  }

  if (low) {
    // celular fraco: sem marquise nem vitrine (menos instâncias desenhadas)
    awn.setEnabled(false)
    shop.setEnabled(false)
    reflex.setEnabled(false)
    leg.setEnabled(false)
  }

  return {
    update(z, cam) {
      const base = Math.floor((z - BEHIND) / TILE) * TILE + ROAD_LEN / 2
      road.position.z = base
      for (const w of walks) w.position.z = base
      const bk = Math.floor((z - BEHIND) / B_PITCH)
      if (bk !== bK) {
        bK = bk
        placeBuildings(bk)
      }
      const lk = Math.floor((z - BEHIND) / L_PITCH)
      if (lk !== lK) {
        lK = lk
        placeLamps(lk)
      }
      const gk = Math.floor((z - G_PITCH / 2 - 8) / G_PITCH)
      if (gk !== gK) {
        gK = gk
        placeGantries(gk)
      }
      moon.position.set(cam.x - 70, cam.y + 120, cam.z + 330)
    },
    /** Malhas que brilham (o realce do pós-processamento pega o resto pela luminância). */
    neon: [neon, head, frame, gStrip],
    dispose() {
      if (logoImg) logoImg.onload = null
      for (const o of owned.reverse()) o.dispose()
    },
  }
}

export const NIGHT_FOG = new Color4(0.08, 0.055, 0.045, 1)
