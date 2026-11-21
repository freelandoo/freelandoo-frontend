// features/meu-mundo/paint/engine/paint-tex.ts — Projeto B 3g: as texturas do
// chão do Paint EM CÓDIGO (eram 5 .webp assados no Blender por
// pipeline/paint/build_paint_textures.py). Sem arquivo:
//   lajes        lajes claras de junta escura (o tema tinge pela cor do vértice)
//   chapa        chapa de aço em 4 painéis com rebites (tingida pelo vértice)
// Floresta (Alex, 2026-11-21: "o chão está bem simples e ruim", com duas fotos
// de referência — tabuado com rebites e pedras sextavadas na grama), 512 px:
//   folha        grama com pedras sextavadas verde-oliva (ilhas de folha e o nascer)
//   lajes-musgo  pedras sextavadas cinza com musgo nas juntas (ilhas de pedra)
//   casca        tabuado de madeira com rebites (as raízes em volta da árvore)
// Tudo repete sem emenda (Voronoi e ondas no toro).

import type { Scene } from "@babylonjs/core/scene"
import { DynamicTexture } from "@babylonjs/core/Materials/Textures/dynamicTexture"
import { Texture } from "@babylonjs/core/Materials/Textures/texture"

export type PaintTexKind = "lajes" | "lajes-musgo" | "chapa" | "folha" | "casca"

const N = 256
/** Floresta: 512 px (o chão é visto de perto e na diagonal). */
const M = 512

function hash(n: number) {
  let h = (n * 2654435761) >>> 0
  h ^= h >>> 15
  h = Math.imul(h, 2246822519) >>> 0
  h ^= h >>> 13
  h = Math.imul(h, 3266489917) >>> 0
  h ^= h >>> 16
  return (h >>> 0) / 4294967296
}

/** Voronoi no toro: para cada pixel, a célula mais perto e a distância até a junta. */
function voronoi(count: number, seed: number) {
  const px: number[] = []
  const py: number[] = []
  // pontos em grade com sorteio (células de tamanho parecido, como lajes)
  const g = Math.round(Math.sqrt(count))
  const step = N / g
  for (let j = 0; j < g; j++) {
    for (let i = 0; i < g; i++) {
      px.push((i + 0.15 + hash(seed + j * 97 + i * 13) * 0.7) * step)
      py.push((j + 0.15 + hash(seed + j * 61 + i * 29 + 7) * 0.7) * step)
    }
  }
  const cell = new Int16Array(N * N)
  const edge = new Float32Array(N * N)
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      let d1 = 1e9
      let d2 = 1e9
      let c = 0
      for (let k = 0; k < px.length; k++) {
        let dx = Math.abs(x - px[k])
        let dy = Math.abs(y - py[k])
        if (dx > N / 2) dx = N - dx
        if (dy > N / 2) dy = N - dy
        const d = dx * dx + dy * dy
        if (d < d1) {
          d2 = d1
          d1 = d
          c = k
        } else if (d < d2) d2 = d
      }
      cell[y * N + x] = c
      // distância até a junta (meia diferença das distâncias, em px)
      edge[y * N + x] = (Math.sqrt(d2) - Math.sqrt(d1)) / 2
    }
  }
  return { cell, edge }
}

/** Ruído suave e periódico (soma de senos de frequência inteira). */
function wave(x: number, y: number, s: number) {
  const t = (Math.PI * 2) / N
  return (
    Math.sin(x * t * 3 + hash(s) * 6) * 0.5 +
    Math.sin(y * t * 4 + hash(s + 1) * 6) * 0.5 +
    Math.sin((x + y) * t * 7 + hash(s + 2) * 6) * 0.3 +
    Math.sin((x - y) * t * 11 + hash(s + 3) * 6) * 0.2
  )
}

/** O mesmo ruído no toro de M px. */
function waveM(x: number, y: number, s: number) {
  return wave((x * N) / M, (y * N) / M, s)
}

/**
 * Sextavado no toro de M px: `cols` casas por linha, `rows` linhas (par), linha
 * ímpar deslocada meia casa. Para cada pixel: a casa mais perto (busca só nas
 * vizinhas), a distância até a junta e o vetor até o centro da casa.
 */
function hexCells(cols: number, rows: number) {
  const cw = M / cols
  const rh = M / rows
  const cx = (r: number, c: number) => (c + 0.5 + (r % 2) * 0.5) * cw
  const cy = (r: number) => (r + 0.5) * rh
  const cell = new Int32Array(M * M)
  const edge = new Float32Array(M * M)
  const ox = new Float32Array(M * M)
  const oy = new Float32Array(M * M)
  for (let y = 0; y < M; y++) {
    const r0 = Math.floor(y / rh)
    for (let x = 0; x < M; x++) {
      const c0 = Math.floor(x / cw)
      let d1 = 1e9
      let d2 = 1e9
      let best = 0
      let bx = 0
      let by = 0
      for (let dr = -1; dr <= 1; dr++) {
        const r = (r0 + dr + rows) % rows
        for (let dc = -1; dc <= 1; dc++) {
          const c = (c0 + dc + cols) % cols
          let dx = x - cx(r, c)
          let dy = y - cy(r)
          if (dx > M / 2) dx -= M
          if (dx < -M / 2) dx += M
          if (dy > M / 2) dy -= M
          if (dy < -M / 2) dy += M
          const d = dx * dx + dy * dy
          if (d < d1) {
            d2 = d1
            d1 = d
            best = r * cols + c
            bx = dx
            by = dy
          } else if (d < d2) d2 = d
        }
      }
      const i = y * M + x
      cell[i] = best
      edge[i] = (Math.sqrt(d2) - Math.sqrt(d1)) / 2
      ox[i] = bx
      oy[i] = by
    }
  }
  return { cell, edge, ox, oy, size: Math.min(cw, rh) }
}

type Put = (i: number, r: number, g: number, b: number) => void

/** Pedras sextavadas: na grama (`grass`) ou cinza com musgo nas juntas. */
function hexFloor(put: Put, g: CanvasRenderingContext2D, img: ImageData, grass: boolean) {
  const { cell, edge, ox, oy, size } = hexCells(7, 8)
  const STONES: [number, number, number][] = grass
    ? [
        [126, 156, 66],
        [108, 142, 58],
        [140, 164, 76],
        [96, 128, 52],
      ]
    : [
        [150, 150, 142],
        [132, 134, 128],
        [164, 160, 148],
        [120, 124, 116],
      ]
  for (let i = 0; i < M * M; i++) {
    const x = i % M
    const y = (i / M) | 0
    const c = cell[i]
    const e = edge[i]
    const gap = (grass ? 5.5 : 3.2) + hash(c * 13 + 5) * 2.5
    const missing = grass && hash(c * 17 + 1) < 0.07
    if (missing || e < gap) {
      // junta: grama (ou musgo) com folhinhas; escurece perto da pedra (sombra)
      const blade = hash(((x >> 1) * 7919 + (y >> 2) * 104729) | 0)
      const n = waveM(x * 2, y * 2, 21) * 8
      const shade = missing ? 1 : 0.72 + Math.min(1, e / gap) * 0.18
      const k = (0.86 + blade * 0.24) * shade
      put(i, (64 + n) * k, (122 + n * 1.5) * k, (42 + n * 0.5) * k)
      continue
    }
    const base = STONES[Math.floor(hash(c * 7 + 3) * STONES.length)]
    // relevo: beira de cima clara, de baixo escura
    const d = Math.hypot(ox[i], oy[i]) || 1
    const rim = Math.max(0, 1 - (e - gap) / 6)
    const tilt = (-oy[i] / d) * 0.22 * rim + (-ox[i] / d) * 0.06 * rim
    const speck = (hash(i * 3 + 11) - 0.5) * 10
    const n = waveM(x, y, c) * 6
    const k = 1 + tilt - rim * 0.06
    let r = (base[0] + n + speck) * k
    let gg = (base[1] + n + speck) * k
    let b = (base[2] + n * 0.6 + speck) * k
    if (!grass && waveM(x * 1.5, y * 1.5, c + 40) > 0.75 && e < gap + 14) {
      // musgo subindo na beira da pedra
      r = r * 0.45 + 30
      gg = gg * 0.5 + 70
      b = b * 0.4 + 22
    }
    put(i, r, gg, b)
  }
  g.putImageData(img, 0, 0)
  // trincas finas em algumas pedras
  g.strokeStyle = grass ? "rgba(52,70,30,0.55)" : "rgba(60,60,58,0.55)"
  g.lineWidth = 1.2
  for (let k = 0; k < 26; k++) {
    let x = hash(k * 31 + 5) * M
    let y = hash(k * 37 + 9) * M
    g.beginPath()
    g.moveTo(x, y)
    for (let s = 0; s < 3; s++) {
      x += (hash(k * 41 + s) - 0.5) * size * 0.4
      y += (hash(k * 43 + s) - 0.5) * size * 0.4
      g.lineTo(x, y)
    }
    g.stroke()
  }
  // florzinhas na grama (só nas juntas e nas casas sem pedra)
  if (grass) {
    const FL = ["#ff7fb8", "#ffe066", "#ffffff", "#c08cff"]
    for (let k = 0; k < 140; k++) {
      const x = Math.floor(hash(k * 53 + 1) * M)
      const y = Math.floor(hash(k * 59 + 2) * M)
      const i = y * M + x
      if (edge[i] > 3 && hash(cell[i] * 17 + 1) >= 0.07) continue
      g.fillStyle = FL[k % FL.length]
      for (let p = 0; p < 5; p++) {
        const a = (p / 5) * Math.PI * 2
        g.beginPath()
        g.arc(x + Math.cos(a) * 2.2, y + Math.sin(a) * 2.2, 1.7, 0, Math.PI * 2)
        g.fill()
      }
      g.fillStyle = "#ffcc33"
      g.beginPath()
      g.arc(x, y, 1.3, 0, Math.PI * 2)
      g.fill()
    }
  }
}

/** Tabuado: 8 fileiras de tábuas, comprimentos alternados, veio, nó e rebites nas pontas. */
function planks(put: Put, g: CanvasRenderingContext2D, img: ImageData) {
  const ROWS = 8
  const W = M / ROWS
  // cada fileira: tábuas [a, b) que somam M, a partir de um deslocamento
  const rows: { a: number; b: number; s: number }[][] = []
  for (let r = 0; r < ROWS; r++) {
    const off = Math.floor(hash(r * 7 + 1) * M)
    const out: { a: number; b: number; s: number }[] = []
    let at = 0
    let k = 0
    while (at < M) {
      const len = Math.min(M - at, [128, 192, 256, 160][Math.floor(hash(r * 31 + k * 5) * 4)])
      out.push({ a: at + off, b: at + len + off, s: r * 100 + k })
      at += len
      k++
    }
    rows.push(out)
  }
  const plankAt = (r: number, x: number) => {
    for (const p of rows[r]) {
      for (const xx of [x, x + M]) if (xx >= p.a && xx < p.b) return { p, u: xx - p.a }
    }
    return { p: rows[r][0], u: 0 }
  }
  for (let i = 0; i < M * M; i++) {
    const x = i % M
    const y = (i / M) | 0
    const r = Math.floor(y / W)
    const v = y - r * W
    const { p, u } = plankAt(r, x)
    const len = p.b - p.a
    // junta entre fileiras e entre tábuas
    if (v < 3 || u < 2 || u > len - 2) {
      put(i, 46, 26, 16)
      continue
    }
    const tone = 0.82 + hash(p.s * 13 + 2) * 0.3
    // veio ao longo da tábua
    const grain = Math.sin((v + Math.sin(u * 0.035 + p.s) * 3.5 + Math.sin(u * 0.11 + p.s * 2) * 0.8) * 1.15 + p.s)
    let k = tone * (grain > 0.82 ? 0.8 : 0.95 + grain * 0.05)
    // bisel: beira de cima clara, de baixo escura, pontas um pouco escuras
    if (v < 6) k *= 1.12
    else if (v > W - 4) k *= 0.8
    if (u < 5 || u > len - 5) k *= 0.88
    // nó escuro em algumas tábuas
    if (hash(p.s * 3 + 9) > 0.6) {
      const kx = len * (0.3 + hash(p.s * 5) * 0.4)
      const dd = Math.hypot((u - kx) / 7, (v - W * 0.55) / 4)
      if (dd < 1) k *= 0.55 + dd * 0.3
      else if (dd < 1.6) k *= 0.85
    }
    const n = (hash(i * 7 + 3) - 0.5) * 0.06
    put(i, 158 * (k + n), 92 * (k + n), 50 * (k + n))
  }
  g.putImageData(img, 0, 0)
  // rebites (dois em cada ponta) e alguns furos sextavados escuros
  for (let r = 0; r < ROWS; r++) {
    for (const p of rows[r]) {
      for (const end of [p.a + 8, p.b - 15]) {
        const x = ((end % M) + M) % M
        for (const fy of [0.3, 0.72]) {
          const y = r * W + W * fy - 3
          for (const dx of [0, -M, M]) {
            g.fillStyle = "#3a3633"
            g.fillRect(x + dx, y, 7, 7)
            g.fillStyle = "#8b8580"
            g.fillRect(x + dx + 1, y + 1, 4, 3)
          }
        }
      }
      if (hash(p.s * 11 + 4) > 0.7) {
        const x = (((p.a + (p.b - p.a) * (0.35 + hash(p.s) * 0.3)) % M) + M) % M
        const y = r * W + W * 0.5
        g.fillStyle = "#1f140d"
        for (const dx of [0, -M, M]) {
          g.beginPath()
          for (let q = 0; q < 6; q++) {
            const a = (q / 6) * Math.PI * 2
            g.lineTo(x + dx + Math.cos(a) * 4.5, y + Math.sin(a) * 3.6)
          }
          g.fill()
        }
      }
    }
  }
}

export function paintTexture(scene: Scene, kind: PaintTexKind): DynamicTexture {
  const S = kind === "folha" || kind === "casca" || kind === "lajes-musgo" ? M : N
  const tex = new DynamicTexture(`paint-tex-${kind}`, { width: S, height: S }, scene, true)
  const g = tex.getContext() as unknown as CanvasRenderingContext2D
  const img = g.createImageData(S, S)
  const d = img.data
  const put: Put = (i, r, gg, b) => {
    d[i * 4] = Math.max(0, Math.min(255, r))
    d[i * 4 + 1] = Math.max(0, Math.min(255, gg))
    d[i * 4 + 2] = Math.max(0, Math.min(255, b))
    d[i * 4 + 3] = 255
  }
  if (kind === "folha" || kind === "lajes-musgo") {
    hexFloor(put, g, img, kind === "folha")
  } else if (kind === "casca") {
    planks(put, g, img)
  } else if (kind === "lajes") {
    const { cell, edge } = voronoi(30, 301)
    for (let i = 0; i < N * N; i++) {
      const x = i % N
      const y = (i / N) | 0
      const e = edge[i]
      const c = cell[i]
      const base = 214 + hash(c * 7 + 3) * 34
      const n = wave(x, y, c) * 5
      // borda da laje escurece um pouco (relevo)
      const bevel = Math.min(1, e / 5)
      let v = (base + n) * (0.78 + bevel * 0.22)
      if (e < 1.6) v = 70 + hash(i) * 16
      else if (e < 2.6) v *= 0.7
      put(i, v, v * 0.99, v * 0.96)
    }
    g.putImageData(img, 0, 0)
    // trincas finas
    g.strokeStyle = "rgba(70,70,70,0.45)"
    g.lineWidth = 1
    for (let k = 0; k < 18; k++) {
      let x = hash(k * 31 + 5) * N
      let y = hash(k * 37 + 9) * N
      g.beginPath()
      g.moveTo(x, y)
      for (let s = 0; s < 4; s++) {
        x += (hash(k * 41 + s) - 0.5) * 26
        y += (hash(k * 43 + s) - 0.5) * 26
        g.lineTo(x, y)
      }
      g.stroke()
    }
  } else {
    // chapa: 4 painéis, pontos de relevo em grade, emendas escuras
    for (let i = 0; i < N * N; i++) {
      const x = i % N
      const y = (i / N) | 0
      let v = 206 + wave(x, y, 77) * 6
      const dx = (x % 21) - 10
      const dy = (y % 21) - 10
      if (dx * dx + dy * dy < 3) v -= 46
      if (x % 128 < 2 || y % 128 < 2) v = 92
      else if (x % 128 < 4 || y % 128 < 4) v -= 22
      put(i, v, v, v * 1.01)
    }
    g.putImageData(img, 0, 0)
  }
  tex.anisotropicFilteringLevel = 8
  tex.wrapU = Texture.WRAP_ADDRESSMODE
  tex.wrapV = Texture.WRAP_ADDRESSMODE
  tex.update(false)
  return tex
}
