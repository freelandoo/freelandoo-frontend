// Cenário em código no aparelho (sem GLB): monta a cena pelo arquivo TS e vira malhas.
// Uma malha por bloco de 32 m + o pano de fundo, um material de cor por vértice (1 chamada por bloco).
// Kit: `kit.ts` (Geo, ruído, desgaste), `kit-cena.ts` (Cena, chão, rio, colisão, pontos e zonas),
// `kit-natureza.ts` (mesa, árvore, pedra), `kit-cidade.ts` (torre, rua). Skill `meu-mundo-cenario-codigo`.
import type { Scene } from "@babylonjs/core/scene"
import { CreateDisc } from "@babylonjs/core/Meshes/Builders/discBuilder"
import { Mesh } from "@babylonjs/core/Meshes/mesh"
import { VertexData } from "@babylonjs/core/Meshes/mesh.vertexData"
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial"
import { Color3 } from "@babylonjs/core/Maths/math.color"
import { Vector3 } from "@babylonjs/core/Maths/math.vector"
import { finishCena, type Cena } from "./kit-cena"
import { CENAS, type CenaMeta } from "./cenas"
import { acabarCena, visualDaCena } from "./acabamento"

export { CENAS, type CenaMeta, type CenaModulo } from "./cenas"
export { visualDaCena, aplicarCor, VISUAL_CENA, type VisualCena, type CorCena } from "./acabamento"
export { checkMarcas, checkWalk, blocked, inPoly, type Box2, type XZ, Cena } from "./kit-cena"

export interface CenaMontada {
  cena: Cena
  meta: CenaMeta
  meshes: ReturnType<typeof finishCena>["meshes"]
  dispose: () => void
}

/** Monta a cena registrada `nome` na `scene` (`lod` 0 = perto, 1 = longe). Devolve as malhas e as caixas (`cena.blockers`). */
export function montarCena(scene: Scene, nome: string, lod = 0, o: { low?: boolean } = {}): CenaMontada {
  const mod = CENAS[nome]
  if (!mod) throw new Error(`cena-codigo: cena não registrada: ${nome}`)
  const cena = mod.montar(lod)
  // contato/AO e tom do Domínio na cor do vértice (acabamento.ts): sem custo por quadro
  acabarCena(cena, visualDaCena(nome))
  const { meshes, material, glowMaterial } = finishCena(scene, cena, { chaoUma: !!o.low })
  return {
    cena,
    meta: mod.meta,
    meshes,
    dispose: () => {
      // o fuseGlow troca o material do bloco por uma cópia: solta cada material uma vez só
      const mats = new Set([material, glowMaterial])
      for (const m of meshes) {
        if (m.material) mats.add(m.material as typeof material)
        m.dispose(false, false)
      }
      for (const mt of mats) mt.dispose()
    },
  }
}

/**
 * O astro da cena (lua/sol): disco aceso que acompanha a câmera, sem névoa, atrás de tudo.
 * Usado pelo jogo e pela vitrine (fonte única). Devolve o `dispose`.
 */
export function astroDaCena(scene: Scene, meta: CenaMeta): () => void {
  const a = meta.astro
  if (!a) return () => {}
  const disc = CreateDisc("cena-astro", { radius: 1, tessellation: 28 }, scene)
  const halo = CreateDisc("cena-astro-halo", { radius: 1.6, tessellation: 28 }, scene)
  const mat = new StandardMaterial("cena-astro", scene)
  mat.disableLighting = true
  mat.emissiveColor = new Color3(a.cor[0], a.cor[1], a.cor[2])
  mat.fogEnabled = false
  const hm = new StandardMaterial("cena-astro-halo", scene)
  hm.disableLighting = true
  hm.emissiveColor = new Color3(a.cor[0], a.cor[1], a.cor[2])
  hm.alpha = 0.16
  hm.fogEnabled = false
  disc.material = mat
  halo.material = hm
  const l = Math.hypot(a.dir[0], a.dir[1], a.dir[2]) || 1
  const D = 280
  const off = new Vector3((a.dir[0] / l) * D, (a.dir[1] / l) * D, (a.dir[2] / l) * D)
  const size = Math.tan(a.r) * D
  for (const m of [disc, halo]) {
    m.scaling.setAll(size)
    m.billboardMode = 7
    m.isPickable = false
    m.applyFog = false
    m.infiniteDistance = true
    m.position.copyFrom(off)
  }
  halo.renderingGroupId = 0
  return () => {
    disc.dispose()
    halo.dispose()
    mat.dispose()
    hm.dispose()
  }
}

/**
 * Aurora (Mar de Gelo, cena 3): cortinas de luz verde → violeta no céu, sem névoa, que acompanham a
 * câmera. Devolve o `dispose`.
 */
export function auroraDaCena(scene: Scene, meta: CenaMeta): () => void {
  if (!meta.aurora) return () => {}
  const m = new Mesh("cena-aurora", scene)
  const p: number[] = [], col: number[] = [], idx: number[] = []
  const curtains = [[-0.9, 260, 70], [-0.2, 270, 85], [0.55, 255, 75]] as const
  for (const [a0, D, y0] of curtains) {
    const base = p.length / 3
    const n = 26
    for (let i = 0; i <= n; i++) {
      const a = a0 + (i / n) * 1.1
      const wav = Math.sin(i * 0.7 + a0 * 3) * 18
      const x = Math.sin(a) * (D + wav), z = Math.cos(a) * (D + wav)
      const h = 55 + Math.sin(i * 0.45 + a0) * 20
      p.push(x, y0, z, x, y0 + h, z)
      col.push(0.35, 1, 0.6, 0.55, 0.7, 0.4, 1, 0)
    }
    for (let i = 0; i < n; i++) {
      const k = base + i * 2
      idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2, k, k + 2, k + 1, k + 1, k + 2, k + 3)
    }
  }
  const vd = new VertexData()
  vd.positions = p
  vd.colors = col
  vd.indices = idx
  vd.applyToMesh(m)
  const mat = new StandardMaterial("cena-aurora", scene)
  mat.disableLighting = true
  mat.emissiveColor = new Color3(1, 1, 1)
  mat.backFaceCulling = false
  mat.fogEnabled = false
  mat.alpha = 0.99
  m.hasVertexAlpha = true
  m.material = mat
  m.applyFog = false
  m.infiniteDistance = true
  m.isPickable = false
  return () => {
    m.dispose()
    mat.dispose()
  }
}
