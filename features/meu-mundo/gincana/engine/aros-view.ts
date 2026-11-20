// features/meu-mundo/gincana/engine/aros-view.ts — Descida dos Aros (4ª fase do Mar de Gelo, 2026-11-20):
// o desenho próprio da prova "descida escorregadia com aros que dão turbo", peça por peça
// (skill meu-mundo-cenario-codigo).
//
// FICHA (referência: vídeo de uma corrida de descida com argolas num party game — só o TIPO de prova e a
// riqueza de detalhe; nada de traçado, personagem, logotipo, cor de marca, interface ou arte do jogo do vídeo)
// O que é:     duas descidas de gelo liso no Domínio do Mar de Gelo (Nívea), com aros de cristal flutuando no
//              caminho (passar por dentro = turbo), um patamar com o bloco de gelo que desliza, o cogumelo de
//              neve que joga até o aro alto e, no fim, dois paredões de gelo talhado com janelas (cada janela
//              tem um aro).
// Silhueta:    aros de 2,9 m de pé com cristais pontudos saindo para fora (estrela), a calha da descida com
//              bancos de neve, paredões de 4,5 m com janelas de 2,4 m e ameias de gelo no topo.
// Massas:      aro r 1,45 (maior móvel) · calha 13 × 45 m · paredão 16 × 4,5 × 0,9 · cogumelo r 1,1 · pilar
//              r 0,75 × 2,4.
// Paleta:      gelo fundo (0,16/0,36/0,58) → gelo (0,42/0,66/0,86) → quina (0,8/0,93/1), neve (0,94/0,97/1),
//              cristal do aro (0,3/0,62/0,9), luz fria (0,55/0,95/1) e o acento: magenta-aurora (0,95/0,45/0,9).
// 70/20/10:    70 gelo e neve, 20 azul fundo do cristal, 10 luz fria e a aurora.
// Material:    cristal (gelo), neve.
// Fora:        argolas coloridas, rampas infláveis, o céu claro e qualquer interface do vídeo.
// Inventado:   o aro flutuando (magia da Nívea), os cristais em estrela, a runa de luz no gelo sob o aro.
//
// PARTES (ordem de construção — §2)
// 1. aro de cristal — grande: o anel facetado (fundo embaixo → claro em cima); médio: cristais pontudos em
//    estrela, filete aceso por dentro (o "passe por aqui"); pequeno: geada, pingentes, pontas acesas.
// 2. calha de gelo da descida — 3. paredão com janelas — 4. cogumelo de neve — 5. pilares de gelo —
//    6. bloco do patamar (o dos Portões).

import type { Scene } from "@babylonjs/core/scene"
import type { Mesh } from "@babylonjs/core/Meshes/mesh"
import type { InstancedMesh } from "@babylonjs/core/Meshes/instancedMesh"
import type { Material } from "@babylonjs/core/Materials/material"
import { DECK, hoopX, type Course, type Hoop, type Pad } from "../sim/course"
import { SoftGeo, at, mix, type RGB } from "./shapes"

const ICE_D: RGB = [0.16, 0.36, 0.58]
const ICE: RGB = [0.42, 0.66, 0.86]
const ICE_L: RGB = [0.8, 0.93, 1]
const CRYS: RGB = [0.3, 0.62, 0.9]
const COLD: RGB = [0.55, 0.95, 1]
const AURORA: RGB = [0.95, 0.45, 0.9]

/** Ruído barato e fixo (0–1). */
function n01(a: number, b: number, c = 0) {
  return Math.abs(Math.sin(a * 12.9898 + b * 78.233 + c * 37.719) * 43758.5453) % 1
}

/** Aro grande (descida) × aro de janela (paredão). */
const BIG = 1.3

// ── 1. aro de cristal: na origem, de pé no plano xy (atravessa-se em +z) ──
function crystalHoop(g: SoftGeo, gl: SoftGeo, R: number, star: boolean) {
  const T = star ? 0.36 : 0.3
  // o anel: facetado (poucos lados), fundo embaixo → claro em cima, quina clara por fora
  const F = star ? 20 : 16
  g.torus(R * 2, T, at(0, 0, 0, 0, Math.PI / 2), (x, y, z) => {
    const up = -z / R
    const out = Math.hypot(x, z) > R
    // facetas: um gomo sim, outro não, mais claro; a face de cima do tubo pega luz
    const band = Math.floor(((Math.atan2(z, x) + Math.PI) / (Math.PI * 2)) * F) % 2
    const base = mix(CRYS, ICE, 0.35 + up * 0.3 + band * 0.18)
    return mix(base, ICE_L, (out ? 0.3 : 0) + (y > T * 0.25 ? 0.3 : 0))
  }, F)
  // um segundo anel mais fino por fora, deslocado: o cristal tem "camadas"
  g.torus(R * 2 + T * 0.9, T * 0.32, at(0, 0, 0.05, 0, Math.PI / 2), (_x, _y, z) => mix(ICE, ICE_L, 0.5 - z / R * 0.3), F)
  // quina clara nas duas faces (pega a luz)
  for (const fz of [-1, 1]) g.torus(R * 2 + T * 0.35, 0.05, at(0, 0, fz * T * 0.42, 0, Math.PI / 2), ICE_L, F)
  // o filete aceso por dentro: é o "passe por aqui"
  gl.torus(R * 2 - T * 1.15, 0.07, at(0, 0, 0, 0, Math.PI / 2), COLD, 28)
  // geada: lascas claras presas no anel
  for (let k = 0; k < (star ? 14 : 9); k++) {
    const a = n01(k, R, 1) * Math.PI * 2
    const s = 0.08 + n01(k, R, 2) * 0.1
    g.box(s, s, s, at(Math.cos(a) * (R + T * 0.3), Math.sin(a) * (R + T * 0.3), (n01(k, R, 3) - 0.5) * T, a, 0.7, 0.7), ICE_L)
  }
  if (!star) return
  // cristais pontudos em estrela (longo/curto alternados; nenhum para baixo, onde viram pingentes)
  const N = 10
  for (let k = 0; k < N; k++) {
    const a = (k / N) * Math.PI * 2 + Math.PI / 2
    const down = Math.sin(a) < -0.8
    const L = down ? 0.32 : k % 2 ? 0.48 : 0.95
    const r0 = R + T * 0.35
    const w = k % 2 ? 0.2 : 0.3
    g.cylinder(w, L, at(Math.cos(a) * (r0 + L / 2), Math.sin(a) * (r0 + L / 2), 0, 0, 0, a - Math.PI / 2), (_x, y) => (y > L * 0.2 ? ICE_L : mix(ICE, ICE_L, 0.25)), 5, 0)
    // a ponta dos longos acende (luz fria; a do topo é aurora)
    if (!(k % 2) && !down) gl.sphere(0.14, at(Math.cos(a) * (r0 + L + 0.02), Math.sin(a) * (r0 + L + 0.02), 0), k === 0 ? AURORA : COLD, 6)
  }
  // pingentes embaixo
  for (const dx of [-0.32, 0, 0.3]) {
    const L = dx === 0 ? 0.45 : 0.26
    g.cylinder(0.12, L, at(dx, -R - T * 0.4 - L / 2, 0), (_x, y) => (y < 0 ? ICE_L : ICE), 5, 0)
  }
}

/**
 * Os aros (2 moldes instanciados: o da descida e o da janela). Giram devagar no próprio eixo, o que anda vai e
 * volta, e quem passa faz o aro pulsar. Chamadas: 2 moldes × (cristal + aceso) = 4.
 */
export class ArosHoops {
  private readonly bases: Mesh[] = []
  private readonly items: { h: Hoop; m: InstancedMesh; lit: InstancedMesh; star: boolean; s: number; pulse: number }[] = []

  constructor(scene: Scene, toy: Material, glowMat: Material, course: Course) {
    const kinds = new Map<boolean, [Mesh, Mesh, number]>()
    for (const h of course.hoops) {
      const star = h.R >= BIG
      let pair = kinds.get(star)
      if (!pair) {
        const g = new SoftGeo()
        const gl = new SoftGeo()
        crystalHoop(g, gl, h.R, star)
        const a = g.build(`aros-hoop-${star ? 1 : 0}`, scene, toy, false)
        const b = gl.build(`aros-hoop-lit-${star ? 1 : 0}`, scene, glowMat, false)
        a.isVisible = false
        b.isVisible = false
        this.bases.push(a, b)
        pair = [a, b, h.R]
        kinds.set(star, pair)
      }
      const s = h.R / pair[2]
      const i = this.items.length
      const m = pair[0].createInstance(`aros-hoop-${i}`)
      const lit = pair[1].createInstance(`aros-hoop-lit-${i}`)
      for (const q of [m, lit]) {
        q.isPickable = false
        q.position.set(h.x, h.y, h.z)
        q.scaling.setAll(s)
      }
      this.items.push({ h, m, lit, star, s, pulse: -9 })
    }
  }

  /** Alguém passou pelo aro `i` (no relógio da corrida `t`). */
  flash(i: number, t: number) {
    const it = this.items[i]
    if (it) it.pulse = t
  }

  update(t: number) {
    for (let i = 0; i < this.items.length; i++) {
      const it = this.items[i]
      const x = hoopX(it.h, t)
      const age = t - it.pulse
      const k = age >= 0 && age < 0.45 ? 1 + Math.sin((age / 0.45) * Math.PI) * 0.22 : 1
      const spin = it.star ? t * (i % 2 ? -0.35 : 0.3) + i : 0
      for (const q of [it.m, it.lit]) {
        q.position.x = x
        q.rotation.z = spin
        q.scaling.setAll(it.s * k)
      }
    }
  }

  dispose() {
    for (const it of this.items) {
      it.m.dispose()
      it.lit.dispose()
    }
    for (const m of this.bases) m.dispose()
  }
}

// ── 2. calha de gelo da descida (rampa de atrito baixo): faixas de gelo no comprido (tons em manchas), riscos
// de brilho correndo para baixo, bolhas presas, banco de neve nas duas bordas (mais escuro no pé) e a runa
// acesa no gelo sob cada aro parado (o "contato" do aro que flutua). ──
export function arosSlide(g: SoftGeo, gl: SoftGeo, p: Pad, hoops: readonly Hoop[]) {
  if (p.k !== 2 || p.f >= 0.7) return
  const L = p.hz * 2
  const drop = p.y - p.y2
  const th = Math.atan2(drop, L)
  const len = Math.hypot(L, drop)
  const yAt = (z: number) => p.y + (p.y2 - p.y) * ((z - (p.z - p.hz)) / L)
  // um ponto sobre o gelo: (x, z) no chão, `h` acima, inclinado com a rampa
  const on = (x: number, z: number, h: number, rotY = 0) => at(x, yAt(z) + h / Math.cos(th), z, rotY, th)
  const W = p.hx * 2 - 0.6
  const lanes = 6
  const lw = W / lanes
  const segs = Math.max(4, Math.round(len / 3))
  const sl = L / segs
  for (let i = 0; i < lanes; i++) {
    const x = p.x - W / 2 + (i + 0.5) * lw
    for (let j = 0; j < segs; j++) {
      const z = p.z - p.hz + (j + 0.5) * sl
      // manchas largas de 3 tons: gelo fundo, médio e uma geada clara de vez em quando
      const tone = Math.sin(x * 0.7 + z * 0.11) * 0.5 + 0.5
      const c = n01(i, j, 1) < 0.1 ? mix(ICE, ICE_L, 0.55) : mix(ICE_D, ICE, 0.38 + tone * 0.32 + (i % 2) * 0.05)
      g.box(lw - 0.06, 0.04, sl / Math.cos(th) - 0.06, on(x, z, 0.03), c)
    }
  }
  // riscos de brilho no comprido (gelo polido pelo escorregão)
  for (let k = 0; k < 14; k++) {
    const x = p.x + (n01(k, p.z, 2) - 0.5) * (W - 1)
    const z = p.z - p.hz + 2 + n01(k, p.z, 3) * (L - 6)
    const sLen = 2 + n01(k, p.z, 4) * 4
    g.box(0.06, 0.012, sLen, on(x, z, 0.065, (n01(k, p.z, 5) - 0.5) * 0.08), ICE_L)
  }
  // bolhas presas
  for (let k = 0; k < 40; k++) {
    const x = p.x + (n01(k, p.z, 6) - 0.5) * (W - 0.6)
    const z = p.z - p.hz + 0.5 + n01(k, p.z, 7) * (L - 1)
    const s2 = 0.06 + n01(k, p.z, 8) * 0.07
    g.box(s2, 0.012, s2, on(x, z, 0.06, n01(k, 9) * 3), mix(ICE_L, [1, 1, 1], 0.4))
  }
  // banco de neve nas bordas: bolotas que passam da borda, a sombra azul no pé
  for (const sx of [-1, 1]) {
    const n = Math.round(L / 0.85)
    for (let k = 0; k < n; k++) {
      const z = p.z - p.hz + 0.4 + k * (L - 0.8) / (n - 1) + (n01(k, sx, 11) - 0.5) * 0.3
      if (n01(k, sx, 12) < 0.12) continue
      const d = 0.65 + n01(k, sx, 13) * 0.75
      g.sphere(d, on(p.x + sx * (p.hx - 0.22 - n01(k, sx, 14) * 0.15), z, 0.04), (_x, y) => (y < 0 ? [0.62, 0.74, 0.88] : [0.94, 0.97, 1]), 6, 1.2, 0.6, 1.5)
    }
  }
  // a runa acesa sob cada aro parado desta rampa: anel fino + 6 traços (floco)
  for (const h of hoops) {
    if (h.mx > 0 || h.z < p.z - p.hz || h.z > p.z + p.hz) continue
    gl.torus(1.9, 0.06, on(h.x, h.z, 0.08), COLD, 24)
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2
      gl.box(0.06, 0.02, 0.62, at(0, 0, 0).multiply(on(h.x + Math.sin(a) * 0.55, h.z + Math.cos(a) * 0.55, 0.085, a)), COLD)
    }
  }
}

// ── 3. paredão com janelas: blocos de gelo talhado em fiadas desencontradas (3 tons, mais escuros no pé),
// rejunte de neve, ameias com gorro de neve e pingentes no topo, peitoril e verga com neve, e a borda da
// janela acesa (luz fria). Cada caixa fina e alta do paredão (parede, peitoril, verga) passa por aqui. ──
export function arosWall(g: SoftGeo, gl: SoftGeo, p: Pad) {
  if (p.k !== 1 || p.hz > 0.5 || p.y < DECK + 0.9 || p.rot !== 0) return false
  const y1 = p.y
  const y0 = p.y - p.d
  const H = y1 - y0
  const W = p.hx * 2
  const D = p.hz * 2
  const tall = H > 3
  const sill = !tall && y0 <= DECK + 0.05
  // o rejunte: a laje clara por trás dos blocos
  g.box(W - 0.04, H - 0.02, D - 0.06, at(p.x, y0 + H / 2, p.z), mix(ICE_L, [0.94, 0.97, 1], 0.4))
  // os blocos (fiadas de ~0,75 m, juntas desencontradas)
  const rows = Math.max(1, Math.round(H / 0.75))
  const rh = H / rows
  for (let r = 0; r < rows; r++) {
    const off = r % 2 ? 0.7 : 0
    const xs = [p.x - p.hx]
    for (let x = p.x - p.hx + 0.7 + off; x < p.x + p.hx - 0.35; x += 1.4) xs.push(x)
    xs.push(p.x + p.hx)
    for (let b = 0; b + 1 < xs.length; b++) {
      const a = xs[b] + 0.035
      const c = xs[b + 1] - 0.035
      if (c - a < 0.15) continue
      const yy = y0 + r * rh + rh / 2
      const k = (yy - DECK) / 4.5
      const tone = n01(Math.round(a * 10), r, p.z)
      const base = tone < 0.33 ? ICE_D : tone < 0.75 ? mix(ICE_D, ICE, 0.55) : ICE
      // contato: a fiada do pé mais escura
      const col = mix(base, ICE_L, Math.min(0.35, k * 0.3) + (r === 0 && y0 <= DECK + 0.05 ? -0.15 : 0))
      g.roundBox(c - a, rh - 0.07, D + 0.08, 0.05, at((a + c) / 2, yy, p.z), (x, y, z) => {
        // quina clara em cima do bloco
        return y > rh / 2 - 0.12 || Math.abs(z) > D / 2 + 0.02 && Math.abs(x) > (c - a) / 2 - 0.08 ? mix(col, ICE_L, 0.45) : col
      }, 2)
      // lasca de geada no bloco (pequeno)
      if (n01(b, r, p.z + 3) < 0.35) {
        const fz = n01(b, r, 5) < 0.5 ? -1 : 1
        g.box(0.12, 0.12, 0.05, at((a + c) / 2 + (n01(b, r, 6) - 0.5) * (c - a) * 0.6, yy + (n01(b, r, 7) - 0.5) * rh * 0.5, p.z + fz * (D / 2 + 0.06), 0, 0, 0.78), ICE_L)
      }
    }
  }
  // topo: neve (passa da borda) e, no paredão alto, ameias com gorro de neve
  g.roundBox(W + 0.12, 0.18, D + 0.3, 0.08, at(p.x, y1 + 0.06, p.z), [0.94, 0.97, 1], 2)
  if (tall) {
    const n = Math.max(1, Math.round(W / 1.5))
    for (let m = 0; m < n; m++) {
      const x = p.x - p.hx + (m + 0.5) * (W / n)
      g.roundBox(Math.min(0.9, W / n - 0.3), 0.55, D, 0.06, at(x, y1 + 0.42, p.z), (_x, y) => (y > 0.12 ? mix(ICE, ICE_L, 0.5) : ICE), 2)
      g.sphere(0.85, at(x, y1 + 0.72, p.z), (_x, y) => (y < 0 ? [0.72, 0.8, 0.9] : [0.94, 0.97, 1]), 6, 1.3, 0.45, 1.1)
    }
  }
  // pingentes nas duas faces, debaixo da neve (no peitoril só na frente)
  {
    for (const fz of sill ? [-1] : [-1, 1]) {
      const n = Math.round(W / 0.45)
      for (let k = 0; k < n; k++) {
        if (n01(k, fz, p.x + p.z) < 0.35) continue
        const L = 0.16 + n01(k, fz, p.x) * (tall ? 0.6 : 0.3)
        g.cylinder(0.1, L, at(p.x - p.hx + 0.2 + k * ((W - 0.4) / Math.max(1, n - 1)), y1 - L / 2 - 0.02, p.z + fz * (D / 2 + 0.07)), (_x, y) => (y < 0 ? ICE_L : ICE), 5, 0)
      }
    }
  }
  // a borda da janela acesa: filete vertical nas pontas do paredão que dão para uma janela (não nas pontas
  // de fora do percurso) e filete deitado no peitoril e na verga
  if (tall) {
    for (const sx of [-1, 1]) {
      const ex = p.x + sx * p.hx
      if (Math.abs(ex) > 7.5) continue
      for (const fz of [-1, 1]) gl.box(0.07, 2.6, 0.07, at(ex, DECK + 2.3, p.z + fz * (D / 2 + 0.03)), COLD)
    }
  } else {
    const yy = sill ? y1 + 0.005 : y0 - 0.005
    for (const fz of [-1, 1]) gl.box(W - 0.1, 0.06, 0.07, at(p.x, yy, p.z + fz * (D / 2 + 0.03)), COLD)
  }
  return true
}

// ── 4. cogumelo de neve (o que lança até o aro alto): talo de gelo torcido com raízes de cristal e neve no pé;
// o chapéu (malha à parte, pulsa) é neve fofa com borda azulada, pintas de luz fria e pingentes na aba. ──
type PostQ = { x: number; z: number; r: number; y0: number; y1: number }
export function arosShroomStalk(g: SoftGeo, q: PostQ) {
  const h = q.y1 - q.y0
  g.cylinder(q.r * 0.95, h, at(q.x, q.y0 + h / 2, q.z, 0.4), (_x, y) => mix(ICE, ICE_L, 0.25 + (y / h) * 0.5), 7, q.r * 0.7)
  // veios claros subindo em espiral
  for (let k = 0; k < 4; k++) {
    const a = (k / 4) * Math.PI * 2
    g.box(0.06, h * 0.8, 0.06, at(q.x + Math.cos(a) * q.r * 0.4, q.y0 + h * 0.45, q.z + Math.sin(a) * q.r * 0.4, a, 0, 0.18), ICE_L)
  }
  // raízes de cristal e neve no pé
  for (let k = 0; k < 5; k++) {
    const a = (k / 5) * Math.PI * 2 + 0.3
    g.cylinder(0.22, 0.7, at(q.x + Math.cos(a) * q.r * 0.55, q.y0 + 0.2, q.z + Math.sin(a) * q.r * 0.55, 0, Math.cos(a) * 0.7, -Math.sin(a) * 0.7), mix(CRYS, ICE, 0.4), 5, 0)
  }
  g.sphere(q.r * 2.1, at(q.x, q.y0 + 0.05, q.z), (_x, y) => (y < 0 ? [0.62, 0.74, 0.88] : [0.94, 0.97, 1]), 8, 1, 0.3, 1)
}
export function arosShroomCap(cap: SoftGeo, r: number) {
  cap.sphere(r * 2.25, at(0, 0, 0), (x, y, z) => {
    const e = Math.hypot(x, z) / (r * 1.1)
    return y < -0.05 ? [0.45, 0.62, 0.82] : mix([0.92, 0.96, 1], [0.6, 0.82, 0.98], Math.max(0, e - 0.6) * 1.6)
  }, 14, 1, 0.42, 1)
  for (let k = 0; k < 7; k++) {
    const a = (k / 7) * Math.PI * 2
    const rr = k === 6 ? 0 : r * 0.62
    cap.sphere(r * 0.3, at(Math.cos(a) * rr, r * 0.4 - (rr ? 0.06 : -0.04), Math.sin(a) * rr), COLD, 6, 1, 0.45, 1)
  }
  // pingentes na aba
  for (let k = 0; k < 12; k++) {
    const a = (k / 12) * Math.PI * 2
    const L = 0.18 + n01(k, r, 3) * 0.3
    cap.cylinder(0.11, L, at(Math.cos(a) * r * 1.02, -0.12 - L / 2, Math.sin(a) * r * 1.02), ICE_L, 5, 0)
  }
}

// ── 5. pilar de gelo (obstáculo da descida): coluna de cristal sextavada com ponta em cacho, cristais menores
// em volta do pé, anel de neve no contato e lascas de geada. ──
export function arosPillar(g: SoftGeo, gl: SoftGeo, q: PostQ) {
  const h = q.y1 - q.y0
  const R = q.r
  g.cylinder(R * 2, h, at(q.x, q.y0 + h / 2, q.z, 0.3), (x, y, z) => {
    const band = Math.floor(((Math.atan2(z, x) + Math.PI) / (Math.PI * 2)) * 6) % 2
    return mix(mix(ICE_D, CRYS, 0.5 + (y / h) * 0.6), ICE_L, band * 0.18)
  }, 6, R * 1.75)
  // ponta: três cristais em cacho
  g.cylinder(R * 1.7, 1.1, at(q.x, q.y1 + 0.55, q.z, 0.3), (_x, y) => (y > 0.1 ? ICE_L : mix(CRYS, ICE, 0.6)), 6, 0)
  for (let k = 0; k < 3; k++) {
    const a = (k / 3) * Math.PI * 2 + 0.5
    g.cylinder(R * 0.8, 0.9, at(q.x + Math.cos(a) * R * 0.55, q.y1 + 0.25, q.z + Math.sin(a) * R * 0.55, a, 0.35), (_x, y) => (y > 0.1 ? ICE_L : ICE), 5, 0)
  }
  // filete aceso numa aresta
  gl.box(0.06, h * 0.7, 0.06, at(q.x + R * 0.95, q.y0 + h * 0.5, q.z, 0.3), COLD)
  // cristais pequenos no pé + anel de neve
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * Math.PI * 2 + 0.2
    const L = 0.35 + n01(k, q.z, 1) * 0.4
    g.cylinder(0.24, L, at(q.x + Math.cos(a) * (R + 0.15), q.y0 + 0.45 + L / 2 - 0.1, q.z + Math.sin(a) * (R + 0.15), 0, Math.cos(a) * 0.4, -Math.sin(a) * 0.4), mix(CRYS, ICE_L, 0.4), 5, 0)
  }
  g.torus(R * 2 + 0.3, 0.4, at(q.x, q.y0 + 0.5, q.z), (_x, y) => (y < 0 ? [0.62, 0.74, 0.88] : [0.94, 0.97, 1]), 12)
}
