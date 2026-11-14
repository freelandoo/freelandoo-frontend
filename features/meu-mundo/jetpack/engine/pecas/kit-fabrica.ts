// features/meu-mundo/jetpack/engine/pecas/kit-fabrica.ts — TÚNEL INDUSTRIAL em código (troca o tema `temas/fabrica/v2`).
//
// FICHA (cenário, pela referência "Voo Steampunk pelo Túnel Industrial" e pelo Domínio da Fábrica de Bronze)
// Clima:     galpão steampunk enorme em névoa azulada; ferro escuro, cobre e bronze, luz âmbar.
// Camadas:   passarela de grade (já em código, factory-env) → pistões de vidro aceso e canos de cobre nas
//            beiras → caldeira, tanque, esteira, painel, empilhadeira, prensa e relógio nos pátios → engrenagens
//            e turbinas girando nas paredes → vigas de alerta e guindastes pendurados lá em cima.
// Paleta:    ferro roxo-escuro 0,34/0,31/0,40 (sombra 0,20) e aço; cobre 0,74/0,42/0,24 e bronze 0,94/0,62/0,22
//            nas quinas (20%); luz âmbar 1/0,76/0,2, vermelho de alerta, listra amarela e preta (10%).
// Peças:     reaproveitadas do Domínio (`pecas/fabrica.ts`: engrenagemCopia, cano, tanqueCaldeira, esteiraCopia,
//            lampadaHex); novas aqui: viga de alerta, pistão, guindaste, turbina, cabeça de prensa, relógio,
//            empilhadeira, tanque, painel de controle.
// Fora:      nada (não há bicho no Túnel Industrial).
// Medidas:   as do tema antigo (fabrica-tema2.json, medidas pela caixa no jogo): 1 m de altura, origem e largura
//            iguais (`encaixa`). Os giradores (engrenagem, turbina) giram em torno de x, no plano y–z.

import { TAU, type RGB, type V3 } from "../../../engine/cena-codigo/kit"
import { face, mix } from "../../../engine/cena-codigo/kit-natureza"
import { engrenagemCopia, cano, tanqueCaldeira, esteiraCopia, FERRO, FERRO_CL, FERRO_ESC, COBRE, COBRE_CL, OURO, OURO_CL, AMB, AMB_CL, TIJ, TIJ_ESC } from "../../../engine/cena-codigo/pecas/fabrica"
import { caixa, cil, GALAO, GALAO_LUZ, galaoVoo, engrenagemVoo, type PalObst } from "./comuns"
import { KitCodigo, daCena, encaixa, novaPeca, type Peca } from "./peca"

const LISTRA: RGB = [0.95, 0.72, 0.1]
const PRETO: RGB = [0.05, 0.05, 0.06]
const ALERTA: RGB = [1, 0.18, 0.1]
const VIDRO_AMB: RGB = [1, 0.62, 0.18]

/** Listras de alerta numa face plana (de `a` a `b` ao longo de x, altura y0–y1, no plano z). */
function listras(p: Peca, x0: number, x1: number, y0: number, y1: number, z: number, n: number) {
  for (let k = 0; k < n; k++) {
    const a = x0 + ((x1 - x0) * k) / n, b = x0 + ((x1 - x0) * (k + 1)) / n, d = (y1 - y0) * 0.6
    p.body.quad([a, y0, z], [b, y0, z], [b + d, y1, z], [a + d, y1, z], k % 2 ? PRETO : LISTRA, 0.5)
  }
}

/** VIGA DE ALERTA (ao longo de z): viga I de ferro com as mesas de bronze, listras amarelas e pretas e as luzes vermelhas. */
function viga(lod: number): Peca {
  const p = novaPeca()
  caixa(p.body, [0, 0.37, 0], [0.28, 0.08, 1], FERRO, { top: OURO, wear: 1, fundo: true })
  caixa(p.body, [0, 0.04, 0], [0.28, 0.08, 1], FERRO, { top: OURO, wear: 1, fundo: true })
  caixa(p.body, [0, 0.2, 0], [0.08, 0.26, 1], FERRO_ESC)
  // listras nas duas faces da alma (giradas: a viga corre em z, a face olha para ±x)
  const n = lod ? 6 : 12
  for (const sx of [-1, 1]) for (let k = 0; k < n; k++) {
    const z0 = -0.5 + k / n, z1 = z0 + 1 / n
    p.body.quad([sx * 0.042, 0.08, z0], [sx * 0.042, 0.08, z1], [sx * 0.042, 0.32, z1 + 0.04], [sx * 0.042, 0.32, z0 + 0.04], k % 2 ? PRETO : LISTRA, 0.5)
  }
  for (const z of [-0.42, 0, 0.42]) cil(p.glow, [0, 0, z], [0, -0.03, z], 0.035, 0.035, 6, ALERTA)
  return encaixa(p, { x: [-0.139, 0.14], y: [0, 0.411], z: [-0.498, 0.497] })
}

/** CANOS de cobre (feixe de três com aros de bronze, um cotovelo e a válvula de roda). Centro na origem. */
function canos(lod: number): Peca {
  const p = daCena(lod, (c) => {
    cano(c, [-0.4, -1.6, -2.6], [-0.4, -1.6, 2.6], 0.42, lod)
    cano(c, [0.45, -1.2, -2.6], [0.45, -1.2, 2.6], 0.32, lod)
    cano(c, [0, 0.4, -2.6], [0, 0.4, 0.8], 0.36, lod)
    cano(c, [0, 0.4, 0.8], [0, 1.6, 2.2], 0.36, lod)
    engrenagemCopia(c.geo(0, 0), [0.62, 0.4, -0.8], [0, 1, 0], [0, 0, 1], 0.55, 0.12, lod, { dentes: 8, raios: 4, cor: [0.7, 0.14, 0.1] })
  })
  return encaixa(p, { x: [-0.362, 0.362], y: [-0.499, 0.499], z: [-0.717, 0.723] }, "meio")
}

/** PISTÃO de vidro aceso: base de ferro, o cilindro de vidro âmbar com a haste, a tampa de bronze. Caixa ±0,18 × 1. */
function pistao(lod: number): Peca {
  const p = novaPeca()
  const n = lod ? 6 : 10
  cil(p.body, [0, 0, 0], [0, 0.14, 0], 0.18, 0.16, n, FERRO_ESC, { tampa: FERRO })
  cil(p.body, [0, 0.14, 0], [0, 0.18, 0], 0.15, 0.15, n, OURO, { tampa: OURO_CL })
  cil(p.glow, [0, 0.18, 0], [0, 0.66, 0], 0.12, 0.12, n, VIDRO_AMB, { tampa: null })
  cil(p.body, [0, 0.66, 0], [0, 0.72, 0], 0.15, 0.15, n, OURO, { tampa: FERRO })
  cil(p.body, [0, 0.72, 0], [0, 1, 0], 0.045, 0.045, 6, FERRO_CL, { tampa: FERRO_CL })
  // montantes por fora do vidro
  for (let k = 0; k < 4; k++) {
    const a = (k / 4) * TAU + 0.4
    caixa(p.body, [Math.cos(a) * 0.14, 0.42, Math.sin(a) * 0.14], [0.025, 0.5, 0.025], OURO, { ry: -a })
  }
  cil(p.glow, [0, 0.3, 0], [0, 0.55, 0], 0.05, 0.05, 6, AMB_CL, { tampa: null })
  return encaixa(p, { x: [-0.182, 0.18], y: [0.002, 0.997], z: [-0.232, 0.233] })
}

/** GUINDASTE pendurado: o carrinho no trilho (y 0), a corrente e o gancho com a carga. Pendura de y 0 até −1. */
function guindaste(lod: number): Peca {
  const p = novaPeca()
  caixa(p.body, [0, -0.05, 0], [0.3, 0.1, 0.46], FERRO, { top: OURO, wear: 1, fundo: true })
  for (const z of [-0.16, 0.16]) cil(p.body, [-0.16, -0.02, z], [0.16, -0.02, z], 0.035, 0.035, 6, FERRO_ESC)
  const m = lod ? 5 : 10
  for (let k = 0; k < m; k++) {
    const y0 = -0.1 - (k / m) * 0.55, y1 = -0.1 - ((k + 1) / m) * 0.55
    caixa(p.body, [0, (y0 + y1) / 2, 0], k % 2 ? [0.02, y0 - y1, 0.05] : [0.05, y0 - y1, 0.02], FERRO_ESC)
  }
  // o gancho (meio anel) e a carga (caixote de cobre com cintas)
  for (let k = 0; k < 6; k++) {
    const a0 = Math.PI * (k / 6), a1 = Math.PI * ((k + 1) / 6)
    cil(p.body, [Math.cos(a0) * 0.06, -0.7 - Math.sin(a0) * 0.06, 0], [Math.cos(a1) * 0.06, -0.7 - Math.sin(a1) * 0.06, 0], 0.016, 0.016, 4, FERRO_CL, { tampa: null })
  }
  caixa(p.body, [0, -0.86, 0], [0.3, 0.26, 0.3], COBRE, { top: COBRE_CL, wear: 1, fundo: true })
  for (const y of [-0.8, -0.92]) caixa(p.body, [0, y, 0], [0.31, 0.03, 0.31], FERRO_ESC)
  return encaixa(p, { x: [-0.156, 0.156], y: [-1.001, 0], z: [-0.244, 0.237] }, "cima")
}

/** ENGRENAGEM da parede (girador em x): bronze no plano y–z, raios e o cubo. Centro na origem. */
function engrenagem(lod: number): Peca {
  const p = novaPeca()
  engrenagemCopia(p.body, [0, 0, 0], [0, 0, 1], [0, 1, 0], 1, 0.36, lod, { dentes: lod ? 10 : 14, raios: 6, cor: OURO })
  return encaixa(p, { x: [-0.182, 0.184], y: [-0.5, 0.5], z: [-0.499, 0.499] }, "meio")
}

/** TURBINA (girador em x): aro de ferro, 6 pás de cobre torcidas, cubo de bronze e o miolo aceso. Centro na origem. */
function turbina(lod: number): Peca {
  const p = novaPeca()
  const n = lod ? 12 : 20, R = 1
  for (let k = 0; k < n; k++) {
    const a0 = (k / n) * TAU, a1 = ((k + 1) / n) * TAU
    const P = (a: number, r: number, x: number): V3 => [x, Math.sin(a) * r, Math.cos(a) * r]
    face(p.body, [P(a0, R, -0.15), P(a1, R, -0.15), P(a1, R, 0.15), P(a0, R, 0.15)], FERRO, [0, Math.sin((a0 + a1) / 2), Math.cos((a0 + a1) / 2)])
    face(p.body, [P(a1, R, -0.15), P(a0, R, -0.15), P(a0, R * 0.9, -0.15), P(a1, R * 0.9, -0.15)], FERRO_CL, [-1, 0, 0], 1)
    face(p.body, [P(a0, R, 0.15), P(a1, R, 0.15), P(a1, R * 0.9, 0.15), P(a0, R * 0.9, 0.15)], FERRO_CL, [1, 0, 0], 1)
  }
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * TAU, b = a + 0.38
    face(p.body, [[-0.02, Math.sin(a) * 0.2, Math.cos(a) * 0.2], [-0.08, Math.sin(a) * 0.9, Math.cos(a) * 0.9], [0.08, Math.sin(b) * 0.9, Math.cos(b) * 0.9], [0.02, Math.sin(b) * 0.2, Math.cos(b) * 0.2]], k % 2 ? COBRE : COBRE_CL, [-1, 0, 0])
    face(p.body, [[0.02, Math.sin(b) * 0.2, Math.cos(b) * 0.2], [0.08, Math.sin(b) * 0.9, Math.cos(b) * 0.9], [-0.08, Math.sin(a) * 0.9, Math.cos(a) * 0.9], [-0.02, Math.sin(a) * 0.2, Math.cos(a) * 0.2]], mix(COBRE, FERRO_ESC, 0.4), [1, 0, 0])
  }
  cil(p.body, [-0.18, 0, 0], [0.18, 0, 0], 0.22, 0.22, lod ? 8 : 12, OURO, { tampa: OURO_CL, base: true })
  cil(p.glow, [-0.19, 0, 0], [-0.2, 0, 0], 0.12, 0.12, 8, AMB, { tampa: AMB_CL })
  return encaixa(p, { x: [-0.167, 0.167], y: [-0.497, 0.493], z: [-0.518, 0.52] }, "meio")
}

/** CABEÇA DE PRENSA: pórtico de ferro com as colunas de bronze, o cilindro, a matriz e o metal em brasa na mesa. */
function prensaCabeca(lod: number): Peca {
  const p = novaPeca()
  caixa(p.body, [0, 0.08, 0], [1.2, 0.16, 0.9], FERRO_ESC, { top: FERRO, wear: 1 })
  for (const sx of [-1, 1]) caixa(p.body, [sx * 0.5, 0.55, 0], [0.18, 0.8, 0.3], FERRO, { top: OURO, wear: 1, frente: mix(FERRO, FERRO_CL, 0.2) })
  caixa(p.body, [0, 0.9, 0], [1.2, 0.2, 0.4], FERRO, { top: OURO, wear: 1 })
  listras(p, -0.5, 0.42, 0.82, 0.97, -0.205, lod ? 5 : 9)
  cil(p.body, [0, 0.8, 0], [0, 0.55, 0], 0.13, 0.13, lod ? 6 : 10, FERRO_CL, { tampa: null })
  caixa(p.body, [0, 0.5, 0], [0.62, 0.1, 0.5], FERRO_ESC, { top: OURO })
  caixa(p.body, [0, 0.2, 0], [0.62, 0.08, 0.5], FERRO, { top: OURO, wear: 1 })
  caixa(p.glow, [0, 0.27, 0], [0.34, 0.06, 0.24], AMB)
  return encaixa(p, { x: [-0.608, 0.608], y: [0, 0.999], z: [-0.458, 0.458] })
}

/** RELÓGIO de parede (mostrador para +z): torre de tijolo, a moldura de bronze, o mostrador aceso e os ponteiros. */
function relogio(lod: number): Peca {
  const p = novaPeca()
  caixa(p.body, [0, 0.45, 0], [0.7, 0.9, 0.6], TIJ, { top: TIJ_ESC, wear: 1, frente: mix(TIJ, TIJ_ESC, 0.3) })
  caixa(p.body, [0, 0.93, 0], [0.76, 0.08, 0.66], FERRO, { top: OURO, wear: 1 })
  const n = lod ? 12 : 20, c: V3 = [0, 0.55, 0.31], R = 0.26
  const anel = (r: number, dz: number) => Array.from({ length: n }, (_, k): V3 => [c[0] + Math.cos((k / n) * TAU) * r, c[1] + Math.sin((k / n) * TAU) * r, c[2] + dz])
  const fora = anel(R + 0.05, 0.03), dentro = anel(R, 0.03)
  for (let k = 0; k < n; k++) {
    const j = (k + 1) % n
    face(p.body, [fora[k], fora[j], dentro[j], dentro[k]], k % 2 ? OURO : OURO_CL, [0, 0, 1], 1)
  }
  face(p.glow, anel(R, 0.025), mix(AMB_CL, [1, 1, 1], 0.4), [0, 0, 1])
  // ponteiros
  p.body.quad([-0.012, 0.55, 0.35], [0.012, 0.55, 0.35], [0.012, 0.74, 0.35], [-0.012, 0.74, 0.35], PRETO)
  p.body.quad([0, 0.538, 0.351], [0.15, 0.6, 0.351], [0.15, 0.62, 0.351], [0, 0.562, 0.351], PRETO)
  if (!lod) for (let k = 0; k < 12; k++) {
    const a = (k / 12) * TAU
    caixa(p.body, [Math.cos(a) * R * 0.85, 0.55 + Math.sin(a) * R * 0.85, 0.345], [0.02, 0.02, 0.005], PRETO)
  }
  return encaixa(p, { x: [-0.355, 0.36], y: [0.002, 0.989], z: [-0.415, 0.415] })
}

/** EMPILHADEIRA (comprida em x): corpo amarelo, cabine de ferro, mastro com os garfos e um caixote, rodas. */
function empilhadeira(lod: number): Peca {
  const p = novaPeca()
  caixa(p.body, [0.1, 0.32, 0], [0.8, 0.36, 0.7], LISTRA, { top: mix(LISTRA, [1, 1, 1], 0.2), wear: 1 })
  caixa(p.body, [0.42, 0.62, 0], [0.18, 0.3, 0.6], FERRO_ESC, { top: FERRO })
  for (const sz of [-1, 1]) caixa(p.body, [-0.05, 0.7, sz * 0.3], [0.04, 0.4, 0.04], FERRO_ESC)
  caixa(p.body, [-0.05, 0.92, 0], [0.5, 0.04, 0.66], FERRO, { top: FERRO_CL })
  for (const sz of [-1, 1]) caixa(p.body, [-0.38, 0.55, sz * 0.18], [0.04, 0.9, 0.06], FERRO_ESC, { top: FERRO })
  for (const sz of [-1, 1]) caixa(p.body, [-0.56, 0.16, sz * 0.18], [0.36, 0.03, 0.08], FERRO_CL)
  caixa(p.body, [-0.56, 0.3, 0], [0.32, 0.24, 0.44], [0.52, 0.32, 0.18], { top: [0.66, 0.44, 0.26], wear: 1 })
  for (const x of [-0.2, 0.4]) for (const sz of [-1, 1]) cil(p.body, [x, 0.13, sz * 0.36], [x, 0.13, sz * 0.3], 0.13, 0.13, lod ? 6 : 10, PRETO, { tampa: FERRO_CL })
  cil(p.glow, [0.12, 0.96, 0.25], [0.12, 1, 0.25], 0.04, 0.04, 6, [1, 0.6, 0.1])
  return encaixa(p, { x: [-0.65, 0.652], y: [0.002, 1], z: [-0.487, 0.483] })
}

/** CALDEIRA de cobre do Domínio (tanque deitado sobre pés, manômetro, a fornalha acesa). */
function caldeira(lod: number): Peca {
  const p = daCena(lod, (c) => tanqueCaldeira(c, 0, 0, 2, lod))
  return encaixa(p, { x: [-0.455, 0.432], y: [0.001, 0.987], z: [-0.572, 0.572] })
}

/** TANQUE de ferro em pé com cintas de bronze, o visor de nível aceso e o cano saindo. */
function tanque(lod: number): Peca {
  const p = novaPeca()
  const n = lod ? 8 : 12
  cil(p.body, [0, 0, 0], [0, 0.82, 0], 0.3, 0.3, n, FERRO, { colB: FERRO_CL, tampa: null, base: true })
  cil(p.body, [0, 0.82, 0], [0, 0.94, 0], 0.3, 0.12, n, FERRO_CL, { tampa: OURO })
  for (const y of [0.12, 0.44, 0.76]) cil(p.body, [0, y - 0.02, 0], [0, y + 0.02, 0], 0.315, 0.315, n, OURO, { tampa: null })
  caixa(p.glow, [0, 0.45, -0.31], [0.06, 0.4, 0.01], AMB)
  cil(p.body, [0.28, 0.6, 0], [0.4, 0.6, 0], 0.05, 0.05, 6, COBRE, { tampa: COBRE_CL })
  cil(p.body, [0, 0.94, 0], [0, 1, 0], 0.04, 0.04, 6, COBRE)
  return encaixa(p, { x: [-0.398, 0.398], y: [0.001, 1.003], z: [-0.324, 0.323] })
}

/** ESTEIRA do Domínio (rolos, caixas, a cobertura acesa), comprida em x. */
function esteira(lod: number): Peca {
  const p = daCena(lod, (c) => esteiraCopia(c, 0, 0, 4, -Math.PI / 2, 3, lod))
  return encaixa(p, { x: [-0.636, 0.631], y: [0.002, 0.995], z: [-0.494, 0.494] })
}

/** PAINEL DE CONTROLE: mesa inclinada de ferro com mostradores acesos, alavancas e a tela âmbar. Frente para +z. */
function painel(lod: number): Peca {
  const p = novaPeca()
  caixa(p.body, [0, 0.3, 0], [1, 0.6, 0.5], FERRO, { top: FERRO_CL, wear: 1, frente: FERRO_ESC })
  // o tampo inclinado (para +z) com os mostradores
  const y0 = 0.6, y1 = 0.78
  face(p.body, [[-0.5, y0, 0.25], [0.5, y0, 0.25], [0.5, y1, -0.1], [-0.5, y1, -0.1]], FERRO_CL, [0, 1, 0.8], 1)
  for (let k = 0; k < (lod ? 3 : 6); k++) {
    const x = -0.36 + k * (0.72 / ((lod ? 3 : 6) - 1)), t = 0.4
    const cy = y0 + (y1 - y0) * t, cz = 0.25 - 0.35 * t
    cil(p.glow, [x, cy, cz], [x, cy + 0.01, cz - 0.008], 0.05, 0.05, 8, k % 2 ? AMB : [0.4, 1, 0.5], { tampa: AMB_CL })
  }
  // a tela de trás e as alavancas
  caixa(p.body, [0, 0.92, -0.16], [0.9, 0.3, 0.06], FERRO_ESC, { top: OURO })
  face(p.glow, [[-0.4, 0.8, -0.128], [0.4, 0.8, -0.128], [0.4, 1.03, -0.128], [-0.4, 1.03, -0.128]], [AMB, AMB, AMB_CL, AMB_CL], [0, 0, 1])
  if (!lod) for (const x of [-0.3, 0.3]) cil(p.body, [x, y0 + 0.08, 0.1], [x + 0.05, y0 + 0.25, 0.15], 0.012, 0.012, 4, FERRO_CL, { tampa: [0.8, 0.1, 0.1] })
  return encaixa(p, { x: [-0.526, 0.534], y: [0.002, 0.996], z: [-0.354, 0.382] })
}

const PAL: PalObst = {
  pedra: [FERRO_ESC, FERRO, FERRO_CL],
  capa: null,
  racha: null,
  gema: [[0.6, 0.36, 0.12], AMB, AMB_CL],
  gemaLuz: AMB_CL,
  galao: GALAO,
  galaoLuz: GALAO_LUZ,
}

export type FabricaPeca = "viga" | "cano" | "pistao" | "guindaste" | "engrenagem" | "turbina" | "prensa-cabeca" | "relogio" | "empilhadeira" | "caldeira" | "tanque" | "esteira" | "painel" | "engrenagem-voo" | "galao"

export function kitFabrica(low: boolean) {
  const lod = low ? 1 : 0
  return new KitCodigo<FabricaPeca>(
    "fabrica",
    { weather: { grime: 1.1, rustAmt: 0.7, rust: [0.36, 0.18, 0.08], bare: [0.9, 0.72, 0.48] }, spec: [0.45, 0.38, 0.3], power: 28, self: [0.04, 0.035, 0.05] },
    {
      viga: () => viga(lod),
      cano: () => canos(lod),
      pistao: () => pistao(lod),
      guindaste: () => guindaste(lod),
      engrenagem: () => engrenagem(lod),
      turbina: () => turbina(lod),
      "prensa-cabeca": () => prensaCabeca(lod),
      relogio: () => relogio(lod),
      empilhadeira: () => empilhadeira(lod),
      caldeira: () => caldeira(lod),
      tanque: () => tanque(lod),
      esteira: () => esteira(lod),
      painel: () => painel(lod),
      // a engrenagem dos obstáculos (pé dos dentes no raio 1), bronze com o miolo âmbar
      "engrenagem-voo": () => engrenagemVoo(OURO, FERRO_ESC, AMB),
      galao: () => galaoVoo(PAL),
    },
  )
}
