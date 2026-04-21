"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { AnimatePresence, motion } from "framer-motion"
import { ArrowRight, Zap } from "lucide-react"
import type { MachineTheme } from "./tokens"
import { MachineInput } from "./machine-input"
import { SearchState } from "./search-state"
import { GlowBackground } from "./glow-background"
import { FloatingParticles } from "./floating-particles"

type Phase = "idle" | "processing"

export function MachinePanel({
  machine,
  isActive = true,
}: {
  machine: MachineTheme
  isActive?: boolean
}) {
  const router = useRouter()
  const [phase, setPhase] = useState<Phase>("idle")
  const [inputValue, setInputValue] = useState("")

  const handleActivate = () => {
    if (phase !== "idle") return
    if (machine.id === "oportunidades") return
    setPhase("processing")
  }

  const handleComplete = useCallback(() => {
    const q = inputValue.trim()
    const params = new URLSearchParams()
    params.set("from", `maquina-${machine.id}`)
    if (q) params.set("q", q)
    router.push(`/search?${params.toString()}`)
  }, [inputValue, machine.id, router])

  const isOpportunities = machine.id === "oportunidades"

  return (
    <div
      id={`machine-${machine.id}`}
      data-active={isActive ? "true" : "false"}
      className="relative flex h-full min-h-[100svh] w-full items-center overflow-hidden bg-machines-dark transition-all duration-700 data-[active=false]:scale-[0.985] data-[active=false]:opacity-60"
    >
      <GlowBackground
        glow={machine.colors.glow}
        from={machine.colors.from}
        to={machine.colors.to}
        intensity="medium"
      />
      <FloatingParticles count={20} color={`${machine.colors.accent}88`} speed={0.6} />

      <div className="container relative z-10 mx-auto grid w-full grid-cols-1 gap-8 px-4 py-16 lg:grid-cols-2 lg:gap-12 lg:py-0">
        {/* Left side */}
        <div className="flex flex-col justify-center">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <span
              className="inline-flex items-center gap-2.5 rounded-full border border-white/15 bg-white/5 px-5 py-2 text-base font-bold uppercase tracking-[0.18em] backdrop-blur md:text-lg"
              style={{ color: machine.colors.text }}
            >
              <Zap className="h-5 w-5 md:h-6 md:w-6" style={{ color: machine.colors.accent }} />
              {machine.label} — {machine.name}
            </span>
          </motion.div>

          <h2 className="mt-6 text-balance text-3xl font-semibold leading-[1.08] tracking-tight text-white sm:text-4xl md:text-5xl">
            {machine.headline}
          </h2>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, delay: 0.5 }}
            className="mt-3 max-w-md text-pretty text-[11px] text-white/40 md:text-xs"
          >
            {machine.subheadline}
          </motion.p>

          {isOpportunities ? (
            <OpportunitiesPanel machine={machine} />
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7, delay: 0.3 }}
              className="mt-8 space-y-4"
            >
              <AnimatePresence mode="wait">
                {phase === "idle" && (
                  <motion.div
                    key="idle"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="space-y-4"
                  >
                    <MachineInput
                      machine={machine}
                      value={inputValue}
                      onChange={setInputValue}
                    />
                    <button
                      onClick={handleActivate}
                      className="group relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-2xl px-6 py-4 text-sm font-semibold text-white transition"
                      style={{
                        background: `linear-gradient(135deg, ${machine.colors.from}, ${machine.colors.to})`,
                        boxShadow: `0 0 0 1px ${machine.colors.ring}, 0 8px 32px -8px ${machine.colors.glow}`,
                      }}
                    >
                      <span className="relative z-10">{machine.ctaLabel}</span>
                      <ArrowRight className="relative z-10 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                      <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/30 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
                    </button>
                  </motion.div>
                )}

                {phase === "processing" && (
                  <motion.div
                    key="processing"
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -12 }}
                  >
                    <SearchState
                      machine={machine}
                      onComplete={handleComplete}
                    />
                  </motion.div>
                )}

              </AnimatePresence>
            </motion.div>
          )}
        </div>

        {/* Right side */}
        <div className="flex items-center justify-center">
          <AnimatePresence mode="wait">
            {phase === "idle" && !isOpportunities && (
              <motion.div
                key="visual-idle"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.6 }}
                className="flex w-full max-w-md flex-col items-center justify-center"
              >
                <IdleVisual machine={machine} />
              </motion.div>
            )}

            {phase === "processing" && (
              <motion.div
                key="visual-processing"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex w-full max-w-md items-center justify-center"
              >
                <ProcessingVisual machine={machine} />
              </motion.div>
            )}

            {isOpportunities && (
              <motion.div
                key="visual-opp"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="w-full max-w-md"
              >
                <OpportunitiesVisual machine={machine} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}

/* ── Idle visual: stylized orbiting elements ── */
function IdleVisual({ machine }: { machine: MachineTheme }) {
  return (
    <div className="relative flex h-64 w-64 items-center justify-center md:h-80 md:w-80">
      {/* Central glow */}
      <div
        className="absolute h-32 w-32 rounded-full blur-2xl animate-pulse-glow"
        style={{ background: machine.colors.glow }}
      />
      {/* Ring */}
      <motion.div
        className="absolute h-48 w-48 rounded-full border md:h-60 md:w-60"
        style={{ borderColor: `${machine.colors.accent}33` }}
        animate={{ rotate: 360 }}
        transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
      />
      <motion.div
        className="absolute h-64 w-64 rounded-full border md:h-80 md:w-80"
        style={{ borderColor: `${machine.colors.accent}1a` }}
        animate={{ rotate: -360 }}
        transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
      />
      {/* Dots on orbit */}
      {[0, 90, 180, 270].map((deg) => (
        <motion.div
          key={deg}
          className="absolute h-2.5 w-2.5 rounded-full"
          style={{
            background: machine.colors.accent,
            boxShadow: `0 0 12px ${machine.colors.accent}`,
            top: "50%",
            left: "50%",
            transform: `rotate(${deg}deg) translateX(120px) translateY(-50%)`,
          }}
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 2, delay: deg / 360, repeat: Infinity }}
        />
      ))}
      {/* Center icon */}
      <div
        className="relative flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10"
        style={{
          background: `linear-gradient(135deg, ${machine.colors.from}44, ${machine.colors.to}22)`,
        }}
      >
        <Zap className="h-7 w-7" style={{ color: machine.colors.accent }} />
      </div>
    </div>
  )
}

/* ── Processing visual ── */
function ProcessingVisual({ machine }: { machine: MachineTheme }) {
  return (
    <div className="relative flex h-64 w-full items-center justify-center md:h-80">
      <motion.div
        className="absolute h-40 w-40 rounded-full blur-3xl"
        style={{ background: machine.colors.glow }}
        animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0.9, 0.5] }}
        transition={{ duration: 2, repeat: Infinity }}
      />
      {/* Expanding rings */}
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="absolute rounded-full border"
          style={{ borderColor: `${machine.colors.accent}44` }}
          initial={{ width: 60, height: 60, opacity: 1 }}
          animate={{ width: 300, height: 300, opacity: 0 }}
          transition={{
            duration: 2.5,
            delay: i * 0.8,
            repeat: Infinity,
            ease: "easeOut",
          }}
        />
      ))}
      {/* Counter */}
      <motion.div
        className="relative z-10 flex flex-col items-center"
        animate={{ scale: [1, 1.05, 1] }}
        transition={{ duration: 1.5, repeat: Infinity }}
      >
        <span className="font-mono text-4xl font-bold" style={{ color: machine.colors.accent }}>
          <CountUp />
        </span>
        <span className="mt-1 text-[10px] uppercase tracking-[0.3em] text-white/50">
          processando
        </span>
      </motion.div>
    </div>
  )
}

/* ── Counter ── */
function CountUp() {
  const [val, setVal] = useState(0)
  useEffect(() => {
    let v = 0
    const t = setInterval(() => {
      v += Math.floor(Math.random() * 12) + 1
      if (v > 999) v = 999
      setVal(v)
    }, 80)
    return () => clearInterval(t)
  }, [])
  return <>{val.toString().padStart(3, "0")}</>
}

/* ── Opportunities Panel (no input, split layout) ── */
function OpportunitiesPanel({ machine }: { machine: MachineTheme }) {
  const sides = [
    {
      title: "Para quem busca",
      items: ["Encontre profissionais", "Filtre com rapidez", "Fale direto", "Resolva sem intermediação"],
    },
    {
      title: "Para quem oferece",
      items: ["Apareça em destaque", "Aumente visibilidade", "Receba oportunidades", "Faça parte da vitrine"],
    },
  ]

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.7, delay: 0.3 }}
      className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2"
    >
      {sides.map((side, si) => (
        <div
          key={side.title}
          className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur"
        >
          <h3
            className="mb-3 text-sm font-semibold uppercase tracking-wider"
            style={{ color: machine.colors.accent }}
          >
            {side.title}
          </h3>
          <ul className="space-y-2">
            {side.items.map((item, ii) => (
              <motion.li
                key={item}
                initial={{ opacity: 0, x: si === 0 ? -12 : 12 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.4 + ii * 0.1 }}
                className="flex items-center gap-2 text-sm text-white/70"
              >
                <span
                  className="h-1.5 w-1.5 shrink-0 rounded-full"
                  style={{ background: machine.colors.accent }}
                />
                {item}
              </motion.li>
            ))}
          </ul>
        </div>
      ))}
    </motion.div>
  )
}

/* ── Opportunities visual ── */
function OpportunitiesVisual({ machine }: { machine: MachineTheme }) {
  return (
    <div className="relative flex h-64 items-center justify-center md:h-80">
      <div
        className="absolute h-40 w-40 rounded-full blur-3xl animate-pulse-glow"
        style={{ background: machine.colors.glow }}
      />
      {/* Two arrows converging */}
      <motion.div
        className="absolute left-[10%] top-1/2 h-px w-[30%]"
        style={{ background: `linear-gradient(90deg, transparent, ${machine.colors.accent})` }}
        animate={{ opacity: [0.3, 1, 0.3] }}
        transition={{ duration: 2, repeat: Infinity }}
      />
      <motion.div
        className="absolute right-[10%] top-1/2 h-px w-[30%]"
        style={{ background: `linear-gradient(270deg, transparent, ${machine.colors.accent})` }}
        animate={{ opacity: [0.3, 1, 0.3] }}
        transition={{ duration: 2, delay: 0.5, repeat: Infinity }}
      />
      <div
        className="relative z-10 flex h-20 w-20 items-center justify-center rounded-full border-2"
        style={{
          borderColor: machine.colors.accent,
          boxShadow: `0 0 40px ${machine.colors.glow}`,
          background: `radial-gradient(circle, ${machine.colors.from}44, transparent)`,
        }}
      >
        <Zap className="h-8 w-8" style={{ color: machine.colors.accent }} />
      </div>
    </div>
  )
}
