// features/meu-mundo/types.ts
//
// Contrato do bairro do Meu Mundo 3D. É exatamente a forma que o servidor
// devolve (`GET /meu-mundo/admin/neighborhood`). Desde o mm3d-02 o bairro é
// PERSISTENTE (mig 291): quem mora em cada casa vem do banco. Posição e
// orientação dos lotes e a lista de obstáculos de colisão vêm do servidor;
// ruas e casas são desenhadas pelo cliente a partir do layout.

export type Vec2 = { x: number; z: number }

export interface Lot {
  /** Estável: "lot-01" … "lot-20". */
  id: string
  number: number
  side: "north" | "east" | "south" | "west"
  position: Vec2
  /** A FRENTE da casa é o -Z local; esta rotação a vira para a rua. */
  rotationY: number
  width: number
  depth: number
  houseId: string
}

export interface House {
  /** Estável: "house-01" … "house-20". */
  id: string
  lotId: string
  /** Nível CONFIRMADO no servidor (01–10). */
  level: number
  /** Revisão do nível: só uma revisão maior substitui a atual. */
  levelRev?: number
  /** Variação visual estável (cores e detalhes). */
  variant: number
  /** Nome público do titular; null = casa disponível. Nunca e-mail ou id. */
  ownerName: string | null
  /** A casa é do jogador que está vendo. */
  isMine: boolean
}

/** Obstáculo de colisão (retângulo girado no plano XZ), vindo do servidor. */
export interface Box2Def {
  x: number
  z: number
  hx: number
  hz: number
  rot: number
  h: number
  /** Presente nas caixas da CASA: número do lote (trocadas quando o nível muda). */
  lot?: number
}

/**
 * Um nível de casa do catálogo do servidor (src/utils/meuMundoHouses.js).
 * Coordenadas LOCAIS do lote (metros, frente no -Z). O cliente nunca inventa
 * caminho de modelo: o asset vem daqui, com nome versionado por hash.
 */
export interface HouseLevelDef {
  level: number
  id: string
  available: boolean
  kind: "builtin" | "glb" | "missing"
  /** Arquivo de runtime (relativo a houseCatalog.basePath). null no 01 e no indisponível. */
  asset: string | null
  thumb: string | null
  size?: { width: number; depth: number; height: number }
  extent?: { minX: number; maxX: number; minZ: number; maxZ: number }
  /** Onde a origem do modelo (frente dos degraus, eixo do caminho) fica no lote. */
  origin?: Vec2
  door?: Vec2
  /** Fim do caminho que vem da calçada. */
  pathEnd?: Vec2
  /** [x, z, hx, hz, altura] — retângulos alinhados ao lote. */
  colliders?: [number, number, number, number, number][]
  bytes?: number
}

export interface HouseCatalog {
  assetVersion: string
  basePath: string
  levels: HouseLevelDef[]
}

/** Configuração do lote (coordenadas LOCAIS, metros, frente no -Z). */
export interface LotPlan {
  width: number
  depth: number
  setbacks: { front: number; side: number; back: number }
  /** Meio da fachada da casa: as casas maiores crescem daqui para trás e para os lados. */
  houseFront: Vec2
  /** Onde o lote encontra a calçada. */
  access: Vec2
  sign: Vec2
  hedge: { thickness: number; height: number; frontGap: number }
  tree: Vec2 & { scale: number }
  flowers: Vec2
  /** Casa nível 01 (medidas fixas). */
  house: { width: number; depth: number; height: number; pathWidth: number; stepDepth: number; stepWidth: number }
  /** Espaço máximo para as casas futuras. */
  buildable: { minX: number; maxX: number; minZ: number; maxZ: number }
}

/** [x, z, escala] */
export type TreeAt = [number, number, number]

/** Medidas do bairro (anel, calçadas, cerca, portão, gramado). */
export interface NeighborhoodDims {
  ring: number
  roadHalf: number
  sidewalk: number
  lotFront: number
  hedge: number
  gateX: number
  exitZ: number
  exitEnd: number
  innerWalk: number
  plazaTrees: TreeAt[]
  plazaFlowers: [number, number][]
  cornerTrees: TreeAt[]
  outerTrees: TreeAt[]
}

export interface Neighborhood {
  id: string
  name: string
  layout: "ring-20"
  /** Versão do desenho (2 = terrenos 18 × 24, mm3d-03). Ausente = mm3d-02. */
  layoutVersion?: number
  lotPlan?: LotPlan
  dims?: NeighborhoodDims
  capacity: number
  /** Titulares do bairro (permanentes; não confundir com quem está online). */
  residents: number
  lots: Lot[]
  houses: House[]
  spawn: Vec2 & { rotationY: number }
  exit: Vec2 & { id: string; label: string }
  /** A MESMA lista que a sala multiplayer usa para validar o movimento. */
  obstacles: Box2Def[]
  /** Catálogo dos níveis 01–10 (mm3d-06). Ausente = backend anterior: só o 01. */
  houseCatalog?: HouseCatalog
  limit: number
}

export type BodyId = "normal" | "slim" | "fat" | "strong" | "sergio"
export const BODY_IDS: BodyId[] = ["normal", "slim", "fat", "strong", "sergio"]

export interface SeatReservation {
  name: string
  sessionId: string
  roomId: string
  processId: string
  [k: string]: unknown
}

export interface MultiplayerSession {
  wsPath: string
  reservation: SeatReservation
  sceneKey?: string
}

export interface NeighborhoodPayload {
  scene?: "neighborhood"
  /** Em que sala a reserva vale ("nb:<id>"). */
  sceneKey?: string
  release: string
  demo: boolean
  environment: string
  neighborhood: Neighborhood
  me: {
    name: string
    body: BodyId
    house: number
    newResidence: boolean
    home: Vec2 & { rotationY: number }
    /** Na rua de OUTRO bairro, por visita. */
    visitor?: boolean
    /** Casa que este jogador pode visitar aqui (visita ativa). */
    visiting?: { house: number; hostName: string } | null
    homeNeighborhood?: boolean
  }
  motion: { walkSpeed: number; runSpeed: number }
  multiplayer: MultiplayerSession | { error: string } | null
  visits?: VisitState
  life?: LifeSummary | null
}

// ═══ Vida do hóspede (mm3d-13) ══════════════════════════════════════════════
// Espelho do snapshot de freelandoo-backend/src/utils/meuMundoLife.js. Os
// cards (fase seguinte) leem GET /meu-mundo/admin/life; o payload de entrada
// traz só o hóspede e a carteira.

export type LifeTrained = "intelligence" | "strength" | "speed"

export type LifeActivity = "idle" | "lying" | "sleeping" | "studying" | "training" | "working" | "hospital"

export interface LifeCharacter {
  generation: number
  bornAt: string
  deathSeen: boolean
  status: "alive" | "hospital" | "dead"
  deathCause: string | null
  diedAt: string | null
  personality: Record<"discipline" | "anxiety" | "optimism" | "appetite" | "resilience" | "metabolism", number>
  vitals: Record<"energy" | "satiety" | "mood" | "stress" | "health" | "vitality", number>
  body: { heightM: number; weightKg: number; fatPct: number; leanKg: number; bmi: number; bodyHint: BodyId }
  /** Inteligência, força e velocidade 0–1000; fertilidade 0–100. */
  attributes: Record<"intelligence" | "strength" | "speed" | "fertility", number> & {
    /** Maior valor já alcançado e o piso que não se perde mais (0–1000). */
    peaks: Record<LifeTrained, number>
    floors: Record<LifeTrained, number>
    /** Horas que ainda rendem hoje (estudo e treino têm teto por dia). */
    usefulToday: Record<"studying" | "training", { done: number; cap: number }>
  }
  health: {
    diabetes: "none" | "controlled" | "uncontrolled"
    hypertension: "none" | "controlled" | "uncontrolled"
    diabetesRisk: number
    bpRisk: number
    glucose: number
    systolic: number
    diastolic: number
    toxicity: number
    cardiac: number
    diet: number
    awakeHours: number
  }
  activity: {
    kind: LifeActivity
    startedAt: string
    until: string | null
    remainingH: number | null
    inBed: boolean
    resume: { kind: LifeActivity; until: string } | null
  }
  effects: { id: string; remainingH: number }[]
  meals: { at: number; state: "eaten" | "missed" | "open" | "upcoming" }[]
  today: { day: string; score: number; label: "otima" | "boa" | "regular" | "ruim" | "critica"; hours: Record<LifeActivity, number> }
  /** Ritmo de caminhada: 1 normal, 0,7 cansado, 0,42 exausto. */
  pace: number
}

export interface LifeSummary {
  now: string
  character: LifeCharacter
  wallet: { coins: number }
  /** O que a sala desenha: a skin vestida ou a condição física (mm3d-16). */
  avatar?: BodyId
}

/** Vestuário (mm3d-16): GET /meu-mundo/admin/skins e as ações. */
export interface WardrobeSkin {
  id: string
  kind: "standard" | "skin"
  name: string
  price: number
  owned: boolean
  equipped: boolean
}

export interface WardrobeResult extends LifeSummary {
  wardrobe: { condition: BodyId; skins: WardrobeSkin[] }
  bought?: boolean
}

export type LifeItemKind = "food" | "drink" | "supplement" | "medicine" | "stimulant" | "anabolic"

/** Item do catálogo (fonte: ITEMS em meuMundoLife.js). */
export interface LifeItem {
  id: string
  kind: LifeItemKind
  name: string
  price: number
  kcal: number
  sat: number
  sugar: number
  sodium: number
  nutri: number
  protein: number
  mood: number
  energy: number
  stress: number
  tox: number
  effect: { id: string; hours: number } | null
}

export interface LifeDay {
  day: string
  closed: boolean
  hours: Record<LifeActivity, number>
  mealsEaten: number
  mealsMissed: number
  healthy: number
  junk: number
  avgMood: number | null
  minHealth: number
  maxStress: number
  coins: number
  condition: { score: number; label: LifeCharacter["today"]["label"] }
}

export interface LifeEvent {
  at: string
  kind: string
  data: Record<string, unknown>
}

/** GET /meu-mundo/admin/life */
export interface LifeFull extends LifeSummary {
  days: LifeDay[]
  events: LifeEvent[]
  catalog: {
    items: LifeItem[]
    activityHours: Record<string, [number, number]>
    attributes: { max: number; usefulH: Record<"studying" | "training", number>; floor: Record<LifeTrained, number> }
    clock: { offsetMin: number; meals: number[]; mealWindowH: number }
  }
}

// ═══ Interiores (mm3d-09) ═══════════════════════════════════════════════════
export type FloorMat = "wood" | "tile" | "carpet" | "stone"

export interface InteriorRoom {
  id: string
  name: string
  mat: FloorMat
  x0: number
  z0: number
  x1: number
  z1: number
  outdoor?: boolean
}

export interface InteriorWall {
  x: number
  z: number
  hx: number
  hz: number
  /** Altura relativa ao piso. */
  h: number
  kind: "ext" | "int" | "facade" | "rail"
}

export interface InteriorFurniture {
  t: string
  x: number
  z: number
  /** Giro em graus (múltiplos de 90). */
  r: number
  w?: number
  d?: number
  h?: number
}

export interface InteriorFloor {
  y: number
  bounds: { minX: number; maxX: number; minZ: number; maxZ: number }
  rooms: InteriorRoom[]
  walls: InteriorWall[]
  windows: { x: number; z: number; axis: "x" | "z"; inward: number }[]
  /** Laje (andares de cima): os cômodos menos o vão da escada. */
  slabs: { x0: number; z0: number; x1: number; z1: number; mat: FloorMat }[] | null
  furniture: InteriorFurniture[]
  /** A MESMA lista que a sala da casa usa (h absoluto, para a câmera). */
  boxes: Box2Def[]
}

export interface InteriorStair {
  x0: number
  x1: number
  z0: number
  z1: number
  dir: "+z" | "-z" | "+x" | "-x"
  from: number
  to: number
}

export interface InteriorSeat {
  id: string
  floor: number
  x: number
  z: number
  facing: number
  stand: Vec2
  kind: string
}

/** Lugar de deitar numa cama (mm3d-13): o personagem fica no chão, no ponto; a pose traz a altura do colchão. */
export interface InteriorBed {
  id: string
  floor: number
  x: number
  z: number
  facing: number
  stand: Vec2
  kind: string
}

export interface InteriorDef {
  level: number
  version: string
  name: string
  floors: InteriorFloor[]
  stairs: InteriorStair[]
  bounds: { minX: number; maxX: number; minZ: number; maxZ: number }
  seats: InteriorSeat[]
  seatTop: number
  /** mm3d-13 — ausente em backend antigo. */
  beds?: InteriorBed[]
  bedTop?: number
  /** Medidas-padrão de cada tipo de móvel (largura, profundidade, altura). */
  furnitureTypes: Record<string, { w: number; d: number; h: number }>
  entry: Vec2 & { facing: number; floor: number }
  exit: Vec2 & { radius: number; floor: number }
  door: Vec2 & { w: number }
}

export interface HousePayload {
  scene: "house"
  sceneKey: string
  release: string
  environment: string
  house: {
    id: string
    number: number
    level: number
    ownerName: string
    neighborhoodName: string
    isMine: boolean
  }
  interior: InteriorDef
  me: { name: string; body: BodyId; role: "owner" | "guest" }
  motion: { walkSpeed: number; runSpeed: number }
  multiplayer: MultiplayerSession | { error: string } | null
  visits?: VisitState
  life?: LifeSummary | null
}

export type ScenePayload = (NeighborhoodPayload & { scene?: "neighborhood" }) | HousePayload

export interface VisitPublic {
  id: string
  status: "pending" | "active"
  hostName: string
  guestName: string
  house: number
  neighborhoodName: string
  expiresAt: string
  expiresIn: number
  role?: "host" | "guest"
}

export interface VisitState {
  outgoing: VisitPublic | null
  incoming: VisitPublic[]
  active: (VisitPublic & { role: "host" | "guest" }) | null
  rules: { inviteTtlMs: number; disconnectGraceMs: number }
}

/** Estado da casa de um lote: o confirmado pelo servidor × o que está na tela. */
export interface HouseVisual {
  lot: number
  confirmed: number
  shown: number
  status: "ok" | "loading" | "error"
  /** 0–1 durante o download do modelo. */
  progress?: number
}

export type NetStatus = "connecting" | "online" | "reconnecting" | "offline" | "replaced" | "moved"

/** O que o jogador pode acionar quando está perto. */
export type Interactable =
  | { kind: "house"; id: string; x: number; z: number; radius: number; lot: Lot; house: House }
  | { kind: "exit"; id: string; x: number; z: number; radius: number; label: string }
  | { kind: "door"; id: string; x: number; z: number; radius: number }
  | { kind: "seat"; id: string; x: number; z: number; radius: number; seat: InteriorSeat }
  | { kind: "bed"; id: string; x: number; z: number; radius: number; bed: InteriorBed }
  // Carro (mm3d-11): entrar no próprio carro / sair dirigindo.
  // Veículo livre para "Usar" (mm3d-14): vid = id do veículo, vkind = modalidade.
  | { kind: "car"; id: string; x: number; z: number; radius: number; lot: number; vid: number; vkind: "car" | "bike" | "skate" | "skates" }
  | { kind: "car-exit"; id: string; x: number; z: number; radius: number }

export interface GameStats {
  /** Carros desenhados no bairro (mm3d-11). */
  cars?: number
  fps: number
  frameMs: number | null
  meshes: number
  activeMeshes: number
  materials: number
  drawCalls: number | null
  webgl: number
  liveGames: number
  /** Posição do personagem (metros). */
  x: number
  z: number
  /** Avatares com esqueleto e animação próprios na cena (local + remotos). */
  avatars: number
  /** Níveis de casa com modelo na GPU agora. */
  houseModels: number[]
  /** Dirigindo (mm3d-12): telemetria do SEU carro, só no painel técnico. */
  car?: {
    kmh: number
    gear: number
    steerDeg: number
    slip: number
    betaDeg: number
    drifting: boolean
    contacts: number
    handbrake: number
    /** Distância entre a sua previsão e a posição confirmada pela sala (m). */
    serverErr: number
  } | null
}
