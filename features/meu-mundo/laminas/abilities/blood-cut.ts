// features/meu-mundo/laminas/abilities/blood-cut.ts — GOLPE DE SANGUE, o Poder Máximo dos vampiros (2026-11-07).
//
// A mecânica é a do poder de lâmina em sim/fight.ts, sem mudança: cone à frente (bladeRange,
// bladeArc), dano em POWER.fireAt, cura e sem levar golpe. Este arquivo é só a apresentação.
//
//   preparação  APAGÃO: o mundo vai para o preto e só o corpo fica aceso; cut-in e círculo de luas
//   carga       asas de energia abrem nas costas, faíscas fecham na lâmina, a luz cresce nela
//   antecipação o mundo volta, a câmera sobe para o lado, as asas se desfazem, o tempo quase para
//   golpe       a LUA sai da lâmina na diagonal e cresce até tomar a tela
//   impacto     no passo do dano: clarão de tela cheia, estrela, onda, rachaduras, espinhos,
//               destroços pretos, névoa e faíscas
//   resto       a lua segue voando e se desfaz, o sangue volta de quem foi atingido
//
// COMO É DESENHADO. Nenhuma peça tem contorno: a forma sai de ruído erodido (abilities/fx,
// por pipeline/laminas/abilities/build_blood_textures.py) passando por uma rampa de cor, com
// a borda se desfazendo. O brilho é pré-multiplicado: a mesma peça cobre o fundo com sangue
// escuro e soma luz por cima. A arena é clara, e luz só somada estoura em branco.

import type { Scene } from "@babylonjs/core/scene"
import type { AbstractMesh } from "@babylonjs/core/Meshes/abstractMesh"
import { Color3, Color4 } from "@babylonjs/core/Maths/math.color"
import { Matrix, Quaternion, Vector3 } from "@babylonjs/core/Maths/math.vector"
import { Mesh } from "@babylonjs/core/Meshes/mesh"
import { TransformNode } from "@babylonjs/core/Meshes/transformNode"
import { VertexData } from "@babylonjs/core/Meshes/mesh.vertexData"
import { CreateCylinder } from "@babylonjs/core/Meshes/Builders/cylinderBuilder"
import { CreateGround } from "@babylonjs/core/Meshes/Builders/groundBuilder"
import { CreatePlane } from "@babylonjs/core/Meshes/Builders/planeBuilder"
import { CreatePolyhedron } from "@babylonjs/core/Meshes/Builders/polyhedronBuilder"
import { CreateSphere } from "@babylonjs/core/Meshes/Builders/sphereBuilder"
import { PointLight } from "@babylonjs/core/Lights/pointLight"
import { ShaderMaterial } from "@babylonjs/core/Materials/shaderMaterial"
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial"
import { FresnelParameters } from "@babylonjs/core/Materials/fresnelParameters"
import { Effect } from "@babylonjs/core/Materials/effect"
import { Texture } from "@babylonjs/core/Materials/Textures/texture"
import { DynamicTexture } from "@babylonjs/core/Materials/Textures/dynamicTexture"
import { ParticleSystem } from "@babylonjs/core/Particles/particleSystem"
import "@babylonjs/core/Particles/particleSystemComponent"
import { Constants } from "@babylonjs/core/Engines/constants"
import "@babylonjs/core/Meshes/thinInstanceMesh"
import { POWER } from "../sim/fight"
import type { BoxeAudio } from "../engine/audio"
import type { BoxeClip } from "../../engine/avatars"
import type { FxBuilder, FxContext, FxEffect, FxStage } from "../../engine/fx/fx-core"
import type { Vfx } from "../../engine/vfx"
import type { AbilityScript, Subject } from "./director"

/** Ajustes do laboratório (harness); os valores daqui são os que valem no jogo. */
export const BLOOD_TUNE = { density: 1, gain: 1 }

const ART = "/meu-mundo/laminas/abilities/fx"
const DEEP = new Color3(0.13, 0.005, 0.05)
const BLOOD = new Color3(0.72, 0.03, 0.16)
const HOT = new Color3(1, 0.22, 0.42)
/** Violeta dos olhos e do cristal dos vampiros. */
const EDGE = new Color3(0.72, 0.3, 1)

const FIRE_AT = POWER.fireAt
/** Até quando as sobras ficam na tela, depois que a pessoa já voltou a jogar (s). */
const FX_END = POWER.dur + 0.35
/** A lua nasce na lâmina e passa pelo meio do cone exatamente no dano. */
const MOON_FROM = 0.73
const MOON_END = 1.22
/** Raio da lua: no nascimento, no dano e no fim do voo (m). */
const MOON_R = [1.8, 5.2, 7.4]
/** Quanto ela avança à frente: no nascimento, no dano e no fim do voo (m). */
const MOON_Z = [0.8, POWER.bladeRange * 0.55, POWER.bladeRange + 3.4]
/** Inclinação do corte (rad). */
const MOON_ROLL = 0.72
const MOON_SPAN = 1.18
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
varying vec2 vUV;
void main() {
  vec3 p = position;
#ifdef WING
  // As asas abrem aqui: cada dedo gira do ombro e a membrana acompanha, sem refazer a malha.
  float side = sign(position.x);
  float u = uv.x;
  float v = uv.y;
  float ang = mix(1.5, mix(1.28, -0.8, u), uOpen);
  float len = (1.0 - 0.34 * u) * (0.3 + 0.7 * uOpen);
  float r = v * len;
  float flap = 0.08 * sin(uTime * 7.0 + v * 3.0 + u * 2.0) * v;
  p = vec3(side * cos(ang) * r, sin(ang) * r, -0.42 * v * v * (1.0 - 0.5 * u) + flap);
#endif
  vUV = uv;
  gl_Position = viewProjection * (world * vec4(p, 1.0));
}`

const FRAGMENT = /* glsl */ `
precision highp float;
uniform vec3 uDeep;
uniform vec3 uBlood;
uniform vec3 uHot;
uniform vec3 uEdge;
uniform float uTime;
uniform float uFade;
uniform float uCut;
uniform float uR;
uniform float uGain;
uniform sampler2D uNoise;
uniform sampler2D uTex;
varying vec2 vUV;
// A rampa: escuro → sangue → quente → quase branco. Toda peça passa por aqui.
vec3 ramp(float x) {
  vec3 c = mix(uDeep, uBlood, smoothstep(0.0, 0.38, x));
  c = mix(c, uHot, smoothstep(0.34, 0.72, x));
  return mix(c, vec3(1.0, 0.88, 0.93), smoothstep(0.74, 1.0, x));
}
void main() {
  // rgb já multiplicado: o alfa cobre o fundo, o que passar dele é luz somada
  vec4 outc = vec4(0.0);
#ifdef MOON
  float u = vUV.x;
  float y = vUV.y;
  float tip = pow(sin(3.14159 * clamp(u, 0.0, 1.0)), 0.7);
  float fiber = texture2D(uNoise, vec2(y * 0.8 + 0.1, u * 1.3 - uTime * 1.5)).g;
  float cloud = texture2D(uNoise, vec2(u * 1.1 - uTime * 0.5, y * 0.8)).r;
  float yy = max(y, 0.0);
  float blade = exp(-yy * 24.0) * 1.2;
  float inner = pow(1.0 - clamp(yy, 0.0, 1.0), 2.1);
  float wisp = 0.38 + 0.62 * smoothstep(0.26, 0.8, fiber * 0.72 + cloud * 0.5);
  float v = (blade + inner * wisp * 0.95) * tip;
  v -= uCut * (0.45 + 1.0 * (1.0 - cloud));
  float inside = step(0.0, y);
  float body = smoothstep(0.05, 0.32, v) * inside;
  float halo = (1.0 - inside) * exp(y * 15.0) * 0.5 * tip * (1.0 - uCut);
  float light = smoothstep(0.2, 0.95, v) * inside + halo;
  vec3 c = ramp(min(v, 1.0));
  c = mix(c, uEdge, (1.0 - inside) * 0.55 + smoothstep(0.55, 0.95, yy) * 0.35);
  outc = vec4(c * (body * 0.75 + light) * uGain, body * 0.8 * (1.0 - 0.45 * smoothstep(0.6, 1.0, v))) * uFade;
#endif
#ifdef WAKE
  // Fios que saem da lua e somem para trás; u corre o arco, v vai da lua ao fim.
  float tip = pow(sin(3.14159 * vUV.x), 0.8);
  float fiber = texture2D(uNoise, vec2(vUV.y * 0.5, vUV.x * 2.6 + uTime * 0.2)).g;
  float tail = pow(1.0 - vUV.y, 1.5);
  float v = smoothstep(0.5, 0.95, fiber + 0.25 * tail) * tail * tip;
  outc = vec4(ramp(v) * v * 1.4 * uGain, v * 0.3) * uFade;
#endif
#ifdef WING
  float u = vUV.x;
  float v = vUV.y;
  float veins = texture2D(uNoise, vec2(u * 0.42, v * 0.3 - uTime * 0.06)).b;
  float cloud = texture2D(uNoise, vec2(u * 1.2 + 0.3, v * 0.9 - uTime * 0.35)).r;
  float fiber = texture2D(uNoise, vec2(u * 2.0, v * 0.6 - uTime * 0.6)).g;
  float rib = smoothstep(0.14, 0.0, abs(fract(u * ${WING_FINGERS}.0 + 0.5) - 0.5)) * (1.0 - 0.6 * v);
  // a ponta não tem borda: vira fumaça conforme o ruído
  float end = smoothstep(1.0, 0.6, v + (cloud - 0.5) * 0.6) * smoothstep(0.0, 0.1, v);
  float memb = end * (0.5 + 0.5 * fiber) - uCut * (1.3 - cloud);
  float body = smoothstep(0.03, 0.5, memb);
  float val = 0.16 + cloud * 0.22 + veins * 0.35 + rib * 0.62;
  float light = (veins * 0.3 + rib * 0.85 + smoothstep(0.55, 0.9, cloud) * 0.16) * body;
  vec3 c = mix(ramp(val), uEdge, smoothstep(0.5, 0.95, v) * 0.6);
  outc = vec4(c * (body * 0.55 + light) * uGain, body * 0.78) * uFade;
#endif
#ifdef RING
  float r = length(vUV - 0.5) * 2.0;
  float ang = atan(vUV.y - 0.5, vUV.x - 0.5) / 6.2832;
  float n = texture2D(uNoise, vec2(ang * 2.0, r * 0.6 - uTime * 0.3)).r;
  float band = smoothstep(uR - 0.05 - 0.16 * n, uR - 0.006, r) * smoothstep(uR + 0.008, uR - 0.002, r);
  band *= 0.55 + 0.45 * n;
  outc = vec4(ramp(band * 0.72) * band * 0.85 * uGain, band * 0.5) * uFade;
#endif
#ifdef DECAL
  // Desenho no chão: traço nítido no R, brilho no G; abre do centro e a frente da abertura acende.
  float r = length(vUV - 0.5) * 2.0;
  vec4 t = texture2D(uTex, vUV);
  float n = texture2D(uNoise, vUV * 1.4 + vec2(uTime * 0.05, -uTime * 0.08)).r;
  float show = smoothstep(uR, uR - 0.1, r);
  float front = smoothstep(uR - 0.2, uR - 0.06, r) * show;
  float line = t.r;
  float glow = t.g * (0.6 + 0.6 * n);
  vec3 c = ramp(0.4 + line * 0.55 + front * 0.3);
  outc = vec4(c * (line * 1.25 + glow * 0.75) * show * uGain, (line * 0.85 + glow * 0.3) * show) * uFade;
#endif
#ifdef POOL
  // Mancha no chão: escurece a areia em volta e a luz do círculo fica de pé.
  float r = length(vUV - 0.5) * 2.0;
  float n = texture2D(uNoise, vUV * 0.9 + uTime * 0.02).r;
  float a = smoothstep(uR, uR * 0.25, r + (n - 0.5) * 0.3);
  outc = vec4(uBlood * a * 0.16 * uGain, a * 0.62) * uFade;
#endif
#ifdef FLASH
  // Estrela do impacto: pontas desiguais a partir do ruído, miolo branco.
  vec2 p = vUV - 0.5;
  float r = length(p) * 2.0;
  float ang = atan(p.y, p.x) / 6.2832 + 0.5;
  float s = texture2D(uNoise, vec2(ang * 3.0, 0.37)).g;
  float spike = 0.16 + 0.84 * pow(s, 3.2);
  float rays = smoothstep(spike, 0.0, r);
  float v = rays * 0.9 + exp(-r * 8.0);
  outc = vec4(mix(ramp(min(v, 1.0)), uEdge, smoothstep(0.1, 0.8, r) * 0.5) * v * 1.5 * uGain, smoothstep(0.1, 0.7, v) * 0.45) * uFade;
#endif
  gl_FragColor = outc;
}`

type ShaderKind = "MOON" | "WAKE" | "WING" | "RING" | "DECAL" | "POOL" | "FLASH"

function shaderOf(scene: Scene, name: string, kind: ShaderKind, noise: Texture) {
  Effect.ShadersStore.mmBloodVertexShader = VERTEX
  Effect.ShadersStore.mmBloodFragmentShader = FRAGMENT
  const m = new ShaderMaterial(
    name,
    scene,
    { vertex: "mmBlood", fragment: "mmBlood" },
    {
      attributes: ["position", "normal", "uv"],
      uniforms: ["world", "viewProjection", "uDeep", "uBlood", "uHot", "uEdge", "uTime", "uFade", "uCut", "uR", "uGain", "uOpen"],
      samplers: ["uNoise", "uTex"],
      defines: [`#define ${kind}`],
      needAlphaBlending: true,
    },
  )
  m.backFaceCulling = false
  m.alphaMode = Constants.ALPHA_PREMULTIPLIED
  m.disableDepthWrite = true
  m.setColor3("uDeep", DEEP)
  m.setColor3("uBlood", BLOOD)
  m.setColor3("uHot", HOT)
  m.setColor3("uEdge", EDGE)
  m.setTexture("uNoise", noise)
  m.setTexture("uTex", noise)
  for (const [k, v] of [["uFade", 1], ["uCut", 0], ["uR", 1], ["uGain", 1], ["uOpen", 0], ["uTime", 0]] as const) m.setFloat(k, v)
  return m
}

/** A lua: fita em arco. y = 0 é o fio de corte, y > 0 entra na lua, y < 0 é o halo por fora. */
function moonMesh(scene: Scene, name: string) {
  const N = 56
  const rows = [-0.24, -0.1, -0.02, 0, 0.03, 0.08, 0.16, 0.3, 0.5, 0.75, 1]
  const pos: number[] = []
  const uv: number[] = []
  const nor: number[] = []
  const idx: number[] = []
  for (let i = 0; i <= N; i++) {
    const u = i / N
    const a = -MOON_SPAN + 2 * MOON_SPAN * u
    const taper = Math.pow(Math.sin(Math.PI * u), 0.8)
    for (const y of rows) {
      const r = 1 - y * 0.74 * taper
      // a fita bojuda dá volume sem precisar de borda dura
      pos.push(Math.sin(a) * r, 0.16 * y * taper, Math.cos(a) * r)
      uv.push(u, y)
      nor.push(0, 1, 0)
    }
  }
  const M = rows.length
  for (let i = 0; i < N; i++)
    for (let j = 0; j < M - 1; j++) {
      const a = i * M + j
      const b = a + M
      idx.push(a, b, a + 1, a + 1, b, b + 1)
    }
  const m = new Mesh(name, scene)
  Object.assign(new VertexData(), { positions: pos, indices: idx, uvs: uv, normals: nor }).applyToMesh(m)
  return m
}

/** Rastro da lua: casca que parte do arco e vai para trás (y −1). */
function wakeMesh(scene: Scene) {
  const N = 40
  const pos: number[] = []
  const uv: number[] = []
  const nor: number[] = []
  const idx: number[] = []
  for (let i = 0; i <= N; i++) {
    const u = i / N
    const a = -MOON_SPAN + 2 * MOON_SPAN * u
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
  const U = WING_FINGERS * 8
  const V = 12
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
  /** Ritmo da apresentação: as partículas andam nele. */
  pace: () => number
  /** Clarão de tela cheia no impacto. */
  flash: () => void
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
  const thornN = Math.max(12, Math.round(38 * Math.sqrt(k)))

  const noise = new Texture(`${ART}/noise.webp`, scene)
  const runeTex = new Texture(`${ART}/rune.webp`, scene)
  const crackTex = new Texture(`${ART}/crack.webp`, scene)
  const smokeTex = new Texture(`${ART}/smoke.webp`, scene)
  for (const t of [runeTex, crackTex]) t.wrapU = t.wrapV = Texture.CLAMP_ADDRESSMODE

  // a lua fica de pé dentro do nó: o nó dá a direção e a inclinação do corte
  const moon = new TransformNode("bc-moon", scene)
  const blade = moonMesh(scene, "bc-blade")
  const bladeMat = shaderOf(scene, "bc-blade-mat", "MOON", noise)
  blade.material = bladeMat
  const ghost = moonMesh(scene, "bc-ghost")
  const ghostMat = shaderOf(scene, "bc-ghost-mat", "MOON", noise)
  ghost.material = ghostMat
  const wake = wakeMesh(scene)
  const wakeMat = shaderOf(scene, "bc-wake-mat", "WAKE", noise)
  wake.material = wakeMat
  for (const m of [blade, ghost, wake]) {
    m.parent = moon
    m.rotation.x = -Math.PI / 2
  }
  const wings = wingsMesh(scene)
  const wingMat = shaderOf(scene, "bc-wings-mat", "WING", noise)
  wings.material = wingMat
  const ring = CreateGround("bc-ring", { width: 2, height: 2 }, scene)
  const ringMat = shaderOf(scene, "bc-ring-mat", "RING", noise)
  ring.material = ringMat
  const pool = CreateGround("bc-pool", { width: 2, height: 2 }, scene)
  const poolMat = shaderOf(scene, "bc-pool-mat", "POOL", noise)
  pool.material = poolMat
  const rune = CreateGround("bc-rune", { width: 2, height: 2 }, scene)
  const runeMat = shaderOf(scene, "bc-rune-mat", "DECAL", noise)
  runeMat.setTexture("uTex", runeTex)
  rune.material = runeMat
  const crack = CreateGround("bc-crack", { width: 2, height: 2 }, scene)
  const crackMat = shaderOf(scene, "bc-crack-mat", "DECAL", noise)
  crackMat.setTexture("uTex", crackTex)
  crack.material = crackMat
  const flash = CreatePlane("bc-flash", { size: 2 }, scene)
  const flashMat = shaderOf(scene, "bc-flash-mat", "FLASH", noise)
  flash.material = flashMat
  flash.billboardMode = Mesh.BILLBOARDMODE_ALL

  // espinhos: cristal facetado escuro, a borda acende pelo ângulo e a luz da cena bate neles
  const thorn = CreateCylinder("bc-thorn", { height: 1, diameterTop: 0, diameterBottom: 1, tessellation: 5, subdivisions: 1 }, scene)
  thorn.bakeTransformIntoVertices(Matrix.Translation(0, 0.5, 0))
  thorn.convertToFlatShadedMesh()
  const thornMat = new StandardMaterial("bc-thorn-mat", scene)
  thornMat.diffuseColor = new Color3(0.5, 0.03, 0.09)
  thornMat.emissiveColor = new Color3(0.42, 0.015, 0.09)
  thornMat.specularColor = new Color3(1, 0.5, 0.9)
  thornMat.specularPower = 64
  thornMat.emissiveFresnelParameters = Object.assign(new FresnelParameters(), { leftColor: new Color3(1, 0.3, 0.5), rightColor: new Color3(0.3, 0.008, 0.07), bias: 0.16, power: 1.7 })
  thorn.material = thornMat
  thorn.alwaysSelectAsActiveMesh = true
  const thornBuf = new Float32Array(thornN * 16)
  thorn.thinInstanceSetBuffer("matrix", thornBuf, 16, false)

  // gotas de luz: voltam de quem foi atingido para o corpo (a cura aparecendo)
  const drop = CreateSphere("bc-drop", { diameter: 1, segments: 3 }, scene)
  const dropMat = new StandardMaterial("bc-drop-mat", scene)
  dropMat.disableLighting = true
  dropMat.emissiveColor = new Color3(1, 0.3, 0.5)
  drop.material = dropMat
  drop.alwaysSelectAsActiveMesh = true
  const dropBuf = new Float32Array(dropN * 16)
  drop.thinInstanceSetBuffer("matrix", dropBuf, 16, false)

  // destroços: pedaços pretos voando dão escala e peso ao impacto
  const rockN = Math.max(10, Math.round(34 * Math.sqrt(k)))
  // octaedro esticado por pedaço: lasca angulosa, nunca bola
  const rock = CreatePolyhedron("bc-rock", { type: 1, size: 0.6 }, scene)
  rock.convertToFlatShadedMesh()
  const rockMat = new StandardMaterial("bc-rock-mat", scene)
  rockMat.diffuseColor = new Color3(0.05, 0.03, 0.04)
  rockMat.specularColor = new Color3(0.3, 0.1, 0.15)
  rock.material = rockMat
  rock.alwaysSelectAsActiveMesh = true
  const rockBuf = new Float32Array(rockN * 16)
  rock.thinInstanceSetBuffer("matrix", rockBuf, 16, false)

  // ── partículas ─────────────────────────────────────────────────────────────
  const dot = new DynamicTexture("bc-dot", { width: 64, height: 64 }, scene, false)
  {
    const g = dot.getContext() as CanvasRenderingContext2D
    const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32)
    gr.addColorStop(0, "rgba(255,255,255,1)")
    gr.addColorStop(0.28, "rgba(255,255,255,.7)")
    gr.addColorStop(1, "rgba(255,255,255,0)")
    g.fillStyle = gr
    g.fillRect(0, 0, 64, 64)
    dot.hasAlpha = true
    dot.update()
  }
  const hot = new Color4(1, 0.5, 0.62, 1)
  const red = new Color4(1, 0.1, 0.26, 1)
  const violet = new Color4(0.62, 0.22, 1, 0)
  const spark = (name: string, cap: number) => {
    const p = new ParticleSystem(name, Math.max(16, Math.round(cap * k)), scene)
    p.particleTexture = dot
    p.blendMode = ParticleSystem.BLENDMODE_ADD
    p.color1 = hot
    p.color2 = red
    p.colorDead = violet
    p.emitRate = 0
    p.emitter = Vector3.Zero()
    return p
  }
  // brasas soltas subindo em volta do corpo
  const embers = spark("bc-embers", 200)
  embers.minSize = 0.03
  embers.maxSize = 0.09
  embers.minLifeTime = 0.6
  embers.maxLifeTime = 1.3
  embers.minEmitPower = 0.3
  embers.maxEmitPower = 1.4
  embers.gravity = new Vector3(0, 1.8, 0)
  embers.createCylinderEmitter(1.9, 0.1, 1, 0)
  // riscos de luz fechando na lâmina
  const inflow = spark("bc-inflow", 170)
  inflow.billboardMode = ParticleSystem.BILLBOARDMODE_STRETCHED
  inflow.minSize = 0.03
  inflow.maxSize = 0.07
  inflow.minScaleY = 3
  inflow.maxScaleY = 7
  inflow.minLifeTime = 0.26
  inflow.maxLifeTime = 0.42
  inflow.minEmitPower = -9
  inflow.maxEmitPower = -6
  inflow.createSphereEmitter(2.7, 0)
  // faíscas riscando para fora no impacto e soltas pela lua
  const burst = spark("bc-burst", 260)
  burst.billboardMode = ParticleSystem.BILLBOARDMODE_STRETCHED
  burst.minSize = 0.03
  burst.maxSize = 0.09
  burst.minScaleY = 2
  burst.maxScaleY = 6
  burst.minLifeTime = 0.3
  burst.maxLifeTime = 0.8
  burst.minEmitPower = 4
  burst.maxEmitPower = 15
  burst.gravity = new Vector3(0, -9, 0)
  burst.createSphereEmitter(0.7, 1)
  // névoa de sangue: quadros da textura, cobre o fundo em vez de somar luz
  const mist = new ParticleSystem("bc-mist", Math.max(10, Math.round(46 * k)), scene, null, true)
  mist.particleTexture = smokeTex
  mist.blendMode = ParticleSystem.BLENDMODE_STANDARD
  mist.startSpriteCellID = 0
  mist.endSpriteCellID = 15
  mist.spriteCellWidth = 128
  mist.spriteCellHeight = 128
  mist.spriteCellLoop = false
  mist.color1 = new Color4(0.62, 0.05, 0.14, 0.95)
  mist.color2 = new Color4(0.3, 0.02, 0.1, 0.9)
  mist.colorDead = new Color4(0.14, 0.01, 0.08, 0)
  mist.minSize = 1.4
  mist.maxSize = 3.4
  mist.minLifeTime = 0.8
  mist.maxLifeTime = 1.3
  mist.minEmitPower = 0.5
  mist.maxEmitPower = 2.6
  mist.minAngularSpeed = -0.6
  mist.maxAngularSpeed = 0.6
  mist.gravity = new Vector3(0, 0.7, 0)
  mist.emitRate = 0
  mist.emitter = Vector3.Zero()
  mist.createSphereEmitter(2.4, 1)
  const systems = [embers, inflow, burst, mist]

  // uma luz de verdade: ilumina o corpo e o chão; no perfil fraco fica de fora
  const light = budget.layers ? new PointLight("bc-light", new Vector3(0, 1, 0), scene) : null
  if (light) {
    light.diffuse = new Color3(1, 0.1, 0.22)
    light.specular = new Color3(1, 0.3, 0.5)
    light.range = 17
    light.intensity = 0
  }

  const meshes = [blade, ghost, wake, wings, ring, pool, rune, crack, flash, thorn, drop, rock]
  const mats = [bladeMat, ghostMat, wakeMat, wingMat, ringMat, poolMat, runeMat, crackMat, flashMat]
  for (const m of meshes) {
    m.isPickable = false
    m.setEnabled(false)
  }

  const hash = (i: number, s: number) => {
    const v = Math.sin(i * 127.1 + s * 311.7) * 43758.5453
    return v - Math.floor(v)
  }
  const thorns = Array.from({ length: thornN }, (_, i) => {
    const d = 1.25 + Math.pow(hash(i, 1), 0.7) * (POWER.bladeRange - 0.6)
    return {
      a: (hash(i, 2) * 2 - 1) * (POWER.bladeArc / 2 + 0.08),
      d,
      h: (0.95 + hash(i, 3) * 2.1) * (1.3 - d / 9),
      w: 0.13 + hash(i, 4) * 0.2,
      tilt: (hash(i, 5) - 0.5) * 0.5,
      out: 0.22 + hash(i, 6) * 0.28,
      sink: 1.3 + hash(i, 7) * 0.22,
      at: FIRE_AT + 0.015 + d / 26,
    }
  })
  const drops = Array.from({ length: dropN }, (_, i) => ({ s: 0.03 + hash(i, 11) * 0.05, back: 0.98 + hash(i, 12) * 0.28 }))
  const rocks = Array.from({ length: rockN }, (_, i) => ({
    a: (hash(i, 13) * 2 - 1) * 1.1,
    d: 1 + hash(i, 14) * 4,
    out: 3 + hash(i, 15) * 9,
    up: 7 + hash(i, 16) * 13,
    size: 0.09 + Math.pow(hash(i, 17), 2.2) * 0.5,
    spin: 5 + hash(i, 18) * 14,
    flat: 0.25 + hash(i, 19) * 0.5,
    long: 1 + hash(i, 20) * 1.3,
  }))

  const mat = new Matrix()
  const q = new Quaternion()
  const sv = new Vector3()
  const pv = new Vector3()
  const dir = new Vector3()
  const up = Vector3.Up()
  const zero = new Vector3(0, 0, 0)
  const belly = new Vector3()
  const emitAt = new Vector3()
  let S: Live | null = null
  let clock = 0
  let flashed = false

  const hideAll = () => {
    for (const m of meshes) m.setEnabled(false)
    for (const p of systems) {
      p.emitRate = 0
      p.stop()
    }
    if (light) light.intensity = 0
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
      Quaternion.RotationYawPitchRollToRef(a, o.out * (1 - gone), o.tilt, q)
      sv.set(on ? o.w * (1 - gone * 0.5) : 0, on ? o.h * Math.max(0.001, grow) * (1 - gone) : 0, on ? o.w * (1 - gone * 0.5) : 0)
      pv.set(s.x + Math.sin(a) * o.d, -0.04, s.z + Math.cos(a) * o.d)
      Matrix.ComposeToRef(sv, q, pv, mat)
      mat.copyToArray(thornBuf, i * 16)
    }
    thorn.setEnabled(any)
    if (any) thorn.thinInstanceBufferUpdated("matrix")
  }

  const stepRocks = (s: Live) => {
    const tau = s.t - FIRE_AT
    const on = s.impacted && tau < 0.85
    rock.setEnabled(on)
    if (!on) return
    for (let i = 0; i < rockN; i++) {
      const o = rocks[i]
      const a = s.facing + o.a
      const y = 0.1 + o.up * tau - 13 * tau * tau
      const gone = y < -0.2
      pv.set(s.x + Math.sin(a) * (o.d + o.out * tau), y, s.z + Math.cos(a) * (o.d + o.out * tau))
      Quaternion.RotationYawPitchRollToRef(tau * o.spin, tau * o.spin * 0.7, o.a, q)
      sv.set(gone ? 0 : o.size * o.long, gone ? 0 : o.size * o.flat, gone ? 0 : o.size)
      Matrix.ComposeToRef(sv, q, pv, mat)
      mat.copyToArray(rockBuf, i * 16)
    }
    rock.thinInstanceBufferUpdated("matrix")
  }

  const stepDrops = (s: Live) => {
    let any = false
    const chestY = s.height * 0.62
    for (let i = 0; i < dropN; i++) {
      const o = drops[i]
      const back = seg(s.t, o.back, o.back + 0.3)
      if (s.hits.length && s.t >= o.back && back < 1) {
        any = true
        const from = s.hits[i % s.hits.length]
        const u = easeInOut(back)
        pv.set(from.x + (s.x - from.x) * u, from.y + (chestY - from.y) * u + Math.sin(u * Math.PI) * 1.1, from.z + (s.z - from.z) * u)
        dir.set(s.x - from.x, 0.3, s.z - from.z).normalize()
        const size = o.s * (1.1 - 0.7 * u)
        sv.set(size, size * 3.4, size)
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
      flashed = false
      rune.setEnabled(true)
      pool.setEnabled(true)
      wings.setEnabled(true)
      for (const p of systems) p.start()
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
      const gain = BLOOD_TUNE.gain
      for (const m of mats) {
        m.setFloat("uTime", clock)
        m.setFloat("uGain", gain)
      }
      // partículas no ritmo da câmera lenta
      const speed = Math.max(0.002, rig.pace() / 60)
      for (const p of systems) p.updateSpeed = speed

      // chão: mancha escura e círculo de luas
      const runeFade = 1 - seg(t, 1.05, 1.5)
      const runeR = Math.max(2.6, s.height * 1.3)
      const open = 1.12 * easeOut(seg(t, 0, 0.22))
      rune.setEnabled(runeFade > 0)
      pool.setEnabled(runeFade > 0)
      rune.position.set(s.x, 0.05, s.z)
      rune.rotation.y = clock * 0.7
      rune.scaling.setAll(runeR)
      runeMat.setFloat("uR", open)
      runeMat.setFloat("uFade", runeFade)
      pool.position.set(s.x, 0.04, s.z)
      pool.scaling.setAll(runeR * 1.7)
      poolMat.setFloat("uR", Math.max(0.05, open * 0.9))
      poolMat.setFloat("uFade", runeFade)

      // asas: abrem na carga, fecham na antecipação e viram fumaça antes do golpe
      const wingOpen = easeOut(seg(t, 0.14, 0.5)) * (1 - 0.45 * easeInOut(seg(t, 0.6, 0.74)))
      const wingCut = seg(t, 0.62, 0.76)
      wings.setEnabled(wingCut < 1)
      wings.position.set(s.x - Math.sin(s.facing) * 0.28, s.height * 0.76, s.z - Math.cos(s.facing) * 0.28)
      wings.rotation.y = s.facing
      wings.scaling.setAll(s.height * 1.42)
      wingMat.setFloat("uOpen", wingOpen)
      wingMat.setFloat("uCut", wingCut)
      wingMat.setFloat("uFade", Math.min(1, t / 0.12) * (1 - seg(t, 0.68, 0.76)))

      // partículas da carga
      embers.emitter = emitAt.set(s.x, 0.1, s.z).clone()
      embers.emitRate = t < 0.8 ? 120 * k : t < 1.3 ? 40 * k : 0
      inflow.emitter = s.bladeAt
      inflow.emitRate = t > 0.14 && t < 0.72 ? 200 * k : 0

      // lua: sai da lâmina, cruza o meio do cone no passo do dano, segue voando e queima
      const moonOn = t >= MOON_FROM && t < MOON_END
      blade.setEnabled(moonOn)
      ghost.setEnabled(moonOn)
      wake.setEnabled(moonOn)
      burst.emitRate = 0
      if (moonOn) {
        const out = easeOut(seg(t, MOON_FROM, FIRE_AT))
        const fly = seg(t, FIRE_AT, MOON_END)
        const r = out < 1 ? MOON_R[0] + (MOON_R[1] - MOON_R[0]) * out : MOON_R[1] + (MOON_R[2] - MOON_R[1]) * fly
        const z = out < 1 ? MOON_Z[0] + (MOON_Z[1] - MOON_Z[0]) * out : MOON_Z[1] + (MOON_Z[2] - MOON_Z[1]) * fly
        // o nó é o centro do círculo da lua: fica ao lado e abaixo, para o BOJO passar no eixo do golpe
        const side = r * Math.sin(MOON_ROLL)
        const top = 1.3 + s.height * 0.22
        const fx = Math.sin(s.facing)
        const fz = Math.cos(s.facing)
        moon.position.set(s.x + fx * z + fz * side, top - r * Math.cos(MOON_ROLL), s.z + fz * z - fx * side)
        moon.rotation.set(0, s.facing, MOON_ROLL)
        blade.scaling.setAll(r)
        ghost.scaling.setAll(r * 0.97)
        ghost.position.y = 0
        ghost.position.z = -Math.min(1.1, 0.5 + z * 0.12)
        wake.scaling.set(r, Math.max(0.5, z - 0.4), r)
        const cut = easeInOut(seg(t, 0.98, MOON_END)) * 1.05
        bladeMat.setFloat("uCut", cut)
        ghostMat.setFloat("uCut", Math.min(1.1, cut + 0.3))
        ghostMat.setFloat("uFade", 0.5)
        wakeMat.setFloat("uFade", 1 - seg(t, 0.98, MOON_END))
        belly.set(s.x + fx * z, top, s.z + fz * z)
        burst.emitter = belly.clone()
        burst.emitRate = 160 * k
      }

      // luz: cresce na lâmina, acompanha a lua, estoura no dano e apaga
      if (light) {
        const charge = 0.55 + 0.8 * seg(t, 0.14, 0.72)
        const peak = 2.4 * (1 - seg(t, FIRE_AT, 1.2))
        light.position.copyFrom(t >= MOON_FROM ? belly : s.bladeAt)
        light.intensity = (t < FIRE_AT ? charge : 0.3 + peak) * (1 - seg(t, 1.25, 1.6)) * gain
      }

      // no chão, a partir do impacto
      if (s.impacted) {
        if (!flashed) {
          flashed = true
          const at = s.hits[0] ?? new Vector3(s.x + Math.sin(s.facing) * 2.6, s.height * 0.6, s.z + Math.cos(s.facing) * 2.6)
          flash.position.copyFrom(at)
          flash.setEnabled(true)
          burst.emitter = at.clone()
          burst.manualEmitCount = Math.round(170 * k)
          mist.emitter = new Vector3(s.x + Math.sin(s.facing) * 2.8, 0.9, s.z + Math.cos(s.facing) * 2.8)
          mist.manualEmitCount = Math.round(30 * k)
        }
        const f = seg(t, FIRE_AT, FIRE_AT + 0.13)
        flash.setEnabled(f < 1)
        flash.scaling.setAll(1.6 + 3 * easeOut(f))
        flash.rotation.z = clock * 1.4
        flashMat.setFloat("uFade", 1 - f * f)
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
      stepRocks(s)
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
      for (const p of systems) p.dispose()
      light?.dispose()
      for (const m of meshes) m.dispose()
      moon.dispose()
      for (const m of [...mats, thornMat, dropMat, rockMat]) m.dispose()
      for (const t of [noise, runeTex, crackTex, smokeTex, dot]) t.dispose()
    },
  }
}

export interface BloodCut {
  /** Roteiro novo a cada uso (a posição e a direção são as da hora do golpe). */
  script: () => AbilityScript
  /** Um inimigo foi pego pelo poder (evento da regra, antes do impacto). */
  hit: (at: Vector3) => void
  warm: () => void
  /** O corpo (e a arma) que fica aceso no apagão: a luz própria só pega neles. */
  bind: (meshes: AbstractMesh[]) => void
  dispose: () => void
}

export function bloodCut(rig: BloodRig): BloodCut {
  const build: FxBuilder<Live> = (ctx) => buildEffect(ctx, rig)
  let live: Live | null = null
  let rim: PointLight | null = null
  return {
    warm: () => rig.stage.warm("blood-cut", build),
    hit: (at) => live?.hits.push(at.clone()),
    bind(meshes) {
      if (rim || !meshes.length) return
      rim = new PointLight("bc-rim", new Vector3(0, 1, 0), meshes[0].getScene())
      rim.diffuse = new Color3(0.92, 0.74, 1)
      rim.specular = new Color3(1, 0.8, 1)
      rim.range = 9
      rim.intensity = 0
      rim.includedOnlyMeshes = meshes
    },
    dispose() {
      rim?.dispose()
      rim = null
    },
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
              rig.flash()
              rig.audio.boom()
              rig.audio.thorns()
              rig.vfx.dust(new Vector3(s.x + Math.sin(s.facing) * 2.4, 0.1, s.z + Math.cos(s.facing) * 2.4), 18)
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
          // apagão na carga; o mundo volta escuro para o golpe e clareia depois do impacto
          const black = easeOut(seg(t, 0.03, 0.13)) * (1 - easeInOut(seg(t, 0.66, 0.74)))
          const after = seg(t, 0.66, 0.74) * (1 - easeInOut(seg(t, 1.0, 1.45)))
          rig.dim((1 - 0.97 * black) * (1 - 0.42 * after))
          if (rim) {
            rim.position.set(me.x + Math.sin(me.facing) * 1.5, me.height * 0.85, me.z + Math.cos(me.facing) * 1.5)
            rim.intensity = 2.4 * black
          }
        },
        finish() {
          s.free = true
          rig.dim(1)
          if (rim) rim.intensity = 0
        },
      }
    },
  }
}
