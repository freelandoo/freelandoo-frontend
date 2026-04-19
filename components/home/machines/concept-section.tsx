"use client"

import { motion } from "framer-motion"
import {
  Play,
  Megaphone,
  Sparkles,
  HardHat,
  TrendingUp,
  Heart,
  PawPrint,
} from "lucide-react"
import { MACHINES, type MachineId } from "./tokens"

const ICONS: Record<MachineId, React.ComponentType<{ className?: string; style?: React.CSSProperties }>> = {
  views: Play,
  divulgacao: Megaphone,
  limpeza: Sparkles,
  construcao: HardHat,
  negocios: TrendingUp,
  oportunidades: Sparkles,
  saude_beleza: Heart,
  saude_pet: PawPrint,
}

export function ConceptSection() {
  const cards = MACHINES.filter((m) => m.id !== "oportunidades")

  return (
    <section className="relative overflow-hidden bg-[#05060a] py-24 text-white md:py-32">
      <div
        aria-hidden
        className="absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)",
          backgroundSize: "80px 80px",
        }}
      />

      <div className="container relative z-10 mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8 }}
          className="mx-auto max-w-3xl text-center"
        >
          <p className="mb-4 text-xs uppercase tracking-[0.3em] text-white/50">
            O conceito
          </p>
          <h2 className="text-balance text-3xl font-semibold tracking-tight md:text-5xl">
            Cada necessidade ativa uma{" "}
            <span className="bg-gradient-to-r from-primary via-amber-300 to-primary bg-clip-text text-transparent">
              máquina diferente
            </span>
            .
          </h2>
          <p className="mt-5 text-pretty text-white/60 md:text-lg">
            Escolha o objetivo. Ative a máquina. Encontre quem faz acontecer.
          </p>
        </motion.div>

        <div className="mt-16 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {cards.map((m, i) => {
            const Icon = ICONS[m.id]
            return (
              <motion.a
                key={m.id}
                href={`#machine-${m.id}`}
                initial={{ opacity: 0, y: 32 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 0.6, delay: i * 0.08 }}
                whileHover={{ y: -6 }}
                className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur transition"
              >
                <div
                  className="absolute -inset-px rounded-2xl opacity-0 transition-opacity duration-500 group-hover:opacity-100"
                  style={{
                    background: `radial-gradient(circle at var(--mx,50%) var(--my,50%), ${m.colors.glow}, transparent 60%)`,
                  }}
                />
                <div
                  className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 transition-opacity duration-500 group-hover:opacity-100"
                  style={{
                    boxShadow: `inset 0 0 0 1px ${m.colors.ring}`,
                  }}
                />

                <div
                  className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl border border-white/10"
                  style={{
                    background: `linear-gradient(135deg, ${m.colors.from}33, ${m.colors.to}22)`,
                  }}
                >
                  <Icon
                    className="h-6 w-6 transition-transform group-hover:scale-110"
                    style={{ color: m.colors.accent }}
                  />
                </div>

                <p className="text-xs uppercase tracking-[0.2em] text-white/40">
                  {m.label}
                </p>
                <h3 className="mt-1 text-lg font-semibold">{m.name}</h3>

                <ul className="mt-5 flex flex-wrap gap-1.5">
                  {m.keywords.map((kw, ki) => (
                    <motion.li
                      key={kw}
                      initial={{ opacity: 0.3 }}
                      whileHover={{ opacity: 1 }}
                      animate={{ opacity: [0.3, 0.7, 0.3] }}
                      transition={{
                        duration: 3,
                        delay: ki * 0.3,
                        repeat: Infinity,
                      }}
                      className="rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-[10px] uppercase tracking-wide text-white/60 transition group-hover:border-white/25 group-hover:text-white/90"
                    >
                      {kw}
                    </motion.li>
                  ))}
                </ul>
              </motion.a>
            )
          })}
        </div>
      </div>
    </section>
  )
}
