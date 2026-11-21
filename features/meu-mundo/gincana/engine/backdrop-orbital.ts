// features/meu-mundo/gincana/engine/backdrop-orbital.ts — o fundo da Cidade Orbital pela MINIATURA das fases
// (20/11, `public/meu-mundo/gincana/fases/orbital.webp` e `helices.webp`), peça por peça (skill
// meu-mundo-cenario-codigo). Chamado de `backdrops.ts` (orbital); tudo nas malhas `lit`/`glow` (1 chamada cada).
//
// FICHA (referência: as duas miniaturas — o traçado da prova já bate; falta densidade e fundo cheio)
// O que é:     a cidade no vazio em volta das provas: ilhas de cone invertido flutuando em três distâncias,
//              cada uma com tampo de aço, aro aceso e ponta de cristal embaixo; torres brancas com faixas de neon;
//              anéis de tráfego; o planeta e as estrelas.
// Silhueta:    discos largos sobre cones escuros que afinam numa ponta acesa; em cima, torres e cúpulas que
//              quebram o contorno; torres altas de pé no vazio com faixas.
// Massas:      ilha r 5–16 (cone 1,3–1,7 r) · torre 4–10 × 16–50 m · anel 10–26 m.
// Médios:      faixas do cone (2 aros acesos), chanfro claro do tampo, prédios do tampo com janelas em fiada,
//              cúpula; pequenos: ponta de cristal, luzes de borda, antenas com luz.
// Paleta:      aço azul-noite 0,1/0,1/0,2 → quina 0,34/0,32/0,5; branco-lilás das torres 0,78/0,8/0,9;
//              magenta 1/0,3/0,8 · ciano 0,3/0,9/1 · âmbar 1/0,72/0,3 (acesos).
// 70/20/10:    70 aço escuro e branco das torres, 20 neon magenta/ciano, 10 âmbar.
// Fora:        a nebulosa pintada no céu (o céu segue o relógio de Brasília, regra do Alex); personagens.
// Inventado:   o lado de trás das ilhas, as janelas, as antenas.
//
// PARTES (ordem — §2)
// 1. ilha (orbIsland): tampo + aro aceso + cone em gomos + faixas + ponta de cristal + o que vai em cima
// 2. torre de pé (orbTower): bloco com faixas, janelas em fiada, coroa e antena
// 3. o arranjo: três camadas de distância, em manchas, cobrindo também atrás da largada (arena da Orbital)

import { Matrix } from "@babylonjs/core/Maths/math.vector"
import { SoftGeo, at, mix, type RGB } from "./shapes"
import { Z1 as SPAN_END, deckY, rnd } from "./backdrop-base"


const STEEL: RGB = [0.17, 0.16, 0.3]
const STEEL_HI: RGB = [0.34, 0.32, 0.5]
const WHITE: RGB = [0.86, 0.9, 1]
const MAG: RGB = [1, 0.3, 0.8]
const CYAN: RGB = [0.3, 0.9, 1]
const AMBER: RGB = [1, 0.72, 0.3]

/** Gomos do cone: faces alternadas em dois tons e escurece para a ponta (sombra de contato sob o tampo). */
function conePaint(h: number, seed: number) {
  return (x: number, y: number, z: number): RGB => {
    const g = Math.floor(((Math.atan2(z, x) / (Math.PI * 2)) + 1) * 8 + seed) % 2
    const t = Math.min(1, Math.max(0, (y + h / 2) / h)) // 0 = ponta, 1 = tampo
    const base = g ? STEEL : mix(STEEL, STEEL_HI, 0.5)
    const top = t > 0.92 ? mix(base, [0.02, 0.02, 0.05], 0.7) : base
    return mix(mix(top, [0.03, 0.03, 0.08], (1 - t) * 0.5), [0.2, 0.12, 0.3], (1 - t) * 0.25)
  }
}

/** Prédio do tampo: bloco claro com janelas acesas em fiada e o chanfro do topo. */
function roofBlock(lit: SoftGeo, glow: SoftGeo, x: number, y: number, z: number, w: number, h: number, rot: number, neon: RGB, i: number) {
  lit.roundBox(w, h, w, Math.min(0.5, w * 0.12), at(x, y + h / 2, z, rot), (_x, yy) => (yy > h / 2 - 0.4 ? mix(WHITE, [1, 1, 1], 0.4) : yy < -h / 2 + 0.6 ? mix(WHITE, STEEL, 0.5) : WHITE), 3)
  const rows = Math.max(1, Math.floor(h / 2.6))
  for (let r = 0; r < rows; r++) {
    const yy = y + 1.4 + r * 2.6
    if (yy > y + h - 1) break
    // fiada de janelas nas quatro faces (faixa escura com a luz no meio)
    glow.box(w + 0.06, 0.32, w * 0.7, at(x, yy, z, rot), r % 3 === 2 ? neon : AMBER)
    glow.box(w * 0.7, 0.32, w + 0.06, at(x, yy, z, rot), r % 3 === 2 ? neon : AMBER)
  }
  glow.box(w + 0.25, 0.28, w + 0.25, at(x, y + h - 0.2, z, rot), neon)
  if (i % 2 === 0) {
    lit.cylinder(0.12, 3, at(x, y + h + 1.5, z), STEEL_HI, 5, 0.05)
    glow.sphere(0.45, at(x, y + h + 3.1, z), i % 4 === 0 ? MAG : AMBER, 5)
  }
}

/**
 * 1. A ilha flutuante: tampo de aço com chanfro claro, aro aceso no tampo e outro sob a borda, cone invertido
 * em 8 gomos com duas faixas acesas, ponta de cristal acesa; em cima, prédios, cúpula ou praça de luzes.
 */
export function orbIsland(lit: SoftGeo, glow: SoftGeo, x: number, y: number, z: number, r: number, i: number, lod = 0) {
  const far = lod > 0
  const tt = lod === 0 ? 14 : lod === 1 ? 10 : 7
  const top = i % 2 ? MAG : CYAN
  const under = i % 2 ? CYAN : MAG
  const rot = rnd(i, 1) * Math.PI
  // tampo: placa grossa, chanfro claro em cima, borda escura embaixo
  lit.cylinder(r * 2, 1.4, at(x, y - 0.7, z, rot), (_x, yy) => (yy > 0.45 ? STEEL_HI : yy < -0.4 ? [0.05, 0.05, 0.1] : mix(STEEL, STEEL_HI, 0.35)), far ? 16 : 24, r * 1.9)
  lit.cylinder(r * 1.9, 0.12, at(x, y + 0.05, z), mix(STEEL, STEEL_HI, 0.5), far ? 12 : 20)
  if (lod < 2) glow.torus(r * 2 - 0.2, 0.22, at(x, y + 0.06, z), top, tt)
  else glow.cylinder(r * 2 + 0.05, 0.3, at(x, y - 0.05, z), top, tt)
  glow.cylinder(r * 1.9 + 0.1, 0.24 + lod * 0.1, at(x, y - 1.45, z), under, tt)
  // cone em gomos
  const h = r * (1.3 + rnd(i, 2) * 0.4)
  lit.cylinder(r * 0.12, h, at(x, y - 1.4 - h / 2, z, rot), conePaint(h, i), 8, r * 1.85)
  if (!far) {
    for (const f of [0.28, 0.56]) {
      const rr = r * 1.85 * (1 - f) + r * 0.12 * f
      glow.cylinder(rr + 0.12, 0.2, at(x, y - 1.4 - h * f, z), f < 0.4 ? under : AMBER, 8, rr + 0.04)
    }
  }
  // ponta de cristal acesa
  glow.cylinder(0.02, r * 0.9, at(x, y - 1.4 - h - r * 0.4, z, rot), i % 3 === 1 ? AMBER : CYAN, 6, r * 0.2)
  if (!far) glow.sphere(r * 0.12, at(x, y - 1.4 - h - r * 0.85, z), [1, 1, 1], 5)
  // em cima
  const kind = i % 3
  if (kind === 0) {
    const n = far ? 3 : 4 + (i % 3)
    for (let k = 0; k < n; k++) {
      const a = k * 2.1 + i
      const d = r * (0.15 + rnd(i, 10 + k) * 0.55)
      const w = 1.6 + rnd(i, 20 + k) * 1.8
      roofBlock(lit, glow, x + Math.cos(a) * d, y, z + Math.sin(a) * d, w, 4 + rnd(i, 30 + k) * (r * 1.1), a, top, i + k)
    }
  } else if (kind === 1) {
    // cúpula de vidro com nervuras e a coroa acesa
    lit.sphere(r * 1.1, at(x, y, z), (_x, yy) => (yy > r * 0.45 ? [0.5, 0.48, 0.7] : [0.3, 0.28, 0.48]), far ? 7 : 11, 1, 0.9, 1)
    for (let k = 0; k < (far ? 0 : 3); k++) lit.torus(r * 1.1, 0.06, at(x, y, z, (k / 3) * Math.PI, Math.PI / 2), STEEL_HI, 10)
    glow.torus(r * 1.12, 0.14, at(x, y + 0.2, z), top, tt)
    glow.sphere(0.8, at(x, y + r * 0.5, z), AMBER, 6)
    roofBlock(lit, glow, x + r * 0.7, y, z - r * 0.3, 1.6, 6, rot, under, i + 1)
  } else {
    // praça: postes de luz na borda e um obelisco
    for (let k = 0; k < (far ? 4 : 8); k++) {
      const a = (k / (far ? 4 : 8)) * Math.PI * 2 + rot
      lit.cylinder(0.14, 1.6, at(x + Math.cos(a) * r * 0.8, y + 0.8, z + Math.sin(a) * r * 0.8), STEEL_HI, 5)
      glow.sphere(0.36, at(x + Math.cos(a) * r * 0.8, y + 1.7, z + Math.sin(a) * r * 0.8), AMBER, 4)
    }
    lit.cylinder(0.4, r * 1.4, at(x, y + r * 0.7, z, rot), WHITE, 4, 1.4)
    glow.box(0.15, r * 1.1, 0.15, at(x, y + r * 0.7, z), top)
    roofBlock(lit, glow, x - r * 0.35, y, z + r * 0.3, 2.2, 3.5, rot, under, i)
  }
}

/** 2. Torre de pé no vazio: bloco claro com chanfro, fiadas de janelas, faixas de neon, coroa e antena. */
export function orbTower(lit: SoftGeo, glow: SoftGeo, x: number, y0: number, z: number, w: number, h: number, i: number) {
  const neon: RGB = i % 3 === 0 ? MAG : i % 3 === 1 ? CYAN : [0.7, 0.5, 1]
  const rot = rnd(i, 5)
  // corpo em dois andares (o de cima recua) e o pé escuro (sombra de contato com o vazio)
  lit.roundBox(w, h, w, 0.6, at(x, y0 + h / 2, z, rot), (_x, yy) => (yy < -h / 2 + 3 ? mix(WHITE, STEEL, 0.55) : yy > h / 2 - 0.6 ? mix(WHITE, [1, 1, 1], 0.5) : WHITE), 3)
  const h2 = h * 0.28
  lit.roundBox(w * 0.7, h2, w * 0.7, 0.4, at(x, y0 + h + h2 / 2, z, rot), WHITE, 3)
  for (let k = 1; k <= 3; k++) glow.box(w + 0.3, 0.35, w + 0.3, at(x, y0 + (h * k) / 4, z, rot), neon)
  // janelas: fiadas âmbar entre as faixas (uma em cada duas) nas quatro faces
  for (let yy = y0 + 3; yy < y0 + h - 1; yy += 2.4) {
    if (Math.floor((yy - y0) / 2.4) % 3 === 0) continue
    const c = Math.floor((yy - y0) / 2.4) % 3 === 1 ? AMBER : neon
    glow.box(w + 0.04, 0.3, w * 0.62, at(x, yy, z, rot), c)
    glow.box(w * 0.62, 0.3, w + 0.04, at(x, yy, z, rot), c)
  }
  glow.box(w * 0.7 + 0.2, 0.3, w * 0.7 + 0.2, at(x, y0 + h + h2 - 0.3, z, rot), neon)
  lit.cylinder(0.18, 5, at(x, y0 + h + h2 + 2.5, z), STEEL_HI, 5, 0.06)
  glow.sphere(1, at(x, y0 + h + h2 + 5.2, z), neon, 6)
}

/** 3. O arranjo: três camadas (perto, meio, longe) em manchas dos dois lados, de trás da largada ao fim. */
export function orbitalField(lit: SoftGeo, glow: SoftGeo, nk: number, arena = false) {
  // vai até o fim da prova (percurso dobrado) e sobe junto com o chão; a densidade é por metro (`n` só baixa no celular)
  const n = Math.min(1, nk)
  const Z0 = -170
  const Z1 = SPAN_END + 40
  let id = 0
  // 21/11: o muro tecnológico contínuo — duas fileiras (a de trás mais alta), dos dois lados; na arena, em anel
  if (arena) {
    wallRing(36, 8, 0, (sp) => techWall(lit, glow, sp, 8.4, wallH(sp.i, 14)))
    wallRing(50, 10, 0, (sp) => techWall(lit, glow, sp, 10.6, wallH(sp.i + 5, 26), 40, true))
  } else {
    wallRun(34, -60, SPAN_END + 60, 8, deckY, (sp) => techWall(lit, glow, sp, 8, wallH(sp.i)))
    wallRun(48, -60, SPAN_END + 60, 10, deckY, (sp) => techWall(lit, glow, sp, 10, wallH(sp.i + 5, 28), 40, true))
  }
  // perto: ilhas pequenas abaixo e na altura da pista
  for (let z = Z0, k = 0; z < Z1; z += 20 + rnd(k, 1) * 10, k++) {
    if (rnd(k, 2) > 0.85 * n + 0.1) continue
    const s = k % 2 ? 1 : -1
    orbIsland(lit, glow, s * (22 + rnd(k, 3) * 4), deckY(z) - 10 + rnd(k, 4) * 12, z, 4 + rnd(k, 5) * 3, id++, 0)
  }
  // meio
  for (let z = Z0, k = 0; z < Z1; z += 26 + rnd(k, 11) * 14, k++) {
    if (rnd(k, 12) > 0.85 * n + 0.1) continue
    for (const s of [-1, 1]) orbIsland(lit, glow, s * (62 + rnd(k + s, 13) * 40), deckY(z) + 12 + rnd(k + s, 14) * 34, z + s * 8, 7 + rnd(k + s, 15) * 5, id++, 1)
  }
  // longe: grandes, mais altas e mais baixas (enchem o vazio embaixo do horizonte)
  for (let z = Z0 - 60, k = 0; z < Z1 + 80; z += 45 + rnd(k, 21) * 20, k++) {
    if (rnd(k, 22) > 0.85 * n + 0.1) continue
    for (const s of [-1, 1]) orbIsland(lit, glow, s * (110 + rnd(k + s, 23) * 80), 15 + rnd(k + s, 24) * 60, z - s * 12, 12 + rnd(k + s, 25) * 8, id++, 2)
  }
  // torres de pé, em grupos de 2–3
  for (let z = Z0, k = 0; z < Z1; z += 34 + rnd(k, 31) * 16, k++) {
    const s = k % 2 ? 1 : -1
    const cx = s * (60 + rnd(k, 32) * 50)
    const m = 1 + Math.round(rnd(k, 33) * 2 * n)
    for (let j = 0; j < m; j++) {
      const w = 4 + rnd(k, 40 + j) * 6
      orbTower(lit, glow, cx + s * j * (w + 3), deckY(z) - 30 - rnd(k, 50 + j) * 10, z + j * 6 - 6, w, 34 + rnd(k, 60 + j) * 42, k * 3 + j)
    }
  }
}

// ── peças da arena (orbital.webp) ──

/** Borda do disco: aro de aço escuro com a quina clara, filete dourado aceso por cima e lâmpadas âmbar a cada ~2 m. */
export function orbitalRim(g: SoftGeo, glow: SoftGeo, x: number, y: number, z: number, r: number) {
  g.torus(r * 2 + 0.1, 0.62, at(x, y - 0.12, z), (_x, yy, zz) => (yy > 0.16 ? STEEL_HI : yy < -0.12 ? [0.06, 0.05, 0.12] : mix(STEEL, STEEL_HI, Math.abs(Math.sin(Math.atan2(zz, _x) * 24)) * 0.25)), 48)
  glow.torus(r * 2 + 0.22, 0.09, at(x, y + 0.17, z), [1, 0.78, 0.28], 48)
  const n = Math.round((Math.PI * 2 * r) / 2.1)
  for (let k = 0; k < n; k++) {
    const a = (k / n) * Math.PI * 2
    const lx = x + Math.cos(a) * (r + 0.32)
    const lz = z + Math.sin(a) * (r + 0.32)
    g.box(0.34, 0.16, 0.34, at(lx, y + 0.2, lz, -a), [0.08, 0.07, 0.14])
    glow.sphere(0.22, at(lx, y + 0.32, lz), k % 4 === 0 ? MAG : [1, 0.86, 0.5], 5)
  }
}

/** Gema do topo do eixo: hexágono facetado magenta (com luz, para as facetas lerem) e o miolo aceso. */
export function orbitalGem(g: SoftGeo, glow: SoftGeo, x: number, y: number, z: number, r: number) {
  g.cylinder(r * 0.7, r * 0.45, at(x, y + r * 0.22, z), [0.95, 0.25, 0.75], 6, r * 1.4)
  g.cylinder(r * 1.4, r * 0.4, at(x, y + r * 0.65, z), (_x, yy) => (yy > 0.05 ? [1, 0.6, 0.92] : [1, 0.32, 0.82]), 6, r * 0.85)
  glow.cylinder(r * 0.75, 0.05, at(x, y + r * 0.86, z), [1, 0.75, 0.95], 6)
}

// ── muro lateral contínuo (21/11, pedido do Alex: "mais sólido no background, dos lados, sem espaços vazios",
// como os sobrados colados do cais da Cidade) ──
//
// PARTES do muro tecnológico (módulo de 8 m, frente = +z local, olha para a prova)
// 1. corpo: laje de aço que desce até o vazio, faixa clara no alto, sombra no pé · painéis em relevo
// 2. pilastra na emenda: mais clara, salta da face, filete de neon vertical
// 3. faixas de neon e janelas em fiada · 4. coroa: cornija, caixas e antenas alternadas
// 5. torre a cada 4 módulos · 6. a 2ª fileira, mais alta, atrás (sem céu entre as peças)

/** Base de um módulo: posição na borda e o giro que vira a frente (+z local) para a prova. */
export type WallSpot = { m: Matrix; i: number; y: number }

/** Módulos em fila dos dois lados (x = ±X), de z0 a z1, com o chão em `yOf(z)`. */
export function wallRun(X: number, z0: number, z1: number, w: number, yOf: (z: number) => number, put: (s: WallSpot) => void) {
  let i = 0
  for (const sx of [-1, 1]) {
    for (let z = z0; z < z1; z += w, i++) {
      put({ m: at(sx * X, yOf(z), z, sx > 0 ? -Math.PI / 2 : Math.PI / 2), i, y: yOf(z) })
    }
  }
}

/** Módulos em anel de raio R em volta de (0, 0); `skip(a)` deixa um vão (a = 0 aponta para +z). */
export function wallRing(R: number, w: number, y: number, put: (s: WallSpot) => void, skip?: (a: number) => boolean) {
  const n = Math.ceil((Math.PI * 2 * R) / w)
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2
    if (skip?.(a)) continue
    put({ m: at(Math.sin(a) * R, y, Math.cos(a) * R, a + Math.PI), i, y })
  }
}

/** Altura do muro por módulo: em grupos de 3 (a coroa sobe e desce, nunca em escadinha regular). */
export const wallH = (i: number, base = 16) => base + [0, 0, 3, 3, 3, 1, 1, 5, 5, 0, 2, 2][i % 12]

const L = (s: WallSpot, x: number, y: number, z: number, ry = 0) => at(x, y, z, ry).multiply(s.m)

/** O módulo do muro tecnológico: `w` de largura, `H` de altura acima do chão da prova, `deep` até onde desce. */
export function techWall(lit: SoftGeo, glow: SoftGeo, s: WallSpot, w: number, H: number, deep = 40, back = false) {
  const i = s.i
  const neon = i % 3 === 0 ? MAG : CYAN
  const tot = H + deep
  // 1. corpo
  lit.box(w + 0.05, tot, 3, L(s, 0, H - tot / 2, 0), (_x, yy) => (yy > tot / 2 - 1.2 ? STEEL_HI : yy < tot / 2 - H - 2 ? mix(STEEL, [0.03, 0.03, 0.08], 0.6) : STEEL))
  if (!back) {
    // painéis em relevo (dois por módulo, um claro um médio) com a emenda escura
    for (const [px, c] of [[-w / 4, mix(STEEL, STEEL_HI, 0.45)], [w / 4, mix(STEEL, STEEL_HI, 0.25)]] as [number, RGB][]) {
      lit.box(w / 2 - 0.9, H - 4.5, 0.3, L(s, px, (H - 4.5) / 2 + 0.8, 1.6), (_x, yy) => (yy > (H - 4.5) / 2 - 0.2 ? mix(c, WHITE, 0.25) : c))
      // emendas do painel e a luz de status no alto
      for (const f of [0.38, 0.68]) lit.box(w / 2 - 0.9, 0.1, 0.36, L(s, px, 0.8 + (H - 4.5) * f, 1.62), [0.05, 0.05, 0.1])
      glow.box(0.28, 0.28, 0.1, L(s, px + w / 4 - 0.9, H - 4.6, 1.8), (i + (px > 0 ? 1 : 0)) % 3 === 0 ? MAG : CYAN)
      // grade de respiro embaixo do painel
      for (let k = 0; k < 4; k++) lit.box(w / 2 - 1.6, 0.12, 0.2, L(s, px, 1.3 + k * 0.35, 1.8), [0.04, 0.04, 0.08])
    }
  }
  // 2. pilastra na emenda
  lit.box(1.1, tot + 1, 3.8, L(s, -w / 2, H + 0.5 - (tot + 1) / 2, 0.2), (_x, yy) => (yy > (tot + 1) / 2 - 0.6 ? WHITE : mix(STEEL_HI, STEEL, 0.3)))
  glow.box(0.16, H - 1, 0.1, L(s, -w / 2, (H - 1) / 2, 2.12), neon)
  // 3. faixa de neon e janelas
  glow.box(w, 0.32, 0.1, L(s, 0, H - 2, 1.56), neon)
  if (!back) {
    for (let k = 0; k < 5; k++) glow.box(0.7, 0.45, 0.1, L(s, -w / 2 + 1.4 + k * ((w - 2.2) / 4), H - 3.2, 1.82), k % 2 ? AMBER : WHITE)
  } else {
    for (let r = 0; r < 3; r++) glow.box(w - 1.4, 0.3, 0.1, L(s, 0, H * (0.35 + r * 0.2), 1.56), r === 1 ? AMBER : neon)
  }
  // 5. torre a cada 4 módulos (só na 1ª fileira): bloco branco que sobe do muro com faixas, janelas e coroa
  if (!back && i % 4 === 2) {
    const th = H + 12 + (i % 8 === 2 ? 8 : 0)
    lit.box(5, th + deep, 5, L(s, 0.6, th - (th + deep) / 2, -0.6), (_x, yy) => (yy > (th + deep) / 2 - 0.5 ? [1, 1, 1] : yy < (th + deep) / 2 - th ? STEEL : WHITE))
    for (let k = 1; k <= 3; k++) glow.box(5.2, 0.35, 5.2, L(s, 0.6, H + (k * (th - H)) / 4, -0.6), neon)
    for (let yy = H + 1.6; yy < th - 1; yy += 2.2) glow.box(3.6, 0.3, 5.06, L(s, 0.6, yy, -0.6), AMBER)
    lit.box(3.4, 2.4, 3.4, L(s, 0.6, th + 1.2, -0.6), WHITE)
    glow.box(3.5, 0.25, 3.5, L(s, 0.6, th + 2.2, -0.6), neon)
    lit.box(0.2, 5, 0.2, L(s, 0.6, th + 4.9, -0.6), STEEL_HI)
    glow.box(0.7, 0.7, 0.7, L(s, 0.6, th + 7.5, -0.6), MAG)
  }
  // 4. coroa
  lit.box(w + 0.3, 0.6, 3.6, L(s, 0, H + 0.3, 0), STEEL_HI)
  if (i % 2 === 0) {
    lit.box(w * 0.4, 1.6, 2.2, L(s, w * 0.15, H + 1.4, -0.2), mix(STEEL, STEEL_HI, 0.4))
    glow.box(w * 0.4 + 0.05, 0.2, 2.25, L(s, w * 0.15, H + 1.9, -0.2), neon)
  } else {
    lit.box(0.2, 4, 0.2, L(s, -w * 0.2, H + 2.6, 0), STEEL_HI)
    glow.box(0.5, 0.5, 0.5, L(s, -w * 0.2, H + 4.8, 0), i % 4 === 1 ? MAG : AMBER)
  }
}
