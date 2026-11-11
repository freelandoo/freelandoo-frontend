// features/meu-mundo/engine/steampunk/glow-fuse.ts — V3 chamadas de desenho: corpo + brilho numa malha só.
//
// As peças do steampunk saem em DUAS malhas: o corpo (acabamento iluminado, `sp-trim*`) e o
// brilho (cor do vértice sem luz, `sp-glow*`). Cada molde custava 2 chamadas de desenho, e o
// Jetpack tinha ~11 pares por quadro (55–70 chamadas, orçamento do `low` = 40).
//
// `fuseGlow` junta as duas geometrias no corpo, marca os vértices do brilho no atributo
// `glowFlag` e troca o material por uma cópia do acabamento com um plugin: onde a marca é 1, a
// cor final vira `clamp(emissiva do material de brilho) × cor do vértice` — exatamente o que o
// material de brilho desenhava (sem luz, sem textura, diffuse preto). A emissiva é lida do
// material de brilho A CADA QUADRO: quem pisca o brilho mexendo nele continua mandando.
// Névoa e tratamento de imagem vêm depois, iguais para os dois.
//
// Só WebGL (GLSL). Peça com LOD não é juntada (as versões de longe não têm o brilho).

import type { Scene } from "@babylonjs/core/scene"
import type { Mesh } from "@babylonjs/core/Meshes/mesh"
import { VertexData } from "@babylonjs/core/Meshes/mesh.vertexData"
import { MaterialPluginBase } from "@babylonjs/core/Materials/materialPluginBase"
import { MaterialDefines } from "@babylonjs/core/Materials/materialDefines"
import type { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial"
import type { UniformBuffer } from "@babylonjs/core/Materials/uniformBuffer"
import type { Material } from "@babylonjs/core/Materials/material"
import { ShaderLanguage } from "@babylonjs/core/Materials/shaderLanguage"

const ATTR = "glowFlag"
const TEX_SLOTS = ["diffuseTexture", "ambientTexture", "opacityTexture", "reflectionTexture", "emissiveTexture", "specularTexture", "bumpTexture", "lightmapTexture", "refractionTexture"] as const

class GlowFuseDefines extends MaterialDefines {
  GLOWFUSE = false
}

class GlowFusePlugin extends MaterialPluginBase {
  constructor(
    material: Material,
    private readonly glow: StandardMaterial,
  ) {
    super(material, "GlowFuse", 210, new GlowFuseDefines())
    this._enable(true)
  }

  override prepareDefines(defines: GlowFuseDefines) {
    defines.GLOWFUSE = true
  }

  override getClassName() {
    return "GlowFusePlugin"
  }

  override isCompatible(lang: ShaderLanguage) {
    return lang === ShaderLanguage.GLSL
  }

  override getAttributes(attributes: string[]) {
    attributes.push(ATTR)
  }

  override getUniforms() {
    return { ubo: [{ name: "glowK", size: 3, type: "vec3" }], fragment: "#ifdef GLOWFUSE\nuniform vec3 glowK;\n#endif\n" }
  }

  override bindForSubMesh(ubo: UniformBuffer) {
    const e = this.glow.emissiveColor
    ubo.updateFloat3("glowK", Math.min(1, e.r), Math.min(1, e.g), Math.min(1, e.b))
  }

  override getCustomCode(shaderType: string): Record<string, string> {
    if (shaderType === "vertex") {
      return {
        CUSTOM_VERTEX_DEFINITIONS: `#ifdef GLOWFUSE\nattribute float ${ATTR};\nvarying float vGlowFlag;\n#endif\n`,
        CUSTOM_VERTEX_MAIN_BEGIN: `#ifdef GLOWFUSE\nvGlowFlag = ${ATTR};\n#endif\n`,
      }
    }
    return {
      CUSTOM_FRAGMENT_DEFINITIONS: "#ifdef GLOWFUSE\nvarying float vGlowFlag;\n#endif\n",
      CUSTOM_FRAGMENT_BEFORE_FOG: "#if defined(GLOWFUSE) && defined(VERTEXCOLOR)\ncolor.rgb = mix(color.rgb, glowK * vColor.rgb, step(0.5, vGlowFlag));\n#endif\n",
    }
  }
}

/** Um material juntado por par (acabamento, brilho) e por cena. */
const fused = new WeakMap<Scene, Map<StandardMaterial, Map<StandardMaterial, StandardMaterial>>>()

function fusedMaterial(scene: Scene, trim: StandardMaterial, glow: StandardMaterial) {
  let byTrim = fused.get(scene)
  if (!byTrim) fused.set(scene, (byTrim = new Map()))
  let byGlow = byTrim.get(trim)
  if (!byGlow) byTrim.set(trim, (byGlow = new Map()))
  let m = byGlow.get(glow)
  if (!m) {
    const made = trim.clone(`${trim.name}+${glow.name}`)
    made.unfreeze()
    // o clone copia as texturas, e a cópia de uma DynamicTexture (o acabamento desenhado em
    // canvas) nunca fica pronta: a malha sumia. A cópia usa as MESMAS texturas do acabamento.
    for (const k of TEX_SLOTS) {
      const own = made[k]
      if (own && own !== trim[k]) own.dispose()
      made[k] = trim[k]
    }
    new GlowFusePlugin(made, glow)
    // o acabamento ou o brilho morreu com a fase: a cópia vai junto
    let gone = false
    const drop = () => {
      if (gone) return
      gone = true
      made.dispose()
      byGlow!.delete(glow)
    }
    trim.onDisposeObservable.addOnce(drop)
    glow.onDisposeObservable.addOnce(drop)
    byGlow.set(glow, made)
    m = made
  }
  return m
}

const extract = (m: Mesh) => {
  const vd = VertexData.ExtractFromMesh(m, true, true)
  const n = (vd.positions?.length ?? 0) / 3
  if (!vd.uvs) vd.uvs = new Array(n * 2).fill(0.5)
  if (!vd.colors) vd.colors = new Array(n * 4).fill(1)
  else if (vd.colors.length === n * 3) {
    const c4: number[] = []
    for (let i = 0; i < n; i++) c4.push(vd.colors[i * 3], vd.colors[i * 3 + 1], vd.colors[i * 3 + 2], 1)
    vd.colors = c4
  }
  vd.uvs2 = vd.tangents = vd.matricesIndices = vd.matricesWeights = null
  return { vd, n }
}

/**
 * Junta `glow` dentro de `body` (o brilho é descartado) e devolve o corpo. Sem brilho, com
 * material que não seja StandardMaterial ou com LOD: devolve o corpo como está.
 */
export function fuseGlow(body: Mesh, glow: Mesh | null): Mesh {
  if (!glow) return body
  const trim = body.material as StandardMaterial | null
  const glowMat = glow.material as StandardMaterial | null
  if (!trim || !glowMat || trim.getClassName() !== "StandardMaterial" || glowMat.getClassName() !== "StandardMaterial") return body
  if (body.hasLODLevels || glow.hasLODLevels) return body
  const engine = body.getScene().getEngine()
  if (engine.isWebGPU) return body
  // os dois no mesmo espaço: o brilho é passado para o espaço do corpo
  glow.computeWorldMatrix(true)
  body.computeWorldMatrix(true)
  const g = extract(glow)
  const rel = glow.getWorldMatrix().multiply(body.getWorldMatrix().clone().invert())
  g.vd.transform(rel)
  const b = extract(body)
  b.vd.merge(g.vd, true)
  const flags = new Float32Array(b.n + g.n)
  flags.fill(1, b.n)
  b.vd.applyToMesh(body, false)
  body.setVerticesData(ATTR, flags, false, 1)
  body.useVertexColors = true
  body.material = fusedMaterial(body.getScene(), trim, glowMat)
  glow.dispose()
  return body
}

/** Para o teste por fora: o atributo existe e conta os vértices do brilho. */
export function glowVertexCount(m: Mesh) {
  const d = m.getVerticesData(ATTR)
  if (!d) return 0
  let n = 0
  for (let i = 0; i < d.length; i++) if (d[i] > 0.5) n++
  return n
}
