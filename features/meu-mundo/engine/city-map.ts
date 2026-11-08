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

export interface MapPin {
  id: string
  /** Ícone (ui/map/icons.ts) e o nome já traduzido pela cena (ou chave). */
  icon: string
  label: string
  x: number
  z: number
}

export interface CityMapModel {
  kind: "centro" | "bairro"
  /** Caixa do mundo que o mapa cobre (m). */
  bounds: { x0: number; x1: number; z0: number; z1: number }
  shapes: MapShape[]
  pins: MapPin[]
}

export interface MapPos {
  x: number
  z: number
  /** Rumo (rad), 0 = norte (+z), mesma convenção do jogo. */
  facing: number
}

type Listener = (m: CityMapModel | null) => void
let model: CityMapModel | null = null
let pos: (() => MapPos | null) | null = null
const listeners = new Set<Listener>()

/** A cena registra o mapa e quem diz onde estou; devolve quem desfaz (no dispose). */
export function setCityMap(m: CityMapModel, where: () => MapPos | null): () => void {
  model = m
  pos = where
  for (const l of listeners) l(m)
  return () => {
    if (model !== m) return
    model = null
    pos = null
    for (const l of listeners) l(null)
  }
}

export function onCityMap(l: Listener): () => void {
  listeners.add(l)
  l(model)
  return () => listeners.delete(l)
}

export function mapPos(): MapPos | null {
  try {
    return pos?.() ?? null
  } catch {
    return null
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
