// features/meu-mundo/laminas/engine/strike-audio.ts — o som dos golpes (lv2-B3, 2026-11-11).
//
// Um som por FAMÍLIA de golpe (as mesmas da B1, abilities/families.ts), tocado por cima do
// Corte, da Investida e do Escudo, e um som por PODER (a família de efeito da assinatura,
// abilities/signatures.ts, + cura). Tudo sintetizado por Web Audio, sem arquivo de terceiros.
//
// Mistura: tudo sai num canal de efeitos próprio (o `bus`), separado da multidão; no máximo
// MAX_VOICES sons ao mesmo tempo (o mais novo é largado se lotar — celular agradece); cada
// golpe varia um pouco de tom e de volume. O "mudo" vem de quem dá o canal (BoxeAudio).
//
// Encaixe para arquivo: SOUND_FILES[id] = "/meu-mundo/laminas/sons/<id>.ogg" troca aquele som
// pelo arquivo (baixa e decodifica no primeiro pedido; até lá, e se falhar, toca o sintetizador).
// Sem Babylon de propósito (o harness em MEU MUNDO 3D/pipeline/som/ usa este arquivo puro).

export type StrikeFamily = "blade" | "mage" | "hammer" | "bow" | "gun" | "claws" | "stone"
export type StrikeMove = "slash" | "dash" | "shield"
export type PowerKind = "blood" | "ember" | "storm" | "stone" | "shadow" | "solar" | "tide" | "prism" | "gear" | "steel" | "heal" | "ice"

export type SoundId = `family.${StrikeFamily}` | `power.${PowerKind}`

/** O canal onde os efeitos tocam (dado pela BoxeAudio ou pelo harness). */
export interface FxBus {
  ctx: AudioContext
  out: AudioNode
  noise: AudioBuffer
  muted: () => boolean
}

/** Ferramentas do sintetizador: já com a variação do golpe aplicada (p = tom, v = volume). */
export interface Synth {
  tone(f0: number, f1: number, dur: number, gain: number, type?: OscillatorType, at?: number): void
  burst(dur: number, freq: number, gain: number, type?: BiquadFilterType, q?: number, at?: number): void
  /** Eco curto (maga, brilho): repete o tom mais baixo algumas vezes. */
  echo(f: number, dur: number, gain: number, times: number, gap: number, type?: OscillatorType): void
}

type SynthFn = (s: Synth, move: StrikeMove) => number // devolve a duração (para contar a voz)

const MAX_VOICES = 6

// ── a tabela som → sintetizador ─────────────────────────────────────────────
export const SOUND_SYNTHS: Record<SoundId, SynthFn> = {
  // lâmina: zunido metálico (sopro agudo + dois parciais de aço)
  "family.blade": (s, m) => {
    const k = m === "dash" ? 0.6 : 1
    s.burst(0.22 * k, 3000, 0.18, "bandpass", 2)
    s.tone(2600, 3400, 0.35 * k, 0.05, "sine", 0.02)
    s.tone(3900, 4300, 0.25 * k, 0.03, "triangle", 0.03)
    return 0.4
  },
  // maga: brilho com eco (sino agudo que repete mais baixo)
  "family.mage": (s, m) => {
    const f = m === "shield" ? 1320 : 1760
    s.tone(f, f * 1.5, 0.12, 0.06, "sine")
    s.echo(f * 1.5, 0.25, 0.07, m === "dash" ? 2 : 4, 0.09, "triangle")
    return 0.7
  },
  // martelo: baque grave (tom que cai + ruído grave)
  "family.hammer": (s, m) => {
    s.tone(m === "shield" ? 120 : 95, 38, 0.4, 0.6)
    s.burst(0.25, 320, 0.6, "lowpass", 0.9)
    s.burst(0.08, 1400, 0.15, "bandpass", 1.2, 0.02)
    return 0.45
  },
  // arco: corda (tom que vibra) e flecha (sopro que corre)
  "family.bow": (s, m) => {
    s.tone(220, 190, 0.18, 0.18, "triangle")
    s.tone(440, 380, 0.12, 0.06, "sawtooth")
    if (m !== "shield") s.burst(0.3, 2200, 0.16, "bandpass", 3, 0.06)
    return 0.4
  },
  // arma de fogo: estalo seco (ruído alto curtíssimo + soco grave)
  "family.gun": (s, m) => {
    s.burst(0.05, 2600, 0.55, "highpass", 0.7)
    s.burst(0.12, 700, 0.4, "lowpass", 0.8)
    s.tone(180, 60, 0.1, 0.35)
    if (m === "shield") s.tone(1600, 1500, 0.15, 0.04, "square", 0.08) // cartucho caindo
    return 0.25
  },
  // garras: rasgo (três sopros ásperos em fila)
  "family.claws": (s, m) => {
    const n = m === "dash" ? 2 : 3
    for (let i = 0; i < n; i++) s.burst(0.11, 1800 + i * 500, 0.24, "bandpass", 0.9, i * 0.06)
    s.tone(700, 260, 0.2, 0.05, "sawtooth")
    return 0.32
  },
  // pedra: estrondo (ruído grave longo + rolar de pedrinhas)
  "family.stone": (s) => {
    s.burst(0.6, 240, 0.8, "lowpass", 0.7)
    s.tone(70, 32, 0.6, 0.55)
    for (let i = 0; i < 4; i++) s.burst(0.05, 900 + i * 250, 0.12, "bandpass", 2, 0.12 + i * 0.07)
    return 0.7
  },

  // ── poderes ──
  // sangue: pulso grave e rasgo úmido
  "power.blood": (s) => {
    s.tone(80, 40, 0.3, 0.5)
    s.burst(0.4, 1400, 0.3, "bandpass", 1)
    return 0.5
  },
  // fogo: rugido (ruído que abre) + crepitar
  "power.ember": (s) => {
    s.burst(0.8, 600, 0.5, "lowpass", 0.6)
    for (let i = 0; i < 6; i++) s.burst(0.03, 3000, 0.15, "highpass", 1, 0.1 + i * 0.09)
    return 0.9
  },
  // raio: estalo elétrico com zumbido quadrado
  "power.storm": (s) => {
    s.burst(0.12, 4200, 0.5, "highpass", 0.7)
    s.tone(1800, 120, 0.35, 0.12, "square")
    s.tone(60, 55, 0.5, 0.12, "sawtooth", 0.05)
    s.burst(0.5, 300, 0.4, "lowpass", 0.7, 0.08) // trovão atrás
    return 0.65
  },
  // pedra: terremoto
  "power.stone": (s) => {
    s.burst(1, 180, 0.9, "lowpass", 0.7)
    s.tone(55, 28, 1, 0.6)
    return 1
  },
  // sombra: sopro grave que some ao contrário
  "power.shadow": (s) => {
    s.tone(140, 70, 0.8, 0.2, "sawtooth")
    s.tone(147, 72, 0.8, 0.15, "sawtooth")
    s.burst(0.7, 500, 0.25, "bandpass", 1.5)
    return 0.85
  },
  // sol / luz: acorde maior que sobe
  "power.solar": (s) => {
    for (const [f, at] of [[523, 0], [659, 0.05], [784, 0.1], [1046, 0.15], [1568, 0.2]] as const) s.tone(f, f * 1.02, 0.8, 0.07, "sine", at)
    s.burst(0.5, 5000, 0.08, "highpass", 0.7)
    return 1
  },
  // maré / água: onda (ruído que sobe e desce) e borbulha
  "power.tide": (s) => {
    s.burst(0.9, 800, 0.4, "bandpass", 0.6)
    for (let i = 0; i < 5; i++) s.tone(400 + i * 90, 900 + i * 120, 0.06, 0.06, "sine", 0.2 + i * 0.08)
    return 0.95
  },
  // prisma / cristal: tinidos de vidro em cascata
  "power.prism": (s) => {
    for (let i = 0; i < 6; i++) s.tone(2093 + i * 330, 2093 + i * 330, 0.4, 0.05, "sine", i * 0.05)
    return 0.7
  },
  // engrenagem: catraca (cliques quadrados) e motor
  "power.gear": (s) => {
    for (let i = 0; i < 8; i++) s.tone(900, 860, 0.025, 0.1, "square", i * 0.05)
    s.tone(90, 160, 0.5, 0.12, "sawtooth")
    return 0.55
  },
  // aço: duas lâminas que se cruzam (raspa + plim)
  "power.steel": (s) => {
    s.burst(0.3, 5000, 0.2, "bandpass", 2)
    s.tone(1480, 1460, 0.6, 0.08, "triangle", 0.1)
    s.tone(2220, 2200, 0.45, 0.04, "sine", 0.1)
    return 0.7
  },
  // cura: arpejo suave que sobe
  "power.heal": (s) => {
    for (const [f, at] of [[659, 0], [784, 0.08], [988, 0.16], [1318, 0.24]] as const) s.tone(f, f, 0.45, 0.06, "sine", at)
    return 0.7
  },
  // gelo: estalo cristalino e chiado frio
  "power.ice": (s) => {
    s.tone(3200, 2400, 0.15, 0.06, "sine")
    s.tone(4100, 3700, 0.2, 0.04, "triangle", 0.04)
    s.burst(0.5, 6000, 0.1, "highpass", 0.7, 0.05)
    s.burst(0.06, 1500, 0.25, "bandpass", 3)
    return 0.6
  },
}

/** Arquivos próprios do Alex (vazio por enquanto): id → URL de um .ogg. */
export const SOUND_FILES: Partial<Record<SoundId, string>> = {}

export const SOUND_IDS = Object.keys(SOUND_SYNTHS) as SoundId[]

/** Família de efeito da assinatura → som de poder. */
export function powerSound(family: string, heal = false): SoundId {
  if (heal) return "power.heal"
  const k = `power.${family}` as SoundId
  return k in SOUND_SYNTHS ? k : "power.steel"
}

export class StrikeAudio {
  private voices: number[] = [] // fim de cada voz (tempo do contexto)
  private files = new Map<SoundId, AudioBuffer | "loading" | "failed">()

  constructor(private bus: FxBus | null) {}

  play(id: SoundId, move: StrikeMove = "slash", vol = 1) {
    const b = this.bus
    if (!b || b.muted()) return
    const now = b.ctx.currentTime
    this.voices = this.voices.filter((t) => t > now)
    if (this.voices.length >= MAX_VOICES) return
    const p = 1 + (Math.random() * 2 - 1) * 0.04 // ±4% de tom
    const v = vol * (0.9 + Math.random() * 0.2) // ±10% de volume
    const file = this.fileFor(id)
    if (file) {
      const src = b.ctx.createBufferSource()
      src.buffer = file
      src.playbackRate.value = p
      const g = b.ctx.createGain()
      g.gain.value = v
      src.connect(g)
      g.connect(b.out)
      src.start()
      this.voices.push(now + file.duration / p)
      return
    }
    const dur = SOUND_SYNTHS[id](this.synth(b, p, v), move)
    this.voices.push(now + dur)
  }

  family(f: StrikeFamily, move: StrikeMove) {
    this.play(`family.${f}`, move)
  }

  power(family: string, heal = false) {
    this.play(powerSound(family, heal), "slash")
  }

  private fileFor(id: SoundId): AudioBuffer | null {
    const url = SOUND_FILES[id]
    if (!url || !this.bus) return null
    const got = this.files.get(id)
    if (got && got !== "loading" && got !== "failed") return got
    if (!got) {
      this.files.set(id, "loading")
      const ctx = this.bus.ctx
      fetch(url)
        .then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(String(r.status)))))
        .then((a) => ctx.decodeAudioData(a))
        .then((buf) => this.files.set(id, buf))
        .catch(() => this.files.set(id, "failed"))
    }
    return null
  }

  private synth(b: FxBus, p: number, v: number): Synth {
    const { ctx, out, noise } = b
    const tone: Synth["tone"] = (f0, f1, dur, gain, type = "sine", at = 0) => {
      const o = ctx.createOscillator()
      o.type = type
      const g = ctx.createGain()
      const t = ctx.currentTime + at
      o.frequency.setValueAtTime(f0 * p, t)
      o.frequency.exponentialRampToValueAtTime(Math.max(20, f1 * p), t + dur)
      g.gain.setValueAtTime(gain * v, t)
      g.gain.exponentialRampToValueAtTime(0.001, t + dur)
      o.connect(g)
      g.connect(out)
      o.start(t)
      o.stop(t + dur + 0.05)
    }
    const burst: Synth["burst"] = (dur, freq, gain, type = "lowpass", q = 0.8, at = 0) => {
      const src = ctx.createBufferSource()
      src.buffer = noise
      const f = ctx.createBiquadFilter()
      f.type = type
      f.frequency.value = freq * p
      f.Q.value = q
      const g = ctx.createGain()
      const t = ctx.currentTime + at
      g.gain.setValueAtTime(gain * v, t)
      g.gain.exponentialRampToValueAtTime(0.001, t + dur)
      src.connect(f)
      f.connect(g)
      g.connect(out)
      src.start(t, Math.random() * Math.max(0, noise.duration - dur - 0.1), dur + 0.05)
    }
    const echo: Synth["echo"] = (f, dur, gain, times, gap, type = "sine") => {
      for (let i = 0; i < times; i++) tone(f, f, dur, gain * Math.pow(0.55, i), type, i * gap)
    }
    return { tone, burst, echo }
  }
}

/** Para o harness: um contexto próprio, com ruído e canal de efeitos. */
export function standaloneBus(): FxBus | null {
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Ctx) return null
    const ctx = new Ctx()
    const out = ctx.createGain()
    out.gain.value = 0.55
    out.connect(ctx.destination)
    const noise = ctx.createBuffer(1, ctx.sampleRate * 3, ctx.sampleRate)
    const d = noise.getChannelData(0)
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1
    return { ctx, out, noise, muted: () => false }
  } catch {
    return null
  }
}
