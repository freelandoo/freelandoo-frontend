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
function barkGrooves(seed: number, mossTo: number, yOff = 0) {
  return (x: number, yl: number, z: number): RGB => {
    const y = yl + yOff
    const a = Math.atan2(z, x)
    const g = Math.sin(a * 7 + Math.sin(y * 0.18 + seed) * 1.6 + seed)
    const base: RGB = g > 0.55 ? [0.52, 0.33, 0.21] : g < -0.45 ? [0.09, 0.055, 0.045] : [0.29, 0.18, 0.12]
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
  const mossTo = y0 + 2.5 + rnd(i, 3) * 2
  // a pintura recebe o y LOCAL de cada gomo: cada gomo leva o seu deslocamento (y do meio)
  const bark = barkGrooves(i, mossTo, y0 + 2)
  const segs = 7
  const pts: Vector3[] = []
  const bendX = (rnd(i, 4) - 0.5) * d * 0.9
  const bendZ = (rnd(i, 5) - 0.5) * d * 0.9
  for (let k = 0; k <= segs; k++) {
    const u = k / segs
    pts.push(new Vector3(x + Math.sin(u * 2.2) * bendX, y0 + u * h, z + Math.sin(u * 1.7) * bendZ))
  }
  for (let k = 0; k < segs; k++) {
    const r0 = (d / 2) * (1 - (k / segs) * 0.35)
    lit.tube(pts[k], pts[k + 1], r0, barkGrooves(i, mossTo, (pts[k].y + pts[k + 1].y) / 2), 14)
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
    lit.sphere(d * 0.4, at(knee.x, knee.y, knee.z), bark, 5)
    lit.tube(knee, foot, d * 0.16, bark, 7)
    // sombra de contato: poça escura onde a raiz entra na água
    lit.cylinder(d * 0.55, 0.06, at(foot.x, y0 + 1.45, foot.z), [0.03, 0.07, 0.05], 6)
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
    lit.sphere(d * 3.4, at(tp.x + Math.cos(ca) * d * 1.2, tp.y + c * 0.8, tp.z + Math.sin(ca) * d * 1.2), (_x, yy): RGB => (yy > 0 ? [0.1, 0.24, 0.2] : [0.03, 0.08, 0.07]), 6, 1, 0.55, 1)
  }
}

/** Pedra roxo-azulada em tambores: junta escura entre tambores, mancha clara (líquen) e pé escuro (sombra de contato). */
function drumStone(seed: number, yOff: number, h: number) {
  return (x: number, yl: number, z: number): RGB => {
    const y = yl + yOff
    const a = Math.atan2(z, x)
    const k = Math.max(0, Math.min(1, y / h))
    let c = mix([0.24, 0.21, 0.4], [0.58, 0.52, 0.8], 0.25 + k * 0.75)
    const crack = Math.sin(a * 5 + y * 0.9 + seed) > 0.8
    const lichen = Math.sin(a * 3 + seed * 2) * Math.cos(y * 0.8 + seed) > 0.7
    if (crack) c = mix(c, [0.05, 0.04, 0.1], 0.6)
    else if (lichen) c = mix(c, [0.36, 0.48, 0.4], 0.45)
    return y < 0.6 ? mix(c, [0.04, 0.05, 0.06], 0.6) : c
  }
}

/**
 * Pilar de musgo da miniatura: 3–4 tambores de pedra empilhados (cada um um pouco girado e mais estreito, com
 * a quina de cima clara e a junta escura), manto de musgo grosso em cima que transborda em gomos, fios de musgo
 * que escorrem pela pedra (2–5 m) com a gota acesa na ponta, e tufos/brotos no topo.
 */
export function mossDrum(lit: SoftGeo, glow: SoftGeo, x: number, z: number, w: number, h: number, i: number) {
  const nd = 3 + (i % 2)
  let y = -1.2
  let ww = w
  const dh = (h + 1.2) / nd
  for (let p = 0; p < nd; p++) {
    const ox = Math.sin(p * 2.3 + i) * 0.35
    const oz = Math.cos(p * 1.7 + i) * 0.35
    // o tambor em fatias de ~1 m: a pintura só varia onde há vértice
    const nsl = Math.max(2, Math.round(dh))
    const sl = (dh - 0.12) / nsl
    for (let q = 0; q < nsl; q++) {
      const yc = y + sl * (q + 0.5)
      const w0 = ww * (1 - (q / nsl) * 0.03)
      lit.cylinder(w0, sl, at(x + ox, yc, z + oz, p * 0.7 + i), drumStone(i + p, yc, h), 14, ww * (1 - ((q + 1) / nsl) * 0.03))
    }
    lit.torus(ww * 0.97, 0.16, at(x + ox, y + dh - 0.1, z + oz), [0.52, 0.48, 0.7], 12)
    lit.cylinder(ww * 0.93, 0.14, at(x + ox, y + dh - 0.02, z + oz), [0.06, 0.05, 0.1], 12)
    y += dh
    ww *= 0.93
  }
  // manto de musgo: tampa grossa + gomos que transbordam pela borda
  const mossTop = (_x: number, yy: number): RGB => (yy > 0.15 ? [0.3, 0.62, 0.28] : yy > -0.2 ? [0.17, 0.44, 0.22] : [0.08, 0.26, 0.14])
  lit.cylinder(ww * 1.06, 1.1, at(x, y + 0.35, z), mossTop, 16, ww * 0.9)
  // gomos achatados e emendados (um manto, não bolinhas), uns mais caídos que outros
  const ng = 22
  for (let k = 0; k < ng; k++) {
    const a = (k / ng) * Math.PI * 2 + i * 0.3
    const rr = ww * 0.5
    const drop = rnd(i, 310 + k) * 0.9
    lit.sphere(2 + rnd(i, 300 + k) * 0.8, at(x + Math.cos(a) * rr, y + 0.1 - drop, z + Math.sin(a) * rr, Math.PI / 2 - a), mossTop, 5, 1.3, 0.5 + drop * 0.6, 0.55)
  }
  // fios de musgo escorrendo, com a gota acesa
  const nf = 22
  for (let k = 0; k < nf; k++) {
    const a = (k / nf) * Math.PI * 2 + rnd(i, 320 + k) * 0.4
    const rr = ww * 0.53
    const len = 1.2 + rnd(i, 330 + k) * 4.5
    const fx = x + Math.cos(a) * rr
    const fz = z + Math.sin(a) * rr
    const top = new Vector3(fx, y - 0.2, fz)
    const mid = new Vector3(fx + Math.cos(a) * 0.25, y - 0.2 - len * 0.55, fz + Math.sin(a) * 0.25)
    const end = new Vector3(fx + Math.cos(a) * 0.15, y - 0.2 - len, fz + Math.sin(a) * 0.15)
    lit.tube(top, mid, 0.2, [0.16, 0.42, 0.2], 5)
    lit.tube(mid, end, 0.12, [0.12, 0.34, 0.17], 5)
    if (k % 2 === 0) glow.sphere(0.32, at(end.x, end.y - 0.1, end.z), [0.55, 1, 0.6], 5, 1, 1.4, 1)
  }
  // brotos e uma samambaia no topo (quebra a tampa reta)
  for (let k = 0; k < 5; k++) {
    const a = rnd(i, 340 + k) * Math.PI * 2
    const rr = rnd(i, 350 + k) * ww * 0.35
    // tufo: 3 folhas em pé, cruzadas (não bola)
    for (let l = 0; l < 3; l++) lit.sphere(0.9 + rnd(i, 360 + k) * 0.6, at(x + Math.cos(a) * rr, y + 1.25, z + Math.sin(a) * rr, (l * Math.PI) / 3 + a, 0, 0.25 * (l - 1)), (_x, yy): RGB => (yy > 0 ? [0.4, 0.72, 0.3] : [0.16, 0.42, 0.2]), 5, 0.22, 1.4, 1)
  }
  // sombra de contato + anel de luz verde na água
  lit.cylinder(w * 1.35, 0.05, at(x, 0.02, z), [0.03, 0.08, 0.06], 16)
  glow.torus(w * 1.25, 0.08, at(x, 0.08, z), [0.4, 1, 0.55], 14)
}

/**
 * Cogumelo-luminária da miniatura: chapéu em domo que brilha (rosa forte no alto → rosa-claro na aba, com pintas
 * claras e o lado de baixo com lamelas mais escuras), pé grosso creme que engrossa na base, e a ilhota de lodo
 * escura com tufos onde ele nasce; 1 em cada 4 é ciano. Às vezes em par (um grande e um pequeno).
 */
export function shroomLamp(lit: SoftGeo, glow: SoftGeo, x: number, z: number, h: number, i: number, y0 = 0) {
  const cyan = i % 4 === 3
  const top: RGB = cyan ? [0.3, 0.95, 1] : [1, 0.32, 0.78]
  const rim: RGB = cyan ? [0.8, 1, 1] : [1, 0.78, 0.95]
  // ilhota de lodo e tufos
  lit.cylinder(h * 0.9 + 1, 0.7, at(x, y0 + 0.1, z, i), (xx, yy, zz): RGB => (yy > 0.2 ? (Math.sin(xx * 3 + zz * 2) > 0.3 ? [0.2, 0.36, 0.16] : [0.12, 0.24, 0.13]) : [0.05, 0.1, 0.07]), 9, h * 0.9 + 1.8)
  lit.sphere(h * 0.6 + 0.6, at(x - h * 0.4, y0 + 0.35, z + h * 0.3, i), [0.1, 0.2, 0.11], 6, 1, 0.35, 0.8)
  for (let k = 0; k < 4; k++) {
    const a = (k / 4) * Math.PI * 2 + i
    for (let l = 0; l < 3; l++) lit.sphere(0.8, at(x + Math.cos(a) * (h * 0.4 + 0.4), y0 + 0.75, z + Math.sin(a) * (h * 0.4 + 0.4), a + l, 0, 0.3 * (l - 1)), (_x, yy): RGB => (yy > 0 ? [0.36, 0.66, 0.28] : [0.14, 0.38, 0.18]), 5, 0.18, 1.3, 1)
  }
  for (let m = 0; m < (i % 3 === 0 ? 2 : 1); m++) {
    const hh = m ? h * 0.55 : h
    const mx = x + (m ? h * 0.55 : 0)
    const mz = z + (m ? h * 0.3 : 0)
    // pé: engrossa na base, creme com um anel (véu)
    lit.cylinder(hh * 0.34, hh, at(mx, y0 + 0.45 + hh / 2, mz), (_x, yy): RGB => mix([0.62, 0.58, 0.52], [0.95, 0.92, 0.84], yy / hh + 0.5), 10, hh * 0.22)
    lit.torus(hh * 0.2, 0.08, at(mx, y0 + 0.45 + hh * 0.7, mz), [0.85, 0.8, 0.72], 8)
    const cw = hh * 1.05
    const cy = y0 + 0.45 + hh
    // chapéu aceso (domo) + lado de baixo com lamelas
    glow.sphere(cw, at(mx, cy, mz), (_x, yy): RGB => mix(rim, top, Math.min(1, Math.max(0, yy / (cw * 0.3) + 0.2))), 12, 1, 0.62, 1)
    lit.cylinder(cw * 0.94, 0.08, at(mx, cy - 0.02, mz), (xx, _y, zz): RGB => (Math.sin(Math.atan2(zz, xx) * 14) > 0 ? [0.42, 0.2, 0.36] : [0.25, 0.1, 0.22]), 16, cw * 0.3)
    // pintas claras no alto
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2 + i + m
      const rr = cw * (0.22 + (k % 2) * 0.12)
      glow.sphere(cw * 0.1, at(mx + Math.cos(a) * rr, cy + cw * 0.27 - (k % 2) * cw * 0.05, mz + Math.sin(a) * rr), [1, 0.96, 0.98], 4, 1, 0.5, 1)
    }
    // luz na água (reflexo/anel)
    glow.torus(cw * 1.6, 0.06, at(mx, y0 + 0.05, mz), top, 12)
  }
}

/**
 * Tronco do fundo (2ª e 3ª fileiras): o mesmo desenho do `tallTrunk` em versão barata — 4 gomos de 9 faces,
 * 4 raízes, sulcos pela mesma casca e a copa escura no alto. Quanto mais longe (`far`), mais azulado/arroxeado
 * (perspectiva aérea da névoa roxa da miniatura).
 */
export function farTrunk(lit: SoftGeo, x: number, z: number, h: number, d: number, i: number, far: number, y0 = -1.5) {
  const fog: RGB = [0.22, 0.17, 0.36]
  const tint = (p: (x: number, y: number, z: number) => RGB) => (xx: number, yy: number, zz: number): RGB => mix(p(xx, yy, zz), fog, far)
  const mossTo = y0 + 2 + rnd(i, 3) * 2
  const segs = 4
  let prev = new Vector3(x, y0, z)
  for (let k = 1; k <= segs; k++) {
    const u = k / segs
    const p = new Vector3(x + Math.sin(u * 2 + i) * d * 0.3, y0 + u * h, z + Math.cos(u * 1.6 + i) * d * 0.3)
    lit.tube(prev, p, (d / 2) * (1 - ((k - 1) / segs) * 0.35), tint(barkGrooves(i, mossTo, (prev.y + p.y) / 2)), 9)
    prev = p
  }
  for (let k = 0; k < 4; k++) {
    const a = (k / 4) * Math.PI * 2 + rnd(i, 10 + k)
    const foot = new Vector3(x + Math.cos(a) * d * 1.7, y0 - 0.3, z + Math.sin(a) * d * 1.7)
    lit.tube(new Vector3(x + Math.cos(a) * d * 0.2, y0 + 3, z + Math.sin(a) * d * 0.2), foot, d * 0.2, tint(barkGrooves(i, mossTo, y0 + 1.5)), 6)
  }
  lit.sphere(d * 4, at(prev.x, prev.y, prev.z), (_x, yy): RGB => mix(yy > 0 ? [0.1, 0.24, 0.2] : [0.03, 0.08, 0.07], fog, far * 0.7), 7, 1, 0.5, 1)
}

/**
 * Muralha distante (camada 5): a mata vista na névoa roxa — troncos de 6 faces bem escuros e azulados, copas
 * achatadas que se emendam numa linha de horizonte quebrada, nos dois lados (|x| 135–175) e atrás da chegada.
 * Fecha o céu cor de pêssego do horizonte, que a miniatura não tem.
 */
export function farWall(lit: SoftGeo, z0: number, z1: number) {
  const col = (k: number) => (_x: number, yy: number): RGB => mix([0.1, 0.08, 0.2], [0.24, 0.19, 0.38], Math.max(0, Math.min(1, yy * k + 0.5)))
  const tree = (x: number, z: number, i: number) => {
    const h = 45 + rnd(i, 1) * 35
    const d = 4 + rnd(i, 2) * 4
    lit.cylinder(d, h, at(x, h / 2 - 2, z), col(0), 6, d * 0.6)
    lit.sphere(d * 4.5, at(x, h - 2, z), col(0.3), 6, 1, 0.45 + rnd(i, 3) * 0.3, 1)
  }
  let i = 0
  for (let z = z0 - 40; z < z1 + 80; z += 8) for (const s of [-1, 1]) tree(s * (135 + rnd(i, 4) * 40), z + rnd(i, 5) * 6, i++)
  for (let x = -170; x <= 170; x += 9) tree(x + rnd(i, 6) * 5, z1 + 70 + rnd(i, 7) * 30, i++)
  for (let x = -170; x <= 170; x += 9) tree(x + rnd(i, 6) * 5, z0 - 90 - rnd(i, 7) * 30, i++)
}
