// features/meu-mundo/laminas/engine/audio.ts — o som da luta, sintetizado (veio da Arena de Boxe, mm3d-43; a Lâminas usa desde a mm3d-48).
//
// Sem arquivo de áudio (como a Corrida e o Rolê): a multidão é ruído rosa num
// passa-banda cujo volume segue a "emoção" (sobe com golpe limpo, queda e
// contagem, desce devagar); soco = estalo grave (ruído curto num passa-baixa
// + um tom que cai); bloqueio = baque abafado; esquiva = sopro; sino = três
// parciais de metal; contagem = um tique seco. O contexto nasce no toque que
// abre a luta e morre no dispose.

export class BoxeAudio {
  private ctx: AudioContext | null = null
  private master: GainNode | null = null
  private crowdGain: GainNode | null = null
  private noise: AudioBuffer | null = null
  private crowdSrc: AudioBufferSourceNode | null = null
  private hype = 0.25
  muted = false

  constructor() {
    try {
      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (!Ctx) return
      const ctx = new Ctx()
      this.ctx = ctx
      this.master = ctx.createGain()
      this.master.gain.value = 0.55
      this.master.connect(ctx.destination)
      const len = ctx.sampleRate * 3
      this.noise = ctx.createBuffer(1, len, ctx.sampleRate)
      const d = this.noise.getChannelData(0)
      // ruído rosa (Voss simplificado): multidão menos chiada que o branco
      let b0 = 0
      let b1 = 0
      let b2 = 0
      for (let i = 0; i < len; i++) {
        const w = Math.random() * 2 - 1
        b0 = 0.997 * b0 + w * 0.029
        b1 = 0.985 * b1 + w * 0.032
        b2 = 0.95 * b2 + w * 0.048
        d[i] = (b0 + b1 + b2 + w * 0.02) * 2.2
      }
      const band = ctx.createBiquadFilter()
      band.type = "bandpass"
      band.frequency.value = 700
      band.Q.value = 0.6
      this.crowdGain = ctx.createGain()
      this.crowdGain.gain.value = 0
      this.crowdSrc = ctx.createBufferSource()
      this.crowdSrc.buffer = this.noise
      this.crowdSrc.loop = true
      this.crowdSrc.connect(band)
      band.connect(this.crowdGain)
      this.crowdGain.connect(this.master)
      this.crowdSrc.start()
    } catch {
      this.ctx = null
    }
  }

  resume() {
    void this.ctx?.resume().catch(() => {})
  }

  setMuted(m: boolean) {
    this.muted = m
    if (this.master && this.ctx) this.master.gain.setTargetAtTime(m ? 0 : 0.55, this.ctx.currentTime, 0.05)
  }

  /** Emoção da plateia (0–1); volta devagar para o burburinho. */
  excite(v: number) {
    this.hype = Math.min(1, Math.max(this.hype, v))
  }

  /** Uma vez por quadro. */
  tick(dt: number) {
    if (!this.ctx || !this.crowdGain) return
    this.hype += (0.22 - this.hype) * Math.min(1, dt * 0.5)
    this.crowdGain.gain.setTargetAtTime(0.06 + this.hype * 0.32, this.ctx.currentTime, 0.12)
  }

  private burst(dur: number, freq: number, gain: number, type: BiquadFilterType = "lowpass", q = 0.8) {
    const ctx = this.ctx
    if (!ctx || !this.master || !this.noise || this.muted) return
    const src = ctx.createBufferSource()
    src.buffer = this.noise
    const f = ctx.createBiquadFilter()
    f.type = type
    f.frequency.value = freq
    f.Q.value = q
    const g = ctx.createGain()
    const t = ctx.currentTime
    g.gain.setValueAtTime(gain, t)
    g.gain.exponentialRampToValueAtTime(0.001, t + dur)
    src.connect(f)
    f.connect(g)
    g.connect(this.master)
    src.start(t, Math.random() * 2, dur + 0.05)
  }

  private tone(f0: number, f1: number, dur: number, gain: number, type: OscillatorType = "sine", at = 0) {
    const ctx = this.ctx
    if (!ctx || !this.master || this.muted) return
    const o = ctx.createOscillator()
    o.type = type
    const g = ctx.createGain()
    const t = ctx.currentTime + at
    o.frequency.setValueAtTime(f0, t)
    o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur)
    g.gain.setValueAtTime(gain, t)
    g.gain.exponentialRampToValueAtTime(0.001, t + dur)
    o.connect(g)
    g.connect(this.master)
    o.start(t)
    o.stop(t + dur + 0.05)
  }

  /** Soco que entrou (`power` 0–1; limpo = mais forte e a plateia levanta). */
  punch(power: number, clean: boolean) {
    this.burst(0.09 + power * 0.06, 900 + power * 900, 0.5 + power * 0.5)
    this.tone(150 + power * 40, 55, 0.14, 0.45 + power * 0.35)
    this.excite(clean ? 0.9 : 0.35 + power * 0.3)
  }

  block() {
    this.burst(0.07, 420, 0.4)
    this.tone(110, 70, 0.08, 0.2)
  }

  whoosh() {
    this.burst(0.18, 1600, 0.12, "bandpass", 1.2)
  }

  bell(times = 1) {
    for (let i = 0; i < times; i++) {
      const at = i * 0.32
      this.tone(1180, 1170, 1.4, 0.18, "sine", at)
      this.tone(1630, 1610, 1.0, 0.1, "sine", at)
      this.tone(2420, 2400, 0.7, 0.06, "triangle", at)
    }
    this.excite(0.6)
  }

  count() {
    this.tone(320, 300, 0.09, 0.25, "square")
    this.excite(0.8)
  }

  fall() {
    this.burst(0.35, 260, 0.9)
    this.tone(90, 40, 0.4, 0.5)
    this.excite(1)
  }

  dispose() {
    try {
      this.crowdSrc?.stop()
    } catch {
      /* já parou */
    }
    void this.ctx?.close().catch(() => {})
    this.ctx = null
  }
}
