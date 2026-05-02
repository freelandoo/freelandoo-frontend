"use client"

import Link from "next/link"
import { motion } from "framer-motion"
import { ArrowRight, Search, Briefcase, Share2 } from "lucide-react"

type Card = {
  id: string
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>
  title: string
  text: string
  cta: string
  href: string
  ctaAction: string
  accent: string
  ring: string
  glow: string
}

const CARDS: Card[] = [
  {
    id: "contratar",
    icon: Search,
    title: "Quero contratar",
    text: "Escolha uma máquina e encontre profissionais para resolver seu problema.",
    cta: "Encontrar profissional",
    href: "/search",
    ctaAction: "segment-contratar",
    accent: "#f2c409",
    ring: "rgba(242,196,9,0.45)",
    glow: "rgba(242,196,9,0.35)",
  },
  {
    id: "oferecer",
    icon: Briefcase,
    title: "Quero oferecer serviços",
    text: "Crie seu perfil, apareça nas máquinas e receba contatos diretos.",
    cta: "Anunciar serviços",
    href: "/cadastro",
    ctaAction: "segment-anunciar",
    accent: "#a78bfa",
    ring: "rgba(167,139,250,0.45)",
    glow: "rgba(167,139,250,0.35)",
  },
  {
    id: "indicar",
    icon: Share2,
    title: "Quero ganhar indicando",
    text: "Use cupons e indique pessoas para gerar renda extra.",
    cta: "Virar afiliado",
    href: "/cadastro?intent=afiliado",
    ctaAction: "segment-afiliado",
    accent: "#34d399",
    ring: "rgba(52,211,153,0.45)",
    glow: "rgba(52,211,153,0.35)",
  },
]

export function SegmentationCards() {
  return (
    <section
      aria-label="Para quem é a Freelandoo"
      className="relative bg-machines-dark py-14 text-white md:py-20"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-white/10 to-transparent"
      />

      <div className="container relative z-10 mx-auto px-4">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-[10px] uppercase tracking-[0.3em] text-white/40 md:text-xs">
            Por onde você quer começar
          </p>
          <h2 className="mt-3 text-balance text-2xl font-semibold tracking-tight md:text-3xl lg:text-4xl">
            Três caminhos.{" "}
            <span className="bg-gradient-to-r from-primary via-amber-300 to-primary bg-clip-text text-transparent">
              Um só lugar.
            </span>
          </h2>
        </div>

        <div className="mx-auto mt-10 grid max-w-5xl grid-cols-1 gap-4 md:mt-12 md:grid-cols-3 md:gap-5">
          {CARDS.map((card, i) => {
            const Icon = card.icon
            return (
              <motion.div
                key={card.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.5, delay: i * 0.08 }}
                className="group relative flex flex-col rounded-2xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur transition hover:border-white/20 md:p-7"
                onMouseEnter={(e) => {
                  ;(e.currentTarget as HTMLElement).style.boxShadow = `0 0 50px -16px ${card.glow}`
                }}
                onMouseLeave={(e) => {
                  ;(e.currentTarget as HTMLElement).style.boxShadow = `0 0 0 0 transparent`
                }}
              >
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 transition-opacity duration-500 group-hover:opacity-100"
                  style={{ boxShadow: `inset 0 0 0 1px ${card.ring}` }}
                />

                <div
                  className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl border border-white/10"
                  style={{ background: `${card.accent}18` }}
                >
                  <Icon className="h-5 w-5" style={{ color: card.accent }} />
                </div>

                <h3 className="text-lg font-semibold md:text-xl">{card.title}</h3>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-white/55">
                  {card.text}
                </p>

                <Link
                  href={card.href}
                  data-cta="segmentation"
                  data-cta-action={card.ctaAction}
                  className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold transition group-hover:gap-2.5"
                  style={{ color: card.accent }}
                >
                  {card.cta}
                  <ArrowRight className="h-4 w-4 transition-transform" />
                </Link>
              </motion.div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
