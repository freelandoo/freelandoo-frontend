// features/meu-mundo/gincana/engine/audio.ts — GINCANA (mm3d-47): o som, sintetizado.
//
// Sem arquivo de áudio (como a Corrida e o Rolê): pulo = "boing" que sobe;
// mergulho = sopro; pancada = baque com mola; água = chuá (ruído que fecha);
// posto = dois sininhos; chegada = fanfarra; contagem = bipes. O contexto nasce
// no toque que abre o jogo e morre no dispose.

export class GincanaAudio {
  private ctx: AudioContext | null = null
  private master: GainNode | null = null
  private noise: AudioBuffer | null = null
  muted = false

  constructor() {
    try {
      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (!Ctx) return
      const ctx = new Ctx()
      this.ctx = ctx
      this.master = ctx.createGain()
      this.master.gain.value = 0.45
      this.master.connect(ctx.destination)
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
    if (this.master && this.ctx) this.master.gain.setTargetAtTime(m ? 0 : 0.45, this.ctx.currentTime, 0.02)
  }

  private tone(type: OscillatorType, f0: number, f1: number, dur: number, vol: number, delay = 0) {
    const ctx = this.ctx
    if (!ctx || !this.master || this.muted) return
    const t = ctx.currentTime + delay
    const o = ctx.createOscillator()
    const g = ctx.createGain()
    o.type = type
    o.frequency.setValueAtTime(f0, t)
    o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur)
    g.gain.setValueAtTime(0.0001, t)
    g.gain.exponentialRampToValueAtTime(vol, t + 0.012)
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
    o.connect(g).connect(this.master)
    o.start(t)
    o.stop(t + dur + 0.02)
  }

  private hiss(f0: number, f1: number, dur: number, vol: number, type: BiquadFilterType = "lowpass") {
    const ctx = this.ctx
    if (!ctx || !this.master || !this.noise || this.muted) return
    const t = ctx.currentTime
    const s = ctx.createBufferSource()
    s.buffer = this.noise
    const f = ctx.createBiquadFilter()
    f.type = type
    f.frequency.setValueAtTime(f0, t)
    f.frequency.exponentialRampToValueAtTime(Math.max(40, f1), t + dur)
    const g = ctx.createGain()
    g.gain.setValueAtTime(vol, t)
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
    s.connect(f).connect(g).connect(this.master)
    s.start(t)
    s.stop(t + dur + 0.02)
  }

  jump() {
    this.tone("sine", 260, 620, 0.18, 0.28)
  }

  dive() {
    this.hiss(2400, 500, 0.3, 0.3, "bandpass")
    this.tone("triangle", 420, 180, 0.22, 0.12)
  }

  hit() {
    this.tone("sine", 180, 60, 0.25, 0.5)
    this.tone("square", 520, 140, 0.2, 0.08, 0.02)
  }

  splash() {
    this.hiss(3200, 200, 0.7, 0.45)
  }

  checkpoint() {
    this.tone("sine", 880, 880, 0.18, 0.2)
    this.tone("sine", 1320, 1320, 0.28, 0.2, 0.12)
  }

  beep(go: boolean) {
    this.tone("square", go ? 880 : 440, go ? 880 : 440, go ? 0.45 : 0.18, 0.14)
  }

  /** Logo da Freelandoo: brilho subindo (turbo). */
  logo() {
    ;[660, 990, 1320].forEach((f, i) => this.tone("sine", f, f * 1.5, 0.16, 0.18, i * 0.05))
    this.hiss(800, 6000, 0.35, 0.12, "highpass")
  }

  finish() {
    ;[523, 659, 784, 1046].forEach((f, i) => this.tone("triangle", f, f, 0.3, 0.22, i * 0.11))
  }

  dispose() {
    void this.ctx?.close().catch(() => {})
    this.ctx = null
  }
}
