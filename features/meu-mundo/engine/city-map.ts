// features/meu-mundo/engine/city-map.ts — o MAPA da cena aberta (mm3d-60r).
//
// Pedido do Alex: um radar no canto de cima à direita e, ao tocar nele, o mapa
// da cidade inteira (pergaminho) com "você está aqui". A cena (rua do bairro
// ou centro, game.ts) monta o MODELO do mapa uma vez a partir do payload que
// ela já tem — nada novo do servidor — e registra quem diz onde estou. A
// interface (ui/map/) só lê: consulta a posição ~8×/s enquanto o radar está
// na tela; nada roda por quadro. Coordenadas do mundo (m): +x leste, +z norte.

import type { CenterLayout, CenterPlace, NeighborhoodPayload } from "../types"

export type MapShape =
  | { kind: "ground" | "lawn" | "plaza" | "walk" | "pave" | "road" | "parking" | "build" | "house" | "myhouse"; x: number; z: number; w: number; d: number; rot: number; r?: number }
  /** Anel viário: retângulo de cantos redondos com `half` (eixo), `cornerR` e largura. */
  | { kind: "ring"; half: number; cornerR: number; width: number; square?: boolean }
  /** Domínios: o que não se anda (pedra, mata, muro — as caixas de colisão da cena). */
  | { kind: "relief" | "castle" | "patio"; x: number; z: number; w: number; d: number; rot: number }
  /** Domínios: trilha (polilinha com largura), água em fita (rio, lago, lava) e clareira de setor (polígono). */
  | { kind: "trail" | "water"; pts: readonly (readonly [number, number])[]; width: number }
  | { kind: "zone"; pts: readonly (readonly [number, number])[]; boss?: boolean }

export interface MapPin {
  id: string
  /** Ícone (ui/map/city-map-ui.tsx) e o nome já traduzido pela cena (ou chave). */
  icon: string
  label: string
  x: number
  z: number
  /** Cor do selo: chefe, deus, selado, vencido, saída (padrão = tinta). */
  tone?: "boss" | "god" | "sealed" | "done" | "exit"
}

/** Cores do pergaminho (Domínios: uma paleta por Domínio, `DOMAIN_MAP_PALETTE`). */
export interface MapPalette {
  paper: string
  ground: string
  relief: string
  reliefEdge: string
  trail: string
  trailEdge: string
  water: string
  zone: string
  build: string
  buildEdge: string
  ink: string
}

export interface CityMapModel {
  kind: "centro" | "bairro" | "dominio"
  /** Caixa do mundo que o mapa cobre (m). */
  bounds: { x0: number; x1: number; z0: number; z1: number }
  shapes: MapShape[]
  pins: MapPin[]
  /** Título já traduzido (Domínios: o nome do Domínio); sem ele, o da cidade. */
  title?: string
  /** Domínios: a cena atual entre as 3 (o mapa mostra esta e indica as outras). */
  part?: { n: number; total: number; label: (n: number) => string }
  palette?: Partial<MapPalette>
}

/** Marca que se mexe (o deus solto da N4): lida junto com a posição, ~8×/s. */
export interface MapMark {
  id: string
  icon: string
  label: string
  x: number
  z: number
}

export interface MapPos {
  x: number
  z: number
  /** Rumo (rad), 0 = norte (+z), mesma convenção do jogo. */
  facing: number
  marks?: MapMark[]
}

type Listener = (m: CityMapModel | null) => void
// pilha: o Domínio (por cima do centro) registra o dele; ao sair, volta o de baixo
const stack: { m: CityMapModel; where: () => MapPos | null }[] = []
const listeners = new Set<Listener>()
const top = () => stack[stack.length - 1] ?? null

/** A cena registra o mapa e quem diz onde estou; devolve quem desfaz (no dispose). */
export function setCityMap(m: CityMapModel, where: () => MapPos | null): () => void {
  const entry = { m, where }
  stack.push(entry)
  for (const l of listeners) l(m)
  return () => {
    const i = stack.indexOf(entry)
    if (i < 0) return
    const wasTop = i === stack.length - 1
    stack.splice(i, 1)
    if (wasTop) for (const l of listeners) l(top()?.m ?? null)
  }
}

export function onCityMap(l: Listener): () => void {
  listeners.add(l)
  l(top()?.m ?? null)
  return () => listeners.delete(l)
}

export function mapPos(): MapPos | null {
  try {
    return top()?.where() ?? null
  } catch {
    return null
  }
}

// ── Domínios (mundo aberto, cenário em código) ──────────────────────────────
type XZ = readonly [number, number]

/** Pergaminho tingido pelo Domínio: o papel continua papel, a tinta e o chão mudam. */
export const DOMAIN_MAP_PALETTE: Record<string, Partial<MapPalette>> = {
  // Floresta da Lua: papel esverdeado, mata escura, trilha de terra clara
  floresta: { paper: "#e2dcae", ground: "#cfd09a", relief: "#5d7444", reliefEdge: "#2c3a1c", trail: "#ead9a6", trailEdge: "#6b5428", water: "#7fa8b4", zone: "#e6e1b8", build: "#5b4a6e", buildEdge: "#241a33", ink: "#2f3a1e" },
  // Cânion: areia quente, paredões de pedra vermelha
  canion: { paper: "#ecd3a2", ground: "#e6bf88", relief: "#a5582e", reliefEdge: "#5a2a10", trail: "#f3dfb4", trailEdge: "#7a4a22", water: "#6fa3b0", zone: "#f1d6a6", build: "#7c3c1c", buildEdge: "#3b1806", ink: "#5a2a10" },
  // Mar de Gelo: papel frio, gelo e água azul
  gelo: { paper: "#e3e6df", ground: "#d6e0e2", relief: "#7f9db1", reliefEdge: "#33475a", trail: "#f6f6f1", trailEdge: "#5b7287", water: "#86b3c8", zone: "#eef2f0", build: "#4d6a86", buildEdge: "#1c2c3d", ink: "#24384c" },
  // Fábrica: papel cinza-ocre, ferro e fuligem
  fabrica: { paper: "#e2d8bf", ground: "#d2c6a8", relief: "#6f6558", reliefEdge: "#2e2822", trail: "#e9dfc3", trailEdge: "#5e4e38", water: "#7e9488", zone: "#e8dec4", build: "#5a4a3a", buildEdge: "#211912", ink: "#3a2e22" },
  // Forja de Kragor (vulcão): papel tostado, rocha escura e lava
  vulcao: { paper: "#e6cfa8", ground: "#cfa686", relief: "#5c3628", reliefEdge: "#24120a", trail: "#ecd2a6", trailEdge: "#6a3a1e", water: "#d9592a", zone: "#e8c9a0", build: "#4a2418", buildEdge: "#1c0a05", ink: "#3d1a0c" },
  // Orbital: papel lilás pálido, metal e vidro
  orbital: { paper: "#e2dce6", ground: "#d0c9da", relief: "#5e577a", reliefEdge: "#241f38", trail: "#eee8f3", trailEdge: "#57507a", water: "#8fb4d6", zone: "#e9e3f0", build: "#4a4268", buildEdge: "#1a1530", ink: "#2a2445" },
}

export interface DominioMapInput {
  domain: string
  bounds: { x0: number; x1: number; z0: number; z1: number }
  /** Caminhos de andar: o primeiro é o principal (`planta`), os outros os desvios. */
  walk: readonly (readonly XZ[])[]
  blockers: readonly { x: number; z: number; hx: number; hz: number; rot: number }[]
  aguas: readonly { pts: readonly XZ[]; width: number }[]
  zonas: readonly { setor: number; poly: readonly XZ[] }[]
  castelo: { x: number; z: number; w: number; d: number; patio: { x0: number; z0: number; x1: number; z1: number } } | null
  pontos: Record<string, { x: number; z: number; ang: number }>
  scene: { n: number; total: number; boss: number; god: number | null; passage: { open: boolean } | null }
  /** Setor: aberto (dá luta), selado (o anterior ainda de pé) ou vencido. */
  sectorState: (s: number) => "open" | "sealed" | "done"
  places: readonly { id: string; x: number; z: number }[]
}

export interface DominioMapLabels {
  title: string
  exit: string
  passage: string
  part: (n: number) => string
  sector: (n: number) => string
  boss: (n: number) => string
  guard: (n: number) => string
  god: string
  place: (id: string) => string
}

const centroidOf = (poly: readonly XZ[]) => {
  let x = 0, z = 0
  for (const p of poly) {
    x += p[0]
    z += p[1]
  }
  return { x: x / Math.max(1, poly.length), z: z / Math.max(1, poly.length) }
}

/** Mapa da cena do Domínio (uma das 3): chão, mata/pedra, trilhas, clareiras, castelo, chefes e passagens. */
export function dominioMapModel(c: DominioMapInput, L: DominioMapLabels): CityMapModel {
  const { x0, x1, z0, z1 } = c.bounds
  const shapes: MapShape[] = [{ kind: "ground", x: (x0 + x1) / 2, z: (z0 + z1) / 2, w: x1 - x0, d: z1 - z0, rot: 0 }]
  const sc = c.scene
  const bossSet = new Set([sc.boss, ...(sc.god ? [sc.god] : [])])
  for (const q of c.zonas) shapes.push({ kind: "zone", pts: q.poly, boss: bossSet.has(q.setor) })
  for (const b of c.blockers) shapes.push({ kind: "relief", x: b.x, z: b.z, w: 2 * b.hx, d: 2 * b.hz, rot: b.rot })
  for (const a of c.aguas) shapes.push({ kind: "water", pts: a.pts, width: a.width })
  c.walk.forEach((w, i) => shapes.push({ kind: "trail", pts: w, width: i === 0 ? 4.4 : 3.2 }))
  if (c.castelo) {
    const k = c.castelo
    shapes.push({ kind: "castle", x: k.x, z: k.z, w: k.w, d: k.d, rot: 0 })
    shapes.push({ kind: "patio", x: (k.patio.x0 + k.patio.x1) / 2, z: (k.patio.z0 + k.patio.z1) / 2, w: k.patio.x1 - k.patio.x0, d: k.patio.z1 - k.patio.z0, rot: 0 })
  }
  const P = c.pontos
  const tone = (s: number, boss = false): MapPin["tone"] => {
    const st = c.sectorState(s)
    return st === "sealed" ? "sealed" : st === "done" ? "done" : boss ? "boss" : undefined
  }
  const pins: MapPin[] = []
  // setores comuns: o selo no meio da clareira
  for (const q of c.zonas) {
    if (bossSet.has(q.setor)) continue
    const m = centroidOf(q.poly)
    pins.push({ id: `sector-${q.setor}`, icon: "swords", label: L.sector(q.setor), x: m.x, z: m.z, tone: tone(q.setor) })
  }
  // chefe (cenas 1–2) ou guardião + deus (cena 3, no castelo)
  const chefe = P.chefe ?? P.guardiao
  if (chefe) pins.push({ id: "boss", icon: "skull", label: sc.god ? L.guard(sc.boss) : L.boss(sc.boss), x: chefe.x, z: chefe.z, tone: tone(sc.boss, true) })
  if (sc.god && P.deus) {
    const st = c.sectorState(sc.god)
    pins.push({ id: "god", icon: "crown", label: L.god, x: P.deus.x, z: P.deus.z, tone: st === "sealed" ? "sealed" : st === "done" ? "done" : "god" })
  }
  for (const p of c.places) pins.push({ id: `place-${p.id}`, icon: "statue", label: L.place(p.id), x: p.x, z: p.z })
  // as pontas: de onde se chega e para onde se segue (indica as outras cenas)
  if (P.entrada) pins.push(sc.n > 1 ? { id: "prev", icon: "steps", label: L.part(sc.n - 1), x: P.entrada.x, z: P.entrada.z } : { id: "exit", icon: "portal", label: L.exit, x: P.entrada.x, z: P.entrada.z, tone: "exit" })
  if (P.saida) {
    if (sc.passage) pins.push({ id: "next", icon: "steps", label: L.part(sc.n + 1), x: P.saida.x, z: P.saida.z, tone: sc.passage.open ? undefined : "sealed" })
    else if (sc.n >= sc.total) {
      // a travessia sai pelo fundo do castelo: o selo vai na muralha de trás (no pátio, tapava o do deus)
      const k = c.castelo
      const at = k ? { x: k.x, z: Math.max(P.saida.z, k.z + k.d / 2 - 2) } : P.saida
      pins.push({ id: "cross", icon: "steps", label: L.passage, x: at.x, z: at.z, tone: c.sectorState(sc.god ?? sc.boss) === "done" ? undefined : "sealed" })
    }
  }
  return {
    kind: "dominio",
    bounds: c.bounds,
    shapes,
    pins,
    title: L.title,
    part: { n: sc.n, total: sc.total, label: L.part },
    palette: DOMAIN_MAP_PALETTE[c.domain],
  }
}

// ── ícone de cada prédio do centro ──────────────────────────────────────────
const PLACE_ICON: Record<string, string> = {
  pizzaria: "pizza",
  hamburgueria: "burger",
  supermercado: "cart",
  universidade: "grad",
  biblioteca: "book",
  escola: "school",
  academia: "gym",
  forja: "hammer",
  arsenal: "shield",
  criolab: "snow",
  jetpack: "rocket",
  paint: "paint",
  corrida: "car",
  noturno: "moon",
  boxe: "fist",
  gincana: "flag",
  laminas: "swords",
  hall: "trophy",
  igreja: "church",
  delegacia: "siren",
  hospital: "hospital",
}

/** Mapa do centro (mm3d-17/60q) a partir do payload. `label` traduz o id do prédio. */
export function centerMapModel(c: CenterLayout, label: (p: CenterPlace) => string, portalLabel: string): CityMapModel {
  const d = c.dims
  const L = c.limit ?? 66
  const shapes: MapShape[] = [{ kind: "ground", x: 0, z: 0, w: 2 * L, d: 2 * L, rot: 0 }]
  // praça e anel
  shapes.push({ kind: "plaza", x: 0, z: 0, w: 2 * d.plaza, d: 2 * d.plaza, rot: 0 })
  shapes.push({ kind: "ring", half: d.ring, cornerR: d.cornerR, width: 2 * d.roadHalf })
  // avenida oeste até o portal
  const x0 = -d.ringOut
  const x1 = (c.portal?.x ?? -60) - 3
  shapes.push({ kind: "road", x: (x0 + x1) / 2, z: 0, w: Math.abs(x0 - x1), d: 2 * d.roadHalf, rot: 0 })
  for (const p of c.parking ?? []) {
    const [a, b, z0, z1] = p.rect
    shapes.push({ kind: "parking", x: (a + b) / 2, z: (z0 + z1) / 2, w: b - a, d: z1 - z0, rot: 0 })
  }
  for (const g of c.grounds ?? []) {
    if (g.kind === "mark") continue
    shapes.push({ kind: g.kind === "asphalt" ? "road" : g.kind === "pave" ? "pave" : "walk", x: g.x, z: g.z, w: g.w, d: g.d, rot: g.rot })
  }
  const pins: MapPin[] = []
  for (const p of c.places) {
    if (p.front === "rot") shapes.push({ kind: "build", x: p.center.x, z: p.center.z, w: p.model.width, d: p.model.depth, rot: p.rotationY })
    else {
      const { x0: a, x1: b, z0, z1 } = p.rect
      shapes.push({ kind: "build", x: (a + b) / 2, z: (z0 + z1) / 2, w: b - a, d: z1 - z0, rot: 0 })
    }
    pins.push({ id: p.id, icon: PLACE_ICON[p.id] ?? "pin", label: label(p), x: p.center.x, z: p.center.z })
  }
  if (c.portal) pins.push({ id: "portal", icon: "portal", label: portalLabel, x: c.portal.x, z: c.portal.z })
  return { kind: "centro", bounds: { x0: -L, x1: L, z0: -L, z1: L }, shapes, pins }
}

/** Mapa do bairro (anel de lotes, praça do Aurion, saída) a partir do payload. */
export function bairroMapModel(p: NeighborhoodPayload, labels: { home: string; plaza: string; exit: string }): CityMapModel {
  const nb = p.neighborhood
  const d = nb.dims
  const R = d?.ring ?? 30
  const RH = d?.roadHalf ?? 3
  const SW = d?.sidewalk ?? 2
  const hedge = d?.hedge ?? R + 18
  const L = Math.max(nb.limit ?? hedge + 4, hedge + 4)
  const shapes: MapShape[] = [{ kind: "ground", x: 0, z: 0, w: 2 * L, d: 2 * L, rot: 0 }]
  shapes.push({ kind: "lawn", x: 0, z: 0, w: 2 * hedge, d: 2 * hedge, rot: 0 })
  // calçadas e o anel quadrado
  shapes.push({ kind: "walk", x: 0, z: 0, w: 2 * (R + RH + SW), d: 2 * (R + RH + SW), rot: 0 })
  shapes.push({ kind: "ring", half: R, cornerR: 0, width: 2 * RH, square: true })
  shapes.push({ kind: "lawn", x: 0, z: 0, w: 2 * (R - RH - SW), d: 2 * (R - RH - SW), rot: 0 })
  shapes.push({ kind: "plaza", x: 0, z: 0, w: 14, d: 14, rot: 0, r: 7 })
  // rua de saída até o portão
  if (d) {
    const a = R + RH
    const b = d.exitEnd
    shapes.push({ kind: "road", x: (a + b) / 2, z: d.exitZ, w: Math.max(0, b - a), d: 2 * RH, rot: 0 })
  }
  // lotes: a casa é um bloco dentro do lote (frente para a rua)
  for (const lot of nb.lots) {
    const mine = lot.number === p.me.house
    shapes.push({ kind: "walk", x: lot.position.x, z: lot.position.z, w: lot.width, d: lot.depth, rot: lot.rotationY })
    const back = lot.depth * 0.12
    const hx = lot.position.x + Math.sin(lot.rotationY) * back
    const hz = lot.position.z + Math.cos(lot.rotationY) * back
    shapes.push({ kind: mine ? "myhouse" : "house", x: hx, z: hz, w: Math.min(5.4, lot.width * 0.7), d: Math.min(4.8, lot.depth * 0.45), rot: lot.rotationY })
  }
  const pins: MapPin[] = [{ id: "plaza", icon: "statue", label: labels.plaza, x: 0, z: 0 }]
  const home = nb.lots.find((l) => l.number === p.me.house)
  if (home) pins.push({ id: "home", icon: "home", label: labels.home, x: home.position.x, z: home.position.z })
  if (nb.exit) pins.push({ id: "exit", icon: "portal", label: labels.exit, x: nb.exit.x, z: nb.exit.z })
  return { kind: "bairro", bounds: { x0: -L, x1: L, z0: -L, z1: L }, shapes, pins }
}
