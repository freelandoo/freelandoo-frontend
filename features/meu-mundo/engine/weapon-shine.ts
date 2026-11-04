// features/meu-mundo/engine/weapon-shine.ts — luz própria das armas (pedido do Alex).
//
// Sem mapa de ambiente o metal não tem o que refletir e a arena ilumina pouco: as
// armas saíam foscas. A textura da arma entra também como emissão, então ela acende
// as próprias cores sem depender da luz da cena. Custa uma leitura de textura: não
// há passada extra, ao contrário do halo (GlowLayer). Arma que já traz textura de
// emissão (o neon do Lançador rosa) acende só essas peças, e elas entram no halo.
import type { TransformNode } from "@babylonjs/core/Meshes/transformNode"
import type { AbstractMesh } from "@babylonjs/core/Meshes/abstractMesh"
import { PBRMaterial } from "@babylonjs/core/Materials/PBR/pbrMaterial"
import { Color3 } from "@babylonjs/core/Maths/math.color"

const SHINE = 1

export function shineWeapon(root: TransformNode, addGlow?: (m: AbstractMesh) => void) {
  for (const mesh of root.getChildMeshes(false)) {
    const m = mesh.material
    if (!(m instanceof PBRMaterial)) continue
    if (m.emissiveTexture) {
      addGlow?.(mesh)
      continue
    }
    if (m.albedoTexture) {
      m.emissiveTexture = m.albedoTexture
      m.emissiveColor = new Color3(SHINE, SHINE, SHINE)
    } else m.emissiveColor = m.albedoColor.scale(SHINE)
  }
}
