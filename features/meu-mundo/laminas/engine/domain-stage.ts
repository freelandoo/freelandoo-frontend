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
import { Color3, Color4 } from "@babylonjs/core/Maths/math.color"
import { Vector3 } from "@babylonjs/core/Maths/math.vector"
import type { HemisphericLight } from "@babylonjs/core/Lights/hemisphericLight"
import type { DirectionalLight } from "@babylonjs/core/Lights/directionalLight"
import { ARENA_R } from "../sim/fight"
import { LOOKS, applyDomainLook, type StageSky, paintedGround, type DomainKitId, type DomainSpot } from "../../dominio/engine/domain-kit"
import { CHAO_DETALHE, aplicarChaoDetalhe } from "../../engine/cena-codigo/chao-detalhe"
import { DOMAIN_SKY, skyFog } from "../../engine/sky/sky-registry"
import { CENAS } from "../../engine/cena-codigo/cenas"
import { finishCena } from "../../engine/cena-codigo/kit-cena"
import { montarPalco, temPalco } from "../../engine/cena-codigo/palcos"
import { PORTAL_COLOR } from "../../dominio/engine/portal-fx"
import type { ArenaView } from "./arena-view"

export interface DomainStageSpec {
  kit: DomainKitId
  spot: DomainSpot
  /** Céu do Domínio/cena da luta (o mesmo da cena de onde ela saiu). Sem = a cúpula da cidade de noite. */
  sky?: StageSky | null
  /** Cena aberta de onde a luta saiu (`gelo-2`): a luz e a névoa do palco são as dela. */
  cena?: string | null
}

/** Monta o palco do Domínio na cena da luta. Luzes: "mm-hemi"/"mm-sun" (achadas pelo nome). */
export function buildDomainStage(scene: Scene, low: boolean, spec: DomainStageSpec): ArenaView {
  let disposed = false
  const look = LOOKS[spec.kit] ?? LOOKS.floresta
  const hemi = scene.getLightByName("mm-hemi") as HemisphericLight | null
  const moon = scene.getLightByName("mm-sun") as DirectionalLight | null
  const sky = applyDomainLook(scene, look, hemi, moon, spec.sky, low)
  // Domínio da luta (pela área do céu da cena; sem céu = o kit)
  const dom = spec.sky ? (Object.entries(DOMAIN_SKY).find(([, r]) => r === spec.sky!.region)?.[0] ?? spec.kit) : spec.kit
  // os 6 Domínios: palco com as peças em código (palcos.ts; Floresta e Cânion desde 14/11) e a luz da cena de origem
  const codigo = temPalco(dom) ? dom : null
  const meta = spec.cena ? CENAS[spec.cena]?.meta : undefined
  if (codigo && meta) {
    const luz = meta.luz
    if (hemi) {
      hemi.intensity = luz?.hemi ?? 0.78
      hemi.direction = new Vector3(0.25, 1, 0.15)
      hemi.diffuse = luz?.ceu ? new Color3(luz.ceu[0], luz.ceu[1], luz.ceu[2]) : new Color3(1, 1, 1)
      hemi.groundColor = luz?.chao ? new Color3(luz.chao[0], luz.chao[1], luz.chao[2]) : new Color3(0.5, 0.48, 0.55)
    }
    if (moon) {
      moon.direction = new Vector3(-0.55, -1, -0.35)
      moon.intensity = luz?.sol ?? 0.55
      moon.diffuse = luz?.solCor ? new Color3(luz.solCor[0], luz.solCor[1], luz.solCor[2]) : new Color3(1, 1, 1)
    }
    const nev = spec.sky ? skyFog(spec.sky.region, spec.sky.mode, meta.nevoa) : meta.nevoa
    scene.fogColor = new Color3(nev[0], nev[1], nev[2])
    scene.clearColor = new Color4(nev[0], nev[1], nev[2], 1)
    scene.fogStart = 40
    scene.fogEnd = 150
    scene.ambientColor = new Color3(0.2, 0.2, 0.22)
  }
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
    // a arte do céu escurece junto com as fases do chefão (e clareia no relâmpago)
    sky.dome.setLight([sk, sk, sk])
  }
  // palco em código: uma Cena (1 malha por bloco); sem ela (Domínio sem palco, nenhum hoje), só o chão pintado
  const palco = codigo ? finishCena(scene, montarPalco(codigo, spec.spot, 0), { chaoUma: low }) : null
  for (const m of palco?.meshes ?? []) m.freezeWorldMatrix()
  const ground = palco ? null : paintedGround(scene, `dom-stage-${spec.spot}`, look, 170, 170, 0, 0, 0, 6, spec.spot === "palacio" ? 23 : spec.spot === "fundo" ? 17 : 11)
  // o detalhe do chão do Domínio da luta (o mesmo das cenas abertas; chao-detalhe.ts)
  if (ground) {
    const gm = ground.mesh.material as StandardMaterial | null
    // o chão pintado vem congelado: congelado, o material não recompila com o plugin nem rebinda a textura
    if (gm && CHAO_DETALHE[dom]) {
      gm.unfreeze()
      aplicarChaoDetalhe(scene, gm, dom, low)
    }
  }
  // a borda do círculo: filete aceso na cor do tema (a regra prende a luta nele)
  const ringMat = new StandardMaterial("dom-stage-ring", scene)
  const pc = codigo ? PORTAL_COLOR[codigo] : null
  ringMat.emissiveColor = pc ? new Color3(pc[0], pc[1], pc[2]).scale(0.85) : Color3.FromHexString(look.ground.glow).scale(0.85)
  ringMat.diffuseColor = new Color3(0, 0, 0)
  ringMat.disableLighting = true
  const ring = CreateTorus("dom-stage-ring", { diameter: 2 * (ARENA_R + 0.35), thickness: 0.09, tessellation: 64 }, scene)
  ring.position.y = 0.03
  ring.material = ringMat
  ring.isPickable = false
  ring.freezeWorldMatrix()
  ringMat.freeze()

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
      ring.dispose()
      ringMat.dispose()
      ground?.dispose()
      if (palco) {
        const mats = new Set([palco.material, palco.glowMaterial])
        for (const m of palco.meshes) {
          if (m.material) mats.add(m.material as typeof palco.material)
          m.dispose(false, false)
        }
        for (const mt of mats) mt.dispose()
      }
      sky.dispose()
    },
  }
}
