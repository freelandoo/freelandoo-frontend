// features/meu-mundo/paint/engine/paint-tex.ts — Projeto B 3g: as texturas do
// chão do Paint EM CÓDIGO (eram 5 .webp assados no Blender por
// pipeline/paint/build_paint_textures.py). Mesmo desenho, sem arquivo:
//   lajes        lajes claras de junta escura (o tema tinge pela cor do vértice)
//   lajes-musgo  lajes cinza com musgo verde nas juntas (cor final)
//   chapa        chapa de aço em 4 painéis com rebites (tingida pelo vértice)
//   folha        mosaico de folhas verdes (cor final)
//   casca        casca de árvore em veios ondulados (cor final)
// Tudo repete sem emenda (Voronoi e ondas no toro de 256 px).

import type { Scene } from "@babylonjs/core/scene"
import { DynamicTexture } from "@babylonjs/core/Materials/Textures/dynamicTexture"
import { Texture } from "@babylonjs/core/Materials/Textures/texture"

export type PaintTexKind = "lajes" | "lajes-musgo" | "chapa" | "folha" | "casca"

const N = 256

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

export function paintTexture(scene: Scene, kind: PaintTexKind): DynamicTexture {
  const tex = new DynamicTexture(`paint-tex-${kind}`, { width: N, height: N }, scene, true)
  const g = tex.getContext() as unknown as CanvasRenderingContext2D
  const img = g.createImageData(N, N)
  const d = img.data
  const put = (i: number, r: number, gg: number, b: number) => {
    d[i * 4] = Math.max(0, Math.min(255, r))
    d[i * 4 + 1] = Math.max(0, Math.min(255, gg))
    d[i * 4 + 2] = Math.max(0, Math.min(255, b))
    d[i * 4 + 3] = 255
  }
  if (kind === "lajes" || kind === "lajes-musgo") {
    const moss = kind === "lajes-musgo"
    const { cell, edge } = voronoi(moss ? 25 : 30, moss ? 501 : 301)
    for (let i = 0; i < N * N; i++) {
      const x = i % N
      const y = (i / N) | 0
      const e = edge[i]
      const c = cell[i]
      const base = moss ? 128 + hash(c * 7 + 3) * 34 : 214 + hash(c * 7 + 3) * 34
      const n = wave(x, y, c) * (moss ? 7 : 5)
      // borda da laje escurece um pouco (relevo)
      const bevel = Math.min(1, e / 5)
      let v = (base + n) * (0.78 + bevel * 0.22)
      if (moss) {
        if (e < 3.2) {
          // musgo na junta, que transborda em manchas
          const k = 0.75 + hash(i) * 0.25
          put(i, 52 * k, 150 * k, 58 * k)
          continue
        }
        if (e < 5.5 && wave(x * 2, y * 2, 9) > 0.2) {
          put(i, 78, 140, 70)
          continue
        }
        put(i, v, v * 1.01, v * 0.97)
      } else {
        if (e < 1.6) v = 70 + hash(i) * 16
        else if (e < 2.6) v *= 0.7
        put(i, v, v * 0.99, v * 0.96)
      }
    }
    g.putImageData(img, 0, 0)
    // trincas finas
    g.strokeStyle = moss ? "rgba(40,40,40,0.5)" : "rgba(70,70,70,0.45)"
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
  } else if (kind === "folha") {
    const { cell, edge } = voronoi(256, 701)
    for (let i = 0; i < N * N; i++) {
      const c = cell[i]
      const e = edge[i]
      const k = 0.84 + hash(c * 5 + 1) * 0.24
      const tint = hash(c * 3 + 2)
      let r = (46 + tint * 26) * k
      let gg = (132 + tint * 34) * k
      let b = (74 + tint * 18) * k
      if (e < 0.7) {
        r *= 0.84
        gg *= 0.86
        b *= 0.84
      } else if (e > 4.5 && hash(c * 11) > 0.86) {
        // reflexo claro em algumas folhas
        r += 40
        gg += 50
        b += 40
      }
      put(i, r, gg, b)
    }
    g.putImageData(img, 0, 0)
  } else if (kind === "casca") {
    const t = (Math.PI * 2) / N
    for (let i = 0; i < N * N; i++) {
      const x = i % N
      const y = (i / N) | 0
      const warp = Math.sin(y * t * 3 + Math.sin(x * t * 2) * 1.5) * 9 + Math.sin(y * t * 9 + x * t) * 3
      const v = Math.sin((x + warp) * t * 22)
      const groove = v < -0.55 ? 0.55 : 0.82 + (v + 0.55) * 0.14
      const n = 0.92 + hash(i) * 0.08
      put(i, 108 * groove * n, 70 * groove * n, 46 * groove * n)
    }
    g.putImageData(img, 0, 0)
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
  tex.wrapU = Texture.WRAP_ADDRESSMODE
  tex.wrapV = Texture.WRAP_ADDRESSMODE
  tex.update(false)
  return tex
}
