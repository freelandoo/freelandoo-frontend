// features/meu-mundo/noturno/engine/track-mesh.ts — ROLÊ NOTURNO 2.0: a pista desenhada pelo traçado.
//
// A pista NÃO é um conjunto de blocos retos: cada bloco (CHUNK metros) é uma
// malha contínua extrudada ao longo das amostras do traçado — seções
// transversais (piso, laterais, mureta, corrimão, faixas acesas) postas em
// P + R·x + U·y a cada passo, com o UV ao longo pela DISTÂNCIA (a textura não
// estica na curva nem no loop) e normais pela própria seção girada pela base
// da pista. Dois blocos vizinhos usam a mesma amostra na emenda: sem degrau.
//
// Peças que se repetem pela pista (postes do corrimão, luminárias, suportes,
// nervuras do loop, portal) são instâncias finas de uma malha-fonte — uma
// chamada de desenho por peça para a pista inteira à vista; a lista é refeita
// só quando um bloco entra ou sai.
//
// O cenário perto/médio/longe (rochas, árvores, prédios) também nasce por
// bloco, sorteado pela semente do bloco (mesmo bloco = mesmo cenário), longe
// o bastante da pista (confere a distância até a pista dos dois lados).

import type { Scene } from "@babylonjs/core/scene"
import { Mesh } from "@babylonjs/core/Meshes/mesh"
import "@babylonjs/core/Meshes/thinInstanceMesh"
import { VertexData } from "@babylonjs/core/Meshes/mesh.vertexData"
import type { Material } from "@babylonjs/core/Materials/material"
import { Matrix, Quaternion, Vector3 } from "@babylonjs/core/Maths/math.vector"
import { DS, newFrame, type TrackFrame, type TrackSeg } from "../sim/track"
import type { TrackSpace } from "./track-space"

/** Uma seção transversal extrudada pela pista. */
export interface StripDef {
  /** Pontos (x lado, y altura) da seção, em ordem; cada par vizinho vira uma faixa com normal própria. */
  pts: readonly (readonly [number, number])[]
  mat: Material
  /** Metros de pista por repetição da textura (V). */
  vLen: number
  /** U explícito por ponto (senão o comprimento acumulado da seção / uLen). */
  u?: readonly number[]
  uLen?: number
  /** Normais radiais a partir deste centro (tubo liso) em vez de facetadas. */
  center?: readonly [number, number]
  /** Só nos trechos que passam neste filtro. */
  when?: (seg: TrackSeg) => boolean
  /** Fecha o último ponto com o primeiro. */
  closed?: boolean
}

/** Peça repetida ao longo da pista (instância fina). */
export interface AlongDef {
  mesh: Mesh
  /** De quantos em quantos metros (e a partir de onde, dentro do bloco global). */
  every?: number
  phase?: number
  /** Posições exatas (m) dentro de um trecho, em vez de `every`. */
  at?: (seg: TrackSeg) => number[]
  /** Lados (x) — uma instância por valor. */
  xs: readonly number[]
  y?: number
  /** Espelha (giro 180° no cima) quando x < 0. */
  mirror?: boolean
  when?: (seg: TrackSeg, s: number) => boolean
  /** Coluna em pé até o chão do mundo (y do chão): estica em y e fica de pé no mundo. */
  toGround?: number
  /** Com `toGround`: em vez de esticar, EMPILHA módulos desta altura (treliça não deforma). */
  stack?: number
  /** Com `toGround`: o topo da coluna fica este tanto abaixo do piso. */
  below?: number
  scale?: number
}

/** Peça que vai junto de uma peça de cenário (moinho em cima da ilha): posição em unidades do pai. */
export interface Rider {
  mesh: Mesh
  at: readonly [number, number, number]
  scale: number
  /** Escala (largura, altura) além da uniforme — cachoeira que cai da ilha. */
  size?: readonly [number, number]
  /** Giro próprio antes de ir para o lugar (a cachoeira olha para fora). */
  yaw?: number
  /** Chance de aparecer (0–1). */
  p?: number
}

/** Peça de cenário sorteada por bloco (longe da pista). */
export interface DressDef {
  mesh: Mesh
  /** Quantas por bloco (média; o sorteio decide). */
  per: number
  /** Distância lateral (m) do meio da pista, os dois lados. */
  lateral: readonly [number, number]
  /** Altura: "ground" = chão do mundo + y; "track" = altura da pista + y. */
  base: "ground" | "track"
  y: readonly [number, number]
  scale: readonly [number, number]
  /** Raio (× escala) que precisa ficar livre da pista. */
  clear: number
  /** Escala não uniforme (largura, altura) multiplicadores. */
  stretch?: readonly [number, number]
  /** Só de um lado (1 direita, −1 esquerda) ou por trecho. */
  when?: (seg: TrackSeg) => boolean
  /** Gira para olhar a pista (frente local +z para a pista). */
  face?: boolean
  riders?: readonly Rider[]
  /** Distância (m, pela pista) que precisa ficar livre de loop — senão a peça atravessa o aro. */
  loopClear?: number
}

export interface TrackLook {
  strips: StripDef[]
  along: AlongDef[]
  /** Cenário perto/médio (blocos da pista). */
  dress: DressDef[]
  /** Cenário longe (blocos maiores, à vista de mais longe). */
  far: DressDef[]
  /** Chão do mundo (y) para colunas e cenário "ground". */
  groundY: number
}

const CHUNK = 50
const FAR_CHUNK = 240

interface Chunk {
  i: number
  meshes: Mesh[]
}

function hash(a: number, b: number) {
  let h = (Math.imul(a ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul(b + 0x632be5ab, 0xc2b2ae35)) >>> 0
  return () => {
    h = (h + 0x6d2b79f5) >>> 0
    let t = h
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Buffers de instâncias finas por malha-fonte (refeitos quando os blocos mudam). */
class Scatter {
  private readonly lists = new Map<Mesh, Map<number, Float32Array>>()
  private dirty = new Set<Mesh>()

  set(mesh: Mesh, chunk: number, m: Float32Array) {
    let l = this.lists.get(mesh)
    if (!l) this.lists.set(mesh, (l = new Map()))
    if (m.length) l.set(chunk, m)
    else l.delete(chunk)
    this.dirty.add(mesh)
  }

  drop(chunk: number) {
    for (const [mesh, l] of this.lists) if (l.delete(chunk)) this.dirty.add(mesh)
  }

  flush() {
    for (const mesh of this.dirty) {
      const l = this.lists.get(mesh)
      let n = 0
      if (l) for (const a of l.values()) n += a.length
      const buf = new Float32Array(Math.max(16, n))
      let o = 0
      if (l) for (const a of l.values()) {
        buf.set(a, o)
        o += a.length
      }
      mesh.thinInstanceSetBuffer("matrix", buf, 16, false)
      mesh.thinInstanceCount = n / 16
      mesh.isVisible = n > 0
    }
    this.dirty.clear()
  }
}

export interface TrackMeshView {
  /** Constrói o que entra à vista e solta o que ficou para trás (s = onde está o jogador). */
  update(s: number, ahead: number): void
  /** Blocos ativos e instâncias (conferência). */
  stats(): { chunks: number; far: number; meshes: number }
  dispose(): void
}

/** `density` (0–1): quanto do cenário perto/longe aparece (perfil gráfico) — nunca mexe em pista, obstáculo ou coleta. */
export function buildTrackMesh(scene: Scene, space: TrackSpace, look: TrackLook, seed: number, density = 1): TrackMeshView {
  const geom = space.geom
  if (!geom) throw new Error("pista sem traçado")
  const plan = geom.plan
  const chunks = new Map<number, Chunk>()
  const farChunks = new Set<number>()
  const scatter = new Scatter()
  const f = newFrame()
  const g = newFrame()
  const mtx = new Matrix()
  const q = new Quaternion()
  const qL = new Quaternion()
  const pos = new Vector3()
  const sc = new Vector3()
  const allSources = new Set<Mesh>([...look.along.map((a) => a.mesh), ...[...look.dress, ...look.far].flatMap((d) => [d.mesh, ...(d.riders ?? []).map((r) => r.mesh)])])
  for (const m of allSources) {
    m.thinInstanceSetBuffer("matrix", new Float32Array(16), 16, false)
    m.thinInstanceCount = 0
    m.isVisible = false
    m.alwaysSelectAsActiveMesh = true
    m.isPickable = false
  }

  /** Extruda as seções no bloco [s0, s1]. */
  const buildStrips = (i: number, s0: number, s1: number): Mesh[] => {
    const byMat = new Map<Material, { p: number[]; n: number[]; uv: number[]; ix: number[] }>()
    // linhas da extrusão: 1 m na pista comum, DS (0,5 m) dentro do loop (curvatura forte)
    const rowsS: number[] = []
    for (let s = s0; s <= s1 + 1e-6; ) {
      rowsS.push(s)
      const seg = plan.segAt(Math.min(s + 1e-3, s1 - 1e-3))
      s += seg.kind === "loop" ? DS : 2 * DS
    }
    if (rowsS[rowsS.length - 1] < s1 - 1e-6) rowsS.push(s1)
    const n = rowsS.length - 1
    for (const st of look.strips) {
      const pts = st.pts
      const np = pts.length
      const pairs = st.closed ? np : np - 1
      // U por ponto
      const us: number[] = []
      if (st.u) for (const u of st.u) us.push(u)
      else {
        let acc = 0
        us.push(0)
        for (let k = 1; k < np; k++) {
          acc += Math.hypot(pts[k][0] - pts[k - 1][0], pts[k][1] - pts[k - 1][1])
          us.push(acc / (st.uLen ?? 1))
        }
      }
      let buf = byMat.get(st.mat)
      if (!buf) byMat.set(st.mat, (buf = { p: [], n: [], uv: [], ix: [] }))
      // o filtro por trecho: corre a faixa em pedaços contínuos
      let open = -1
      const flush = (a: number, b: number) => {
        if (b <= a) return
        const rows = b - a + 1
        const base = buf!.p.length / 3
        for (let r = 0; r < rows; r++) {
          const s = rowsS[a + r]
          geom.frame(s, f)
          const v = s / st.vLen
          for (let k = 0; k < pairs; k++) {
            const A = pts[k]
            const B = pts[(k + 1) % np]
            // normal facetada da faixa (perpendicular na seção) ou radial do centro (tubo)
            for (const [P, uu] of [
              [A, us[k]],
              [B, st.closed && k === pairs - 1 ? us[k] + Math.hypot(B[0] - A[0], B[1] - A[1]) / (st.uLen ?? 1) : us[(k + 1) % np]],
            ] as const) {
              let nx: number
              let ny: number
              if (st.center) {
                nx = P[0] - st.center[0]
                ny = P[1] - st.center[1]
              } else {
                nx = B[1] - A[1]
                ny = -(B[0] - A[0])
              }
              const nl = Math.hypot(nx, ny) || 1
              nx /= nl
              ny /= nl
              buf!.p.push(f.px + f.rx * P[0] + f.ux * P[1], f.py + f.ry * P[0] + f.uy * P[1], f.pz + f.rz * P[0] + f.uz * P[1])
              buf!.n.push(f.rx * nx + f.ux * ny, f.ry * nx + f.uy * ny, f.rz * nx + f.uz * ny)
              buf!.uv.push(uu, v)
            }
          }
        }
        const stride = pairs * 2
        for (let r = 0; r < rows - 1; r++) {
          for (let k = 0; k < pairs; k++) {
            const a0 = base + r * stride + k * 2
            const b0 = a0 + 1
            const a1 = a0 + stride
            const b1 = b0 + stride
            // pontos em ordem crescente de x por cima = frente para cima (LH: horário visto de cima)
            buf!.ix.push(a0, a1, b0, b0, a1, b1)
          }
        }
      }
      for (let r = 0; r <= n; r++) {
        const s = rowsS[r]
        const okHere = !st.when || st.when(plan.segAt(Math.min(s + 1e-3, s1 - 1e-3)))
        if (okHere && open < 0) open = r
        if ((!okHere || r === n) && open >= 0) {
          flush(open, okHere ? r : Math.max(open, r - 1))
          open = okHere ? -1 : -1
        }
      }
    }
    const out: Mesh[] = []
    for (const [mat, b] of byMat) {
      if (!b.ix.length) continue
      const m = new Mesh(`rn2-track-${i}-${mat.name}`, scene)
      const vd = new VertexData()
      vd.positions = b.p
      vd.normals = b.n
      vd.uvs = b.uv
      vd.indices = b.ix
      vd.applyToMesh(m, false)
      m.material = mat
      m.isPickable = false
      m.freezeWorldMatrix()
      out.push(m)
    }
    return out
  }

  /** Instâncias ao longo do bloco. */
  const buildAlong = (i: number, s0: number, s1: number) => {
    const per = new Map<Mesh, number[]>()
    const put = (a: AlongDef, s: number, seg: TrackSeg) => {
      if (a.when && !a.when(seg, s)) return
      const list = per.get(a.mesh) ?? []
      per.set(a.mesh, list)
      const k = a.scale ?? 1
      for (const x of a.xs) {
        if (a.toGround !== undefined) {
          // coluna: de pé no MUNDO, do chão até embaixo do piso
          space.point(x, (a.y ?? 0) - (a.below ?? 0), s, pos)
          const h = pos.y - a.toGround
          if (h < 0.5) continue
          geom.frame(s, f)
          const yaw = Math.atan2(f.tx, f.tz)
          Quaternion.RotationYawPitchRollToRef(yaw, 0, 0, q)
          if (a.stack) {
            // módulos inteiros de baixo para cima; o último encosta no topo (sobrepõe o de baixo)
            const n = Math.ceil(h / a.stack)
            const top = pos.y
            sc.set(k, 1, k)
            for (let j = 0; j < n; j++) {
              pos.y = Math.min(a.toGround + j * a.stack, top - a.stack)
              Matrix.ComposeToRef(sc, q, pos, mtx)
              const o = list.length
              list.length += 16
              mtx.copyToArray(list as unknown as Float32Array, o)
            }
            continue
          }
          sc.set(k, h, k)
          pos.y = a.toGround
          Matrix.ComposeToRef(sc, q, pos, mtx)
        } else {
          Quaternion.RotationYawPitchRollToRef(a.mirror && x < 0 ? Math.PI : 0, 0, 0, qL)
          sc.set(k, k, k)
          space.matrix(x, a.y ?? 0, s, sc, qL, mtx, q, pos)
        }
        const o = list.length
        list.length += 16
        mtx.copyToArray(list as unknown as Float32Array, o)
      }
    }
    for (const a of look.along) {
      if (a.at) {
        for (const seg of plan.segs) {
          if (seg.s0 + seg.len < s0 || seg.s0 > s1) continue
          for (const s of a.at(seg)) if (s >= s0 && s < s1) put(a, s, seg)
        }
      } else if (a.every) {
        const ph = a.phase ?? 0
        for (let s = Math.ceil((s0 - ph) / a.every) * a.every + ph; s < s1; s += a.every) put(a, s, plan.segAt(s))
      }
    }
    for (const a of look.along) scatter.set(a.mesh, i, new Float32Array(per.get(a.mesh) ?? []))
  }

  /** Tem loop a menos de `d` metros (pela pista) de s? */
  const loopNear = (s: number, d: number) => {
    for (const seg of plan.segs) if (seg.kind === "loop" && s > seg.s0 - d && s < seg.s0 + seg.len + d) return true
    return false
  }

  /** Distância horizontal mínima de (x, z) até a pista entre s−span e s+span. */
  const clearOf = (x: number, z: number, s: number, span: number) => {
    let best = Infinity
    for (let t = Math.max(0, s - span); t <= s + span; t += 8) {
      geom.frame(t, g)
      best = Math.min(best, Math.hypot(g.px - x, g.pz - z))
    }
    return best
  }

  const riderLists = new Map<Mesh, number[]>()
  const childM = new Matrix()
  const buildDress = (key: number, defs: DressDef[], s0: number, s1: number, span: number) => {
    riderLists.clear()
    for (const def of defs) for (const r of def.riders ?? []) riderLists.set(r.mesh, [])
    for (let d = 0; d < defs.length; d++) {
      const def = defs[d]
      const rnd = hash(seed + d * 977, key)
      const list: number[] = []
      const want = Math.floor(def.per * density + rnd())
      for (let k = 0; k < want; k++) {
        const s = s0 + rnd() * (s1 - s0)
        const seg = plan.segAt(s)
        if (def.when && !def.when(seg)) continue
        geom.frame(s, f)
        const side = rnd() < 0.5 ? -1 : 1
        const lat = def.lateral[0] + rnd() * (def.lateral[1] - def.lateral[0])
        // lado horizontal (sem o banking: o cenário fica de pé no mundo)
        const hl = Math.hypot(f.tz, f.tx) || 1
        const rx = f.tz / hl
        const rz = -f.tx / hl
        const x = f.px + rx * lat * side
        const z = f.pz + rz * lat * side
        const scl = def.scale[0] + rnd() * (def.scale[1] - def.scale[0])
        if (clearOf(x, z, s, span) < def.clear * scl) continue
        if (def.loopClear && loopNear(s, def.loopClear + lat * 0.5)) continue
        const y = (def.base === "ground" ? look.groundY : f.py) + def.y[0] + rnd() * (def.y[1] - def.y[0])
        const yaw = def.face ? Math.atan2(f.px - x, f.pz - z) + (rnd() - 0.5) * 0.5 : rnd() * Math.PI * 2
        Quaternion.RotationYawPitchRollToRef(yaw, 0, 0, q)
        const st = def.stretch ?? [1, 1]
        sc.set(scl * st[0], scl * st[1], scl * st[0])
        pos.set(x, y, z)
        Matrix.ComposeToRef(sc, q, pos, mtx)
        const o = list.length
        list.length += 16
        mtx.copyToArray(list as unknown as Float32Array, o)
        for (const r of def.riders ?? []) {
          if (r.p !== undefined && rnd() > r.p) continue
          // filho no espaço do pai: escala e giro próprios, posição em unidades do pai, e o conjunto
          // gira em volta do meio do pai (a cachoeira dá a volta na ilha junto com o lugar dela)
          const sz = r.size ?? [1, 1]
          Matrix.ComposeToRef(new Vector3(r.scale * sz[0], r.scale * sz[1], r.scale * sz[0]), Quaternion.RotationYawPitchRoll(r.yaw ?? 0, 0, 0), new Vector3(r.at[0], r.at[1], r.at[2]), childM)
          childM.multiplyToRef(Matrix.RotationY(rnd() * 6.28), childM)
          childM.multiplyToRef(mtx, childM)
          const rl = riderLists.get(r.mesh)!
          const ro = rl.length
          rl.length += 16
          childM.copyToArray(rl as unknown as Float32Array, ro)
        }
      }
      scatter.set(def.mesh, key, new Float32Array(list))
    }
    for (const [m, rl] of riderLists) scatter.set(m, key, new Float32Array(rl))
  }

  const dropChunk = (c: Chunk) => {
    for (const m of c.meshes) m.dispose()
    scatter.drop(c.i)
  }

  let lastStats = { chunks: 0, far: 0, meshes: 0 }
  return {
    update(s, ahead) {
      const first = Math.floor(Math.max(0, s - 40) / CHUNK)
      const last = Math.floor((s + ahead) / CHUNK)
      geom.ensure((last + 1) * CHUNK + 10)
      let changed = false
      for (const [i, c] of chunks) {
        if (i >= first && i <= last) continue
        dropChunk(c)
        chunks.delete(i)
        changed = true
      }
      // no máximo 2 blocos novos por quadro (o resto no seguinte; o adiante tem folga)
      let built = 0
      for (let i = first; i <= last && built < 2; i++) {
        if (chunks.has(i)) continue
        const s0 = i * CHUNK
        const c: Chunk = { i, meshes: buildStrips(i, s0, s0 + CHUNK) }
        buildAlong(i, s0, s0 + CHUNK)
        buildDress(i, look.dress, s0, s0 + CHUNK, 140)
        chunks.set(i, c)
        built++
        changed = true
      }
      // cenário longe: blocos grandes, à vista de bem mais longe
      const ff = Math.floor(Math.max(0, s - 200) / FAR_CHUNK)
      const fl = Math.floor((s + ahead * 2.6) / FAR_CHUNK)
      geom.ensure((fl + 1) * FAR_CHUNK + 300)
      for (const i of farChunks) {
        if (i >= ff && i <= fl) continue
        farChunks.delete(i)
        scatter.drop(-1 - i)
        changed = true
      }
      for (let i = ff; i <= fl; i++) {
        if (farChunks.has(i)) continue
        farChunks.add(i)
        buildDress(-1 - i, look.far, i * FAR_CHUNK, (i + 1) * FAR_CHUNK, 420)
        changed = true
      }
      if (changed) scatter.flush()
      space.forget(s - 300)
      lastStats = { chunks: chunks.size, far: farChunks.size, meshes: [...chunks.values()].reduce((a, c) => a + c.meshes.length, 0) }
    },
    stats: () => lastStats,
    dispose() {
      for (const c of chunks.values()) for (const m of c.meshes) m.dispose()
      chunks.clear()
    },
  }
}

/** Frame auxiliar exportado (quem desenha decoração presa à pista). */
export function frameOf(space: TrackSpace, s: number, out: TrackFrame = newFrame()) {
  return space.frame(s, out)
}
