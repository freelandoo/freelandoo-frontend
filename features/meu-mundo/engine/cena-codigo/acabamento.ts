// features/meu-mundo/engine/cena-codigo/acabamento.ts — ACABAMENTO de luz e cor das cenas em código
// (visual premium, Etapa 6 nos Domínios; auditoria `MEU MUNDO 3D/visual-premium/auditoria-dominios.md`).
//
// Tudo SEM chamada de desenho a mais:
//  1. Contato e AO assados na cor do vértice (na montagem): o chão escurece em volta de tudo que tem
//     caixa de colisão (pedra, tronco, parede, prédio) e a base das peças escurece perto do chão — o que
//     parecia "colado" ganha peso. Grade de busca de 8 m: rápido mesmo com centenas de caixas.
//  2. Luz rebatida das peças acesas (lava, lanterna, janela, cristal): o chão e as peças em volta ganham
//     a cor delas, como se a luz batesse ali (iluminação falsa do §9 do prompt, sem luz dinâmica).
//  3. Por cena (`visualDaCena`, a cena aberta lê): luz, névoa (fração da do perfil) e o TRATAMENTO DE COR
//     pelo mesmo método do bairro (E2, `steampunk/atmosphere.ts` `applyGrade`): imageProcessing com
//     ColorCurves no shader do material e a cúpula do céu imitando (`SkyDome.setGrade`) — `aplicarCor`.
//
// Floresta, Cânion, Gelo, Fábrica e Vulcão seguem a cópia das referências do Alex (luz polida em 14/11):
// ali o acabamento só põe contato e luz rebatida — nada de luz, névoa ou cor por cima. Quem polir uma cena
// pelas refs e quiser cor/névoa próprias põe a entrada dela em `VISUAL_CENA` (a Orbital é a única por ora).
//
// Fonte única: o jogo (`open-domain-game.ts`) e a vitrine (`pipeline/pecas-codigo`) montam pelo `montarCena`.

import type { Scene } from "@babylonjs/core/scene"
import { ColorCurves } from "@babylonjs/core/Materials/colorCurves"
import type { RGB } from "./kit"
import type { Cena } from "./kit-cena"

/** Tratamento de cor (mesmos campos do `Grade` do bairro; 1 / 0 = neutro). */
export interface CorCena {
  exposure: number
  contrast: number
  /** ColorCurves.globalSaturation (−100…100). */
  saturation: number
  /** Densidade do azul nas sombras e do âmbar nas luzes (0–100). */
  coolShadows: number
  warmLights: number
}

export interface VisualCena {
  cor?: CorCena
  /** Luz da cena (substitui `meta.luz` campo a campo). */
  luz?: { hemi?: number; sol?: number; ceu?: RGB; chao?: RGB; solCor?: RGB }
  /**
   * Luz rebatida das peças ACESAS (lava, lanterna, janela, cristal): o que está perto ganha a cor delas,
   * somada no vértice. Força 0–1 e raio em metros. Padrão: 0,32 / 4 m.
   */
  rebatida?: { forca: number; raio: number }
  /** Névoa: fração do início/fim do perfil de qualidade (1 = como o perfil). */
  nevoa?: { inicio: number; fim: number }
  /** Contato: força (0–1) e alcance máximo em metros. */
  contato?: { forca: number; raio: number }
}

const ORBITAL: VisualCena = {
  // a cena mais lavada: menos exposição, mais contraste e cor (azul/violeta/ciano), chão mais escuro
  luz: { hemi: 0.74, sol: 0.88, ceu: [0.88, 0.9, 1], chao: [0.46, 0.46, 0.62], solCor: [1, 0.96, 0.9] },
  cor: { exposure: 0.86, contrast: 1.22, saturation: 16, coolShadows: 12, warmLights: 6 },
  nevoa: { inicio: 0.8, fim: 1 },
}

/** Por cena (nome do arquivo). Fora da lista = só contato e luz rebatida (padrão). */
export const VISUAL_CENA: Readonly<Record<string, VisualCena>> = {
  // Fábrica de dia: os lampiões só aquecem perto (a força padrão suja o chão em volta)
  "fabrica-1": { rebatida: { forca: 0.2, raio: 3.2 } },
  "fabrica-2": { rebatida: { forca: 0.2, raio: 3.2 } },
  "fabrica-3": { rebatida: { forca: 0.2, raio: 3.2 } },
  "orbital-1": ORBITAL,
  "orbital-2": ORBITAL,
  "orbital-3": ORBITAL,
}

export const visualDaCena = (nome: string): VisualCena | null => VISUAL_CENA[nome] ?? null

/** Nunca exatamente 1: o define CONTRAST/EXPOSURE trocaria e todo material recompilaria (igual ao bairro). */
const off1 = (v: number) => (Math.abs(v - 1) < 0.002 ? 1.002 : v)

/**
 * Tratamento de cor da cena (fixo: a luz dos Domínios não segue o relógio). Devolve o que a cúpula do céu
 * precisa imitar — `sky.setGrade(...)` — para o horizonte casar com a névoa. Sem `cor` = nada muda.
 */
export function aplicarCor(scene: Scene, g: CorCena | undefined): [number, number, number] | null {
  if (!g) return null
  const ip = scene.imageProcessingConfiguration
  ip.exposure = off1(g.exposure)
  ip.contrast = off1(g.contrast)
  const cc = ip.colorCurves ?? new ColorCurves()
  cc.globalSaturation = g.saturation
  cc.shadowsHue = 222
  cc.shadowsDensity = g.coolShadows
  cc.midtonesHue = 220
  cc.midtonesDensity = g.coolShadows * 0.35
  cc.highlightsHue = 36
  cc.highlightsDensity = g.warmLights
  ip.colorCurves = cc
  ip.colorCurvesEnabled = true
  // a cúpula: mesma conta do `Sky.setGrade` do bairro
  return [Math.pow(g.exposure, 1 / 2.2), g.contrast, 1 + g.saturation / 100]
}

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v)
const smooth = (t: number) => {
  const u = clamp01(t)
  return u * u * (3 - 2 * u)
}

/**
 * Assa contato/AO e a luz rebatida nos blocos (`cells`). O pano de fundo, o `horizonte` (a bruma dele é
 * pintada na cor da névoa) e a luz acesa (`glows`) ficam como estão.
 */
export function acabarCena(c: Cena, v: VisualCena | null) {
  const ct = v?.contato ?? { forca: 0.42, raio: 2.2 }
  // grade das caixas altas (só o que tem altura faz sombra de contato)
  const G = 8
  const grid = new Map<string, number[]>()
  const boxes = c.blockers
  boxes.forEach((b, k) => {
    if (b.h < 0.35) return
    const r = Math.hypot(b.hx, b.hz) + ct.raio
    for (let gx = Math.floor((b.x - r) / G); gx <= Math.floor((b.x + r) / G); gx++)
      for (let gz = Math.floor((b.z - r) / G); gz <= Math.floor((b.z + r) / G); gz++) {
        const key = gx + "," + gz
        let l = grid.get(key)
        if (!l) grid.set(key, (l = []))
        l.push(k)
      }
  })
  /** Distância (m) do ponto à caixa mais perta (0 = dentro) e a altura dela. */
  const nearest = (x: number, z: number): [number, number] => {
    const l = grid.get(Math.floor(x / G) + "," + Math.floor(z / G))
    if (!l) return [Infinity, 0]
    let best = Infinity, h = 0
    for (const k of l) {
      const b = boxes[k]
      const dx0 = x - b.x, dz0 = z - b.z
      const cs = Math.cos(-b.rot), sn = Math.sin(-b.rot)
      const lx = Math.abs(dx0 * cs - dz0 * sn) - b.hx
      const lz = Math.abs(dx0 * sn + dz0 * cs) - b.hz
      const d = Math.hypot(Math.max(lx, 0), Math.max(lz, 0))
      if (d < best) {
        best = d
        h = b.h
      }
    }
    return [best, h]
  }
  // luz rebatida: as peças acesas viram pontos de luz numa grade de 2 m (média da cor e quantos vértices)
  const rb = v?.rebatida ?? { forca: 0.32, raio: 4 }
  const GG = 2
  const glowGrid = new Map<string, [number, number, number, number, number, number, number]>() // r,g,b,n,x,y,z
  if (rb.forca > 0)
    for (const g of c.glows.values()) {
      const p = g.p, col = g.c
      for (let i = 0, vi = 0; i < p.length; i += 3, vi += 4) {
        const key = Math.floor(p[i] / GG) + "," + Math.floor(p[i + 2] / GG)
        let e = glowGrid.get(key)
        if (!e) glowGrid.set(key, (e = [0, 0, 0, 0, 0, 0, 0]))
        e[0] += col[vi]
        e[1] += col[vi + 1]
        e[2] += col[vi + 2]
        e[3]++
        e[4] += p[i]
        e[5] += p[i + 1]
        e[6] += p[i + 2]
      }
    }
  const RC = Math.ceil(rb.raio / GG)
  const acc: [number, number, number] = [0, 0, 0]
  const rebate = (x: number, y: number, z: number): [number, number, number] => {
    acc[0] = acc[1] = acc[2] = 0
    const gx = Math.floor(x / GG), gz = Math.floor(z / GG)
    for (let a = -RC; a <= RC; a++)
      for (let bb = -RC; bb <= RC; bb++) {
        const e = glowGrid.get(gx + a + "," + (gz + bb))
        if (!e) continue
        const n = e[3]
        const d = Math.hypot(e[4] / n - x, (e[5] / n - y) * 0.7, e[6] / n - z)
        if (d >= rb.raio) continue
        const f = (1 - d / rb.raio) ** 2 * Math.min(1, n / 8) * rb.forca
        acc[0] += (e[0] / n) * f
        acc[1] += (e[1] / n) * f
        acc[2] += (e[2] / n) * f
      }
    const m = Math.max(acc[0], acc[1], acc[2])
    if (m > rb.forca) {
      const s = rb.forca / m
      acc[0] *= s
      acc[1] *= s
      acc[2] *= s
    }
    return acc
  }
  for (const g of c.cells.values()) {
    const p = g.p, n = g.n, col = g.c
    for (let i = 0, vi = 0; i < p.length; i += 3, vi += 4) {
      const x = p[i], y = p[i + 1], z = p[i + 2]
      const ground = c.height(x, z)
      const up = y - ground
      let k = 1
      if (n[i + 1] > 0.85 && up < 0.09) {
        // chão (ou laje rente): sombra de contato em volta das caixas altas
        const [d, h] = nearest(x, z)
        if (d < ct.raio) {
          const reach = Math.min(ct.raio, 0.7 + h * 0.35)
          if (d < reach) k *= 1 - ct.forca * (1 - smooth(d / reach))
        }
      } else if (up < 0.9) {
        // base das peças: AO rente ao chão (some até 0,9 m)
        k *= 0.68 + 0.32 * smooth(up / 0.9)
      }
      let r = col[vi] * k, gg = col[vi + 1] * k, b = col[vi + 2] * k
      if (glowGrid.size) {
        const [lr, lg, lb] = rebate(x, y, z)
        r += lr
        gg += lg
        b += lb
      }
      col[vi] = clamp01(r)
      col[vi + 1] = clamp01(gg)
      col[vi + 2] = clamp01(b)
    }
  }
}
