// features/meu-mundo/noturno/engine/audio.ts — ROLÊ NOTURNO (mm3d-40): o som, sintetizado.
//
// Sem arquivo de áudio (como a Corrida): as rodas são ruído num passa-baixa
// que abre com a velocidade; moeda = dois bipes que sobem com a sequência;
// pulo/rampa = sopro; pouso = baque; tropeço e batida = estalo. O contexto
// nasce no toque que abre o jogo e morre no dispose.

export class RunAudio {
  private ctx: AudioContext | null = null
  private master: GainNode | null = null
  private rollGain: GainNode | null = null
  private rollFilter: BiquadFilterNode | null = null
  private rollSrc: AudioBufferSourceNode | null = null
  private noise: AudioBuffer | null = null
  private lastCoin = 0
  private streak = 0
  muted = false

  constructor() {
    try {
      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (!Ctx) return
      const ctx = new Ctx()
      this.ctx = ctx
      this.master = ctx.createGain()
      this.master.gain.value = 0.5
      this.master.connect(ctx.destination)
      const len = ctx.sampleRate * 2
      this.noise = ctx.createBuffer(1, len, ctx.sampleRate)
      const d = this.noise.getChannelData(0)
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1
      this.rollFilter = ctx.createBiquadFilter()
      this.rollFilter.type = "lowpass"
      this.rollFilter.frequency.value = 300
      this.rollGain = ctx.createGain()
      this.rollGain.gain.value = 0
      this.rollSrc = ctx.createBufferSource()
      this.rollSrc.buffer = this.noise
      this.rollSrc.loop = true
      this.rollSrc.connect(this.rollFilter)
      this.rollFilter.connect(this.rollGain)
      this.rollGain.connect(this.master)
      this.rollSrc.start()
    } catch {
      this.ctx = null
    }
  }

  resume() {
    void this.ctx?.resume().catch(() => {})
  }

  setMuted(m: boolean) {
    this.muted = m
    if (this.master && this.ctx) this.master.gain.setTargetAtTime(m ? 0 : 0.5, this.ctx.currentTime, 0.05)
  }

  /** Rodas no asfalto: v em m/s; no ar, quase nada. */
  roll(v: number, ground: boolean, on: boolean) {
    const ctx = this.ctx
    if (!ctx || !this.rollFilter || !this.rollGain) return
    const t = ctx.currentTime
    this.rollFilter.frequency.setTargetAtTime(180 + v * 28, t, 0.1)
    this.rollGain.gain.setTargetAtTime(on && ground ? 0.05 + Math.min(1, v / 30) * 0.09 : on ? 0.012 : 0, t, 0.08)
  }

  private burst(dur: number, freq: number, q: number, gain: number, sweep = 1) {
    const ctx = this.ctx
    if (!ctx || !this.noise || !this.master) return
    const t = ctx.currentTime
    const src = ctx.createBufferSource()
    src.buffer = this.noise
    const bp = ctx.createBiquadFilter()
    bp.type = "bandpass"
    bp.frequency.setValueAtTime(freq, t)
    bp.frequency.exponentialRampToValueAtTime(freq * sweep, t + dur)
    bp.Q.value = q
    const g = ctx.createGain()
    g.gain.setValueAtTime(gain, t)
    g.gain.exponentialRampToValueAtTime(0.001, t + dur)
    src.connect(bp)
    bp.connect(g)
    g.connect(this.master)
    src.start(t)
    src.stop(t + dur + 0.05)
  }

  private tone(freq: number, dur: number, gain: number, type: OscillatorType = "sine", to?: number) {
    const ctx = this.ctx
    if (!ctx || !this.master) return
    const t = ctx.currentTime
    const o = ctx.createOscillator()
    o.type = type
    o.frequency.setValueAtTime(freq, t)
    if (to) o.frequency.exponentialRampToValueAtTime(to, t + dur)
    const g = ctx.createGain()
    g.gain.setValueAtTime(gain, t)
    g.gain.exponentialRampToValueAtTime(0.001, t + dur)
    o.connect(g)
    g.connect(this.master)
    o.start(t)
    o.stop(t + dur + 0.02)
  }

  /** Moeda: em sequência rápida o tom sobe (até uma oitava). */
  coin() {
    const now = performance.now()
    this.streak = now - this.lastCoin < 450 ? Math.min(12, this.streak + 1) : 0
    this.lastCoin = now
    const f = 990 * Math.pow(2, this.streak / 12)
    this.tone(f, 0.07, 0.09, "square")
    setTimeout(() => this.tone(f * 1.5, 0.12, 0.08, "square"), 55)
  }

  /** Bipe da contagem. */
  beep(freq: number) {
    this.tone(freq, 0.15, 0.12, "square")
  }

  jump() {
    this.burst(0.25, 700, 0.9, 0.22, 2.2)
  }

  launch() {
    this.burst(0.6, 400, 0.8, 0.35, 4)
    this.tone(330, 0.35, 0.05, "triangle", 660)
  }

  land(hard: boolean) {
    this.burst(hard ? 0.32 : 0.18, 150, 1, hard ? 0.55 : 0.3)
  }

  /** Manobra fechada no ar (o mortal sobe um tom). */
  trick(flip: boolean) {
    const k = flip ? 1.26 : 1
    this.tone(660 * k, 0.1, 0.07, "square")
    setTimeout(() => this.tone(880 * k, 0.1, 0.07, "square"), 90)
    setTimeout(() => this.tone(1320 * k, 0.18, 0.07, "square"), 180)
  }

  lane() {
    this.burst(0.09, 1800, 2, 0.05)
  }

  stumble() {
    this.burst(0.22, 700, 1.4, 0.45)
    this.tone(160, 0.2, 0.12, "sawtooth", 90)
  }

  crash() {
    this.burst(0.9, 900, 0.7, 0.7, 0.2)
    this.tone(120, 0.6, 0.2, "sawtooth", 40)
  }

  dispose() {
    try {
      this.rollSrc?.stop()
    } catch {
      /* já parado */
    }
    void this.ctx?.close().catch(() => {})
    this.ctx = null
  }
}
