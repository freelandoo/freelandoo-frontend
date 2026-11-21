// features/meu-mundo/gincana/engine/backdrop-forja.ts — a Forja de Kragor pela MINIATURA das fases (20/11,
// `public/meu-mundo/gincana/fases/forja.webp`, `altoforno.webp`, `crosta.webp`), peça por peça (skill
// meu-mundo-cenario-codigo). Chamado de `backdrops.ts` (forge) e de `course-view.ts` (lava, paredes de brasa).
//
// FICHA
// O que é:     a forja no mar de lava: lava com crosta em placas e rachaduras acesas; o castelo de ferro
//              com janelas em grade acesas; muralhas, chaminés e vulcões; paredes de brasa de barras de ferro
//              com a fresta acesa entre elas e rebites de latão.
// Paleta:      ferro 0,12/0,1/0,1 → quina 0,3/0,24/0,2 · lava 1/0,35/0,05 → 1/0,8/0,35 · crosta 0,42/0,12/0,03 ·
//              latão 0,85/0,62/0,2.
// 70/20/10:    70 ferro escuro e crosta, 20 lava acesa, 10 latão e amarelo de perigo.
// Fora:        os personagens da miniatura.
//
// PARTES (ordem — §2)
// 1. lava (lavaCrust): textura do mar em células
// 2. paredes de brasa: fresta acesa atrás das barras, rebites, chapéu de ferro
// 3. chão: chapas com rebites nos cantos
// 4. fundo: castelo com mais janelas, torres redondas com faixas, muralhas e chaminés mais densas

import { SoftGeo, at, mix, type RGB } from "./shapes"
import { Z0, Z1, deckY, rnd, side } from "./backdrop-base"
import { wallRing, wallRun, wallH, type WallSpot } from "./backdrop-orbital"

/** 1. Crosta de lava em células (Voronoi que emenda nas bordas do ladrilho): miolo escuro → borda quente → rachadura acesa. */
export function lavaCrust(g: CanvasRenderingContext2D) {
  const S = 256
  const pts: [number, number][] = []
  for (let i = 0; i < 22; i++) pts.push([((i * 97.3 + 31) * 1.618) % S, ((i * 61.7 + 17) * 2.414) % S])
  const img = g.getImageData(0, 0, S, S)
  const d = img.data
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      let d1 = 1e9
      let d2 = 1e9
      for (const [px, py] of pts) {
        let dx = Math.abs(x - px)
        let dy = Math.abs(y - py)
        if (dx > S / 2) dx = S - dx
        if (dy > S / 2) dy = S - dy
        const dd = Math.sqrt(dx * dx + dy * dy)
        if (dd < d1) {
          d2 = d1
          d1 = dd
        } else if (dd < d2) d2 = dd
      }
      const edge = d2 - d1 // 0 na rachadura
      const k = (y * S + x) * 4
      const n = (Math.sin(x * 0.31 + y * 0.17) + Math.sin(x * 0.07 - y * 0.23)) * 0.08
      let r: number, gg: number, b: number
      if (edge < 2.2) {
        // rachadura: amarelo no meio → laranja
        const t = edge / 2.2
        r = 255
        gg = 220 - t * 90
        b = 110 - t * 90
      } else {
        // placa: borda quente (laranja) → miolo escuro (crosta), com manchas
        const t = Math.min(1, (edge - 2.2) / 11) + n
        r = 250 - t * 150
        gg = 110 - t * 80
        b = 20 - t * 12
      }
      d[k] = r
      d[k + 1] = Math.max(0, gg)
      d[k + 2] = Math.max(0, b)
      d[k + 3] = 255
    }
  }
  g.putImageData(img, 0, 0)
}


const IRON: RGB = [0.13, 0.1, 0.1]
const IRON_HI: RGB = [0.34, 0.26, 0.22]
const SOOT: RGB = [0.06, 0.05, 0.05]
const EMB: RGB = [1, 0.5, 0.1]
const BRASS: RGB = [0.85, 0.62, 0.2]

/** Janela grande em grade: vidro aceso em degradê (claro embaixo) com montantes e travessas escuras e o peitoril. */
export function gridWindow(lit: SoftGeo, glow: SoftGeo, x: number, y: number, z: number, w: number, h: number, facing = 0) {
  glow.box(w, h, 0.2, at(x, y, z, facing), (_x, yy) => mix([1, 0.85, 0.42], [1, 0.42, 0.08], (yy + h / 2) / h))
  const nx = Math.max(2, Math.round(w / 0.9))
  const ny = Math.max(2, Math.round(h / 1.1))
  const c = Math.cos(facing)
  const s = Math.sin(facing)
  const put = (lx: number, ly: number, bw: number, bh: number) => lit.box(bw, bh, 0.3, at(x + lx * c, y + ly, z - lx * s - 0.12 * c, facing), SOOT)
  for (let i = 0; i <= nx; i++) put(-w / 2 + (i * w) / nx, 0, i % nx === 0 ? 0.35 : 0.12, h + 0.3)
  for (let j = 0; j <= ny; j++) put(0, -h / 2 + (j * h) / ny, w + 0.3, j % ny === 0 ? 0.35 : 0.12)
  lit.box(w + 0.8, 0.35, 0.7, at(x, y - h / 2 - 0.2, z, facing), IRON_HI)
}

/** Torre de tambores: coluna de ferro em tambores empilhados, cada um com aro claro e fiada de rebites; topo com braseiro. */
export function drumTower(lit: SoftGeo, glow: SoftGeo, x: number, y0: number, z: number, r: number, n: number, i: number) {
  let y = y0
  for (let k = 0; k < n; k++) {
    const h = r * (1.1 + rnd(i, k) * 0.5)
    lit.cylinder(r * 2, h, at(x, y + h / 2, z), (_x, yy) => (yy > h / 2 - 0.25 ? IRON_HI : yy < -h / 2 + 0.3 ? SOOT : IRON), 12, r * 2 - 0.1)
    lit.cylinder(r * 2 + 0.3, 0.35, at(x, y + h - 0.1, z), IRON_HI, 12)
    if (k % 2 === 1) glow.cylinder(r * 2 + 0.08, 0.18, at(x, y + h * 0.45, z), EMB, 12)
    y += h
  }
  lit.cylinder(r * 2.6, 0.8, at(x, y + 0.4, z), IRON, 10, r * 2)
  glow.sphere(r * 1.6, at(x, y + 0.9, z), [1, 0.62, 0.15], 6, 1, 0.45, 1)
}

/** Casarão da forja: bloco escuro com frisos, duas fiadas de janelas em grade acesas, telhado de ameias e chaminé. */
export function forgeHall(lit: SoftGeo, glow: SoftGeo, x: number, y0: number, z: number, w: number, h: number, d: number, i: number) {
  const face = x > 0 ? -1 : 1 // a frente olha para a prova
  lit.box(d, h, w, at(x, y0 + h / 2, z), (_x, yy) => (yy > h / 2 - 0.5 ? IRON_HI : yy < -h / 2 + 2 ? SOOT : IRON))
  for (const fy of [h * 0.45, h - 1]) lit.box(d + 0.6, 0.5, w + 0.6, at(x, y0 + fy, z), IRON_HI)
  const fx = x + (face * d) / 2 + face * 0.12
  const nw = Math.max(1, Math.floor(w / 5))
  for (let r = 0; r < 2; r++) {
    for (let k = 0; k < nw; k++) {
      const wz = z - w / 2 + (k + 0.5) * (w / nw)
      gridWindow(lit, glow, fx, y0 + h * (0.27 + r * 0.38), wz, 2.4, h * 0.22, (face * Math.PI) / 2)
    }
  }
  for (let k = 0; k < Math.floor(w / 2.6); k++) lit.box(d + 0.4, 1.4, 1.4, at(x, y0 + h + 0.6, z - w / 2 + 1 + k * 2.6), IRON)
  if (i % 2 === 0) {
    lit.cylinder(2.2, h * 0.6, at(x - face * d * 0.2, y0 + h + h * 0.3, z + w * 0.3), IRON, 10, 1.8)
    glow.cylinder(1.9, 0.4, at(x - face * d * 0.2, y0 + h * 1.6, z + w * 0.3), EMB, 10)
  }
  // rebites de latão no friso de cima, da frente
  for (let k = 0; k < Math.floor(w / 1.4); k++) lit.box(0.2, 0.2, 0.2, at(fx, y0 + h - 1, z - w / 2 + 0.7 + k * 1.4), BRASS)
}

/** Fundo da Forja pela miniatura: torres de tambores e casarões em manchas dos dois lados, perto e no meio. */
export function forgeField(lit: SoftGeo, glow: SoftGeo, nk: number, arena = false) {
  const n = Math.min(1, nk)
  // 21/11: a muralha de ferro contínua — duas fileiras (a de trás mais alta) dos dois lados; na arena, em anel
  // com o vão do castelo na frente
  if (arena) {
    wallRing(34, 6, 3, (sp) => ironWall(lit, glow, sp, 6.2, wallH(sp.i, 9)), (a) => Math.abs(Math.atan2(Math.sin(a), Math.cos(a))) < 0.42)
    wallRing(46, 8, 3, (sp) => ironWall(lit, glow, sp, 8.2, wallH(sp.i + 5, 18), 0.2, true), (a) => Math.abs(Math.atan2(Math.sin(a), Math.cos(a))) < 0.55)
    return
  }
  wallRun(30, Z0 - 60, Z1 + 60, 6, deckY, (sp) => ironWall(lit, glow, sp, 6, wallH(sp.i, 10)))
  wallRun(44, Z0 - 60, Z1 + 60, 8, deckY, (sp) => ironWall(lit, glow, sp, 8, wallH(sp.i + 5, 20), 0.2, true))
  for (let z = Z0 - 30, k = 0; z < Z1 + 30; z += 18 + rnd(k, 1) * 12, k++) {
    if (rnd(k, 2) > 0.8 * n + 0.15) continue
    const y = deckY(z) - 6
    drumTower(lit, glow, side(k, 18 + rnd(k, 6) * 5), y, z, 1.6 + rnd(k, 7) * 1.2, 4 + Math.floor(rnd(k, 8) * 4), k)
    if (k % 2 === 0) drumTower(lit, glow, side(k, 22 + rnd(k, 9) * 3), y, z + 5, 1.2 + rnd(k, 10), 3 + Math.floor(rnd(k, 11) * 3), k + 50)
  }
}

// ── muralha de ferro contínua (21/11, pedido do Alex: "muros nas forjas também de ferro (...) tudo completo
// sem espaços") ──
//
// PARTES do módulo (6 m, frente = +z local, olha para a prova)
// 1. corpo de ferro que desce até a lava, com a lava acesa lambendo o pé · 2. chapas rebitadas em grade
// 3. contraforte na emenda com cintas de latão · 4. boca de forno acesa (um em cada três) com grelha
// 5. ameias e chaminé (uma em cada cinco) · 6. a 2ª fileira: blocos altos com seteiras acesas

/** O módulo da muralha da Forja. `H` acima do chão da prova; `lava` = y do mar de lava (mundo). */
export function ironWall(lit: SoftGeo, glow: SoftGeo, s: WallSpot, w: number, H: number, lava = 0.2, back = false) {
  const i = s.i
  const deep = s.y - lava + 1
  const tot = H + deep
  const L = (x: number, y: number, z: number) => at(x, y, z).multiply(s.m)
  // 1. corpo
  // o pé pega o reflexo da lava (vermelho quente nos 3 m de baixo)
  lit.box(w + 0.05, tot, 4, L(0, H - tot / 2, 0), (_x, yy) => (yy > tot / 2 - 1 ? IRON_HI : yy < -tot / 2 + 3 ? mix([0.5, 0.16, 0.05], IRON, (yy + tot / 2) / 3) : IRON))
  glow.box(w + 0.1, 0.7, 0.3, L(0, -deep + 0.3, 2.05), (_x, yy) => mix([1, 0.8, 0.3], [1, 0.3, 0.05], yy + 0.5))
  if (!back) {
    // 2. chapas rebitadas: 2 colunas × 3 fiadas, tons alternados, sombra no pé de cada chapa
    const ph = (H - 1.6) / 3
    for (let r = 0; r < 3; r++) {
      for (const c of [-1, 1]) {
        const cx = (c * w) / 4
        const cy = 0.4 + ph * (r + 0.5)
        const tone: RGB = (r + (c > 0 ? 1 : 0) + i) % 2 ? mix(IRON, IRON_HI, 0.62) : mix(IRON, IRON_HI, 0.4)
        if ((i % 3 === 1) && r === 0) continue // a boca de forno ocupa a fiada de baixo
        lit.box(w / 2 - 0.35, ph - 0.3, 0.2, L(cx, cy, 2.1), (_x, yy) => (yy > ph / 2 - 0.45 ? mix(tone, IRON_HI, 0.5) : yy < -ph / 2 + 0.35 ? SOOT : tone))
        for (const rx of [-1, 1]) for (const ry of [-1, 1]) lit.box(0.16, 0.16, 0.12, L(cx + rx * (w / 4 - 0.45), cy + ry * (ph / 2 - 0.4), 2.26), BRASS)
      }
    }
  } else {
    // 6. 2ª fileira: seteiras acesas em duas fiadas
    for (const fy of [0.45, 0.72]) for (let k = 0; k < 3; k++) glow.box(0.5, 1.6, 0.1, L(-w / 3 + (k * w) / 3, H * fy, 2.05), (_x, yy) => mix([1, 0.85, 0.4], [1, 0.4, 0.08], yy + 0.5))
  }
  // 3. contraforte na emenda
  lit.box(1.4, tot + 1.2, 5.2, L(-w / 2, H + 0.6 - (tot + 1.2) / 2, 0.4), (_x, yy) => (yy > (tot + 1.2) / 2 - 0.5 ? IRON_HI : IRON))
  for (const by of [H * 0.3, H * 0.75]) lit.box(1.6, 0.35, 5.4, L(-w / 2, by, 0.4), BRASS)
  // 4. boca de forno
  if (!back && i % 3 === 1) {
    const bh = H * 0.36
    glow.box(w - 2.2, bh, 0.2, L(0.3, bh / 2 + 0.2, 1.95), (_x, yy) => mix([1, 0.92, 0.5], [1, 0.32, 0.05], yy / bh + 0.5))
    for (let b = 0; b < 5; b++) lit.box(0.14, bh, 0.25, L(0.3 - (w - 2.2) / 2 + (b + 0.5) * ((w - 2.2) / 5), bh / 2 + 0.2, 2.15), SOOT)
    lit.box(w - 1.6, 0.6, 0.6, L(0.3, bh + 0.5, 2.1), IRON_HI)
    lit.box(w - 1.6, 0.3, 0.8, L(0.3, 0.15, 2.2), IRON_HI)
  }
  // 5. ameias e chaminé
  lit.box(w + 0.3, 0.5, 4.4, L(0, H + 0.25, 0), IRON_HI)
  for (let k = 0; k < 2; k++) lit.box(1.5, 1.4, 4.2, L(-w / 4 + (k * w) / 2 + 0.4, H + 1.2, 0), (_x, yy) => (yy > 0.5 ? IRON_HI : IRON))
  if (i % 5 === 3) {
    const ch = H + 12 + (i % 10 === 3 ? 6 : 0)
    lit.cylinder(2.6, ch, at(0, ch / 2, -1).multiply(s.m), (_x, yy) => (yy > ch / 2 - 1 ? IRON_HI : IRON), 10, 2.2)
    for (const by of [ch * 0.55, ch * 0.8]) lit.cylinder(2.8, 0.4, at(0, by, -1).multiply(s.m), BRASS, 10)
    glow.cylinder(2.1, 0.5, at(0, ch + 0.1, -1).multiply(s.m), EMB, 10)
  }
}
