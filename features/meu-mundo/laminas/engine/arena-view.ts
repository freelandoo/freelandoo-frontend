// features/meu-mundo/laminas/engine/arena-view.ts — ARENA DAS LÂMINAS (mm3d-48a): o lugar.
//
// mm3d-55 — STEAMPUNK. Um coliseu de cantaria e ferro fundido no fim de tarde:
// chão de areia com a ROSA DOS SETE em latão incrustada (sete pontas, a
// engrenagem dos Jogos Eternos), anel de chapa rebitada na borda, muro de
// cantaria com cinta de latão rebitada, arquibancada em três degraus com
// guarda-corpo de ferro e lanternas âmbar, a plateia (instância fina: corpo +
// cabeça, roupas vitorianas; pula quando alguém cai), estandartes vermelho e
// ouro em mastros de ferro, braseiros, e sobre o portão o pórtico de ferro com
// a engrenagem que gira e as duas espadas gigantes cruzadas. Por fora:
// caldeiras e chaminés soltando vapor, fábricas no horizonte e dirigíveis.
// O portão fica no −z (de onde o jogador entra); os monstros nascem no +z.
//
// O estático é UMA malha por material (SteamStage: acabamento, cantaria,
// lajes, brilho); engrenagens e vapor no SteamFx. Nada aqui colide: quem
// prende a luta no círculo é a regra (sim/fight.ts).

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
import { ARENA_R } from "../sim/fight"
import { boiler, postLantern } from "../../engine/steampunk/kit"
import {
  AirshipFleet,
  SP,
  SteamStage,
  factorySkyline,
  fleetRing,
  gearArch,
  place,
  facing,
  rivetRing,
  smokestack,
  tierOf,
  xf,
} from "../../engine/steampunk/scenery"

export interface ArenaView {
  /** A plateia vibra (0–1) por um instante. */
  cheer: (k: number) => void
  update: (dt: number) => void
  dispose: () => void
}

/** Areia clara com a rosa dos Sete em latão no meio e o anel de bronze na borda. */
function sandTexture(scene: Scene) {
  const S = 1024
  const t = new DynamicTexture("laminas-sand", { width: S, height: S }, scene, true)
  const g = t.getContext() as CanvasRenderingContext2D
  const c = S / 2
  const grad = g.createRadialGradient(c, c, 0, c, c, c)
  grad.addColorStop(0, "#e6c98f")
  grad.addColorStop(0.85, "#d6b479")
  grad.addColorStop(1, "#a9824d")
  g.fillStyle = grad
  g.fillRect(0, 0, S, S)
  // grãos e marcas de pé
  for (let i = 0; i < 9000; i++) {
    g.fillStyle = Math.random() < 0.5 ? "rgba(110,72,36,0.09)" : "rgba(255,240,200,0.10)"
    g.fillRect(Math.random() * S, Math.random() * S, 2, 2)
  }
  g.save()
  g.translate(c, c)
  // Engrenagem de latão (24 dentes) em volta da rosa.
  const teeth = 24
  g.beginPath()
  for (let i = 0; i < teeth; i++) {
    const a0 = (i / teeth) * Math.PI * 2
    const st = (Math.PI * 2) / teeth
    for (const [r, k] of [[150, 0], [172, 0.15], [172, 0.45], [150, 0.6]] as const) {
      const a = a0 + st * k
      if (i === 0 && k === 0) g.moveTo(Math.cos(a) * r, Math.sin(a) * r)
      else g.lineTo(Math.cos(a) * r, Math.sin(a) * r)
    }
  }
  g.closePath()
  g.fillStyle = "rgba(160,112,42,0.62)"
  g.fill()
  g.lineWidth = 6
  g.strokeStyle = "rgba(92,58,24,0.75)"
  g.stroke()
  g.beginPath()
  g.arc(0, 0, 128, 0, Math.PI * 2)
  g.fillStyle = "rgba(222,190,128,0.9)"
  g.fill()
  // A rosa: sete pontas (os Sete) alternando latão claro e escuro.
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2 - Math.PI / 2
    for (const [side, col] of [[-1, "rgba(198,154,55,0.95)"], [1, "rgba(140,98,36,0.95)"]] as const) {
      g.beginPath()
      g.moveTo(0, 0)
      g.lineTo(Math.cos(a) * 122, Math.sin(a) * 122)
      g.lineTo(Math.cos(a + side * 0.2) * 36, Math.sin(a + side * 0.2) * 36)
      g.closePath()
      g.fillStyle = col
      g.fill()
    }
  }
  g.beginPath()
  g.arc(0, 0, 26, 0, Math.PI * 2)
  g.fillStyle = "rgba(70,46,22,0.9)"
  g.fill()
  g.beginPath()
  g.arc(0, 0, 14, 0, Math.PI * 2)
  g.fillStyle = "rgba(220,176,80,1)"
  g.fill()
  g.restore()
  // anel de bronze da borda com rebites
  g.lineWidth = 18
  g.strokeStyle = "rgba(130,84,38,0.6)"
  g.beginPath()
  g.arc(c, c, c - 30, 0, Math.PI * 2)
  g.stroke()
  for (let i = 0; i < 64; i++) {
    const a = (i / 64) * Math.PI * 2
    g.fillStyle = "rgba(230,190,110,0.85)"
    g.beginPath()
    g.arc(c + Math.cos(a) * (c - 30), c + Math.sin(a) * (c - 30), 4, 0, Math.PI * 2)
    g.fill()
  }
  t.update()
  return t
}

/** Ângulo dentro da folga do portão (−z)? */
const atGate = (a: number, gap: number) => Math.abs(Math.atan2(Math.sin(a - Math.PI), Math.cos(a - Math.PI))) < gap

export function buildArena(scene: Scene, low: boolean): ArenaView {
  const meshes: Mesh[] = []
  const mats: StandardMaterial[] = []
  const keep = <T extends Mesh>(m: T) => {
    m.isPickable = false
    meshes.push(m)
    return m
  }
  const stage = new SteamStage(scene, tierOf(low), { wall: true })
  const { ctx } = stage
  const { props, glow, wall, pavers } = ctx

  // ── Chão de luta (areia com a rosa) e o lajeado em volta ──
  const sand = sandTexture(scene)
  const sandMat = new StandardMaterial("laminas-sand-mat", scene)
  sandMat.diffuseTexture = sand
  sandMat.specularColor = new Color3(0.04, 0.04, 0.04)
  mats.push(sandMat)
  const floor = keep(CreateDisc("laminas-floor", { radius: ARENA_R + 0.6, tessellation: 64 }, scene))
  floor.rotation.x = Math.PI / 2
  floor.material = sandMat
  pavers.cylinder(80, 0.1, place(0, -0.07, 0), SP.stone, 32)
  // Anel de chapa rebitada entre a areia e o muro.
  rivetRing(props, 0, 0.0, 0, ARENA_R + 0.62, 0.14, 56, SP.bronze)

  // ── Muro de cantaria com cinta de latão (aberto no portão, em −z) ──
  const WALL_R = ARENA_R + 0.9
  const segs = 40
  for (let i = 0; i < segs; i++) {
    const a = (i / segs) * Math.PI * 2
    if (atGate(a, 0.16)) continue
    const len = (2 * Math.PI * WALL_R) / segs + 0.05
    const f = place(Math.sin(a) * WALL_R, 0, Math.cos(a) * WALL_R, a)
    wall.box(len, 1.3, 0.6, place(0, 0.65, 0, 0, f), i % 2 ? SP.masonry : SP.masonryDark)
    props.box(len, 0.16, 0.66, place(0, 1.22, 0, 0, f), SP.brassDark)
    props.box(len + 0.02, 0.06, 0.7, place(0, 1.33, 0, 0, f), SP.iron)
    for (const dx of [-len * 0.3, len * 0.3]) props.box(0.06, 0.06, 0.04, place(dx, 1.22, -0.34, 0, f), SP.brass)
  }

  // ── Arquibancada: três anéis de cantaria em degrau, guarda-corpo de ferro ──
  const tiers = [
    { r: WALL_R + 1.6, h: 1.8 },
    { r: WALL_R + 3.2, h: 3.0 },
    { r: WALL_R + 4.8, h: 4.2 },
  ]
  tiers.forEach((tr, i) => {
    const n = 44
    for (let k = 0; k < n; k++) {
      const a = (k / n) * Math.PI * 2
      if (atGate(a, 0.3)) continue
      const len = (2 * Math.PI * (tr.r + 0.2)) / n + 0.08
      const f = place(Math.sin(a) * (tr.r + 0.2), 0, Math.cos(a) * (tr.r + 0.2), a)
      wall.box(len, tr.h, 1.6, place(0, tr.h / 2 - 0.02, 0, 0, f), (i + k) % 2 ? SP.stoneDark : SP.stone)
      // friso de latão no espelho do degrau e o corrimão de ferro na quina
      props.box(len, 0.08, 0.06, place(0, tr.h - 0.08, -0.82, 0, f), SP.brassDark)
      if (k % 2 === 0) props.box(0.05, 0.9, 0.05, place(-len / 2, tr.h + 0.45, -0.76, 0, f), SP.iron)
      props.box(len, 0.05, 0.05, place(0, tr.h + 0.9, -0.76, 0, f), SP.iron)
      // lanternas no último degrau
      if (i === 2 && k % 6 === 3) postLantern(ctx, 0, tr.h + 0.95, -0.76, 0.7, f)
    }
  })
  // Muro de fecho por trás do último degrau (o horizonte fica limpo, o anel fecha).
  for (let k = 0; k < 44; k++) {
    const a = (k / 44) * Math.PI * 2
    if (atGate(a, 0.3)) continue
    const r = WALL_R + 5.7
    const len = (2 * Math.PI * r) / 44 + 0.1
    const f = place(Math.sin(a) * r, 0, Math.cos(a) * r, a)
    wall.box(len, 6.2, 0.5, place(0, 3.1, 0, 0, f), SP.masonryDark)
    props.box(len + 0.04, 0.3, 0.6, place(0, 6.2, 0, 0, f), SP.ironWarm)
    // janelas em arco acesas na parede de fora (vistas de longe)
    if (k % 2 === 0) glow.box(0.7, 1.2, 0.04, place(0, 3.6, 0.27, 0, f), SP.windowGlow)
  }

  // ── Plateia (instância fina): corpo e cabeça ──
  const fanBody = keep(CreateBox("laminas-fan", { width: 0.42, height: 0.6, depth: 0.32 }, scene))
  const fanHead = keep(CreateSphere("laminas-fan-head", { diameter: 0.3, segments: 6 }, scene))
  const fanMat = new StandardMaterial("laminas-fan", scene)
  fanMat.specularColor = new Color3(0.04, 0.04, 0.04)
  const headMat = new StandardMaterial("laminas-fan-head", scene)
  headMat.diffuseColor = Color3.FromHexString("#c58c62")
  headMat.specularColor = new Color3(0.04, 0.04, 0.04)
  mats.push(fanMat, headMat)
  fanBody.material = fanMat
  fanHead.material = headMat
  // Roupas de época: bordô, verde-garrafa, marrom, creme, azul-petróleo, mostarda, cinza.
  const shirts = ["#7a2121", "#2f4a32", "#5c3d26", "#e2d4b4", "#24414d", "#b5862e", "#55524c"].map((h) => Color3.FromHexString(h))
  const fans: { x: number; y: number; z: number; a: number; ph: number }[] = []
  const per = low ? 26 : 52
  tiers.forEach((tr) => {
    for (let k = 0; k < per; k++) {
      const a = (k / per) * Math.PI * 2 + tr.r
      if (atGate(a, 0.3)) continue
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
  const q = new Quaternion()
  const pos = new Vector3()
  const one = Vector3.One()
  const writeFans = (jump: number, time: number) => {
    fans.forEach((f, i) => {
      const up = jump > 0 ? Math.max(0, Math.sin(time * 9 + f.ph)) * 0.35 * jump : Math.sin(time * 1.3 + f.ph) * 0.02
      Quaternion.RotationYawPitchRollToRef(f.a, 0, 0, q)
      pos.set(f.x, f.y + up, f.z)
      Matrix.Compose(one, q, pos).copyToArray(bodyM, i * 16)
      pos.y += 0.45
      Matrix.Compose(one, q, pos).copyToArray(headM, i * 16)
    })
    fanBody.thinInstanceSetBuffer("matrix", bodyM, 16, false)
    fanHead.thinInstanceSetBuffer("matrix", headM, 16, false)
  }
  writeFans(0, 0)

  // ── Estandartes (vermelho com faixa de latão) em mastros de ferro ──
  const N_BANNER = 8
  for (let i = 0; i < N_BANNER; i++) {
    const a = ((i + 0.5) / N_BANNER) * Math.PI * 2
    const r = WALL_R + 0.1
    const f = place(Math.sin(a) * r, 0, Math.cos(a) * r, a)
    props.cylinder(0.14, 5.2, place(0, 2.6, 0, 0, f), SP.iron, 6)
    props.cone(0.02, 0.2, 0.36, place(0, 5.38, 0, 0, f), SP.brass, 6)
    props.box(1.0, 0.06, 0.06, place(0, 5.0, -0.06, 0, f), SP.brassDark)
    props.box(0.9, 1.8, 0.04, place(0, 4.1, -0.08, 0, f), [0.6, 0.1, 0.12])
    props.box(0.92, 0.16, 0.05, place(0, 3.55, -0.09, 0, f), SP.brass)
    props.gear(0.2, 0.03, 7, facing(0, 4.4, -0.11, f), SP.brass, SP.bronze)
  }

  // ── Braseiros de ferro (a chama mexe) ──
  const flameMat = new StandardMaterial("laminas-flame", scene)
  flameMat.disableLighting = true
  flameMat.emissiveColor = Color3.FromHexString("#ffb347")
  mats.push(flameMat)
  const torches: Mesh[] = []
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4
    const r = WALL_R - 0.05
    const x = Math.sin(a) * r
    const z = Math.cos(a) * r
    for (let k = 0; k < 3; k++) {
      const b = (k / 3) * Math.PI * 2
      props.tube([x + Math.sin(b) * 0.3, 1.3, z + Math.cos(b) * 0.3], [x, 2.15, z], 0.035, SP.iron, 4)
    }
    props.cone(0.62, 0.3, 0.3, place(x, 2.25, z), SP.ironWarm, 10)
    props.ring(0.62, 0.05, place(x, 2.4, z), SP.brass, 12, 3)
    const fl = keep(CreateSphere(`laminas-flame-${i}`, { diameter: 0.42, segments: 6 }, scene))
    fl.position.set(x, 2.6, z)
    fl.scaling.y = 1.6
    fl.material = flameMat
    torches.push(fl)
    ctx.vents.push([x, 3.1, z])
  }

  // ── Portão (−z): pórtico de ferro com a engrenagem e as espadas cruzadas ──
  const gateZ = -(WALL_R + 0.2)
  gearArch(ctx, 0, 0, gateZ, 0, 4.0, 4.3, 1.1)
  for (const s of [-1, 1]) {
    const f = xf(0, 7.1, gateZ - 0.2, 0, undefined, 0, s * 0.62)
    props.box(0.32, 4.6, 0.08, f, SP.steelLight)
    props.box(0.06, 4.4, 0.1, f, SP.steel)
    props.box(1.1, 0.16, 0.16, xf(0, -1.7, 0, 0, f), SP.brass)
    props.box(0.12, 0.7, 0.12, xf(0, -2.1, 0, 0, f), SP.woodDark)
  }

  // ── Por fora: caldeiras, chaminés, fábricas e dirigíveis ──
  for (const a of [Math.PI * 0.25, Math.PI * 0.75, Math.PI * 1.25, Math.PI * 1.75]) {
    const r = WALL_R + 8.5
    boiler(ctx, Math.sin(a) * r, Math.cos(a) * r, a + Math.PI, 1.4)
  }
  for (const [a, h] of [[0.35, 16], [-0.4, 19], [Math.PI * 0.55, 14], [-Math.PI * 0.6, 15]] as const) {
    smokestack(ctx, Math.sin(a) * (WALL_R + 10), Math.cos(a) * (WALL_R + 10), h, 0.9)
  }
  factorySkyline(ctx, 0, 0, 62, low ? 8 : 14, 0, 48, 1.3)
  stage.build("laminas-arena")
  const fleet = low ? null : new AirshipFleet(scene, stage.mats, fleetRing(4, 42, 60, 24, 36, 16, 48))

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
      fleet?.dispose()
      stage.dispose()
      for (const m of meshes) m.dispose()
      for (const m of mats) m.dispose()
      sand.dispose()
    },
  }
}

