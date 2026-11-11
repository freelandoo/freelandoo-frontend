// features/meu-mundo/engine/cena-codigo/dominio.ts — base das CENAS DE DOMÍNIO (Domínios v2).
//
// Plano `MEU MUNDO 3D/planos/2026-11-11-dominios-v2.md` e skill `meu-mundo-cenario-codigo`
// (`cenario.md` §9). Toda cena de Domínio é 160 × 160 m (25 blocos de 32 m) e tem o mesmo
// esqueleto de jogo, montado aqui; o TEMA (paleta, relevo, vegetação, marcos, castelo) é de cada
// arquivo de cena:
//   - caminho principal em S/L/U (polilinha da cena) da `entrada` à `saida`, plano em y = 0,
//     com desvios sem saída que levam a algo;
//   - uma CLAREIRA por setor comum ao longo do caminho (a zona do bando solto) e a ARENA do chefe
//     (≥ 18 m de diâmetro, livre) perto da saída; cena 3: o pátio do castelo é o salão do deus;
//   - a borda fechada por caixas (o tema desenha o relevo em cima delas);
//   - máscaras para pintar o chão e decidir onde plantar (`livre`).

import { noise, type RGB, type V3 } from "./kit"
import { type Cena, distPath, inPoly, type XZ } from "./kit-cena"
import { mix, smooth } from "./kit-natureza"

/** Meia-largura da área (160 m). */
export const H = 80
export const AREA = [160, 160] as const

export interface Clareira {
  setor: number
  x: number
  z: number
  r: number
  poly: XZ[]
}

export interface Planta {
  path: XZ[]
  desvios: XZ[][]
  /** Distância ao caminho principal. */
  dPath: (x: number, z: number) => number
  /** Distância a qualquer caminho de andar (principal + desvios). */
  dWalk: (x: number, z: number) => number
  /** Ponto e direção no caminho principal (t = 0–1 pelo comprimento). */
  at: (t: number) => { x: number; z: number; dx: number; dz: number; ang: number }
  arena: { x: number; z: number; r: number }
  clareiras: Clareira[]
  /** Distância até a beira da área (positivo dentro). */
  beira: (x: number, z: number) => number
  /** Dá para plantar aqui? (longe do caminho, fora de clareira, arena, pátio e portões, dentro da área) */
  livre: (x: number, z: number, pad?: number) => boolean
  /** 0–1: quanto o ponto está "aberto" (clareira/arena/pátio) — o chão fica mais claro e liso. */
  aberto: (x: number, z: number) => number
  /** Cena 3: o castelo (pegada, porta e pátio-salão) — null nas outras. */
  castelo: CasteloPlanta | null
  /** Retângulos reservados por peças (portões, marcos): `livre` também os evita. */
  reserva: (x: number, z: number, r: number) => void
}

export interface CasteloPlanta {
  x: number
  z: number
  /** Largura (x) e fundo (z) da pegada inteira. */
  w: number
  d: number
  /** Porta (no meio da frente, virada para −z). */
  porta: { x: number; z: number }
  /** Pátio-salão (andável, aberto para o céu). */
  patio: { x0: number; z0: number; x1: number; z1: number }
}

/**
 * Monta o esqueleto do jogo da cena: caminho, pontos, zonas, arena e borda. `setores` = a faixa da
 * cena (servidor: 1–3, 4–7, 8–10); `boss` = o chefe; `deus` = o setor do deus (cena 3, com castelo).
 * As frações `tZonas` dizem onde fica a clareira de cada setor comum ao longo do caminho.
 */
export function planta(
  c: Cena,
  o: {
    path: XZ[]
    desvios?: XZ[][]
    setores: number[]
    boss: number
    deus?: number
    tZonas?: number[]
    tArena?: number
    /** Raio das clareiras (m). */
    rZona?: number
    rArena?: number
    castelo?: { w: number; d: number; patio: number }
  },
): Planta {
  const { path, setores, boss } = o
  const desvios = o.desvios ?? []
  c.walk.push(path)
  for (const d of desvios) c.walk.push(d)
  const lens: number[] = []
  let total = 0
  for (let k = 0; k < path.length - 1; k++) {
    const L = Math.hypot(path[k + 1][0] - path[k][0], path[k + 1][1] - path[k][1])
    lens.push(L)
    total += L
  }
  const at = (t: number) => {
    let left = Math.max(0, Math.min(1, t)) * total
    for (let k = 0; k < lens.length; k++) {
      if (left <= lens[k] || k === lens.length - 1) {
        const f = Math.min(1, left / (lens[k] || 1))
        const dx = (path[k + 1][0] - path[k][0]) / (lens[k] || 1), dz = (path[k + 1][1] - path[k][1]) / (lens[k] || 1)
        return { x: path[k][0] + (path[k + 1][0] - path[k][0]) * f, z: path[k][1] + (path[k + 1][1] - path[k][1]) * f, dx, dz, ang: Math.atan2(dx, dz) }
      }
      left -= lens[k]
    }
    return { x: path[0][0], z: path[0][1], dx: 0, dz: 1, ang: 0 }
  }
  const dPath = (x: number, z: number) => distPath(x, z, path)
  const dWalk = (x: number, z: number) => {
    let d = dPath(x, z)
    for (const p of desvios) d = Math.min(d, distPath(x, z, p))
    return d
  }
  const beira = (x: number, z: number) => H - Math.max(Math.abs(x), Math.abs(z))
  const oct = (x: number, z: number, r: number): XZ[] => Array.from({ length: 8 }, (_, k) => [x + Math.cos((k / 8) * Math.PI * 2 + 0.39) * r, z + Math.sin((k / 8) * Math.PI * 2 + 0.39) * r] as XZ)

  // ── pontos: entrada e saída nas pontas, olhando para dentro / para fora ──
  const a0 = at(0), a1 = at(1)
  c.ponto("entrada", path[0][0], path[0][1], a0.ang)
  const reservas: { x: number; z: number; r: number }[] = [{ x: path[0][0], z: path[0][1], r: 7 }]

  // ── clareiras dos setores comuns e a arena do chefe ──
  const comuns = setores.filter((s) => s !== boss && s !== o.deus)
  const tz = o.tZonas ?? comuns.map((_, i) => 0.14 + (0.62 * (i + 0.5)) / comuns.length)
  const rz = o.rZona ?? 11
  const clareiras: Clareira[] = comuns.map((s, i) => {
    const p = at(tz[i])
    const cl = { setor: s, x: p.x, z: p.z, r: rz, poly: oct(p.x, p.z, rz) }
    c.zona(s, cl.poly)
    return cl
  })
  let castelo: CasteloPlanta | null = null
  let arena: { x: number; z: number; r: number }
  if (o.castelo) {
    // cena 3: o castelo fecha o fim do caminho; o guardião espera na praça da porta e o deus no pátio
    // o caminho termina no fundo do pátio (a saída, a travessia para o próximo Domínio); os últimos
    // trechos do caminho sobem reto em x = saída (arena → portão → pátio)
    const { w, d, patio } = o.castelo
    const sx = a1.x, sz = a1.z
    const z1 = sz + 3, z0 = z1 - patio
    const wallZ = z0 - 1.5
    const zBack = z1 + Math.max(10, d - patio - 5)
    const zFront = wallZ - 4
    castelo = { x: sx, z: (zFront + zBack) / 2, w, d: zBack - zFront, porta: { x: sx, z: wallZ }, patio: { x0: sx - patio / 2, z0, x1: sx + patio / 2, z1 } }
    const rA = o.rArena ?? 9.5
    arena = { x: sx, z: zFront - rA - 1, r: rA }
    c.ponto("guardiao", arena.x, arena.z + rA * 0.35, Math.PI)
    const P = castelo.patio
    c.ponto("deus", (P.x0 + P.x1) / 2, (P.z0 + P.z1) / 2 + 1, Math.PI)
    c.zona(boss, oct(arena.x, arena.z, rA))
    if (o.deus) c.zona(o.deus, [[P.x0 + 1, P.z0 + 1], [P.x1 - 1, P.z0 + 1], [P.x1 - 1, P.z1 - 1], [P.x0 + 1, P.z1 - 1]])
    c.ponto("saida", path[path.length - 1][0], path[path.length - 1][1], a1.ang)
  } else {
    const p = at(o.tArena ?? 0.86)
    const rA = o.rArena ?? 9.5
    arena = { x: p.x, z: p.z, r: rA }
    c.ponto("chefe", p.x + p.dx * 2, p.z + p.dz * 2, p.ang + Math.PI)
    c.zona(boss, oct(p.x, p.z, rA))
    c.ponto("saida", path[path.length - 1][0], path[path.length - 1][1], a1.ang)
    reservas.push({ x: path[path.length - 1][0], z: path[path.length - 1][1], r: 7 })
  }

  const inPatio = (x: number, z: number, pad = 0) => !!castelo && x > castelo.patio.x0 - pad && x < castelo.patio.x1 + pad && z > castelo.patio.z0 - pad && z < castelo.patio.z1 + pad
  const inCastelo = (x: number, z: number, pad = 0) => !!castelo && Math.abs(x - castelo.x) < castelo.w / 2 + pad && Math.abs(z - castelo.z) < castelo.d / 2 + pad
  const aberto = (x: number, z: number) => {
    let a = smooth(arena.r + 3, arena.r - 1, Math.hypot(x - arena.x, z - arena.z))
    for (const cl of clareiras) a = Math.max(a, smooth(cl.r + 2.5, cl.r - 2, Math.hypot(x - cl.x, z - cl.z)))
    if (inPatio(x, z)) a = 1
    return a
  }
  const livre = (x: number, z: number, pad = 0) => {
    if (beira(x, z) < 0.5) return false
    if (dWalk(x, z) < 2.6 + pad) return false
    if (Math.hypot(x - arena.x, z - arena.z) < arena.r + 1 + pad) return false
    for (const cl of clareiras) if (inPoly(x, z, cl.poly) || Math.hypot(x - cl.x, z - cl.z) < cl.r + pad) return false
    if (inCastelo(x, z, 2 + pad)) return false
    for (const r of reservas) if (Math.hypot(x - r.x, z - r.z) < r.r + pad) return false
    return true
  }

  // ── borda: caixas em volta (o tema desenha o relevo por cima) ──
  const T = 3
  c.block(0, -H + T / 2, H, T / 2, 8)
  c.block(0, H - T / 2, H, T / 2, 8)
  c.block(-H + T / 2, 0, T / 2, H, 8)
  c.block(H - T / 2, 0, T / 2, H, 8)

  return {
    path,
    desvios,
    dPath,
    dWalk,
    at,
    arena,
    clareiras,
    beira,
    livre,
    aberto,
    castelo,
    reserva: (x, z, r) => reservas.push({ x, z, r }),
  }
}

/**
 * Chão do caminho: mistura a cor da trilha pela distância com borda irregular. `w` = meia-largura.
 * Use dentro do `color` do `ground`, depois da base.
 */
export function trilha(col: RGB, x: number, z: number, P: Planta, cor: RGB, w = 2.1, borda?: RGB): RGB {
  const wob = 0.6 * (noise(x * 0.45, 1.3, z * 0.45) - 0.5)
  const d = P.dWalk(x, z) + wob
  if (borda) col = mix(col, borda, smooth(w + 1.4, w + 0.4, d) * 0.6)
  return mix(col, cor, smooth(w + 0.5, w - 0.4, d))
}

/** Pontos ao longo da borda (a cada `passo` m, recuados `dentro` m), com a direção para dentro. */
export function aoLongoDaBorda(passo: number, dentro: number, fn: (x: number, z: number, angDentro: number, k: number) => void) {
  let k = 0
  for (let s = -H + passo / 2; s < H; s += passo) {
    fn(s, -H + dentro, 0, k++)
    fn(s, H - dentro, Math.PI, k++)
    fn(-H + dentro, s, Math.PI / 2, k++)
    fn(H - dentro, s, -Math.PI / 2, k++)
  }
}

/** Gira (lx, lz) por `ang` (ang = direção do "z local" no mundo, como `atan2(dx, dz)`) e soma (x, z). */
export function giro(x: number, z: number, ang: number, lx: number, lz: number): XZ {
  const s = Math.sin(ang), co = Math.cos(ang)
  return [x + lx * co + lz * s, z - lx * s + lz * co]
}

/** V3 no chão a partir de XZ. */
export const v3 = (p: XZ, y = 0): V3 => [p[0], y, p[1]]
