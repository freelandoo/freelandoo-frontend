// features/meu-mundo/laminas/engine/ring-view.ts — o RINGUE da Arena de Boxe (mm3d-56).
//
// Pedido do Alex (30/10): o prédio do Boxe roda a MESMA luta da Arena das
// Lâminas (sim/fight.ts, intocada) e só o lugar muda: um ringue BEM GRANDE
// com as luzes em cima, como o ginásio do boxe antigo (mm3d-43/55), que foi
// apagado. É o ginásio vitoriano esticado para caber o círculo da luta
// (ARENA_R = 11 m): a lona fica em y = 0 (onde a regra põe todo mundo), a
// saia do ringue desce até o chão do ginásio em −RING_Y, as cordas passam do
// lado de fora do círculo (os cantos ficam sobrando — quem prende a luta é a
// regra, nada aqui colide). Lona creme com o círculo rubi, o raio de latão e
// os cantos vermelho e azul; postes de ferro com capitel de latão; 3 cordas;
// arquibancada de madeira com a plateia de época (instância fina; pula com a
// emoção); a treliça de ferro rebitada com as luminárias de latão e os
// fachos âmbar sobre a lona; o placar mecânico lá em cima; paredes de tijolo
// com janelas em arco, canos de cobre, manômetros, engrenagens e caldeiras.
//
// O estático é uma malha por material (SteamStage); lona, almofadas e cordas
// têm material próprio por causa das cores.

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
import { ARENA_R } from "../sim/fight"
import { boiler, gauge, postLantern } from "../../engine/steampunk/kit"
import { SP, SteamStage, facing, pipeRun, place, shade, tierOf } from "../../engine/steampunk/scenery"
import type { ArenaView } from "./arena-view"

/** Altura da lona sobre o chão do ginásio (m); a lona é o y = 0 da luta. */
const RING_Y = 1.2
/** Meia largura até o poste (m): as cordas ficam por fora do círculo da luta. */
const POST = ARENA_R + 0.8
const ROPES = [0.6, 1.15, 1.7]
const RED = new Color3(0.86, 0.1, 0.2)
const BLUE = new Color3(0.16, 0.38, 0.95)
/** Primeira fileira da arquibancada (distância do centro, m). */
const STAND = POST + 4.5
/** Paredes do ginásio: meia largura (m). */
const HALL = POST + 16
/** Altura da treliça das luzes sobre a lona (m). */
const TY = 12
/** Lado do quadro da treliça (meia largura, m). */
const TRUSS = 8.4
/** Chão do ginásio. */
const G = -RING_Y

function mat(scene: Scene, name: string, c: Color3, o: { emissive?: number; spec?: number } = {}) {
  const m = new StandardMaterial(name, scene)
  m.diffuseColor = c
  m.specularColor = new Color3(o.spec ?? 0.05, o.spec ?? 0.05, o.spec ?? 0.05)
  if (o.emissive) m.emissiveColor = c.scale(o.emissive)
  return m
}

/** Lona: tecido creme, círculo rubi com aro dentado e raio de latão, cantos vermelho e azul (sem texto). */
function canvasTexture(scene: Scene) {
  const S = 1024
  const t = new DynamicTexture("ring-canvas", { width: S, height: S }, scene, true)
  const g = t.getContext() as CanvasRenderingContext2D
  g.fillStyle = "#ddd3bd"
  g.fillRect(0, 0, S, S)
  // trama do tecido e manchas de uso
  g.globalAlpha = 0.05
  for (let i = 0; i < S; i += 4) {
    g.fillStyle = i % 8 ? "#000" : "#fff"
    g.fillRect(0, i, S, 2)
  }
  let seed = 3
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647)
  g.globalAlpha = 0.05
  for (let i = 0; i < 70; i++) {
    g.fillStyle = "#5a3e22"
    g.beginPath()
    g.arc(rnd() * S, rnd() * S, 14 + rnd() * 60, 0, Math.PI * 2)
    g.fill()
  }
  g.globalAlpha = 1
  g.strokeStyle = "#3a2a1c"
  g.lineWidth = 22
  g.strokeRect(11, 11, S - 22, S - 22)
  g.strokeStyle = "#a0742c"
  g.lineWidth = 6
  g.strokeRect(32, 32, S - 64, S - 64)
  const c = S / 2
  // o círculo da luta, desenhado fino no tamanho de verdade (ARENA_R)
  g.strokeStyle = "rgba(120,30,30,0.35)"
  g.lineWidth = 5
  g.beginPath()
  g.arc(c, c, (S / 2) * (ARENA_R / (POST + 0.35)), 0, Math.PI * 2)
  g.stroke()
  g.fillStyle = "rgba(170,24,40,0.9)"
  g.beginPath()
  g.arc(c, c, S * 0.12, 0, Math.PI * 2)
  g.fill()
  // aro de latão com dentes de engrenagem
  g.fillStyle = "#c69a37"
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2
    g.save()
    g.translate(c + Math.cos(a) * S * 0.132, c + Math.sin(a) * S * 0.132)
    g.rotate(a)
    g.fillRect(-9, -8, 18, 16)
    g.restore()
  }
  g.strokeStyle = "#c69a37"
  g.lineWidth = 10
  g.beginPath()
  g.arc(c, c, S * 0.12, 0, Math.PI * 2)
  g.stroke()
  // raio de latão no círculo (o mesmo dos cartazes da fachada)
  g.fillStyle = "#e0b552"
  g.beginPath()
  const pts: [number, number][] = [[-10, -46], [22, -6], [4, -6], [16, 44], [-22, 2], [-4, 2]]
  pts.forEach(([x, y], i) => (i ? g.lineTo(c + x * 1.7, c + y * 1.7) : g.moveTo(c + x * 1.7, c + y * 1.7)))
  g.closePath()
  g.fill()
  // cantos vermelho e azul
  g.fillStyle = "rgba(200,30,50,0.9)"
  g.beginPath()
  g.moveTo(0, S)
  g.lineTo(110, S)
  g.lineTo(0, S - 110)
  g.fill()
  g.fillStyle = "rgba(40,90,220,0.9)"
  g.beginPath()
  g.moveTo(S, 0)
  g.lineTo(S - 110, 0)
  g.lineTo(S, 110)
  g.fill()
  t.update()
  return t
}

export function buildRing(scene: Scene, low: boolean): ArenaView {
  const owned: { dispose(): void }[] = []
  const keep = <T extends { dispose(): void }>(x: T) => (owned.push(x), x)
  const stage = new SteamStage(scene, tierOf(low), { wall: true, night: 1 })
  const { ctx } = stage
  const { props, glow, wall, pavers } = ctx

  // ── chão do ginásio: lajes escuras de pedra, assoalho de madeira em volta do ringue ──
  pavers.box(2 * HALL + 4, 0.1, 2 * HALL + 4, place(0, G - 0.05, 0), shade(SP.stoneDark, 0.7))
  const deck = POST + 3.5
  const boards = Math.round((2 * deck) / 0.6)
  for (let i = 0; i < boards; i++) {
    const x = -deck + i * 0.6
    props.box(0.6, 0.04, 2 * deck, place(x + 0.3, G + 0.02, 0), shade(SP.wood, 0.85 + ((i * 7) % 5) * 0.05))
  }

  // ── ringue ───────────────────────────────────────────────────────────────
  const W = 2 * POST + 0.9
  // Saia de couro escuro com a faixa rubi, frisos e rebites de latão.
  // (o topo fica 8 cm abaixo da lona: no mesmo plano as duas brigam na tela)
  props.box(W, RING_Y - 0.08, W, place(0, G + (RING_Y - 0.08) / 2, 0), [0.22, 0.13, 0.09])
  props.box(W + 0.04, 0.16, W + 0.04, place(0, -0.3, 0), [0.62, 0.1, 0.14])
  props.box(W + 0.05, 0.05, W + 0.05, place(0, -0.2, 0), SP.brass)
  props.box(W + 0.05, 0.05, W + 0.05, place(0, -0.4, 0), SP.brass)
  props.box(W + 0.06, 0.12, W + 0.06, place(0, G + 0.06, 0), SP.ironWarm)
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) props.box(0.22, RING_Y - 0.08, 0.22, place((sx * W) / 2, G + (RING_Y - 0.08) / 2, (sz * W) / 2), SP.brassDark)
  for (let s = 0; s < 4; s++) {
    const f = place(0, 0, 0, (s * Math.PI) / 2)
    for (let k = 0; k < 25; k++) props.box(0.07, 0.07, 0.03, place(-W / 2 + 0.6 + (k * (W - 1.2)) / 24, G + RING_Y * 0.45, -W / 2 - 0.02, 0, f), SP.brass)
    // escadinha de ferro no meio de dois lados
    if (s % 2 === 0) for (let k = 0; k < 4; k++) props.box(1.2, 0.06, 0.34, place(0, G + 0.24 + k * 0.28, -W / 2 - 0.25 - (3 - k) * 0.14, 0, f), SP.iron)
  }
  const lona = keep(CreateBox("ring-canvas", { width: 2 * POST + 0.7, depth: 2 * POST + 0.7, height: 0.06 }, scene))
  lona.position.y = -0.03
  const lm = keep(mat(scene, "ring-canvas-m", new Color3(1, 1, 1), { spec: 0.08 }))
  lm.diffuseTexture = keep(canvasTexture(scene))
  lona.material = lm
  lona.isPickable = false

  // postes de ferro com capitel de latão: (−,−) vermelho; (+,+) azul; os neutros em marfim
  const postMats = {
    red: keep(mat(scene, "ring-post-red", RED, { emissive: 0.25 })),
    blue: keep(mat(scene, "ring-post-blue", BLUE, { emissive: 0.25 })),
    white: keep(mat(scene, "ring-post-white", new Color3(0.88, 0.82, 0.7))),
  }
  const PH = ROPES[2] + 0.45
  for (const [sx, sz] of [
    [-1, -1],
    [1, 1],
    [1, -1],
    [-1, 1],
  ]) {
    const x = sx * POST
    const z = sz * POST
    props.cylinder(0.22, PH, place(x, PH / 2, z), SP.iron, 10)
    props.cylinder(0.34, 0.12, place(x, PH, z), SP.brass, 10)
    props.with("flat", () => props.sphere(0.2, [1, 1, 1], place(x, PH + 0.13, z), SP.brass, 6))
    props.cylinder(0.32, 0.14, place(x, 0.07, z), SP.brassDark, 10)
    // esticadores das cordas
    for (const h of ROPES) props.box(0.15, 0.1, 0.15, place(x - sx * 0.15, h, z - sz * 0.15), SP.brass)
    const pad = keep(CreateBox("ring-pad", { width: 0.38, depth: 0.38, height: ROPES[2] - ROPES[0] + 0.4 }, scene))
    pad.position.set(sx * (POST - 0.15), (ROPES[0] + ROPES[2]) / 2, sz * (POST - 0.15))
    pad.rotation.y = Math.PI / 4
    pad.material = sx < 0 && sz < 0 ? postMats.red : sx > 0 && sz > 0 ? postMats.blue : postMats.white
    pad.isPickable = false
  }
  // cordas: marfim, rubi, marfim (couro encerado)
  const ropeMats = [
    keep(mat(scene, "ring-rope-w", new Color3(0.9, 0.84, 0.72), { emissive: 0.15 })),
    keep(mat(scene, "ring-rope-r", new Color3(0.72, 0.1, 0.16), { emissive: 0.3 })),
  ]
  ROPES.forEach((h, i) => {
    for (let s = 0; s < 4; s++) {
      const rope = keep(CreateCylinder("ring-rope", { height: 2 * POST, diameter: 0.07, tessellation: 6 }, scene))
      rope.rotation.z = Math.PI / 2
      if (s >= 2) rope.rotation.y = Math.PI / 2
      const d = (s % 2 ? 1 : -1) * POST
      if (s < 2) rope.position.set(0, h, d)
      else rope.position.set(d, h, 0)
      rope.material = ropeMats[i === 1 ? 1 : 0]
      rope.isPickable = false
    }
  })

  // ── arquibancada de madeira com guarda-corpo de ferro, e a plateia ───────
  const rows = low ? 5 : 8
  for (let r = 0; r < rows; r++) {
    const d = STAND + r * 1.2
    const h = 0.35 + r * 0.55
    for (let s = 0; s < 4; s++) {
      const ang = (s * Math.PI) / 2
      const f = place(Math.sin(ang) * (d + 0.6), 0, Math.cos(ang) * (d + 0.6), ang)
      props.box(2 * d + 1.2, h, 1.2, place(0, G + h / 2, 0, 0, f), r % 2 ? SP.woodDark : shade(SP.woodDark, 1.15))
      props.box(2 * d + 1.2, 0.05, 0.08, place(0, G + h - 0.03, -0.6, 0, f), SP.brassDark)
      if (r === 0) {
        // guarda-corpo do primeiro degrau
        props.box(2 * d + 1.2, 0.05, 0.05, place(0, G + h + 0.9, -0.66, 0, f), SP.iron)
        for (let k = -d; k <= d; k += 1.5) props.box(0.05, 0.9, 0.05, place(k, G + h + 0.45, -0.66, 0, f), SP.iron)
      }
    }
  }
  // gente: um corpo (caixa) e uma cabeça (esfera) por pessoa, em instância fina
  const body = keep(CreateBox("ring-fan-body", { width: 0.42, depth: 0.28, height: 0.62 }, scene))
  const head = keep(CreateSphere("ring-fan-head", { diameter: 0.26, segments: 6 }, scene))
  const fanMat = keep(mat(scene, "ring-fan-m", new Color3(0.78, 0.74, 0.7)))
  const headMat = keep(mat(scene, "ring-fan-h", new Color3(0.8, 0.78, 0.74)))
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
    const d = STAND + r * 1.2 + 0.6
    const y = G + 0.35 + r * 0.55
    for (let s = 0; s < 4; s++) {
      const ang = (s * Math.PI) / 2
      const span = d + 0.4
      for (let u = -span; u <= span; u += low ? 1.2 : 0.85) {
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
  fans.forEach((_, i) => {
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
  for (const m of [body, head]) m.alwaysSelectAsActiveMesh = true

  // ── treliça de ferro rebitada, luminárias de latão, fachos e o placar ──
  const span = 2 * TRUSS + 0.4
  const bays = Math.round((2 * TRUSS) / 0.8)
  for (let s = 0; s < 4; s++) {
    const f = place(0, 0, 0, (s * Math.PI) / 2)
    // banzo de cima e de baixo e as diagonais (treliça Warren)
    props.box(span, 0.14, 0.34, place(0, TY + 0.25, -TRUSS, 0, f), SP.iron)
    props.box(span, 0.14, 0.34, place(0, TY - 0.25, -TRUSS, 0, f), SP.iron)
    for (let k = 0; k < bays; k++) {
      const x = -TRUSS + (k * 2 * TRUSS) / bays
      const w = (2 * TRUSS) / bays
      props.tube([x, TY - 0.25, -TRUSS], [x + w / 2, TY + 0.25, -TRUSS], 0.035, SP.ironHi, 4, f)
      props.tube([x + w / 2, TY + 0.25, -TRUSS], [x + w, TY - 0.25, -TRUSS], 0.035, SP.ironHi, 4, f)
    }
    props.box(span + 0.1, 0.05, 0.36, place(0, TY + 0.33, -TRUSS, 0, f), SP.brassDark)
  }
  // travessa em cruz no meio (segura o placar e as luminárias do centro)
  for (const rot of [0, Math.PI / 2]) props.box(span, 0.14, 0.3, place(0, TY + 0.25, 0, rot), SP.iron)
  // correntes até o teto
  for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) props.tube([x * TRUSS, TY + 0.25, z * TRUSS], [x * TRUSS * 0.6, TY + 9, z * TRUSS * 0.6], 0.04, SP.iron, 4)
  const beamMat = keep(new StandardMaterial("ring-beam", scene))
  beamMat.disableLighting = true
  beamMat.emissiveColor = new Color3(1, 0.82, 0.55)
  const BEAM = low ? 0.04 : 0.055
  beamMat.alpha = BEAM
  beamMat.alphaMode = Constants.ALPHA_ADD
  beamMat.backFaceCulling = false
  const beams: Mesh[] = []
  const lamps: [number, number][] = [
    [-TRUSS, -TRUSS],
    [TRUSS, -TRUSS],
    [-TRUSS, TRUSS],
    [TRUSS, TRUSS],
    [0, -TRUSS],
    [0, TRUSS],
    [-TRUSS, 0],
    [TRUSS, 0],
  ]
  for (const [x, z] of lamps) {
    // luminária de latão (cúpula) com a lâmpada âmbar acesa por baixo
    props.cone(0.5, 1.0, 0.46, place(x, TY - 0.5, z), SP.brass, 12)
    props.cylinder(0.1, 0.4, place(x, TY - 0.1, z), SP.iron, 6)
    glow.cylinder(0.72, 0.07, place(x, TY - 0.76, z), SP.lampGlass, 12)
    // facho: da luminária até a lona, apontando para o meio
    const from = new Vector3(x, TY - 0.6, z)
    const to = new Vector3(x * 0.3, 0, z * 0.3)
    const len = Vector3.Distance(from, to)
    const beam = keep(CreateCylinder("ring-beam", { height: len, diameterTop: 0.8, diameterBottom: 4.2, tessellation: 16, cap: 0 }, scene))
    beam.position = Vector3.Center(from, to)
    const dir = to.subtract(from).normalize()
    const axis = Vector3.Cross(Vector3.Down(), dir)
    const angle = Math.acos(Vector3.Dot(Vector3.Down(), dir))
    if (axis.lengthSquared() > 1e-6) beam.rotationQuaternion = Quaternion.RotationAxis(axis.normalize(), angle)
    beam.material = beamMat
    beam.isPickable = false
    beams.push(beam)
  }
  // fileira de lâmpadas de filamento no banzo de baixo (o "teto de luz" sobre o ringue)
  for (let s = 0; s < 4; s++) {
    const f = place(0, 0, 0, (s * Math.PI) / 2)
    for (let k = -TRUSS + 1; k <= TRUSS - 1; k += 1.4) props.with("flat", () => glow.sphere(0.2, [1, 1, 1], place(k, TY - 0.42, -TRUSS, 0, f), SP.lampGlass, 6))
  }
  // placar mecânico: caixa de madeira com moldura de latão e um mostrador por lado
  const SY = TY + 2.4
  props.box(4.4, 2.5, 4.4, place(0, SY, 0), SP.woodDark)
  for (const dy of [-1.28, 1.28]) props.box(4.6, 0.12, 4.6, place(0, SY + dy, 0), SP.brass)
  for (let s = 0; s < 4; s++) {
    const f = place(0, 0, 0, (s * Math.PI) / 2)
    props.ring(1.6, 0.1, facing(0, SY, -2.24, f), SP.brass, 20, 3)
    glow.cylinder(1.5, 0.02, facing(0, SY, -2.22, f), SP.board, 20)
    props.box(0.06, 0.64, 0.02, place(0.08, SY + 0.24, -2.25, 0, f), SP.iron)
    props.box(0.05, 0.46, 0.02, place(-0.13, SY - 0.13, -2.25, 0.9, f), SP.iron)
    // a engrenagem do placar gira (cada lado no seu sentido)
    ctx.gears.push({ m: facing(1.55, SY + 0.7, -2.26, f), r: 0.4, thick: 0.06, speed: s % 2 ? 0.8 : -0.8 })
  }
  props.tube([0, TY + 0.3, 0], [0, SY - 1.25, 0], 0.06, SP.iron, 6)

  // ── paredes de tijolo com janelas em arco, canos, manômetros e caldeiras ──
  const WH = 16
  for (let s = 0; s < 4; s++) {
    const f = place(0, 0, 0, (s * Math.PI) / 2)
    wall.box(2 * HALL + 0.6, WH, 0.6, place(0, G + WH / 2, -HALL, 0, f), SP.brick)
    props.box(2 * HALL + 0.7, 0.4, 0.8, place(0, G + WH, -HALL, 0, f), SP.ironWarm)
    props.box(2 * HALL + 0.7, 0.18, 0.7, place(0, G + 6.6, -HALL + 0.05, 0, f), SP.stoneLight)
    for (let k = -6; k <= 6; k++) {
      const x = k * 4.4
      // pilastra de ferro entre as janelas
      props.box(0.5, WH, 0.3, place(x + 2.2, G + WH / 2, -HALL + 0.4, 0, f), SP.iron)
      // janela em arco: caixilho de ferro, vidro âmbar aceso (é noite lá fora)
      glow.box(2.0, 3.6, 0.04, place(x, G + 9.8, -HALL + 0.32, 0, f), SP.windowGlow)
      glow.with("flat", () => glow.cylinder(2.0, 0.04, facing(x, G + 11.6, -HALL + 0.32, f), SP.windowGlow, 12))
      props.box(2.2, 0.12, 0.1, place(x, G + 8.0, -HALL + 0.38, 0, f), SP.iron)
      props.box(0.08, 4.8, 0.08, place(x, G + 10.0, -HALL + 0.38, 0, f), SP.iron)
      props.box(2.0, 0.06, 0.08, place(x, G + 10.4, -HALL + 0.38, 0, f), SP.iron)
    }
    // cano de cobre correndo a 4 m com manômetros
    pipeRun(ctx, [[-HALL + 1.5, G + 4, -HALL + 0.55], [HALL - 1.5, G + 4, -HALL + 0.55]], 0.14, SP.copper, f)
    for (const x of [-16, -6, 6, 16]) gauge(ctx, x, G + 3.0, -HALL + 0.5, f, 1.8)
    for (const x of [-20, -11, 0, 11, 20]) postLantern(ctx, x, G + 3.4, -HALL + 0.7, 0.85, f)
    // engrenagens grandes paradas na parede, uma girando
    props.gear(1.4, 0.14, 16, facing(-HALL + 5, G + 13.5, -HALL + 0.4, f), SP.bronze, SP.brassDark)
    ctx.gears.push({ m: facing(-HALL + 7.2, G + 12.9, -HALL + 0.32, f), r: 0.9, thick: 0.12, speed: 0.5 })
  }
  for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]] as const) boiler(ctx, x * (HALL - 3), z * (HALL - 3), Math.atan2(-x, -z), 1.6, G)
  stage.build("ring-hall")

  let hype = 0.2
  let time = 0
  let acc = 0
  let hopping = false
  return {
    cheer(k) {
      hype = Math.max(hype, Math.min(1, k))
    },
    update(dt) {
      time += dt
      hype += (0.15 - hype) * Math.min(1, dt * 0.6)
      beamMat.alpha = BEAM * (0.85 + 0.3 * hype)
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
