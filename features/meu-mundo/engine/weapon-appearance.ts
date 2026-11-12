// Aparência do equipamento congelada pelo servidor no ticket da luta.
// Reutiliza o GLB, a pegada e o esqueleto da classe. As guarnições são malhas
// pequenas, sem luz/partículas próprias; o brilho usa a GlowLayer já existente.
import type { Scene } from "@babylonjs/core/scene"
import { TransformNode } from "@babylonjs/core/Meshes/transformNode"
import type { Mesh } from "@babylonjs/core/Meshes/mesh"
import { CreateBox } from "@babylonjs/core/Meshes/Builders/boxBuilder"
import { CreateCylinder } from "@babylonjs/core/Meshes/Builders/cylinderBuilder"
import { CreateSphere } from "@babylonjs/core/Meshes/Builders/sphereBuilder"
import { CreateTorus } from "@babylonjs/core/Meshes/Builders/torusBuilder"
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial"
import { PBRMaterial } from "@babylonjs/core/Materials/PBR/pbrMaterial"
import type { Material } from "@babylonjs/core/Materials/material"
import { Color3 } from "@babylonjs/core/Maths/math.color"
import type { Clan } from "../classes"
import type { VfxColor } from "./vfx"
import { shopSword } from "./shop-swords"

export interface WeaponAppearance {
  weaponId: string | null
  shieldId?: string | null
  level: number
  cosmetic: string | null
  /** Trilha E14: arma desperta — o deus/Domínio da arma (cor do brilho); ausente = não desperta. */
  awakened?: string | null
}

/** E14: cor do Despertar por deus da arma (arma sem deus = éter). */
const AWAKEN_COLOR: Record<string, string> = {
  aurion: "#FFC23A", morkhan: "#E0263C", maru: "#3FC8FF", kragor: "#FF6A1F", zephyra: "#8CF5C8",
  iris: "#FF7BE5", noctis: "#9B6BFF", aeryn: "#E8B25A", bastor: "#C98A4B", aether: "#47E2DA",
}

/**
 * E14: arma DESPERTA acende na cor do deus dela. Orçamento do `low`: só o emissivo nos materiais
 * clonados desta arma (nenhuma malha, luz ou partícula nova); fora do low, as malhas entram na
 * GlowLayer que a luta já tem. Devolve o descarte dos materiais clonados.
 */
export function awakenWeapon(weapon: TransformNode, domain: string, low: boolean, addGlow: (mesh: Mesh) => void) {
  const color = Color3.FromHexString(AWAKEN_COLOR[domain] ?? AWAKEN_COLOR.aether)
  const made: Material[] = []
  for (const mesh of weapon.getChildMeshes(false)) {
    const source = mesh.material
    if (!source) continue
    const mat = source.clone(`${source.name}-awake`)
    if (!mat) continue
    if (mat instanceof PBRMaterial || mat instanceof StandardMaterial) mat.emissiveColor = color.scale(low ? 0.32 : 0.45)
    mesh.material = mat
    made.push(mat)
    if (!low && mesh.getTotalVertices() > 0) addGlow(mesh as Mesh)
  }
  return () => { for (const mat of made) mat.dispose(false, false) }
}

type Tier = "apprentice" | "brass" | "ether" | "solar"
const TIERS: Record<string, Tier> = {
  espada_aprendiz: "apprentice", cajado_aprendiz: "apprentice",
  espada_latao: "brass", cajado_latao: "brass",
  espada_eter: "ether", cajado_eter: "ether",
  espada_solar: "solar", cajado_solar: "solar",
  // trilha E8: o Cajado dos Moldes (arma de linha de Bastor) usa o cajado solar até ter modelo próprio
  linha_cajado_moldes: "solar",
}
const PALETTES: Record<Tier, { metal: string; main: string; edge: string }> = {
  apprentice: { metal: "#918572", main: "#DDBA6F", edge: "#F7DDA0" },
  brass: { metal: "#C69A37", main: "#F4B84A", edge: "#FFE5A0" },
  ether: { metal: "#667B94", main: "#47E2DA", edge: "#B177FF" },
  solar: { metal: "#E7AD32", main: "#FFB83D", edge: "#FFF0A3" },
}

/** Lista fechada: um ID de outra classe nunca troca o modelo ou a pegada. */
export function weaponAppearanceProfile(clan: Clan, appearance: WeaponAppearance) {
  const prefix = clan === "raposa" ? "cajado_" : "espada_"
  const id = appearance.weaponId ?? ""
  const tier = id.startsWith(prefix) || (clan === "raposa" && id === "linha_cajado_moldes") ? TIERS[id] ?? "apprentice" : "apprentice"
  const level = Number.isFinite(appearance.level) ? Math.max(0, Math.min(10, Math.floor(appearance.level))) : 0
  const paint = appearance.cosmetic === "pintura_arma_eter"
  const trail = appearance.cosmetic === "rastro_eter"
  const palette = PALETTES[tier]
  // Espada da loja: modelo e cor próprios, sem as guarnições da arma da classe.
  const model = clan === "vampiro" ? shopSword(id) : null
  const color: VfxColor = {
    main: Color3.FromHexString(paint || trail ? "#47E2DA" : model?.main ?? palette.main),
    edge: Color3.FromHexString(paint || trail ? "#B177FF" : model?.edge ?? palette.edge),
  }
  return { tier, level, paint, trail, palette, color, model }
}

export function decorateWeapon(
  scene: Scene,
  weapon: TransformNode,
  clan: Clan,
  appearance: WeaponAppearance,
  low: boolean,
  addGlow: (mesh: Mesh) => void,
) {
  const profile = weaponAppearanceProfile(clan, appearance)
  const { tier, level, paint, palette, color, model } = profile
  const root = new TransformNode("gear-weapon-trim", scene)
  root.parent = weapon
  const materials: Material[] = []
  // O material é clonado para esta arma; preserva textura e não tinge avatares.
  for (const mesh of weapon.getChildMeshes(false).filter((m) => m.parent !== root)) {
    const source = mesh.material
    // Sem mapa de ambiente, metal puro não tem o que refletir e sai preto. O
    // material é só desta arma (cada luta carrega o seu).
    if (model && source instanceof PBRMaterial) source.metallic = 0.25
    if (!source || (!paint && (model || (tier === "apprentice" && !level)))) continue
    const mat = source.clone(`${source.name}-gear`)
    if (!mat) continue
    const tint = Color3.FromHexString(paint ? "#72DED8" : palette.metal)
    if (mat instanceof PBRMaterial) {
      mat.albedoColor = Color3.Lerp(mat.albedoColor, tint, paint ? 0.72 : 0.38)
      mat.emissiveColor = color.main.scale(level * 0.008)
    } else if (mat instanceof StandardMaterial) {
      mat.diffuseColor = Color3.Lerp(mat.diffuseColor, tint, paint ? 0.72 : 0.38)
      mat.emissiveColor = color.main.scale(level * 0.008)
    }
    mesh.material = mat
    materials.push(mat)
  }
  const metal = new StandardMaterial("gear-trim-metal", scene)
  metal.diffuseColor = Color3.FromHexString(paint ? "#568C93" : palette.metal)
  metal.specularColor = new Color3(0.65, 0.6, 0.48)
  metal.specularPower = 64
  const light = new StandardMaterial("gear-trim-light", scene)
  light.diffuseColor = color.main
  light.emissiveColor = color.main.scale((low ? 0.34 : 0.42) + level * 0.025)
  light.specularColor = Color3.Black()
  materials.push(metal, light)
  const attach = (mesh: Mesh, y: number, luminous = false) => {
    mesh.parent = root
    mesh.position.y = y
    mesh.material = luminous ? light : metal
    mesh.isPickable = false
    if (luminous && !low) addGlow(mesh)
    return mesh
  }
  const staff = clan === "raposa"
  const head = staff ? 0.82 : 0.24
  const ring = (y: number, diameter: number, luminous = false) => attach(
    CreateTorus("gear-trim-ring", { diameter, thickness: luminous ? 0.016 : 0.026, tessellation: low ? 8 : 12 }, scene), y, luminous,
  )
  if (tier !== "apprentice") {
    for (const y of staff ? [0.25, 0.45, 0.6] : [0.16, 0.23]) {
      attach(CreateCylinder("gear-trim-collar", { height: 0.035, diameter: staff ? 0.12 : 0.16, tessellation: 8 }, scene), y)
    }
  }
  if (tier === "brass") {
    ring(head, staff ? 0.36 : 0.24)
    attach(CreateSphere("gear-brass-seal", { diameter: 0.09, segments: 4 }, scene), head, true).position.z = 0.09
  }
  if (tier === "ether" || tier === "solar") {
    const halo = ring(head, staff ? 0.48 : 0.3, true)
    halo.rotation.x = Math.PI / 2
    if (!low) ring(head + 0.09, staff ? 0.27 : 0.2)
    for (const side of [-1, 1]) {
      const fin = attach(CreateBox("gear-trim-fin", { width: 0.045, height: staff ? 0.32 : 0.25, depth: 0.045 }, scene), head + 0.04)
      fin.position.x = side * (staff ? 0.17 : 0.14)
      fin.rotation.z = side * 0.32
    }
  }
  if (tier === "solar") {
    const count = low ? 6 : 8
    for (let i = 0; i < count; i++) {
      const angle = i * Math.PI * 2 / count
      const ray = attach(CreateBox("gear-solar-ray", { width: 0.025, height: 0.11, depth: 0.025 }, scene), head, true)
      ray.position.x = Math.sin(angle) * (staff ? 0.27 : 0.18)
      ray.position.y += Math.cos(angle) * (staff ? 0.27 : 0.18)
      ray.rotation.z = -angle
    }
  }
  // Marcas de têmpera crescem com o refino, sem mudar alcance ou colisão.
  const marks = model ? 0 : Math.min(low ? 3 : 5, Math.ceil(level / 2))
  for (let i = 0; i < marks; i++) {
    const mark = attach(CreateBox("gear-refinement-mark", { width: staff ? 0.08 : 0.055, height: 0.018, depth: 0.018 }, scene), (staff ? 0.14 : 0.4) + i * 0.085, true)
    mark.position.z = staff ? 0.07 : 0.045
  }
  if (paint) ring(staff ? 0.56 : 0.2, staff ? 0.17 : 0.22, true)
  let disposed = false
  return {
    profile,
    dispose() {
      if (disposed) return
      disposed = true
      root.dispose(false, false)
      for (const mat of materials) mat.dispose(false, false)
    },
  }
}
