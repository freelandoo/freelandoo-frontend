// features/meu-mundo/engine/steampunk/materials.ts
//
// Biblioteca de materiais do bairro steampunk (mm3d-51). POUCOS materiais,
// todos com a cor no vértice — o que muda entre ferro, latão, pedra e madeira
// é a cor; o que dá acabamento é UMA textura de detalhe por família:
//
//   trim   peças 3D (casas 01, cercas, postes, bancos, máquinas): borda escura
//          em cada face (UV "face") = chanfro e oclusão de canto sem geometria.
//   pavers calçada e praça: lajes de pedra com rejunte.
//   road   pista: placas de ferro rebitadas com junta e sujeira.
//   soil   chão: areia amarelada com ondulações, tufos secos e cascalho.
//   cobble caminhos dos lotes e anel da praça: paralelepípedos.
//   glow   luminárias e janelas acesas: emissivo, sem luz (a cor é o âmbar do vértice).
//   wall   (só no Centro, mm3d-53) alvenaria dos prédios: fiadas de cantaria
//          com rejunte — os GLBs do centro trazem a malha "wall" com UV planar.
//
// As texturas são DESENHADAS uma vez num canvas (sem download, sem licença de
// terceiro), com semente fixa: o mesmo desenho em todo aparelho. Tamanho pelo
// perfil de qualidade (256 / 512 / 1024), mipmaps e filtro anisotrópico para o
// chão visto de lado não virar borrão. Tudo é solto no dispose().

import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial"
import { DynamicTexture } from "@babylonjs/core/Materials/Textures/dynamicTexture"
import { Texture } from "@babylonjs/core/Materials/Textures/texture"
import { Color3 } from "@babylonjs/core/Maths/math.color"
import type { Scene } from "@babylonjs/core/scene"
import type { QualityTier } from "../quality"
import { rng } from "./palette"

type Ctx2D = CanvasRenderingContext2D

/** Tamanho dos ladrilhos no mundo (m) — a UV planar do geo.ts usa estes números. */
export const TILE = { pavers: 2.4, road: 4, soil: 11, cobble: 1.6, wall: 2.4 } as const

const SIZE: Record<QualityTier, number> = { low: 256, mid: 512, high: 1024 }
const ANISO: Record<QualityTier, number> = { low: 1, mid: 4, high: 8 }

const g = (v: number) => {
  const c = Math.max(0, Math.min(255, Math.round(v * 255)))
  return `rgb(${c},${c},${c})`
}
const rgb = (r: number, gg: number, b: number, a = 1) =>
  `rgba(${Math.round(r * 255)},${Math.round(gg * 255)},${Math.round(b * 255)},${a})`

/** Desenha nas 9 cópias vizinhas quando encosta na borda: a textura repete sem costura. */
function wrap(S: number, x: number, y: number, r: number, fn: (x: number, y: number) => void) {
  for (const dx of [-S, 0, S]) {
    if ((dx < 0 && x + r < S) || (dx > 0 && x - r > 0)) continue
    for (const dy of [-S, 0, S]) {
      if ((dy < 0 && y + r < S) || (dy > 0 && y - r > 0)) continue
      fn(x + dx, y + dy)
    }
  }
}

function speckle(c: Ctx2D, S: number, n: number, rand: () => number, lo: number, hi: number, alpha: number, size: number) {
  for (let i = 0; i < n; i++) {
    c.fillStyle = g(lo + (hi - lo) * rand())
    c.globalAlpha = alpha
    const s = Math.max(1, size * S * (0.5 + rand()))
    c.fillRect(rand() * S, rand() * S, s, s)
  }
  c.globalAlpha = 1
}

function blotches(c: Ctx2D, S: number, n: number, rand: () => number, rMin: number, rMax: number, color: () => string, alpha: number) {
  for (let i = 0; i < n; i++) {
    const x = rand() * S
    const y = rand() * S
    const r = (rMin + (rMax - rMin) * rand()) * S
    const col = color()
    wrap(S, x, y, r, (px, py) => {
      const grd = c.createRadialGradient(px, py, 0, px, py, r)
      grd.addColorStop(0, col)
      grd.addColorStop(1, "rgba(0,0,0,0)")
      c.globalAlpha = alpha
      c.fillStyle = grd
      c.fillRect(px - r, py - r, 2 * r, 2 * r)
    })
  }
  c.globalAlpha = 1
}

/** Acabamento das peças: base clara com grão, borda escura (chanfro) e quina mais escura. */
function paintTrim(c: Ctx2D, S: number) {
  const rand = rng(11)
  c.fillStyle = g(0.93)
  c.fillRect(0, 0, S, S)
  speckle(c, S, 2600, rand, 0.82, 1, 0.35, 0.006)
  blotches(c, S, 26, rand, 0.05, 0.16, () => (rand() < 0.5 ? "rgba(90,80,70,1)" : "rgba(255,250,240,1)"), 0.06)
  const rim = Math.max(3, Math.round(S * 0.075))
  const edge = (x0: number, y0: number, x1: number, y1: number, x: number, y: number, w: number, h: number) => {
    const grd = c.createLinearGradient(x0, y0, x1, y1)
    grd.addColorStop(0, "rgba(28,24,20,0.62)")
    grd.addColorStop(0.35, "rgba(28,24,20,0.22)")
    grd.addColorStop(1, "rgba(28,24,20,0)")
    c.fillStyle = grd
    c.fillRect(x, y, w, h)
  }
  edge(0, 0, rim, 0, 0, 0, rim, S)
  edge(S, 0, S - rim, 0, S - rim, 0, rim, S)
  edge(0, 0, 0, rim, 0, 0, S, rim)
  edge(0, S, 0, S - rim, 0, S - rim, S, rim)
  // Fio de luz logo dentro da borda: a aresta "pega" luz como um chanfro.
  c.strokeStyle = "rgba(255,248,232,0.22)"
  c.lineWidth = Math.max(1, S / 256)
  c.strokeRect(rim * 0.55, rim * 0.55, S - rim * 1.1, S - rim * 1.1)
}

/** Lajes de pedra em fiadas desencontradas, rejunte escuro, cada laje num tom. */
function paintPavers(c: Ctx2D, S: number) {
  const rand = rng(23)
  c.fillStyle = g(0.38)
  c.fillRect(0, 0, S, S)
  const rows = 4
  const h = S / rows
  const joint = Math.max(1.5, S / 200)
  for (let r = 0; r < rows; r++) {
    const cols = r % 2 ? 3 : 4
    const w = S / cols
    const off = r % 2 ? w * 0.5 : 0
    for (let k = -1; k < cols; k++) {
      const x = off + k * w
      const v = 0.8 + rand() * 0.17
      const warm = (rand() - 0.5) * 0.05
      c.fillStyle = rgb(v + warm, v, v - warm)
      c.fillRect(x + joint, r * h + joint, w - 2 * joint, h - 2 * joint)
      // Bisel: luz em cima/esquerda, sombra embaixo/direita.
      c.fillStyle = "rgba(255,255,255,0.10)"
      c.fillRect(x + joint, r * h + joint, w - 2 * joint, joint * 1.2)
      c.fillStyle = "rgba(0,0,0,0.14)"
      c.fillRect(x + joint, (r + 1) * h - joint * 2.2, w - 2 * joint, joint * 1.2)
    }
  }
  speckle(c, S, Math.round(S * 9), rand, 0.55, 1, 0.22, 0.004)
  blotches(c, S, 30, rand, 0.04, 0.12, () => "rgba(60,52,44,1)", 0.08)
  // Rachaduras finas.
  c.strokeStyle = "rgba(40,34,30,0.35)"
  c.lineWidth = Math.max(1, S / 512)
  for (let i = 0; i < 6; i++) {
    let x = rand() * S
    let y = rand() * S
    c.beginPath()
    c.moveTo(x, y)
    for (let k = 0; k < 4; k++) {
      x += (rand() - 0.5) * S * 0.06
      y += (rand() - 0.5) * S * 0.06
      c.lineTo(x, y)
    }
    c.stroke()
  }
}

/** Placas de ferro da pista: 2×2 por ladrilho, junta com bisel, rebites e encardido. */
function paintRoad(c: Ctx2D, S: number) {
  const rand = rng(37)
  c.fillStyle = g(0.86)
  c.fillRect(0, 0, S, S)
  blotches(c, S, 70, rand, 0.04, 0.2, () => (rand() < 0.6 ? "rgba(30,28,26,1)" : "rgba(255,245,225,1)"), 0.1)
  speckle(c, S, Math.round(S * 14), rand, 0.6, 1, 0.18, 0.003)
  const n = 2
  const step = S / n
  const lw = Math.max(1.5, S / 260)
  for (let i = 0; i <= n; i++) {
    for (const horiz of [true, false]) {
      const p = i * step
      c.fillStyle = "rgba(20,18,16,0.55)"
      if (horiz) c.fillRect(0, p - lw, S, lw * 2)
      else c.fillRect(p - lw, 0, lw * 2, S)
      c.fillStyle = "rgba(255,240,215,0.14)"
      if (horiz) c.fillRect(0, p + lw, S, lw)
      else c.fillRect(p + lw, 0, lw, S)
    }
  }
  // Rebites ao longo das juntas.
  const rr = Math.max(1.2, S / 300)
  const every = step / 9
  for (let i = 0; i <= n; i++) {
    for (let t = every / 2; t < S; t += every) {
      for (const [x, y] of [
        [t, i * step + lw * 4],
        [t, i * step - lw * 4],
        [i * step + lw * 4, t],
        [i * step - lw * 4, t],
      ]) {
        wrap(S, x, y, rr * 2, (px, py) => {
          c.fillStyle = "rgba(15,13,12,0.45)"
          c.beginPath()
          c.arc(px + rr * 0.5, py + rr * 0.5, rr, 0, Math.PI * 2)
          c.fill()
          c.fillStyle = "rgba(255,240,220,0.4)"
          c.beginPath()
          c.arc(px - rr * 0.3, py - rr * 0.3, rr * 0.6, 0, Math.PI * 2)
          c.fill()
        })
      }
    }
  }
  // Remendos: chapas menores, um tom diferente.
  for (let i = 0; i < 3; i++) {
    const w = S * (0.08 + rand() * 0.08)
    const h = S * (0.06 + rand() * 0.06)
    const x = rand() * (S - w)
    const y = rand() * (S - h)
    c.fillStyle = rand() < 0.5 ? "rgba(255,250,240,0.12)" : "rgba(0,0,0,0.12)"
    c.fillRect(x, y, w, h)
    c.strokeStyle = "rgba(20,18,16,0.45)"
    c.lineWidth = lw
    c.strokeRect(x, y, w, h)
  }
}

/** Chão: AREIA amarelada (pedido do Alex) com ondulações, manchas, tufos secos e cascalho (colorida; o vértice tinge). */
function paintSoil(c: Ctx2D, S: number) {
  const rand = rng(41)
  c.fillStyle = rgb(0.96, 0.87, 0.64)
  c.fillRect(0, 0, S, S)
  blotches(c, S, 60, rand, 0.06, 0.2, () => (rand() < 0.5 ? rgb(1, 0.93, 0.72) : rgb(0.86, 0.74, 0.5)), 0.4)
  blotches(c, S, 160, rand, 0.015, 0.06, () => (rand() < 0.5 ? rgb(0.99, 0.9, 0.68) : rgb(0.84, 0.72, 0.5)), 0.35)
  // Ondulações do vento: arcos finos claros e escuros.
  c.lineWidth = Math.max(1, S / 512)
  for (let i = 0; i < S * 0.5; i++) {
    const x = rand() * S
    const y = rand() * S
    const w = S * (0.02 + rand() * 0.04)
    c.strokeStyle = rand() < 0.5 ? "rgba(255,245,215,0.35)" : "rgba(150,115,70,0.22)"
    c.beginPath()
    c.moveTo(x, y)
    c.quadraticCurveTo(x + w / 2, y - w * 0.18, x + w, y)
    c.stroke()
  }
  // Tufos secos (poucos), dourados.
  for (let i = 0; i < S * 1.2; i++) {
    const x = rand() * S
    const y = rand() * S
    const l = S * (0.004 + rand() * 0.008)
    c.strokeStyle = rand() < 0.5 ? "rgba(170,140,60,0.45)" : "rgba(230,205,120,0.4)"
    c.lineWidth = Math.max(1, S / 700)
    c.beginPath()
    c.moveTo(x, y)
    c.lineTo(x + (rand() - 0.5) * l * 0.6, y - l)
    c.stroke()
  }
  // Cascalho.
  for (let i = 0; i < S * 1.5; i++) {
    const x = rand() * S
    const y = rand() * S
    const r = S * (0.0015 + rand() * 0.003)
    c.fillStyle = rand() < 0.5 ? "rgba(255,248,230,0.55)" : "rgba(110,85,55,0.4)"
    c.beginPath()
    c.arc(x, y, r, 0, Math.PI * 2)
    c.fill()
  }
}

/** Retângulo arredondado preenchido (sem `roundRect`, que falta no Safari 15). */
function roundRect(c: Ctx2D, x: number, y: number, w: number, h: number, r: number) {
  const k = Math.max(0, Math.min(r, w / 2, h / 2))
  c.beginPath()
  c.moveTo(x + k, y)
  c.arcTo(x + w, y, x + w, y + h, k)
  c.arcTo(x + w, y + h, x, y + h, k)
  c.arcTo(x, y + h, x, y, k)
  c.arcTo(x, y, x + w, y, k)
  c.closePath()
  c.fill()
}

/** Paralelepípedos irregulares em fiadas. */
function paintCobble(c: Ctx2D, S: number) {
  const rand = rng(53)
  c.fillStyle = g(0.32)
  c.fillRect(0, 0, S, S)
  const rows = 6
  const h = S / rows
  for (let r = 0; r < rows; r++) {
    let x = r % 2 ? -h * 0.4 : 0
    while (x < S) {
      const w = h * (0.8 + rand() * 0.6)
      const v = 0.72 + rand() * 0.24
      const warm = (rand() - 0.5) * 0.08
      const gap = h * 0.08
      const rad = h * 0.22
      const bx = x + gap
      const by = r * h + gap
      const bw = Math.min(w, S + h - x) - 2 * gap
      const bh = h - 2 * gap
      for (const dx of x + w > S ? [0, -S] : [0]) {
        c.fillStyle = rgb(v + warm, v, v - warm)
        roundRect(c, bx + dx, by, bw, bh, rad)
        c.fillStyle = "rgba(255,255,255,0.12)"
        roundRect(c, bx + dx + bw * 0.12, by + bh * 0.12, bw * 0.6, bh * 0.3, rad * 0.6)
      }
      x += w
    }
  }
  speckle(c, S, Math.round(S * 6), rand, 0.5, 1, 0.2, 0.004)
}

function makeTexture(name: string, scene: Scene, tier: QualityTier, paint: (c: Ctx2D, S: number) => void) {
  const S = SIZE[tier]
  const tex = new DynamicTexture(name, { width: S, height: S }, scene, true, Texture.TRILINEAR_SAMPLINGMODE)
  const ctx = tex.getContext() as unknown as Ctx2D
  paint(ctx, S)
  tex.update(false)
  tex.wrapU = Texture.WRAP_ADDRESSMODE
  tex.wrapV = Texture.WRAP_ADDRESSMODE
  tex.anisotropicFilteringLevel = ANISO[tier]
  return tex
}

function litMaterial(name: string, scene: Scene, tex: DynamicTexture | null) {
  const m = new StandardMaterial(name, scene)
  m.diffuseColor = new Color3(1, 1, 1)
  m.specularColor = new Color3(0, 0, 0)
  if (tex) m.diffuseTexture = tex
  // Peças simples, algumas faces internas (como o "mm-world" de sempre).
  m.backFaceCulling = false
  return m
}

/**
 * Cantaria (mm3d-53): seis fiadas de blocos de pedra por ladrilho (2,4 m →
 * fiada de 40 cm), juntas desencontradas, cada bloco num tom, rejunte escuro,
 * fio de luz na aresta de cima e sombra na de baixo (o bloco "salta").
 */
function paintAshlar(c: Ctx2D, S: number) {
  const rand = rng(41)
  c.fillStyle = g(0.3)
  c.fillRect(0, 0, S, S)
  const rows = 6
  const h = S / rows
  const joint = Math.max(2, S / 95)
  for (let r = 0; r < rows; r++) {
    const cols = r % 2 ? 3 : 4
    const w = S / cols
    const off = r % 2 ? w * 0.5 : w * 0.18
    for (let k = -1; k < cols; k++) {
      const x = off + k * w
      const v = 0.74 + rand() * 0.22
      const warm = (rand() - 0.5) * 0.04
      const y = r * h
      // O bloco que passa da borda é desenhado de novo do outro lado (sem costura).
      for (const bx of [x, x - S, x + S]) {
        if (bx + w < 0 || bx > S) continue
        c.fillStyle = rgb(v + warm, v, v - warm)
        c.fillRect(bx + joint / 2, y + joint / 2, w - joint, h - joint)
        c.fillStyle = "rgba(255,250,236,0.28)"
        c.fillRect(bx + joint / 2, y + joint / 2, w - joint, Math.max(1, h * 0.08))
        c.fillStyle = "rgba(30,24,18,0.34)"
        c.fillRect(bx + joint / 2, y + h - joint / 2 - Math.max(1, h * 0.12), w - joint, Math.max(1, h * 0.12))
        c.fillRect(bx + w - joint / 2 - Math.max(1, w * 0.04), y + joint / 2, Math.max(1, w * 0.04), h - joint)
      }
    }
  }
  speckle(c, S, 2200, rand, 0.55, 1, 0.22, 0.004)
  blotches(c, S, 18, rand, 0.05, 0.18, () => (rand() < 0.6 ? "rgba(70,60,48,1)" : "rgba(255,248,232,1)"), 0.07)
}

/** Brilho radial (branco no meio, preto na borda): poças de luz somadas à cena. */
function paintPool(c: Ctx2D, S: number) {
  const grd = c.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2)
  grd.addColorStop(0, "rgb(150,150,150)")
  grd.addColorStop(0.35, "rgb(80,80,80)")
  grd.addColorStop(0.7, "rgb(22,22,22)")
  grd.addColorStop(1, "rgb(0,0,0)")
  c.fillStyle = "#000"
  c.fillRect(0, 0, S, S)
  c.fillStyle = grd
  c.fillRect(0, 0, S, S)
}

export interface SteamMaterials {
  trim: StandardMaterial
  pavers: StandardMaterial
  road: StandardMaterial
  soil: StandardMaterial
  cobble: StandardMaterial
  glow: StandardMaterial
  /** Poças de luz: soma (aditivo), sem luz, sem escrever profundidade. */
  pool: StandardMaterial
  /** A textura de acabamento (as casas 02–09 também usam, se o GLB tiver UV). */
  trimTexture: DynamicTexture
  /** Cantaria das paredes dos prédios do Centro (só com `wall: true`). */
  wall: StandardMaterial | null
  freeze: () => void
  dispose: () => void
}

export function createSteamMaterials(scene: Scene, tier: QualityTier, opts: { wall?: boolean } = {}): SteamMaterials {
  const texWall = opts.wall ? makeTexture("sp-tex-wall", scene, tier, paintAshlar) : null
  const texTrim = makeTexture("sp-tex-trim", scene, tier === "high" ? "mid" : tier, paintTrim)
  const texPavers = makeTexture("sp-tex-pavers", scene, tier, paintPavers)
  const texRoad = makeTexture("sp-tex-road", scene, tier, paintRoad)
  const texSoil = makeTexture("sp-tex-soil", scene, tier, paintSoil)
  const texCobble = makeTexture("sp-tex-cobble", scene, tier === "high" ? "mid" : tier, paintCobble)
  const texPool = makeTexture("sp-tex-pool", scene, "low", paintPool)
  texPool.wrapU = Texture.CLAMP_ADDRESSMODE
  texPool.wrapV = Texture.CLAMP_ADDRESSMODE
  const pool = new StandardMaterial("sp-pool", scene)
  pool.disableLighting = true
  pool.diffuseTexture = texPool
  pool.emissiveColor = new Color3(1, 1, 1)
  pool.specularColor = new Color3(0, 0, 0)
  pool.alphaMode = 1 // ALPHA_ADD
  pool.alpha = 0.999
  pool.disableDepthWrite = true
  pool.backFaceCulling = false
  pool.zOffset = -2
  const glow = new StandardMaterial("sp-glow", scene)
  glow.disableLighting = true
  glow.emissiveColor = new Color3(1, 1, 1)
  glow.diffuseColor = new Color3(0, 0, 0)
  glow.specularColor = new Color3(0, 0, 0)
  glow.backFaceCulling = false
  const out: SteamMaterials = {
    trim: litMaterial("sp-trim", scene, texTrim),
    pavers: litMaterial("sp-pavers", scene, texPavers),
    road: litMaterial("sp-road", scene, texRoad),
    soil: litMaterial("sp-soil", scene, texSoil),
    cobble: litMaterial("sp-cobble", scene, texCobble),
    glow,
    pool,
    trimTexture: texTrim,
    wall: texWall ? litMaterial("sp-wall", scene, texWall) : null,
    freeze() {
      // Luzes e poças ficam livres: o dia/noite muda a intensidade delas.
      for (const m of [out.trim, out.pavers, out.road, out.soil, out.cobble, out.wall]) m?.freeze()
    },
    dispose() {
      for (const m of [out.trim, out.pavers, out.road, out.soil, out.cobble, out.glow, out.pool, out.wall]) m?.dispose()
      for (const t of [texTrim, texPavers, texRoad, texSoil, texCobble, texPool, texWall]) t?.dispose()
    },
  }
  return out
}
