"use client"

import { motion } from "framer-motion"
import { MessageCircle, ShieldCheck, User, TrendingUp } from "lucide-react"

const BLOCKS = [
  {
    icon: MessageCircle,
    title: "Contato direto",
    text: "Fale com o profissional sem barreiras desnecessárias.",
    color: "#34d399",
  },
  {
    icon: ShieldCheck,
    title: "Sem intermediação",
    text: "Mais rapidez para iniciar conversa e avançar.",
    color: "#a78bfa",
  },
  {
    icon: User,
    title: "Perfis ativos",
    text: "Profissionais presentes, visíveis e prontos para oportunidade.",
    color: "#38bdf8",
  },
  {
    icon: TrendingUp,
    title: "Reputação em evolução",
    text: "Elementos de atividade, destaque e avaliação ajudam na decisão.",
    color: "#fbbf24",
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
            Profissionais reais. Contato direto.{" "}
            <span className="bg-gradient-to-r from-primary via-amber-300 to-primary bg-clip-text text-transparent">
              Mais confiança.
            </span>
          </h2>
          <p className="mt-4 text-pretty text-white/60 md:text-lg">
            Uma experiência simples para encontrar, comparar e falar com quem pode resolver.
          </p>
        </motion.div>

        <div className="mx-auto mt-14 grid max-w-4xl grid-cols-1 gap-4 sm:grid-cols-2">
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
