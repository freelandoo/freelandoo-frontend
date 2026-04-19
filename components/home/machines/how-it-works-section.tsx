"use client"

import { motion } from "framer-motion"
import { Zap, MessageSquareText, Handshake } from "lucide-react"

const STEPS = [
  {
    icon: Zap,
    title: "Escolha uma máquina",
    description: "Selecione a área que resolve o seu problema.",
    color: "#f2c409",
  },
  {
    icon: MessageSquareText,
    title: "Diga o que você quer",
    description: "A plataforma interpreta sua intenção e ativa a busca.",
    color: "#a78bfa",
  },
  {
    icon: Handshake,
    title: "Fale direto com quem resolve",
    description: "Sem intermediação, sem excesso de etapas, sem perder tempo.",
    color: "#34d399",
  },
]

export function HowItWorksSection() {
  return (
    <section className="relative overflow-hidden bg-machines-dark py-24 text-white md:py-32">
      <div className="container relative z-10 mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.8 }}
          className="mx-auto max-w-3xl text-center"
        >
          <p className="mb-4 text-xs uppercase tracking-[0.3em] text-white/50">
            Como funciona
          </p>
          <h2 className="text-balance text-3xl font-semibold tracking-tight md:text-5xl">
            Simples. Direto.{" "}
            <span className="bg-gradient-to-r from-primary via-amber-300 to-primary bg-clip-text text-transparent">
              Sem enrolação.
            </span>
          </h2>
        </motion.div>

        <div className="relative mx-auto mt-16 grid max-w-4xl grid-cols-1 gap-6 md:grid-cols-3 md:gap-4">
          {/* Connecting line (desktop only) */}
          <div
            aria-hidden
            className="absolute left-[16.67%] right-[16.67%] top-[44px] hidden h-px md:block"
            style={{
              background: "linear-gradient(90deg, rgba(255,255,255,0.05), rgba(255,255,255,0.15), rgba(255,255,255,0.05))",
            }}
          />

          {STEPS.map((step, i) => {
            const Icon = step.icon
            return (
              <motion.div
                key={step.title}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.6, delay: i * 0.15 }}
                className="flex flex-col items-center text-center"
              >
                <div className="relative">
                  <div
                    className="flex h-20 w-20 items-center justify-center rounded-2xl border border-white/10"
                    style={{
                      background: `linear-gradient(135deg, ${step.color}22, transparent)`,
                      boxShadow: `0 0 40px -12px ${step.color}66`,
                    }}
                  >
                    <Icon className="h-8 w-8" style={{ color: step.color }} />
                  </div>
                  <span
                    className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold"
                    style={{
                      background: step.color,
                      color: "#0a0a0a",
                    }}
                  >
                    {i + 1}
                  </span>
                </div>
                <h3 className="mt-6 text-lg font-semibold">{step.title}</h3>
                <p className="mt-2 max-w-xs text-sm text-white/50">{step.description}</p>
              </motion.div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
