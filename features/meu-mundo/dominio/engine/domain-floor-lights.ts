// features/meu-mundo/dominio/engine/domain-floor-lights.ts — LUZES NO CHÃO DOS DOMÍNIOS (2026-11-22).
//
// Pedido do Alex: trazer para os Domínios o que deu certo no Rolê Noturno e na Gincana. Aqui é a
// luz do chão (`engine/floor-lights.ts`, a mesma do Paint e da Gincana), lida da PRÓPRIA cena
// (nada a mais no arquivo de cada cena): a beira da trilha acesa em fita contínua, a seta de luz no
// meio da trilha nos Domínios de vento/máquina/fogo/cristal, um anel e um emblema em cada clareira
// (a zona do bando: o disco da Gincana), o anel maior da arena do chefe, o emblema da entrada, da
// saída e do salão do deus. Uma malha e uma chamada de desenho por cena (ALPHA_ADD, sem névoa).
//
// Cada Domínio tem a sua cor (não é o neon do Rolê colado): Floresta da Lua = luar lilás, sem
// seta; Cânion = ciano dos cristais com a seta do vento; Gelo = azul-gelo, sem seta; Fábrica =
// âmbar de lâmpada com a seta de esteira; Vulcão = brasa; Orbital = rosa com seta ciano.

import type { Scene } from "@babylonjs/core/scene"
import { Matrix } from "@babylonjs/core/Maths/math.vector"
import { FloorLights, type FloorLightLook } from "../../engine/floor-lights"
import type { Cena, XZ } from "../../engine/cena-codigo"

export type DomainFloorTheme = "floresta" | "canion" | "gelo" | "fabrica" | "vulcao" | "orbital"

interface DomainFloorStyle {
  look: FloorLightLook
  /** Seta de luz no meio da trilha (faixa estreita com os dois filetes e a seta). */
  centro: boolean
  /** Largura da fita da beira (m). */
  fita: number
  /** Força de dia (a noite é 1). */
  dia: number
}

export const DOMAIN_FLOOR: Record<DomainFloorTheme, DomainFloorStyle> = {
  floresta: {
    look: { line: [0.56, 0.8, 1], chev: [[0.9, 0.96, 1], [0.62, 0.52, 1]], dot: [0.55, 1, 0.95], seam: null, lanes: [], chevrons: false, k: 0.95 },
    centro: false,
    fita: 0.42,
    dia: 1,
  },
  canion: {
    look: { line: [0.4, 0.95, 1], chev: [[0.9, 1, 1], [0.3, 0.72, 1]], dot: [1, 0.86, 0.5], seam: null, lanes: [], chevrons: true, k: 1.15 },
    centro: true,
    fita: 0.4,
    // chão claro de dia: soma demais estoura para branco
    dia: 0.7,
  },
  gelo: {
    look: { line: [0.5, 0.88, 1], chev: [[0.95, 1, 1], [0.45, 0.8, 1]], dot: [0.85, 0.96, 1], seam: null, lanes: [], chevrons: false, k: 0.75 },
    centro: false,
    fita: 0.44,
    dia: 0.85,
  },
  fabrica: {
    look: { line: [1, 0.7, 0.26], chev: [[1, 0.95, 0.62], [1, 0.48, 0.1]], dot: [1, 0.86, 0.42], seam: [1, 0.6, 0.2], lanes: [], chevrons: true, k: 1.2 },
    centro: true,
    fita: 0.4,
    dia: 0.85,
  },
  vulcao: {
    look: { line: [1, 0.4, 0.08], chev: [[1, 0.86, 0.42], [1, 0.26, 0.04]], dot: [1, 0.62, 0.2], seam: null, lanes: [], chevrons: true, k: 1.1 },
    centro: true,
    fita: 0.46,
    dia: 1,
  },
  orbital: {
    look: { line: [1, 0.48, 0.86], chev: [[0.78, 0.97, 1], [0.32, 0.62, 1]], dot: [0.6, 0.95, 1], seam: null, lanes: [], chevrons: true, k: 0.8 },
    centro: true,
    fita: 0.4,
    // mármore branco: força baixa (a cor fica nas balizas)
    dia: 0.7,
  },
}

/** Meia-largura da trilha pintada de cada cena (a fita fica na beira). */
const BEIRA: Record<string, number> = {
  "floresta-1": 2.75,
  "floresta-2": 2.75,
  "floresta-3": 2.65,
  "canion-3": 2.75,
  "gelo-2": 2.55,
  "gelo-3": 2.55,
  "vulcao-3": 2.55,
  "fabrica-3": 2.55,
  "orbital-3": 2.55,
}

export function domainFloorTheme(cenaName: string): DomainFloorTheme | null {
  const t = cenaName.split("-")[0]
  return t in DOMAIN_FLOOR ? (t as DomainFloorTheme) : null
}

/**
 * Monta as luzes do chão da cena de Domínio `cena` (já pronta). Devolve null se a cena não é de
 * um dos seis Domínios. `night` = céu da noite (dia: força menor).
 */
export function buildDomainFloorLights(scene: Scene, cena: Cena, o: { low: boolean; night: boolean }): FloorLights | null {
  const theme = domainFloorTheme(cena.name)
  if (!theme || !cena.walk.length) return null
  const st = DOMAIN_FLOOR[theme]
  const fl = new FloorLights(scene, `dom-${cena.name}`, st.look, { low: o.low })
  const hAt = (x: number, z: number) => Math.max(0, cena.height(x, z))

  // ── zonas (clareiras e arena) e salão do deus ──
  const zonas = cena.zonas.map((zn) => {
    let cx = 0, cz = 0
    for (const [x, z] of zn.poly) {
      cx += x / zn.poly.length
      cz += z / zn.poly.length
    }
    let r = 0
    for (const [x, z] of zn.poly) r = Math.max(r, Math.hypot(x - cx, z - cz))
    return { cx, cz, r, rect: zn.poly.length === 4 }
  })
  const P = cena.castelo?.patio
  const inPatio = (x: number, z: number, pad = 0) => !!P && x > P.x0 - pad && x < P.x1 + pad && z > P.z0 - pad && z < P.z1 + pad
  const inCastelo = (x: number, z: number) => {
    const K = cena.castelo
    return !!K && Math.abs(x - K.x) < K.w / 2 + 1 && Math.abs(z - K.z) < K.d / 2 + 1
  }
  const pts = [cena.pontos.entrada, cena.pontos.saida].filter(Boolean)
  /** Fora da fita: dentro de clareira/arena (tem o anel), no castelo e na boca dos portais. */
  const fora = (x: number, z: number) => {
    for (const zn of zonas) if (!zn.rect && Math.hypot(x - zn.cx, z - zn.cz) < zn.r + 0.6) return true
    if (inCastelo(x, z) || inPatio(x, z, 1)) return true
    for (const p of pts) if (Math.hypot(x - p.x, z - p.z) < 4.5) return true
    return false
  }

  // ── fitas da beira: as duas bordas de cada caminho, amostradas de 1 em 1 m ──
  const meia = BEIRA[cena.name] ?? 2.35
  const main = cena.walk[0]
  const distMain = (x: number, z: number) => {
    let best = Infinity
    for (let k = 0; k < main.length - 1; k++) {
      const [ax, az] = main[k], [bx, bz] = main[k + 1]
      const dx = bx - ax, dz = bz - az
      const t = Math.min(1, Math.max(0, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz || 1)))
      best = Math.min(best, Math.hypot(x - ax - dx * t, z - az - dz * t))
    }
    return best
  }
  const sample = (path: readonly XZ[]) => {
    const out: { x: number; z: number; dx: number; dz: number }[] = []
    for (let k = 0; k < path.length - 1; k++) {
      const [ax, az] = path[k], [bx, bz] = path[k + 1]
      const L = Math.hypot(bx - ax, bz - az)
      const n = Math.max(1, Math.round(L))
      for (let s = 0; s < n; s++) out.push({ x: ax + ((bx - ax) * s) / n, z: az + ((bz - az) * s) / n, dx: (bx - ax) / L, dz: (bz - az) / L })
    }
    const [lx, lz] = path[path.length - 1]
    const last = out[out.length - 1]
    if (last) out.push({ x: lx, z: lz, dx: last.dx, dz: last.dz })
    return out
  }
  cena.walk.forEach((path, pi) => {
    const s = sample(path)
    // direção suavizada (média de 5 amostras): a beira faz curva em vez de quina
    const dir = s.map((_, i) => {
      let dx = 0, dz = 0
      for (let j = Math.max(0, i - 2); j <= Math.min(s.length - 1, i + 2); j++) {
        dx += s[j].dx
        dz += s[j].dz
      }
      const L = Math.hypot(dx, dz) || 1
      return [dx / L, dz / L] as const
    })
    for (const lado of [-1, 1]) {
      let run: [number, number, number][] = []
      const flush = () => {
        if (run.length >= 3) fl.ribbon(run, st.fita)
        run = []
      }
      s.forEach((p, i) => {
        const [dx, dz] = dir[i]
        const x = p.x - dz * meia * lado, z = p.z + dx * meia * lado
        // desvio: a beira some no trecho que encosta no caminho principal
        const off = fora(x, z) || fora(p.x, p.z) || (pi > 0 && distMain(x, z) < meia + 0.8)
        if (off) return flush()
        run.push([x, hAt(x, z) + 0.035, z])
      })
      flush()
    }
  })

  // ── seta no meio da trilha (trechos retos do caminho principal, longe das quinas) ──
  if (st.centro) {
    for (let k = 0; k < main.length - 1; k++) {
      const [ax, az] = main[k], [bx, bz] = main[k + 1]
      const L = Math.hypot(bx - ax, bz - az)
      if (L < 8) continue
      const dx = (bx - ax) / L, dz = (bz - az) / L
      const ang = Math.atan2(dx, dz)
      // corta o trecho nos pedaços livres (clareira, portal, castelo ficam fora)
      let t0: number | null = null
      const emit = (ta: number, tb: number) => {
        const a = ta + 2.5, b = tb - 2.5
        if (b - a < 4.5) return
        const mid = (a + b) / 2
        const cx = ax + dx * mid, cz = az + dz * mid
        const frame = Matrix.RotationY(ang).multiply(Matrix.Translation(cx, 0, cz))
        fl.strip(frame, 1.35, b - a, 0.03, 4.5)
      }
      for (let t = 0; t <= L; t += 1) {
        const x = ax + dx * t, z = az + dz * t
        const ok = !fora(x, z)
        if (ok && t0 === null) t0 = t
        if (!ok && t0 !== null) {
          emit(t0, t)
          t0 = null
        }
      }
      if (t0 !== null) emit(t0, L)
    }
  }

  // ── clareiras e arena: anel na beira + emblema no meio (o disco da Gincana) ──
  const lutador = [cena.pontos.chefe, cena.pontos.guardiao].filter(Boolean)
  for (const zn of zonas) {
    if (zn.rect) continue
    const arena = lutador.some((p) => Math.hypot(p.x - zn.cx, p.z - zn.cz) < zn.r + 2)
    let y = 0
    for (let k = 0; k < 16; k++) {
      const a = (k / 16) * Math.PI * 2
      y = Math.max(y, hAt(zn.cx + Math.sin(a) * zn.r, zn.cz + Math.cos(a) * zn.r))
    }
    y = Math.max(y, hAt(zn.cx, zn.cz)) + 0.04
    fl.ring(zn.cx, y, zn.cz, zn.r - 0.6, 0, arena ? 0.6 : 0.5, 48)
    if (arena) fl.ring(zn.cx, y, zn.cz, zn.r - 1.8, 0, 0.3, 48)
    fl.emblem(zn.cx, y + 0.005, zn.cz, arena ? Math.min(6, zn.r * 0.55) : Math.min(4, zn.r * 0.36), arena ? Math.PI / 8 : 0)
  }
  // entrada e saída (a boca do portal) e o salão do deus
  for (const p of pts) fl.emblem(p.x, hAt(p.x, p.z) + 0.04, p.z, 2.4, p.ang)
  const deus = cena.pontos.deus
  if (deus && P) {
    const r = Math.min(P.x1 - P.x0, P.z1 - P.z0) / 2
    fl.emblem(deus.x, hAt(deus.x, deus.z) + 0.05, deus.z, Math.min(6.5, r * 0.6), Math.PI / 4)
    fl.ring(deus.x, hAt(deus.x, deus.z) + 0.05, deus.z, Math.min(8, r * 0.82), 0, 0.5, 48)
  }

  if (fl.empty) {
    fl.dispose()
    return null
  }
  fl.build(`dom-${cena.name}-floorlights`)
  fl.setLevel(o.night ? 1 : st.dia)
  return fl
}

/** Respiração lenta das luzes (chamar no quadro). */
export function tickDomainFloorLights(fl: FloorLights | null, t: number) {
  fl?.tick(t)
}
