// features/meu-mundo/paint/engine/arena-view.ts — PAINT (mm3d-76): o desenho dos mapas NOVOS.
//
// A Cidade Suspensa segue em world-view.ts (steampunk, dia e noite). Os cinco
// mapas novos (Jardim Espiral, Fábrica Suspensa, Floresta de Cristal, Templo
// da Tempestade, Forja Vulcânica) saem daqui, cada um com a PALETA do tema
// (paint-map-art.ts) e os detalhes de cada tipo de ilha (`tag` da regra).
//
// A colisão NÃO sai daqui: é a lista de sólidos da regra (sim/maps.ts). O
// chão de cada ilha é desenhado exatamente no contorno e na altura dela (o
// pé não afunda nem flutua); o resto (flores, correntes, cristais, colunas
// de enfeite, cachoeiras) é só desenho e fica na borda, fora do caminho.
//
// Poucas chamadas de desenho (o que pesa no celular): chão (1–2 malhas, com
// textura de canvas), rocha (1), detalhes acesos e apagados (2), cachoeiras
// de água/lava (1, transparente), céu (1), nuvens ou lava (1–2) e os portais.
// Sem sombra, sem shader próprio, sem partícula: brilho é material sem luz.

import type { Scene } from "@babylonjs/core/scene"
import { Mesh } from "@babylonjs/core/Meshes/mesh"
import { VertexData } from "@babylonjs/core/Meshes/mesh.vertexData"
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial"
import { DynamicTexture } from "@babylonjs/core/Materials/Textures/dynamicTexture"
import { Texture } from "@babylonjs/core/Materials/Textures/texture"
import { Color3, Color4 } from "@babylonjs/core/Maths/math.color"
import { Matrix, Vector3 } from "@babylonjs/core/Maths/math.vector"
import { CreateTorus } from "@babylonjs/core/Meshes/Builders/torusBuilder"
import { CreateDisc } from "@babylonjs/core/Meshes/Builders/discBuilder"
import { CreateCylinderVertexData } from "@babylonjs/core/Meshes/Builders/cylinderBuilder"
import { CreateSphereVertexData } from "@babylonjs/core/Meshes/Builders/sphereBuilder"
import { TransformNode } from "@babylonjs/core/Meshes/transformNode"
import type { HemisphericLight } from "@babylonjs/core/Lights/hemisphericLight"
import type { DirectionalLight } from "@babylonjs/core/Lights/directionalLight"
import { GeoBuilder, place, type RGB } from "../../engine/geometry"
import type { Island, PaintMap, PaintProp } from "../sim/map"
import { TUNING } from "../sim/tuning"
import type { PaintTheme } from "./paint-map-art"
import type { PaintWorldView } from "./world-view"

/** Pseudo-aleatório fixo (mesma cara a cada partida). */
function rnd(n: number) {
  let h = (n * 2654435761) >>> 0
  h ^= h >>> 15
  h = Math.imul(h, 2246822519) >>> 0
  h ^= h >>> 13
  h = Math.imul(h, 3266489917) >>> 0
  h ^= h >>> 16
  return (h >>> 0) / 4294967296
}

const mul = (c: RGB, k: number): RGB => [c[0] * k, c[1] * k, c[2] * k]
const mix = (a: RGB, b: RGB, t: number): RGB => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]
const c3 = (c: RGB) => new Color3(c[0], c[1], c[2])

/** Construtor com cone e malha livre (o chão das ilhas leva UV de mundo). */
class ArenaGeo extends GeoBuilder {
  cone(dTop: number, dBottom: number, h: number, m: Matrix, color: RGB, sides = 8) {
    const vd = CreateCylinderVertexData({ height: h, diameterTop: dTop, diameterBottom: dBottom, tessellation: sides })
    vd.transform(m)
    this.append(vd, color)
  }
  /** Esfera achatada/esticada sem recalcular normal (nuvem, copa, cogumelo). */
  blob(d: number, sx: number, sy: number, sz: number, x: number, y: number, z: number, color: RGB, seg = 6) {
    const vd = CreateSphereVertexData({ diameter: d, segments: seg })
    vd.transform(Matrix.Scaling(sx, sy, sz).multiply(Matrix.Translation(x, y, z)))
    this.append(vd, color)
  }
  raw(vd: VertexData, color: RGB) {
    this.append(vd, color)
  }
}

/** Tipos de ilha de METAL (chão de chapa, borda listrada) — o resto é pedra/terra/folha. */
const METAL = new Set(["dock", "plate", "conveyor", "chain", "gear", "ring", "grate", "hexpad", "forgetop", "anvil", "crane"])
const LEAF = new Set(["leaf", "leafbase"])

/** Contorno da ilha no chão (cantos do polígono com os lados divididos; círculo para a ilha do chefão). */
function outlineOf(isl: Island, maxSeg = 2.2): [number, number][] {
  if (!isl.poly) {
    const n = Math.max(24, Math.min(64, Math.round(isl.r * 2.6)))
    return Array.from({ length: n }, (_, i) => [isl.x + Math.sin((i / n) * Math.PI * 2) * isl.r, isl.z + Math.cos((i / n) * Math.PI * 2) * isl.r])
  }
  const p = isl.poly
  const m = p.length / 2
  const out: [number, number][] = []
  for (let i = 0; i < m; i++) {
    const ax = p[i * 2]
    const az = p[i * 2 + 1]
    const bx = p[((i + 1) % m) * 2]
    const bz = p[((i + 1) % m) * 2 + 1]
    const k = Math.max(1, Math.ceil(Math.hypot(bx - ax, bz - az) / maxSeg))
    for (let j = 0; j < k; j++) out.push([ax + ((bx - ax) * j) / k, az + ((bz - az) * j) / k])
  }
  return out
}

/** Textura do chão (canvas 256², repete pelo mundo). */
function tileTexture(scene: Scene, kind: PaintTheme["tile"], th: PaintTheme): DynamicTexture {
  const tex = new DynamicTexture(`paint-tile-${kind}`, { width: 256, height: 256 }, scene, true)
  const g = tex.getContext() as unknown as CanvasRenderingContext2D
  const css = (c: RGB, k = 1) => `rgb(${Math.round(Math.min(1, c[0] * k) * 255)},${Math.round(Math.min(1, c[1] * k) * 255)},${Math.round(Math.min(1, c[2] * k) * 255)})`
  const white: RGB = [1, 1, 1]
  g.fillStyle = css(white)
  g.fillRect(0, 0, 256, 256)
  if (kind === "garden" || kind === "rune") {
    // lajes de pedra (o tema tinge pela cor do vértice) com juntas e, no
    // templo, filetes dourados de runa
    const cells = 4
    for (let y = 0; y < cells; y++) {
      for (let x = 0; x < cells; x++) {
        const off = y % 2 ? 32 : 0
        const k = 0.86 + rnd(x * 7 + y * 13) * 0.14
        g.fillStyle = css(white, k)
        g.fillRect(x * 64 + off + 3, y * 64 + 3, 58, 58)
        if (off) g.fillRect(off - 64 + x * 64 + 3, y * 64 + 3, 58, 58)
      }
    }
    g.strokeStyle = "rgba(60,60,70,0.35)"
    g.lineWidth = 2
    for (let i = 0; i < 14; i++) {
      g.beginPath()
      const x = rnd(i * 3 + 1) * 256
      const y = rnd(i * 5 + 2) * 256
      g.moveTo(x, y)
      g.lineTo(x + (rnd(i + 9) - 0.5) * 50, y + (rnd(i + 11) - 0.5) * 50)
      g.stroke()
    }
    if (kind === "rune") {
      g.strokeStyle = css(th.trim, 1.15)
      g.lineWidth = 3
      for (let i = 0; i < 4; i++) {
        g.beginPath()
        const y = 32 + i * 64
        g.moveTo(0, y)
        for (let x = 0; x <= 256; x += 32) g.lineTo(x, y + ((x / 32) % 2 ? 10 : -10))
        g.stroke()
      }
    }
  } else if (kind === "plate") {
    // chapa de aço com relevo em losango, emendas e rebites
    g.fillStyle = css(white, 0.92)
    g.fillRect(0, 0, 256, 256)
    g.fillStyle = "rgba(0,0,0,0.13)"
    for (let y = 0; y < 256; y += 16) for (let x = (y / 16) % 2 ? 8 : 0; x < 256; x += 16) g.fillRect(x + 3, y + 6, 9, 3)
    g.strokeStyle = "rgba(0,0,0,0.45)"
    g.lineWidth = 3
    g.strokeRect(1.5, 1.5, 125, 125)
    g.strokeRect(129.5, 1.5, 125, 125)
    g.strokeRect(1.5, 129.5, 253, 125)
    g.fillStyle = "rgba(255,255,255,0.65)"
    for (const [x, y] of [[8, 8], [118, 8], [8, 118], [118, 118], [138, 8], [246, 8], [138, 118], [246, 118], [8, 138], [246, 138], [8, 246], [246, 246]]) {
      g.beginPath()
      g.arc(x, y, 3.5, 0, Math.PI * 2)
      g.fill()
    }
  } else if (kind === "moss") {
    // musgo com manchas e veios claros (folha)
    for (let i = 0; i < 220; i++) {
      const k = 0.75 + rnd(i * 3) * 0.3
      g.fillStyle = css(white, k)
      g.beginPath()
      g.arc(rnd(i * 7) * 256, rnd(i * 11) * 256, 6 + rnd(i * 13) * 16, 0, Math.PI * 2)
      g.fill()
    }
    g.strokeStyle = "rgba(255,255,255,0.5)"
    g.lineWidth = 2
    for (let i = 0; i < 6; i++) {
      g.beginPath()
      g.moveTo(128, 256)
      g.quadraticCurveTo(128 + (i - 2.5) * 30, 128, 128 + (i - 2.5) * 50, 0)
      g.stroke()
    }
  } else {
    // basalto: placas escuras e rachaduras acesas (a cor de brilho do tema)
    for (let i = 0; i < 90; i++) {
      g.fillStyle = css(white, 0.7 + rnd(i * 5) * 0.3)
      const x = rnd(i * 7) * 256
      const y = rnd(i * 9) * 256
      g.fillRect(x, y, 14 + rnd(i) * 30, 10 + rnd(i + 1) * 26)
    }
    g.strokeStyle = css(th.glow, 1.4)
    g.lineWidth = 3
    for (let i = 0; i < 9; i++) {
      g.beginPath()
      let x = rnd(i * 17) * 256
      let y = rnd(i * 19) * 256
      g.moveTo(x, y)
      for (let k = 0; k < 4; k++) {
        x += (rnd(i * 23 + k) - 0.5) * 60
        y += (rnd(i * 29 + k) - 0.5) * 60
        g.lineTo(x, y)
      }
      g.stroke()
    }
  }
  tex.wrapU = Texture.WRAP_ADDRESSMODE
  tex.wrapV = Texture.WRAP_ADDRESSMODE
  tex.update(false)
  return tex
}

/** Faixa que escorre (cachoeira de água ou de lava): degradê com riscos, rola no V. */
function fallTexture(scene: Scene, lava: boolean): DynamicTexture {
  const tex = new DynamicTexture(`paint-fall-${lava ? "lava" : "water"}`, { width: 64, height: 256 }, scene, true)
  const g = tex.getContext() as unknown as CanvasRenderingContext2D
  g.clearRect(0, 0, 64, 256)
  for (let i = 0; i < 40; i++) {
    const x = rnd(i * 3) * 64
    const w = 3 + rnd(i * 5) * 8
    const a = 0.25 + rnd(i * 7) * 0.5
    g.fillStyle = lava ? `rgba(255,${120 + Math.round(rnd(i) * 100)},40,${a})` : `rgba(255,255,255,${a})`
    g.fillRect(x, rnd(i * 11) * 256, w, 40 + rnd(i * 13) * 120)
  }
  tex.hasAlpha = true
  tex.wrapU = Texture.WRAP_ADDRESSMODE
  tex.wrapV = Texture.WRAP_ADDRESSMODE
  tex.update(false)
  return tex
}

export function buildArenaWorld(scene: Scene, map: PaintMap, lowEnd: boolean, th: PaintTheme): PaintWorldView {
  const disposers: (() => void)[] = []
  const own = <T extends { dispose(): void }>(x: T) => {
    disposers.push(() => x.dispose())
    return x
  }

  // ── céu, neblina e luzes do tema (sem dia e noite: cada mapa tem a sua hora) ──
  scene.clearColor = new Color4(th.skyLow[0], th.skyLow[1], th.skyLow[2], 1)
  scene.fogColor = c3(th.fog)
  scene.fogStart = lowEnd ? th.fogStart * 0.75 : th.fogStart
  scene.fogEnd = lowEnd ? th.fogEnd * 0.8 : th.fogEnd
  const hemi = scene.getLightByName("mm-hemi") as HemisphericLight | null
  const sun = scene.getLightByName("mm-sun") as DirectionalLight | null
  if (hemi) {
    hemi.diffuse = c3(th.hemi)
    hemi.groundColor = c3(th.ground)
    hemi.intensity = th.hemiK
  }
  if (sun) {
    sun.diffuse = c3(th.sun)
    sun.intensity = th.sunK
    sun.direction = new Vector3(-0.55, -0.8, 0.3)
  }
  {
    const vd = CreateSphereVertexData({ diameter: 2, segments: 12, sideOrientation: Mesh.BACKSIDE })
    const p = vd.positions as number[]
    const cols: number[] = []
    for (let i = 0; i < p.length; i += 3) {
      const t = Math.max(0, Math.min(1, p[i + 1] * 1.4 + 0.1))
      const c = mix(th.skyLow, th.skyTop, t)
      cols.push(c[0], c[1], c[2], 1)
    }
    vd.colors = cols
    const dome = own(new Mesh("paint-arena-sky", scene))
    vd.applyToMesh(dome)
    dome.scaling.setAll(380)
    dome.infiniteDistance = true
    dome.isPickable = false
    dome.alwaysSelectAsActiveMesh = true
    dome.applyFog = false
    // sem luz só o emissivo aparece: emissivo branco × cor do vértice
    const m = own(new StandardMaterial("paint-arena-sky", scene))
    m.disableLighting = true
    m.emissiveColor = new Color3(1, 1, 1)
    m.diffuseColor = new Color3(0, 0, 0)
    m.specularColor = new Color3(0, 0, 0)
    m.fogEnabled = false
    m.backFaceCulling = false
    dome.material = m
  }

  // ── materiais ──
  const topTex = own(tileTexture(scene, th.tile, th))
  const metalTex = th.tile === "plate" ? topTex : own(tileTexture(scene, "plate", th))
  const topMat = own(new StandardMaterial("paint-arena-top", scene))
  topMat.diffuseTexture = topTex
  topMat.specularColor = new Color3(0.06, 0.06, 0.06)
  topMat.emissiveColor = new Color3(0.08, 0.08, 0.08)
  const metalMat = own(new StandardMaterial("paint-arena-metal", scene))
  metalMat.diffuseTexture = metalTex
  metalMat.specularColor = new Color3(0.22, 0.22, 0.24)
  metalMat.emissiveColor = new Color3(0.06, 0.06, 0.06)
  const solidMat = own(new StandardMaterial("paint-arena-solid", scene))
  solidMat.diffuseColor = new Color3(1, 1, 1)
  solidMat.specularColor = new Color3(0.05, 0.05, 0.05)
  solidMat.emissiveColor = new Color3(0.1, 0.1, 0.1)
  const glowMat = own(new StandardMaterial("paint-arena-glow", scene))
  glowMat.disableLighting = true
  glowMat.emissiveColor = new Color3(1, 1, 1)
  glowMat.diffuseColor = new Color3(0, 0, 0)
  glowMat.specularColor = new Color3(0, 0, 0)

  const tops = new ArenaGeo()
  const metal = new ArenaGeo()
  const deco = new ArenaGeo()
  const glow = new ArenaGeo()
  const falls = new ArenaGeo()
  const rock = { p: [] as number[], c: [] as number[], i: [] as number[] }

  /** Chão da ilha: miolo + borda, na altura exata da colisão, UV pelo mundo. */
  const floorOf = (isl: Island, g: ArenaGeo, topC: RGB, rimC: RGB, stripes: boolean) => {
    const O = outlineOf(isl, 1.2)
    const cx = isl.x
    const cz = isl.z
    const y = isl.y + 0.004
    const rimW = Math.min(0.7, Math.max(0.3, isl.r * 0.22))
    const I = O.map(([x, z]) => {
      const d = Math.hypot(x - cx, z - cz) || 1
      const k = Math.max(0.2, (d - rimW) / d)
      return [cx + (x - cx) * k, cz + (z - cz) * k] as [number, number]
    })
    const uv = (x: number, z: number) => [x / 3.2, z / 3.2]
    // miolo (leque)
    {
      const pos: number[] = [cx, y, cz]
      const uvs: number[] = [...uv(cx, cz)]
      const idx: number[] = []
      for (const [x, z] of I) {
        pos.push(x, y, z)
        uvs.push(...uv(x, z))
      }
      const n = I.length
      for (let i = 0; i < n; i++) idx.push(0, 1 + ((i + 1) % n), 1 + i)
      const vd = new VertexData()
      vd.positions = pos
      vd.indices = idx
      vd.uvs = uvs
      vd.normals = pos.map((_, k) => (k % 3 === 1 ? 1 : 0))
      g.raw(vd, topC)
    }
    // borda (faixa; listrada amarelo/preto no metal)
    const n = O.length
    for (let i = 0; i < n; i++) {
      const a = O[i]
      const b = O[(i + 1) % n]
      const ia = I[i]
      const ib = I[(i + 1) % n]
      const vd = new VertexData()
      vd.positions = [ia[0], y + 0.002, ia[1], a[0], y + 0.002, a[1], b[0], y + 0.002, b[1], ib[0], y + 0.002, ib[1]]
      vd.indices = [0, 2, 1, 0, 3, 2]
      vd.uvs = [...uv(ia[0], ia[1]), ...uv(a[0], a[1]), ...uv(b[0], b[1]), ...uv(ib[0], ib[1])]
      vd.normals = [0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0]
      g.raw(vd, stripes ? (i % 2 ? th.trim : mul(th.accent, 0.9)) : rimC)
    }
  }

  /** Rocha/chapa embaixo da ilha, em anéis até a ponta (sombreado facetado). */
  const underOf = (isl: Island) => {
    const O = outlineOf(isl, 2.2)
    const tag = isl.tag ?? ""
    const D = isl.depth
    const strata = th.strata
    let rings: { f: number; dy: number; c: RGB; jit: number }[]
    if (METAL.has(tag)) {
      rings = [
        { f: 1, dy: 0, c: th.trim, jit: 0 },
        { f: 1, dy: 0.32, c: th.trim, jit: 0 },
        { f: 1, dy: 0.34, c: mul(th.top, 0.55), jit: 0 },
        { f: 0.98, dy: 0.85, c: mul(th.top, 0.45), jit: 0 },
        { f: 0.62, dy: 1.5, c: strata[0], jit: 0.05 },
        { f: 0.32, dy: Math.max(2.6, D * 0.5), c: strata[2], jit: 0.08 },
      ]
    } else if (LEAF.has(tag)) {
      rings = [
        { f: 1, dy: 0, c: mul(th.rim, 0.9), jit: 0 },
        { f: 0.96, dy: 0.32, c: mul(th.rim, 0.7), jit: 0 },
        { f: 0.4, dy: 0.9, c: strata[0], jit: 0.05 },
        { f: 0.14, dy: 3.2, c: strata[1], jit: 0.1 },
      ]
    } else if (tag === "stair") {
      rings = [
        { f: 1, dy: 0, c: th.trim, jit: 0 },
        { f: 1, dy: 0.14, c: strata[0], jit: 0 },
        { f: 1, dy: 2.6, c: strata[1], jit: 0 },
        { f: 0.55, dy: 3.8, c: strata[3], jit: 0.1 },
      ]
    } else {
      rings = [
        { f: 1, dy: 0, c: th.rim, jit: 0 },
        { f: 1.02, dy: 0.28, c: th.rim, jit: 0 },
        { f: 0.99, dy: 0.55, c: strata[0], jit: 0 },
        { f: 0.92, dy: D * 0.18, c: strata[1], jit: 0.25 },
        { f: 0.82, dy: D * 0.33, c: strata[2], jit: 0.3 },
        { f: 0.66, dy: D * 0.5, c: strata[3], jit: 0.3 },
        { f: 0.46, dy: D * 0.68, c: strata[4], jit: 0.3 },
        { f: 0.24, dy: D * 0.86, c: strata[5], jit: 0.25 },
      ]
    }
    const seg = O.length
    const base = rock.p.length / 3
    rings.forEach((R, ri) => {
      for (let k = 0; k < seg; k++) {
        const [x, z] = O[k]
        const j = R.jit ? 1 + (rnd(isl.id * 131 + ri * 17 + k) - 0.5) * R.jit : 1
        const dyj = R.jit ? (rnd(isl.id * 71 + ri * 5 + k) - 0.5) * D * 0.06 : 0
        rock.p.push(isl.x + (x - isl.x) * R.f * j, isl.y - R.dy + dyj, isl.z + (z - isl.z) * R.f * j)
        const s = 0.9 + rnd(isl.id * 53 + ri * 11 + k) * 0.14
        rock.c.push(R.c[0] * s, R.c[1] * s, R.c[2] * s, 1)
      }
    })
    for (let ri = 0; ri < rings.length - 1; ri++) {
      for (let k = 0; k < seg; k++) {
        const a = base + ri * seg + k
        const b = base + ri * seg + ((k + 1) % seg)
        rock.i.push(a, b, a + seg, b, b + seg, a + seg)
      }
    }
    const last = rings[rings.length - 1]
    const tip = rock.p.length / 3
    rock.p.push(isl.x, isl.y - last.dy - (LEAF.has(tag) ? 0.6 : Math.max(1, D * 0.18)), isl.z)
    rock.c.push(...mul(strata[5], 0.85), 1)
    const lb = base + (rings.length - 1) * seg
    for (let k = 0; k < seg; k++) rock.i.push(lb + k, lb + ((k + 1) % seg), tip)
  }

  // ── ilhas ──
  for (const isl of map.islands) {
    const tag = isl.tag ?? ""
    const metalTop = METAL.has(tag)
    let topC: RGB = th.top
    let rimC: RGB = th.rim
    if (tag === "conveyor") topC = mul(th.top, 0.42)
    else if (tag === "root" || tag === "roots") {
      topC = [0.5, 0.36, 0.26]
      rimC = [0.36, 0.26, 0.2]
    } else if (LEAF.has(tag)) {
      topC = mix(th.top, th.glow, 0.25)
      rimC = mix(th.rim, th.glow, 0.35)
    } else if (tag === "crystal") topC = mix(th.top, th.glow, 0.15)
    else if (tag === "mushroom") topC = mix(th.top, th.accent, 0.2)
    else if (tag === "garden" || tag === "terrace") rimC = th.rim
    else if (metalTop && th.tile === "basalt") topC = [0.42, 0.42, 0.45]
    else if (isl.kind === "boss") {
      topC = mix(th.top, [1, 1, 1], 0.1)
      rimC = th.trim
    }
    floorOf(isl, metalTop ? metal : tops, topC, rimC, metalTop && tag !== "conveyor")
    underOf(isl)
  }

  // ── detalhes por tipo de ilha ──
  const edgePoint = (isl: Island, a: number, inset: number) => {
    // ponto na borda na direção a (raio pela própria forma: anda até sair)
    const O = outlineOf(isl, 1.2)
    let best = O[0]
    let bd = -Infinity
    const ux = Math.sin(a)
    const uz = Math.cos(a)
    for (const p of O) {
      const d = (p[0] - isl.x) * ux + (p[1] - isl.z) * uz
      if (d > bd) {
        bd = d
        best = p
      }
    }
    const dx = best[0] - isl.x
    const dz = best[1] - isl.z
    const L = Math.hypot(dx, dz) || 1
    return { x: isl.x + (dx / L) * Math.max(0, L - inset), z: isl.z + (dz / L) * Math.max(0, L - inset) }
  }
  const dens = lowEnd ? 0.5 : 1
  const fallList: { x: number; z: number; y: number; len: number; w: number; a: number }[] = []

  for (const isl of map.islands) {
    const tag = isl.tag ?? ""
    const R = rnd
    const id = isl.id
    if (tag === "garden" || tag === "terrace" || tag === "ruins" || tag === "temple" || (isl.kind === "boss" && th.tile === "garden")) {
      // flores e capim na borda; cipós caindo
      const n = Math.round((3 + isl.r * 1.2) * dens)
      for (let k = 0; k < n; k++) {
        const p = edgePoint(isl, R(id * 31 + k) * Math.PI * 2, 0.35)
        const col: RGB = k % 3 === 0 ? [1, 1, 1] : k % 3 === 1 ? th.accent : mix(th.accent, [1, 0.6, 0.8], 0.5)
        deco.blob(0.5 + R(id + k) * 0.3, 1, 0.7, 1, p.x, isl.y + 0.18, p.z, col, 5)
        deco.box(0.08, 0.4, 0.08, place(p.x + 0.25, isl.y + 0.2, p.z), th.rim)
      }
      for (let k = 0; k < Math.round(isl.r * dens); k++) {
        const p = edgePoint(isl, R(id * 41 + k) * Math.PI * 2, -0.05)
        const len = 0.8 + R(id * 43 + k) * Math.min(3.5, isl.depth * 0.35)
        deco.box(0.1, len, 0.1, place(p.x, isl.y - 0.25 - len / 2, p.z), th.rim)
        deco.blob(0.4, 1, 0.6, 1, p.x, isl.y - 0.25 - len, p.z, k % 2 ? th.accent : th.rim, 4)
      }
      if (tag === "ruins" || tag === "temple") {
        // tocos de coluna partida na borda
        const nc = tag === "temple" ? 8 : 3
        for (let k = 0; k < nc; k++) {
          const p = edgePoint(isl, (k / nc) * Math.PI * 2 + id, 0.45)
          const h = tag === "temple" ? 4.4 : 0.6 + R(id * 7 + k) * 1.2
          deco.cylinder(0.62, h, place(p.x, isl.y + h / 2, p.z), mix(th.top, [1, 1, 1], 0.3), 10)
          deco.cylinder(0.8, 0.22, place(p.x, isl.y + 0.11, p.z), th.trim, 10)
          if (tag === "temple") deco.cylinder(0.84, 0.26, place(p.x, isl.y + h, p.z), th.trim, 10)
        }
        if (tag === "temple") {
          // arco de pedra por cima das colunas (alto, não atrapalha)
          const ring = outlineOf(isl, 1.4)
          for (let k = 0; k < ring.length; k++) {
            const a = ring[k]
            const b = ring[(k + 1) % ring.length]
            const mx = (a[0] + b[0]) / 2 - isl.x
            const mz = (a[1] + b[1]) / 2 - isl.z
            const L = Math.hypot(mx, mz) || 1
            const x = isl.x + (mx / L) * (L - 0.45)
            const z = isl.z + (mz / L) * (L - 0.45)
            deco.box(Math.hypot(b[0] - a[0], b[1] - a[1]) + 0.05, 0.5, 0.7, place(x, isl.y + 4.7, z, Math.atan2(b[0] - a[0], b[1] - a[1]) + Math.PI / 2), mix(th.top, th.trim, 0.25))
          }
        }
      }
      if ((tag === "terrace" || tag === "garden") && R(id * 3) < 0.55 && isl.kind !== "boss") {
        const p = edgePoint(isl, R(id * 5) * Math.PI * 2, -0.1)
        fallList.push({ x: p.x, z: p.z, y: isl.y - 0.3, len: 28 + R(id) * 14, w: 1.4 + R(id * 9) * 1.2, a: Math.atan2(p.x - isl.x, p.z - isl.z) })
      }
    }
    if (tag === "plinth") {
      // plataforma da espiral: aro dourado e filetes acesos nas faces
      const O = outlineOf(isl, 10)
      for (let k = 0; k < O.length; k++) {
        const a = O[k]
        const b = O[(k + 1) % O.length]
        const ang = Math.atan2(b[0] - a[0], b[1] - a[1]) + Math.PI / 2
        const mx = (a[0] + b[0]) / 2
        const mz = (a[1] + b[1]) / 2
        const L = Math.hypot(b[0] - a[0], b[1] - a[1])
        const ox = (mx - isl.x) * 0.02
        const oz = (mz - isl.z) * 0.02
        glow.box(L * 0.55, 0.12, 0.06, place(mx + ox, isl.y - 0.55, mz + oz, ang), th.glow)
      }
    }
    if (METAL.has(tag)) {
      // filetes acesos nas faces, rebites e correntes até o céu (nos cantos)
      const O = isl.poly ? isl.poly : []
      const m = O.length / 2
      for (let k = 0; k < m; k++) {
        const ax = O[k * 2]
        const az = O[k * 2 + 1]
        const bx = O[((k + 1) % m) * 2]
        const bz = O[((k + 1) % m) * 2 + 1]
        const L = Math.hypot(bx - ax, bz - az)
        const ang = Math.atan2(bx - ax, bz - az) + Math.PI / 2
        const mx = (ax + bx) / 2 + ((ax + bx) / 2 - isl.x) * 0.015
        const mz = (az + bz) / 2 + ((az + bz) / 2 - isl.z) * 0.015
        if (L > 1.5) glow.box(L * 0.45, 0.14, 0.05, place(mx, isl.y - 0.6, mz, ang), th.glow)
      }
      if (tag === "chain" || tag === "dock" || (tag === "plate" && R(id) < 0.5)) {
        for (let k = 0; k < Math.min(4, m); k++) {
          if (tag === "plate" && k % 2) continue
          const x = O[k * 2] + (isl.x - O[k * 2]) * 0.06
          const z = O[k * 2 + 1] + (isl.z - O[k * 2 + 1]) * 0.06
          const h = 34
          for (let s = 0; s < 18; s++) deco.box(0.16, 1.6, s % 2 ? 0.16 : 0.5, place(x, isl.y + 0.8 + (s * h) / 18, z, s % 2 ? 0 : Math.PI / 2), mul(th.accent, 1.4))
        }
      }
      if (tag === "conveyor") {
        // setas acesas ao longo da esteira e roletes nas pontas
        const O2 = isl.poly!
        let lx = O2[2] - O2[0]
        let lz = O2[3] - O2[1]
        let L = Math.hypot(lx, lz)
        const lx2 = O2[4] - O2[2]
        const lz2 = O2[5] - O2[3]
        if (Math.hypot(lx2, lz2) > L) {
          lx = lx2
          lz = lz2
          L = Math.hypot(lx2, lz2)
        }
        const ux = lx / L
        const uz = lz / L
        const ang = Math.atan2(ux, uz)
        for (let s = -L / 2 + 1.2; s < L / 2 - 0.8; s += 1.8) {
          glow.box(0.9, 0.03, 0.22, place(isl.x + ux * s, isl.y + 0.02, isl.z + uz * s, ang + 0.7), th.glow)
          glow.box(0.9, 0.03, 0.22, place(isl.x + ux * (s + 0.4), isl.y + 0.02, isl.z + uz * (s + 0.4), ang - 0.7), th.glow)
        }
      }
      if (tag === "gear") {
        // dentes da engrenagem na lateral (abaixo do chão: não dá para pisar fora da colisão)
        const O3 = outlineOf(isl, 10)
        const n = Math.max(10, O3.length * 2)
        const rr = Math.hypot(O3[0][0] - isl.x, O3[0][1] - isl.z)
        for (let k = 0; k < n; k++) {
          const a = (k / n) * Math.PI * 2
          deco.box(0.9, 0.7, 0.8, place(isl.x + Math.sin(a) * (rr + 0.25), isl.y - 0.75, isl.z + Math.cos(a) * (rr + 0.25), a), mul(th.top, 0.6))
        }
        deco.cylinder(isl.r * 0.8, 2.2, place(isl.x, isl.y - 2.2, isl.z), mul(th.top, 0.4), 14)
      }
      if (tag === "ring") {
        // o anel tecnológico em pé atrás dos portais
        const ringNode = new TransformNode("paint-arena-techring", scene)
        disposers.push(() => ringNode.dispose(false, true))
        ringNode.position.set(isl.x, isl.y + 7.5, isl.z - isl.r + 0.5)
        const tor = CreateTorus("paint-arena-techring-t", { diameter: 13, thickness: 1.1, tessellation: 40 }, scene)
        tor.rotation.x = Math.PI / 2
        tor.parent = ringNode
        tor.material = solidMat
        tor.isPickable = false
        const tg = CreateTorus("paint-arena-techring-g", { diameter: 13, thickness: 0.35, tessellation: 40 }, scene)
        tg.rotation.x = Math.PI / 2
        tg.position.z = -0.45
        tg.parent = ringNode
        const gm = own(new StandardMaterial("paint-arena-techring-g", scene))
        gm.disableLighting = true
        gm.emissiveColor = c3(th.glow)
        tg.material = gm
        tg.isPickable = false
      }
      if (tag === "anvil") {
        deco.box(2.6, 1.1, 1.2, place(isl.x, isl.y + 0.55, isl.z - 0.6), [0.2, 0.2, 0.22])
        deco.box(3.4, 0.5, 1.3, place(isl.x, isl.y + 1.3, isl.z - 0.6), [0.24, 0.24, 0.26])
      }
      if (tag === "crane") {
        deco.box(0.4, 8, 0.4, place(isl.x - 1.4, isl.y + 4, isl.z - 1.4), th.trim)
        deco.box(7, 0.4, 0.4, place(isl.x + 1.6, isl.y + 8, isl.z - 1.4), th.trim)
        deco.box(0.1, 3, 0.1, place(isl.x + 4.6, isl.y + 6.5, isl.z - 1.4), mul(th.accent, 1.3))
        deco.box(1.2, 0.8, 0.8, place(isl.x + 4.6, isl.y + 4.6, isl.z - 1.4), [0.3, 0.3, 0.32])
      }
    }
    if (LEAF.has(tag)) {
      // veio aceso no meio da folha e cipós
      glow.box(0.12, 0.02, Math.max(1, isl.r * 1.6), place(isl.x, isl.y + 0.02, isl.z, rnd(id) * Math.PI), mix(th.glow, [1, 1, 1], 0.3))
      for (let k = 0; k < Math.round(3 * dens); k++) {
        const p = edgePoint(isl, R(id * 47 + k) * Math.PI * 2, -0.05)
        const len = 1 + R(id * 53 + k) * 3
        deco.box(0.08, len, 0.08, place(p.x, isl.y - 0.3 - len / 2, p.z), mul(th.rim, 0.8))
        glow.blob(0.22, 1, 1, 1, p.x, isl.y - 0.3 - len, p.z, th.glow, 4)
      }
    }
    if (tag === "crystal" || tag === "canopy" || tag === "roots" || (isl.kind === "boss" && th.tile === "moss")) {
      // cristais acesos na borda (cones de 5 lados)
      const n = Math.round((tag === "crystal" ? 4 : 6) * dens) + 1
      for (let k = 0; k < n; k++) {
        const p = edgePoint(isl, R(id * 61 + k) * Math.PI * 2, 0.5)
        const h = 0.9 + R(id * 67 + k) * 1.6
        glow.cone(0, 0.55 + R(id + k) * 0.3, h, Matrix.RotationZ((R(id * 71 + k) - 0.5) * 0.5).multiply(Matrix.Translation(p.x, isl.y + h / 2, p.z)), k % 2 ? th.glow : th.glow2, 5)
      }
    }
    if (tag === "mushroom") {
      for (let k = 0; k < Math.round(3 * dens) + 1; k++) {
        const p = edgePoint(isl, R(id * 73 + k) * Math.PI * 2, 0.6)
        deco.cylinder(0.22, 0.7, place(p.x, isl.y + 0.35, p.z), [0.9, 0.88, 0.8], 6)
        glow.blob(0.9, 1, 0.45, 1, p.x, isl.y + 0.72, p.z, th.glow2, 6)
      }
    }
    if (tag === "triangle" || tag === "fragment" || tag === "plaza" || tag === "colonnade" || (isl.kind === "boss" && th.tile === "rune")) {
      // filete dourado na face de cima e lascas de pedra flutuando em volta
      const O = isl.poly ?? []
      const m = O.length / 2
      for (let k = 0; k < m; k++) {
        const ax = O[k * 2]
        const az = O[k * 2 + 1]
        const bx = O[((k + 1) % m) * 2]
        const bz = O[((k + 1) % m) * 2 + 1]
        const L = Math.hypot(bx - ax, bz - az)
        const ang = Math.atan2(bx - ax, bz - az) + Math.PI / 2
        const mx = (ax + bx) / 2 + ((ax + bx) / 2 - isl.x) * 0.012
        const mz = (az + bz) / 2 + ((az + bz) / 2 - isl.z) * 0.012
        glow.box(L * 0.9, 0.1, 0.05, place(mx, isl.y - 0.45, mz, ang), th.trim)
      }
      for (let k = 0; k < Math.round(2 * dens); k++) {
        const a = R(id * 79 + k) * Math.PI * 2
        const d = isl.r + 2 + R(id * 83 + k) * 4
        deco.box(0.8 + R(k) * 1.2, 0.6 + R(k + 3) * 1.4, 0.7 + R(k + 5), place(isl.x + Math.sin(a) * d, isl.y - 1 - R(id + k) * 4, isl.z + Math.cos(a) * d, a), th.strata[3])
      }
    }
    if (tag === "basalt" || tag === "basaltlong" || (isl.kind === "boss" && th.tile === "basalt")) {
      // gotas de lava penduradas
      for (let k = 0; k < Math.round(isl.r * 0.8 * dens) + 1; k++) {
        const p = edgePoint(isl, R(id * 89 + k) * Math.PI * 2, 0.1)
        const len = 0.6 + R(id * 97 + k) * 2.4
        glow.box(0.16, len, 0.16, place(p.x, isl.y - 0.4 - len / 2, p.z), th.glow)
      }
      if (R(id * 7) < 0.45 && isl.kind !== "boss") {
        const p = edgePoint(isl, R(id * 11) * Math.PI * 2, -0.1)
        fallList.push({ x: p.x, z: p.z, y: isl.y - 0.4, len: 18 + R(id) * 6, w: 1 + R(id * 3), a: Math.atan2(p.x - isl.x, p.z - isl.z) })
      }
    }
  }

  // ── enfeites que colidem (pilar/caixote) — mesmas medidas da regra ──
  const drawProp = (p: PaintProp) => {
    const tag = p.tag ?? ""
    if (p.kind === "pillar") {
      const d = p.s * 2
      if (tag === "trunk") {
        // o tronco da árvore: afina para cima, raízes no pé, galhos e cristais
        deco.cone(d * 0.82, d * 1.05, p.h, place(p.x, p.y + p.h / 2, p.z), [0.4, 0.29, 0.22], 14)
        for (let k = 0; k < 8; k++) {
          const a = (k / 8) * Math.PI * 2 + 0.3
          deco.box(1.3, 1.6, 4.5, Matrix.RotationX(0.5).multiply(Matrix.RotationY(a)).multiply(Matrix.Translation(p.x + Math.sin(a) * (p.s + 1.2), p.y + 0.5, p.z + Math.cos(a) * (p.s + 1.2))), [0.36, 0.26, 0.2])
        }
        for (let k = 0; k < 10; k++) {
          const a = rnd(k * 13 + 5) * Math.PI * 2
          const y = p.y + 3 + rnd(k * 17) * (p.h - 5)
          glow.cone(0, 0.5, 1.2, Matrix.RotationX(Math.PI / 2 - 0.3).multiply(Matrix.RotationY(a)).multiply(Matrix.Translation(p.x + Math.sin(a) * p.s * 0.92, y, p.z + Math.cos(a) * p.s * 0.92)), k % 2 ? th.glow : th.glow2, 5)
        }
        return
      }
      if (tag === "core") {
        // a coluna partida do templo: fuste com anéis dourados e topo quebrado
        deco.cylinder(d, p.h, place(p.x, p.y + p.h / 2, p.z), th.strata[0], 16)
        for (const f of [0.15, 0.45, 0.75]) glow.cylinder(d * 1.04, 0.22, place(p.x, p.y + p.h * f, p.z), th.trim, 16)
        for (let k = 0; k < 6; k++) deco.box(d * 0.3, 1 + rnd(k) * 1.4, d * 0.3, place(p.x + Math.sin(k) * p.s * 0.6, p.y + p.h + 0.4, p.z + Math.cos(k) * p.s * 0.6, k), th.strata[1])
        return
      }
      // coluna: base, fuste, capitel (dourado no templo e no jardim)
      deco.cylinder(d * 1.25, 0.3, place(p.x, p.y + 0.15, p.z), mul(th.top, 0.85), 10)
      deco.cylinder(d, p.h - 0.55, place(p.x, p.y + 0.3 + (p.h - 0.55) / 2, p.z), mix(th.top, [1, 1, 1], 0.25), 10)
      deco.cylinder(d * 1.3, 0.25, place(p.x, p.y + p.h - 0.12, p.z), th.trim, 10)
      return
    }
    const w = (p.w ?? p.s) * 2
    const dd = p.s * 2
    if (tag === "furnace") {
      // a fornalha: caixa de ferro com frestas acesas e boca de fogo embaixo
      deco.box(w, p.h, dd, place(p.x, p.y + p.h / 2, p.z, p.rot), [0.2, 0.19, 0.2])
      for (let k = 0; k < 4; k++) {
        const a = (k * Math.PI) / 2
        for (let s = 0; s < 5; s++) glow.box(w * 0.12, p.h * 0.12, 0.05, place(p.x + Math.sin(a) * (dd / 2 + 0.02) + Math.cos(a) * (s - 2) * w * 0.18, p.y + p.h * 0.25 + (s % 2) * 3, p.z + Math.cos(a) * (dd / 2 + 0.02) - Math.sin(a) * (s - 2) * w * 0.18, a), th.glow)
      }
      glow.box(w * 0.5, 1.6, 0.05, place(p.x, p.y + 1, p.z + dd / 2 + 0.03), mix(th.glow, [1, 1, 0.6], 0.4))
      for (const f of [0.33, 0.66, 0.98]) deco.box(w + 0.2, 0.35, dd + 0.2, place(p.x, p.y + p.h * f, p.z, p.rot), th.trim)
      return
    }
    if (tag === "ruinwall") {
      deco.box(w, p.h, dd, place(p.x, p.y + p.h / 2, p.z, p.rot), mix(th.top, [0.8, 0.8, 0.8], 0.3))
      deco.box(w + 0.1, 0.2, dd + 0.1, place(p.x, p.y + p.h, p.z, p.rot), th.trim)
      return
    }
    // caixote de carga
    deco.box(w, p.h, dd, place(p.x, p.y + p.h / 2, p.z, p.rot), [0.55, 0.4, 0.26])
    for (const sy of [0.06, p.h - 0.06]) deco.box(w + 0.04, 0.1, dd + 0.04, place(p.x, p.y + sy, p.z, p.rot), th.trim)
  }
  for (const p of map.props) drawProp(p)

  // ── cachoeiras (água ou lava): planos que rolam ──
  for (const f of fallList.slice(0, lowEnd ? 4 : 10)) {
    const vd = new VertexData()
    const hw = f.w / 2
    const cx = Math.cos(f.a)
    const sz = -Math.sin(f.a)
    const out = 0.25
    const x0 = f.x + Math.sin(f.a) * out
    const z0 = f.z + Math.cos(f.a) * out
    vd.positions = [x0 - cx * hw, f.y, z0 - sz * hw, x0 + cx * hw, f.y, z0 + sz * hw, x0 + cx * hw * 1.6 + Math.sin(f.a) * 2, f.y - f.len, z0 + sz * hw * 1.6 + Math.cos(f.a) * 2, x0 - cx * hw * 1.6 + Math.sin(f.a) * 2, f.y - f.len, z0 - sz * hw * 1.6 + Math.cos(f.a) * 2]
    vd.indices = [0, 1, 2, 0, 2, 3]
    vd.uvs = [0, 0, 1, 0, 1, f.len / 6, 0, f.len / 6]
    vd.normals = [0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1]
    falls.raw(vd, th.floor === "lava" ? th.glow : [0.86, 0.94, 1])
  }

  // ── chão do mundo: nuvens ou mar de lava ──
  const bi = map.islands[map.boss.island]
  let lavaTex: DynamicTexture | null = null
  if (th.floor === "lava") {
    lavaTex = own(new DynamicTexture("paint-arena-lava", { width: 128, height: 128 }, scene, true))
    const g = lavaTex.getContext() as unknown as CanvasRenderingContext2D
    g.fillStyle = "rgb(255,96,20)"
    g.fillRect(0, 0, 128, 128)
    for (let i = 0; i < 70; i++) {
      g.fillStyle = i % 3 ? "rgba(120,20,10,0.55)" : "rgba(255,210,90,0.7)"
      g.beginPath()
      g.arc(rnd(i * 3) * 128, rnd(i * 7) * 128, 3 + rnd(i * 11) * 12, 0, Math.PI * 2)
      g.fill()
    }
    lavaTex.wrapU = Texture.WRAP_ADDRESSMODE
    lavaTex.wrapV = Texture.WRAP_ADDRESSMODE
    lavaTex.uScale = 40
    lavaTex.vScale = 40
    lavaTex.update(false)
    const lavaMat = own(new StandardMaterial("paint-arena-lava", scene))
    lavaMat.disableLighting = true
    lavaMat.emissiveTexture = lavaTex
    lavaMat.diffuseColor = new Color3(0, 0, 0)
    lavaMat.fogEnabled = false
    const sea = own(CreateDisc("paint-arena-lava", { radius: 520, tessellation: 48 }, scene))
    sea.rotation.x = Math.PI / 2
    sea.position.set(0, -22, 140)
    sea.material = lavaMat
    sea.isPickable = false
    sea.freezeWorldMatrix()
    // pináculos de basalto saindo da lava, ao longe
    for (let i = 0; i < (lowEnd ? 18 : 34); i++) {
      const a = rnd(i * 5 + 1) * Math.PI * 2
      const d = 85 + rnd(i * 7) * 120
      const h = 20 + rnd(i * 11) * 50
      deco.cone(0.4, 6 + rnd(i * 13) * 10, h, place(Math.sin(a) * d, -22 + h / 2, Math.cos(a) * d * 0.8), th.strata[i % 3], 6)
    }
  } else {
    const cg = new ArenaGeo()
    const puffs = lowEnd ? 60 : 120
    const col: RGB = th.floorColor
    for (let i = 0; i < puffs; i++) {
      const a = rnd(i * 3 + 101) * Math.PI * 2
      const far = i % 3 === 0
      const d = far ? 120 + rnd(i * 5 + 7) * 90 : rnd(i * 5 + 7) * 95
      const x = Math.sin(a) * d
      const z = Math.cos(a) * d * 0.75
      const y = far ? -12 + rnd(i + 3) * 18 : -24 + rnd(i + 3) * 10
      const s = (far ? 26 : 14) * (0.6 + rnd(i * 7 + 2) * 0.8)
      for (let k = 0; k < 3; k++) cg.blob(s * (0.55 + rnd(i * 41 + k) * 0.4), 1, 0.42, 0.8, x + (rnd(i * 31 + k) - 0.5) * s * 0.9, y, z + (rnd(i * 37 + k) - 0.5) * s * 0.5, col, 7)
    }
    for (let i = 0; i < 20; i++) {
      const a = (i / 20) * Math.PI * 2
      const d = 30 + rnd(i + 900) * 40
      cg.blob(18 + rnd(i + 950) * 14, 1, 0.42, 0.8, bi.x + Math.sin(a) * d, bi.y - 18 - rnd(i + 990) * 8, bi.z + Math.cos(a) * d, col, 7)
    }
    cg.cylinder(520, 0.5, place(0, -28, 0), col, 32)
    cg.cylinder(260, 0.5, place(bi.x, bi.y - 28, bi.z), col, 32)
    const cloudMat = own(new StandardMaterial("paint-arena-cloud", scene))
    cloudMat.diffuseColor = new Color3(0.4, 0.4, 0.42)
    cloudMat.emissiveColor = c3(mix(th.fog, col, 0.5))
    cloudMat.specularColor = new Color3(0, 0, 0)
    if (th.floor === "mist") cloudMat.alpha = 0.92
    own(cg.build("paint-arena-clouds", scene, cloudMat))
  }

  // ── paisagem ao longe (escala) ──
  for (let i = 0; i < (lowEnd ? 8 : 16); i++) {
    const a = (i / (lowEnd ? 8 : 16)) * Math.PI * 2 + rnd(i) * 0.3
    const d = 120 + rnd(i * 3) * 60
    const x = Math.sin(a) * d
    const z = Math.cos(a) * d * 0.8
    const y = -6 + rnd(i * 5) * 26
    if (th.tile === "garden" || th.tile === "rune") {
      // ruínas soltas: rocha, colunas (e obeliscos no templo)
      deco.cone(9 + rnd(i) * 6, 1, 14 + rnd(i * 7) * 8, place(x, y - 7, z), th.strata[2], 7)
      deco.cylinder(16 + rnd(i) * 6, 1.2, place(x, y, z), th.top, 10)
      for (let k = 0; k < 3; k++) deco.cylinder(1, 5 + rnd(i * 9 + k) * 4, place(x + (k - 1) * 4, y + 3, z + rnd(k) * 3), mix(th.top, [1, 1, 1], 0.2), 8)
      if (th.tile === "rune") deco.cone(0.2, 3, 22, place(x * 0.9, y + 22, z * 0.9), th.strata[4], 4)
    } else if (th.tile === "plate") {
      // engrenagens gigantes e chaminés
      deco.cylinder(26 + rnd(i) * 10, 2, Matrix.RotationX(Math.PI / 2).multiply(Matrix.RotationY(a)).multiply(Matrix.Translation(x, y + 10, z)), mul(th.top, 0.55), 16)
      deco.cylinder(4, 40, place(x * 1.1, y - 5, z * 1.1), mul(th.strata[1], 1.1), 10)
    } else if (th.tile === "moss") {
      // árvores ao longe
      deco.cone(4, 7, 50, place(x, y - 6, z), [0.32, 0.24, 0.2], 8)
      deco.blob(30, 1, 0.6, 1, x, y + 22, z, mix(th.top, th.accent, rnd(i) * 0.4), 8)
    }
  }

  // ── monta as malhas ──
  const built: Mesh[] = []
  if (tops.vertexCount) built.push(tops.build("paint-arena-tops", scene, topMat))
  if (metal.vertexCount) built.push(metal.build("paint-arena-metal", scene, metalMat))
  if (deco.vertexCount) built.push(deco.build("paint-arena-deco", scene, solidMat))
  if (glow.vertexCount) built.push(glow.build("paint-arena-glow", scene, glowMat))
  {
    const rm = new Mesh("paint-arena-rock", scene)
    const vd = new VertexData()
    vd.positions = rock.p
    vd.colors = rock.c
    vd.indices = rock.i
    const rn: number[] = []
    VertexData.ComputeNormals(rock.p, rock.i, rn)
    vd.normals = rn
    vd.applyToMesh(rm, true)
    rm.convertToFlatShadedMesh()
    const rmat = own(new StandardMaterial("paint-arena-rock", scene))
    rmat.diffuseColor = new Color3(1, 1, 1)
    rmat.specularColor = new Color3(0.03, 0.03, 0.03)
    rmat.emissiveColor = c3(mul(th.hemi, 0.14))
    rm.material = rmat
    rm.isPickable = false
    rm.freezeWorldMatrix()
    built.push(rm)
  }
  let fallTex: DynamicTexture | null = null
  if (falls.vertexCount) {
    fallTex = own(fallTexture(scene, th.floor === "lava"))
    const fm = own(new StandardMaterial("paint-arena-falls", scene))
    fm.disableLighting = true
    fm.emissiveTexture = fallTex
    fm.opacityTexture = fallTex
    fm.diffuseColor = new Color3(0, 0, 0)
    fm.emissiveColor = new Color3(1, 1, 1)
    fm.backFaceCulling = false
    built.push(falls.build("paint-arena-falls", scene, fm))
  }
  for (const m of built) disposers.push(() => m.dispose())

  // ── portais (um por time, no alto do meio) ──
  const portalNodes: { ring: StandardMaterial; swirl: Mesh; open: boolean }[] = []
  const swirlTex = own(new DynamicTexture("paint-arena-swirl", { width: 256, height: 256 }, scene, true))
  {
    const g = swirlTex.getContext() as unknown as CanvasRenderingContext2D
    const sw = th.portalSwirl.map((v) => Math.round(v * 255))
    const grd = g.createRadialGradient(128, 128, 8, 128, 128, 128)
    grd.addColorStop(0, "rgba(255,255,255,1)")
    grd.addColorStop(0.45, `rgba(${sw[0]},${sw[1]},${sw[2]},0.9)`)
    grd.addColorStop(1, `rgba(${sw[0]},${sw[1]},${sw[2]},0)`)
    g.fillStyle = grd
    g.fillRect(0, 0, 256, 256)
    g.strokeStyle = "rgba(255,255,255,0.7)"
    g.lineWidth = 6
    for (let k = 0; k < 5; k++) {
      g.beginPath()
      for (let t = 0; t < 1; t += 0.02) {
        const a = k * 1.256 + t * 5
        const r = 12 + t * 110
        const x = 128 + Math.cos(a) * r
        const y = 128 + Math.sin(a) * r
        if (t === 0) g.moveTo(x, y)
        else g.lineTo(x, y)
      }
      g.stroke()
    }
    swirlTex.hasAlpha = true
    swirlTex.update(false)
  }
  map.portals.forEach((p, team) => {
    const root = new TransformNode(`paint-arena-portal-${team}`, scene)
    root.position.set(p.x, p.y, p.z)
    // virado para o lado de quem chega (o portal do time 0 olha para oeste)
    root.rotation.y = Math.atan2(Math.sign(p.x) || 1, 0)
    const ringMat = own(new StandardMaterial(`paint-arena-portal-ring-${team}`, scene))
    ringMat.diffuseColor = c3(th.portalRing)
    ringMat.specularColor = new Color3(0.4, 0.36, 0.3)
    const ring = CreateTorus(`paint-arena-portal-ring-${team}`, { diameter: TUNING.portalR * 2, thickness: 0.34, tessellation: 40 }, scene)
    ring.rotation.x = Math.PI / 2
    ring.position.y = TUNING.portalR + 0.15
    ring.parent = root
    ring.material = ringMat
    ring.isPickable = false
    const swirlMat = own(new StandardMaterial(`paint-arena-portal-swirl-${team}`, scene))
    swirlMat.diffuseTexture = swirlTex
    swirlMat.opacityTexture = swirlTex
    swirlMat.emissiveColor = c3(mix(th.portalSwirl, [1, 1, 1], 0.4))
    swirlMat.disableLighting = true
    swirlMat.backFaceCulling = false
    const swirl = CreateDisc(`paint-arena-portal-swirl-${team}`, { radius: TUNING.portalR - 0.12, tessellation: 36 }, scene)
    swirl.position.y = TUNING.portalR + 0.15
    swirl.parent = root
    swirl.material = swirlMat
    swirl.isPickable = false
    swirl.setEnabled(false)
    const base = CreateDisc(`paint-arena-portal-base-${team}`, { radius: TUNING.portalR * 1.25, tessellation: 24 }, scene)
    base.rotation.x = Math.PI / 2
    base.position.y = 0.03
    base.parent = root
    const bm = own(new StandardMaterial(`paint-arena-portal-base-${team}`, scene))
    bm.disableLighting = true
    bm.emissiveColor = c3(mul(th.portalSwirl, 0.6))
    bm.alpha = 0.55
    base.material = bm
    base.isPickable = false
    portalNodes.push({ ring: ringMat, swirl, open: false })
    disposers.push(() => root.dispose(false, true))
  })

  // ── relâmpago (só no templo): clarão na luz de cima e um raio ao longe ──
  let bolt: Mesh | null = null
  if (th.tile === "rune") {
    const bg = new ArenaGeo()
    let x = 0
    let y = 60
    for (let k = 0; k < 9; k++) {
      const nx = x + (rnd(k * 7) - 0.5) * 9
      const ny = y - 7
      const L = Math.hypot(nx - x, ny - y)
      bg.box(0.5, L, 0.5, Matrix.RotationZ(Math.atan2(x - nx, y - ny)).multiply(Matrix.Translation((x + nx) / 2, (y + ny) / 2, 0)), [0.85, 0.9, 1])
      x = nx
      y = ny
    }
    const bm = own(new StandardMaterial("paint-arena-bolt", scene))
    bm.disableLighting = true
    bm.emissiveColor = new Color3(1, 1, 1)
    bm.diffuseColor = new Color3(0, 0, 0)
    bm.fogEnabled = false
    bolt = own(bg.build("paint-arena-bolt", scene, bm, false))
    bolt.setEnabled(false)
  }

  let clock = 0
  let nextBolt = 3
  let boltOff = 0
  return {
    setPortalOpen(team, open) {
      const p = portalNodes[team]
      if (!p || p.open === open) return
      p.open = open
      p.swirl.setEnabled(open)
      p.ring.emissiveColor = open ? c3(mul(th.portalSwirl, 0.7)) : new Color3(0, 0, 0)
    },
    tick(dt) {
      clock += dt
      for (const p of portalNodes) if (p.open) p.swirl.rotation.z = -clock * 1.6
      if (fallTex) fallTex.vOffset = (fallTex.vOffset - dt * (th.floor === "lava" ? 0.35 : 0.9)) % 1
      if (lavaTex) {
        lavaTex.uOffset = (lavaTex.uOffset + dt * 0.004) % 1
        lavaTex.vOffset = (lavaTex.vOffset + dt * 0.002) % 1
      }
      if (bolt && hemi) {
        if (clock >= nextBolt) {
          const a = rnd(Math.floor(clock * 10)) * Math.PI * 2
          bolt.position.set(Math.sin(a) * 110, 10, Math.cos(a) * 110)
          bolt.rotation.y = a
          bolt.setEnabled(true)
          hemi.intensity = th.hemiK * 1.9
          boltOff = clock + 0.16
          nextBolt = clock + 5 + rnd(Math.floor(clock)) * 8
        } else if (boltOff && clock >= boltOff) {
          bolt.setEnabled(false)
          hemi.intensity = th.hemiK
          boltOff = 0
        }
      }
    },
    dispose() {
      for (const d of disposers.splice(0).reverse()) d()
    },
  }
}
