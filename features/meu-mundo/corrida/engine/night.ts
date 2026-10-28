// features/meu-mundo/corrida/engine/night.ts — CORRIDA À NOITE (mm3d-41): luz feita no shader.
//
// Dois plugins de material, sem textura nenhuma e sem passada extra (o custo é
// algumas contas por pixel):
//  - `WindowsPlugin`, nos prédios (caixa unitária com instâncias finas): a
//    grade de janelas sai da posição LOCAL da caixa vezes a escala da
//    instância (cada fachada tem janelas de 3 × 3,6 m, nunca esticadas); cada
//    janela acende ou não por um sorteio fixo (prédio + andar + coluna), em
//    três cores; um em cada quatro prédios ganha uma faixa de neon no topo.
//  - `GridPlugin`, no chão lá embaixo: linhas de neon a cada 20 m, mais
//    largas e mais fracas ao longe (sem cintilar), e a neblina por cima.
// Tudo entra antes da neblina, então o longe some no roxo como o resto.

import type { Material } from "@babylonjs/core/Materials/material"
import type { MaterialDefines } from "@babylonjs/core/Materials/materialDefines"
import { MaterialPluginBase } from "@babylonjs/core/Materials/materialPluginBase"
import type { UniformBuffer } from "@babylonjs/core/Materials/uniformBuffer"
import { Color3 } from "@babylonjs/core/Maths/math.color"

const HASH = "float mmNightHash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }"

export class WindowsPlugin extends MaterialPluginBase {
  /** Força das janelas acesas. */
  bright = 1.25

  constructor(material: Material) {
    super(material, "MmWindows", 200, { MMWINDOWS: false })
    this._enable(true)
  }

  getClassName() {
    return "MmWindowsPlugin"
  }

  prepareDefines(defines: MaterialDefines) {
    defines["MMWINDOWS"] = true
  }

  getUniforms() {
    return {
      ubo: [{ name: "mmWinBright", size: 1, type: "float" }],
      fragment: "uniform float mmWinBright;",
    }
  }

  bindForSubMesh(ubo: UniformBuffer) {
    ubo.updateFloat("mmWinBright", this.bright)
  }

  getCustomCode(shaderType: string): { [pointName: string]: string } | null {
    const varyings = "varying vec3 mmWinP;\nvarying vec3 mmWinN;\nvarying vec2 mmWinS;"
    if (shaderType === "vertex") {
      return {
        CUSTOM_VERTEX_DEFINITIONS: varyings,
        // escala da instância (a caixa é unitária) e um sorteio pelo lugar do prédio
        CUSTOM_VERTEX_MAIN_END: `
          vec3 mmSc = vec3(length(finalWorld[0].xyz), length(finalWorld[1].xyz), length(finalWorld[2].xyz));
          mmWinP = positionUpdated * mmSc;
          mmWinN = normal;
          mmWinS = vec2(fract(sin(dot(finalWorld[3].xz, vec2(12.9898, 78.233))) * 43758.5453), mmSc.y);`,
      }
    }
    if (shaderType === "fragment") {
      return {
        CUSTOM_FRAGMENT_DEFINITIONS: varyings + "\n" + HASH,
        CUSTOM_FRAGMENT_BEFORE_FOG: `
          if (abs(mmWinN.y) < 0.5) {
            float mmU = abs(mmWinN.x) > 0.5 ? mmWinP.z : mmWinP.x;
            vec2 mmCell = vec2(mmU / 3.0, mmWinP.y / 3.6);
            vec2 mmId = floor(mmCell);
            vec2 mmF = fract(mmCell);
            float mmWin = step(0.2, mmF.x) * step(mmF.x, 0.8) * step(0.28, mmF.y) * step(mmF.y, 0.74);
            float mmH = mmNightHash(mmId + vec2(mmWinS.x * 97.0, (mmWinN.x + mmWinN.z * 3.0) * 13.0));
            float mmLit = step(0.56, mmH) * mmWin * step(1.0, mmId.y);
            vec3 mmCol = mmH > 0.93 ? vec3(0.35, 0.85, 1.0) : (mmH > 0.86 ? vec3(1.0, 0.3, 0.8) : vec3(1.0, 0.74, 0.42));
            color.rgb += mmCol * mmLit * mmWinBright * (0.55 + 0.45 * fract(mmH * 7.0));
            // coroa de neon: um em cada quatro prédios
            float mmTop = step(mmWinS.y - 1.2, mmWinP.y) * step(0.75, mmWinS.x);
            vec3 mmNeon = fract(mmWinS.x * 13.0) > 0.5 ? vec3(1.0, 0.25, 0.75) : vec3(0.3, 0.9, 1.0);
            color.rgb += mmNeon * mmTop * 1.3;
          }`,
      }
    }
    return null
  }
}

export class GridPlugin extends MaterialPluginBase {
  color = new Color3(0.85, 0.2, 0.95)
  /** Distância entre as linhas (m). */
  cell = 20

  constructor(material: Material) {
    super(material, "MmGrid", 200, { MMGRID: false })
    this._enable(true)
  }

  getClassName() {
    return "MmGridPlugin"
  }

  prepareDefines(defines: MaterialDefines) {
    defines["MMGRID"] = true
  }

  getUniforms() {
    return {
      ubo: [{ name: "mmGrid", size: 4, type: "vec4" }],
      fragment: "uniform vec4 mmGrid;",
    }
  }

  bindForSubMesh(ubo: UniformBuffer) {
    ubo.updateFloat4("mmGrid", this.color.r, this.color.g, this.color.b, this.cell)
  }

  getCustomCode(shaderType: string): { [pointName: string]: string } | null {
    if (shaderType !== "fragment") return null
    return {
      CUSTOM_FRAGMENT_BEFORE_FOG: `{
        float mmD = length(vPositionW - vEyePosition.xyz);
        vec2 mmG = abs(fract(vPositionW.xz / mmGrid.w - 0.5) - 0.5) * mmGrid.w;
        float mmW = 0.12 + mmD * 0.004;
        float mmLine = 1.0 - smoothstep(mmW * 0.4, mmW, min(mmG.x, mmG.y));
        color.rgb += mmGrid.rgb * mmLine * (1.0 - 0.75 * smoothstep(200.0, 700.0, mmD));
      }`,
    }
  }
}
