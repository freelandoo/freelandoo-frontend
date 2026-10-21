// features/meu-mundo/engine/car-sync.ts
//
// Reconciliação do carro previsto com a sala (correção do mm3d-12).
//
// O PROBLEMA QUE ISTO RESOLVE: a sala recebe o volante com o atraso da rede,
// então ao fim de cada curva o carro do servidor e o previsto aqui saem com
// RUMOS um pouco diferentes (~4° numa curva comum). A correção antiga só
// puxava a POSIÇÃO e nunca o rumo nem a velocidade: daí em diante o carro
// daqui andava numa direção e era arrastado de lado para a linha do
// servidor — o "andando de lado sem fim" — e, quando a diferença passava de
// 8 m, era teletransportado PARADO (o "travando na curva").
//
// COMO FICOU: guardamos o nosso próprio passado (≈1 s). Cada estado novo da
// sala é comparado com o ponto do passado MAIS PARECIDO — isso absorve o
// atraso da rede sem precisar medir ping — e a diferença inteira (posição,
// rumo, velocidade e giro) é aplicada aos poucos (~0,15 s). O passado guardado
// anda junto com a correção já aplicada, para o próximo estado não corrigir
// duas vezes. Acima de 8 m (choque divergente, aba que voltou) assume o
// estado da sala COM a velocidade dela — nunca zera.

import type { VehicleState } from "./vehicle"

export interface CarSnap {
  x: number
  z: number
  facing: number
  vx?: number
  vz?: number
  w?: number
}

interface Past {
  t: number
  x: number
  z: number
  yaw: number
  vx: number
  vz: number
  w: number
}

/** Quanto passado guardar (ms) — cobre ping + intervalo de estado da sala. */
const KEEP_MS = 1000
/** Tempo de assentamento da correção (s). */
const SETTLE_S = 0.15
/** Acima disso, assume o estado da sala de uma vez (m). */
const SNAP_M = 8
/** Peso do rumo na busca do ponto mais parecido (m por rad). */
const YAW_WEIGHT = 2

const wrap = (a: number) => {
  while (a > Math.PI) a -= Math.PI * 2
  while (a < -Math.PI) a += Math.PI * 2
  return a
}

export class CarReconciler {
  private past: Past[] = []
  private key = ""
  private pend = { x: 0, z: 0, yaw: 0, vx: 0, vz: 0, w: 0 }
  /** Distância entre o previsto e a sala no último estado (painel técnico). */
  err = 0

  reset() {
    this.past.length = 0
    this.key = ""
    this.pend = { x: 0, z: 0, yaw: 0, vx: 0, vz: 0, w: 0 }
    this.err = 0
  }

  /** Guarda o estado previsto deste quadro. */
  record(v: VehicleState, now: number) {
    this.past.push({ t: now, x: v.x, z: v.z, yaw: v.yaw, vx: v.vx, vz: v.vz, w: v.w })
    while (this.past.length && this.past[0].t < now - KEEP_MS) this.past.shift()
  }

  /**
   * Estado da sala. Só faz conta quando ele muda (a sala manda a 10 Hz).
   * Devolve "snap" quando assumiu o estado da sala de uma vez.
   */
  observe(v: VehicleState, s: CarSnap): "snap" | "soft" | "none" {
    const key = `${s.x}|${s.z}|${s.facing}`
    if (key === this.key) return "none"
    this.key = key
    // O ponto do nosso passado mais parecido com o que a sala diz agora.
    let best: Past | null = null
    let bestD = Infinity
    for (const p of this.past) {
      const d = Math.hypot(s.x - p.x, s.z - p.z) + YAW_WEIGHT * Math.abs(wrap(s.facing - p.yaw))
      if (d < bestD) {
        bestD = d
        best = p
      }
    }
    const h = best ?? { t: 0, x: v.x, z: v.z, yaw: v.yaw, vx: v.vx, vz: v.vz, w: v.w }
    const dx = s.x - h.x
    const dz = s.z - h.z
    const dyaw = wrap(s.facing - h.yaw)
    this.err = Math.hypot(dx, dz)
    const hasVel = typeof s.vx === "number" && typeof s.vz === "number"
    if (this.err > SNAP_M) {
      Object.assign(v, {
        x: s.x,
        z: s.z,
        yaw: s.facing,
        vx: hasVel ? s.vx : v.vx,
        vz: hasVel ? s.vz : v.vz,
        w: typeof s.w === "number" ? s.w : 0,
      })
      this.past.length = 0
      this.pend = { x: 0, z: 0, yaw: 0, vx: 0, vz: 0, w: 0 }
      return "snap"
    }
    // Folga mínima: não mexe por ruído de arredondamento.
    const still = this.err < 0.02 && Math.abs(dyaw) < 0.003
    this.pend = {
      x: still ? 0 : dx,
      z: still ? 0 : dz,
      yaw: still ? 0 : dyaw,
      vx: hasVel ? (s.vx as number) - h.vx : 0,
      vz: hasVel ? (s.vz as number) - h.vz : 0,
      w: typeof s.w === "number" ? s.w - h.w : 0,
    }
    if (!hasVel && this.pend.yaw) {
      // Sala antiga (sem velocidade): gira a velocidade junto com o rumo, para
      // a correção de rumo não virar deslizamento lateral.
      this.pend.vx = 0
      this.pend.vz = 0
    }
    return "soft"
  }

  /** Aplica a parte da correção que cabe neste quadro. */
  apply(v: VehicleState, dt: number) {
    const k = 1 - Math.exp(-dt / SETTLE_S)
    const p = this.pend
    const step = { x: p.x * k, z: p.z * k, yaw: p.yaw * k, vx: p.vx * k, vz: p.vz * k, w: p.w * k }
    if (!step.x && !step.z && !step.yaw && !step.vx && !step.vz && !step.w) return
    v.x += step.x
    v.z += step.z
    v.yaw = wrap(v.yaw + step.yaw)
    if (p.vx === 0 && p.vz === 0 && step.yaw) {
      const c = Math.cos(step.yaw)
      const sn = Math.sin(step.yaw)
      // Mesmo sentido de giro do rumo: frente = (sin yaw, cos yaw).
      const vx = v.vx * c + v.vz * sn
      const vz = -v.vx * sn + v.vz * c
      v.vx = vx
      v.vz = vz
    } else {
      v.vx += step.vx
      v.vz += step.vz
    }
    v.w += step.w
    p.x -= step.x
    p.z -= step.z
    p.yaw -= step.yaw
    p.vx -= step.vx
    p.vz -= step.vz
    p.w -= step.w
    // O passado anda junto: o próximo estado da sala não corrige de novo.
    for (const h of this.past) {
      h.x += step.x
      h.z += step.z
      h.yaw = wrap(h.yaw + step.yaw)
      h.vx += step.vx
      h.vz += step.vz
      h.w += step.w
    }
  }
}
