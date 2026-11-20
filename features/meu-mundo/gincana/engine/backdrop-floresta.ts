// features/meu-mundo/gincana/engine/backdrop-floresta.ts — o fundo da Floresta da Lua pelas MINIATURAS (20/11).
//
// FICHA (miniaturas floresta/clareira/serraria.webp — as 3 fases dividem este fundo)
// O que é:   pântano à noite fechado por uma MURALHA de troncos retos e altos (a copa some acima da foto), pilares
//            de pedra roxa com manto de musgo que escorre, cogumelos-luminária rosa, vaga-lumes e anéis verdes na
//            água; ao fundo, mais troncos azulados na névoa roxa e a lua. Nada de pântano liso à vista.
// Massas:    tronco alto (d 2,4–4 m, 45–70 m) em 3 fileiras (|x| 15–30 / 30–60 / 60–110); pilar de musgo (d 8–12,
//            h 8–14) a cada ~35 m; cogumelo-luminária (h 2–5) nas beiras; pilhas de toras (serraria); silhuetas.
// Paleta:    casca 0,10–0,40 marrom (sulco escuro, crista clara); pedra 0,2–0,5 roxo-azulada; musgo 0,15–0,6 verde;
//            luz: rosa 1/0,4/0,85, verde-neon 0,5/1/0,6, âmbar dos vaga-lumes 1/0,85/0,35.
// Fora:      personagens; a casa/ponte da serraria é da fase (serraria-view), não do fundo.
//
// PARTES (ordem de construção, uma por rodada de foto)
// 1. tronco alto (`tallTrunk`) — ~700 tri — grande: fuste e raízes-escora; médio: sulcos, cintas de musgo;
//    pequeno: tufos de musgo, fungos-prateleira acesos.
// 2. pilar de musgo (`mossDrum`) — ~900 tri — tambores de pedra, manto de musgo, fios que escorrem com gota acesa.
// 3. cogumelo-luminária (`shroomLamp`) — ~400 tri — chapéu com pintas, lado de baixo aceso, pé, ilhota.
// 4. pilha de toras (`logPile`) — ~500 tri.
// 5. muralha distante (`farWall`) — silhuetas azuladas baratas + névoa.
// 6. vaga-lumes e anéis na água.
//
// Andamento: (uma linha por parte fechada)

import { Vector3 } from "@babylonjs/core/Maths/math.vector"
import { at, mix, type RGB, type SoftGeo } from "./shapes"
import { rnd } from "./backdrop-base"

/** Casca em sulcos verticais: sulco quase preto, crista clara; musgo sobe do pé; mancha de líquen. */
function barkGrooves(seed: number, mossTo: number) {
  return (x: number, y: number, z: number): RGB => {
    const a = Math.atan2(z, x)
    const g = Math.sin(a * 11 + Math.sin(y * 0.18 + seed) * 1.6 + seed)
    const base: RGB = g > 0.55 ? [0.36, 0.22, 0.15] : g < -0.45 ? [0.07, 0.045, 0.04] : [0.2, 0.12, 0.085]
    const moss = y < mossTo + Math.sin(a * 5 + seed) * 1.2
    if (moss) return mix(base, [0.18, 0.42, 0.2], g > 0 ? 0.75 : 0.5)
    const lichen = Math.sin(y * 0.9 + seed * 2) * Math.cos(a * 3 + seed) > 0.8
    return lichen ? mix(base, [0.32, 0.4, 0.42], 0.5) : base
  }
}

/**
 * Tronco alto e reto da miniatura: fuste que afina pouco (leve curva), 6 raízes-escora que abrem no pântano,
 * cinta de musgo no pé, fungos-prateleira acesos (2–3) e um galho alto quebrado. A copa fica acima da foto
 * (uma massa escura bem alta, só para fechar o céu de cima quando a câmera sobe).
 */
export function tallTrunk(lit: SoftGeo, glow: SoftGeo, x: number, z: number, h: number, d: number, i: number, y0 = -1.5) {
  const bark = barkGrooves(i, y0 + 2.5 + rnd(i, 3) * 2)
  const segs = 6
  const pts: Vector3[] = []
  const bendX = (rnd(i, 4) - 0.5) * d * 0.9
  const bendZ = (rnd(i, 5) - 0.5) * d * 0.9
  for (let k = 0; k <= segs; k++) {
    const u = k / segs
    pts.push(new Vector3(x + Math.sin(u * 2.2) * bendX, y0 + u * h, z + Math.sin(u * 1.7) * bendZ))
  }
  for (let k = 0; k < segs; k++) {
    const r0 = (d / 2) * (1 - (k / segs) * 0.35)
    lit.tube(pts[k], pts[k + 1], r0, bark, 12)
  }
  // raízes-escora: saem do tronco a ~2,5 m, abrem e afundam no pântano (com joelho)
  const nr = 6
  for (let k = 0; k < nr; k++) {
    const a = (k / nr) * Math.PI * 2 + rnd(i, 10 + k) * 0.5
    const spread = d * (1.3 + rnd(i, 20 + k) * 0.8)
    const top = new Vector3(x + Math.cos(a) * d * 0.25, y0 + 2.6 + rnd(i, 30 + k) * 1.4, z + Math.sin(a) * d * 0.25)
    const knee = new Vector3(x + Math.cos(a) * spread * 0.6, y0 + 1.4, z + Math.sin(a) * spread * 0.6)
    const foot = new Vector3(x + Math.cos(a) * spread, y0 - 0.3, z + Math.sin(a) * spread)
    lit.tube(top, knee, d * 0.22, bark, 8)
    lit.tube(knee, foot, d * 0.15, bark, 7)
    // sombra de contato: poça escura onde a raiz entra na água
    lit.cylinder(d * 0.55, 0.06, at(foot.x, y0 + 1.45, foot.z), [0.03, 0.07, 0.05], 8)
  }
  // fungos-prateleira acesos, em escada num lado do tronco
  const fa = rnd(i, 40) * Math.PI * 2
  const nf = 2 + (i % 2)
  for (let f = 0; f < nf; f++) {
    const fy = y0 + 4 + f * 1.3 + rnd(i, 41 + f) * 0.6
    const aa = fa + f * 0.5
    const r = (d / 2) * 0.97
    const px = x + Math.cos(aa) * r
    const pz = z + Math.sin(aa) * r
    glow.sphere(0.9 - f * 0.15, at(px, fy, pz, -aa), (_x, yy): RGB => (yy > 0 ? [0.95, 0.75, 0.4] : [0.5, 1, 0.65]), 6, 1.2, 0.28, 1)
  }
  // galho alto quebrado (quebra a silhueta reta)
  const bk = pts[segs - 2]
  const ba = rnd(i, 50) * Math.PI * 2
  const bl = d * (1.6 + rnd(i, 51))
  lit.tube(bk, new Vector3(bk.x + Math.cos(ba) * bl, bk.y + bl * 0.5, bk.z + Math.sin(ba) * bl), d * 0.14, bark, 6)
  // copa escura bem alta (fecha o céu quando a câmera sobe)
  const tp = pts[segs]
  for (let c = 0; c < 3; c++) {
    const ca = (c / 3) * Math.PI * 2 + i
    lit.sphere(d * 3.4, at(tp.x + Math.cos(ca) * d * 1.2, tp.y + c * 0.8, tp.z + Math.sin(ca) * d * 1.2), (_x, yy): RGB => (yy > 0 ? [0.1, 0.24, 0.2] : [0.03, 0.08, 0.07]), 8, 1, 0.55, 1)
  }
}
