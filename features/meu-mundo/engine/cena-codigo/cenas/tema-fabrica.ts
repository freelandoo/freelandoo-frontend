// Tema da FÁBRICA DE BRONZE (Aeryn) — as 3 cenas usam estas peças. Refs do Alex:
// `pipeline/pecas-codigo/ref/dominios/fabrica-{1,2,3}.png` e `castelo-aeryn.png`.
//
// FICHA DO AMBIENTE
// Clima:       pátio industrial steampunk; cenas 1 e 3 no pôr do sol (laranja e rosa), cena 2 de dia
//              com fornos acesos. Tijolo, cobre e bronze quentes; luz âmbar nas janelas e fornalhas;
//              chão de chapas rebitadas roxo-acinzentado com faixas amarelas.
// Camadas:     (1) chão: chapas de metal em grade + faixas amarelas na beira do caminho; (2) relevo:
//              galpões de tijolo com janelas em arco acesas, chaminés com fumaça; (3) sem água;
//              (4) sem vegetação; (5) objetos: canos de cobre, esteiras com caixotes, barris com faixa
//              acesa, engrenagens gigantes (2), fornos (2), passarelas no alto (2), postes-lampião (3);
//              (6) fundo: silhuetas de galpões e chaminés na névoa.
// Proporções:  personagem 1,7 m; galpão 8–16 m de altura; chaminé 14–24 m; engrenagem 6–12 m;
//              caixote 1,2 m; barril 1 m; caminho 4,4 m.
// Cobertura:   ~55% chapa, 25% galpões, 10% caminho, 10% máquinas e cargas.
// Fora:        o emblema exato das bandeiras (fica uma engrenagem/águia simples), personagens.

import { type RGB, type V3 } from "../kit"
import type { Cena } from "../kit-cena"
import { caixa } from "../kit-cidade"
import { blob, face, mix, mul, rnd, tube } from "../kit-natureza"
import * as P from "../pecas/fabrica"
import { quadro } from "../pecas/orbital"

export const CEU_TARDE: RGB = [0.92, 0.62, 0.52]
export const NEVOA_TARDE: RGB = [0.88, 0.62, 0.56]
export const LUZ_TARDE = { hemi: 0.9, sol: 0.65, ceu: [1, 0.86, 0.74] as RGB, chao: [0.5, 0.4, 0.42] as RGB, solCor: [1, 0.78, 0.55] as RGB }
// chapas do chão das refs: lilás-acinzentado (não cinza), junta escura
export const CHAPA: RGB = [0.46, 0.37, 0.43]
export const CHAPA_ESC: RGB = [0.27, 0.21, 0.26]
export const CHAPA_CL: RGB = [0.56, 0.46, 0.5]
export const AMARELO: RGB = [0.95, 0.7, 0.12]
export const TIJOLO: RGB = [0.6, 0.3, 0.22]
export const TIJOLO_ESC: RGB = [0.42, 0.2, 0.16]
export const COBRE: RGB = [0.78, 0.46, 0.24]
export const BRONZE: RGB = [0.72, 0.52, 0.24]
export const BRONZE_ESC: RGB = [0.44, 0.3, 0.14]
export const FERRO: RGB = [0.24, 0.24, 0.3]
export const MADEIRA: RGB = [0.62, 0.4, 0.22]
export const MADEIRA_ESC: RGB = [0.4, 0.25, 0.14]
export const TEAL: RGB = [0.2, 0.55, 0.5]
export const AMBAR: RGB = [1, 0.7, 0.25]
export const FOGO: RGB = [1, 0.5, 0.12]
export const FUMACA = { dark: [0.62, 0.58, 0.62] as RGB, mid: [0.82, 0.78, 0.8] as RGB, hi: [0.96, 0.94, 0.94] as RGB }
export const BANDEIRA: RGB = [0.56, 0.16, 0.14]
/** Teto de triângulos das cenas da Fábrica: fidelidade acima do orçamento de celular (o Alex, 11/11). */
export const TRI_BLOCO = { perto: 16000, longe: 6000, fundo: 6000 }

/** Galpão de tijolo virado para `ang` — a peça COPIADA (`P.galpaoTijolo`: fachada de fiadas, pilastras, janelas em arco, cano, chaminé-farol). */
export function galpao(c: Cena, x: number, z: number, w: number, d: number, h: number, ang: number, seed: number, lod: number, chamine = true, detalhe = false) {
  P.galpaoTijolo(c, x, z, w, d, h, ang, seed, lod, chamine, detalhe)
}

/** Chaminé de tijolo com anel de cobre e fumaça (bolhas claras) no alto. */
export function chamineFumaca(c: Cena, x: number, z: number, y0: number, y1: number, seed: number, lod: number) {
  const g = c.geo(x, z)
  tube(g, [x, y0 - 0.5, z], [x, y1, z], 1, 0.85, lod ? 5 : 7, (k) => (k % 2 ? TIJOLO : TIJOLO_ESC), false)
  tube(g, [x, y1 - 0.6, z], [x, y1 + 0.1, z], 1.1, 1.1, lod ? 5 : 7, () => COBRE, false)
  if (!lod) for (let k = 0; k < 3; k++) blob(g, [x + k * 0.9, y1 + 1.2 + k * 1.6, z + k * 0.3], [1.1 + k * 0.5, 0.9 + k * 0.3, 1.1 + k * 0.5], FUMACA, seed + k)
}

/** Cano de cobre de `a` a `b` com os aros de bronze (peça copiada). */
export function cano(c: Cena, a: V3, b: V3, r: number, lod: number, cor: RGB = COBRE) {
  // o pé do cano decide o bloco: fora da área (galpão de quina) não desenha
  if (Math.max(Math.abs(a[0] + b[0]), Math.abs(a[2] + b[2])) / 2 > 79.5) return
  P.cano(c, a, b, r, lod, cor)
}

/** Caixote de bronze (peça copiada; com caixa se não estiver em cima de algo). */
export function caixote(c: Cena, x: number, z: number, s: number, rot: number, y = 0, solid = true) {
  P.caixote(c, x, z, s, rot, y, c.lod, solid)
}

/** Barril: de ferro com a faixa âmbar acesa (refs 1 e 3) ou de madeira com aros de pátina (ref 2). */
export function barril(c: Cena, x: number, z: number, s: number, lod: number) {
  if (c.name === "fabrica-2" && rnd(Math.round(x * 3), Math.round(z * 3)) < 0.6) P.barrilMadeira(c, x, z, s * 1.2, lod)
  else P.barrilAceso(c, x, z, s * 1.25, lod)
}

/** Engrenagem em pé virada para `ang` (peça copiada: aro dentado, raios, cubo e rebites). */
export function engrenagem(c: Cena, x: number, y: number, z: number, R: number, ang: number, lod: number, esp = 0.6) {
  P.engrenagemEmPe(c, x, y, z, R, ang, lod, esp)
}

/** Esteira copiada (longarinas, tambores, pernas com X, lingotes acesos e caixotes) ao longo de `ang`. */
export function esteira(c: Cena, x: number, z: number, L: number, ang: number, seed: number, lod: number) {
  P.esteiraCopia(c, x, z, L, ang, seed, lod)
}

/** A fornalha copiada (cena 2): arco chanfrado, boca acesa com grade, torre, cano e volante. */
export function forno(c: Cena, x: number, z: number, s: number, ang: number, lod: number) {
  void s
  P.fornalha(c, x, z, ang, lod)
}

/** O pilar-lanterna da praça (cena 3, peça copiada). Devolve o gancho do cabo. */
export function lampiao(c: Cena, x: number, z: number, h: number, lod: number): V3 {
  return P.pilarLanterna(c, x, z, h, lod)
}

/** Estandarte copiado (bordô, borda de ouro, ponta em V): engrenagem nas cenas 1–2, ÁGUIA na 3. y = topo. */
export function bandeira(c: Cena, x: number, y: number, z: number, ang: number, s = 1) {
  const Q = quadro(x, z, ang)
  P.estandarte(c.geo(x, z), c.glow(x, z), Q, 0, 0, y, 1.5 * s, 4 * s, c.name === "fabrica-3" ? "aguia" : "engrenagem")
}

/** Fundo da fábrica: silhuetas de galpões e chaminés na névoa. */
export function fundoFabrica(c: Cena, seed: number) {
  for (let k = 0; k < 16; k++) {
    const a = (k / 16) * Math.PI * 2 + rnd(seed, k) * 0.2
    const d = 105 + rnd(seed, k, 2) * 40
    const x = Math.cos(a) * d, z = Math.sin(a) * d
    const h = 14 + rnd(seed, k, 3) * 18
    caixa(c.fundo, { x, z, y0: 0, y1: h, w: 18 + rnd(seed, k, 4) * 14, d: 14, rot: -a + Math.PI / 2, side: mix(TIJOLO_ESC, FERRO, 0.5), top: FERRO })
    if (k % 2 === 0) tube(c.fundo, [x, h, z], [x, h + 14 + rnd(seed, k, 5) * 10, z], 1.4, 1.2, 5, () => TIJOLO_ESC, false)
  }
}

/**
 * HORIZONTE da Fábrica (malha SEM névoa — a névoa do jogo acaba em 115–150 m e apagava tudo): o que as três
 * refs mostram atrás dos galpões — CHAMINÉS-FAROL gigantes com fumaça (ref 1), as AGULHAS de rocha vermelha
 * em faixas (refs 1 e 3) e o AQUEDUTO de arcos (ref 3). A bruma é pintada na cor (mais longe, mais névoa).
 */
export function horizonteFabrica(c: Cena, seed: number, nevoa: RGB, bruma = 0.45) {
  const g = c.horizonte, GL = c.horizonteLuz
  const i0 = g.count, j0 = GL.count
  const lod = c.lod
  // agulhas de rocha vermelha (anel de 230–265 m), em grupos de 2–3, faixas de arenito
  const PEDRA_V: RGB = [0.86, 0.5, 0.4], PEDRA_VE: RGB = [0.58, 0.3, 0.3], PEDRA_VC: RGB = [0.98, 0.7, 0.52]
  for (let k = 0; k < 11; k++) {
    const a = (k / 11) * Math.PI * 2 + rnd(seed, k) * 0.3
    for (let q = 0; q < 2 + (k % 2); q++) {
      const d = 232 + rnd(seed, k, q + 2) * 30
      const aa = a + (q - 0.5) * 0.07
      const x = Math.cos(aa) * d, z = Math.sin(aa) * d
      const R = 7 + rnd(seed, k, q + 5) * 7, H0 = 38 + rnd(seed, k, q + 8) * 40
      const n = lod ? 5 : 7
      const aneis = [0, 0.3, 0.55, 0.8, 1]
      for (let r = 0; r < aneis.length - 1; r++) {
        const y0 = H0 * aneis[r] - 2, y1 = H0 * aneis[r + 1]
        const r0 = R * (1 - aneis[r] * 0.45), r1 = R * (1 - aneis[r + 1] * 0.45)
        tube(g, [x, y0, z], [x, y1, z], r0, r1 * (r === aneis.length - 2 ? 0.9 : 1.04), n, (j) => (r % 2 ? (j % 3 === 0 ? PEDRA_VC : PEDRA_V) : j % 3 === 0 ? PEDRA_V : PEDRA_VE), r === aneis.length - 2)
      }
    }
  }
  // chaminés-farol gigantes em grupos (150–185 m), com fumaça
  for (let k = 0; k < 7; k++) {
    const a = (k / 7) * Math.PI * 2 + 0.4 + rnd(seed, k, 20) * 0.4
    for (let q = 0; q < 2; q++) {
      const d = 150 + rnd(seed, k, q + 21) * 35
      const x = Math.cos(a + q * 0.05) * d, z = Math.sin(a + q * 0.05) * d
      P.chamineFarol(c, x, z, 30 + rnd(seed, k, q + 23) * 18, 2.4 + rnd(seed, k, q + 24), lod, true, g, GL)
    }
  }
  // aqueduto de arcos (um trecho de ~120 m a 195 m, tangente ao círculo)
  {
    const a0 = rnd(seed, 40) * Math.PI * 2, d = 195
    const cx0 = Math.cos(a0) * d, cz0 = Math.sin(a0) * d
    const tx = -Math.sin(a0), tz = Math.cos(a0)
    const PED: RGB = [0.66, 0.5, 0.46], PED_E: RGB = [0.46, 0.33, 0.33]
    const nA = lod ? 5 : 10, span = 12, Hh = 26
    for (let k = 0; k <= nA; k++) {
      const u = (k - nA / 2) * span
      const x = cx0 + tx * u, z = cz0 + tz * u
      caixa(g, { x, z, y0: -2, y1: Hh, w: 3, d: 4, rot: -Math.atan2(tx, tz), side: PED_E, top: PED })
      if (k < nA) {
        // o arco: 5 gomos de meia-volta entre os pilares, e o tabuleiro em cima
        for (let q = 0; q < 5; q++) {
          const t0 = (q / 5) * Math.PI, t1 = ((q + 1) / 5) * Math.PI
          const R0 = (span - 3) / 2, yb = Hh - R0 - 3
          const P0 = (t: number, r: number): V3 => [x + tx * (span / 2 - Math.cos(t) * r), yb + Math.sin(t) * r, z + tz * (span / 2 - Math.cos(t) * r)]
          const nn: V3 = [Math.cos(a0), 0, Math.sin(a0)]
          face(g, [P0(t0, R0), P0(t1, R0), P0(t1, R0 + 1.6), P0(t0, R0 + 1.6)], PED, [-nn[0], 0, -nn[2]])
        }
      }
    }
    const L = nA * span
    caixa(g, { x: cx0, z: cz0, y0: Hh, y1: Hh + 2.4, w: L + 3, d: 4.4, rot: -Math.atan2(tx, tz), side: PED, top: PED_E })
  }
  // a bruma: mistura cada vértice novo com a névoa pela distância (100 m → 0; 300 m → `bruma`)
  for (const [geo, ini] of [[g, i0], [GL, j0]] as const) {
    for (let v = ini; v < geo.count; v++) {
      const x = geo.p[v * 3], z = geo.p[v * 3 + 2]
      const t = Math.min(1, Math.max(0, (Math.hypot(x, z) - 100) / 200)) * bruma
      for (let q = 0; q < 3; q++) geo.c[v * 4 + q] = geo.c[v * 4 + q] * (1 - t) + nevoa[q] * t
    }
  }
}

/** A caixa (w × d, virada para `ang`) cabe sem encostar no caminho, clareira, arena ou castelo? */
export function cabe(livre: (x: number, z: number, pad?: number) => boolean, x: number, z: number, w: number, d: number, ang: number) {
  const fx = Math.sin(ang), fz = Math.cos(ang), sx = Math.cos(ang), sz = -Math.sin(ang)
  for (const [u, v] of [[0, 0], [-1, -1], [1, -1], [1, 1], [-1, 1], [0, -1], [0, 1], [-1, 0], [1, 0]] as const) {
    const px = x + sx * u * (w / 2) + fx * v * (d / 2), pz = z + sz * u * (w / 2) + fz * v * (d / 2)
    if (!livre(px, pz, 0.4)) return false
  }
  return true
}

/**
 * Galpões ao longo do caminho, dos dois lados, virados para ele (as "paredes" da rua da fábrica).
 * Devolve quantos entraram.
 */
export function ruaDeGalpoes(c: Cena, at: (t: number) => { x: number; z: number; dx: number; dz: number }, livre: (x: number, z: number, pad?: number) => boolean, lod: number, seed: number, passo = 0.05, afasta = 0) {
  let n = 0
  const feitos: { x: number; z: number; r: number }[] = []
  for (let t = 0.03; t < 0.97; t += passo) {
    const p = at(t)
    for (const s of [-1, 1]) {
      const w = 10 + rnd(seed, t * 100, s) * 6, d = 9 + rnd(seed, t * 100, s + 3) * 4, h = 7 + rnd(seed, t * 100, s + 5) * 8
      const off = 4.6 + afasta + d / 2 + rnd(seed, t * 100, s + 7) * 3
      const x = p.x + p.dz * off * s, z = p.z - p.dx * off * s
      const ang = Math.atan2(p.x - x, p.z - z)
      const r = Math.max(w, d) * 0.55
      if (!cabe(livre, x, z, w, d, ang) || feitos.some((f) => Math.hypot(f.x - x, f.z - z) < f.r + r)) continue
      feitos.push({ x, z, r })
      galpao(c, x, z, w, d, h, ang, seed + n, lod, rnd(seed, n, 11) < 0.55, true) // a rua: tijolo a tijolo
      n++
    }
  }
  return n
}

/**
 * Anda pelo caminho de `passo` em `passo` metros e chama `fn` com o ponto, a direção (dx, dz), a distância
 * andada e o índice do trecho — para montar a BEIRA do corredor (o que fica dos dois lados, como nas refs).
 */
export function aoLongoDoCaminho(path: readonly (readonly [number, number])[], passo: number, fn: (x: number, z: number, dx: number, dz: number, dist: number, trecho: number) => void) {
  let dist = 0
  for (let k = 0; k < path.length - 1; k++) {
    const [ax, az] = path[k], [bx, bz] = path[k + 1]
    const L = Math.hypot(bx - ax, bz - az)
    if (L < 0.5) continue
    const dx = (bx - ax) / L, dz = (bz - az) / L
    for (let t = passo / 2; t < L; t += passo) fn(ax + dx * t, az + dz * t, dx, dz, dist + t, k)
    dist += L
  }
}

/** Faixas amarelas pintadas dos dois lados do caminho (geometria fina, 3 cm acima do chão). */
export function faixasCaminho(c: Cena, path: readonly (readonly [number, number])[], off = 2.35, w = 0.22, cor: RGB = AMARELO) {
  for (let k = 0; k < path.length - 1; k++) {
    const [ax, az] = path[k], [bx, bz] = path[k + 1]
    const L = Math.hypot(bx - ax, bz - az) || 1
    const n = Math.max(1, Math.ceil(L / 8))
    const sx = -(bz - az) / L, sz = (bx - ax) / L
    for (let i = 0; i < n; i++) {
      // tracejado: 3 de cada 4 pedaços
      const t0 = i / n, t1 = (i + 0.78) / n
      const p0x = ax + (bx - ax) * t0, p0z = az + (bz - az) * t0, p1x = ax + (bx - ax) * t1, p1z = az + (bz - az) * t1
      const g = c.geo((p0x + p1x) / 2, (p0z + p1z) / 2)
      for (const s of [-1, 1]) {
        const o0 = off * s, o1 = (off + w) * s
        face(g, [[p0x + sx * o0, 0.03, p0z + sz * o0], [p1x + sx * o0, 0.03, p1z + sz * o0], [p1x + sx * o1, 0.03, p1z + sz * o1], [p0x + sx * o1, 0.03, p0z + sz * o1]], cor, [0, 1, 0])
      }
    }
  }
}
