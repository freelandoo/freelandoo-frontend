// features/meu-mundo/corrida/engine/flame.ts — CORRIDA (mm3d-41): o fogo dos bocais, de GÁS.
//
// Pedido do Alex: fogo que não é forma sólida — transparente, mais curto
// devagar e esticado rápido, flexível. Um tubo cônico (anéis ao longo do
// comprimento, sem tampa) desenhado aditivo e sem gravar profundidade, com
// shader próprio:
//  - opacidade pela face virada para a câmera (o meio da chama acende, a borda
//    some) e pelo comprimento (forte na boca, nada na ponta) — vira gás;
//  - cor: núcleo branco-azulado no meio e na boca → laranja → vermelho na
//    ponta; no turbo esquenta para o azul;
//  - o corpo ondula (ondas que correm para trás) e a ponta CURVA por um
//    deslocamento por instância (quem chama passa o quanto a nave virou: a
//    ponta atrasa na curva).
// Uma instância fina por bocal; atributo `flame` = (curva x, curva y, força, turbo),
// curvas em unidades locais (antes da escala do raio).

import type { Scene } from "@babylonjs/core/scene"
import "@babylonjs/core/Meshes/thinInstanceMesh"
import "@babylonjs/core/Shaders/ShadersInclude/instancesDeclaration"
import "@babylonjs/core/Shaders/ShadersInclude/instancesVertex"
import { Mesh } from "@babylonjs/core/Meshes/mesh"
import { VertexData } from "@babylonjs/core/Meshes/mesh.vertexData"
import { ShaderMaterial } from "@babylonjs/core/Materials/shaderMaterial"
import { Constants } from "@babylonjs/core/Engines/constants"
import type { Vector3 } from "@babylonjs/core/Maths/math.vector"

const SIDES = 14
const RINGS = 10

const VERTEX = `
precision highp float;
attribute vec3 position;
attribute vec3 normal;
attribute vec4 flame;
#include<instancesDeclaration>
uniform mat4 viewProjection;
uniform float time;
varying float vT;
varying vec3 vN;
varying vec3 vPosW;
varying vec4 vFlame;
varying float vSeed;
void main(void) {
#include<instancesVertex>
  float t = clamp(-position.z, 0.0, 1.0);
  float seed = fract(finalWorld[3].x * 0.37 + finalWorld[3].z * 0.11);
  vec3 p = position;
  // ondas correndo para trás, crescendo para a ponta
  float w1 = sin(time * 27.0 + seed * 40.0 - t * 9.0);
  float w2 = sin(time * 19.0 + seed * 23.0 - t * 6.0 + 1.7);
  p.x += (w1 * 0.16 + flame.x * t) * t;
  p.y += (w2 * 0.12 + flame.y * t) * t;
  // a chama "respira" na largura
  p.xy *= 1.0 + 0.12 * sin(time * 33.0 + seed * 17.0 - t * 12.0);
  vec4 wp = finalWorld * vec4(p, 1.0);
  vPosW = wp.xyz;
  vN = normalize(mat3(finalWorld) * normal);
  vT = t;
  vFlame = flame;
  vSeed = seed;
  gl_Position = viewProjection * wp;
}`

const FRAGMENT = `
precision highp float;
uniform float time;
uniform vec3 eye;
varying float vT;
varying vec3 vN;
varying vec3 vPosW;
varying vec4 vFlame;
varying float vSeed;
void main(void) {
  vec3 v = normalize(eye - vPosW);
  float facing = abs(dot(normalize(vN), v));
  // gás: a borda some, o meio acende
  float body = pow(facing, 2.0);
  float core = pow(facing, 4.0) * (1.0 - smoothstep(0.0, 0.45, vT));
  float along = pow(1.0 - vT, 1.1);
  float flick = 0.78 + 0.22 * sin(time * 41.0 + vSeed * 31.0 - vT * 14.0) * sin(time * 23.0 + vT * 7.0);
  float a = (body * 0.5 + core * 0.8) * along * flick * vFlame.z;
  vec3 hot = mix(vec3(1.0, 0.86, 0.6), vec3(0.7, 0.88, 1.0), vFlame.w);
  vec3 mid = mix(vec3(1.0, 0.45, 0.1), vec3(0.35, 0.6, 1.0), vFlame.w * 0.8);
  vec3 tip = mix(vec3(0.85, 0.12, 0.04), vec3(0.45, 0.2, 0.95), vFlame.w * 0.7);
  vec3 c = mix(hot, mid, smoothstep(0.0, 0.4, vT + (1.0 - facing) * 0.35));
  c = mix(c, tip, smoothstep(0.45, 1.0, vT));
  // o núcleo passa de 1: na soma vira branco quente (brilho sem pós)
  gl_FragColor = vec4(c * (1.0 + core * 0.6), clamp(a, 0.0, 1.0));
}`

/** Tubo cônico: boca de raio 1 em z = 0, ponta em z = −1, anéis para curvar. */
function flameTube(name: string, scene: Scene): Mesh {
  const pos: number[] = []
  const nrm: number[] = []
  const idx: number[] = []
  for (let r = 0; r <= RINGS; r++) {
    const t = r / RINGS
    // perfil de chama: incha logo depois da boca e afina num rabo FINO (pedido do Alex)
    const rad = Math.max(0.015, (1 - t) ** 2.2 * (1 + 0.6 * Math.sin(Math.min(1, t * 5) * Math.PI)))
    for (let s = 0; s <= SIDES; s++) {
      const a = (s / SIDES) * Math.PI * 2
      pos.push(Math.cos(a) * rad, Math.sin(a) * rad, -t)
      nrm.push(Math.cos(a), Math.sin(a), 0.25)
    }
  }
  const row = SIDES + 1
  for (let r = 0; r < RINGS; r++)
    for (let s = 0; s < SIDES; s++) {
      const a = r * row + s
      const b = a + row
      idx.push(a, b, a + 1, a + 1, b, b + 1)
    }
  const m = new Mesh(name, scene)
  const vd = new VertexData()
  vd.positions = pos
  vd.normals = nrm
  vd.indices = idx
  vd.applyToMesh(m)
  m.isPickable = false
  m.alwaysSelectAsActiveMesh = true
  return m
}

export interface FlameBank {
  mesh: Mesh
  /** 16 floats por chama (matriz). */
  matrices: Float32Array
  /** 4 floats por chama: curva x, curva y (locais), força, turbo 0–1. */
  params: Float32Array
  /** Depois de escrever os buffers do quadro. */
  update(time: number, eye: Vector3): void
  dispose(): void
}

export function createFlames(scene: Scene, count: number): FlameBank {
  const mesh = flameTube("corrida-flame", scene)
  const mat = new ShaderMaterial(
    "corrida-flame",
    scene,
    { vertexSource: VERTEX, fragmentSource: FRAGMENT },
    {
      attributes: ["position", "normal", "flame"],
      uniforms: ["world", "viewProjection", "time", "eye"],
      needAlphaBlending: true,
    },
  )
  mat.backFaceCulling = false
  mat.alphaMode = Constants.ALPHA_ADD
  mat.disableDepthWrite = true
  mesh.material = mat
  const matrices = new Float32Array(count * 16)
  const params = new Float32Array(count * 4)
  mesh.thinInstanceSetBuffer("matrix", matrices, 16, false)
  mesh.thinInstanceSetBuffer("flame", params, 4, false)
  return {
    mesh,
    matrices,
    params,
    update(time, eye) {
      mesh.thinInstanceBufferUpdated("matrix")
      mesh.thinInstanceBufferUpdated("flame")
      mat.setFloat("time", time)
      mat.setVector3("eye", eye)
    },
    dispose() {
      mesh.dispose()
      mat.dispose()
    },
  }
}
