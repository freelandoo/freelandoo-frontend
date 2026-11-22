// features/meu-mundo/dominio/engine/open-domain-game.ts — Domínios v2 (DV2 + DV3): a CENA ABERTA.
//
// Plano `MEU MUNDO 3D/planos/2026-11-11-dominios-v2.md`. Cada Domínio tem 3 cenas de mundo aberto
// (~160 × 160 m) feitas EM CÓDIGO (`engine/cena-codigo`, sem GLB): a cena monta no aparelho pelo
// arquivo `<domínio>-<n>`, uma malha por bloco de 32 m (perto = lod 0, longe = lod 1, trocadas pela
// distância) + o pano de fundo. A colisão são as caixas da cena (`cena.blockers`); o chão de andar
// é plano. O arquivo marca os pontos do jogo (`entrada`, `saida`, `chefe` | `guardiao` + `deus`,
// lugares da lore) e uma zona por setor da faixa da cena.
//
// DV3 — monstros SOLTOS: cada setor comum da faixa tem um bando que anda na zona dele (vagueia,
// percebe quem chega e corre atrás, como os lobos da rua); encostou = `onEngage` e a tela pede a
// luta ao SERVIDOR (ele confere o setor aberto e escolhe monstro e nível). Setor ainda fechado =
// bando selado (meio apagado, parado, não abre luta). O chefe da cena fica PARADO no ponto dele
// (o deus no salão também) e luta pelo "Lutar". Vencido some até reaparecer (a tela guarda a hora
// em `defeated`). Cena 3 (22/11): o GUARDIÃO da porta do castelo vai para cima de quem chega como
// o bando e, vencido, some de vez; a porta (malha própria da cena) fica FECHADA (caixa no vão) até
// ele cair e então afunda no chão — o vão aberto leva ao pátio do deus. A passagem (`saida`) só leva à próxima cena
// quando o servidor diz que o chefe caiu (`scene.passage.open`): uma cena na memória por vez.
//
// Um ambiente 3D por vez (ui/offstage.ts): a tela desmonta esta cena para a luta e para trocar de
// cena. Nada aqui decide regra — só onde a pessoa está.

import { Engine } from "@babylonjs/core/Engines/engine"
import { Scene } from "@babylonjs/core/scene"
import { HemisphericLight } from "@babylonjs/core/Lights/hemisphericLight"
import { DirectionalLight } from "@babylonjs/core/Lights/directionalLight"
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial"
import { Color3, Color4 } from "@babylonjs/core/Maths/math.color"
import { Vector3 } from "@babylonjs/core/Maths/math.vector"
import type { Mesh } from "@babylonjs/core/Meshes/mesh"
import type { DefaultRenderingPipeline } from "@babylonjs/core/PostProcesses/RenderPipeline/Pipelines/defaultRenderingPipeline"
import { Character } from "../../engine/player"
import { AvatarLibrary } from "../../engine/avatars"
import { FollowCamera, STREET_CAMERA } from "../../engine/camera"
import { MOTION, lerpAngle, type Intent, type MoveState } from "../../engine/motion"
import { stepInterior, type InteriorBody } from "../../engine/interior-motion"
import { attachInput, clearInput, createInputState, moveAxis, wantsRun, type InputState } from "../../engine/input"
import type { Box2 } from "../../engine/collision"
import { liveGamesBump } from "../../engine/game"
import { domainMusic, sceneSound } from "../../engine/audio"
import { ResolutionGovernor, resolveQuality } from "../../engine/quality"
import { markSceneStart } from "../../engine/scene-meter"
import { shotPose, type StoryShot, type StorySubject } from "../../engine/story-camera"
import { MonsterModel, setMonsterSkinMax } from "../../laminas/engine/monster-view"
import type { BodyId, InteriorDef } from "../../types"
import type { DomainInfo, DomainScene } from "../../data"
import { GodFigure, GOD_HUNT } from "../../engine/god-view"
import type { GodId } from "../../laminas/sim/fight"
import { SkyDome } from "../../engine/sky/sky-dome"
import type { StageSky } from "./domain-kit"
import { DomainPortal, PORTAL_COLOR } from "./portal-fx"
import { createAmbientFx } from "../../engine/ambiente-fx/ambient-fx"
import { CharShadows } from "../../engine/char-shadows"
import { buildDomainFloorLights } from "./domain-floor-lights"
import { SceneBloom } from "../../engine/bloom-cena"
import { DOMAIN_AMBIENT, DOMAIN_REGION } from "../../engine/ambiente-fx/presets"
import { SpeechBubble } from "../../engine/speech-bubble"
import { SKY_REGIONS, skyArt, skyFog, skyOfCena, variantOfCena } from "../../engine/sky/sky-registry"
import { dominioMapModel, setCityMap, type DominioMapLabels } from "../../engine/city-map"
import { CENAS, astroDaCena, auroraDaCena, blocked, inPoly, montarCena, soltarCenasProntas, visualDaCena, aplicarCor, type CenaMontada, type XZ } from "../../engine/cena-codigo"

/** Alcance do "Lutar", das passagens e do aviso de selado (m). */
const REACH = 3.4
/** Bando de cada setor comum (low: o mesmo número; só os perto ganham corpo). */
const PACK = 2
/** Percebe quem chega / desiste (m) e velocidades (m/s). */
const SEE = 8.5
const LEASH = 12
const WANDER_V = 1.15
const CHASE_V = 3.1
/** Encostou (m): abre a luta. */
const TOUCH = 1.55
/** Vencido volta depois de (ms). */
export const RESPAWN_MS = 90_000
/**
 * Guardião do castelo (cena 3, 2026-11-22, pedido do Alex): vai para cima de quem chega como os monstros da rua,
 * mas enxerga e persegue mais longe (protege a porta inteira) e não vagueia: sem ninguém, volta para a escada.
 */
const GUARD_SEE = SEE * 1.7
const GUARD_LEASH = LEASH * 1.8
/** A porta do castelo afunda no chão em (s) quando abre na frente de quem venceu. */
const DOOR_OPEN_S = 1.8
/** Lugar da lore (Pedraverde): raio da clareira em volta do ponto (m). */
const PLACE_R = 9
/** C5: "a ~4 m do Golem" (07-falas §1.2). */
const GOLEM_NEAR = 4.5

/** O que a pessoa pode fazer agora. */
export type OpenNear =
  | { kind: "guard"; sector: number }
  | { kind: "exit" }
  | { kind: "back" }
  | { kind: "next" }
  | { kind: "passage" }
  | { kind: "sealed"; sector: number; boss: boolean; portal?: boolean }
  | null

/** O que o chefe/guardião/deus sabe para explicar a passagem (o texto vem da tela, traduzido). */
export interface BossTalk {
  sector: number
  /** Já dá para lutar com ele (os setores antes dele foram vencidos). */
  open: boolean
  /** Parte (cena) atual e a próxima que o portal abre (null = cena 3). */
  part: number
  nextPart: number | null
  /** Guardião na porta do castelo (cena 3, setor 9) / o deus (setor 10). */
  castle: boolean
  god: boolean
  /** Setores que faltam vencer antes dele (quando fechado). */
  needFrom: number
  needTo: number
}

export interface OpenDomainOptions {
  canvas: HTMLCanvasElement
  body: BodyId
  look?: string
  domain: DomainInfo
  scene: DomainScene
  /** Administrador (o servidor manda `bypass`): todo setor, portal e passagem abertos, para conferir as cenas. */
  bypass?: boolean
  /** Onde nascer: setor N = de volta da luta (perto do chefe ou na zona); "saida" = voltando da cena seguinte. */
  spawn?: { sector?: number; at?: "entrada" | "saida" }
  /** Monstros vencidos: id → hora (ms) da vitória; somem até `RESPAWN_MS` depois. O guardião do castelo some de vez. */
  defeated?: Record<string, number>
  /** O guardião do castelo acabou de cair: a porta abre (afunda) na frente de quem volta da luta. */
  doorFresh?: boolean
  maxPixelRatio?: number
  onReady?: () => void
  onNearbyChange?: (n: OpenNear) => void
  /** Em que zona de setor a pessoa está (0 = fora de zona). */
  onSector?: (s: number) => void
  onPlace?: (id: string | null) => void
  onSpot?: (spot: string | null) => void
  onInteract?: (n: Exclude<OpenNear, null>) => void
  /** DV3: um monstro solto do setor encostou (id = o do bando, para sumir depois de vencido). */
  onEngage?: (sector: number, id: string) => void
  onGodCatch?: (god: GodId) => void
  /** Mapa da cena (radar + pergaminho, mm3d-60r): nomes já traduzidos pela tela. Sem ele, em pt. */
  mapLabels?: DominioMapLabels & { hunt: (god: GodId) => string }
  onError?: (reason: "context-lost") => void
  /** Falas do chefe quando a pessoa chega perto (uma por balão, em sequência). */
  talk?: (c: BossTalk) => string[]
  /**
   * Pedido do Alex (14/11): a fala do chefe vai para a TELA, no card das notificações
   * dos personagens (retrato + texto). Com ele, nada de balão 3D sobre a cabeça.
   */
  onTalk?: (sector: number, lines: string[]) => void
}

export interface OpenDomainHandle {
  input: InputState
  setJoystick: (x: number, y: number) => void
  setRun: (on: boolean) => void
  setBlocked: (blocked: boolean) => void
  interact: () => void
  recenter: () => void
  setProgress: (best: number) => void
  story: (shot: StoryShot | null) => void
  setGod: (god: GodId | null, delayMs?: number) => void
  dispose: () => void
}

/** Céu da cena (área + dia/noite pela luz dela): o mesmo na cena aberta e no palco das lutas que saem dela. */
export function sceneSky(name: string): StageSky | null {
  const region = skyOfCena(name)
  if (!region) return null
  const mod = CENAS[name]
  return { region, mode: mod ? variantOfCena(name, mod.meta.ceu) : "noite" }
}

/** Saiu do Domínio: solta as cenas prontas guardadas (a volta da luta não precisa mais delas). */
export const releaseOpenScenes = () => soltarCenasProntas()

/** A cena `name` está feita (registrada no front)? Senão a tela cai no corredor antigo. */
export const hasOpenScene = (name: string | null | undefined) => !!name && !!CENAS[name]

type Mob = {
  id: string
  sector: number
  boss: boolean
  x: number
  z: number
  hx: number
  hz: number
  facing: number
  tx: number
  tz: number
  wait: number
  chasing: boolean
  model: MonsterModel | null
  /** Guardião do castelo: persegue como os monstros soltos (e some de vez quando cai). */
  guard?: boolean
  /** Quantas malhas já receberam o "selado" (o corpo carrega aos poucos: reaplica quando muda). */
  sealedLook: number
  /** Chefe: balão de fala e a fila de falas desta aproximação. */
  bubble?: SpeechBubble | null
  talkQ?: string[]
  talkAt?: number
  talked?: boolean
}

export function createOpenDomainGame(opts: OpenDomainOptions): OpenDomainHandle {
  const { canvas, domain, scene: sc } = opts
  const engine = new Engine(canvas, true, { stencil: false, preserveDrawingBuffer: false, powerPreference: "default" }, false)
  const unlive = liveGamesBump()
  // áudio S11: a música do Domínio (solta no dispose)
  const musicSnd = sceneSound()
  musicSnd.set(domainMusic(domain.id))
  let disposed = false
  const quality = resolveQuality()
  const low = quality.tier === "low"
  // A cena aberta monta pelo perfil e não troca ao vivo: no "Automático" o governador mede e
  // grava o perfil, que vale na próxima cena (cada parte, luta e volta remonta). Visual premium E7.
  const governor = new ResolutionGovernor(engine, quality, Math.min(window.devicePixelRatio || 1, opts.maxPixelRatio ?? 1.5), { learn: true })

  const scene = new Scene(engine)
  scene.skipPointerMovePicking = true
  scene.skipPointerDownPicking = true
  scene.skipPointerUpPicking = true
  markSceneStart(engine)

  // ── a cena pelo arquivo: perto (lod 0) e longe (lod 1) ─────────────────
  const near0: CenaMontada = montarCena(scene, sc.name, 0, { low })
  const far1: CenaMontada = montarCena(scene, sc.name, 1, { low })
  const cena = near0.cena
  const meta = near0.meta
  // céu panorâmico do Domínio (engine/sky): a névoa puxa para a cor do chão pintado no horizonte
  // (dia ou noite pela luz da cena: céu escuro = arte da noite)
  const skyId = skyOfCena(sc.name)
  const skyReg = skyId ? SKY_REGIONS[skyId] : null
  const skyVar = variantOfCena(sc.name, meta.ceu)
  const nev = skyId ? skyFog(skyId, skyVar, meta.nevoa) : meta.nevoa
  const ceu = skyId ? nev : meta.ceu
  scene.clearColor = new Color4(ceu[0], ceu[1], ceu[2], 1)
  scene.fogMode = Scene.FOGMODE_LINEAR
  scene.fogColor = new Color3(nev[0], nev[1], nev[2])
  // acabamento por cena (engine/cena-codigo/acabamento.ts): névoa como fração do perfil e luz própria
  const vis = visualDaCena(sc.name)
  scene.fogStart = quality.fogStart * (vis?.nevoa?.inicio ?? 1)
  scene.fogEnd = quality.fogEnd * (vis?.nevoa?.fim ?? 1)
  const luz = vis?.luz ? { ...meta.luz, ...vis.luz } : meta.luz
  const hemi = new HemisphericLight("mm-dom-hemi", new Vector3(0.25, 1, 0.15), scene)
  hemi.intensity = luz?.hemi ?? 0.78
  hemi.groundColor = luz?.chao ? new Color3(luz.chao[0], luz.chao[1], luz.chao[2]) : new Color3(0.5, 0.48, 0.55)
  if (luz?.ceu) hemi.diffuse = new Color3(luz.ceu[0], luz.ceu[1], luz.ceu[2])
  const sun = new DirectionalLight("mm-dom-sun", new Vector3(-0.55, -1, -0.35), scene)
  sun.intensity = luz?.sol ?? 0.55
  if (luz?.solCor) sun.diffuse = new Color3(luz.solCor[0], luz.solCor[1], luz.solCor[2])
  // a arte já tem a lua/o sol e a aurora: o disco e as cortinas em malha só ficam sem arte
  const dropAstro = skyReg?.dropAstro ? () => {} : astroDaCena(scene, meta)
  const dropAurora = skyReg?.dropAstro ? () => {} : auroraDaCena(scene, meta)
  const sky = skyReg
    ? new SkyDome(scene, { radius: 295, tier: quality.tier, region: skyReg.id, mode: skyVar, haze: [nev[0], nev[1], nev[2]], zenith: skyArt(skyReg.id, skyVar).top, flashLight: hemi })
    : null
  // tratamento de cor da cena (o mesmo método do bairro) e a cúpula imitando, para o horizonte casar
  const skyGrade = aplicarCor(scene, vis?.cor)
  if (sky && skyGrade) sky.setGrade(skyGrade[0], skyGrade[1], skyGrade[2])
  // partículas de ambiente da região (E5): 1 chamada; noite fixa pela arte da cena
  const ambient = createAmbientFx(scene, DOMAIN_AMBIENT[domain.id] ?? skyId ?? DOMAIN_REGION[domain.id], quality.tier, { night: skyVar === "noite" ? 1 : 0 })
  // luzes no chão (o que deu certo no Rolê e na Gincana): beira da trilha, setas, anéis das clareiras e da arena — 1 chamada
  const floorLights = buildDomainFloorLights(scene, cena, { low, night: skyVar === "noite" })

  /** Blocos: centro + as duas malhas (o pano de fundo de longe sai: o de perto basta). */
  const S = cena.cell
  const blocks: { cx: number; cz: number; m0: Mesh | null; m1: Mesh | null }[] = []
  /** A folha da porta do castelo (cena 3): malha própria, some quando o guardião cai. */
  let doorMesh: Mesh | null = null
  {
    const byKey = new Map<string, { cx: number; cz: number; m0: Mesh | null; m1: Mesh | null }>()
    const keyOf = (m: Mesh) => m.name.slice(`cena-${cena.name}-`.length)
    for (const m of near0.meshes as Mesh[]) {
      const k = keyOf(m)
      if (k === "fundo" || k === "horizonte") continue
      if (k === "porta") {
        doorMesh = m
        continue
      }
      const [a, b] = k.split(",").map(Number)
      byKey.set(k, { cx: (a + 0.5) * S + cena.off, cz: (b + 0.5) * S + cena.off, m0: m, m1: null })
    }
    for (const m of far1.meshes as Mesh[]) {
      const k = keyOf(m)
      if (k === "fundo" || k === "horizonte" || k === "porta") {
        m.setEnabled(false)
        continue
      }
      const e = byKey.get(k)
      if (e) e.m1 = m
      else m.setEnabled(false)
    }
    blocks.push(...byKey.values())
    for (const m of [...near0.meshes, ...far1.meshes]) m.freezeWorldMatrix()
  }
  // bloom seletivo (visual premium §15): só no "margin" do high e só o que brilha na malha
  // (lava, cristais, painéis, janelas); o pano de fundo desligado não entra
  const bloom = new SceneBloom(scene, quality)
  bloom.add([...near0.meshes, ...far1.meshes].filter((m) => m.isEnabled(false)) as Mesh[])
  // distância do detalhe pelo LOD do perfil (`lodScale`): baixo 40, médio 52, alto 65 m
  const NEAR_D = Math.floor(52 * quality.lodScale)
  let lodT = 0
  const refreshLod = (px: number, pz: number) => {
    for (const b of blocks) {
      const d = Math.max(Math.abs(px - b.cx), Math.abs(pz - b.cz))
      const close = d < NEAR_D
      b.m0?.setEnabled(close || !b.m1)
      b.m1?.setEnabled(!close)
    }
  }

  // ── área, colisão, pontos e zonas ──────────────────────────────────────
  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity
  for (const k of cena.cells.keys()) {
    const [a, b] = k.split(",").map(Number)
    minX = Math.min(minX, a * S + cena.off)
    maxX = Math.max(maxX, (a + 1) * S + cena.off)
    minZ = Math.min(minZ, b * S + cena.off)
    maxZ = Math.max(maxZ, (b + 1) * S + cena.off)
  }
  const boxes: Box2[] = cena.blockers.map((b) => ({ x: b.x, z: b.z, hx: b.hx, hz: b.hz, rot: b.rot, h: b.h }))
  const def = { floors: [{ y: 0, bounds: { minX: minX + 0.5, maxX: maxX - 0.5, minZ: minZ + 0.5, maxZ: maxZ - 0.5 }, boxes }], stairs: [] } as unknown as InteriorDef
  const P = cena.pontos
  const entrada = P.entrada ?? { x: 0, z: minZ + 6, ang: 0 }
  const saida = P.saida ?? null
  const ahead = (p: { x: number; z: number; ang: number }, d: number) => ({ x: p.x + Math.sin(p.ang) * d, z: p.z + Math.cos(p.ang) * d })
  const free = (x: number, z: number, pad = 0.6) => x > minX + 1 && x < maxX - 1 && z > minZ + 1 && z < maxZ - 1 && !blocked(cena, x, z, pad)
  const zoneOf = (s: number) => cena.zonas.find((q) => q.setor === s) ?? null
  const centroid = (poly: readonly XZ[]) => {
    let x = 0, z = 0
    for (const p of poly) {
      x += p[0]
      z += p[1]
    }
    return { x: x / poly.length, z: z / poly.length }
  }

  // chefe(s) da cena: cena 1/2 = `chefe` (setor boss); cena 3 = `guardiao` (9) e `deus` (10)
  const bossSpots: { sector: number; x: number; z: number; ang: number }[] = []
  {
    const g = sc.god
    if (g) {
      const gp = P.guardiao ?? P.chefe
      if (gp) bossSpots.push({ sector: sc.boss, ...gp })
      if (P.deus) bossSpots.push({ sector: g, ...P.deus })
    } else if (P.chefe) bossSpots.push({ sector: sc.boss, ...P.chefe })
  }
  let best = Math.max(0, Math.min(10, domain.best))
  const bypass = !!opts.bypass
  const sectorOpen = (s: number) => (bypass || s <= best + 1) && !!domain.sectors[s - 1]?.open
  let passageOpen = !!sc.passage?.open

  // ── a porta do castelo (cena 3, 2026-11-22): FECHADA (caixa no vão) até o guardião cair; depois some ──
  const guardSector = sc.god ? sc.boss : 0
  const guardId = `${guardSector}:chefe`
  const defeatedAt = opts.defeated ?? {}
  /** O guardião caiu (o servidor diz pelo `best`; nesta visita, a vitória que acabou de voltar também vale). */
  const guardDown = () => !!guardSector && (best >= guardSector || defeatedAt[guardId] != null)
  const doorBox = guardSector && cena.portaCaixa ? { ...cena.portaCaixa } : null
  let doorOpen = !doorBox
  /** Abrindo: segundos que faltam (a folha afunda no chão). */
  let doorAnim = -1
  const doorDelay = { t: 0 }
  const openDoor = (animate: boolean) => {
    if (doorOpen) return
    doorOpen = true
    const i = doorBox ? boxes.indexOf(doorBox) : -1
    if (i >= 0) boxes.splice(i, 1)
    if (!doorMesh) return
    if (!animate) {
      doorMesh.setEnabled(false)
      return
    }
    doorMesh.unfreezeWorldMatrix()
    doorAnim = DOOR_OPEN_S
  }
  const stepDoor = (dt: number) => {
    if (doorAnim < 0 || !doorMesh) return
    // atrás da cortina (cena ainda preparando) a porta espera: quem venceu tem que VER abrir
    if (!readySent) return
    if (doorDelay.t > 0) {
      doorDelay.t -= dt
      return
    }
    doorAnim -= dt
    const k = 1 - Math.max(0, doorAnim) / DOOR_OPEN_S
    // afunda acelerando, com um tremor no começo (o peso da pedra/madeira)
    doorMesh.position.y = -10.5 * k * k
    doorMesh.position.x = k < 0.35 ? Math.sin(k * 90) * 0.04 : 0
    if (doorAnim <= 0) {
      doorAnim = -1
      doorMesh.setEnabled(false)
    }
  }
  if (doorBox) {
    if (!guardDown()) boxes.push(doorBox)
    else if (opts.doorFresh && doorMesh) {
      // volta da luta: a porta ainda fechada, abre logo depois (quem venceu vê abrir)
      doorOpen = false
      doorDelay.t = 0.9
      openDoor(true)
    } else {
      doorOpen = false
      openDoor(false)
    }
  }

  // ── portais: toda passagem tem um; aberto = redemoinho de partículas ─────
  const portalColor = PORTAL_COLOR[domain.id] ?? PORTAL_COLOR.floresta
  /** A saída abre? (null = não há para onde ir: sem portal) */
  const exitOpen = (): boolean | null => (sc.passage ? passageOpen : domain.passage ? (bypass || best >= 10) && !!domain.passage.open : null)
  const portals: DomainPortal[] = []
  portals.push(new DomainPortal(scene, { x: entrada.x, z: entrada.z, ang: entrada.ang, color: portalColor, open: true, low }))
  const exitPortal = saida && exitOpen() !== null ? new DomainPortal(scene, { x: saida.x, z: saida.z, ang: saida.ang, color: portalColor, open: !!exitOpen(), low }) : null
  if (exitPortal) portals.push(exitPortal)

  // ── nascer ──────────────────────────────────────────────────────────────
  const spawnPos = (): { x: number; z: number; facing: number } => {
    const want = opts.spawn
    if (want?.sector) {
      const b = bossSpots.find((q) => q.sector === want.sector)
      if (b) {
        // na frente do chefe, um passo além do alcance (ele olha para quem chega); o guardião do castelo
        // persegue: volta-se fora da vista dele (senão a luta reabre sozinha), de frente para a porta
        // (vencido, ele sumiu: volta-se mais perto, de frente para a porta que abre)
        const dists = b.sector !== guardSector ? [REACH + 1.4] : guardDown() ? [9, 7, REACH + 1.4] : [GUARD_SEE + 1.5, GUARD_SEE, SEE + 2, REACH + 1.4]
        for (const dd of dists) {
          const p = ahead(b, dd)
          if (free(p.x, p.z)) return { x: p.x, z: p.z, facing: b.ang + Math.PI }
        }
      }
      const q = zoneOf(want.sector)
      if (q) {
        const c = centroid(q.poly)
        if (free(c.x, c.z)) return { x: c.x, z: c.z, facing: 0 }
      }
    }
    if (want?.at === "saida" && saida) {
      const p = ahead(saida, -3.2)
      return { x: p.x, z: p.z, facing: saida.ang + Math.PI }
    }
    const p = ahead(entrada, 2.4)
    return { x: p.x, z: p.z, facing: entrada.ang }
  }
  const sp = spawnPos()
  const body: InteriorBody = { x: sp.x, z: sp.z, vx: 0, vz: 0, facing: sp.facing, floor: 0, y: 0 }
  refreshLod(body.x, body.z)

  // ── quem joga ───────────────────────────────────────────────────────────
  const lib = new AvatarLibrary(scene, true, false, quality.avatarLod, false, false)
  lib.skinMax = quality.avatarSkin
  setMonsterSkinMax(scene, quality.avatarSkin, quality.avatarLod)
  const fallbackMat = new StandardMaterial("mm-character", scene)
  fallbackMat.diffuseColor = new Color3(1, 1, 1)
  fallbackMat.specularColor = new Color3(0.08, 0.08, 0.08)
  const shadowMat = new StandardMaterial("mm-shadow", scene)
  shadowMat.diffuseColor = new Color3(0, 0, 0)
  shadowMat.specularColor = new Color3(0, 0, 0)
  shadowMat.disableLighting = true
  shadowMat.alpha = 0.22
  const char = new Character(scene, lib, { fallback: fallbackMat, shadow: shadowMat }, opts.body, null, true, opts.look ?? "")
  let visualFacing = body.facing
  let move: MoveState = 0
  char.place(body.x, body.z, body.facing, 0)
  const follow = new FollowCamera(scene, STREET_CAMERA)
  scene.activeCamera = follow.camera
  follow.camera.maxZ = 300
  follow.snapBehind(body.x, body.z, body.facing)
  follow.update(1, body.x, body.z, boxes, 0)

  // ── lugares da lore (Pedraverde) e o Golem sentado ──────────────────────
  const places = (domain.places ?? []).filter((p) => P[p.id]).map((p) => ({ id: p.id, sector: p.sector, x: P[p.id].x, z: P[p.id].z }))
  const golems = places
    .filter((p) => p.id === "pedraverde" && P.golem)
    .map(() => {
      const gp = P.golem
      const g = new Character(scene, lib, { fallback: fallbackMat, shadow: shadowMat }, "golem", null, false)
      g.place(gp.x, gp.z, gp.ang, 0)
      return { char: g, x: gp.x, z: gp.z }
    })

  // ── DV3: os bandos soltos e os chefes parados ──────────────────────────
  const defeated = opts.defeated ?? {}
  const isDown = (id: string) => {
    const t = defeated[id]
    return t != null && Date.now() - t < RESPAWN_MS
  }
  const mobs: Mob[] = []
  {
    const bossSectors = new Set(bossSpots.map((b) => b.sector))
    let seed = 7
    const rnd = () => {
      seed = (seed * 16807) % 2147483647
      return seed / 2147483647
    }
    for (const s of sc.sectors) {
      if (bossSectors.has(s)) continue
      const q = zoneOf(s)
      if (!q) continue
      const xs = q.poly.map((p) => p[0]), zs = q.poly.map((p) => p[1])
      const x0 = Math.min(...xs), x1 = Math.max(...xs), z0 = Math.min(...zs), z1 = Math.max(...zs)
      for (let i = 0; i < PACK; i++) {
        let x = 0, z = 0
        for (let k = 0; k < 40; k++) {
          x = x0 + rnd() * (x1 - x0)
          z = z0 + rnd() * (z1 - z0)
          if (inPoly(x, z, q.poly) && free(x, z, 1)) break
        }
        mobs.push({ id: `${s}:${i}`, sector: s, boss: false, x, z, hx: x, hz: z, facing: rnd() * 6.28, tx: x, tz: z, wait: rnd() * 3, chasing: false, model: null, sealedLook: 0 })
      }
    }
    for (const b of bossSpots) {
      const guard = b.sector === guardSector
      // o guardião do castelo vencido some DE VEZ (a porta já está aberta atrás dele)
      if (guard && guardDown()) continue
      mobs.push({ id: `${b.sector}:chefe`, sector: b.sector, boss: true, guard, x: b.x, z: b.z, hx: b.x, hz: b.z, facing: b.ang, tx: b.x, tz: b.z, wait: 0, chasing: false, model: null, sealedLook: 0 })
    }
  }
  const pickTarget = (m: Mob) => {
    const q = zoneOf(m.sector)
    if (!q) return
    const xs = q.poly.map((p) => p[0]), zs = q.poly.map((p) => p[1])
    for (let k = 0; k < 12; k++) {
      const x = Math.min(...xs) + Math.random() * (Math.max(...xs) - Math.min(...xs))
      const z = Math.min(...zs) + Math.random() * (Math.max(...zs) - Math.min(...zs))
      if (inPoly(x, z, q.poly) && free(x, z, 0.8)) {
        m.tx = x
        m.tz = z
        return
      }
    }
  }
  // Monstro na memória só perto (2026-11-15): aparece a SHOW_D e só sai a HIDE_D (a folga evita
  // criar e soltar sem parar na beira). Quem sai é GUARDADO (escondido, sem animar) e reaproveitado
  // pelo próximo do mesmo tipo; o excesso é solto. Um de cada tipo da cena é preparado logo depois
  // da cena abrir (arquivo, cópia e shader prontos antes de aparecer).
  const SHOW_D = Math.floor(50 * quality.lodScale)
  const HIDE_D = SHOW_D + 14
  /**
   * Guardados por tipo: tantos quantos a cena tem daquele tipo (até 6). A cena tem 160 m: perto ou
   * longe, todos acabam aparecendo; soltar um corpo com esqueleto e clonar de novo custa ~100 ms
   * cada no celular. Na GPU a cópia divide malha e textura (só o esqueleto é dela).
   */
  const POOL_CAP = 6
  const sigOf = (sector: number) => {
    const sec = domain.sectors[sector - 1]
    return `${sec?.kind ?? "cavaleiro"}|${sec?.foe?.body ?? ""}|${sec?.foe?.rig ? 1 : 0}`
  }
  const newModel = (sector: number) => {
    const sec = domain.sectors[sector - 1]
    const fb = sec?.foe?.body ?? null
    const rig = !!sec?.foe?.rig
    return new MonsterModel(scene, sec?.kind ?? "cavaleiro", 1, fb && !rig ? { n: 0, body: fb, bare: true } : null, undefined, fb && rig ? fb : undefined)
  }
  const parked = new Map<string, MonsterModel[]>()
  /** Contas do pool (harness: `__mmDomain.pool()`). */
  const poolStats = { created: 0, reused: 0, parked: 0, freed: 0, createMs: 0, lateAt: [] as number[] }
  const timedModel = (sector: number) => {
    const t0 = performance.now()
    const mm = newModel(sector)
    poolStats.created++
    // criado com a cena já aberta (deveria ter vindo pronto): o harness conta
    if (readySent && poolStats.lateAt.length < 20) poolStats.lateAt.push(Math.round(t0))
    poolStats.createMs += performance.now() - t0
    return mm
  }
  const modelFor = (m: Mob) => {
    const got = parked.get(sigOf(m.sector))?.pop()
    if (!got) return timedModel(m.sector)
    poolStats.reused++
    got.park(false)
    return got
  }
  const parkModel = (sector: number, mm: MonsterModel) => {
    const k = sigOf(sector)
    const list = parked.get(k) ?? []
    if (list.length >= POOL_CAP) {
      poolStats.freed++
      return mm.dispose()
    }
    poolStats.parked++
    mm.park(true)
    list.push(mm)
    parked.set(k, list)
  }
  const setSealedLook = (m: Mob, on: boolean) => {
    if (!m.model) return
    // o balão de fala fica de fora (o "selado" é só o corpo)
    const meshes = m.model.root.getChildMeshes(false).filter((x) => x !== m.bubble?.mesh)
    const want = on ? meshes.length : 0
    if (m.sealedLook === want) return
    for (const x of meshes) x.visibility = on ? 0.32 : 1
    m.sealedLook = want
  }
  // o chefe explica a passagem: chegou perto (TALK_D) → falas em sequência; afastou → pode repetir
  const TALK_D = 8.5
  const TALK_EACH = 4200
  const bossTalk = (m: Mob, d: number, open: boolean) => {
    if (!m.model || !opts.talk) return
    const now = performance.now()
    if (d > TALK_D * 1.8) m.talked = false
    if (!m.talked && d < TALK_D && !engaged && !input.blocked) {
      m.talked = true
      const castle = sc.n === 3 && m.sector === sc.boss
      const god = sc.god === m.sector
      const lines = opts.talk({ sector: m.sector, open, part: sc.n, nextPart: sc.passage ? sc.passage.to : null, castle, god, needFrom: best + 1, needTo: m.sector - 1 })
      if (opts.onTalk) {
        opts.onTalk(m.sector, lines)
        return
      }
      m.talkQ = lines
      m.talkAt = 0
    }
    if (opts.onTalk) return
    const q = m.talkQ
    if (q && q.length && now >= (m.talkAt ?? 0)) {
      if (!m.bubble) {
        m.bubble = new SpeechBubble(scene, m.model.root, 2.6)
        // balão do chefe maior: lê de longe, antes de encostar
        m.bubble.mesh.scaling.setAll(1.7)
      }
      const bb = m.model.root.getHierarchyBoundingVectors(true)
      m.bubble.setY(Math.max(2.4, bb.max.y - m.model.root.position.y + 0.5))
      m.bubble.say(q.shift()!, now)
      m.talkAt = now + TALK_EACH
      if (!q.length) m.talkAt = now + TALK_EACH
    }
    // a última fala fica o tempo dela e some (o balão sozinho duraria 10 s)
    if (m.bubble) m.bubble.tick(d < 30 && now < (m.talkAt ?? 0), now)
  }
  // sombra real (visual premium §14): só no high; lançam o jogador, o Golem e os monstros perto;
  // só os blocos da cena recebem (o pano de fundo e o horizonte ficam como estão)
  const sceneMeshes = new Set(blocks.flatMap((b) => [b.m0, b.m1]).filter((m): m is Mesh => !!m))
  const shadows = new CharShadows(scene, sun, quality, { receives: (m) => sceneMeshes.has(m as Mesh) })
  const shadowWho = () => ({
    me: { root: char.holder, x: body.x, z: body.z, setContact: (on: boolean) => char.setContact(on) },
    others: [
      ...golems.map((gm) => ({ root: gm.char.holder, x: gm.x, z: gm.z, setContact: (on: boolean) => gm.char.setContact(on) })),
      ...mobs.flatMap((m) => {
        const mm = m.model
        return mm ? [{ root: mm.shadowRoot, x: m.x, z: m.z, setContact: (on: boolean) => mm.setContact(on) }] : []
      }),
    ],
  })
  let engaged = false
  let time = 0
  const stepMobs = (dt: number) => {
    for (const m of mobs) {
      const down = isDown(m.id)
      const d = Math.hypot(m.x - body.x, m.z - body.z)
      const want = !down && d < (m.model ? HIDE_D : SHOW_D)
      if (want && !m.model) m.model = modelFor(m)
      else if (!want && m.model) {
        m.bubble?.dispose()
        m.bubble = null
        parkModel(m.sector, m.model)
        m.model = null
        m.sealedLook = 0
      }
      if (!m.model) continue
      const open = sectorOpen(m.sector)
      setSealedLook(m, !open)
      let speed = 0
      // o guardião do castelo (setor aberto) persegue como o bando; o selado fica parado como os outros chefes
      const hunts = !m.boss || (!!m.guard && open)
      if (!hunts || !open) {
        // o chefe e o bando selado ficam parados olhando quem chega (o chefe, perto)
        if (d < SEE * 1.6) m.facing = lerpAngle(m.facing, Math.atan2(body.x - m.x, body.z - m.z), 1 - Math.exp(-4 * dt))
        if (m.boss) bossTalk(m, d, open)
      } else {
        const home = Math.hypot(m.x - m.hx, m.z - m.hz)
        const see = m.guard ? GUARD_SEE : SEE, leash = m.guard ? GUARD_LEASH : LEASH
        // atrás da cortina (monstros ainda sendo preparados) ninguém persegue
        m.chasing = readySent && !engaged && !input.blocked && !story && d < (m.chasing ? see * 1.5 : see) && home < leash
        // o guardião avisa (card com o retrato) ao ver quem chega, e não vagueia: sem ninguém, volta à escada
        if (m.guard) {
          bossTalk(m, d, open)
          if (!m.chasing) {
            m.tx = m.hx
            m.tz = m.hz
            m.wait = 1
            if (home < 0.4) m.facing = lerpAngle(m.facing, d < see * 2 ? Math.atan2(body.x - m.x, body.z - m.z) : m.facing, 1 - Math.exp(-4 * dt))
          }
        }
        let gx = m.tx, gz = m.tz, v = WANDER_V
        if (m.chasing) {
          gx = body.x
          gz = body.z
          v = CHASE_V
        } else if (Math.hypot(m.tx - m.x, m.tz - m.z) < 0.4) {
          if (!m.guard) m.wait -= dt
          if (m.wait <= 0) {
            pickTarget(m)
            m.wait = 1.5 + Math.random() * 3
          }
          v = 0
        }
        if (v > 0) {
          const dx = gx - m.x, dz = gz - m.z, L = Math.hypot(dx, dz) || 1
          const step = Math.min(v * dt, Math.max(0, L - (m.chasing ? TOUCH * 0.6 : 0)))
          const nx = m.x + (dx / L) * step, nz = m.z + (dz / L) * step
          if (free(nx, nz, 0.5)) {
            m.x = nx
            m.z = nz
            speed = step / Math.max(dt, 1e-3)
          } else if (!m.chasing) pickTarget(m)
          m.facing = lerpAngle(m.facing, Math.atan2(dx, dz), 1 - Math.exp(-8 * dt))
        }
        if (m.chasing && d <= TOUCH && !engaged && !input.blocked && !story) {
          engaged = true
          opts.onEngage?.(m.sector, m.id)
        }
      }
      m.model.update(dt, { x: m.x, y: 0, z: m.z, facing: m.facing, state: "chase", t: time, warn: 0, speed, calm: !m.chasing })
    }
  }

  // ── apresentação 16: a cena de história com o Golem (igual ao corredor) ──
  let story: { shot: StoryShot; t: number; a: StorySubject; b: StorySubject } | null = null
  let dof: DefaultRenderingPipeline | null = null
  let dofWanted = false
  const baseFov = follow.camera.fov
  const STORY_SEP = 7.2
  const SHOT_S = 3.2
  const golemHead = () => {
    const gm = golems[0]
    if (!gm) return 2.6
    const { max } = gm.char.holder.getHierarchyBoundingVectors(true)
    return Math.max(1.6, max.y * 0.68)
  }
  function storyFrame(dt: number) {
    if (!story) return
    story.t += dt
    const p = shotPose(story.shot, story.a, story.b, story.t / SHOT_S)
    const cam = follow.camera
    cam.position.copyFrom(p.pos)
    cam.setTarget(p.target)
    cam.rotation.z = p.roll
    cam.fov = p.fov
    if (dof) dof.depthOfField.focusDistance = p.focus * 1000
  }
  function setStory(shot: StoryShot | null) {
    const gm = golems[0]
    if (!shot || !gm) {
      story = null
      dofWanted = false
      dof?.dispose()
      dof = null
      follow.camera.rotation.z = 0
      follow.camera.fov = baseFov
      follow.snapBehind(body.x, body.z, body.facing)
      return
    }
    if (!story) {
      const sep = Math.hypot(body.x - gm.x, body.z - gm.z) || 1
      const k = STORY_SEP / sep
      const nx = gm.x + (body.x - gm.x) * k, nz = gm.z + (body.z - gm.z) * k
      if (free(nx, nz, 0.4)) {
        body.x = nx
        body.z = nz
      }
      char.place(body.x, body.z, body.facing, 0)
    }
    body.facing = Math.atan2(gm.x - body.x, gm.z - body.z)
    visualFacing = body.facing
    body.vx = 0
    body.vz = 0
    const a: StorySubject = { x: body.x, z: body.z, head: 1.55 }
    story = { shot, t: 0, a, b: story?.b ?? { x: gm.x, z: gm.z, head: golemHead() } }
    storyFrame(0)
    if (!low && !dof && !dofWanted) {
      dofWanted = true
      void import("@babylonjs/core/PostProcesses/RenderPipeline/Pipelines/defaultRenderingPipeline").then(({ DefaultRenderingPipeline }) => {
        if (disposed || !story || dof) return
        dof = new DefaultRenderingPipeline("mm-story", false, scene, [follow.camera])
        dof.depthOfFieldEnabled = true
        dof.depthOfField.fStop = 1.4
        dof.depthOfField.focalLength = 50
        dof.depthOfField.focusDistance = 3000
      })
    }
  }

  // ── andar, câmera e o que está perto ────────────────────────────────────
  const input = createInputState()
  const detachInput = attachInput(canvas, input)
  let nearby: OpenNear = null
  const sameNear = (a: OpenNear, b: OpenNear) => JSON.stringify(a) === JSON.stringify(b)
  const findNearby = (): OpenNear => {
    for (const b of bossSpots) {
      if (Math.hypot(b.x - body.x, b.z - body.z) > REACH) continue
      if (isDown(`${b.sector}:chefe`) || (b.sector === guardSector && guardDown())) continue
      return sectorOpen(b.sector) ? { kind: "guard", sector: b.sector } : { kind: "sealed", sector: b.sector, boss: true }
    }
    if (Math.hypot(entrada.x - body.x, entrada.z - body.z) < REACH + 1) return sc.n > 1 ? { kind: "back" } : { kind: "exit" }
    if (saida && Math.hypot(saida.x - body.x, saida.z - body.z) < REACH + 1.4) {
      if (sc.passage) return passageOpen ? { kind: "next" } : { kind: "sealed", sector: sc.boss, boss: true, portal: true }
      if (domain.passage && (bypass || best >= 10)) return { kind: "passage" }
      return null
    }
    for (const m of mobs) if (!m.boss && m.model && !sectorOpen(m.sector) && Math.hypot(m.x - body.x, m.z - body.z) < REACH) return { kind: "sealed", sector: m.sector, boss: false }
    return null
  }

  // ── N4: o deus solto dentro do Domínio ──
  let hunter: { god: GodId; fig: GodFigure | null; at: number; x: number; z: number; facing: number; caught: boolean } | null = null
  const setGod = (god: GodId | null, delayMs: number = GOD_HUNT.DOMAIN_DELAY_MS) => {
    hunter?.fig?.dispose()
    hunter = god ? { god, fig: null, at: performance.now() + delayMs, x: 0, z: 0, facing: 0, caught: false } : null
  }
  const stepGod = (dt: number) => {
    const h = hunter
    if (!h || h.caught || story) return
    if (!h.fig) {
      if (performance.now() < h.at || input.blocked) return
      // aparece atrás de quem anda (num chão livre); sem lugar livre, na entrada
      const bx = body.x - Math.sin(body.facing) * GOD_HUNT.DOMAIN_BEHIND
      const bz = body.z - Math.cos(body.facing) * GOD_HUNT.DOMAIN_BEHIND
      const p = free(bx, bz, 1) ? { x: bx, z: bz } : ahead(entrada, 1)
      h.x = p.x
      h.z = p.z
      h.fig = new GodFigure(scene, h.god)
    }
    const d = Math.hypot(body.x - h.x, body.z - h.z)
    h.facing = Math.atan2(body.x - h.x, body.z - h.z)
    const step = Math.min(GOD_HUNT.CHASE_V * dt, Math.max(0, d - GOD_HUNT.CATCH * 0.5))
    h.x += Math.sin(h.facing) * step
    h.z += Math.cos(h.facing) * step
    h.fig.update(dt, h.x, h.z, h.facing, step / Math.max(dt, 1e-3))
    if (d <= GOD_HUNT.CATCH && !input.blocked) {
      h.caught = true
      opts.onGodCatch?.(h.god)
    }
  }

  // ── o mapa da cena (radar + pergaminho): montado uma vez, a posição é lida pela interface ~8×/s ──
  const ML = opts.mapLabels ?? {
    title: domain.id,
    exit: "Voltar à praça",
    passage: "Passagem",
    part: (n: number) => `Parte ${n}`,
    sector: (n: number) => `Setor ${n}`,
    boss: (n: number) => `Chefe · Setor ${n}`,
    guard: (n: number) => `Guardião · Setor ${n}`,
    god: domain.god,
    place: (id: string) => id,
    hunt: (g: GodId) => g,
  }
  const dropMap = setCityMap(
    dominioMapModel(
      {
        domain: domain.id,
        bounds: { x0: minX, x1: maxX, z0: minZ, z1: maxZ },
        walk: cena.walk,
        blockers: cena.blockers,
        aguas: cena.aguas,
        zonas: cena.zonas,
        castelo: cena.castelo,
        pontos: P,
        scene: { n: sc.n, total: domain.scenes?.length ?? 3, boss: sc.boss, god: sc.god, passage: sc.passage },
        sectorState: (s) => (s <= best ? "done" : sectorOpen(s) ? "open" : "sealed"),
        places,
      },
      ML,
    ),
    () => ({
      x: body.x,
      z: body.z,
      facing: visualFacing,
      marks: hunter?.fig && !hunter.caught ? [{ id: "hunt", icon: "crown", label: ML.hunt(hunter.god), x: hunter.x, z: hunter.z }] : undefined,
    }),
  )

  let place: string | null = null
  let spot: string | null = null
  let sector = -1
  scene.onBeforeRenderObservable.add(() => {
    const dt = Math.min(engine.getDeltaTime() / 1000, 0.1)
    time += dt
    floorLights?.tick(time)
    stepGod(dt)
    let intent: Intent = { x: 0, z: 0, run: false }
    if (!input.blocked) {
      if (input.camDX || input.camDY) {
        follow.rotate(input.camDX * 0.006, input.camDY * 0.004)
        input.camDX = 0
        input.camDY = 0
      }
      if (input.zoom) {
        follow.zoom(input.zoom * 0.8)
        input.zoom = 0
      }
      const axis = moveAxis(input)
      const f = follow.forward()
      intent = { x: f.x * axis.y + f.z * axis.x, z: f.z * axis.y - f.x * axis.x, run: wantsRun(input) }
      if (Math.hypot(intent.x, intent.z) < 0.05) intent = { x: 0, z: 0, run: intent.run }
    }
    move = stepInterior(body, intent, dt, def, { walk: MOTION.WALK_SPEED, run: MOTION.RUN_SPEED })
    visualFacing = lerpAngle(visualFacing, body.facing, 1 - Math.exp(-12 * dt))
    char.place(body.x, body.z, visualFacing, 0)
    char.animate(dt, move, Math.hypot(body.vx, body.vz))
    for (const gm of golems) gm.char.animate(dt, 3, 0)
    stepMobs(dt)
    stepDoor(dt)
    shadows.update(shadowWho)
    lodT -= dt
    if (lodT <= 0) {
      lodT = 0.3
      refreshLod(body.x, body.z)
    }
    const z = cena.zonas.find((q) => inPoly(body.x, body.z, q.poly))
    const s = z ? z.setor : 0
    if (s !== sector) {
      sector = s
      opts.onSector?.(s)
    }
    const pl = places.find((p) => Math.hypot(p.x - body.x, p.z - body.z) < PLACE_R)?.id ?? null
    if (pl !== place) {
      place = pl
      opts.onPlace?.(place)
    }
    const spt = place && golems.some((gm) => Math.hypot(gm.x - body.x, gm.z - body.z) <= GOLEM_NEAR) ? "golem" : null
    if (spt !== spot) {
      spot = spt
      opts.onSpot?.(spot)
    }
    if (story) storyFrame(dt)
    else follow.update(dt, body.x, body.z, boxes, 0)
    // cena de história (câmera e foco de cinema): não é desempenho de jogo, não conta
    if (story) governor.hold(1500)
    governor.tick(engine.getDeltaTime())
    const next = findNearby()
    if (!sameNear(next, nearby)) {
      nearby = next
      opts.onNearbyChange?.(nearby)
    }
    if (input.interactQueued) {
      input.interactQueued = false
      if (nearby && !input.blocked) opts.onInteract?.(nearby)
    }
  })

  // Os monstros da cena são preparados ATRÁS DA CORTINA (2026-11-15): todos (até POOL_CAP por tipo),
  // um por quadro, guardados. Clonar um corpo com esqueleto custa ~100–150 ms num celular (o
  // Babylon passa os vértices pelo esqueleto na CPU a cada cópia): no jogo isso era o engasgo de
  // quem anda. A tela só fica pronta quando tudo chegou e compilou (ou no teto WARM_MAX_MS).
  const WARM_MAX_MS = low ? 7000 : 5000
  const warmQueue: number[] = []
  /** Quantos de cada tipo ficam prontos (guardados + à vista). */
  const warmWant = new Map<string, number>()
  for (const m of mobs) {
    if (isDown(m.id)) continue
    const k = sigOf(m.sector)
    const n = warmWant.get(k) ?? 0
    if (n >= POOL_CAP) continue
    warmWant.set(k, n + 1)
    warmQueue.push(m.sector)
  }
  const warming: MonsterModel[] = []
  const warmStart = performance.now()
  let sceneReady = false
  let readySent = false
  const warmStep = () => {
    if (readySent || disposed) return
    const sector = warmQueue.shift()
    if (sector != null) {
      const k = sigOf(sector)
      const have = (parked.get(k)?.length ?? 0) + mobs.filter((m) => m.model && sigOf(m.sector) === k).length
      if (have < (warmWant.get(k) ?? 0)) {
        const mm = timedModel(sector)
        parkModel(sector, mm)
        warming.push(mm)
      }
      return
    }
    const late = performance.now() - warmStart > WARM_MAX_MS
    const inUse = mobs.flatMap((m) => (m.model ? [m.model] : []))
    if (!sceneReady || (!late && ![...warming, ...inUse].every((mm) => mm.loaded))) return
    // tudo chegou: compila os shaders de quem está guardado e de quem já está à vista
    for (const mm of [...warming, ...inUse]) mm.warm()
    readySent = true
    scene.onBeforeRenderObservable.remove(warmObs)
    opts.onReady?.()
  }
  const warmObs = scene.onBeforeRenderObservable.add(warmStep)
  scene.executeWhenReady(() => {
    sceneReady = true
  })
  engine.runRenderLoop(() => {
    if (!disposed) scene.render()
  })
  const ro = new ResizeObserver(() => {
    if (!disposed) engine.resize()
  })
  ro.observe(canvas)
  const lost = engine.onContextLostObservable.add(() => {
    if (!disposed) opts.onError?.("context-lost")
  })
  // conferência (harness)
  if (process.env.NODE_ENV !== "production")
    (window as unknown as Record<string, unknown>).__mmDomain = {
      open: true,
      where: () => ({ x: body.x, z: body.z, sector, best, near: nearby, place, spot, scene: sc.name, mobs: mobs.map((m) => ({ id: m.id, x: +m.x.toFixed(1), z: +m.z.toFixed(1), shown: !!m.model, chasing: m.chasing })) }),
      teleport: (x: number, z: number, yaw?: number) => {
        body.x = x
        body.z = z
        follow.snapBehind(body.x, body.z, yaw ?? body.facing)
        refreshLod(x, z)
      },
      turn: (yaw: number) => follow.snapBehind(body.x, body.z, yaw),
      pontos: () => cena.pontos,
      ambient: () => ambient?.stats() ?? null,
      ambientOn: (on: boolean) => ambient?.setEnabled(on),
      zonas: () => cena.zonas,
      door: () => ({ open: doorOpen, anim: doorAnim, mesh: !!doorMesh && doorMesh.isEnabled(), y: doorMesh ? +doorMesh.position.y.toFixed(2) : null, box: doorBox, guard: mobs.find((m) => m.guard)?.id ?? null }),
      pool: () => ({ ...poolStats, createMs: Math.round(poolStats.createMs), kept: [...parked.values()].reduce((n, l) => n + l.length, 0) }),
    }

  return {
    input,
    setJoystick(x, y) {
      input.joyX = x
      input.joyY = y
    },
    setRun(on) {
      input.runToggle = on
    },
    setBlocked(b) {
      input.blocked = b
      clearInput(input)
      if (!b) engaged = false
    },
    interact() {
      if (nearby && !input.blocked) opts.onInteract?.(nearby)
    },
    recenter() {
      follow.snapBehind(body.x, body.z, body.facing)
    },
    story: setStory,
    setGod,
    setProgress(b) {
      best = Math.max(best, Math.max(0, Math.min(10, b)))
      if (best >= sc.boss) passageOpen = !!sc.passage
      exitPortal?.setOpen(!!exitOpen())
      // o guardião caiu sem a cena remontar: ele some e a porta abre na frente de quem está
      if (guardDown() && !doorOpen) {
        const gi = mobs.findIndex((m) => m.guard)
        if (gi >= 0) {
          const gm = mobs[gi]
          gm.bubble?.dispose()
          gm.model?.dispose()
          mobs.splice(gi, 1)
        }
        openDoor(true)
      }
    },
    dispose() {
      if (disposed) return
      disposed = true
      dropMap()
      engine.stopRenderLoop()
      dof?.dispose()
      detachInput()
      ro.disconnect()
      engine.onContextLostObservable.remove(lost)
      for (const m of mobs) {
        m.bubble?.dispose()
        m.model?.dispose()
      }
      for (const list of parked.values()) for (const mm of list) mm.dispose()
      parked.clear()
      for (const pt of portals) pt.dispose()
      ambient?.dispose()
      floorLights?.dispose()
      shadows.dispose()
      bloom.dispose()
      hunter?.fig?.dispose()
      hunter = null
      for (const gm of golems) gm.char.dispose()
      char.dispose()
      lib.dispose()
      near0.dispose()
      far1.dispose()
      dropAstro()
      dropAurora()
      sky?.dispose()
      fallbackMat.dispose()
      shadowMat.dispose()
      scene.dispose()
      engine.dispose()
      musicSnd.dispose()
      unlive()
      if (process.env.NODE_ENV !== "production") delete (window as unknown as Record<string, unknown>).__mmDomain
    },
  }
}
