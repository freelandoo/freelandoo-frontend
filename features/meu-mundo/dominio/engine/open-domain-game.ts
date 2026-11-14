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
// (cena 3: o guardião na porta do castelo e o deus no salão) e luta pelo "Lutar". Vencido some
// até reaparecer (a tela guarda a hora em `defeated`). A passagem (`saida`) só leva à próxima cena
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
import { SceneBloom } from "../../engine/bloom-cena"
import { DOMAIN_REGION } from "../../engine/ambiente-fx/presets"
import { SpeechBubble } from "../../engine/speech-bubble"
import { SKY_REGIONS, skyArt, skyFog, skyOfCena, variantOfCena } from "../../engine/sky/sky-registry"
import { dominioMapModel, setCityMap, type DominioMapLabels } from "../../engine/city-map"
import { CENAS, astroDaCena, auroraDaCena, blocked, inPoly, montarCena, visualDaCena, aplicarCor, type CenaMontada, type XZ } from "../../engine/cena-codigo"

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
  /** Monstros vencidos: id → hora (ms) da vitória; somem até `RESPAWN_MS` depois. */
  defeated?: Record<string, number>
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
  const ambient = createAmbientFx(scene, skyId ?? DOMAIN_REGION[domain.id], quality.tier, { night: skyVar === "noite" ? 1 : 0 })

  /** Blocos: centro + as duas malhas (o pano de fundo de longe sai: o de perto basta). */
  const S = cena.cell
  const blocks: { cx: number; cz: number; m0: Mesh | null; m1: Mesh | null }[] = []
  {
    const byKey = new Map<string, { cx: number; cz: number; m0: Mesh | null; m1: Mesh | null }>()
    const keyOf = (m: Mesh) => m.name.slice(`cena-${cena.name}-`.length)
    for (const m of near0.meshes as Mesh[]) {
      const k = keyOf(m)
      if (k === "fundo" || k === "horizonte") continue
      const [a, b] = k.split(",").map(Number)
      byKey.set(k, { cx: (a + 0.5) * S + cena.off, cz: (b + 0.5) * S + cena.off, m0: m, m1: null })
    }
    for (const m of far1.meshes as Mesh[]) {
      const k = keyOf(m)
      if (k === "fundo" || k === "horizonte") {
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
        // na frente do chefe, um passo além do alcance (ele olha para quem chega)
        const p = ahead(b, REACH + 1.4)
        if (free(p.x, p.z)) return { x: p.x, z: p.z, facing: b.ang + Math.PI }
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
    for (const b of bossSpots) mobs.push({ id: `${b.sector}:chefe`, sector: b.sector, boss: true, x: b.x, z: b.z, hx: b.x, hz: b.z, facing: b.ang, tx: b.x, tz: b.z, wait: 0, chasing: false, model: null, sealedLook: 0 })
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
  const SHOW_D = Math.floor(50 * quality.lodScale)
  const modelFor = (m: Mob) => {
    const sec = domain.sectors[m.sector - 1]
    const fb = sec?.foe?.body ?? null
    const rig = !!sec?.foe?.rig
    return new MonsterModel(scene, sec?.kind ?? "cavaleiro", 1, fb && !rig ? { n: 0, body: fb, bare: true } : null, undefined, fb && rig ? fb : undefined)
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
      const want = !down && d < SHOW_D
      if (want && !m.model) m.model = modelFor(m)
      else if (!want && m.model) {
        m.bubble?.dispose()
        m.bubble = null
        m.model.dispose()
        m.model = null
        m.sealedLook = 0
      }
      if (!m.model) continue
      const open = sectorOpen(m.sector)
      setSealedLook(m, !open)
      let speed = 0
      if (m.boss || !open) {
        // o chefe e o bando selado ficam parados olhando quem chega (o chefe, perto)
        if (d < SEE * 1.6) m.facing = lerpAngle(m.facing, Math.atan2(body.x - m.x, body.z - m.z), 1 - Math.exp(-4 * dt))
        if (m.boss) bossTalk(m, d, open)
      } else {
        const home = Math.hypot(m.x - m.hx, m.z - m.hz)
        m.chasing = !engaged && !input.blocked && d < (m.chasing ? SEE * 1.5 : SEE) && home < LEASH
        let gx = m.tx, gz = m.tz, v = WANDER_V
        if (m.chasing) {
          gx = body.x
          gz = body.z
          v = CHASE_V
        } else if (Math.hypot(m.tx - m.x, m.tz - m.z) < 0.4) {
          m.wait -= dt
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
      if (isDown(`${b.sector}:chefe`)) continue
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

  scene.executeWhenReady(() => {
    if (!disposed) opts.onReady?.()
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
      for (const pt of portals) pt.dispose()
      ambient?.dispose()
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
