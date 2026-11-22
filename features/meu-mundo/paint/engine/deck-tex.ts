// features/meu-mundo/paint/engine/deck-tex.ts — PAINT: chão de chapa e de basalto (22/11).
//
// Pedido do Alex: o acabamento do chão como o da Antigravidade (corrida/engine/track-tex.ts, `drawDeck`)
// e o do Rolê Noturno. Os mapas Fábrica (`plate`) e Forja (`basalt`) tinham uma textura de 256 px quase
// lisa. Aqui, 512 px (256 no celular fraco), em tons de cinza: a cor do tema continua vindo do vértice
// (o branco do canvas = a cor da ilha). Uma repetição = 4 m de chão (UV = x/4, z/4 em `floorOf`).
//
// - Chapa: 2 × 2 chapas de aço escovado por repetição, cada uma com o tom dela, emenda rebaixada com a
//   quina clara, parafusos com brilho nos cantos, tampa de manutenção com 4 parafusos em algumas, grade
//   antiderrapante em losango bem leve e desgaste (manchas e riscos).
// - Basalto: blocos cortados em fiadas desencontradas, bisel claro em cima e escuro embaixo, poros, e as
//   rachaduras acesas na cor de brilho do tema (com halo) que atravessam as juntas.

import type { Scene } from "@babylonjs/core/scene"
import { DynamicTexture } from "@babylonjs/core/Materials/Textures/dynamicTexture"
import { Texture } from "@babylonjs/core/Materials/Textures/texture"
import type { RGB } from "../../engine/geometry"

type G = CanvasRenderingContext2D

function rng(seed: number) {
  let s = seed
  return () => (s = (s * 16807) % 2147483647) / 2147483647
}

const grey = (k: number, a = 1) => {
  const v = Math.round(Math.max(0, Math.min(1, k)) * 255)
  return `rgba(${v},${v},${v},${a})`
}

function bolt(g: G, x: number, y: number, r: number) {
  g.fillStyle = "rgba(0,0,0,0.5)"
  g.beginPath()
  g.arc(x + r * 0.3, y + r * 0.3, r, 0, Math.PI * 2)
  g.fill()
  g.fillStyle = grey(0.78)
  g.beginPath()
  g.arc(x, y, r, 0, Math.PI * 2)
  g.fill()
  g.fillStyle = "rgba(255,255,255,0.55)"
  g.beginPath()
  g.arc(x - r * 0.3, y - r * 0.3, r * 0.4, 0, Math.PI * 2)
  g.fill()
}

function wear(g: G, S: number, r: () => number, n: number) {
  for (let k = 0; k < n; k++) {
    const x = r() * S
    const y = r() * S
    const s = (2 + r() * 12) * (S / 512)
    g.fillStyle = r() < 0.6 ? `rgba(0,0,0,${0.04 + r() * 0.08})` : `rgba(255,255,255,${0.03 + r() * 0.05})`
    g.fillRect(x, y, s, s * (0.3 + r()))
  }
  g.lineWidth = 1
  for (let k = 0; k < n / 3; k++) {
    const x = r() * S
    const y = r() * S
    g.strokeStyle = `rgba(255,255,255,${0.04 + r() * 0.05})`
    g.beginPath()
    g.moveTo(x, y)
    g.lineTo(x + (r() - 0.5) * 30, y + (r() - 0.5) * 30)
    g.stroke()
  }
}

function drawPlate(g: G, S: number) {
  const r = rng(7331)
  g.fillStyle = grey(0.34)
  g.fillRect(0, 0, S, S)
  const n = 2
  const P = S / n
  const u = S / 512
  for (let i = 0; i < n; i++)
    for (let j = 0; j < n; j++) {
      const x0 = i * P
      const y0 = j * P
      const k = 0.8 + r() * 0.14
      g.fillStyle = grey(k)
      g.fillRect(x0 + 3 * u, y0 + 3 * u, P - 6 * u, P - 6 * u)
      // aço escovado: riscos finos num sentido por chapa (alterna, como chapa virada)
      const along = (i + j) % 2 === 0
      for (let q = 0; q < 90; q++) {
        const t = 4 * u + r() * (P - 8 * u)
        g.strokeStyle = `rgba(255,255,255,${0.02 + r() * 0.04})`
        g.lineWidth = 1
        g.beginPath()
        if (along) {
          g.moveTo(x0 + t, y0 + 4 * u)
          g.lineTo(x0 + t, y0 + P - 4 * u)
        } else {
          g.moveTo(x0 + 4 * u, y0 + t)
          g.lineTo(x0 + P - 4 * u, y0 + t)
        }
        g.stroke()
      }
      // antiderrapante em losango, bem leve
      g.fillStyle = "rgba(0,0,0,0.07)"
      for (let yy = y0 + 10 * u; yy < y0 + P - 8 * u; yy += 12 * u)
        for (let xx = x0 + 10 * u + (((yy - y0) / (12 * u)) % 2) * 6 * u; xx < x0 + P - 8 * u; xx += 12 * u) {
          g.save()
          g.translate(xx, yy)
          g.rotate(Math.PI / 4)
          g.fillRect(-2.2 * u, -0.9 * u, 4.4 * u, 1.8 * u)
          g.restore()
        }
      // tampa de manutenção rebaixada em metade das chapas
      if (r() < 0.55) {
        const mw = P * (0.26 + r() * 0.16)
        const mh = P * (0.18 + r() * 0.14)
        const mx = x0 + P * 0.18 + r() * (P * 0.64 - mw)
        const my = y0 + P * 0.18 + r() * (P * 0.64 - mh)
        g.fillStyle = "rgba(0,0,0,0.22)"
        g.fillRect(mx, my, mw, mh)
        g.fillStyle = "rgba(255,255,255,0.14)"
        g.fillRect(mx + 2 * u, my + 2 * u, mw - 4 * u, 1.5 * u)
        g.strokeStyle = "rgba(0,0,0,0.4)"
        g.lineWidth = 1.5 * u
        g.strokeRect(mx, my, mw, mh)
        for (const [bx, by] of [
          [mx + 6 * u, my + 6 * u],
          [mx + mw - 6 * u, my + 6 * u],
          [mx + 6 * u, my + mh - 6 * u],
          [mx + mw - 6 * u, my + mh - 6 * u],
        ])
          bolt(g, bx, by, 2.4 * u)
      }
      // emenda rebaixada (escura) e a quina clara de cima/esquerda
      g.fillStyle = grey(0.12)
      g.fillRect(x0, y0, P, 3 * u)
      g.fillRect(x0, y0, 3 * u, P)
      g.fillStyle = "rgba(255,255,255,0.16)"
      g.fillRect(x0 + 3 * u, y0 + 3 * u, P - 6 * u, 1.5 * u)
      g.fillRect(x0 + 3 * u, y0 + 3 * u, 1.5 * u, P - 6 * u)
      g.fillStyle = "rgba(0,0,0,0.25)"
      g.fillRect(x0 + 3 * u, y0 + P - 5 * u, P - 6 * u, 2 * u)
      // parafusos: 3 por lado (cantos e meio)
      for (const fx of [0, 0.5, 1])
        for (const fy of [0, 0.5, 1]) {
          if (fx === 0.5 && fy === 0.5) continue
          bolt(g, x0 + 10 * u + fx * (P - 20 * u), y0 + 10 * u + fy * (P - 20 * u), 3.2 * u)
        }
    }
  wear(g, S, r, 260)
}

function drawBasalt(g: G, S: number, glow: RGB) {
  const r = rng(4242)
  const u = S / 512
  g.fillStyle = grey(0.2)
  g.fillRect(0, 0, S, S)
  // fiadas de blocos desencontrados (4 fiadas; blocos de 1 a 2 m de comprimento em 4 m)
  const rows = 4
  const rh = S / rows
  for (let j = 0; j < rows; j++) {
    const y0 = j * rh
    let x = -r() * S * 0.3
    while (x < S) {
      const w = S * (0.22 + r() * 0.24)
      const k = 0.62 + r() * 0.22
      for (const ox of [0, -S, S]) {
        const bx = x + ox + 3 * u
        const bw = w - 6 * u
        if (bx > S || bx + bw < 0) continue
        g.fillStyle = grey(k)
        g.fillRect(bx, y0 + 3 * u, bw, rh - 6 * u)
        // bisel: luz em cima/esquerda, sombra embaixo/direita
        g.fillStyle = "rgba(255,255,255,0.16)"
        g.fillRect(bx, y0 + 3 * u, bw, 3 * u)
        g.fillRect(bx, y0 + 3 * u, 3 * u, rh - 6 * u)
        g.fillStyle = "rgba(0,0,0,0.3)"
        g.fillRect(bx, y0 + rh - 7 * u, bw, 4 * u)
        g.fillRect(bx + bw - 4 * u, y0 + 3 * u, 4 * u, rh - 6 * u)
        // poros e manchas
        for (let q = 0; q < 26; q++) {
          g.fillStyle = `rgba(0,0,0,${0.08 + r() * 0.14})`
          g.beginPath()
          g.arc(bx + r() * bw, y0 + 6 * u + r() * (rh - 12 * u), (0.8 + r() * 2.4) * u, 0, Math.PI * 2)
          g.fill()
        }
      }
      x += w
    }
  }
  // rachaduras acesas (cor do brilho do tema) com halo, cruzando os blocos
  const col = (a: number, t = 0) => `rgba(${Math.round(Math.min(1, glow[0] + (1 - glow[0]) * t) * 255)},${Math.round(Math.min(1, glow[1] + (1 - glow[1]) * t) * 255)},${Math.round(Math.min(1, glow[2] + (1 - glow[2]) * t) * 255)},${a})`
  for (let i = 0; i < 7; i++) {
    const pts: [number, number][] = []
    let x = r() * S
    let y = r() * S
    pts.push([x, y])
    for (let k = 0; k < 6; k++) {
      x += (r() - 0.5) * 90 * u
      y += (r() - 0.5) * 90 * u
      pts.push([x, y])
    }
    for (const [lw, a, t] of [
      [9, 0.18, 0],
      [4, 0.55, 0.15],
      [1.6, 1, 0.6],
    ] as const) {
      g.strokeStyle = col(a, t)
      g.lineWidth = lw * u
      g.lineJoin = "round"
      g.beginPath()
      pts.forEach(([px, py], k) => (k ? g.lineTo(px, py) : g.moveTo(px, py)))
      g.stroke()
    }
  }
  wear(g, S, r, 180)
}

/** Textura do chão de chapa (Fábrica) ou basalto (Forja). */
export function deckTexture(scene: Scene, kind: "plate" | "basalt", glow: RGB, low: boolean): DynamicTexture {
  const S = low ? 256 : 512
  const tex = new DynamicTexture(`paint-deck-${kind}`, { width: S, height: S }, scene, true, Texture.TRILINEAR_SAMPLINGMODE)
  const g = tex.getContext() as unknown as G
  if (kind === "plate") drawPlate(g, S)
  else drawBasalt(g, S, glow)
  tex.wrapU = Texture.WRAP_ADDRESSMODE
  tex.wrapV = Texture.WRAP_ADDRESSMODE
  tex.anisotropicFilteringLevel = low ? 2 : 8
  tex.update(true)
  return tex
}
