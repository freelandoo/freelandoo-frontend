// features/meu-mundo/engine/steampunk/ground-shade.ts
//
// Visual premium E2 (bairro piloto): a SOMBRA DO CHÃO numa textura só, que cobre
// o bairro inteiro pela 2ª UV (projeção no mundo, `GeoBuilder.uv2World`) e entra
// como `ambientTexture` (multiplica a cor final) no chão, na rua, na calçada e
// nos paralelepípedos. Duas camadas, desenhadas uma vez num canvas:
//
//  - VARIAÇÃO: manchas grandes e discretas de terra mais escura, musgo, grama
//    rala e areia clara (3–22 m). Quebram a repetição do ladrilho de 11 m sem
//    mudar o desenho dele; a semente é fixa (mesmo chão em todo aparelho).
//  - OCLUSÃO DE CONTATO: em volta de cada caixa de colisão (casas, muros, postes,
//    bancos, estátuas) um escuro suave que some em 0,5–2,4 m, mais largo para o
//    que é alto. É o "peso" no chão: nada parece flutuar.
//
// Custo: 1 textura (512 no baixo, 1024 no médio/alto = 0,35/1,4 MB sem mipmap…
// com mipmap +33%), uma amostra a mais no shader dos 4 materiais de chão; zero
// malha e zero chamada de desenho. A casa que muda de nível redesenha a camada de
// contato (`redraw`), ~2–6 ms.

import { DynamicTexture } from "@babylonjs/core/Materials/Textures/dynamicTexture"
import { Texture } from "@babylonjs/core/Materials/Textures/texture"
import type { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial"
import type { Scene } from "@babylonjs/core/scene"
import type { Box2 } from "../collision"
import type { QualityTier } from "../quality"
import { rng } from "./palette"

type Ctx2D = CanvasRenderingContext2D
const SIZE: Record<QualityTier, number> = { low: 512, mid: 1024, high: 1024 }

/** Base neutra: a textura sai a 0,9 e o `level` devolve a ~1,0 (há folga para clarear). */
const BASE = 0.9
const LEVEL = 1 / BASE

export interface GroundShadeArea {
  x0: number
  z0: number
  size: number
}

export class GroundShade {
  readonly tex: DynamicTexture
  readonly area: GroundShadeArea
  private readonly S: number

  constructor(
    scene: Scene,
    /** Meia-largura do quadrado coberto (m), centrado na origem. */
    half: number,
    tier: QualityTier,
    private readonly seed = 7311,
  ) {
    this.S = SIZE[tier]
    this.area = { x0: -half, z0: -half, size: 2 * half }
    // sem invertY: a linha 0 do canvas é v = 0 (z = z0), igual à 2ª UV
    this.tex = new DynamicTexture("sp-ground-shade", { width: this.S, height: this.S }, scene, true, Texture.TRILINEAR_SAMPLINGMODE)
    this.tex.wrapU = Texture.CLAMP_ADDRESSMODE
    this.tex.wrapV = Texture.CLAMP_ADDRESSMODE
    this.tex.coordinatesIndex = 1
    this.tex.level = LEVEL
    this.tex.anisotropicFilteringLevel = tier === "low" ? 1 : 4
  }

  /** Liga a sombra nos materiais de chão (antes de congelá-los). */
  attach(mats: StandardMaterial[]) {
    for (const m of mats) m.ambientTexture = this.tex
  }

  /** (Re)desenha as duas camadas. `boxes` = colisão do bairro (as casas inclusas). */
  redraw(boxes: readonly Box2[]) {
    const { S } = this
    const c = this.tex.getContext() as unknown as Ctx2D
    c.setTransform(1, 0, 0, 1, 0, 0)
    c.globalCompositeOperation = "source-over"
    c.globalAlpha = 1
    const g = Math.round(BASE * 255)
    c.fillStyle = `rgb(${g},${g},${g})`
    c.fillRect(0, 0, S, S)
    const px = S / this.area.size // pixels por metro
    // canvas (u, v) = ((x − x0)·px, (z − z0)·px)
    c.setTransform(px, 0, 0, px, -this.area.x0 * px, -this.area.z0 * px)
    this.variation(c)
    this.contact(c, boxes)
    c.setTransform(1, 0, 0, 1, 0, 0)
    this.tex.update(false)
  }

  private variation(c: Ctx2D) {
    const rand = rng(this.seed)
    const { x0, z0, size } = this.area
    // [cor (multiplica), alfa, raio mín–máx (m), quantas por 10 000 m²]
    const kinds: [string, number, number, number, number][] = [
      ["rgb(150,128,100)", 0.32, 4, 14, 2.2], // terra úmida / mais escura
      ["rgb(140,156,108)", 0.3, 3, 11, 1.6], // musgo e grama rala
      ["rgb(255,250,236)", 0.4, 5, 22, 1.4], // areia mais clara, seca
      ["rgb(120,108,96)", 0.22, 1.2, 3.5, 6], // manchinhas (desgaste, cascalho)
    ]
    const area = (size * size) / 10000
    for (const [col, a, rMin, rMax, dens] of kinds) {
      const n = Math.round(dens * area)
      for (let i = 0; i < n; i++) {
        const x = x0 + rand() * size
        const z = z0 + rand() * size
        const r = rMin + (rMax - rMin) * rand() * rand()
        // mancha alongada e girada: não lê como círculo carimbado
        const sx = 0.6 + rand() * 0.8
        const rot = rand() * Math.PI
        c.save()
        c.translate(x, z)
        c.rotate(rot)
        c.scale(sx, 1 / sx)
        const grd = c.createRadialGradient(0, 0, 0, 0, 0, r)
        grd.addColorStop(0, col)
        grd.addColorStop(1, col.replace("rgb", "rgba").replace(")", ",0)"))
        c.globalAlpha = Math.min(1, a * 1.3 * (0.55 + 0.45 * rand()))
        c.fillStyle = grd
        c.fillRect(-r, -r, 2 * r, 2 * r)
        c.restore()
      }
    }
    c.globalAlpha = 1
  }

  private contact(c: Ctx2D, boxes: readonly Box2[]) {
    // camadas crescentes de escuro fraco = degradê sem `filter: blur` (falta no Safari)
    const STEPS = 7
    c.fillStyle = "rgb(24,22,30)"
    for (const b of boxes) {
      const h = b.h ?? 1
      if (h < 0.15) continue
      // peça fina (poste, haste, pilar de grade): anel curto e leve — o poste aceso
      // é fonte de luz, não pode escurecer a própria poça
      const thin = Math.max(b.hx, b.hz) < 0.4
      const spread = thin ? 0.35 : Math.min(2.4, 0.45 + h * 0.32)
      const dark = thin ? 0.22 : Math.min(0.62, 0.34 + h * 0.05)
      const a = 1 - Math.pow(1 - dark, 1 / STEPS)
      c.save()
      c.translate(b.x, b.z)
      // Box2.rot gira no plano xz como rotationY: (x, z) → (x cos + z sin, −x sin + z cos)
      c.rotate(-(b.rot ?? 0))
      c.globalAlpha = a
      for (let k = 0; k < STEPS; k++) {
        const e = (spread * (k + 1)) / STEPS
        const hx = b.hx + e
        const hz = b.hz + e
        c.fillRect(-hx, -hz, 2 * hx, 2 * hz)
      }
      c.restore()
    }
    c.globalAlpha = 1
  }

  dispose() {
    this.tex.dispose()
  }
}
