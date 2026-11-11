// FATIA DE TESTE de CIDADE da skill `meu-mundo-cenario-codigo` (Fable, 2026-11-11). Ref: ref/cidade-clara.png
// (a imagem é de outro jogo: dela só o CLIMA — cidade clara de dia, torres de vidro azul, outdoors
// acesos, um prédio curvo como marco, faixa de pedestre larga. O traçado, os prédios e os desenhos
// dos outdoors são nossos; nada de personagem, marca ou letreiro de lá.)
//
// FICHA DO AMBIENTE
// Clima:       centro de cidade moderna ao meio-dia, céu azul forte, tudo limpo e saturado.
// Camadas:     (1) chão: asfalto escuro, calçada clara em placas, guia, faixas e linhas pintadas;
//              (2) construção: torres de vidro de 30–50 m com térreo de loja (toldo colorido,
//              letreiro aceso) e coroa (laje, máquinas, antena, recuo); (3) marco: rotunda de
//              treliça branca com telão; (4) luz acesa: outdoors, letreiros, semáforo, luminárias;
//              (5) rua: postes, semáforos, pilaretes, canteiros com árvore; (6) fundo: linha de
//              prédios simples na névoa.
// Proporções:  personagem 1,7 m; andar 3,4 m (2 personagens); térreo de loja 5 m; avenida 14 m;
//              calçada 4,5 m; torre = 9–14 andares; outdoor 10 × 6 m.
// Cobertura:   (do alto) 45% telhado, 30% asfalto, 20% calçada, 5% verde.
// Marcos:      a rotunda com o telão (esquina nordeste) e a torre alta atrás dela.
// Fora:        personagens e marcas dos outdoors, carros, ônibus, nuvens, interiores das lojas.
// Área:        64 × 64 m = 4 blocos; caminho: calçada sul → faixa → calçada norte → faixa → leste.
//
// MAPA (1 letra = 8 m)        T = torre   R = rotunda   c = calçada   = avenida   | rua
//   T T T c | c R R R
//   T T T c | c R R R
//   T T T c | c R R R
//   c c c c | c c c c
//   = = = = + = = = =
//   c c c c | c c c c
//   T T T c | c T T T
//   T T T c | c T T T

import { noise, TAU, type RGB, type V3 } from "../kit"
import { Cena, ground, type XZ } from "../kit-cena"
import { face, mix, mul, tree, type Foliage } from "../kit-natureza"
import { canteiro, faixa, outdoor, pilarete, poste, rect, semaforo, torre, tracejado, type Glass } from "../kit-cidade"

export const meta = {
  ceu: [0.33, 0.6, 0.95] as RGB,
  nevoa: [0.74, 0.85, 0.97] as RGB,
  area: [64, 64] as const,
}

// ── paleta ──
const ASPHALT: RGB = [0.2, 0.21, 0.25]
const WALK: RGB = [0.66, 0.67, 0.7]
const CURB: RGB = [0.8, 0.8, 0.82]
const LINE: RGB = [0.92, 0.92, 0.92]
const YELLOW: RGB = [0.95, 0.75, 0.15]
const GLASS_BLUE: Glass = { lo: [0.12, 0.28, 0.5], hi: [0.5, 0.78, 1] }
const GLASS_TEAL: Glass = { lo: [0.1, 0.32, 0.4], hi: [0.5, 0.86, 0.9] }
const GLASS_WARM: Glass = { lo: [0.22, 0.26, 0.4], hi: [0.72, 0.8, 0.96] }
const WALL_GREY: RGB = [0.3, 0.33, 0.4]
const WALL_SAND: RGB = [0.7, 0.62, 0.52]
const WALL_WHITE: RGB = [0.8, 0.82, 0.86]
const LEAF: Foliage = { dark: [0.14, 0.34, 0.14], mid: [0.3, 0.56, 0.2], hi: [0.56, 0.78, 0.3] }
const PINK: RGB = [1, 0.3, 0.6], PURPLE: RGB = [0.45, 0.2, 0.9], CYAN: RGB = [0.2, 0.9, 1], ORANGE: RGB = [1, 0.55, 0.1], BLUE: RGB = [0.15, 0.35, 1]
const YEL: RGB = [1, 0.85, 0.2]

const AV = 7 // meia-largura da avenida (ao longo de x)
const ST = 6 // meia-largura da rua (ao longo de z)
const SW = 4.5 // calçada
const CAMINHO: XZ[] = [[-30, -9.2], [-8.2, -9.2], [-8.2, 9.2], [30, 9.2]]

/** Rotunda: tambor de treliça branca (painéis em xadrez), frente de vidro com telão curvo aceso e marquise. */
function rotunda(c: Cena, x: number, z: number, R: number, h: number, front: number, lod: number) {
  const g = c.geo(x, z), G = c.glow(x, z)
  const n = lod ? 16 : 28, rows = lod ? 2 : 4
  const y0 = 3.8
  const P = (k: number, y: number, extra = 0): V3 => {
    const th = (k / n) * TAU
    const r = R * (1 + 0.05 * Math.sin((Math.PI * y) / h)) + extra
    return [x + Math.cos(th) * r, y, z + Math.sin(th) * r]
  }
  const dAng = (k: number) => {
    const d = ((((k + 0.5) / n) * TAU - front + Math.PI * 3) % TAU) - Math.PI
    return Math.abs(d)
  }
  for (let k = 0; k < n; k++) {
    const th = ((k + 0.5) / n) * TAU
    const out: V3 = [Math.cos(th), 0, Math.sin(th)]
    const isFront = dAng(k) < 0.95
    // térreo: vitrine escura
    face(g, [P(k, 0), P(k + 1, 0), P(k + 1, y0), P(k, y0)], [mul(WALL_WHITE, 0.6), mul(WALL_WHITE, 0.6), mul(WALL_WHITE, 0.85), mul(WALL_WHITE, 0.85)], out)
    if (!lod && k % 3 !== 0) {
      // vitrine acesa entre pilares, com silhueta escura na frente
      const warm = k % 2 === 0
      const lo: RGB = warm ? [0.85, 0.6, 0.32] : [0.45, 0.7, 0.85], hi: RGB = warm ? [1, 0.93, 0.72] : [0.85, 0.97, 1]
      face(G, [P(k + 0.08, 0.45, 0.05), P(k + 0.92, 0.45, 0.05), P(k + 0.92, y0 - 0.5, 0.05), P(k + 0.08, y0 - 0.5, 0.05)], [lo, lo, hi, hi], out)
      face(g, [P(k + 0.25, 0.45, 0.09), P(k + 0.6, 0.45, 0.09), P(k + 0.6, 1.9, 0.09), P(k + 0.25, 1.9, 0.09)], warm ? [0.28, 0.15, 0.08] : [0.1, 0.2, 0.3], out)
    }
    for (let j = 0; j < rows; j++) {
      const ya = y0 + ((h - y0) * j) / rows, yb = y0 + ((h - y0) * (j + 1)) / rows
      const up = j / rows
      const col: RGB[] = isFront
        ? [mix(GLASS_BLUE.lo, GLASS_BLUE.hi, up * 0.5), mix(GLASS_BLUE.lo, GLASS_BLUE.hi, up * 0.5), mix(GLASS_BLUE.lo, GLASS_BLUE.hi, 0.4 + up * 0.6), mix(GLASS_BLUE.lo, GLASS_BLUE.hi, 0.4 + up * 0.6)]
        : (k + j) % 2 ? [mul(WALL_WHITE, 0.92), mul(WALL_WHITE, 0.92), WALL_WHITE, WALL_WHITE] : [[0.5, 0.56, 0.66], [0.5, 0.56, 0.66], [0.62, 0.68, 0.78], [0.62, 0.68, 0.78]]
      face(g, [P(k, ya), P(k + 1, ya), P(k + 1, yb), P(k, yb)], col, out)
    }
    // aro branco de cima e a laje
    face(g, [P(k, h, 0.35), P(k + 1, h, 0.35), P(k + 1, h + 0.9, 0.35), P(k, h + 0.9, 0.35)], WALL_WHITE, out)
    face(g, [P(k, h + 0.9, 0.35), P(k + 1, h + 0.9, 0.35), [x, h + 1.5, z]], [0.55, 0.58, 0.62], [0, 1, 0])
    // marquise na frente (em cima e embaixo)
    if (dAng(k) < 0.75 && !lod) {
      face(g, [P(k, y0), P(k + 1, y0), P(k + 1, y0, 2.4), P(k, y0, 2.4)], WALL_WHITE, [0, 1, 0])
      face(g, [P(k, y0 - 0.25), P(k + 1, y0 - 0.25), P(k + 1, y0 - 0.25, 2.4), P(k, y0 - 0.25, 2.4)], mul(WALL_WHITE, 0.5), [0, -1, 0])
      face(g, [P(k, y0 - 0.25, 2.4), P(k + 1, y0 - 0.25, 2.4), P(k + 1, y0, 2.4), P(k, y0, 2.4)], mul(CYAN, 0.9), out)
    }
    // telão curvo aceso: degradê rosa → roxo, com uma coluna clara que "corre"
    if (dAng(k) < 0.5) {
      const hot = dAng(k) < 0.12
      const a: RGB = hot ? [1, 0.95, 1] : mix(PINK, CYAN, (k % 5) / 5)
      face(G, [P(k, 5.2, 0.18), P(k + 1, 5.2, 0.18), P(k + 1, h - 1.6, 0.18), P(k, h - 1.6, 0.18)], [PURPLE, PURPLE, a, a], out)
    }
  }
  c.blockOval(x, z, R * 0.96, R * 0.96, h)
}

export function montar(lod = 0): Cena {
  const c = new Cena("fatia-cidade", lod)
  c.walk.push(CAMINHO)
  const A = 32

  // ── chão: asfalto (com manchas) + calçadas, guias e pintura por cima ──
  ground(c, { x0: -A, z0: -A, x1: A, z1: A, step: lod ? 8 : 4, color: (x, z) => mul(ASPHALT, 0.88 + 0.24 * noise(x * 0.12, 1.3, z * 0.12)) })
  ground(c, { x0: -112, z0: -112, x1: 112, z1: 112, step: 16, color: (x, z) => mul(mix(ASPHALT, WALK, 0.35), 0.9 + 0.2 * noise(x * 0.05, 2, z * 0.05)), fundo: true, y: -0.05, hole: [-A, -A, A, A] })
  for (const sx of [-1, 1])
    for (const sz of [-1, 1]) {
      const x0 = sx < 0 ? -A : ST, x1 = sx < 0 ? -ST : A, z0 = sz < 0 ? -A : AV, z1 = sz < 0 ? -AV : A
      const g = c.geo((x0 + x1) / 2, (z0 + z1) / 2)
      // quadra: calçada em placas de 3 m (tom alternado) nas duas faixas que dão para a rua
      const tile = lod ? 30 : 3
      for (let x = x0; x < x1 - 0.01; x += tile) {
        const za = sz < 0 ? -AV - SW : AV, zb = sz < 0 ? -AV : AV + SW
        rect(g, x, za, Math.min(x1, x + tile), zb, 0.02, mul(WALK, 0.94 + 0.1 * ((Math.round(x / tile) & 1) ? 1 : 0)))
      }
      for (let zq = z0; zq < z1 - 0.01; zq += tile) {
        const xa = sx < 0 ? -ST - SW : ST, xb = sx < 0 ? -ST : ST + SW
        const za = sz < 0 ? zq : Math.max(zq, AV + SW), zb = sz < 0 ? Math.min(zq + tile, -AV - SW) : Math.min(z1, zq + tile)
        if (zb > za) rect(g, xa, za, xb, zb, 0.02, mul(WALK, 0.94 + 0.1 * ((Math.round(zq / tile) & 1) ? 1 : 0)))
      }
      // miolo da quadra (sob os prédios) e a guia clara na borda da pista
      rect(g, sx < 0 ? x0 : ST + SW, sz < 0 ? z0 : AV + SW, sx < 0 ? -ST - SW : x1, sz < 0 ? -AV - SW : z1, 0.02, mul(WALK, 0.86))
      rect(g, x0, sz < 0 ? -AV - 0.3 : AV, x1, sz < 0 ? -AV : AV + 0.3, 0.035, CURB)
      rect(g, sx < 0 ? -ST - 0.3 : ST, z0, sx < 0 ? -ST : ST + 0.3, z1, 0.035, CURB)
    }
  // pintura: eixo amarelo duplo, tracejado das pistas, quatro faixas de pedestre e linhas de retenção
  for (const [xa, xb] of [[-A, -ST - 5], [ST + 5, A]] as const) {
    const g = c.geo((xa + xb) / 2, 0.5)
    for (const zc of [-0.22, 0.22]) rect(g, xa, zc - 0.07, xb, zc + 0.07, 0.03, YELLOW)
    if (!lod) for (const zc of [-3.6, 3.6]) tracejado(c.geo((xa + xb) / 2, zc), xa, zc, xb, zc, LINE)
  }
  for (const [za, zb] of [[-A, -AV - 5], [AV + 5, A]] as const) rect(c.geo(0.5, (za + zb) / 2), -0.08, za, 0.08, zb, 0.03, LINE)
  for (const sx of [-1, 1]) {
    const xa = sx < 0 ? -ST - 4.2 : ST + 0.6
    faixa(c.geo(xa + 1, 0.5), xa, -AV + 0.3, xa + 3.6, AV - 0.3, false)
  }
  for (const sz of [-1, 1]) {
    const za = sz < 0 ? -AV - 4.2 : AV + 0.6
    faixa(c.geo(0.5, za + 1), -ST + 0.3, za, ST - 0.3, za + 3.6, true)
  }

  // ── construções ──
  const billboard = (t: ReturnType<typeof torre>, s: number, tt: number, y: number, w: number, h: number, cols: readonly [RGB, RGB, RGB], seed: number) => {
    const { p, ang } = t.onSide(s, tt, y, 0.25)
    outdoor(c.geo(t.F.x, t.F.z), c.glow(t.F.x, t.F.z), { p, ang, w, h, cols, seed })
  }
  // sudoeste: a torre azul alta, com loja de toldo verde e o outdoor grande virado para a avenida
  const tA = torre(c.geo(-21.5, -22), c.glow(-21.5, -22), { x: -21.5, z: -22, w: 19, d: 19, h: 46, glass: GLASS_BLUE, wall: WALL_GREY, seed: 1, lod, podium: { h: 5, color: [0.42, 0.44, 0.5], awning: [0.2, 0.75, 0.3], sign: [1, 0.85, 0.2], frentes: [2, 1] }, crown: "antena" })
  c.block(-21.5, -22, 9.8, 9.8, 46)
  billboard(tA, 2, 0.5, 20, 11, 6.5, [PINK, PURPLE, CYAN], 3)
  billboard(tA, 1, 0.5, 30, 6, 9, [CYAN, BLUE, YEL], 4)
  // sudeste: prédio de areia em recuo, toldo vermelho
  const tB = torre(c.geo(21.5, -22), c.glow(21.5, -22), { x: 21.5, z: -22, w: 17, d: 18, h: 28, glass: GLASS_TEAL, wall: WALL_SAND, seed: 2, lod, podium: { h: 5, color: [0.62, 0.54, 0.46], awning: [0.85, 0.2, 0.2], sign: [1, 0.9, 0.5], frentes: [2, 3] }, crown: "recuo" })
  c.block(21.5, -22, 8.8, 9.3, 28)
  billboard(tB, 3, 0.5, 15, 5, 8, [ORANGE, PINK, [1, 1, 1]], 5)
  // noroeste: torre clara com outdoor de telhado virado para o cruzamento
  const tD = torre(c.geo(-21.5, 22), c.glow(-21.5, 22), { x: -21.5, z: 22, w: 18, d: 18, h: 36, glass: GLASS_WARM, wall: WALL_WHITE, seed: 3, lod, podium: { h: 5, color: [0.55, 0.57, 0.63], awning: [0.15, 0.45, 0.95], sign: [0.3, 1, 0.9], frentes: [0, 1] } })
  c.block(-21.5, 22, 9.3, 9.3, 36)
  outdoor(c.geo(-21.5, 22), c.glow(-21.5, 22), { p: [-16.5, 36 + 0.45 + 5.2, 17], ang: -Math.PI / 4, w: 10, h: 5.5, cols: [BLUE, CYAN, PINK], seed: 6, legs: 2.2 })
  // nordeste: o MARCO — rotunda com telão, e a torre mais alta atravessando o telhado dela
  rotunda(c, 20.5, 21.5, 11, 13, Math.atan2(-1, -1), lod)
  torre(c.geo(20.5, 21.5), c.glow(20.5, 21.5), { x: 25, z: 25.5, w: 10, d: 10, h: 56, glass: GLASS_BLUE, wall: [0.24, 0.27, 0.36], seed: 4, lod, crown: "antena", lit: 0.04 })

  // ── rua: postes, semáforos, pilaretes, canteiros (longe: nada disso) ──
  if (!lod) {
    for (const x of [-28, -16, 14, 26]) {
      poste(c.geo(x, -AV - 1), c.glow(x, -AV - 1), [x, 0, -AV - 0.7], Math.PI / 2)
      c.block(x, -AV - 0.7, 0.15, 0.15, 6)
      poste(c.geo(x + 5, AV + 1), c.glow(x + 5, AV + 1), [x + 5, 0, AV + 0.7], -Math.PI / 2)
      c.block(x + 5, AV + 0.7, 0.15, 0.15, 6)
    }
    semaforo(c.geo(-ST - 0.6, -AV - 0.6), c.glow(-ST - 0.6, -AV - 0.6), [-ST - 0.6, 0, -AV - 0.6], Math.PI / 2, 1)
    c.block(-ST - 0.6, -AV - 0.6, 0.15, 0.15, 5)
    semaforo(c.geo(ST + 0.6, AV + 0.6), c.glow(ST + 0.6, AV + 0.6), [ST + 0.6, 0, AV + 0.6], -Math.PI / 2, 2)
    c.block(ST + 0.6, AV + 0.6, 0.15, 0.15, 5)
    for (const [x, z] of [[-ST - 0.7, AV + 0.7], [ST + 0.7, -AV - 0.7], [-ST - 2.2, AV + 0.7], [ST + 2.2, -AV - 0.7]] as const) pilarete(c.geo(x, z), [x, 0, z])
  }
  // árvores em canteiro onde o caminho não passa (calçada norte do lado oeste, sul do lado leste)
  for (const [x, z, s] of [[-26, AV + 1.6, 1], [-18, AV + 1.6, 2], [-11.5, AV + 1.6, 3], [11.5, -AV - 1.6, 4], [19, -AV - 1.6, 5], [27, -AV - 1.6, 6]] as const) {
    canteiro(c.geo(x, z), x, z)
    tree(c.geo(x, z), [x, 0.4, z], { h: 4.6 + (s % 3) * 0.5, r: 1.5, leaf: LEAF, bark: [0.4, 0.3, 0.22], seed: s * 7.3, lod })
    c.block(x, z, 0.95, 0.95, 3)
  }

  // ── pano de fundo: linha de prédios simples na névoa (alturas bem diferentes: o horizonte é uma silhueta) ──
  for (let k = 0; k < 14; k++) {
    const th = (k / 14) * TAU + 0.2 * Math.sin(k * 3.3)
    const dist = 52 + 34 * (0.5 + 0.5 * Math.sin(k * 1.9))
    const hh = 26 + 60 * (0.5 + 0.5 * Math.sin(k * 2.7 + 1))
    const gl = k % 3 === 0 ? GLASS_TEAL : k % 3 === 1 ? GLASS_BLUE : GLASS_WARM
    torre(c.fundo, null, { x: Math.cos(th) * dist, z: Math.sin(th) * dist, w: 13 + (k % 4) * 3, d: 12 + (k % 3) * 4, h: hh, rot: th, glass: gl, wall: k % 2 ? WALL_GREY : WALL_WHITE, seed: 40 + k, lod: 1, floor: 6.8, crown: k % 5 === 0 ? "recuo" : "laje" })
  }
  return c
}
