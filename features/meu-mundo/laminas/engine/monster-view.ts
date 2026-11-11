// features/meu-mundo/laminas/engine/monster-view.ts — ARENA DAS LÂMINAS (mm3d-48a): os monstros PROVISÓRIOS.
//
// Pedido do Alex (29/10): "cria eles bem simples, depois eu vou te mandar eles
// gerados para você substituir". Cada monstro é um boneco de formas (caixas,
// esferas, cilindros) com os olhos violeta do Sem-Nome, animado por código
// pela pose da regra (aviso = recua e brilha, golpe = avança, pancada =
// treme, morte = afunda). O mesmo boneco aparece na cidade (center-mobs.ts)
// e na arena. Trocar pelo modelo de verdade = outra classe com a mesma API
// (`update` e `dispose`).
//
// 2026-10-29 (Alex): modelos de verdade — Soldado de Pedra = Golem de Pedra
// (níveis 1 e 2), Golem de Sucata = Ciborgue, Harpia = Dama das Garras (os três
// são as skins de 2 m, rigadas com as animações do Sergio: andam e golpeiam com
// os clipes do boxe, como o jogador na arena) e o Lobo = a fera de 4 patas
// (mm3d-54: GLB com esqueleto e clipes próprios — Idle/Walk/Run/Bite/Pounce/
// Dodge pelo pipeline/laminas/build_lobo_anim.py; 2026-11-03: Hit/Die/Howl e os
// novos pelo build_lobo_aa.py, escolha do Alex, juntos no merge_lobo.py; os golpes
// tocam o trecho do clipe esticado na duração da regra). 2026-11-02: o Brutamontes é o
// minotauro do Alex (4 m, "do tamanho do Golem") com o machado de 3 m e as
// animações de machado (Pro Melee Axe Pack) — BRUTE abaixo.
//
// mm3d-57 (Alex, 30/10): no RINGUE do prédio do Boxe os adversários são GENTE
// de luva marrom (`human`): o mesmo tipo da regra (golpes, vida, velocidade),
// desenhado com os corpos de sempre e uma roupa própria por tipo — Soldado =
// boxeador normal, Lobos = trio magro e ligeiro, Golem = o pesadão (gordo),
// Brutamontes = o campeão (forte). A harpia voa: não entra no ringue.

import type { Scene } from "@babylonjs/core/scene"
import { TransformNode } from "@babylonjs/core/Meshes/transformNode"
import type { Mesh } from "@babylonjs/core/Meshes/mesh"
import { CreateBox } from "@babylonjs/core/Meshes/Builders/boxBuilder"
import { CreateSphere } from "@babylonjs/core/Meshes/Builders/sphereBuilder"
import { CreateCylinder } from "@babylonjs/core/Meshes/Builders/cylinderBuilder"
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial"
import { Color3 } from "@babylonjs/core/Maths/math.color"
import { LoadAssetContainerAsync } from "@babylonjs/core/Loading/sceneLoader"
import type { AssetContainer, InstantiatedEntries } from "@babylonjs/core/assetContainer"
import type { AnimationGroup } from "@babylonjs/core/Animations/animationGroup"
import type { MobKind, MobState } from "../sim/fight"
import { AvatarLibrary, ensureLoaders } from "../../engine/avatars"
import { Character } from "../../engine/player"
import type { BodyId } from "../../types"
import type { BoxeBase, BoxeClip } from "../../engine/avatars"
import { WeaponGrip, GRIP_BONES } from "../../engine/weapon-grip"
import { shineWeapon } from "../../engine/weapon-shine"
import { godGun, gunSize } from "../../engine/shop-swords"
import { CLAN_WEAPON } from "../../classes"
import { PBRMaterial } from "@babylonjs/core/Materials/PBR/pbrMaterial"
import { Vector3 } from "@babylonjs/core/Maths/math.vector"
import { BoxingGloves } from "./gloves"
import { BULKY_GUARD, PoseFix } from "../../engine/arm-ik"
import type { AbstractMesh } from "@babylonjs/core/Meshes/abstractMesh"
import { FloatStones } from "./float-stones"
import "@babylonjs/core/Rendering/outlineRenderer"

/**
 * Monstros com corpo de gente: a skin rigada e a escala. Tamanhos do Alex
 * (2026-11-03), iguais na luta e na rua: Golem de Pedra, Ciborgue e
 * Brutamontes 4 m (o tamanho do corpo), lobos 2,5 m de altura (WOLF_SCALE).
 * Regra do Alex (2026-11-06): quem aparece como monstro é igual à skin em altura, arma e
 * golpes: Golem de Pedra e Brutamontes de machado, Ciborgue com a arma de fogo.
 */
const RIGGED: Partial<Record<MobKind, { body: BodyId; scale: number }>> = {
  // F1 (lore v2): o Soldado de Pedra é o Cavaleiro Dourado (2 m, de espada); o Golem de Pedra tem tipo próprio
  cavaleiro: { body: "cavaleiro", scale: 1 },
  stone: { body: "golem", scale: 1 },
  ciborgue: { body: "ciborgue", scale: 1 },
  garras: { body: "garras", scale: 1 },
  // corpo de 4 m em escala 1 (Alex: "do tamanho do golem"; machado de 3 m)
  brute: { body: "brutamontes", scale: 1 },
}
/** O machado do Brutamontes (build_armas.py, 3 m no arquivo, origem na pegada; gltfpack). */
export const AXE_URL = "/meu-mundo/armas/v1/arma-machado-m64.glb"
/** Do punho às lâminas no eixo +Y do machado (m): o rastro roxo vai daqui até a ponta. */
export const AXE_EDGE: [number, number] = [1.0, 2.05]
type Seg = [number, number]
/**
 * Golpes do Brutamontes (regra: sweep/charge/smash) → clipe de machado e o
 * trecho de cada fase (0–1 do clipe). Contato medido no harness das classes
 * (peak.js: a mão mais rápida) — varrida 0,41, giro 0,36, revés 0,31, pancada
 * 0,36, salto 0,47 — e a fase `strike` em volta dele. Sorteia entre as opções.
 */
const BRUTE: Record<string, { clip: BoxeClip; windup: Seg; strike: Seg; recover: Seg }[]> = {
  sweep: [
    { clip: "XSweep", windup: [0, 0.36], strike: [0.36, 0.48], recover: [0.48, 0.85] },
    { clip: "X360", windup: [0, 0.31], strike: [0.31, 0.43], recover: [0.43, 0.8] },
    { clip: "XBack", windup: [0, 0.26], strike: [0.26, 0.38], recover: [0.38, 0.75] },
  ],
  charge: [{ clip: "XJump", windup: [0, 0.25], strike: [0.25, 0.49], recover: [0.49, 0.9] }],
  smash: [{ clip: "XSmash", windup: [0, 0.31], strike: [0.31, 0.42], recover: [0.42, 0.85] }],
}
const BRUTE_HIT: BoxeClip[] = ["XHitG", "XHitL", "XHitR"]
/**
 * O CIBORGUE atira como a skin (GUN_MOVES): braços baixos parado (2026-11-03, Alex: "nem dá
 * pra saber quando ele vai atacar"), ergue a arma no aviso e dispara no golpe da regra.
 */
const CIBORG: Record<string, { clip: BoxeClip; windup: Seg; strike: Seg; recover: Seg }[]> = {
  shot: [{ clip: "FgFire1", windup: [0, 0.1], strike: [0.1, 0.45], recover: [0.45, 0.6] }],
  blast: [{ clip: "FgFire", windup: [0, 0.1], strike: [0.1, 0.4], recover: [0.4, 0.7] }],
}
type Move = { clip: BoxeClip; windup: Seg; strike: Seg; recover: Seg }
/**
 * Regra do Alex (2026-11-06): o Golem de Pedra pula como o Brutamontes e dá socos de boxe; as
 * pedras (float-stones.ts) soltam o raio. Socos pelo trecho dos clipes do boxe (mesmos cortes
 * da luta do jogador, build_boxe_mocap).
 */
const STONE: Record<string, Move[]> = {
  jab: [{ clip: "BJab", windup: [0, 0.42], strike: [0.42, 0.7], recover: [0.7, 1] }],
  hook: [
    { clip: "BBox3", windup: [0.1, 0.33], strike: [0.33, 0.53], recover: [0.53, 0.8] },
    { clip: "BBox1", windup: [0.08, 0.32], strike: [0.32, 0.55], recover: [0.55, 0.8] },
    { clip: "BBox4", windup: [0.1, 0.34], strike: [0.34, 0.56], recover: [0.56, 0.8] },
  ],
  leap: BRUTE.charge,
  zap: [{ clip: "XTaunt", windup: [0, 0.2], strike: [0.2, 0.3], recover: [0.3, 0.45] }],
  max: [{ clip: "XTaunt", windup: [0, 0.35], strike: [0.35, 0.6], recover: [0.6, 0.9] }],
}
/**
 * O CAVALEIRO DOURADO (F1): os cortes de espada da classe dos Vampiros (mesmos trechos da luta
 * do jogador, CLAN_MOVES.vampiro em laminas-game.ts; contato a ~47% do trecho).
 */
const KNIGHT: Record<string, Move[]> = {
  cut: [
    { clip: "VSlash3", windup: [0.22, 0.37], strike: [0.37, 0.45], recover: [0.45, 0.58] },
    { clip: "VSlash1", windup: [0.25, 0.4], strike: [0.4, 0.48], recover: [0.48, 0.61] },
  ],
  thrust: [{ clip: "VAtk1", windup: [0.3, 0.45], strike: [0.45, 0.53], recover: [0.53, 0.66] }],
  great: [{ clip: "VGSlash", windup: [0.18, 0.42], strike: [0.42, 0.5], recover: [0.5, 0.72] }],
  combo: [{ clip: "VCombo", windup: [0.15, 0.43], strike: [0.43, 0.5], recover: [0.5, 0.71] }],
  block: [{ clip: "VPower", windup: [0, 0.3], strike: [0.3, 0.45], recover: [0.45, 0.7] }],
}
/** A Dama (build_garras_anim.py): nunca guarda fechada, garras abertas, sorteia entre os cortes. */
const CLAW: Record<string, Move[]> = {
  claw: [
    { clip: "GaSlashR", windup: [0, 0.3], strike: [0.3, 0.46], recover: [0.46, 1] },
    { clip: "GaSlashL", windup: [0, 0.3], strike: [0.3, 0.46], recover: [0.46, 1] },
    { clip: "GaUpper", windup: [0, 0.29], strike: [0.29, 0.46], recover: [0.46, 1] },
    { clip: "GaStab", windup: [0, 0.3], strike: [0.3, 0.44], recover: [0.44, 1] },
  ],
  rake: [
    { clip: "GaCross", windup: [0, 0.29], strike: [0.29, 0.46], recover: [0.46, 1] },
    { clip: "GaSpin", windup: [0, 0.21], strike: [0.21, 0.6], recover: [0.6, 1] },
  ],
  leap: [{ clip: "GaLeap", windup: [0, 0.22], strike: [0.22, 0.6], recover: [0.6, 1] }],
}
/**
 * mm3d-72: os 4 poderes de personagem (fight.ts MOB_SKILLS) nas animações de cada corpo —
 * Corte = o golpe largo, Investida = o salto/avanço, Escudo = o grito, Poder Máximo = a pancada.
 */
const TAUNT: Move = { clip: "XTaunt", windup: [0, 0.3], strike: [0.3, 0.45], recover: [0.45, 0.7] }
Object.assign(BRUTE, { skSlash: BRUTE.sweep, skDash: BRUTE.charge, skShield: [TAUNT], skUlt: BRUTE.smash })
Object.assign(CIBORG, { skSlash: CIBORG.blast, skDash: CIBORG.shot, skShield: [TAUNT], skUlt: CIBORG.blast })
Object.assign(STONE, { skSlash: STONE.zap, skDash: STONE.leap, skShield: [TAUNT], skUlt: STONE.max })
Object.assign(KNIGHT, { skSlash: KNIGHT.great, skDash: KNIGHT.thrust, skShield: KNIGHT.block, skUlt: KNIGHT.combo })
Object.assign(CLAW, { skSlash: CLAW.rake, skDash: CLAW.leap, skShield: CLAW.claw, skUlt: CLAW.rake })

/** Como cada um que luta de arma ou garra se desenha. `walk` null = a locomoção normal. */
const LOOK: Partial<Record<MobKind, { table: Record<string, Move[]>; idle: BoxeBase; walk: BoxeBase | null; run: BoxeBase | null; hit: BoxeClip[]; fall: BoxeClip; roar: [BoxeClip, number, number, number]; hop: number }>> = {
  cavaleiro: { table: KNIGHT, idle: "VIdle", walk: null, run: null, hit: ["VHit"], fall: "VDie", roar: ["VPower", 1.6, 0, 0.9], hop: 0 },
  stone: { table: STONE, idle: "XIdle", walk: "XWalk", run: "XRun", hit: BRUTE_HIT, fall: "BFall", roar: ["XTaunt", 1.6, 0, 0.9], hop: 0.9 },
  ciborgue: { table: CIBORG, idle: "XIdle", walk: "FgWalk", run: "FgRun", hit: BRUTE_HIT, fall: "XHitG", roar: ["XTaunt", 1.6, 0, 0.9], hop: 0 },
  brute: { table: BRUTE, idle: "XIdle", walk: "XWalk", run: "XRun", hit: BRUTE_HIT, fall: "BFall", roar: ["XTaunt", 1.6, 0, 0.9], hop: 0 },
  garras: { table: CLAW, idle: "GaIdle", walk: null, run: null, hit: ["GaHit"], fall: "BFall", roar: ["GaRoar", 1.6, 0, 1], hop: 1.7 },
}
/** Boca da arma de fogo no eixo da pegada (o mesmo ponto da skin). */
const MUZZLE = new Vector3(0.6, 0.1, 0)
/** Quem luta com arma na mão, nos golpes do Brutamontes ou no tiro do Ciborgue. */
const ARMED: Partial<Record<MobKind, string>> = { brute: AXE_URL, ciborgue: godGun("ciborgue")?.file, cavaleiro: CLAN_WEAPON.vampiro }
/** Do punho à ponta no eixo +Y da espada do Cavaleiro (m): o rastro do corte. */
const SWORD_EDGE: [number, number] = [0.2, 1.05]
/** Corrida do Brutamontes no ritmo do passo (m/s com o clipe a 1×, no corpo de 4 m). */
const BRUTE_RUN = 3.2

/**
 * Lutadores do ringue (mm3d-57): corpo, escala e roupa (look = camiseta,
 * calça, pele, cabelo na paleta de avatar-colors.ts). O trio de lobos varia a
 * roupa pelo número do monstro.
 */
const HUMAN: Record<MobKind, { body: BodyId; scale: number; looks: string[] }> = {
  cavaleiro: { body: "normal", scale: 1, looks: ["1240"] },
  // o Golem não luta no ringue (o menu do Boxe não o mostra); fica aqui só para o tipo fechar
  stone: { body: "strong", scale: 1.15, looks: ["2760"] },
  wolf: { body: "slim", scale: 1, looks: ["4115", "6260", "b350"] },
  ciborgue: { body: "fat", scale: 1.12, looks: ["3527"] },
  garras: { body: "female", scale: 1, looks: ["8913"] },
  brute: { body: "strong", scale: 1.15, looks: ["2760"] },
}
/** O lobo (pipeline/laminas/build_lobo_anim.py): o focinho chega no +X do Babylon → −90° leva ao +Z (frente). */
const WOLF_URL = "/meu-mundo/laminas/lobo-m65.glb"
const WOLF_TURN = -Math.PI / 2
/** 2,5 m de altura (Alex, 2026-11-03): na escala 2 o Idle mede 2,06 m (lobo-harness/probe.js). */
const WOLF_SCALE = (2 * 2.5) / 2.06
/**
 * Trechos de cada golpe no clipe (s), iguais aos de build_lobo_anim.py: o
 * preparo, o bote/mordida e a volta tocam esticados na duração da regra.
 */
type WolfMove = { clip: string; len: number; windup: [number, number]; strike: [number, number]; recover: [number, number] }
/** 2026-11-03: cada golpe da regra sorteia o desenho (patada e mordida com avanço vêm do Animal Animator, build_lobo_aa.py). */
const WOLF_ATTACK: Record<string, WolfMove[]> = {
  // raio pela boca: abre como na mordida; a investida rosna e o resto é a corrida
  breath: [{ clip: "Bite", len: 1.3, windup: [0, 0.5], strike: [0.5, 0.68], recover: [0.68, 1.3] }],
  rush: [{ clip: "Lunge", len: 1.4, windup: [0, 0.47], strike: [0.47, 0.87], recover: [0.87, 1.4] }],
  bite: [
    { clip: "Bite", len: 1.3, windup: [0, 0.5], strike: [0.5, 0.68], recover: [0.68, 1.3] },
    { clip: "Claw", len: 0.87, windup: [0, 0.43], strike: [0.43, 0.63], recover: [0.63, 0.87] },
  ],
  pounce: [
    { clip: "Pounce", len: 1.85, windup: [0, 0.6], strike: [0.6, 0.95], recover: [0.95, 1.85] },
    { clip: "Lunge", len: 1.4, windup: [0, 0.47], strike: [0.47, 0.87], recover: [0.87, 1.4] },
  ],
}
/** Na rua, parado: o que ele faz e por quantos segundos (repete o Idle de propósito). */
const WOLF_STREET: [string, boolean, number][] = [
  ["Idle", true, 5],
  ["Sniff", false, 2.5],
  ["Idle", true, 4],
  ["Sit", false, 6],
  ["Snarl", true, 3],
  ["Shake", false, 1.6],
  ["Idle", true, 5],
  ["Sleep", true, 9],
]
/** Velocidade das patas no chão com o clipe a 1× (m/s; 1,12 e 8,5 na escala 2): o clipe acompanha o passo. */
const WOLF_WALK = (1.12 * WOLF_SCALE) / 2
const WOLF_TROT = (1.6 * WOLF_SCALE) / 2
const WOLF_RUN = (8.5 * WOLF_SCALE) / 2

/** Biblioteca de avatares com os clipes do boxe, uma por cena (monstros rigados). */
const libs = new WeakMap<Scene, { lib: AvatarLibrary; fallback: StandardMaterial; shadow: StandardMaterial }>()
/** Lado da pele dos monstros por cena: a rua segue `QualityProfile.avatarSkin`; a luta (de perto) fica em 1024. */
const skinByScene = new WeakMap<Scene, 512 | 1024>()
/** D2: distância da malha leve dos monstros por cena (a cena do Domínio segue `QualityProfile.avatarLod`). */
const lodByScene = new WeakMap<Scene, number>()
/** Chamar ao montar a cena da rua/centro, antes do primeiro monstro. */
export function setMonsterSkinMax(scene: Scene, side: 512 | 1024, lod?: number) {
  skinByScene.set(scene, side)
  if (lod) lodByScene.set(scene, lod)
  const k = libs.get(scene)
  if (k) {
    k.lib.skinMax = side
    if (lod) k.lib.lodDistance = lod
  }
}
function rigKit(scene: Scene) {
  let k = libs.get(scene)
  if (!k) {
    const fallback = new StandardMaterial("mm-mob-fallback", scene)
    fallback.diffuseColor = new Color3(0.5, 0.48, 0.55)
    fallback.specularColor = new Color3(0.05, 0.05, 0.05)
    const shadow = new StandardMaterial("mm-mob-shadow", scene)
    shadow.diffuseColor = new Color3(0, 0, 0)
    shadow.specularColor = new Color3(0, 0, 0)
    shadow.disableLighting = true
    shadow.alpha = 0.35
    k = { lib: new AvatarLibrary(scene, false, false, lodByScene.get(scene) ?? 30, false, false, true), fallback, shadow }
    k.lib.skinMax = skinByScene.get(scene) ?? 1024
    k.lib.foeRig = true
    scene.onDisposeObservable.addOnce(() => k!.lib.dispose())
    libs.set(scene, k)
  }
  return k
}
const wolves = new WeakMap<Scene, Promise<AssetContainer>>()
function wolfContainer(scene: Scene) {
  let p = wolves.get(scene)
  if (!p) {
    ensureLoaders()
    p = LoadAssetContainerAsync(WOLF_URL, scene)
    wolves.set(scene, p)
  }
  return p
}

/** O que a regra diz do monstro neste quadro. */
export interface MobPose {
  x: number
  y: number
  z: number
  facing: number
  state: MobState
  /** Tempo no estado (s). */
  t: number
  /** 0–1 do aviso (só em windup). */
  warn: number
  /** Andando (m/s), para as pernas. */
  speed: number
  /** Golpe em curso (windup/strike/recover) e a duração de cada fase na regra. */
  attack?: { id: string; windup: number; active: number; recover: number }
  /** Na rua (mm3d-57b): gente anda e para na pose de descanso, sem a guarda do boxe. */
  calm?: boolean
  /** Pouca vida na luta: o lobo se encolhe quando para. */
  weak?: boolean
}

const VIOLET = new Color3(0.72, 0.3, 1)
const WOLF_LIGHT = new Color3(0.7, 0.2, 1)

/** Do pulso à ponta do indicador, esticado até onde a garra chega. */
export function handEdge(c: Character | null, side: "Left" | "Right"): [Vector3, Vector3] | null {
  const a = c?.bonePosition(`mixamorig:${side}Hand`)
  const b = c?.bonePosition(`mixamorig:${side}HandIndex3`)
  if (!a || !b) return null
  // as garras da Dama passam muito da mão: o rastro vai até a ponta delas (30% do corpo)
  return [a, a.add(b.subtract(a).normalize().scale(c!.height * 0.3))]
}

type Part = { mesh: Mesh; base: { x: number; y: number; z: number }; sy: number; role: string }

/** Materiais por cor, um por cena (os monstros repetem cores). */
const mats = new WeakMap<Scene, Map<string, StandardMaterial>>()
function mat(scene: Scene, hex: string, glow = 0): StandardMaterial {
  let m = mats.get(scene)
  if (!m) {
    m = new Map()
    mats.set(scene, m)
  }
  const key = `${hex}:${glow}`
  let got = m.get(key)
  if (!got) {
    got = new StandardMaterial(`mm-mob-${key}`, scene)
    const c = Color3.FromHexString(hex)
    got.diffuseColor = c
    got.specularColor = new Color3(0.08, 0.08, 0.08)
    if (glow) {
      got.emissiveColor = c.scale(glow)
      got.disableLighting = glow >= 1
    }
    m.set(key, got)
  }
  return got
}

let seq = 0

export class MonsterModel {
  readonly root: TransformNode
  /** Corpo que inclina e treme (filho do root). */
  private readonly body: TransformNode
  private readonly parts: Part[] = []
  private readonly flash: StandardMaterial
  private walk = 0
  private gone = false
  /** Corpo de gente (skin rigada) no lugar das formas. */
  private char: Character | null = null
  private fix: PoseFix | null = null
  private last: MobState | null = null
  private readonly real: boolean
  /** Lobo rigado: os clipes (nome → grupo) e o que está tocando. */
  private wolf: { anims: Map<string, AnimationGroup>; entries: InstantiatedEntries } | null = null
  private wolfClip = ""
  private dodgeLeft = 0
  private wolfMove: WolfMove | null = null
  private streetAt = Math.floor(Math.random() * WOLF_STREET.length)
  private streetLeft = 0
  private gloves: BoxingGloves | null = null
  /** Gente lutando de mão (ringue e desafio do Hall): golpes de boxe, com ou sem luva. */
  private boxer = false
  /** Brutamontes: o machado na mão e o golpe sorteado do ataque em curso. */
  private axe: TransformNode | null = null
  private axeGrip: WeaponGrip | null = null
  private bruteMove: Move | null = null
  private stones: FloatStones | null = null
  private wolfBones: { jaw: TransformNode | null; meshes: AbstractMesh[] } | null = null
  private wolfLight = 0
  private bruteAtk = ""

  constructor(
    private readonly scene: Scene,
    readonly kind: MobKind,
    /** Escala extra (1 = o tamanho do monstro, na luta e na rua). */
    scale = 1,
    /**
     * Ringue (mm3d-57): gente de luva no lugar do monstro; o número varia a roupa.
     * Hall (2026-11-08, Alex): `body`/`look` = o personagem de quem foi desafiado, no
     * tamanho dele; `bare` = sem luvas (mesmos golpes de mão do ringue).
     */
    human: { n: number; body?: BodyId; look?: string; bare?: boolean } | null = null,
    addGlow?: (m: AbstractMesh) => void,
    /**
     * Lore v2 D2: outro corpo com os golpes e a arma DESTE tipo (quem é ≠ como luta): Selene
     * de Sombra = Vampira adulta de espada (regra do Cavaleiro), Noctis = o deus de arma de
     * fogo (regra do Ciborgue, com a arma dele). Só para tipo rigado.
     */
    skin?: BodyId,
  ) {
    const id = ++seq
    this.root = new TransformNode(`mm-mob-${kind}-${id}`, scene)
    this.body = new TransformNode(`mm-mob-body-${id}`, scene)
    this.body.parent = this.root
    this.root.scaling.setAll(scale)
    // Material próprio que pisca no aviso (o corpo principal de cada um).
    this.flash = new StandardMaterial(`mm-mob-flash-${id}`, scene)
    this.flash.specularColor = new Color3(0.08, 0.08, 0.08)
    const rig = RIGGED[kind]
    this.real = !!rig || kind === "wolf" || !!human
    if (human) {
      const k = rigKit(scene)
      const h = HUMAN[kind]
      const own = !!human.body
      const size = own ? scale : h.scale * scale
      this.char = new Character(scene, k.lib, { fallback: k.fallback, shadow: k.shadow }, human.body ?? h.body, null, false, own ? (human.look ?? "") : h.looks[human.n % h.looks.length])
      this.char.holder.scaling.setAll(size)
      this.char.setBoxe("BGuard")
      this.boxer = true
      if (!human.bare) this.gloves = new BoxingGloves(scene, this.char, "brown", size)
    } else if (rig) {
      const k = rigKit(scene)
      const rigBody = skin ?? rig.body
      this.char = new Character(scene, k.lib, { fallback: k.fallback, shadow: k.shadow }, rigBody, null, false)
      this.char.holder.scaling.setAll(skin ? scale : rig.scale * scale)
      // a arma de fogo é a do corpo (Noctis tem a dele); espada e machado seguem os do tipo
      const weapon = kind === "ciborgue" && skin ? (godGun(skin)?.file ?? ARMED[kind]) : ARMED[kind]
      this.char.setBoxe(LOOK[kind]?.idle ?? "BGuard")
      if (kind === "stone") this.stones = new FloatStones(scene, this.char, addGlow)
      if (weapon) {
        ensureLoaders()
        LoadAssetContainerAsync(weapon, scene)
          .then((c) => {
            if (this.gone) return c.dispose()
            c.addAllToScene()
            this.axe = c.rootNodes[0] as TransformNode
            shineWeapon(this.axe)
            for (const m of this.axe.getChildMeshes(false)) {
              m.isPickable = false
              // sem mapa de ambiente, metal puro sai preto (a mesma conta da arma da skin)
              if (kind === "ciborgue" && m.material instanceof PBRMaterial) m.material.metallic = 0.25
            }
            this.axe.setEnabled(false)
          })
          .catch(() => {})
      }
      const guard = LOOK[kind] ? undefined : BULKY_GUARD[rigBody]
      if (guard || kind === "ciborgue") {
        const ch = this.char
        this.fix = new PoseFix(scene, (n) => ch.bone(n), guard ?? null)
      }
    } else if (kind === "wolf") {
      wolfContainer(scene)
        .then((c) => {
          if (this.gone) return
          const e = c.instantiateModelsToScene((n) => `${n}-${id}`, false, { doNotInstantiate: true })
          // A raiz do glTF gira por quaternion: a volta fica num nó próprio.
          const turn = new TransformNode(`mm-mob-wolf-turn-${id}`, scene)
          turn.parent = this.body
          turn.rotation.y = WOLF_TURN
          turn.scaling.setAll(WOLF_SCALE)
          for (const n of e.rootNodes) n.parent = turn
          if (e.animationGroups.length) {
            const anims = new Map<string, AnimationGroup>()
            for (const g of e.animationGroups) {
              g.stop()
              // Troca de clipe com mistura curta (sem salto de pose).
              for (const ta of g.targetedAnimations) {
                ta.animation.enableBlending = true
                ta.animation.blendingSpeed = 0.12
              }
              anims.set(g.name.replace(`-${id}`, ""), g)
            }
            this.wolf = { anims, entries: e }
            const nodes = e.rootNodes.flatMap((n) => n.getDescendants(false))
            this.wolfBones = {
              jaw: (nodes.find((n) => n.name.startsWith("tripo::Head_3")) as TransformNode | undefined) ?? null,
              meshes: nodes.filter((n): n is AbstractMesh => "renderOverlay" in n),
            }
            this.playWolf("Idle", true)
          }
        })
        .catch(() => {
          if (!this.gone) BUILD.wolf(this)
        })
    } else BUILD[kind](this)
  }

  // ── peças ────────────────────────────────────────────────────────────────
  /** Peça no corpo: caixa, esfera ou cilindro, em metros, com papel para a animação. */
  add(shape: "box" | "sphere" | "cyl" | "cone", size: [number, number, number], at: [number, number, number], hex: string, role = "", opts: { glow?: number; main?: boolean; rot?: [number, number, number] } = {}) {
    const name = `mm-mob-part-${this.parts.length}`
    let mesh: Mesh
    if (shape === "box") mesh = CreateBox(name, { width: size[0], height: size[1], depth: size[2] }, this.scene)
    else if (shape === "sphere") {
      mesh = CreateSphere(name, { diameter: 1, segments: 10 }, this.scene)
      mesh.scaling.set(size[0], size[1], size[2])
    } else if (shape === "cyl") mesh = CreateCylinder(name, { height: size[1], diameterTop: size[0], diameterBottom: size[2], tessellation: 10 }, this.scene)
    else mesh = CreateCylinder(name, { height: size[1], diameterTop: 0, diameterBottom: size[0], tessellation: 8 }, this.scene)
    mesh.parent = this.body
    mesh.position.set(at[0], at[1], at[2])
    if (opts.rot) mesh.rotation.set(opts.rot[0], opts.rot[1], opts.rot[2])
    mesh.isPickable = false
    if (opts.main) {
      this.flash.diffuseColor = Color3.FromHexString(hex)
      mesh.material = this.flash
    } else mesh.material = mat(this.scene, hex, opts.glow ?? 0)
    this.parts.push({ mesh, base: { x: at[0], y: at[1], z: at[2] }, sy: mesh.scaling.y, role })
    return mesh
  }

  eyes(y: number, z: number, dx: number, r = 0.07) {
    for (const s of [-1, 1]) this.add("sphere", [r * 2, r * 2, r * 1.2], [s * dx, y, z], "#B84DFF", "eye", { glow: 1 })
  }

  // ── animação ─────────────────────────────────────────────────────────────
  update(dt: number, p: MobPose) {
    if (this.gone) return
    if (this.char) return this.updateRigged(dt, p)
    if (this.wolf) return this.updateWolf(dt, p)
    this.root.position.set(p.x, p.y, p.z)
    this.root.rotation.y = p.facing
    this.walk += dt * Math.min(9, 2 + p.speed * 3.2)
    const sw = Math.sin(this.walk)
    let lean = 0
    let shake = 0
    let rise = 1
    let sink = 0
    const glow = p.state === "windup" ? 0.25 + 0.5 * p.warn * (0.6 + 0.4 * Math.sin(p.t * 30)) : 0
    switch (p.state) {
      case "spawn":
        rise = Math.min(1, Math.max(0.05, p.t / 0.9))
        break
      case "windup":
        lean = -0.28 * Math.min(1, p.warn * 1.4)
        break
      case "strike":
        lean = 0.42
        break
      case "recover":
        lean = 0.2 * Math.max(0, 1 - p.t * 2)
        break
      case "hurt":
        shake = Math.sin(p.t * 60) * 0.06 * Math.max(0, 1 - p.t * 2)
        lean = -0.15
        break
      case "dead":
        sink = Math.min(1, p.t / 1.1)
        lean = -0.5 * sink
        break
    }
    this.body.rotation.x = lean
    this.body.position.x = shake
    this.body.position.y = -sink * 0.6
    // O lobo de verdade não tem pernas soltas: o passo vira um balanço do corpo.
    if (this.real && p.speed > 0.2 && p.state !== "dead") this.body.position.y += Math.abs(sw) * 0.06
    this.body.scaling.set(rise, rise, rise)
    this.flash.emissiveColor = new Color3(glow, glow * 0.15, glow * 0.15)
    const moving = p.speed > 0.2 && (p.state === "chase" || p.state === "circle" || p.state === "fly")
    for (const part of this.parts) {
      const m = part.mesh
      switch (part.role) {
        case "legL":
        case "legR": {
          const s = part.role === "legL" ? 1 : -1
          m.rotation.x = moving ? sw * 0.6 * s : 0
          break
        }
        case "legFL":
        case "legBR":
          m.rotation.x = moving ? sw * 0.7 : 0
          break
        case "legFR":
        case "legBL":
          m.rotation.x = moving ? -sw * 0.7 : 0
          break
        case "armL":
        case "armR": {
          const s = part.role === "armL" ? -1 : 1
          let a = moving ? -sw * 0.4 * s : 0
          if (p.state === "windup") a = -1.6 * Math.min(1, p.warn * 1.5)
          if (p.state === "strike") a = 0.9
          m.rotation.x = a
          break
        }
        case "wingL":
        case "wingR": {
          const s = part.role === "wingL" ? 1 : -1
          const flap = p.state === "strike" ? 0.2 : Math.sin(this.walk * 2.2) * 0.7
          m.rotation.z = s * (0.3 + flap)
          break
        }
        case "tail":
          m.rotation.y = Math.sin(this.walk * 1.3) * 0.5
          break
        case "eye":
          m.scaling.y = part.sy * (p.state === "dead" ? 0.2 : 1)
          break
      }
    }
    if (p.state === "dead" && p.t > 1.6) this.setVisible(false)
  }

  /** Skin rigada: anda pela locomoção e golpeia com os clipes do boxe (a mesma troca do jogador). */
  private updateRigged(dt: number, p: MobPose) {
    const c = this.char!
    c.place(p.x, p.z, p.facing, p.y, 0)
    if (LOOK[this.kind] && !this.boxer) return this.updateBrute(dt, p)
    const heavy = this.kind === "ciborgue" || (this.boxer && this.kind === "brute")
    if (p.state !== this.last) {
      if (p.state === "windup") c.boxeAct(heavy ? "BBox2" : "BJab", 0.55, 0, 0.42, true)
      else if (p.state === "strike") c.boxeAct(heavy ? "BBox2" : "BJab", 0.32, 0.42, 1)
      else if (p.state === "hurt") c.boxeAct("BHitLite", 0.32, 0, 0.66)
      else if (p.state === "dead") c.boxeAct("BFall", 1.2, 0, 1, true)
      this.last = p.state
    }
    if (p.calm) {
      c.setBoxe(null)
      c.animate(dt, p.speed > 0.2 ? (p.speed > 2.4 ? 2 : 1) : 0, p.speed)
    } else if (p.state === "chase" && p.speed > 0.2) {
      c.setBoxe(null)
      c.animate(dt, p.speed > 3.2 ? 2 : 1, p.speed)
    } else {
      c.setBoxe("BGuard")
      c.animate(dt, 0, 0)
    }
    // guarda baixa dos corpos volumosos (Ciborgue/Golem): só parado na guarda
    if (this.fix) this.fix.guardWant = !p.calm && !(p.state === "chase" && p.speed > 0.2) && !c.boxeBusy && p.state !== "dead" ? 1 : 0
    if (p.state === "dead" && p.t > 1.6) this.setVisible(false)
  }

  /** Põe o machado na mão quando os ossos já existem (o corpo carrega depois). */
  private holdAxe() {
    if (this.axeGrip || !this.axe || !this.char) return
    const hand = this.char.bone(GRIP_BONES.hand)
    const index = this.char.bone(GRIP_BONES.index)
    const thumb = this.char.bone(GRIP_BONES.thumb)
    if (!hand || !index || !thumb) return
    this.axeGrip = new WeaponGrip(this.scene, { hand, index, thumb }, this.axe, `mm-mob-axe-${this.root.name}`)
    this.axeGrip.root.scaling.setAll(this.root.scaling.x)
    if (this.kind === "ciborgue") {
      this.axeGrip.root.scaling.setAll(gunSize(this.char.height) * this.root.scaling.x)
      // o glTF chega com o X invertido: meia-volta deixa o cano para a frente
      const turn = new TransformNode(`mm-mob-gun-turn-${this.root.name}`, this.scene)
      turn.parent = this.axeGrip.root
      turn.rotation.y = Math.PI
      this.axe.parent = turn
    }
    this.axe.setEnabled(true)
  }

  /** As pedras do Golem (null nos outros). */
  get floatStones() {
    return this.stones
  }

  /** O rastro da garra de uma das mãos. */
  clawEdge(side: "Left" | "Right"): [Vector3, Vector3] | null {
    if (this.last !== "strike") return null
    return handEdge(this.char, side)
  }

  /** Boca do lobo no mundo (de onde sai o raio). */
  wolfMouth(): Vector3 | null {
    const j = this.wolfBones?.jaw
    if (!j) return null
    j.computeWorldMatrix(true)
    const at = j.getAbsolutePosition()
    const f = this.root.rotation.y
    return new Vector3(at.x + Math.sin(f) * 0.5, at.y, at.z + Math.cos(f) * 0.5)
  }

  /** Brilho roxo do corpo do lobo: 0 apagado, 1 no golpe máximo. */
  wolfGlow(k: number, dt: number) {
    if (!this.wolfBones) return
    this.wolfLight += (k - this.wolfLight) * Math.min(1, dt * 10)
    for (const m of this.wolfBones.meshes) {
      m.renderOverlay = this.wolfLight > 0.02
      m.overlayColor = WOLF_LIGHT
      m.overlayAlpha = this.wolfLight * 0.5
    }
  }

  /** Boca da arma de fogo no mundo (de onde sai o tiro), ou null sem a arma na mão. */
  muzzle(): Vector3 | null {
    const r = this.axeGrip?.root
    return r && this.kind === "ciborgue" ? Vector3.TransformCoordinates(MUZZLE, r.getWorldMatrix()) : null
  }

  /** Lâmina do machado no mundo (o rastro roxo da luta), ou null fora do golpe. */
  axeEdge(): [Vector3, Vector3] | null {
    const r = this.axeGrip?.root
    if (!r || !r.isEnabled() || this.last !== "strike") return null
    const m = r.getWorldMatrix()
    const edge = this.kind === "cavaleiro" ? SWORD_EDGE : AXE_EDGE
    return [Vector3.TransformCoordinates(new Vector3(0, edge[0], 0), m), Vector3.TransformCoordinates(new Vector3(0, edge[1], 0), m)]
  }

  /** Salto: a altura do arco na fase do golpe (o avanço é da regra). */
  private hop(p: MobPose, high: number) {
    if (!high || p.state !== "strike" || p.attack?.id !== "leap") return 0
    return Math.sin(Math.PI * Math.min(1, p.t / Math.max(0.05, p.attack.active))) * high
  }

  /** Quem luta armado: golpes pela regra; andar/correr com a arma; grito ao surgir. */
  private updateBrute(dt: number, p: MobPose) {
    const c = this.char!
    const look = LOOK[this.kind]!
    c.place(p.x, p.z, p.facing, p.y + this.hop(p, look.hop), 0)
    this.holdAxe()
    if (p.attack && p.attack.id !== this.bruteAtk && p.state === "windup") {
      const opts = look.table[p.attack.id] ?? Object.values(look.table)[0]
      this.bruteMove = opts[Math.floor(Math.random() * opts.length)]
      this.bruteAtk = p.attack.id
    }
    if (this.stones) {
      this.stones.join = p.attack?.id === "max" && p.state !== "recover" ? 1 : 0
      this.stones.update(dt, p.facing, p.x, p.z)
    }
    if (p.state !== this.last) {
      const mv = this.bruteMove
      if (p.state === "spawn") c.boxeAct(look.roar[0], look.roar[1], look.roar[2], look.roar[3])
      else if (mv && p.attack && (p.state === "windup" || p.state === "strike" || p.state === "recover")) {
        const seg = mv[p.state]
        const dur = p.state === "windup" ? p.attack.windup : p.state === "strike" ? p.attack.active : p.attack.recover
        c.boxeAct(mv.clip, dur, seg[0], seg[1], p.state === "windup")
        if (p.state === "recover") this.bruteAtk = ""
      } else if (p.state === "hurt") c.boxeAct(look.hit[Math.floor(Math.random() * look.hit.length)], 0.45, 0, look.hit.length > 1 ? 0.7 : 1)
      // o Ciborgue não usa clipe de boxe (nem na queda)
      else if (p.state === "dead") c.boxeAct(look.fall, 1.2, 0, 1, true)
      this.last = p.state
    }
    const moving = p.speed > 0.25 && (p.state === "chase" || p.state === "circle" || !!p.calm)
    if (this.kind === "ciborgue" && this.fix) {
      this.fix.gunWant = p.state === "hurt" || p.state === "dead" ? 0 : 1
      this.fix.gunYaw = p.facing
      if (this.axeGrip) {
        this.axeGrip.front = this.fix.front
        this.axeGrip.shift = this.fix.gunShift
        this.axeGrip.level = this.fix.gunW
      }
    }
    const run = p.speed > 2.4
    if (moving && !look.walk) {
      // sem guarda: anda e corre como gente, e para de garras abertas
      c.setBoxe(null)
      c.animate(dt, run ? 2 : 1, p.speed)
    } else {
      const base = moving ? (run ? look.run! : look.walk!) : look.idle
      c.setBoxe(base)
      if (moving) c.setClipRate(base, Math.max(0.6, Math.min(1.6, p.speed / (run ? BRUTE_RUN : BRUTE_RUN * 0.45))))
      c.animate(dt, 0, 0)
    }
    if (p.state === "dead" && p.t > 1.6) this.setVisible(false)
  }

  /** Toca um clipe do lobo (inteiro ou um trecho em segundos), com a velocidade pedida. */
  private playWolf(name: string, loop: boolean, speed = 1, part?: [number, number], len?: number) {
    const g = this.wolf?.anims.get(name)
    if (!g) return
    const key = `${name}:${part?.join("-") ?? ""}`
    if (key === this.wolfClip) {
      g.speedRatio = speed
      return
    }
    for (const o of this.wolf!.anims.values()) if (o !== g) o.stop()
    this.wolfClip = key
    const span = g.to - g.from
    const from = part && len ? g.from + span * (part[0] / len) : g.from
    const to = part && len ? g.from + span * (part[1] / len) : g.to
    g.start(loop, speed, from, to)
  }

  /** Lobo rigado: a regra diz o estado; o clipe e a velocidade saem dele. */
  private updateWolf(dt: number, p: MobPose) {
    this.root.position.set(p.x, p.y, p.z)
    this.root.rotation.y = p.facing
    // Enquanto o GLB carregava, o caminho das formas mexeu no corpo (no
    // "spawn" ele nasce com escala 0,05): o rigado começa do corpo neutro.
    this.body.scaling.setAll(1)
    this.body.position.setAll(0)
    this.body.rotation.setAll(0)
    const was = this.last
    this.last = p.state
    if (p.attack && p.state === "windup" && was !== "windup") {
      const opts = WOLF_ATTACK[p.attack.id]
      this.wolfMove = opts ? opts[Math.floor(Math.random() * opts.length)] : null
    }
    const atk = this.wolfMove
    // investida: rosna brilhando e dispara na corrida
    if (p.attack?.id === "rush" && p.state === "windup") return this.playWolf("Snarl", true, 1.4)
    if (p.attack?.id === "rush" && p.state === "strike") return this.playWolf("Run", true, 2)
    switch (p.state) {
      case "spawn":
        this.playWolf("Howl", false, 1.8) // 3,6 s no clipe: cabe na chegada
        break
      case "windup":
      case "strike":
      case "recover": {
        if (!atk) break
        const part = atk[p.state]
        const dur = p.state === "windup" ? p.attack!.windup : p.state === "strike" ? p.attack!.active : p.attack!.recover
        this.playWolf(atk.clip, false, (part[1] - part[0]) / Math.max(0.05, dur), part, atk.len)
        break
      }
      case "hurt":
        this.playWolf("Hit", false, 1.3)
        break
      case "dead":
        this.playWolf("Die", false)
        if (p.t > 1.8) this.setVisible(false)
        break
      default: {
        // Saindo do golpe para rodear: o pulo de lado (esquiva) antes de andar.
        if (was === "recover" && this.wolf!.anims.has("Dodge")) {
          this.playWolf("Dodge", false)
          this.dodgeLeft = 0.6
        }
        if (this.dodgeLeft > 0) {
          this.dodgeLeft -= dt
          break
        }
        if (p.speed > 0.25) this.streetLeft = 0
        if (p.speed > 2.6) this.playWolf("Run", true, Math.min(1.6, Math.max(0.85, p.speed / WOLF_RUN)))
        else if (p.speed > 1.4) this.playWolf("Trot", true, Math.min(1.6, Math.max(0.7, p.speed / WOLF_TROT)))
        else if (p.speed > 0.25) {
          if (p.state === "circle" && !p.calm) this.playWolf("Stalk", true, Math.min(2.2, Math.max(0.8, p.speed / WOLF_WALK)))
          else this.playWolf("Walk", true, Math.min(2.2, Math.max(0.6, p.speed / WOLF_WALK)))
        } else if (p.calm) {
          this.streetLeft -= dt
          if (this.streetLeft <= 0) {
            this.streetAt = (this.streetAt + 1) % WOLF_STREET.length
            this.streetLeft = WOLF_STREET[this.streetAt][2]
          }
          const [clip, loop] = WOLF_STREET[this.streetAt]
          this.playWolf(clip, loop)
        } else if (p.weak) this.playWolf("Cower", false)
        else this.playWolf(p.state === "circle" ? "Snarl" : "Idle", true)
      }
    }
  }

  setVisible(v: boolean) {
    this.root.setEnabled(v)
    this.char?.setVisible(v)
    this.gloves?.setVisible(v)
    this.stones?.setVisible(v)
    if (this.axeGrip) this.axeGrip.root.setEnabled(v)
  }

  dispose() {
    this.gone = true
    if (this.wolf) {
      for (const g of this.wolf.anims.values()) g.dispose()
      this.wolf.entries.dispose()
      this.wolf = null
    }
    this.gloves?.dispose()
    this.stones?.dispose()
    this.fix?.dispose()
    // o machado: a pegada solta a arma junto; sem pegada ainda, a arma sozinha
    if (this.axeGrip) this.axeGrip.dispose()
    else this.axe?.dispose(false, true)
    this.axeGrip = null
    this.axe = null
    this.char?.dispose()
    for (const p of this.parts) p.mesh.dispose()
    this.flash.dispose()
    this.body.dispose()
    this.root.dispose()
  }
}

// ── os bonecos de cada tipo (frente = +z) ──────────────────────────────────
// Pernas e braços: cilindros com o pivô no meio — a rotação balança em volta do
// meio, o que basta para um provisório.
const BUILD: Record<MobKind, (m: MonsterModel) => void> = {
  stone(m) {
    BUILD.cavaleiro(m)
  },
  cavaleiro(m) {
    const SAND = "#C9A46A"
    m.add("cyl", [0.42, 0.9, 0.5], [0, 1.25, 0], SAND, "", { main: true })
    m.add("box", [0.62, 0.3, 0.36], [0, 1.62, 0], "#B08A52")
    m.add("sphere", [0.36, 0.4, 0.36], [0, 1.98, 0], SAND)
    m.add("cyl", [0.42, 0.18, 0.44], [0, 2.12, 0], "#9C7A47")
    m.add("box", [0.26, 0.04, 0.04], [0, 1.98, 0.17], "#3A2A18")
    m.add("box", [0.18, 0.14, 0.02], [0, 1.35, 0.25], "#FFD25A", "", { glow: 0.9 })
    for (const s of [-1, 1]) {
      m.add("cyl", [0.18, 0.75, 0.2], [s * 0.15, 0.4, 0], SAND, s < 0 ? "legL" : "legR")
      m.add("cyl", [0.14, 0.7, 0.16], [s * 0.42, 1.3, 0.05], SAND, s < 0 ? "armL" : "armR")
    }
    m.add("box", [0.06, 0.06, 0.9], [0.42, 1.0, 0.45], "#D9DCE2", "armR")
  },
  wolf(m) {
    const RUST = "#8A4B2A"
    m.add("box", [0.5, 0.42, 1.1], [0, 0.72, 0], RUST, "", { main: true })
    m.add("box", [0.4, 0.36, 0.42], [0, 0.95, 0.62], "#7A4026")
    m.add("box", [0.22, 0.18, 0.3], [0, 0.86, 0.94], "#5E3420")
    for (const s of [-1, 1]) m.add("cone", [0.14, 0.2, 0.14], [s * 0.12, 1.2, 0.58], "#5E3420")
    m.eyes(1.0, 0.84, 0.11, 0.05)
    m.add("box", [0.5, 0.1, 0.8], [0, 0.98, -0.05], "#4A4F57")
    m.add("cyl", [0.11, 0.55, 0.13], [-0.18, 0.3, 0.38], RUST, "legFL")
    m.add("cyl", [0.11, 0.55, 0.13], [0.18, 0.3, 0.38], RUST, "legFR")
    m.add("cyl", [0.11, 0.55, 0.13], [-0.18, 0.3, -0.38], RUST, "legBL")
    m.add("cyl", [0.11, 0.55, 0.13], [0.18, 0.3, -0.38], RUST, "legBR")
    m.add("box", [0.1, 0.1, 0.55], [0, 0.85, -0.78], "#5E3420", "tail", { rot: [0.4, 0, 0] })
    m.add("box", [0.06, 0.06, 0.6], [0, 0.95, 0.2], "#B84DFF", "", { glow: 0.8 })
  },
  ciborgue(m) {
    const SCRAP = "#6E7480"
    m.add("box", [1.5, 1.4, 0.95], [0, 2.1, 0], SCRAP, "", { main: true })
    m.add("box", [0.7, 0.5, 0.6], [0, 3.05, 0.1], "#5A5F68")
    m.eyes(3.08, 0.42, 0.14, 0.08)
    m.add("box", [0.5, 0.4, 0.06], [-0.35, 2.3, 0.5], "#B23A2E")
    m.add("box", [0.4, 0.5, 0.06], [0.4, 1.9, 0.5], "#2F6FB0")
    m.add("box", [1.3, 0.12, 0.08], [0, 2.75, 0.49], "#B84DFF", "", { glow: 0.9 })
    for (const s of [-1, 1]) {
      m.add("cyl", [0.42, 1.0, 0.5], [s * 0.45, 0.65, 0], "#4E535B", s < 0 ? "legL" : "legR")
      m.add("cyl", [0.36, 1.2, 0.42], [s * 1.0, 2.1, 0.1], SCRAP, s < 0 ? "armL" : "armR")
      m.add("box", [0.6, 0.6, 0.6], [s * 1.05, 1.3, 0.25], "#3E4249", s < 0 ? "armL" : "armR")
    }
  },
  garras(m) {
    const SLATE = "#5B6475"
    m.add("sphere", [0.55, 0.9, 0.5], [0, 1.25, 0], SLATE, "", { main: true })
    m.add("sphere", [0.36, 0.38, 0.38], [0, 1.85, 0.08], "#4A5262")
    m.add("cone", [0.14, 0.26, 0.14], [0, 1.82, 0.32], "#D9B24A", "", { rot: [Math.PI / 2, 0, 0] })
    m.eyes(1.9, 0.22, 0.09, 0.05)
    m.add("cone", [0.3, 0.4, 0.2], [0, 2.12, -0.05], "#3C4352")
    for (const s of [-1, 1]) {
      m.add("box", [1.3, 0.05, 0.6], [s * 0.85, 1.45, -0.05], "#434B5A", s < 0 ? "wingL" : "wingR")
      m.add("cyl", [0.1, 0.65, 0.12], [s * 0.14, 0.45, 0], "#D9B24A", s < 0 ? "legL" : "legR")
      m.add("sphere", [0.16, 0.16, 0.16], [s * 0.3, 1.62, 0.02], "#B84DFF", "", { glow: 0.8 })
    }
  },
  brute(m) {
    const SKIN = "#6F8466"
    m.add("sphere", [1.3, 1.6, 1.0], [0, 1.95, 0], SKIN, "", { main: true })
    m.add("sphere", [0.55, 0.55, 0.55], [0, 2.95, 0.15], "#62775A")
    m.eyes(3.0, 0.4, 0.13, 0.06)
    for (const s of [-1, 1]) {
      m.add("cone", [0.14, 0.42, 0.14], [s * 0.24, 3.3, 0.1], "#E8E0C8", "", { rot: [0, 0, -s * 0.5] })
      m.add("cyl", [0.42, 1.0, 0.5], [s * 0.38, 0.6, 0], "#3E3A36", s < 0 ? "legL" : "legR")
      m.add("cyl", [0.36, 1.2, 0.44], [s * 0.85, 1.95, 0.15], SKIN, s < 0 ? "armL" : "armR")
      m.add("cone", [0.3, 0.5, 0.3], [s * 0.55, 2.75, -0.2], "#B84DFF", "", { glow: 0.85 })
    }
    m.add("box", [1.0, 0.25, 0.85], [0, 1.45, 0.05], "#2E2B29")
    m.add("cyl", [0.22, 1.3, 0.16], [0.85, 1.3, 0.75], "#55504A", "armR", { rot: [1.2, 0, 0] })
    m.add("sphere", [0.55, 0.55, 0.55], [0.85, 1.05, 1.35], "#4A4540", "armR")
  },
}
