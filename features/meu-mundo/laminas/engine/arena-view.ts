// features/meu-mundo/laminas/engine/arena-view.ts — ARENA DAS LÂMINAS (mm3d-48a): o lugar.
//
// Tudo feito aqui, sem GLB: chão de areia com o sol dos Jogos Eternos pintado
// (textura de canvas), muro baixo de arenito com faixa de bronze, arquibancada
// em três degraus com a plateia (instância fina: corpo + cabeça de cor
// sorteada; pula quando alguém cai), estandartes vermelho e dourado, tochas
// e, sobre o portão, duas espadas gigantes cruzadas. O portão fica no −z
// (de onde o jogador entra); os monstros nascem no +z.

import type { Scene } from "@babylonjs/core/scene"
import "@babylonjs/core/Meshes/thinInstanceMesh"
import type { Mesh } from "@babylonjs/core/Meshes/mesh"
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial"
import { DynamicTexture } from "@babylonjs/core/Materials/Textures/dynamicTexture"
import { Color3 } from "@babylonjs/core/Maths/math.color"
import { Matrix, Quaternion, Vector3 } from "@babylonjs/core/Maths/math.vector"
import { CreateBox } from "@babylonjs/core/Meshes/Builders/boxBuilder"
import { CreateDisc } from "@babylonjs/core/Meshes/Builders/discBuilder"
import { CreateSphere } from "@babylonjs/core/Meshes/Builders/sphereBuilder"
import { CreateCylinder } from "@babylonjs/core/Meshes/Builders/cylinderBuilder"
import { CreateTorus } from "@babylonjs/core/Meshes/Builders/torusBuilder"
import { ARENA_R } from "../sim/fight"

export interface ArenaView {
  /** A plateia vibra (0–1) por um instante. */
  cheer: (k: number) => void
  update: (dt: number) => void
  dispose: () => void
}

function mat(scene: Scene, name: string, hex: string, o: { emissive?: number; unlit?: boolean; spec?: number } = {}) {
  const m = new StandardMaterial(name, scene)
  const c = Color3.FromHexString(hex)
  m.diffuseColor = c
  m.specularColor = new Color3(o.spec ?? 0.04, o.spec ?? 0.04, o.spec ?? 0.04)
  if (o.emissive) m.emissiveColor = c.scale(o.emissive)
  if (o.unlit) {
    m.disableLighting = true
    m.emissiveColor = c
  }
  return m
}

/** Areia clara com o sol dos Jogos Eternos no meio e o anel de bronze na borda. */
function sandTexture(scene: Scene) {
  const S = 1024
  const t = new DynamicTexture("laminas-sand", { width: S, height: S }, scene, true)
  const g = t.getContext() as CanvasRenderingContext2D
  const c = S / 2
  const grad = g.createRadialGradient(c, c, 0, c, c, c)
  grad.addColorStop(0, "#e9cf98")
  grad.addColorStop(0.85, "#ddbd80")
  grad.addColorStop(1, "#b98f55")
  g.fillStyle = grad
  g.fillRect(0, 0, S, S)
  // grãos
  for (let i = 0; i < 9000; i++) {
    g.fillStyle = Math.random() < 0.5 ? "rgba(120,80,40,0.08)" : "rgba(255,240,200,0.10)"
    g.fillRect(Math.random() * S, Math.random() * S, 2, 2)
  }
  // o sol: disco e 16 raios
  g.save()
  g.translate(c, c)
  g.fillStyle = "rgba(196,120,40,0.55)"
  for (let i = 0; i < 16; i++) {
    g.rotate((Math.PI * 2) / 16)
    g.beginPath()
    g.moveTo(-26, 120)
    g.lineTo(0, i % 2 ? 250 : 300)
    g.lineTo(26, 120)
    g.closePath()
    g.fill()
  }
  g.beginPath()
  g.arc(0, 0, 118, 0, Math.PI * 2)
  g.fillStyle = "rgba(214,140,50,0.7)"
  g.fill()
  g.lineWidth = 10
  g.strokeStyle = "rgba(140,80,30,0.6)"
  g.stroke()
  g.restore()
  // anel da borda
  g.lineWidth = 16
  g.strokeStyle = "rgba(150,95,40,0.55)"
  g.beginPath()
  g.arc(c, c, c - 30, 0, Math.PI * 2)
  g.stroke()
  t.update()
  return t
}

export function buildArena(scene: Scene, low: boolean): ArenaView {
  const meshes: Mesh[] = []
  const mats: StandardMaterial[] = []
  const M = (name: string, hex: string, o?: Parameters<typeof mat>[3]) => {
    const m = mat(scene, `laminas-${name}`, hex, o)
    mats.push(m)
    return m
  }
  const keep = <T extends Mesh>(m: T) => {
    m.isPickable = false
    meshes.push(m)
    return m
  }
  const sand = sandTexture(scene)
  const sandMat = M("sand-mat", "#ffffff")
  sandMat.diffuseTexture = sand
  const stone = M("stone", "#d2b483")
  const stoneDark = M("stone-dark", "#a88a5c")
  const bronze = M("bronze", "#b0773a", { spec: 0.3 })
  const red = M("red", "#b5202b")
  const gold = M("gold", "#e8b23a", { emissive: 0.15 })
  const steel = M("steel", "#d9dce2", { spec: 0.5 })
  const flame = M("flame", "#ffb347", { unlit: true })

  // Chão de luta e o chão em volta (areia batida mais escura até a arquibancada).
  const floor = keep(CreateDisc("laminas-floor", { radius: ARENA_R + 0.6, tessellation: 64 }, scene))
  floor.rotation.x = Math.PI / 2
  floor.material = sandMat
  const outer = keep(CreateDisc("laminas-outer", { radius: 40, tessellation: 48 }, scene))
  outer.rotation.x = Math.PI / 2
  outer.position.y = -0.02
  outer.material = M("outer", "#8f7350")

  // Muro baixo com faixa de bronze (aberto no portão, em −z).
  const WALL_R = ARENA_R + 0.9
  const segs = 40
  for (let i = 0; i < segs; i++) {
    const a = (i / segs) * Math.PI * 2
    if (Math.abs(Math.atan2(Math.sin(a - Math.PI), Math.cos(a - Math.PI))) < 0.16) continue
    const len = (2 * Math.PI * WALL_R) / segs + 0.05
    const w = keep(CreateBox(`laminas-wall-${i}`, { width: len, height: 1.3, depth: 0.6 }, scene))
    w.position.set(Math.sin(a) * WALL_R, 0.65, Math.cos(a) * WALL_R)
    w.rotation.y = a
    w.material = i % 2 ? stone : stoneDark
    const band = keep(CreateBox(`laminas-band-${i}`, { width: len, height: 0.14, depth: 0.64 }, scene))
    band.position.set(Math.sin(a) * WALL_R, 1.22, Math.cos(a) * WALL_R)
    band.rotation.y = a
    band.material = bronze
  }

  // Arquibancada: três anéis em degrau.
  const tiers = [
    { r: WALL_R + 1.6, h: 1.8 },
    { r: WALL_R + 3.2, h: 3.0 },
    { r: WALL_R + 4.8, h: 4.2 },
  ]
  // Cada degrau é um anel de blocos (1,6 m de fundo) em volta do muro; o portão fica livre.
  tiers.forEach((tr, i) => {
    const n = 44
    for (let k = 0; k < n; k++) {
      const a = (k / n) * Math.PI * 2
      if (Math.abs(Math.atan2(Math.sin(a - Math.PI), Math.cos(a - Math.PI))) < 0.3) continue
      const len = (2 * Math.PI * (tr.r + 0.2)) / n + 0.08
      const b = keep(CreateBox(`laminas-tier-${i}-${k}`, { width: len, height: tr.h, depth: 1.6 }, scene))
      b.position.set(Math.sin(a) * (tr.r + 0.2), tr.h / 2 - 0.02, Math.cos(a) * (tr.r + 0.2))
      b.rotation.y = a
      b.material = (i + k) % 2 ? stoneDark : stone
    }
  })
  // Plateia (instância fina): corpo e cabeça.
  const fanBody = keep(CreateBox("laminas-fan", { width: 0.42, height: 0.6, depth: 0.32 }, scene))
  const fanHead = keep(CreateSphere("laminas-fan-head", { diameter: 0.3, segments: 6 }, scene))
  const fanMat = M("fan", "#ffffff")
  fanBody.material = fanMat
  fanHead.material = M("fan-head", "#c58c62")
  const shirts = ["#b5202b", "#e8b23a", "#2b6cb0", "#2f855a", "#f6f1e7", "#6b46c1", "#dd6b20"].map((h) => Color3.FromHexString(h))
  const fans: { x: number; y: number; z: number; a: number; ph: number }[] = []
  const per = low ? 26 : 52
  tiers.forEach((tr) => {
    for (let k = 0; k < per; k++) {
      const a = (k / per) * Math.PI * 2 + tr.r
      if (Math.abs(Math.atan2(Math.sin(a - Math.PI), Math.cos(a - Math.PI))) < 0.3) continue
      if (Math.random() < 0.18) continue
      const r = tr.r + 0.2
      fans.push({ x: Math.sin(a) * r, y: tr.h + 0.3, z: Math.cos(a) * r, a: a + Math.PI, ph: Math.random() * 6.28 })
    }
  })
  const bodyM = new Float32Array(fans.length * 16)
  const headM = new Float32Array(fans.length * 16)
  const cols = new Float32Array(fans.length * 4)
  fans.forEach((f, i) => {
    const c = shirts[i % shirts.length]
    cols.set([c.r, c.g, c.b, 1], i * 4)
  })
  fanBody.thinInstanceSetBuffer("color", cols, 4)
  const writeFans = (jump: number, time: number) => {
    const q = new Quaternion()
    fans.forEach((f, i) => {
      const up = jump > 0 ? Math.max(0, Math.sin(time * 9 + f.ph)) * 0.35 * jump : Math.sin(time * 1.3 + f.ph) * 0.02
      Quaternion.RotationYawPitchRollToRef(f.a, 0, 0, q)
      Matrix.Compose(Vector3.One(), q, new Vector3(f.x, f.y + up, f.z)).copyToArray(bodyM, i * 16)
      Matrix.Compose(Vector3.One(), q, new Vector3(f.x, f.y + up + 0.45, f.z)).copyToArray(headM, i * 16)
    })
    fanBody.thinInstanceSetBuffer("matrix", bodyM, 16, false)
    fanHead.thinInstanceSetBuffer("matrix", headM, 16, false)
  }
  writeFans(0, 0)

  // Estandartes (vermelho com faixa dourada) em volta e tochas.
  const N_BANNER = 8
  for (let i = 0; i < N_BANNER; i++) {
    const a = ((i + 0.5) / N_BANNER) * Math.PI * 2
    const r = WALL_R + 0.1
    const pole = keep(CreateCylinder(`laminas-pole-${i}`, { height: 5.2, diameter: 0.12, tessellation: 6 }, scene))
    pole.position.set(Math.sin(a) * r, 2.6, Math.cos(a) * r)
    pole.material = bronze
    const flag = keep(CreateBox(`laminas-flag-${i}`, { width: 0.9, height: 1.8, depth: 0.04 }, scene))
    flag.position.set(Math.sin(a) * (r - 0.05), 4.1, Math.cos(a) * (r - 0.05))
    flag.rotation.y = a
    flag.material = red
    const stripe = keep(CreateBox(`laminas-stripe-${i}`, { width: 0.92, height: 0.16, depth: 0.05 }, scene))
    stripe.position.set(Math.sin(a) * (r - 0.06), 3.55, Math.cos(a) * (r - 0.06))
    stripe.rotation.y = a
    stripe.material = gold
  }
  const torches: Mesh[] = []
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4
    const r = WALL_R - 0.05
    const post = keep(CreateCylinder(`laminas-torch-${i}`, { height: 1.0, diameterTop: 0.34, diameterBottom: 0.18, tessellation: 8 }, scene))
    post.position.set(Math.sin(a) * r, 1.8, Math.cos(a) * r)
    post.material = bronze
    const f = keep(CreateSphere(`laminas-flame-${i}`, { diameter: 0.38, segments: 6 }, scene))
    f.position.set(Math.sin(a) * r, 2.45, Math.cos(a) * r)
    f.scaling.y = 1.6
    f.material = flame
    torches.push(f)
  }

  // Portão (−z) com as espadas gigantes cruzadas em cima.
  const gateZ = -(WALL_R + 0.2)
  for (const s of [-1, 1]) {
    const col = keep(CreateBox(`laminas-gate-col-${s}`, { width: 0.8, height: 4.2, depth: 0.8 }, scene))
    col.position.set(s * 2.2, 2.1, gateZ)
    col.material = stone
  }
  const lintel = keep(CreateBox("laminas-lintel", { width: 5.4, height: 0.7, depth: 0.9 }, scene))
  lintel.position.set(0, 4.5, gateZ)
  lintel.material = stoneDark
  for (const s of [-1, 1]) {
    const blade = keep(CreateBox(`laminas-big-blade-${s}`, { width: 0.32, height: 4.6, depth: 0.08 }, scene))
    blade.position.set(0, 6.3, gateZ)
    blade.rotation.z = s * 0.62
    blade.material = steel
    const guard = keep(CreateBox(`laminas-big-guard-${s}`, { width: 1.1, height: 0.16, depth: 0.16 }, scene))
    guard.parent = blade
    guard.position.y = -1.7
    guard.material = gold
  }
  const ring = keep(CreateTorus("laminas-sun-ring", { diameter: 1.2, thickness: 0.14, tessellation: 24 }, scene))
  ring.position.set(0, 6.3, gateZ - 0.1)
  ring.rotation.x = Math.PI / 2
  ring.material = gold

  let cheerK = 0
  let time = 0
  return {
    cheer(k) {
      cheerK = Math.max(cheerK, Math.min(1, k))
    },
    update(dt) {
      time += dt
      cheerK = Math.max(0, cheerK - dt * 0.6)
      writeFans(cheerK, time)
      for (const [i, f] of torches.entries()) f.scaling.y = 1.5 + Math.sin(time * 11 + i) * 0.2
    },
    dispose() {
      for (const m of meshes) m.dispose()
      for (const m of mats) m.dispose()
      sand.dispose()
    },
  }
}
