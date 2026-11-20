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
export function forgeField(lit: SoftGeo, glow: SoftGeo, nk: number) {
  const n = Math.min(1, nk)
  for (let z = Z0 - 30, k = 0; z < Z1 + 30; z += 18 + rnd(k, 1) * 12, k++) {
    if (rnd(k, 2) > 0.8 * n + 0.15) continue
    const y = deckY(z) - 6
    if (k % 3 === 2) forgeHall(lit, glow, side(k, 30 + rnd(k, 3) * 14), y, z, 12 + rnd(k, 4) * 8, 14 + rnd(k, 5) * 10, 8, k)
    else {
      drumTower(lit, glow, side(k, 19 + rnd(k, 6) * 10), y, z, 1.6 + rnd(k, 7) * 1.2, 4 + Math.floor(rnd(k, 8) * 4), k)
      if (k % 2 === 0) drumTower(lit, glow, side(k, 23 + rnd(k, 9) * 8), y, z + 5, 1.2 + rnd(k, 10), 3 + Math.floor(rnd(k, 11) * 3), k + 50)
    }
  }
}
