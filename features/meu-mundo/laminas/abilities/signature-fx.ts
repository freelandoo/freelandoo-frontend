// features/meu-mundo/laminas/abilities/signature-fx.ts — o Poder Máximo de todo personagem (2026-11-07).
//
// A mecânica é a de sim/fight.ts, sem mudança: dano em POWER.fireAt, sem levar golpe; lâmina =
// cone à frente com cura, maga/arco/arma = área em volta. Este arquivo é só a apresentação.
//
//   preparação  APAGÃO: o mundo vai para o preto e só o corpo fica aceso; cut-in e desenho no chão
//   carga       a forma das costas abre (asas, caudas, sol...), faíscas fecham na arma
//   antecipação o mundo volta, a câmera sobe para o lado, a forma se desfaz, o tempo quase para
//   golpe       a peça do personagem (lua, raio, onda, chuva...) cresce até tomar a tela
//   impacto     no passo do dano: clarão, estrela, onda, rachaduras, o que sobe do chão, destroços
//   resto       tudo queima; quem cura vê o sangue voltar de quem foi atingido
//
// O tempo, a câmera e a composição são os aprovados no vampiro. Cada personagem só escolhe as
// peças (abilities/signatures.ts); peça nova = uma entrada em BACKS/STRIKES/RISES.
//
// COMO É DESENHADO. Nenhuma peça tem contorno: a forma sai de ruído erodido (abilities/fx, por
// pipeline/laminas/abilities/build_blood_textures.py) passando por uma rampa de cor. O brilho é
// pré-multiplicado: a mesma peça cobre o fundo com a cor escura e soma luz por cima. A arena é
// clara, e luz só somada estoura em branco.

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
import { LoadAssetContainerAsync } from "@babylonjs/core/Loading/sceneLoader"
import { ensureLoaders } from "../../engine/avatars"
import { ShaderMaterial } from "@babylonjs/core/Materials/shaderMaterial"
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial"
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
import type { AbilityScript, CamKey, Subject } from "./director"
import type { BackForm, RiseForm, Signature, StrikeForm, Summon } from "./signatures"

/** Ajustes do laboratório (harness); os valores daqui são os que valem no jogo. */
export const FX_TUNE = { density: 1, gain: 1 }

const ART = "/meu-mundo/laminas/abilities/fx"
const FIRE_AT = POWER.fireAt
/** Até quando as sobras ficam na tela, depois que a pessoa já voltou a jogar (s). */
const FX_END = POWER.dur + 0.35
const MOON_FROM = 0.73
const MOON_END = 1.22
const MOON_SPAN = 1.18
const WING_FINGERS = 5

const clamp01 = (v: number) => Math.max(0, Math.min(1, v))
const seg = (t: number, a: number, b: number) => clamp01((t - a) / (b - a))
const easeOut = (u: number) => 1 - (1 - u) * (1 - u) * (1 - u)
const easeInOut = (u: number) => u * u * (3 - 2 * u)
const hash = (i: number, s: number) => {
  const v = Math.sin(i * 127.1 + s * 311.7) * 43758.5453
  return v - Math.floor(v)
}

const VERTEX = /* glsl */ `
precision highp float;
attribute vec3 position;
attribute vec3 normal;
attribute vec2 uv;
uniform mat4 world;
uniform mat4 viewProjection;
uniform float uOpen;
uniform float uTime;
uniform float uT;
uniform float uCount;
uniform float uCurl;
varying vec2 vUV;
varying float vSeed;
varying vec3 vN;
varying vec3 vP;
void main() {
  vec3 p = position;
  vec2 tuv = uv;
  vSeed = 0.0;
#ifdef THORN
  // normal = (base x, base z, hora de subir): a peça nasce de um ponto no chão e estica
  float g = clamp((uT - normal.z) / 0.1, 0.0, 1.0);
  float grow = 1.0 + 2.4 * pow(g - 1.0, 3.0) + 1.4 * pow(g - 1.0, 2.0);
  vec3 base = vec3(normal.x, 0.0, normal.y);
  p = base + (position - base) * (g > 0.0 ? grow : 0.0);
  vSeed = fract(normal.z * 37.0 + normal.x * 3.1);
#endif
#ifdef RAIN
  // normal = (x, z, hora de cair): vem do alto em linha reta até o chão e some
  float g = clamp((uT - normal.z) / 0.13, 0.0, 1.0);
  float gone = clamp((uT - normal.z - 0.13) / 0.14, 0.0, 1.0);
  p = vec3(position.x, position.y * 3.2 * (1.0 - gone) + (1.0 - g) * 15.0, position.z);
  vSeed = g > 0.0 ? 1.0 - gone : 0.0;
#endif
#ifdef WING
  // Abre aqui: cada dedo gira do ombro e a membrana acompanha, sem refazer a malha.
  float side = sign(position.x);
  float u = uv.x;
  float v = uv.y;
  float ang = mix(1.5, mix(1.28, -0.8, u), uOpen);
  float len = (1.0 - 0.34 * u) * (0.3 + 0.7 * uOpen);
  float r = v * len;
  float flap = 0.08 * sin(uTime * 7.0 + v * 3.0 + u * 2.0) * v;
  p = vec3(side * cos(ang) * r, sin(ang) * r, -0.42 * v * v * (1.0 - 0.5 * u) + flap);
#endif
#ifdef TAILS
  // Fitas que saem do quadril em leque: uCurl 1 = caudas que ondulam, 0 = garras retas.
  float side = sign(position.x);
  float cell = uv.x * uCount;
  float id = min(floor(cell), uCount - 1.0);
  float w = fract(cell) - 0.5;
  float v = uv.y;
  float a = mix(0.1, 1.45, (id + 0.5) / uCount) * uOpen;
  float wig = uCurl * 0.34 * sin(uTime * 5.0 + v * 4.0 + id * 1.7) * v;
  vec2 dir = vec2(sin(a + wig), cos(a + wig));
  vec2 nor = vec2(dir.y, -dir.x);
  float width = (0.2 + 0.05 * uCurl) * pow(sin(3.14159 * pow(v, 0.62 + 0.3 * (1.0 - uCurl))), 0.8);
  float len = (0.95 + 0.14 * sin(id * 2.4)) * (0.25 + 0.75 * uOpen);
  vec2 q = dir * v * len + nor * w * width;
  q.x += uCurl * 0.2 * v * v;
  p = vec3(side * (0.07 + q.x), -0.28 + q.y, -0.2 - 0.4 * v * v);
  tuv = vec2(w + 0.5, v);
  vSeed = id / uCount;
#endif
#ifdef POLAR
  // Disco: a grade vira círculo; as duas metades da malha fecham a volta.
  float half_ = position.x > 0.0 ? 0.0 : 0.5;
  float ang = (uv.x * 0.5 + half_) * 6.28318;
  float r = uv.y * (0.35 + 0.65 * uOpen);
  p = vec3(cos(ang) * r, sin(ang) * r, 0.0);
  tuv = vec2(uv.x * 0.5 + half_, uv.y);
#endif
#ifdef HORNS
  // Dois chifres enormes subindo das costas, com a ponta voltando para dentro.
  float side = sign(position.x);
  float u = uv.x - 0.5;
  float v = uv.y;
  float width = 0.2 * pow(1.0 - v, 0.8) + 0.004;
  float cx = 0.2 + 0.86 * sin(v * 1.9) * (0.25 + 0.75 * uOpen);
  float cy = -0.02 + (1.3 * v - 0.14 * v * v) * (0.25 + 0.75 * uOpen);
  p = vec3(side * (cx + u * width * 2.0), cy + u * width * 0.6, -0.22 - 0.3 * v);
#endif
#ifdef CREST
  // Lençol que se ergue e dobra no alto: a crista de uma onda.
  float side = sign(position.x);
  float u = uv.x;
  float v = uv.y;
  float h = (0.2 + 0.8 * uOpen) * (1.0 + 0.1 * sin(u * 7.0 + uTime * 2.2));
  float curl = v * v * v;
  p = vec3(side * u * 1.25, (v * 1.4 - curl * 0.26) * h * (1.0 - 0.42 * u * u), -0.42 + curl * 1.05 * h + 0.05 * sin(v * 9.0 + uTime * 4.0));
#endif
  vUV = tuv;
  vec4 wp = world * vec4(p, 1.0);
  vP = wp.xyz;
  vN = mat3(world) * normal;
  gl_Position = viewProjection * wp;
}`

const FRAGMENT = /* glsl */ `
#extension GL_OES_standard_derivatives : enable
precision highp float;
uniform vec3 uDeep;
uniform vec3 uBlood;
uniform vec3 uHot;
uniform vec3 uEdge;
uniform vec3 uTop;
uniform float uPrism;
uniform float uTime;
uniform float uFade;
uniform float uCut;
uniform float uR;
uniform float uGain;
uniform float uBoost;
uniform float uSeed;
uniform float uStyle;
uniform vec3 uEye;
uniform sampler2D uNoise;
uniform sampler2D uTex;
varying vec2 vUV;
varying float vSeed;
varying vec3 vN;
varying vec3 vP;
// A rampa: escuro → corpo → quente → topo. Toda peça passa por aqui.
vec3 ramp(float x) {
  vec3 c = mix(uDeep, uBlood, smoothstep(0.0, 0.38, x));
  c = mix(c, uHot, smoothstep(0.34, 0.72, x));
  return mix(c, uTop, smoothstep(0.74, 1.0, x));
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
#ifdef HOLO
  // Aparição: só a forma, sem grade. Face de frente quase some, a volta acende na mesma cor.
  vec3 N = normalize(vN);
  vec3 V = normalize(uEye - vP);
  float f = 1.0 - abs(dot(N, V));
  float facet = 0.5 + 0.5 * dot(N, normalize(vec3(0.35, 0.85, 0.4)));
  float cloud = texture2D(uNoise, vP.xz * 0.05 + vP.y * 0.04 + uTime * 0.03).r;
  float flow = texture2D(uNoise, vec2(vP.x * 0.04 + vP.z * 0.04, vP.y * 0.05 - uTime * 0.16)).g;
  if (cloud + flow * 0.3 < uCut * 1.4) discard;
  float burn = smoothstep(uCut * 1.4 + 0.1, uCut * 1.4, cloud + flow * 0.3) * step(0.001, uCut);
  float rim = pow(f, 2.4);
  // linhas: vinco do modelo (a normal muda rápido) acende; não é grade, é o desenho da forma.
  // Só dobra de verdade: abaixo de 0,16 por pixel é a aresta de um triângulo, e acender isso
  // deixava o gigante facetado ("quadrado") — polimento de 11/11
  float crease = smoothstep(0.16, 0.5, length(fwidth(N)));
  // brilho branco onde a luz bate, e uma faixa de luz subindo pelo corpo
  float spec = pow(max(dot(reflect(-V, N), normalize(vec3(0.3, 0.9, 0.35))), 0.0), 22.0);
  float sweep = smoothstep(0.07, 0.0, abs(fract(vP.y * 0.07 - uTime * 0.4) - 0.5));
  float v = 0.34 + 0.32 * facet * facet + rim * 0.5 + flow * 0.12 + crease * 0.3;
  vec3 c = ramp(min(v, 0.82));
  float a = 0.3 + 0.3 * facet * facet + 0.45 * rim + crease * 0.5 + burn * 0.4;
  vec3 white = vec3(1.0) * (spec * 0.85 + crease * 0.55 + pow(rim, 4.0) * 0.7 + sweep * 0.3);
  outc = vec4((c * (a * 1.35 + rim * 0.8 + burn * 0.8) + white * (0.4 + 0.6 * a)) * uGain, min(1.0, a)) * uFade;
#endif
#ifdef THORN
  float u = vUV.x;
  float y = vUV.y;
  float fiber = texture2D(uNoise, vec2(u * 0.7 + vSeed, y * 0.8 - uTime * 1.3)).g;
  float cloud = texture2D(uNoise, vec2(u * 0.9 + vSeed * 3.0, y * 0.7 - uTime * 0.5)).r;
  if (uStyle < 0.5) {
    // lâmina: a mesma receita da lua, fio aceso numa beira, bem translúcida
    float blade = exp(-u * 9.0) * 1.15;
    float inner = pow(1.0 - u, 1.7) * (0.3 + 0.7 * smoothstep(0.26, 0.8, fiber * 0.72 + cloud * 0.5));
    float v = (blade + inner * 0.85) * (1.0 - 0.25 * y) * smoothstep(0.0, 0.05, y);
    v -= uCut * (0.45 + 1.0 * (1.0 - cloud));
    float body = smoothstep(0.05, 0.34, v);
    float light = smoothstep(0.22, 0.95, v);
    outc = vec4(ramp(min(v, 1.0)) * (body * 0.55 + light * 1.05) * uGain, body * 0.36) * uFade;
  } else if (uStyle < 1.5) {
    // fogo: língua que afina para cima e tremula
    float flick = texture2D(uNoise, vec2(u * 0.6 + vSeed, y * 0.5 - uTime * 2.2)).r;
    float tongue = (1.0 - abs(u - 0.5) * 2.0) * (1.05 - y) + (flick - 0.5) * 0.7;
    float v = smoothstep(0.02, 0.8, tongue) - uCut * (1.2 - flick);
    float body = smoothstep(0.03, 0.26, v);
    outc = vec4(ramp(min(v * 1.05, 1.0)) * (body * 0.55 + smoothstep(0.42, 0.95, v) * 0.5) * uGain, body * 0.5) * uFade;
  } else if (uStyle < 2.5) {
    // rocha: corpo escuro quase opaco, rachadura acesa por dentro
    float vein = texture2D(uNoise, vec2(u * 0.45 + vSeed, y * 0.35)).b;
    float keep = 1.0 - uCut * (1.5 - cloud);
    float body = smoothstep(0.0, 0.16, keep);
    float edge = exp(-min(u, 1.0 - u) * 11.0);
    vec3 rock = mix(uDeep, uBlood, 0.35 + 0.4 * cloud);
    vec3 lit = ramp(0.55 + vein * 0.5);
    float glow = smoothstep(0.1, 0.65, vein) + edge * 0.35 + (1.0 - y) * 0.2;
    outc = vec4((rock * 0.9 + lit * glow) * body * uGain, body * 0.9) * uFade;
  } else if (uStyle < 3.5) {
    // água: coluna que sobe e quebra em espuma no alto
    float foam = smoothstep(0.62, 1.0, y + (cloud - 0.5) * 0.5);
    float band = 0.45 + 0.55 * fiber;
    float side = 1.0 - pow(abs(u - 0.5) * 2.0, 2.0);
    float v = side * band - uCut * (1.2 - cloud);
    float body = smoothstep(0.03, 0.34, v);
    vec3 c = mix(ramp(0.32 + band * 0.42), uTop, foam);
    outc = vec4(c * (body * 0.7 + foam * body * 0.6) * uGain, body * 0.42) * uFade;
  } else {
    // cristal: faceta dura com borda de luz
    float facet = step(0.5, u);
    float keep = 1.0 - uCut * (1.5 - cloud);
    float body = smoothstep(0.0, 0.2, keep);
    float edge = exp(-abs(u - 0.5) * 22.0) + exp(-min(u, 1.0 - u) * 14.0);
    float v = 0.34 + 0.22 * facet + 0.3 * (1.0 - y) + edge * 0.5;
    outc = vec4(ramp(min(v, 1.0)) * (0.55 + edge * 0.8) * body * uGain, body * (0.3 + 0.2 * facet)) * uFade;
  }
#endif
#ifdef RAIN
  // Risco de luz com a cabeça embaixo.
  float x = abs(vUV.x - 0.5) * 2.0;
  float head = pow(1.0 - vUV.y, 2.6);
  float v = (1.0 - x * x) * (0.22 + head) * step(0.001, vSeed) * vSeed;
  outc = vec4(ramp(min(v * 1.3, 1.0)) * v * 2.0 * uGain, v * 0.6) * uFade;
#endif
#ifdef BEAM
  // Feixe: miolo branco, corpo correndo para a frente, abre até uR.
  float x = abs(vUV.x - 0.5) * 2.0;
  float y = vUV.y;
  float fiber = texture2D(uNoise, vec2(vUV.x * 0.8, y * 1.6 - uTime * 3.4)).g;
  float wob = (fiber - 0.5) * 0.34;
  float core = smoothstep(0.34 + wob, 0.0, x);
  float show = smoothstep(uR, uR - 0.05, y);
  float end = smoothstep(1.0, 0.82, y);
  float v = (core * 1.15 + (1.0 - x) * fiber * 0.4) * show * end - uCut * 1.2;
  float body = smoothstep(0.05, 0.34, v);
  outc = vec4(ramp(min(v, 1.0)) * (body * 0.7 + smoothstep(0.25, 0.95, v) * 1.1) * uGain, body * 0.62) * uFade;
#endif
#ifdef BLAST
  // Parede de fogo que abre em volta: sobe alta e rasgada.
  float y = vUV.y;
  float flick = texture2D(uNoise, vec2(vUV.x * 4.0, y * 0.6 - uTime * 1.8)).r;
  float fiber = texture2D(uNoise, vec2(vUV.x * 7.0, y * 0.4 - uTime * 2.6)).g;
  float v = (1.0 - y) * (0.24 + flick * 0.9) + (fiber - 0.5) * 0.62 - uCut * (1.2 - flick);
  float body = smoothstep(0.22, 0.46, v);
  outc = vec4(ramp(min(v * 0.92, 1.0)) * (body * 0.6 + smoothstep(0.5, 1.05, v) * 0.5) * uGain, body * 0.62) * uFade;
#endif
#ifdef CURTAIN
  float y = vUV.y;
  float fiber = texture2D(uNoise, vec2(vUV.x * 3.0, y * 0.3 - uTime * 0.9)).g;
  float v = pow(1.0 - y, 2.4) * smoothstep(0.34, 0.86, fiber);
  outc = vec4(ramp(0.45 + v * 0.5) * v * 1.2 * uGain, v * 0.22) * uFade;
#endif
#ifdef STAR
  // Estrela de recorte duro, em faixas chapadas: nada de degradê.
  vec2 p = vUV - 0.5;
  float r = length(p) * 2.0;
  float ang = atan(p.y, p.x) / 6.2832 + 0.5;
  float tri = abs(fract(ang * 9.0 + uSeed * 7.0) - 0.5) * 2.0;
  float wob = texture2D(uNoise, vec2(ang * 2.0 + uSeed, 0.37 + uSeed)).g;
  float len = (0.26 + 0.74 * tri * tri * (0.45 + wob)) * uR;
  float outer = smoothstep(len, len - 0.012, r);
  float mid = smoothstep(len * 0.66, len * 0.66 - 0.012, r);
  float core = smoothstep(len * 0.36, len * 0.36 - 0.012, r);
  vec3 c = mix(mix(uEdge, uHot, mid), uTop, core);
  outc = vec4(c * uGain, 1.0) * outer;
#endif
#ifdef WAKE
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
  // uStyle 1 = penas: lâminas em fileiras, não membrana
  float feather = uStyle * smoothstep(0.42, 0.06, abs(fract(u * 15.0) - 0.5)) * (0.5 + 0.5 * smoothstep(0.0, 0.25, fract(v * 3.0)));
  float end = smoothstep(1.0, 0.6, v + (cloud - 0.5) * 0.6) * smoothstep(0.0, 0.1, v);
  float memb = end * (0.5 + 0.5 * fiber) * (1.0 - uStyle * 0.5 + feather) - uCut * (1.3 - cloud);
  float body = smoothstep(0.03, 0.5, memb);
  float val = 0.16 + cloud * 0.22 + veins * 0.35 + rib * 0.62 + feather * 0.3;
  float light = (veins * 0.3 + rib * 0.85 + feather * 0.4 + smoothstep(0.55, 0.9, cloud) * 0.16) * body;
  vec3 c = mix(ramp(val), uEdge, smoothstep(0.5, 0.95, v) * 0.6);
  outc = vec4(c * (body * 0.55 + light) * uGain, body * 0.78) * uFade;
#endif
#ifdef TAILS
  // Fita de energia: miolo aceso, beira que vira fumaça.
  float x = abs(vUV.x - 0.5) * 2.0;
  float y = vUV.y;
  float cloud = texture2D(uNoise, vec2(vUV.x * 0.6 + vSeed * 2.0, y * 0.8 - uTime * 0.9)).r;
  float fiber = texture2D(uNoise, vec2(vUV.x * 0.8 + vSeed, y * 1.1 - uTime * 1.5)).g;
  float v = (1.0 - x * x) * (0.5 + 0.6 * fiber) * (1.08 - y * 0.5) + (cloud - 0.5) * 0.3 - uCut * (1.4 - cloud);
  float body = smoothstep(0.08, 0.38, v);
  outc = vec4(mix(ramp(min(v, 1.0)), uEdge, y * y * 0.6) * (body * 0.62 + smoothstep(0.32, 0.95, v)) * uGain, body * 0.72) * uFade;
#endif
#ifdef POLAR
  float ang = vUV.x;
  float r = vUV.y;
  float cloud = texture2D(uNoise, vec2(ang * 3.0, r * 0.7 - uTime * 0.25)).r;
  float fiber = texture2D(uNoise, vec2(ang * 5.0, r * 0.5 - uTime * 0.7)).g;
  float spin = uTime * 0.35;
  float v = 0.0;
  float body = 0.0;
  if (uStyle < 0.5) {
    // sol: disco de ouro com raios de duas alturas
    float tri = abs(fract((ang + spin * 0.1) * 12.0) - 0.5) * 2.0;
    float tri2 = abs(fract((ang - spin * 0.06) * 24.0 + 0.25) - 0.5) * 2.0;
    float edge = 0.54 + 0.36 * pow(tri, 3.0) + 0.1 * pow(tri2, 5.0);
    float disc = smoothstep(edge, edge - 0.03, r);
    float rim = smoothstep(0.06, 0.0, abs(r - 0.5));
    float inner = smoothstep(0.1, 0.0, abs(r - 0.3));
    float beam = pow(tri, 4.0) * smoothstep(0.46, 0.56, r);
    v = disc * (0.2 + 0.26 * cloud + rim * 0.7 + inner * 0.34 + beam * 0.6);
    body = disc * (0.5 + 0.5 * smoothstep(0.14, 0.5, r));
  } else if (uStyle < 1.5) {
    // lua cheia com a sombra comendo um lado
    vec2 p = vec2(cos(ang * 6.28318), sin(ang * 6.28318)) * r;
    float disc = smoothstep(0.86, 0.82, r);
    float bite = smoothstep(0.72, 0.68, length(p - vec2(0.34, 0.14)));
    float crat = texture2D(uNoise, p * 0.5 + 0.5).r;
    v = disc * (1.0 - bite * 0.86) * (0.55 + 0.45 * crat);
    float halo = smoothstep(1.0, 0.84, r) * (1.0 - disc) * 0.5;
    body = disc * (1.0 - bite * 0.72) + halo;
    v += halo * 0.5;
  } else if (uStyle < 2.5) {
    // engrenagem: dentes, aro e raios
    float teeth = step(0.5, fract((ang + spin * 0.12) * 16.0));
    float edge = 0.86 + 0.1 * teeth;
    float rim = smoothstep(edge, edge - 0.015, r) * smoothstep(0.62, 0.65, r);
    float hub = smoothstep(0.24, 0.21, r) * smoothstep(0.1, 0.13, r);
    float spoke = smoothstep(0.1, 0.05, abs(fract((ang + spin * 0.12) * 6.0) - 0.5)) * step(r, 0.64);
    float m = max(max(rim, hub), spoke);
    v = m * (0.5 + 0.3 * fiber + 0.3 * smoothstep(0.82, 0.92, r));
    body = m;
  } else {
    // roda de trovão: aro aceso e raios que pulam de lugar
    float jump = floor(uTime * 11.0);
    float bolt = smoothstep(0.08, 0.0, abs(fract((ang + jump * 0.137) * 5.0 + (fiber - 0.5) * 0.5) - 0.5));
    float rim = smoothstep(0.075, 0.0, abs(r - 0.8 - (fiber - 0.5) * 0.06));
    float hub = smoothstep(0.2, 0.14, r);
    float m = max(max(rim, hub), bolt * step(r, 0.8));
    v = m * (0.72 + 0.4 * fiber);
    body = m;
  }
  v -= uCut * (1.3 - cloud);
  body *= smoothstep(0.0, 0.14, v);
  outc = vec4(ramp(min(v, 1.0)) * (body * 0.6 + smoothstep(0.34, 0.95, v) * body) * uGain, body * 0.74) * uFade;
#endif
#ifdef HORNS
  float x = abs(vUV.x - 0.5) * 2.0;
  float y = vUV.y;
  float ring = 0.5 + 0.5 * sin(y * 46.0);
  float cloud = texture2D(uNoise, vec2(vUV.x * 0.5, y * 0.9 - uTime * 0.5)).r;
  float v = (0.26 + ring * 0.2 * (1.0 - y) + exp(-(1.0 - x) * 7.0) * 0.6 + y * y * 0.5) - uCut * (1.3 - cloud);
  float body = smoothstep(0.02, 0.2, v) * smoothstep(1.0, 0.86, x);
  outc = vec4(ramp(min(v, 1.0)) * (body * 0.7 + smoothstep(0.4, 1.0, v) * body) * uGain, body * 0.86) * uFade;
#endif
#ifdef CREST
  float u = vUV.x;
  float y = vUV.y;
  float fiber = texture2D(uNoise, vec2(u * 1.3, y * 0.7 - uTime * 0.8)).g;
  float cloud = texture2D(uNoise, vec2(u * 0.9 + 0.2, y * 0.6 - uTime * 0.4)).r;
  float foam = smoothstep(0.7, 1.0, y + (cloud - 0.5) * 0.4);
  float band = 0.3 + 0.5 * fiber;
  float v = (1.0 - u * u * u) - uCut * (1.5 - cloud);
  float body = smoothstep(0.02, 0.26, v);
  vec3 c = mix(ramp(band), uTop, foam);
  outc = vec4(c * (body * 0.68 + foam * body * 0.7 + smoothstep(0.62, 0.9, fiber) * body * 0.35) * uGain, body * 0.74) * uFade;
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
  vec3 c = ramp(0.4 + line * 0.55 + front * 0.3 + uBoost * 0.3);
  outc = vec4(c * (line * (1.25 + uBoost) + glow * (0.75 + 2.4 * uBoost)) * show * uGain, (line * 0.85 + glow * 0.3) * show) * uFade;
#endif
#ifdef POOL
  float r = length(vUV - 0.5) * 2.0;
  float n = texture2D(uNoise, vUV * 0.9 + uTime * 0.02).r;
  float a = smoothstep(uR, uR * 0.25, r + (n - 0.5) * 0.3);
  outc = vec4(uBlood * a * 0.16 * uGain, a * 0.62) * uFade;
#endif
#ifdef FLASH
  vec2 p = vUV - 0.5;
  float r = length(p) * 2.0;
  float ang = atan(p.y, p.x) / 6.2832 + 0.5;
  float s = texture2D(uNoise, vec2(ang * 3.0, 0.37)).g;
  float spike = 0.16 + 0.84 * pow(s, 3.2);
  float rays = smoothstep(spike, 0.0, r);
  float v = rays * 0.9 + exp(-r * 8.0);
  outc = vec4(mix(ramp(min(v, 1.0)), uEdge, smoothstep(0.1, 0.8, r) * 0.5) * v * 1.5 * uGain, smoothstep(0.1, 0.7, v) * 0.45) * uFade;
#endif
  // Íris: as cores correm pela peça, mantendo a luz dela
  vec3 rainbow = 0.55 + 0.45 * cos(6.28318 * (vUV.x * 1.6 + vUV.y * 0.7 + uTime * 0.35 + vec3(0.0, 0.33, 0.67)));
  outc.rgb = mix(outc.rgb, rainbow * dot(outc.rgb, vec3(0.5)), uPrism);
  gl_FragColor = outc;
}`

export type ShaderKind = "HOLO" | "MOON" | "WAKE" | "WING" | "TAILS" | "POLAR" | "HORNS" | "CREST" | "RING" | "DECAL" | "POOL" | "FLASH" | "THORN" | "CURTAIN" | "STAR" | "RAIN" | "BEAM" | "BLAST"

export function shaderOf(scene: Scene, name: string, kind: ShaderKind, noise: Texture, sig: Signature) {
  Effect.ShadersStore.mmSigVertexShader = VERTEX
  Effect.ShadersStore.mmSigFragmentShader = FRAGMENT
  const m = new ShaderMaterial(
    name,
    scene,
    { vertex: "mmSig", fragment: "mmSig" },
    {
      attributes: ["position", "normal", "uv"],
      uniforms: ["world", "viewProjection", "uDeep", "uBlood", "uHot", "uEdge", "uTop", "uPrism", "uTime", "uFade", "uCut", "uR", "uGain", "uOpen", "uT", "uBoost", "uSeed", "uStyle", "uCount", "uCurl", "uEye"],
      samplers: ["uNoise", "uTex"],
      defines: [`#define ${kind}`],
      needAlphaBlending: true,
    },
  )
  m.backFaceCulling = false
  m.alphaMode = Constants.ALPHA_PREMULTIPLIED
  m.disableDepthWrite = true
  const [deep, mid, hot, edge, top] = sig.pal.map((c) => Color3.FromHexString(c).toLinearSpace())
  m.setColor3("uDeep", deep)
  m.setColor3("uBlood", mid)
  m.setColor3("uHot", hot)
  m.setColor3("uEdge", edge)
  m.setColor3("uTop", top)
  m.setFloat("uPrism", sig.prism ? 0.85 : 0)
  m.setTexture("uNoise", noise)
  m.setTexture("uTex", noise)
  for (const [k, v] of [["uFade", 1], ["uCut", 0], ["uR", 1], ["uGain", 1], ["uOpen", 0], ["uTime", 0], ["uT", 0], ["uBoost", 0], ["uSeed", 0], ["uStyle", 0], ["uCount", 5], ["uCurl", 1]] as const) m.setFloat(k, v)
  return m
}

/** A lua: fita em arco. y = 0 é o fio de corte, y > 0 entra na lua, y < 0 é o halo por fora. */
export function moonMesh(scene: Scene, name: string) {
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
  return meshOf(scene, name, pos, uv, nor, idx)
}

function meshOf(scene: Scene, name: string, positions: number[], uvs: number[], normals: number[], indices: number[]) {
  const m = new Mesh(name, scene)
  Object.assign(new VertexData(), { positions, indices, uvs, normals }).applyToMesh(m)
  return m
}

interface RiseSpec {
  a: number
  d: number
  h: number
  w: number
  bend: number
  lean: number
  at: number
}

/**
 * Tudo o que sobe do chão numa malha só, em volta de quem joga (+z = frente do golpe). Cada peça
 * são fitas em cruz, para ter corpo de qualquer lado. normal guarda a base e a hora de subir.
 * `taper` 0 = coluna reta; `strips` 3 fecha mais o corpo das colunas.
 */
function riseMesh(scene: Scene, specs: RiseSpec[], taper: number, strips: number) {
  const R = 7
  const pos: number[] = []
  const uv: number[] = []
  const nor: number[] = []
  const idx: number[] = []
  for (const o of specs) {
    const rx = Math.sin(o.a)
    const rz = Math.cos(o.a)
    const bx = rx * o.d
    const bz = rz * o.d
    for (let k = 0; k < strips; k++) {
      const turn = (k / strips) * Math.PI
      const ax = rz * Math.cos(turn) + rx * Math.sin(turn)
      const az = -rx * Math.cos(turn) + rz * Math.sin(turn)
      const first = pos.length / 3
      for (let j = 0; j <= R; j++) {
        const y = j / R
        const w = o.w * Math.pow(1 - y, taper) + 0.002
        const cx = bx + (ax * o.bend + rx * o.lean) * y * y
        const cz = bz + (az * o.bend + rz * o.lean) * y * y
        const off = taper > 0.3 ? 0.2 : 0.5
        for (const u of [0, 1]) {
          pos.push(cx + ax * (u - off) * w, o.h * y, cz + az * (u - off) * w)
          uv.push(u, y)
          nor.push(bx, bz, o.at)
        }
        if (j < R) {
          const a = first + j * 2
          idx.push(a, a + 1, a + 2, a + 2, a + 1, a + 3)
        }
      }
    }
  }
  const m = meshOf(scene, "sg-rise", pos, uv, nor, idx)
  // a forma real depende do shader: a caixa da malha não vale
  m.alwaysSelectAsActiveMesh = true
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
  return meshOf(scene, "sg-wake", pos, uv, nor, idx)
}

/** Grade das duas metades (asas, caudas, discos). A forma real sai do shader. */
function gridMesh(scene: Scene, name: string, U = WING_FINGERS * 8, V = 12) {
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
  const m = meshOf(scene, name, pos, uv, nor, idx)
  m.alwaysSelectAsActiveMesh = true
  return m
}

/** Fitas retas em cruz, do centro para fora, em `n` direções (feixes). */
function spokesMesh(scene: Scene, n: number, width: number) {
  const pos: number[] = []
  const uv: number[] = []
  const nor: number[] = []
  const idx: number[] = []
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2
    const dx = Math.sin(a)
    const dz = Math.cos(a)
    for (const [wx, wy, wz] of [[dz, 0, -dx], [0, 1, 0]]) {
      const first = pos.length / 3
      for (const v of [0, 1]) {
        for (const u of [0, 1]) {
          const s = (u - 0.5) * width
          pos.push(dx * (0.04 + 0.96 * v) + wx * s, wy * s, dz * (0.04 + 0.96 * v) + wz * s)
          uv.push(u, v)
          nor.push(0, 1, 0)
        }
      }
      idx.push(first, first + 1, first + 2, first + 2, first + 1, first + 3)
    }
  }
  const m = meshOf(scene, "sg-spokes", pos, uv, nor, idx)
  m.alwaysSelectAsActiveMesh = true
  return m
}

/** Riscos que caem do céu em volta de quem joga. normal = (x, z, hora de cair). */
function rainMesh(scene: Scene, count: number, radius: number) {
  const pos: number[] = []
  const uv: number[] = []
  const nor: number[] = []
  const idx: number[] = []
  for (let i = 0; i < count; i++) {
    const a = hash(i, 31) * Math.PI * 2
    const d = Math.sqrt(hash(i, 32)) * radius
    const x = Math.sin(a) * d
    const z = Math.cos(a) * d
    const at = 0.7 + hash(i, 33) * 0.2
    const w = 0.09 + hash(i, 34) * 0.1
    for (const [wx, wz] of [[1, 0], [0, 1]]) {
      const first = pos.length / 3
      for (const v of [0, 1])
        for (const u of [0, 1]) {
          pos.push(x + wx * (u - 0.5) * w, v, z + wz * (u - 0.5) * w)
          uv.push(u, v)
          nor.push(x, z, at)
        }
      idx.push(first, first + 1, first + 2, first + 2, first + 1, first + 3)
    }
  }
  const m = meshOf(scene, "sg-rain", pos, uv, nor, idx)
  m.alwaysSelectAsActiveMesh = true
  return m
}

export interface SignatureRig {
  stage: FxStage
  vfx: Vfx
  audio: BoxeAudio
  sig: Signature
  /** Regra de área (maga, arco, arma): o golpe é em volta de quem joga, não à frente. */
  area: boolean
  /** O gesto de carga põe o punho na frente do rosto (boxe): o close gira para o lado. */
  guard?: boolean
  subject: () => Subject
  /** Ponta da arma agora (null se não houver). */
  blade: () => Vector3 | null
  /** O gesto de carga, e o golpe com o contato caindo em cima de fireAt. */
  pre: () => void
  strike: () => void
  /** Quando o clipe do golpe começa (tempo da regra). */
  strikeAt: number
  cutIn: () => void
  shake: (n: number) => void
  hitStop: (s: number) => void
  /** Luz do mundo (1 = normal). */
  dim: (k: number) => void
  /** Ritmo da apresentação: as partículas andam nele. */
  pace: () => number
  /** Clarão de tela cheia no impacto. */
  flash: () => void
  /** Peças de tela do Poder Máximo de cinema (apresentação 09); sem = o poder de antes. */
  cine?: CineRig
}

/** O que a sequência de cinema pede à tela (laminas-game desenha; ver abilities/cinema-fx.ts). */
export interface CineRig {
  /** Golpe do tamanho da tela; `i` = o lado (0, 1, 2). */
  arc: (i: number) => void
  /** Quadros de cor chapada, um por cor. */
  flat: (colors: string[], alpha: number) => void
  /** Cruz de luz no alvo: a pausa de aviso. */
  cross: () => void
  /** Cores deslocadas + borrão radial (≤ 0,4 s), ou a imitação no `low`. */
  climax: () => void
  /** Pilar de luz no alvo. */
  pillar: () => void
}

/**
 * O close de abertura do Poder Máximo de cinema, pela forma que abre nas costas (apresentação 10).
 * Cada linha é [yaw, dist, alto, olhar, lente] no início e no fim do close (0 → 0,26 da regra);
 * dist, alto e olhar são relativos ao corpo (director.ts). O motivo de cada uma:
 *  - asas, penas, garras: abrem atrás dos ombros → quase de frente (20°), do peito à cabeça (piloto 09);
 *  - chifres: sobem acima da cabeça → mesma lente, câmera e olhar um pouco mais altos;
 *  - sol, lua, engrenagem, roda: disco atrás da cabeça → de frente (8°), o disco vira auréola;
 *  - caudas: leque a partir do quadril → mais longe e mais baixo, cintura à cabeça, 3/4 para o leque
 *    sair dos dois lados;
 *  - crista: onda no chão atrás → de baixo para cima, a onda subindo atrás do corpo.
 */
type CloseKey = [yaw: number, dist: number, high: number, look: number, fov: number]
const CLOSE_BY_BACK: Record<BackForm, [from: CloseKey, to: CloseKey]> = {
  wings: [[160, 1.55, 0.74, 0.9, 0.5], [146, 1.3, 0.76, 0.92, 0.46]],
  feathers: [[160, 1.55, 0.74, 0.9, 0.5], [146, 1.3, 0.76, 0.92, 0.46]],
  claws: [[160, 1.6, 0.76, 0.9, 0.5], [146, 1.35, 0.78, 0.92, 0.46]],
  horns: [[160, 1.6, 0.82, 0.95, 0.52], [148, 1.35, 0.84, 0.97, 0.48]],
  sun: [[172, 1.7, 0.84, 0.94, 0.56], [164, 1.45, 0.86, 0.95, 0.52]],
  moon: [[172, 1.7, 0.82, 0.92, 0.56], [164, 1.45, 0.84, 0.93, 0.52]],
  gear: [[172, 1.65, 0.8, 0.88, 0.56], [164, 1.42, 0.82, 0.9, 0.52]],
  wheel: [[172, 1.65, 0.8, 0.88, 0.56], [164, 1.42, 0.82, 0.9, 0.52]],
  tails: [[166, 2.1, 0.6, 0.66, 0.6], [150, 1.8, 0.62, 0.7, 0.56]],
  crest: [[162, 2.0, 0.42, 0.72, 0.62], [148, 1.7, 0.44, 0.76, 0.56]],
}
/** Até quando (tempo da regra) dura o close: a HUD volta no recuo. */
const CINE_CLOSE = 0.28

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

/** O que cada peça recebe: cria malha e material já registrados, e aponta para onde a luz vai. */
interface Env {
  scene: Scene
  sig: Signature
  noise: Texture
  area: boolean
  /** Alcance do golpe no chão (m). */
  reach: number
  add: (m: Mesh, mat?: ShaderMaterial) => Mesh
  mat: (name: string, kind: ShaderKind) => ShaderMaterial
  /** Onde o golpe está agora: a luz e as faíscas seguem. */
  focus: Vector3
  /** Soltando faíscas neste quadro. */
  sparks: boolean
  /** Onde a aparição está (a parede de fogo dela abre daqui); null sem aparição em cena. */
  summonAt: Vector3 | null
}

interface Piece {
  step: (s: Live, t: number, clock: number) => void
  dispose?: () => void
}

/** Lua na diagonal, voando à frente. `rolls` = uma por corte. `size` multiplica o raio. */
function moonStrike(env: Env, rolls: number[], size = 1, z0 = 0): Piece {
  const R = [1.8 * size, 5.2 * size, 7.4 * size]
  const Z = [0.8 + z0, POWER.bladeRange * 0.55 + z0, POWER.bladeRange + 3.4 + z0]
  const items = rolls.map((roll, i) => {
    const node = new TransformNode(`sg-moon-${i}`, env.scene)
    const blade = env.add(moonMesh(env.scene, `sg-blade-${i}`), env.mat(`sg-blade-mat-${i}`, "MOON"))
    blade.parent = node
    blade.rotation.x = -Math.PI / 2
    const ghost = i ? null : env.add(moonMesh(env.scene, "sg-ghost"), env.mat("sg-ghost-mat", "MOON"))
    const wake = i ? null : env.add(wakeMesh(env.scene), env.mat("sg-wake-mat", "WAKE"))
    for (const m of [ghost, wake]) {
      if (!m) continue
      m.parent = node
      m.rotation.x = -Math.PI / 2
    }
    return { roll, node, blade, ghost, wake, delay: i * 0.035 }
  })
  return {
    step(s, t) {
      for (const it of items) {
        const t0 = MOON_FROM + it.delay
        const on = t >= t0 && t < MOON_END + it.delay
        it.blade.setEnabled(on)
        it.ghost?.setEnabled(on)
        it.wake?.setEnabled(on)
        if (!on) continue
        const out = easeOut(seg(t, t0, FIRE_AT))
        const fly = seg(t, FIRE_AT, MOON_END + it.delay)
        const r = out < 1 ? R[0] + (R[1] - R[0]) * out : R[1] + (R[2] - R[1]) * fly
        const z = out < 1 ? Z[0] + (Z[1] - Z[0]) * out : Z[1] + (Z[2] - Z[1]) * fly
        // o nó é o centro do círculo da lua: fica ao lado e abaixo, para o BOJO passar no eixo do golpe
        const side = r * Math.sin(it.roll)
        const top = 1.3 + s.height * 0.22
        const fx = Math.sin(s.facing)
        const fz = Math.cos(s.facing)
        it.node.position.set(s.x + fx * z + fz * side, top - r * Math.cos(it.roll), s.z + fz * z - fx * side)
        it.node.rotation.set(0, s.facing, it.roll)
        it.blade.scaling.setAll(r)
        const cut = easeInOut(seg(t, 0.98, MOON_END + it.delay)) * 1.05
        ;(it.blade.material as ShaderMaterial).setFloat("uCut", cut)
        if (it.ghost && it.wake) {
          it.ghost.scaling.setAll(r * 0.97)
          it.ghost.position.z = -Math.min(1.1, 0.5 + z * 0.12)
          it.wake.scaling.set(r, Math.max(0.5, z - 0.4), r)
          const gm = it.ghost.material as ShaderMaterial
          gm.setFloat("uCut", Math.min(1.1, cut + 0.3))
          gm.setFloat("uFade", 0.5)
          ;(it.wake.material as ShaderMaterial).setFloat("uFade", 1 - seg(t, 0.98, MOON_END))
        }
        env.focus.set(s.x + fx * z, top, s.z + fz * z)
        env.sparks = true
      }
    },
    dispose() {
      for (const it of items) it.node.dispose()
    },
  }
}

/** Duas luas deitadas girando em volta do corpo até o fim da área. */
function spinStrike(env: Env): Piece {
  const node = new TransformNode("sg-spin", env.scene)
  const parts = [0, Math.PI].map((a, i) => {
    const m = env.add(moonMesh(env.scene, `sg-spin-${i}`), env.mat(`sg-spin-mat-${i}`, "MOON"))
    m.parent = node
    m.rotation.y = a
    return m
  })
  return {
    step(s, t) {
      const on = t >= MOON_FROM - 0.03 && t < MOON_END
      for (const m of parts) m.setEnabled(on)
      if (!on) return
      const u = easeOut(seg(t, MOON_FROM - 0.03, FIRE_AT + 0.02))
      const r = 1.4 + (env.reach + 0.9) * u + 1.6 * seg(t, FIRE_AT, MOON_END)
      node.position.set(s.x, 0.9 + s.height * 0.16, s.z)
      node.rotation.y = s.facing + t * 16
      for (const m of parts) {
        m.scaling.setAll(r)
        ;(m.material as ShaderMaterial).setFloat("uCut", easeInOut(seg(t, 0.98, MOON_END)) * 1.05)
      }
      env.focus.set(s.x + Math.sin(node.rotation.y) * r, 1.4, s.z + Math.cos(node.rotation.y) * r)
      env.sparks = true
    },
    dispose() {
      node.dispose()
    },
  }
}

/** Feixe(s) de luz. `n` 1 = à frente; mais que isso = estrela em volta do corpo. */
function beamStrike(env: Env, n: number, width: number, length: number): Piece {
  const m = env.add(spokesMesh(env.scene, n, width / length), env.mat("sg-beam-mat", "BEAM"))
  const mat = m.material as ShaderMaterial
  return {
    step(s, t) {
      const on = t >= MOON_FROM + 0.02 && t < 1.3
      m.setEnabled(on)
      if (!on) return
      const fx = Math.sin(s.facing)
      const fz = Math.cos(s.facing)
      m.position.set(s.x + fx * 0.6, Math.max(1, s.height * 0.5), s.z + fz * 0.6)
      m.rotation.y = n > 1 ? s.facing + (t - MOON_FROM) * 0.7 : s.facing
      m.scaling.setAll(length)
      mat.setFloat("uR", 1.06 * easeOut(seg(t, MOON_FROM + 0.02, FIRE_AT)))
      mat.setFloat("uCut", easeInOut(seg(t, 1.02, 1.3)))
      env.focus.set(s.x + fx * length * 0.3, s.height * 0.5, s.z + fz * length * 0.3)
      env.sparks = true
    },
  }
}

/** Espada de luz que desce do céu e crava no meio do alcance. */
function swordStrike(env: Env): Piece {
  const H = 17
  const m = env.add(spokesMesh(env.scene, 1, 3 / H), env.mat("sg-sword-mat", "BEAM"))
  const guard = env.add(spokesMesh(env.scene, 2, 1.1 / 5), env.mat("sg-guard-mat", "BEAM"))
  const mat = m.material as ShaderMaterial
  const gm = guard.material as ShaderMaterial
  m.rotation.x = Math.PI / 2
  return {
    step(s, t) {
      const on = t >= 0.64 && t < 1.28
      m.setEnabled(on)
      guard.setEnabled(on)
      if (!on) return
      const z = env.area ? 0 : POWER.bladeRange * 0.55
      const x = s.x + Math.sin(s.facing) * z
      const zz = s.z + Math.cos(s.facing) * z
      const down = seg(t, 0.64, FIRE_AT)
      m.position.set(x, H, zz)
      m.scaling.setAll(H)
      mat.setFloat("uR", 1.2 * down * down)
      const cut = easeInOut(seg(t, 1.02, 1.28))
      mat.setFloat("uCut", cut)
      guard.position.set(x, 8.6 + (1 - down) * 9, zz)
      guard.rotation.y = s.facing + Math.PI / 2
      guard.scaling.setAll(5)
      gm.setFloat("uR", 1.05 * seg(t, 0.72, 0.84))
      gm.setFloat("uCut", cut)
      env.focus.set(x, 2.6, zz)
      env.sparks = t > 0.76
    },
  }
}

function rainStrike(env: Env): Piece {
  const m = env.add(rainMesh(env.scene, 44, env.reach + 0.7), env.mat("sg-rain-mat", "RAIN"))
  const mat = m.material as ShaderMaterial
  return {
    step(s, t) {
      const on = t >= 0.66 && t < 1.3
      m.setEnabled(on)
      if (!on) return
      // em cone a chuva cai à frente; em área, em volta de quem joga
      const z = env.area ? 0 : POWER.bladeRange * 0.5
      const fx = s.x + Math.sin(s.facing) * z
      const fz = s.z + Math.cos(s.facing) * z
      m.position.set(fx, 0, fz)
      mat.setFloat("uT", t)
      env.focus.set(fx, 2.4, fz)
      env.sparks = t > 0.74 && t < 1.05
    },
  }
}

/**
 * Parede de fogo que abre em volta até o fim da área. Sem `from`: em volta de quem joga (a
 * raposa); com `from`: abre de onde a aparição chega, um pouco depois dela.
 */
function blastStrike(env: Env, from?: () => Vector3 | null, t0 = 0.74): Piece {
  const cyl = CreateCylinder(`sg-blast-${from ? "summon" : "hero"}`, { height: 1, diameter: 2, tessellation: 64, cap: Mesh.NO_CAP }, env.scene)
  cyl.bakeTransformIntoVertices(Matrix.Translation(0, 0.5, 0))
  const m = env.add(cyl, env.mat(`sg-blast-mat-${from ? "summon" : "hero"}`, "BLAST"))
  const mat = m.material as ShaderMaterial
  const end = t0 + 0.6
  return {
    step(s, t) {
      const at = from ? from() : null
      const on = t >= t0 && t < end && (!from || !!at)
      m.setEnabled(on)
      if (!on) return
      const u = easeOut(seg(t, t0, t0 + 0.14))
      const r = 0.9 + (env.reach + 0.5) * u + 1.1 * seg(t, t0 + 0.11, end)
      m.position.set(at ? at.x : s.x, 0.02, at ? at.z : s.z)
      m.scaling.set(r, 3 + 4.4 * easeOut(seg(t, t0 + 0.04, t0 + 0.26)), r)
      mat.setFloat("uCut", easeInOut(seg(t, t0 + 0.28, end)) * 1.1)
      if (!from) env.focus.set(s.x, 2, s.z)
      env.sparks = env.sparks || t < t0 + 0.36
    },
  }
}

/** Disco do alto: desce do céu e estoura no meio do alcance. */
function discStrike(env: Env): Piece {
  const m = env.add(gridMesh(env.scene, "sg-disc", 48, 14), env.mat("sg-disc-mat", "POLAR"))
  const mat = m.material as ShaderMaterial
  mat.setFloat("uStyle", 0)
  mat.setFloat("uOpen", 1)
  m.rotation.x = Math.PI / 2
  return {
    step(s, t) {
      const on = t >= 0.64 && t < 1.24
      m.setEnabled(on)
      if (!on) return
      const fall = seg(t, 0.64, FIRE_AT)
      const z = env.area ? 0 : POWER.bladeRange * 0.55
      const y = 17 * (1 - fall * fall) + 0.5
      m.position.set(s.x + Math.sin(s.facing) * z, y, s.z + Math.cos(s.facing) * z)
      m.scaling.setAll(4.4 + 2.6 * easeOut(seg(t, FIRE_AT, 1.24)))
      mat.setFloat("uCut", easeInOut(seg(t, 0.96, 1.24)) * 1.1)
      env.focus.copyFrom(m.position)
      env.sparks = t > 0.78
    },
  }
}

/** Crista gigante que corre à frente e desaba. */
function waveStrike(env: Env): Piece {
  const m = env.add(gridMesh(env.scene, "sg-wave"), env.mat("sg-wave-mat", "CREST"))
  const mat = m.material as ShaderMaterial
  mat.setFloat("uOpen", 1)
  return {
    step(s, t) {
      const on = t >= 0.7 && t < 1.26
      m.setEnabled(on)
      if (!on) return
      const u = easeInOut(seg(t, 0.7, 1.26))
      const z = 0.6 + (env.reach + 3.6) * u
      m.position.set(s.x + Math.sin(s.facing) * z, 0, s.z + Math.cos(s.facing) * z)
      m.rotation.y = s.facing + Math.PI
      m.scaling.set(5.6, 3.3 + 1.3 * Math.sin(u * Math.PI), 3.2)
      mat.setFloat("uCut", easeInOut(seg(t, 1.02, 1.26)) * 1.1)
      env.focus.set(m.position.x, 2.4, m.position.z)
      env.sparks = true
    },
  }
}

const STRIKES: Record<StrikeForm, (env: Env) => Piece> = {
  none: () => ({ step() {} }),
  moon: (env) => moonStrike(env, [0.72]),
  cross: (env) => moonStrike(env, [0.78, -0.78], 0.94),
  // pancada de cima: lua quase em pé, mais baixa, que acaba no chão
  smash: (env) => moonStrike(env, [0.12], 0.72),
  spin: spinStrike,
  bolt: (env) => beamStrike(env, 1, 2.3, 14),
  spokes: (env) => beamStrike(env, 8, 0.8, env.reach + 3.4),
  rain: rainStrike,
  blast: blastStrike,
  disc: discStrike,
  wave: waveStrike,
  sword: swordStrike,
}

/**
 * A aparição gigante: modelo sem textura, desenhado como holograma. Carrega em segundo plano ao
 * abrir a luta; se o arquivo faltar, o poder segue com o que sobe do chão.
 */
function summonPiece(env: Env, ready: () => void): Piece {
  // o harness troca o modelo para montar o catálogo de candidatas
  const lab = process.env.NODE_ENV !== "production" ? (globalThis as unknown as { __mmSummon?: Summon & { file: string } }).__mmSummon : undefined
  const sum = lab ?? env.sig.summon!
  const holder = new TransformNode("sg-summon", env.scene)
  holder.setEnabled(false)
  const mat = env.mat("sg-holo-mat", "HOLO")
  // desenha a profundidade antes: só a face da frente aparece, sem ver o avesso da malha
  mat.needDepthPrePass = true
  mat.disableDepthWrite = false
  let parts: AbstractMesh[] = []
  let gone = false
  let dispose: (() => void) | null = null
  ensureLoaders()
  LoadAssetContainerAsync(lab?.file ?? `${ART.replace("/fx", "")}/summon/${env.sig.id}.glb`, env.scene)
    .then((c) => {
      if (gone) return c.dispose()
      c.addAllToScene()
      for (const n of c.rootNodes) n.parent = holder
      parts = c.meshes.filter((m) => m.getTotalVertices() > 0)
      for (const m of parts) {
        m.material = mat
        m.isPickable = false
        m.alwaysSelectAsActiveMesh = true
      }
      dispose = () => c.dispose()
      ready()
    })
    .catch(() => {})
  const size = sum.size
  return {
    step(s, t, clock) {
      if (!parts.length) return
      const fx = Math.sin(s.facing)
      const fz = Math.cos(s.facing)
      const ahead = env.area ? 0 : env.reach * 0.6
      let x = s.x
      let z = s.z
      let y = 0
      let on = false
      let cut = 0
      if (sum.mode === "fall") {
        // vem de longe, em diagonal, e chega no passo do dano
        on = t >= 0.5 && t < 1.42
        const u = seg(t, 0.5, FIRE_AT)
        const far = (1 - u * u) * 34
        x += fx * ahead - fz * far * 0.5
        z += fz * ahead + fx * far * 0.5
        // pedra e martelo caem girando; espada, machado e águia caem retos e cravam
        y = far * 1.05 + (sum.tumble ? size * 0.1 - size * 0.42 * seg(t, FIRE_AT, FIRE_AT + 0.1) : -size * 0.18 * easeOut(seg(t, FIRE_AT, FIRE_AT + 0.08)))
        if (sum.tumble) holder.rotation.set(clock * 0.9, s.facing + clock * 0.6, 0.4)
        else holder.rotation.set(0.35 * (1 - u), s.facing + (sum.turn ?? 0), 0)
        cut = easeInOut(seg(t, 1.02, 1.42))
      } else if (sum.mode === "rise") {
        on = t >= 0.6 && t < 1.48
        x += fx * ahead
        z += fz * ahead
        y = -size * (1 - easeOut(seg(t, 0.66, FIRE_AT)))
        holder.rotation.set(0, s.facing + Math.PI + (sum.turn ?? 0), 0)
        cut = easeInOut(seg(t, 1.1, 1.48))
      } else {
        // cresce atrás de quem joga na carga e avança no golpe
        on = t >= 0.12 && t < 1.34
        const go = easeInOut(seg(t, 0.74, FIRE_AT))
        const off = -3.4 + (ahead + 3.4) * go
        x += fx * off
        z += fz * off
        holder.rotation.set(0, s.facing + (sum.turn ?? 0), 0)
        cut = Math.max(1 - easeOut(seg(t, 0.12, 0.44)), easeInOut(seg(t, 1.0, 1.34)))
      }
      holder.setEnabled(on)
      env.summonAt = on ? holder.position : null
      if (!on) return
      const grow = sum.mode === "loom" ? 0.72 + 0.28 * easeOut(seg(t, 0.12, 0.6)) : 1
      holder.position.set(x, y, z)
      holder.scaling.setAll(size * grow)
      mat.setFloat("uCut", cut)
      const eye = env.scene.activeCamera?.globalPosition
      if (eye) mat.setVector3("uEye", eye)
      if (t >= 0.74) {
        env.focus.set(x, Math.max(1.2, y + size * 0.3), z)
        env.sparks = env.sparks || sum.mode === "fall"
      }
    },
    dispose() {
      gone = true
      dispose?.()
      holder.dispose()
    },
  }
}

/** Forma das costas. `kind` é o desenho; `style`, `count` e `curl` são a variação dele. */
const BACKS: Record<BackForm, { kind: ShaderKind; style?: number; count?: number; curl?: number; size?: number; lift?: number }> = {
  wings: { kind: "WING" },
  feathers: { kind: "WING", style: 1, size: 1.14 },
  tails: { kind: "TAILS", count: 5, curl: 1, size: 1.75, lift: 0.5 },
  claws: { kind: "TAILS", count: 4, curl: 0, size: 1.5, lift: 0.86 },
  sun: { kind: "POLAR", style: 0, size: 1.2, lift: 0.94 },
  moon: { kind: "POLAR", style: 1, size: 1.3, lift: 0.9 },
  gear: { kind: "POLAR", style: 2, size: 1.05, lift: 0.8 },
  wheel: { kind: "POLAR", style: 3, size: 1.1, lift: 0.78 },
  horns: { kind: "HORNS", size: 1.05, lift: 0.82 },
  crest: { kind: "CREST", size: 1.6, lift: 0 },
}

/** O que sobe do chão: estilo no shader e proporção. */
const RISES: Record<RiseForm, { style: number; taper: number; strips: number; w: [number, number]; h: [number, number]; bend: number; lean: number }> = {
  blades: { style: 0, taper: 0.75, strips: 2, w: [0.34, 0.42], h: [1.1, 2.3], bend: 1.1, lean: 0.7 },
  flames: { style: 1, taper: 0.55, strips: 2, w: [0.8, 0.8], h: [1.7, 2.6], bend: 0.5, lean: 0.2 },
  columns: { style: 2, taper: 0.03, strips: 3, w: [0.5, 0.45], h: [1.1, 2.4], bend: 0, lean: 0.1 },
  water: { style: 3, taper: 0.28, strips: 2, w: [0.8, 0.6], h: [1.4, 2.4], bend: 0.3, lean: 0.25 },
  crystals: { style: 4, taper: 0.9, strips: 2, w: [0.42, 0.34], h: [1.1, 2.1], bend: 0, lean: 0.5 },
}

function buildEffect(ctx: FxContext, rig: SignatureRig): FxEffect<Live> {
  const { scene, budget } = ctx
  const { sig, area } = rig
  const k = budget.particles * FX_TUNE.density
  const dropN = Math.max(10, Math.round(44 * k))
  const riseN = Math.max(12, Math.round(38 * Math.sqrt(k)))
  const reach = area ? POWER.mageR : POWER.bladeRange

  const noise = new Texture(`${ART}/noise.webp`, scene)
  const runeTex = new Texture(`${ART}/glyph-${sig.glyph}.webp`, scene)
  const crackTex = new Texture(`${ART}/${area ? "crack-round" : "crack"}.webp`, scene)
  const smokeTex = new Texture(`${ART}/smoke.webp`, scene)
  for (const t of [runeTex, crackTex]) t.wrapU = t.wrapV = Texture.CLAMP_ADDRESSMODE

  const meshes: Mesh[] = []
  const mats: ShaderMaterial[] = []
  const env: Env = {
    scene,
    sig,
    noise,
    area,
    reach,
    add(m, mat) {
      if (mat) m.material = mat
      meshes.push(m)
      return m
    },
    mat(name, kind) {
      const m = shaderOf(scene, name, kind, noise, sig)
      mats.push(m)
      return m
    },
    focus: new Vector3(),
    sparks: false,
    summonAt: null,
  }

  const strike = STRIKES[sig.strike](env)
  let summoned = false
  const labOn = process.env.NODE_ENV !== "production" && !!(globalThis as unknown as { __mmSummon?: unknown }).__mmSummon
  const summon = sig.summon || labOn ? summonPiece(env, () => (summoned = true)) : null
  // a parede de fogo da raposa, na cor de cada um, saindo de onde o gigante chega
  const summonBlast = summon && sig.strike !== "blast" ? blastStrike(env, () => (summoned ? env.summonAt : null), FIRE_AT - 0.02) : null

  const form = BACKS[sig.back]
  const backMat = env.mat("sg-back-mat", form.kind)
  backMat.setFloat("uStyle", form.style ?? 0)
  backMat.setFloat("uCount", form.count ?? 5)
  backMat.setFloat("uCurl", form.curl ?? 1)
  const back = env.add(gridMesh(scene, "sg-back"), backMat)

  const ring = env.add(CreateGround("sg-ring", { width: 2, height: 2 }, scene), env.mat("sg-ring-mat", "RING"))
  const ringMat = ring.material as ShaderMaterial
  const pool = env.add(CreateGround("sg-pool", { width: 2, height: 2 }, scene), env.mat("sg-pool-mat", "POOL"))
  const poolMat = pool.material as ShaderMaterial
  const rune = env.add(CreateGround("sg-rune", { width: 2, height: 2 }, scene), env.mat("sg-rune-mat", "DECAL"))
  const runeMat = rune.material as ShaderMaterial
  runeMat.setTexture("uTex", runeTex)
  const crack = env.add(CreateGround("sg-crack", { width: 2, height: 2 }, scene), env.mat("sg-crack-mat", "DECAL"))
  const crackMat = crack.material as ShaderMaterial
  crackMat.setTexture("uTex", crackTex)
  const flash = env.add(CreatePlane("sg-flash", { size: 2 }, scene), env.mat("sg-flash-mat", "FLASH"))
  const flashMat = flash.material as ShaderMaterial
  flash.billboardMode = Mesh.BILLBOARDMODE_ALL

  // o que sobe do chão: em cone na lâmina, em volta de quem joga na regra de área
  const R = RISES[sig.rise]
  const specs: RiseSpec[] = Array.from({ length: riseN }, (_, i) => {
    const d = 1.25 + Math.pow(hash(i, 1), area ? 0.5 : 0.7) * (reach - 0.6)
    return {
      a: area ? hash(i, 2) * Math.PI * 2 : (hash(i, 2) * 2 - 1) * (POWER.bladeArc / 2 + 0.08),
      d,
      h: (R.h[0] + hash(i, 3) * R.h[1]) * (1.3 - d / 9),
      w: R.w[0] + hash(i, 4) * R.w[1],
      bend: (hash(i, 5) - 0.5) * R.bend,
      lean: 0.3 * R.lean + hash(i, 6) * R.lean,
      at: FIRE_AT + 0.015 + d / 26,
    }
  })
  const rise = env.add(riseMesh(scene, specs, R.taper, R.strips), env.mat("sg-rise-mat", "THORN"))
  const riseMat = rise.material as ShaderMaterial
  riseMat.setFloat("uStyle", R.style)

  // gotas de luz: voltam de quem foi atingido para o corpo (a cura aparecendo)
  const hotC = Color3.FromHexString(sig.pal[2]).toLinearSpace()
  const drop = CreateSphere("sg-drop", { diameter: 1, segments: 3 }, scene)
  const dropMat = new StandardMaterial("sg-drop-mat", scene)
  dropMat.disableLighting = true
  dropMat.emissiveColor = hotC
  drop.material = dropMat
  drop.alwaysSelectAsActiveMesh = true
  const dropBuf = new Float32Array(dropN * 16)
  drop.thinInstanceSetBuffer("matrix", dropBuf, 16, false)
  env.add(drop)

  // destroços: pedaços pretos voando dão escala e peso ao impacto
  const rockN = Math.max(10, Math.round(34 * Math.sqrt(k)))
  // octaedro esticado por pedaço: lasca angulosa, nunca bola
  const rock = CreatePolyhedron("sg-rock", { type: 1, size: 0.6 }, scene)
  rock.convertToFlatShadedMesh()
  const rockMat = new StandardMaterial("sg-rock-mat", scene)
  rockMat.diffuseColor = new Color3(0.05, 0.03, 0.04)
  rockMat.specularColor = new Color3(0.3, 0.1, 0.15)
  rock.material = rockMat
  rock.alwaysSelectAsActiveMesh = true
  const rockBuf = new Float32Array(rockN * 16)
  rock.thinInstanceSetBuffer("matrix", rockBuf, 16, false)
  env.add(rock)

  // ── partículas ─────────────────────────────────────────────────────────────
  const dot = new DynamicTexture("sg-dot", { width: 64, height: 64 }, scene, false)
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
  const c4 = (hex: string, a = 1) => {
    const c = Color3.FromHexString(hex)
    return new Color4(c.r, c.g, c.b, a)
  }
  const spark = (name: string, cap: number) => {
    const p = new ParticleSystem(name, Math.max(16, Math.round(cap * k)), scene)
    p.particleTexture = dot
    p.blendMode = ParticleSystem.BLENDMODE_ADD
    p.color1 = c4(sig.pal[4])
    p.color2 = c4(sig.pal[2])
    p.colorDead = c4(sig.pal[3], 0)
    p.emitRate = 0
    p.emitter = Vector3.Zero()
    return p
  }
  // brasas soltas subindo em volta do corpo
  const embers = spark("sg-embers", 200)
  embers.minSize = 0.03
  embers.maxSize = 0.09
  embers.minLifeTime = 0.6
  embers.maxLifeTime = 1.3
  embers.minEmitPower = 0.3
  embers.maxEmitPower = 1.4
  embers.gravity = new Vector3(0, 1.8, 0)
  embers.createCylinderEmitter(1.9, 0.1, 1, 0)
  // riscos de luz fechando na arma
  const inflow = spark("sg-inflow", 170)
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
  // faíscas riscando para fora no impacto e soltas pelo golpe
  const burst = spark("sg-burst", 260)
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
  // névoa: quadros da textura, cobre o fundo em vez de somar luz
  const mist = new ParticleSystem("sg-mist", Math.max(10, Math.round(46 * k)), scene, null, true)
  mist.particleTexture = smokeTex
  mist.blendMode = ParticleSystem.BLENDMODE_STANDARD
  mist.startSpriteCellID = 0
  mist.endSpriteCellID = 15
  mist.spriteCellWidth = 128
  mist.spriteCellHeight = 128
  mist.spriteCellLoop = false
  mist.color1 = c4(sig.pal[1], 0.95)
  mist.color2 = c4(sig.pal[0], 0.9)
  mist.colorDead = c4(sig.pal[0], 0)
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
  const light = budget.layers ? new PointLight("sg-light", new Vector3(0, 1, 0), scene) : null
  if (light) {
    light.diffuse = Color3.FromHexString(sig.pal[2])
    light.specular = Color3.FromHexString(sig.pal[3])
    light.range = 17
    light.intensity = 0
  }

  // cortina de luz que sobe da borda do desenho quando o chão acende
  const curtainCyl = CreateCylinder("sg-curtain", { height: 1, diameter: 2, tessellation: 56, cap: Mesh.NO_CAP }, scene)
  curtainCyl.bakeTransformIntoVertices(Matrix.Translation(0, 0.5, 0))
  const curtain = env.add(curtainCyl, env.mat("sg-curtain-mat", "CURTAIN"))
  const curtainMat = curtain.material as ShaderMaterial

  for (const m of meshes) {
    m.isPickable = false
    m.setEnabled(false)
  }

  const drops = Array.from({ length: dropN }, (_, i) => ({ s: 0.03 + hash(i, 11) * 0.05, back: 0.98 + hash(i, 12) * 0.28 }))
  const rocks = Array.from({ length: rockN }, (_, i) => ({
    a: area ? hash(i, 13) * Math.PI * 2 : (hash(i, 13) * 2 - 1) * 1.1,
    d: 1 + hash(i, 14) * 4,
    out: 3 + hash(i, 15) * 9,
    up: 7 + hash(i, 16) * 13,
    size: 0.07 + Math.pow(hash(i, 17), 2.6) * 0.24,
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
      if (!area && s.hits.length && s.t >= o.back && back < 1) {
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
      back.setEnabled(true)
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
      const gain = FX_TUNE.gain
      for (const m of mats) {
        m.setFloat("uTime", clock)
        m.setFloat("uGain", gain)
      }
      // partículas no ritmo da câmera lenta
      const speed = Math.max(0.002, rig.pace() / 60)
      for (const p of systems) p.updateSpeed = speed

      // chão: mancha escura e o desenho de quem joga
      const runeFade = 1 - seg(t, 1.32, 1.66)
      // quando o chão acende o desenho abre até o alcance e brilha inteiro
      const spread = easeOut(seg(t, FIRE_AT, FIRE_AT + 0.14))
      const r0 = Math.max(2.6, s.height * 1.3)
      const runeR = r0 + (reach + 1.2 - r0) * spread
      const boost = seg(t, FIRE_AT, FIRE_AT + 0.05) * (1 - 0.72 * seg(t, FIRE_AT + 0.1, 1.5)) * (0.86 + 0.14 * Math.sin(clock * 34))
      const open = 1.12 * easeOut(seg(t, 0, 0.22))
      rune.setEnabled(runeFade > 0)
      pool.setEnabled(runeFade > 0)
      rune.position.set(s.x, 0.05, s.z)
      rune.rotation.y = clock * 0.7
      rune.scaling.setAll(runeR)
      runeMat.setFloat("uR", open)
      runeMat.setFloat("uFade", runeFade)
      runeMat.setFloat("uBoost", boost)
      pool.position.set(s.x, 0.04, s.z)
      pool.scaling.setAll(runeR * 1.7)
      poolMat.setFloat("uR", Math.max(0.05, open * 0.9))
      poolMat.setFloat("uFade", runeFade)

      // costas: abre na carga, fecha na antecipação e vira fumaça antes do golpe
      const openBack = easeOut(seg(t, 0.14, 0.5)) * (1 - 0.45 * easeInOut(seg(t, 0.6, 0.74)))
      const cutBack = seg(t, 0.62, 0.76)
      back.setEnabled(cutBack < 1)
      const lift = form.lift ?? 0.76
      back.position.set(s.x - Math.sin(s.facing) * 0.28, s.height * lift, s.z - Math.cos(s.facing) * 0.28)
      back.rotation.y = s.facing
      back.scaling.setAll(s.height * 1.42 * (form.size ?? 1))
      backMat.setFloat("uOpen", openBack)
      backMat.setFloat("uCut", cutBack)
      backMat.setFloat("uFade", Math.min(1, t / 0.12) * (1 - seg(t, 0.68, 0.76)))

      // partículas da carga
      embers.emitter = emitAt.set(s.x, 0.1, s.z).clone()
      embers.emitRate = t < 0.8 ? 120 * k : t < 1.3 ? 40 * k : 0
      inflow.emitter = s.bladeAt
      inflow.emitRate = t > 0.14 && t < 0.72 ? 200 * k : 0

      env.sparks = false
      strike.step(s, t, clock)
      summon?.step(s, t, clock)
      summonBlast?.step(s, t, clock)
      burst.emitter = env.focus.clone()
      burst.emitRate = env.sparks ? 160 * k : 0

      // luz: cresce na arma, acompanha o golpe, estoura no dano e apaga
      if (light) {
        const charge = 0.55 + 0.8 * seg(t, 0.14, 0.72)
        const peak = 2.4 * (1 - seg(t, FIRE_AT, 1.2))
        light.position.copyFrom(t >= MOON_FROM ? env.focus : s.bladeAt)
        light.intensity = (t < FIRE_AT ? charge : 0.3 + peak) * (1 - seg(t, 1.25, 1.6)) * gain
      }

      // no chão, a partir do impacto
      if (s.impacted) {
        const fx = Math.sin(s.facing)
        const fz = Math.cos(s.facing)
        if (!flashed) {
          flashed = true
          const at = s.hits[0] ?? new Vector3(s.x + fx * (area ? 0 : 2.6), s.height * 0.6, s.z + fz * (area ? 0 : 2.6))
          flash.position.copyFrom(at)
          flash.setEnabled(true)
          burst.emitter = at.clone()
          burst.manualEmitCount = Math.round(170 * k)
          mist.emitter = new Vector3(s.x + fx * (area ? 0 : 2.8), 0.9, s.z + fz * (area ? 0 : 2.8))
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
        ring.scaling.setAll(reach + 2.4)
        ringMat.setFloat("uR", 0.28 + 0.72 * easeOut(wave))
        ringMat.setFloat("uFade", 1 - wave * wave)
        const crackFade = 1 - seg(t, 1.3, FX_END)
        crack.setEnabled(crackFade > 0)
        crack.position.set(s.x, 0.06, s.z)
        crack.rotation.y = s.facing
        crack.scaling.setAll(reach + 1.3)
        crackMat.setFloat("uR", 0.18 + 1.05 * easeOut(seg(t, FIRE_AT, FIRE_AT + 0.16)))
        crackMat.setFloat("uFade", crackFade)
      }
      // o que sobe do chão: em onda, a partir da mesma hora do dano, e queima como o golpe
      const riseOn = s.impacted && t < 1.62 && !summoned
      rise.setEnabled(riseOn)
      curtain.setEnabled(s.impacted && t < 1.34)
      if (riseOn) {
        rise.position.set(s.x, 0.02, s.z)
        rise.rotation.y = s.facing
        riseMat.setFloat("uT", t)
        riseMat.setFloat("uCut", easeInOut(seg(t, 1.24, 1.6)) * 1.05)
        curtain.position.set(s.x, 0.02, s.z)
        curtain.scaling.set(runeR * 0.985, 2.8 + 1.8 * easeOut(seg(t, FIRE_AT, 1.1)), runeR * 0.985)
        curtainMat.setFloat("uFade", seg(t, FIRE_AT, FIRE_AT + 0.05) * (1 - seg(t, 1.0, 1.34)))
      }
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
      strike.dispose?.()
      summon?.dispose?.()
      for (const m of meshes) m.dispose()
      for (const m of [...mats, dropMat, rockMat]) m.dispose()
      for (const t of [noise, runeTex, crackTex, smokeTex, dot]) t.dispose()
    },
  }
}

export interface SignatureFx {
  /** Roteiro novo a cada uso (a posição e a direção são as da hora do golpe). */
  script: () => AbilityScript
  /** Um inimigo foi pego pelo poder (evento da regra, antes do impacto). */
  hit: (at: Vector3) => void
  warm: () => void
  /** O corpo (e a arma) que fica aceso no apagão: a luz própria só pega neles. */
  bind: (meshes: AbstractMesh[]) => void
  dispose: () => void
}

export function signatureFx(rig: SignatureRig): SignatureFx {
  const build: FxBuilder<Live> = (ctx) => buildEffect(ctx, rig)
  let live: Live | null = null
  let rim: PointLight | null = null
  return {
    warm: () => rig.stage.warm("signature", build),
    hit: (at) => live?.hits.push(at.clone()),
    bind(meshes) {
      if (rim || !meshes.length) return
      rim = new PointLight("sg-rim", new Vector3(0, 1, 0), meshes[0].getScene())
      rim.diffuse = Color3.FromHexString(rig.sig.pal[4])
      rim.specular = Color3.FromHexString(rig.sig.pal[3])
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
      rig.stage.play("signature", build, s)
      const f = FIRE_AT
      // golpe em área: a câmera fica mais longe e olha para quem joga, não para a frente
      const wide = (c: CamKey): CamKey => (rig.area && c.t >= 0.76 ? { ...c, lead: c.lead * 0.2, dist: c.dist * 1.22, high: c.high * 1.2, yaw: c.yaw + 26 } : c)
      // com o gigante em cena a câmera recua e olha para cima: ele tem 8 a 16 m e o corpo, 2
      const sum = rig.sig.summon
      const giant = (c: CamKey): CamKey => {
        if (!sum) return c
        const loomNow = sum.mode === "loom" && c.t >= 0.25
        const later = c.t >= 0.72
        if (!loomNow && !later) return c
        // longe o bastante para o gigante caber de pé, olhando para o meio dele
        const h = Math.max(1.6, me.height)
        const bodyK = Math.max(1, me.height / 1.8)
        return { ...c, dist: Math.max(c.dist, (sum.size * 0.95) / bodyK), high: (sum.size * 0.46) / h, look: (sum.size * 0.4) / h, yaw: loomNow && !later ? 156 : c.yaw + 8, fov: Math.max(c.fov, 1.02) }
      }
      /** O contato do poder (o mesmo nas duas formas); `stop` = a pausa no contato. */
      const impact = (stop: number, flash = true) => {
        s.impacted = true
        rig.hitStop(stop)
        rig.shake(0.55)
        if (flash) rig.flash()
        rig.audio.boom()
        rig.audio.thorns()
        rig.vfx.dust(new Vector3(s.x + Math.sin(s.facing) * 2.4, 0.1, s.z + Math.cos(s.facing) * 2.4), 18)
      }
      const step = (t: number) => {
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
      }
      const finish = () => {
        s.free = true
        rig.dim(1)
        if (rim) rim.intensity = 0
      }

      // ── apresentação 09/10: o Poder Máximo de cinema (todos os personagens) ──
      // close 3D de frente → recuo contínuo até o corpo inteiro com o gigante atrás → três golpes do
      // tamanho da tela → pausa de aviso com a cruz de luz → golpe final com clímax → resto.
      // A regra (sim/fight.ts) não muda: só o ritmo da tela, a câmera e o desenho.
      const cine = rig.cine ?? null
      if (cine) {
        const pal = rig.sig.pal
        // close (0–0,28 da regra) e recuo (0,28–0,58) escritos aqui; do golpe em diante segue o
        // enquadramento de sempre, com o gigante e a área
        const [a, z] = CLOSE_BY_BACK[rig.sig.back]
        // o close segue a cabeça de agora (quem se curva no gesto não perde o rosto); com o punho na
        // frente do rosto (boxe) a câmera vai 34° mais para o lado
        const turn = rig.guard ? -34 : 0
        const key = (t: number, [yaw, dist, high, look, fov]: CloseKey): CamKey => ({ t, yaw: yaw + turn, dist, high, look, lead: 0, fov, head: 1 })
        const close: CamKey[] = [
          // corte seco no close, enquadrado pela forma das costas (CLOSE_BY_BACK); empurra devagar e
          // gira enquanto ela abre atrás. Monstro entre a câmera e o corpo sai de quadro
          // (laminas-game, `director.framing`)
          key(0, a),
          key(0.26, z),
          // recuo sem corte: abre a lente, sobe por cima de quem está na frente e gira para o lado.
          // Regra de área (maga, arco, arma): mais longe e mais alto, o círculo do chão entra em quadro
          rig.area
            ? { t: 0.42, yaw: 124, dist: 4.2, high: 1.5, look: 0.9, lead: 0, fov: 0.86 }
            : { t: 0.42, yaw: 118, dist: 3.4, high: 1.25, look: 1.0, lead: 0, fov: 0.8 },
        ]
        const later = (
          [
            { t: 0.58, yaw: 150, dist: 6, high: 1.2, look: 1.1, lead: 0, fov: 0.95 },
            { t: 0.76, yaw: 34, dist: 5, high: 0.95, look: 0.62, lead: 2.1, fov: 0.92 },
            { t: f, yaw: 25, dist: 6.2, high: 0.95, look: 0.56, lead: 3, fov: 0.88 },
            { t: 1.08, yaw: 18, dist: 6.9, high: 1.15, look: 0.46, lead: 3.1, fov: 0.9 },
            { t: POWER.dur, yaw: 0, dist: 6.6, high: 1.3, look: 0.5, lead: 1.6, fov: 0.9 },
          ] as CamKey[]
        )
          .map(wide)
          .map(giant)
        // o pulo de abertura da lente no golpe final (em todo nível)
        const at = later.findIndex((c) => c.t === f)
        if (at >= 0) later.splice(at + 1, 0, { ...later[at], t: f + 0.03, fov: later[at].fov + 0.16 })
        return {
          id: `signature-${rig.sig.id}-cine`,
          dur: POWER.dur,
          closeUntil: CINE_CLOSE,
          cut: true,
          // regra → tela: close 0,28 → 0,8 s · recuo 0,30 → 0,65 s · golpes 0,17 → 0,47 s ·
          // aviso 0,05 → 0,24 s · clímax e resto 0,75 → 1,1 s. ≈ 3,4 s de tela para 1,6 s de regra.
          time: [
            { t: 0, k: 0.34 },
            { t: 0.26, k: 0.34 },
            { t: 0.3, k: 0.46 },
            { t: 0.58, k: 0.5 },
            { t: 0.62, k: 0.36 },
            { t: 0.79, k: 0.36 },
            { t: 0.8, k: 0.2 },
            { t: 0.845, k: 0.2 },
            { t: f, k: 0.3 },
            { t: 0.95, k: 0.32 },
            { t: 1.08, k: 0.8 },
            { t: 1.2, k: 1 },
          ],
          camera: [...close, ...later],
          cues: [
            { at: 0, run: () => (rig.audio.heartbeat(), rig.pre()) },
            { at: 0.1, run: () => rig.audio.inhale(0.75) },
            { at: 0.42, run: () => rig.audio.heartbeat() },
            { at: rig.strikeAt, run: () => rig.strike() },
            // três golpes do tamanho da tela, um a cada ~0,17 s de tela, cada um de um lado
            { at: 0.63, run: () => cine.arc(0) },
            // quadro de cor chapada: borda 1 quadro, depois corpo 2 quadros ("soco no olho")
            { at: 0.69, run: () => (cine.arc(1), cine.flat([pal[3]], 0.42)) },
            { at: MOON_FROM, run: () => rig.audio.rend() },
            { at: 0.75, run: () => (cine.arc(2), cine.flat([pal[1], pal[1]], 0.5)) },
            // pausa de aviso: o tempo quase para e a cruz de luz marca o alvo
            { at: 0.8, run: () => cine.cross() },
            // o clímax substitui o clarão: cores deslocadas + borrão, não tela lavada
            { at: f, run: () => (impact(0.14, false), cine.climax(), cine.pillar()) },
          ],
          step,
          finish,
        }
      }

      return {
        id: `signature-${rig.sig.id}`,
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
        // close no rosto → sobe para o lado no golpe → acompanha o golpe → devolve a câmera do jogo
        camera: (
          [
            { t: 0, yaw: 62, dist: 3.1, high: 0.82, look: 0.78, lead: 0, fov: 0.78 },
            { t: 0.3, yaw: 128, dist: 2.1, high: 0.84, look: 0.84, lead: 0, fov: 0.66 },
            { t: 0.6, yaw: 152, dist: 2.3, high: 0.76, look: 0.82, lead: 0, fov: 0.66 },
            { t: 0.76, yaw: 34, dist: 5, high: 0.95, look: 0.62, lead: 2.1, fov: 0.92 },
            { t: f, yaw: 25, dist: 6.2, high: 0.95, look: 0.56, lead: 3, fov: 0.88 },
            { t: 1.08, yaw: 18, dist: 6.9, high: 1.15, look: 0.46, lead: 3.1, fov: 0.9 },
            { t: POWER.dur, yaw: 0, dist: 6.6, high: 1.3, look: 0.5, lead: 1.6, fov: 0.9 },
          ] as CamKey[]
        )
          .map(wide)
          .map(giant),
        cues: [
          { at: 0, run: () => (rig.audio.heartbeat(), rig.pre()) },
          { at: 0.1, run: () => rig.audio.inhale(0.75) },
          { at: 0.14, run: () => rig.cutIn() },
          { at: 0.42, run: () => rig.audio.heartbeat() },
          { at: rig.strikeAt, run: () => rig.strike() },
          { at: MOON_FROM, run: () => rig.audio.rend() },
          { at: f, run: () => impact(0.07) },
        ],
        step,
        finish,
      }
    },
  }
}

export type SignatureClip = [clip: BoxeClip, from: number, to: number]
