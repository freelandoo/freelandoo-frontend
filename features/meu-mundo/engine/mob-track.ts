// features/meu-mundo/engine/mob-track.ts — lore v2 B5: o monstro da rua entre dois pacotes.
//
// A sala manda a posição dos monstros a cada 0,5 s (e na hora em que algo muda). Antes o
// desenho perseguia o ÚLTIMO ponto com um filtro (k = 4/s): o monstro arrancava a cada
// pacote e freava antes do próximo — andava aos trancos, duas vezes por segundo, e o
// clipe piscava entre andar e parar. Desenhar no passado (como os jogadores, remote-walker)
// custaria 0,6 s: o lobo alcançaria quem joga ainda a 2 m de distância na tela.
//
// Aqui: velocidade medida entre os dois últimos pacotes; o alvo segue andando nela por até
// `HOLD` s depois do pacote (sem passar disso: parou, o alvo para) e o desenho vai até o alvo
// com um filtro curto. A troca de ronda (0,7 m/s) para perseguição (3,2 m/s) vira uma
// arrancada de ~0,3 s, sem mexer na regra do servidor. O rumo vira com velocidade máxima
// (o corpo gira, não estala de um lado para o outro).
//
// Só TypeScript que pode ser apagado (pode ser carregado por teste sem o Babylon).

/** Segundos de pacote que ainda andam na velocidade medida (um intervalo e pouco). */
const HOLD = 0.6
/** Acima disto (m) entre pacotes é teletransporte: desenha direto lá. */
const JUMP = 10
/** Filtro do desenho até o alvo (1/s). */
const FOLLOW = 7
/** Giro máximo do corpo (rad/s). */
const TURN = 5.5
/** Velocidade medida acima disto (m/s) é ruído de pacote atrasado: fica a de antes. */
const VMAX = 9

const wrap = (a: number) => {
  while (a > Math.PI) a -= Math.PI * 2
  while (a < -Math.PI) a += Math.PI * 2
  return a
}

export class MobTrack {
  x: number
  z: number
  facing: number
  /** Velocidade desenhada (m/s), suavizada: escolhe o clipe. */
  speed = 0
  private lx: number
  private lz: number
  private lf: number
  private lt: number
  private vx = 0
  private vz = 0

  constructor(now: number, x: number, z: number, facing: number) {
    this.x = this.lx = x
    this.z = this.lz = z
    this.facing = this.lf = facing
    this.lt = now
  }

  /** Pacote novo da sala (`now` em s). Igual ao anterior = nada. */
  push(now: number, x: number, z: number, facing: number) {
    if (x === this.lx && z === this.lz && facing === this.lf) return
    const d = Math.hypot(x - this.lx, z - this.lz)
    if (d > JUMP) {
      this.x = x
      this.z = z
      this.facing = facing
      this.vx = this.vz = 0
    } else {
      const dt = now - this.lt
      if (dt > 0.05) {
        const vx = (x - this.lx) / dt
        const vz = (z - this.lz) / dt
        if (Math.hypot(vx, vz) <= VMAX) {
          this.vx = vx
          this.vz = vz
        }
      } else if (d < 1e-3) {
        // pacote de "mudou" no mesmo lugar (parou para lutar): para já
        this.vx = this.vz = 0
      }
    }
    this.lx = x
    this.lz = z
    this.lf = facing
    this.lt = now
  }

  /** Avança o desenho até `now` (s). */
  update(now: number, dt: number) {
    const age = Math.min(HOLD, Math.max(0, now - this.lt))
    const tx = this.lx + this.vx * age
    const tz = this.lz + this.vz * age
    const k = 1 - Math.exp(-FOLLOW * dt)
    const nx = this.x + (tx - this.x) * k
    const nz = this.z + (tz - this.z) * k
    const inst = dt > 0 ? Math.hypot(nx - this.x, nz - this.z) / dt : 0
    this.speed += (inst - this.speed) * Math.min(1, dt * 6)
    this.x = nx
    this.z = nz
    const turn = wrap(this.lf - this.facing)
    this.facing = wrap(this.facing + Math.sign(turn) * Math.min(Math.abs(turn), TURN * dt))
  }
}
