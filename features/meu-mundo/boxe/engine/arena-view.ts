// features/meu-mundo/boxe/engine/arena-view.ts — ARENA DE BOXE (mm3d-43): o ginásio.
//
// mm3d-55 — STEAMPUNK: um ginásio vitoriano de tijolo e ferro fundido. O
// ringue elevado (lona creme com o círculo rubi e o raio de latão no meio,
// saia de couro com a faixa rubi e cantoneiras rebitadas, 4 postes de ferro
// com capitel de latão — almofada vermelha no canto do lutador 0, azul no do
// 1, marfim nos neutros — e 3 cordas com esticadores de latão), arquibancada
// de madeira com guarda-corpo de ferro e a plateia em roupas de época
// (instância fina: corpo + cabeça; pula com a emoção), a treliça de ferro
// rebitada com as lâmpadas de filamento e os fachos âmbar sobre o ringue, o
// placar mecânico de latão lá em cima (quatro mostradores), e em volta as
// paredes de tijolo com janelas em arco, canos de cobre, manômetros,
// engrenagens que giram e caldeiras soltando vapor nos cantos.
// Chão do ringue em y = RING_Y; o centro é a origem.
//
// O estático é uma malha por material (SteamStage); os postes/cordas/lona
// têm material próprio por causa das cores dos cantos.

import type { Scene } from "@babylonjs/core/scene"
import "@babylonjs/core/Meshes/thinInstanceMesh"
import type { Mesh } from "@babylonjs/core/Meshes/mesh"
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial"
import { DynamicTexture } from "@babylonjs/core/Materials/Textures/dynamicTexture"
import { Color3 } from "@babylonjs/core/Maths/math.color"
import { Matrix, Quaternion, Vector3 } from "@babylonjs/core/Maths/math.vector"
import { CreateBox } from "@babylonjs/core/Meshes/Builders/boxBuilder"
import { CreateSphere } from "@babylonjs/core/Meshes/Builders/sphereBuilder"
import { CreateCylinder } from "@babylonjs/core/Meshes/Builders/cylinderBuilder"
import { Constants } from "@babylonjs/core/Engines/constants"
import { boiler, gauge, postLantern } from "../../engine/steampunk/kit"
import { SP, SteamStage, facing, pipeRun, place, shade, tierOf } from "../../engine/steampunk/scenery"

/** Altura da lona (m). */
export const RING_Y = 1.0
/** Meia largura até o poste (m). */
const POST = 3.3
const ROPES = [0.45, 0.85, 1.25]
export const RED = new Color3(0.86, 0.1, 0.2)
export const BLUE = new Color3(0.16, 0.38, 0.95)
/** Paredes do ginásio: meia largura (m). */
const HALL = 16.5

function mat(scene: Scene, name: string, c: Color3, o: { emissive?: number; spec?: number; unlit?: boolean } = {}) {
  const m = new StandardMaterial(name, scene)
  m.diffuseColor = c
  m.specularColor = new Color3(o.spec ?? 0.05, o.spec ?? 0.05, o.spec ?? 0.05)
  if (o.emissive) m.emissiveColor = c.scale(o.emissive)
  if (o.unlit) {
    m.disableLighting = true
    m.emissiveColor = c
  }
  return m
}

/** Lona: tecido creme, círculo rubi com aro e raio de latão, cantos vermelho e azul (sem texto). */
function canvasTexture(scene: Scene) {
  const S = 512
  const t = new DynamicTexture("boxe-canvas", { width: S, height: S }, scene, true)
  const g = t.getContext() as CanvasRenderingContext2D
  g.fillStyle = "#ddd3bd"
  g.fillRect(0, 0, S, S)
  // trama do tecido e manchas de uso
  g.globalAlpha = 0.06
  for (let i = 0; i < S; i += 4) {
    g.fillStyle = i % 8 ? "#000" : "#fff"
    g.fillRect(0, i, S, 2)
  }
  g.globalAlpha = 0.05
  for (let i = 0; i < 40; i++) {
    g.fillStyle = "#5a3e22"
    g.beginPath()
    g.arc(Math.random() * S, Math.random() * S, 10 + Math.random() * 40, 0, Math.PI * 2)
    g.fill()
  }
  g.globalAlpha = 1
  g.strokeStyle = "#3a2a1c"
  g.lineWidth = 18
  g.strokeRect(9, 9, S - 18, S - 18)
  g.strokeStyle = "#a0742c"
  g.lineWidth = 4
  g.strokeRect(22, 22, S - 44, S - 44)
  const c = S / 2
  g.fillStyle = "rgba(170,24,40,0.9)"
  g.beginPath()
  g.arc(c, c, S * 0.17, 0, Math.PI * 2)
  g.fill()
  // aro de latão com dentes de engrenagem
  g.fillStyle = "#c69a37"
  for (let i = 0; i < 20; i++) {
    const a = (i / 20) * Math.PI * 2
    g.save()
    g.translate(c + Math.cos(a) * S * 0.185, c + Math.sin(a) * S * 0.185)
    g.rotate(a)
    g.fillRect(-7, -6, 14, 12)
    g.restore()
  }
  g.strokeStyle = "#c69a37"
  g.lineWidth = 8
  g.beginPath()
  g.arc(c, c, S * 0.17, 0, Math.PI * 2)
  g.stroke()
  // raio de latão no círculo (o mesmo dos cartazes da fachada)
  g.fillStyle = "#e0b552"
  g.beginPath()
  const pts: [number, number][] = [[-10, -46], [22, -6], [4, -6], [16, 44], [-22, 2], [-4, 2]]
  pts.forEach(([x, y], i) => (i ? g.lineTo(c + x * 1.2, c + y * 1.2) : g.moveTo(c + x * 1.2, c + y * 1.2)))
  g.closePath()
  g.fill()
  // cantos vermelho e azul
  g.fillStyle = "rgba(200,30,50,0.9)"
  g.beginPath()
  g.moveTo(0, S)
  g.lineTo(70, S)
  g.lineTo(0, S - 70)
  g.fill()
  g.fillStyle = "rgba(40,90,220,0.9)"
  g.beginPath()
  g.moveTo(S, 0)
  g.lineTo(S - 70, 0)
  g.lineTo(S, 70)
  g.fill()
  t.update()
  return t
}

export interface Arena {
  /** Emoção da plateia (0–1): eles pulam. */
  setHype(v: number): void
  tick(dt: number): void
  dispose(): void
}

export function buildArena(scene: Scene, low: boolean): Arena {
  const owned: { dispose(): void }[] = []
  const keep = <T extends { dispose(): void }>(x: T) => (owned.push(x), x)
  const stage = new SteamStage(scene, tierOf(low), { wall: true, night: 1 })
  const { ctx } = stage
  const { props, glow, wall, pavers } = ctx

  // ── chão do ginásio: lajes escuras de pedra, assoalho de madeira em volta do ringue ──
  pavers.box(70, 0.1, 70, place(0, -0.05, 0), shade(SP.stoneDark, 0.7))
  for (let i = 0; i < 26; i++) {
    const x = -7.5 + i * 0.6
    props.box(0.6, 0.04, 15, place(x + 0.3, 0.02, 0), shade(SP.wood, 0.85 + ((i * 7) % 5) * 0.05))
  }

  // ── ringue ───────────────────────────────────────────────────────────────
  const W = 2 * POST + 0.9
  // Saia de couro escuro com cantoneiras e rebites de latão, e a faixa rubi.
  props.box(W, RING_Y, W, place(0, RING_Y / 2, 0), [0.22, 0.13, 0.09])
  props.box(W + 0.04, 0.12, W + 0.04, place(0, RING_Y - 0.25, 0), [0.62, 0.1, 0.14])
  props.box(W + 0.05, 0.04, W + 0.05, place(0, RING_Y - 0.17, 0), SP.brass)
  props.box(W + 0.05, 0.04, W + 0.05, place(0, RING_Y - 0.33, 0), SP.brass)
  props.box(W + 0.06, 0.1, W + 0.06, place(0, 0.05, 0), SP.ironWarm)
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) props.box(0.18, RING_Y, 0.18, place((sx * W) / 2, RING_Y / 2, (sz * W) / 2), SP.brassDark)
  for (let s = 0; s < 4; s++) {
    const f = place(0, 0, 0, (s * Math.PI) / 2)
    for (let k = 0; k < 9; k++) props.box(0.06, 0.06, 0.03, place(-W / 2 + 0.5 + (k * (W - 1)) / 8, RING_Y * 0.42, -W / 2 - 0.02, 0, f), SP.brass)
    // escadinha de ferro no meio de dois lados
    if (s % 2 === 0) for (let k = 0; k < 3; k++) props.box(1.0, 0.06, 0.32, place(0, 0.25 + k * 0.28, -W / 2 - 0.25 - (2 - k) * 0.12, 0, f), SP.iron)
  }
  const lona = keep(CreateBox("boxe-ring-canvas", { width: 2 * POST + 0.7, depth: 2 * POST + 0.7, height: 0.06 }, scene))
  lona.position.y = RING_Y - 0.02
  const lm = keep(mat(scene, "boxe-ring-canvas-m", new Color3(1, 1, 1), { spec: 0.08 }))
  lm.diffuseTexture = keep(canvasTexture(scene))
  lona.material = lm
  lona.isPickable = false

  // postes de ferro com capitel de latão: (−,−) vermelho = canto do lutador 0; (+,+) azul = lutador 1
  const postMats = {
    red: keep(mat(scene, "boxe-post-red", RED, { emissive: 0.25 })),
    blue: keep(mat(scene, "boxe-post-blue", BLUE, { emissive: 0.25 })),
    white: keep(mat(scene, "boxe-post-white", new Color3(0.88, 0.82, 0.7))),
  }
  for (const [sx, sz] of [
    [-1, -1],
    [1, 1],
    [1, -1],
    [-1, 1],
  ]) {
    const x = sx * POST
    const z = sz * POST
    props.cylinder(0.16, 1.55, place(x, RING_Y + 0.75, z), SP.iron, 10)
    props.cylinder(0.26, 0.1, place(x, RING_Y + 1.55, z), SP.brass, 10)
    props.with("flat", () => props.sphere(0.16, [1, 1, 1], place(x, RING_Y + 1.66, z), SP.brass, 6))
    props.cylinder(0.24, 0.12, place(x, RING_Y + 0.06, z), SP.brassDark, 10)
    // esticadores das cordas
    for (const h of ROPES) props.box(0.12, 0.08, 0.12, place(x - sx * 0.12, RING_Y + h, z - sz * 0.12), SP.brass)
    const pad = keep(CreateBox("boxe-pad", { width: 0.3, depth: 0.3, height: 1.05 }, scene))
    pad.position.set(sx * (POST - 0.12), RING_Y + 0.85, sz * (POST - 0.12))
    pad.rotation.y = Math.PI / 4
    pad.material = sx < 0 && sz < 0 ? postMats.red : sx > 0 && sz > 0 ? postMats.blue : postMats.white
    pad.isPickable = false
  }
  // cordas: marfim, rubi, marfim (couro encerado)
  const ropeMats = [
    keep(mat(scene, "boxe-rope-w", new Color3(0.9, 0.84, 0.72), { emissive: 0.15 })),
    keep(mat(scene, "boxe-rope-r", new Color3(0.72, 0.1, 0.16), { emissive: 0.3 })),
  ]
  ROPES.forEach((h, i) => {
    for (let s = 0; s < 4; s++) {
      const rope = keep(CreateCylinder("boxe-rope", { height: 2 * POST, diameter: 0.05, tessellation: 6 }, scene))
      rope.rotation.z = Math.PI / 2
      if (s >= 2) rope.rotation.y = Math.PI / 2
      const d = (s % 2 ? 1 : -1) * POST
      if (s < 2) rope.position.set(0, RING_Y + h, d)
      else rope.position.set(d, RING_Y + h, 0)
      rope.material = ropeMats[i === 1 ? 1 : 0]
      rope.isPickable = false
    }
  })

  // ── arquibancada de madeira com guarda-corpo de ferro, e a plateia ───────
  const rows = low ? 4 : 6
  for (let r = 0; r < rows; r++) {
    const d = 8.5 + r * 1.2
    const h = 0.35 + r * 0.55
    for (let s = 0; s < 4; s++) {
      const ang = (s * Math.PI) / 2
      const f = place(Math.sin(ang) * (d + 0.6), 0, Math.cos(ang) * (d + 0.6), ang)
      props.box(2 * d + 1.2, h, 1.2, place(0, h / 2, 0, 0, f), r % 2 ? SP.woodDark : shade(SP.woodDark, 1.15))
      props.box(2 * d + 1.2, 0.05, 0.08, place(0, h - 0.03, -0.6, 0, f), SP.brassDark)
      if (r === 0) {
        // guarda-corpo do primeiro degrau
        props.box(2 * d + 1.2, 0.05, 0.05, place(0, h + 0.9, -0.66, 0, f), SP.iron)
        for (let k = -d; k <= d; k += 1.5) props.box(0.05, 0.9, 0.05, place(k, h + 0.45, -0.66, 0, f), SP.iron)
      }
    }
  }
  // gente: um corpo (caixa) e uma cabeça (esfera) por pessoa, em instância fina
  const body = keep(CreateBox("boxe-fan-body", { width: 0.42, depth: 0.28, height: 0.62 }, scene))
  const head = keep(CreateSphere("boxe-fan-head", { diameter: 0.26, segments: 6 }, scene))
  const fanMat = keep(mat(scene, "boxe-fan-m", new Color3(1, 1, 1)))
  const headMat = keep(mat(scene, "boxe-fan-h", new Color3(1, 1, 1)))
  body.material = fanMat
  head.material = headMat
  body.isPickable = head.isPickable = false
  // Roupas de época (paletó, colete, vestido): tons fechados com um ou outro claro.
  const SHIRTS = ["#7a2121", "#2f4a32", "#5c3d26", "#e2d4b4", "#24414d", "#b5862e", "#55524c", "#3a2b40", "#8c5a2e", "#1f2430", "#a8462e"]
  const SKINS = ["#fbe3d3", "#e8b48f", "#d9a27a", "#c08660", "#a06a45", "#7a4d31", "#4e3020"]
  const fans: { x: number; y: number; z: number; ry: number; ph: number; amp: number }[] = []
  let seed = 7
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647)
  for (let r = 0; r < rows; r++) {
    const d = 8.5 + r * 1.2 + 0.6
    const y = 0.35 + r * 0.55
    for (let s = 0; s < 4; s++) {
      const ang = (s * Math.PI) / 2
      const span = d + 0.4
      for (let u = -span; u <= span; u += low ? 1.15 : 0.8) {
        if (rnd() < 0.12) continue
        const lx = u + (rnd() - 0.5) * 0.2
        const x = Math.sin(ang) * d + Math.cos(ang) * lx
        const z = Math.cos(ang) * d - Math.sin(ang) * lx
        fans.push({ x, y, z, ry: ang + Math.PI, ph: rnd() * 6.28, amp: 0.5 + rnd() })
      }
    }
  }
  const n = fans.length
  const bodyM = new Float32Array(n * 16)
  const headM = new Float32Array(n * 16)
  const bodyC = new Float32Array(n * 4)
  const headC = new Float32Array(n * 4)
  const hex = (h: string) => Color3.FromHexString(h)
  fans.forEach((f, i) => {
    const c = hex(SHIRTS[Math.floor(rnd() * SHIRTS.length)])
    const k = hex(SKINS[Math.floor(rnd() * SKINS.length)])
    bodyC.set([c.r, c.g, c.b, 1], i * 4)
    headC.set([k.r, k.g, k.b, 1], i * 4)
  })
  const q = new Quaternion()
  const one = new Vector3(1, 1, 1)
  const tmp = Matrix.Identity()
  const at = new Vector3()
  const placeFans = (jump: number, time: number) => {
    fans.forEach((f, i) => {
      const hop = jump > 0.02 ? Math.max(0, Math.sin(time * (7 + f.amp * 3) + f.ph)) * 0.22 * jump * f.amp : 0
      Quaternion.RotationYawPitchRollToRef(f.ry, 0, 0, q)
      Matrix.ComposeToRef(one, q, at.set(f.x, f.y + 0.31 + hop, f.z), tmp)
      tmp.copyToArray(bodyM, i * 16)
      Matrix.ComposeToRef(one, q, at.set(f.x, f.y + 0.76 + hop, f.z), tmp)
      tmp.copyToArray(headM, i * 16)
    })
    body.thinInstanceSetBuffer("matrix", bodyM, 16, false)
    head.thinInstanceSetBuffer("matrix", headM, 16, false)
  }
  placeFans(0, 0)
  body.thinInstanceSetBuffer("color", bodyC, 4, true)
  head.thinInstanceSetBuffer("color", headC, 4, true)
  fanMat.diffuseColor = new Color3(0.78, 0.74, 0.7)
  headMat.diffuseColor = new Color3(0.8, 0.78, 0.74)
  for (const m of [body, head]) m.alwaysSelectAsActiveMesh = true

  // ── treliça de ferro rebitada, lâmpadas de filamento, fachos e o placar ──
  const TY = 8.2
  for (let s = 0; s < 4; s++) {
    const f = place(0, 0, 0, (s * Math.PI) / 2)
    // banzo de cima e de baixo e as diagonais (treliça Warren)
    props.box(9.4, 0.12, 0.3, place(0, TY + 0.2, -4.5, 0, f), SP.iron)
    props.box(9.4, 0.12, 0.3, place(0, TY - 0.2, -4.5, 0, f), SP.iron)
    for (let k = 0; k < 12; k++) {
      const x = -4.5 + k * 0.78
      props.tube([x, TY - 0.2, -4.5], [x + 0.39, TY + 0.2, -4.5], 0.03, SP.ironHi, 4, f)
      props.tube([x + 0.39, TY + 0.2, -4.5], [x + 0.78, TY - 0.2, -4.5], 0.03, SP.ironHi, 4, f)
    }
    props.box(9.5, 0.04, 0.32, place(0, TY + 0.27, -4.5, 0, f), SP.brassDark)
  }
  // correntes até o teto
  for (const [x, z] of [[-4.5, -4.5], [4.5, -4.5], [-4.5, 4.5], [4.5, 4.5]]) props.tube([x, TY + 0.2, z], [x * 0.6, TY + 6, z * 0.6], 0.03, SP.iron, 4)
  const beamMat = keep(new StandardMaterial("boxe-beam", scene))
  beamMat.disableLighting = true
  beamMat.emissiveColor = new Color3(1, 0.82, 0.55)
  beamMat.alpha = low ? 0.05 : 0.075
  beamMat.alphaMode = Constants.ALPHA_ADD
  beamMat.backFaceCulling = false
  const beams: Mesh[] = []
  for (const [x, z] of [
    [-4.5, -4.5],
    [4.5, -4.5],
    [-4.5, 4.5],
    [4.5, 4.5],
    [0, -4.5],
    [0, 4.5],
  ]) {
    // luminária de latão (cúpula) com a lâmpada âmbar acesa por baixo
    props.cone(0.36, 0.7, 0.34, place(x, TY - 0.36, z), SP.brass, 10)
    props.cylinder(0.08, 0.3, place(x, TY - 0.05, z), SP.iron, 6)
    glow.cylinder(0.5, 0.06, place(x, TY - 0.55, z), SP.lampGlass, 10)
    // facho: do refletor até a lona, apontando para o meio
    const from = new Vector3(x, TY - 0.4, z)
    const to = new Vector3(x * 0.25, RING_Y, z * 0.25)
    const len = Vector3.Distance(from, to)
    const beam = keep(CreateCylinder("boxe-beam", { height: len, diameterTop: 0.55, diameterBottom: 3.4, tessellation: 16, cap: 0 }, scene))
    beam.position = Vector3.Center(from, to)
    const dir = to.subtract(from).normalize()
    const axis = Vector3.Cross(Vector3.Down(), dir)
    const angle = Math.acos(Vector3.Dot(Vector3.Down(), dir))
    if (axis.lengthSquared() > 1e-6) beam.rotationQuaternion = Quaternion.RotationAxis(axis.normalize(), angle)
    beam.material = beamMat
    beam.isPickable = false
    beams.push(beam)
  }
  // placar mecânico: caixa de madeira com moldura de latão e um mostrador por lado
  const SY = TY + 1.6
  props.box(3.4, 1.9, 3.4, place(0, SY, 0), SP.woodDark)
  for (const dy of [-0.98, 0.98]) props.box(3.55, 0.1, 3.55, place(0, SY + dy, 0), SP.brass)
  for (let s = 0; s < 4; s++) {
    const f = place(0, 0, 0, (s * Math.PI) / 2)
    props.ring(1.25, 0.08, facing(0, SY, -1.74, f), SP.brass, 20, 3)
    glow.cylinder(1.18, 0.02, facing(0, SY, -1.72, f), SP.board, 20)
    props.box(0.05, 0.5, 0.02, place(0.06, SY + 0.18, -1.75, 0, f), SP.iron)
    props.box(0.04, 0.36, 0.02, place(-0.1, SY - 0.1, -1.75, 0.9, f), SP.iron)
    // a engrenagem do placar gira (cada lado no seu sentido)
    ctx.gears.push({ m: facing(1.2, SY + 0.55, -1.76, f), r: 0.3, thick: 0.05, speed: s % 2 ? 0.8 : -0.8 })
  }

  // ── paredes de tijolo com janelas em arco, canos, manômetros e caldeiras ──
  for (let s = 0; s < 4; s++) {
    const f = place(0, 0, 0, (s * Math.PI) / 2)
    wall.box(2 * HALL + 0.6, 12, 0.6, place(0, 6, -HALL, 0, f), SP.brick)
    props.box(2 * HALL + 0.7, 0.4, 0.8, place(0, 12, -HALL, 0, f), SP.ironWarm)
    props.box(2 * HALL + 0.7, 0.18, 0.7, place(0, 4.6, -HALL + 0.05, 0, f), SP.stoneLight)
    for (let k = -3; k <= 3; k++) {
      const x = k * 4.4
      // pilastra de ferro entre as janelas
      props.box(0.5, 12, 0.3, place(x + 2.2, 6, -HALL + 0.4, 0, f), SP.iron)
      // janela em arco: caixilho de ferro, vidro âmbar aceso (é noite lá fora)
      glow.box(2.0, 3.2, 0.04, place(x, 7.6, -HALL + 0.32, 0, f), SP.windowGlow)
      glow.with("flat", () => glow.cylinder(2.0, 0.04, facing(x, 9.2, -HALL + 0.32, f), SP.windowGlow, 12))
      props.box(2.2, 0.12, 0.1, place(x, 6.0, -HALL + 0.38, 0, f), SP.iron)
      props.box(0.08, 4.4, 0.08, place(x, 7.8, -HALL + 0.38, 0, f), SP.iron)
      props.box(2.0, 0.06, 0.08, place(x, 8.2, -HALL + 0.38, 0, f), SP.iron)
    }
    // cano de cobre correndo a 3,4 m com manômetros
    pipeRun(ctx, [[-HALL + 1.5, 3.4, -HALL + 0.55], [HALL - 1.5, 3.4, -HALL + 0.55]], 0.12, SP.copper, f)
    for (const x of [-9, 0, 9]) gauge(ctx, x, 2.6, -HALL + 0.5, f, 1.6)
    for (const x of [-12, -4, 4, 12]) postLantern(ctx, x, 3.0, -HALL + 0.7, 0.75, f)
    // engrenagens grandes paradas na parede, uma girando
    props.gear(1.1, 0.12, 14, facing(-HALL + 4, 10.5, -HALL + 0.4, f), SP.bronze, SP.brassDark)
    ctx.gears.push({ m: facing(-HALL + 5.7, 10.0, -HALL + 0.32, f), r: 0.7, thick: 0.1, speed: 0.5 })
  }
  for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]] as const) boiler(ctx, x * (HALL - 2.5), z * (HALL - 2.5), Math.atan2(-x, -z), 1.4)
  stage.build("boxe-hall")

  let hype = 0.2
  let time = 0
  let acc = 0
  let hopping = false
  return {
    setHype(v) {
      hype = Math.max(hype, Math.min(1, v))
    },
    tick(dt) {
      time += dt
      hype += (0.15 - hype) * Math.min(1, dt * 0.6)
      for (const b of beams) (b.material as StandardMaterial).alpha = (low ? 0.05 : 0.075) * (0.85 + 0.3 * hype)
      // a plateia só se mexe ~12 vezes por segundo (barato) e só com emoção
      acc += dt
      if (acc > 1 / 12) {
        acc = 0
        if (hype > 0.3) {
          placeFans(hype - 0.25, time)
          hopping = true
        } else if (hopping) {
          placeFans(0, time)
          hopping = false
        }
      }
    },
    dispose() {
      stage.dispose()
      for (const o of owned.reverse()) o.dispose()
    },
  }
}
