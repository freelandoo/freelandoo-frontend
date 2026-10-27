"use client"

// AS FORMAS DE DADO do Esportes (spec visual §d): "um número, uma forma, um
// contexto". Tudo SVG/HTML à mão (sem lib de gráfico), cantos retos, e cada
// peça anima uma vez ao entrar na tela — barras crescem (scaleY), arco varre
// e a agulha assenta, linha se desenha. Só transform/opacity + pathLength em
// SVG pequeno.

import { useRef } from "react"
import { motion, useReducedMotion } from "framer-motion"
import { DUR, EASE, SPRING, STAGGER, stepFor } from "./motion"
import { useInViewOnce } from "./motion-kit"
import { SP } from "./sp-tokens"

/* ─────────────── barras diárias com tampa, meta e hoje ─────────────── */

export function BarStrip({
  data,
  goal,
  color,
  goalLabel,
  fmt,
  locale,
  today,
}: {
  data: { date: string; value: number }[]
  goal: number
  color: string
  goalLabel: string
  fmt: (v: number) => string
  locale: string
  today: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInViewOnce(ref)
  const reduce = useReducedMotion()
  const max = Math.max(goal * 1.15, ...data.map((d) => d.value), 1)
  const goalPct = Math.min(100, (goal / max) * 100)
  const step = stepFor(data.length, STAGGER.bars)
  const letter = new Intl.DateTimeFormat(locale, { weekday: "narrow", timeZone: "UTC" })
  return (
    <div ref={ref}>
      <div className="relative h-36">
        <div className="absolute inset-x-0 z-10 border-t-2 border-dashed" style={{ bottom: `${goalPct}%`, borderColor: "rgba(255,241,230,.35)" }}>
          <span className="absolute -top-4 right-0 font-mono text-[10px] font-semibold" style={{ color: SP.mute }}>
            {goalLabel}
          </span>
        </div>
        <div className="flex h-full items-end gap-[3px]">
          {data.map((d, i) => {
            const h = d.value > 0 ? Math.max(3, (d.value / max) * 100) : 0
            const isToday = d.date === today
            const over = d.value > goal * 1.05
            return (
              <div
                key={d.date}
                title={`${new Date(`${d.date}T12:00:00Z`).toLocaleDateString(locale)} · ${fmt(d.value)}`}
                className="relative h-full flex-1"
              >
                {d.value === 0 ? (
                  <span className="absolute bottom-0 h-[2px] w-full" style={{ background: "rgba(244,165,116,.3)" }} />
                ) : (
                  <motion.div
                    className="absolute bottom-0 w-full origin-bottom"
                    style={{ height: `${h}%` }}
                    initial={reduce ? false : { scaleY: 0 }}
                    animate={inView || reduce ? { scaleY: 1 } : { scaleY: 0 }}
                    transition={{ duration: DUR.enter, ease: EASE.paper, delay: i * step }}
                  >
                    <span className="absolute inset-0" style={{ background: color, opacity: isToday ? 1 : 0.7 }} />
                    <span className="absolute inset-x-0 top-0 h-[3px]" style={{ background: over ? SP.bad : color }} />
                  </motion.div>
                )}
              </div>
            )
          })}
        </div>
      </div>
      <div className="mt-1 flex gap-[3px]">
        {data.map((d) => (
          <span
            key={d.date}
            className="flex-1 text-center font-mono text-[9px] font-bold"
            style={{ color: d.date === today ? SP.ink : SP.dim }}
          >
            {letter.format(new Date(`${d.date}T12:00:00Z`)).toUpperCase()}
          </span>
        ))}
      </div>
    </div>
  )
}

/* ──────────────────── arco semáforo 180° + agulha ──────────────────── */

const BMI_STOPS = [
  { to: 18.5, color: SP.water },
  { to: 25, color: SP.ok },
  { to: 30, color: SP.warn },
  { to: 35, color: "#FF8C2E" },
  { to: 40, color: SP.bad },
]
const BMI_MIN = 14
const BMI_MAX = 40

export function ArcGauge({ value, label }: { value: number | null; label: React.ReactNode }) {
  const ref = useRef<SVGSVGElement>(null)
  const inView = useInViewOnce(ref)
  const reduce = useReducedMotion()
  const W = 200
  const R = 80
  const cx = 100
  const cy = 96
  const ang = (v: number) => Math.PI * (1 - (Math.min(BMI_MAX, Math.max(BMI_MIN, v)) - BMI_MIN) / (BMI_MAX - BMI_MIN))
  const pt = (a: number, r: number) => [cx + Math.cos(a) * r, cy - Math.sin(a) * r]
  const segs = BMI_STOPS.map((s, i) => {
    const a0 = ang(i === 0 ? BMI_MIN : BMI_STOPS[i - 1].to) - 0.012
    const a1 = ang(s.to) + 0.012
    const [x0, y0] = pt(a0, R)
    const [x1, y1] = pt(a1, R)
    return { d: `M${x0} ${y0} A${R} ${R} 0 0 1 ${x1} ${y1}`, color: s.color }
  })
  const needle = value == null ? -90 : 90 - (ang(value) * 180) / Math.PI
  return (
    <div className="relative">
      <svg ref={ref} viewBox={`0 0 ${W} 112`} className="w-full" aria-hidden>
        {segs.map((s, i) => (
          <path key={i} d={s.d} stroke={s.color} strokeWidth={14} fill="none" strokeLinecap="butt" opacity={0.9} />
        ))}
        {value != null && (
          <motion.g
            style={{ originX: `${cx}px`, originY: `${cy}px` }}
            initial={reduce ? { rotate: needle } : { rotate: -90 }}
            animate={{ rotate: inView || reduce ? needle : -90 }}
            transition={reduce ? { duration: 0 } : { ...SPRING.stamp, delay: 0.15 }}
          >
            {/* agulha só no anel de fora: o número fica no centro do arco */}
            <rect x={cx - 2} y={cy - R + 4} width={4} height={R - 48} fill={SP.ink} />
          </motion.g>
        )}
      </svg>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 text-center">{label}</div>
      <div className="mt-1 flex justify-between font-mono text-[9px]" style={{ color: SP.dim }}>
        {[18.5, 25, 30, 35].map((v) => (
          <span key={v}>{String(v).replace(".", ",")}</span>
        ))}
      </div>
    </div>
  )
}

/* ───────────────────── linha com área (peso) ───────────────────── */

export function AreaLine({
  series,
  locale,
  color = SP.glow,
}: {
  series: { date: string; weight_kg: number }[]
  locale: string
  color?: string
}) {
  const ref = useRef<SVGSVGElement>(null)
  const inView = useInViewOnce(ref)
  const reduce = useReducedMotion()
  const pts = series
  const min = Math.min(...pts.map((p) => p.weight_kg))
  const max = Math.max(...pts.map((p) => p.weight_kg))
  const pad = Math.max(0.5, (max - min) * 0.18)
  const lo = min - pad
  const hi = max + pad
  const x = (i: number) => (pts.length === 1 ? 50 : (i / (pts.length - 1)) * 100)
  const y = (v: number) => 100 - ((v - lo) / (hi - lo)) * 100
  const line = pts.map((p, i) => `${i ? "L" : "M"}${x(i)} ${y(p.weight_kg)}`).join(" ")
  const area = `${line} L100 100 L0 100 Z`
  const last = pts[pts.length - 1]
  const gid = `al-${pts.length}-${Math.round(min * 10)}`
  return (
    <div className="relative h-40 w-full pr-16">
      <div className="relative h-full w-full">
        <svg ref={ref} viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full overflow-visible" aria-hidden>
          <defs>
            <linearGradient id={gid} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" stopColor={color} stopOpacity={0.28} />
              <stop offset="1" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <motion.path
            d={area}
            fill={`url(#${gid})`}
            initial={reduce ? false : { opacity: 0 }}
            animate={{ opacity: inView || reduce ? 1 : 0 }}
            transition={{ duration: DUR.draw, delay: 0.3 }}
          />
          <motion.path
            d={line}
            fill="none"
            stroke={color}
            strokeWidth={2.5}
            vectorEffect="non-scaling-stroke"
            initial={reduce ? false : { pathLength: 0 }}
            animate={{ pathLength: inView || reduce ? 1 : 0 }}
            transition={{ duration: DUR.draw, ease: EASE.ink }}
          />
        </svg>
        {pts.map((p, i) => (
          <motion.span
            key={`${p.date}-${i}`}
            title={`${new Date(p.date).toLocaleDateString(locale)} · ${p.weight_kg.toFixed(1)} kg`}
            className="absolute h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 border-2"
            style={{ left: `${x(i)}%`, top: `${y(p.weight_kg)}%`, background: color, borderColor: SP.panel }}
            initial={reduce ? false : { opacity: 0, scale: 0 }}
            animate={inView || reduce ? { opacity: 1, scale: 1 } : undefined}
            transition={{ delay: (i / Math.max(1, pts.length - 1)) * DUR.draw, duration: DUR.base }}
          />
        ))}
        <span
          className="fl-display absolute -translate-y-1/2 whitespace-nowrap pl-3 text-lg leading-none text-[#FFF1E6]"
          style={{ left: `${x(pts.length - 1)}%`, top: `${y(last.weight_kg)}%` }}
        >
          {last.weight_kg.toFixed(1).replace(".", ",")} kg
        </span>
      </div>
      <span className="absolute left-0 top-0 font-mono text-[9px]" style={{ color: SP.dim }}>
        {hi.toFixed(1).replace(".", ",")}
      </span>
      <span className="absolute bottom-0 left-0 font-mono text-[9px]" style={{ color: SP.dim }}>
        {lo.toFixed(1).replace(".", ",")}
      </span>
    </div>
  )
}

/* ─────────────── bullet: régua com faixa de referência ─────────────── */

export function BulletMeter({
  value,
  min = 0,
  max,
  band,
  color = SP.glow,
  ticks,
}: {
  value: number | null
  min?: number
  max: number
  band: [number, number]
  color?: string
  ticks: number[]
}) {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInViewOnce(ref)
  const reduce = useReducedMotion()
  const pct = (v: number) => ((Math.min(max, Math.max(min, v)) - min) / (max - min)) * 100
  return (
    <div ref={ref}>
      <div className="relative h-6 border-2 border-[#0B0B0D]" style={{ background: SP.inner }}>
        <span className="absolute inset-y-0" style={{ left: `${pct(band[0])}%`, width: `${pct(band[1]) - pct(band[0])}%`, background: "rgba(34,197,94,.22)" }} />
        {value != null && (
          <>
            <motion.span
              className="absolute inset-y-[5px] left-0 origin-left"
              style={{ width: `${pct(value)}%`, background: color }}
              initial={reduce ? false : { scaleX: 0 }}
              animate={{ scaleX: inView || reduce ? 1 : 0 }}
              transition={{ duration: DUR.draw, ease: EASE.paper }}
            />
            <span className="absolute -inset-y-1 w-[3px]" style={{ left: `calc(${pct(value)}% - 1px)`, background: SP.ink }} />
          </>
        )}
      </div>
      <div className="relative mt-1 h-3 font-mono text-[9px]" style={{ color: SP.dim }}>
        {ticks.map((v) => (
          <span key={v} className="absolute -translate-x-1/2" style={{ left: `${pct(v)}%` }}>
            {String(v).replace(".", ",")}
          </span>
        ))}
      </div>
    </div>
  )
}

/* ────────────────── barra 100% empilhada com rótulos ────────────────── */

export function StackBar({ parts }: { parts: { pct: number; color: string; label: string; sub: string }[] }) {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInViewOnce(ref)
  const reduce = useReducedMotion()
  return (
    <div ref={ref}>
      <div className="flex h-10 gap-[2px] border-2 border-[#0B0B0D]" style={{ background: SP.black }}>
        {parts.map((p, i) => (
          <motion.div
            key={p.label}
            className="relative grid origin-left place-items-center overflow-hidden"
            style={{ width: `${p.pct}%`, background: p.color }}
            initial={reduce ? false : { scaleX: 0 }}
            animate={{ scaleX: inView || reduce ? 1 : 0 }}
            transition={{ duration: DUR.enter, ease: EASE.paper, delay: i * 0.08 }}
          >
            {p.pct >= 12 && <span className="fl-display text-lg leading-none text-[#0B0B0D]">{p.pct}%</span>}
          </motion.div>
        ))}
      </div>
      <div className="mt-2 grid gap-1" style={{ gridTemplateColumns: `repeat(${parts.length}, minmax(0,1fr))` }}>
        {parts.map((p) => (
          <div key={p.label} className="min-w-0">
            <p className="flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-[0.1em]" style={{ color: p.color }}>
              <span className="h-2 w-2 shrink-0" style={{ background: p.color }} />
              <span className="truncate">{p.label}</span>
            </p>
            <p className="font-mono text-[11px]" style={{ color: SP.mute }}>
              {p.sub}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ─────────────────────── waffle de dias e pips ─────────────────────── */

export function Waffle({ days, today }: { days: { date: string; on: boolean }[]; today: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInViewOnce(ref)
  const reduce = useReducedMotion()
  const step = stepFor(days.length, 0.03, 0.5)
  return (
    <div ref={ref} className="flex flex-wrap gap-1">
      {days.map((d, i) => (
        <motion.span
          key={d.date}
          title={d.date}
          className="h-3.5 w-3.5 border"
          style={{
            background: d.on ? SP.ember : "transparent",
            borderColor: d.date === today ? SP.hot : d.on ? SP.ember : "rgba(244,165,116,.35)",
            boxShadow: d.on ? "0 0 8px rgba(255,140,43,.45)" : undefined,
          }}
          initial={reduce ? false : { opacity: 0, scale: 0.4 }}
          animate={inView || reduce ? { opacity: 1, scale: 1 } : undefined}
          transition={{ duration: DUR.base, ease: EASE.paper, delay: i * step }}
        />
      ))}
    </div>
  )
}

export function Pips({ on, total = 7, color = SP.room.workout }: { on: number; total?: number; color?: string }) {
  return (
    <div className="flex gap-1">
      {Array.from({ length: total }, (_, i) => (
        <span key={i} className="h-5 flex-1 border-2 border-[#0B0B0D]" style={{ background: i < on ? color : SP.inner, maxWidth: 28 }} />
      ))}
    </div>
  )
}
