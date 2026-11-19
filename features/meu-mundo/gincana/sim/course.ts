// features/meu-mundo/gincana/sim/course.ts — GINCANA (mm3d-47): o que um percurso É.
//
// Corrida de obstáculos do gênero dos "party games" de feijão (o vídeo do
// Alex), com percursos próprios. Tudo aqui é FUNÇÃO DO TEMPO DA PROVA (`t`,
// s depois do "vai"): barras que giram, pêndulos, luvas, bolas que rolam,
// plataformas que andam, discos que giram e blocos que empurram ficam no mesmo
// lugar em todos os aparelhos e na sala — ninguém precisa mandar onde estão.
//
// 2026-11-16 (Gincana 2.0, pedido do Alex): o percurso deixou de ser fixo no
// código e virou DADO (`Course`), montado em courses.ts — a fase de sempre
// ("cidade", com os mesmos números) e uma fase por Domínio. Peças novas:
// cogumelo que lança (Post.b), porta falsa (Door), plataforma que anda e disco
// que gira (Pad.mx/mz/spin), esteira (Pad.bx/bz), gelo (Pad.f), bloco que
// empurra (Pusher) e hexágono (Tile.k = 1).
//
// Regra única: o navegador e a sala (src/utils/meuMundoGincana.js, GERADO
// deste diretório por scripts/build-gincana-sim.js no back) usam os mesmos
// números. Metros, segundos; y para cima; a prova corre para +z.

/** Altura do tampo das plataformas; a água (ou lava, ou o vazio) fica em y = 0. */
export const DECK = 3

export const GINCANA = {
  step: 1 / 60,
  // mm3d-47b: mais rápido e mais seco (o Alex achou lento e o pulo mole)
  gravity: 30,
  run: 8.2,
  /** Esteira (Gincana 3, pedido do Alex 18/11): forte — parado, ela leva você; contra ela anda a 2,7 m/s. */
  belt: 5.5,
  accel: 58,
  /** Controle no ar (fração da aceleração do chão). */
  airControl: 0.72,
  /** Pulo: 9,6 m/s com g 30 → ~1,54 m de altura, 0,64 s no ar. */
  jumpV: 9.6,
  coyote: 0.12,
  /** Apertou pular um pouco antes de poder (no ar, chegando ao chão): vale por isto (s). */
  jumpBuffer: 0.15,
  bodyR: 0.4,
  bodyH: 1.7,
  /** Gincana 3: altura do corpo mergulhando/deslizando (passa por baixo da barra alta). */
  lowH: 0.7,
  stepUp: 0.45,
  /** Mergulho: para a frente, um pouco para cima; depois desliza e levanta. */
  diveV: 11.5,
  diveUp: 4.4,
  slideT: 0.45,
  riseT: 0.4,
  /** Derrubado por obstáculo: sem controle por isto (s); depois levanta. */
  stunT: 0.9,
  /** Abaixo disto caiu na água: volta ao último posto depois de `respawnT`. */
  waterY: -0.6,
  respawnT: 1.3,
  /** Depois de voltar: nada derruba por isto (s). */
  shieldT: 1.2,
  /** Logo da Freelandoo (mm3d-47b): turbo com brilho — velocidade ×boost por boostT s; o logo volta para quem pegou depois de logoBack s. */
  boost: 1.5,
  boostT: 3.5,
  logoR: 1.25,
  logoBack: 12,
  /** Prova: limite depois do "vai" e contagem antes. */
  timeLimit: 180,
  countdown: 3,
  // ── Gincana 2.0 (2026-11-16) ──
  /** Agarrar: alcance (m, de centro a centro, na frente), quanto tempo segura, a velocidade de quem é segurado e de quem segura. */
  grabR: 1.3,
  grabMax: 2.6,
  grabCool: 0.8,
  heldRun: 0.42,
  grabRun: 0.32,
  /** Beira: bateu de lado numa plataforma com o tampo até isto acima do pé = sobe (segurando AGARRAR, mais alto). */
  ledge: 1.05,
  ledgeGrab: 1.6,
  climbT: 0.3,
  /** Mergulho que acerta alguém: empurrão (m/s). */
  tackle: 6.5,
  /** Classificam (fração das vagas); a prova fecha quando esse tanto chega. */
  qualify: 0.75,
} as const

/** Paleta (índice = cor do tampo; as bordas usam a cor do par). Turquesa (3) é a cor do mar: nunca no tampo. */
export const GINCANA_COLORS = ["#FF6A13", "#FFD21F", "#FF5FA8", "#19C6D1", "#8A4DFF", "#63E05A", "#2F7BFF", "#FFFFFF"] as const

/**
 * Gincana 3 (2026-11-18): cada fase é um TIPO de prova (pedido do Alex: "as fases
 * estão bem iguais"). race = corrida até a chegada; survive = último em pé (quem
 * cai está fora); collect = quem pega mais engrenagens; zone = quem fica mais tempo
 * na zona. Tudo sai da pose e do tempo: a sala conta igual ao aparelho.
 */
export type GincanaMode = "race" | "survive" | "collect" | "zone"

/** As fases: a de sempre e uma por Domínio. */
export type GincanaPhase = "cidade" | "floresta" | "clareira" | "canion" | "orbital" | "forja" | "fabrica" | "gelo" | "relogio" | "feira" | "coroa"
export const GINCANA_PHASES: readonly GincanaPhase[] = ["cidade", "floresta", "clareira", "canion", "orbital", "forja", "fabrica", "gelo", "relogio", "feira", "coroa"]

/**
 * Plataforma: 0 = disco (r), 1 = caixa girada (hx, hz, rot), 2 = rampa
 * (caixa sem giro; o tampo sobe de `y` em z−hz até `y2` em z+hz).
 * `d` = espessura (abaixo do tampo é parede: empurra de lado).
 */
export interface Pad {
  k: 0 | 1 | 2
  x: number
  z: number
  r: number
  hx: number
  hz: number
  rot: number
  y: number
  y2: number
  d: number
  /** Cor do tampo e da borda (índices de GINCANA_COLORS). */
  c: number
  rim: number
  /** Trecho (1–5; 0 = largada, 6 = chegada). */
  s: number
  /** Atrito do chão (1 = normal; gelo ~0,18: escorrega). */
  f: number
  /** Esteira: arrasta quem está em cima (m/s). */
  bx: number
  bz: number
  /** Plataforma que anda: desloca (mx, mz)·sen(mw·t + mph). */
  mx: number
  mz: number
  mw: number
  mph: number
  /** Disco/caixa que gira (rad/s) e leva quem está em cima. */
  spin: number
}

/** Coluna (pilar, frade, poste da luva, cogumelo): empurra de lado e dá para subir; `b` > 0 = lança para cima (m/s) quem pousa. */
export interface Post {
  x: number
  z: number
  r: number
  y0: number
  y1: number
  c: number
  b: number
}

/** Barra girando em volta de (x, z); `both` = atravessa o disco inteiro. */
export interface Sweeper {
  x: number
  z: number
  y: number
  len: number
  r: number
  w: number
  a0: number
  both: boolean
  /** Gincana 3: acelera (rad/s², no sentido do giro) até wMax (rad/s); 0 = velocidade fixa. */
  acc: number
  wMax: number
}

/** Bola de pêndulo que balança no eixo x, pendurada em (x, py, z). */
export interface Pendulum {
  x: number
  z: number
  py: number
  len: number
  R: number
  amp: number
  w: number
  ph: number
}

/** Luva de boxe (ou pistão) que soca para dentro do campo a partir de x0 (dir = ±1). */
export interface Glove {
  x0: number
  z: number
  y: number
  dir: number
  reach: number
  R: number
  period: number
  ph: number
}

/**
 * Gincana 3 (Relógio da Praça): grade n×n de ladrilhos com símbolos. Cada rodada: os símbolos
 * aparecem (show), somem (hide), o relógio chama um (call) e os ladrilhos dos OUTROS caem (drop),
 * voltando no fim (back). Tudo pela semente e pelo tempo: nada guardado, a sala conta igual.
 */
export interface Memory {
  x: number
  z: number
  y: number
  n: number
  /** lado do ladrilho e o vão entre eles */
  size: number
  gap: number
  /** quando começa a primeira rodada */
  t0: number
}
export const MEM_SYMBOLS = 6
const MEM_HIDE = 1.2
const MEM_DROP = 3
const MEM_BACK = 0.8
/** As rodadas encurtam: menos tempo para decorar e para correr. */
export function memShow(r: number) {
  return Math.max(2.4, 5 - 0.4 * r)
}
export function memCall(r: number) {
  return Math.max(1.5, 3.2 - 0.3 * r)
}
/** Fase da rodada em t: 0 espera, 1 mostra, 2 esconde, 3 chama, 4 cai, 5 volta; `left` = quanto falta dela. */
export function memState(m: Memory, t: number): { r: number; ph: number; left: number } {
  if (t < m.t0) return { r: 0, ph: 0, left: m.t0 - t }
  let s = t - m.t0
  for (let r = 0; r < 500; r++) {
    const parts = [memShow(r), MEM_HIDE, memCall(r), MEM_DROP, MEM_BACK]
    for (let k = 0; k < parts.length; k++) {
      if (s < parts[k]) return { r, ph: k + 1, left: parts[k] - s }
      s -= parts[k]
    }
  }
  return { r: 499, ph: 5, left: 0 }
}
/** Símbolo de cada ladrilho na rodada: embaralhado pela semente, todos os símbolos com 4–5 ladrilhos. */
export function memSymbols(m: Memory, seed: number, r: number): Uint8Array {
  const N = m.n * m.n
  const idx: number[] = []
  for (let i = 0; i < N; i++) idx.push(i)
  for (let k = N - 1; k > 0; k--) {
    const j = courseHash(seed ^ 0x2c1b3c6d, r * 977 + k) % (k + 1)
    const tmp = idx[k]
    idx[k] = idx[j]
    idx[j] = tmp
  }
  const out = new Uint8Array(N)
  for (let k = 0; k < N; k++) out[idx[k]] = k % MEM_SYMBOLS
  return out
}
/** O símbolo que o relógio chama na rodada. */
export function memTarget(seed: number, r: number) {
  return courseHash(seed ^ 0x7f4a7c15, r * 131 + 7) % MEM_SYMBOLS
}
/** Centro do ladrilho i. */
export function memTile(m: Memory, i: number) {
  const pitch = m.size + m.gap
  const c = (m.n - 1) / 2
  return { x: m.x + ((i % m.n) - c) * pitch, z: m.z + (Math.floor(i / m.n) - c) * pitch }
}
/** Ladrilho sob (x, z) (−1 = vão ou fora), com folga `e`. */
export function memIndexAt(m: Memory, x: number, z: number, e: number) {
  const pitch = m.size + m.gap
  const c = (m.n - 1) / 2
  const ix = Math.round((x - m.x) / pitch + c)
  const iz = Math.round((z - m.z) / pitch + c)
  if (ix < 0 || iz < 0 || ix >= m.n || iz >= m.n) return -1
  const i = iz * m.n + ix
  const q = memTile(m, i)
  return Math.abs(x - q.x) <= m.size / 2 + e && Math.abs(z - q.z) <= m.size / 2 + e ? i : -1
}
/** O ladrilho i está de pé em t? Só cai na fase 4, e só os que não têm o símbolo chamado. */
export function memUp(m: Memory, seed: number, i: number, t: number) {
  const st = memState(m, t)
  if (st.ph !== 4) return true
  return memSymbols(m, seed, st.r)[i] === memTarget(seed, st.r)
}

/** Ladrilho que cai `warn` s depois de pisado e volta depois de `gone`; k 0 = quadrado (meia largura h), 1 = hexágono (raio h). */
export interface Tile {
  x: number
  z: number
  y: number
  h: number
  c: number
  k: 0 | 1
}

/** Porta numa fileira: as falsas são parede; as de verdade abrem quando alguém encosta (a semente sorteia quais). */
export interface Door {
  x: number
  z: number
  hw: number
  h: number
  row: number
}

/** Bloco que anda de um lado para o outro e empurra: centro (x, z) + (ax, az)·sen(w·t + ph). */
export interface Pusher {
  x: number
  z: number
  hx: number
  hz: number
  y: number
  h: number
  ax: number
  az: number
  w: number
  ph: number
}

/** Posto de volta (quem cai volta aqui). */
export interface Checkpoint {
  x: number
  z: number
  y: number
  /** Meia largura para espalhar quem volta. */
  w: number
}

export interface Ramp {
  x: number
  z0: number
  z1: number
  y0: number
  y1: number
  hx: number
}

/** Bolas que descem a rampa: faixas (x), intervalo (s), velocidade, raio e onde somem. */
export interface Balls {
  lanes: readonly number[]
  every: number
  v: number
  R: number
  zEnd: number
}

/** Ponto da rota dos computadores; `m` = índice da plataforma que anda (mira nela onde estiver). */
export interface RoutePoint {
  x: number
  z: number
  m?: number
}

/** Perigo que sobe (pântano, lava): nível y de y0 (em t0) a y1 (em t1); quem fica abaixo está fora. */
export interface Rise {
  y0: number
  y1: number
  t0: number
  t1: number
}

/** Ponto onde aparece uma engrenagem (coleta): some quando alguém pega e volta depois de `back` s. */
export interface Gem {
  x: number
  z: number
  y: number
  /** Quanto vale (a dourada vale 3). */
  v: number
  /** Aparece pela primeira vez neste tempo (s). */
  t0: number
  back: number
}

/**
 * Gincana 3: ondas de PAREDE que atravessam a arena de z0 para z1 (Paredes de
 * Brasa). Uma onda sai a cada `every` s (a partir de t0) e anda mais rápido
 * com o tempo (v0 → v1 em `ramp` s). A semente decide cada onda: parede alta
 * com um vão, com dois vãos, ou mureta baixa (pula). Pedaços de `seg` m.
 */
export interface Walls {
  hw: number
  z0: number
  z1: number
  y: number
  every: number
  t0: number
  v0: number
  v1: number
  ramp: number
  seg: number
  tall: number
  low: number
}

/** Uma onda de parede agora: onde está (z), a velocidade, o tipo (0 = um vão, 1 = mureta, 2 = dois vãos) e os pedaços abertos. */
export interface WallWave {
  i: number
  z: number
  v: number
  kind: 0 | 1 | 2
  gaps: number[]
}

/**
 * Gincana 3 (Rolo de Gelo): anel de um cilindro deitado (eixo em z). Gira em volta do eixo a `w` rad/s
 * (positivo = o topo anda para +x), acelerando devagar; `holes` = buracos (ângulo do material e meia
 * largura, em rad). Ângulo 0 do material = topo no tempo 0.
 */
export interface DrumRing {
  len: number
  w: number
  holes: { a: number; half: number }[]
}

/** Cilindro deitado feito de anéis em fila (de z0 para +z). Eixo na altura y, raio R. */
export interface Drum {
  x: number
  z0: number
  y: number
  R: number
  f: number
  rings: DrumRing[]
}

/** Quanto o anel girou até t (acelera: o dobro da velocidade aos 80 s). */
export function drumAngle(r: DrumRing, t: number) {
  return r.w * (t + (t * t) / 160)
}

/** Velocidade do giro do anel em t (rad/s). */
export function drumSpeed(r: DrumRing, t: number) {
  return r.w * (1 + t / 80)
}

const DRUM_EDGE = 0.93

/**
 * O chão do cilindro em (x, z) no tempo t: topo, anel e o ângulo da superfície (0 = topo, + = lado +x).
 * null = fora dele ou em cima de um buraco.
 */
export function drumAt(d: Drum, x: number, z: number, t: number) {
  const dx = x - d.x
  if (Math.abs(dx) > d.R * DRUM_EDGE || z < d.z0) return null
  let zz = d.z0
  for (let k = 0; k < d.rings.length; k++) {
    const r = d.rings[k]
    if (z <= zz + r.len) {
      const th = Math.asin(dx / d.R)
      const mat = th - drumAngle(r, t)
      for (const h of r.holes) {
        let da = (mat - h.a) % (Math.PI * 2)
        if (da > Math.PI) da -= Math.PI * 2
        if (da < -Math.PI) da += Math.PI * 2
        if (Math.abs(da) < h.half) return null
      }
      return { top: d.y + Math.sqrt(d.R * d.R - dx * dx), ring: k, th }
    }
    zz += r.len
  }
  return null
}

/** Zona do rei do pedaço: círculo (x, z, r) com o chão em y. */
export interface Zone {
  x: number
  z: number
  r: number
  y: number
}

export interface Course {
  id: GincanaPhase
  /** Tipo da prova (Gincana 3). */
  mode: GincanaMode
  /** Fração das vagas que classifica. */
  qualify: number
  /** Duração máxima da prova (s depois do "vai"). */
  limit: number
  rise: Rise | null
  gems: Gem[]
  zone: Zone | null
  walls: Walls | null
  /** Gincana 3: cilindros que giram (Rolo de Gelo). */
  drums: Drum[]
  /** Gincana 3: a grade do Relógio da Praça. */
  memory: Memory | null
  /** Gincana 3 (Coroa da Torre): a linha fica acima do chão — só cruza quem pula (pegar a coroa). */
  crown: boolean
  pads: Pad[]
  posts: Post[]
  sweepers: Sweeper[]
  pendulums: Pendulum[]
  gloves: Glove[]
  tiles: Tile[]
  tileTime: { warn: number; gone: number }
  doors: Door[]
  /** Por fileira de portas: quantas abrem. */
  doorOpen: number[]
  pushers: Pusher[]
  ramp: Ramp | null
  balls: Balls | null
  checkpoints: Checkpoint[]
  logos: { x: number; z: number; y: number }[]
  finishZ: number
  finishY: number
  /** z onde começa cada trecho (1…n); antes do primeiro = largada; depois da chegada = n + 1. */
  sections: number[]
  /** Ninguém chega antes disto (s; a sala confere). */
  minFinish: number
  /** Rota dos computadores (a semente escolhe o lado, a viga, a faixa…). */
  route: (rand: (k: number) => number) => RoutePoint[]
}

// ── montar um percurso ───────────────────────────────────────────────────────

/** Ajudante de montagem (courses.ts): cada fase chama estes métodos em ordem e termina em `done`. */
export class CourseKit {
  readonly pads: Pad[] = []
  readonly posts: Post[] = []
  readonly sweepers: Sweeper[] = []
  readonly pendulums: Pendulum[] = []
  readonly gloves: Glove[] = []
  readonly tiles: Tile[] = []
  readonly doors: Door[] = []
  readonly doorOpen: number[] = []
  readonly pushers: Pusher[] = []
  readonly logos: { x: number; z: number; y: number }[] = []
  ramp: Ramp | null = null
  balls: Balls | null = null
  readonly gems: Gem[] = []
  readonly drums: Drum[] = []
  drum(x: number, z0: number, y: number, R: number, rings: DrumRing[], f = 0.6) {
    this.drums.push({ x, z0, y, R, f, rings })
  }
  gem(x: number, z: number, y: number, v: number, t0: number, back: number) {
    this.gems.push({ x, z, y, v, t0, back })
  }

  /** Caixa (tampo em `y`). Devolve o índice (para pôr esteira, gelo, movimento). */
  box(x: number, z: number, hx: number, hz: number, c: number, rim: number, s: number, rot = 0, d = 1.4, y = DECK) {
    this.pads.push({ k: 1, x, z, r: 0, hx, hz, rot, y, y2: y, d, c, rim, s, f: 1, bx: 0, bz: 0, mx: 0, mz: 0, mw: 0, mph: 0, spin: 0 })
    return this.pads.length - 1
  }
  disc(x: number, z: number, r: number, c: number, rim: number, s: number, y = DECK) {
    this.pads.push({ k: 0, x, z, r, hx: r, hz: r, rot: 0, y, y2: y, d: 1.6, c, rim, s, f: 1, bx: 0, bz: 0, mx: 0, mz: 0, mw: 0, mph: 0, spin: 0 })
    return this.pads.length - 1
  }
  /** Viga de (x0, z0) a (x1, z1), largura `w`. */
  beam(x0: number, z0: number, x1: number, z1: number, w: number, c: number, rim: number, s: number) {
    const L = Math.hypot(x1 - x0, z1 - z0)
    return this.box((x0 + x1) / 2, (z0 + z1) / 2, w / 2, L / 2, c, rim, s, Math.atan2(x1 - x0, z1 - z0), 0.7)
  }
  /** Rampa de z0 (y0) a z1 (y1), meia largura hx; com bolas opcionais. */
  slope(x: number, z0: number, z1: number, y0: number, y1: number, hx: number, c: number, rim: number, s: number) {
    // várias rampas (Gincana 3): só a primeira tem as bolas
    if (!this.ramp) this.ramp = { x, z0, z1, y0, y1, hx }
    this.pads.push({ k: 2, x, z: (z0 + z1) / 2, r: 0, hx, hz: (z1 - z0) / 2, rot: 0, y: y0, y2: y1, d: 1.4, c, rim, s, f: 1, bx: 0, bz: 0, mx: 0, mz: 0, mw: 0, mph: 0, spin: 0 })
    return this.pads.length - 1
  }
  post(x: number, z: number, r: number, y0: number, y1: number, c: number, b = 0) {
    this.posts.push({ x, z, r, y0, y1, c, b })
  }
  sweep(x: number, z: number, y: number, len: number, r: number, w: number, a0: number, both: boolean, acc = 0, wMax = 0) {
    this.sweepers.push({ x, z, y, len, r, w, a0, both, acc, wMax })
    return this.sweepers.length - 1
  }
  swing(x: number, z: number, py: number, len: number, R: number, amp: number, w: number, ph: number) {
    this.pendulums.push({ x, z, py, len, R, amp, w, ph })
  }
  glove(x0: number, z: number, y: number, dir: number, reach: number, R: number, period: number, ph: number) {
    this.gloves.push({ x0, z, y, dir, reach, R, period, ph })
  }
  tile(x: number, z: number, h: number, c: number, k: 0 | 1 = 0, y = DECK) {
    this.tiles.push({ x, z, y, h, c, k })
  }
  /** Fileira de `n` portas de largura `w` centrada em x, em z; `open` abrem. */
  doorRow(x: number, z: number, n: number, w: number, h: number, open: number) {
    const row = this.doorOpen.length
    this.doorOpen.push(open)
    for (let i = 0; i < n; i++) this.doors.push({ x: x + (i - (n - 1) / 2) * w, z, hw: w / 2, h, row })
  }
  pusher(x: number, z: number, hx: number, hz: number, h: number, ax: number, az: number, w: number, ph: number, y = DECK) {
    this.pushers.push({ x, z, hx, hz, y, h, ax, az, w, ph })
  }
  logo(x: number, z: number, y = DECK) {
    this.logos.push({ x, z, y: y + 1.1 })
  }
  /** Fecha o percurso. */
  done(o: {
    id: GincanaPhase
    checkpoints: Checkpoint[]
    finishZ: number
    finishY: number
    sections: number[]
    minFinish: number
    route: Course["route"]
    tileTime?: { warn: number; gone: number }
    mode?: GincanaMode
    qualify?: number
    limit?: number
    rise?: Rise
    zone?: Zone
    walls?: Walls
    memory?: Memory
    crown?: boolean
  }): Course {
    return {
      id: o.id,
      mode: o.mode ?? "race",
      qualify: o.qualify ?? GINCANA.qualify,
      limit: o.limit ?? GINCANA.timeLimit,
      rise: o.rise ?? null,
      gems: this.gems,
      zone: o.zone ?? null,
      walls: o.walls ?? null,
      drums: this.drums,
      memory: o.memory ?? null,
      crown: o.crown ?? false,
      pads: this.pads,
      posts: this.posts,
      sweepers: this.sweepers,
      pendulums: this.pendulums,
      gloves: this.gloves,
      tiles: this.tiles,
      tileTime: o.tileTime ?? { warn: 0.7, gone: 4 },
      doors: this.doors,
      doorOpen: this.doorOpen,
      pushers: this.pushers,
      ramp: this.ramp,
      balls: this.balls,
      checkpoints: o.checkpoints,
      logos: this.logos,
      finishZ: o.finishZ,
      finishY: o.finishY,
      sections: o.sections,
      minFinish: o.minFinish,
      route: o.route,
    }
  }
}

// ── o que se mexe ────────────────────────────────────────────────────────────

export function sweeperAngle(s: Sweeper, t: number) {
  if (!s.acc) return s.a0 + s.w * t
  // acelera até wMax e segue nela
  const sg = Math.sign(s.w || 1)
  const w0 = Math.abs(s.w)
  const tc = Math.max(0, Math.min(t, (s.wMax - w0) / s.acc))
  return s.a0 + sg * (w0 * t + 0.5 * s.acc * tc * tc + s.acc * tc * (t - tc))
}

/** Velocidade do giro da barra no tempo t (rad/s, com sinal). */
export function sweeperW(s: Sweeper, t: number) {
  if (!s.acc) return s.w
  return Math.sign(s.w || 1) * Math.min(s.wMax, Math.abs(s.w) + s.acc * Math.max(0, t))
}

/** Centro da bola do pêndulo e velocidade em x. */
export function pendulumAt(p: Pendulum, t: number) {
  const th = p.amp * Math.sin(p.w * t + p.ph)
  const thd = p.amp * p.w * Math.cos(p.w * t + p.ph)
  return { x: p.x + p.len * Math.sin(th), y: p.py - p.len * Math.cos(th), z: p.z, vx: p.len * Math.cos(th) * thd, th }
}

/**
 * Quanto a luva está para fora (0–1) e se está socando (indo ou parada lá fora).
 * Ciclo: descansa, soca rápido, segura, volta devagar.
 */
export function gloveAt(g: Glove, t: number) {
  const u = (((t + g.ph) / g.period) % 1 + 1) % 1
  let e = 0
  let hot = false
  if (u >= 0.55 && u < 0.62) {
    const k = (u - 0.55) / 0.07
    e = 1 - (1 - k) * (1 - k)
    hot = true
  } else if (u >= 0.62 && u < 0.74) {
    e = 1
    hot = true
  } else if (u >= 0.74) e = 1 - (u - 0.74) / 0.26
  return { x: g.x0 + g.dir * g.reach * e, e, hot, u }
}

/** Deslocamento da plataforma que anda no tempo t (0,0 se parada). */
export function padShift(p: Pad, t: number) {
  if (p.mw === 0) return { dx: 0, dz: 0 }
  const s = Math.sin(p.mw * t + p.mph)
  return { dx: p.mx * s, dz: p.mz * s }
}

/** Giro da plataforma (caixa) no tempo t. */
export function padRot(p: Pad, t: number) {
  return p.rot + p.spin * t
}

/** Centro do bloco que empurra e a velocidade dele. */
export function pusherAt(q: Pusher, t: number) {
  const s = Math.sin(q.w * t + q.ph)
  const c = Math.cos(q.w * t + q.ph) * q.w
  return { x: q.x + q.ax * s, z: q.z + q.az * s, vx: q.ax * c, vz: q.az * c }
}

/** Mistura de inteiros (semente das bolas e das portas). */
export function courseHash(seed: number, i: number) {
  let h = (Math.imul(i + 1, 0x9e3779b1) ^ Math.imul(seed | 0, 0x85ebca77)) >>> 0
  h = Math.imul(h ^ (h >>> 15), 0x2c1b3c6d) >>> 0
  return (h ^ (h >>> 13)) >>> 0
}

/** Faixa do número sorteado (0–3) ou -1 = sem bola nesta vez. */
export function ballLane(c: Course, seed: number, i: number) {
  const h = courseHash(seed, i)
  if (h % 5 === 0 || !c.balls) return -1
  return (h >>> 3) % c.balls.lanes.length
}

/** Quais portas abrem (1) nesta semente: em cada fileira, `doorOpen[row]` sorteadas. */
export function doorsOpen(c: Course, seed: number): Uint8Array {
  const out = new Uint8Array(c.doors.length)
  for (let row = 0; row < c.doorOpen.length; row++) {
    const idx: number[] = []
    for (let i = 0; i < c.doors.length; i++) if (c.doors[i].row === row) idx.push(i)
    // embaralha pela semente e abre as primeiras
    for (let k = idx.length - 1; k > 0; k--) {
      const j = courseHash(seed ^ 0x5bd1e995, row * 31 + k) % (k + 1)
      const tmp = idx[k]
      idx[k] = idx[j]
      idx[j] = tmp
    }
    for (let k = 0; k < Math.min(c.doorOpen[row], idx.length); k++) out[idx[k]] = 1
  }
  return out
}

/** Ondas de parede na arena no tempo t (Paredes de Brasa); `out` é reaproveitado. */
export function wallsAt(c: Course, seed: number, t: number, out: WallWave[]) {
  out.length = 0
  const W = c.walls
  if (!W || t < W.t0) return out
  const span = (W.z0 - W.z1) / W.v0
  const i1 = Math.floor((t - W.t0) / W.every)
  const i0 = Math.max(0, Math.floor((t - W.t0 - span) / W.every))
  const n = Math.round((2 * W.hw) / W.seg)
  for (let i = i0; i <= i1; i++) {
    // depois de 40 s as ímpares chegam logo atrás da anterior (pares de paredes)
    const T = W.t0 + i * W.every - (i % 2 && W.t0 + i * W.every > 40 ? W.every * 0.45 : 0)
    const v = W.v0 + (W.v1 - W.v0) * Math.min(1, T / W.ramp)
    const z = W.z0 - v * (t - T)
    if (z < W.z1 || z > W.z0) continue
    const h = courseHash(seed ^ 0x3c6ef372, i)
    // as duas primeiras são de aquecimento (um vão); depois a semente escolhe
    const roll = i < 2 ? 0 : h % 6
    const kind: 0 | 1 | 2 = roll === 5 ? 1 : roll >= 3 ? 2 : 0
    const g1 = (h >>> 3) % n
    const gaps = kind === 1 ? [] : kind === 2 ? [g1, (g1 + 3 + ((h >>> 9) % (n - 5))) % n] : [g1]
    out.push({ i, z, v, kind, gaps })
  }
  return out
}

/** Nível do perigo que sobe no tempo t (−∞ sem perigo). */
export function riseAt(c: Course, t: number) {
  const R = c.rise
  if (!R) return -Infinity
  const u = Math.max(0, Math.min(1, (t - R.t0) / (R.t1 - R.t0)))
  return R.y0 + (R.y1 - R.y0) * u
}

/** Tampo de uma plataforma em z (a rampa, k = 2, sobe de y em z − hz a y2 em z + hz). */
export function padTop(p: Pad, z: number) {
  if (p.k !== 2) return p.y
  const u = Math.max(0, Math.min(1, (z - (p.z - p.hz)) / (2 * p.hz)))
  return p.y + (p.y2 - p.y) * u
}

/** Altura do tampo da rampa em z. */
export function rampTop(c: Course, z: number) {
  const R = c.ramp
  if (!R) return DECK
  const u = Math.max(0, Math.min(1, (z - R.z0) / (R.z1 - R.z0)))
  return R.y0 + (R.y1 - R.y0) * u
}

/** Bolas rolando agora: [x, y, z, faixa, índice] por bola. */
export function ballsAt(c: Course, seed: number, t: number, out: number[]) {
  out.length = 0
  const B = c.balls
  const R = c.ramp
  if (t < 0 || !B || !R) return out
  const span = (R.z1 - B.zEnd) / B.v
  const i1 = Math.floor(t / B.every)
  const i0 = Math.max(0, Math.floor((t - span) / B.every))
  for (let i = i0; i <= i1; i++) {
    const lane = ballLane(c, seed, i)
    if (lane < 0) continue
    const z = R.z1 - B.v * (t - i * B.every)
    if (z < B.zEnd || z > R.z1) continue
    // depois do pé da rampa a bola cai na água
    const y = z >= R.z0 ? rampTop(c, z) + B.R : R.y0 + B.R - ((R.z0 - z) / B.v) ** 2 * 12
    out.push(R.x + B.lanes[lane], y, z, lane, i)
  }
  return out
}

/** Ladrilho em pé (pode pisar) no tempo t, sabendo quando foi pisado (−1 = nunca). */
export function tileUp(c: Course, stepped: number, t: number) {
  return stepped < 0 || t - stepped < c.tileTime.warn || t - stepped >= c.tileTime.warn + c.tileTime.gone
}

/** O ponto (x, z) está em cima do ladrilho (com folga `e`)? */
export function onTile(q: Tile, x: number, z: number, e: number) {
  if (q.k === 1) return Math.hypot(x - q.x, z - q.z) <= q.h + e
  return Math.abs(x - q.x) <= q.h + e && Math.abs(z - q.z) <= q.h + e
}

/** Trecho da prova em que z está (0 largada, 1…n, n + 1 chegada) — para a interface. */
export function sectionAt(c: Course, z: number) {
  if (z >= c.finishZ) return c.sections.length + 1
  let s = 0
  while (s < c.sections.length && z >= c.sections[s]) s++
  return s
}

/** Lugar de largada da vaga (2 filas de 4) e de volta a um posto. */
export function spawnAt(c: Course, cp: number, slot: number) {
  const p = c.checkpoints[Math.max(0, Math.min(c.checkpoints.length - 1, cp))]
  const col = slot % 4
  const row = Math.floor(slot / 4) % 2
  return { x: p.x + (col - 1.5) * Math.min(3.4, (p.w * 2) / 4), z: p.z - row * 2.6, y: p.y }
}
