// features/meu-mundo/laminas/engine/climax-pass.ts — o clímax do Poder Máximo (apresentação 09, 2026-11-11).
//
// Cores deslocadas (vermelho para fora, azul para dentro) + borrão radial do centro para fora,
// num passe só de tela inteira. É CARO, então só fica ligado na janela do clímax (≤ 0,4 s):
// compilado e com o alvo de desenho criado no warm (tela de versus), preso à câmera só durante
// a janela e solto em seguida. Nos outros quadros a luta não paga nada por ele.
// No nível `low` ele não existe: abilities/cinema-fx.ts `climaxStreaks` imita com dois planos.

import type { Camera } from "@babylonjs/core/Cameras/camera"
import type { AbstractEngine } from "@babylonjs/core/Engines/abstractEngine"
import { Effect } from "@babylonjs/core/Materials/effect"
import { PostProcess } from "@babylonjs/core/PostProcesses/postProcess"

Effect.ShadersStore["mmClimaxFragmentShader"] = `
precision highp float;
varying vec2 vUV;
uniform sampler2D textureSampler;
uniform float uK;
uniform vec2 uC;
void main(void) {
  vec2 d = vUV - uC;
  vec3 acc = vec3(0.0);
  for (int i = 0; i < 6; i++) {
    float s = 1.0 - uK * 0.075 * float(i) / 5.0;
    acc.r += texture2D(textureSampler, uC + d * (s + uK * 0.034)).r;
    acc.g += texture2D(textureSampler, uC + d * s).g;
    acc.b += texture2D(textureSampler, uC + d * (s - uK * 0.034)).b;
  }
  vec3 c = acc / 6.0;
  // o miolo estoura um pouco: a luz do golpe
  float core = 1.0 - smoothstep(0.0, 0.35, length(d));
  gl_FragColor = vec4(c + core * uK * 0.18, 1.0);
}
`

export interface ClimaxPass {
  /** Compila e cria o alvo agora (chamar com a tela de versus aberta). */
  warm: () => void
  /** Liga por `ms` com centro (u, v) em 0–1 da tela (v para cima). */
  play: (u: number, v: number, ms: number) => void
  /** A cada quadro, com o tempo real. */
  tick: (realDt: number) => void
  readonly on: boolean
  dispose: () => void
}

export function createClimaxPass(camera: Camera, engine: AbstractEngine): ClimaxPass {
  let pp: PostProcess | null = null
  let attached = false
  let left = 0
  let dur = 1
  let k = 0
  let cu = 0.5
  let cv = 0.5
  let warming = 0
  const make = () => {
    if (pp) return pp
    pp = new PostProcess("mm-climax", "mmClimax", ["uK", "uC"], null, 1, null, undefined, engine)
    pp.onApply = (e) => {
      e.setFloat("uK", k)
      e.setFloat2("uC", cu, cv)
    }
    return pp
  }
  const attach = (want: boolean) => {
    if (!pp || want === attached) return
    if (want) camera.attachPostProcess(pp)
    else camera.detachPostProcess(pp)
    attached = want
  }
  return {
    warm() {
      make()
      // dois quadros presos com força zero: o shader compila e o alvo de desenho nasce agora,
      // não no meio do golpe
      k = 0
      attach(true)
      warming = 2
    },
    play(u, v, ms) {
      make()
      cu = u
      cv = v
      dur = left = Math.max(0.05, ms / 1000)
      warming = 0
      attach(true)
    },
    tick(realDt) {
      if (warming > 0) {
        if (--warming === 0 && left <= 0) attach(false)
        return
      }
      if (left <= 0) return
      left -= realDt
      const u = 1 - Math.max(0, left) / dur
      // entra em 15% da janela e solta até o fim
      k = u < 0.15 ? u / 0.15 : 1 - (u - 0.15) / 0.85
      if (left <= 0) {
        k = 0
        attach(false)
      }
    },
    get on() {
      return attached && left > 0
    },
    dispose() {
      attach(false)
      pp?.dispose()
      pp = null
    },
  }
}
