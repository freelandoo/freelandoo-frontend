// features/meu-mundo/engine/ambiente-fx/atlas.ts — o atlas ÚNICO das partículas de ambiente (E5).
//
// Uma textura 256×256 desenhada no canvas (nada para baixar), 4×4 células de 64 px, branco + alfa:
// a cor sai do preset, no shader. Cada forma fica dentro de 52 px no centro da célula (margem de 6 px
// para o mipmap não vazar da vizinha). Uma por cena, guardada pela própria cena: as camadas e
// regiões dividem a mesma; some com `scene.dispose()` (e com o dono, se ele soltar antes).
//
//  0 ponto macio (vaga-lume, luz)     1 brilho de 4 pontas (quadro A)   2 brilho (quadro B)    3 brasa/faísca
//  4 folha (de frente)                5 folha (meio de lado)            6 folha (de lado)      7 floco de neve
//  8 poeira (grão irregular)          9 fumaça/vapor (nuvem macia)     10 quadrado tecnológico 11 losango tecnológico
// 12 lasca de gelo                   13 cinza (floco irregular)        14–15 livres

import { DynamicTexture } from "@babylonjs/core/Materials/Textures/dynamicTexture"
import { Texture } from "@babylonjs/core/Materials/Textures/texture"
import type { Scene } from "@babylonjs/core/scene"

export const ATLAS_COLS = 4
export const CELL = {
  dot: 0,
  sparkA: 1,
  sparkB: 2,
  ember: 3,
  leafA: 4,
  leafB: 5,
  leafC: 6,
  flake: 7,
  dust: 8,
  smoke: 9,
  techSq: 10,
  techDia: 11,
  shard: 12,
  ash: 13,
} as const

const C = 64
const byScene = new WeakMap<Scene, DynamicTexture>()

type Ctx = CanvasRenderingContext2D

function cell(c: Ctx, i: number, draw: (c: Ctx) => void) {
  c.save()
  c.translate((i % ATLAS_COLS) * C + C / 2, Math.floor(i / ATLAS_COLS) * C + C / 2)
  c.beginPath()
  c.rect(-26, -26, 52, 52)
  c.clip()
  draw(c)
  c.restore()
}

function radial(c: Ctx, r: number, stops: [number, number][]) {
  const g = c.createRadialGradient(0, 0, 0, 0, 0, r)
  for (const [o, a] of stops) g.addColorStop(o, `rgba(255,255,255,${a})`)
  c.fillStyle = g
  c.fillRect(-r, -r, r * 2, r * 2)
}

function star(c: Ctx, arms: number, long: number, short: number, rot: number) {
  c.beginPath()
  for (let k = 0; k < arms * 2; k++) {
    const a = rot + (k * Math.PI) / arms
    const r = k % 2 ? short : long
    c.lineTo(Math.cos(a) * r, Math.sin(a) * r)
  }
  c.closePath()
  c.fill()
}

function leaf(c: Ctx, sx: number) {
  c.save()
  c.rotate(-0.6)
  c.scale(sx, 1)
  c.fillStyle = "rgba(255,255,255,1)"
  c.beginPath()
  c.moveTo(0, -22)
  c.bezierCurveTo(14, -12, 14, 10, 0, 22)
  c.bezierCurveTo(-14, 10, -14, -12, 0, -22)
  c.fill()
  // nervura e meia-sombra (a cor do preset multiplica o cinza)
  c.strokeStyle = "rgba(170,170,170,1)"
  c.lineWidth = 2
  c.beginPath()
  c.moveTo(0, -20)
  c.lineTo(0, 24)
  c.stroke()
  c.fillStyle = "rgba(205,205,205,1)"
  c.beginPath()
  c.moveTo(0, -20)
  c.bezierCurveTo(-12, -10, -12, 10, 0, 21)
  c.fill()
  c.restore()
}

function blob(c: Ctx, n: number, r: number, jitter: number, seed: number) {
  let s = seed
  const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647)
  c.beginPath()
  for (let k = 0; k < n; k++) {
    const a = (k / n) * Math.PI * 2
    const rr = r * (1 - jitter + jitter * 2 * rnd())
    c.lineTo(Math.cos(a) * rr, Math.sin(a) * rr)
  }
  c.closePath()
  c.fill()
}

function paint(c: Ctx) {
  c.clearRect(0, 0, C * ATLAS_COLS, C * ATLAS_COLS)
  cell(c, CELL.dot, (c) => radial(c, 24, [[0, 1], [0.25, 0.85], [0.6, 0.25], [1, 0]]))
  cell(c, CELL.sparkA, (c) => {
    radial(c, 12, [[0, 0.9], [1, 0]])
    c.fillStyle = "rgba(255,255,255,1)"
    star(c, 4, 24, 3.5, -Math.PI / 2)
  })
  cell(c, CELL.sparkB, (c) => {
    radial(c, 9, [[0, 0.8], [1, 0]])
    c.fillStyle = "rgba(255,255,255,0.9)"
    star(c, 4, 14, 2.5, -Math.PI / 4)
  })
  cell(c, CELL.ember, (c) => radial(c, 16, [[0, 1], [0.35, 1], [0.6, 0.45], [1, 0]]))
  cell(c, CELL.leafA, (c) => leaf(c, 1))
  cell(c, CELL.leafB, (c) => leaf(c, 0.55))
  cell(c, CELL.leafC, (c) => leaf(c, 0.18))
  cell(c, CELL.flake, (c) => {
    radial(c, 10, [[0, 0.9], [1, 0.2]])
    c.strokeStyle = "rgba(255,255,255,1)"
    c.lineWidth = 3
    c.lineCap = "round"
    for (let k = 0; k < 6; k++) {
      const a = (k * Math.PI) / 3
      const [x, y] = [Math.cos(a), Math.sin(a)]
      c.beginPath()
      c.moveTo(0, 0)
      c.lineTo(x * 22, y * 22)
      c.moveTo(x * 12, y * 12)
      c.lineTo(x * 12 + Math.cos(a + 0.8) * 7, y * 12 + Math.sin(a + 0.8) * 7)
      c.moveTo(x * 12, y * 12)
      c.lineTo(x * 12 + Math.cos(a - 0.8) * 7, y * 12 + Math.sin(a - 0.8) * 7)
      c.stroke()
    }
  })
  cell(c, CELL.dust, (c) => {
    c.fillStyle = "rgba(255,255,255,0.95)"
    blob(c, 9, 13, 0.35, 77)
    c.fillStyle = "rgba(255,255,255,0.5)"
    blob(c, 9, 20, 0.3, 91)
  })
  cell(c, CELL.smoke, (c) => {
    radial(c, 26, [[0, 0.75], [0.5, 0.4], [1, 0]])
    for (const [x, y, r] of [[-8, -5, 13], [9, -3, 12], [0, 8, 14]] as const) {
      c.save()
      c.translate(x, y)
      radial(c, r, [[0, 0.35], [1, 0]])
      c.restore()
    }
  })
  cell(c, CELL.techSq, (c) => {
    radial(c, 22, [[0, 0.35], [1, 0]])
    c.strokeStyle = "rgba(255,255,255,1)"
    c.lineWidth = 4
    c.strokeRect(-13, -13, 26, 26)
    c.fillStyle = "rgba(255,255,255,1)"
    c.fillRect(-4, -4, 8, 8)
  })
  cell(c, CELL.techDia, (c) => {
    radial(c, 22, [[0, 0.35], [1, 0]])
    c.rotate(Math.PI / 4)
    c.strokeStyle = "rgba(255,255,255,1)"
    c.lineWidth = 3
    c.strokeRect(-11, -11, 22, 22)
    c.fillStyle = "rgba(255,255,255,1)"
    c.fillRect(-3, -15, 6, 30)
  })
  cell(c, CELL.shard, (c) => {
    c.fillStyle = "rgba(255,255,255,1)"
    c.beginPath()
    c.moveTo(0, -24)
    c.lineTo(7, 0)
    c.lineTo(0, 24)
    c.lineTo(-7, 0)
    c.closePath()
    c.fill()
    radial(c, 14, [[0, 0.6], [1, 0]])
  })
  cell(c, CELL.ash, (c) => {
    c.fillStyle = "rgba(255,255,255,1)"
    blob(c, 7, 16, 0.45, 13)
  })
}

/** O atlas da cena (cria na primeira vez; as camadas dividem). */
export function ambientAtlas(scene: Scene): DynamicTexture {
  const had = byScene.get(scene)
  if (had) return had
  const tex = new DynamicTexture("mm-amb-atlas", { width: C * ATLAS_COLS, height: C * ATLAS_COLS }, scene, true, Texture.TRILINEAR_SAMPLINGMODE)
  paint(tex.getContext() as unknown as Ctx)
  tex.hasAlpha = true
  tex.wrapU = Texture.CLAMP_ADDRESSMODE
  tex.wrapV = Texture.CLAMP_ADDRESSMODE
  tex.update(true)
  byScene.set(scene, tex)
  tex.onDisposeObservable.addOnce(() => byScene.delete(scene))
  return tex
}
