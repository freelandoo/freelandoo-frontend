// features/meu-mundo/paint/engine/arenas/orbital.ts — PAINT (2026-11-21): o desenho das HÉLICES DO PRISMA (Íris).
//
// FICHA
// O que é:   a Cidade Orbital de Íris (a deusa do Paint) ao entardecer violeta: praças de vidro sobre cones de aço
//            com aros acesos, a ESCADA SEM CHÃO de degraus soltos com propulsor embaixo, e no meio a grande HÉLICE:
//            pás de aço e vidro em volta do eixo (pilar), presas por braços, até a coroa do Palácio Prisma.
// Silhueta:  eixo vertical com anéis dourados; pás em leque em dois anéis; coroa com pontas douradas; no fundo
//            ilhas orbitais com prédios brancos, torres de neon e o planeta com anel.
// Massas:    eixo r 2,8 × 23 m; pás 6–8 m de largura; praça 10 m; ilhas do fundo 8–30 m.
// Paleta:    aço azul-noite 0,17/0,16/0,3 com quina 0,34/0,32/0,5; vidro claro 0,86/0,9/1; dourado 0,98/0,82/0,42;
//            neon magenta 1/0,3/0,8 e ciano 0,3/0,9/1 (o acento, 10%); âmbar nas lâmpadas.
// Fora:      a hélice que gira (a regra é parada; só os anéis de luz e o planeta se mexem).
// Inventado: os braços que prendem cada pá ao eixo e os propulsores acesos sob os degraus.
//
// PARTES (ordem do plano)
// 1. chão de vidro (`tileTex("glass")`) + cor por tag (vidro claro, pá de aço, coroa dourada)
// 2. embaixo: nuvens violeta (o comum)
// 3. casco: TUDO daqui — placa de vidro sobre cone de aço em gomos com aro aceso (praças), lajinha com propulsor
//    (degraus), cristal invertido (estilhaços e prisma), esfera (orbes), lente
// 4. o eixo (prop `axle`): fuste de aço, anéis dourados, filetes de neon, a praça do eixo embaixo (máquina)
// 5. tags: pá (laje de aço com filete aceso na borda de fora e braço até o eixo)
// 6. base: aro com lâmpadas (`orbitalRim` da Gincana), postes, a gema de Íris
// 7. topo: a coroa do Palácio Prisma (pontas douradas, cone até o eixo)
// 8. fundo: ilhas orbitais em três anéis, torres de neon, o planeta com anel
//
// Andamento (21/11, fotos no harness C:/wt/ph):
// 1–8 de uma vez na 1ª; o chão dos degraus e da passarela "vazado" era o bug comum do retângulo
// (`floorOf`, arena-view) — corrigido lá. 6 gema: no meio da praça → na borda de fora (2ª).

import { Matrix } from "@babylonjs/core/Maths/math.vector"
import type { Mesh } from "@babylonjs/core/Meshes/mesh"
import { SoftGeo, at } from "../../../gincana/engine/shapes"
import { orbIsland, orbTower, orbitalGem } from "../../../gincana/engine/backdrop-orbital"
import type { RGB } from "../../../engine/geometry"
import type { Island, PaintProp } from "../../sim/map"
import type { ArenaCtx, ArenaDress } from "./types"
import { around, bgGrow, bgGrowMesh, bgMark, jit, meshes, mixc, rnd, tagOf, tileTex, v3, type Poly } from "./kit"

const STEEL: RGB = [0.17, 0.16, 0.3]
const STEEL_HI: RGB = [0.34, 0.32, 0.5]
const STEEL_DK: RGB = [0.05, 0.05, 0.1]
const GLASS: RGB = [0.86, 0.9, 1]
const GOLD: RGB = [0.98, 0.82, 0.42]
const MAG: RGB = [1, 0.3, 0.8]
const CYAN: RGB = [0.3, 0.9, 1]
const AMBER: RGB = [1, 0.72, 0.3]

/** Parte 3 — praça de vidro: borda de aço com quina clara, aro aceso, cone de aço em gomos até a ponta de cristal. */
function plaza(ctx: ArenaCtx, poly: Poly, glow: SoftGeo, isl: Island, neon: RGB, deep = 1) {
  const O = ctx.outlineOf(isl, 1)
  const y = isl.y
  const R = isl.r
  poly.stack(O, isl.x, isl.z, [
    { y, k: 1, c: STEEL_HI },
    { y: y - 0.15, k: 1.03, c: STEEL_HI },
    { y: y - 0.75, k: 1.03, c: STEEL },
    { y: y - 0.85, k: 1.0, c: STEEL_DK },
    { y: y - 1.3, k: 0.92, c: (i) => (i % 2 ? STEEL : mixc(STEEL, STEEL_HI, 0.4)) },
    { y: y - 1.3 - R * 0.5 * deep, k: 0.55, c: (i) => (i % 2 ? mixc(STEEL, STEEL_DK, 0.4) : STEEL) },
    { y: y - 1.3 - R * 1.1 * deep, k: 0.1, c: STEEL_DK },
  ], isl.id)
  // aro aceso logo abaixo da borda e faixa no cone
  const cx = isl.x
  const cz = isl.z
  const ring = (yy: number, k: number, c: RGB, t: number) => {
    for (let i = 0; i < O.length; i++) {
      const a = O[i]
      const b = O[(i + 1) % O.length]
      const ax = cx + (a[0] - cx) * k
      const az = cz + (a[1] - cz) * k
      const bx = cx + (b[0] - cx) * k
      const bz = cz + (b[1] - cz) * k
      const L = Math.hypot(bx - ax, bz - az)
      glow.box(L + 0.05, t, 0.12, at((ax + bx) / 2, yy, (az + bz) / 2, Math.atan2(bx - ax, bz - az) + Math.PI / 2), c)
    }
  }
  ring(y - 0.45, 1.045, neon, 0.16)
  ring(y - 1.3 - R * 0.25 * deep, 0.76, AMBER, 0.14)
  glow.cylinder(0.02, R * 0.5, at(cx, y - 1.3 - R * 1.1 * deep - R * 0.22, cz), neon === MAG ? CYAN : MAG, 6, R * 0.16)
}

/** Parte 3 — degrau sem chão: lajinha de aço e vidro com o propulsor aceso embaixo. */
function step(ctx: ArenaCtx, poly: Poly, glow: SoftGeo, lit: SoftGeo, isl: Island) {
  const O = ctx.outlineOf(isl, 1)
  const y = isl.y
  poly.stack(O, isl.x, isl.z, [
    { y, k: 1, c: STEEL_HI },
    { y: y - 0.5, k: 1.02, c: STEEL },
    { y: y - 0.6, k: 0.9, c: STEEL_DK },
    { y: y - 1.1, k: 0.5, c: STEEL },
  ], isl.id)
  lit.cylinder(1.2, 0.9, at(isl.x, y - 1.5, isl.z), STEEL_DK, 10, 1.8)
  glow.cylinder(0.05, 1.8, at(isl.x, y - 2.8, isl.z), (_x, yy) => mixc([0.5, 0.95, 1], MAG, 0.5 - yy / 1.8), 10, 1.1)
}

/** Parte 3 — cristal invertido (estilhaço e prisma): faces de vidro colorido até a ponta, filetes acesos. */
function crystal(ctx: ArenaCtx, poly: Poly, glow: SoftGeo, isl: Island, tint: RGB, depth: number) {
  const O = ctx.outlineOf(isl, 4)
  const y = isl.y
  poly.stack(O, isl.x, isl.z, [
    { y, k: 1, c: GOLD },
    { y: y - 0.3, k: 1.04, c: mixc(tint, [1, 1, 1], 0.6) },
    { y: y - depth * 0.35, k: 0.8, c: (i) => (i % 2 ? tint : mixc(tint, [1, 1, 1], 0.35)) },
    { y: y - depth, k: 0.02, c: mixc(tint, STEEL_DK, 0.5) },
  ], isl.id)
  // filetes acesos descendo pelas quinas
  const n = isl.poly ? isl.poly.length / 2 : 6
  for (let i = 0; i < n; i++) {
    const px = isl.poly ? isl.poly[i * 2] : isl.x + Math.sin((i / n) * Math.PI * 2) * isl.r
    const pz = isl.poly ? isl.poly[i * 2 + 1] : isl.z + Math.cos((i / n) * Math.PI * 2) * isl.r
    glow.tube(v3(isl.x + (px - isl.x) * 1.04, y - 0.3, isl.z + (pz - isl.z) * 1.04), v3(isl.x + (px - isl.x) * 0.8, y - depth * 0.35, isl.z + (pz - isl.z) * 0.8), 0.06, mixc(tint, [1, 1, 1], 0.5), 4)
  }
}

/** Parte 5 — pá da hélice: laje de aço e vidro, filete aceso na borda de fora, braço até o eixo. */
function blade(ctx: ArenaCtx, poly: Poly, glow: SoftGeo, lit: SoftGeo, isl: Island, axleR: number, k: number) {
  const O = ctx.outlineOf(isl, 1)
  const y = isl.y
  poly.stack(O, isl.x, isl.z, [
    { y, k: 1, c: STEEL_HI },
    { y: y - 0.12, k: 1.02, c: GOLD },
    { y: y - 0.22, k: 1.02, c: STEEL_HI },
    { y: y - 0.7, k: 1.0, c: STEEL },
    { y: y - 0.8, k: 0.94, c: STEEL_DK },
    { y: y - 1.3, k: 0.7, c: STEEL },
  ], isl.id)
  // filete aceso na borda de fora (a ponta da pá)
  const a = Math.atan2(isl.x, isl.z)
  const R = Math.hypot(isl.x, isl.z)
  const outR = Math.max(...O.map(([x, z]) => Math.hypot(x, z)))
  for (let s = -3; s <= 3; s++) {
    const aa = a + (s / 3) * (isl.r / R) * 1.3
    glow.box(0.9, 0.14, 0.14, at(Math.sin(aa) * (outR + 0.05), y - 0.45, Math.cos(aa) * (outR + 0.05), aa + Math.PI / 2), k % 2 ? MAG : CYAN)
  }
  // braço: do eixo (por baixo) até o meio da pá
  const inR = Math.min(...O.map(([x, z]) => Math.hypot(x, z)))
  lit.tube(v3(Math.sin(a) * (axleR + 0.1), y - 1.8, Math.cos(a) * (axleR + 0.1)), v3(Math.sin(a) * (inR + 1.2), y - 0.9, Math.cos(a) * (inR + 1.2)), 0.36, STEEL_HI, 8)
  lit.box(0.9, 0.9, 0.9, at(Math.sin(a) * (axleR + 0.3), y - 1.8, Math.cos(a) * (axleR + 0.3), a), GOLD)
}

/** Parte 4 — o eixo: fuste de aço em gomos, anéis dourados, filetes de neon subindo. */
function axle(lit: SoftGeo, glow: SoftGeo, p: PaintProp) {
  const d = p.s * 2.04
  const y0 = p.y - 2
  const h = p.h + 2
  lit.cylinder(d, h, at(p.x, y0 + h / 2, p.z), (x, y, z) => (Math.floor((Math.atan2(z, x) / (Math.PI * 2) + 1) * 12) % 2 ? STEEL : mixc(STEEL, STEEL_HI, 0.4)), 24)
  for (let yy = p.y + 2.5; yy < p.y + p.h; yy += 3.4) {
    lit.torus(d + 0.2, 0.32, at(p.x, yy, p.z), GOLD, 24)
  }
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * Math.PI * 2 + 0.26
    glow.box(0.12, p.h - 2, 0.08, at(p.x + Math.sin(a) * (d / 2 + 0.02), p.y + p.h / 2, p.z + Math.cos(a) * (d / 2 + 0.02), a), k % 2 ? MAG : CYAN)
  }
}

/** Parte 7 — a coroa do Palácio Prisma: borda dourada, pontas nas quinas livres, cone até o eixo. */
function crown(ctx: ArenaCtx, poly: Poly, lit: SoftGeo, glow: SoftGeo, isl: Island, axleTop: number, axleR: number) {
  const O = ctx.outlineOf(isl, 1)
  const y = isl.y
  poly.stack(O, isl.x, isl.z, [
    { y, k: 1, c: GOLD },
    { y: y - 0.3, k: 1.05, c: GOLD },
    { y: y - 0.7, k: 1.05, c: mixc(GOLD, [0.5, 0.3, 0.1], 0.4) },
    { y: y - 0.8, k: 0.96, c: STEEL_DK },
    { y: axleTop, k: (axleR * 1.05) / isl.r, c: STEEL },
    { y: axleTop - 0.4, k: (axleR * 1.05) / isl.r, c: STEEL_DK },
  ], isl.id)
  const n = isl.poly ? isl.poly.length / 2 : 8
  for (let i = 0; i < n; i++) {
    const px = isl.poly ? isl.poly[i * 2] : 0
    const pz = isl.poly ? isl.poly[i * 2 + 1] : 0
    const x = isl.x + (px - isl.x) * 1.04
    const z = isl.z + (pz - isl.z) * 1.04
    if (!ctx.clear.free(x, y, z, 0.6)) continue
    lit.cylinder(0.8, 2.8, at(x, y + 1.3, z, i), GOLD, 6, 0.04)
    glow.sphere(0.4, at(x, y + 2.9, z), i % 2 ? MAG : CYAN, 6)
  }
  glow.torus(isl.r * 2 + 0.3, 0.12, at(isl.x, y - 0.5, isl.z), MAG, 32)
}

export const ORBITAL_DRESS: ArenaDress = {
  topTex: (scene) => tileTex(scene, "glass"),
  under: () => "none",
  colors: (isl) => {
    const t = tagOf(isl)
    if (t === "blade" || t === "glassstep") return { top: [0.74, 0.76, 0.9], rim: GOLD }
    if (t === "crown") return { top: [1, 0.92, 0.7], rim: GOLD }
    if (t === "shard" || t === "prism") return { top: [0.9, 0.8, 1], rim: GOLD }
    if (t === "hub") return { top: [0.62, 0.62, 0.78], rim: GOLD, stripes: false }
    return { top: GLASS, rim: GOLD }
  },
  frame: { band: STEEL_HI, corbel: STEEL, line: CYAN },
  gate: { stone: [0.86, 0.88, 1], tech: true },
  prop: (p) => p.tag === "axle",
  build(ctx) {
    const { lit, glow, poly, done } = meshes(ctx, "orbital")
    const ax = ctx.map.props.find((p) => p.tag === "axle")
    if (ax) axle(lit, glow, ax)
    let bk = 0
    for (const isl of ctx.map.islands) {
      const t = tagOf(isl)
      if (t === "glass" || t === "promenade" || t === "lens") plaza(ctx, poly, glow, isl, isl.id % 2 ? MAG : CYAN, t === "glass" && isl.kind === "base" ? 1.2 : 0.8)
      else if (t === "glassstep") step(ctx, poly, glow, lit, isl)
      else if (t === "shard") crystal(ctx, poly, glow, isl, [0.95, 0.5, 0.9], 5)
      else if (t === "prism") crystal(ctx, poly, glow, isl, [0.5, 0.7, 1], 8)
      else if (t === "orb") {
        lit.sphere(isl.r * 2, at(isl.x, isl.y - isl.r, isl.z), (_x, y) => (y > isl.r * 0.6 ? STEEL_HI : y > -isl.r * 0.2 ? STEEL : STEEL_DK), 14)
        glow.torus(isl.r * 2 + 0.1, 0.16, at(isl.x, isl.y - isl.r * 0.55, isl.z), isl.id % 2 ? MAG : CYAN, 20)
        glow.sphere(0.6, at(isl.x, isl.y - isl.r * 2 - 0.2, isl.z), AMBER, 6)
      } else if (t === "blade" && ax) blade(ctx, poly, glow, lit, isl, ax.s, bk++)
      else if (t === "hub") {
        plaza(ctx, poly, glow, isl, GOLD, 1.3)
        // a máquina embaixo: anéis que giram em volta do eixo (no tick)
      } else if (t === "crown" && ax) crown(ctx, poly, lit, glow, isl, ax.y + ax.h, ax.s)
      if (isl.kind === "base") {
        // 6. a gema de Íris num canto livre da praça e postes de luz nas quinas
        const n = isl.poly ? isl.poly.length / 2 : 6
        for (let i = 0; i < n; i++) {
          const px = isl.poly ? isl.poly[i * 2] : 0
          const pz = isl.poly ? isl.poly[i * 2 + 1] : 0
          const x = isl.x + (px - isl.x) * 0.86
          const z = isl.z + (pz - isl.z) * 0.86
          if (!ctx.clear.free(x, isl.y, z, 0.6)) continue
          lit.cylinder(0.18, 2.6, at(x, isl.y + 1.3, z), STEEL_HI, 6)
          glow.sphere(0.5, at(x, isl.y + 2.7, z), i % 2 ? MAG : AMBER, 6)
        }
        // a gema fica na borda de fora (não colide: longe de onde se corre)
        for (let t2 = 0; t2 < 20; t2++) {
          const a = Math.atan2(Math.sign(isl.x) || -1, 0) + (rnd(isl.id * 13 + t2) - 0.5) * 1.6
          const x = isl.x + Math.sin(a) * isl.r * 0.74
          const z = isl.z + Math.cos(a) * isl.r * 0.74
          if (!ctx.clear.free(x, isl.y, z, 1.4)) continue
          lit.cylinder(1.8, 0.5, at(x, isl.y + 0.25, z), STEEL, 6)
          orbitalGem(lit, glow, x, isl.y + 0.5, z, 0.9)
          break
        }
      }
    }
    // anéis de luz que giram em volta do eixo, sob a praça do eixo
    const spin: Mesh[] = []
    const hub = ctx.map.islands.find((i) => tagOf(i) === "hub")
    if (hub && ax) {
      for (let r = 0; r < 2; r++) {
        const g = new SoftGeo()
        const R = hub.r * (0.62 - r * 0.2)
        g.torus(R * 2, 0.3, Matrix.Identity(), r ? MAG : CYAN, 32)
        for (let k = 0; k < 6; k++) g.box(0.5, 0.5, 0.9, at(Math.sin((k / 6) * Math.PI * 2) * R, 0, Math.cos((k / 6) * Math.PI * 2) * R, (k / 6) * Math.PI * 2), [1, 1, 1])
        const m = g.build(`paint-orbital-ring${r}`, ctx.scene, ctx.glowMat, false)
        m.position.set(hub.x, hub.y - 2.4 - r * 1.6, hub.z)
        ctx.add(m)
        spin.push(m)
      }
    }
    // 8. fundo — ilhas orbitais em três anéis, torres, planeta com anel
    const bg = bgMark([lit, glow])
    const skipN = (a: number) => Math.abs(Math.atan2(Math.sin(a), Math.cos(a))) < 0.22
    const n = Math.min(1, ctx.n)
    let id = 0
    for (const s of around(Math.round(14 * n), 72, 100, 21, skipN)) orbIsland(lit, glow, s.x, -14 + rnd(s.i * 3) * 22, s.z, 4 + rnd(s.i * 5) * 3, id++, 0)
    for (const s of around(Math.round(14 * n), 120, 160, 22, skipN)) orbIsland(lit, glow, s.x, -4 + rnd(s.i * 3 + 1) * 40, s.z, 8 + rnd(s.i * 5 + 1) * 6, id++, 1)
    for (const s of around(Math.round(12 * n), 190, 240, 23, skipN)) orbIsland(lit, glow, s.x, 10 + rnd(s.i * 3 + 2) * 50, s.z, 14 + rnd(s.i * 5 + 2) * 8, id++, 2)
    for (const s of around(Math.round(10 * n), 130, 200, 24, skipN)) {
      const w = 5 + rnd(s.i) * 6
      orbTower(lit, glow, s.x, -40 - rnd(s.i * 2) * 10, s.z, w, 60 + rnd(s.i * 3) * 50, s.i)
    }
    // o planeta com anel, alto no céu do sul
    const pg = new SoftGeo()
    pg.sphere(70, Matrix.Identity(), (x, y) => mixc([0.36, 0.22, 0.6], [0.95, 0.6, 0.9], Math.max(0, Math.min(1, 0.5 + y / 70 + x / 140))), 24)
    pg.torus(130, 3.2, Matrix.RotationX(0.35), (x) => jit([0.9, 0.78, 0.96], Math.floor(Math.abs(x) / 6), 0.12), 48)
    const planet = pg.build("paint-orbital-planet", ctx.scene, ctx.glowMat, false)
    planet.position.set(60, 120, -260)
    planet.rotation.z = 0.3
    planet.applyFog = false
    ctx.add(planet)
    bgGrowMesh(planet)
    bgGrow([lit, glow], bg)
    done()
    return {
      tick(_dt, clock) {
        spin.forEach((m, i) => (m.rotation.y = clock * (i ? -0.5 : 0.35)))
        planet.rotation.y = clock * 0.02
      },
    }
  },
}
