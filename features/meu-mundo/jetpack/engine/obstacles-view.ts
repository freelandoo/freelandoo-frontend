// features/meu-mundo/jetpack/engine/obstacles-view.ts — JETPACK (mm3d-63): as prensas e os galões.
//
// Cada tipo da regra tem um MOLDE desenhado uma vez (ferro, latão, faixa de
// perigo amarela e preta, dentes de aço na borda que esmaga) e cópias que
// dividem a geometria. Cada quadro: o que está à vista ganha cópias, a pose
// sai das MESMAS funções da regra (pressV/pressH/crusherB/pistonE/gearAt) e o
// que ficou para trás devolve as cópias.
//
// A borda que esmaga fica exatamente onde a regra bate: a placa é desenhada
// com a borda de trabalho em y = 0 do molde e o corpo "para dentro" do teto,
// do chão ou da parede (lá dentro a pedra esconde o resto).
//
// FASES (mm3d-75): os tipos novos têm moldes simples que ESCALAM até o tamanho
// da regra — placa (cubo 1×1×1), filete aceso, placa com furo redondo, aro,
// rocha, cristal e tronco — com a pele da fase (cores e material). O desenho
// bate com a colisão: as placas de uma janela são os mesmos retângulos de
// windowRects; o anel é a placa com furo do raio da regra; rocha e cristal
// cobrem o disco.
//
// V3 visual (2026-11-09): as cópias são INSTÂNCIAS do molde (uma chamada de
// desenho por tipo, não uma por cópia — o Orbital tinha 125 chamadas, 28 só de
// molduras). Os moldes ficam longe da vista (y −5000), ligados: instância de
// molde desligado não aparece. Moldura de peça do Tripo (useFrameKit): borda
// repetida + 4 cantos, sempre INTEIRA por fora do vão (o vão é o caminho livre).

import type { Scene } from "@babylonjs/core/scene"
import type { Mesh } from "@babylonjs/core/Meshes/mesh"
import type { AbstractMesh } from "@babylonjs/core/Meshes/abstractMesh"
import "@babylonjs/core/Meshes/instancedMesh"
import { TransformNode } from "@babylonjs/core/Meshes/transformNode"
import { CreatePlane } from "@babylonjs/core/Meshes/Builders/planeBuilder"
import { DynamicTexture } from "@babylonjs/core/Materials/Textures/dynamicTexture"
import { Vector3 } from "@babylonjs/core/Maths/math.vector"
import { Constants } from "@babylonjs/core/Engines/constants"
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial"
import { Color3 } from "@babylonjs/core/Maths/math.color"
import { Matrix } from "@babylonjs/core/Maths/math.vector"
import { SteamGeo } from "../../engine/steampunk/geo"
import { SP, place, xf, facing, type RGB } from "../../engine/steampunk/scenery"
import {
  TUNNEL,
  PIPE_R,
  DEPTH,
  WINDOW_KINDS,
  beamY,
  crusherB,
  discAt,
  gearAt,
  pistonE,
  pressH,
  pressV,
  ringAt,
  windowAt,
  windowRects,
  type Can,
  type Flight,
  type Obstacle,
  type Rect,
} from "../sim/flight"
import type { PhaseId } from "../sim/phases"
import { JetGeo } from "./jet-geo"
import { fuseGlow } from "../../engine/steampunk/glow-fuse"

const { W, H } = TUNNEL
const YELLOW: RGB = [0.95, 0.72, 0.02]
const BLACK: RGB = [0.07, 0.07, 0.08]
const RED_LAMP: RGB = [1, 0.25, 0.12]
const FUEL: RGB = [0.29, 0.98, 0.64]
const mixRGB = (a: RGB, b: RGB, k: number): RGB => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k]

type Key = "slab" | "hammer" | "pipe" | "gear" | "can" | "panel" | "petal" | "energy" | "bar" | "hole" | "rim" | "rock" | "gem" | "log" | "frame" | "girder" | "rail" | "carriage" | "tile" | "corner" | "halo"
/** Pedaços de borda por lado da janela (no máximo). */
const TILES = 3
/** Pedaços de borda numa viga (12 m de lado a lado). */
const BEAM_TILES = 6

/** A pele dos obstáculos novos em cada fase (mm3d-75). */
interface Skin {
  panel: RGB
  /** Pétala da flor / placa da viga. */
  petal: RGB
  /** Filete aceso em volta dos vãos. */
  edge: RGB
  /** Cor da membrana de energia. */
  field: RGB
  /** O anel é uma membrana de energia (true) ou parede sólida. */
  ringField: boolean
  /** As placas das janelas da fase são de energia (barreira de energia, cidade). */
  windowField: boolean
  rim: RGB
  rock: RGB
  gem: RGB
  /** Viga desenhada como tronco. */
  log: boolean
}
const SKINS: Record<PhaseId, Skin> = {
  industrial: { panel: SP.iron, petal: SP.brass, edge: [1, 0.7, 0.3], field: [1, 0.6, 0.2], ringField: false, windowField: false, rim: SP.brass, rock: SP.stone, gem: [0.8, 0.9, 1], log: false },
  canion: { panel: [0.62, 0.34, 0.2], petal: [0.42, 0.45, 0.5], edge: [1, 0.8, 0.25], field: [1, 0.78, 0.3], ringField: true, windowField: false, rim: [0.56, 0.55, 0.56], rock: [0.66, 0.36, 0.2], gem: [0.9, 0.7, 0.5], log: false },
  orbital: { panel: [0.62, 0.66, 0.78], petal: [0.5, 0.55, 0.68], edge: [0.25, 0.9, 1], field: [0.35, 0.85, 1], ringField: true, windowField: true, rim: [0.2, 0.24, 0.34], rock: [0.3, 0.32, 0.4], gem: [0.6, 0.9, 1], log: false },
  floresta: { panel: [0.2, 0.2, 0.36], petal: [0.24, 0.22, 0.42], edge: [0.2, 1, 0.85], field: [0.35, 1, 0.85], ringField: true, windowField: false, rim: [0.2, 0.12, 0.08], rock: [0.3, 0.28, 0.24], gem: [0.7, 0.4, 1], log: true },
  forja: { panel: [0.17, 0.14, 0.13], petal: [0.3, 0.24, 0.2], edge: [1, 0.5, 0.12], field: [1, 0.4, 0.1], ringField: false, windowField: false, rim: [0.32, 0.27, 0.24], rock: [0.14, 0.1, 0.08], gem: [1, 0.6, 0.3], log: false },
  artico: { panel: [0.36, 0.56, 0.76], petal: [0.7, 0.85, 0.95], edge: [0.55, 0.95, 1], field: [0.6, 0.95, 1], ringField: false, windowField: false, rim: [0.82, 0.92, 0.98], rock: [0.7, 0.86, 0.96], gem: [0.75, 0.92, 1], log: false },
  vacuo: { panel: [0.16, 0.14, 0.26], petal: [0.3, 0.2, 0.5], edge: [0.7, 0.5, 1], field: [0.6, 0.4, 1], ringField: true, windowField: false, rim: [0.3, 0.3, 0.4], rock: [0.3, 0.28, 0.3], gem: [0.8, 0.7, 1], log: false },
}
/** Um molde: a malha do corpo e a do brilho (lâmpadas, janela do galão). */
interface Mold {
  body: Mesh
  glow: Mesh | null
}
/** Uma cópia em uso. */
interface Part {
  key: Key
  body: AbstractMesh
  glow: AbstractMesh | null
}

export interface ObstaclesView {
  sync: (f: Flight, zFrom: number, zTo: number, now: number) => void
  /** Onde estava um galão (para o brilho de pegar). */
  canAt: (id: number) => Can | null
  /** Galões à vista agora (para as faíscas em volta deles). Mesmo array a cada quadro. */
  canPoints: () => readonly Vector3[]
  /** Troca o molde de uma peça por um modelo (GLB do Tripo): o anel e a rocha do Cânion. */
  useModel: (key: "rim" | "rock" | "panel" | "petal" | "gear" | "gem" | "can", mesh: Mesh, opts?: { zScale?: number; fitBox?: boolean; bake?: Matrix; upright?: boolean }) => void
  /**
   * Moldura das janelas com peças do Tripo: `tile` = pedaço reto (altura 1, comprimento `len`, centro em
   * x/y, frente em z 0; no lado de cima a parte de baixo do modelo — os pingentes — vira para o vão);
   * `corner` = canto "┐" (canto de fora na origem, braços para −x e −y, altura 1, braço com `arm` de
   * espessura e `armLen` de comprimento em x).
   */
  useFrameKit: (tile: Mesh, corner: Mesh, opts: { len: number; arm: number; armLen: number; profile?: number; beam?: boolean }) => void
  dispose: () => void
}

/** Placa de prensa: borda de trabalho em y = 0, corpo para +y, frente em z = 0 (profundidade d). */
function slab(g: SteamGeo, l: SteamGeo, d: number) {
  const w = W + 1.6
  const h = 9.6
  g.box(w, h - 0.34, d, place(0, 0.34 + (h - 0.34) / 2, d / 2), SP.iron)
  // chapa de aço da borda e os dentes (losangos) que esmagam
  g.box(w, 0.14, d, place(0, 0.27, d / 2), SP.steel)
  for (let x = -w / 2 + 0.3; x < w / 2; x += 0.5) g.box(0.24, 0.24, d * 0.92, xf(x, 0.17, d / 2, 0, undefined, 0, Math.PI / 4), SP.steelLight)
  // faixa de perigo na frente e atrás (listras inclinadas presas entre dois frisos)
  for (const fz of [-0.025, d + 0.025]) {
    g.box(w, 0.8, 0.03, place(0, 0.75, fz), BLACK)
    for (let x = -w / 2 + 0.25; x < w / 2; x += 0.7) g.box(0.32, 0.92, 0.04, xf(x, 0.75, fz, 0, undefined, 0, 0.6), YELLOW)
    g.box(w, 0.14, 0.06, place(0, 1.22, fz), SP.brassDark)
    g.box(w, 0.1, 0.06, place(0, 0.36, fz), SP.ironHi)
  }
  // cintas de latão, rebites e o emblema de engrenagem no meio da chapa
  for (const y of [2.2, 4.4, 6.6]) g.box(w, 0.16, d + 0.06, place(0, y, d / 2), SP.brass)
  for (let x = -w / 2 + 0.6; x < w / 2; x += 1.2) for (const y of [1.6, 3.3, 5.5]) g.box(0.1, 0.1, 0.05, place(x, y, -0.03), SP.brassDark)
  g.gear(0.9, 0.08, 10, facing(0, 3.3, -0.05), SP.bronze, SP.brass)
  // lâmpadas vermelhas de aviso nos cantos da borda
  for (const x of [-W / 2 + 0.5, W / 2 - 0.5]) {
    g.box(0.3, 0.3, 0.08, place(x, 1.55, -0.05), SP.ironHi)
    l.box(0.2, 0.2, 0.06, place(x, 1.55, -0.1), RED_LAMP)
  }
}

/** Cabeça do pilão (meia largura): borda em y = 0, corpo até 9 m, centro em x = 0 do molde. */
function hammer(g: SteamGeo, l: SteamGeo, d: number) {
  const w = W / 2 + 0.8
  g.box(w, 8.6, d, place(0, 0.4 + 4.3, d / 2), SP.ironWarm)
  g.box(w, 0.4, d, place(0, 0.2, d / 2), SP.steel)
  for (let x = -w / 2 + 0.25; x < w / 2; x += 0.45) g.box(0.22, 0.22, d * 0.9, xf(x, 0.12, d / 2, 0, undefined, 0, Math.PI / 4), SP.steelLight)
  // guias de latão e o cilindro de vapor na frente
  for (const x of [-w / 2 + 0.3, w / 2 - 0.3]) g.box(0.24, 8.4, d + 0.1, place(x, 4.6, d / 2), SP.brass)
  g.cylinder(1.2, 3.4, place(0, 3.2, -0.3), SP.copper, 12)
  g.box(1.5, 0.16, 1.5, place(0, 1.5, -0.3), SP.brassDark)
  g.box(1.5, 0.16, 1.5, place(0, 4.9, -0.3), SP.brassDark)
  for (const fz of [-0.025, d + 0.025]) {
    g.box(w, 0.6, 0.03, place(0, 0.75, fz), BLACK)
    for (let x = -w / 2 + 0.2; x < w / 2; x += 0.6) g.box(0.26, 0.72, 0.04, xf(x, 0.75, fz, 0, undefined, 0, 0.6), YELLOW)
  }
  l.box(0.22, 0.22, 0.06, place(0, 1.25, -0.95), RED_LAMP)
}

/** Cano grosso de lado a lado (eixo x), com flanges e um registro no meio. */
function pipe(g: SteamGeo, d: number) {
  const z = d / 2
  g.tube([-W / 2 - 1.5, 0, z], [W / 2 + 1.5, 0, z], PIPE_R, SP.copper, 12)
  for (let x = -W / 2 + 0.6; x < W / 2; x += 1.8) g.cylinder(PIPE_R * 2.5, 0.16, xf(x, 0, z, 0, undefined, 0, Math.PI / 2), SP.brassDark, 12)
  g.ring(1.1, 0.07, facing(0, 0, -0.1), SP.bronze, 14)
  g.box(1, 0.06, 0.06, place(0, 0, -0.1), SP.bronze)
  g.box(0.06, 1, 0.06, place(0, 0, -0.1), SP.bronze)
  g.box(0.3, 0.3, 0.5, place(0, 0, -0.05), SP.brass)
}

/** Engrenagem de raio 1 (escala pela regra), de frente para o jogador. */
function gear(g: SteamGeo, d: number) {
  g.gear(1, d, 14, facing(0, 0, d / 2), SP.brassDark, SP.iron)
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * Math.PI * 2
    g.box(0.09, 0.09, 0.05, place(Math.cos(a) * 0.45, Math.sin(a) * 0.45, -0.04), SP.brass)
  }
}

/** Galão de combustível: corpo de latão, tampas de ferro e a janela verde acesa. */
function can(g: SteamGeo, l: SteamGeo) {
  g.cylinder(0.62, 0.86, place(0, 0, 0), SP.brass, 12)
  g.cylinder(0.68, 0.1, place(0, 0.45, 0), SP.iron, 12)
  g.cylinder(0.68, 0.1, place(0, -0.45, 0), SP.iron, 12)
  g.cylinder(0.22, 0.16, place(0, 0.57, 0), SP.copper, 8)
  g.box(0.46, 0.06, 0.08, place(0, 0.72, 0), SP.ironHi)
  l.cylinder(0.65, 0.3, place(0, 0, 0), FUEL, 12)
}

export function buildObstacles(scene: Scene, mats: { trim: StandardMaterial; glow: StandardMaterial }, phase: PhaseId = "industrial"): ObstaclesView {
  const skin = SKINS[phase] ?? SKINS.industrial
  // membrana de energia: emissiva, translúcida, sem escrever profundidade
  const fieldMat = new StandardMaterial("jt-field", scene)
  fieldMat.disableLighting = true
  fieldMat.emissiveColor = new Color3(1, 1, 1)
  fieldMat.diffuseColor = new Color3(0, 0, 0)
  fieldMat.specularColor = new Color3(0, 0, 0)
  // a membrana é discreta nas fases abertas (o anel aparece "solto" como na arte), mas visível
  fieldMat.alpha = phase === "canion" ? 0.14 : phase === "orbital" || phase === "floresta" ? 0.2 : 0.36
  fieldMat.backFaceCulling = false
  fieldMat.disableDepthWrite = true
  // Jetpack 3.0: a parede de uma janela/anel é VIDRO da fase (cor lisa, sem textura: escalar até o
  // retângulo da regra não estica nada). Antes era um cubo com a textura do acabamento (ou o paredão
  // esculpido do Tripo) escalado de 0,3 × 13 m a 13 × 9,5 m: forma e textura deformavam.
  const wallGlass = new StandardMaterial("jt-wall-glass", scene)
  wallGlass.diffuseColor = new Color3(1, 1, 1)
  // tom da fase forte o bastante para a parede (que é colisão) ler contra céu claro (Ártico, Orbital)
  wallGlass.emissiveColor = new Color3(0.5, 0.5, 0.52)
  wallGlass.specularColor = new Color3(0.6, 0.6, 0.6)
  wallGlass.specularPower = 48
  wallGlass.alpha = 0.46
  wallGlass.backFaceCulling = false
  wallGlass.disableDepthWrite = true
  // moldura e vigas: cor lisa (seção fixa; só o comprimento acompanha a regra)
  const frameMat = new StandardMaterial("jt-frame", scene)
  frameMat.diffuseColor = new Color3(1, 1, 1)
  frameMat.specularColor = new Color3(0.25, 0.25, 0.25)
  frameMat.emissiveColor = new Color3(0.08, 0.08, 0.08)
  const molds = new Map<Key, Mold>()
  // os moldes ficam ligados e longe da vista: as instâncias é que aparecem
  const hold = new TransformNode("jt-obstacle-molds", scene)
  hold.position.y = -5000
  const park = (m: Mesh) => {
    m.parent = hold
    m.position.set(0, 0, 0)
    // o modelo do glTF vem com quaternion: com ele, `rotation` é ignorada (o pedaço de pé ficava deitado)
    m.rotationQuaternion = null
    m.rotation.set(0, 0, 0)
    m.scaling.set(1, 1, 1)
    m.isPickable = false
    m.setEnabled(true)
  }
  const make = (key: Key, fn: (g: JetGeo, l: JetGeo) => void, bodyMat: StandardMaterial = mats.trim) => {
    const g = new JetGeo()
    const l = new JetGeo()
    l.uv = "flat"
    if (bodyMat !== mats.trim) g.uv = "flat"
    fn(g, l)
    let body = g.build(`jt-${key}`, scene, bodyMat, false)
    let glow = l.vertexCount ? l.build(`jt-${key}-glow`, scene, mats.glow, false) : null
    // V3 chamadas: com o corpo de acabamento, o brilho vai dentro dele (2 chamadas → 1);
    // corpo de vidro ou de brilho fica como era (a cor do brilho não pode ficar transparente)
    if (glow && bodyMat === mats.trim) {
      body = fuseGlow(body, glow)
      glow = null
    }
    park(body)
    if (glow) park(glow)
    molds.set(key, { body, glow })
  }
  make("slab", (g, l) => slab(g, l, DEPTH.pressV))
  make("hammer", (g, l) => hammer(g, l, DEPTH.crusher))
  make("pipe", (g) => pipe(g, DEPTH.pipes))
  make("gear", (g) => gear(g, DEPTH.gears))
  make("can", can)
  // halo do galão: placa sempre de frente, textura radial somada à cena (brilho sem GlowLayer)
  const haloTex = new DynamicTexture("jt-halo-tex", { width: 64, height: 64 }, scene, false)
  {
    const c = haloTex.getContext() as CanvasRenderingContext2D
    const g = c.createRadialGradient(32, 32, 0, 32, 32, 32)
    g.addColorStop(0, "rgba(255,255,255,1)")
    g.addColorStop(0.35, "rgba(255,255,255,0.55)")
    g.addColorStop(1, "rgba(255,255,255,0)")
    c.fillStyle = g
    c.fillRect(0, 0, 64, 64)
    haloTex.hasAlpha = true
    haloTex.update()
  }
  const haloMat = new StandardMaterial("jt-halo", scene)
  haloMat.disableLighting = true
  haloMat.emissiveColor = new Color3(FUEL[0], FUEL[1], FUEL[2])
  haloMat.diffuseColor = new Color3(0, 0, 0)
  haloMat.specularColor = new Color3(0, 0, 0)
  haloMat.opacityTexture = haloTex
  haloMat.alphaMode = Constants.ALPHA_ADD
  haloMat.disableDepthWrite = true
  haloMat.backFaceCulling = false
  const haloMold = CreatePlane("jt-halo", { size: 1 }, scene)
  haloMold.material = haloMat
  haloMold.billboardMode = TransformNode.BILLBOARDMODE_ALL
  park(haloMold)
  molds.set("halo", { body: haloMold, glow: null })
  // moldes das fases: tudo de tamanho 1, escalado pela regra (frente em z = 0, fundo em z = 1)
  make("panel", (g) => g.box(1, 1, 1, place(0, 0, 0.5), skin.panel), wallGlass)
  make("petal", (g) => g.box(1, 1, 1, place(0, 0, 0.5), skin.petal), wallGlass)
  // perfil da moldura: 0,28 × 0,28, comprimento 1 (em x), frente em z = 0; chanfro de luz na frente
  // (sem filete aceso próprio: o vão já tem os filetes `bar`; cada malha a mais é uma chamada por cópia)
  make("frame", (g) => {
    g.box(1, 0.28, 0.28, place(0, 0, 0.1), skin.rim)
    g.box(1, 0.08, 0.06, place(0, 0.1, -0.06), mixRGB(skin.rim, [1, 1, 1], 0.25))
  }, frameMat)
  // MECANISMO do que se mexe (Gate B): trilho fixo (perfil de 1 m em x, seção 0,2) e o carro com motor,
  // amortecedores e a lâmpada âmbar de aviso. Ficam POR FORA da caixa do voo (paredes, teto, chão).
  make("rail", (g) => {
    g.box(1, 0.2, 0.34, place(0, 0, 0.17), mixRGB(skin.rim, [0, 0, 0], 0.35))
    g.box(1, 0.06, 0.4, place(0, 0.12, 0.17), skin.rim)
  }, frameMat)
  make("carriage", (g, l) => {
    g.box(0.62, 1.1, 0.7, place(0, 0, 0.35), skin.rim)
    g.cylinder(0.42, 0.5, xf(0, 0.25, 0.35, 0, undefined, 0, Math.PI / 2), mixRGB(skin.rim, [0, 0, 0], 0.4), 10)
    for (const y of [-0.62, 0.62]) g.box(0.5, 0.14, 0.5, place(0, y, 0.35), BLACK)
    l.box(0.3, 0.18, 0.08, place(0, -0.28, -0.03), [1, 0.62, 0.12])
  }, frameMat)
  // viga sólida (a barra que corta o túnel): caixa de cor lisa + friso aceso; frente em z = 0
  make("girder", (g) => g.box(1, 1, 1, place(0, 0, 0.5), skin.petal), frameMat)
  make("energy", (g) => g.box(1, 1, 0.25, place(0, 0, 0.5), skin.field), fieldMat)
  make("bar", (g) => g.box(1, 0.16, 0.16, place(0, 0, -0.06), skin.edge), mats.glow)
  make("hole", (g) => g.holePlate(1, place(0, 0, 0), skin.ringField ? skin.field : skin.panel), skin.ringField ? fieldMat : wallGlass)
  make("rim", (g, l) => {
    // o aro começa na borda do vão (raio 1): nada do desenho entra no furo
    g.ring(2.26, 0.24, xf(0, 0, -0.08, 0, undefined, Math.PI / 2), skin.rim, 40, 6)
    l.ring(2.3, 0.07, xf(0, 0, -0.22, 0, undefined, Math.PI / 2), skin.edge, 40, 4)
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2
      l.box(0.16, 0.16, 0.08, place(Math.cos(a) * 1.15, Math.sin(a) * 1.15, -0.24), skin.edge)
    }
    // quatro grampos de pedra/metal no aro (como na arte do Alex)
    for (let k = 0; k < 4; k++) {
      const a = (k / 4) * Math.PI * 2 + Math.PI / 4
      g.box(0.42, 0.34, 0.5, xf(Math.cos(a) * 1.22, Math.sin(a) * 1.22, -0.08, 0, undefined, 0, a), skin.rim)
    }
  })
  make("rock", (g) => g.rock(3, place(0, 0, 0), skin.rock))
  make("gem", (g, l) => {
    g.gem(0.9, place(0, 0, 0), skin.gem)
    l.gem(1.05, Matrix.Scaling(0.42, 0.42, 1), skin.edge)
  })
  make("log", (g, l) => {
    g.cylinder(1, 1, xf(0, 0, 0, 0, undefined, 0, Math.PI / 2), skin.panel, 10)
    for (const x of [-0.3, 0.1, 0.38]) l.cylinder(1.03, 0.015, xf(x, 0, 0, 0, undefined, 0, Math.PI / 2), skin.edge, 10)
  })

  const free = new Map<Key, Part[]>()
  let rimZ = 1
  let seq = 0
  const take = (key: Key): Part => {
    const list = free.get(key)
    const got = list?.pop()
    if (got) {
      got.body.setEnabled(true)
      got.glow?.setEnabled(true)
      return got
    }
    const m = molds.get(key)!
    const id = ++seq
    const body = m.body.createInstance(`jt-${key}-${id}`)
    // a instância nasce com o PAI do molde (o nó a −5000): solta no mundo
    body.parent = null
    body.rotationQuaternion = null
    body.isPickable = false
    let glow: AbstractMesh | null = null
    if (m.glow) {
      glow = m.glow.createInstance(`jt-${key}-glow-${id}`)
      glow.isPickable = false
      glow.parent = body
    }
    return { key, body, glow }
  }
  const give = (p: Part) => {
    p.body.setEnabled(false)
    p.glow?.setEnabled(false)
    let list = free.get(p.key)
    if (!list) free.set(p.key, (list = []))
    list.push(p)
  }

  /** Cópias de cada obstáculo à vista (id → peças). */
  const shown = new Map<number, Part[]>()
  const cans = new Map<number, { part: Part; halo: Part; can: Can }>()
  const canPts: Vector3[] = []
  const partsFor = (o: Obstacle): Part[] => {
    switch (o.kind) {
      case "pressV":
      case "pressH":
      case "crusher":
        return [take(o.kind === "crusher" ? "hammer" : "slab"), take(o.kind === "crusher" ? "hammer" : "slab")]
      case "piston":
        return [take("slab")]
      case "pipes":
        return Number.isFinite(o.x0) ? [take("pipe"), take("pipe")] : [take("pipe")]
      case "gears":
        return o.gears.map(() => take("gear"))
      case "ring":
        // + dois braços de fixação do aro até as laterais (dentro da área que já é colisão) e, se ele anda,
        // o trilho e o carro nas duas paredes
        return [take("hole"), take("rim"), ...frame(skin.ringField), take("frame"), take("frame"), ...mech(o)]
      case "beam":
        if (kit?.beam) {
          // viga de borda do Tripo repetida (a grossura é a da regra; o pedaço não estica mais que ~1,5×)
          const out: Part[] = []
          for (let i = 0; i < BEAM_TILES; i++) out.push(take("tile"))
          return [...out, take("bar"), take("bar"), ...mech(o)]
        }
        return [take(skin.log ? "log" : "girder"), take("bar"), take("bar"), ...mech(o)]
      case "rocks":
        return o.gears.map(() => take("rock"))
      case "crystals":
        return o.gears.map(() => take("gem"))
      default:
        if (kit) {
          // janelas com moldura do Tripo: 4 placas + 4 filetes + TILES pedaços por lado + 4 cantos
          const out = [...frame(o.kind === "energy" || (skin.windowField && o.kind !== "slider"), o.kind === "iris"), take("bar"), take("bar"), take("bar"), take("bar")]
          for (let i = 0; i < 4 * TILES; i++) out.push(take("tile"))
          for (let i = 0; i < 4; i++) out.push(take("corner"))
          return [...out, ...mech(o)]
        }
        // janelas: 4 placas + 4 filetes em volta do vão
        return [...frame(o.kind === "energy" || (skin.windowField && o.kind !== "slider"), o.kind === "iris"), take("bar"), take("bar"), take("bar"), take("bar"), take("frame"), take("frame"), take("frame"), take("frame"), ...mech(o)]
    }
  }
  /** Trilho + carro dos dois lados para o que sobe e desce (`a` ≠ 0); nada para o que é parado. */
  function mech(o: Obstacle): Part[] {
    if (!o.a || o.kind === "iris") return []
    return [take("rail"), take("rail"), take("carriage"), take("carriage")]
  }
  /** As 4 placas de uma janela (de energia, de pétala ou a placa da fase). */
  function frame(field: boolean, petal = false): Part[] {
    const k: Key = field ? "energy" : petal ? "petal" : "panel"
    return [take(k), take(k), take(k), take(k)]
  }
  const rects: Rect[] = []
  /** Placa no retângulo r (frente na face do obstáculo, fundo `d`); some se não houver retângulo. */
  const slabAt = (p: Part, r: Rect | undefined, z: number, d: number) => {
    if (!r) {
      p.body.setEnabled(false)
      return
    }
    p.body.setEnabled(true)
    p.body.position.set((r.x0 + r.x1) / 2, (r.y0 + r.y1) / 2, z)
    p.body.rotation.set(0, 0, 0)
    p.body.scaling.set(Math.max(0.01, r.x1 - r.x0), Math.max(0.01, r.y1 - r.y0), d)
  }
  /** Filete aceso centrado em (x, y), deitado ou de pé, preso dentro do túnel. */
  const barAt = (p: Part, x: number, y: number, len: number, vertical: boolean, z: number) => {
    const lo = vertical ? -0.2 : -W / 2 - 0.2
    const hi = vertical ? H + 0.2 : W / 2 + 0.2
    const c = vertical ? y : x
    const a = Math.max(lo, c - len / 2)
    const b = Math.min(hi, c + len / 2)
    if (b - a < 0.05) {
      p.body.setEnabled(false)
      return
    }
    p.body.setEnabled(true)
    p.body.position.set(vertical ? x : (a + b) / 2, vertical ? (a + b) / 2 : y, z)
    p.body.rotation.set(0, 0, vertical ? Math.PI / 2 : 0)
    p.body.scaling.set(b - a, 1, 1)
  }
  /** Perfil da moldura de (x0, y0) a (x1, y1) — reto, só o comprimento escala; preso dentro de [lo, hi]. */
  const frameAt = (p: Part, x: number, y: number, len: number, vertical: boolean, z: number) => {
    const lo = vertical ? -0.4 : -W / 2 - 0.4
    const hi = vertical ? H + 0.4 : W / 2 + 0.4
    const c = vertical ? y : x
    const a = Math.max(lo, c - len / 2)
    const b = Math.min(hi, c + len / 2)
    // fora da caixa (beirada além da parede/teto) ou curto demais: não desenha
    const off = vertical ? x < -W / 2 - 0.2 || x > W / 2 + 0.2 : y < -0.2 || y > H + 0.2
    if (b - a < 0.1 || off) {
      p.body.setEnabled(false)
      return
    }
    p.body.setEnabled(true)
    p.body.position.set(vertical ? x : (a + b) / 2, vertical ? (a + b) / 2 : y, z)
    p.body.rotation.set(0, 0, vertical ? Math.PI / 2 : 0)
    p.body.scaling.set(b - a, 1, 1)
  }
  /** Trilho e carro do que se mexe: `from` é o índice da 1ª peça; `y` a altura do meio agora; `x` (eixo 1) o meio em x. */
  const mechAt = (o: Obstacle, parts: Part[], from: number, y: number, x: number) => {
    if (parts.length < from + 4) return
    const lateral = o.ax === 1
    for (const k of [0, 1]) {
      const sx = k ? 1 : -1
      const rail = parts[from + k]
      const car = parts[from + 2 + k]
      if (!lateral) {
        // de pé na parede (|x| = W/2 + 0,45), do chão ao teto; o carro sobe e desce com o vão
        rail.body.position.set(sx * (W / 2 + 0.45), H / 2, o.z)
        rail.body.rotation.set(0, 0, Math.PI / 2)
        rail.body.scaling.set(H + 0.8, 1, 1)
        car.body.position.set(sx * (W / 2 + 0.45), Math.max(0.6, Math.min(H - 0.6, y)), o.z - 0.05)
        car.body.rotation.set(0, 0, 0)
      } else {
        // deitado no teto e no chão (fora da caixa); o carro anda de lado com o vão
        rail.body.position.set(0, k ? H + 0.45 : -0.45, o.z)
        rail.body.rotation.set(0, 0, 0)
        rail.body.scaling.set(W + 0.8, 1, 1)
        car.body.position.set(Math.max(-W / 2 + 0.5, Math.min(W / 2 - 0.5, x)), k ? H + 0.6 : -0.6, o.z - 0.05)
        car.body.rotation.set(0, 0, Math.PI / 2)
      }
    }
  }
  // moldura do Tripo (useFrameKit): espessura do perfil, comprimento do pedaço e o canto
  let kit: { p: number; tileLen: number; cs: number; armX: number; len: number; beam: boolean } | null = null
  let gemModel = false
  const canMats: StandardMaterial[] = []
  // rocha de modelo tem cima (neve) e baixo (pedra escura): só balança, não gira inteira
  let rockModel = false
  const inTunnel = (x: number, y: number) => x > -W / 2 - 0.3 && x < W / 2 + 0.3 && y > -0.3 && y < H + 0.3
  /** Um lado da moldura: pedaços iguais de a até b (no eixo do lado), presos dentro do túnel. */
  const kitSide = (parts: Part[], from: number, a: number, b: number, fixed: number, vertical: boolean, rz: number, z: number) => {
    const k = kit!
    const lo = vertical ? -0.3 : -W / 2 - 0.3
    const hi = vertical ? H + 0.3 : W / 2 + 0.3
    const off = vertical ? fixed < -W / 2 - 0.2 || fixed > W / 2 + 0.2 : fixed < -0.2 || fixed > H + 0.2
    a = Math.max(lo, a)
    b = Math.min(hi, b)
    const len = b - a
    const n = off || len < 0.2 ? 0 : Math.min(TILES, Math.max(1, Math.round(len / k.tileLen)))
    const step = n ? len / n : 0
    for (let i = 0; i < TILES; i++) {
      const p = parts[from + i]
      if (i >= n) {
        p.body.setEnabled(false)
        continue
      }
      p.body.setEnabled(true)
      const c = a + step * (i + 0.5)
      p.body.position.set(vertical ? fixed : c, vertical ? c : fixed, z)
      p.body.rotation.set(0, 0, rz)
      // altura = perfil; comprimento = o passo (o pedaço estica ou encolhe no máximo ~1,5×)
      p.body.scaling.set((step / k.tileLen) * k.p, k.p, k.p)
    }
  }
  /** Moldura inteira POR FORA do vão (cx, cy, w, h): nada do desenho entra no caminho livre. */
  const kitFrame = (parts: Part[], from: number, cx: number, cy: number, w: number, h: number, z: number) => {
    const { p, cs, armX } = kit!
    const L = cx - w / 2 - p
    const R = cx + w / 2 + p
    const B = cy - h / 2 - p
    const T = cy + h / 2 + p
    // em cima os pingentes apontam para o vão; embaixo para fora; dos lados, para fora
    kitSide(parts, from, L + armX, R - armX, T - p / 2, false, 0, z)
    kitSide(parts, from + TILES, L + armX, R - armX, B + p / 2, false, 0, z)
    kitSide(parts, from + 2 * TILES, B + armX, T - armX, L + p / 2, true, -Math.PI / 2, z)
    kitSide(parts, from + 3 * TILES, B + armX, T - armX, R - p / 2, true, Math.PI / 2, z)
    // o canto "┐" girado para os quatro cantos
    const corners: [number, number, number][] = [
      [R, T, 0],
      [L, T, -Math.PI / 2],
      [L, B, Math.PI],
      [R, B, Math.PI / 2],
    ]
    for (let q = 0; q < 4; q++) {
      const part = parts[from + 4 * TILES + q]
      const [x, y, rz] = corners[q]
      if (!inTunnel(x, y)) {
        part.body.setEnabled(false)
        continue
      }
      part.body.setEnabled(true)
      part.body.position.set(x, y, z)
      part.body.rotation.set(0, 0, rz)
      part.body.scaling.set(cs, cs, cs)
    }
  }
  const pose = (o: Obstacle, parts: Part[], t: number) => {
    const set = (p: Part, x: number, y: number, rz: number, sx = 1, sy = 1, sz = 1) => {
      p.body.position.set(x, y, o.z)
      p.body.rotation.set(0, 0, rz)
      p.body.scaling.set(sx, sy, sz)
    }
    switch (o.kind) {
      case "pressV": {
        const c = pressV(o, t)
        set(parts[0], 0, c + o.g / 2, 0)
        set(parts[1], 0, c - o.g / 2, Math.PI)
        break
      }
      case "pressH": {
        const c = pressH(o, t)
        // de lado: a placa gira 90° e a borda de trabalho olha para o vão
        set(parts[0], c - o.g / 2, H / 2, Math.PI / 2)
        set(parts[1], c + o.g / 2, H / 2, -Math.PI / 2)
        break
      }
      case "crusher":
        set(parts[0], -(W / 4 + 0.4), crusherB(o, t, -1), 0)
        set(parts[1], W / 4 + 0.4, crusherB(o, t, 1), 0)
        break
      case "piston": {
        const e = pistonE(o, t)
        if (o.side < 0) set(parts[0], -W / 2 + e, H / 2, Math.PI / 2, 1, 1, o.d / DEPTH.pressV)
        else set(parts[0], W / 2 - e, H / 2, -Math.PI / 2, 1, 1, o.d / DEPTH.pressV)
        break
      }
      case "pipes":
        set(parts[0], 0, o.y0, 0)
        if (parts[1]) set(parts[1], o.x0, H / 2, Math.PI / 2)
        break
      case "gears":
        for (let i = 0; i < parts.length; i++) {
          const g = gearAt(o, t, i)
          set(parts[i], g.x, g.y, g.ang, g.r, g.r, 1)
        }
        break
      case "ring": {
        const c = ringAt(o, t)
        parts[0].body.position.set(c.x, c.y, o.z)
        parts[0].body.scaling.set(c.r, c.r, o.d)
        parts[1].body.position.set(c.x, c.y, o.z)
        parts[1].body.scaling.set(c.r, c.r, rimZ)
        parts[1].body.rotation.set(0, 0, t * 0.6)
        rects.length = 0
        windowRects(c.x, c.y, 2 * c.r, 2 * c.r, rects)
        for (let i = 0; i < 4; i++) slabAt(parts[2 + i], rects[i], o.z, o.d)
        // braços do aro às laterais (fora do furo: começam na borda de fora do aro, 1,13 r)
        {
          const ro = c.r * 1.13 + 0.05
          const lw = c.x - ro - (-W / 2 - 0.3)
          const rw = W / 2 + 0.3 - (c.x + ro)
          frameAt(parts[6], c.x - ro - lw / 2, c.y, lw, false, o.z)
          frameAt(parts[7], c.x + ro + rw / 2, c.y, rw, false, o.z)
        }
        mechAt(o, parts, 8, c.y, c.x)
        break
      }
      case "beam": {
        const y = beamY(o, t)
        const len = o.x1 - o.x0
        if (kit?.beam) {
          // pedaços iguais de x0 a x1, altura = a grossura da regra (o.h), frente na face do obstáculo
          const k = kit
          const tl = k.len * o.h
          const n = Math.min(BEAM_TILES, Math.max(1, Math.round(len / tl)))
          const step = len / n
          for (let i = 0; i < BEAM_TILES; i++) {
            const p = parts[i]
            if (i >= n) {
              p.body.setEnabled(false)
              continue
            }
            p.body.setEnabled(true)
            p.body.position.set(o.x0 + step * (i + 0.5), y, o.z)
            p.body.rotation.set(0, 0, i % 2 ? Math.PI : 0)
            p.body.scaling.set(step / k.len, o.h, Math.max(o.h, o.d / 1.05))
          }
          barAt(parts[BEAM_TILES], 0, y + o.h / 2, len, false, o.z)
          barAt(parts[BEAM_TILES + 1], 0, y - o.h / 2, len, false, o.z)
          mechAt(o, parts, BEAM_TILES + 2, y, 0)
          break
        }
        if (skin.log) {
          parts[0].body.position.set((o.x0 + o.x1) / 2, y, o.z + o.d / 2)
          parts[0].body.scaling.set(len, o.h, o.d)
        } else slabAt(parts[0], { x0: o.x0, x1: o.x1, y0: y - o.h / 2, y1: y + o.h / 2 }, o.z, o.d)
        barAt(parts[1], 0, y + o.h / 2, len, false, o.z)
        barAt(parts[2], 0, y - o.h / 2, len, false, o.z)
        mechAt(o, parts, 3, y, 0)
        break
      }
      case "rocks":
      case "crystals":
        for (let i = 0; i < parts.length; i++) {
          const c = discAt(o, t, i)
          parts[i].body.position.set(c.x, c.y, o.z + o.d / 2)
          parts[i].body.scaling.set(c.r, c.r, o.kind === "rocks" ? Math.min(c.r, o.d / 2 + 0.3) : o.d / 1.8)
          // cristal de modelo: nasce do chão ou do teto (o do teto fica de ponta-cabeça)
          parts[i].body.rotation.set(0, 0, o.kind === "rocks" ? (rockModel ? (((o.id + i) % 5) - 2) * 0.12 : o.id * 0.7 + i) : gemModel ? (c.y > H / 2 ? Math.PI : 0) : (i * Math.PI) / 8)
        }
        break
      default: {
        if (!WINDOW_KINDS.has(o.kind)) break
        const v = windowAt(o, t)
        rects.length = 0
        windowRects(v.cx, v.cy, v.w, v.h, rects)
        for (let i = 0; i < 4; i++) slabAt(parts[i], rects[i], o.z, o.d)
        barAt(parts[4], v.cx, v.cy + v.h / 2, v.w, false, o.z)
        barAt(parts[5], v.cx, v.cy - v.h / 2, v.w, false, o.z)
        barAt(parts[6], v.cx - v.w / 2, v.cy, v.h, true, o.z)
        barAt(parts[7], v.cx + v.w / 2, v.cy, v.h, true, o.z)
        if (kit) {
          kitFrame(parts, 8, v.cx, v.cy, v.w, v.h, o.z)
          mechAt(o, parts, 8 + 4 * TILES + 4, v.cy, v.cx)
          break
        }
        // a moldura do vão: perfil de 0,28 por fora da abertura (dentro da parede, que é colisão)
        const fw = 0.14
        frameAt(parts[8], v.cx, v.cy + v.h / 2 + fw, v.w + 4 * fw, false, o.z)
        frameAt(parts[9], v.cx, v.cy - v.h / 2 - fw, v.w + 4 * fw, false, o.z)
        frameAt(parts[10], v.cx - v.w / 2 - fw, v.cy, v.h, true, o.z)
        frameAt(parts[11], v.cx + v.w / 2 + fw, v.cy, v.h, true, o.z)
        mechAt(o, parts, 12, v.cy, v.cx)
      }
    }
  }

  const seen = new Set<number>()
  return {
    sync(f, zFrom, zTo, now) {
      const t = f.t
      seen.clear()
      for (const o of f.course.obstacles) {
        if (o.z > zTo) break
        if (o.z + o.d < zFrom) continue
        seen.add(o.id)
        let parts = shown.get(o.id)
        if (!parts) shown.set(o.id, (parts = partsFor(o)))
        pose(o, parts, t)
      }
      for (const [id, parts] of shown) {
        if (seen.has(id)) continue
        for (const p of parts) give(p)
        shown.delete(id)
      }
      // galões: giram e boiam; pegou, some
      seen.clear()
      for (const c of f.course.cans) {
        if (c.z > zTo) break
        if (c.z < zFrom || c.taken) continue
        seen.add(c.id)
        let v = cans.get(c.id)
        if (!v) {
          const halo = take("halo")
          halo.body.billboardMode = TransformNode.BILLBOARDMODE_ALL
          cans.set(c.id, (v = { part: take("can"), halo, can: c }))
        }
        const cy = c.y + Math.sin(now * 2.4 + c.id) * 0.12
        v.part.body.position.set(c.x, cy, c.z)
        // o halo fica logo atrás do galão e pulsa
        v.halo.body.position.set(c.x, cy, c.z + 0.35)
        v.halo.body.scaling.setAll(2.3 + Math.sin(now * 4 + c.id) * 0.35)
        v.part.body.rotation.set(0.25, now * 1.8 + c.id, 0)
      }
      for (const [id, v] of cans) {
        if (seen.has(id)) continue
        give(v.part)
        give(v.halo)
        cans.delete(id)
      }
    },
    canPoints() {
      let i = 0
      for (const v of cans.values()) {
        if (!v.part.body.isEnabled()) continue
        const p = canPts[i] ?? (canPts[i] = new Vector3())
        p.copyFrom(v.part.body.position)
        i++
      }
      canPts.length = i
      return canPts
    },
    canAt(id) {
      return cans.get(id)?.can ?? null
    },
    useModel(key, mesh, opts = {}) {
      const old = molds.get(key)
      // as cópias guardadas do molde antigo saem
      for (const p of free.get(key) ?? []) p.body.dispose()
      free.set(key, [])
      let body: Mesh
      if (opts.fitBox) {
        // placa: o modelo é encaixado na caixa do molde (x e y de −0,5 a 0,5, z de 0 a 1) e passa 6% da
        // borda — o desenho nunca fica MENOR que a colisão
        body = mesh.clone(`jt-${key}-model`, null, false)!
        body.makeGeometryUnique()
        body.refreshBoundingInfo()
        const b = body.getBoundingInfo().boundingBox
        const sz = b.maximum.subtract(b.minimum)
        const k = 1.06
        const m = Matrix.Translation(-(b.minimum.x + b.maximum.x) / 2, -(b.minimum.y + b.maximum.y) / 2, -b.minimum.z).multiply(Matrix.Scaling(k / sz.x, k / sz.y, 1 / sz.z))
        body.bakeTransformIntoVertices(m)
        body.refreshBoundingInfo()
      } else if (opts.bake) {
        body = mesh.clone(`jt-${key}-model`, null, false)!
        body.makeGeometryUnique()
        body.bakeTransformIntoVertices(opts.bake)
        body.refreshBoundingInfo()
      } else body = mesh.clone(`jt-${key}-model`, null, true)!
      if (key === "can") {
        // o galão é coleta: acende a própria textura (o modelo do Tripo some na névoa sem brilho)
        const src = body.material as StandardMaterial | null
        const lit = new StandardMaterial(`jt-can-lit-${++seq}`, scene)
        lit.diffuseTexture = src?.diffuseTexture ?? null
        lit.emissiveTexture = src?.diffuseTexture ?? null
        lit.emissiveColor = new Color3(0.55, 0.55, 0.55)
        lit.specularColor = new Color3(0.1, 0.1, 0.1)
        body.material = lit
        canMats.push(lit)
      }
      park(body)
      molds.set(key, { body, glow: null })
      if (key === "rim") rimZ = opts.zScale ?? 1
      if (key === "gem") gemModel = true
      if (key === "rock") rockModel = !!opts.upright
      // as que já estão à vista também trocam (nasceram antes do modelo chegar)
      for (const parts of shown.values()) {
        for (let i = 0; i < parts.length; i++) {
          const p = parts[i]
          if (p.key !== key) continue
          const fresh = take(key)
          fresh.body.position.copyFrom(p.body.position)
          fresh.body.rotation.copyFrom(p.body.rotation)
          fresh.body.scaling.copyFrom(p.body.scaling)
          fresh.body.setEnabled(p.body.isEnabled())
          p.body.dispose()
          parts[i] = fresh
        }
      }
      // os galões à vista também (instância morre com o molde: sem isto ficavam INVISÍVEIS e pegáveis)
      if (key === "can") {
        for (const v of cans.values()) {
          const fresh = take("can")
          fresh.body.position.copyFrom(v.part.body.position)
          fresh.body.rotation.copyFrom(v.part.body.rotation)
          fresh.body.setEnabled(v.part.body.isEnabled())
          v.part.body.dispose()
          v.part = fresh
        }
      }
      if (old) {
        old.body.dispose()
        old.glow?.dispose()
      }
    },
    useFrameKit(tile, corner, { len, arm, armLen, profile = 0.5, beam = false }) {
      for (const [key, src] of [["tile", tile], ["corner", corner]] as const) {
        const old = molds.get(key)
        for (const p of free.get(key) ?? []) p.body.dispose()
        free.set(key, [])
        // o glTF chega girado meia-volta (x espelhado, frente para +z): desvira e põe a frente em z 0
        const body = src.clone(`jt-${key}-model`, null, false)!
        body.makeGeometryUnique()
        body.bakeTransformIntoVertices(Matrix.RotationY(Math.PI))
        body.refreshBoundingInfo()
        body.bakeTransformIntoVertices(Matrix.Translation(0, 0, -body.getBoundingInfo().boundingBox.minimum.z))
        body.refreshBoundingInfo()
        park(body)
        molds.set(key, { body, glow: null })
        if (old) old.body.dispose()
      }
      // o canto com o braço da mesma espessura do perfil
      const cs = profile / arm
      kit = { p: profile, tileLen: len * profile, cs, armX: cs * armLen, len, beam }
      // as janelas à vista são remontadas no próximo quadro (com a moldura nova)
      for (const parts of shown.values()) for (const p of parts) give(p)
      shown.clear()
    },
    dispose() {
      for (const parts of shown.values()) for (const p of parts) give(p)
      for (const v of cans.values()) {
        give(v.part)
        give(v.halo)
      }
      haloMat.dispose()
      haloTex.dispose()
      for (const list of free.values()) for (const p of list) p.body.dispose()
      for (const m of molds.values()) {
        m.body.dispose()
        m.glow?.dispose()
      }
      fieldMat.dispose()
      wallGlass.dispose()
      frameMat.dispose()
      for (const m of canMats) m.dispose()
      hold.dispose()
    },
  }
}
