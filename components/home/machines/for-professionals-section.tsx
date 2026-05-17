"use client"

import Link from "next/link"
import { motion } from "framer-motion"
import { ArrowRight, Eye, MessageCircle, Folder, Percent } from "lucide-react"

const BENEFITS = [
  {
    icon: Eye,
    title: "Apareça por intenção",
    text: "Cidade, profissão e máquina — quem busca encontra você.",
  },
  {
    icon: MessageCircle,
    title: "Receba contatos diretos",
    text: "Sem intermediário. A conversa começa direto pelo WhatsApp.",
  },
  {
    icon: Folder,
    title: "Mostre portfólio",
    text: "Página própria com serviços, fotos e avaliações.",
  },
  {
    icon: Percent,
    title: "Sem comissão",
    text: "Você não paga nada por serviço fechado.",
  },
]

export function ForProfessionalsSection() {
  return (
    <section
      id="para-profissionais"
      className="relative overflow-hidden bg-machines-dark py-24 text-white md:py-32"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.05]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.4) 1px, transparent 1px)",
          backgroundSize: "72px 72px",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/2 h-[400px] w-[400px] -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{
          background: "radial-gradient(circle, rgba(230,184,0,0.18), transparent 65%)",
        }}
      />

      <div className="container relative z-10 mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.7 }}
          className="mx-auto max-w-3xl text-center"
        >
          <p className="mb-4 text-xs uppercase tracking-[0.3em] text-white/50">
            Para profissionais
          </p>
          <h2 className="text-balance text-3xl font-semibold tracking-tight md:text-5xl">
            Entre na vitrine{" "}
            <span className="bg-gradient-to-r from-primary via-amber-300 to-primary bg-clip-text text-transparent">
              das máquinas.
            </span>
          </h2>
          <p className="mt-4 text-pretty text-white/60 md:text-lg">
            Seja encontrado por pessoas que já sabem o que precisam.
          </p>
        </motion.div>

        <div className="mx-auto mt-14 grid max-w-5xl grid-cols-1 gap-4 md:grid-cols-2">
          {BENEFITS.map((b, i) => {
            const Icon = b.icon
            return (
              <motion.div
                key={b.title}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.5, delay: i * 0.08 }}
                className="flex items-start gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur transition hover:border-white/20"
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-primary/10">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="text-base font-semibold">{b.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-white/55">{b.text}</p>
                </div>
              </motion.div>
            )
          })}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mx-auto mt-12 flex max-w-3xl flex-col items-center gap-4 rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/[0.08] via-white/[0.03] to-transparent p-7 text-center backdrop-blur md:flex-row md:items-center md:justify-between md:text-left"
        >
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-primary/80">
              Plano anual
            </p>
            <p className="mt-1 text-2xl font-semibold md:text-3xl">
              R$ 300 <span className="text-sm font-normal text-white/50">/ ano por perfil</span>
            </p>
            <p className="mt-2 max-w-md text-sm text-white/55">
              A ativação aumenta sua exposição, mas não garante contratação.
            </p>
          </div>

          <Link
            href="/cadastro"
            data-cta="for-professionals"
            data-cta-action="ativar-perfil"
            className="group inline-flex items-center justify-center gap-2 rounded-full bg-primary px-7 py-3.5 text-sm font-semibold text-primary-foreground shadow-[0_0_0_1px_rgba(230,184,0,0.4),0_8px_40px_-8px_rgba(230,184,0,0.6)] transition hover:shadow-[0_0_0_1px_rgba(230,184,0,0.8),0_12px_60px_-8px_rgba(230,184,0,0.9)]"
          >
            Ativar meu perfil
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </motion.div>
      </div>
    </section>
  )
}
