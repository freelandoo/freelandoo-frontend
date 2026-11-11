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
//
// Lore v2 D5: o Cânion das Tempestades (kit do tema `temas/canion/v2`) tem os SEUS três palcos
// (RINGS_BY_KIT.canion): paredões de pedra vermelha em anel no lugar das árvores, cactos e pedras
// com raízes na beira, torres de vigia e o moinho no fundo; no palácio, a colunata de arcos de
// pedra e os anéis da Pista do Céu no alto. Na troca de fase de Zéphyra, além de escurecer, o
// céu pisca um relâmpago ciano (`flash`, só números de luz).
//
// Lore v2 D4: o deus chefão luta em fases e "a arena escurece a cada fase" (Noctis).
// `phase(n)` desce a luz do céu e da lua, fecha a névoa e escurece o fundo em ~1 s;
// o filete do círculo segue aceso (é ele que mostra onde a luta prende). Custo zero:
// só números das duas luzes e da névoa, nenhuma malha nova.

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

/** Anel em volta do círculo: [peça, raio, altura, quantas, deslocamento do ângulo, fica fora do low?]. */
type Ring = [KitPiece, number, number, number, number, boolean?]

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

/** D5: os palcos do Cânion (as medidas das pedras e do anel são as da regra do Jetpack × a escala). */
// No Cânion o paredão É o lugar: no low sai o anel de fora marcado (`true`), nunca o paredão de dentro.
const CANYON_RINGS: Record<DomainSpot, Ring[]> = {
  entrada: [
    ["rocha2", ARENA_R + 2, 1.1, 7, 0],
    ["cacto", ARENA_R + 2.6, 2.4, 6, 0.2],
    ["pedra-raizes", ARENA_R + 3.6, 2.8, 6, 0.55, true],
    ["torre-vigia", ARENA_R + 12, 7, 3, 0.35],
    ["paredao", ARENA_R + 17, 18, 12, 0.1],
    ["paredao", ARENA_R + 27, 26, 8, 0.45, true],
  ],
  fundo: [
    ["rocha", ARENA_R + 2.6, 1.4, 6, 0.3],
    ["pedra-raizes", ARENA_R + 3, 3.2, 6, 0.8],
    ["cacto", ARENA_R + 4.4, 3, 5, 0.05, true],
    ["moinho", ARENA_R + 11, 9, 2, 0.15],
    ["paredao", ARENA_R + 14, 20, 14, 0.6],
    ["paredao", ARENA_R + 23, 28, 10, 0.25, true],
  ],
  palacio: [
    ["rocha2", ARENA_R + 1.8, 1.2, 10, 0],
    ["cacto", ARENA_R + 3.2, 2.2, 6, 0.5, true],
    ["torre-vigia", ARENA_R + 12, 8, 4, 0.35, true],
    ["paredao", ARENA_R + 18, 24, 14, 0.2],
  ],
}
const RINGS_BY_KIT: Record<DomainKitId, Record<DomainSpot, Ring[]>> = { floresta: RINGS, canion: CANYON_RINGS }

/** Monta o palco do Domínio na cena da luta. Luzes: "mm-hemi"/"mm-sun" (achadas pelo nome). */
export function buildDomainStage(scene: Scene, low: boolean, spec: DomainStageSpec): ArenaView {
  let disposed = false
  const look = LOOKS[spec.kit] ?? LOOKS.floresta
  const hemi = scene.getLightByName("mm-hemi") as HemisphericLight | null
  const moon = scene.getLightByName("mm-sun") as DirectionalLight | null
  const sky = applyDomainLook(scene, look, hemi, moon)
  // D4: a luz de partida (fase 1) e para onde cada fase leva
  const base = { hemi: hemi?.intensity ?? 0, moon: moon?.intensity ?? 0, clear: scene.clearColor.clone(), fog: scene.fogColor.clone(), fogEnd: scene.fogEnd }
  const DARK: Record<number, { light: number; sky: number; fog: number }> = { 1: { light: 1, sky: 1, fog: 1 }, 2: { light: 0.72, sky: 0.55, fog: 0.82 }, 3: { light: 0.48, sky: 0.25, fog: 0.62 } }
  let dark = 1
  let darkTo = 1
  // D5: o relâmpago da troca de fase de Zéphyra (some em ~0,5 s)
  const storm = spec.kit === "canion"
  let flash = 0
  const applyDark = (k: number) => {
    const d2 = DARK[2]
    const d3 = DARK[3]
    // k: 1 (fase 1) → 2 → 3, contínuo para a transição
    const lerp = (a: number, b: number, t: number) => a + (b - a) * t
    const at = (key: "light" | "sky" | "fog") => (k <= 2 ? lerp(1, d2[key], k - 1) : lerp(d2[key], d3[key], k - 2))
    if (hemi) hemi.intensity = base.hemi * at("light") * (1 + flash * 1.6)
    if (moon) moon.intensity = base.moon * at("light") * (1 + flash * 2.2)
    const sk = at("sky") + flash * 0.9
    scene.clearColor.set(base.clear.r * sk, base.clear.g * sk, base.clear.b * sk, base.clear.a)
    scene.fogColor.set(base.fog.r * sk, base.fog.g * sk, base.fog.b * sk)
    scene.fogEnd = base.fogEnd * at("fog")
  }
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
  const rings = (RINGS_BY_KIT[spec.kit] ?? RINGS)[spec.spot]
  const far = Math.max(...rings.map((x) => x[1]))
  const marked = rings.some((x) => x[5])
  const used = rings.filter((x) => !(low && (marked ? x[5] : rings.length > 3 && x[1] === far)))
  // só os arquivos das peças deste palco (cada arquivo é uma textura a mais na luta)
  // o arco tem textura de 1024: no low só o palácio (a colunata é a cara dele) o carrega
  const arch = spec.spot === "palacio" || (spec.spot === "entrada" && !low)
  const pieces: KitPiece[] = [...used.map((x) => x[0]), ...(arch ? (["arco"] as KitPiece[]) : []), ...(spec.spot === "palacio" && !low ? (["ilha"] as KitPiece[]) : []), ...(storm && spec.spot === "palacio" ? (["anel"] as KitPiece[]) : [])]
  // a câmera da luta fica a 20–35 m das árvores. B6 (tema v2): a versão de longe delas deixou de ser
  // serrilhada (2.000 tri, mais bonita que a de perto da v1, 3.000) e a de perto subiu para 3.600: troca a 30 m
  void loadDomainKit(scene, spec.kit, () => !disposed, pieces, storm ? (low ? { paredao: 24, arco: 22, "torre-vigia": 24, moinho: 24 } : { paredao: 34 }) : { arvore: 30, arvore2: 30 }).then((kit) => {
    if (disposed) return kit.dispose()
    dropKit = kit.dispose
    const p = new KitPlacer(kit, `dom-stage-${spec.spot}`)
    placer = p
    const r = seeded(spec.spot.length * 97 + 13)
    const thin = low ? 0.5 : 1
    for (const [piece, rad, h, n0, off] of used) {
      // D5: o paredão do Cânion não rareia no low (com buraco o cânion vira deserto); troca de longe mais cedo
      const n = Math.max(3, Math.round(n0 * (storm && piece === "paredao" ? 1 : thin)))
      for (let i = 0; i < n; i++) {
        const a = ((i + off) / n) * Math.PI * 2 + (r() - 0.5) * 0.18
        const rr = rad + (r() - 0.5) * 1.2
        p.put(piece, Math.cos(a) * rr, Math.sin(a) * rr, h * (0.85 + r() * 0.3), r() * Math.PI * 2)
      }
    }
    // entrada: o arco (de raízes / de pedra) atrás de quem chega (−z), virado para o círculo
    if (spec.spot === "entrada" && arch) p.put("arco", 0, -(ARENA_R + 7), 9, 0)
    // D5: os anéis da Pista do Céu no alto do palácio de Zéphyra (o trilho por onde ela corre)
    if (storm && spec.spot === "palacio") {
      const n = low ? 2 : 4
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + 0.3
        p.put("anel", Math.cos(a) * (ARENA_R + 14), Math.sin(a) * (ARENA_R + 14), 3.2, -a, 9 + (i % 2) * 3)
      }
    }
    // palácio: colunata de arcos em volta, todos olhando para o meio, e as ilhas no alto
    if (spec.spot === "palacio") {
      const arches = low ? (storm ? 2 : 4) : 7
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
    update(dt: number) {
      // a lua não se mexe; só a escuridão das fases do chefão anda (~1 s por fase) e o relâmpago some
      if (dark === darkTo && flash === 0) return
      dark = darkTo > dark ? Math.min(darkTo, dark + dt) : Math.max(darkTo, dark - dt)
      flash = Math.max(0, flash - dt * 2)
      applyDark(dark)
    },
    phase(n: number) {
      darkTo = Math.max(1, Math.min(3, n))
      if (storm && n > 1) flash = 1
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
