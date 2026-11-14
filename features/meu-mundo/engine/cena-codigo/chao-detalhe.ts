// features/meu-mundo/engine/cena-codigo/chao-detalhe.ts — DETALHE no chão das cenas em código (Domínios).
//
// O chão das cenas é cor por vértice (1 material por bloco de 32 m) e de longe parece liso. Este plugin
// multiplica essa cor por uma textura de DETALHE em cinza (manchas de musgo, pedra, terra), só onde a
// superfície é chão: virada para cima e na altura do piso (o resto do bloco — árvores, pedras, paredes —
// fica igual). A paleta continua a da cena: a textura só varia o claro/escuro em volta de 1.
//
// Textura: uma do Poly Haven (CC0) estilizada pelo pipeline `MEU MUNDO 3D/pipeline/chao/estilizar.py`
// (sem a cor da foto, em níveis macios, média 0,5, sem emenda) → `public/meu-mundo/chao/v1/<domínio>.webp`.
// Lida em DUAS escalas (perto + mancha larga) pela posição no mundo: não há UV no chão e a repetição some.
// Custo: 1 textura pequena por Domínio e 2 leituras por pixel do chão; nenhuma chamada a mais.
// Enquanto a textura não chega (ou falha), o chão fica como era (sem travar a cena).

import type { Scene } from "@babylonjs/core/scene"
import type { Nullable } from "@babylonjs/core/types"
import { MaterialPluginBase } from "@babylonjs/core/Materials/materialPluginBase"
import { MaterialDefines } from "@babylonjs/core/Materials/materialDefines"
import type { Material } from "@babylonjs/core/Materials/material"
import type { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial"
import type { UniformBuffer } from "@babylonjs/core/Materials/uniformBuffer"
import type { BaseTexture } from "@babylonjs/core/Materials/Textures/baseTexture"
import { Texture } from "@babylonjs/core/Materials/Textures/texture"
import { ShaderLanguage } from "@babylonjs/core/Materials/shaderLanguage"

export interface ChaoDetalhe {
  /** Textura de detalhe (cinza, sem emenda). Pasta versionada: textura nova = `v2`. */
  tex: string
  /** Metros por repetição da escala de perto e da mancha larga. */
  perto: number
  largo: number
  /** Força (0–1): 0,3 = o chão varia ±30% em volta da cor da cena. */
  forca: number
}

/** Por Domínio (prefixo da cena). Domínio fora da lista = chão como era. */
export const CHAO_DETALHE: Readonly<Record<string, ChaoDetalhe>> = {
  // Floresta da Lua: musgo e pedra (Poly Haven `aerial_grass_rock`)
  floresta: { tex: "/meu-mundo/chao/v1/floresta.webp", perto: 6, largo: 41, forca: 0.52 },
}

const NAME = "ChaoDetalhe"
/** Chave de conferência (só desenvolvimento: `window.__mmChao(false)` = foto do "antes"). */
let ligado = true

class ChaoDefines extends MaterialDefines {
  CHAODETALHE = false
  /** Nível baixo: só a escala de perto (1 leitura por pixel em vez de 2). */
  CHAOUMA = false
}

class ChaoDetalhePlugin extends MaterialPluginBase {
  constructor(
    material: Material,
    private readonly tex: Texture,
    private readonly cfg: ChaoDetalhe,
    private readonly uma: boolean,
  ) {
    super(material, NAME, 220, new ChaoDefines())
    this._enable(true)
  }

  override prepareDefines(defines: ChaoDefines) {
    defines.CHAODETALHE = true
    defines.CHAOUMA = this.uma
  }

  override getClassName() {
    return "ChaoDetalhePlugin"
  }

  override isCompatible(lang: ShaderLanguage) {
    return lang === ShaderLanguage.GLSL
  }

  override getSamplers(samplers: string[]) {
    samplers.push("chaoTex")
  }

  override getUniforms() {
    return { ubo: [{ name: "chaoK", size: 4, type: "vec4" }], fragment: "#ifdef CHAODETALHE\nuniform vec4 chaoK;\n#endif\n" }
  }

  override bindForSubMesh(ubo: UniformBuffer) {
    const on = ligado && this.tex.isReady() ? 1 : 0
    ubo.updateFloat4("chaoK", 1 / this.cfg.perto, 1 / this.cfg.largo, this.cfg.forca, on)
    ubo.setTexture("chaoTex", this.tex)
  }

  override getActiveTextures(active: BaseTexture[]) {
    active.push(this.tex)
  }

  override hasTexture(t: BaseTexture) {
    return t === this.tex
  }

  override dispose(forceDisposeTextures?: boolean) {
    if (forceDisposeTextures) this.tex.dispose()
  }

  override getCustomCode(shaderType: string): Nullable<Record<string, string>> {
    if (shaderType !== "fragment") return null
    return {
      CUSTOM_FRAGMENT_DEFINITIONS: "#ifdef CHAODETALHE\nuniform sampler2D chaoTex;\n#endif\n",
      CUSTOM_FRAGMENT_UPDATE_DIFFUSE: `#ifdef CHAODETALHE
#ifdef NORMAL
{
  // só o chão: virado para cima e na altura do piso (lajes 3 cm acima entram; água funda e paredes não)
  float chaoM = smoothstep(0.86, 0.97, normalize(vNormalW).y) * (1.0 - smoothstep(0.12, 0.3, vPositionW.y)) * step(-0.3, vPositionW.y);
#ifdef VERTEXCOLOR
  // lajes e pedras claras do caminho quase limpas (o detalhe é da terra/musgo)
  chaoM *= 1.0 - 0.75 * smoothstep(0.5, 0.7, dot(vColor.rgb, vec3(0.299, 0.587, 0.114)));
#endif
#ifdef CHAOUMA
  float chaoD = texture2D(chaoTex, vPositionW.xz * chaoK.x).r;
#else
  float chaoD = texture2D(chaoTex, vPositionW.xz * chaoK.x).r * 0.62 + texture2D(chaoTex, vPositionW.xz * chaoK.y + vec2(0.37, 0.71)).r * 0.38;
#endif
  baseColor.rgb *= 1.0 + (chaoD - 0.5) * 2.0 * chaoK.z * chaoM * chaoK.w;
}
#endif
#endif
`,
    }
  }
}

/** Liga o detalhe no material da cena (idempotente). `uma` = nível baixo (1 leitura por pixel). */
export function aplicarChaoDetalhe(scene: Scene, material: StandardMaterial, nomeCena: string, uma = false): void {
  const cfg = CHAO_DETALHE[nomeCena.split("-")[0]]
  if (!cfg || material.pluginManager?.getPlugin(NAME)) return
  const tex = new Texture(cfg.tex, scene, { noMipmap: false, samplingMode: Texture.TRILINEAR_SAMPLINGMODE })
  tex.wrapU = Texture.WRAP_ADDRESSMODE
  tex.wrapV = Texture.WRAP_ADDRESSMODE
  tex.anisotropicFilteringLevel = 4
  new ChaoDetalhePlugin(material, tex, cfg, uma)
}

if (typeof window !== "undefined" && process.env.NODE_ENV !== "production") {
  ;(window as unknown as { __mmChao?: (on: boolean) => void }).__mmChao = (on: boolean) => {
    ligado = on
  }
}
