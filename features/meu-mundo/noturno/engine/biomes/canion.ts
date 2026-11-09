// features/meu-mundo/noturno/engine/biomes/canion.ts — ROLÊ NOTURNO 2.0: CÂNION FLUTUANTE (fase piloto).
//
// Referência: 02_canion_flutuante.png (pasta do prompt do Alex). Três planos:
//  - perto: piso de chapas de aço com grelhas entre as faixas e setas ciano no
//    meio, meio-fio com fita laranja acesa, corrimão em dois tubos com postes e
//    lampiões, a pista suspensa por torres treliçadas que somem no mar de nuvens;
//  - médio: rochas e ilhas flutuantes com moinhos, cachoeiras, os pilares de
//    rocha que sobem das nuvens;
//  - longe: paredões em camadas, arcos naturais monumentais, céu de crepúsculo
//    com lua.
// Loop: a pista dá a volta inteira presa por nervuras de ferro com painéis
// acesos (rn2-canion-rib), com placa de aviso antes; portal de descida de
// pedra e ferro com setas para baixo (rn2-canion-portal) na boca de cada
// descida. As peças esculpidas do cenário são as do Jetpack (Tripo + Blender,
// public/meu-mundo/jetpack/canion) — mesmo arquivo, sem cópia.

import type { Scene } from "@babylonjs/core/scene"
import type { Mesh } from "@babylonjs/core/Meshes/mesh"
import type { Vector3 } from "@babylonjs/core/Maths/math.vector"
import type { QualityTier } from "../../../engine/quality"
import { loadCanyonAssets } from "../../../jetpack/engine/canyon-assets"
import type { TrackSeg } from "../../sim/track"
import type { AlongDef, DressDef, StripDef, TrackLook } from "../track-mesh"
import { buildFall, buildSea, buildSky, canvasTexture, glow, lit, paintClouds, rng, rnKit } from "./common"
import type { Biome } from "./types"

export const RN2_BASE = "/meu-mundo/noturno/v3/"

/** Piso de aço: chapas de 2 m, grelhas entre as faixas, rebites; setas ciano no meio (8 m por repetição). */
function paintDeck(c: CanvasRenderingContext2D, W: number, H: number) {
  const r = rng(3)
  c.fillStyle = "#23232a"
  c.fillRect(0, 0, W, H)
  const ux = (x: number) => ((x + 4.6) / 9.2) * W
  const plateH = H / 4
  // chapas por faixa
  const lanes: [number, number][] = [
    [-3.9, -1.5],
    [-1.0, 1.0],
    [1.5, 3.9],
  ]
  for (let p = 0; p < 4; p++) {
    for (const [a, b] of lanes) {
      const x0 = ux(a)
      const x1 = ux(b)
      const y0 = p * plateH
      const v = 52 + r() * 14
      c.fillStyle = `rgb(${v},${v},${v + 6})`
      c.fillRect(x0 + 2, y0 + 2, x1 - x0 - 4, plateH - 4)
      // brilho de borda e sombra (chanfro)
      c.fillStyle = "rgba(255,255,255,0.08)"
      c.fillRect(x0 + 2, y0 + 2, x1 - x0 - 4, 3)
      c.fillStyle = "rgba(0,0,0,0.35)"
      c.fillRect(x0 + 2, y0 + plateH - 6, x1 - x0 - 4, 4)
      // padrão de losangos antiderrapante
      c.fillStyle = "rgba(255,255,255,0.05)"
      for (let yy = y0 + 10; yy < y0 + plateH - 10; yy += 14) for (let xx = x0 + 10; xx < x1 - 10; xx += 14) c.fillRect(xx + ((yy / 14) % 2) * 7, yy, 6, 2)
      // rebites nos cantos
      c.fillStyle = "#77777f"
      for (const [xx, yy] of [
        [x0 + 9, y0 + 9],
        [x1 - 11, y0 + 9],
        [x0 + 9, y0 + plateH - 11],
        [x1 - 11, y0 + plateH - 11],
      ])
        c.fillRect(xx, yy, 3, 3)
      // poeira do cânion
      c.fillStyle = "rgba(150,90,50,0.08)"
      for (let i = 0; i < 6; i++) c.fillRect(x0 + r() * (x1 - x0), y0 + r() * plateH, 10 + r() * 40, 2 + r() * 6)
    }
  }
  // grelhas entre as faixas e nas bordas
  const grate = (a: number, b: number) => {
    const x0 = ux(a)
    const x1 = ux(b)
    c.fillStyle = "#121216"
    c.fillRect(x0, 0, x1 - x0, H)
    c.fillStyle = "#3a3a42"
    for (let yy = 0; yy < H; yy += 8) c.fillRect(x0, yy, x1 - x0, 2)
    for (let xx = x0; xx < x1; xx += 6) c.fillRect(xx, 0, 1.5, H)
    c.fillStyle = "#55555e"
    c.fillRect(x0, 0, 2, H)
    c.fillRect(x1 - 2, 0, 2, H)
  }
  grate(-1.5, -1.0)
  grate(1.0, 1.5)
  grate(-4.6, -3.9)
  grate(3.9, 4.6)
}

/** O que acende no piso: setas ciano no meio e filetes nas grelhas. */
function paintDeckGlow(c: CanvasRenderingContext2D, W: number, H: number) {
  c.fillStyle = "#000"
  c.fillRect(0, 0, W, H)
  const ux = (x: number) => ((x + 4.6) / 9.2) * W
  const cx = ux(0)
  // duas setas "^" (para a frente = topo da textura)
  for (const y0 of [H * 0.18, H * 0.34]) {
    const g = c.createLinearGradient(0, y0 - 40, 0, y0 + 60)
    g.addColorStop(0, "#9ff6ff")
    g.addColorStop(1, "#18a8d8")
    c.fillStyle = g
    c.beginPath()
    c.moveTo(cx, y0 - 36)
    c.lineTo(cx + 92, y0 + 34)
    c.lineTo(cx + 64, y0 + 52)
    c.lineTo(cx, y0 + 4)
    c.lineTo(cx - 64, y0 + 52)
    c.lineTo(cx - 92, y0 + 34)
    c.closePath()
    c.fill()
  }
  // filetes nas bordas das grelhas (guia de faixa)
  c.fillStyle = "rgba(60,200,255,0.55)"
  for (const x of [-1.5, -1.0, 1.0, 1.5]) c.fillRect(ux(x) - 1, 0, 2, H)
}

/** Lateral da pista: chapa grafite com painéis, frisos e rebites. */
function paintSide(c: CanvasRenderingContext2D, W: number, H: number) {
  c.fillStyle = "#2c2c33"
  c.fillRect(0, 0, W, H)
  const r = rng(9)
  for (let i = 0; i < 4; i++) {
    const y0 = (i * H) / 4
    const v = 44 + r() * 14
    c.fillStyle = `rgb(${v},${v},${v + 5})`
    c.fillRect(3, y0 + 3, W - 6, H / 4 - 6)
    c.fillStyle = "rgba(255,255,255,0.1)"
    c.fillRect(3, y0 + 3, W - 6, 2)
    c.fillStyle = "#88888f"
    for (const x of [8, W - 11]) for (const y of [y0 + 8, y0 + H / 4 - 11]) c.fillRect(x, y, 3, 3)
  }
}

/** Parede do aro do loop: chapas escuras com janelas acesas laranja e ciano (8 m por repetição). */
function paintLoopWall(c: CanvasRenderingContext2D, W: number, H: number) {
  c.fillStyle = "#1e1d23"
  c.fillRect(0, 0, W, H)
  for (let i = 0; i < 4; i++) {
    const y0 = (i * H) / 4
    c.fillStyle = "#2a2930"
    c.fillRect(4, y0 + 4, W - 8, H / 4 - 8)
    c.fillStyle = "#77767e"
    for (const x of [10, W - 13]) for (const y of [y0 + 10, y0 + H / 4 - 13]) c.fillRect(x, y, 3, 3)
  }
}
function paintLoopWallGlow(c: CanvasRenderingContext2D, W: number, H: number) {
  c.fillStyle = "#000"
  c.fillRect(0, 0, W, H)
  for (let i = 0; i < 4; i++) {
    const y0 = (i * H) / 4
    c.fillStyle = i % 2 ? "#3fe3ff" : "#ffa53a"
    c.fillRect(W * 0.3, y0 + H * 0.06, W * 0.4, H * 0.1)
  }
}

/** Seção da pista (sentido anti-horário: a normal fica do lado de fora). */
function strips(scene: Scene, deck: ReturnType<typeof lit>, side: ReturnType<typeof lit>, under: ReturnType<typeof lit>, rail: ReturnType<typeof lit>, orange: ReturnType<typeof glow>, wall: ReturnType<typeof lit>): StripDef[] {
  const oct = (cx: number, cy: number, r: number) => Array.from({ length: 6 }, (_, i) => [cx + r * Math.cos((i / 6) * Math.PI * 2), cy + r * Math.sin((i / 6) * Math.PI * 2)] as const)
  void scene
  return [
    { pts: [[4.6, 0], [-4.6, 0]], u: [1, 0], vLen: 8, mat: deck },
    { pts: [[5.0, -0.75], [5.0, 0.3], [4.6, 0.3], [4.6, 0]], uLen: 1, vLen: 4, mat: side },
    { pts: [[-4.6, 0], [-4.6, 0.3], [-5.0, 0.3], [-5.0, -0.75]], uLen: 1, vLen: 4, mat: side },
    { pts: [[-5.0, -0.75], [5.0, -0.75]], uLen: 2, vLen: 4, mat: under },
    { pts: [[5.02, -0.52], [5.02, -0.26]], uLen: 1, vLen: 4, mat: orange },
    { pts: [[-5.02, -0.26], [-5.02, -0.52]], uLen: 1, vLen: 4, mat: orange },
    { pts: [[4.58, 0.25], [4.58, 0.12]], uLen: 1, vLen: 4, mat: orange },
    { pts: [[-4.58, 0.12], [-4.58, 0.25]], uLen: 1, vLen: 4, mat: orange },
    { pts: oct(4.75, 1.1, 0.07), closed: true, center: [4.75, 1.1], uLen: 1, vLen: 4, mat: rail },
    { pts: oct(-4.75, 1.1, 0.07), closed: true, center: [-4.75, 1.1], uLen: 1, vLen: 4, mat: rail },
    { pts: oct(4.75, 0.62, 0.045), closed: true, center: [4.75, 0.62], uLen: 1, vLen: 4, mat: rail },
    { pts: oct(-4.75, 0.62, 0.045), closed: true, center: [-4.75, 0.62], uLen: 1, vLen: 4, mat: rail },
    // no loop: as paredes do aro (contínuas, por dentro do corrimão), com as janelas acesas para os dois lados
    { pts: [[5.3, -0.75], [5.3, 1.7], [4.98, 1.7], [4.98, 0.3]], uLen: 1.2, vLen: 8, mat: wall, when: isLoop },
    { pts: [[-4.98, 0.3], [-4.98, 1.7], [-5.3, 1.7], [-5.3, -0.75]], uLen: 1.2, vLen: 8, mat: wall, when: isLoop },
  ]
}

const isLoop = (seg: TrackSeg) => seg.kind === "loop"
/** Torres só fora do loop e longe dele (o loop tem a sua âncora). */
const towerOk = (seg: TrackSeg) => seg.kind !== "loop" && seg.tag !== "tunnel"

export function buildCanyon(scene: Scene, tier: QualityTier, isAlive: () => boolean): Biome {
  const low = tier === "low"
  const dir = `${RN2_BASE}canion/`
  const kit = rnKit(scene, tier)
  const deckTex = canvasTexture(scene, "rn2-canion-deck", 512, 1024, paintDeck)
  const deckGlow = canvasTexture(scene, "rn2-canion-deckglow", 256, 512, paintDeckGlow)
  const sideTex = canvasTexture(scene, "rn2-canion-side", 128, 256, paintSide)
  const deck = lit(scene, "rn2-canion-deck", { tex: deckTex, emissiveTex: deckGlow, spec: 0.35, emissive: "#1a1418" })
  const side = lit(scene, "rn2-canion-side", { tex: sideTex, emissive: "#140c0c", spec: 0.2 })
  const under = lit(scene, "rn2-canion-under", { color: "#1b1a1f", emissive: "#0c0808" })
  const rail = lit(scene, "rn2-canion-rail", { color: "#9a9aa2", emissive: "#2a1c14", spec: 0.6 })
  const orange = glow(scene, "rn2-canion-orange", "#ffa53a")
  const wallTex = canvasTexture(scene, "rn2-canion-wall", 64, 256, paintLoopWall)
  const wallGlow = canvasTexture(scene, "rn2-canion-wallglow", 64, 256, paintLoopWallGlow)
  const wall = lit(scene, "rn2-canion-wall", { tex: wallTex, emissiveTex: wallGlow, spec: 0.3, emissive: "#120a0a" })
  const mats = [deck, side, under, rail, orange, wall]
  const texs = [deckTex, deckGlow, sideTex, wallTex, wallGlow]

  const sky = buildSky(scene, "rn2-canion", {
    stops: [
      [0, "#f0a070"],
      [0.12, "#d77c6a"],
      [0.32, "#8a4f86"],
      [0.62, "#2c2b6a"],
      [1, "#0b1032"],
    ],
    stars: 380,
    moon: { color: "#e8e2cf", size: 26, at: [0.72, 0.14] },
    horizon: { color: "rgba(255,170,90,0.55)", at: 0.3, spread: 0.32 },
  })
  const sea = buildSea(scene, "rn2-canion", {
    y: -62,
    tile: 700,
    color: "#ffd9b0",
    emissive: "#b06a4e",
    paint: paintClouds("#e0a88a", "rgba(255,236,206,0.6)", "rgba(190,120,120,0.3)"),
    flow: [1.2, 0.6],
  })
  const falls = buildFall(scene, "rn2-canion", "#e9fbff", "#6fd2ff", "#ffffff")

  const disposers: (() => void)[] = []
  const ready = (async (): Promise<TrackLook> => {
    const [assets, rib, portal, post, truss, bracket, sign] = await Promise.all([
      loadCanyonAssets(scene, isAlive),
      kit.load(`${dir}rn2-canion-rib.glb`, "rn2-canion-rib"),
      kit.load(`${dir}rn2-canion-portal.glb`, "rn2-canion-portal"),
      kit.load(`${dir}rn2-canion-post.glb`, "rn2-canion-post"),
      kit.load(`${dir}rn2-canion-truss.glb`, "rn2-canion-truss"),
      kit.load(`${dir}rn2-canion-bracket.glb`, "rn2-canion-bracket"),
      kit.load(`${dir}rn2-canion-sign.glb`, "rn2-canion-sign").catch(() => ({ body: null, glow: null })),
    ])
    disposers.push(() => assets.dispose())
    const along: AlongDef[] = []
    const both = (m: Mesh | null, d: Omit<AlongDef, "mesh">) => {
      if (m) along.push({ mesh: m, ...d })
    }
    // postes do corrimão a cada 3 m (fora do loop: lá a nervura faz o papel)
    for (const m of [post.body, post.glow]) both(m, { every: 4, xs: [4.75, -4.75], mirror: true, when: (seg) => !isLoop(seg) })
    // torres a cada 42 m: mão-francesa no piso + módulos até as nuvens
    for (const m of [bracket.body, bracket.glow]) both(m, { every: 42, phase: 20, xs: [0], when: (seg) => towerOk(seg) })
    for (const m of [truss.body, truss.glow]) both(m, { every: 42, phase: 20, xs: [0], toGround: -70, stack: 12, below: 1.9, when: (seg) => towerOk(seg) })
    // o loop: nervura a cada 4 m em volta e a âncora embaixo da entrada/saída
    const ribAt = (seg: TrackSeg) => (isLoop(seg) ? Array.from({ length: Math.floor(seg.len / 4) }, (_, i) => seg.s0 + 2 + i * 4) : [])
    for (const m of [rib.body, rib.glow]) both(m, { at: ribAt, xs: [0] })
    const anchorAt = (seg: TrackSeg) => (isLoop(seg) ? [seg.s0 + 2, seg.s0 + seg.len - 2] : [])
    for (const m of [truss.body, truss.glow]) both(m, { at: anchorAt, xs: [0], toGround: -70, stack: 12, below: 1.9 })
    // portal de descida na boca da descida; placa de loop 40 m antes dele
    const portalAt = (seg: TrackSeg) => (seg.tag === "portal" && seg.climb === 0 ? [seg.s0 + seg.len - 4] : [])
    for (const m of [portal.body, portal.glow]) both(m, { at: portalAt, xs: [0] })
    const signAt = (seg: TrackSeg) => (seg.tag === "hero" && seg.kind === "straight" ? [seg.s0 + 6] : [])
    for (const m of [sign.body, sign.glow]) both(m, { at: signAt, xs: [6.4, -6.4] })

    // instâncias finas: a fonte volta para a origem e sem LOD (a versão leve vai direto para o longe)
    const A = new Map<string, Mesh>()
    const L = new Map<string, Mesh>()
    for (const [k, m] of assets.meshes) {
      const lod = m.getLODLevels()[0]?.mesh as Mesh | null | undefined
      for (const l of [...m.getLODLevels()]) m.removeLODLevel(l.mesh)
      m.position.setAll(0)
      A.set(k, m)
      if (lod) {
        lod.position.setAll(0)
        L.set(k, lod)
      }
    }
    const dress: DressDef[] = []
    const far: DressDef[] = []
    const add = (list: DressDef[], m: Mesh | undefined | null, d: Omit<DressDef, "mesh">) => {
      if (m) list.push({ mesh: m, ...d })
    }
    // médio: pilares de rocha que sobem das nuvens, ilhas flutuantes com moinho; as cachoeiras caem DELAS
    const fallFromIsland = { mesh: falls.mesh, at: [0.33, -0.08, 0] as const, scale: 1, size: [0.13, 3.2] as const, yaw: -Math.PI / 2, p: 0.6 }
    const fallFromRock = { mesh: falls.mesh, at: [0.98, 2.35, 0] as const, scale: 1, size: [0.28, 3.4] as const, yaw: -Math.PI / 2, p: 0.3 }
    add(dress, A.get("rocha"), { per: low ? 1.2 : 2.2, lateral: [24, 90], base: "ground", y: [0, 0], scale: [22, 34], clear: 1.4, stretch: [1, 1.15], loopClear: 40, riders: [fallFromRock] })
    add(dress, A.get("ilha"), {
      per: low ? 0.5 : 0.9,
      lateral: [40, 130],
      base: "track",
      y: [-14, 16],
      scale: [26, 44],
      clear: 0.55,
      loopClear: 60,
      riders: [...(A.get("moinho") ? [{ mesh: A.get("moinho")!, at: [0, 0.42, 0] as const, scale: 0.42, p: 0.55 }] : []), fallFromIsland],
    })
    // longe: paredões em camadas, arcos monumentais, ilhas grandes
    add(far, L.get("paredao") ?? A.get("paredao"), { per: low ? 3 : 5, lateral: [170, 520], base: "ground", y: [-8, 0], scale: [130, 230], clear: 0.5, face: true })
    add(far, A.get("arco"), { per: low ? 0.4 : 0.7, lateral: [220, 520], base: "ground", y: [-10, 0], scale: [170, 280], clear: 0.5, face: true })
    add(far, L.get("ilha") ?? A.get("ilha"), { per: low ? 0.6 : 1.1, lateral: [160, 460], base: "track", y: [10, 90], scale: [60, 120], clear: 0.5, riders: [{ ...fallFromIsland, p: 0.5 }] })

    return { strips: strips(scene, deck, side, under, rail, orange, wall), along, dress, far, groundY: -70 }
  })()

  return {
    phase: "canion",
    obstacleDir: dir,
    light: {
      clear: "#3a2a4a",
      fog: "#b97b72",
      fogStart: 140,
      fogEnd: 1250,
      hemi: { dir: [0.2, 1, -0.3], sky: "#c9b6e8", ground: "#8a4a32", k: 0.78 },
      sun: { dir: [-0.6, -0.55, 0.45], color: "#ffc490", k: 0.95 },
      bloom: { threshold: 0.62, weight: 0.55 },
      contrast: 1.12,
      exposure: 1.05,
    },
    ready,
    update(dt, cam: Vector3) {
      sea.update(dt, cam)
      falls.update(dt)
    },
    dispose() {
      for (const d of disposers) d()
      sky.dispose()
      sea.dispose()
      falls.dispose()
      kit.dispose()
      for (const m of mats) m.dispose()
      for (const t of texs) t.dispose()
    },
  }
}
