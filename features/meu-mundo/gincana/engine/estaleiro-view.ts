// features/meu-mundo/gincana/engine/estaleiro-view.ts — Estaleiro do Quebra-Gelo (3ª fase do Mar de Gelo,
// 2026-11-20): o desenho próprio da prova "ilhas com barras que varrem + hélices gigantes em pé", peça por peça
// (skill meu-mundo-cenario-codigo).
//
// FICHA (referência: vídeo de uma pista de obstáculos num party game — só o TIPO de prova e a riqueza de
// detalhe; nada de traçado, personagem, logotipo, cor de marca, interface ou arte do jogo do vídeo)
// O que é:     o estaleiro dos quebra-gelos preso no Mar de Gelo, de noite com aurora: as hélices de bronze dos
//              navios montadas em pórticos de aço giram de pé sobre o cais; banquisas redondas com a barra de
//              proa; o casco do quebra-gelo encalhado no gelo ao lado; a subida para o dique seco.
// Silhueta:    hélices de 3–4 pás largas e torcidas (a maior 12 m de diâmetro), pórticos retos com vigas
//              treliçadas, o casco vermelho e preto inclinado com a proa reforçada, guindastes de cais.
// Massas:      hélice do cais L 4,2 · do pátio L 3 · gigante L 6,2 · cubo 1–1,6 m · cais 6,6 m de largura.
// Paleta:      bronze (0,7/0,48/0,22 → quina 0,95/0,78/0,46 → escuro 0,32/0,2/0,1), gelo (0,84/0,93/1 →
//              sombra 0,5/0,66/0,82), aço do pórtico (0,2/0,24/0,3 → quina 0,55/0,62/0,7), casco vermelho
//              (0,6/0,12/0,1) e preto (0,08/0,08/0,1), faixa de perigo (amarelo/preto), luz de cais (1/0,82/0,5),
//              aurora (0,4/1/0,8).
// 70/20/10:    70 gelo e aço azulado, 20 bronze, 10 vermelho do casco, amarelo de perigo e luz.
// Material:    metal quente (bronze), metal frio (aço), gelo.
// Fora:        o chão colorido, os bonecos, os cata-ventos rosa e o arco de chegada do vídeo; o traçado dele.
// Inventado:   o casco encalhado, o pórtico das hélices, os mancais, a crosta de gelo nas pás.
//
// PARTES (ordem de construção — §2)
// 1. hélice (cubo, pás torcidas com gelo na borda) + pórtico da fileira com mancal — 2. banquisa e barra de
//    proa — 3. chão do cais e do pátio (tábuas de aço com gelo) — 4. casco do quebra-gelo (marco)
// 5. miúdos: guindastes, lampiões, correntes, blocos de gelo.

import type { Scene } from "@babylonjs/core/scene"
import type { Mesh } from "@babylonjs/core/Meshes/mesh"
import type { Material } from "@babylonjs/core/Materials/material"
import { TransformNode } from "@babylonjs/core/Meshes/transformNode"
import type { Course, Rotor } from "../sim/course"
import { SoftGeo, at, mix, type RGB } from "./shapes"

const BRONZE: RGB = [1, 0.56, 0.14]
const BRONZE_L: RGB = [1, 0.84, 0.42]
const BRONZE_D: RGB = [0.5, 0.24, 0.06]
const ICE: RGB = [0.84, 0.93, 1]
const ICE_D: RGB = [0.5, 0.66, 0.82]
const STEEL: RGB = [0.2, 0.24, 0.3]
const STEEL_L: RGB = [0.55, 0.62, 0.7]
const STEEL_D: RGB = [0.08, 0.1, 0.13]
const HAZ_Y: RGB = [0.95, 0.72, 0.08]
const HAZ_K: RGB = [0.06, 0.06, 0.06]
const LAMP: RGB = [1, 0.82, 0.5]

const n01 = (a: number, b = 0, c = 0) => {
  const s = Math.sin(a * 127.1 + b * 311.7 + c * 74.7) * 43758.5453
  return s - Math.floor(s)
}

// ── 1a. a hélice (no eixo local: as pás no plano x-y, a primeira apontando para +x; o eixo do navio em +z) ──
export function estaleiroProp(g: SoftGeo, gl: SoftGeo, q: Rotor) {
  const L = q.L
  const hub = Math.max(0.9, L * 0.26)
  for (let k = 0; k < q.n; k++) {
    const a = (k * Math.PI * 2) / q.n
    // pá: gomos do cubo até a ponta, larga no meio e arredondada na ponta, torcida (passo) ao longo do comprimento
    const SEG = 11
    for (let i = 0; i < SEG; i++) {
      const u0 = i / SEG
      const u = (i + 0.5) / SEG
      const r = hub * 0.45 + (L - hub * 0.45) * u
      const len = ((L - hub * 0.45) / SEG) * 1.12
      const wide = q.hw * 2 * (0.75 + Math.sin(Math.min(1, u * 1.15) * Math.PI) * 0.75) * (u > 0.86 ? 1 - (u - 0.86) * 3.2 : 1)
      const twist = 0.75 - u * 0.45
      const M = at(0, 0, 0, 0, twist).multiply(at(Math.cos(a) * r, Math.sin(a) * r, 0, 0, 0, a))
      const th = 0.16 + (1 - u) * 0.14
      // filete aceso na borda de ataque (o reflexo das luzes do cais no bronze polido), do meio até perto da ponta
      if (u > 0.3 && u < 0.88) for (const f of [-1, 1]) gl.box(len, 0.06, 0.03, at(0, wide / 2 - 0.05, f * (th / 2 + 0.01)).multiply(M), f > 0 ? [1, 0.62, 0.24] : [1, 0.74, 0.38])
      g.box(len, wide, th, M, (_x, y, z) => {
        // bronze com quina clara na borda de ataque, crosta de gelo na borda de fuga perto da ponta
        if (y > wide / 2 - 0.08) return u0 > 0.45 ? mix(ICE, ICE_D, n01(i, k) * 0.4) : BRONZE_L
        if (y < -wide / 2 + 0.07) return BRONZE_D
        return mix(BRONZE, BRONZE_L, Math.abs(z) > 0.05 ? 0.12 + n01(i, k, 3) * 0.2 : 0.35)
      })
    }
    // gelo grudado: duas pedras de gelo na face, perto da ponta
    g.sphere(0.5, at(Math.cos(a) * L * 0.78, Math.sin(a) * L * 0.78, 0.14, a), ICE, 6, 1.2, 0.8, 0.4)
    g.sphere(0.32, at(Math.cos(a) * L * 0.6, Math.sin(a) * L * 0.6, -0.14, a + 1), ICE_D, 5, 1, 0.8, 0.4)
  }
  // cubo: cone de bronze para trás (−z, o lado de quem chega) com a porca e a tampa clara; colar de aço
  g.cylinder(hub * 1.2, 0.9, at(0, 0, 0, 0, Math.PI / 2), BRONZE, 18)
  g.cylinder(hub * 0.5, 0.9, at(0, 0, -0.85, 0, Math.PI / 2), BRONZE_L, 14, hub * 1.15)
  g.cylinder(0.32, 0.25, at(0, 0, -1.35, 0, Math.PI / 2), BRONZE_D, 6)
  g.cylinder(hub * 0.9, 0.3, at(0, 0, 0.6, 0, Math.PI / 2), STEEL_L, 16)
  // parafusos do cubo em roda
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2
    g.box(0.12, 0.12, 0.12, at(Math.cos(a) * hub * 0.5, Math.sin(a) * hub * 0.5, -0.47), STEEL_D)
  }
}

// ── 1b. o pórtico de uma fileira: viga treliçada por cima, colunas só nas pontas (fora do caminho), o eixo de
// cada hélice indo para trás até o mancal pendurado na viga; faixa de perigo nas colunas e luz de cais ──
function rowGantry(g: SoftGeo, glow: SoftGeo, row: Rotor[], floor: number) {
  const z = row[0].z
  const top = Math.max(...row.map((q) => q.y)) + 2.1
  const x0 = Math.min(...row.map((q) => q.x - q.L)) - 1.2
  const x1 = Math.max(...row.map((q) => q.x + q.L)) + 1.2
  const zb = z + 1.6
  const W = x1 - x0
  const cx = (x0 + x1) / 2
  // viga dupla com treliça em X entre as duas
  for (const dy of [0, 1.1]) g.box(W + 1.2, 0.3, 0.5, at(cx, top + dy, zb), (_x, y) => (y > 0.05 ? STEEL_L : STEEL))
  const nb = Math.round(W / 1.4)
  for (let i = 0; i < nb; i++) {
    const x = x0 + (i + 0.5) * (W / nb)
    g.box(0.12, 1.45, 0.12, at(x, top + 0.55, zb, 0, 0, i % 2 ? 0.75 : -0.75), STEEL)
  }
  // colunas nas pontas, do fundo até a viga, com faixa de perigo e sapata; gelo acumulado no pé
  for (const x of [x0 - 0.3, x1 + 0.3]) {
    const h = top + 1.4 + 2
    g.box(0.7, h, 0.7, at(x, h / 2 - 2, zb), (_x, y) => (y > h / 2 - 0.3 ? STEEL_L : STEEL))
    for (let k = 0; k < 5; k++) g.box(0.74, 0.4, 0.74, at(x, floor + 0.3 + k * 0.8, zb), k % 2 ? HAZ_K : HAZ_Y)
    g.sphere(1.6, at(x, floor + 0.1, zb), ICE, 7, 1, 0.45, 1)
    glow.sphere(0.4, at(x, top + 1.9, zb), LAMP, 8)
    g.cylinder(0.6, 0.1, at(x, top + 2.15, zb), STEEL_D, 8)
  }
  // por hélice: o eixo (aço com anéis) do cubo até o mancal e o tirante do mancal até a viga
  for (const q of row) {
    g.cylinder(0.5, zb - q.z + 0.2, at(q.x, q.y, (q.z + zb) / 2 + 0.3, 0, Math.PI / 2), STEEL_L, 10)
    for (const f of [0.35, 0.7]) g.cylinder(0.62, 0.12, at(q.x, q.y, q.z + 0.6 + (zb - q.z) * f, 0, Math.PI / 2), STEEL_D, 10)
    g.box(1.2, 1.1, 1.0, at(q.x, q.y, zb), (_x, y) => (y > 0.3 ? STEEL_L : STEEL))
    g.box(0.36, top - q.y - 0.4, 0.36, at(q.x, (top + q.y) / 2, zb), STEEL)
    g.sphere(0.9, at(q.x, q.y + 0.6, zb), ICE, 6, 1.4, 0.3, 1.2)
  }
}

// ── 4. o casco do quebra-gelo encalhado (marco, ao lado do cais): casco vermelho embaixo e preto em cima em
// chapas com a linha-d'água branca, a proa reforçada em cunha, o convés com a ponte de comando branca de
// janelas acesas, a chaminé com as faixas, o mastro com luz; inclinado no gelo, com placas de gelo empilhadas ──
const HULL_R: RGB = [0.62, 0.12, 0.1]
const HULL_K: RGB = [0.08, 0.08, 0.1]
const WHITE: RGB = [0.9, 0.92, 0.94]
function icebreaker(g: SoftGeo, glow: SoftGeo, x: number, z: number, yaw: number, tilt: number) {
  const base = at(0, 0, 0, yaw, 0, tilt).multiply(at(x, -1, z))
  const B = (w: number, h: number, d: number, lx: number, ly: number, lz: number, paint: Parameters<SoftGeo["box"]>[4], ry = 0) => g.box(w, h, d, at(lx, ly, lz, ry).multiply(base), paint)
  const LEN = 34
  const W = 9
  // casco em fatias ao longo do comprimento (afina na popa e na proa); vermelho até a linha-d'água, preto em cima
  const N = 14
  for (let i = 0; i < N; i++) {
    const u = (i + 0.5) / N
    const lz = -LEN / 2 + u * LEN
    const wide = W * (u > 0.72 ? 1 - ((u - 0.72) / 0.28) ** 1.6 * 0.85 : u < 0.12 ? 0.82 + u * 1.5 : 1)
    B(wide, 3.2, LEN / N + 0.04, 0, 1.6, lz, (_x, y) => mix(HULL_R, [0.3, 0.06, 0.05], (y + 1.6) / 3.2 < 0.3 ? 0.4 : 0))
    B(wide, 0.35, LEN / N + 0.04, 0, 3.35, lz, WHITE)
    B(wide * 0.98, 2.6, LEN / N + 0.04, 0, 4.8, lz, (_x, y) => (y > 1.15 ? [0.3, 0.32, 0.36] : HULL_K))
    // chapas: costura escura vertical a cada fatia nos dois lados
    for (const s of [-1, 1]) B(0.06, 5.6, 0.08, s * (wide / 2 + 0.02), 3.1, lz - LEN / N / 2, [0.04, 0.04, 0.05])
  }
  // proa reforçada: a cunha (duas chapas inclinadas) com a cinta de aço clara
  for (const s of [-1, 1]) B(0.4, 6, 5, s * 0.9, 3, LEN / 2 + 1.5, (_x, y) => (y < -0.4 ? HULL_R : HULL_K), s * 0.5)
  B(1.2, 0.4, 6, 0, 1.6, LEN / 2 + 1.4, [0.6, 0.62, 0.66])
  // convés e a ponte de comando (dois andares brancos com janelas acesas) e a asa da ponte
  B(W * 0.92, 0.2, LEN * 0.9, 0, 6.15, 0, [0.4, 0.38, 0.36])
  B(6.6, 3, 7, 0, 7.7, -3, WHITE)
  B(5.4, 2.4, 5.6, 0, 10.4, -3.4, WHITE)
  B(8.4, 0.25, 2.2, 0, 11.7, -1.2, WHITE)
  for (let k = 0; k < 5; k++) glow.box(0.7, 0.8, 0.06, at((k - 2) * 1.0, 10.7, -0.56).multiply(base), LAMP)
  for (let k = 0; k < 4; k++) glow.box(0.9, 0.7, 0.06, at((k - 1.5) * 1.4, 7.9, 0.53).multiply(base), LAMP)
  // chaminé com as faixas (amarela e preta), boca escura e fumaça parada de gelo
  g.cylinder(2.4, 5, at(0, 11.2, -9.5).multiply(base), (_x, y) => (y > 1.6 ? HULL_K : y > 0.8 ? HAZ_Y : HULL_R), 14)
  g.cylinder(2.0, 0.1, at(0, 13.75, -9.5).multiply(base), [0.03, 0.03, 0.03], 14)
  // mastro com a luz no alto e dois cabos até o convés
  g.box(0.25, 8, 0.25, at(0, 15.5, 2).multiply(base), [0.6, 0.62, 0.66])
  glow.sphere(0.6, at(0, 19.6, 2).multiply(base), [1, 0.3, 0.2], 8)
  // gelo empilhado em volta do casco (placas inclinadas) e a crosta branca no convés da proa
  for (let k = 0; k < 16; k++) {
    const u = k / 16
    const s = k % 2 ? -1 : 1
    const lz = -LEN / 2 + u * LEN + n01(k) * 2
    g.box(3 + n01(k, 1) * 3, 0.6, 2 + n01(k, 2) * 2.5, at(s * (W / 2 + 1.2), 0.9 + n01(k, 3), lz, n01(k, 4) * 1.5, 0, s * (0.5 + n01(k, 5) * 0.5)).multiply(base), (_x, y) => (y > 0 ? ICE : ICE_D))
  }
  g.sphere(6, at(0, 6.3, LEN / 2 - 4).multiply(base), ICE, 8, 1.2, 0.18, 1.4)
}

export class EstaleiroView {
  private readonly meshes: Mesh[] = []
  private readonly props: { node: TransformNode; q: Rotor }[] = []
  constructor(scene: Scene, toy: Material, glowMat: Material, private readonly course: Course) {
    const st = new SoftGeo()
    const glow = new SoftGeo()
    // fileiras: hélices no mesmo z dividem o pórtico
    const rows = new Map<number, Rotor[]>()
    for (const q of course.rotors) rows.set(q.z, [...(rows.get(q.z) ?? []), q])
    for (const row of rows.values()) rowGantry(st, glow, row, row[0].y - row[0].L + 0.35)
    icebreaker(st, glow, -24, 72, 0.18, 0.06)
    this.meshes.push(st.build("estaleiro-static", scene, toy, true))
    this.meshes.push(glow.build("estaleiro-static-glow", scene, glowMat, true))
    course.rotors.forEach((q, i) => {
      const node = new TransformNode(`estaleiro-prop-${i}`, scene)
      node.position.set(q.x, q.y, q.z)
      const g = new SoftGeo()
      const gl = new SoftGeo()
      estaleiroProp(g, gl, q)
      const m = g.build(`estaleiro-prop-m-${i}`, scene, toy, false)
      const mg = gl.build(`estaleiro-prop-g-${i}`, scene, glowMat, false)
      m.parent = node
      mg.parent = node
      this.meshes.push(m, mg)
      this.props.push({ node, q })
    })
  }
  update(t: number) {
    for (const p of this.props) p.node.rotation.z = p.q.ph + p.q.w * t
  }
  dispose() {
    for (const p of this.props) p.node.dispose()
    for (const m of this.meshes) m.dispose()
  }
}
