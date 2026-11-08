// features/meu-mundo/paint/sim/maps.ts — PAINT (mm3d-76): o CATÁLOGO de mapas.
//
// Pedido do Alex (prompt da expansão + referências em Downloads/fases paint):
// a Cidade Suspensa de sempre e mais 5 mapas, cada um com ilhas de FORMA
// própria (hexágono, triângulo, retângulo, folha, pedaço de arco/meia-lua),
// subida de verdade e as quatro tintas úteis. Aqui só a REGRA de cada um
// (onde fica cada ilha, gatinho, cápsula, portal, enfeite que colide); nome,
// cores, cartão e o desenho do tema ficam em engine/paint-map-art.ts e
// engine/arena-view.ts. O servidor roda este mesmo arquivo (gerado por
// scripts/build-paint-sim.js no back): mudou → regerar e commitar os dois.
//
// Regras de desenho de fase (as mesmas da Cidade, conferidas no teste):
//  - lado do time 0 em x < 0; o do time 1 é o ESPELHO (x → −x) — nenhum time
//    começa com vantagem; o meio (time −1) é simétrico (peça em x = 0 ou par);
//  - 18 gatinhos de cada lado + 12 no meio = 48 (o portal pede 20: quem não
//    sai do próprio lado não chega lá); 2×2 e 3×3 ganham rodadas a mais;
//  - na ROTA de cada time (base → portal) todo degrau para cima tem até 3,8 m
//    (cama elástica + pulo no ar), todo vão até ~11 m (ponte), e quem sobe
//    chega por um LADO da ilha (não por uma ponta);
//  - os dois portais ficam no alto do meio (em cada mapa novo os times se
//    encontram lá em cima); a ilha do chefão é a mesma em todos.
//
// Formas (todas convexas — a colisão é o prisma `SolidPoly`):
//  { c }            círculo de raio c
//  { n, r, rot?, sx?, sz?, j? }  polígono regular (6 = hexágono, 3 = triângulo,
//                   10 = engrenagem/folha com sx/sz esticando antes de girar;
//                   j = cantos fora do lugar no círculo — rocha irregular)
//  { w, d, rot? }   retângulo (rot em graus)
//  { arc: [R0, R1, a0, a1] }  pedaço de anel em volta de (x, z) da peça (graus,
//                   0 = +z, 90 = +x); a borda de dentro é reta (fica convexo)

import { PAINT_MODES, type PaintMode } from "./tuning"
import {
  BOSS,
  bossIsland,
  buildCidadeMap,
  hash01,
  polyCenter,
  polySolid,
  round,
  staticSolids,
  type Island,
  type IslandKind,
  type PaintBase,
  type PaintCapsule,
  type PaintCat,
  type PaintMap,
  type PaintProp,
  type Vec3,
} from "./map"

type Shape =
  | { c: number }
  | { n: number; r: number; rot?: number; sx?: number; sz?: number; j?: number }
  | { w: number; d: number; rot?: number }
  | { arc: [number, number, number, number] }

/** Enfeite que colide: tipo, deslocamento do centro da ilha, altura, tamanho, giro (graus), meia-largura, desenho. */
type PropDef = [PaintProp["kind"], number, number, number, number, number?, number?, string?]

interface Piece {
  k: IslandKind
  x: number
  y: number
  z: number
  s: Shape
  tag?: string
  /** Quantos gatinhos (espalhados no círculo de dentro) ou onde (deslocamento do centro). */
  cats?: number | [number, number][]
  caps?: PaintCapsule["c"][]
  props?: PropDef[]
  /** Peça do meio definida na metade oeste: nasce também o espelho (as duas são do meio). */
  pair?: boolean
}

interface ArenaDef {
  id: string
  v: number
  /** Lado do time 0 (x < 0). A primeira é a BASE. */
  side: Piece[]
  /** Meio (time −1). */
  mid: Piece[]
  /** Portal do time 0 (o do time 1 é o espelho), em cima de uma ilha do meio. */
  portal: Vec3
  /** Rota do time 0: "s3" = peça 3 do lado, "m2" = peça 2 do meio (com `pair`, o time 1 usa o espelho). */
  route: string[]
}

const D2R = Math.PI / 180

/** Contorno (no chão, em volta de 0,0 — o arco em volta do centro da peça). */
function outline(s: Shape): number[] {
  const pts: number[] = []
  if ("c" in s) {
    const n = Math.max(14, Math.min(40, Math.round(s.c * 4)))
    for (let i = 0; i < n; i++) pts.push(Math.sin((i / n) * Math.PI * 2) * s.c, Math.cos((i / n) * Math.PI * 2) * s.c)
  } else if ("arc" in s) {
    const [R0, R1, a0, a1] = s.arc
    const steps = Math.max(2, Math.ceil((a1 - a0) / 6))
    for (let i = 0; i <= steps; i++) {
      const a = (a0 + ((a1 - a0) * i) / steps) * D2R
      pts.push(Math.sin(a) * R1, Math.cos(a) * R1)
    }
    pts.push(Math.sin(a1 * D2R) * R0, Math.cos(a1 * D2R) * R0, Math.sin(a0 * D2R) * R0, Math.cos(a0 * D2R) * R0)
  } else if ("w" in s) {
    const r = (s.rot ?? 0) * D2R
    const c = Math.cos(r)
    const n = Math.sin(r)
    for (const [lx, lz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
      const x = (lx * s.w) / 2
      const z = (lz * s.d) / 2
      pts.push(x * c + z * n, -x * n + z * c)
    }
  } else {
    // estica (sx, sz) e depois gira (rot), como o retângulo; j = cantos
    // deslocados NO círculo (continua convexo)
    const r = (s.rot ?? 0) * D2R
    const c = Math.cos(r)
    const sn = Math.sin(r)
    const sx = s.sx ?? 1
    const sz = s.sz ?? 1
    for (let i = 0; i < s.n; i++) {
      const a = ((i + (s.j ? (hash01(i * 13 + s.n * 7 + Math.round(s.r * 10)) - 0.5) * s.j : 0)) / s.n) * Math.PI * 2
      const x = Math.sin(a) * s.r * sx
      const z = Math.cos(a) * s.r * sz
      pts.push(x * c + z * sn, -x * sn + z * c)
    }
  }
  return pts.map(round)
}

/** Raio do círculo que cabe dentro do contorno, em volta do centro dele. */
function inradius(pts: readonly number[]) {
  const s = polySolid(pts, 0, 1)
  let r = Infinity
  for (let i = 0; i < s.d.length; i++) r = Math.min(r, s.d[i] - (s.n[i * 2] * s.x + s.n[i * 2 + 1] * s.z))
  return round(r)
}

function buildArena(def: ArenaDef, mode: PaintMode): PaintMap {
  const islands: Island[] = []
  const props: PaintProp[] = []
  const cats: PaintCat[] = []
  const capsules: PaintCapsule[] = []
  const bases: PaintBase[] = []
  const portals: Vec3[] = []

  /** Cria a ilha da peça (espelhada em x quando `mirror`). */
  const make = (p: Piece, team: number, mirror: boolean): Island => {
    const sx = mirror ? -1 : 1
    const local = outline(p.s)
    const pts: number[] = []
    for (let i = 0; i < local.length; i += 2) pts.push(round((p.x + local[i]) * sx), round(p.z + local[i + 1]))
    const c = polyCenter(pts)
    const r = inradius(pts)
    const isl: Island = {
      id: islands.length,
      kind: p.k,
      team,
      x: round(c.x),
      y: p.y,
      z: round(c.z),
      r,
      depth: round(Math.min(r * 2.2, polySolid(pts, 0, 1).r) * 1.15 + 1.6),
      poly: pts,
    }
    if (p.tag) isl.tag = p.tag
    islands.push(isl)
    // enfeites que colidem (deslocamento do centro do contorno)
    for (const [kind, dx, dz, h, s, rot, w, tag] of p.props ?? []) {
      const pr: PaintProp = { kind, x: round(isl.x + dx * sx), y: p.y, z: round(isl.z + dz), s, h, rot: round((rot ?? 0) * D2R * sx) }
      if (w) pr.w = w
      if (tag) pr.tag = tag
      props.push(pr)
    }
    // gatinhos e cápsulas: no círculo de dentro (nunca no ar nem na borda)
    const seed = islands.length * 7 + 3
    const spots = Array.isArray(p.cats)
      ? p.cats.map(([dx, dz]) => ({ x: isl.x + dx * sx, z: isl.z + dz }))
      : Array.from({ length: p.cats ?? 0 }, (_, i) => {
          const a = i * 2.39996 + seed * 0.37
          return { x: isl.x + Math.sin(a) * r * 0.45 * sx, z: isl.z + Math.cos(a) * r * 0.45 }
        })
    for (const q of spots) cats.push({ id: cats.length, x: round(q.x), y: p.y, z: round(q.z), skin: ((cats.length + 1) % 3 === 0 ? 1 : 0) as 0 | 1, facing: round(hash01(cats.length * 7 + 10) * Math.PI * 2) })
    ;(p.caps ?? []).forEach((cc, i) => {
      const a = i * 2.1 + seed * 0.53 + 1.2
      capsules.push({ id: capsules.length, c: cc, x: round(isl.x + Math.sin(a) * r * 0.62 * sx), y: p.y, z: round(isl.z + Math.cos(a) * r * 0.62) })
    })
    return isl
  }

  // os dois lados (o time 1 é o espelho), depois o meio
  const sideIds: number[][] = [[], []]
  for (const team of [0, 1]) {
    def.side.forEach((p, i) => {
      const isl = make(p, team, team === 1)
      sideIds[team].push(isl.id)
      if (i === 0) {
        const sx = team === 0 ? -1 : 1
        const facing = round(Math.atan2(-sx, 0))
        const spawns = [0, 1, 2].map((k) => ({ x: round(isl.x - sx * 2.5), y: isl.y, z: round(isl.z + (k - 1) * 2.2), facing }))
        bases.push({ team, island: isl.id, spawns })
      }
    })
  }
  const midIds: number[][] = [[], []]
  for (const p of def.mid) {
    const a = make(p, -1, false)
    const b = p.pair ? make(p, -1, true) : a
    midIds[0].push(a.id)
    midIds[1].push(b.id)
  }
  portals.push({ x: def.portal.x, y: def.portal.y, z: def.portal.z }, { x: -def.portal.x, y: def.portal.y, z: def.portal.z })

  // rodadas a mais de gatinhos (2×2, 3×3): mesma conta da Cidade
  const rounds = PAINT_MODES[mode]
  const side = [0, 1].map((team) => sideIds[team].slice(1).map((id) => islands[id]))
  const middle = islands.filter((i) => i.team === -1)
  const extra = (isl: Island, ang: number, mirror: boolean) => {
    const s = mirror ? -1 : 1
    cats.push({ id: cats.length, x: round(isl.x + Math.sin(ang) * isl.r * 0.42 * s), y: isl.y, z: round(isl.z + Math.cos(ang) * isl.r * 0.42), skin: ((cats.length + 1) % 3 === 0 ? 1 : 0) as 0 | 1, facing: round(hash01(cats.length * 7 + 10) * Math.PI * 2) })
  }
  for (let k = 1; k < rounds; k++) {
    for (let j = 0; j < 18; j++) {
      const at = (k * 5 + j * 2) % side[0].length
      const ang = j * 2.39996 + k * 1.1
      extra(side[0][at], ang, false)
      extra(side[1][at], ang, true)
    }
    for (let j = 0; j < 12; j++) extra(middle[(k * 3 + j) % middle.length], j * 2.39996 + k * 0.7, false)
  }

  const boss = bossIsland(islands, capsules)
  const ref = (team: number, r: string) => (r[0] === "s" ? sideIds[team][Number(r.slice(1))] : midIds[team][Number(r.slice(1))])
  return {
    id: def.id,
    v: def.v,
    islands,
    props,
    solids: staticSolids(islands, props),
    cats,
    capsules,
    bases,
    portals,
    boss,
    routes: [0, 1].map((team) => def.route.map((r) => ref(team, r))),
  }
}

/** Pedaços de anel em volta de (cx, cz), de `a0` a `a1` (graus), com vão entre eles e subindo `dy` a cada um. */
function arcRun(cx: number, cz: number, R0: number, R1: number, a0: number, span: number, gap: number, n: number, y0: number, dy: number, extra: Partial<Piece> = {}): Piece[] {
  return Array.from({ length: n }, (_, i) => {
    const a = a0 + i * (span + gap)
    return { k: "path" as IslandKind, x: cx, z: cz, y: round(y0 + i * dy), s: { arc: [R0, R1, a, a + span] as [number, number, number, number] }, ...extra }
  })
}

/** Ponto no anel de raio R (graus, 0 = +z). */
const onRing = (R: number, deg: number) => ({ x: round(Math.sin(deg * D2R) * R), z: round(Math.cos(deg * D2R) * R) })

// ═══ 2. JARDIM ESPIRAL ═══════════════════════════════════════════════════════
// Ruínas brancas sobre as nuvens. Cada time sobe a MEIA-LUA de terraços em
// volta da base (5 pedaços de anel, 2,6 m cada), atravessa o abismo até o
// anel de fora da grande ESPIRAL do meio e sobe: anel de fora até o patamar
// NORTE (os dois times se encontram ali), anel de dentro até o patamar SUL e
// o templo no alto (os dois portais). Embaixo, rota alternativa pelo sul:
// meia-lua baixa, o terraço com corredor de ruínas (muro azul fecha) e os
// jardins soltos.
const JR = (deg: number, R: number, y: number, extra: Partial<Piece> = {}): Piece => ({ k: "center", ...onRing(R, deg), y, s: { n: 6, r: 3.6, rot: 30 }, tag: "plinth", ...extra })
export const JARDIM: ArenaDef = {
  id: "jardim",
  v: 1,
  side: [
    // s0 base hexagonal
    { k: "base", x: -46, y: 0, z: 0, s: { n: 6, r: 10, rot: 30 }, tag: "garden", cats: [[3, 5.5], [3, -5.5]], caps: [0, 1, 2, 3], props: [["pillar", -6.2, 3.6, 2.4, 0.42, 0, 0, "column"], ["pillar", -6.2, -3.6, 2.4, 0.42, 0, 0, "column"]] },
    // s1–s5 a meia-lua norte subindo (rota)
    ...arcRun(-46, 0, 13, 18.5, -70, 20, 8, 5, 1.2, 2.6, { tag: "terrace", cats: 1, caps: [0] }),
    // s6–s8 meia-lua sul, baixa (rota alternativa)
    ...arcRun(-46, 0, 13, 18, 118, 20, 9, 3, 1.0, 1.5, { k: "wing", tag: "terrace", cats: 1, caps: [2] }),
    // s9 terraço com corredor de ruínas (dois muros baixos: o muro de tinta fecha a passagem)
    { k: "branch", x: -27, y: 5.4, z: -15, s: { w: 13, d: 7 }, tag: "ruins", cats: [[-5.6, 0], [5, 0]], props: [["crate", -1.5, 2.6, 1.6, 0.35, 0, 3.4, "ruinwall"], ["crate", -1.5, -2.6, 1.6, 0.35, 0, 3.4, "ruinwall"]] },
    // s10 ruínas hexagonais (ícone da Freelandoo)
    { k: "branch", x: -18, y: 8.2, z: -26, s: { n: 6, r: 4.6 }, tag: "ruins", cats: 2, caps: [3, 1], props: [["pillar", 2.4, 1.6, 2.2, 0.4, 0, 0, "column"]] },
    // s11–s13 jardins soltos (só de ponte ou cama elástica)
    { k: "wing", x: -60, y: 4.5, z: -14, s: { c: 2.6 }, tag: "garden", cats: 1 },
    { k: "wing", x: -34, y: 10.5, z: 26, s: { n: 5, r: 3 }, tag: "garden", cats: 2, caps: [2] },
    { k: "wing", x: -64, y: 7.5, z: 16, s: { c: 2.4 }, tag: "garden", cats: 1 },
  ],
  mid: [
    // m0–m1 anel de fora (pares), m2 patamar NORTE
    JR(-90, 19, 14.2, { pair: true, caps: [1] }),
    JR(-45, 19, 16.8, { pair: true }),
    { k: "center", x: 0, y: 19.4, z: 19, s: { n: 6, r: 4.6, rot: 30 }, tag: "plinth", cats: 2, caps: [3] },
    // m3–m5 anel de dentro (pares), m6 patamar SUL
    JR(45, 11, 22, { pair: true, cats: 1 }),
    JR(90, 11, 24.6, { pair: true, cats: 1, caps: [2] }),
    JR(135, 11, 27.2, { pair: true, cats: 1 }),
    { k: "center", x: 0, y: 29.8, z: -11, s: { n: 6, r: 4.2, rot: 30 }, tag: "plinth", cats: 2, caps: [0] },
    // m7 o templo no alto (os dois portais)
    { k: "summit", x: 0, y: 32.4, z: 0, s: { n: 8, r: 5.6, rot: 22.5 }, tag: "temple" },
    // m8 jardins do meio, embaixo (norte e sul)
    { k: "center", x: 0, y: 6, z: 31, s: { n: 6, r: 3.4 }, tag: "garden", cats: 1 },
    { k: "center", x: 0, y: 7, z: -29, s: { n: 6, r: 3.4, rot: 30 }, tag: "garden", cats: 1 },
  ],
  portal: { x: -2.6, y: 32.4, z: 0 },
  route: ["s0", "s1", "s2", "s3", "s4", "s5", "m0", "m1", "m2", "m3", "m4", "m5", "m6", "m7"],
}

// ═══ 3. FÁBRICA SUSPENSA ═════════════════════════════════════════════════════
// Uma máquina colossal no vazio. Cada time sobe o ANDAIME de chapas
// retangulares empilhadas (zigue-zague norte/sul, uma chapa em cima da outra:
// 6,8 m — dá para ficar embaixo da de cima), corre a ESTEIRA estreita até o
// meio e sobe as chapas presas por correntes até a grande ENGRENAGEM do alto
// (os dois portais). Embaixo, o pátio da engrenagem grande do meio e as pistas
// de esteira norte/sul (rotas alternativas e os gatinhos disputados).
export const FABRICA: ArenaDef = {
  id: "fabrica",
  v: 1,
  side: [
    // s0 doca (base)
    { k: "base", x: -48, y: 0, z: 0, s: { w: 20, d: 16 }, tag: "dock", cats: [[-4, 5], [-4, -5]], caps: [0, 1, 2, 3], props: [["crate", -8, 6, 1.2, 0.6, 0, 0, "crate"], ["crate", -8, -6, 1.2, 0.6, 0, 0, "crate"]] },
    // s1–s5 o andaime em zigue-zague (rota)
    { k: "path", x: -30, y: 2.4, z: 13, s: { w: 8, d: 6 }, tag: "plate", cats: 1, caps: [0] },
    { k: "path", x: -30, y: 5.8, z: -3, s: { w: 8, d: 6 }, tag: "plate", cats: 1, caps: [2] },
    { k: "path", x: -30, y: 9.2, z: 13, s: { w: 8, d: 6 }, tag: "plate", cats: 1 },
    { k: "path", x: -30, y: 12.6, z: -3, s: { w: 8, d: 6 }, tag: "plate", cats: 1, caps: [1] },
    { k: "path", x: -30, y: 16, z: 13, s: { w: 8, d: 6 }, tag: "plate", cats: 1, caps: [2] },
    // s6 a esteira estreita até o meio
    { k: "path", x: -18, y: 18.4, z: 13, s: { w: 12, d: 3.6 }, tag: "conveyor", cats: 1 },
    // s7–s12 pistas de baixo, engrenagens e chapas de manutenção
    { k: "wing", x: -38, y: 2, z: 26, s: { w: 10, d: 3.6 }, tag: "conveyor", cats: 1 },
    { k: "wing", x: -24, y: 4.2, z: 28, s: { n: 10, r: 4 }, tag: "gear", cats: 2, caps: [3] },
    { k: "wing", x: -36, y: 1.5, z: -18, s: { w: 8, d: 8 }, tag: "plate", cats: [[-2, -2], [2, 2]], props: [["crate", -2.6, 2.6, 1.1, 0.55, 0, 0, "crate"]] },
    { k: "wing", x: -22, y: 5, z: -24, s: { w: 7, d: 5 }, tag: "chain", cats: 2, caps: [2] },
    { k: "branch", x: -58, y: 3.4, z: -18, s: { w: 6, d: 5 }, tag: "plate", cats: 1 },
    { k: "branch", x: -44, y: 7.5, z: -14, s: { n: 10, r: 3.2 }, tag: "gear", cats: 2, caps: [1] },
  ],
  mid: [
    // m0 pátio da engrenagem grande (o centro de baixo)
    { k: "center", x: 0, y: 8, z: 0, s: { n: 12, r: 8 }, tag: "gear", cats: 4, caps: [3, 0] },
    // m1 chapas presas por correntes (par), m2 a engrenagem do alto (portais)
    { k: "center", x: -6.5, y: 21.6, z: 6, s: { w: 6, d: 6 }, tag: "chain", pair: true, cats: 1, caps: [1] },
    { k: "summit", x: 0, y: 25, z: -6, s: { n: 12, r: 6.2 }, tag: "ring" },
    // m3–m5 pistas de baixo (pares) e a engrenagem norte
    { k: "center", x: -11, y: 6, z: 26, s: { w: 6, d: 4 }, tag: "conveyor", pair: true, cats: 1 },
    { k: "center", x: -11, y: 5, z: -22, s: { w: 5, d: 5 }, tag: "plate", pair: true, cats: 1, caps: [2] },
    { k: "center", x: 0, y: 9, z: 30, s: { n: 10, r: 3.2 }, tag: "gear", cats: 2 },
  ],
  portal: { x: -2.8, y: 25, z: -6 },
  route: ["s0", "s1", "s2", "s3", "s4", "s5", "s6", "m1", "m2"],
}

// ═══ 4. FLORESTA DE CRISTAL ══════════════════════════════════════════════════
// A ÁRVORE colossal no meio (o tronco colide) com folhas gigantes em volta,
// subindo. Cada time atravessa as raízes, sobe as folhas do seu lado do tronco
// até o galho NORTE (encontro), vai para as folhas de fora e para o galho SUL,
// e chega à copa (os dois portais). Em volta, ilhotas de cristal e cogumelo.
const FL = (deg: number, R: number, y: number, r: number, extra: Partial<Piece> = {}): Piece => ({ k: "center", ...onRing(R, deg), y, s: { n: 10, r, sz: 1.3, rot: deg }, tag: "leaf", ...extra })
export const FLORESTA: ArenaDef = {
  id: "floresta",
  v: 1,
  side: [
    // s0 a folha da base
    { k: "base", x: -46, y: 0, z: 0, s: { n: 12, r: 9, sx: 1.15 }, tag: "leafbase", cats: [[3, 5], [3, -5]], caps: [0, 1, 2, 3] },
    // s1 raiz, s2 folha (rota)
    { k: "path", x: -29.5, y: 1.6, z: -3, s: { w: 7, d: 4, rot: -10 }, tag: "root", cats: 1, caps: [2] },
    { k: "path", x: -19.5, y: 3.6, z: -7, s: { n: 10, r: 3.4, sx: 1.25 }, tag: "leaf", cats: 1, caps: [0] },
    // s3–s9 cristais, cogumelos e galhos soltos
    { k: "wing", x: -56, y: 3.5, z: 18, s: { n: 5, r: 3 }, tag: "crystal", cats: 2 },
    { k: "wing", x: -40, y: 6.5, z: 22, s: { n: 10, r: 3, sx: 1.3, rot: 30 }, tag: "leaf", cats: 2, caps: [3] },
    { k: "wing", x: -26, y: 9.5, z: 18, s: { n: 10, r: 3, sx: 1.3, rot: -20 }, tag: "leaf", cats: 2 },
    { k: "wing", x: -58, y: 4, z: -16, s: { n: 7, r: 2.8 }, tag: "mushroom", cats: 2 },
    { k: "wing", x: -42, y: 7.8, z: -22, s: { n: 10, r: 3, sx: 1.3, rot: 60 }, tag: "leaf", cats: 2, caps: [2] },
    { k: "branch", x: -26, y: 11, z: -20, s: { n: 5, r: 2.8 }, tag: "crystal", cats: 2, caps: [1] },
    { k: "branch", x: -34, y: 14.5, z: 9, s: { n: 10, r: 3, sx: 1.3 }, tag: "leaf", cats: 2 },
  ],
  mid: [
    // m0 o chão de raízes com o TRONCO (pilar que colide, até embaixo da copa)
    { k: "center", x: 0, y: 2, z: 0, s: { n: 9, r: 9.5 }, tag: "roots", cats: [[0, 7], [0, -7], [-6.5, 2.5], [6.5, 2.5]], caps: [3], props: [["pillar", 0, 0, 26, 4.5, 0, 0, "trunk"]] },
    // m1–m3 folhas de baixo (pares), m4 galho NORTE
    FL(-130, 9.6, 6.4, 3, { pair: true }),
    FL(-85, 9.6, 9.8, 3, { pair: true, cats: 1, caps: [1] }),
    FL(-40, 9.6, 13.2, 3, { pair: true }),
    { k: "center", x: 0, y: 16.8, z: 11.6, s: { n: 10, r: 3.4 }, tag: "leaf", cats: 2, caps: [2] },
    // m5–m6 folhas de fora (pares), m7 galho SUL, m8 a copa (portais)
    FL(-60, 15, 20.4, 3.4, { pair: true, cats: 1 }),
    FL(-120, 15, 23.8, 3.4, { pair: true, caps: [0] }),
    { k: "center", ...onRing(12, 180), y: 27.2, s: { n: 10, r: 4, sx: 1.25 }, tag: "leaf", cats: 2 },
    { k: "summit", x: 0, y: 30.8, z: 0, s: { n: 10, r: 6.4 }, tag: "canopy" },
  ],
  portal: { x: -2.8, y: 30.8, z: 0 },
  route: ["s0", "s1", "s2", "m1", "m2", "m3", "m4", "m5", "m6", "m7", "m8"],
}

// ═══ 5. TEMPLO DA TEMPESTADE ═════════════════════════════════════════════════
// Ruínas dentro da tempestade. A base é um TRIÂNGULO apontado para o meio;
// a escadaria partida (degraus de verdade, sobe andando) leva aos terraços
// triangulares; dali, os fragmentos da TORRE em volta do núcleo (cada time
// sobe o seu lado até o fragmento NORTE) e o anel de colunas no alto (os dois
// portais). Ao sul, a outra escadaria e as ruínas de colunas.
const TF = (deg: number, y: number, extra: Partial<Piece> = {}): Piece => ({ k: "center", ...onRing(11, deg), y, s: { w: 4, d: 5.6, rot: deg + 90 }, tag: "fragment", ...extra })
const stair = (x: number, z: number, y: number, extra: Partial<Piece> = {}): Piece => ({ k: "path", x, y, z, s: { w: 3.2, d: 5 }, tag: "stair", ...extra })
export const TEMPLO: ArenaDef = {
  id: "templo",
  v: 1,
  side: [
    // s0 base triangular (ponta para o meio)
    { k: "base", x: -48, y: 0, z: 0, s: { n: 3, r: 12, rot: 90 }, tag: "triangle", cats: [[-3, 4], [-3, -4]], caps: [0, 1, 2, 3], props: [["pillar", -4.5, 7, 3.2, 0.5, 0, 0, "column"], ["pillar", -4.5, -7, 3.2, 0.5, 0, 0, "column"]] },
    // s1–s4 a escadaria norte (degraus colados: sobe andando)
    stair(-42.4, 10, 0.8, { cats: 1 }),
    stair(-39.2, 10, 1.1),
    stair(-36, 10, 1.4),
    stair(-32.8, 10, 1.7, { cats: 1, caps: [2] }),
    // s5–s6 terraços triangulares (rota)
    { k: "path", x: -24, y: 5.4, z: 12, s: { n: 3, r: 4.8, rot: 90 }, tag: "triangle", cats: 2, caps: [0] },
    { k: "path", x: -21, y: 8.8, z: 0, s: { n: 3, r: 4.4, rot: 90 }, tag: "triangle", cats: 1 },
    // s7–s9 ruínas de colunas (norte/sul)
    { k: "wing", x: -58, y: 3, z: 16, s: { n: 3, r: 3.6, rot: -90 }, tag: "triangle", cats: 2 },
    { k: "wing", x: -40, y: 6.4, z: 22, s: { w: 5, d: 4 }, tag: "ruins", cats: 2, caps: [3] },
    { k: "wing", x: -60, y: 4.2, z: -14, s: { n: 3, r: 3.6, rot: -90 }, tag: "triangle", cats: 2 },
    // s10–s12 a escadaria sul (partida)
    stair(-41, -14, 0.9, { k: "wing" }),
    stair(-37.8, -14, 1.2, { k: "wing" }),
    stair(-34.6, -14, 1.5, { k: "wing", cats: 1 }),
    // s13–s14 terraço e ruína alta do sul
    { k: "branch", x: -24, y: 5, z: -16, s: { n: 3, r: 4, rot: 90 }, tag: "triangle", cats: 2, caps: [2] },
    { k: "branch", x: -30, y: 9.6, z: -26, s: { w: 5, d: 5 }, tag: "ruins", cats: [[-1.4, -1.4], [1.4, -1.4]], caps: [1], props: [["pillar", 1.9, 1.9, 2.6, 0.45, 0, 0, "column"]] },
  ],
  mid: [
    // m0 a praça do núcleo (a coluna partida no meio colide)
    { k: "center", x: 0, y: 4, z: 0, s: { n: 6, r: 7, rot: 30 }, tag: "plaza", cats: [[0, 4.5], [-4, -2.5], [4, -2.5]], props: [["pillar", 0, 0, 14.6, 2.4, 0, 0, "core"]] },
    // m1–m2 fragmentos da torre (pares), m3 fragmento NORTE, m4 o anel de colunas (portais)
    TF(-90, 12.4, { pair: true, cats: 1 }),
    TF(-45, 16, { pair: true, cats: 1, caps: [2] }),
    { k: "center", x: 0, y: 19.6, z: 10.5, s: { w: 5.6, d: 4 }, tag: "fragment", cats: 2, caps: [3] },
    {
      k: "summit",
      x: 0,
      y: 23.2,
      z: 0,
      s: { n: 8, r: 6, rot: 22.5 },
      tag: "colonnade",
      props: [
        ["pillar", 0, 4.6, 3.4, 0.5, 0, 0, "column"],
        ["pillar", 0, -4.6, 3.4, 0.5, 0, 0, "column"],
        ["pillar", -3.3, 3.3, 3.4, 0.5, 0, 0, "column"],
        ["pillar", 3.3, 3.3, 3.4, 0.5, 0, 0, "column"],
        ["pillar", -3.3, -3.3, 3.4, 0.5, 0, 0, "column"],
        ["pillar", 3.3, -3.3, 3.4, 0.5, 0, 0, "column"],
      ],
    },
    // m5–m6 fragmentos do sul
    { k: "center", x: 0, y: 6, z: -11, s: { w: 5.6, d: 4 }, tag: "fragment", cats: 1 },
    TF(-135, 9, { pair: true, cats: 1, caps: [0] }),
  ],
  portal: { x: -2.4, y: 23.2, z: 0 },
  route: ["s0", "s1", "s4", "s5", "s6", "m1", "m2", "m3", "m4"],
}

// ═══ 6. FORJA VULCÂNICA ══════════════════════════════════════════════════════
// Basalto preto, chapas de metal e lava lá embaixo. Cada time sai da rocha
// irregular, passa pela laje comprida de basalto e pelas plataformas
// hexagonais de metal e chega à FORJA do meio: a coluna da fornalha (colide)
// com plataformas presas nas faces, subindo em volta dela até a bigorna no
// alto (os dois portais). Em volta, rochas soltas, a bigorna e o guindaste.
export const FORJA: ArenaDef = {
  id: "forja",
  v: 1,
  side: [
    // s0 base de basalto irregular
    { k: "base", x: -48, y: 0, z: 0, s: { n: 9, r: 10, j: 0.5 }, tag: "basalt", cats: [[3, 5], [3, -5]], caps: [0, 1, 2, 3] },
    // s1 laje comprida, s2–s3 plataformas hexagonais de metal (rota)
    { k: "path", x: -33, y: 1.8, z: 8, s: { w: 12, d: 4.5, rot: 10 }, tag: "basaltlong", cats: 1, caps: [2] },
    { k: "path", x: -22, y: 5.4, z: 14, s: { n: 6, r: 3.6 }, tag: "hexpad", cats: 1, caps: [0] },
    { k: "path", x: -16, y: 8.8, z: 6, s: { n: 6, r: 3.4 }, tag: "hexpad", cats: 1 },
    // s4–s10 rochas soltas, bigorna, guindaste
    { k: "wing", x: -58, y: 2.5, z: 16, s: { n: 7, r: 3.5, j: 0.5 }, tag: "basalt", cats: 2 },
    { k: "wing", x: -44, y: 5.6, z: 22, s: { n: 6, r: 3.2 }, tag: "hexpad", cats: 2, caps: [3] },
    { k: "wing", x: -30, y: 8.4, z: 26, s: { w: 6, d: 4 }, tag: "anvil", cats: 2 },
    { k: "wing", x: -56, y: 3.2, z: -18, s: { n: 8, r: 3.6, j: 0.5 }, tag: "basalt", cats: 2 },
    { k: "wing", x: -40, y: 1.6, z: -16, s: { w: 10, d: 4, rot: -15 }, tag: "basaltlong", cats: [[-2.5, 0], [2.5, 0]], caps: [2] },
    { k: "branch", x: -26, y: 4.8, z: -20, s: { n: 6, r: 3.2 }, tag: "hexpad", cats: 2, caps: [1] },
    { k: "branch", x: -30, y: 9.8, z: -8, s: { w: 4, d: 4 }, tag: "crane", cats: 1 },
  ],
  mid: [
    // m0 o chão da forja com a FORNALHA (caixa que colide no meio)
    { k: "center", x: 0, y: 3, z: 0, s: { n: 8, r: 9, rot: 22.5 }, tag: "forgefloor", cats: [[0, 6.2], [0, -6.2], [-6.2, 0], [6.2, 0]], props: [["crate", 0, 0, 20, 3, 0, 3, "furnace"]] },
    // m1 face oeste embaixo (par), m2 face NORTE, m3 face oeste em cima (par), m4 face SUL, m5 a bigorna do alto (portais)
    { k: "center", x: -7, y: 12.2, z: 1, s: { w: 4, d: 6 }, tag: "grate", pair: true, cats: 1, caps: [1] },
    { k: "center", x: 0, y: 15.6, z: 7.5, s: { w: 6, d: 4 }, tag: "grate", cats: 2, caps: [2, 3] },
    { k: "center", x: -7, y: 19, z: 1, s: { w: 4, d: 6 }, tag: "grate", pair: true, cats: 1 },
    { k: "center", x: 0, y: 22.4, z: -10, s: { w: 6, d: 4 }, tag: "grate", cats: 2, caps: [0] },
    { k: "summit", x: 0, y: 25.8, z: 0, s: { n: 8, r: 6.5, rot: 22.5 }, tag: "forgetop" },
  ],
  portal: { x: -2.8, y: 25.8, z: 0 },
  route: ["s0", "s1", "s2", "s3", "m1", "m2", "m3", "m4", "m5"],
}

// ═══ catálogo ═════════════════════════════════════════════════════════════════

/** Os mapas, na ordem do cartão. A Cidade é o mapa de antes (sim/map.ts). */
export const PAINT_MAPS = [
  { id: "cidade", v: 1 },
  { id: "jardim", v: 1 },
  { id: "fabrica", v: 1 },
  { id: "floresta", v: 1 },
  { id: "templo", v: 1 },
  { id: "forja", v: 1 },
] as const
export type PaintMapId = (typeof PAINT_MAPS)[number]["id"]

const ARENAS: Record<string, ArenaDef> = { jardim: JARDIM, fabrica: FABRICA, floresta: FLORESTA, templo: TEMPLO, forja: FORJA }

/** Id conhecido (senão a Cidade). */
export function paintMapId(id: unknown): PaintMapId {
  return (PAINT_MAPS.find((m) => m.id === id) ?? PAINT_MAPS[0]).id
}

/** Versão da regra do mapa (a sala manda; aparelho com outra versão está desatualizado). */
export function paintMapVersion(id: string) {
  return (PAINT_MAPS.find((m) => m.id === id) ?? PAINT_MAPS[0]).v
}

/** O mapa da partida (o do modo: 2×2 e 3×3 com mais gatinhos). */
export function buildPaintMap(mode: PaintMode = "solo", id: string = "cidade"): PaintMap {
  const arena = ARENAS[paintMapId(id)]
  return arena ? buildArena(arena, mode) : buildCidadeMap(mode)
}

/** Apuração da votação (mm3d-76): mais votado; empate = sorteio entre os empatados (`rand` em [0, 1) vem da sala). */
export function tallyPaintVotes(votes: readonly string[], rand: number): PaintMapId {
  const n = new Map<string, number>()
  for (const v of votes) {
    const id = paintMapId(v)
    n.set(id, (n.get(id) ?? 0) + 1)
  }
  if (!n.size) return PAINT_MAPS[0].id
  const top = Math.max(...n.values())
  const tied = PAINT_MAPS.map((m) => m.id).filter((id) => n.get(id) === top)
  return tied[Math.min(tied.length - 1, Math.floor(rand * tied.length))]
}

/** A ilha do chefão é a mesma em todo mapa. */
export const PAINT_BOSS_AT = BOSS
