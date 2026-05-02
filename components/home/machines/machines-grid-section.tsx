"use client"

import { useRef } from "react"
import Link from "next/link"
import { motion, useReducedMotion } from "framer-motion"
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Play,
  Megaphone,
  Sparkles,
  HardHat,
  TrendingUp,
  Heart,
  PawPrint,
  Briefcase,
} from "lucide-react"
import { MACHINES, type MachineId, type MachineTheme } from "./tokens"

const ICONS: Record<MachineId, React.ComponentType<{ className?: string; style?: React.CSSProperties }>> = {
  views: Play,
  divulgacao: Megaphone,
  limpeza: Sparkles,
  construcao: HardHat,
  negocios: TrendingUp,
  oportunidades: Briefcase,
  saude_beleza: Heart,
  saude_pet: PawPrint,
}

const DESCRIPTIONS: Record<MachineId, string> = {
  views: "Conteúdo, edição, roteiros e crescimento digital.",
  divulgacao: "Creators, influenciadores e campanhas que geram alcance.",
  limpeza: "Faxina, organização e serviços de apoio.",
  construcao: "Obras, reformas, instalações e acabamentos.",
  negocios: "Marketing, design, vendas e suporte para empresas.",
  oportunidades: "Renda extra, bicos, parcerias e novas oportunidades.",
  saude_beleza: "Estética, cuidados pessoais e bem-estar.",
  saude_pet: "Banho, tosa, passeio e cuidados para pets.",
}

const ORDER: MachineId[] = [
  "views",
  "divulgacao",
  "limpeza",
  "construcao",
  "negocios",
  "oportunidades",
  "saude_beleza",
  "saude_pet",
]

function MachineCard({ machine, index }: { machine: MachineTheme; index: number }) {
  const Icon = ICONS[machine.id]
  const description = DESCRIPTIONS[machine.id]
  const reduceMotion = useReducedMotion()

  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, y: 18 }}
      whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.45, delay: Math.min(index * 0.05, 0.3), ease: "easeOut" }}
      className="shrink-0 snap-start"
    >
      <Link
        href={`/search?machine=${machine.id}`}
        data-cta="machine-grid"
        data-cta-action={`ativar-${machine.id}`}
        className="group relative flex h-[260px] w-[180px] flex-col items-center overflow-hidden rounded-3xl border border-white/10 bg-[#0b0d14] p-5 text-center transition-all duration-300 hover:-translate-y-1 sm:h-[280px] sm:w-[200px] sm:p-6"
        style={{
          boxShadow: "0 0 0 0 transparent",
        }}
        onMouseEnter={(e) => {
          ;(e.currentTarget as HTMLElement).style.boxShadow = `0 0 50px -16px ${machine.colors.glow}, inset 0 0 0 1px ${machine.colors.ring}`
        }}
        onMouseLeave={(e) => {
          ;(e.currentTarget as HTMLElement).style.boxShadow = `0 0 0 0 transparent`
        }}
      >
        {/* Background tint */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-60"
          style={{
            background: `radial-gradient(ellipse at 50% 0%, ${machine.colors.from}1f, transparent 65%)`,
          }}
        />
        {/* Hover glow */}
        <div
          aria-hidden
          className="pointer-events-none absolute -top-12 left-1/2 h-32 w-32 -translate-x-1/2 rounded-full opacity-50 blur-2xl transition-opacity duration-500 group-hover:opacity-90"
          style={{ background: machine.colors.glow }}
        />

        {/* Icon */}
        <div
          className="relative flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 transition-transform duration-300 group-hover:scale-[1.06]"
          style={{
            background: `linear-gradient(135deg, ${machine.colors.from}40, ${machine.colors.to}1f)`,
            boxShadow: `0 0 24px -6px ${machine.colors.glow}`,
          }}
        >
          <Icon className="h-7 w-7" style={{ color: machine.colors.accent }} />
        </div>

        {/* Title */}
        <h3 className="relative mt-4 text-sm font-semibold leading-tight text-white sm:text-[15px]">
          {machine.name}
        </h3>

        {/* Description */}
        <p className="relative mt-1.5 line-clamp-3 text-[11px] leading-snug text-white/55 sm:text-xs">
          {description}
        </p>

        {/* CTA — premium pill, sticky to bottom */}
        <div className="relative mt-auto pt-4">
          <span
            className="relative inline-flex items-center gap-1.5 overflow-hidden rounded-full px-4 py-1.5 text-[11px] font-semibold uppercase tracking-wider transition-all duration-300 group-hover:gap-2 sm:text-xs"
            style={{
              background: `linear-gradient(135deg, ${machine.colors.from}, ${machine.colors.to})`,
              color: "#fff",
              boxShadow: `0 0 0 1px ${machine.colors.ring}, 0 6px 22px -6px ${machine.colors.glow}`,
            }}
          >
            <span className="relative z-10">Ativar</span>
            <ArrowRight className="relative z-10 h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-0.5" />
            {/* Sheen */}
            <span
              aria-hidden
              className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/40 to-transparent transition-transform duration-700 group-hover:translate-x-full"
            />
          </span>
        </div>
      </Link>
    </motion.div>
  )
}

export function MachinesGridSection() {
  const machines = ORDER.map((id) => MACHINES.find((m) => m.id === id)!).filter(Boolean)
  const scrollerRef = useRef<HTMLDivElement>(null)

  const scrollBy = (dir: 1 | -1) => {
    const el = scrollerRef.current
    if (!el) return
    const amount = Math.max(el.clientWidth * 0.8, 240)
    el.scrollBy({ left: dir * amount, behavior: "smooth" })
  }

  return (
    <section
      id="machines"
      className="relative overflow-hidden bg-machines-dark py-20 text-white md:py-24"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)",
          backgroundSize: "80px 80px",
        }}
      />

      <div className="relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6 }}
          className="container mx-auto max-w-3xl px-4 text-center"
        >
          <p className="text-xs uppercase tracking-[0.3em] text-white/45 md:text-[13px]">
            Máquinas
          </p>
          <h2 className="mt-3 text-balance text-3xl font-semibold tracking-tight md:text-4xl lg:text-5xl">
            Escolha o que você precisa e{" "}
            <span className="bg-gradient-to-r from-primary via-amber-300 to-primary bg-clip-text text-transparent">
              ative uma máquina
            </span>
            .
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-pretty text-sm text-white/60 md:text-base">
            Entre pela intenção: crescer, divulgar, limpar, construir, vender, cuidar ou resolver.
          </p>
        </motion.div>

        {/* Scroller */}
        <div className="relative mt-10 md:mt-12">
          {/* Edge fades */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-y-0 left-0 z-20 w-12 bg-gradient-to-r from-machines-dark to-transparent md:w-20"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-y-0 right-0 z-20 w-12 bg-gradient-to-l from-machines-dark to-transparent md:w-20"
          />

          {/* Arrow buttons (desktop) */}
          <button
            type="button"
            onClick={() => scrollBy(-1)}
            aria-label="Anterior"
            className="absolute left-2 top-1/2 z-30 hidden -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-black/60 p-2 text-white/80 backdrop-blur transition hover:border-white/30 hover:bg-black/80 hover:text-white md:flex"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={() => scrollBy(1)}
            aria-label="Próximo"
            className="absolute right-2 top-1/2 z-30 hidden -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-black/60 p-2 text-white/80 backdrop-blur transition hover:border-white/30 hover:bg-black/80 hover:text-white md:flex"
          >
            <ChevronRight className="h-5 w-5" />
          </button>

          <div
            ref={scrollerRef}
            className="machines-scroller snap-x snap-mandatory overflow-x-auto scroll-smooth pb-4 pt-2"
            style={{
              scrollbarWidth: "none",
              msOverflowStyle: "none",
            }}
          >
            <div className="mx-auto flex w-max gap-4 px-4 md:gap-5 md:px-12 lg:px-20">
              {machines.map((m, i) => (
                <MachineCard key={m.id} machine={m} index={i} />
              ))}
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .machines-scroller::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </section>
  )
}
