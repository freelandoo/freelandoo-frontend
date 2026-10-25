// features/meu-mundo/engine/remote-walker.ts
//
// Pessoa dos OUTROS a pé (mm3d-27): desenhada um pouco no passado (DELAY),
// entre dois estados da sala, na linha do tempo em que eles saíram de lá.
//
// Antes, o boneco perseguia o último ponto (filtro exponencial): a 10 Hz ele
// arrancava a cada pacote e freava antes do próximo — o "interpolando" que se
// via com outra pessoa por perto — e, quando a rede atrasava dois pacotes, dava
// um tranco. Mesma ideia do veículo dos outros (remote-vehicle.ts), em linha
// reta (a pé não há curva de verdade a seguir entre dois pacotes).
//
// Só TypeScript que pode ser apagado: o teste do backend carrega este arquivo.

/** Atraso de desenho (s): cobre um pacote (100 ms) e a oscilação da rede. */
const DELAY = 0.15
/** Intervalo nominal entre estados da sala (s). */
const NOMINAL = 0.1
/** Acima disto (m) entre estados é teletransporte (porta, portal, sala nova). */
const JUMP = 8
/** Intervalo sem estado (s) que quebra a linha do tempo (aba escondida, rede caiu). */
const GAP = 0.6
const KEEP = 8

interface Sample {
  t: number
  x: number
  z: number
  y: number
  facing: number
}

export interface WalkerPose {
  x: number
  z: number
  y: number
  facing: number
}

const wrap = (a: number) => {
  while (a > Math.PI) a -= Math.PI * 2
  while (a < -Math.PI) a += Math.PI * 2
  return a
}

export class RemoteWalker {
  private s: Sample[] = []
  private key = ""

  /** Estado da sala (chamar a cada quadro; só conta quando muda). `now` em s. */
  push(now: number, x: number, z: number, facing: number, y = 0) {
    const key = `${x}|${z}|${facing}|${y}`
    if (key === this.key) return
    this.key = key
    const prev = this.s[this.s.length - 1]
    if (prev && (Math.hypot(x - prev.x, z - prev.z) > JUMP || Math.abs(y - prev.y) > 2)) this.s.length = 0
    else if (prev && now - prev.t > GAP + DELAY) {
      // Ficou parado (ou a aba sumiu): recomeça a linha do tempo a partir de
      // onde está desenhado agora, sem "percorrer" o intervalo vazio.
      this.s.length = 0
      this.s.push({ ...prev, t: now - NOMINAL })
    }
    const last = this.s[this.s.length - 1]
    let t = now
    if (last) {
      // Os estados saem da sala a ritmo fixo: a chegada oscila, então a linha
      // do tempo anda pelo nominal e só se aproxima da chegada aos poucos.
      const expect = last.t + NOMINAL
      t = Math.abs(now - expect) < 0.08 ? expect + (now - expect) * 0.1 : Math.max(now, last.t + 0.02)
    }
    this.s.push({ t, x, z, y, facing })
    if (this.s.length > KEEP) this.s.shift()
  }

  /** Pose para desenhar em `now` (s). false = sem estado ainda. */
  pose(now: number, out: WalkerPose): boolean {
    const s = this.s
    if (!s.length) return false
    const rt = now - DELAY
    const last = s[s.length - 1]
    if (rt >= last.t) {
      // Sem extrapolar: parada, a sala não manda estado novo (a posição não
      // muda) e o boneco seguiria além do ponto em que a pessoa parou.
      out.x = last.x
      out.z = last.z
      out.y = last.y
      out.facing = last.facing
      return true
    }
    if (rt <= s[0].t) {
      out.x = s[0].x
      out.z = s[0].z
      out.y = s[0].y
      out.facing = s[0].facing
      return true
    }
    let i = s.length - 2
    while (i > 0 && s[i].t > rt) i--
    const a = s[i]
    const b = s[i + 1]
    const u = Math.min(1, Math.max(0, (rt - a.t) / Math.max(1e-3, b.t - a.t)))
    out.x = a.x + (b.x - a.x) * u
    out.z = a.z + (b.z - a.z) * u
    out.y = a.y + (b.y - a.y) * u
    out.facing = wrap(a.facing + wrap(b.facing - a.facing) * u)
    return true
  }

  reset() {
    this.s.length = 0
    this.key = ""
  }
}
