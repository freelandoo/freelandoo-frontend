// features/meu-mundo/laminas/abilities/blood-cut.ts — GOLPE DE SANGUE, o Poder Máximo dos vampiros (2026-11-07).
//
// A mecânica é a do poder de lâmina em sim/fight.ts, sem mudança: cone à frente (bladeRange,
// bladeArc), dano em POWER.fireAt, cura e sem levar golpe. Este arquivo é só a apresentação.
//
//   preparação  coração bate, círculo de luas abre no chão, o mundo escurece, close no rosto
//   carga       asas de sangue abrem nas costas, gotas sobem em espiral até a lâmina
//   antecipação a câmera sobe para o lado, as asas fecham e queimam, o tempo quase para
//   golpe       a LUA (malha com volume, corpo opaco) sai da lâmina na diagonal e cresce
//   impacto     no passo do dano: onda, rachaduras e espinhos saindo do chão pelo cone
//   resto       a lua segue voando e se desfaz, o sangue volta de quem foi atingido
//
// A arena é clara: luz somada estoura em branco e apaga a forma (era o poder antigo). Aqui
// o corpo de cada peça é escuro e opaco e só a borda acende.

import type { Scene } from "@babylonjs/core/scene"
import { Color3 } from "@babylonjs/core/Maths/math.color"
import { Matrix, Quaternion, Vector3 } from "@babylonjs/core/Maths/math.vector"
import { Mesh } from "@babylonjs/core/Meshes/mesh"
import { TransformNode } from "@babylonjs/core/Meshes/transformNode"
import { VertexData } from "@babylonjs/core/Meshes/mesh.vertexData"
import { CreateCylinder } from "@babylonjs/core/Meshes/Builders/cylinderBuilder"
import { CreateGround } from "@babylonjs/core/Meshes/Builders/groundBuilder"
import { CreateSphere } from "@babylonjs/core/Meshes/Builders/sphereBuilder"
import { ShaderMaterial } from "@babylonjs/core/Materials/shaderMaterial"
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial"
import { Effect } from "@babylonjs/core/Materials/effect"
import { DynamicTexture } from "@babylonjs/core/Materials/Textures/dynamicTexture"
import { Constants } from "@babylonjs/core/Engines/constants"
import "@babylonjs/core/Meshes/thinInstanceMesh"
import { POWER } from "../sim/fight"
import type { BoxeAudio } from "../engine/audio"
import type { BoxeClip } from "../../engine/avatars"
import type { FxBuilder, FxContext, FxEffect, FxStage } from "../../engine/fx/fx-core"
import type { Vfx, VfxColor } from "../../engine/vfx"
import type { AbilityScript, Subject } from "./director"

/** Ajustes do laboratório (harness); os valores daqui são os que valem no jogo. */
export const BLOOD_TUNE = { density: 1, gain: 1 }

const DEEP = new Color3(0.1, 0.004, 0.03)
const BLOOD = new Color3(0.62, 0.02, 0.12)
const HOT = new Color3(1, 0.2, 0.42)
/** Borda: o violeta dos olhos e do cristal dos vampiros. */
const EDGE = new Color3(0.72, 0.3, 1)
const SPARK: VfxColor = { main: new Color3(0.85, 0.05, 0.2), edge: EDGE }

const FIRE_AT = POWER.fireAt
/** Até quando as sobras ficam na tela, depois que a pessoa já voltou a jogar (s). */
const FX_END = POWER.dur + 0.35
/** A lua nasce na lâmina e passa pelo meio do cone exatamente no dano. */
const MOON_FROM = 0.73
const MOON_END = 1.22
/** Raio da lua: no nascimento, no dano e no fim do voo (m). */
const MOON_R = [1.3, 3.5, 4.5]
/** Quanto ela avança à frente: no nascimento, no dano e no fim do voo (m). */
const MOON_Z = [0.8, POWER.bladeRange * 0.55, POWER.bladeRange + 3.4]
/** Inclinação do corte (rad). */
const MOON_ROLL = 0.72
const WING_FINGERS = 5

const clamp01 = (v: number) => Math.max(0, Math.min(1, v))
const seg = (t: number, a: number, b: number) => clamp01((t - a) / (b - a))
const easeOut = (u: number) => 1 - (1 - u) * (1 - u) * (1 - u)
const easeInOut = (u: number) => u * u * (3 - 2 * u)
const backOut = (u: number) => 1 + 2.4 * Math.pow(u - 1, 3) + 1.4 * Math.pow(u - 1, 2)

const VERTEX = /* glsl */ `
precision highp float;
attribute vec3 position;
attribute vec3 normal;
attribute vec2 uv;
uniform mat4 world;
uniform mat4 viewProjection;
uniform float uOpen;
uniform float uTime;
varying vec3 vP;
varying vec3 vN;
varying vec2 vUV;
void main() {
  vec3 p = position;
  vec3 n = normal;
#ifdef WING
  // As asas abrem aqui: cada dedo gira do ombro e a membrana acompanha, sem refazer a malha.
  float side = sign(position.x);
  float u = uv.x;
  float v = uv.y;
  float ang = mix(1.5, mix(1.28, -0.8, u), uOpen);
  float scallop = pow(abs(sin(u * ${WING_FINGERS}.0 * 3.14159)), 1.4) * 0.26 * v * v;
  float len = (1.0 - 0.34 * u) * (1.0 - scallop) * (0.3 + 0.7 * uOpen);
  float r = v * len;
  float flap = 0.08 * sin(uTime * 7.0 + v * 3.0 + u * 2.0) * v;
  p = vec3(side * cos(ang) * r, sin(ang) * r, -0.42 * v * v * (1.0 - 0.5 * u) + flap);
  n = vec3(0.0, 0.0, 1.0);
#endif
  vec4 w = world * vec4(p, 1.0);
  vP = w.xyz;
  vN = normalize(mat3(world) * n);
  vUV = uv;
  gl_Position = viewProjection * w;
}`

const FRAGMENT = /* glsl */ `
precision highp float;
uniform vec3 uEye;
uniform vec3 uDeep;
uniform vec3 uBlood;
uniform vec3 uHot;
uniform vec3 uEdge;
uniform float uTime;
uniform float uFade;
uniform float uCut;
uniform float uHead;
uniform float uR;
uniform float uGain;
uniform sampler2D uTex;
varying vec3 vP;
varying vec3 vN;
varying vec2 vUV;
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
}
float fbm(vec2 p) { return noise(p) * 0.6 + noise(p * 2.1 + 3.7) * 0.3 + noise(p * 4.3 + 9.1) * 0.1; }
void main() {
  vec4 outc = vec4(0.0);
#ifdef SICKLE
  // Corpo opaco: o sangue corre pela lâmina, a borda de corte acende, some queimando.
  vec3 V = normalize(uEye - vP);
  float rim = pow(1.0 - abs(dot(normalize(vN), V)), 2.2);
  float n = fbm(vec2(vUV.x * 9.0 - uTime * 3.2, vUV.y * 3.0));
  if (n < uCut) discard;
  float burn = uCut > 0.001 ? smoothstep(uCut + 0.1, uCut, n) : 0.0;
  float edge = smoothstep(0.2, 0.0, min(vUV.y, 1.0 - vUV.y));
  // fios de energia correndo pelo arco: é o que tira a cara de peça sólida
  float streak = fbm(vec2(vUV.x * 30.0 - uTime * 9.0, vUV.y * 2.2 + 1.7));
  vec3 c = mix(uDeep, uBlood, smoothstep(0.3, 0.75, n));
  c = mix(c, uHot, smoothstep(0.5, 0.74, streak) * 0.9);
  c = mix(c, uHot, pow(rim, 1.6) * 0.5);
  c = mix(c, uEdge + 0.3, edge * 0.9);
  c = mix(c, uHot + 0.2, burn);
  outc = vec4(c * uGain, 1.0);
#endif
#ifdef WING
  float n = fbm(vec2(vUV.x * 7.0, vUV.y * 5.0 - uTime * 1.3));
  if (n < uCut) discard;
  float rib = smoothstep(0.1, 0.0, abs(fract(vUV.x * ${WING_FINGERS}.0 + 0.5) - 0.5));
  float rim = smoothstep(0.72, 1.0, vUV.y);
  vec3 c = mix(uDeep, uBlood, n);
  c = mix(c, uHot, rib * 0.55);
  c = mix(c, uEdge, rim * 0.8);
  outc = vec4(c * uGain, (0.82 + 0.18 * rib) * uFade);
#endif
#ifdef SWEEP
  // Rastro: fios que saem da lua e somem para trás; u corre o arco, v vai da lua ao fim.
  float tip = pow(sin(vUV.x * 3.14159), 0.8);
  float n = fbm(vec2(vUV.x * 34.0, vUV.y * 1.6 + uTime * 2.4));
  float tail = pow(1.0 - vUV.y, 1.6);
  float a = smoothstep(0.34, 0.74, n + 0.3 * (1.0 - vUV.y)) * tail * tip;
  outc = vec4(mix(uBlood, uHot, tail * 0.8) * uGain, a * uFade);
#endif
#ifdef RING
  // Onda no chão: anel fino, com o lado de dentro rasgado.
  float r = length(vUV - 0.5) * 2.0;
  float ang = atan(vUV.y - 0.5, vUV.x - 0.5);
  float n = fbm(vec2(ang * 3.0, r * 4.0 - uTime));
  float band = smoothstep(uR - 0.07 - 0.12 * n, uR - 0.01, r) * smoothstep(uR + 0.012, uR - 0.004, r);
  outc = vec4(mix(uDeep, uHot, band * band) * uGain, band * 0.85 * uFade);
#endif
#ifdef DECAL
  // Desenho no chão: aparece do centro para fora (uR) e pulsa.
  float r = length(vUV - 0.5) * 2.0;
  vec4 t = texture2D(uTex, vUV);
  float show = smoothstep(uR, uR - 0.08, r);
  float pulse = 0.75 + 0.25 * sin(uTime * 9.0 - r * 10.0);
  outc = vec4(mix(uBlood, uHot, t.a * pulse) * uGain, t.a * show * uFade);
#endif
  gl_FragColor = outc;
}`

function shaderOf(scene: Scene, name: string, kind: "SICKLE" | "WING" | "SWEEP" | "RING" | "DECAL", alpha: boolean) {
  Effect.ShadersStore.mmBloodVertexShader = VERTEX
  Effect.ShadersStore.mmBloodFragmentShader = FRAGMENT
  const m = new ShaderMaterial(
    name,
    scene,
    { vertex: "mmBlood", fragment: "mmBlood" },
    {
      attributes: ["position", "normal", "uv"],
      uniforms: ["world", "viewProjection", "uEye", "uDeep", "uBlood", "uHot", "uEdge", "uTime", "uFade", "uCut", "uHead", "uR", "uGain", "uOpen"],
      samplers: ["uTex"],
      defines: [`#define ${kind}`],
      needAlphaBlending: alpha,
    },
  )
  m.backFaceCulling = false
  m.setColor3("uDeep", DEEP)
  m.setColor3("uBlood", BLOOD)
  m.setColor3("uHot", HOT)
  m.setColor3("uEdge", EDGE)
  for (const [k, v] of [["uFade", 1], ["uCut", 0], ["uHead", 1], ["uR", 1], ["uGain", 1], ["uOpen", 0], ["uTime", 0]] as const) m.setFloat(k, v)
  if (alpha) {
    m.alphaMode = Constants.ALPHA_COMBINE
    m.disableDepthWrite = true
  }
  return m
}

/** A foice: arco fechado com seção em losango; afina até virar ponta nos dois lados. */
function sickleMesh(scene: Scene) {
  const N = 44
  const span = 1.02
  const ring: [number, number, number][] = [
    [0.56, 0, 0],
    [0.12, 0.8, 0.25],
    [-0.38, 1, 0.42],
    [-0.46, 0, 0.5],
    [-0.38, -1, 0.58],
    [0.12, -0.8, 0.75],
    [0.56, 0, 1],
  ]
  const pos: number[] = []
  const uv: number[] = []
  const idx: number[] = []
  for (let i = 0; i <= N; i++) {
    const u = i / N
    const a = -span + 2 * span * u
    const taper = Math.pow(Math.sin(Math.PI * u), 0.72)
    const R = 1 - 0.1 * (1 - taper)
    const w = 0.36 * taper + 0.003
    const h = 0.07 * taper + 0.002
    for (const [dr, dy, v] of ring) {
      const r = R + dr * w
      pos.push(Math.sin(a) * r, dy * h, Math.cos(a) * r)
      uv.push(u, v)
    }
  }
  const M = ring.length
  for (let i = 0; i < N; i++)
    for (let j = 0; j < M - 1; j++) {
      const a = i * M + j
      const b = a + M
      idx.push(a, b, a + 1, a + 1, b, b + 1)
    }
  const normals: number[] = []
  VertexData.ComputeNormals(pos, idx, normals)
  const m = new Mesh("bc-sickle", scene)
  Object.assign(new VertexData(), { positions: pos, indices: idx, uvs: uv, normals }).applyToMesh(m)
  return m
}

/** Rastro da lua: casca que parte do arco e vai para trás (y −1). u corre o arco, v vai para trás. */
function wakeMesh(scene: Scene) {
  const N = 36
  const span = 1.02
  const pos: number[] = []
  const uv: number[] = []
  const nor: number[] = []
  const idx: number[] = []
  for (let i = 0; i <= N; i++) {
    const u = i / N
    const a = -span + 2 * span * u
    for (const v of [0, 1]) {
      pos.push(Math.sin(a), -v, Math.cos(a))
      uv.push(u, v)
      nor.push(Math.sin(a), 0, Math.cos(a))
    }
    if (i < N) idx.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 2, i * 2 + 1, i * 2 + 3)
  }
  const m = new Mesh("bc-wake", scene)
  Object.assign(new VertexData(), { positions: pos, indices: idx, uvs: uv, normals: nor }).applyToMesh(m)
  return m
}

/** As duas asas numa malha só (um desenho). A forma sai do shader; aqui só a grade. */
function wingsMesh(scene: Scene) {
  const U = WING_FINGERS * 4
  const V = 8
  const pos: number[] = []
  const uv: number[] = []
  const nor: number[] = []
  const idx: number[] = []
  for (const side of [-1, 1]) {
    const base = pos.length / 3
    for (let i = 0; i <= U; i++)
      for (let j = 0; j <= V; j++) {
        pos.push(side, 0, 0)
        uv.push(i / U, j / V)
        nor.push(0, 0, 1)
      }
    for (let i = 0; i < U; i++)
      for (let j = 0; j < V; j++) {
        const a = base + i * (V + 1) + j
        const b = a + V + 1
        idx.push(a, b, a + 1, a + 1, b, b + 1)
      }
  }
  const m = new Mesh("bc-wings", scene)
  Object.assign(new VertexData(), { positions: pos, indices: idx, uvs: uv, normals: nor }).applyToMesh(m)
  // a posição real só existe no shader: a caixa da malha não vale
  m.alwaysSelectAsActiveMesh = true
  return m
}

function canvasTexture(scene: Scene, name: string, draw: (g: CanvasRenderingContext2D, s: number) => void) {
  const s = 512
  const t = new DynamicTexture(name, { width: s, height: s }, scene, true)
  const g = t.getContext() as CanvasRenderingContext2D
  g.clearRect(0, 0, s, s)
  draw(g, s)
  t.hasAlpha = true
  t.update()
  return t
}

/** Círculo de luas: duas voltas, doze luas crescentes e seis lâminas apontando para dentro. */
function drawRune(g: CanvasRenderingContext2D, s: number) {
  const c = s / 2
  g.strokeStyle = g.fillStyle = "#fff"
  for (const [r, w] of [[0.97, 7], [0.9, 2], [0.56, 3], [0.5, 1.5]] as const) {
    g.lineWidth = w
    g.beginPath()
    g.arc(c, c, c * r, 0, Math.PI * 2)
    g.stroke()
  }
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2
    const x = c + Math.cos(a) * c * 0.73
    const y = c + Math.sin(a) * c * 0.73
    g.save()
    g.translate(x, y)
    g.rotate(a + Math.PI / 2)
    g.beginPath()
    g.arc(0, 0, 26, 0.5, Math.PI * 2 - 0.5)
    g.arc(13, 0, 21, Math.PI * 2 - 1.05, 1.05, true)
    g.closePath()
    g.fill()
    g.restore()
  }
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + 0.26
    g.save()
    g.translate(c, c)
    g.rotate(a)
    g.beginPath()
    g.moveTo(0, -c * 0.5)
    g.lineTo(13, -c * 0.2)
    g.lineTo(0, -c * 0.08)
    g.lineTo(-13, -c * 0.2)
    g.closePath()
    g.fill()
    g.restore()
  }
}

/** Rachaduras em leque, do centro para a frente (topo da imagem = +z). */
function drawCracks(g: CanvasRenderingContext2D, s: number) {
  const c = s / 2
  let seed = 7
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647
  g.strokeStyle = "#fff"
  g.lineCap = "round"
  const branch = (x: number, y: number, a: number, len: number, w: number) => {
    if (len < 18 || w < 0.8) return
    let px = x
    let py = y
    let ang = a
    const parts = 5
    g.lineWidth = w
    g.beginPath()
    g.moveTo(px, py)
    for (let i = 0; i < parts; i++) {
      ang += (rnd() - 0.5) * 0.7
      px += Math.sin(ang) * (len / parts)
      py -= Math.cos(ang) * (len / parts)
      g.lineTo(px, py)
    }
    g.stroke()
    branch(px, py, ang + 0.5 + rnd() * 0.3, len * 0.62, w * 0.66)
    branch(px, py, ang - 0.5 - rnd() * 0.3, len * 0.62, w * 0.66)
  }
  for (let i = 0; i < 9; i++) branch(c, c, -1 + (i / 8) * 2 + (rnd() - 0.5) * 0.1, 92 + rnd() * 40, 7)
}

export interface BloodRig {
  stage: FxStage
  vfx: Vfx
  audio: BoxeAudio
  subject: () => Subject
  /** Ponta da arma agora (null antes de ela carregar). */
  blade: () => Vector3 | null
  act: (clip: BoxeClip, dur: number, from: number, to: number) => void
  cutIn: () => void
  shake: (n: number) => void
  hitStop: (s: number) => void
  /** Luz do mundo (1 = normal). */
  dim: (k: number) => void
}

interface Live {
  t: number
  facing: number
  x: number
  z: number
  height: number
  /** A regra já soltou: as sobras andam sozinhas. */
  free: boolean
  /** Cortada no meio: some na hora. */
  cut: boolean
  hits: Vector3[]
  impacted: boolean
  bladeAt: Vector3
}

function buildEffect(ctx: FxContext, rig: BloodRig): FxEffect<Live> {
  const { scene, budget } = ctx
  const k = budget.particles * BLOOD_TUNE.density
  const dropN = Math.max(10, Math.round(44 * k))
  const thornN = Math.max(9, Math.round(30 * Math.sqrt(k)))

  // a lua fica de pé dentro do nó: o nó dá a direção e a inclinação do corte
  const moon = new TransformNode("bc-moon", scene)
  const sickle = sickleMesh(scene)
  const sickleMat = shaderOf(scene, "bc-sickle-mat", "SICKLE", false)
  sickle.material = sickleMat
  sickle.parent = moon
  sickle.rotation.x = -Math.PI / 2
  const sweep = wakeMesh(scene)
  const sweepMat = shaderOf(scene, "bc-sweep-mat", "SWEEP", true)
  sweep.material = sweepMat
  sweep.parent = moon
  sweep.rotation.x = -Math.PI / 2
  const wings = wingsMesh(scene)
  const wingMat = shaderOf(scene, "bc-wings-mat", "WING", true)
  wings.material = wingMat
  const ring = CreateGround("bc-ring", { width: 2, height: 2 }, scene)
  const ringMat = shaderOf(scene, "bc-ring-mat", "RING", true)
  ring.material = ringMat
  const runeTex = canvasTexture(scene, "bc-rune-tex", drawRune)
  const rune = CreateGround("bc-rune", { width: 2, height: 2 }, scene)
  const runeMat = shaderOf(scene, "bc-rune-mat", "DECAL", true)
  runeMat.setTexture("uTex", runeTex)
  rune.material = runeMat
  const crackTex = canvasTexture(scene, "bc-crack-tex", drawCracks)
  const crack = CreateGround("bc-crack", { width: 2, height: 2 }, scene)
  const crackMat = shaderOf(scene, "bc-crack-mat", "DECAL", true)
  crackMat.setTexture("uTex", crackTex)
  crack.material = crackMat

  // espinhos: cristal facetado, com luz da cena (têm volume de verdade)
  const thorn = CreateCylinder("bc-thorn", { height: 1, diameterTop: 0, diameterBottom: 1, tessellation: 5, subdivisions: 1 }, scene)
  thorn.bakeTransformIntoVertices(Matrix.Translation(0, 0.5, 0))
  thorn.convertToFlatShadedMesh()
  const thornMat = new StandardMaterial("bc-thorn-mat", scene)
  thornMat.diffuseColor = new Color3(0.42, 0.02, 0.07)
  thornMat.emissiveColor = new Color3(0.2, 0.005, 0.05)
  thornMat.specularColor = new Color3(0.9, 0.4, 0.9)
  thornMat.specularPower = 48
  thorn.material = thornMat
  thorn.alwaysSelectAsActiveMesh = true
  const thornBuf = new Float32Array(thornN * 16)
  thorn.thinInstanceSetBuffer("matrix", thornBuf, 16, false)

  // gotas: sobem em espiral até a lâmina e depois voltam de quem foi atingido
  const drop = CreateSphere("bc-drop", { diameter: 1, segments: 3 }, scene)
  const dropMat = new StandardMaterial("bc-drop-mat", scene)
  dropMat.disableLighting = true
  dropMat.emissiveColor = new Color3(0.85, 0.05, 0.2)
  drop.material = dropMat
  drop.alwaysSelectAsActiveMesh = true
  const dropBuf = new Float32Array(dropN * 16)
  drop.thinInstanceSetBuffer("matrix", dropBuf, 16, false)

  const meshes = [sickle, sweep, wings, ring, rune, crack, thorn, drop]
  const mats = [sickleMat, sweepMat, wingMat, ringMat, runeMat, crackMat]
  for (const m of meshes) {
    m.isPickable = false
    m.setEnabled(false)
  }

  const noise = (i: number, s: number) => {
    const v = Math.sin(i * 127.1 + s * 311.7) * 43758.5453
    return v - Math.floor(v)
  }
  const thorns = Array.from({ length: thornN }, (_, i) => {
    const d = 1.25 + Math.pow(noise(i, 1), 0.7) * (POWER.bladeRange - 0.6)
    return {
      a: (noise(i, 2) * 2 - 1) * (POWER.bladeArc / 2 + 0.08),
      d,
      h: (0.95 + noise(i, 3) * 1.9) * (1.3 - d / 9),
      w: 0.2 + noise(i, 4) * 0.26,
      tilt: (noise(i, 5) - 0.5) * 0.5,
      out: 0.22 + noise(i, 6) * 0.28,
      sink: 1.3 + noise(i, 7) * 0.22,
      at: FIRE_AT + 0.015 + d / 26,
    }
  })
  const drops = Array.from({ length: dropN }, (_, i) => ({ a: noise(i, 8) * Math.PI * 2, r: 1.1 + noise(i, 9) * 1.3, at: 0.08 + noise(i, 10) * 0.42, s: 0.05 + noise(i, 11) * 0.08, back: 0.98 + noise(i, 12) * 0.28 }))

  const mat = new Matrix()
  const q = new Quaternion()
  const sv = new Vector3()
  const pv = new Vector3()
  const dir = new Vector3()
  const up = Vector3.Up()
  const zero = new Vector3(0, 0, 0)
  let S: Live | null = null
  let clock = 0

  const hideAll = () => {
    for (const m of meshes) m.setEnabled(false)
  }

  const stepThorns = (s: Live) => {
    let any = false
    for (let i = 0; i < thornN; i++) {
      const o = thorns[i]
      const grow = backOut(seg(s.t, o.at, o.at + 0.1))
      const gone = easeInOut(seg(s.t, o.sink, o.sink + 0.3))
      const on = s.t >= o.at && gone < 1
      any ||= on
      const a = s.facing + o.a
      const lean = o.out * (1 - gone)
      Quaternion.RotationYawPitchRollToRef(a, lean, o.tilt, q)
      sv.set(on ? o.w * (1 - gone * 0.5) : 0, on ? o.h * Math.max(0.001, grow) * (1 - gone) : 0, on ? o.w * (1 - gone * 0.5) : 0)
      pv.set(s.x + Math.sin(a) * o.d, -0.04, s.z + Math.cos(a) * o.d)
      Matrix.ComposeToRef(sv, q, pv, mat)
      mat.copyToArray(thornBuf, i * 16)
    }
    thorn.setEnabled(any)
    if (any) thorn.thinInstanceBufferUpdated("matrix")
  }

  const stepDrops = (s: Live) => {
    let any = false
    const chestY = s.height * 0.62
    for (let i = 0; i < dropN; i++) {
      const o = drops[i]
      let on = false
      sv.setAll(0)
      const rise = seg(s.t, o.at, o.at + 0.34)
      if (s.t >= o.at && rise < 1) {
        // sobe girando e fecha no ponto da lâmina
        on = true
        const ease = rise * rise
        const a = o.a + rise * 4.2
        const r = o.r * (1 - ease)
        pv.set(s.x + Math.sin(a) * r, 0.05, s.z + Math.cos(a) * r)
        Vector3.LerpToRef(pv, s.bladeAt, ease, pv)
        pv.y = 0.05 + (s.bladeAt.y - 0.05) * Math.pow(rise, 1.4)
        dir.set(Math.cos(a), 0.9, -Math.sin(a)).normalize()
        const size = o.s * (1 - 0.4 * rise)
        sv.set(size, size * 2.6, size)
      } else if (s.hits.length && s.t >= o.back) {
        const back = seg(s.t, o.back, o.back + 0.3)
        if (back < 1) {
          // volta de quem foi atingido: é a cura do golpe aparecendo
          on = true
          const from = s.hits[i % s.hits.length]
          const u = easeInOut(back)
          pv.set(from.x + (s.x - from.x) * u, from.y + (chestY - from.y) * u + Math.sin(u * Math.PI) * 1.1, from.z + (s.z - from.z) * u)
          dir.set(s.x - from.x, 0.3, s.z - from.z).normalize()
          const size = o.s * (1.1 - 0.7 * u)
          sv.set(size, size * 2.8, size)
        }
      }
      if (on) {
        any = true
        Quaternion.FromUnitVectorsToRef(up, dir, q)
        Matrix.ComposeToRef(sv, q, pv, mat)
      } else Matrix.ComposeToRef(zero, Quaternion.Identity(), zero, mat)
      mat.copyToArray(dropBuf, i * 16)
    }
    drop.setEnabled(any)
    if (any) drop.thinInstanceBufferUpdated("matrix")
  }

  return {
    play(s) {
      S = s
      clock = 0
      rune.setEnabled(true)
      wings.setEnabled(true)
    },
    step(dt) {
      const s = S
      if (!s || s.cut) {
        hideAll()
        return false
      }
      clock += dt
      if (s.free) s.t += dt
      const t = s.t
      if (t >= FX_END) {
        hideAll()
        return false
      }
      const eye = scene.activeCamera?.globalPosition
      const gain = BLOOD_TUNE.gain
      for (const m of mats) {
        m.setFloat("uTime", clock)
        m.setFloat("uGain", gain)
        if (eye) m.setVector3("uEye", eye)
      }

      // círculo de luas: abre rápido, gira, some depois do golpe
      const runeFade = 1 - seg(t, 1.05, 1.5)
      rune.setEnabled(runeFade > 0)
      rune.position.set(s.x, 0.05, s.z)
      rune.rotation.y = clock * 0.9
      rune.scaling.setAll(Math.max(2.2, s.height * 1.15))
      runeMat.setFloat("uR", 1.1 * easeOut(seg(t, 0, 0.2)))
      runeMat.setFloat("uFade", 0.92 * runeFade)

      // asas: abrem na carga, fecham na antecipação e queimam antes do golpe (a câmera vem de trás)
      const open = easeOut(seg(t, 0.14, 0.5)) * (1 - 0.45 * easeInOut(seg(t, 0.6, 0.74)))
      const wingCut = seg(t, 0.62, 0.76)
      wings.setEnabled(wingCut < 1)
      wings.position.set(s.x - Math.sin(s.facing) * 0.28, s.height * 0.76, s.z - Math.cos(s.facing) * 0.28)
      wings.rotation.y = s.facing
      wings.scaling.setAll(s.height * 1.42)
      wingMat.setFloat("uOpen", open)
      wingMat.setFloat("uCut", wingCut)
      wingMat.setFloat("uFade", Math.min(1, t / 0.12) * (1 - seg(t, 0.66, 0.76)))

      // lua: sai da lâmina, cruza o meio do cone no passo do dano, segue voando e queima
      const moonOn = t >= MOON_FROM && t < MOON_END
      sickle.setEnabled(moonOn)
      sweep.setEnabled(moonOn)
      if (moonOn) {
        const out = easeOut(seg(t, MOON_FROM, FIRE_AT))
        const fly = seg(t, FIRE_AT, MOON_END)
        const r = out < 1 ? MOON_R[0] + (MOON_R[1] - MOON_R[0]) * out : MOON_R[1] + (MOON_R[2] - MOON_R[1]) * fly
        const z = out < 1 ? MOON_Z[0] + (MOON_Z[1] - MOON_Z[0]) * out : MOON_Z[1] + (MOON_Z[2] - MOON_Z[1]) * fly
        // o nó é o centro do círculo da lua: fica ao lado e abaixo, para o BOJO passar no eixo do golpe
        const side = r * Math.sin(MOON_ROLL)
        const belly = 1.3 + s.height * 0.22
        moon.position.set(s.x + Math.sin(s.facing) * z + Math.cos(s.facing) * side, belly - r * Math.cos(MOON_ROLL), s.z + Math.cos(s.facing) * z - Math.sin(s.facing) * side)
        moon.rotation.set(0, s.facing, MOON_ROLL)
        sickle.scaling.setAll(r)
        // o rastro alonga até onde a lua nasceu
        sweep.scaling.set(r, Math.max(0.5, z - 0.4), r)
        sickleMat.setFloat("uCut", easeInOut(seg(t, 1.0, MOON_END)) * 1.02)
        sweepMat.setFloat("uFade", 1 - seg(t, 0.98, MOON_END))
      }

      // no chão, a partir do impacto
      if (s.impacted) {
        const wave = seg(t, FIRE_AT, FIRE_AT + 0.32)
        ring.setEnabled(wave < 1)
        ring.position.set(s.x, 0.07, s.z)
        ring.scaling.setAll(POWER.bladeRange + 2.4)
        ringMat.setFloat("uR", 0.28 + 0.72 * easeOut(wave))
        ringMat.setFloat("uFade", 1 - wave * wave)
        const crackFade = 1 - seg(t, 1.3, FX_END)
        crack.setEnabled(crackFade > 0)
        crack.position.set(s.x, 0.06, s.z)
        crack.rotation.y = s.facing
        crack.scaling.setAll(POWER.bladeRange + 1.3)
        crackMat.setFloat("uR", 0.18 + 1.05 * easeOut(seg(t, FIRE_AT, FIRE_AT + 0.16)))
        crackMat.setFloat("uFade", crackFade)
      }
      stepThorns(s)
      stepDrops(s)
      return true
    },
    stop() {
      if (S) S.cut = true
      hideAll()
    },
    warm() {
      // compila tudo antes da primeira vez: o golpe não pode engasgar no quadro do dano
      for (const m of meshes) {
        m.setEnabled(true)
        m.material?.forceCompilation(m)
        m.setEnabled(false)
      }
    },
    dispose() {
      for (const m of meshes) m.dispose()
      moon.dispose()
      for (const m of [...mats, thornMat, dropMat]) m.dispose()
      runeTex.dispose()
      crackTex.dispose()
    },
  }
}

export interface BloodCut {
  /** Roteiro novo a cada uso (a posição e a direção são as da hora do golpe). */
  script: () => AbilityScript
  /** Um inimigo foi pego pelo poder (evento da regra, antes do impacto). */
  hit: (at: Vector3) => void
  warm: () => void
}

export function bloodCut(rig: BloodRig): BloodCut {
  const build: FxBuilder<Live> = (ctx) => buildEffect(ctx, rig)
  let live: Live | null = null
  return {
    warm: () => rig.stage.warm("blood-cut", build),
    hit: (at) => live?.hits.push(at.clone()),
    script() {
      const me = rig.subject()
      const s: Live = { t: 0, facing: me.facing, x: me.x, z: me.z, height: me.height, free: false, cut: false, hits: [], impacted: false, bladeAt: new Vector3(me.x, me.height, me.z) }
      live = s
      rig.stage.play("blood-cut", build, s)
      const f = FIRE_AT
      return {
        id: "blood-cut",
        dur: POWER.dur,
        // o tempo aperta até o golpe e solta rápido depois: dá ~2,4 s de tela para 1,6 s de regra
        time: [
          { t: 0, k: 1 },
          { t: 0.2, k: 0.85 },
          { t: 0.6, k: 0.7 },
          { t: 0.72, k: 0.4 },
          { t: f, k: 0.28 },
          { t: 0.93, k: 0.3 },
          { t: 1.06, k: 0.8 },
          { t: 1.2, k: 1 },
        ],
        // close no rosto → sobe para o lado no golpe → acompanha o cone → devolve a câmera do jogo
        camera: [
          { t: 0, yaw: 62, dist: 3.1, high: 0.82, look: 0.78, lead: 0, fov: 0.78 },
          { t: 0.3, yaw: 128, dist: 2.1, high: 0.84, look: 0.84, lead: 0, fov: 0.66 },
          { t: 0.6, yaw: 152, dist: 2.3, high: 0.76, look: 0.82, lead: 0, fov: 0.66 },
          { t: 0.76, yaw: 34, dist: 5, high: 0.95, look: 0.62, lead: 2.1, fov: 0.92 },
          { t: f, yaw: 25, dist: 6.2, high: 0.95, look: 0.56, lead: 3, fov: 0.88 },
          { t: 1.08, yaw: 18, dist: 6.9, high: 1.15, look: 0.46, lead: 3.1, fov: 0.9 },
          { t: POWER.dur, yaw: 0, dist: 6.6, high: 1.3, look: 0.5, lead: 1.6, fov: 0.9 },
        ],
        cues: [
          { at: 0, run: () => (rig.audio.heartbeat(), rig.act("VPower", 0.66, 0, 0.8)) },
          { at: 0.1, run: () => rig.audio.inhale(0.75) },
          { at: 0.14, run: () => rig.cutIn() },
          { at: 0.42, run: () => rig.audio.heartbeat() },
          // VGSlash: contato a 0,44 do clipe; o trecho cai em cima de fireAt
          { at: 0.61, run: () => rig.act("VGSlash", 0.5, 0.18, 0.72) },
          { at: MOON_FROM, run: () => rig.audio.rend() },
          {
            at: f,
            run: () => {
              s.impacted = true
              rig.hitStop(0.07)
              rig.shake(0.55)
              rig.audio.boom()
              rig.audio.thorns()
              rig.vfx.dust(new Vector3(s.x + Math.sin(s.facing) * 2.4, 0.1, s.z + Math.cos(s.facing) * 2.4), 18)
              for (const at of s.hits) rig.vfx.impact(at, SPARK, false, 0.35)
            },
          },
        ],
        step(t) {
          s.t = t
          const me = rig.subject()
          s.x = me.x
          s.z = me.z
          const tip = rig.blade()
          if (tip) s.bladeAt.copyFrom(tip)
          else s.bladeAt.set(me.x + Math.sin(me.facing) * 0.5, me.height * 0.85, me.z + Math.cos(me.facing) * 0.5)
          rig.dim(1 - 0.52 * easeOut(seg(t, 0, 0.2)) * (1 - easeInOut(seg(t, 1.0, 1.45))))
        },
        finish() {
          s.free = true
          rig.dim(1)
        },
      }
    },
  }
}
