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
  /** Superfície clara fica quase limpa (lajes do caminho). Desligar onde o chão é claro (neve, mármore). */
  limpaClaro?: boolean
  /**
   * RELEVO (fora do chão, só médio/alto): grão de rocha/casca em tudo que não é chão (pedras, troncos,
   * paredões) e, com `folha`, uma segunda textura nas superfícies de cor VIVA (copas, musgo).
   * `m` = metros por repetição; `forca` como a do chão.
   */
  relevo?: { tex: string; m: number; forca: number }
  folha?: { tex: string; m: number; forca: number }
}

/** Por Domínio (prefixo da cena). Domínio fora da lista = chão como era. */
export const CHAO_DETALHE: Readonly<Record<string, ChaoDetalhe>> = {
  // Floresta da Lua: musgo e pedra (Poly Haven `aerial_grass_rock`)
  // relevo: rocha rachada (`rock_boulder_cracked`) em pedras e troncos; folhas (`leaves_forest_ground`) nas copas
  floresta: {
    tex: "/meu-mundo/chao/v1/floresta.webp",
    perto: 6,
    largo: 41,
    forca: 0.52,
    relevo: { tex: "/meu-mundo/chao/v1/floresta-relevo.webp", m: 5, forca: 0.22 },
    folha: { tex: "/meu-mundo/chao/v1/floresta-folha.webp", m: 4.5, forca: 0.25 },
  },
  // Cânion: terra rachada (`cracked_red_ground`)
  // relevo: arenito em camadas (`cliff_side`) nas mesas, rochas e troncos
  canion: { tex: "/meu-mundo/chao/v1/canion.webp", perto: 6, largo: 43, forca: 0.5, relevo: { tex: "/meu-mundo/chao/v1/canion-relevo.webp", m: 6, forca: 0.2 } },
  // Gelo: neve com marcas (`snow_01`) — chão claro: sem a limpeza do claro, força menor
  gelo: { tex: "/meu-mundo/chao/v1/gelo.webp", perto: 7, largo: 47, forca: 0.22, limpaClaro: false },
  // Fábrica: concreto rachado (`cracked_concrete`)
  fabrica: { tex: "/meu-mundo/chao/v1/fabrica.webp", perto: 7, largo: 39, forca: 0.45 },
  // Vulcão: cinza queimada (`burned_ground_01`)
  vulcao: { tex: "/meu-mundo/chao/v1/vulcao.webp", perto: 6, largo: 37, forca: 0.5 },
  // Orbital: placas de mármore (`marble_01`) — chão claro, placas de ~2 m
  orbital: { tex: "/meu-mundo/chao/v1/orbital.webp", perto: 8, largo: 53, forca: 0.28, limpaClaro: false },
}

const NAME = "ChaoDetalhe"
/** Chave de conferência (só desenvolvimento: `window.__mmChao(false)` = foto do "antes"). */
let ligado = true

class ChaoDefines extends MaterialDefines {
  CHAODETALHE = false
  CHAOLIMPA = false
  /** Nível baixo: só a escala de perto (1 leitura por pixel em vez de 2). */
  CHAOUMA = false
  CHAORELEVO = false
  CHAOFOLHA = false
}

class ChaoDetalhePlugin extends MaterialPluginBase {
  constructor(
    material: Material,
    private readonly tex: Texture,
    private readonly cfg: ChaoDetalhe,
    private readonly uma: boolean,
    private readonly relevo: Texture | null,
    private readonly folha: Texture | null,
  ) {
    super(material, NAME, 220, new ChaoDefines())
    this._enable(true)
  }

  override prepareDefines(defines: ChaoDefines) {
    defines.CHAODETALHE = true
    defines.CHAOUMA = this.uma
    defines.CHAOLIMPA = this.cfg.limpaClaro !== false
    defines.CHAORELEVO = !!this.relevo
    defines.CHAOFOLHA = !!this.relevo && !!this.folha
  }

  override getClassName() {
    return "ChaoDetalhePlugin"
  }

  override isCompatible(lang: ShaderLanguage) {
    return lang === ShaderLanguage.GLSL
  }

  override getSamplers(samplers: string[]) {
    samplers.push("chaoTex")
    if (this.relevo) samplers.push("chaoRel")
    if (this.relevo && this.folha) samplers.push("chaoFol")
  }

  override getUniforms() {
    return {
      ubo: [
        { name: "chaoK", size: 4, type: "vec4" },
        { name: "chaoR", size: 4, type: "vec4" },
      ],
      fragment: "#ifdef CHAODETALHE\nuniform vec4 chaoK;\nuniform vec4 chaoR;\n#endif\n",
    }
  }

  override bindForSubMesh(ubo: UniformBuffer) {
    const on = ligado && this.tex.isReady() ? 1 : 0
    ubo.updateFloat4("chaoK", 1 / this.cfg.perto, 1 / this.cfg.largo, this.cfg.forca, on)
    ubo.setTexture("chaoTex", this.tex)
    const r = this.cfg.relevo, f = this.cfg.folha
    const okR = this.relevo?.isReady() ? 1 : 0, okF = this.folha?.isReady() ? 1 : 0
    ubo.updateFloat4("chaoR", r ? 1 / r.m : 1, r ? r.forca * okR : 0, f ? 1 / f.m : 1, f ? f.forca * okF : 0)
    if (this.relevo) ubo.setTexture("chaoRel", this.relevo)
    if (this.relevo && this.folha) ubo.setTexture("chaoFol", this.folha)
  }

  override getActiveTextures(active: BaseTexture[]) {
    active.push(this.tex)
    if (this.relevo) active.push(this.relevo)
    if (this.folha) active.push(this.folha)
  }

  override hasTexture(t: BaseTexture) {
    return t === this.tex || t === this.relevo || t === this.folha
  }

  override dispose() {
    // as texturas são do plugin (a mesma URL é dividida por baixo pelo cache do motor)
    this.tex.dispose()
    this.relevo?.dispose()
    this.folha?.dispose()
  }

  override getCustomCode(shaderType: string): Nullable<Record<string, string>> {
    if (shaderType !== "fragment") return null
    return {
      CUSTOM_FRAGMENT_DEFINITIONS:
        "#ifdef CHAODETALHE\nuniform sampler2D chaoTex;\n#ifdef CHAORELEVO\nuniform sampler2D chaoRel;\n#endif\n#ifdef CHAOFOLHA\nuniform sampler2D chaoFol;\n#endif\n#endif\n",
      CUSTOM_FRAGMENT_UPDATE_DIFFUSE: `#ifdef CHAODETALHE
#ifdef NORMAL
{
  // só o chão: virado para cima e na altura do piso (lajes 3 cm acima entram; água funda e paredes não)
  vec3 chaoN = normalize(vNormalW);
  float chaoM = smoothstep(0.86, 0.97, chaoN.y) * (1.0 - smoothstep(0.12, 0.3, vPositionW.y)) * step(-0.3, vPositionW.y);
#ifdef CHAORELEVO
  {
    // RELEVO: tudo que NÃO é chão. Sem UV: face deitada lê por xz; face em pé lê por (x+z, y)
    float relM = (1.0 - chaoM) * chaoK.w;
    vec2 relP = abs(chaoN.y) > 0.72 ? vPositionW.xz : vec2(vPositionW.x + vPositionW.z, vPositionW.y * 1.2);
    float relD = texture2D(chaoRel, relP * chaoR.x).r;
    float relF = chaoR.y;
#if defined(CHAOFOLHA) && defined(VERTEXCOLOR)
    // cor viva (copa, musgo) = folhagem; cor lavada (pedra, casca) = rocha
    float relMx = max(vColor.r, max(vColor.g, vColor.b));
    float relSat = (relMx - min(vColor.r, min(vColor.g, vColor.b))) / max(relMx, 0.001);
    float relL = smoothstep(0.38, 0.55, relSat);
    relD = mix(relD, texture2D(chaoFol, relP * chaoR.z).r, relL);
    relF = mix(relF, chaoR.w, relL);
#endif
    baseColor.rgb *= 1.0 + (relD - 0.5) * 2.0 * relF * relM;
  }
#endif
#if defined(VERTEXCOLOR) && defined(CHAOLIMPA)
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

/** Liga o detalhe no material (idempotente). `nome` = cena (`gelo-2`) ou id do Domínio. `uma` = nível baixo. */
export function aplicarChaoDetalhe(scene: Scene, material: StandardMaterial, nome: string, uma = false): void {
  const cfg = CHAO_DETALHE[nome.split("-")[0]]
  if (!cfg || material.pluginManager?.getPlugin(NAME)) return
  const load = (url: string) => {
    const t = new Texture(url, scene, { noMipmap: false, samplingMode: Texture.TRILINEAR_SAMPLINGMODE })
    t.wrapU = Texture.WRAP_ADDRESSMODE
    t.wrapV = Texture.WRAP_ADDRESSMODE
    t.anisotropicFilteringLevel = 4
    return t
  }
  // nível baixo: só o chão (o relevo custa 1–2 leituras a mais por pixel de parede)
  const relevo = !uma && cfg.relevo ? load(cfg.relevo.tex) : null
  const folha = relevo && cfg.folha ? load(cfg.folha.tex) : null
  new ChaoDetalhePlugin(material, load(cfg.tex), cfg, uma, relevo, folha)
}

if (typeof window !== "undefined" && process.env.NODE_ENV !== "production") {
  ;(window as unknown as { __mmChao?: (on: boolean) => void }).__mmChao = (on: boolean) => {
    ligado = on
  }
}
