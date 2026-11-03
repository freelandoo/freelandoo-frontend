// features/meu-mundo/jetpack/engine/obstacles-view.ts — JETPACK (mm3d-63): as prensas e os galões.
//
// Cada tipo da regra tem um MOLDE desenhado uma vez (ferro, latão, faixa de
// perigo amarela e preta, dentes de aço na borda que esmaga) e cópias que
// dividem a geometria. Cada quadro: o que está à vista ganha cópias, a pose
// sai das MESMAS funções da regra (pressV/pressH/crusherB/pistonE/gearAt) e o
// que ficou para trás devolve as cópias.
//
// A borda que esmaga fica exatamente onde a regra bate: a placa é desenhada
// com a borda de trabalho em y = 0 do molde e o corpo "para dentro" do teto,
// do chão ou da parede (lá dentro a pedra esconde o resto).

import type { Scene } from "@babylonjs/core/scene"
import type { Mesh } from "@babylonjs/core/Meshes/mesh"
import type { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial"
import { SteamGeo } from "../../engine/steampunk/geo"
import { SP, place, xf, facing, type RGB } from "../../engine/steampunk/scenery"
import { TUNNEL, PIPE_R, DEPTH, crusherB, gearAt, pistonE, pressH, pressV, type Can, type Flight, type Obstacle } from "../sim/flight"

const { W, H } = TUNNEL
const YELLOW: RGB = [0.95, 0.72, 0.02]
const BLACK: RGB = [0.07, 0.07, 0.08]
const RED_LAMP: RGB = [1, 0.25, 0.12]
const FUEL: RGB = [0.29, 0.98, 0.64]

type Key = "slab" | "hammer" | "pipe" | "gear" | "can"
/** Um molde: a malha do corpo e a do brilho (lâmpadas, janela do galão). */
interface Mold {
  body: Mesh
  glow: Mesh | null
}
/** Uma cópia em uso. */
interface Part {
  key: Key
  body: Mesh
  glow: Mesh | null
}

export interface ObstaclesView {
  sync: (f: Flight, zFrom: number, zTo: number, now: number) => void
  /** Onde estava um galão (para o brilho de pegar). */
  canAt: (id: number) => Can | null
  dispose: () => void
}

/** Placa de prensa: borda de trabalho em y = 0, corpo para +y, frente em z = 0 (profundidade d). */
function slab(g: SteamGeo, l: SteamGeo, d: number) {
  const w = W + 1.6
  const h = 9.6
  g.box(w, h - 0.34, d, place(0, 0.34 + (h - 0.34) / 2, d / 2), SP.iron)
  // chapa de aço da borda e os dentes (losangos) que esmagam
  g.box(w, 0.14, d, place(0, 0.27, d / 2), SP.steel)
  for (let x = -w / 2 + 0.3; x < w / 2; x += 0.5) g.box(0.24, 0.24, d * 0.92, xf(x, 0.17, d / 2, 0, undefined, 0, Math.PI / 4), SP.steelLight)
  // faixa de perigo na frente e atrás (listras inclinadas presas entre dois frisos)
  for (const fz of [-0.025, d + 0.025]) {
    g.box(w, 0.8, 0.03, place(0, 0.75, fz), BLACK)
    for (let x = -w / 2 + 0.25; x < w / 2; x += 0.7) g.box(0.32, 0.92, 0.04, xf(x, 0.75, fz, 0, undefined, 0, 0.6), YELLOW)
    g.box(w, 0.14, 0.06, place(0, 1.22, fz), SP.brassDark)
    g.box(w, 0.1, 0.06, place(0, 0.36, fz), SP.ironHi)
  }
  // cintas de latão, rebites e o emblema de engrenagem no meio da chapa
  for (const y of [2.2, 4.4, 6.6]) g.box(w, 0.16, d + 0.06, place(0, y, d / 2), SP.brass)
  for (let x = -w / 2 + 0.6; x < w / 2; x += 1.2) for (const y of [1.6, 3.3, 5.5]) g.box(0.1, 0.1, 0.05, place(x, y, -0.03), SP.brassDark)
  g.gear(0.9, 0.08, 10, facing(0, 3.3, -0.05), SP.bronze, SP.brass)
  // lâmpadas vermelhas de aviso nos cantos da borda
  for (const x of [-W / 2 + 0.5, W / 2 - 0.5]) {
    g.box(0.3, 0.3, 0.08, place(x, 1.55, -0.05), SP.ironHi)
    l.box(0.2, 0.2, 0.06, place(x, 1.55, -0.1), RED_LAMP)
  }
}

/** Cabeça do pilão (meia largura): borda em y = 0, corpo até 9 m, centro em x = 0 do molde. */
function hammer(g: SteamGeo, l: SteamGeo, d: number) {
  const w = W / 2 + 0.8
  g.box(w, 8.6, d, place(0, 0.4 + 4.3, d / 2), SP.ironWarm)
  g.box(w, 0.4, d, place(0, 0.2, d / 2), SP.steel)
  for (let x = -w / 2 + 0.25; x < w / 2; x += 0.45) g.box(0.22, 0.22, d * 0.9, xf(x, 0.12, d / 2, 0, undefined, 0, Math.PI / 4), SP.steelLight)
  // guias de latão e o cilindro de vapor na frente
  for (const x of [-w / 2 + 0.3, w / 2 - 0.3]) g.box(0.24, 8.4, d + 0.1, place(x, 4.6, d / 2), SP.brass)
  g.cylinder(1.2, 3.4, place(0, 3.2, -0.3), SP.copper, 12)
  g.box(1.5, 0.16, 1.5, place(0, 1.5, -0.3), SP.brassDark)
  g.box(1.5, 0.16, 1.5, place(0, 4.9, -0.3), SP.brassDark)
  for (const fz of [-0.025, d + 0.025]) {
    g.box(w, 0.6, 0.03, place(0, 0.75, fz), BLACK)
    for (let x = -w / 2 + 0.2; x < w / 2; x += 0.6) g.box(0.26, 0.72, 0.04, xf(x, 0.75, fz, 0, undefined, 0, 0.6), YELLOW)
  }
  l.box(0.22, 0.22, 0.06, place(0, 1.25, -0.95), RED_LAMP)
}

/** Cano grosso de lado a lado (eixo x), com flanges e um registro no meio. */
function pipe(g: SteamGeo, d: number) {
  const z = d / 2
  g.tube([-W / 2 - 1.5, 0, z], [W / 2 + 1.5, 0, z], PIPE_R, SP.copper, 12)
  for (let x = -W / 2 + 0.6; x < W / 2; x += 1.8) g.cylinder(PIPE_R * 2.5, 0.16, xf(x, 0, z, 0, undefined, 0, Math.PI / 2), SP.brassDark, 12)
  g.ring(1.1, 0.07, facing(0, 0, -0.1), SP.bronze, 14)
  g.box(1, 0.06, 0.06, place(0, 0, -0.1), SP.bronze)
  g.box(0.06, 1, 0.06, place(0, 0, -0.1), SP.bronze)
  g.box(0.3, 0.3, 0.5, place(0, 0, -0.05), SP.brass)
}

/** Engrenagem de raio 1 (escala pela regra), de frente para o jogador. */
function gear(g: SteamGeo, d: number) {
  g.gear(1, d, 14, facing(0, 0, d / 2), SP.brassDark, SP.iron)
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * Math.PI * 2
    g.box(0.09, 0.09, 0.05, place(Math.cos(a) * 0.45, Math.sin(a) * 0.45, -0.04), SP.brass)
  }
}

/** Galão de combustível: corpo de latão, tampas de ferro e a janela verde acesa. */
function can(g: SteamGeo, l: SteamGeo) {
  g.cylinder(0.62, 0.86, place(0, 0, 0), SP.brass, 12)
  g.cylinder(0.68, 0.1, place(0, 0.45, 0), SP.iron, 12)
  g.cylinder(0.68, 0.1, place(0, -0.45, 0), SP.iron, 12)
  g.cylinder(0.22, 0.16, place(0, 0.57, 0), SP.copper, 8)
  g.box(0.46, 0.06, 0.08, place(0, 0.72, 0), SP.ironHi)
  l.cylinder(0.65, 0.3, place(0, 0, 0), FUEL, 12)
}

export function buildObstacles(scene: Scene, mats: { trim: StandardMaterial; glow: StandardMaterial }): ObstaclesView {
  const molds = new Map<Key, Mold>()
  const make = (key: Key, fn: (g: SteamGeo, l: SteamGeo) => void) => {
    const g = new SteamGeo()
    const l = new SteamGeo()
    l.uv = "flat"
    fn(g, l)
    const body = g.build(`jt-${key}`, scene, mats.trim, false)
    body.setEnabled(false)
    const glow = l.vertexCount ? l.build(`jt-${key}-glow`, scene, mats.glow, false) : null
    glow?.setEnabled(false)
    molds.set(key, { body, glow })
  }
  make("slab", (g, l) => slab(g, l, DEPTH.pressV))
  make("hammer", (g, l) => hammer(g, l, DEPTH.crusher))
  make("pipe", (g) => pipe(g, DEPTH.pipes))
  make("gear", (g) => gear(g, DEPTH.gears))
  make("can", can)

  const free = new Map<Key, Part[]>()
  let seq = 0
  const take = (key: Key): Part => {
    const list = free.get(key)
    const got = list?.pop()
    if (got) {
      got.body.setEnabled(true)
      got.glow?.setEnabled(true)
      return got
    }
    const m = molds.get(key)!
    const id = ++seq
    const body = m.body.clone(`jt-${key}-${id}`, null, true)!
    body.setEnabled(true)
    body.isPickable = false
    const glow = m.glow ? m.glow.clone(`jt-${key}-glow-${id}`, body, true)! : null
    glow?.setEnabled(true)
    return { key, body, glow }
  }
  const give = (p: Part) => {
    p.body.setEnabled(false)
    p.glow?.setEnabled(false)
    let list = free.get(p.key)
    if (!list) free.set(p.key, (list = []))
    list.push(p)
  }

  /** Cópias de cada obstáculo à vista (id → peças). */
  const shown = new Map<number, Part[]>()
  const cans = new Map<number, { part: Part; can: Can }>()
  const partsFor = (o: Obstacle): Part[] => {
    switch (o.kind) {
      case "pressV":
      case "pressH":
      case "crusher":
        return [take(o.kind === "crusher" ? "hammer" : "slab"), take(o.kind === "crusher" ? "hammer" : "slab")]
      case "piston":
        return [take("slab")]
      case "pipes":
        return Number.isFinite(o.x0) ? [take("pipe"), take("pipe")] : [take("pipe")]
      case "gears":
        return o.gears.map(() => take("gear"))
    }
  }
  const pose = (o: Obstacle, parts: Part[], t: number) => {
    const set = (p: Part, x: number, y: number, rz: number, sx = 1, sy = 1, sz = 1) => {
      p.body.position.set(x, y, o.z)
      p.body.rotation.set(0, 0, rz)
      p.body.scaling.set(sx, sy, sz)
    }
    switch (o.kind) {
      case "pressV": {
        const c = pressV(o, t)
        set(parts[0], 0, c + o.g / 2, 0)
        set(parts[1], 0, c - o.g / 2, Math.PI)
        break
      }
      case "pressH": {
        const c = pressH(o, t)
        // de lado: a placa gira 90° e a borda de trabalho olha para o vão
        set(parts[0], c - o.g / 2, H / 2, Math.PI / 2)
        set(parts[1], c + o.g / 2, H / 2, -Math.PI / 2)
        break
      }
      case "crusher":
        set(parts[0], -(W / 4 + 0.4), crusherB(o, t, -1), 0)
        set(parts[1], W / 4 + 0.4, crusherB(o, t, 1), 0)
        break
      case "piston": {
        const e = pistonE(o, t)
        if (o.side < 0) set(parts[0], -W / 2 + e, H / 2, Math.PI / 2, 1, 1, o.d / DEPTH.pressV)
        else set(parts[0], W / 2 - e, H / 2, -Math.PI / 2, 1, 1, o.d / DEPTH.pressV)
        break
      }
      case "pipes":
        set(parts[0], 0, o.y0, 0)
        if (parts[1]) set(parts[1], o.x0, H / 2, Math.PI / 2)
        break
      case "gears":
        for (let i = 0; i < parts.length; i++) {
          const g = gearAt(o, t, i)
          set(parts[i], g.x, g.y, g.ang, g.r, g.r, 1)
        }
        break
    }
  }

  const seen = new Set<number>()
  return {
    sync(f, zFrom, zTo, now) {
      const t = f.t
      seen.clear()
      for (const o of f.course.obstacles) {
        if (o.z > zTo) break
        if (o.z + o.d < zFrom) continue
        seen.add(o.id)
        let parts = shown.get(o.id)
        if (!parts) shown.set(o.id, (parts = partsFor(o)))
        pose(o, parts, t)
      }
      for (const [id, parts] of shown) {
        if (seen.has(id)) continue
        for (const p of parts) give(p)
        shown.delete(id)
      }
      // galões: giram e boiam; pegou, some
      seen.clear()
      for (const c of f.course.cans) {
        if (c.z > zTo) break
        if (c.z < zFrom || c.taken) continue
        seen.add(c.id)
        let v = cans.get(c.id)
        if (!v) cans.set(c.id, (v = { part: take("can"), can: c }))
        v.part.body.position.set(c.x, c.y + Math.sin(now * 2.4 + c.id) * 0.12, c.z)
        v.part.body.rotation.set(0.25, now * 1.8 + c.id, 0)
      }
      for (const [id, v] of cans) {
        if (seen.has(id)) continue
        give(v.part)
        cans.delete(id)
      }
    },
    canAt(id) {
      return cans.get(id)?.can ?? null
    },
    dispose() {
      for (const parts of shown.values()) for (const p of parts) give(p)
      for (const v of cans.values()) give(v.part)
      for (const list of free.values()) for (const p of list) p.body.dispose()
      for (const m of molds.values()) {
        m.body.dispose()
        m.glow?.dispose()
      }
    },
  }
}
