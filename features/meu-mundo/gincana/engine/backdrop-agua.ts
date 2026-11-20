// features/meu-mundo/gincana/engine/backdrop-agua.ts — a água dos fundos em código (20/11): o reflexo de uma luz
// (sol, lua, farol), a espuma onde a pedra entra na água e os anéis acesos do pântano. Tudo na malha acesa
// (`glow`, 1 chamada) e plano na linha d'água (y 0): sem imagem, sem espelho (desenhar a cena 2× derruba o celular).

import { at, mix, type RGB, type SoftGeo } from "./shapes"
import { rnd } from "./backdrop-base"

/** Um tracinho de reflexo que afina nas pontas (miolo largo + 2 pontas finas; o retângulo só de perto parecia caco). */
export function glint(glow: SoftGeo, x: number, y: number, z: number, len: number, w: number, c: RGB, yaw = 0) {
  if (len < 0.3) return
  const cs = Math.cos(yaw)
  const sn = Math.sin(yaw)
  glow.box(len * 0.5, 0.04, w, at(x, y, z, yaw), c)
  const tip = mix(c, [1, 1, 1], 0.15)
  for (const d of [-1, 1]) glow.box(len * 0.3, 0.04, w * 0.42, at(x + d * len * 0.38 * cs, y, z - d * len * 0.38 * sn, yaw), tip)
}

export type LightPath = {
  /** x da luz lá longe e x perto da largada (a faixa vem da luz até quem olha). */
  xFar: number
  xNear: number
  z0: number
  z1: number
  /** z da luz (a faixa engrossa e enche perto dela). */
  srcZ: number
  core: RGB
  edge: RGB
  /** meia-largura perto e longe. */
  hwNear: number
  hwFar: number
  step?: number
  /** tracinhos a mais por fileira perto da luz. */
  fill?: number
  /** espessura do tracinho perto (cresce para longe). */
  w?: number
}

/** O reflexo de uma luz baixa: fileiras de tracinhos do horizonte até a largada, mais densas e quentes perto da luz. */
export function lightPath(glow: SoftGeo, p: LightPath, seed = 0) {
  const step = p.step ?? 1.2
  for (let z = p.z0, i = 0; z < p.z1; z += step, i++) {
    const u = Math.max(0, Math.min(1, (z - p.z0) / (p.srcZ - p.z0)))
    const hw = p.hwNear + u * (p.hwFar - p.hwNear)
    const cx = p.xNear + u * (p.xFar - p.xNear)
    const nRow = 1 + Math.floor(u * u * (p.fill ?? 6) + rnd(i + seed, 1) * 2)
    for (let k = 0; k < nRow; k++) {
      const v = rnd(i + seed, 2 + k) * 2 - 1
      const dx = v * Math.abs(v) * hw
      const edge = Math.abs(dx) / hw
      const len = (1 + rnd(i + seed, 5 + k) * (2 + u * 6)) * (1.1 - edge)
      const c = mix(mix(p.core, p.edge, edge), [1, 1, 1], rnd(i + seed, 7 + k) > 0.88 ? 0.5 : 0)
      glint(glow, cx + dx, 0.07, z + rnd(i + seed, 8 + k) * step * 0.7, len, (p.w ?? 0.22) * (1 + u * 1.8), c)
    }
  }
}

/** Reflexo curto de uma luz perto (farol, lampião): coluna de tracinhos da base da luz em direção à câmera (-z). */
export function lampStreak(glow: SoftGeo, x: number, z: number, len: number, c: RGB, seed: number) {
  for (let k = 0, d = 0; d < len; k++) {
    const t = d / len
    const w = (1 - t * 0.7) * (1.2 + rnd(seed, k) * 1.4)
    glint(glow, x + (rnd(seed, 20 + k) - 0.5) * 0.8 * (1 + t), 0.07, z - d, w, 0.16 + 0.12 * (1 - t), mix(c, [0.5, 0.45, 0.6], t * 0.6))
    d += 0.7 + rnd(seed, 40 + k) * 0.9 + t * 1.2
  }
}

/** Espuma acesa onde a pedra entra na água: anel de placas tangentes + 2º anel mais largo e ralo. */
export function foamRing(glow: SoftGeo, x: number, z: number, r: number, seed: number, c: RGB = [0.9, 0.96, 0.98]) {
  const n = Math.max(9, Math.round(r * 3.4))
  for (let k = 0; k < n; k++) {
    const a = (k / n) * Math.PI * 2 + rnd(seed, k) * 0.3
    const rr = r * (1.02 + rnd(seed, 20 + k) * 0.1)
    glow.box(1.1 + rnd(seed, 40 + k) * 1.2, 0.04, 0.5 + rnd(seed, 50 + k) * 0.5, at(x + Math.cos(a) * rr, 0.06, z + Math.sin(a) * rr, -a + Math.PI / 2), c)
  }
  for (let k = 0; k < n; k += 2) {
    const a = (k / n) * Math.PI * 2 + 0.4
    const rr = r * 1.3 + rnd(seed, 60 + k) * r * 0.25
    glow.box(1.2 + rnd(seed, 70 + k) * 1.4, 0.03, 0.26, at(x + Math.cos(a) * rr, 0.05, z + Math.sin(a) * rr, -a + Math.PI / 2), mix(c, [0.4, 0.6, 0.65], 0.35))
  }
}

/** Pé de cachoeira: chapa de espuma batida (placas soltas em leque) + anéis que se abrem. */
export function fallSplash(glow: SoftGeo, x: number, z: number, seed: number) {
  for (let k = 0; k < 14; k++) {
    const a = rnd(seed, k) * Math.PI * 2
    const r = 0.6 + rnd(seed, 10 + k) * 2.6
    glow.box(0.8 + rnd(seed, 20 + k) * 1.4, 0.05, 0.5 + rnd(seed, 30 + k) * 0.6, at(x + Math.cos(a) * r, 0.08, z + Math.sin(a) * r, rnd(seed, 40 + k) * 3), [0.95, 0.98, 1])
  }
  foamRing(glow, x, z, 3.6, seed + 7)
  foamRing(glow, x, z, 6, seed + 9, [0.7, 0.86, 0.92])
}

/** Anel aceso na água (pântano): 2–3 círculos finos que se abrem e apagam para fora. */
export function glowRipple(glow: SoftGeo, x: number, z: number, r: number, c: RGB, rings = 3) {
  for (let k = 0; k < rings; k++) {
    const rr = r * (1 + k * 0.65)
    glow.torus(rr * 2, 0.1 + 0.05 * (rings - k), at(x, 0.05, z), mix(c, [0.03, 0.2, 0.12], k * 0.3), 12)
  }
}
