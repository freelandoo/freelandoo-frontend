// features/meu-mundo/laminas/engine/domain-stage.ts — os PALCOS DE LUTA dos Domínios (lore v2 D1).
//
// Mesmo contrato do street-view.ts: o fundo da luta é cenário próprio (um ambiente
// 3D por vez), nada colide (quem prende a luta no círculo é a regra, sim/fight.ts) e
// nada fica dentro do círculo ARENA_R. Montado SÓ com as peças do kit do tema (a
// Floresta da Lua = as peças do Jetpack): palco novo é arranjo novo, não modelo novo.
// Repetido = instância (uma chamada por peça), o chão é uma malha só.
//
// Três palcos por Domínio (decisão do Alex, 10/11):
//  • "entrada": clareira na boca da mata — cogumelos, flores e lanternas em volta,
//    o arco de raízes atrás de quem chega, árvores em anel.
//  • "fundo": setores fundos — mata fechada, troncos caídos, ninhos, cristais
//    acesos; as árvores mais perto e mais altas.
//  • "palacio": o setor do guardião e do deus — colunata de arcos de raízes em
//    volta do círculo, coroa de cristais e as ilhas da floresta no alto.

import type { Scene } from "@babylonjs/core/scene"
import { CreateTorus } from "@babylonjs/core/Meshes/Builders/torusBuilder"
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial"
import { Color3 } from "@babylonjs/core/Maths/math.color"
import type { HemisphericLight } from "@babylonjs/core/Lights/hemisphericLight"
import type { DirectionalLight } from "@babylonjs/core/Lights/directionalLight"
import { ARENA_R } from "../sim/fight"
import { KitPlacer, LOOKS, applyDomainLook, loadDomainKit, paintedGround, seeded, type DomainKitId, type DomainSpot, type KitPiece } from "../../dominio/engine/domain-kit"
import type { ArenaView } from "./arena-view"

export interface DomainStageSpec {
  kit: DomainKitId
  spot: DomainSpot
}

/** Anel em volta do círculo: [peça, raio, altura, quantas, deslocamento do ângulo]. */
type Ring = [KitPiece, number, number, number, number]

const RINGS: Record<DomainSpot, Ring[]> = {
  entrada: [
    ["cogumelo", ARENA_R + 3.2, 3.2, 7, 0.2],
    ["flor", ARENA_R + 2.2, 1.6, 9, 0.55],
    ["lanterna", ARENA_R + 1.6, 1.5, 6, 0],
    ["planta", ARENA_R + 4.6, 2.6, 8, 0.35],
    ["arvore", ARENA_R + 17, 24, 9, 0.1],
    ["arvore2", ARENA_R + 25, 28, 7, 0.45],
  ],
  fundo: [
    ["tronco-caido", ARENA_R + 3, 1.6, 5, 0.3],
    ["ninho", ARENA_R + 2.4, 1.4, 4, 0.8],
    ["cristais", ARENA_R + 2.8, 2.4, 6, 0.05],
    ["planta", ARENA_R + 4, 3, 7, 0.5],
    ["cogumelo-casa", ARENA_R + 7.5, 6, 4, 0.15],
    ["arvore", ARENA_R + 16, 22, 11, 0.6],
    ["arvore2", ARENA_R + 24, 26, 9, 0.25],
  ],
  palacio: [
    ["cristais", ARENA_R + 1.8, 2.8, 10, 0],
    ["lanterna", ARENA_R + 2.6, 1.8, 10, 0.5],
    ["cogumelo", ARENA_R + 9, 5, 6, 0.35],
    ["arvore", ARENA_R + 21, 28, 10, 0.2],
  ],
}

/** Monta o palco do Domínio na cena da luta. Luzes: "mm-hemi"/"mm-sun" (achadas pelo nome). */
export function buildDomainStage(scene: Scene, low: boolean, spec: DomainStageSpec): ArenaView {
  let disposed = false
  const look = LOOKS[spec.kit] ?? LOOKS.floresta
  const sky = applyDomainLook(scene, look, scene.getLightByName("mm-hemi") as HemisphericLight | null, scene.getLightByName("mm-sun") as DirectionalLight | null)
  const ground = paintedGround(scene, `dom-stage-${spec.spot}`, look, 170, 170, 0, 0, 0, 6, spec.spot === "palacio" ? 23 : spec.spot === "fundo" ? 17 : 11)
  // a borda do círculo: filete aceso na cor do tema (a regra prende a luta nele)
  const ringMat = new StandardMaterial("dom-stage-ring", scene)
  ringMat.emissiveColor = Color3.FromHexString(look.ground.glow).scale(0.85)
  ringMat.diffuseColor = new Color3(0, 0, 0)
  ringMat.disableLighting = true
  const ring = CreateTorus("dom-stage-ring", { diameter: 2 * (ARENA_R + 0.35), thickness: 0.09, tessellation: 64 }, scene)
  ring.position.y = 0.03
  ring.material = ringMat
  ring.isPickable = false
  ring.freezeWorldMatrix()
  ringMat.freeze()

  let placer: KitPlacer | null = null
  let dropKit: (() => void) | null = null
  // no low: menos peças por anel e sem o anel de árvores de fora (a névoa já fecha)
  const rings = RINGS[spec.spot]
  const far = Math.max(...rings.map((x) => x[1]))
  const used = rings.filter((x) => !(low && rings.length > 3 && x[1] === far))
  // só os arquivos das peças deste palco (cada arquivo é uma textura a mais na luta)
  // o arco tem textura de 1024: no low só o palácio (a colunata é a cara dele) o carrega
  const arch = spec.spot === "palacio" || (spec.spot === "entrada" && !low)
  const pieces: KitPiece[] = [...used.map((x) => x[0]), ...(arch ? (["arco"] as KitPiece[]) : []), ...(spec.spot === "palacio" && !low ? (["ilha"] as KitPiece[]) : [])]
  // a câmera da luta fica a 20–35 m das árvores: a versão de longe delas (serrilhada) só bem depois
  void loadDomainKit(scene, spec.kit, () => !disposed, pieces, { arvore: 48, arvore2: 48 }).then((kit) => {
    if (disposed) return kit.dispose()
    dropKit = kit.dispose
    const p = new KitPlacer(kit, `dom-stage-${spec.spot}`)
    placer = p
    const r = seeded(spec.spot.length * 97 + 13)
    const thin = low ? 0.5 : 1
    for (const [piece, rad, h, n0, off] of used) {
      const n = Math.max(3, Math.round(n0 * thin))
      for (let i = 0; i < n; i++) {
        const a = ((i + off) / n) * Math.PI * 2 + (r() - 0.5) * 0.18
        const rr = rad + (r() - 0.5) * 1.2
        p.put(piece, Math.cos(a) * rr, Math.sin(a) * rr, h * (0.85 + r() * 0.3), r() * Math.PI * 2)
      }
    }
    // entrada: o arco de raízes atrás de quem chega (−z), virado para o círculo
    if (spec.spot === "entrada" && arch) p.put("arco", 0, -(ARENA_R + 7), 9, 0)
    // palácio: colunata de arcos em volta, todos olhando para o meio, e as ilhas no alto
    if (spec.spot === "palacio") {
      const arches = low ? 4 : 7
      for (let i = 0; i < arches; i++) {
        const a = (i / arches) * Math.PI * 2 + Math.PI / arches
        const R = ARENA_R + 6
        p.put("arco", Math.cos(a) * R, Math.sin(a) * R, 8, Math.PI / 2 - a)
      }
      for (let i = 0; i < (low ? 0 : 4); i++) {
        const a = (i / 4) * Math.PI * 2 + 0.6
        p.put("ilha", Math.cos(a) * 55, Math.sin(a) * 55, 16 + r() * 8, r() * 6, 18 + r() * 14)
      }
    }
  })

  return {
    cheer() {
      /* mata não tem plateia */
    },
    update() {
      /* tudo parado: a lua não se mexe */
    },
    dispose() {
      disposed = true
      placer?.dispose()
      dropKit?.()
      ring.dispose()
      ringMat.dispose()
      ground.dispose()
      sky.dispose()
    },
  }
}
