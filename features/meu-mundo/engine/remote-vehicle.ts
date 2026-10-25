// features/meu-mundo/engine/remote-vehicle.ts
//
// Veículo dos OUTROS (mm3d-22): desenhado um pouco no passado (DELAY), entre
// dois estados da sala, por Hermite com a velocidade que a sala manda — o
// caminho segue a curva de verdade e a frente acompanha o movimento.
//
// Antes, o veículo perseguia o último ponto (filtro exponencial a 10 Hz):
// andava na CORDA entre os pontos com a frente atrasada e acelerava/freava a
// cada pacote — nas curvas parecia ser empurrado de lado.
//
// Só TypeScript que pode ser apagado: o teste do backend carrega este arquivo.

/** Atraso de desenho (s): cobre um pacote (100 ms) e a oscilação da rede. */
const DELAY = 0.15
/** Intervalo nominal entre estados da sala (s). */
const NOMINAL = 0.1
/** Sem estado novo, segue pela velocidade no máximo isto (s). */
const MAX_EXTRA = 0.25
/** Acima disto (m) entre estados, é teletransporte: não interpola. */
const JUMP = 12
/** Intervalo sem estado (s) que quebra a linha do tempo (mm3d-27: aba escondida, rede caiu). */
const GAP = 0.6
const KEEP = 8

interface Sample {
  t: number
  x: number
  z: number
  facing: number
  vx: number
  vz: number
}

export interface RemotePose {
  x: number
  z: number
  facing: number
}

const wrap = (a: number) => {
  while (a > Math.PI) a -= Math.PI * 2
  while (a < -Math.PI) a += Math.PI * 2
  return a
}

export class RemoteVehicle {
  private s: Sample[] = []
  private key = ""

  /** Estado da sala (chamar a cada quadro; só conta quando muda). `now` em s. */
  push(now: number, x: number, z: number, facing: number, vx = 0, vz = 0) {
    const key = `${x}|${z}|${facing}`
    if (key === this.key) return
    this.key = key
    const last = this.s[this.s.length - 1]
    if (last && Math.hypot(x - last.x, z - last.z) > JUMP) this.s.length = 0
    else if (last && now - last.t > GAP + DELAY) {
      // Parado ou sem rede por um tempo: recomeça daqui, sem atravessar o vazio.
      this.s.length = 0
      this.s.push({ ...last, t: now - NOMINAL })
    }
    const prev = this.s[this.s.length - 1]
    let t = now
    if (prev) {
      // Os estados saem da sala a ritmo fixo: a hora de chegada oscila, então
      // a linha do tempo anda pelo nominal e só se aproxima da chegada aos poucos.
      const expect = prev.t + NOMINAL
      t = Math.abs(now - expect) < 0.08 ? expect + (now - expect) * 0.1 : Math.max(now, prev.t + 0.02)
    }
    this.s.push({ t, x, z, facing, vx, vz })
    if (this.s.length > KEEP) this.s.shift()
  }

  /** Pose para desenhar em `now` (s). false = sem estado ainda. */
  pose(now: number, out: RemotePose): boolean {
    const s = this.s
    if (!s.length) return false
    const rt = now - DELAY
    const last = s[s.length - 1]
    if (rt >= last.t) {
      const e = Math.min(rt - last.t, MAX_EXTRA)
      out.x = last.x + last.vx * e
      out.z = last.z + last.vz * e
      out.facing = last.facing
      return true
    }
    if (rt <= s[0].t) {
      out.x = s[0].x
      out.z = s[0].z
      out.facing = s[0].facing
      return true
    }
    let i = s.length - 2
    while (i > 0 && s[i].t > rt) i--
    const a = s[i]
    const b = s[i + 1]
    const dt = Math.max(1e-3, b.t - a.t)
    const u = (rt - a.t) / dt
    const u2 = u * u
    const u3 = u2 * u
    const h00 = 2 * u3 - 3 * u2 + 1
    const h10 = u3 - 2 * u2 + u
    const h01 = -2 * u3 + 3 * u2
    const h11 = u3 - u2
    out.x = h00 * a.x + h10 * dt * a.vx + h01 * b.x + h11 * dt * b.vx
    out.z = h00 * a.z + h10 * dt * a.vz + h01 * b.z + h11 * dt * b.vz
    out.facing = wrap(a.facing + wrap(b.facing - a.facing) * u)
    return true
  }

  reset() {
    this.s.length = 0
    this.key = ""
  }
}
