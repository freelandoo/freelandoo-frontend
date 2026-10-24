// Relógio de passos do jetpack em grupo (mm3d-21).
//
// O servidor roda a partida em passos de 1/120 s e responde cada "ping" com o
// passo em que o recebeu. Daqui sai a estimativa do passo do servidor AGORA
// (pelos pings de menor RTT, que sofrem menos com fila) e o LEAD: quantos
// passos o cliente roda à frente, para a entrada marcada com o passo local
// chegar ANTES de o servidor processar aquele passo (aí vale exatamente onde o
// jogador viu). O laço local corrige a diferença mudando o ritmo (0,96–1,04),
// sem saltos; só salta com erro grande (> 30 passos: aba em segundo plano).
//
// Só TypeScript que pode ser apagado: o teste do backend carrega este arquivo
// direto (test/unit/meuMundoJetpackClient.test.js).

const STEP_MS = 1000 / 120;
/** A sala anda em voltas de 25 ms (3 passos): o passo do pong atrasa, em média, 1,5. */
const SERVER_LAG_TICKS = 1.5;
const MAX_SAMPLES = 24;
const MAX_LEAD = 30;
const MARGIN_MS = 40;
const JUMP_TICKS = 30;
const PACE_MIN = 0.96;
const PACE_MAX = 1.04;
const PACE_GAIN = 0.005; // por passo de erro
const DEAD_ZONE = 0.5;
/** Sem amostra ainda: supõe RTT de 150 ms com 30 ms de variação. */
const DEFAULT_RTT = 150;
const DEFAULT_JITTER = 30;

interface OffsetSample {
  rtt: number;
  /** passo do servidor − agora/STEP_MS (constante enquanto os relógios andam juntos) */
  off: number;
}

const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

export class TickClock {
  private rtts: number[] = [];
  private offsets: OffsetSample[] = [];
  private offset = 0;
  /** RTT típico (mediana, ms). */
  rtt = DEFAULT_RTT;
  /** Variação do RTT (desvio padrão, ms). */
  jitter = DEFAULT_JITTER;

  /** Já há estimativa do passo do servidor (alguma amostra com a partida andando). */
  get ready() {
    return this.offsets.length > 0;
  }

  /**
   * Um pong: `sentAt` = quando o ping saiu, `serverTick` = passo do servidor ao
   * receber, `now` = quando o pong chegou (mesmo relógio local, em ms).
   * Passo 0 = a partida ainda não andou: só mede o RTT.
   */
  sample(sentAt: number, serverTick: number, now: number) {
    const rtt = now - sentAt;
    if (!(rtt >= 0) || !Number.isFinite(rtt)) return;
    this.rtts.push(rtt);
    if (this.rtts.length > MAX_SAMPLES) this.rtts.shift();
    this.rtt = median(this.rtts);
    const mean = this.rtts.reduce((a, b) => a + b, 0) / this.rtts.length;
    this.jitter = this.rtts.length > 1 ? Math.sqrt(this.rtts.reduce((a, b) => a + (b - mean) ** 2, 0) / this.rtts.length) : DEFAULT_JITTER;
    if (!(serverTick > 0)) return;
    this.offsets.push({ rtt, off: serverTick + SERVER_LAG_TICKS + rtt / 2 / STEP_MS - now / STEP_MS });
    if (this.offsets.length > MAX_SAMPLES) this.offsets.shift();
    // Metade de menor RTT (menos fila); a mediana delas tira a assimetria.
    const best = [...this.offsets].sort((a, b) => a.rtt - b.rtt).slice(0, Math.max(1, this.offsets.length >> 1));
    this.offset = median(best.map((s) => s.off));
  }

  /** Partida nova: o passo recomeça do zero (o RTT continua valendo). */
  reset() {
    this.offsets = [];
    this.offset = 0;
  }

  /** Passo do servidor estimado em `now` (fracionário). */
  serverTick(now: number) {
    return now / STEP_MS + this.offset;
  }

  /** Passos à frente do servidor em que o cliente roda. */
  lead() {
    return Math.min(MAX_LEAD, Math.ceil((this.rtt / 2 + 2 * this.jitter + MARGIN_MS) / STEP_MS));
  }

  /** Passo em que o laço local deveria estar em `now`. */
  target(now: number) {
    return this.serverTick(now) + this.lead();
  }

  /** Ritmo do laço local (1 = tempo real) para alcançar o alvo sem saltar. */
  pace(localTick: number, now: number) {
    const err = this.target(now) - localTick;
    if (Math.abs(err) < DEAD_ZONE) return 1;
    return Math.min(PACE_MAX, Math.max(PACE_MIN, 1 + err * PACE_GAIN));
  }

  /** Erro grande demais para corrigir no ritmo (aba voltou do segundo plano). */
  shouldJump(localTick: number, now: number) {
    return Math.abs(this.target(now) - localTick) > JUMP_TICKS;
  }
}
