// features/meu-mundo/engine/avatars.ts
//
// Avatares do bairro: os quatro corpos (normal, magro, gordo, forte) e as três
// animações de locomoção (Idle, Walk, SlowRun), produzidos no Blender a partir
// do personagem rigado no Mixamo (pipeline em MEU MUNDO 3D/pipeline).
//
// ═══ O QUE É COMPARTILHADO E O QUE NÃO É ═══
// Compartilhado (seguro): o arquivo de cada corpo é baixado UMA vez (a malha
// de cada jogador reaproveita a geometria do contêiner) e cada TEXTURA tem um
// material só, criado na primeira vez que alguém usa aquele corpo. Normal e
// magro dividem o atlas do personagem; desde o mm3d-07 o gordo e o forte são
// modelos próprios do Tripo, com textura própria (ver ASSETS.textures).
// NÃO compartilhado: cada jogador tem o próprio esqueleto (nós transformados)
// e os próprios AnimationGroups — clonados do arquivo de animação e ligados
// aos ossos DELE pelo nome. Estado mutável de animação nunca é dividido.
//
// ═══ O QUE ESTE ARQUIVO NÃO CARREGA ═══
// Treinos, boxe e lutas ficam como fonte no Blender e NÃO entram aqui: o
// bairro só conhece os arquivos listados em ASSETS. Ambientes futuros
// (academia, coliseu) terão a própria lista.

import { LoadAssetContainerAsync } from "@babylonjs/core/Loading/sceneLoader"
import { registerBuiltInLoaders } from "@babylonjs/loaders/dynamic"
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial"
import { Texture } from "@babylonjs/core/Materials/Textures/texture"
import { DynamicTexture } from "@babylonjs/core/Materials/Textures/dynamicTexture"
import { Color3 } from "@babylonjs/core/Maths/math.color"
import type { Vector3 } from "@babylonjs/core/Maths/math.vector"
import { TransformNode } from "@babylonjs/core/Meshes/transformNode"
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder"
import type { AssetContainer, InstantiatedEntries } from "@babylonjs/core/assetContainer"
import type { AnimationGroup } from "@babylonjs/core/Animations/animationGroup"
import type { AbstractMesh } from "@babylonjs/core/Meshes/abstractMesh"
import type { Mesh } from "@babylonjs/core/Meshes/mesh"
import type { Node } from "@babylonjs/core/node"
import type { Scene } from "@babylonjs/core/scene"
import type { Plane } from "@babylonjs/core/Maths/math.plane"
import { ANIM_NATURAL_SPEED, type MoveState } from "./motion"
import { tintedTexture } from "./avatar-tint"
import type { BodyId } from "../types"

export const AVATAR_ASSET_VERSION = "v3"
const BASE = `/meu-mundo/avatares/${AVATAR_ASSET_VERSION}/`
const ASSETS = {
  // Textura por corpo (mm3d-07): gordo e forte são modelos próprios.
  textures: {
    normal: "avatar-basecolor-512.jpg",
    slim: "avatar-basecolor-512.jpg",
    fat: "avatar-fat-basecolor-512.jpg",
    strong: "avatar-strong-basecolor-512.jpg",
    // Sergio, o lutador da RA da Casa Views (pipeline/build_sergio.py): o
    // esqueleto e os pesos são os dele; as animações são as mesmas do bairro.
    sergio: "avatar-sergio-basecolor-512.jpg",
    // A personagem feminina (mm3d-30, pipeline/build_female.py): no esqueleto
    // do normal SEM encaixe — usa todas as animações do conjunto "base".
    // mm3d-36: a menina nova (cartoon girl), mesmo caminho do build_female.py.
    female: "avatar-female-m36-basecolor-512.jpg",
    // Ekaterina (mm3d-30, pipeline/build_ekaterina.py): esqueleto encaixado
    // nas proporções dela, então um conjunto de animações próprio (como o
    // Sergio); 5 mil tris, textura 512, sem malha leve (como o Sergio).
    ekaterina: "avatar-ekaterina-basecolor-512.jpg",
  } satisfies Record<BodyId, string>,
  bodies: {
    normal: "avatar-normal.glb",
    slim: "avatar-slim.glb",
    fat: "avatar-fat.glb",
    strong: "avatar-strong.glb",
    // mm3d-22: pesos do ombro suavizados (pipeline/fix_sergio_shoulder.py) —
    // no skate e na bike o ombro abria um vinco na cava da regata.
    sergio: "avatar-sergio-m22.glb",
    female: "avatar-female-m36e.glb",
    // 2026-10-25: o rosto com a malha original (a redução colapsava as
    // costuras do atlas e deformava o lado direito do rosto); pescoço refeito
    // (build_ekaterina.py 4b): rosto 100% na cabeça — o maxilar esticava na corrida.
    ekaterina: "avatar-ekaterina-pescoco.glb",
  } satisfies Record<BodyId, string>,
  // Malha leve de cada corpo (mm3d-19, `pipeline/build_avatar_lod.js`):
  // ~1,5 mil triângulos, MESMOS ossos na mesma ordem — usa o esqueleto do
  // avatar, então não anima nada a mais. Corpo sem entrada (Sergio: costuras
  // demais para simplificar) ou arquivo que falhar = só a malha cheia.
  lod: {
    normal: "avatar-normal-lod.glb",
    slim: "avatar-slim-lod.glb",
    fat: "avatar-fat-lod.glb",
    strong: "avatar-strong-lod.glb",
    female: "avatar-female-m36e-lod.glb",
  } as Partial<Record<BodyId, string>>,
  // Mesmas três animações (mesmos nomes, mesmos ossos, mesmos estados). Gordo
  // e forte têm um ajuste próprio do braço (abertura, rotação e cotovelo,
  // calibrado no Blender) para a mão não atravessar a barriga nem o peito.
  anims: {
    base: "anim-locomotion.glb",
    fat: "anim-locomotion-fat.glb",
    strong: "anim-locomotion-strong.glb",
    sergio: "anim-locomotion-sergio.glb",
    ekaterina: "anim-locomotion-ekaterina.glb",
  },
  // Pose "Sit" (mm3d-09, pipeline/build_sit.py): só dentro das casas — a rua
  // não baixa estes arquivos.
  sit: {
    base: "anim-sit-base.glb",
    fat: "anim-sit-fat.glb",
    strong: "anim-sit-strong.glb",
    sergio: "anim-sit-sergio.glb",
    ekaterina: "anim-sit-ekaterina.glb",
  },
  // Descanso e cansaço (mm3d-13, pipeline/build_rest.py): Lie (deitado de
  // costas), Sleep (dormindo de lado), TiredIdle e TiredWalk (tronco curvado,
  // cabeça baixa). mm3d-28 (pipeline/build_injured.py): + InjuredIdle e
  // InjuredWalk (mocap "Injured Idle/Walk" do Mixamo) para o indisposto.
  // ~144 KB por conjunto; se falhar, o avatar continua com as poses de sempre.
  rest: {
    base: "anim-rest-base-m28.glb",
    fat: "anim-rest-fat-m28.glb",
    strong: "anim-rest-strong-m28.glb",
    sergio: "anim-rest-sergio-m28.glb",
    ekaterina: "anim-rest-ekaterina-m28.glb",
  },
  // Bicicleta, skate e patins — no referencial do veículo; só a rua baixa
  // estes arquivos. mm3d-22 (pipeline/build_ride_mocap.py): SkateRide (o
  // Skateboarding do Mixamo, 2,2 s em ciclo, com a remada), SkatePush (o
  // trecho da remada, 1 s) e BikePedal (pedalada em ciclo, 0,7 s); SkatesGlide
  // continua o do mm3d-14 (build_ride.py). mm3d-23: SkatesStride (passada dos
  // patins em ciclo, 1,2 s, pipeline/build_skates_stride.py).
  ride: {
    base: "anim-ride-base-m23.glb",
    fat: "anim-ride-fat-m23.glb",
    strong: "anim-ride-strong-m23.glb",
    sergio: "anim-ride-sergio-m23.glb",
    ekaterina: "anim-ride-ekaterina-m23.glb",
  },
  // Paint (mm3d-35b, pipeline/build_paint_mocap.py, animações da pasta paint/
  // do Alex): parado mirando (PIdle), atirando parado (PFire), andando (PWalk),
  // correndo (PRun) e de lado (PStrafe) com a arma; pulo (Air, Jump Up) e soco
  // (Punch, Lead Jab). Só o Paint baixa estes arquivos.
  paint: {
    // 35c: pulos novos (Rifle Jump In Place, Run Strafing Jump, Pistol Jump).
    base: "anim-paint-base-m35c.glb",
    fat: "anim-paint-fat-m35c.glb",
    strong: "anim-paint-strong-m35c.glb",
    sergio: "anim-paint-sergio-m35c.glb",
    ekaterina: "anim-paint-ekaterina-m35c.glb",
  },
  // Prédios do centro (mm3d-37b, pipeline/build_place_mocap.py, biblioteca de
  // animações do Alex): academia (agachamento, saco de pancada, caixa de
  // salto, abdominal, kettlebell) e a reza da igreja. Só os interiores baixam.
  place: {
    base: "anim-place-base-m37.glb",
    fat: "anim-place-fat-m37.glb",
    strong: "anim-place-strong-m37.glb",
    sergio: "anim-place-sergio-m37.glb",
    ekaterina: "anim-place-ekaterina-m37.glb",
  },
  // Arena de Boxe (mm3d-44, pipeline/build_boxe_mocap.py com a pasta "boxe"
  // do Alex): guarda, aquecimento, golpes dos combos, esquiva, reações, queda,
  // levantar e vitória. Só a arena baixa.
  boxe: {
    base: "anim-boxe-base-m44.glb",
    fat: "anim-boxe-fat-m44.glb",
    strong: "anim-boxe-strong-m44.glb",
    sergio: "anim-boxe-sergio-m44.glb",
    ekaterina: "anim-boxe-ekaterina-m44.glb",
  },
}
/** Altura do tornozelo acima da sola em pé, por conjunto (pipeline/ride_report.json). */
export const ANKLE_REST: Record<keyof typeof ASSETS.ride, number> = { base: 0.148, fat: 0.15, strong: 0.147, sergio: 0.203, ekaterina: 0.207 }
type AnimSet = keyof typeof ASSETS.anims
const ANIM_SET: Record<BodyId, AnimSet> = { normal: "base", slim: "base", fat: "fat", strong: "strong", sergio: "sergio", female: "base", ekaterina: "ekaterina" }
const CLIPS = ["Idle", "Walk", "SlowRun"] as const

/** Arquivos de um corpo, para quem desenha o avatar fora do Babylon (o jetpack, mm3d-20). */
export function avatarFiles(id: BodyId) {
  return { body: BASE + ASSETS.bodies[id], texture: BASE + ASSETS.textures[id], anims: BASE + ASSETS.anims[ANIM_SET[id]] }
}

/** Textura do corpo pintada com as cores (mm3d-36) para quem não usa a biblioteca (Jetpack); null = a original. */
export function tintedAvatarTexture(id: BodyId, look: string) {
  return tintedTexture(BASE, ASSETS.textures[id], id, look)
}
const REST_CLIPS = ["Lie", "Sleep", "TiredIdle", "TiredWalk", "InjuredIdle", "InjuredWalk"] as const
const RIDE_CLIPS = ["BikeA", "BikeB", "BikePedal", "SkateRide", "SkatePush", "SkatesGlide", "SkatesStride"] as const
const PAINT_CLIPS = ["PIdle", "PFire", "PWalk", "PRun", "PStrafe", "Air", "AirSide", "Air2", "Punch"] as const
/** Atividade num prédio (mm3d-37b): toca em laço enquanto a pessoa usa o aparelho. */
const PLACE_CLIPS = ["GymSquat", "GymPunch", "GymBoxJump", "GymSitups", "GymKettle", "Pray"] as const
export type PlacePose = (typeof PLACE_CLIPS)[number] | "Run"
/** Arena de Boxe (mm3d-44): BGuard/BWarm/BWin em laço; o resto toca uma vez por cima (boxeAct). */
const BOXE_CLIPS = ["BGuard", "BWarm", "BJab", "BBox0", "BBox1", "BBox2", "BBox3", "BBox4", "BBox5", "BBag", "BDodge", "BHit", "BHitLite", "BStagger", "BFall", "BRise", "BWin"] as const
export type BoxeClip = (typeof BOXE_CLIPS)[number]
/** Pose-base da luta: guarda, aquecimento, cansado, machucado, andando para o canto, vitória. */
export type BoxeBase = "BGuard" | "BWarm" | "BWin" | "TiredIdle" | "InjuredIdle" | "Idle" | "Walk"
/** Golpes e reações tocam uma vez (quem dispara é o boxeAct, nunca o laço). */
const BOXE_LOOP = new Set<string>(["BGuard", "BWarm", "BWin"])
const ONE_SHOT = new Set<string>(["SkatePush", "Air", "AirSide", "Air2", ...BOXE_CLIPS.filter((c) => !BOXE_LOOP.has(c))])
/** `anim` do ponto de uso (servidor) → clipe. */
export const POSE_OF_ANIM: Record<string, PlacePose> = { run: "Run", squat: "GymSquat", punch: "GymPunch", boxjump: "GymBoxJump", situps: "GymSitups", kettlebell: "GymKettle", pray: "Pray" }
/** Pulos do Paint: 0 parado/à frente, 1 de lado, 2 o segundo pulo (no ar). */
const AIR_CLIPS = ["Air", "AirSide", "Air2"] as const
export type JumpKind = 0 | 1 | 2
type Clip =
  | (typeof CLIPS)[number]
  | "Sit"
  | (typeof REST_CLIPS)[number]
  | (typeof RIDE_CLIPS)[number]
  | (typeof PAINT_CLIPS)[number]
  | (typeof PLACE_CLIPS)[number]
  | (typeof BOXE_CLIPS)[number]
/** Soco (mm3d-35): o jab toca acelerado e dura isto (s). */
const PUNCH_RATE = 2.4
const PUNCH_TIME = 0.7
/** Uma pedalada a cada 2 s (pedido do Alex); a troca de pose leva ~0,45 s. */
export const PEDAL_PERIOD = 2
const PEDAL_SWAP = 0.45
/** Velocidade (m/s) abaixo da qual o veículo conta como parado. */
const RIDE_STOP = 0.3
/**
 * BikePedal (mm3d-22): a 6 m/s a pedalada toca a 1× (uma volta em 0,7 s).
 * O pé direito chega embaixo em 60 % do ciclo (ride_mocap_report.json); a
 * pedivela do modelo tem o braço direito 33,5° à frente do ponto mais baixo.
 */
const PEDAL_NATURAL_SPEED = 6
const PEDAL_RIGHT_LOW = 0.6
const CRANK_MODEL_FROM_LOW = 0.585
/** SkatesStride (mm3d-23): a 5 m/s a passada toca a 1× (uma passada de cada pé em 1,2 s). */
const STRIDE_NATURAL_SPEED = 5
/**
 * Impulso e embalo (mm3d-40b, pedido do Alex): bike e patins dão PUMPS
 * pedaladas/passadas para pegar velocidade e depois seguem embalados (pedais
 * nivelados; patins com as pernas juntas). Voltam a impulsionar ao sair do
 * parado ou quando a velocidade cai abaixo de COAST_DROP da que tinham.
 */
const PUMPS = 3
const COAST_DROP = 0.6
/** Fase do BikePedal com os pedais nivelados (o pé direito embaixo fica em 0,6). */
const PEDAL_LEVEL = 0.85

let loadersRegistered = false

/** Registra os carregadores (glTF) uma vez por página. Avatares e casas usam. */
export function ensureLoaders() {
  if (loadersRegistered) return
  registerBuiltInLoaders()
  loadersRegistered = true
}

export class AvatarLibrary {
  /** arquivo de textura → material (um por textura, compartilhado por quem usa). */
  private readonly materials = new Map<string, StandardMaterial>()
  private readonly bodies = new Map<BodyId, Promise<AssetContainer>>()
  private readonly lods = new Map<BodyId, Promise<AssetContainer>>()
  private readonly anims = new Map<AnimSet, Promise<AssetContainer>>()
  private readonly sits = new Map<AnimSet, Promise<AssetContainer>>()
  private readonly rests = new Map<AnimSet, Promise<AssetContainer>>()
  private readonly rides = new Map<AnimSet, Promise<AssetContainer>>()
  private readonly paints = new Map<AnimSet, Promise<AssetContainer>>()
  private readonly places = new Map<AnimSet, Promise<AssetContainer>>()
  private readonly boxes = new Map<AnimSet, Promise<AssetContainer>>()
  private disposed = false
  /** Instâncias vivas (painel técnico e conferência de descarte). */
  live = 0

  constructor(
    private readonly scene: Scene,
    /** Dentro das casas: cada avatar ganha também a pose de sentar. */
    private readonly withSit = false,
    /** Na rua: poses de bicicleta, skate e patins (mm3d-14). */
    private readonly withRide = false,
    /** A partir daqui (m) o avatar usa a malha leve (mm3d-19). */
    public lodDistance = 24,
    /** No Paint (mm3d-35): pulo e soco. */
    private readonly withPaint = false,
    /** Nos prédios do centro (mm3d-37b): academia e reza. */
    private readonly withPlace = false,
    /** Na Arena de Boxe (mm3d-43): os clipes da luta. */
    private readonly withBoxe = false,
  ) {
    ensureLoaders()
  }

  /**
   * Material do corpo. Sem mapas PBR: o próprio basecolor já traz o sombreado
   * do modelo, então o material é simples (difuso + um pouco de emissivo para
   * não escurecer o sombreado que já vem pintado).
   *
   * Com cores (mm3d-36): um material por (textura, look). Nasce com a textura
   * original e troca pela pintada (avatar-tint.ts) quando ela fica pronta.
   */
  private materialFor(id: BodyId, look = "") {
    const file = ASSETS.textures[id]
    const tint = tintedTexture(BASE, file, id, look)
    const key = tint ? `${file}|${look}` : file
    let m = this.materials.get(key)
    if (!m) {
      const tex = new Texture(BASE + file, this.scene, false, false)
      const mat = new StandardMaterial(`mm-avatar-${key}`, this.scene)
      mat.diffuseTexture = tex
      mat.emissiveTexture = tex
      mat.emissiveColor = new Color3(0.42, 0.42, 0.42)
      mat.diffuseColor = new Color3(0.72, 0.72, 0.72)
      mat.specularColor = new Color3(0, 0, 0)
      this.materials.set(key, mat)
      m = mat
      tint
        ?.then((canvas) => {
          if (this.disposed || this.materials.get(key) !== mat) return
          const dt = new DynamicTexture(`mm-avatar-${key}-tint`, canvas, this.scene, true)
          dt.update(false)
          dt.wrapU = tex.wrapU
          dt.wrapV = tex.wrapV
          mat.diffuseTexture = dt
          mat.emissiveTexture = dt
          tex.dispose()
        })
        .catch((err) => console.warn("[meu-mundo] cores não aplicadas", look, err))
    }
    return m
  }

  private body(id: BodyId) {
    let p = this.bodies.get(id)
    if (!p) {
      p = LoadAssetContainerAsync(BASE + ASSETS.bodies[id], this.scene)
      p.catch(() => this.bodies.delete(id))
      this.bodies.set(id, p)
    }
    return p
  }

  private lodBody(id: BodyId) {
    const file = ASSETS.lod[id]
    if (!file) return Promise.resolve(null)
    let p = this.lods.get(id)
    if (!p) {
      p = LoadAssetContainerAsync(BASE + file, this.scene)
      p.catch(() => this.lods.delete(id))
      this.lods.set(id, p)
    }
    return p
  }

  private animSet(id: BodyId) {
    const key = ANIM_SET[id]
    let p = this.anims.get(key)
    if (!p) {
      p = LoadAssetContainerAsync(BASE + ASSETS.anims[key], this.scene)
      p.catch(() => this.anims.delete(key))
      this.anims.set(key, p)
    }
    return p
  }

  private sitSet(id: BodyId) {
    const key = ANIM_SET[id]
    let p = this.sits.get(key)
    if (!p) {
      p = LoadAssetContainerAsync(BASE + ASSETS.sit[key], this.scene)
      p.catch(() => this.sits.delete(key))
      this.sits.set(key, p)
    }
    return p
  }

  private restSet(id: BodyId) {
    const key = ANIM_SET[id]
    let p = this.rests.get(key)
    if (!p) {
      p = LoadAssetContainerAsync(BASE + ASSETS.rest[key], this.scene)
      p.catch(() => this.rests.delete(key))
      this.rests.set(key, p)
    }
    return p
  }

  private paintSet(id: BodyId) {
    const key = ANIM_SET[id]
    let p = this.paints.get(key)
    if (!p) {
      p = LoadAssetContainerAsync(BASE + ASSETS.paint[key], this.scene)
      p.catch(() => this.paints.delete(key))
      this.paints.set(key, p)
    }
    return p
  }

  private boxeSet(id: BodyId) {
    const key = ANIM_SET[id]
    let p = this.boxes.get(key)
    if (!p) {
      p = LoadAssetContainerAsync(BASE + ASSETS.boxe[key], this.scene)
      p.catch(() => this.boxes.delete(key))
      this.boxes.set(key, p)
    }
    return p
  }

  private placeSet(id: BodyId) {
    const key = ANIM_SET[id]
    let p = this.places.get(key)
    if (!p) {
      p = LoadAssetContainerAsync(BASE + ASSETS.place[key], this.scene)
      p.catch(() => this.places.delete(key))
      this.places.set(key, p)
    }
    return p
  }

  private rideSet(id: BodyId) {
    const key = ANIM_SET[id]
    let p = this.rides.get(key)
    if (!p) {
      p = LoadAssetContainerAsync(BASE + ASSETS.ride[key], this.scene)
      p.catch(() => this.rides.delete(key))
      this.rides.set(key, p)
    }
    return p
  }

  /** Cria um avatar com esqueleto e animações próprios. */
  async create(id: BodyId, look = ""): Promise<AvatarRig> {
    // A pose de sentar e as de descanso/cansaço são opcionais: se o arquivo
    // falhar, o avatar existe (sentado/deitado fica parado em pé, sem quebrar
    // a casa; cansado anda normal).
    const sitP = this.withSit ? this.sitSet(id).catch(() => null) : Promise.resolve(null)
    const restP = this.restSet(id).catch(() => null)
    const rideP = this.withRide ? this.rideSet(id).catch(() => null) : Promise.resolve(null)
    const lodP = this.lodBody(id).catch(() => null)
    const paintP = this.withPaint ? this.paintSet(id).catch(() => null) : Promise.resolve(null)
    const placeP = this.withPlace ? this.placeSet(id).catch(() => null) : Promise.resolve(null)
    const boxeP = this.withBoxe ? this.boxeSet(id).catch(() => null) : Promise.resolve(null)
    const [container, anims, sit, rest, ride, lodC, paint, place, boxe] = await Promise.all([
      this.body(id),
      this.animSet(id),
      sitP,
      restP,
      rideP,
      lodP,
      paintP,
      placeP,
      boxeP,
    ])
    if (this.disposed) throw new Error("disposed")
    const entries = container.instantiateModelsToScene((n) => n, false, { doNotInstantiate: true })
    const root = entries.rootNodes[0] as TransformNode
    const byName = new Map<string, Node>()
    for (const n of root.getDescendants(false)) byName.set(n.name, n)
    const groups = {} as Partial<Record<Clip, AnimationGroup>> & Record<(typeof CLIPS)[number], AnimationGroup>
    for (const clip of CLIPS) {
      const src = anims.animationGroups.find((g) => g.name === clip)
      if (!src) throw new Error(`animação ${clip} ausente`)
      const g = src.clone(`${clip}#${++cloneSeq}`, (old: Node) => byName.get(old.name) ?? null, true)
      groups[clip] = g
    }
    const sitSrc = sit?.animationGroups.find((g) => g.name === "Sit")
    if (sitSrc) groups.Sit = sitSrc.clone(`Sit#${++cloneSeq}`, (old: Node) => byName.get(old.name) ?? null, true)
    for (const clip of REST_CLIPS) {
      const src = rest?.animationGroups.find((g) => g.name === clip)
      if (src) groups[clip] = src.clone(`${clip}#${++cloneSeq}`, (old: Node) => byName.get(old.name) ?? null, true)
    }
    for (const clip of PAINT_CLIPS) {
      const src = paint?.animationGroups.find((g) => g.name === clip)
      if (src) groups[clip] = src.clone(`${clip}#${++cloneSeq}`, (old: Node) => byName.get(old.name) ?? null, true)
    }
    for (const clip of PLACE_CLIPS) {
      const src = place?.animationGroups.find((g) => g.name === clip)
      if (src) groups[clip] = src.clone(`${clip}#${++cloneSeq}`, (old: Node) => byName.get(old.name) ?? null, true)
    }
    for (const clip of BOXE_CLIPS) {
      const src = boxe?.animationGroups.find((g) => g.name === clip)
      if (src) groups[clip] = src.clone(`${clip}#${++cloneSeq}`, (old: Node) => byName.get(old.name) ?? null, true)
    }
    for (const clip of RIDE_CLIPS) {
      const src = ride?.animationGroups.find((g) => g.name === clip)
      if (src) groups[clip] = src.clone(`${clip}#${++cloneSeq}`, (old: Node) => byName.get(old.name) ?? null, true)
    }
    const feet = [byName.get("mixamorig:LeftFoot"), byName.get("mixamorig:RightFoot")] as (TransformNode | undefined)[]
    const meshes = root.getChildMeshes(false) as AbstractMesh[]
    for (const mesh of meshes) {
      mesh.material = this.materialFor(id, look)
      mesh.isPickable = false
      // Caixa COM o esqueleto (pose de ligação, uma vez): a malha é quantizada
      // e a desquantização mora nas matrizes de ligação — sem o esqueleto, a
      // caixa saía em unidades cruas (esfera de 14 km), nada era recortado
      // fora da tela e o LOD do Babylon (distância ao centro da caixa) sempre
      // escolhia a malha leve (mm3d-19). Folga: a animação sai da pose T.
      mesh.skeleton?.prepare(true)
      mesh.refreshBoundingInfo({ applySkeleton: true })
      mesh.getBoundingInfo().scale(1.25)
    }
    const lod = lodC ? this.attachLod(lodC, meshes[0] as Mesh, id, look) : null
    this.live++
    const rig = new AvatarRig(this, id, entries, root, groups, meshes, feet, ANKLE_REST[ANIM_SET[id]], lod)
    rig.setLodDistance(this.lodDistance)
    return rig
  }

  /**
   * Malha leve como nível de LOD da cheia: filha dela (sai junto no descarte)
   * e no esqueleto DELA. O Babylon desenha o nível com a matriz e a caixa da
   * malha mestra; a cópia de esqueleto que veio do arquivo é descartada.
   */
  private attachLod(c: AssetContainer, main: Mesh, id: BodyId, look: string): Mesh | null {
    if (!main?.skeleton) return null
    const e = c.instantiateModelsToScene((n) => n, false, { doNotInstantiate: true })
    const mesh = (e.rootNodes[0] as TransformNode | undefined)?.getChildMeshes(false)[0] as Mesh | undefined
    if (!mesh || mesh.getTotalVertices() === 0) {
      e.dispose()
      return null
    }
    mesh.parent = main
    mesh.skeleton = main.skeleton
    mesh.material = this.materialFor(id, look)
    mesh.isPickable = false
    e.rootNodes.forEach((n) => n.dispose())
    e.skeletons.forEach((s) => s.dispose())
    return mesh
  }

  release() {
    this.live--
  }

  dispose() {
    this.disposed = true
    const all = [...this.bodies.values(), ...this.lods.values(), ...this.anims.values(), ...this.sits.values(), ...this.rests.values(), ...this.rides.values(), ...this.paints.values(), ...this.places.values(), ...this.boxes.values()]
    for (const p of all) p.then((c) => c.dispose()).catch(() => {})
    this.bodies.clear()
    this.lods.clear()
    this.anims.clear()
    this.sits.clear()
    this.rests.clear()
    this.rides.clear()
    this.paints.clear()
    this.places.clear()
    this.boxes.clear()
    for (const m of this.materials.values()) {
      m.diffuseTexture?.dispose()
      m.dispose()
    }
    this.materials.clear()
  }
}

let cloneSeq = 0

/** Um corpo animado. Não sabe de rede nem de colisão: recebe estado e toca. */
export class AvatarRig {
  private weights: Record<Clip, number> = {
    Idle: 1, Walk: 0, SlowRun: 0, Sit: 0, Lie: 0, Sleep: 0, TiredIdle: 0, TiredWalk: 0, InjuredIdle: 0, InjuredWalk: 0,
    BikeA: 0, BikeB: 0, BikePedal: 0, SkateRide: 0, SkatePush: 0, SkatesGlide: 0, SkatesStride: 0,
    PIdle: 0, PFire: 0, PWalk: 0, PRun: 0, PStrafe: 0, Air: 0, AirSide: 0, Air2: 0, Punch: 0,
    GymSquat: 0, GymPunch: 0, GymBoxJump: 0, GymSitups: 0, GymKettle: 0, Pray: 0,
    BGuard: 0, BWarm: 0, BJab: 0, BBox0: 0, BBox1: 0, BBox2: 0, BBox3: 0, BBox4: 0, BBox5: 0, BBag: 0,
    BDodge: 0, BHit: 0, BHitLite: 0, BStagger: 0, BFall: 0, BRise: 0, BWin: 0,
  }
  private readonly clips: Clip[]
  private disposed = false
  /** Longe ou fora da tela (mm3d-19): a pose fica parada, nada é avaliado. */
  private frozen = false
  private lodAt = -1
  // ── veículo (mm3d-14) ──
  private rideMove: MoveState = 0
  private rideStopped = true
  private rideClock = 0
  /** Segundos que faltam do impulso (skate) ou do passo de saída (patins). */
  private rideStart = 0
  /** Ângulo da pedivela (rad): meia volta por pedalada, junto com a troca de pose. */
  crank = 0
  // ── impulso e embalo (bike e patins, mm3d-40b) ──
  private pumping = true
  private pumps = 0
  private coastRef = 0
  private lastPhase = 0

  constructor(
    private readonly lib: AvatarLibrary,
    readonly body: BodyId,
    private readonly entries: InstantiatedEntries,
    readonly root: TransformNode,
    private readonly groups: Partial<Record<Clip, AnimationGroup>> & Record<(typeof CLIPS)[number], AnimationGroup>,
    readonly meshes: AbstractMesh[],
    private readonly feet: (TransformNode | undefined)[] = [],
    /** Tornozelo acima da sola, em pé (m). */
    readonly ankleRest = 0.148,
    /** Malha leve (nível de LOD da primeira malha), se carregou. */
    private readonly lod: Mesh | null = null,
  ) {
    this.clips = [...CLIPS, ...(["Sit", ...REST_CLIPS, ...RIDE_CLIPS, ...PAINT_CLIPS, ...PLACE_CLIPS, ...BOXE_CLIPS] as const).filter((c) => !!groups[c])]
    for (const clip of this.clips) {
      const g = groups[clip]!
      g.weight = this.weights[clip]
      g.start(true, 1)
      if (this.weights[clip] === 0) g.pause()
    }
  }

  setParent(parent: TransformNode) {
    this.root.parent = parent
  }

  setVisible(v: boolean) {
    for (const m of this.meshes) m.isVisible = v
  }

  /** Distância (m) a partir da qual a malha leve entra. */
  setLodDistance(d: number) {
    const main = this.meshes[0] as Mesh | undefined
    if (!this.lod || !main || d === this.lodAt) return
    if (this.lodAt >= 0) main.removeLODLevel(this.lod)
    main.addLODLevel(d, this.lod)
    this.lodAt = d
  }

  get lodDistance() {
    return this.lod ? this.lodAt : Infinity
  }

  /** Parar/retomar a animação. Retomando, o próximo update volta a tocar o que tem peso. */
  setFrozen(f: boolean) {
    if (f === this.frozen) return
    this.frozen = f
    if (f) for (const clip of this.clips) this.groups[clip]!.pause()
  }

  get isFrozen() {
    return this.frozen
  }

  /** Está na tela? (planos do quadro anterior; sem malha, conta como sim). */
  inFrustum(planes: Plane[]) {
    const m = this.meshes[0]
    return !m || planes.length === 0 || m.isInFrustum(planes)
  }

  /** Nó do esqueleto pelo nome (a arma do Paint vai na mão, mm3d-35). */
  node(name: string): TransformNode | null {
    return (this.root.getDescendants(false).find((n) => n.name === name) as TransformNode | undefined) ?? null
  }

  /** Posição no mundo dos tornozelos [esquerdo, direito] (patins presos aos pés). */
  feetWorld(): (Vector3 | null)[] {
    return this.feet.map((n) => (n ? n.getAbsolutePosition().clone() : null))
  }

  /**
   * Pesos de quem está num veículo (move 6 bike, 7 skate, 8 patins). Bike: a
   * cada PEDAL_PERIOD em movimento troca A↔B (uma pedalada) e a pedivela dá
   * meia volta junto. Skate: ao sair do parado, o impulso (SkatePush, 1 s) e
   * depois SkateRide. Patins: ao sair do parado, um ciclo de caminhada e
   * depois SkatesGlide. Sem as poses carregadas, fica em repouso.
   */
  /**
   * Conta os ciclos do clipe de impulso (`phase` 0–1) e decide entre
   * impulsionar e seguir embalado. Devolve true quando acabou de voltar a
   * impulsionar (o clipe recomeça do início).
   */
  private effort(moving: boolean, speed: number, phase: number) {
    let restart = false
    if (!moving) {
      if (!this.pumping) restart = true
      this.pumping = true
      this.pumps = 0
      this.coastRef = 0
    } else if (this.pumping) {
      if (phase < this.lastPhase - 0.5) this.pumps++
      if (this.pumps >= PUMPS) {
        this.pumping = false
        this.coastRef = speed
      }
    } else {
      this.coastRef = Math.max(this.coastRef, speed)
      if (speed < this.coastRef * COAST_DROP) {
        this.pumping = true
        this.pumps = 0
        restart = true
      }
    }
    this.lastPhase = phase
    return restart
  }

  private rideTargets(dt: number, move: MoveState, speed: number, target: Record<Clip, number>) {
    const have = this.groups
    if (move !== this.rideMove) {
      this.rideMove = move
      this.rideStopped = true
      this.rideClock = 0
      this.rideStart = 0
      this.pumping = true
      this.pumps = 0
      this.coastRef = 0
    }
    const moving = Math.abs(speed) > RIDE_STOP
    if (this.rideStopped && moving) {
      this.rideStopped = false
      if (move === 7 && have.SkatePush) {
        this.rideStart = 1.0
        const g = have.SkatePush
        g.stop()
        g.start(false, 1)
      } else if (move === 8 && !have.SkatesStride) {
        this.rideStart = 1.05
        this.groups.Walk.goToFrame(this.groups.Walk.from)
      }
    } else if (!moving && this.rideStart <= 0) this.rideStopped = true
    this.rideStart = Math.max(0, this.rideStart - dt)
    if (move === 6 && have.BikePedal) {
      // Pedalada em ciclo no ritmo da bike (3 vezes, depois embala com os
      // pedais nivelados); a pedivela segue a fase do ciclo.
      const g = have.BikePedal
      const frameOf = () => g.animatables[0]?.masterFrame ?? g.from
      let phase = g.to > g.from ? (frameOf() - g.from) / (g.to - g.from) : 0
      this.effort(moving, Math.abs(speed), phase)
      if (!moving) g.speedRatio = 0
      else if (this.pumping) g.speedRatio = Math.max(0.35, Math.min(2.5, Math.abs(speed) / PEDAL_NATURAL_SPEED))
      else if (g.speedRatio !== 0 && phase >= PEDAL_LEVEL) {
        // terminou a 3ª pedalada: para com os pedais nivelados
        g.goToFrame(g.from + PEDAL_LEVEL * (g.to - g.from))
        g.speedRatio = 0
        phase = PEDAL_LEVEL
      }
      target.BikePedal = 1
      this.crank = CRANK_MODEL_FROM_LOW + 2 * Math.PI * (phase - PEDAL_RIGHT_LOW)
      return true
    }
    if (move === 6 && have.BikeA && have.BikeB) {
      if (moving) this.rideClock += dt
      const stroke = Math.floor(this.rideClock / PEDAL_PERIOD)
      const into = Math.min(1, (this.rideClock - stroke * PEDAL_PERIOD) / PEDAL_SWAP)
      const even = stroke % 2 === 0
      target[even ? "BikeA" : "BikeB"] = 1
      // A pedivela gira junto com a troca de pose (a pose B é a A meia volta adiante).
      // pedalada 0 = pose A (pedivela como no modelo); cada pedalada seguinte gira meia volta.
      this.crank = Math.max(0, stroke - 1 + into) * Math.PI
      return true
    }
    if (move === 7 && have.SkateRide) {
      if (this.rideStart > 0 && have.SkatePush) target.SkatePush = 1
      else target.SkateRide = 1
      // Parado em cima da prancha: agachado (o começo do ciclo), sem remar.
      const g = have.SkateRide
      if (!moving && g.speedRatio !== 0) {
        g.goToFrame(g.from)
        g.speedRatio = 0
      } else if (moving) g.speedRatio = 1
      return true
    }
    if (move === 8 && have.SkatesStride) {
      // Patins: 3 passadas no ritmo da velocidade e depois deslize com as
      // pernas juntas; parado, deslize em pé.
      const g = have.SkatesStride
      const a = g.animatables[0]?.masterFrame ?? g.from
      const phase = g.to > g.from ? (a - g.from) / (g.to - g.from) : 0
      if (this.effort(moving, Math.abs(speed), phase)) {
        g.goToFrame(g.from)
        this.lastPhase = 0
      }
      g.speedRatio = Math.max(0.6, Math.min(1.8, Math.abs(speed) / STRIDE_NATURAL_SPEED))
      if (moving && this.pumping) target.SkatesStride = 1
      else target[have.SkatesGlide ? "SkatesGlide" : "Idle"] = 1
      return true
    }
    if (move === 8 && have.SkatesGlide) {
      if (this.rideStart > 0) target.Walk = 1
      else target.SkatesGlide = 1
      return true
    }
    target.Idle = 1
    return true
  }

  /**
   * Transição suave entre repouso, caminhada e corrida lenta. A velocidade de
   * reprodução segue a velocidade REAL do deslocamento (reduz o deslize dos
   * pés): a animação anda X m/s a 1×, então a taxa é velocidade ÷ X.
   */
  /** No ar (Paint): o clipe do último pulo, uma vez (fica no último quadro). */
  air = false
  private airClip: (typeof AIR_CLIPS)[number] = "Air"
  private punchLeft = 0

  /**
   * Pulou ou saiu do chão (Paint, mm3d-35c/e): escolhe o clipe do tipo do
   * pulo. O clipe NÃO anda pelo relógio: `setAirPhase` põe o quadro pela fase
   * do voo (subida → 1ª metade, alto → meio, descida → 2ª metade), então serve
   * para pulo curto, duplo, quique da cama elástica e queda da borda. O grupo
   * fica tocando PAUSADO — grupo parado não contribui e, com peso 1, o
   * esqueleto voltava à pose de ligação (a pose T que o Alex viu).
   */
  jump(kind: JumpKind) {
    const clip = AIR_CLIPS[kind]
    const g = this.groups[clip] ?? this.groups.Air
    if (!g) return
    this.airClip = this.groups[clip] ? clip : "Air"
    g.play(true)
    g.pause()
    g.goToFrame(g.from)
  }

  /** Fase do voo (0 saindo do chão, 0,5 no alto, 1 chegando ao chão). */
  setAirPhase(p: number) {
    const g = this.groups[this.airClip]
    if (!g) return
    if (!g.isStarted) {
      g.play(true)
      g.pause()
    }
    g.goToFrame(g.from + (g.to - g.from) * Math.max(0, Math.min(1, p)))
  }
  /**
   * Locomoção armada do Paint (mm3d-35b): movimento no referencial do corpo
   * (m/s, frente e direita) e se está atirando. null = a locomoção normal.
   */
  paint: { fwd: number; side: number; firing: boolean } | null = null

  /** Soco (Paint): o jab do começo, uma vez. */
  punch() {
    const g = this.groups.Punch
    if (!g) return
    this.punchLeft = PUNCH_TIME
    g.reset()
    g.speedRatio = PUNCH_RATE
    g.play(true)
  }

  /**
   * Atividade num prédio (mm3d-37b): o clipe do aparelho em laço, parado no
   * lugar; "Run" = a corrida da locomoção (esteira). null = a locomoção normal.
   */
  pose: PlacePose | null = null

  /**
   * Arena de Boxe (mm3d-43): a pose-base em laço (null = a locomoção normal).
   * Quem desenha a luta escolhe a base e dispara os golpes com boxeAct.
   */
  boxe: BoxeBase | null = null
  private boxeClip: BoxeClip | null = null
  private boxeLeft = 0
  private boxeHold = false

  /**
   * Toca `clip` uma vez, do trecho `from`–`to` (0–1 do clipe), esticado para
   * durar `dur` segundos. `hold` = ao fim fica parado no último quadro (deitado
   * depois da queda) até o próximo boxeAct ou boxeClear.
   */
  boxeAct(clip: BoxeClip, dur: number, from = 0, to = 1, hold = false) {
    const g = this.groups[clip]
    if (!g || dur <= 0) return false
    const fps = g.targetedAnimations[0]?.animation.framePerSecond || 60
    const f0 = g.from + (g.to - g.from) * from
    const f1 = g.from + (g.to - g.from) * to
    if (this.boxeClip && this.boxeClip !== clip) {
      const old = this.groups[this.boxeClip]
      if (old && !this.boxeHold) old.pause()
    }
    g.stop()
    g.start(false, Math.max(0.05, (f1 - f0) / fps / dur), f0, f1)
    this.boxeClip = clip
    this.boxeLeft = dur
    this.boxeHold = hold
    return true
  }

  /** Solta o golpe/queda em andamento (volta à base). */
  boxeClear() {
    this.boxeClip = null
    this.boxeLeft = 0
    this.boxeHold = false
  }

  update(dt: number, move: MoveState, speed: number, tired = false, unwell = false) {
    if (this.disposed || this.frozen) return
    if (this.boxe) {
      const target = Object.fromEntries(this.clips.map((c) => [c, 0])) as Record<Clip, number>
      const act = this.boxeClip ? this.groups[this.boxeClip] : undefined
      if (act && this.boxeLeft <= 0 && this.boxeHold && act.isPlaying) {
        // fim da queda: parado no último quadro (grupo pausado com peso continua valendo)
        act.goToFrame(act.to)
        act.pause()
      }
      this.boxeLeft -= dt
      if (act && (this.boxeLeft > 0 || this.boxeHold)) target[this.boxeClip!] = 1
      else {
        this.boxeClip = null
        target[this.groups[this.boxe] ? this.boxe : "Idle"] = 1
      }
      // andando na guarda (mm3d-44): o pulinho acelera com as pernas
      if (this.groups.BGuard) this.groups.BGuard.speedRatio = this.boxe === "BGuard" ? 1 + Math.min(0.7, speed * 0.4) : 1
      return this.applyWeights(dt, target, this.boxe === "Walk" ? speed : 0, 14)
    }
    if (this.pose && (this.pose === "Run" || this.groups[this.pose])) {
      const target = Object.fromEntries(this.clips.map((c) => [c, 0])) as Record<Clip, number>
      target[this.pose === "Run" ? "SlowRun" : this.pose] = 1
      // Esteira: a corrida no ritmo de quem corre a ~3,4 m/s.
      return this.applyWeights(dt, target, this.pose === "Run" ? 3.4 : 0)
    }
    // Paint (mm3d-35): soco vence o pulo, que vence a locomoção (armada, se houver).
    const punching = this.punchLeft > 0 && !!this.groups.Punch
    const air = this.air && !!this.groups[this.airClip]
    if (punching || air || (this.paint && this.groups.PIdle)) {
      this.punchLeft = Math.max(0, this.punchLeft - dt)
      const target = Object.fromEntries(this.clips.map((c) => [c, 0])) as Record<Clip, number>
      if (punching) target.Punch = 1
      else if (air) target[this.airClip] = 1
      else {
        const p = this.paint!
        const moving = Math.hypot(p.fwd, p.side) > 0.35
        if (!moving) target[p.firing && this.groups.PFire ? "PFire" : "PIdle"] = 1
        else if (Math.abs(p.side) > Math.abs(p.fwd) * 1.2 && this.groups.PStrafe) {
          target.PStrafe = 1
          // a fonte anda para a ESQUERDA; para a direita, ao contrário
          this.groups.PStrafe.speedRatio = (p.side > 0 ? -1 : 1) * Math.max(0.6, Math.min(1.8, Math.abs(p.side) / 2.6))
        } else if (speed > 5.5 && p.fwd > 0 && this.groups.PRun) {
          target.PRun = 1
          this.groups.PRun.speedRatio = Math.max(0.7, Math.min(1.6, speed / 6.2))
        } else if (this.groups.PWalk) {
          target.PWalk = 1
          this.groups.PWalk.speedRatio = (p.fwd < -0.2 ? -1 : 1) * Math.max(0.7, Math.min(1.9, speed / 3.4))
        } else target.Walk = 1
      }
      return this.applyWeights(dt, target, speed)
    }
    if (move >= 6) return this.applyWeights(dt, this.rideTargetsFor(dt, move, speed), 1)
    this.rideMove = 0
    const have = this.groups
    // Sentado (3), deitado (4) ou dormindo (5) sem a pose carregada: fica em
    // repouso. Dormindo sem "Sleep" usa "Lie".
    const sit = move === 3 && !!have.Sit
    const sleep = move === 5 && !!have.Sleep
    const lie = (move === 4 || (move === 5 && !sleep)) && !!have.Lie
    const still = move === 0 || (move >= 3 && !sit && !sleep && !lie)
    // Indisposto (saúde perto do hospital, mm3d-28) vence o cansado (ritmo < 1,
    // mm3d-13): um estado de corpo inteiro por vez, nunca os dois somados.
    const sickIdle = unwell && !!have.InjuredIdle
    const sickWalk = unwell && !!have.InjuredWalk
    const tiredIdle = tired && !sickIdle && !!have.TiredIdle
    const tiredWalk = tired && !sickWalk && !!have.TiredWalk
    const target: Record<Clip, number> = {
      Idle: still && !tiredIdle && !sickIdle ? 1 : 0,
      Walk: move === 1 && !tiredWalk && !sickWalk ? 1 : 0,
      SlowRun: move === 2 ? 1 : 0,
      Sit: sit ? 1 : 0,
      Lie: lie ? 1 : 0,
      Sleep: sleep ? 1 : 0,
      TiredIdle: still && tiredIdle ? 1 : 0,
      TiredWalk: move === 1 && tiredWalk ? 1 : 0,
      InjuredIdle: still && sickIdle ? 1 : 0,
      InjuredWalk: move === 1 && sickWalk ? 1 : 0,
      BikeA: 0, BikeB: 0, BikePedal: 0, SkateRide: 0, SkatePush: 0, SkatesGlide: 0, SkatesStride: 0,
      PIdle: 0, PFire: 0, PWalk: 0, PRun: 0, PStrafe: 0, Air: 0, AirSide: 0, Air2: 0, Punch: 0,
      GymSquat: 0, GymPunch: 0, GymBoxJump: 0, GymSitups: 0, GymKettle: 0, Pray: 0,
      BGuard: 0, BWarm: 0, BJab: 0, BBox0: 0, BBox1: 0, BBox2: 0, BBox3: 0, BBox4: 0, BBox5: 0, BBag: 0,
      BDodge: 0, BHit: 0, BHitLite: 0, BStagger: 0, BFall: 0, BRise: 0, BWin: 0,
    }
    this.applyWeights(dt, target, speed)
  }

  private rideTargetsFor(dt: number, move: MoveState, speed: number) {
    const target = Object.fromEntries(this.clips.map((c) => [c, 0])) as Record<Clip, number>
    this.rideTargets(dt, move, speed, target)
    return target
  }

  /** Aproxima os pesos do alvo e ajusta a velocidade das caminhadas. */
  private applyWeights(dt: number, target: Record<Clip, number>, speed: number, rate = 0) {
    // A troca de pedalada é mais lenta (~0,45 s) que as outras transições.
    const k = 1 - Math.exp(-(rate || (this.rideMove === 6 ? 7 : 10)) * dt)
    let sum = 0
    for (const clip of this.clips) {
      let w = this.weights[clip] + (target[clip] - this.weights[clip]) * k
      if (Math.abs(w - target[clip]) < 0.01) w = target[clip]
      this.weights[clip] = w
      sum += w
    }
    for (const clip of this.clips) {
      const g = this.groups[clip]!
      const w = sum > 0 ? this.weights[clip] / sum : 0
      g.weight = w
      if (w <= 0 && g.isPlaying) g.pause()
      // O impulso do skate, os pulos e os golpes do boxe tocam UMA vez (quem dispara é o dono), nunca em laço.
      else if (w > 0 && !g.isPlaying && !ONE_SHOT.has(clip)) g.play(true)
    }
    // Patins: o passo de saída anda no ritmo natural (um ciclo em ~1 s).
    const walkRate = this.rideMove === 8 ? 1 : speed > 0.05 ? speed / ANIM_NATURAL_SPEED.walk : 1
    const runRate = speed > 0.05 ? speed / ANIM_NATURAL_SPEED.run : 1
    this.groups.Walk.speedRatio = Math.max(0.5, Math.min(2.2, walkRate))
    if (this.groups.TiredWalk) this.groups.TiredWalk.speedRatio = Math.max(0.4, Math.min(2.2, walkRate))
    if (this.groups.InjuredWalk) this.groups.InjuredWalk.speedRatio = Math.max(0.4, Math.min(2.2, walkRate))
    this.groups.SlowRun.speedRatio = Math.max(0.6, Math.min(2.2, runRate))
  }

  dispose() {
    if (this.disposed) return
    this.disposed = true
    for (const clip of this.clips) this.groups[clip]!.dispose()
    this.entries.dispose()
    this.lib.release()
  }
}

/** Disco translúcido no chão: a cena não tem sombras dinâmicas. */
export function makeShadow(scene: Scene, mat: StandardMaterial, name: string): Mesh {
  const d = MeshBuilder.CreateDisc(name, { radius: 0.48, tessellation: 18 }, scene)
  d.rotation.x = Math.PI / 2
  d.material = mat
  d.isPickable = false
  return d
}

/** Etiqueta com o nome público acima de outro jogador. */
export function makeNameTag(scene: Scene, text: string, mine: boolean) {
  const W = 256
  const H = 64
  const tex = new DynamicTexture(`mm-tag-${text}`, { width: W, height: H }, scene, false)
  tex.hasAlpha = true
  const ctx = tex.getContext() as unknown as CanvasRenderingContext2D
  ctx.clearRect(0, 0, W, H)
  ctx.font = "800 30px system-ui, -apple-system, Segoe UI, sans-serif"
  const w = Math.min(W - 8, ctx.measureText(text).width + 28)
  ctx.fillStyle = mine ? "rgba(242,183,5,0.95)" : "rgba(11,11,13,0.78)"
  ctx.fillRect((W - w) / 2, 10, w, 44)
  ctx.fillStyle = mine ? "#0B0B0D" : "#F7F0D9"
  ctx.textAlign = "center"
  ctx.textBaseline = "middle"
  ctx.fillText(text, W / 2, 33, W - 30)
  tex.update(true)
  const mat = new StandardMaterial(`mm-tag-mat-${text}`, scene)
  mat.diffuseTexture = tex
  mat.emissiveColor = new Color3(1, 1, 1)
  mat.disableLighting = true
  mat.useAlphaFromDiffuseTexture = true
  mat.backFaceCulling = false
  const plane = MeshBuilder.CreatePlane(`mm-tag-${text}`, { width: 1.6, height: 0.4 }, scene)
  plane.material = mat
  plane.billboardMode = 7
  plane.isPickable = false
  return {
    mesh: plane,
    dispose() {
      plane.dispose()
      mat.dispose()
      tex.dispose()
    },
  }
}

export function newHolder(scene: Scene, name: string) {
  return new TransformNode(name, scene)
}
