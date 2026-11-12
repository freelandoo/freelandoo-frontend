// AVENIDA DA CIDADE ORBITAL — o traçado da ref `orbital-1.png` (rua de 12 m entre calçadas de 5 m, lojas de
// mármore coladas dos dois lados, canteiros de cristal e árvores redondas na calçada, faixa de pedestre),
// montado ao longo do CAMINHO de uma cena de Domínio com as PEÇAS COPIADAS (`pecas/orbital.ts`).
// Aprovado pelo Alex na fatia de 64 m (`pipeline/pecas-codigo/cenas/fatia-orbital.ts`, 11/11).
//
// Regras: o caminho tem que ser de TRECHOS RETOS (≥ 30 m); as lojas só entram onde cabem por inteiro
// (`livre` da planta: fora das clareiras, da arena, do castelo e da borda) e sem encostar em outra loja —
// por isso as clareiras e as esquinas viram PRAÇAS sozinhas. Tudo por `seed`: as 3 cenas variam.

import { noise, type RGB } from "../kit"
import { blocked, type Cena } from "../kit-cena"
import { caixa, faixa } from "../kit-cidade"
import { mix, mul, rnd } from "../kit-natureza"
import type { Planta } from "../dominio"
import * as O from "../pecas/orbital"
import { cabe } from "./tema-fabrica"
import * as T from "./tema-orbital"

export const RUA = 6 // meia largura da avenida
export const CAL = 11 // distância do eixo à fachada das lojas (calçada de 5 m)
export const ASFALTO: RGB = [0.8, 0.8, 0.87]
export const LAJE: RGB = [0.94, 0.93, 0.95]
export const LAJE_B: RGB = [0.86, 0.86, 0.91]
const VERDE_TOLDO: RGB = [0.36, 0.76, 0.62]
const LILAS_TOLDO: RGB = [0.6, 0.48, 0.94]
const ROSA_CLARA: RGB = [1, 0.72, 0.86]
const TOLDOS: { toldo: RGB; listraClara?: RGB }[] = [{ toldo: O.AZUL_TOLDO }, { toldo: O.ROSA_TOLDO, listraClara: ROSA_CLARA }, { toldo: VERDE_TOLDO }, { toldo: LILAS_TOLDO }]

/** Cor do chão: asfalto na avenida, lajes de 2 tons no resto (a cena mistura praça/arena por cima). */
export function chaoAvenida(P: Planta, x: number, z: number): RGB {
  const d = P.dWalk(x, z)
  const laje = (Math.floor(x / 2) + Math.floor(z / 2)) % 2 ? LAJE : LAJE_B
  const asf = mix(ASFALTO, mul(ASFALTO, 0.95), noise(x * 0.15, 3.1, z * 0.15))
  const t = d < RUA - 0.3 ? 1 : d < RUA + 0.3 ? (RUA + 0.3 - d) / 0.6 : 0
  return mul(mix(laje, asf, t * (1 - P.aberto(x, z))), 0.97 + 0.05 * noise(x * 0.7, 1.7, z * 0.7))
}

/**
 * Monta a avenida inteira ao longo de `P.path`: meio-fio, lojas dos dois lados, mobiliário de calçada e
 * faixas de pedestre. Devolve quantas lojas entraram.
 */
export function avenida(c: Cena, P: Planta, lod: number, seed: number, o: { faixas?: number[] } = {}) {
  const path = P.path
  const feitos: { x: number; z: number; r: number }[] = []
  const cabeLoja = (x: number, z: number, w: number, d: number, ang: number) =>
    // lojas COLADAS: 8,2 m de passo para 8 m de frente — o teste de vizinha usa meia frente (4 m) de cada
    cabe(P.livre, x, z, w, d + 1, ang) && !feitos.some((f) => Math.hypot(f.x - x, f.z - z) < f.r + w * 0.49) && !blocked(c, x, z, 2.5)
  let n = 0
  for (let k = 0; k < path.length - 1; k++) {
    const [ax, az] = path[k], [bx, bz] = path[k + 1]
    const L = Math.hypot(bx - ax, bz - az)
    if (L < 1) continue
    const dx = (bx - ax) / L, dz = (bz - az) / L
    for (const s of [-1, 1]) {
      // normal da rua para o lado `s`; a loja olha de volta para a rua
      const nx = dz * s, nz = -dx * s
      const ang = Math.atan2(-nx, -nz)
      // meio-fio em peças de 4 m (pula a peça que cai dentro da rua de outro trecho, na esquina)
      for (let t = 2; t < L - 1; t += 4) {
        const cx = ax + dx * t + nx * (RUA + 0.18), cz = az + dz * t + nz * (RUA + 0.18)
        if (P.dWalk(cx, cz) < RUA - 0.2 || P.aberto(cx, cz) > 0.5 || P.beira(cx, cz) < 1) continue
        const g = c.geo(cx, cz)
        caixa(g, { x: cx, z: cz, y0: 0, y1: 0.16, w: 0.36, d: 4, rot: -Math.atan2(dx, dz), side: T.MARMORE, top: T.BRANCO })
        if (!lod) caixa(g, { x: cx - nx * 0.16, z: cz - nz * 0.16, y0: 0.02, y1: 0.07, w: 0.06, d: 4, rot: -Math.atan2(dx, dz), side: T.OURO, top: T.OURO })
      }
      // lojas de 8 m coladas (8,2 m de passo), com tipo, altura e cor por semente
      let j = 0
      for (let t = 5; t < L - 4; t += 8.2) {
        const w = 8, d = 7
        const x = ax + dx * t + nx * (CAL + d / 2), z = az + dz * t + nz * (CAL + d / 2)
        if (!cabeLoja(x, z, w, d, ang)) continue
        const r = (q: number) => rnd(seed + k * 31 + (s > 0 ? 7 : 0), j, q)
        const tipo = TOLDOS[Math.floor(r(1) * TOLDOS.length)]
        const outdoor = r(2) < 0.22
        O.lojaToldo(c, x, z, ang, { w, d, h: [9.6, 10.4, 11, 12][Math.floor(r(3) * 4)] + (outdoor ? 1 : 0), seed: j + k * 5, portaEsq: r(4) < 0.5, toldoTodo: outdoor || r(5) < 0.2, outdoor, ...tipo }, lod)
        feitos.push({ x, z, r: w * 0.49 })
        // placa de cristal pendurada na pilastra (uma loja sim, outra não)
        if (!lod && j % 2 === 1) {
          const px = ax + dx * (t + 4.1) + nx * (CAL - 0.05), pz = az + dz * (t + 4.1) + nz * (CAL - 0.05)
          O.placaCristal(c, px, pz, ang, 4.9, lod)
        }
        j++
        n++
      }
      // calçada: canteiro de cristal e árvore redonda alternando, a cada 10 m
      let m = 0
      for (let t = 6 + (s > 0 ? 5 : 0); t < L - 4; t += 10) {
        const x = ax + dx * t + nx * 8.6, z = az + dz * t + nz * 8.6
        if (!P.livre(x, z, 0.6) || blocked(c, x, z, 1.4)) continue
        if (m++ % 2) O.arvoreRedonda(c, x, z, 5.5, seed + k * 13 + t, lod)
        else O.canteiroCristal(c, x, z, ang, { seed: seed + k + t }, lod)
      }
    }
  }
  // faixas de pedestre (geometria 3 cm acima, nunca pintura): nos pontos `t` pedidos do caminho
  for (const t of o.faixas ?? [0.1, 0.35, 0.6]) {
    const p = P.at(t)
    if (P.aberto(p.x, p.z) > 0.2) continue
    const g = c.geo(p.x, p.z)
    const along = Math.abs(p.dx) > Math.abs(p.dz) // rua ao longo de x → faixas cruzam em z
    if (along) faixa(g, p.x - 2, p.z - RUA + 0.4, p.x + 2, p.z + RUA - 0.4, false)
    else faixa(g, p.x - RUA + 0.4, p.z - 2, p.x + RUA - 0.4, p.z + 2, true)
  }
  return n
}

/** O que o arco do fim enquadra: horizonte de prédios azulados com pontas de cristal (no pano de fundo). */
export function horizonte(c: Cena, cx: number, cz: number, ang: number, seed: number) {
  const HZ: RGB = [0.62, 0.74, 0.95]
  const fx = Math.sin(ang), fz = Math.cos(ang), sx = Math.cos(ang), sz = -Math.sin(ang)
  for (let k = -7; k <= 7; k++) {
    const u = k * 7 + (rnd(seed, k) - 0.5) * 3, v = rnd(seed, k, 2) * 10
    const x = cx + sx * u + fx * v, z = cz + sz * u + fz * v
    const h = 10 + rnd(seed, k, 3) * 16
    const cor = mix(HZ, T.BRANCO, rnd(seed, k, 4) * 0.35)
    caixa(c.fundo, { x, z, y0: 0, y1: h, w: 5 + rnd(seed, k, 5) * 3, d: 5, rot: -ang, side: cor, top: mix(cor, T.BRANCO, 0.3) })
  }
}

/**
 * QUADRAS: enche o miolo entre as fileiras de lojas e a borda com prédios altos de mármore (12–26 m, com
 * cúpula ou cristal), numa grade de `passo` m com tremor, cada um virado para a rua mais perto. Só entra o
 * que cabe por inteiro (livre da planta + sem encostar em caixa) — a cidade fica DENSA como na ref, sem
 * o mar de laje vazia. Chamar DEPOIS da `avenida` (as lojas já têm caixa).
 */
export function quadras(c: Cena, P: Planta, lod: number, seed: number, passo = 15) {
  const H = 80
  let n = 0
  for (let gx = -H + passo / 2; gx < H; gx += passo)
    for (let gz = -H + passo / 2; gz < H; gz += passo) {
      const r = (q: number) => rnd(seed, gx * 7 + gz, q)
      const x = gx + (r(1) - 0.5) * 3, z = gz + (r(2) - 0.5) * 3
      const w = 10 + r(3) * 4, d = 9 + r(4) * 3, h = 12 + r(5) * 14
      if (P.dWalk(x, z) < CAL + 4) continue
      // de frente para a rua: o lado em que a distância ao caminho cai
      const e = 2, gxw = P.dWalk(x + e, z) - P.dWalk(x - e, z), gzw = P.dWalk(x, z + e) - P.dWalk(x, z - e)
      const ang = Math.atan2(-gxw, -gzw)
      const fx = Math.sin(ang), fz = Math.cos(ang), sx = Math.cos(ang), sz = -Math.sin(ang)
      let ok = cabe(P.livre, x, z, w, d, ang) && P.beira(x, z) > Math.max(w, d) / 2 + 3.5
      for (const [u, v] of [[0, 0], [-1, -1], [1, -1], [1, 1], [-1, 1]] as const) {
        if (!ok) break
        if (blocked(c, x + sx * u * (w / 2) + fx * v * (d / 2), z + sz * u * (w / 2) + fz * v * (d / 2), 0.8)) ok = false
      }
      if (!ok) continue
      // de frente para rua/praça (a câmera alcança): a LOJA copiada, mais alta; no miolo, o prédio do tema
      if (P.dWalk(x, z) < 30) {
        const tipo = TOLDOS[Math.floor(r(6) * TOLDOS.length)]
        const outdoor = r(7) < 0.3
        O.lojaToldo(c, x, z, ang, { w: Math.min(w, 10), d, h: 11 + r(8) * 5, seed: seed + n, portaEsq: r(9) < 0.5, toldoTodo: outdoor, outdoor, ...tipo }, lod)
      } else T.predio(c, x, z, w, d, h, ang, seed + n, lod)
      n++
    }
  return n
}
