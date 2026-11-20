// features/meu-mundo/gincana/engine/helices-view.ts — Hélices da Orbital (2ª fase da Cidade Orbital, 2026-11-20):
// o desenho próprio da prova "plataformas em leque que giram em volta de um cubo, com barras varrendo", peça por
// peça (skill meu-mundo-cenario-codigo).
//
// FICHA (referência: vídeo de uma corrida sobre plataformas que giram num party game — só o TIPO de prova e a
// riqueza de detalhe; nada de traçado, personagem, logotipo, cor de marca, interface ou arte do jogo do vídeo)
// O que é:     o estaleiro de hélices da Cidade Orbital: hélices deitadas de chapa escura com filetes de neon
//              girando no vazio, presas a cubos de turbina; uma doca com barras de energia e o cais de
//              plataformas que vão e voltam antes da subida.
// Silhueta:    a cruz/estrela das pás (6–15 m), o cubo que sobe no meio (nas hélices com barra), as pontas
//              com farol; embaixo, a quilha e os bocais da turbina (vistos de lado contra o céu).
// Massas:      pá 3,4–3,8 × 14–15 m · cubo r 3,2–3,6 · poste do cubo r 1,1 × 2,2 · barra 0,6 × 9–15 m.
// Paleta:      chapa azul-noite (0,1/0,11/0,2 → quina 0,36/0,4/0,56), aço claro (0,7/0,74/0,82), magenta aceso
//              (1/0,37/0,78), ciano aceso (0,25/0,85/1), âmbar das pontas (1/0,72/0,25).
// 70/20/10:    70 chapa escura e aço, 20 neon magenta/ciano, 10 âmbar e o branco das setas.
// Material:    metal frio, neon.
// Fora:        o céu claro, os bichos, o chão listrado e o pano de fundo do vídeo; nenhuma interface do vídeo.
// Inventado:   a quilha com bocais, o farol de ponta, a turbina do cubo.
//
// PARTES (ordem de construção — §2)
// 1. pá — grande: chapa com quilha embaixo; médio: placas em fiadas, filetes de neon nas bordas, setas
//    para a ponta; pequeno: rebites, farol âmbar e faixa de perigo na ponta, bocais embaixo.
// 2. cubo (disco) — 3. poste do cubo — 4. barra de energia — 5. cais (plataforma que anda) — 6. marco.

import type { Scene } from "@babylonjs/core/scene"
import type { Mesh } from "@babylonjs/core/Meshes/mesh"
import type { Material } from "@babylonjs/core/Materials/material"
import { TransformNode } from "@babylonjs/core/Meshes/transformNode"
import { Matrix } from "@babylonjs/core/Maths/math.vector"
import type { Pad } from "../sim/course"
import type { RGB } from "./shapes"
import { SoftGeo, at, mix } from "./shapes"

const PLATE: RGB = [0.14, 0.15, 0.27]
const PLATE_B: RGB = [0.18, 0.2, 0.34]
const EDGE: RGB = [0.36, 0.4, 0.56]
const STEEL: RGB = [0.7, 0.74, 0.82]
const MAG: RGB = [1, 0.37, 0.78]
const CYAN: RGB = [0.25, 0.85, 1]
const AMBER: RGB = [1, 0.72, 0.25]
const DARK: RGB = [0.05, 0.05, 0.09]

/** Ruído barato e fixo (0–1). */
function n01(a: number, b: number, c = 0) {
  return Math.abs(Math.sin(a * 12.9898 + b * 78.233 + c * 37.719) * 43758.5453) % 1
}

/** Pá de hélice desta fase (caixa que gira). */
export const isHelixBlade = (p: Pad) => p.k === 1 && p.spin !== 0

// ── 1. pá: na origem (a malha gira), eixo comprido = z ──
export function helicesBlade(g: SoftGeo, gl: SoftGeo, p: Pad, seed: number) {
  const W = p.hx * 2
  const L = p.hz * 2
  const y = p.y
  // chapa: placas em fiadas de 1,5 m (tom alternado), a quina de cima clara
  const n = Math.round(L / 1.5)
  const step = L / n
  for (let i = 0; i < n; i++) {
    const z = -L / 2 + (i + 0.5) * step
    const tone = i % 2 ? PLATE : PLATE_B
    g.box(W - 0.06, 0.3, step - 0.06, at(0, y - 0.15, z), (_x, yy) => (yy > 0.1 ? mix(tone, EDGE, 0.08 + n01(i, seed) * 0.06) : tone))
  }
  // a quina das bordas compridas (pega luz) e o filete de neon logo abaixo, de ponta a ponta
  for (const s of [-1, 1]) {
    g.box(0.12, 0.08, L, at(s * (W / 2 - 0.06), y + 0.01, 0), EDGE)
    gl.box(0.08, 0.1, L - 0.4, at(s * (W / 2 + 0.02), y - 0.2, 0), (seed + (s > 0 ? 1 : 0)) % 2 ? MAG : CYAN)
  }
  // quilha embaixo: viga central que afina para as pontas, com bocais acesos
  g.box(W * 0.42, 0.55, L - 1.2, at(0, y - 0.55, 0), (_x, yy) => (yy > 0 ? mix(PLATE, DARK, 0.3) : DARK))
  for (const s of [-1, 1]) {
    for (const t of [0.35, 0.7]) {
      const z = s * (L / 2) * t
      g.cylinder(0.7, 0.4, at(0, y - 0.95, z), STEEL, 10, 0.5)
      gl.cylinder(0.42, 0.06, at(0, y - 1.16, z), CYAN, 10)
    }
  }
  // setas para a ponta (de onde se sai), brancas, só fora do cubo
  for (const s of [-1, 1]) {
    for (let k = 0; k < 3; k++) {
      const z = s * (3.8 + k * 1.15)
      if (Math.abs(z) > L / 2 - 1.3) continue
      for (const sx of [-1, 1]) gl.box(0.16, 0.02, 0.85, at(sx * 0.3, y + 0.012, z, sx * s * 0.75), mix(STEEL, [1, 1, 1], 0.4))
    }
  }
  // rebites nas bordas das placas
  for (let i = 1; i < n; i++) {
    const z = -L / 2 + i * step
    if (Math.abs(z) < 3) continue
    for (const s of [-1, 1]) g.box(0.1, 0.03, 0.1, at(s * (W / 2 - 0.3), y + 0.01, z), EDGE)
  }
  // ponta: faixa de perigo âmbar/preta e o farol âmbar aceso na quina
  for (const s of [-1, 1]) {
    const z = s * (L / 2 - 0.35)
    for (let k = 0; k < 6; k++) g.box(W / 6 - 0.02, 0.02, 0.5, at(-W / 2 + (k + 0.5) * (W / 6), y + 0.012, z), k % 2 ? DARK : AMBER)
    g.box(W + 0.1, 0.36, 0.2, at(0, y - 0.15, s * (L / 2 + 0.05)), mix(PLATE, EDGE, 0.3))
    for (const sx of [-1, 1]) {
      g.cylinder(0.32, 0.18, at(sx * (W / 2 - 0.3), y + 0.09, s * (L / 2 - 0.3)), DARK, 8)
      gl.sphere(0.26, at(sx * (W / 2 - 0.3), y + 0.22, s * (L / 2 - 0.3)), AMBER, 6)
    }
  }
}

// ── 3. poste do cubo (hélices com barra): turbina — flange largo com parafusos, coluna em 8 faces com
// respiros acesos em ciano, colar de aço onde a barra gira e a cúpula magenta com antena ──
export function helicesHubPost(st: SoftGeo, glow: SoftGeo, x: number, z: number, r: number, y0: number, y1: number) {
  const h = y1 - y0
  st.cylinder(r * 2.9, 0.22, at(x, y0 + 0.11, z), DARK, 16)
  st.cylinder(r * 2.6, 0.3, at(x, y0 + 0.35, z), (_x, y) => (y > 0.05 ? EDGE : PLATE), 16)
  for (let k = 0; k < 10; k++) {
    const a = (k / 10) * Math.PI * 2
    st.box(0.14, 0.08, 0.14, at(x + Math.sin(a) * r * 1.15, y0 + 0.52, z + Math.cos(a) * r * 1.15, a), STEEL)
  }
  st.cylinder(r * 2, h - 0.5, at(x, y0 + 0.5 + (h - 0.5) / 2, z), (_x, y) => (y > (h - 0.5) / 2 - 0.2 ? EDGE : PLATE_B), 8, r * 1.8)
  // respiros: 8 frestas acesas entre nervuras de aço
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2 + Math.PI / 8
    glow.box(0.14, h * 0.45, 0.05, at(x + Math.sin(a) * r * 0.97, y0 + 0.5 + h * 0.32, z + Math.cos(a) * r * 0.97, a), CYAN)
    const b = (k / 8) * Math.PI * 2
    st.box(0.12, h - 0.7, 0.16, at(x + Math.sin(b) * r * 0.99, y0 + 0.5 + (h - 0.7) / 2, z + Math.cos(b) * r * 0.99, b), STEEL)
  }
  // colar (onde a barra gira) e a cúpula com a antena
  st.torus(r * 2.15, 0.16, at(x, y0 + 0.55, z), STEEL, 20)
  st.cylinder(r * 2.1, 0.25, at(x, y1 + 0.12, z), EDGE, 16)
  glow.sphere(r * 1.6, at(x, y1 + 0.25, z), (_x, y) => mix(MAG, [1, 0.8, 0.95], Math.max(0, y)), 12, 1, 0.55, 1)
  st.cylinder(0.08, 1.2, at(x, y1 + 1.0, z), STEEL, 5)
  glow.sphere(0.24, at(x, y1 + 1.65, z), AMBER, 6)
}

// ── 4. barra de energia: viga de aço com o miolo magenta aceso visto por frestas, guardas em gomos, a
// ponteira com luz âmbar; no meio, o tambor (nas hélices com barra ele fica dentro da turbina) ──
export function helicesSweep(g: SoftGeo, gl: SoftGeo, s: { len: number; r: number; both: boolean; y: number }) {
  const z0 = s.both ? -s.len : 0
  const len = s.both ? s.len * 2 : s.len
  const d = s.r * 2
  g.box(d * 0.9, d * 0.7, len, at(0, 0, z0 + len / 2), (_x, y) => (y > d * 0.2 ? EDGE : PLATE))
  // miolo aceso nas duas faces de lado, em frestas (um gomo aceso, uma guarda de aço)
  const n = Math.round(len / 0.9)
  for (let k = 0; k < n; k++) {
    const z = z0 + (k + 0.5) * (len / n)
    if (Math.abs(z) < 1.2) continue
    if (k % 2) g.box(d * 0.98, d * 0.78, 0.14, at(0, 0, z), STEEL)
    else for (const sx of [-1, 1]) gl.box(0.04, d * 0.36, len / n - 0.16, at(sx * d * 0.46, 0, z), MAG)
  }
  for (const e of s.both ? [-s.len, s.len] : [s.len]) {
    const sg = Math.sign(e)
    g.box(d + 0.3, d + 0.2, 0.55, at(0, 0, e - sg * 0.28), mix(PLATE, EDGE, 0.4))
    for (let k = 0; k < 4; k++) g.box((d + 0.32) / 4 - 0.02, 0.06, 0.58, at(-(d + 0.32) / 2 + (k + 0.5) * ((d + 0.32) / 4), d * 0.55, e - sg * 0.28), k % 2 ? DARK : AMBER)
    gl.sphere(0.32, at(0, d * 0.62, e - sg * 0.28), AMBER, 6)
  }
  // tambor do meio: aço com respiros ciano
  g.cylinder(2.0, 0.9, at(0, 0, 0), (_x, y) => (y > 0.3 ? EDGE : PLATE_B), 12)
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * Math.PI * 2
    gl.box(0.14, 0.4, 0.04, at(Math.sin(a) * 1.0, 0, Math.cos(a) * 1.0, a), CYAN)
  }
  void s.y
}

// ── 6. o marco: a hélice gigante do estaleiro, de pé ao lado da pista — anel de treliça preso a uma torre
// que desce até o vazio, cubo com luz e três pás largas de chapa com neon, girando devagar ──
function yardRing(st: SoftGeo, glow: SoftGeo, x: number, y: number, z: number, R: number) {
  // torre: treliça (4 montantes + travessas) do vazio até o anel
  for (const [dx, dz] of [[-1.4, -1.4], [1.4, -1.4], [-1.4, 1.4], [1.4, 1.4]]) st.box(0.4, y - R + 6.5, 0.4, at(x + dx, (y - R + 0.5 - 6) / 2, z + dz), PLATE_B)
  for (let k = 0; k < 7; k++) {
    const yy = -6 + k * ((y - R + 6) / 7)
    st.box(3.2, 0.25, 0.25, at(x, yy, z - 1.4), EDGE)
    st.box(3.2, 0.25, 0.25, at(x, yy, z + 1.4), EDGE)
    glow.box(0.12, 0.6, 0.12, at(x - 1.6, yy + 0.4, z), k % 2 ? MAG : CYAN)
  }
  // anel (eixo da hélice = x): aro largo em gomos com luzes, e o mancal
  const N = 28
  for (let k = 0; k < N; k++) {
    const a = (k / N) * Math.PI * 2
    st.box(1.0, 0.9, ((Math.PI * 2 * R) / N) * 1.04, at(x, y + Math.sin(a) * R, z + Math.cos(a) * R, 0, Math.PI / 2 - a), k % 2 ? PLATE : PLATE_B)
    if (k % 2 === 0) glow.box(1.04, 0.16, 0.5, at(x, y + Math.sin(a) * (R - 0.46), z + Math.cos(a) * (R - 0.46), 0, Math.PI / 2 - a), k % 4 ? CYAN : MAG)
  }
  st.cylinder(3.0, 2.2, at(x, y, z, 0, 0, Math.PI / 2), EDGE, 14)
}

function bigProp(g: SoftGeo, gl: SoftGeo, R: number) {
  // eixo local = x; cubo e três pás largas que afinam, cada uma com o filete de neon na borda de ataque
  g.cylinder(2.6, 1.6, at(0, 0, 0, 0, 0, Math.PI / 2), STEEL, 14)
  gl.sphere(1.4, at(-0.9, 0, 0), AMBER, 8, 0.6, 1, 1)
  for (let k = 0; k < 3; k++) {
    const a = (k / 3) * Math.PI * 2
    const L = R - 1.6
    for (let j = 0; j < 6; j++) {
      const t = (j + 0.5) / 6
      const w = 3.2 - t * 1.6
      const r = 1.2 + t * L
      // a pá se torce em volta do próprio eixo (o passo da hélice), depois vai para o raio
      const place = Matrix.RotationY(0.3).multiply(at(0, Math.sin(a) * r, Math.cos(a) * r, 0, Math.PI / 2 - a))
      g.box(0.3, L / 6 + 0.04, w, place, j % 2 ? PLATE : PLATE_B)
      gl.box(0.34, L / 6, 0.14, Matrix.Translation(0, 0, w * 0.48).multiply(place), k % 2 ? MAG : CYAN)
    }
  }
}

export class HelicesYard {
  private readonly meshes: Mesh[] = []
  private readonly nodes: TransformNode[] = []

  constructor(scene: Scene, toy: Material, glowMat: Material) {
    const st = new SoftGeo()
    const glow = new SoftGeo()
    const spots: [number, number, number, number][] = [
      [21, 15, 72, 12],
      [-22, 17, 126, 13],
    ]
    for (const [x, y, z, R] of spots) {
      yardRing(st, glow, x, y, z, R)
      const node = new TransformNode("helices-prop", scene)
      node.position.set(x, y, z)
      const g = new SoftGeo()
      const gl = new SoftGeo()
      bigProp(g, gl, R)
      const m = g.build("helices-prop-m", scene, toy, false)
      const mg = gl.build("helices-prop-g", scene, glowMat, false)
      m.parent = node
      mg.parent = node
      this.meshes.push(m, mg)
      this.nodes.push(node)
    }
    this.meshes.push(st.build("helices-yard", scene, toy, true))
    this.meshes.push(glow.build("helices-yard-lit", scene, glowMat, true))
  }

  update(t: number) {
    this.nodes.forEach((n, i) => (n.rotation.x = t * (i ? -0.32 : 0.26)))
  }

  dispose() {
    for (const m of this.meshes) m.dispose()
    for (const n of this.nodes) n.dispose()
  }
}
