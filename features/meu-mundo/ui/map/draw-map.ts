// features/meu-mundo/ui/map/draw-map.ts — desenho do mapa em PERGAMINHO (mm3d-60r).
//
// O mesmo desenho serve o radar (recorte redondo em volta de mim) e o mapa
// inteiro do modal. Tinta sépia sobre papel envelhecido, como o mapa do tesouro
// que o Alex mandou de referência: prédios em marrom com contorno de tinta,
// ruas largas claras com borda escura, caminhos tracejados.

import type { CityMapModel, MapPalette, MapShape } from "../../engine/city-map"

export interface MapView {
  /** Centro da vista no mundo (m). */
  cx: number
  cz: number
  /** px por metro. */
  s: number
  w: number
  h: number
}

const C = {
  paper: "#e9d5a4",
  paperDark: "#d8bd83",
  ground: "#e3cc96",
  lawn: "#d2c084",
  plaza: "#ecdcae",
  walk: "#dcc392",
  pave: "#cfb27a",
  road: "#c39f69",
  roadEdge: "#6e4a24",
  parking: "#c8b088",
  build: "#8b5e34",
  buildEdge: "#3b230e",
  house: "#9a6a3c",
  myhouse: "#b8352a",
  ink: "#4a2f14",
} as const

function toScreen(v: MapView, x: number, z: number): [number, number] {
  return [v.w / 2 + (x - v.cx) * v.s, v.h / 2 - (z - v.cz) * v.s]
}

/** Retângulo girado no mundo (rot = rotationY do Babylon) → polígono na tela. */
function rectPath(g: CanvasRenderingContext2D, v: MapView, sh: { x: number; z: number; w: number; d: number; rot: number }) {
  const c = Math.cos(sh.rot)
  const s = Math.sin(sh.rot)
  const hw = sh.w / 2
  const hd = sh.d / 2
  g.beginPath()
  ;[
    [-hw, -hd],
    [hw, -hd],
    [hw, hd],
    [-hw, hd],
  ].forEach(([lx, lz], i) => {
    const [px, py] = toScreen(v, sh.x + lx * c + lz * s, sh.z - lx * s + lz * c)
    if (i) g.lineTo(px, py)
    else g.moveTo(px, py)
  })
  g.closePath()
}

function roundRectPath(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.max(0, Math.min(r, w / 2, h / 2))
  g.beginPath()
  g.moveTo(x + rr, y)
  g.arcTo(x + w, y, x + w, y + h, rr)
  g.arcTo(x + w, y + h, x, y + h, rr)
  g.arcTo(x, y + h, x, y, rr)
  g.arcTo(x, y, x + w, y, rr)
  g.closePath()
}

/** Papel envelhecido (manchas e fibras) — desenhado uma vez por cor e reaproveitado. */
const paperTex = new Map<string, HTMLCanvasElement>()
function paper(color: string = C.paper): HTMLCanvasElement {
  const done = paperTex.get(color)
  if (done) return done
  const t = document.createElement("canvas")
  t.width = t.height = 256
  const g = t.getContext("2d")!
  g.fillStyle = color
  g.fillRect(0, 0, 256, 256)
  let seed = 7
  const r = () => ((seed = (seed * 16807) % 2147483647) / 2147483647)
  for (let i = 0; i < 900; i++) {
    g.fillStyle = `rgba(${r() > 0.5 ? "120,80,30" : "255,245,215"},${0.02 + r() * 0.05})`
    const s = 1 + r() * 3
    g.fillRect(r() * 256, r() * 256, s, s)
  }
  for (let i = 0; i < 14; i++) {
    const x = r() * 256
    const y = r() * 256
    const gr = g.createRadialGradient(x, y, 0, x, y, 20 + r() * 40)
    gr.addColorStop(0, "rgba(150,105,45,0.10)")
    gr.addColorStop(1, "rgba(150,105,45,0)")
    g.fillStyle = gr
    g.fillRect(0, 0, 256, 256)
  }
  paperTex.set(color, t)
  return t
}

/** Polilinha do mundo → caminho na tela. */
function linePath(g: CanvasRenderingContext2D, v: MapView, pts: readonly (readonly [number, number])[], close = false) {
  g.beginPath()
  pts.forEach(([x, z], i) => {
    const [px, py] = toScreen(v, x, z)
    if (i) g.lineTo(px, py)
    else g.moveTo(px, py)
  })
  if (close) g.closePath()
}

const DOMAIN_BASE: MapPalette = {
  paper: C.paper,
  ground: C.ground,
  relief: "#8b6a3c",
  reliefEdge: "#3b230e",
  trail: "#ecdcae",
  trailEdge: C.roadEdge,
  water: "#7fa3ad",
  zone: C.plaza,
  build: C.build,
  buildEdge: C.buildEdge,
  ink: C.ink,
}

/** Domínios: pergaminho tingido pela paleta do Domínio (clareiras, mata/pedra, água, trilhas, castelo). */
function drawDominio(g: CanvasRenderingContext2D, m: CityMapModel, v: MapView) {
  const pal: MapPalette = { ...DOMAIN_BASE, ...(m.palette ?? {}) }
  g.save()
  g.fillStyle = g.createPattern(paper(pal.paper), "repeat")!
  g.fillRect(0, 0, v.w, v.h)
  const lw = Math.max(1, v.s * 0.22)
  const order: MapShape["kind"][] = ["ground", "zone", "relief", "water", "trail", "castle", "patio"]
  g.lineJoin = "round"
  g.lineCap = "round"
  for (const kind of order) {
    if (kind === "relief") {
      // mata/pedra: um caminho só (centenas de caixas). Caixa pequena = copa redonda. Contorno
      // primeiro e o preenchimento por cima: só a borda de fora fica (sem a grade de caixa em caixa).
      g.beginPath()
      for (const sh of m.shapes) {
        if (sh.kind !== "relief") continue
        if (Math.max(sh.w, sh.d) < 6) {
          const [px, py] = toScreen(v, sh.x, sh.z)
          const r = ((sh.w + sh.d) / 4) * 1.15 * v.s
          g.moveTo(px + r, py)
          g.arc(px, py, r, 0, Math.PI * 2)
        } else rectSub(g, v, sh)
      }
      g.strokeStyle = pal.reliefEdge
      g.lineWidth = Math.max(1.2, lw * 1.4)
      g.stroke()
      g.fillStyle = pal.relief
      g.fill()
      continue
    }
    for (const sh of m.shapes) {
      if (sh.kind !== kind) continue
      if (sh.kind === "zone") {
        linePath(g, v, sh.pts, true)
        g.fillStyle = pal.zone
        g.fill()
        g.setLineDash([v.s * 1.6, v.s * 1.2])
        g.strokeStyle = sh.boss ? "#9a2a1e" : pal.ink
        g.globalAlpha = sh.boss ? 0.85 : 0.5
        g.lineWidth = Math.max(1, lw * (sh.boss ? 1.2 : 0.8))
        g.stroke()
        g.setLineDash([])
        g.globalAlpha = 1
      } else if (sh.kind === "water") {
        linePath(g, v, sh.pts)
        g.strokeStyle = pal.water
        g.lineWidth = sh.width * v.s
        g.stroke()
      } else if (sh.kind === "trail") {
        linePath(g, v, sh.pts)
        g.strokeStyle = pal.trailEdge
        g.lineWidth = sh.width * v.s + lw * 2
        g.stroke()
        g.strokeStyle = pal.trail
        g.lineWidth = sh.width * v.s
        g.stroke()
        // passos tracejados (mapa do tesouro)
        g.setLineDash([v.s * 1.4, v.s * 1.8])
        g.strokeStyle = pal.trailEdge
        g.globalAlpha = 0.55
        g.lineWidth = Math.max(0.8, v.s * 0.22)
        g.stroke()
        g.setLineDash([])
        g.globalAlpha = 1
      } else if (sh.kind === "ground") {
        rectPath(g, v, sh)
        g.fillStyle = pal.ground
        g.fill()
        g.strokeStyle = pal.ink
        g.lineWidth = lw * 1.4
        g.stroke()
      } else if (sh.kind === "castle") {
        rectPath(g, v, sh)
        g.fillStyle = pal.build
        g.fill()
        g.strokeStyle = pal.buildEdge
        g.lineWidth = lw * 1.6
        g.stroke()
      } else if (sh.kind === "patio") {
        rectPath(g, v, sh)
        g.fillStyle = pal.zone
        g.fill()
        g.strokeStyle = pal.buildEdge
        g.lineWidth = lw
        g.stroke()
      }
    }
  }
  g.restore()
}

/** Retângulo girado como subcaminho (sem beginPath: vários num caminho só). */
function rectSub(g: CanvasRenderingContext2D, v: MapView, sh: { x: number; z: number; w: number; d: number; rot: number }) {
  const c = Math.cos(sh.rot)
  const s = Math.sin(sh.rot)
  const hw = sh.w / 2
  const hd = sh.d / 2
  ;[
    [-hw, -hd],
    [hw, -hd],
    [hw, hd],
    [-hw, hd],
  ].forEach(([lx, lz], i) => {
    const [px, py] = toScreen(v, sh.x + lx * c + lz * s, sh.z - lx * s + lz * c)
    if (i) g.lineTo(px, py)
    else g.moveTo(px, py)
  })
  g.closePath()
}

const FILL: Partial<Record<MapShape["kind"], string>> = {
  ground: C.ground,
  lawn: C.lawn,
  plaza: C.plaza,
  walk: C.walk,
  pave: C.pave,
  road: C.road,
  parking: C.parking,
  build: C.build,
  house: C.house,
  myhouse: C.myhouse,
}

/** Desenha o mapa inteiro na vista. */
export function drawMap(g: CanvasRenderingContext2D, m: CityMapModel, v: MapView) {
  if (m.kind === "dominio") return drawDominio(g, m, v)
  g.save()
  g.fillStyle = g.createPattern(paper(), "repeat")!
  g.fillRect(0, 0, v.w, v.h)
  // ordem: chão → gramado/praça → calçada → ruas → prédios
  const order: MapShape["kind"][] = ["ground", "lawn", "walk", "plaza", "parking", "pave", "road", "ring", "house", "myhouse", "build"]
  const lw = Math.max(1, v.s * 0.22)
  for (const kind of order)
    for (const sh of m.shapes) {
      if (sh.kind !== kind) continue
      if (sh.kind === "ring") {
        const [x, y] = toScreen(v, -sh.half, sh.half)
        const size = 2 * sh.half * v.s
        roundRectPath(g, x, y, size, size, sh.square ? 0 : sh.cornerR * v.s)
        g.lineJoin = "round"
        g.strokeStyle = C.roadEdge
        g.lineWidth = sh.width * v.s + lw * 2
        g.stroke()
        g.strokeStyle = C.road
        g.lineWidth = sh.width * v.s
        g.stroke()
        // faixa central tracejada
        g.setLineDash([v.s * 2, v.s * 2])
        g.strokeStyle = "rgba(255,240,205,0.7)"
        g.lineWidth = Math.max(1, v.s * 0.18)
        g.stroke()
        g.setLineDash([])
        continue
      }
      if (!("x" in sh)) continue
      rectPath(g, v, sh)
      g.fillStyle = FILL[sh.kind] ?? C.ground
      g.fill()
      if (sh.kind === "build" || sh.kind === "house" || sh.kind === "myhouse") {
        g.strokeStyle = C.buildEdge
        g.lineWidth = lw * 1.4
        g.stroke()
        // sombra dura de tinta (dá volume ao prédio)
        g.save()
        g.clip()
        g.fillStyle = "rgba(255,230,180,0.18)"
        g.fillRect(0, 0, v.w, v.h)
        g.restore()
      } else if (sh.kind === "road") {
        g.strokeStyle = C.roadEdge
        g.lineWidth = lw
        g.stroke()
      } else if (sh.kind === "walk" || sh.kind === "pave") {
        g.strokeStyle = "rgba(110,74,36,0.35)"
        g.lineWidth = Math.max(0.6, lw * 0.6)
        g.stroke()
      }
    }
  g.restore()
}

/** Vinheta queimada nas bordas (modal) — só a moldura do papel. */
export function burnEdges(g: CanvasRenderingContext2D, w: number, h: number) {
  const gr = g.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.32, w / 2, h / 2, Math.max(w, h) * 0.72)
  gr.addColorStop(0, "rgba(90,50,15,0)")
  gr.addColorStop(0.75, "rgba(90,50,15,0.28)")
  gr.addColorStop(1, "rgba(50,25,5,0.75)")
  g.fillStyle = gr
  g.fillRect(0, 0, w, h)
}

/** Rosa dos ventos de tinta (canto do modal). */
export function compass(g: CanvasRenderingContext2D, x: number, y: number, r: number) {
  g.save()
  g.translate(x, y)
  g.strokeStyle = C.ink
  g.fillStyle = C.ink
  g.lineWidth = Math.max(1, r * 0.05)
  g.beginPath()
  g.arc(0, 0, r * 0.62, 0, Math.PI * 2)
  g.stroke()
  for (let i = 0; i < 4; i++) {
    g.save()
    g.rotate((i * Math.PI) / 2)
    g.beginPath()
    g.moveTo(0, -r)
    g.lineTo(r * 0.16, 0)
    g.lineTo(-r * 0.16, 0)
    g.closePath()
    if (i === 0) g.fill()
    else g.stroke()
    g.restore()
  }
  g.font = `700 ${Math.round(r * 0.42)}px Georgia, serif`
  g.textAlign = "center"
  g.textBaseline = "bottom"
  g.fillText("N", 0, -r - 2)
  g.restore()
}

export { toScreen }
