// FATIA DE TESTE da skill `meu-mundo-cenario-codigo` (Fable, 2026-11-11). Ref: ref/vale-outono.png
// (a imagem é só referência de CLIMA: paleta, tipos de elemento e proporções — o traçado é nosso).
//
// FICHA DO AMBIENTE
// Clima:       vale de arenito vermelho em faixas, capim amarelado, árvores de outono (amarelo e
//              laranja), rio azul-claro, céu azul com névoa clara; alegre e saturado.
// Camadas:     (1) chão: capim em manchas + trilha de terra clara + terra vermelha ao pé da rocha;
//              (2) relevo: mesas em andares, com faixa clara fina entre faixas vermelhas grossas e
//              capim no platô; (3) água: rio com margem de areia; (4) vegetação: árvores em
//              bosques, arbustos ao pé das mesas, tufos de capim; (5) pedras soltas;
//              (6) pano de fundo: mesas grandes e simples além da área.
// Proporções:  personagem 1,7 m; árvore 4–6 m (2,5–3,5 personagens); mesa 6–16 m; trilha 3,2 m;
//              rio 7 m; cobertura ≈ 55% capim, 15% rocha, 15% copa, 8% trilha, 7% água.
// Paleta:      ver as constantes abaixo (lidas da imagem).
// Fora:        construções, personagem, interface, torre e cidade ao fundo (não são do nosso jogo).
// Área:        64 × 64 m = 4 blocos de 32 m (a fatia de teste); caminho de andar plano em diagonal.

import { noise, type RGB } from "../kit"
import { Cena, distPath, ground, river, scatter, smooth, type XZ } from "../kit-cena"
import { bush, buttresses, mesa, mix, mul, rock, strata, tree, tuft, type Foliage, type MesaOut } from "../kit-natureza"

export const meta = {
  ceu: [0.56, 0.74, 0.93] as RGB,
  nevoa: [0.72, 0.82, 0.93] as RGB,
  /** Orçamento da fatia (4 blocos): ≤ 3,5 mil por bloco perto, em média, + fundo. */
  area: [64, 64] as const,
}

// ── paleta ──
const GRASS: RGB = [0.56, 0.6, 0.2]
const GRASS_DRY: RGB = [0.72, 0.66, 0.26]
const GRASS_DK: RGB = [0.36, 0.46, 0.15]
const DIRT: RGB = [0.78, 0.64, 0.44]
const SOIL_RED: RGB = [0.62, 0.3, 0.18]
const SAND: RGB = [0.82, 0.72, 0.5]
const ROCK_RED: RGB = [0.66, 0.22, 0.14]
const ROCK_DK: RGB = [0.5, 0.15, 0.1]
const ROCK_OR: RGB = [0.76, 0.34, 0.17]
const ROCK_CREAM: RGB = [0.9, 0.7, 0.5]
const WATER_DEEP: RGB = [0.2, 0.5, 0.72]
const WATER_SH: RGB = [0.42, 0.72, 0.84]
const FOAM: RGB = [0.86, 0.94, 0.96]
const LEAF_Y: Foliage = { dark: [0.62, 0.38, 0.05], mid: [0.92, 0.66, 0.1], hi: [1, 0.86, 0.3] }
const LEAF_O: Foliage = { dark: [0.52, 0.17, 0.04], mid: [0.86, 0.36, 0.07], hi: [0.98, 0.56, 0.16] }
const LEAF_G: Foliage = { dark: [0.2, 0.32, 0.1], mid: [0.4, 0.52, 0.16], hi: [0.6, 0.68, 0.24] }
const BUSH: Foliage = { dark: [0.3, 0.36, 0.1], mid: [0.55, 0.56, 0.16], hi: [0.76, 0.72, 0.26] }

/** Arenito: vermelho grosso, creme fino, laranja, vermelho escuro (a faixa clara fina é a assinatura). */
const BANDS: [RGB, number][] = [[ROCK_RED, 1.7], [ROCK_CREAM, 0.28], [ROCK_OR, 1.1], [ROCK_DK, 0.9], [ROCK_RED, 1.5], [ROCK_CREAM, 0.22], [ROCK_OR, 1.3], [ROCK_DK, 0.7]]

const TRILHA: XZ[] = [[-28, -29], [-12, -14], [0, -2], [7, 12], [13, 22], [27, 29]]
const RIO: XZ[] = [[31.5, -31.5], [24, -18], [22, -4], [26, 8], [31.5, 15]]
const RIO_W = 7

export function montar(lod = 0): Cena {
  const c = new Cena("fatia-outono", lod)
  c.walk.push(TRILHA)
  // pontos do jogo (cena de Domínio: entrada, saida, chefe + uma zona por setor — cenario.md §9)
  c.ponto("entrada", TRILHA[0][0], TRILHA[0][1])
  c.ponto("saida", TRILHA[TRILHA.length - 1][0], TRILHA[TRILHA.length - 1][1])
  c.zona(1, [[-30, -30], [-6, -30], [6, -4], [-4, 4], [-30, -8]])
  const st = strata(BANDS, 26, 1)
  const A = 32

  // ── relevo (antes do chão: o chão pinta a terra vermelha ao pé das mesas) ──
  const mesas: MesaOut[] = []
  const addMesa = (o: Parameters<typeof mesa>[1], solid = true) => {
    const m = mesa(c.geo(o.x, o.z), { ...o, lod, grass: GRASS_DRY })
    if (solid) {
      c.blockOval(o.x, o.z, o.rx * 1.08, o.rz * 1.08, o.h)
      mesas.push(m)
    }
    return m
  }
  const big = addMesa({ x: -19, z: 10, rx: 10.5, rz: 13, h: 9, strata: st, seed: 1 })
  addMesa({ x: -12, z: 21, rx: 6, rz: 5, h: 6, strata: st, seed: 12 }) // maciço = mesas que se cruzam
  const tier = addMesa({ x: -21, z: 12, rx: 6, rz: 7.5, h: 5, y0: big.topY, strata: st, seed: 2, flare: 0.06 }, false)
  const mid = addMesa({ x: 8, z: -23, rx: 7.5, rz: 5.5, h: 6, strata: st, seed: 3 })
  addMesa({ x: -3.5, z: 14, rx: 2.6, rz: 2.1, h: 2.4, strata: st, seed: 4, seg: 12 })
  if (!lod) {
    buttresses(c.geo(big.x, big.z), big, 9, st, 31)
    buttresses(c.geo(mid.x, mid.z), mid, 6, st, 47)
  }
  // pano de fundo: mesas grandes e simples além da área (sem colisão)
  for (const [x, z, rx, rz, h, s] of [[-25, 78, 26, 14, 20, 5], [52, 66, 18, 15, 15, 6], [84, -6, 15, 24, 18, 7], [-78, -30, 16, 22, 17, 8], [10, -80, 30, 13, 14, 9]] as const)
  {
    mesa(c.fundo, { x, z, rx, rz, h, strata: st, seed: s, lod: 1, grass: GRASS_DRY })
    // segundo andar menor e deslocado: a silhueta do horizonte não pode ser uma caixa
    mesa(c.fundo, { x: x + rx * 0.25, z: z - rz * 0.1, rx: rx * 0.5, rz: rz * 0.55, h: h * 0.45, y0: h, strata: st, seed: s + 20, lod: 1, flare: 0.05, grass: GRASS_DRY })
  }

  // ── máscaras do chão ──
  const dTrilha = (x: number, z: number) => distPath(x, z, TRILHA)
  const dRio = (x: number, z: number) => distPath(x, z, RIO)
  const footOf = (x: number, z: number) => mesas.some((m) => m.inside(x, z, 1.28))
  const inMesa = (x: number, z: number, k = 1.12) => mesas.some((m) => m.inside(x, z, k))
  const height = (x: number, z: number) => -0.75 * smooth(RIO_W / 2 + 2.5, RIO_W / 2 - 0.5, dRio(x, z)) // a margem desce para a água
  const color = (x: number, z: number): RGB => {
    const patch = noise(x * 0.11 + 5, 0.3, z * 0.11)
    let col = mix(GRASS, GRASS_DRY, smooth(0.35, 0.7, patch))
    col = mix(col, GRASS_DK, smooth(0.62, 0.8, noise(x * 0.23, 7.7, z * 0.23)) * 0.6)
    if (footOf(x, z)) col = mix(col, SOIL_RED, 0.75)
    const wob = 0.5 * (noise(x * 0.5, 1.1, z * 0.5) - 0.5)
    col = mix(col, DIRT, smooth(2.6, 1.3, dTrilha(x, z) + wob)) // trilha de borda irregular
    col = mix(col, SAND, smooth(RIO_W / 2 + 3, RIO_W / 2 + 0.8, dRio(x, z)))
    return mul(col, 0.94 + 0.12 * noise(x * 0.9, 2.2, z * 0.9))
  }
  ground(c, { x0: -A, z0: -A, x1: A, z1: A, step: lod ? 4 : 2, color, height })
  // saia além da área (pano de fundo), 5 cm abaixo
  ground(c, { x0: -128, z0: -128, x1: 128, z1: 128, step: 32, color: (x, z) => mul(mix(GRASS, GRASS_DRY, noise(x * 0.03, 1, z * 0.03)), 0.95), fundo: true, y: -0.05, hole: [-A, -A, A, A] })

  // ── água ──
  river(c, RIO, RIO_W, { y: -0.45, deep: WATER_DEEP, shallow: WATER_SH, foam: FOAM })

  // ── vegetação e pedras (regra: nada na trilha, no rio ou dentro da rocha) ──
  const free = (x: number, z: number, pad: number) => dTrilha(x, z) > 2.2 + pad && dRio(x, z) > RIO_W / 2 + 1 + pad && !inMesa(x, z)
  // árvores em BOSQUES (máscara de ruído), 3 espécies, tamanho variado
  scatter(-A, -A, A, A, 5, 11, (x, z, r) => {
    if (!free(x, z, 0.8) || noise(x * 0.07 + 3, 5.5, z * 0.07) < 0.42) return
    const kind = r(1) < 0.58 ? LEAF_Y : r(1) < 0.9 ? LEAF_O : LEAF_G
    const h = 4 + r(2) * 2.4
    tree(c.geo(x, z), [x, 0, z], { h, r: h * (0.3 + 0.08 * r(3)), leaf: kind, seed: r(4) * 99, lod })
    c.block(x, z, 0.3, 0.3, 3)
  })
  // árvores nos platôs
  for (const [m, pts] of [[big, [[-0.9, -0.9], [0.9, 0.8], [1.2, -0.3]]], [tier, [[0.3, 0.2], [-0.6, -0.7]]], [mid, [[-0.6, 0.2], [0.7, -0.3]]]] as const)
    pts.forEach(([u, v], k) => {
      const p = m.top(u, v)
      tree(c.geo(m.x, m.z), p, { h: 3.6 + k * 0.5, r: 1.3 + k * 0.15, leaf: k % 2 ? LEAF_O : LEAF_Y, seed: m.x + k * 7, lod })
    })
  // arbustos: ao pé das mesas e nas bordas dos bosques
  scatter(-A, -A, A, A, 3.2, 23, (x, z, r) => {
    if (!free(x, z, 0.2)) return
    const near = footOf(x, z) || noise(x * 0.07 + 3, 5.5, z * 0.07) > 0.36
    if (!near || r(1) < 0.55) return
    bush(c.geo(x, z), [x, 0, z], 0.4 + r(2) * 0.45, r(3) < 0.75 ? BUSH : r(3) < 0.9 ? LEAF_G : LEAF_O, r(4) * 99, lod)
  })
  // pedras: ao pé das mesas e na margem
  scatter(-A, -A, A, A, 4, 37, (x, z, r) => {
    const bank = dRio(x, z) > RIO_W / 2 + 0.6 && dRio(x, z) < RIO_W / 2 + 3
    if (!(footOf(x, z) || bank) || !free(x, z, 0) && !bank || inMesa(x, z) || dTrilha(x, z) < 2.6 || r(1) < 0.5) return
    const s = 0.35 + r(2) * 0.8
    rock(c.geo(x, z), [x, height(x, z), z], s, st, r(3) * 99)
    if (s > 0.7) c.block(x, z, s * 0.6, s * 0.6, 1)
  })
  // tufos de capim (só perto): mais densos na beira da trilha
  if (!lod)
    scatter(-A, -A, A, A, 2.4, 51, (x, z, r) => {
      if (dTrilha(x, z) < 1.7 || dRio(x, z) < RIO_W / 2 + 0.8 || inMesa(x, z, 1.02)) return
      const edge = dTrilha(x, z) < 4
      if (r(1) > (edge ? 0.75 : 0.4)) return
      tuft(c.geo(x, z), [x, height(x, z), z], 5, 0.3 + r(2) * 0.3, r(3) * 99, GRASS_DK, mix(GRASS_DRY, [1, 0.9, 0.4], 0.4))
    })

  return c
}
