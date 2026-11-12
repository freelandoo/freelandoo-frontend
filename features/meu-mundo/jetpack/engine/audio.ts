// features/meu-mundo/jetpack/engine/audio.ts — JETPACK (mm3d-63): os sons.
//
// Sintetizados na hora (Web Audio, sem arquivo): o RONCO do propulsor é ruído
// marrom em laço → filtro → volume (os nós nascem uma vez; só o volume e o
// filtro mudam, com rampa curta). Por cima: galão, aviso de combustível,
// pancada da prensa por perto, batida e a contagem. Vem do jetpack antigo.

import { audioBus, audioContext, unlockAudio } from "../../engine/audio"

const KEY = "mm:jetpack:sound"

export type Sound = "can" | "low" | "empty" | "crash" | "beep" | "go" | "slam"

export class JetAudio {
  private ctx: AudioContext | null = null
  private master: GainNode | null = null
  private jet: GainNode | null = null
  private jetFilter: BiquadFilterNode | null = null
  private hum: GainNode | null = null
  private noise: AudioBuffer | null = null
  private lastLow = 0
  /** Fontes em laço: o contexto do jogo não fecha, então param aqui no dispose. */
  private loops: AudioBufferSourceNode[] = []
  private on = true
  enabled: boolean

  constructor() {
    let on = true
    try {
      on = localStorage.getItem(KEY) !== "off"
    } catch {
      /* sem armazenamento */
    }
    this.enabled = on
  }

  setEnabled(on: boolean) {
    this.enabled = on
    try {
      localStorage.setItem(KEY, on ? "on" : "off")
    } catch {
      /* sem armazenamento */
    }
    if (this.master && this.ctx) this.master.gain.setTargetAtTime(on ? 0.8 : 0, this.ctx.currentTime, 0.02)
  }

  /** Dentro de um gesto (o navegador só solta o áudio depois de um toque/tecla). */
  unlock() {
    if (this.ctx) {
      if (this.ctx.state === "suspended") void this.ctx.resume()
      return
    }
    try {
      unlockAudio()
      const ctx = audioContext()
      if (!ctx) return
      this.ctx = ctx
      const comp = ctx.createDynamicsCompressor()
      comp.threshold.value = -14
      comp.connect(audioBus("sfx") ?? ctx.destination)
      this.master = ctx.createGain()
      this.master.gain.value = this.enabled ? 0.8 : 0
      this.master.connect(comp)
      const len = ctx.sampleRate * 2
      this.noise = ctx.createBuffer(1, len, ctx.sampleRate)
      const d = this.noise.getChannelData(0)
      let last = 0
      for (let i = 0; i < len; i++) {
        last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02
        d[i] = last * 3.5
      }
      const src = ctx.createBufferSource()
      src.buffer = this.noise
      src.loop = true
      this.jetFilter = ctx.createBiquadFilter()
      this.jetFilter.type = "lowpass"
      this.jetFilter.frequency.value = 600
      this.jetFilter.Q.value = 0.8
      this.jet = ctx.createGain()
      this.jet.gain.value = 0
      src.connect(this.jetFilter).connect(this.jet).connect(this.master)
      src.start()
      this.loops.push(src)
      // zumbido grave do túnel (o vento da velocidade)
      const src2 = ctx.createBufferSource()
      src2.buffer = this.noise
      src2.loop = true
      const f2 = ctx.createBiquadFilter()
      f2.type = "bandpass"
      f2.frequency.value = 220
      f2.Q.value = 0.6
      this.hum = ctx.createGain()
      this.hum.gain.value = 0
      src2.connect(f2).connect(this.hum).connect(this.master)
      src2.start(0, 0.7)
      this.loops.push(src2)
    } catch {
      this.ctx = null
    }
  }

  /** Por quadro: propulsor (0 apagado, 1 aceso), velocidade 0–1 e se o voo está rodando. */
  engine(thrust: boolean, pace: number, flying: boolean) {
    if (!this.ctx || !this.jet || !this.jetFilter || !this.hum) return
    const on = thrust && flying
    const t = this.ctx.currentTime
    if (on !== this.on) {
      this.on = on
      this.jet.gain.cancelScheduledValues(t)
      this.jet.gain.setTargetAtTime(on ? 0.6 : flying ? 0.08 : 0, t, on ? 0.025 : 0.06)
      this.jetFilter.frequency.setTargetAtTime(on ? 1500 : 450, t, 0.08)
    }
    this.hum.gain.setTargetAtTime(flying ? 0.12 + pace * 0.22 : 0, t, 0.2)
  }

  suspend(paused: boolean) {
    if (!this.ctx) return
    // contexto do jogo (engine/audio): pausar = calar este canal, não o contexto inteiro
    if (this.master) this.master.gain.setTargetAtTime(paused || !this.enabled ? 0 : 0.8, this.ctx.currentTime, 0.02)
  }

  play(s: Sound) {
    const ctx = this.ctx
    if (!ctx || !this.master || !this.enabled) return
    const t = ctx.currentTime
    switch (s) {
      case "can":
        this.tone("sine", [740, 1110, 1480], t, 0.05, 0.24)
        break
      case "low":
        if (t - this.lastLow < 1.2) return
        this.lastLow = t
        this.tone("square", [988], t, 0.07, 0.08)
        this.tone("square", [988], t + 0.14, 0.07, 0.08)
        break
      case "empty":
        this.burst(t, 0.3, 1800, 200, 0.3)
        this.tone("triangle", [440, 300, 200], t, 0.09, 0.14)
        break
      case "slam":
        this.burst(t, 0.22, 900, 90, 0.35)
        break
      case "beep":
        this.tone("triangle", [620], t, 0.08, 0.16)
        break
      case "go":
        this.tone("triangle", [1180], t, 0.12, 0.2)
        break
      case "crash": {
        this.burst(t, 0.6, 2400, 120, 0.9)
        const o = ctx.createOscillator()
        const g = ctx.createGain()
        o.type = "sine"
        o.frequency.setValueAtTime(110, t)
        o.frequency.exponentialRampToValueAtTime(35, t + 0.5)
        g.gain.setValueAtTime(0.9, t)
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.55)
        o.connect(g).connect(this.master)
        o.start(t)
        o.stop(t + 0.6)
        break
      }
    }
  }

  private tone(type: OscillatorType, freqs: number[], t: number, step: number, vol: number) {
    const ctx = this.ctx!
    freqs.forEach((f, i) => {
      const o = ctx.createOscillator()
      const g = ctx.createGain()
      const at = t + i * step
      o.type = type
      o.frequency.value = f
      g.gain.setValueAtTime(0.0001, at)
      g.gain.exponentialRampToValueAtTime(vol, at + 0.01)
      g.gain.exponentialRampToValueAtTime(0.0001, at + step * 1.6)
      o.connect(g).connect(this.master!)
      o.start(at)
      o.stop(at + step * 1.7)
    })
  }

  private burst(t: number, dur: number, f0: number, f1: number, vol: number) {
    const ctx = this.ctx!
    const src = ctx.createBufferSource()
    src.buffer = this.noise
    const f = ctx.createBiquadFilter()
    f.type = "lowpass"
    f.frequency.setValueAtTime(f0, t)
    f.frequency.exponentialRampToValueAtTime(f1, t + dur)
    const g = ctx.createGain()
    g.gain.setValueAtTime(vol, t)
    g.gain.exponentialRampToValueAtTime(0.001, t + dur)
    src.connect(f).connect(g).connect(this.master!)
    src.start(t, Math.random())
    src.stop(t + dur + 0.05)
  }

  dispose() {
    try {
      for (const s of this.loops) s.stop()
      this.master?.disconnect()
      this.hum?.disconnect()
      this.jet?.disconnect()
    } catch {
      /* já solto */
    }
    this.ctx = null
    this.master = this.jet = this.jetFilter = this.hum = null
  }
}
