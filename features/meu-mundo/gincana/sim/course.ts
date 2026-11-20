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
  /** Esteira (Gincana 3, pedido do Alex 18/11; mais forte em 20/11): parado, ela leva você; contra ela anda a 2 m/s; pulando não escapa. */
  belt: 6.2,
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
  /** Derrubado por obstáculo: sem controle por isto (s); depois levanta (20/11: 0,9 → 1,2, o Alex achou fácil). */
  stunT: 1.2,
  /** 20/11 (o Alex achou tudo fácil): pancada empurra mais longe (× na velocidade de lado). */
  hitPush: 1.3,
  /** 20/11: nas corridas tudo que se mexe gira/vai e volta mais rápido (× na velocidade, ÷ no período). */
  tempo: 1.22,
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
export type GincanaPhase = "cidade" | "floresta" | "clareira" | "serraria" | "canion" | "moinhos" | "gangorras" | "orbital" | "helices" | "forja" | "altoforno" | "crosta" | "fabrica" | "comportas" | "tanque" | "gelo" | "portoes" | "estaleiro" | "aros" | "relogio" | "feira" | "coroa"
export const GINCANA_PHASES: readonly GincanaPhase[] = ["cidade", "floresta", "clareira", "serraria", "canion", "moinhos", "gangorras", "orbital", "helices", "forja", "altoforno", "crosta", "fabrica", "comportas", "tanque", "gelo", "portoes", "estaleiro", "aros", "relogio", "feira", "coroa"]

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
  /**
   * Comporta (20/11, Comportas da Usina): a caixa sobe `gh` m acima de `y` e desce pelo relógio,
   * ciclo de `gp` s com atraso `gph` s (ver gateLift). Embaixo ela fica rente ao chão; em cima é
   * parede, e quem está no tampo sobe junto. 0 = parada.
   */
  gh: number
  gp: number
  gph: number
  /** Graxa: multiplica a velocidade da corrida de quem pisa (1 = normal). */
  sl: number
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
  /** Carrinho (Crosta, 20/11): o eixo corre de lado na viga, ±`tx` m, giro `tw` rad/s, fase `tph`. Sem, parado. */
  tx?: number
  tw?: number
  tph?: number
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
  /**
   * Tabuleiro do caminho escondido (Crosta da Forja, 2026-11-20): `pg` = tabuleiro (−1 = ladrilho comum),
   * `pr`/`pc` = fileira e coluna. A semente sorteia o caminho (`pathReal`): o de verdade, pisado, ACENDE e fica
   * (estado −2 no mundo); o falso cai na hora e não volta.
   */
  pg: number
  /**
   * Cânion (20/11, "o cânion desmorona pela borda"): a pedra cai sozinha neste tempo da prova (como se alguém a
   * pisasse: treme `warn` s e cai). Sem o campo, só cai pisada.
   */
  cr?: number
  pr: number
  pc: number
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
  /** Alto-Forno: a bola QUICA (altura do quique em m, s por quique) e vai de lado (± m) — dá para passar por baixo */
  hop?: number
  hopT?: number
  drift?: number
  /**
   * Alto-Forno, 20/11 (pedido do Alex: "todas as esteiras têm bolas de fogo caindo, e elas quicam e vão mudando de
   * trajetória"): `all` = bolas em TODA rampa que é esteira (as das voltas repetidas e a curta do fim; nas sem canhão
   * elas caem do alto); `bounce` = a cada quique a bola sai para um lado novo (até ± m/s), batendo nas bordas.
   */
  all?: boolean
  bounce?: number
  /** nas esteiras sem canhão a bola sai a cada `every × allEvery` s */
  allEvery?: number
}

/** Esteira com bolas: a 1ª rampa (com o canhão) e, com `balls.all`, as outras rampas que puxam para trás. */
export interface BallBelt {
  x: number
  z0: number
  z1: number
  y0: number
  y1: number
  hx: number
  /** onde a bola some */
  end: number
}
const BELTS = new WeakMap<Course, BallBelt[]>()
export function ballBelts(c: Course): BallBelt[] {
  const got = BELTS.get(c)
  if (got) return got
  const L: BallBelt[] = []
  const R = c.ramp
  const B = c.balls
  if (R && B) {
    L.push({ ...R, end: B.zEnd })
    if (B.all) {
      for (const p of c.pads) {
        if (p.k !== 2 || p.bz >= 0) continue
        const z0 = p.z - p.hz
        if (Math.abs(z0 - R.z0) < 0.01 && Math.abs(p.x - R.x) < 0.01) continue
        L.push({ x: p.x, z0, z1: p.z + p.hz, y0: p.y, y1: p.y2, hx: p.hx, end: z0 })
      }
    }
  }
  BELTS.set(c, L)
  return L
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

/** Aro no ar (Descida dos Aros). */
export interface Hoop {
  x: number
  z: number
  y: number
  R: number
  mx: number
  w: number
  ph: number
}

/** Centro x do aro agora (os que vão e voltam de lado). */
export function hoopX(h: Hoop, t: number) {
  return h.mx > 0 ? h.x + Math.sin(h.w * t + h.ph) * h.mx : h.x
}

/** Atravessou o aro pelo meio neste passo (cruzou o plano z do aro com o meio do corpo dentro do furo)? */
export function hoopPass(h: Hoop, t: number, pz: number, x: number, y: number, z: number) {
  if (!(pz < h.z && z >= h.z)) return false
  return Math.hypot(x - hoopX(h, t), y + 0.85 - h.y) < h.R - 0.45
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
  /** Aceleração do giro (por s); sem valor, 1/160 (o dobro aos 80 s, o Rolo). Tubos do Mar de Gelo: 0. */
  acc?: number
}

/** Cilindro deitado feito de anéis em fila (de z0 para +z). Eixo na altura y, raio R. */
export interface Drum {
  x: number
  z0: number
  y: number
  R: number
  f: number
  rings: DrumRing[]
  /** Trilha dos Moinhos: o lado é parede (moenda no chão); no Rolo de Gelo, não */
  wall: boolean
}

/** Quanto o anel girou até t (acelera: o dobro da velocidade aos 80 s). */
export function drumAngle(r: DrumRing, t: number) {
  return r.w * (t + t * t * (r.acc ?? 1 / 160))
}

/** Velocidade do giro do anel em t (rad/s). */
export function drumSpeed(r: DrumRing, t: number) {
  return r.w * (1 + 2 * t * (r.acc ?? 1 / 160))
}

export const DRUM_EDGE = 0.93

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

/**
 * Serraria da Lua (20/11): TORA deitada atravessada na pista (eixo em x), girando a `w` rad/s — positivo = o
 * topo anda para −z, contra quem corre. Tem `rows` fileiras de cravos (desencontradas, um a cada `pitch` m)
 * que passam por cima e derrubam para trás. Abaixo de 60% da altura o lado é parede (sobe pulando).
 */
export interface Log {
  x: number
  z: number
  y: number
  R: number
  hx: number
  w: number
  rows: number
  pitch: number
  ph: number
}
export const LOG_EDGE = 0.93
/** A ponta do cravo fica isto acima da casca; o raio do que machuca em volta dela. */
export const SPIKE_OUT = 0.55
export const SPIKE_R = 0.3

/** O chão da tora em (x, z): topo e o ângulo da superfície (0 = topo, + = lado +z). null = fora dela. */
export function logAt(L: Log, x: number, z: number) {
  const dz = z - L.z
  if (Math.abs(x - L.x) > L.hx || Math.abs(dz) > L.R * LOG_EDGE) return null
  return { top: L.y + Math.sqrt(L.R * L.R - dz * dz), th: Math.asin(dz / L.R) }
}

/** Ângulo da fileira k de cravos em t (0 = topo, + = lado +z). */
export function logRowAngle(L: Log, k: number, t: number) {
  return L.ph + (k * Math.PI * 2) / L.rows - L.w * t
}

/** Quantos cravos tem a fileira k e o x do j-ésimo (as ímpares ficam no meio das pares). */
export function logSpikeCount(L: Log, k: number) {
  return Math.max(1, Math.floor((2 * L.hx) / L.pitch) - (k % 2))
}
export function logSpikeX(L: Log, k: number, j: number) {
  return L.x - L.hx + L.pitch * (j + 0.5 + (k % 2) * 0.5)
}

/**
 * Serraria da Lua: TÁBUA que balança de lado (gira em volta do eixo z, no centro). `amp` rad, `w` rad/s;
 * ângulo + = o lado +x sobe. Quem está em cima escorrega para o lado que desce.
 */
export interface Plank {
  x: number
  z: number
  hx: number
  hz: number
  y: number
  amp: number
  w: number
  ph: number
}
/**
 * Estaleiro do Quebra-Gelo: HÉLICE EM PÉ que gira de frente para quem corre (em volta do eixo z). `n` pás de
 * comprimento `L` a partir do cubo (x, y, z), meia largura `hw`, meia espessura `hz` (em z); `w` rad/s
 * (+ = anti-horário visto de trás). As pás varrem o chão embaixo do cubo: passa-se pelo vão entre elas.
 */
export interface Rotor {
  x: number
  z: number
  y: number
  L: number
  n: number
  hw: number
  hz: number
  w: number
  ph: number
}
export function rotorAngle(q: Rotor, k: number, t: number) {
  return q.ph + (k * Math.PI * 2) / q.n + q.w * t
}
/** A pá que pega o ponto (x, y) no plano da hélice (folga `r`), ou −1. */
export function rotorBladeAt(q: Rotor, x: number, y: number, t: number, r: number) {
  const px = x - q.x
  const py = y - q.y
  for (let k = 0; k < q.n; k++) {
    const a = rotorAngle(q, k, t)
    const c = Math.cos(a)
    const s = Math.sin(a)
    const along = px * c + py * s
    if (along < 0.3 || along > q.L + r) continue
    if (Math.abs(px * s - py * c) < q.hw + r) return k
  }
  return -1
}

/**
 * Gangorras do Desfiladeiro: GANGORRA que inclina pelo PESO de quem está em cima (o estado fica no mundo,
 * `w.saw`: ângulo e giro de cada uma). `ax` 0 = a tábua comprida em z inclina para a frente/trás (o pivô
 * corre em x); 1 = inclina de lado (o pivô corre em z). Ângulo + = o lado + (z ou x) desce. Sem ninguém,
 * a mola `k` volta ao repouso `a0`; `max` é o batente. `y` = altura do eixo (o meio do tampo).
 */
export interface Seesaw {
  x: number
  z: number
  y: number
  hx: number
  hz: number
  ax: 0 | 1
  max: number
  a0: number
  k: number
  /** Escorregão de lado (m/s no seno do ângulo); sem valor, 6. As balanças das Gangorras (20/11) usam mais. */
  slip?: number
}
/** Ganho do peso (rad/s² por metro de braço de cada um) e amortecimento. */
export const SAW = { gain: 0.6, damp: 2.2 }
/** Braço do ponto: o quanto ele está para o lado + do pivô. */
export function sawArm(S: Seesaw, x: number, z: number) {
  return S.ax === 0 ? z - S.z : x - S.x
}
/** Tampo da gangorra no ângulo `a`, no ponto (x, z) preso dentro da tábua. */
export function sawTop(S: Seesaw, a: number, x: number, z: number) {
  const cx = Math.max(S.x - S.hx, Math.min(S.x + S.hx, x))
  const cz = Math.max(S.z - S.hz, Math.min(S.z + S.hz, z))
  return S.y - Math.tan(a) * sawArm(S, cx, cz)
}
/** Estado inicial: [ângulo, giro] por gangorra, no repouso. */
export function sawRest(C: { saws: Seesaw[] }) {
  const s = new Float64Array(C.saws.length * 2)
  C.saws.forEach((S, i) => (s[i * 2] = S.a0))
  return s
}
/** Um passo: `arms[i]` = soma dos braços de quem está em pé na gangorra i. */
export function stepSawState(C: { saws: Seesaw[] }, s: Float64Array, arms: Float64Array, dt: number) {
  for (let i = 0; i < C.saws.length; i++) {
    const S = C.saws[i]
    let a = s[i * 2]
    let v = s[i * 2 + 1]
    v += (SAW.gain * arms[i] - S.k * (a - S.a0) - SAW.damp * v) * dt
    a += v * dt
    if (a > S.max) {
      a = S.max
      if (v > 0) v = 0
    } else if (a < -S.max) {
      a = -S.max
      if (v < 0) v = 0
    }
    s[i * 2] = a
    s[i * 2 + 1] = v
  }
}

export function plankAngle(P: Plank, t: number) {
  return P.amp * Math.sin(P.w * t + P.ph)
}
/** Tampo da tábua em x no tempo t. */
export function plankTop(P: Plank, x: number, t: number) {
  return P.y + Math.tan(plankAngle(P, t)) * (x - P.x)
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
  /** Serraria da Lua: toras atravessadas com cravos e tábuas que balançam. */
  logs: Log[]
  planks: Plank[]
  /** Estaleiro do Quebra-Gelo: hélices em pé que giram de frente. */
  rotors: Rotor[]
  /** Gangorras do Desfiladeiro: tábuas que inclinam com o peso. */
  saws: Seesaw[]
  /** Gincana 3: a grade do Relógio da Praça. */
  memory: Memory | null
  /** Gincana 3 (Coroa da Torre): a linha fica acima do chão — só cruza quem pula (pegar a coroa). */
  crown: boolean
  /**
   * Portões de Gelo, 20/11 (pedido do Alex: "sempre só uma quebra da fila e não é tão fácil, tem que bater umas 3
   * vezes"): quantas BATIDAS (chegar correndo, > 3 m/s) a porta de verdade aguenta antes de quebrar. 1 = abre ao encostar.
   */
  doorHits: number
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
  /** Descida dos Aros (2026-11-20): aro no ar, de frente para a corrida; atravessar pelo meio dá turbo e embalo. */
  hoops: Hoop[]
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
  readonly hoops: Hoop[] = []
  ramp: Ramp | null = null
  balls: Balls | null = null
  readonly gems: Gem[] = []
  readonly drums: Drum[] = []
  readonly logs: Log[] = []
  readonly planks: Plank[] = []
  readonly rotors: Rotor[] = []
  readonly saws: Seesaw[] = []
  /** Gangorra: pivô em (x, z) na altura `y`; repouso `a0` (rad), batente `max`, mola `k`. */
  saw(x: number, z: number, y: number, hx: number, hz: number, ax: 0 | 1, max: number, a0: number, k: number) {
    this.saws.push({ x, z, y, hx, hz, ax, max, a0, k })
  }
  rotor(x: number, z: number, y: number, L: number, n: number, hw: number, hz: number, w: number, ph = 0) {
    this.rotors.push({ x, z, y, L, n, hw, hz, w, ph })
  }
  log(x: number, z: number, y: number, R: number, hx: number, w: number, rows: number, pitch: number, ph = 0) {
    this.logs.push({ x, z, y, R, hx, w, rows, pitch, ph })
  }
  plank(x: number, z: number, hx: number, hz: number, amp: number, w: number, ph: number, y = DECK) {
    this.planks.push({ x, z, hx, hz, y, amp, w, ph })
  }
  drum(x: number, z0: number, y: number, R: number, rings: DrumRing[], f = 0.6, wall = false) {
    this.drums.push({ x, z0, y, R, f, rings, wall })
  }
  gem(x: number, z: number, y: number, v: number, t0: number, back: number) {
    this.gems.push({ x, z, y, v, t0, back })
  }

  /** Caixa (tampo em `y`). Devolve o índice (para pôr esteira, gelo, movimento). */
  box(x: number, z: number, hx: number, hz: number, c: number, rim: number, s: number, rot = 0, d = 1.4, y = DECK) {
    this.pads.push({ k: 1, x, z, r: 0, hx, hz, rot, y, y2: y, d, c, rim, s, f: 1, bx: 0, bz: 0, mx: 0, mz: 0, mw: 0, mph: 0, spin: 0, gh: 0, gp: 0, gph: 0, sl: 1 })
    return this.pads.length - 1
  }
  /** Comporta (Comportas da Usina): caixa que sobe `h` m e desce, ciclo `per` s, atraso `ph` s. */
  gate(x: number, z: number, hx: number, hz: number, h: number, per: number, ph: number, c: number, rim: number, s: number, y = DECK) {
    const i = this.box(x, z, hx, hz, c, rim, s, 0, h + 1.4, y)
    const p = this.pads[i]
    p.gh = h
    p.gp = per
    p.gph = ph
    return i
  }
  disc(x: number, z: number, r: number, c: number, rim: number, s: number, y = DECK) {
    this.pads.push({ k: 0, x, z, r, hx: r, hz: r, rot: 0, y, y2: y, d: 1.6, c, rim, s, f: 1, bx: 0, bz: 0, mx: 0, mz: 0, mw: 0, mph: 0, spin: 0, gh: 0, gp: 0, gph: 0, sl: 1 })
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
    this.pads.push({ k: 2, x, z: (z0 + z1) / 2, r: 0, hx, hz: (z1 - z0) / 2, rot: 0, y: y0, y2: y1, d: 1.4, c, rim, s, f: 1, bx: 0, bz: 0, mx: 0, mz: 0, mw: 0, mph: 0, spin: 0, gh: 0, gp: 0, gph: 0, sl: 1 })
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
    this.tiles.push({ x, z, y, h, c, k, pg: -1, pr: -1, pc: -1 })
  }
  /** Tabuleiro do caminho escondido: `cols` × `rows` ladrilhos quadrados de meia largura `h`, passo `step`, a partir de z0. */
  pathGrid(x: number, z0: number, cols: number, rows: number, h: number, step: number, c: number) {
    const pg = this.tiles.reduce((m, q) => Math.max(m, q.pg + 1), 0)
    for (let r = 0; r < rows; r++)
      for (let col = 0; col < cols; col++) this.tiles.push({ x: x + (col - (cols - 1) / 2) * step, z: z0 + r * step, y: DECK, h, c, k: 0, pg, pr: r, pc: col })
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
  /** Aro no ar: centro (x, y, z), raio R; se `mx` > 0, vai e volta de lado (±mx m, w rad/s, fase ph). */
  hoop(x: number, z: number, y: number, R: number, mx = 0, w = 0, ph = 0) {
    this.hoops.push({ x, z, y, R, mx, w, ph })
  }
  logo(x: number, z: number, y = DECK) {
    this.logos.push({ x, z, y: y + 1.1 })
  }
  /** Fecha o percurso. */
  /** Tudo que se mexe pelo relógio fica `f` vezes mais rápido (a regra é a mesma no aparelho e na sala). */
  private faster(f: number) {
    for (const s of this.sweepers) {
      s.w *= f
      s.acc *= f * f
      s.wMax *= f
    }
    for (const q of this.pendulums) {
      q.w *= f
      if (q.tw) q.tw *= f
    }
    for (const g of this.gloves) g.period /= f
    for (const q of this.pushers) q.w *= f
    for (const q of this.rotors) q.w *= f
    for (const q of this.logs) q.w *= Math.sqrt(f) // a tora rolando contra já é o obstáculo mais duro: acelera menos
    for (const q of this.planks) q.w *= f
    for (const p of this.pads) {
      p.mw *= f
      p.spin *= f
      p.gp /= f
    }
    if (this.balls) {
      this.balls.v *= f
      this.balls.every /= f
    }
  }

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
    doorHits?: number
  }): Course {
    if ((o.mode ?? "race") === "race") this.faster(GINCANA.tempo)
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
      logs: this.logs,
      planks: this.planks,
      rotors: this.rotors,
      saws: this.saws,
      memory: o.memory ?? null,
      crown: o.crown ?? false,
      doorHits: o.doorHits ?? 1,
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
      hoops: this.hoops,
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
  // carrinho: o eixo anda de lado (o ponto mais baixo do golpe varre a pista toda, até a beira)
  const tw = p.tw ?? 0
  const px = p.x + (p.tx ?? 0) * Math.sin(tw * t + (p.tph ?? 0))
  const pv = (p.tx ?? 0) * tw * Math.cos(tw * t + (p.tph ?? 0))
  return { x: px + p.len * Math.sin(th), y: p.py - p.len * Math.cos(th), z: p.z, vx: p.len * Math.cos(th) * thd + pv, th, px }
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
/**
 * Crosta da Forja: o caminho de verdade de cada tabuleiro, pela semente. Entra na fileira r pela coluna em que
 * saiu da anterior e anda de lado até a coluna da próxima (sem diagonal): na fileira, de verdade = o trecho entre
 * as duas. 1 = de verdade.
 */
export function pathReal(c: Course, seed: number): Uint8Array {
  const out = new Uint8Array(c.tiles.length)
  const grids = c.tiles.reduce((m, q) => Math.max(m, q.pg + 1), 0)
  for (let g = 0; g < grids; g++) {
    let rows = 0
    let cols = 0
    for (const q of c.tiles) if (q.pg === g) {
      rows = Math.max(rows, q.pr + 1)
      cols = Math.max(cols, q.pc + 1)
    }
    const steps = [-2, -1, -1, 0, 1, 1, 2]
    let col = courseHash(seed ^ 0x2c1b3c6d, g * 977) % cols
    for (let r = 0; r < rows; r++) {
      const next = Math.max(0, Math.min(cols - 1, col + steps[courseHash(seed ^ 0x297a2d39, g * 977 + r * 31 + 1) % steps.length]))
      const lo = Math.min(col, next)
      const hi = Math.max(col, next)
      for (let i = 0; i < c.tiles.length; i++) {
        const q = c.tiles[i]
        if (q.pg === g && q.pr === r && q.pc >= lo && q.pc <= hi) out[i] = 1
      }
      col = next
    }
  }
  return out
}

/** Pisaram o ladrilho i: comum = cai daqui a pouco; do caminho = acende (−2) ou cai (falso). */
export function stepTile(c: Course, tiles: Float64Array, real: Uint8Array, i: number, t: number) {
  if (c.tiles[i].pg >= 0) {
    if (tiles[i] === -1) tiles[i] = real[i] ? -2 : t
    return
  }
  if (tiles[i] < 0 || t - tiles[i] >= c.tileTime.warn + c.tileTime.gone) tiles[i] = t
}

/**
 * 20/11 (pedido do Alex): em toda fileira abre UMA porta só (`doorOpen` > 1 não vale mais) e nunca na mesma
 * posição da porta aberta da fileira anterior (a de z logo antes) — quem acertou uma não acerta a próxima de graça.
 */
export function doorsOpen(c: Course, seed: number): Uint8Array {
  const out = new Uint8Array(c.doors.length)
  const rowZ = (row: number) => c.doors.find((d) => d.row === row)?.z ?? 0
  const order = c.doorOpen.map((_, row) => row).sort((a, b) => rowZ(a) - rowZ(b))
  let prev = -1
  for (const row of order) {
    if (c.doorOpen[row] <= 0) continue
    const idx: number[] = []
    for (let i = 0; i < c.doors.length; i++) if (c.doors[i].row === row) idx.push(i)
    // embaralha pela semente e abre a primeira que não fica na frente da aberta da fileira anterior
    for (let k = idx.length - 1; k > 0; k--) {
      const j = courseHash(seed ^ 0x5bd1e995, row * 31 + k) % (k + 1)
      const tmp = idx[k]
      idx[k] = idx[j]
      idx[j] = tmp
    }
    const p = prev >= 0 ? c.doors[prev] : null
    const pick = idx.find((i) => !p || Math.abs(c.doors[i].x - p.x) >= Math.min(c.doors[i].hw, p.hw)) ?? idx[0]
    if (pick === undefined) continue
    out[pick] = 1
    prev = pick
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

/**
 * Comporta: quanto está levantada (0–1) no tempo t. Ciclo: embaixo 38%, sobe 12% (suave),
 * em cima 38%, desce 12%. Tudo pelo tempo: a sala e o aparelho veem igual.
 */
export function gateLift(p: Pad, t: number) {
  if (p.gh === 0) return 0
  const u = ((((t + p.gph) / p.gp) % 1) + 1) % 1
  if (u < 0.38) return 0
  if (u < 0.5) {
    const k = (u - 0.38) / 0.12
    return k * k * (3 - 2 * k)
  }
  if (u < 0.88) return 1
  const k = (u - 0.88) / 0.12
  return 1 - k * k * (3 - 2 * k)
}

/** Tampo de uma plataforma em z no tempo t (a rampa, k = 2, sobe de y em z − hz a y2 em z + hz; a comporta sobe pelo relógio). */
export function padTop(p: Pad, z: number, t = 0) {
  if (p.gh !== 0) return p.y + p.gh * gateLift(p, t)
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

/** Bolas rolando agora: [x, y, z, faixa, índice] por bola (de todas as esteiras com bola). */
export function ballsAt(c: Course, seed: number, t: number, out: number[]) {
  out.length = 0
  const B = c.balls
  if (t < 0 || !B || !c.ramp) return out
  const belts = ballBelts(c)
  for (let j = 0; j < belts.length; j++) {
    const R = belts[j]
    // cada esteira com o seu sorteio (a 1ª com o da semente, como antes)
    const sd = j ? (seed ^ Math.imul(j, 0x51ed27)) | 0 : seed
    const every = j ? B.every * (B.allEvery ?? 1) : B.every
    const span = (R.z1 - R.end) / B.v
    const i1 = Math.floor(t / every)
    const i0 = Math.max(0, Math.floor((t - span) / every))
    const L = R.hx - B.R - 0.15
    for (let i = i0; i <= i1; i++) {
      const lane = ballLane(c, sd, i)
      if (lane < 0) continue
      const age = t - i * every
      const z = R.z1 - B.v * age
      if (z < R.end || z > R.z1) continue
      // depois do pé da rampa a bola cai na água
      const u0 = Math.max(0, Math.min(1, (z - R.z0) / (R.z1 - R.z0)))
      let y = z >= R.z0 ? R.y0 + (R.y1 - R.y0) * u0 + B.R : R.y0 + B.R - ((R.z0 - z) / B.v) ** 2 * 12
      let x = R.x + Math.max(-L, Math.min(L, B.lanes[lane]))
      if (B.hop) {
        // quique: arco de parábola, fase própria de cada bola
        const hopT = B.hopT ?? 0.6
        const s0 = (courseHash(sd, i + 7) % 100) / 100
        const s1 = s0 + age / hopT
        const u = s1 % 1
        if (z >= R.z0) y += B.hop * 4 * u * (1 - u)
        if (B.bounce) {
          // a cada quique um rumo novo de lado; bate na borda e volta (vaivém entre −L e L)
          let off = 0
          for (let q = Math.floor(s0); q <= Math.floor(s1); q++) {
            const v = B.bounce * ((courseHash(sd ^ 0x3c6ef372, i * 61 + q) % 1001) / 500 - 1)
            off += v * (Math.min(s1, q + 1) - Math.max(s0, q)) * hopT
          }
          const m = (((x - R.x + L + off) % (4 * L)) + 4 * L) % (4 * L)
          x = R.x - L + (m < 2 * L ? m : 4 * L - m)
        } else x += (B.drift ?? 0) * Math.sin(age * 1.9 + i * 2.3)
      }
      // nas esteiras sem canhão a bola chega caindo do alto
      if (j && age < 0.45) y += 5 * (1 - age / 0.45) ** 2
      out.push(x, y, z, lane, i)
    }
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

// ═══ reprise — o percurso dobrado (20/11, pedido do Alex: "no mínimo o dobro do percurso") ═══════════════

/** Peças de chão fixo embaixo do caminho em z (o x vem da rota). */
function floorPadsAt(C: Course, z: number) {
  const pts = C.route(() => 0.5)
  let x = 0
  let best = Infinity
  for (const p of pts) if (Math.abs(p.z - z) < best) (best = Math.abs(p.z - z)), (x = p.x)
  return C.pads.filter((p) => {
    if (p.mw !== 0 || p.gh !== 0 || p.sl < 1) return false
    const ex = p.rot ? Math.max(p.hx, p.hz) : p.hx
    return Math.abs(z - p.z) <= p.hz + 0.01 && Math.abs(x - p.x) <= ex + 0.6
  })
}

/** Topo do chão fixo embaixo do caminho em z: para saber quanto um trecho sobe. */
function floorTopAt(C: Course, z: number) {
  // num vão de pulo vale o chão de logo antes
  for (let d = 0; d <= 10; d += 0.5) {
    let y = -Infinity
    for (const p of floorPadsAt(C, z - d)) y = Math.max(y, p.k === 2 ? p.y + ((z - d - (p.z - p.hz)) / (2 * p.hz)) * (p.y2 - p.y) : p.y)
    if (y > -Infinity) return y
  }
  return DECK
}

/** Corte limpo: nenhuma peça embaixo do caminho atravessa a linha z (nem a que gira ou anda). */
function cleanCut(C: Course, z: number) {
  const pts = C.route(() => 0.5)
  let x = 0
  let best = Infinity
  for (const p of pts) if (Math.abs(p.z - z) < best) (best = Math.abs(p.z - z)), (x = p.x)
  return !C.pads.some((p) => {
    const ex = p.rot ? Math.max(p.hx, p.hz) : p.hx
    return Math.abs(x - p.x) <= ex + 0.6 && p.z - p.hz < z - 0.05 && p.z + p.hz > z + 0.05
  })
}

/** A emenda fica no começo da peça de chão que cobre z (nunca corta uma peça no meio). */
function seamAt(C: Course, z: number) {
  const ps = floorPadsAt(C, z)
  return ps.length ? Math.min(...ps.map((p) => p.z - p.hz)) : z
}

/**
 * Dobra o percurso de uma corrida: o miolo [z0, z1) (do começo do trecho 1 ao começo do trecho 5, por padrão)
 * se repete logo depois, deslocado em z (e em y, se o miolo sobe), com tudo que se mexe mais rápido (`f`) e o
 * ritmo trocado (fases deslocadas) — a 2ª volta não é a 1ª decorada. Se ainda não deu `minLen` × `base`
 * (o comprimento antigo da fase), uma 3ª volta parcial (até o começo de um trecho) completa. O que vinha
 * depois de z1 (a subida e a chegada) vai para o fim. Regra pura: o aparelho e a sala calculam igual.
 */
export function reprise(C: Course, o: { z0?: number; z1?: number; base?: number; minLen?: number; f?: number } = {}): Course {
  if (C.mode !== "race") return C
  const z0 = o.z0 ?? seamAt(C, C.sections[0] + 0.05)
  const z1 = o.z1 ?? seamAt(C, C.sections[4] + 0.05)
  const L = z1 - z0
  const target = (o.minLen ?? 2) * (o.base ?? C.finishZ)
  const dyLap = floorTopAt(C, z1 - 0.3) - floorTopAt(C, z0 + 0.3)
  const f = o.f ?? 1.12
  // voltas: [a, b) copiado com deslocamento (dz, dy), velocidade × k e fases + ph
  const laps: { a: number; b: number; dz: number; dy: number; k: number; ph: number }[] = [{ a: z0, b: z1, dz: L, dy: dyLap, k: f, ph: 1.7 }]
  let DZ = L
  let DY = dyLap
  if (C.finishZ + DZ < target) {
    const need = target - C.finishZ - DZ
    // cortes possíveis: começo de cada peça de chão do miolo
    const cuts = [...new Set(C.pads.filter((p) => p.z > z0 && p.z < z1 && p.mw === 0 && p.spin === 0).map((p) => p.z - p.hz).filter((s) => s > z0 + 0.5 && s <= z1 && cleanCut(C, s))), z1].sort((a, b) => a - b)
    const b = cuts.find((s) => s - z0 >= need) ?? z1
    laps.push({ a: z0, b, dz: 2 * L, dy: 2 * dyLap, k: f * f, ph: 3.1 })
    DZ += b - z0
    DY += floorTopAt(C, b - 0.3) - floorTopAt(C, z0 + 0.3)
  }
  const inLap = (z: number, l: (typeof laps)[number]) => z >= l.a && z < l.b
  const after = (z: number) => z >= z1
  const out: Course = {
    ...C,
    pads: [],
    posts: [],
    sweepers: [],
    pendulums: [],
    gloves: [],
    tiles: [],
    doors: [],
    doorOpen: [...C.doorOpen],
    pushers: [],
    logos: [],
    hoops: [],
    gems: [],
    drums: [],
    logs: [],
    planks: [],
    rotors: [],
    saws: [],
    checkpoints: [],
  }
  // cada lista: o original (o que vem depois de z1 vai para o fim) e, para cada volta, a cópia
  function each<T>(src: readonly T[], dst: T[], zOf: (q: T) => number, move: (q: T, dz: number, dy: number) => T, tune: (q: T, k: number, ph: number) => void) {
    src.forEach((q) => dst.push(after(zOf(q)) ? move(q, DZ, DY) : { ...q }))
    const maps: Map<number, number>[] = []
    for (const l of laps) {
      const m = new Map<number, number>()
      src.forEach((q, i) => {
        if (!inLap(zOf(q), l)) return
        const c = move(q, l.dz, l.dy)
        tune(c, l.k, l.ph)
        m.set(i, dst.length)
        dst.push(c)
      })
      maps.push(m)
    }
    return maps
  }
  const none = () => {}
  const padMaps = each(C.pads, out.pads, (p) => p.z, (p, dz, dy) => ({ ...p, z: p.z + dz, y: p.y + dy, y2: p.y2 + dy }), (p, k, ph) => {
    p.mw *= k
    p.spin *= k
    p.mph += ph
    if (p.gp) {
      p.gp /= k
      p.gph += ph * 0.37 * p.gp
    }
  })
  each(C.posts, out.posts, (q) => q.z, (q, dz, dy) => ({ ...q, z: q.z + dz, y0: q.y0 + dy, y1: q.y1 + dy }), none)
  each(C.sweepers, out.sweepers, (q) => q.z, (q, dz, dy) => ({ ...q, z: q.z + dz, y: q.y + dy }), (q, k, ph) => {
    q.w *= k
    q.wMax *= k
    q.acc *= k * k
    q.a0 += ph
  })
  each(C.pendulums, out.pendulums, (q) => q.z, (q, dz, dy) => ({ ...q, z: q.z + dz, py: q.py + dy }), (q, k, ph) => {
    q.w *= k
    q.ph += ph
    if (q.tw) {
      q.tw *= k
      q.tph = (q.tph ?? 0) + ph * 0.7
    }
  })
  each(C.gloves, out.gloves, (q) => q.z, (q, dz, dy) => ({ ...q, z: q.z + dz, y: q.y + dy }), (q, k, ph) => {
    q.period /= k
    q.ph += ph * 0.3 * q.period
  })
  each(C.pushers, out.pushers, (q) => q.z, (q, dz, dy) => ({ ...q, z: q.z + dz, y: q.y + dy }), (q, k, ph) => {
    q.w *= k
    q.ph += ph
  })
  each(C.logos, out.logos, (q) => q.z, (q, dz, dy) => ({ ...q, z: q.z + dz, y: q.y + dy }), none)
  each(C.hoops, out.hoops, (q) => q.z, (q, dz, dy) => ({ ...q, z: q.z + dz, y: q.y + dy }), (q, k, ph) => {
    q.w *= k
    q.ph += ph
  })
  each(C.drums, out.drums, (q) => q.z0, (q, dz, dy) => ({ ...q, z0: q.z0 + dz, y: q.y + dy }), none)
  each(C.logs, out.logs, (q) => q.z, (q, dz, dy) => ({ ...q, z: q.z + dz, y: q.y + dy }), (q, k, ph) => {
    q.w *= k
    q.ph += ph
  })
  each(C.planks, out.planks, (q) => q.z, (q, dz, dy) => ({ ...q, z: q.z + dz, y: q.y + dy }), (q, k, ph) => {
    q.w *= k
    q.ph += ph
  })
  each(C.rotors, out.rotors, (q) => q.z, (q, dz, dy) => ({ ...q, z: q.z + dz, y: q.y + dy }), (q, k, ph) => {
    q.w *= k
    q.ph += ph
  })
  each(C.saws, out.saws, (q) => q.z, (q, dz, dy) => ({ ...q, z: q.z + dz, y: q.y + dy }), none)
  each(C.checkpoints, out.checkpoints, (q) => q.z, (q, dz, dy) => ({ ...q, z: q.z + dz, y: q.y + dy }), none)
  out.checkpoints.sort((a, b) => a.z - b.z)
  // portas: cada volta ganha fileiras novas (sorteadas à parte)
  each(C.doors, out.doors, (q) => q.z, (q, dz) => ({ ...q, z: q.z + dz }), none)
  {
    let n = C.doors.length
    for (const l of laps) {
      const rows = new Map<number, number>()
      for (const d of C.doors) {
        if (!inLap(d.z, l)) continue
        if (!rows.has(d.row)) {
          rows.set(d.row, out.doorOpen.length)
          out.doorOpen.push(C.doorOpen[d.row])
        }
        out.doors[n++].row = rows.get(d.row) as number
      }
    }
  }
  // ladrilhos: o tabuleiro escondido copiado é outro tabuleiro (caminho sorteado à parte)
  each(C.tiles, out.tiles, (q) => q.z, (q, dz, dy) => ({ ...q, z: q.z + dz, y: q.y + dy }), none)
  {
    let n = C.tiles.length
    let pg = C.tiles.reduce((m, q) => Math.max(m, q.pg + 1), 0)
    for (const l of laps) {
      const grids = new Map<number, number>()
      for (const t of C.tiles) {
        if (!inLap(t.z, l)) continue
        const q = out.tiles[n++]
        if (t.pg < 0) continue
        if (!grids.has(t.pg)) grids.set(t.pg, pg++)
        q.pg = grids.get(t.pg) as number
      }
    }
  }
  if (C.ramp && after(C.ramp.z0)) {
    out.ramp = { ...C.ramp, z0: C.ramp.z0 + DZ, z1: C.ramp.z1 + DZ, y0: C.ramp.y0 + DY, y1: C.ramp.y1 + DY }
    if (C.balls) out.balls = { ...C.balls, zEnd: C.balls.zEnd + DZ }
  }
  const ratio = (C.finishZ + DZ) / C.finishZ
  out.finishZ = C.finishZ + DZ
  out.finishY = C.finishY + DY
  out.sections = C.sections.map((s) => (after(s) ? s + DZ : s))
  out.minFinish = Math.round(C.minFinish * ratio)
  out.limit = Math.min(300, Math.max(C.limit, Math.round(C.limit * ratio * 0.85)))
  if (C.rise) out.rise = { ...C.rise, y1: C.rise.y1 + DY, t1: C.rise.t0 + (C.rise.t1 - C.rise.t0) * ratio }
  // percurso que DESCE (Descida dos Aros): a 2ª volta afundaria no mar — levanta tudo, a chegada fica onde estava
  if (DY < 0) {
    const up = -DY
    for (const p of out.pads) (p.y += up), (p.y2 += up)
    for (const q of out.posts) (q.y0 += up), (q.y1 += up)
    for (const L of [out.sweepers, out.gloves, out.pushers, out.logos, out.hoops, out.drums, out.logs, out.planks, out.rotors, out.saws, out.checkpoints, out.tiles] as { y: number }[][]) for (const q of L) q.y += up
    for (const q of out.pendulums) q.py += up
    out.finishY += up
    if (out.ramp) out.ramp = { ...out.ramp, y0: out.ramp.y0 + up, y1: out.ramp.y1 + up }
  }
  const route0 = C.route
  out.route = (r) => {
    const pts = route0(r)
    const res: RoutePoint[] = []
    const fix = (p: RoutePoint, dz: number, map?: Map<number, number>) => {
      const q: RoutePoint = { x: p.x, z: p.z + dz }
      if (p.m !== undefined) q.m = map ? (map.get(p.m) ?? p.m) : p.m
      return q
    }
    for (const p of pts) if (p.z < z1) res.push(fix(p, 0))
    laps.forEach((l, i) => {
      for (const p of pts) if (inLap(p.z, l)) res.push(fix(p, l.dz, padMaps[i]))
    })
    for (const p of pts) if (after(p.z)) res.push(fix(p, DZ))
    return res
  }
  return out
}
