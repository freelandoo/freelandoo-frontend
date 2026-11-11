// features/meu-mundo/dominio/engine/domain-game.ts — lore v2 D1: a CENA de um Domínio.
//
// Um ambiente 3D próprio (como o interior dos prédios, place-game.ts): enquanto ela
// está aberta o centro sai da memória (ui/offstage.ts) e, quando a luta abre, ELA
// sai também (a tela, domain-view.tsx, desmonta esta cena e monta a das Lâminas).
//
// Cena GENÉRICA de 10 setores (a mesma para os seis Domínios; o tema é o kit):
//   z −14…0      clareira da entrada, com o arco de volta para a praça
//   z 0…280      10 setores de 28 m em fila; no meio de cada um, o guardião do setor
//                (o corpo que o SERVIDOR mandou); no fim, o portão — fechado (véu
//                aceso + colisão) até o setor ser vencido
//   z 280…316    o trecho de passagem para o próximo Domínio (mistura os dois kits),
//                aberto só depois do setor 10; no fim, o arco da travessia
// D2: lugares que o SERVIDOR manda (`domain.places`) abrem uma clareira ao lado do setor:
// Pedraverde (Floresta, setor 6) = vão na mata à direita, anel de cristais e o Golem de
// Pedra SENTADO num tronco, olhando para o caminho (o peito aberto é arte do Alex; o
// capítulo 8, C5, usa este lugar). O guardião usa o corpo da criatura da lore
// (`sectors[].foe`): Sonâmbulo = Raposa adulta, Selene = Vampira adulta, Noctis = o deus.
// Andar = a regra do interior (stepInterior) com a colisão daqui: nada é decidido
// aqui além de onde a pessoa está. Quem abre o setor é a luta re-simulada no
// servidor; a tela chama `setProgress` com o que o servidor devolveu.
//
// Orçamento (nível low: 60 mil triângulos, 40 chamadas): só os setores vizinhos ao
// do jogador ficam ligados; as peças trocam pela versão de longe a ~20–40 m; uma
// instância por peça repetida (uma chamada por peça e por versão).

import { Engine } from "@babylonjs/core/Engines/engine"
import { Scene } from "@babylonjs/core/scene"
import { HemisphericLight } from "@babylonjs/core/Lights/hemisphericLight"
import { DirectionalLight } from "@babylonjs/core/Lights/directionalLight"
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial"
import { Color3 } from "@babylonjs/core/Maths/math.color"
import { Vector3 } from "@babylonjs/core/Maths/math.vector"
import { CreatePlane } from "@babylonjs/core/Meshes/Builders/planeBuilder"
import type { Mesh } from "@babylonjs/core/Meshes/mesh"
import type { InstancedMesh } from "@babylonjs/core/Meshes/instancedMesh"
import { Character } from "../../engine/player"
import { AvatarLibrary } from "../../engine/avatars"
import { FollowCamera, STREET_CAMERA } from "../../engine/camera"
import { MOTION, lerpAngle, type Intent, type MoveState } from "../../engine/motion"
import { stepInterior, type InteriorBody } from "../../engine/interior-motion"
import { attachInput, clearInput, createInputState, moveAxis, wantsRun, type InputState } from "../../engine/input"
import type { Box2 } from "../../engine/collision"
import { liveGamesBump } from "../../engine/game"
import { ResolutionGovernor, resolveQuality } from "../../engine/quality"
import { markSceneStart } from "../../engine/scene-meter"
import { MonsterModel, setMonsterSkinMax } from "../../laminas/engine/monster-view"
import type { BodyId, InteriorDef } from "../../types"
import type { DomainInfo, DomainId } from "../../data"
import { KitPlacer, LOOKS, applyDomainLook, loadDomainKit, paintedGround, seeded, type DomainKitId, type KitPiece } from "./domain-kit"

/** Medidas da cena (metros). */
export const DOMAIN_SCENE = {
  sectorLen: 28,
  half: 6,
  entry: -14,
  passage: 36,
} as const
const L = DOMAIN_SCENE.sectorLen
const HALF = DOMAIN_SCENE.half
const END = 10 * L
const PASS_END = END + DOMAIN_SCENE.passage
/** Alcance do "Lutar" e dos arcos. */
const REACH = 3.4
/** O Golem de Pedra sentado: tronco a `dx` do centro da clareira; `y` baixa a pose de cadeira até ele. */
const GOLEM_SEAT = { dx: 4.6, y: 0 }

/** Onde a pessoa pode agir agora. */
export type DomainNear = { kind: "guard"; sector: number } | { kind: "exit" } | { kind: "passage" } | null

/** D2: a clareira de um lugar ao lado do setor (centro e meia-largura do quadrado andável). */
export const CLEARING = { dx: 9.5, half: 8 } as const

export interface DomainGameOptions {
  canvas: HTMLCanvasElement
  body: BodyId
  look?: string
  domain: DomainInfo
  /** Kit do tema da cena (D1: só a Floresta tem cena; os outros caem nela até a fatia de cada um). */
  kit: DomainKitId
  /** Kit do Domínio seguinte (o trecho de passagem mistura os dois). */
  nextKit?: DomainKitId | null
  /** Onde nascer: 0 = entrada; N = de volta da luta do setor N (na frente do guardião). */
  spawnSector?: number
  maxPixelRatio?: number
  onReady?: () => void
  onNearbyChange?: (n: DomainNear) => void
  /** Em que setor a pessoa está (0 = entrada, 11 = passagem). */
  onSector?: (s: number) => void
  /** D2: entrou/saiu de um lugar (clareira de Pedraverde) — null = no caminho. */
  onPlace?: (id: string | null) => void
  onInteract?: (n: Exclude<DomainNear, null>) => void
  onError?: (reason: "context-lost") => void
}

export interface DomainGameHandle {
  input: InputState
  setJoystick: (x: number, y: number) => void
  setRun: (on: boolean) => void
  setBlocked: (blocked: boolean) => void
  interact: () => void
  recenter: () => void
  /** O servidor devolveu o maior setor vencido: abre os portões. */
  setProgress: (best: number) => void
  dispose: () => void
}

/** Setor (0 = entrada, 1–10, 11 = passagem) de uma posição z. */
export const sectorAt = (z: number) => (z < 0 ? 0 : z >= END ? 11 : Math.floor(z / L) + 1)

export function createDomainGame(opts: DomainGameOptions): DomainGameHandle {
  const { canvas, domain } = opts
  const engine = new Engine(canvas, true, { stencil: false, preserveDrawingBuffer: false, powerPreference: "default" }, false)
  const unlive = liveGamesBump()
  let disposed = false
  const quality = resolveQuality()
  const low = quality.tier === "low"
  const governor = new ResolutionGovernor(engine, quality, Math.min(window.devicePixelRatio || 1, opts.maxPixelRatio ?? 1.5))

  const scene = new Scene(engine)
  scene.skipPointerMovePicking = true
  scene.skipPointerDownPicking = true
  scene.skipPointerUpPicking = true
  markSceneStart(engine)
  const look = LOOKS[opts.kit] ?? LOOKS.floresta
  const hemi = new HemisphericLight("mm-dom-hemi", new Vector3(0, 1, 0), scene)
  const moon = new DirectionalLight("mm-dom-moon", new Vector3(0.3, -1, 0.4), scene)
  const sky = applyDomainLook(scene, look, hemi, moon)

  // ── chão e colisão ──────────────────────────────────────────────────────
  const ground = paintedGround(scene, "dom-ground", look, 44, PASS_END - DOMAIN_SCENE.entry + 30, 0, (PASS_END + DOMAIN_SCENE.entry) / 2, 4.2, 26)
  let best = Math.max(0, Math.min(10, domain.best))
  // D2: as clareiras (à direita do caminho, no meio do setor) — o vão na parede e a caixa delas
  const places = (domain.places ?? []).filter((p) => p.sector >= 1 && p.sector <= 10).map((p) => ({ ...p, x: HALF + CLEARING.dx, z: (p.sector - 0.5) * L }))
  const inClearing = (x: number, z: number, pad = 0) => places.find((p) => Math.abs(x - p.x) < CLEARING.half + pad && Math.abs(z - p.z) < CLEARING.half + pad) ?? null
  const zA = DOMAIN_SCENE.entry - 1
  const zB = PASS_END + 1
  /** Parede direita em pedaços, com o vão de cada clareira (8 m de boca). */
  const rightWall: Box2[] = []
  {
    let from = zA
    for (const p of [...places].sort((a, b) => a.z - b.z)) {
      const to = p.z - 4
      if (to > from) rightWall.push({ x: HALF + 0.5, z: (from + to) / 2, hx: 0.5, hz: (to - from) / 2, rot: 0, h: 4 })
      from = p.z + 4
      const C = CLEARING.half
      // a borda da clareira: fundo, frente e trás (a mata fecha; quem desenha é o kit)
      rightWall.push({ x: p.x + C + 0.5, z: p.z, hx: 0.5, hz: C + 1, rot: 0, h: 4 })
      rightWall.push({ x: p.x, z: p.z - C - 0.5, hx: C + 1, hz: 0.5, rot: 0, h: 4 })
      rightWall.push({ x: p.x, z: p.z + C + 0.5, hx: C + 1, hz: 0.5, rot: 0, h: 4 })
    }
    if (zB > from) rightWall.push({ x: HALF + 0.5, z: (from + zB) / 2, hx: 0.5, hz: (zB - from) / 2, rot: 0, h: 4 })
  }
  /** Paredes laterais (invisíveis: quem desenha a borda é a mata) e os portões fechados. */
  const walls: Box2[] = [{ x: -(HALF + 0.5), z: (PASS_END + DOMAIN_SCENE.entry) / 2, hx: 0.5, hz: (PASS_END - DOMAIN_SCENE.entry) / 2 + 1, rot: 0, h: 4 }, ...rightWall]
  const gateBox = (s: number): Box2 => ({ x: 0, z: s * L, hx: HALF + 1, hz: 0.6, rot: 0, h: 6 })
  let boxes: Box2[] = []
  const def = {
    floors: [{ y: 0, bounds: { minX: -HALF, maxX: places.length ? HALF + CLEARING.dx + CLEARING.half : HALF, minZ: DOMAIN_SCENE.entry + 1, maxZ: PASS_END - 1 }, boxes }],
    stairs: [],
  } as unknown as InteriorDef
  const rebuildBoxes = () => {
    boxes = [...walls]
    // portão do fim do setor s: fechado enquanto o setor não foi vencido
    for (let s = 1; s <= 10; s++) if (best < s) boxes.push(gateBox(s))
    ;(def.floors[0] as unknown as { boxes: Box2[] }).boxes = boxes
  }
  rebuildBoxes()

  // ── véu dos portões fechados (a mesma luz da borda da luta) ─────────────
  const veilMat = new StandardMaterial("dom-veil", scene)
  veilMat.emissiveColor = Color3.FromHexString(look.ground.glow)
  veilMat.diffuseColor = new Color3(0, 0, 0)
  veilMat.disableLighting = true
  veilMat.alpha = 0.32
  veilMat.backFaceCulling = false
  const veils: Mesh[] = []
  for (let s = 1; s <= 10; s++) {
    const v = CreatePlane(`dom-veil-${s}`, { width: 2 * HALF + 1.2, height: 6.6 }, scene)
    v.position.set(0, 3.3, s * L)
    v.material = veilMat
    v.isPickable = false
    v.freezeWorldMatrix()
    veils.push(v)
  }
  const showVeils = () => veils.forEach((v, i) => v.setEnabled(best < i + 1))
  showVeils()

  // ── o kit: dressing por setor (só os vizinhos ficam ligados) ────────────
  const groups: InstancedMesh[][] = Array.from({ length: 12 }, () => [])
  let placer: KitPlacer | null = null
  let nextPlacer: KitPlacer | null = null
  const drops: (() => void)[] = []
  const alive = () => !disposed
  const dress = (p: KitPlacer, g: number, piece: KitPiece, x: number, z: number, h: number, yaw: number, y = 0) => {
    const m = p.put(piece, x, z, h, yaw, y)
    if (m) groups[g].push(m)
  }
  // só os arquivos das peças que a cena usa (a moldura do Jetpack, 1024, fica de fora)
  const scenePieces: KitPiece[] = ["arco", "lanterna", "cogumelo", "arvore", "arvore2", "planta", "flor", "cogumelo-casa", "ninho", "cristais", "tronco-caido", ...(low ? [] : (["ilha"] as KitPiece[]))]
  /** Peça da beira que cairia dentro de uma clareira (ou na boca dela) fica de fora. */
  const clear = (x: number, z: number) => !inClearing(x, z, 2.5)
  void loadDomainKit(scene, opts.kit, alive, scenePieces).then((kit) => {
    if (disposed) return kit.dispose()
    drops.push(kit.dispose)
    const p = new KitPlacer(kit, "dom")
    placer = p
    const thin = low ? 0.6 : 1
    // entrada: clareira com o arco de volta para a praça (de frente para quem chega)
    dress(p, 0, "arco", 0, DOMAIN_SCENE.entry + 3.5, 10, Math.PI)
    for (const s of [-1, 1]) {
      dress(p, 0, "lanterna", s * 4.2, -4, 1.7, 0)
      dress(p, 0, "cogumelo", s * 8.5, -9, 4.2, s)
      dress(p, 0, "arvore", s * 13, -6, 16, s * 2)
    }
    for (let sec = 1; sec <= 10; sec++) {
      const r = seeded(sec * 131 + 7)
      const z0 = (sec - 1) * L
      // portão no fim do setor
      dress(p, sec, "arco", 0, sec * L, 14, 0)
      // árvores altas nas duas bordas (a parede da mata): são as colossais do Jetpack, feitas
      // para longe — de perto ficam facetadas (sem mapa de normal), então ficam atrás da beira
      const trees = Math.round(6 * thin)
      for (let i = 0; i < trees; i++) {
        const s = i % 2 ? 1 : -1
        const tx = s * (16 + r() * 8)
        const tz = z0 + ((i + 0.5) / trees) * L
        const th = 22 + r() * 8
        const ty = r() * 6
        // ao lado de uma clareira as árvores vão para trás dela (a mata em volta)
        // (a copa das colossais tem ~8 m de raio: o tronco fica a 18 m além)
        dress(p, sec, i % 3 ? "arvore" : "arvore2", clear(tx, tz) && !inClearing(tx, tz, 10) ? tx : tx + 18, tz, th, ty)
      }
      // beira do caminho: plantas, flores, lanternas, cogumelos
      const small: KitPiece[] = ["planta", "flor", "lanterna", "cogumelo", "planta", "flor"]
      const n = Math.round(small.length * thin)
      for (let i = 0; i < n; i++) {
        const s = r() < 0.5 ? -1 : 1
        const piece = small[i]
        const h = piece === "cogumelo" ? 3 + r() * 2 : piece === "lanterna" ? 1.6 : 1.4 + r() * 1.2
        const px = s * (HALF + 1.2 + r() * 2.2)
        const pz = z0 + 3 + r() * (L - 6)
        const py = r() * 6
        if (clear(px, pz)) dress(p, sec, piece, px, pz, h, py)
      }
      // a peça-herói do setor (uma por setor conta a história; a D2 troca pelas da lore)
      const hero: KitPiece[] = ["cogumelo-casa", "ninho", "cristais", "tronco-caido", "cogumelo-casa", "cristais", "ninho", "tronco-caido", "cristais", "cogumelo-casa"]
      const hs = sec % 2 ? 1 : -1
      dress(p, sec, hero[sec - 1], hs * (HALF + 4.5), z0 + L * 0.55, hero[sec - 1] === "cogumelo-casa" ? 7 : hero[sec - 1] === "tronco-caido" ? 2.2 : 3.4, r() * 6)
      // fundos 9–10: o palácio — cristais em coroa perto do portão
      if (sec >= 9) for (const s of [-1, 1]) dress(p, sec, "cristais", s * (HALF - 0.6), sec * L - 3, 3.2, s)
    }
    // D2: as clareiras (Pedraverde): anel de cristais acesos e mata baixa na borda, lanternas
    // na boca e o tronco em que o Golem senta, no fundo, de frente para o caminho
    for (const pl of places) {
      const g = pl.sector
      const C = CLEARING.half
      const r = seeded(pl.sector * 977 + 3)
      const ringN = low ? 7 : 11
      for (let i = 0; i < ringN; i++) {
        const a = -Math.PI * 0.42 + (i / (ringN - 1)) * Math.PI * 0.84
        dress(p, g, i % 2 ? "cristais" : "planta", pl.x + Math.cos(a) * (C - 0.6), pl.z + Math.sin(a) * (C - 0.6) * 1.05, 2.2 + r(), r() * 6)
      }
      for (const s of [-1, 1]) {
        dress(p, g, "lanterna", HALF + 1.4, pl.z + s * 4.6, 1.7, 0)
        dress(p, g, "cogumelo", pl.x + C - 1.5, pl.z + s * (C - 1.6), 3.4, s)
        // mata alta atrás da clareira: casas-cogumelo e a árvore grande bem atrás (a copa não entra)
        dress(p, g, "cogumelo-casa", pl.x + C + 3, pl.z + s * 6, 9, s * 0.8)
      }
      dress(p, g, "arvore2", pl.x + C + 14, pl.z, 30, 1.2)
      // o assento do Golem: tronco caído atravessado, ~1,2 m (a pose de sentar é de cadeira)
      dress(p, g, "tronco-caido", pl.x + GOLEM_SEAT.dx, pl.z, 1.2, Math.PI / 2)
    }
    // ilhas da floresta no alto, longe (horizonte) — ficam com a passagem
    if (!low) for (let i = 0; i < 4; i++) dress(p, 11, "ilha", (i % 2 ? 1 : -1) * 60, i * 80 + 20, 20, i, 26)
    // o trecho de passagem: metade do kit daqui
    for (let i = 0; i < 4; i++) dress(p, 11, i % 2 ? "arvore2" : "planta", (i % 2 ? 1 : -1) * (HALF + 3), END + 6 + i * 7, i % 2 ? 14 : 2.4, i)
    dress(p, 11, "arco", 0, PASS_END - 4, 12, 0)
    refresh(true)
  })
  // a outra metade da passagem vem do kit do Domínio seguinte (Cânion depois da Floresta);
  // só carrega perto dela (setor 10 em diante) e fora do low: no low a passagem fica com o
  // kit daqui (o segundo kit dobraria a memória de textura)
  let nextAsked = false
  const loadNext = () => {
    if (nextAsked || low || !opts.nextKit || opts.nextKit === opts.kit || !domain.passage) return
    nextAsked = true
    void loadDomainKit(scene, opts.nextKit, alive, ["paredao", "pedra-raizes", "cacto", "torre-vigia", "rocha"]).then((kit) => {
      if (disposed) return kit.dispose()
      drops.push(kit.dispose)
      const p = new KitPlacer(kit, "dom-next")
      nextPlacer = p
      const pieces: [KitPiece, number][] = [
        ["paredao", 9],
        ["pedra-raizes", 2.6],
        ["cacto", 2.4],
        ["torre-vigia", 8],
      ]
      for (let i = 0; i < pieces.length; i++) {
        const [piece, h] = pieces[i]
        dress(p, 11, piece, (i % 2 ? -1 : 1) * (HALF + 3 + (piece === "paredao" ? 4 : 0)), END + 10 + i * 6, h, i * 1.3)
      }
      dress(p, 11, "rocha", HALF + 6, PASS_END - 8, 2.2, 0.4)
      refresh(true)
    })
  }

  // ── quem joga ───────────────────────────────────────────────────────────
  // D2: como na rua — pele e malha leve pela qualidade (guardiões de skin e o Golem sentado
  // estouravam os 60 mil triângulos do low com a malha cheia a 30 m)
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
  const spawn = Math.max(0, Math.min(10, opts.spawnSector ?? 0))
  const body: InteriorBody = { x: 0, z: spawn ? (spawn - 0.5) * L - REACH - 1.2 : -8, vx: 0, vz: 0, facing: 0, floor: 0, y: 0 }
  let visualFacing = 0
  let move: MoveState = 0
  char.place(body.x, body.z, body.facing, 0)
  const follow = new FollowCamera(scene, STREET_CAMERA)
  scene.activeCamera = follow.camera
  follow.camera.maxZ = 260
  follow.snapBehind(body.x, body.z, body.facing)
  follow.update(1, body.x, body.z, boxes, 0)

  // ── D2: o Golem de Pedra sentado em Pedraverde (corpo `golem`, pose "Sit") ──
  const golems = places
    .filter((p) => p.id === "pedraverde")
    .map((p) => {
      const g = new Character(scene, lib, { fallback: fallbackMat, shadow: shadowMat }, "golem", null, false)
      // de frente para o caminho (−x); a pose de sentar desce até o tronco
      g.place(p.x + GOLEM_SEAT.dx + 0.35, p.z, -Math.PI / 2, GOLEM_SEAT.y)
      return { char: g, sector: p.sector }
    })

  // ── guardiões: o do setor aberto e os já vencidos (para lutar de novo) ──
  const guards = new Map<number, MonsterModel>()
  let time = 0
  let place: string | null = null
  const guardAt = (s: number) => ({ x: 0, z: (s - 0.5) * L })
  const wantGuard = (s: number) => s >= 1 && s <= 10 && s <= best + 1 && !!domain.sectors[s - 1]

  // ── setores vizinhos ligados, o resto desligado ─────────────────────────
  let cur = -1
  function refresh(force = false) {
    const s = sectorAt(body.z)
    if (s === cur && !force) return
    cur = s
    opts.onSector?.(s)
    if (s >= 10) loadNext()
    // no low, só o setor em que se está e o da frente (o de trás fica fora: a câmera olha para a frente)
    const near = (g: number) => (low ? g === s || g === s + 1 : Math.abs(g - s) <= 1)
    for (let g = 0; g < groups.length; g++) {
      // a entrada aparece da porta; a passagem a partir do setor 9 (10 no low); o resto, só os vizinhos
      const on = g === 0 ? s <= 1 : g === 11 ? s >= (low ? 10 : 9) : near(g)
      for (const m of groups[g]) m.setEnabled(on)
    }
    for (const gm of golems) gm.char.holder.setEnabled(near(gm.sector))
    for (let k = 1; k <= 10; k++) {
      const on = wantGuard(k) && near(k)
      const g = guards.get(k)
      if (on && !g) {
        const sec = domain.sectors[k - 1]
        // D2: o corpo da criatura da lore (de mão como o Hall, ou com a arma do tipo)
        const fb = sec.foe?.body ?? null
        const rig = !!sec.foe?.rig
        guards.set(k, new MonsterModel(scene, sec.kind, 1, fb && !rig ? { n: 0, body: fb, bare: true } : null, undefined, fb && rig ? fb : undefined))
      } else if (!on && g) {
        g.dispose()
        guards.delete(k)
      }
    }
  }
  refresh(true)

  // ── andar, câmera e o que está perto ────────────────────────────────────
  const input = createInputState()
  const detachInput = attachInput(canvas, input)
  let nearby: DomainNear = null
  const sameNear = (a: DomainNear, b: DomainNear) => (a === null || b === null ? a === b : a.kind === b.kind && (a.kind !== "guard" || (b.kind === "guard" && a.sector === b.sector)))
  const findNearby = (): DomainNear => {
    if (Math.hypot(body.x, body.z - (DOMAIN_SCENE.entry + 3.5)) < REACH + 1) return { kind: "exit" }
    if (best >= 10 && domain.passage && body.z > PASS_END - 9) return { kind: "passage" }
    for (const k of guards.keys()) {
      const p = guardAt(k)
      if (Math.hypot(p.x - body.x, p.z - body.z) <= REACH) return { kind: "guard", sector: k }
    }
    return null
  }

  scene.onBeforeRenderObservable.add(() => {
    const dt = Math.min(engine.getDeltaTime() / 1000, 0.1)
    time += dt
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
    for (const gm of golems) if (gm.char.holder.isEnabled()) gm.char.animate(dt, 3, 0)
    const pl = inClearing(body.x, body.z)?.id ?? null
    if (pl !== place) {
      place = pl
      opts.onPlace?.(place)
    }
    for (const [k, g] of guards) {
      const p = guardAt(k)
      // o guardião olha para quem chega
      const face = Math.atan2(body.x - p.x, body.z - p.z)
      g.update(dt, { x: p.x, y: 0, z: p.z, facing: face, state: "chase", t: time, warn: 0, speed: 0, calm: true })
    }
    follow.update(dt, body.x, body.z, boxes, 0)
    governor.tick(engine.getDeltaTime())
    refresh()
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
  // conferência (harness): onde está e quantos guardiões há
  if (process.env.NODE_ENV !== "production")
    (window as unknown as Record<string, unknown>).__mmDomain = {
      where: () => ({ x: body.x, z: body.z, sector: sectorAt(body.z), best, guards: [...guards.keys()], near: nearby, place }),
      teleport: (z: number, x = 0) => {
        body.z = z
        body.x = x
        follow.snapBehind(body.x, body.z, 0)
      },
      turn: (yaw: number) => follow.snapBehind(body.x, body.z, yaw),
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
    setBlocked(blocked) {
      input.blocked = blocked
      clearInput(input)
    },
    interact() {
      if (nearby && !input.blocked) opts.onInteract?.(nearby)
    },
    recenter() {
      follow.snapBehind(body.x, body.z, body.facing)
    },
    setProgress(b) {
      best = Math.max(best, Math.max(0, Math.min(10, b)))
      rebuildBoxes()
      showVeils()
      refresh(true)
    },
    dispose() {
      if (disposed) return
      disposed = true
      engine.stopRenderLoop()
      detachInput()
      ro.disconnect()
      engine.onContextLostObservable.remove(lost)
      for (const g of guards.values()) g.dispose()
      guards.clear()
      for (const gm of golems) gm.char.dispose()
      placer?.dispose()
      nextPlacer?.dispose()
      for (const d of drops) d()
      char.dispose()
      lib.dispose()
      for (const v of veils) v.dispose()
      veilMat.dispose()
      fallbackMat.dispose()
      shadowMat.dispose()
      ground.dispose()
      sky.dispose()
      scene.dispose()
      engine.dispose()
      unlive()
      if (process.env.NODE_ENV !== "production") delete (window as unknown as Record<string, unknown>).__mmDomain
    },
  }
}

/**
 * O kit da cena de cada Domínio. D1: a cena genérica é montada com o kit da Floresta
 * (o mesmo do Jetpack) para os seis; D5…D9 trocam aqui quando a cena de cada tema
 * existir (o kit do Cânion já entra no trecho de passagem da Floresta).
 */
export function sceneKitOf(id: DomainId | string | null | undefined): DomainKitId {
  void id
  return "floresta"
}
/** O kit do Domínio seguinte, que entra no trecho de passagem. */
export function passageKitOf(id: DomainId | string | null | undefined): DomainKitId | null {
  return id === "floresta" ? "canion" : null
}
