// features/meu-mundo/corrida/engine/audio.ts — CORRIDA (mm3d-39): o som, sintetizado.
//
// Sem arquivo de áudio: o motor é um par de osciladores num filtro que abre
// com a velocidade; turbo/faixa = sopro de ruído; parede e encostão = estalo;
// largada = bipes. O contexto nasce no toque que abre a corrida (regra dos
// navegadores) e morre no dispose.

export class RaceAudio {
  private ctx: AudioContext | null = null
  private master: GainNode | null = null
  private engineGain: GainNode | null = null
  private filter: BiquadFilterNode | null = null
  private oscA: OscillatorNode | null = null
  private oscB: OscillatorNode | null = null
  private noise: AudioBuffer | null = null
  private lastHit = 0
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
      this.filter = ctx.createBiquadFilter()
      this.filter.type = "lowpass"
      this.filter.frequency.value = 400
      this.engineGain = ctx.createGain()
      this.engineGain.gain.value = 0
      this.filter.connect(this.engineGain)
      this.engineGain.connect(this.master)
      this.oscA = ctx.createOscillator()
      this.oscA.type = "sawtooth"
      this.oscB = ctx.createOscillator()
      this.oscB.type = "square"
      this.oscA.connect(this.filter)
      this.oscB.connect(this.filter)
      this.oscA.start()
      this.oscB.start()
      const len = ctx.sampleRate
      this.noise = ctx.createBuffer(1, len, ctx.sampleRate)
      const d = this.noise.getChannelData(0)
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1
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

  /** Motor: v em m/s, turbo ligado, no ar. */
  engine(v: number, boost: boolean, air: boolean, on: boolean) {
    const ctx = this.ctx
    if (!ctx || !this.oscA || !this.oscB || !this.filter || !this.engineGain) return
    const t = ctx.currentTime
    const f = 48 + v * 1.9 + (boost ? 30 : 0)
    this.oscA.frequency.setTargetAtTime(f, t, 0.08)
    this.oscB.frequency.setTargetAtTime(f * 0.5 + 3, t, 0.08)
    this.filter.frequency.setTargetAtTime(air ? 500 : 260 + v * 22 + (boost ? 900 : 0), t, 0.1)
    this.engineGain.gain.setTargetAtTime(on ? 0.09 + Math.min(1, v / 60) * 0.06 : 0, t, 0.12)
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

  boost() {
    this.burst(0.9, 500, 0.8, 0.5, 4)
  }

  pickup() {
    this.beep(880, 0.08, 0.12)
    setTimeout(() => this.beep(1320, 0.1, 0.12), 70)
  }

  hit() {
    const now = performance.now()
    if (now - this.lastHit < 160) return
    this.lastHit = now
    this.burst(0.18, 900, 1.5, 0.35)
  }

  land(hard: boolean) {
    this.burst(hard ? 0.35 : 0.2, 160, 1, hard ? 0.6 : 0.3)
  }

  fall() {
    this.burst(1.1, 1200, 2, 0.35, 0.15)
  }

  beep(freq: number, dur = 0.14, gain = 0.18) {
    const ctx = this.ctx
    if (!ctx || !this.master) return
    const t = ctx.currentTime
    const o = ctx.createOscillator()
    o.type = "square"
    o.frequency.value = freq
    const g = ctx.createGain()
    g.gain.setValueAtTime(gain, t)
    g.gain.exponentialRampToValueAtTime(0.001, t + dur)
    o.connect(g)
    g.connect(this.master)
    o.start(t)
    o.stop(t + dur + 0.02)
  }

  dispose() {
    try {
      this.oscA?.stop()
      this.oscB?.stop()
    } catch {
      /* já parado */
    }
    void this.ctx?.close().catch(() => {})
    this.ctx = null
  }
}
