// features/meu-mundo/ui/gacha/gacha-sky.ts — gacha-v1b (24/11/2026): a FONTE e o CÉU da abertura das Convocações.
//
// Canvas 2D (sem 3D por cima do jogo): embaixo a Fonte do Éter jorrando água de partículas; ao convocar ela
// dispara, cada giro vira um feixe de gotas que SOBE ao céu e desce até o seu lugar, onde acende uma ESTRELA da
// cor da faixa (a do servidor). A tela (gacha-reveal.tsx) abre a carta do fragmento em cima de cada estrela.
// Nada aqui sorteia: as cores e a ordem vêm do recibo. Teto: ~450 partículas vivas; DPR até 1,5.

export interface SkyShot {
  /** Lugar da estrela, 0–1 na caixa. */
  x: number
  y: number
  color: string
  /** A melhor do lote (estrela maior, halo duplo no Topo). */
  big: boolean
  top: boolean
}

interface Drop {
  x: number
  y: number
  vx: number
  vy: number
  life: number
}
interface Ray {
  shot: number
  t0: number
  dur: number
  p0x: number
  p0y: number
  c1x: number
  c1y: number
  px: number
  py: number
  done: boolean
}

const LAUNCH_AT = 650
const CLUSTER = 16
const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2)

export class GachaSky {
  private ctx: CanvasRenderingContext2D
  private w = 0
  private h = 0
  private dpr = 1
  private raf = 0
  private t0 = 0
  private last = 0
  private drops: Drop[] = []
  private rays: Ray[] = []
  private lit: number[] = []
  private litAt: number[] = []
  private arrived: number[] = []
  private bg: { x: number; y: number; r: number; ph: number; sp: number }[] = []
  private emitAcc = 0
  private launched = false
  private allDone = false

  constructor(
    private canvas: HTMLCanvasElement,
    private shots: SkyShot[],
    private on: { star: (i: number) => void; launch: () => void; all: () => void },
  ) {
    this.ctx = canvas.getContext("2d")!
    this.resize()
    this.arrived = shots.map(() => 0)
    for (let i = 0; i < 70; i++) this.bg.push({ x: Math.random(), y: Math.random() * 0.72, r: 0.4 + Math.random() * 1.1, ph: Math.random() * 6.28, sp: 0.6 + Math.random() * 1.8 })
  }

  resize() {
    const r = this.canvas.getBoundingClientRect()
    this.dpr = Math.min(1.5, window.devicePixelRatio || 1)
    this.w = Math.max(1, r.width)
    this.h = Math.max(1, r.height)
    this.canvas.width = Math.round(this.w * this.dpr)
    this.canvas.height = Math.round(this.h * this.dpr)
  }

  start() {
    this.t0 = performance.now()
    this.last = this.t0
    const loop = (now: number) => {
      this.frame(now)
      this.raf = requestAnimationFrame(loop)
    }
    this.raf = requestAnimationFrame(loop)
  }

  stop() {
    cancelAnimationFrame(this.raf)
  }

  /** Bico da fonte e a bacia (px). */
  private get nozzle() {
    return { x: this.w / 2, y: this.h * 0.8 }
  }
  private get basinY() {
    return this.h * 0.93
  }

  private launch(now: number) {
    this.launched = true
    this.on.launch()
    const n = this.nozzle
    this.shots.forEach((s, i) => {
      const k = s.big ? CLUSTER + 8 : CLUSTER
      for (let j = 0; j < k; j++) {
        this.rays.push({
          shot: i,
          t0: now + i * 85 + j * 14 + Math.random() * 30,
          dur: 1050 + Math.random() * 160,
          p0x: n.x + (Math.random() - 0.5) * 8,
          p0y: n.y,
          // sobe alto (acima da caixa) e desce até a estrela
          c1x: this.w * (0.5 + (s.x - 0.5) * 0.35) + (Math.random() - 0.5) * this.w * 0.18,
          c1y: -this.h * (0.35 + Math.random() * 0.2),
          px: n.x,
          py: n.y,
          done: false,
        })
      }
    })
  }

  private frame(now: number) {
    const dt = Math.min(0.05, (now - this.last) / 1000)
    this.last = now
    const t = now - this.t0
    if (!this.launched && t >= LAUNCH_AT) this.launch(now)

    // água: mais forte no disparo
    const burst = this.launched && t < LAUNCH_AT + 900
    this.emitAcc += dt * (burst ? 320 : 110)
    const n = this.nozzle
    while (this.emitAcc >= 1 && this.drops.length < 320) {
      this.emitAcc -= 1
      const a = (Math.random() - 0.5) * (burst ? 0.9 : 0.55)
      const v = (burst ? 430 : 300) + Math.random() * 70
      this.drops.push({ x: n.x, y: n.y - 4, vx: Math.sin(a) * v, vy: -Math.cos(a) * v, life: 0 })
    }
    if (this.emitAcc > 1) this.emitAcc = 0
    const g = 640
    for (const d of this.drops) {
      d.vy += g * dt
      d.x += d.vx * dt
      d.y += d.vy * dt
      d.life += dt
    }
    this.drops = this.drops.filter((d) => d.y < this.basinY && d.life < 2.5)

    // feixes até as estrelas
    for (const r of this.rays) {
      if (r.done || now < r.t0) continue
      const u = Math.min(1, (now - r.t0) / r.dur)
      const e = easeInOut(u)
      const s = this.shots[r.shot]
      const p2x = s.x * this.w
      const p2y = s.y * this.h
      const q = 1 - e
      r.px = q * q * r.p0x + 2 * q * e * r.c1x + e * e * p2x
      r.py = q * q * r.p0y + 2 * q * e * r.c1y + e * e * p2y
      if (u >= 1) {
        r.done = true
        this.arrived[r.shot]++
        const need = Math.ceil((s.big ? CLUSTER + 8 : CLUSTER) * 0.7)
        if (this.arrived[r.shot] === need) {
          this.lit.push(r.shot)
          this.litAt[r.shot] = now
          this.on.star(r.shot)
          if (this.lit.length === this.shots.length && !this.allDone) {
            this.allDone = true
            this.on.all()
          }
        }
      }
    }
    this.draw(now, t)
  }

  private draw(now: number, t: number) {
    const c = this.ctx
    c.setTransform(this.dpr, 0, 0, this.dpr, 0, 0)
    c.clearRect(0, 0, this.w, this.h)
    c.globalCompositeOperation = "lighter"
    // céu: estrelinhas de fundo
    for (const b of this.bg) {
      const a = 0.18 + 0.22 * (0.5 + 0.5 * Math.sin(b.ph + (t / 1000) * b.sp))
      c.fillStyle = `rgba(190,215,255,${a})`
      c.beginPath()
      c.arc(b.x * this.w, b.y * this.h, b.r, 0, 6.283)
      c.fill()
    }

    // a fonte: bacia, coluna e taça
    c.globalCompositeOperation = "source-over"
    const n = this.nozzle
    const rx = Math.min(this.w * 0.26, 190)
    const by = this.basinY
    c.fillStyle = "#2b3140"
    c.beginPath()
    c.ellipse(n.x, by + 6, rx + 10, rx * 0.2 + 8, 0, 0, 6.283)
    c.fill()
    c.fillStyle = "#454c5c"
    c.beginPath()
    c.ellipse(n.x, by, rx, rx * 0.2, 0, 0, 6.283)
    c.fill()
    const water = c.createRadialGradient(n.x, by, 2, n.x, by, rx * 0.95)
    water.addColorStop(0, "rgba(140,225,255,0.95)")
    water.addColorStop(1, "rgba(40,120,220,0.55)")
    c.fillStyle = water
    c.beginPath()
    c.ellipse(n.x, by - 2, rx * 0.88, rx * 0.15, 0, 0, 6.283)
    c.fill()
    c.fillStyle = "#596173"
    c.fillRect(n.x - 9, n.y + 6, 18, by - n.y - 8)
    c.fillStyle = "#6b7387"
    c.beginPath()
    c.ellipse(n.x, n.y + 8, 34, 8, 0, 0, 6.283)
    c.fill()
    c.fillStyle = "#C69A37"
    c.fillRect(n.x - 30, n.y + 9, 60, 2)

    c.globalCompositeOperation = "lighter"
    // água
    for (const d of this.drops) {
      const a = Math.max(0, 0.85 - d.life * 0.35)
      c.fillStyle = `rgba(150,225,255,${a})`
      c.beginPath()
      c.arc(d.x, d.y, 1.9, 0, 6.283)
      c.fill()
    }
    // feixes: cabeça + rastro curto
    c.lineCap = "round"
    for (const r of this.rays) {
      if (r.done || now < r.t0) continue
      const col = this.shots[r.shot].color
      const u = Math.min(1, (now - r.t0) / r.dur)
      const back = easeInOut(Math.max(0, u - 0.06))
      const s = this.shots[r.shot]
      const q = 1 - back
      const tx = q * q * r.p0x + 2 * q * back * r.c1x + back * back * s.x * this.w
      const ty = q * q * r.p0y + 2 * q * back * r.c1y + back * back * s.y * this.h
      c.strokeStyle = col
      c.globalAlpha = 0.55
      c.lineWidth = 2
      c.beginPath()
      c.moveTo(tx, ty)
      c.lineTo(r.px, r.py)
      c.stroke()
      c.globalAlpha = 1
      c.fillStyle = "#ffffff"
      c.beginPath()
      c.arc(r.px, r.py, 1.8, 0, 6.283)
      c.fill()
    }
    // estrelas
    for (const i of this.lit) {
      const s = this.shots[i]
      const age = (now - this.litAt[i]) / 1000
      const x = s.x * this.w
      const y = s.y * this.h
      const grow = Math.min(1, age / 0.25)
      const R = (s.big ? 46 : 30) * grow * (1 + 0.08 * Math.sin(age * 6))
      const glow = c.createRadialGradient(x, y, 0, x, y, R)
      glow.addColorStop(0, "rgba(255,255,255,0.95)")
      glow.addColorStop(0.25, s.color)
      glow.addColorStop(1, "rgba(0,0,0,0)")
      c.fillStyle = glow
      c.beginPath()
      c.arc(x, y, R, 0, 6.283)
      c.fill()
      // brilho em cruz
      c.strokeStyle = s.color
      c.lineWidth = 1.5
      const L = R * 1.6
      c.beginPath()
      c.moveTo(x - L, y)
      c.lineTo(x + L, y)
      c.moveTo(x, y - L)
      c.lineTo(x, y + L)
      c.stroke()
      if (s.top) {
        c.lineWidth = 2
        c.beginPath()
        c.arc(x, y, R * 1.25 + age * 30, 0, 6.283)
        c.globalAlpha = Math.max(0, 1 - age * 0.8)
        c.stroke()
        c.globalAlpha = 1
      }
    }
    c.globalCompositeOperation = "source-over"
  }
}

/**
 * Onde cada estrela (e a carta) fica, 0–1 na caixa: 1 giro no meio; 10 giros em 2 fileiras de 5 — no celular em pé
 * (`tall`), fileiras de 4 (4-4-2), a última centralizada.
 */
export function skySlots(n: number, tall = false): { x: number; y: number }[] {
  if (n <= 1) return [{ x: 0.5, y: 0.34 }]
  const cols = Math.min(tall ? 4 : 5, n)
  const span = tall ? 0.88 : 0.8
  const rowY = (r: number) => (tall ? 0.14 + r * 0.19 : 0.2 + r * 0.3)
  return Array.from({ length: n }, (_, i) => {
    const r = Math.floor(i / cols)
    const inRow = Math.min(cols, n - r * cols)
    const c = i % cols
    const left = 0.5 - (inRow * span) / cols / 2
    return { x: left + (c + 0.5) * (span / cols), y: rowY(r) }
  })
}
