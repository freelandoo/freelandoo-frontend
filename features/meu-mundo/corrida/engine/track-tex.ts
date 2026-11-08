// features/meu-mundo/corrida/engine/track-tex.ts — CORRIDA (mm3d-73): as texturas da pista nova.
//
// Pedido do Alex (prompt da reformulação visual): pista metálica industrial,
// placas com parafusos e emendas, faixas laterais de bronze, barreiras grandes
// com faixa amarela e preta, painéis ciano. Tudo desenhado no canvas uma vez
// (sem arquivo para baixar), com mipmaps e filtro anisotrópico (a pista é
// vista rasante). O relevo leve (mapa de normais) sai da mesma altura que
// desenha as emendas, só fora do celular.
//
// Convenção das texturas de pista: u = de um lado ao outro (0 → 1), v = ao
// longo da pista (repete). Na barreira: u = ao longo, v = de baixo para cima.

import type { Scene } from "@babylonjs/core/scene"
import { DynamicTexture } from "@babylonjs/core/Materials/Textures/dynamicTexture"
import { Texture } from "@babylonjs/core/Materials/Textures/texture"

/** Metros de pista por repetição da textura do piso e das faixas de bronze. */
export const DECK_REPEAT = 12
export const SIDE_REPEAT = 6
/** Metros de barreira por repetição (ao longo). */
export const WALL_REPEAT = 8

export interface TrackTextures {
  deck: DynamicTexture
  deckN: DynamicTexture | null
  side: DynamicTexture
  sideN: DynamicTexture | null
  wall: DynamicTexture
  wallN: DynamicTexture | null
  under: DynamicTexture
  ramp: DynamicTexture
  pad: DynamicTexture
  rail: DynamicTexture
  inset: DynamicTexture
  holo: DynamicTexture
  dispose(): void
}

type G = CanvasRenderingContext2D

/** Gerador de números fixo (a textura sai igual sempre). */
function rng(seed: number) {
  let s = seed
  return () => (s = (s * 16807) % 2147483647) / 2147483647
}

function make(scene: Scene, name: string, w: number, h: number, wrapU = true): { tex: DynamicTexture; g: G } {
  const tex = new DynamicTexture(name, { width: w, height: h }, scene, true, Texture.TRILINEAR_SAMPLINGMODE)
  tex.wrapU = wrapU ? Texture.WRAP_ADDRESSMODE : Texture.CLAMP_ADDRESSMODE
  tex.wrapV = Texture.WRAP_ADDRESSMODE
  tex.anisotropicFilteringLevel = 8
  return { tex, g: tex.getContext() as G }
}

/** Ruído de desgaste: manchas e riscos finos por cima do que já foi pintado. */
function wear(g: G, w: number, h: number, r: () => number, amount: number) {
  for (let k = 0; k < amount; k++) {
    const x = r() * w
    const y = r() * h
    const s = 2 + r() * 14
    g.fillStyle = r() < 0.5 ? `rgba(0,0,0,${0.04 + r() * 0.08})` : `rgba(255,255,255,${0.02 + r() * 0.05})`
    g.fillRect(x, y, s, s * (0.3 + r()))
  }
  g.lineWidth = 1
  for (let k = 0; k < amount / 3; k++) {
    const x = r() * w
    const y = r() * h
    g.strokeStyle = `rgba(255,255,255,${0.03 + r() * 0.05})`
    g.beginPath()
    g.moveTo(x, y)
    g.lineTo(x + (r() - 0.5) * 4, y + 6 + r() * 30)
    g.stroke()
  }
}

function bolt(g: G, x: number, y: number, r: number) {
  g.fillStyle = "rgba(0,0,0,0.55)"
  g.beginPath()
  g.arc(x + r * 0.25, y + r * 0.25, r, 0, Math.PI * 2)
  g.fill()
  g.fillStyle = "#9ea4ab"
  g.beginPath()
  g.arc(x, y, r, 0, Math.PI * 2)
  g.fill()
  g.fillStyle = "rgba(255,255,255,0.35)"
  g.beginPath()
  g.arc(x - r * 0.3, y - r * 0.3, r * 0.4, 0, Math.PI * 2)
  g.fill()
}

/** Normais a partir da luminância de um canvas de altura (diferenças centradas). */
function normalsFrom(scene: Scene, name: string, src: G, w: number, h: number, strength: number): DynamicTexture {
  const { tex, g } = make(scene, name, w, h)
  const hd = src.getImageData(0, 0, w, h).data
  const out = g.createImageData(w, h)
  const H = (x: number, y: number) => {
    const i = (((y + h) % h) * w + ((x + w) % w)) * 4
    return (hd[i] + hd[i + 1] + hd[i + 2]) / 765
  }
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const dx = (H(x + 1, y) - H(x - 1, y)) * strength
      const dy = (H(x, y + 1) - H(x, y - 1)) * strength
      const l = Math.hypot(dx, dy, 1)
      const i = (y * w + x) * 4
      out.data[i] = ((-dx / l) * 0.5 + 0.5) * 255
      out.data[i + 1] = ((dy / l) * 0.5 + 0.5) * 255
      out.data[i + 2] = ((1 / l) * 0.5 + 0.5) * 255
      out.data[i + 3] = 255
    }
  g.putImageData(out, 0, 0)
  tex.update(true)
  return tex
}

/** Canvas solto (para a altura do relevo). */
function scratch(w: number, h: number): G {
  const c = document.createElement("canvas")
  c.width = w
  c.height = h
  return c.getContext("2d", { willReadFrequently: true }) as G
}

// ── piso principal: chapas de aço grafite, 3 faixas ───────────────────────
function drawDeck(g: G, S: number, r: () => number, height: boolean) {
  const W = S
  const H = S
  g.fillStyle = height ? "#808080" : "#3b3f45"
  g.fillRect(0, 0, W, H)
  // chapas: 3 colunas (as faixas) × 2 por repetição; cada uma com tom próprio
  const cols = 3
  const rows = 2
  for (let cx = 0; cx < cols; cx++)
    for (let ry = 0; ry < rows; ry++) {
      const x0 = (cx * W) / cols
      const y0 = (ry * H) / rows
      const pw = W / cols
      const ph = H / rows
      if (!height) {
        const k = 52 + Math.floor(r() * 14)
        g.fillStyle = `rgb(${k},${k + 3},${k + 8})`
        g.fillRect(x0 + 2, y0 + 2, pw - 4, ph - 4)
        // aço escovado: riscos ao longo da pista
        for (let k2 = 0; k2 < 60; k2++) {
          const x = x0 + 3 + r() * (pw - 6)
          g.strokeStyle = `rgba(255,255,255,${0.015 + r() * 0.03})`
          g.lineWidth = 1
          g.beginPath()
          g.moveTo(x, y0 + 3)
          g.lineTo(x, y0 + ph - 3)
          g.stroke()
        }
        // painel de manutenção (tampa menor rebaixada) em algumas chapas
        if (r() < 0.55) {
          const mw = pw * (0.22 + r() * 0.18)
          const mh = ph * (0.12 + r() * 0.12)
          const mx = x0 + pw * 0.15 + r() * (pw * 0.7 - mw)
          const my = y0 + ph * 0.2 + r() * (ph * 0.6 - mh)
          g.fillStyle = "rgba(0,0,0,0.28)"
          g.fillRect(mx, my, mw, mh)
          g.strokeStyle = "rgba(255,255,255,0.12)"
          g.strokeRect(mx + 1.5, my + 1.5, mw - 3, mh - 3)
          for (const [bx, by] of [[mx + 4, my + 4], [mx + mw - 4, my + 4], [mx + 4, my + mh - 4], [mx + mw - 4, my + mh - 4]]) bolt(g, bx, by, S / 300)
        }
        // grade de piso antiderrapante em losangos (bem leve)
        g.strokeStyle = "rgba(255,255,255,0.025)"
        for (let d = -ph; d < pw; d += S / 40) {
          g.beginPath()
          g.moveTo(x0 + d, y0)
          g.lineTo(x0 + d + ph, y0 + ph)
          g.stroke()
        }
      } else {
        g.fillStyle = "#8a8a8a"
        g.fillRect(x0 + 2, y0 + 2, pw - 4, ph - 4)
      }
      // emendas (rebaixo escuro) e parafusos nas quinas
      g.fillStyle = height ? "#202020" : "#16181b"
      g.fillRect(x0, y0, pw, 2)
      g.fillRect(x0, y0, 2, ph)
      if (!height) {
        g.fillStyle = "rgba(255,255,255,0.08)"
        g.fillRect(x0 + 2, y0 + 2, pw - 4, 1)
      }
      const br = S / 220
      for (let k = 0; k < 4; k++) {
        const bx = x0 + 8 + (k % 2) * (pw - 16)
        const by = y0 + 8 + Math.floor(k / 2) * (ph - 16)
        if (height) {
          g.fillStyle = "#c0c0c0"
          g.beginPath()
          g.arc(bx, by, br, 0, Math.PI * 2)
          g.fill()
        } else bolt(g, bx, by, br)
      }
    }
  if (height) return
  // linhas de orientação: as divisas das faixas (pintadas, tracejadas) e a
  // seta do meio a cada repetição
  for (const fx of [1 / 3, 2 / 3]) {
    const x = fx * W
    for (let y = 0; y < H; y += H / 4) {
      g.fillStyle = "#d8dde2"
      g.fillRect(x - S / 160, y + H / 32, S / 80, H / 6)
    }
  }
  g.fillStyle = "rgba(220,225,230,0.16)"
  const ax = W / 2
  const ay = H * 0.72
  const as = S * 0.07
  g.beginPath()
  g.moveTo(ax - as, ay)
  g.lineTo(ax, ay - as * 0.9)
  g.lineTo(ax + as, ay)
  g.lineTo(ax + as, ay + as * 0.35)
  g.lineTo(ax, ay - as * 0.55)
  g.lineTo(ax - as, ay + as * 0.35)
  g.closePath()
  g.fill()
  wear(g, W, H, r, 220)
}

// ── faixas laterais: chapa de bronze envelhecido com hachura ─────────────
function drawSide(g: G, w: number, h: number, r: () => number, height: boolean) {
  g.fillStyle = height ? "#808080" : "#5a4630"
  g.fillRect(0, 0, w, h)
  const plates = 3
  for (let k = 0; k < plates; k++) {
    const y0 = (k * h) / plates
    const ph = h / plates
    if (!height) {
      const t = Math.floor(r() * 16)
      g.fillStyle = `rgb(${92 + t},${72 + t},${48 + t})`
      g.fillRect(2, y0 + 2, w - 4, ph - 4)
      // relevo em diamante da chapa xadrez
      g.fillStyle = "rgba(255,230,180,0.10)"
      for (let y = y0 + 6; y < y0 + ph - 4; y += 10)
        for (let x = 6 + ((y / 10) % 2) * 6; x < w - 4; x += 12) g.fillRect(x, y, 5, 2)
    } else {
      g.fillStyle = "#8c8c8c"
      g.fillRect(2, y0 + 2, w - 4, ph - 4)
      g.fillStyle = "#a0a0a0"
      for (let y = y0 + 6; y < y0 + ph - 4; y += 10)
        for (let x = 6 + ((y / 10) % 2) * 6; x < w - 4; x += 12) g.fillRect(x, y, 5, 2)
    }
    g.fillStyle = height ? "#202020" : "#1e1710"
    g.fillRect(0, y0, w, 2)
    if (!height) for (const bx of [7, w - 7]) bolt(g, bx, y0 + 8, 2.2)
  }
  // filete escuro do lado da barreira (u = 1) e o claro do lado do piso (u = 0)
  if (!height) {
    g.fillStyle = "#15120e"
    g.fillRect(w - 5, 0, 5, h)
    g.fillStyle = "rgba(255,240,210,0.18)"
    g.fillRect(0, 0, 2, h)
    wear(g, w, h, r, 60)
  }
}

// ── barreira: rodapé, faixa amarela/preta, painéis cinza, capa ───────────
// Linhas de v (de baixo para cima): 0–0.12 rodapé escuro (com o trilho
// ciano na geometria), 0.12–0.62 chevrons amarelos e pretos apontando para a
// FRENTE (mm3d-74, como nas referências do Alex), 0.62–0.9 painéis, 0.9–1 capa.
export const WALL_V = { base: 0.12, hazard: 0.62, panel: 0.9 }
function drawWall(g: G, w: number, h: number, r: () => number, height: boolean) {
  const Y = (v: number) => h - v * h // v para cima
  // rodapé
  g.fillStyle = height ? "#606060" : "#24272b"
  g.fillRect(0, Y(WALL_V.base), w, Y(0) - Y(WALL_V.base))
  // faixa de alerta: chevrons ">" amarelos sobre preto, apontando para +u (a
  // frente da pista nos dois lados: o u da barreira cresce com s)
  const y0 = Y(WALL_V.hazard)
  const y1 = Y(WALL_V.base)
  g.save()
  g.beginPath()
  g.rect(0, y0, w, y1 - y0)
  g.clip()
  g.fillStyle = height ? "#707070" : "#141414"
  g.fillRect(0, y0, w, y1 - y0)
  const hh = y1 - y0
  const ym = (y0 + y1) / 2
  const step = w / 4
  const thick = step * 0.42
  g.fillStyle = height ? "#9a9a9a" : "#e8b014"
  for (let x = -step; x < w + step; x += step) {
    g.beginPath()
    g.moveTo(x, y0 + hh * 0.08)
    g.lineTo(x + thick, y0 + hh * 0.08)
    g.lineTo(x + thick + hh * 0.42, ym)
    g.lineTo(x + thick, y1 - hh * 0.08)
    g.lineTo(x, y1 - hh * 0.08)
    g.lineTo(x + hh * 0.42, ym)
    g.closePath()
    g.fill()
  }
  g.restore()
  // moldura da faixa
  g.fillStyle = height ? "#404040" : "#0e0f10"
  g.fillRect(0, y0 - 2, w, 3)
  g.fillRect(0, y1 - 1, w, 3)
  // painéis cinza com detalhes técnicos
  const p0 = Y(WALL_V.panel)
  const p1 = y0 - 2
  const n = 2
  for (let k = 0; k < n; k++) {
    const x0 = (k * w) / n
    const pw = w / n
    if (!height) {
      const t = Math.floor(r() * 12)
      g.fillStyle = `rgb(${96 + t},${101 + t},${108 + t})`
      g.fillRect(x0 + 2, p0 + 2, pw - 4, p1 - p0 - 4)
      // grelha de ventilação e plaqueta
      g.fillStyle = "rgba(0,0,0,0.35)"
      for (let k2 = 0; k2 < 3; k2++) g.fillRect(x0 + pw * 0.12, p0 + (p1 - p0) * (0.3 + k2 * 0.18), pw * 0.22, 2)
      g.fillStyle = "rgba(0,0,0,0.22)"
      g.fillRect(x0 + pw * 0.5, p0 + (p1 - p0) * 0.3, pw * 0.38, (p1 - p0) * 0.4)
      g.fillStyle = "rgba(0,223,255,0.55)"
      g.fillRect(x0 + pw * 0.53, p0 + (p1 - p0) * 0.36, pw * 0.08, 3)
      g.fillStyle = "rgba(255,255,255,0.12)"
      g.fillRect(x0 + 2, p0 + 2, pw - 4, 2)
      for (const [bx, by] of [[x0 + 7, p0 + 7], [x0 + pw - 7, p0 + 7], [x0 + 7, p1 - 7], [x0 + pw - 7, p1 - 7]]) bolt(g, bx, by, 2.4)
    } else {
      g.fillStyle = "#909090"
      g.fillRect(x0 + 2, p0 + 2, pw - 4, p1 - p0 - 4)
      g.fillStyle = "#6a6a6a"
      for (let k2 = 0; k2 < 3; k2++) g.fillRect(x0 + pw * 0.12, p0 + (p1 - p0) * (0.3 + k2 * 0.18), pw * 0.22, 2)
    }
    g.fillStyle = height ? "#303030" : "#1a1c1f"
    g.fillRect(x0, p0, 2, p1 - p0)
  }
  // capa
  g.fillStyle = height ? "#b0b0b0" : "#8d949c"
  g.fillRect(0, 0, w, p0)
  g.fillStyle = height ? "#d0d0d0" : "#c2c9d0"
  g.fillRect(0, p0 * 0.35, w, 2)
  if (!height) wear(g, w, h, r, 120)
}

// ── por baixo e a lateral da estrutura: aço escuro com nervuras ──────────
function drawUnder(g: G, w: number, h: number, r: () => number) {
  g.fillStyle = "#1b1d21"
  g.fillRect(0, 0, w, h)
  // nervuras ao longo (v) e travessas
  for (let x = 0; x < w; x += w / 4) {
    g.fillStyle = "#2a2e34"
    g.fillRect(x, 0, w / 16, h)
    g.fillStyle = "rgba(255,255,255,0.06)"
    g.fillRect(x, 0, 2, h)
  }
  for (let y = 0; y < h; y += h / 4) {
    g.fillStyle = "#30343a"
    g.fillRect(0, y, w, h / 20)
    // mão-francesa em X entre as travessas
    g.strokeStyle = "rgba(90,96,104,0.7)"
    g.lineWidth = 3
    g.beginPath()
    g.moveTo(0, y)
    g.lineTo(w, y + h / 4)
    g.moveTo(w, y)
    g.lineTo(0, y + h / 4)
    g.stroke()
  }
  // detalhes de bronze
  g.fillStyle = "#6b5236"
  for (let y = h / 8; y < h; y += h / 4) g.fillRect(w * 0.47, y, w * 0.06, h / 40)
  wear(g, w, h, r, 80)
}

// ── rampa: chapa com chevrons amarelos e pretos (perigo, decolagem) ──────
function drawRamp(g: G, w: number, h: number) {
  g.fillStyle = "#141414"
  g.fillRect(0, 0, w, h)
  const step = h / 2
  g.fillStyle = "#e6b012"
  for (let y = -step; y < h + step; y += step) {
    // chevron apontando para a frente (v diminui na tela = para a frente)
    g.beginPath()
    g.moveTo(0, y + step * 0.55)
    g.lineTo(w / 2, y)
    g.lineTo(w, y + step * 0.55)
    g.lineTo(w, y + step * 0.85)
    g.lineTo(w / 2, y + step * 0.3)
    g.lineTo(0, y + step * 0.85)
    g.closePath()
    g.fill()
  }
  g.fillStyle = "#3a3d42"
  g.fillRect(0, 0, w * 0.04, h)
  g.fillRect(w * 0.96, 0, w * 0.04, h)
}

// ── placa de aceleração: fundo escuro, grade ciano, setas ────────────────
function drawPad(g: G, w: number, h: number) {
  g.fillStyle = "#050b12"
  g.fillRect(0, 0, w, h)
  // grade geométrica
  g.strokeStyle = "rgba(0,223,255,0.35)"
  g.lineWidth = 1.5
  for (let x = w / 8; x < w; x += w / 8) {
    g.beginPath()
    g.moveTo(x, 0)
    g.lineTo(x, h)
    g.stroke()
  }
  for (let y = 0; y < h; y += w / 8) {
    g.beginPath()
    g.moveTo(0, y)
    g.lineTo(w, y)
    g.stroke()
  }
  // setas em V (duas por repetição) com halo
  for (let k = 0; k < 2; k++) {
    const y0 = h * 0.12 + (k * h) / 2
    for (const [lw, col] of [[14, "rgba(35,175,255,0.35)"], [6, "#00dfff"], [2, "#d8fbff"]] as const) {
      g.strokeStyle = col
      g.lineWidth = lw
      g.lineJoin = "miter"
      g.beginPath()
      g.moveTo(w * 0.14, y0 + h * 0.2)
      g.lineTo(w * 0.5, y0)
      g.lineTo(w * 0.86, y0 + h * 0.2)
      g.stroke()
    }
  }
  // divisões: os 3 módulos da placa
  g.fillStyle = "rgba(0,223,255,0.75)"
  g.fillRect(0, 0, 3, h)
  g.fillRect(w - 3, 0, 3, h)
}

// ── painel ciano embutido nas laterais (sem setas: não é placa de turbo) ──
function drawInset(g: G, w: number, h: number) {
  g.fillStyle = "#03080d"
  g.fillRect(0, 0, w, h)
  const cell = w / 6
  for (let y = cell * 0.5; y < h - cell * 0.3; y += cell)
    for (let x = cell * 0.5; x < w - cell * 0.3; x += cell) {
      g.fillStyle = "rgba(0,200,240,0.55)"
      g.fillRect(x - cell * 0.38, y - cell * 0.38, cell * 0.76, cell * 0.76)
      g.fillStyle = "rgba(170,250,255,0.35)"
      g.fillRect(x - cell * 0.38, y - cell * 0.38, cell * 0.76, cell * 0.12)
    }
  g.strokeStyle = "#7ff3ff"
  g.lineWidth = 3
  g.strokeRect(2, 2, w - 4, h - 4)
}

// ── painel do túnel holográfico: grade fina + hexágonos, fundo preto (soma) ─
function drawHolo(g: G, w: number, h: number) {
  g.fillStyle = "#000"
  g.fillRect(0, 0, w, h)
  g.strokeStyle = "rgba(0,200,255,0.55)"
  g.lineWidth = 1.5
  const r = w / 10
  for (let row = 0, y = 0; y < h + r; row++, y += r * 1.5)
    for (let x = row % 2 ? r * 0.866 : 0; x < w + r; x += r * 1.732) {
      g.beginPath()
      for (let k = 0; k <= 6; k++) {
        const a = (Math.PI / 3) * k + Math.PI / 6
        const px = x + Math.cos(a) * r * 0.92
        const py = y + Math.sin(a) * r * 0.92
        if (k === 0) g.moveTo(px, py)
        else g.lineTo(px, py)
      }
      g.stroke()
    }
  // faixas de luz ao longo (as "costuras" do túnel)
  for (const fx of [0.02, 0.5, 0.98]) {
    const grad = g.createLinearGradient(fx * w - 8, 0, fx * w + 8, 0)
    grad.addColorStop(0, "rgba(0,0,0,0)")
    grad.addColorStop(0.5, "rgba(140,245,255,0.95)")
    grad.addColorStop(1, "rgba(0,0,0,0)")
    g.fillStyle = grad
    g.fillRect(fx * w - 8, 0, 16, h)
  }
}

// ── trilho de luz: degradê transversal (meio branco-ciano, bordas apagadas) ─
function drawRail(g: G, w: number, h: number) {
  const grad = g.createLinearGradient(0, 0, w, 0)
  grad.addColorStop(0, "rgba(0,0,0,1)")
  grad.addColorStop(0.3, "#0a6fb0")
  grad.addColorStop(0.5, "#bff6ff")
  grad.addColorStop(0.7, "#0a6fb0")
  grad.addColorStop(1, "rgba(0,0,0,1)")
  g.fillStyle = grad
  g.fillRect(0, 0, w, h)
  // pulsos (a textura corre ao longo)
  for (let y = 0; y < h; y += h / 4) {
    g.fillStyle = "rgba(255,255,255,0.25)"
    g.fillRect(w * 0.35, y, w * 0.3, h / 16)
  }
}

export function createTrackTextures(scene: Scene, mobile: boolean): TrackTextures {
  const S = mobile ? 256 : 512
  const r = rng(7331)
  const all: DynamicTexture[] = []
  const done = (t: DynamicTexture) => {
    t.update(true)
    all.push(t)
    return t
  }
  const deckT = make(scene, "corrida-deck", S, S)
  drawDeck(deckT.g, S, r, false)
  const sideT = make(scene, "corrida-side", S / 4, S / 2)
  drawSide(sideT.g, S / 4, S / 2, r, false)
  const wallT = make(scene, "corrida-wall", S, S / 2)
  drawWall(wallT.g, S, S / 2, r, false)
  let deckN: DynamicTexture | null = null
  let sideN: DynamicTexture | null = null
  let wallN: DynamicTexture | null = null
  if (!mobile) {
    const hd = scratch(S, S)
    drawDeck(hd, S, rng(7331), true)
    deckN = normalsFrom(scene, "corrida-deck-n", hd, S, S, 3)
    const hs = scratch(S / 4, S / 2)
    drawSide(hs, S / 4, S / 2, rng(99), true)
    sideN = normalsFrom(scene, "corrida-side-n", hs, S / 4, S / 2, 2.5)
    const hw = scratch(S, S / 2)
    drawWall(hw, S, S / 2, rng(5), true)
    wallN = normalsFrom(scene, "corrida-wall-n", hw, S, S / 2, 2.5)
    for (const t of [deckN, sideN, wallN]) all.push(t)
  }
  const underT = make(scene, "corrida-under", S / 2, S / 2)
  drawUnder(underT.g, S / 2, S / 2, r)
  const rampT = make(scene, "corrida-ramp", S / 2, S / 2)
  drawRamp(rampT.g, S / 2, S / 2)
  const padT = make(scene, "corrida-pad", S / 2, S, false)
  drawPad(padT.g, S / 2, S)
  const railT = make(scene, "corrida-rail", 32, 128, false)
  drawRail(railT.g, 32, 128)
  const insetT = make(scene, "corrida-inset", 64, 192, false)
  drawInset(insetT.g, 64, 192)
  const holoT = make(scene, "corrida-holo", mobile ? 128 : 256, mobile ? 128 : 256)
  drawHolo(holoT.g, mobile ? 128 : 256, mobile ? 128 : 256)
  return {
    deck: done(deckT.tex),
    deckN,
    side: done(sideT.tex),
    sideN,
    wall: done(wallT.tex),
    wallN,
    under: done(underT.tex),
    ramp: done(rampT.tex),
    pad: done(padT.tex),
    rail: done(railT.tex),
    inset: done(insetT.tex),
    holo: done(holoT.tex),
    dispose() {
      for (const t of all) t.dispose()
    },
  }
}
