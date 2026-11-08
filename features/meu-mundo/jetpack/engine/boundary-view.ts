// features/meu-mundo/jetpack/engine/boundary-view.ts — JETPACK 3.0 (mm3d-78): os LIMITES da caixa do voo.
//
// A regra (sim/flight.ts) derruba quem encosta em y = 0 (chão), y = H (teto)
// ou |x| = W/2 (paredes) — e antes disto nada no desenho mostrava o teto: em
// 6 de 6 fases, voando perto dele, não havia nenhuma peça em y = 8 (fotos
// "antes" do shots78.js). Aqui o limite vira peça de verdade, igual em toda
// fase e com a pele dela:
//
//  - TETO: vidro fino translúcido logo acima de y = H, nervuras transversais a
//    cada 3 m (seção constante, nunca esticada), duas longarinas nas bordas e
//    filetes acesos que marcam a altura máxima vistos de baixo;
//  - CHÃO: filetes acesos nas duas beiradas em y = 0; nas fases abertas
//    (Cânion e Floresta, onde o chão é nuvem/rio lá embaixo) também o vidro
//    com nervuras, para o limite inferior nunca virar "vazio";
//  - LATERAIS: pórticos finos a cada 12 m (dois pilares + as longarinas),
//    sem parede: a paisagem segue à vista.
//
// Tudo FORA da caixa (o desenho nunca entra no espaço do voo). Um trecho de
// 24 m repetido: o padrão tem período 12 m, então a peça anda em saltos de
// 24 m sem costura. Três malhas (estrutura, filetes, vidro) = 3 chamadas.
// Os filetes ficam mais fortes quando o corpo chega perto do teto ou do chão
// (aviso visual local, não mexe na regra).

import type { Scene } from "@babylonjs/core/scene"
import type { Mesh } from "@babylonjs/core/Meshes/mesh"
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial"
import { Color3 } from "@babylonjs/core/Maths/math.color"
import { place, type RGB } from "../../engine/steampunk/scenery"
import { TUNNEL, TUNING } from "../sim/flight"
import type { PhaseId } from "../sim/phases"
import { JetGeo } from "./jet-geo"
import { SEG } from "./env-pool"

const { W, H } = TUNNEL

interface Skin {
  /** Estrutura (longarinas, nervuras, pilares). */
  frame: RGB
  /** Filete do limite (aceso). */
  edge: RGB
  /** Vidro: cor e opacidade. */
  glass: RGB
  alpha: number
  /** Vidro também no chão (fases sem piso de verdade em y = 0). */
  floorGlass: boolean
}

/** Pele por fase (a tabela de materiais do Alex: âmbar, dourado, ciano, turquesa, âmbar/vermelho, azul-ciano). */
const SKINS: Record<PhaseId, Skin> = {
  industrial: { frame: [0.22, 0.2, 0.19], edge: [1, 0.62, 0.18], glass: [0.55, 0.5, 0.42], alpha: 0.13, floorGlass: false },
  canion: { frame: [0.42, 0.3, 0.2], edge: [1, 0.78, 0.3], glass: [0.8, 0.9, 1], alpha: 0.1, floorGlass: true },
  orbital: { frame: [0.22, 0.26, 0.38], edge: [0.3, 0.92, 1], glass: [0.6, 0.85, 1], alpha: 0.12, floorGlass: false },
  floresta: { frame: [0.2, 0.16, 0.22], edge: [0.25, 1, 0.85], glass: [0.5, 1, 0.9], alpha: 0.1, floorGlass: true },
  forja: { frame: [0.16, 0.13, 0.12], edge: [1, 0.45, 0.12], glass: [0.6, 0.35, 0.25], alpha: 0.14, floorGlass: false },
  artico: { frame: [0.5, 0.62, 0.74], edge: [0.5, 0.95, 1], glass: [0.8, 0.95, 1], alpha: 0.13, floorGlass: false },
  vacuo: { frame: [0.2, 0.18, 0.3], edge: [0.7, 0.5, 1], glass: [0.6, 0.5, 1], alpha: 0.12, floorGlass: true },
}

/** Quantos trechos de 24 m a peça cobre (o bastante para a névoa esconder o fim). */
const CHUNKS = 12

export interface BoundaryView {
  /** z do jogador e a altura do meio do corpo (para acender o limite perto). */
  update: (z: number, y: number) => void
  dispose: () => void
}

export function buildBoundary(scene: Scene, phase: PhaseId, trim: StandardMaterial): BoundaryView {
  const sk = SKINS[phase] ?? SKINS.industrial
  const body = new JetGeo()
  const glow = new JetGeo()
  const glass = new JetGeo()
  glow.uv = "flat"
  glass.uv = "flat"
  const L = SEG * CHUNKS
  const top = H + 0.04
  for (const sx of [-1, 1]) {
    // longarinas do teto e (no chão) a guia da beirada, por fora da caixa
    body.box(0.26, 0.22, L, place(sx * (W / 2 + 0.13), top + 0.11, L / 2), sk.frame)
    body.box(0.26, 0.18, L, place(sx * (W / 2 + 0.13), -0.09, L / 2), sk.frame)
    // filetes acesos: altura máxima (vistos de baixo) e a beirada do chão
    glow.box(0.1, 0.05, L, place(sx * (W / 2 - 0.25), top + 0.025, L / 2), sk.edge)
    glow.box(0.1, 0.04, L, place(sx * (W / 2 - 0.25), -0.016, L / 2), sk.edge)
  }
  for (let z = 0; z < L; z += 4) {
    // nervuras do teto (seção fixa de 0,08 × 0,1, só o comprimento é o da caixa): finas, para o teto
    // ler sem pesar na tela quando a câmera chega perto
    body.box(W + 0.5, 0.1, 0.08, place(0, top + 0.05, z), sk.frame)
    if (sk.floorGlass) body.box(W + 0.5, 0.1, 0.08, place(0, -0.05, z), sk.frame)
  }
  for (let z = 0; z < L; z += 12) {
    // pórtico lateral: dois pilares do chão ao teto, fora da caixa (|x| > W/2)
    for (const sx of [-1, 1]) body.box(0.24, H + 0.5, 0.24, place(sx * (W / 2 + 0.2), H / 2, z), sk.frame)
    // marca de altura no meio do teto (seta para dentro do corredor) e no chão aberto
    glow.box(0.9, 0.04, 0.14, place(0, top + 0.02, z + 6), sk.edge)
    if (sk.floorGlass) glow.box(0.9, 0.04, 0.14, place(0, -0.03, z + 6), sk.edge)
  }
  // o vidro: uma lâmina contínua logo acima do teto (e no chão nas fases abertas)
  glass.box(W, 0.02, L, place(0, top + 0.01, L / 2), sk.glass)
  if (sk.floorGlass) glass.box(W, 0.02, L, place(0, -0.03, L / 2), sk.glass)

  const glowMat = new StandardMaterial(`jt-bound-glow-${phase}`, scene)
  glowMat.disableLighting = true
  glowMat.emissiveColor = new Color3(1, 1, 1)
  glowMat.specularColor = new Color3(0, 0, 0)
  const glassMat = new StandardMaterial(`jt-bound-glass-${phase}`, scene)
  glassMat.diffuseColor = new Color3(1, 1, 1)
  glassMat.emissiveColor = new Color3(0.25, 0.28, 0.32)
  glassMat.specularColor = new Color3(0.5, 0.5, 0.5)
  glassMat.specularPower = 64
  glassMat.alpha = sk.alpha
  glassMat.backFaceCulling = false
  glassMat.disableDepthWrite = true

  const meshes: Mesh[] = [body.build(`jt-bound-body`, scene, trim, false), glow.build(`jt-bound-glow`, scene, glowMat, false), glass.build(`jt-bound-glass`, scene, glassMat, false)]
  for (const m of meshes) {
    m.isPickable = false
    m.alwaysSelectAsActiveMesh = true
  }
  // o vidro desenha depois do resto (sem ordenar por pedaço)
  meshes[2].alphaIndex = 10
  let warm = 0
  return {
    update(z, y) {
      // salta de 24 em 24 m: começa um trecho atrás do jogador
      const z0 = Math.floor(z / SEG) * SEG - SEG
      for (const m of meshes) m.position.z = z0
      // perto do teto/chão (menos de 1,2 m de folga do corpo) o filete acende até 2,4×
      const gap = Math.min(H - (y + TUNING.hy), y - TUNING.hy)
      const want = Math.max(0, Math.min(1, (1.2 - gap) / 1.2))
      warm += (want - warm) * 0.2
      glowMat.emissiveColor.set(1 + warm * 1.4, 1 + warm * 1.4, 1 + warm * 1.4)
    },
    dispose() {
      for (const m of meshes) m.dispose()
      glowMat.dispose()
      glassMat.dispose()
    },
  }
}
