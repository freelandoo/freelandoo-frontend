// features/meu-mundo/gincana/engine/altoforno-view.ts — Esteira do Alto-Forno (2ª fase da Forja, 2026-11-20):
// o desenho próprio da prova "esteira que sobe contra você + canhão que atira coisas que quicam", peça por peça
// (skill meu-mundo-cenario-codigo).
//
// FICHA (referência: vídeo de uma corrida numa esteira com frutas gigantes num party game — só o TIPO de prova
// e a riqueza de detalhe; nada de traçado, personagem, fruta, logotipo, cor de marca ou arte do jogo do vídeo)
// O que é:     a esteira de ferro da fundição de Kragor sobe 80 m até a boca do alto-forno; lá de cima o canhão
//              cospe bolas de ferro em brasa que descem quicando. Bigornas nas bordas, grelha no pé da rampa
//              (onde as bolas caem na lava), barras de fogo que giram no pátio e no patamar.
// Silhueta:    a rampa comprida e reta, com trilhos que passam do tampo; no alto, a boca do forno em arco com a
//              chaminé; a bola (2,5 m) é a maior coisa que se mexe.
// Massas:      esteira 14 × 80 m (inclinação 7°) · boca do forno 18 × 9 m · bola r 1,25 · bigorna 1,3 × 1,3.
// Paleta:      ferro (0,13/0,12/0,12 → quina 0,42/0,4/0,38), ferrugem (0,36/0,16/0,08), latão (0,8/0,58/0,24),
//              brasa (1/0,55/0,12 → miolo 1/0,9/0,5), perigo laranja/preto, pedra do forno (0,3/0,24/0,22).
// 70/20/10:    70 ferro e pedra escuros, 20 brasa (lava, a boca do forno, a bola), 10 latão e o perigo.
// Material:    metal quente (ferro, latão), pedra, brasa.
// Fora:        frutas, balões, o céu claro e o chão colorido do vídeo; nenhuma interface do vídeo.
// Inventado:   a boca do forno, a grelha do pé e a bigorna.
//
// PARTES (ordem de construção)
// 1. esteira — grande: taliscas de ferro que ANDAM ladeira abaixo; médio: trilhos laterais com faixa de perigo,
//    rolos nas bordas; pequeno: parafusos, nervura das taliscas, desgaste na quina.
// 2. boca do alto-forno com o canhão — 3. bola de ferro em brasa — 4. bigorna — 5. grelha do pé — 6. barra de fogo.

import type { Scene } from "@babylonjs/core/scene"
import type { Mesh } from "@babylonjs/core/Meshes/mesh"
import type { InstancedMesh } from "@babylonjs/core/Meshes/instancedMesh"
import type { Material } from "@babylonjs/core/Materials/material"
import type { Course, Pad, Post, Sweeper } from "../sim/course"
import { Vector3 } from "@babylonjs/core/Maths/math.vector"
import { SoftGeo, at, mix, type RGB } from "./shapes"

const IRON: RGB = [0.13, 0.12, 0.12]
const IRON_L: RGB = [0.42, 0.4, 0.38]
const RUST: RGB = [0.36, 0.16, 0.08]
const BRASS: RGB = [0.8, 0.58, 0.24]
const HAZ_O: RGB = [1, 0.45, 0.08]
const HAZ_K: RGB = [0.06, 0.05, 0.05]
const EMBER: RGB = [1, 0.55, 0.12]

/** Ruído barato e fixo (0–1). */
function n01(a: number, b: number, c = 0) {
  return Math.abs(Math.sin(a * 12.9898 + b * 78.233 + c * 37.719) * 43758.5453) % 1
}

/** Rampa-esteira desta fase (k = 2 com esteira). */
export const isBeltRamp = (p: Pad) => p.k === 2 && p.bz !== 0

const SLAT = 1.0

// ── 1. talisca: chapa de ferro com duas nervuras, quina clara gasta e parafusos nas pontas ──
function slatGeo(g: SoftGeo, W: number, mark: boolean) {
  // a chapa em 4 pedaços (cada um num tom: ferro, ferro enferrujado) — a cor por vértice só pega em vértice
  const n = 4
  for (let k = 0; k < n; k++) {
    const w = W / n
    const c = mix(IRON, RUST, n01(k, mark ? 3 : 1) * 0.45)
    g.box(w - 0.03, 0.1, SLAT - 0.1, at(-W / 2 + (k + 0.5) * w, 0.05, 0), c)
  }
  // quina de trás clara (gasta: é a que pega luz de quem sobe)
  g.box(W - 0.1, 0.04, 0.06, at(0, 0.11, -SLAT / 2 + 0.08), IRON_L)
  for (const dz of [-0.16, 0.2]) g.box(W - 0.5, 0.05, 0.07, at(0, 0.125, dz), mix(IRON, IRON_L, 0.3))
  for (const sx of [-1, 1]) for (const dz of [-0.26, 0.26]) g.box(0.1, 0.07, 0.1, at(sx * (W / 2 - 0.22), 0.13, dz), BRASS)
  if (mark) {
    // seta laranja apontando ladeira abaixo (−z): mostra para onde a esteira leva
    for (const x of [-W * 0.3, 0, W * 0.3]) for (const s of [-1, 1]) g.box(0.12, 0.03, 0.62, at(x + s * 0.2, 0.17, 0, s * 0.85), HAZ_O)
  }
}

/** A esteira de cada rampa: taliscas instanciadas que descem pelo relógio + o quadro fixo. */
export class AltoFornoBelt {
  private readonly bases: Mesh[] = []
  private readonly rows: { p: Pad; insts: InstancedMesh[]; L: number; a: number; speed: number }[] = []

  constructor(scene: Scene, toy: Material, _glowMat: Material, course: Course) {
    for (const p of course.pads) {
      if (!isBeltRamp(p)) continue
      const W = p.hx * 2 - 0.9
      const mk = (mark: boolean) => {
        const g = new SoftGeo()
        slatGeo(g, W, mark)
        const b = g.build(`altoforno-slat-${this.rows.length}-${mark ? "m" : "p"}`, scene, toy, false)
        b.isVisible = false
        this.bases.push(b)
        return b
      }
      const plain = mk(false)
      const marked = mk(true)
      const rise = p.y2 - p.y
      const L = Math.hypot(p.hz * 2, rise)
      const a = Math.atan2(rise, p.hz * 2)
      const n = Math.floor(L / SLAT)
      const insts: InstancedMesh[] = []
      for (let i = 0; i < n; i++) {
        const m = (i % 5 === 0 ? marked : plain).createInstance(`altoforno-slat-${this.rows.length}-${i}`)
        m.isPickable = false
        m.rotation.x = -a
        insts.push(m)
      }
      this.rows.push({ p, insts, L, a, speed: -p.bz })
    }
    this.update(0)
  }

  update(t: number) {
    for (const r of this.rows) {
      const off = (t * r.speed) % SLAT
      const z0 = r.p.z - r.p.hz
      for (let i = 0; i < r.insts.length; i++) {
        // a talisca desce (−s); a que passa do pé reaparece no alto
        let s = (i + 0.5) * SLAT - off
        if (s < 0) s += r.insts.length * SLAT
        const m = r.insts[i]
        m.position.set(r.p.x, r.p.y + Math.sin(r.a) * s + 0.02, z0 + Math.cos(r.a) * s)
      }
    }
  }

  dispose() {
    for (const r of this.rows) for (const m of r.insts) m.dispose()
    for (const b of this.bases) b.dispose()
  }
}

// ── 2. a boca do alto-forno: duas torres de tijolo refratário com frestas de brasa, a viga de ferro com faixa de
// perigo, a janela do forno acesa (grade escura na frente) e o canhão no meio, apontado ladeira abaixo ──
const BRICK: RGB = [0.3, 0.22, 0.2]
const BRICK_D: RGB = [0.18, 0.13, 0.12]
const MOLTEN: RGB = [1, 0.85, 0.4]

function tower(st: SoftGeo, glow: SoftGeo, x: number, z: number, y0: number, H: number, chimney: boolean) {
  // tijolos em fiadas (cada tijolo num tom), um pouco mais estreita em cima
  const rows = Math.round(H / 0.5)
  for (let r = 0; r < rows; r++) {
    const w = 2.6 - (r / rows) * 0.5
    const yy = y0 + 0.25 + r * 0.5
    const n = 4
    for (let c = 0; c < n; c++) {
      const off = r % 2 ? 0.3 : 0
      const bx = x - w / 2 + ((c + 0.5) * w) / n + off - 0.15
      const tone = n01(r, c, x)
      st.box(w / n - 0.05, 0.46, 2.4, at(bx, yy, z), tone < 0.3 ? BRICK_D : tone > 0.85 ? RUST : BRICK)
    }
  }
  // frestas de brasa (verticais, nas duas faces) e as cintas de ferro com rebites de latão
  for (const fz of [-1, 1]) {
    glow.box(0.18, H * 0.3, 0.05, at(x, y0 + H * 0.45, z + fz * 1.23), EMBER)
    glow.box(0.1, H * 0.18, 0.05, at(x, y0 + H * 0.45, z + fz * 1.24), MOLTEN)
  }
  for (const fy of [0.22, 0.62, 0.95]) {
    st.box(2.9 - fy * 0.4, 0.22, 2.7, at(x, y0 + H * fy, z), IRON)
    for (let k = 0; k < 4; k++) for (const fz of [-1, 1]) st.box(0.1, 0.1, 0.06, at(x - 1 + k * 0.66, y0 + H * fy, z + fz * 1.36), BRASS)
  }
  // capitel e (numa delas) a chaminé com a boca acesa
  st.box(2.8, 0.4, 2.8, at(x, y0 + H + 0.2, z), IRON_L)
  if (chimney) {
    st.cylinder(1.3, 4.5, at(x, y0 + H + 2.6, z), (_x, y) => (y > 1.9 ? IRON_L : mix(IRON, RUST, 0.4)), 12, 1.1)
    st.torus(1.4, 0.18, at(x, y0 + H + 4.8, z), BRASS, 14)
    glow.cylinder(0.9, 0.05, at(x, y0 + H + 4.84, z), EMBER, 12)
  }
}

export function altoFornoMouth(st: SoftGeo, glow: SoftGeo, course: Course) {
  const R = course.ramp
  if (!R) return
  const z = R.z1 + 1.6
  const y0 = R.y1
  const span = 8.6
  const H = 9
  tower(st, glow, -span, z, y0 - 1.5, H + 1.5, true)
  tower(st, glow, span, z, y0 - 1.5, H + 1.5, false)
  // a viga: perfil de ferro com faixa de perigo na frente (−z, quem sobe vê) e rebites
  const by = y0 + 5.2
  st.box(span * 2, 0.9, 1.6, at(0, by, z), (_x, y) => (y > 0.3 ? IRON_L : IRON))
  for (let k = 0; k < 18; k++) st.box(0.5, 0.7, 0.05, at(-span + 0.5 + k * ((span * 2 - 1) / 17), by - 0.02, z - 0.82, 0, 0, 0.6), k % 2 ? HAZ_K : HAZ_O)
  for (let k = 0; k < 12; k++) st.box(0.12, 0.12, 0.06, at(-span + 0.8 + k * ((span * 2 - 1.6) / 11), by + 0.36, z - 0.82), BRASS)
  // a janela do forno acesa sobre a viga: arco de brasa com a grade escura na frente
  const wy = by + 0.45
  for (let k = 0; k <= 10; k++) {
    const a = Math.PI * (k / 10)
    glow.box(1.2, 0.9, 0.1, at(Math.cos(a) * 5.4, wy + Math.sin(a) * 3.2 * 0.5 + 0.45, z + 0.3, 0, 0, a - Math.PI / 2), mix(EMBER, MOLTEN, Math.sin(a) * 0.7))
  }
  glow.box(10, 2.6, 0.08, at(0, wy + 1.3, z + 0.35), (x, y) => mix(EMBER, MOLTEN, Math.max(0, 1 - Math.abs(x) / 5) * (0.5 + y * 0.3)))
  st.box(11.6, 0.3, 1.2, at(0, wy + 3.1, z), IRON)
  for (let k = -4; k <= 4; k++) st.box(0.16, 2.8, 0.16, at(k * 1.15, wy + 1.4, z - 0.2), IRON)
  st.box(10.6, 0.14, 0.16, at(0, wy + 1.4, z - 0.2), IRON)
  // o canhão: cano de ferro com anéis de latão, preso na viga por duas abraçadeiras, boca acesa para −z
  const cy = by - 1.0
  const Lc = 4.2
  const tilt = 0.18
  const cm = (dz: number) => at(0, cy + Math.sin(tilt) * dz, z - 0.6 + Math.cos(tilt) * dz, 0, Math.PI / 2 - tilt, 0)
  st.cylinder(1.9, Lc, at(0, 0, 0).multiply(cm(-Lc / 2)), (_x, y) => (y < -Lc / 2 + 0.3 ? IRON_L : IRON), 16, 1.6)
  for (const d of [-0.6, -1.8, -3.2]) st.torus(2.0, 0.22, at(0, 0, 0, 0, Math.PI / 2, 0).multiply(at(0, cy + Math.sin(tilt) * d, z - 0.6 + Math.cos(tilt) * d, 0, -tilt, 0)), BRASS, 18)
  glow.cylinder(1.25, 0.08, cm(-Lc - 0.02), MOLTEN, 16)
  glow.torus(1.4, 0.1, at(0, 0, 0, 0, Math.PI / 2, 0).multiply(at(0, cy + Math.sin(tilt) * (-Lc), z - 0.6 + Math.cos(tilt) * (-Lc), 0, -tilt, 0)), EMBER, 16)
  for (const sx of [-1, 1]) {
    st.box(0.3, 1.1, 0.6, at(sx * 1.05, cy + 0.55, z - 0.9), IRON_L)
    st.box(0.3, 0.3, 0.3, at(sx * 1.05, cy + 1.05, z - 0.9), BRASS)
  }
}

// ── 3. a bola de ferro em brasa: casca escura (ferro e ferrugem em manchas) com rachaduras acesas que dão a
// volta (polilinhas tortas) e bolhas de brasa; casca + brasa = 2 moldes, 16 de cada ──
function ballCrust(g: SoftGeo, R: number) {
  g.sphere(R * 2, at(0, 0, 0), (x, y, z) => {
    const n = Math.sin(x * 3.1 + y * 2.3) * Math.cos(z * 2.7 - x * 1.4)
    return n > 0.45 ? mix(IRON, IRON_L, 0.4) : n < -0.4 ? RUST : IRON
  }, 18)
  // calombos de escória (silhueta quebrada)
  for (let k = 0; k < 9; k++) {
    const a = n01(k, 1) * Math.PI * 2
    const b = Math.acos(n01(k, 2) * 2 - 1)
    g.sphere(R * 0.55, at(Math.sin(b) * Math.cos(a) * R * 0.92, Math.cos(b) * R * 0.92, Math.sin(b) * Math.sin(a) * R * 0.92), mix(IRON, RUST, 0.5), 6, 1, 0.6, 1)
  }
}
function ballEmber(g: SoftGeo, R: number) {
  for (let c = 0; c < 3; c++) {
    // grande círculo torto: eixo sorteado, raio um pouco além da casca
    const ax = new Vector3(n01(c, 3) - 0.5, n01(c, 4) - 0.5, n01(c, 5) - 0.5).normalize()
    const u = Vector3.Cross(ax, Math.abs(ax.y) < 0.9 ? Vector3.Up() : Vector3.Right()).normalize()
    const v = Vector3.Cross(ax, u)
    const N = 22
    let prev: Vector3 | null = null
    for (let k = 0; k <= N; k++) {
      const t = (k / N) * Math.PI * 2
      const wob = Math.sin(t * 5 + c) * 0.18
      const p = u.scale(Math.cos(t)).add(v.scale(Math.sin(t))).add(ax.scale(wob)).normalize().scale(R * 1.01)
      if (prev) g.tube(prev, p, 0.075, k % 4 === 0 ? MOLTEN : EMBER, 5)
      prev = p
    }
  }
  for (let k = 0; k < 6; k++) {
    const a = n01(k, 7) * Math.PI * 2
    const b = Math.acos(n01(k, 8) * 2 - 1)
    g.sphere(R * 0.28, at(Math.sin(b) * Math.cos(a) * R * 0.97, Math.cos(b) * R * 0.97, Math.sin(b) * Math.sin(a) * R * 0.97), MOLTEN, 6)
  }
}

export class AltoFornoBalls {
  private readonly bases: Mesh[] = []
  private readonly pool: [InstancedMesh, InstancedMesh][] = []
  constructor(scene: Scene, toy: Material, glowMat: Material, R: number) {
    const a = new SoftGeo()
    ballCrust(a, R)
    const b = new SoftGeo()
    ballEmber(b, R)
    const ca = a.build("altoforno-ball", scene, toy, false)
    const cb = b.build("altoforno-ball-lit", scene, glowMat, false)
    ca.isVisible = false
    cb.isVisible = false
    this.bases.push(ca, cb)
    for (let i = 0; i < 56; i++) {
      const p: [InstancedMesh, InstancedMesh] = [ca.createInstance(`altoforno-ball-${i}`), cb.createInstance(`altoforno-ball-lit-${i}`)]
      for (const m of p) {
        m.isPickable = false
        m.setEnabled(false)
      }
      this.pool.push(p)
    }
  }
  /** `balls` = ballsAt: [x, y, z, faixa, índice] por bola. */
  update(balls: number[], R: number) {
    let used = 0
    for (let k = 0; k < balls.length && used < this.pool.length; k += 5) {
      const p = this.pool[used++]
      for (const m of p) {
        m.setEnabled(true)
        m.position.set(balls[k], balls[k + 1], balls[k + 2])
        // rola ladeira abaixo e gira um pouco de lado (cada bola com o seu)
        m.rotation.x = -balls[k + 2] / R
        m.rotation.y = balls[k + 4] * 1.7
      }
    }
    for (let i = used; i < this.pool.length; i++) for (const m of this.pool[i]) m.setEnabled(false)
  }
  dispose() {
    for (const p of this.pool) for (const m of p) m.dispose()
    for (const b of this.bases) b.dispose()
  }
}

// ── 4. bigorna (o pino da regra, r 0,6 × 1,3): pé de ferro em degraus, cintura, mesa com o chifre virado para
// fora da pista, um lingote em brasa em cima e o martelo encostado ──
export function altoFornoAnvil(st: SoftGeo, glow: SoftGeo, q: Post) {
  const h = q.y1 - q.y0
  const out = Math.sign(q.x) || 1
  const y = q.y0
  // pé: dois degraus (sombra de contato embaixo)
  st.box(1.3, 0.22, 1.2, at(q.x, y + 0.11, q.z), mix(IRON, HAZ_K, 0.5))
  st.box(1.05, 0.3, 0.95, at(q.x, y + 0.37, q.z), IRON)
  // cintura e mesa (quina clara em cima)
  st.box(0.55, h * 0.3, 0.6, at(q.x, y + 0.52 + h * 0.15, q.z), mix(IRON, RUST, 0.3))
  const ty = y + 0.52 + h * 0.3
  st.box(1.25, 0.34, 0.8, at(q.x, ty + 0.17, q.z), (_x, yy) => (yy > 0.1 ? IRON_L : IRON))
  // chifre: cone deitado para fora
  st.cylinder(0.5, 0.75, at(q.x + out * 0.98, ty + 0.2, q.z, 0, 0, out * Math.PI / 2), IRON, 8, 0.06)
  // furo quadrado da mesa e o lingote em brasa
  st.box(0.12, 0.02, 0.12, at(q.x - out * 0.4, ty + 0.35, q.z), HAZ_K)
  glow.box(0.46, 0.14, 0.24, at(q.x + out * 0.05, ty + 0.42, q.z + 0.05, 0.3), EMBER)
  glow.box(0.3, 0.05, 0.12, at(q.x + out * 0.05, ty + 0.5, q.z + 0.05, 0.3), MOLTEN)
  // martelo encostado no pé (cabo de madeira, cabeça de ferro)
  st.box(0.07, 0.9, 0.07, at(q.x - out * 0.2, y + 0.55, q.z - 0.55, 0, 0.35, 0), [0.4, 0.26, 0.14])
  st.box(0.28, 0.16, 0.16, at(q.x - out * 0.2, y + 0.98, q.z - 0.71), IRON_L)
}

// ── 5. a grelha do pé da rampa: a bola cai nela (afunda ~0,7 m antes de sumir) — fosso aceso com barras de
// ferro, moldura com faixa de perigo ──
export function altoFornoGrate(st: SoftGeo, glow: SoftGeo, course: Course) {
  const R = course.ramp
  if (!R) return
  const z = R.z0 - 1.3
  const W = R.hx * 2 - 0.6
  const y = R.y0
  glow.box(W - 0.2, 0.02, 2.0, at(R.x, y + 0.03, z), (x, _y, zz) => mix(EMBER, MOLTEN, Math.max(0, Math.sin(x * 1.3 + zz * 2)) * 0.6))
  for (let k = 0; k < Math.round(W / 0.55); k++) st.box(0.14, 0.12, 2.1, at(R.x - W / 2 + 0.3 + k * 0.55, y + 0.1, z), (_x, yy) => (yy > 0.02 ? IRON_L : IRON))
  for (const dz of [-0.6, 0, 0.6]) st.box(W, 0.08, 0.1, at(R.x, y + 0.07, z + dz), IRON)
  for (const s of [-1, 1]) {
    st.box(W + 0.3, 0.16, 0.3, at(R.x, y + 0.1, z + s * 1.15), HAZ_K)
    for (let k = 0; k < Math.round(W / 0.8); k++) st.box(0.35, 0.17, 0.31, at(R.x - W / 2 + 0.4 + k * 0.8, y + 0.105, z + s * 1.15, 0.6), HAZ_O)
  }
}

// ── 6. barra de fogo (local: eixo no centro, barra ao longo de z): viga de ferro quadrada com cintas de latão,
// bicos de queimador em cima soltando chamas (laranja por fora, amarelo no miolo), contrapesos nas pontas e o
// pedestal do eixo (bloco de ferro com janela acesa) ──
export function altoFornoSweep(g: SoftGeo, gl: SoftGeo, s: Sweeper) {
  const z0 = s.both ? -s.len : 0
  const len = s.both ? s.len * 2 : s.len
  const d = s.r * 2
  g.box(d, d, len, at(0, 0, z0 + len / 2), (_x, y) => (y > s.r * 0.5 ? IRON_L : IRON))
  for (let k = 0; k < Math.round(len / 1.6); k++) {
    const z = z0 + 0.8 + k * 1.6
    if (Math.abs(z) < 0.9) continue
    g.box(d + 0.08, d + 0.08, 0.16, at(0, 0, z), BRASS)
    // bico + chama (a chama é a parte que queima: em cima da barra)
    const zf = z + 0.8
    if (Math.abs(zf) < 0.9 || zf > z0 + len - 0.3) continue
    g.cylinder(0.2, 0.18, at(0, s.r + 0.09, zf), IRON_L, 6)
    gl.cylinder(0.36, 0.75, at(0, s.r + 0.55, zf), EMBER, 6, 0.04)
    gl.cylinder(0.18, 0.45, at(0, s.r + 0.45, zf), MOLTEN, 5, 0.02)
  }
  for (const e of s.both ? [-s.len, s.len] : [s.len]) {
    g.box(d + 0.3, d + 0.3, 0.5, at(0, 0, e - Math.sign(e) * 0.25), IRON)
    g.box(d + 0.34, 0.1, 0.54, at(0, s.r + 0.15, e - Math.sign(e) * 0.25), HAZ_O)
  }
  // o eixo: pedestal de ferro com janela acesa nas 4 faces e tampa de latão
  const py = -(s.y - 3)
  const ph = Math.max(0.6, -py + 0.2)
  g.box(1.5, ph, 1.5, at(0, py + ph / 2 - 0.1, 0), (_x, y) => (y > ph / 2 - 0.15 ? IRON_L : IRON))
  for (let k = 0; k < 4; k++) {
    const a = (k / 4) * Math.PI * 2
    gl.box(0.6, 0.22, 0.04, at(Math.sin(a) * 0.76, py + ph * 0.45, Math.cos(a) * 0.76, a), EMBER)
  }
  g.cylinder(1.1, 0.3, at(0, s.r + 0.2, 0), BRASS, 12)
}

/** Quadro fixo da esteira: trilhos com faixa de perigo, rolos nas bordas, parafusos. */
export function altoFornoFrame(st: SoftGeo, glow: SoftGeo, p: Pad) {
  if (!isBeltRamp(p)) return
  const rise = p.y2 - p.y
  const L = Math.hypot(p.hz * 2, rise)
  const a = Math.atan2(rise, p.hz * 2)
  const yc = (p.y + p.y2) / 2
  const fr = (dx: number, dy: number, dz: number) => at(p.x + dx, yc + dy + Math.sin(a) * dz, p.z + Math.cos(a) * dz, 0, -a)
  for (const sx of [-1, 1]) {
    const x = sx * (p.hx - 0.2)
    // trilho: viga de ferro mais alta que o tampo (quina clara em cima), faixa de perigo inclinada por fora
    st.box(0.42, 0.75, L, fr(x, 0.22, 0), (_x, y) => (y > 0.3 ? IRON_L : IRON))
    // faixa de perigo na face de DENTRO (a que quem corre vê): listras inclinadas laranja sobre preto
    st.box(0.04, 0.42, L, fr(x - sx * 0.22, 0.26, 0), HAZ_K)
    for (let s = -L / 2 + 0.5; s < L / 2; s += 1.0) st.box(0.05, 0.42, 0.42, at(0, 0, 0, 0, 0.6, 0).multiply(fr(x - sx * 0.23, 0.26, s)), HAZ_O)
    // rolos que saem do trilho (a cada 4 m), com cubo de latão
    for (let s = -L / 2 + 2; s < L / 2; s += 4) {
      st.cylinder(0.5, 0.3, at(0, 0, 0, 0, 0, Math.PI / 2).multiply(fr(x + sx * 0.35, -0.05, s)), IRON, 10)
      st.cylinder(0.22, 0.34, at(0, 0, 0, 0, 0, Math.PI / 2).multiply(fr(x + sx * 0.37, -0.05, s)), BRASS, 8)
    }
    // filete de brasa entre o trilho e as taliscas (a esteira esquenta)
    glow.box(0.08, 0.04, L - 0.6, fr(x - sx * 0.27, 0.06, 0), EMBER)
  }
}
