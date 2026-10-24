// Conexão com a sala do jetpack em grupo (mm3d-21) — JetpackRoom no backend
// (src/realtime/meuMundoJetpack.js).
//
// Igual a engine/net.ts: quem diz em que sala entrar é o BACKEND (POST
// /center/jetpack confere centro, porta e papel); o cliente só consome a
// reserva. A reconexão automática do SDK fica desligada: ao cair, pede uma
// reserva nova com o roomId em que estava (o servidor devolve ao MESMO
// jogador, na mesma vaga), com espera progressiva e tentativas limitadas.
//
// Envio: "ready" (espera/resultados), "h" só quando o botão muda (marcada com
// o passo local, que roda `clock.lead()` passos à frente do servidor) e
// "ping" 4×/s para o relógio. Tudo bem abaixo do limite da sala (30/s).

import { Client, type Room } from '@colyseus/sdk';
import { getPublicBackendUrl } from '@/lib/backend-public';
import type { MultiplayerSession, NetStatus } from '../../types';
import { TickClock } from './clock';

const BACKOFF_MS = [500, 1000, 2000, 4000, 8000];
const PING_MS = 250;
const CLOSE_REPLACED = 4009;
const CLOSE_FORBIDDEN = 4003;

export type PartyPhase = 'lobby' | 'countdown' | 'running' | 'results';

/** Um jogador da sala (espelho do JPRunner do servidor). */
export interface PartyRunnerState {
  slot: number;
  name: string;
  body: string;
  ready: boolean;
  inMatch: boolean;
  online: boolean;
  /** Estado da sim no passo `tick` da sala (STATE_CODE: 0 pronto … 4 morto). */
  st: number;
  x: number;
  y: number;
  vy: number;
  fuel: number;
  held: boolean;
  thr: boolean;
  pw: number;
  pf: boolean;
  tow: boolean;
  grace: number;
  pid: number;
  pass: number;
  ph: number;
  fc: number;
  got: number;
  sm: number;
  dieAt: number;
  place: number;
}

export interface PartyState {
  phase: PartyPhase;
  seed: number;
  /** Passo da partida a que os valores dos jogadores se referem. */
  tick: number;
  /** ms (relógio do servidor): fim da espera em grupo / contagem / resultados; 0 = sem prazo. */
  until: number;
  runners: Map<string, PartyRunnerState>;
  /** id da cápsula → vaga de quem pegou. */
  taken: Map<string, number>;
  /** id do obstáculo → peças quebradas (bits). */
  broken: Map<string, number>;
  /** x de cada turbo pego, em ordem (refaz o percurso: Track.rebuild). */
  vulcans: Iterable<number> & { length: number };
}

export interface PartyCallbacks {
  onStatus: (s: NetStatus) => void;
  /** Vaga deste jogador (0..3) e o passo da sim do servidor. */
  onWelcome: (p: { slot: number; step: number }) => void;
  /** Reserva nova para (re)conectar; `roomId` = sala em que estava. null = sem acesso. */
  fetchParty: (roomId: string | null) => Promise<MultiplayerSession | null>;
  /** Estado novo decodificado (a cada patch, ~20×/s). `now` = performance.now(). */
  onState?: (s: PartyState, now: number) => void;
}

type JpRoom = Room<unknown, PartyState>;

export class PartyNet {
  readonly clock = new TickClock();
  status: NetStatus = 'connecting';
  slot = -1;
  private readonly cb: PartyCallbacks;
  private room: JpRoom | null = null;
  private lastRoomId: string | null = null;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private ping: ReturnType<typeof setInterval> | null = null;
  private attempt = 0;
  private disposed = false;
  private seed = 0;
  private lastHeld: boolean | null = null;

  constructor(cb: PartyCallbacks) {
    this.cb = cb;
  }

  get sessionId() {
    return this.room?.sessionId ?? null;
  }

  get roomId() {
    return this.room?.roomId ?? this.lastRoomId;
  }

  /** Estado decodificado da sala (lido a cada quadro). */
  state(): PartyState | null {
    return (this.room?.state as PartyState | undefined) ?? null;
  }

  private setStatus(s: NetStatus) {
    if (this.status === s) return;
    this.status = s;
    if (!this.disposed) this.cb.onStatus(s);
  }

  async connect(session: MultiplayerSession) {
    if (this.disposed) return;
    this.setStatus(this.attempt === 0 ? 'connecting' : 'reconnecting');
    const client = new Client(getPublicBackendUrl().replace(/^http/, 'ws') + session.wsPath);
    let room: JpRoom;
    try {
      room = (await client.consumeSeatReservation(session.reservation as never)) as unknown as JpRoom;
    } catch {
      this.scheduleRetry();
      return;
    }
    if (this.disposed) {
      void room.leave(true);
      return;
    }
    room.reconnection.enabled = false;
    this.room = room;
    this.lastRoomId = room.roomId;
    this.attempt = 0;
    this.lastHeld = null;
    let replaced = false;
    room.onMessage('welcome', (p: { slot: number; step: number }) => {
      this.slot = p.slot;
      if (!this.disposed) this.cb.onWelcome(p);
    });
    room.onMessage('pong', (p: { c: number; k: number }) => this.clock.sample(p.c, p.k, performance.now()));
    room.onMessage('replaced', () => {
      replaced = true;
    });
    room.onStateChange((s) => {
      if (this.disposed) return;
      const st = s as PartyState;
      // Partida nova: o passo recomeça do zero.
      if (st.seed !== this.seed) {
        this.seed = st.seed;
        this.clock.reset();
        this.lastHeld = null;
      }
      this.cb.onState?.(st, performance.now());
    });
    room.onLeave((code) => {
      if (this.room === room) this.room = null;
      this.stopPing();
      if (this.disposed) return;
      if (replaced || code === CLOSE_REPLACED) return this.setStatus('replaced');
      if (code === CLOSE_FORBIDDEN) return this.setStatus('offline');
      this.scheduleRetry();
    });
    this.stopPing();
    this.ping = setInterval(() => this.room?.send('ping', { c: performance.now() }), PING_MS);
    this.setStatus('online');
  }

  private stopPing() {
    if (this.ping) clearInterval(this.ping);
    this.ping = null;
  }

  private scheduleRetry() {
    if (this.disposed) return;
    if (this.attempt >= BACKOFF_MS.length) return this.setStatus('offline');
    this.setStatus('reconnecting');
    const wait = BACKOFF_MS[this.attempt++];
    this.timer = setTimeout(async () => {
      this.timer = null;
      if (this.disposed) return;
      let session: MultiplayerSession | null | 'retry';
      try {
        session = await this.cb.fetchParty(this.lastRoomId);
      } catch {
        session = 'retry';
      }
      if (this.disposed) return;
      if (session === null) this.setStatus('offline');
      else if (session === 'retry') this.scheduleRetry();
      else void this.connect(session);
    }, wait);
  }

  /** "Começar" / "Jogar de novo" (true) ou desistir (false). */
  ready(r: boolean) {
    this.room?.send('ready', { r });
  }

  /** Mudança do botão no passo local `k` (só manda quando muda). */
  input(k: number, held: boolean) {
    if (held === this.lastHeld || !this.room) return;
    this.lastHeld = held;
    this.room.send('h', { k, h: held ? 1 : 0 });
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    this.stopPing();
    const room = this.room;
    this.room = null;
    if (room) void room.leave(true).catch(() => {});
  }
}
