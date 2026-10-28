// features/meu-mundo/boxe/engine/arena-view.ts — ARENA DE BOXE (mm3d-43): o ginásio.
//
// Tudo feito aqui (sem GLB): o ringue elevado (lona com o círculo rubi no
// meio, saia escura com faixa, 4 postes — vermelho no canto do lutador 0,
// azul no do 1, brancos nos neutros — e 3 cordas), a arquibancada em degraus
// com a plateia (instância fina: corpo + cabeça de cor sorteada; pula com a
// emoção), a treliça de luzes com os fachos aditivos sobre o ringue e o telão
// quadrado lá em cima. Chão do ringue em y = RING_Y; o centro é a origem.

import type { Scene } from "@babylonjs/core/scene"
import "@babylonjs/core/Meshes/thinInstanceMesh"
import type { Mesh } from "@babylonjs/core/Meshes/mesh"
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial"
import { DynamicTexture } from "@babylonjs/core/Materials/Textures/dynamicTexture"
import { Color3 } from "@babylonjs/core/Maths/math.color"
import { Matrix, Quaternion, Vector3 } from "@babylonjs/core/Maths/math.vector"
import { CreateBox } from "@babylonjs/core/Meshes/Builders/boxBuilder"
import { CreateGround } from "@babylonjs/core/Meshes/Builders/groundBuilder"
import { CreateSphere } from "@babylonjs/core/Meshes/Builders/sphereBuilder"
import { CreateCylinder } from "@babylonjs/core/Meshes/Builders/cylinderBuilder"
import { Constants } from "@babylonjs/core/Engines/constants"

/** Altura da lona (m). */
export const RING_Y = 1.0
/** Meia largura até o poste (m). */
const POST = 3.3
const ROPES = [0.45, 0.85, 1.25]
export const RED = new Color3(0.86, 0.1, 0.2)
export const BLUE = new Color3(0.16, 0.38, 0.95)

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

/** Lona: tecido claro, círculo rubi no meio e a borda escura (sem texto). */
function canvasTexture(scene: Scene) {
  const S = 512
  const t = new DynamicTexture("boxe-canvas", { width: S, height: S }, scene, true)
  const g = t.getContext() as CanvasRenderingContext2D
  g.fillStyle = "#d9dbe2"
  g.fillRect(0, 0, S, S)
  // trama do tecido
  g.globalAlpha = 0.06
  for (let i = 0; i < S; i += 4) {
    g.fillStyle = i % 8 ? "#000" : "#fff"
    g.fillRect(0, i, S, 2)
  }
  g.globalAlpha = 1
  g.strokeStyle = "#2a2b33"
  g.lineWidth = 18
  g.strokeRect(9, 9, S - 18, S - 18)
  g.fillStyle = "rgba(220,30,60,0.88)"
  g.beginPath()
  g.arc(S / 2, S / 2, S * 0.17, 0, Math.PI * 2)
  g.fill()
  g.strokeStyle = "#f2c230"
  g.lineWidth = 6
  g.beginPath()
  g.arc(S / 2, S / 2, S * 0.17, 0, Math.PI * 2)
  g.stroke()
  // raio dourado no círculo (o mesmo dos cartazes da fachada)
  g.fillStyle = "#f2c230"
  g.beginPath()
  const c = S / 2
  const pts: [number, number][] = [[-10, -46], [22, -6], [4, -6], [16, 44], [-22, 2], [-4, 2]]
  pts.forEach(([x, y], i) => (i ? g.lineTo(c + x * 1.2, c + y * 1.2) : g.moveTo(c + x * 1.2, c + y * 1.2)))
  g.closePath()
  g.fill()
  // cantos vermelho e azul
  g.fillStyle = "rgba(220,30,60,0.9)"
  g.beginPath()
  g.moveTo(0, S)
  g.lineTo(70, S)
  g.lineTo(0, S - 70)
  g.fill()
  g.fillStyle = "rgba(40,90,240,0.9)"
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

  // ── chão do ginásio ──────────────────────────────────────────────────────
  const floor = keep(CreateGround("boxe-floor", { width: 70, height: 70 }, scene))
  floor.material = keep(mat(scene, "boxe-floor-m", new Color3(0.07, 0.07, 0.09)))
  floor.isPickable = false

  // ── ringue ───────────────────────────────────────────────────────────────
  const base = keep(CreateBox("boxe-ring-base", { width: 2 * POST + 0.9, depth: 2 * POST + 0.9, height: RING_Y }, scene))
  base.position.y = RING_Y / 2
  base.material = keep(mat(scene, "boxe-ring-base-m", new Color3(0.1, 0.1, 0.13)))
  const stripe = keep(CreateBox("boxe-ring-stripe", { width: 2 * POST + 0.94, depth: 2 * POST + 0.94, height: 0.12 }, scene))
  stripe.position.y = RING_Y - 0.25
  stripe.material = keep(mat(scene, "boxe-ring-stripe-m", RED, { unlit: true }))
  const lona = keep(CreateBox("boxe-ring-canvas", { width: 2 * POST + 0.7, depth: 2 * POST + 0.7, height: 0.06 }, scene))
  lona.position.y = RING_Y - 0.02
  const lm = keep(mat(scene, "boxe-ring-canvas-m", new Color3(1, 1, 1), { spec: 0.08 }))
  lm.diffuseTexture = keep(canvasTexture(scene))
  lona.material = lm
  for (const m of [base, stripe, lona]) m.isPickable = false

  // postes: (−,−) vermelho = canto do lutador 0; (+,+) azul = lutador 1
  const postMats = {
    red: keep(mat(scene, "boxe-post-red", RED, { emissive: 0.25 })),
    blue: keep(mat(scene, "boxe-post-blue", BLUE, { emissive: 0.25 })),
    white: keep(mat(scene, "boxe-post-white", new Color3(0.9, 0.9, 0.92))),
  }
  const metal = keep(mat(scene, "boxe-metal", new Color3(0.55, 0.57, 0.62), { spec: 0.4 }))
  for (const [sx, sz] of [
    [-1, -1],
    [1, 1],
    [1, -1],
    [-1, 1],
  ]) {
    const post = keep(CreateCylinder("boxe-post", { height: 1.55, diameter: 0.14, tessellation: 10 }, scene))
    post.position.set(sx * POST, RING_Y + 0.75, sz * POST)
    post.material = metal
    const pad = keep(CreateBox("boxe-pad", { width: 0.3, depth: 0.3, height: 1.05 }, scene))
    pad.position.set(sx * (POST - 0.12), RING_Y + 0.85, sz * (POST - 0.12))
    pad.rotation.y = Math.PI / 4
    pad.material = sx < 0 && sz < 0 ? postMats.red : sx > 0 && sz > 0 ? postMats.blue : postMats.white
    post.isPickable = pad.isPickable = false
  }
  // cordas: branca, rubi, branca
  const ropeMats = [
    keep(mat(scene, "boxe-rope-w", new Color3(0.94, 0.94, 0.96), { emissive: 0.2 })),
    keep(mat(scene, "boxe-rope-r", RED, { emissive: 0.35 })),
  ]
  ROPES.forEach((h, i) => {
    for (let s = 0; s < 4; s++) {
      const rope = keep(CreateCylinder("boxe-rope", { height: 2 * POST, diameter: 0.045, tessellation: 6 }, scene))
      rope.rotation.z = Math.PI / 2
      if (s >= 2) rope.rotation.y = Math.PI / 2
      const d = (s % 2 ? 1 : -1) * POST
      if (s < 2) rope.position.set(0, RING_Y + h, d)
      else rope.position.set(d, RING_Y + h, 0)
      rope.material = ropeMats[i === 1 ? 1 : 0]
      rope.isPickable = false
    }
  })

  // ── arquibancada e plateia ───────────────────────────────────────────────
  const tierMat = keep(mat(scene, "boxe-tier", new Color3(0.12, 0.12, 0.15)))
  const rows = low ? 4 : 6
  for (let r = 0; r < rows; r++) {
    const d = 8.5 + r * 1.2
    const h = 0.35 + r * 0.55
    for (let s = 0; s < 4; s++) {
      const step = keep(CreateBox("boxe-tier", { width: 2 * d + 1.2, depth: 1.2, height: h }, scene))
      step.position.y = h / 2
      const ang = (s * Math.PI) / 2
      step.position.x = Math.sin(ang) * (d + 0.6)
      step.position.z = Math.cos(ang) * (d + 0.6)
      step.rotation.y = ang
      step.material = tierMat
      step.isPickable = false
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
  const SHIRTS = ["#c8202e", "#f2f2ee", "#26262a", "#8a8d93", "#1f2f5c", "#6fb7e8", "#1e8a4a", "#f2c230", "#f07a28", "#7b4fc0", "#2f5bd3"]
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
  const place = (jump: number, time: number) => {
    fans.forEach((f, i) => {
      const hop = jump > 0.02 ? Math.max(0, Math.sin(time * (7 + f.amp * 3) + f.ph)) * 0.22 * jump * f.amp : 0
      Quaternion.RotationYawPitchRollToRef(f.ry, 0, 0, q)
      Matrix.ComposeToRef(one, q, new Vector3(f.x, f.y + 0.31 + hop, f.z), tmp)
      tmp.copyToArray(bodyM, i * 16)
      Matrix.ComposeToRef(one, q, new Vector3(f.x, f.y + 0.76 + hop, f.z), tmp)
      tmp.copyToArray(headM, i * 16)
    })
    body.thinInstanceSetBuffer("matrix", bodyM, 16, false)
    head.thinInstanceSetBuffer("matrix", headM, 16, false)
  }
  place(0, 0)
  body.thinInstanceSetBuffer("color", bodyC, 4, true)
  head.thinInstanceSetBuffer("color", headC, 4, true)
  fanMat.diffuseColor = new Color3(0.75, 0.75, 0.75)
  headMat.diffuseColor = new Color3(0.8, 0.8, 0.8)
  for (const m of [body, head]) m.alwaysSelectAsActiveMesh = true

  // ── treliça de luzes, fachos e telão ─────────────────────────────────────
  const truss = keep(mat(scene, "boxe-truss", new Color3(0.2, 0.2, 0.24)))
  const lamp = keep(mat(scene, "boxe-lamp", new Color3(1, 0.96, 0.85), { unlit: true }))
  const TY = 8.2
  for (let s = 0; s < 4; s++) {
    const bar = keep(CreateBox("boxe-truss", { width: 9.4, depth: 0.35, height: 0.35 }, scene))
    bar.position.y = TY
    if (s < 2) bar.position.z = (s ? 1 : -1) * 4.5
    else {
      bar.rotation.y = Math.PI / 2
      bar.position.x = (s === 3 ? 1 : -1) * 4.5
    }
    bar.material = truss
    bar.isPickable = false
  }
  const beamMat = keep(new StandardMaterial("boxe-beam", scene))
  beamMat.disableLighting = true
  beamMat.emissiveColor = new Color3(1, 0.93, 0.78)
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
    const l = keep(CreateCylinder("boxe-lamp", { height: 0.3, diameterTop: 0.5, diameterBottom: 0.62, tessellation: 10 }, scene))
    l.position.set(x, TY - 0.3, z)
    l.material = lamp
    l.isPickable = false
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
  // telão quadrado sobre o ringue (moldura rubi acesa)
  const screen = keep(CreateBox("boxe-screen", { width: 3.4, depth: 3.4, height: 1.9 }, scene))
  screen.position.y = TY + 1.6
  screen.material = keep(mat(scene, "boxe-screen-m", new Color3(0.05, 0.05, 0.08), { spec: 0.3 }))
  for (const dy of [-0.98, 0.98]) {
    const rim = keep(CreateBox("boxe-screen-rim", { width: 3.5, depth: 3.5, height: 0.08 }, scene))
    rim.position.y = TY + 1.6 + dy
    rim.material = stripe.material
    rim.isPickable = false
  }
  screen.isPickable = false

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
          place(hype - 0.25, time)
          hopping = true
        } else if (hopping) {
          place(0, time)
          hopping = false
        }
      }
    },
    dispose() {
      for (const o of owned.reverse()) o.dispose()
    },
  }
}
