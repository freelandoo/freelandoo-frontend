// features/meu-mundo/engine/char-shadows.ts — sombra REAL só dos personagens (visual premium, §14/§19).
//
// Um ShadowGenerator do lado de `QUALITY.shadows.map` (1024 no high) na luz do sol da cena. Quem
// LANÇA: o jogador e os monstros perto (lista pequena, refeita a cada ~0,2 s). O cenário só RECEBE
// (nunca lança: casa, rocha e árvore já têm a sombra/AO pintada na malha). O personagem não recebe
// (sem sombra de si mesmo = sem serrilhado no corpo).
//
// A caixa da sombra é a dos lançadores (`autoUpdateExtends`): com só o jogador e os monstros a até
// `RANGE` m, os 1024 texels cobrem poucos metros e a borda sai nítida. Quem lança perde o disco de
// contato (`Character.setContact(false)`); o resto continua com o disco suave da E2.
//
// A luz das cenas SATURA o chão (Domínio: hemisfério 1,2 + sol 0,85; rua de dia parecido): tirar só
// o sol, que é o que a sombra do Babylon faz, não escurece nada. Por isso o material de quem recebe
// ganha um plugin (`MmShadowPlugin`) que, depois das luzes, multiplica a cor por
// `mix(1, sombra, força)` — a sombra aparece com qualquer luz. Força = `STRENGTH` × (sol / 0,5),
// até `STRENGTH`: de noite (lua fraca) a sombra é mais leve.
//
// Ligado só onde o perfil manda (`QUALITY[tier].shadows.map` e `tier === "high"`): low e mid não
// criam nada. `setProfile` liga/desliga ao vivo (a rua troca de perfil no Automático).

import { ShadowGenerator } from "@babylonjs/core/Lights/Shadows/shadowGenerator"
import { MaterialPluginBase } from "@babylonjs/core/Materials/materialPluginBase"
import { MaterialDefines } from "@babylonjs/core/Materials/materialDefines"
import type { Material } from "@babylonjs/core/Materials/material"
import type { UniformBuffer } from "@babylonjs/core/Materials/uniformBuffer"
import { ShaderLanguage } from "@babylonjs/core/Materials/shaderLanguage"
import type { DirectionalLight } from "@babylonjs/core/Lights/directionalLight"
import type { AbstractMesh } from "@babylonjs/core/Meshes/abstractMesh"
import type { TransformNode } from "@babylonjs/core/Meshes/transformNode"
import type { Observer } from "@babylonjs/core/Misc/observable"
import type { Scene } from "@babylonjs/core/scene"
import { Vector3 } from "@babylonjs/core/Maths/math.vector"
import { Constants } from "@babylonjs/core/Engines/constants"
import type { QualityProfile } from "./quality"

/** Monstro mais longe que isto (m) não lança (a sombra dele quase não aparece e alargaria a caixa). */
export const SHADOW_RANGE = 16
/** Lançadores a mais além do jogador (os mais perto primeiro). */
const MAX_EXTRA = 6
/** Distância (m) do olho da luz até o jogador, contra a direção do sol. */
const EYE = 30

/** Escurecimento máximo dentro da sombra (0–1), com o sol forte. */
const STRENGTH = 0.42

class MmShadowDefines extends MaterialDefines {
  MMSHADOW = false
}

/**
 * Depois das luzes do StandardMaterial, a variável `shadow` do shader guarda a sombra da ÚLTIMA luz
 * do laço. O plugin só liga na malha que recebe e cujo sol é a última luz dela (senão o valor seria
 * de outra luz) — nos jogos aqui as luzes são [hemisfério, sol].
 */
class MmShadowPlugin extends MaterialPluginBase {
  constructor(
    material: Material,
    private readonly light: DirectionalLight,
  ) {
    super(material, "MmShadow", 220, new MmShadowDefines())
    this._enable(true)
  }

  override prepareDefines(defines: MmShadowDefines, _scene: Scene, mesh: AbstractMesh) {
    const ls = mesh.lightSources
    defines.MMSHADOW = !!mesh.receiveShadows && ls.length > 0 && ls[ls.length - 1] === this.light && !!this.light.getShadowGenerator()
  }

  override getClassName() {
    return "MmShadowPlugin"
  }

  override isCompatible(lang: ShaderLanguage) {
    return lang === ShaderLanguage.GLSL
  }

  override getUniforms() {
    return { ubo: [{ name: "mmShK", size: 1, type: "float" }], fragment: "#ifdef MMSHADOW\nuniform float mmShK;\n#endif\n" }
  }

  override bindForSubMesh(ubo: UniformBuffer) {
    ubo.updateFloat("mmShK", STRENGTH * Math.min(1, this.light.intensity / 0.5))
  }

  override getCustomCode(shaderType: string): Record<string, string> | null {
    if (shaderType !== "fragment") return null
    return { CUSTOM_FRAGMENT_BEFORE_FOG: "#ifdef MMSHADOW\ncolor.rgb *= mix(1.0, shadow, mmShK);\n#endif\n" }
  }
}

/** Quem lança: o nó do corpo + liga/desliga o disco de contato dele. */
export interface ShadowCaster {
  root: TransformNode
  x: number
  z: number
  setContact?: (on: boolean) => void
}

export interface CharShadowOptions {
  /** Esta malha recebe? (padrão: tudo que não é personagem, céu, efeito ou disco de sombra). */
  receives?: (m: AbstractMesh) => boolean
}

/** O perfil pede sombra real? (só no high, com mapa) */
export const wantsCharShadows = (q: QualityProfile) => q.tier === "high" && q.shadows.map > 0

const skip = /shadow|mm-char|mm-mob|mm-god|avatar|tag|bubble|sky|ceu|fx|portal|particul|ambiente|glow|luz|halo|aurora|astro/i

/** Padrão do "recebe": malha com luz (material iluminado), sem esqueleto, fora da lista de efeitos. */
export function isSceneryMesh(m: AbstractMesh) {
  if (m.skeleton) return false
  const mat = m.material as (AbstractMesh["material"] & { disableLighting?: boolean }) | null
  if (!mat || mat.disableLighting) return false
  if (skip.test(m.name)) return false
  // dentro de um personagem (arma, luva, peça presa ao corpo)
  for (let p = m.parent; p; p = p.parent) if (/^mm-(char|mob)/.test(p.name)) return false
  return true
}

export class CharShadows {
  private gen: ShadowGenerator | null = null
  private addObs: Observer<AbstractMesh> | null = null
  private receivers: AbstractMesh[] = []
  /** Materiais que já ganharam o plugin (um por material, vale para todas as malhas dele). */
  private plugged = new WeakSet<Material>()
  /** Malha nova ainda sem material: conferida no próximo `update`. */
  private pending: AbstractMesh[] = []
  /** Receptores marcados? Só depois da 1ª lista de lançadores (ver `arm`). */
  private armed = false
  /** Quem está sem o disco de contato agora (o corpo → como devolver o disco). */
  private contactOff = new Map<TransformNode, ((on: boolean) => void) | undefined>()
  private tick = 0
  private readonly receives: (m: AbstractMesh) => boolean

  constructor(
    private readonly scene: Scene,
    private readonly light: DirectionalLight,
    q: QualityProfile,
    opts: CharShadowOptions = {},
  ) {
    this.receives = opts.receives ?? isSceneryMesh
    this.setProfile(q)
  }

  get on() {
    return !!this.gen
  }

  /** Liga (high) ou desliga (low/mid) ao vivo. */
  setProfile(q: QualityProfile) {
    if (wantsCharShadows(q)) this.enable(q.shadows.map)
    else this.disable()
  }

  private enable(size: number) {
    if (this.gen && this.gen.getShadowMap()?.getSize().width === size) return
    this.disable()
    const g = new ShadowGenerator(size, this.light, true)
    // PCF (WebGL2) com 1 filtro médio; no WebGL1 o Babylon cai sozinho para Poisson.
    g.usePercentageCloserFiltering = true
    g.filteringQuality = ShadowGenerator.QUALITY_MEDIUM
    g.bias = 0.004
    g.normalBias = 0.02
    g.setDarkness(0)
    g.transparencyShadow = false
    const map = g.getShadowMap()
    if (map) map.refreshRate = 1
    // largura e altura da caixa = só os lançadores (nítida). A profundidade NÃO pode vir só deles:
    // o chão onde a sombra cai fica além do pé, e o que passa do plano de trás o shader dá como
    // aceso. Luz a `EYE` m do jogador e z de 1 a 2×`EYE`.
    this.light.autoUpdateExtends = true
    this.light.autoCalcShadowZBounds = false
    this.light.shadowMinZ = 1
    this.light.shadowMaxZ = EYE * 2
    this.gen = g
    this.armed = false
  }

  /**
   * Marca quem recebe. Tem de ser DEPOIS de a lista de lançadores ter alguém: o Babylon só liga o
   * define de sombra no material se a lista não estiver vazia na hora, e ela encher depois não
   * avisa o material. Material congelado (a rua congela os dela) é descongelado e congelado de
   * novo depois de um quadro, para recompilar uma vez com a sombra.
   */
  private arm() {
    this.armed = true
    this.mark(this.scene.meshes)
    this.addObs = this.scene.onNewMeshAddedObservable.add((m) => this.pending.push(m))
  }

  private mark(list: readonly AbstractMesh[]) {
    const frozen = new Set<{ unfreeze(): void; freeze(): void }>()
    let any = false
    for (const m of list) {
      if (m.isDisposed() || m.receiveShadows || !this.receives(m)) continue
      m.receiveShadows = true
      this.receivers.push(m)
      any = true
      const mats = (m.material as { subMaterials?: unknown[] } | null)?.subMaterials ?? [m.material]
      for (const mt of mats as (Material & { isFrozen?: boolean; unfreeze(): void; freeze(): void })[]) {
        if (!mt) continue
        if (mt.isFrozen) {
          mt.unfreeze()
          frozen.add(mt)
        }
        if (!this.plugged.has(mt) && mt.getClassName() === "StandardMaterial") {
          this.plugged.add(mt)
          new MmShadowPlugin(mt, this.light)
        }
      }
    }
    // o `receiveShadows` sozinho não refaz os defines de luz do material (conferido no harness)
    // (e de novo um quadro depois: no quadro em que o plugin entra a sombra do Babylon ainda não
    // aparecia nos defines — conferido no harness)
    if (any) {
      this.scene.markAllMaterialsAsDirty(Constants.MATERIAL_LightDirtyFlag)
      this.scene.onAfterRenderObservable.addOnce(() => this.scene.markAllMaterialsAsDirty(Constants.MATERIAL_LightDirtyFlag))
    }
    if (frozen.size) this.scene.onAfterRenderObservable.addOnce(() => frozen.forEach((mt) => mt.freeze()))
  }

  private disable() {
    if (this.addObs) this.scene.onNewMeshAddedObservable.remove(this.addObs)
    this.addObs = null
    for (const m of this.receivers) if (!m.isDisposed()) m.receiveShadows = false
    if (this.receivers.length && !this.scene.isDisposed) this.scene.markAllMaterialsAsDirty(Constants.MATERIAL_LightDirtyFlag)
    this.receivers = []
    this.pending = []
    this.armed = false
    for (const back of this.contactOff.values()) back?.(true)
    this.contactOff.clear()
    this.gen?.dispose()
    this.gen = null
  }

  /**
   * A cada quadro (barato: a lista só é refeita a cada 12 quadros — o corpo carrega, troca de
   * pele, monstro entra e sai). `who()` devolve o jogador e os candidatos; lançam o jogador e os
   * a até `SHADOW_RANGE` m dele (os mais perto, até `MAX_EXTRA`). A luz anda com o jogador.
   */
  update(who: () => { me: ShadowCaster | null; others: readonly ShadowCaster[] }) {
    const g = this.gen
    if (!g || this.tick++ % 12 !== 0) return
    const { me, others } = who()
    if (!me) return
    const near = others
      .map((c) => ({ c, d: Math.hypot(c.x - me.x, c.z - me.z) }))
      .filter((o) => o.d < SHADOW_RANGE)
      .sort((a, b) => a.d - b.d)
      .slice(0, MAX_EXTRA)
      .map((o) => o.c)
    const now = new Map<TransformNode, ShadowCaster>()
    for (const c of [me, ...near]) now.set(c.root, c)
    const list: AbstractMesh[] = []
    for (const c of now.values())
      for (const m of c.root.getChildMeshes(false)) {
        if (!m.isEnabled() || !m.isVisible || m.receiveShadows) continue
        const mat = m.material as (AbstractMesh["material"] & { disableLighting?: boolean }) | null
        if (!mat || mat.disableLighting || /shadow|tag|bubble/i.test(m.name)) continue
        list.push(m)
      }
    const map = g.getShadowMap()
    if (!map) return
    // A lista esvazia sozinha quando uma malha dela é descartada (o boneco provisório vira o modelo,
    // o monstro sai): material que recompilar nesse meio fica sem sombra, e o Babylon não avisa
    // quando ela volta a ter alguém. Lista mudou = defines de luz refeitos (sem recompilar se iguais).
    const old = map.renderList ?? []
    const changed = old.length !== list.length || list.some((m, i) => old[i] !== m)
    if (changed) map.renderList = list
    if (changed && this.armed && list.length) this.scene.markAllMaterialsAsDirty(Constants.MATERIAL_LightDirtyFlag)
    if (!this.armed && list.length) this.arm()
    else if (this.pending.length) {
      const fresh = this.pending
      this.pending = []
      this.mark(fresh)
    }
    const d = this.light.direction
    const k = EYE / (d.length() || 1)
    this.light.position = new Vector3(me.x - d.x * k, -d.y * k, me.z - d.z * k)
    // disco de contato: some em quem lança, volta em quem saiu
    for (const [root, back] of this.contactOff)
      if (!now.has(root)) {
        back?.(true)
        this.contactOff.delete(root)
      }
    for (const [root, c] of now)
      if (!this.contactOff.has(root)) {
        c.setContact?.(false)
        this.contactOff.set(root, c.setContact)
      }
  }

  dispose() {
    this.disable()
  }
}
