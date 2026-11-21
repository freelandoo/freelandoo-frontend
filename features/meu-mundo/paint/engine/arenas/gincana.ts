// features/meu-mundo/paint/engine/arenas/gincana.ts — PAINT (2026-11-21): as PROVAS DA GINCANA no meio das fases.
//
// Pedido do Alex: "aumente 4x todas as fases … coloque bastantes elementos da
// Gincana de cada fase lá". A regra (`sim/maps.ts`, `enlargeMap`) pôs nos vãos
// largos peças com `tag` "gk-*" — o tipo de peça das provas da Gincana daquela
// fase (tábua de gangorra, tora da serraria, hélice da Orbital, comporta…),
// paradas como tudo no Paint. Aqui o desenho de cada uma, nos 11 mapas.
//
// Regra do desenho: o CHÃO é o contorno exato da colisão (o `floor` comum, na
// altura da regra) e o corpo da peça fica todo EMBAIXO dele — nada sobe acima
// de onde se anda (gatinho, tinta e câmera ficam livres). Nada aqui colide.

import { Matrix } from "@babylonjs/core/Maths/math.vector"
import { VertexData } from "@babylonjs/core/Meshes/mesh.vertexData"
import { place, type RGB } from "../../../engine/geometry"
import type { Island } from "../../sim/map"
import type { ArenaGeo } from "../arena-kit"
import type { PaintTheme } from "../paint-map-art"

export interface GincanaApi {
  deco: ArenaGeo
  glow: ArenaGeo
  th: Pick<PaintTheme, "top" | "rim" | "trim" | "accent" | "glow" | "glow2" | "tile">
  low: boolean
  outlineOf: (isl: Island, maxSeg?: number) => [number, number][]
  /** O chão comum (miolo + borda) na altura exata da colisão. */
  floor: (isl: Island, metal: boolean, top: RGB, rim: RGB, stripes?: boolean) => void
}

const WOOD: RGB = [0.58, 0.38, 0.23]
const WOOD_HI: RGB = [0.78, 0.56, 0.34]
const WOOD_DK: RGB = [0.3, 0.19, 0.12]
const ROPE: RGB = [0.8, 0.68, 0.46]
const IRON: RGB = [0.17, 0.17, 0.19]
const STEEL: RGB = [0.52, 0.54, 0.6]
const STEEL_DK: RGB = [0.24, 0.25, 0.3]
const BRONZE: RGB = [0.8, 0.56, 0.3]
const BRONZE_HI: RGB = [1, 0.8, 0.5]
const BRONZE_DK: RGB = [0.42, 0.26, 0.14]
const CONC: RGB = [0.68, 0.66, 0.62]
const CONC_DK: RGB = [0.42, 0.41, 0.39]
const ROCK: RGB = [0.46, 0.42, 0.4]
const ROCK_DK: RGB = [0.28, 0.25, 0.24]
const ICE: RGB = [0.56, 0.84, 0.98]
const ICE_DK: RGB = [0.16, 0.4, 0.7]
const SNOW: RGB = [0.94, 0.98, 1]
const HULL: RGB = [0.12, 0.12, 0.15]
const RED: RGB = [0.82, 0.18, 0.15]
const CUT: RGB = [0.78, 0.6, 0.4]
const BARK: RGB = [0.32, 0.2, 0.13]
const MOSS: RGB = [0.3, 0.52, 0.24]
const BASALT: RGB = [0.13, 0.12, 0.13]
const LAVA: RGB = [1, 0.46, 0.12]
const CAP: RGB = [0.62, 0.3, 0.78]
const CAP_RED: RGB = [0.86, 0.22, 0.2]
const STEM: RGB = [0.9, 0.86, 0.78]
const GRASS: RGB = [0.5, 0.7, 0.3]
const WHITE: RGB = [0.95, 0.95, 0.93]

const mul = (c: RGB, k: number): RGB => [c[0] * k, c[1] * k, c[2] * k]
const mix = (a: RGB, b: RGB, t: number): RGB => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]

/** Faixa entre dois anéis do contorno (k = escala em volta do centro), no sentido do contorno comum. */
function band(g: ArenaGeo, O: [number, number][], cx: number, cz: number, y0: number, k0: number, y1: number, k1: number, c: RGB) {
  const n = O.length
  const pos: number[] = []
  for (const [y, k] of [[y0, k0], [y1, k1]]) for (const [x, z] of O) pos.push(cx + (x - cx) * k, y, cz + (z - cz) * k)
  const idx: number[] = []
  for (let i = 0; i < n; i++) {
    const a = i
    const b = (i + 1) % n
    idx.push(a, b, a + n, b, b + n, a + n)
  }
  const vd = new VertexData()
  vd.positions = pos
  vd.indices = idx
  const nr: number[] = []
  VertexData.ComputeNormals(pos, idx, nr)
  vd.normals = nr
  g.raw(vd, c)
}

/** Fecha embaixo: leque até uma ponta (ou tampa chata se `ty` = y). */
function tip(g: ArenaGeo, O: [number, number][], cx: number, cz: number, y: number, k: number, tx: number, ty: number, tz: number, c: RGB) {
  const n = O.length
  const pos: number[] = []
  for (const [x, z] of O) pos.push(cx + (x - cx) * k, y, cz + (z - cz) * k)
  pos.push(tx, ty, tz)
  const idx: number[] = []
  for (let i = 0; i < n; i++) idx.push(i, (i + 1) % n, n)
  const vd = new VertexData()
  vd.positions = pos
  vd.indices = idx
  const nr: number[] = []
  VertexData.ComputeNormals(pos, idx, nr)
  vd.normals = nr
  g.raw(vd, c)
}

/** Perfil (através, altura) puxado ao longo do caminho; as duas faces (o perfil não tem sentido garantido). */
function extrude(g: ArenaGeo, prof: [number, number][], ang: number, cx: number, cy: number, cz: number, len: number, c: RGB) {
  const ax = Math.sin(ang)
  const az = Math.cos(ang)
  const ux = Math.cos(ang)
  const uz = -Math.sin(ang)
  const P = (u: number, v: number, s: number) => [cx + ux * u + ax * s, cy + v, cz + uz * u + az * s]
  for (const flip of [false, true]) {
    const pos: number[] = []
    const idx: number[] = []
    for (let i = 0; i + 1 < prof.length; i++) {
      const b = pos.length / 3
      pos.push(...P(prof[i][0], prof[i][1], -len / 2), ...P(prof[i + 1][0], prof[i + 1][1], -len / 2), ...P(prof[i + 1][0], prof[i + 1][1], len / 2), ...P(prof[i][0], prof[i][1], len / 2))
      if (flip) idx.push(b, b + 2, b + 1, b, b + 3, b + 2)
      else idx.push(b, b + 1, b + 2, b, b + 2, b + 3)
    }
    // tampas das pontas
    for (const s of [-len / 2, len / 2]) {
      const b = pos.length / 3
      for (const [u, v] of prof) pos.push(...P(u, v, s))
      for (let i = 1; i + 1 < prof.length; i++) {
        if (flip !== (s > 0)) idx.push(b, b + i, b + i + 1)
        else idx.push(b, b + i + 1, b + i)
      }
    }
    const vd = new VertexData()
    vd.positions = pos
    vd.indices = idx
    const nr: number[] = []
    VertexData.ComputeNormals(pos, idx, nr)
    vd.normals = nr
    g.raw(vd, c)
  }
}

/** Eixo comprido da peça (direção, comprimento e largura) pelos cantos do contorno. */
function axisOf(isl: Island) {
  const p = isl.poly ?? []
  let best = 0
  let ang = 0
  for (let i = 0; i < p.length; i += 2) {
    for (let j = i + 2; j < p.length; j += 2) {
      const d = Math.hypot(p[j] - p[i], p[j + 1] - p[i + 1])
      if (d > best) {
        best = d
        ang = Math.atan2(p[j] - p[i], p[j + 1] - p[i + 1])
      }
    }
  }
  // retângulo: comprimento e largura pelos dois primeiros lados
  if (p.length === 8) {
    const e1 = Math.hypot(p[2] - p[0], p[3] - p[1])
    const e2 = Math.hypot(p[4] - p[2], p[5] - p[3])
    const along = e2 >= e1 ? [p[4] - p[2], p[5] - p[3]] : [p[2] - p[0], p[3] - p[1]]
    return { ang: Math.atan2(along[0], along[1]), len: Math.max(e1, e2), wid: Math.min(e1, e2) }
  }
  return { ang, len: best, wid: isl.r * 2 }
}

const R = (isl: Island) => {
  const p = isl.poly ?? []
  let r = isl.r
  for (let i = 0; i < p.length; i += 2) r = Math.max(r, Math.hypot(p[i] - isl.x, p[i + 1] - isl.z))
  return r
}

/** Uma prova da Gincana (a peça com `tag` "gk-*"). */
export function drawGincana(api: GincanaApi, isl: Island) {
  const { deco, glow, th } = api
  const tag = isl.tag ?? ""
  const O = api.outlineOf(isl, 1)
  const x = isl.x
  const y = isl.y
  const z = isl.z
  const r = isl.r
  const rr = R(isl)
  const { ang, len, wid } = axisOf(isl)
  const along = (s: number, u = 0, dy = 0) => place(x + Math.sin(ang) * s + Math.cos(ang) * u, y + dy, z + Math.cos(ang) * s - Math.sin(ang) * u, ang)
  const seed = isl.id * 7

  switch (tag) {
    case "gk-tabua": {
      // tábua da GANGORRA: pranchas, duas vigas, o pivô de pedra e a corda
      api.floor(isl, false, WOOD_HI, WOOD_DK)
      band(deco, O, x, z, y, 1, y - 0.42, 1, WOOD)
      tip(deco, O, x, z, y - 0.42, 1, x, y - 0.42, z, WOOD_DK)
      for (let s = -len / 2 + 0.9; s < len / 2 - 0.5; s += 1.15) deco.box(wid * 0.98, 0.03, 0.06, along(s, 0, 0.012), WOOD_DK)
      for (const u of [-wid * 0.3, wid * 0.3]) deco.box(0.3, 0.34, len * 0.94, along(0, u, -0.6), WOOD_DK)
      // pivô: cunha de madeira sobre o pião de pedra
      deco.box(wid * 0.9, 0.5, 0.9, along(0, 0, -0.98), WOOD_DK)
      deco.cone(0.5, 2.6, 1.4, along(0, 0, -1.9), ROCK, 7)
      deco.cone(2.6, 0.3, 3.2, along(0, 0, -4.2), ROCK_DK, 7)
      deco.blob(1.4, 1, 0.8, 1, x, y - 6, z, mul(ROCK_DK, 0.8), 4)
      // corda pendurada nas pontas
      for (const s of [-len / 2 + 0.3, len / 2 - 0.3]) deco.cylinder(0.08, 1.6, along(s, wid * 0.45, -1.2), ROPE, 4)
      break
    }
    case "gk-helice": {
      // pá da HÉLICE da Orbital: aço com filete aceso, cubo e o propulsor embaixo
      api.floor(isl, true, STEEL, mix(STEEL, th.glow, 0.4))
      band(deco, O, x, z, y, 1, y - 0.3, 1.02, STEEL)
      band(deco, O, x, z, y - 0.3, 1.02, y - 0.6, 0.8, STEEL_DK)
      tip(deco, O, x, z, y - 0.6, 0.8, x, y - 0.6, z, STEEL_DK)
      for (const u of [-wid / 2 - 0.02, wid / 2 + 0.02]) glow.box(0.08, 0.1, len * 0.96, along(0, u, -0.16), th.glow)
      deco.cylinder(2.2, 1.2, along(0, 0, -1.2), STEEL_DK, 10)
      deco.cylinder(1.4, 0.3, along(0, 0, -1.95), th.trim, 10)
      glow.cone(1.4, 0.05, 2.4, along(0, 0, -3.3), th.glow2, 10)
      break
    }
    case "gk-esteira": {
      // ESTEIRA da Fábrica: lona preta, rolos nas pontas, trilho listrado e a treliça
      api.floor(isl, true, [0.15, 0.15, 0.17], th.rim, true)
      band(deco, O, x, z, y, 1, y - 0.5, 1, IRON)
      tip(deco, O, x, z, y - 0.5, 1, x, y - 0.5, z, IRON)
      for (const s of [-len / 2 + 0.45, len / 2 - 0.45]) deco.cylinder(0.9, wid * 1.04, Matrix.RotationZ(Math.PI / 2).multiply(along(s, 0, -0.45)), STEEL, 10)
      for (let s = -len / 2 + 1.2; s < len / 2 - 1; s += 1.4) deco.box(wid * 0.9, 0.04, 0.12, along(s, 0, 0.012), [0.26, 0.26, 0.28])
      for (const u of [-wid * 0.35, wid * 0.35]) {
        deco.box(0.25, 3, 0.25, along(-len * 0.2, u, -2), IRON)
        deco.box(0.25, 3, 0.25, along(len * 0.2, u, -2), IRON)
      }
      deco.box(wid * 0.8, 0.25, len * 0.5, along(0, 0, -3.4), mul(IRON, 1.3))
      glow.box(0.3, 0.3, 0.3, along(len / 2 - 0.6, wid / 2, -0.25), th.accent)
      break
    }
    case "gk-tora": {
      // TORA da Serraria: serrada em cima (o chão), casca embaixo, anéis nas pontas, musgo
      api.floor(isl, false, CUT, mul(CUT, 0.75))
      // perfil: o arco de baixo do círculo da tora, cortado reto na largura do chão
      const Rl = wid * 0.62
      const a0 = Math.asin(Math.min(1, wid / 2 / Rl))
      const c0 = Math.cos(a0) * Rl
      const prof: [number, number][] = []
      for (let i = 0; i <= 12; i++) {
        const f = -a0 - (i / 12) * (Math.PI * 2 - 2 * a0)
        prof.push([Rl * Math.sin(f), -c0 + Rl * Math.cos(f) - 0.004])
      }
      extrude(deco, prof, ang, x, y, z, len, BARK)
      for (const s of [-len / 2 - 0.02, len / 2 + 0.02]) deco.cylinder((c0 + Rl) * 0.88, 0.05, Matrix.RotationX(Math.PI / 2).multiply(along(s, 0, -(c0 + Rl) / 2)), CUT, 12)
      deco.blob(1.4, 1.2, 0.35, 0.8, x + Math.cos(ang) * wid * 0.45, y - 0.25, z - Math.sin(ang) * wid * 0.45, MOSS, 4)
      break
    }
    case "gk-comporta": {
      // COMPORTA da Usina: concreto com faixa de bronze, as guias de ferro e o volante
      api.floor(isl, false, CONC, BRONZE)
      band(deco, O, x, z, y, 1, y - 0.3, 1.02, BRONZE)
      band(deco, O, x, z, y - 0.3, 1.02, y - 2.2, 1, CONC)
      band(deco, O, x, z, y - 2.2, 1, y - 2.6, 0.9, CONC_DK)
      tip(deco, O, x, z, y - 2.6, 0.9, x, y - 2.6, z, CONC_DK)
      for (const u of [-wid / 2 - 0.2, wid / 2 + 0.2]) deco.box(0.4, 5, 0.6, along(0, u, -2.4), IRON)
      deco.cylinder(1.6, 0.18, Matrix.RotationX(Math.PI / 2).multiply(along(len / 2 + 0.15, 0, -1.2)), BRONZE_DK, 12)
      deco.cylinder(0.3, 0.3, Matrix.RotationX(Math.PI / 2).multiply(along(len / 2 + 0.25, 0, -1.2)), BRONZE_HI, 8)
      glow.box(wid * 0.8, 0.12, 0.05, along(-len / 2 - 0.03, 0, -1.5), th.glow)
      break
    }
    case "gk-bloco": {
      // BLOCO DE GELO dos Portões: neve em cima, gelo com fenda acesa, ponta derretendo
      api.floor(isl, false, SNOW, ICE)
      band(deco, O, x, z, y, 1, y - 0.4, 1.04, SNOW)
      band(deco, O, x, z, y - 0.4, 1.04, y - 3.2, 0.96, ICE)
      band(deco, O, x, z, y - 3.2, 0.96, y - 4, 0.7, ICE_DK)
      tip(deco, O, x, z, y - 4, 0.7, x + 0.4, y - 6, z - 0.3, mul(ICE_DK, 0.8))
      glow.box(0.06, 2.2, wid * 0.7, along(len / 2 + 0.03, 0, -1.8), [0.6, 0.95, 1])
      glow.box(wid * 0.5, 1.6, 0.06, along(0, -wid / 2 - 0.03, -2.2), [0.6, 0.95, 1])
      break
    }
    case "gk-barco": {
      // BARCO preso no gelo (Estaleiro): convés de tábua, casco preto com a faixa vermelha
      api.floor(isl, false, WOOD_HI, WOOD_DK)
      band(deco, O, x, z, y, 1, y - 0.3, 1.04, RED)
      band(deco, O, x, z, y - 0.3, 1.04, y - 2, 0.98, HULL)
      band(deco, O, x, z, y - 2, 0.98, y - 2.4, 0.92, RED)
      tip(deco, O, x, z, y - 2.4, 0.92, x, y - 3.8, z, mul(RED, 0.6))
      band(deco, O, x, z, y - 1.7, 1.15, y - 2.6, 1.22, SNOW)
      for (let s = -len / 2 + 1; s < len / 2 - 0.8; s += 0.9) deco.box(wid * 0.9, 0.025, 0.05, along(s, 0, 0.012), WOOD_DK)
      for (const s of [-len * 0.25, 0, len * 0.25]) glow.cylinder(0.3, 0.05, Matrix.RotationZ(Math.PI / 2).multiply(along(s, rr * 0.62, -1)), [1, 0.82, 0.45], 8)
      break
    }
    case "gk-engrenagem": {
      // ENGRENAGEM: chapa com dentes em volta, eixo e o cubo aceso
      api.floor(isl, true, mix(STEEL, th.top, 0.4), th.trim, true)
      band(deco, O, x, z, y, 1, y - 0.9, 1, STEEL_DK)
      tip(deco, O, x, z, y - 0.9, 1, x, y - 0.9, z, IRON)
      const n = 14
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2
        deco.box(0.7, 0.8, 0.6, place(x + Math.sin(a) * (rr + 0.15), y - 0.45, z + Math.cos(a) * (rr + 0.15), a), STEEL_DK)
      }
      deco.cylinder(1.2, 4, place(x, y - 2.8, z), IRON, 10)
      deco.cylinder(2.2, 0.5, place(x, y - 1.2, z), th.trim, 12)
      glow.cylinder(0.8, 0.52, place(x, y - 1.2, z), th.glow, 10)
      break
    }
    case "gk-moinho": {
      // MOINHO do Cânion/Jardim: deck de tábua sobre a torre, quatro pás em cruz embaixo
      api.floor(isl, false, WOOD_HI, WOOD_DK)
      band(deco, O, x, z, y, 1, y - 0.4, 1, WOOD)
      tip(deco, O, x, z, y - 0.4, 1, x, y - 0.4, z, WOOD_DK)
      deco.cone(rr * 0.9, rr * 1.2, 5, place(x, y - 2.9, z), mix(ROCK, th.top, 0.3), 8)
      deco.cone(rr * 1.2, 0.4, 3, place(x, y - 6.9, z), ROCK_DK, 8)
      const hx = x + Math.cos(ang) * rr * 1.25
      const hz = z - Math.sin(ang) * rr * 1.25
      deco.cylinder(0.7, 0.8, Matrix.RotationZ(Math.PI / 2).multiply(place(hx, y - 3, hz, ang)), WOOD_DK, 8)
      for (let k = 0; k < 4; k++) {
        const t = (k / 4) * Math.PI * 2 + 0.4
        const m = Matrix.Translation(0, 2.2, 0).multiply(Matrix.RotationX(t)).multiply(place(hx, y - 3, hz, ang + Math.PI / 2))
        deco.box(0.1, 4.2, 0.9, m, k % 2 ? WHITE : mix(WOOD, RED, 0.3))
      }
      break
    }
    case "gk-crosta": {
      // CROSTA de lava da Forja: basalto preto com rachaduras acesas, pingos de lava
      api.floor(isl, false, BASALT, mul(LAVA, 0.6))
      band(deco, O, x, z, y, 1, y - 1.2, 1.06, BASALT)
      band(deco, O, x, z, y - 1.2, 1.06, y - 2.8, 0.6, mul(BASALT, 0.8))
      tip(deco, O, x, z, y - 2.8, 0.6, x + 0.5, y - 5, z, mul(BASALT, 0.6))
      for (let k = 0; k < 5; k++) {
        const a = (k / 5) * Math.PI * 2 + (seed % 7)
        const l = r * (0.5 + ((seed + k * 13) % 10) / 22)
        glow.box(0.12, 0.02, l, place(x + Math.sin(a) * l * 0.5, y + 0.014, z + Math.cos(a) * l * 0.5, a), LAVA)
        glow.cone(0.25, 0.02, 1.4, place(x + Math.sin(a) * rr * 0.8, y - 3, z + Math.cos(a) * rr * 0.8), LAVA, 5)
      }
      glow.box(rr * 1.6, 0.12, 0.12, place(x, y - 1.25, z, ang), LAVA)
      break
    }
    case "gk-cristal": {
      // CRISTAL dos Aros: laje de pedra clara com cristais acesos pendurados
      api.floor(isl, false, mix(th.top, WHITE, 0.25), th.glow)
      band(deco, O, x, z, y, 1, y - 0.6, 1.04, mix(th.top, ROCK, 0.4))
      band(deco, O, x, z, y - 0.6, 1.04, y - 1.6, 0.7, ROCK)
      tip(deco, O, x, z, y - 1.6, 0.7, x, y - 2.2, z, ROCK_DK)
      for (let k = 0; k < 5; k++) {
        const a = (k / 5) * Math.PI * 2 + 0.3
        const s = 0.8 + (k % 3) * 0.35
        glow.cone(0.05, 0.9 * s, 2.6 * s, Matrix.RotationZ(Math.PI).multiply(place(x + Math.sin(a) * r * 0.55, y - 1.6 - 1.3 * s, z + Math.cos(a) * r * 0.55)), k % 2 ? th.glow : th.glow2, 5)
      }
      glow.cone(0.05, 1.4, 4, Matrix.RotationZ(Math.PI).multiply(place(x, y - 4, z)), th.glow, 6)
      break
    }
    case "gk-tanque": {
      // TANQUE de bronze: tampa, cintas de rebite, corpo que desce e o cano
      api.floor(isl, true, BRONZE_HI, BRONZE)
      band(deco, O, x, z, y, 1, y - 0.25, 1.04, BRONZE)
      band(deco, O, x, z, y - 0.25, 1.04, y - 3.4, 1.0, BRONZE)
      band(deco, O, x, z, y - 3.4, 1.0, y - 4.6, 0.5, BRONZE_DK)
      tip(deco, O, x, z, y - 4.6, 0.5, x, y - 4.6, z, BRONZE_DK)
      for (const dy of [-0.5, -2.2]) {
        band(deco, O, x, z, y + dy, 1.05, y + dy - 0.3, 1.05, BRONZE_DK)
        const n = Math.round(rr * 4)
        if (!api.low) for (let k = 0; k < n; k++) deco.blob(0.2, 1, 1, 1, x + Math.sin((k / n) * Math.PI * 2) * rr * 1.06, y + dy - 0.15, z + Math.cos((k / n) * Math.PI * 2) * rr * 1.06, BRONZE_HI, 3)
      }
      deco.cylinder(0.8, 3, place(x, y - 6, z), IRON, 8)
      glow.box(0.5, 0.8, 0.06, place(x + Math.sin(ang) * rr * 1.02, y - 1.4, z + Math.cos(ang) * rr * 1.02, ang), th.glow)
      break
    }
    case "gk-barril": {
      // BARRIL da feira da Cidade: tampa de tábua, aros de ferro, bojo
      api.floor(isl, false, WOOD_HI, WOOD_DK)
      band(deco, O, x, z, y, 1, y - 1.2, 1.12, WOOD)
      band(deco, O, x, z, y - 1.2, 1.12, y - 2.6, 1, WOOD)
      tip(deco, O, x, z, y - 2.6, 1, x, y - 2.6, z, WOOD_DK)
      for (const [dy, k] of [[-0.2, 1.03], [-1.2, 1.13], [-2.3, 1.03]] as const) band(deco, O, x, z, y + dy, k, y + dy - 0.22, k, IRON)
      deco.blob(2.2, 1, 0.7, 1, x, y - 3.6, z, mix(th.top, ROCK, 0.5), 5)
      break
    }
    case "gk-aro": {
      // ARO aceso: disco com o aro de cristal em volta e o segundo aro embaixo
      api.floor(isl, false, mix(th.top, WHITE, 0.15), th.trim)
      band(deco, O, x, z, y, 1, y - 0.5, 1.02, mix(th.top, ROCK, 0.3))
      band(deco, O, x, z, y - 0.5, 1.02, y - 1.8, 0.55, ROCK)
      tip(deco, O, x, z, y - 1.8, 0.55, x, y - 3.2, z, ROCK_DK)
      glow.annulus(x, y - 0.2, z, rr + 0.25, rr + 0.55, th.glow, 28)
      glow.annulus(x, y - 2.4, z, rr * 0.7, rr * 0.7 + 0.25, th.glow2, 24)
      for (let k = 0; k < 6; k++) {
        const a = (k / 6) * Math.PI * 2
        deco.box(0.2, 2.2, 0.2, place(x + Math.sin(a) * rr * 0.82, y - 1.3, z + Math.cos(a) * rr * 0.82, a), th.trim)
      }
      break
    }
    case "gk-feira": {
      // BARRACA DA FEIRA: toldo listrado redondo (o chão) e a saia de lona, caixotes pendurados
      api.floor(isl, false, mix(WHITE, th.accent, 0.15), RED)
      band(deco, O, x, z, y, 1, y - 0.5, 1.04, RED)
      band(deco, O, x, z, y - 0.5, 1.04, y - 1.6, 0.92, WHITE)
      band(deco, O, x, z, y - 1.6, 0.92, y - 2.4, 0.5, WOOD)
      tip(deco, O, x, z, y - 2.4, 0.5, x, y - 2.4, z, WOOD_DK)
      for (let k = 0; k < 8; k += 2) {
        const a = (k / 8) * Math.PI * 2
        deco.box(0.06, 1.05, rr * 0.8, place(x + Math.sin(a) * rr * 0.98, y - 1.05, z + Math.cos(a) * rr * 0.98, a + Math.PI / 2), RED)
      }
      deco.box(1.1, 1, 1.1, place(x + 0.6, y - 3, z - 0.3, 0.4), WOOD)
      deco.box(0.9, 0.8, 0.9, place(x - 0.7, y - 3.1, z + 0.5, -0.3), WOOD_HI)
      glow.blob(0.5, 1, 1.2, 1, x, y - 2.8, z, [1, 0.8, 0.4], 5)
      break
    }
    case "gk-cogumelo": {
      // COGUMELO: chapéu (o chão) com pintas, lamelas por baixo e o pé
      const cap = th.tile === "moss" ? CAP_RED : CAP
      api.floor(isl, false, mix(cap, WHITE, 0.12), mul(cap, 0.7))
      band(deco, O, x, z, y, 1, y - 0.5, 1.12, cap)
      band(deco, O, x, z, y - 0.5, 1.12, y - 0.9, 1.0, mul(cap, 0.7))
      tip(deco, O, x, z, y - 0.9, 1, x, y - 1.4, z, STEM)
      deco.cylinder(rr * 0.5, 5, place(x, y - 3.4, z), STEM, 10)
      deco.blob(rr * 0.8, 1, 0.4, 1, x, y - 5.9, z, mul(STEM, 0.8), 5)
      for (let k = 0; k < 4; k++) {
        const a = (k / 4) * Math.PI * 2 + 0.6
        deco.blob(0.6, 1, 0.3, 1, x + Math.sin(a) * rr * 0.98, y - 0.25, z + Math.cos(a) * rr * 0.98, WHITE, 4)
      }
      glow.annulus(x, y - 0.92, z, rr * 0.3, rr * 0.92, mul(th.glow, 0.7), 20)
      break
    }
    case "gk-serra": {
      // SERRA da Serraria: disco de aço com dentes, cubo de madeira e o cavalete
      api.floor(isl, true, mix(STEEL, WHITE, 0.15), STEEL_DK)
      band(deco, O, x, z, y, 1, y - 0.3, 1, STEEL)
      tip(deco, O, x, z, y - 0.3, 1, x, y - 0.3, z, STEEL_DK)
      const n = 18
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2
        deco.cone(0, 0.5, 0.6, Matrix.RotationZ(-Math.PI / 2).multiply(place(x + Math.sin(a) * (rr + 0.25), y - 0.15, z + Math.cos(a) * (rr + 0.25), a - Math.PI / 2)), STEEL, 3)
      }
      deco.cylinder(1.6, 0.6, place(x, y - 0.6, z), WOOD, 10)
      for (const u of [-1, 1]) deco.box(0.4, 4.5, 0.4, place(x + Math.cos(ang) * u * 1.2, y - 3, z - Math.sin(ang) * u * 1.2, ang), WOOD_DK)
      deco.box(3, 0.4, 0.5, place(x, y - 5.2, z, ang + Math.PI / 2), WOOD_DK)
      break
    }
    case "gk-piao": {
      // PIÃO de pedra do Cânion: tampa de capim e o cone de arenito em fiadas
      api.floor(isl, false, GRASS, mul(GRASS, 0.7))
      band(deco, O, x, z, y, 1, y - 0.4, 1.04, mul(GRASS, 0.8))
      const S: RGB[] = [mix(th.top, ROCK, 0.1), mix(th.top, ROCK, 0.3), mix(th.top, ROCK, 0.2), mix(th.top, ROCK_DK, 0.4)]
      let k0 = 1.04
      let yy = y - 0.4
      for (let i = 0; i < 4; i++) {
        const k1 = 1 - (i + 1) * 0.22
        band(deco, O, x, z, yy, k0, yy - 1.4, k1, S[i])
        k0 = k1
        yy -= 1.4
      }
      tip(deco, O, x, z, yy, k0, x, yy - 1.2, z, ROCK_DK)
      break
    }
    case "gk-orbe": {
      // ORBE da Orbital: praça de vidro sobre a esfera acesa
      api.floor(isl, true, [0.86, 0.9, 1], th.glow)
      band(deco, O, x, z, y, 1, y - 0.35, 1.03, STEEL)
      band(deco, O, x, z, y - 0.35, 1.03, y - 0.8, 0.6, STEEL_DK)
      tip(deco, O, x, z, y - 0.8, 0.6, x, y - 0.8, z, STEEL_DK)
      glow.blob(rr * 1.1, 1, 1, 1, x, y - 0.9 - rr * 0.55, z, mix(th.glow, WHITE, 0.2), 8)
      glow.annulus(x, y - 0.2, z, rr + 0.05, rr + 0.3, th.glow2, 24)
      break
    }
    default: {
      api.floor(isl, false, th.top, th.rim)
      band(deco, O, x, z, y, 1, y - 1, 0.8, ROCK)
      tip(deco, O, x, z, y - 1, 0.8, x, y - 3, z, ROCK_DK)
    }
  }
}

/** Chão chapado (miolo + borda) no contorno exato — para a Cidade, que não tem o `floorOf` dos mapas novos. */
export function flatFloor(g: ArenaGeo, O: [number, number][], cx: number, cz: number, y: number, top: RGB, rim: RGB) {
  const n = O.length
  const rimW = 0.45
  const I = O.map(([x, z]) => {
    const d = Math.hypot(x - cx, z - cz) || 1
    const k = Math.max(0.2, (d - rimW) / d)
    return [cx + (x - cx) * k, cz + (z - cz) * k] as [number, number]
  })
  const fan = (pts: [number, number][], c: RGB, yy: number) => {
    const pos: number[] = [cx, yy, cz]
    for (const [x, z] of pts) pos.push(x, yy, z)
    const idx: number[] = []
    for (let i = 0; i < n; i++) idx.push(0, 1 + ((i + 1) % n), 1 + i)
    const vd = new VertexData()
    vd.positions = pos
    vd.indices = idx
    vd.normals = pos.map((_, k) => (k % 3 === 1 ? 1 : 0))
    g.raw(vd, c)
  }
  fan(O, rim, y + 0.004)
  fan(I, top, y + 0.008)
}

/** É uma prova da Gincana? */
export const isGincana = (isl: Island) => (isl.tag ?? "").startsWith("gk-")
