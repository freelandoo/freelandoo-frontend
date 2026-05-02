"use client"

import { motion } from "framer-motion"
import { MessageCircle, Layers, MapPin, Star, Percent } from "lucide-react"

const BLOCKS = [
  {
    icon: MessageCircle,
    title: "Contato direto",
    text: "Você conversa, combina e negocia direto com o profissional.",
    color: "#34d399",
  },
  {
    icon: Layers,
    title: "Perfis por intenção",
    text: "Profissionais organizados pela máquina certa para o seu problema.",
    color: "#a78bfa",
  },
  {
    icon: MapPin,
    title: "Filtros por cidade e profissão",
    text: "Mais clareza para comparar quem está perto de você.",
    color: "#38bdf8",
  },
  {
    icon: Star,
    title: "Avaliações e ranking",
    text: "Reputação em evolução para decidir com mais confiança.",
    color: "#fbbf24",
  },
  {
    icon: Percent,
    title: "Sem comissão",
    text: "Você não paga nada por serviço fechado na plataforma.",
    color: "#fb7185",
  },
]

export function TrustSection() {
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
            Confiança
          </p>
          <h2 className="text-balance text-3xl font-semibold tracking-tight md:text-5xl">
            Sem intermediários.{" "}
            <span className="bg-gradient-to-r from-primary via-amber-300 to-primary bg-clip-text text-transparent">
              Com mais controle.
            </span>
          </h2>
          <p className="mt-4 text-pretty text-white/60 md:text-lg">
            A Freelandoo organiza a descoberta, mas não trava sua negociação.
          </p>
        </motion.div>

        <div className="mx-auto mt-14 grid max-w-5xl grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {BLOCKS.map((block, i) => {
            const Icon = block.icon
            return (
              <motion.div
                key={block.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="group rounded-2xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur transition hover:border-white/20"
                style={{
                  boxShadow: `0 0 0 0 transparent`,
                }}
                onMouseEnter={(e) => {
                  ;(e.currentTarget as HTMLElement).style.boxShadow = `0 0 40px -12px ${block.color}44`
                }}
                onMouseLeave={(e) => {
                  ;(e.currentTarget as HTMLElement).style.boxShadow = `0 0 0 0 transparent`
                }}
              >
                <div
                  className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-white/10"
                  style={{
                    background: `${block.color}15`,
                  }}
                >
                  <Icon className="h-6 w-6" style={{ color: block.color }} />
                </div>
                <h3 className="text-lg font-semibold">{block.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-white/50">{block.text}</p>
              </motion.div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
