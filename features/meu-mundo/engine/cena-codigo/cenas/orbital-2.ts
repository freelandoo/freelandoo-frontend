// CIDADE ORBITAL · cena 2 (setores 4–7, chefe no 7) — a PRAÇA NO CÉU da ref `orbital-2.png` (refeita em
// 11/11): calçadas largas de mármore com parapeito de ouro suspensas num MAR DE NUVENS, praças redondas
// nas clareiras, pedestais de luz com cristal amarelo, floreiras de cristal penduradas para fora, escada
// de mármore que sobe para o nada, ilhas flutuantes (com prédio, cachoeira e gazebo de cúpula), castelos
// e aquedutos flutuando na névoa e, no fim, a PONTE DE CRISTAL acesa que leva ao PALÁCIO FLUTUANTE.
// O chão de andar é plano (y = 0) só na plataforma; fora dela despenca (visual) e o parapeito segura.

import { type RGB } from "../kit"
import { Cena, blocked, ground, type XZ } from "../kit-cena"
import { mix, mul, rnd, tube } from "../kit-natureza"
import { AREA, H, planta } from "../dominio"
import * as O from "./tema-orbital"
import * as C from "../pecas/orbital"
import { LAJE, LAJE_B } from "./avenida-orbital"
import { NUVEM_FUNDO, PEDRA, PEDRA_ESC, PROFUNDO, alturaCeu, aqueduto, beirada, cachoeira, ceuDeFundo, escadaCurva, floreiraBalanco, ilhaCeu, marDeNuvens, palacioFlutuante, pedestalLuz, pingente, plataforma, ponteArco, ponteCristal, trepadeira } from "./ceu-orbital"

export const meta = {
  ceu: [0.42, 0.68, 1] as RGB,
  nevoa: [0.88, 0.93, 1] as RGB,
  area: AREA,
  luz: O.LUZ,
  astro: { dir: [0.5, 0.75, 0.9] as RGB, r: 0.06, cor: [1, 1, 0.9] as RGB },
  pontos: ["entrada", "saida", "chefe"],
  setores: [4, 5, 6, 7],
}

// a calçada serpenteia entre praças; o ÚLTIMO trecho é a ponte de cristal (sai pelo alto, rumo ao palácio)
const CAMINHO: XZ[] = [[0, -73], [0, -44], [38, -30], [44, 4], [8, 14], [-34, 6], [-46, 36], [-16, 48], [10, 50], [10, 73]] // a saída fica a 7 m da borda (a caixa da borda ocupa os últimos 3 m)
const PONTE = CAMINHO.length - 2

export function montar(lod = 0): Cena {
  const c = new Cena("orbital-2", lod, 32, -16)
  const P = planta(c, { path: CAMINHO, setores: [4, 5, 6, 7], boss: 7, tZonas: [0.15, 0.36, 0.57], tArena: 0.8 })
  const L = plataforma(P, 5.5, [{ x: 10, z: 50, r: 8 }], { k: PONTE, w: 2.4 })
  const naPonte = (x: number, z: number) => Math.abs(x - 10) < 3.5 && z > 56
  const g0 = (x: number, z: number) => L.dentro(x, z) > 0.5

  // ── a ponte, os pedestais na boca dela e o palácio flutuante do outro lado (pano de fundo) ──
  ponteCristal(c, [10, 56], [10, 79.5], 4.8, lod)
  for (const s of [-1, 1]) pedestalLuz(c, 10 + s * 4.2, 54, lod)
  palacioFlutuante(c, 10, 122, 18, 9)
  ceuDeFundo(c, 8)

  // ── casas de mármore coladas nas praças (a ref: o prédio de arcos com lanterna à esquerda), sobre um
  // dente de rocha no vazio; o parapeito some na frente delas (a caixa da casa segura) ──
  let casas = 0
  for (const pr of L.pracas) {
    if (casas >= 4 || pr.r < 10) continue
    for (const da of [0, 0.7, -0.7]) {
      const a = Math.atan2(pr.z, pr.x) + da
      const ux = Math.cos(a), uz = Math.sin(a)
      const off = pr.r + 3.9
      const x = pr.x + ux * off, z = pr.z + uz * off
      const fundoOk = [0, 2.5, 5].every((e) => L.dentro(pr.x + ux * (pr.r + 0.6 + e), pr.z + uz * (pr.r + 0.6 + e)) < -0.3)
      if (!fundoOk || P.beira(x, z) < 9 || blocked(c, x, z, 4.5)) continue
      C.lojaToldo(c, x, z, Math.atan2(-ux, -uz), { w: 9, d: 7, h: 11 + (casas % 2) * 2, toldo: casas % 2 ? C.ROSA_TOLDO : C.AZUL_TOLDO, listraClara: casas % 2 ? [1, 0.72, 0.86] : undefined, portaEsq: casas % 2 === 0, seed: casas * 5 }, lod)
      tube(c.geo(x, z), [x, 0, z], [x, -9, z], 6, 0.6, 7, (j) => (j % 2 ? PEDRA : PEDRA_ESC), false)
      casas++
      break
    }
  }

  // ── parapeito em toda a beirada (com caixa); na ponte o guarda-corpo é dela ──
  beirada(c, P, L, lod, naPonte) // pula também onde há caixa logo fora (as casas)
  for (const s of [-1, 1]) c.block(10 + s * 2.95, 68, 0.3, 12, 1.2)

  // ── beira da calçada: pedestal de luz, canteiro de cristal e árvore em vaso, alternando os lados a cada
  // ~9 m (a ref é cheia nas bordas); floreiras penduradas para FORA do parapeito ──
  for (let t = 0.03, k = 0; t < 0.9; t += 0.03, k++) {
    const p = P.at(t), s = k % 2 ? 1 : -1
    const nx = p.dz * s, nz = -p.dx * s
    const x = p.x + nx * 4.3, z = p.z + nz * 4.3
    if (g0(x, z) && P.aberto(x, z) < 0.2 && !blocked(c, x, z, 0.9)) {
      const tipo = k % 6
      if (tipo === 0 || tipo === 3) pedestalLuz(c, x, z, lod)
      else if (tipo === 1 || tipo === 4) C.canteiroCristal(c, x, z, Math.atan2(nx, nz) + Math.PI / 2, { seed: k * 3, cristal: tipo === 4 ? [1, 0.84, 0.3] : undefined }, lod)
      else C.arvoreRedonda(c, x, z, 5, k * 11, lod)
    }
    const fx = p.x - nx * 7.4, fz = p.z - nz * 7.4
    if (L.dentro(fx, fz) < -1 && P.beira(fx, fz) > 4) floreiraBalanco(c, fx, fz, Math.atan2(nx, nz), k * 7, lod)
  }

  // ── praças: árvores em vaso e canteiros de cristal na roda, uma escada que sobe para o nada ──
  for (const pr of L.pracas) {
    for (let k = 0; k < 4; k++) {
      const a = (k / 4) * Math.PI * 2 + rnd(3, pr.x, k) * 0.6, r = pr.r - 2.2
      const x = pr.x + Math.cos(a) * r, z = pr.z + Math.sin(a) * r
      if (!P.livre(x, z, 0.8) || blocked(c, x, z, 1.2) || !g0(x, z)) continue
      if (k % 2) C.arvoreRedonda(c, x, z, 5.2, pr.x + k, lod)
      else C.canteiroCristal(c, x, z, a + Math.PI / 2, { seed: k + pr.z }, lod)
    }
  }
  for (const pr of L.pracas) {
    const a = Math.atan2(pr.z, pr.x) // para fora do centro da cena (a escada aponta para o céu aberto)
    const x = pr.x + Math.cos(a) * (pr.r - 3), z = pr.z + Math.sin(a) * (pr.r - 3)
    const ang = Math.atan2(Math.cos(a), Math.sin(a))
    if (P.livre(x, z, 2) && !blocked(c, x, z, 2.5) && P.beira(x, z) > 18) {
      O.escadaSemChao(c, x, z, ang, 12, lod)
      break
    }
  }

  // ── ilhas flutuantes por cima do vazio (algumas com gazebo) e o mar de nuvens embaixo ──
  let gz = 0
  const ilhas: { x: number; y: number; z: number; r: number }[] = []
  for (let x = -H + 14; x < H; x += 26)
    for (let z = -H + 14; z < H; z += 26) {
      const r = (q: number) => rnd(17, x * 3 + z, q)
      const px = x + (r(1) - 0.5) * 10, pz = z + (r(2) - 0.5) * 10
      if (r(3) > 0.6 || L.dentro(px, pz) > -6 || Math.abs(px) > H - 8 || Math.abs(pz) > H - 8) continue
      const y = 9 + r(4) * 14, R = 4 + r(5) * 3.5
      const casa = gz < 3 && r(6) < 0.45
      ilhaCeu(c, px, y, pz, R, r(7) * 99, lod, casa)
      ilhas.push({ x: px, y, z: pz, r: R })
      if (casa) gz++
    }
  // ── o que liga e enfeita as ilhas (a ref 2 inteira): pontes em arco entre vizinhas, cachoeiras caindo nas
  // nuvens, escada em caracol pendurada, pingentes de cristal e trepadeiras na beira ──
  const ligadas = new Set<string>()
  ilhas.forEach((A, i) => {
    // a vizinha mais perto (18–42 m) ganha ponte; cada par uma vez só
    let best = -1, bd = Infinity
    ilhas.forEach((B, j) => {
      const d = Math.hypot(A.x - B.x, A.z - B.z)
      if (j !== i && d > 18 && d < 42 && d < bd && !ligadas.has(Math.min(i, j) + "-" + Math.max(i, j))) {
        bd = d
        best = j
      }
    })
    if (best >= 0) {
      const B = ilhas[best]
      ligadas.add(Math.min(i, best) + "-" + Math.max(i, best))
      const ux = (B.x - A.x) / bd, uz = (B.z - A.z) / bd
      ponteArco(c, [A.x + ux * A.r * 0.9, A.y + 0.35, A.z + uz * A.r * 0.9], [B.x - ux * B.r * 0.9, B.y + 0.35, B.z - uz * B.r * 0.9], 2.2, 2.5, lod)
    }
    const rr = (q: number) => rnd(23, i, q)
    if (rr(1) < 0.55) {
      const a = rr(2) * Math.PI * 2
      cachoeira(c, A.x + Math.cos(a) * A.r * 0.95, A.y + 0.2, A.z + Math.sin(a) * A.r * 0.95, Math.atan2(Math.cos(a), Math.sin(a)), 1.6 + rr(3), -3)
    }
    if (!lod) {
      for (let k = 0; k < 2; k++) pingente(c, A.x + (rr(k + 4) - 0.5) * A.r * 0.6, A.y - A.r * 0.75, A.z + (rr(k + 6) - 0.5) * A.r * 0.6, 1.4 + rr(k + 8))
      for (let k = 0; k < 3; k++) {
        const a = rr(k + 10) * Math.PI * 2
        trepadeira(c, A.x + Math.cos(a) * A.r, A.y + 0.3, A.z + Math.sin(a) * A.r, 2.2, i * 7 + k)
      }
    }
    if (i % 3 === 1) escadaCurva(c, A.x, A.y + 0.2, A.z, A.r + 1, rr(12) * 6, 0.75, Math.min(A.y - 1, 9), lod)
  })
  // aqueduto quebrado no alto, atravessando o céu da cena (visto de quase toda a calçada)
  aqueduto(c, 52, 26, -60, -0.5, 5, lod)
  aqueduto(c, -66, 30, 20, 0.4, 4, lod)
  // trepadeiras descendo do parapeito para o vazio, de vez em quando
  if (!lod)
    for (let t = 0.05, k = 0; t < 0.9; t += 0.06, k++) {
      const p = P.at(t), s = k % 2 ? 1 : -1
      const x = p.x + p.dz * s * 6.3, z = p.z - p.dx * s * 6.3
      if (L.dentro(x, z) < 0 && L.dentro(x - p.dz * s * 0.9, z + p.dx * s * 0.9) > 0) trepadeira(c, x, 0.4, z, 2.6, k * 5)
    }
  marDeNuvens(c, L, H, lod, 21)

  // ── chão: lajes grandes na plataforma, penhasco de pedra na beira, nuvem lá embaixo ──
  const color = (x: number, z: number): RGB => {
    const d = L.dentro(x, z)
    if (d > -0.2) {
      // lajes de 3 m com contraste (a ref tem a junta e o tom de cada laje à vista)
      const laje = (Math.floor(x / 3) + Math.floor(z / 3)) % 2 ? mul(LAJE, 0.92) : mul(LAJE_B, 0.86) // mais escuras que na avenida: a praça no céu estoura de claro
      return mix(laje, O.MARMORE, P.aberto(x, z) * 0.3)
    }
    return d > -2.5 ? PEDRA : NUVEM_FUNDO
  }
  ground(c, { x0: -H, z0: -H, x1: H, z1: H, step: lod ? 4 : 2, color, height: (x, z) => alturaCeu(L, x, z) })
  ground(c, { x0: -220, z0: -220, x1: 220, z1: 220, step: 40, color: () => mul(NUVEM_FUNDO, 1.02), fundo: true, y: PROFUNDO + 0.5, hole: [-H, -H, H, H] })
  return c
}
