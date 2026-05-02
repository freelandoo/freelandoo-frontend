"use client"

import Link from "next/link"
import { motion, useReducedMotion } from "framer-motion"
import {
  ArrowRight,
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
      initial={reduceMotion ? false : { opacity: 0, y: 20 }}
      whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.45, delay: Math.min(index * 0.05, 0.3), ease: "easeOut" }}
    >
      <Link
        href={`/search?machine=${machine.id}`}
        data-cta="machine-grid"
        data-cta-action={`ativar-${machine.id}`}
        className="group relative flex h-full flex-col overflow-hidden rounded-3xl border border-white/10 bg-[#0b0d14] p-6 transition-all duration-300 hover:-translate-y-1 hover:border-white/20 md:p-7"
        style={{
          boxShadow: "0 0 0 0 transparent",
        }}
        onMouseEnter={(e) => {
          ;(e.currentTarget as HTMLElement).style.boxShadow = `0 0 60px -20px ${machine.colors.glow}, inset 0 0 0 1px ${machine.colors.ring}`
        }}
        onMouseLeave={(e) => {
          ;(e.currentTarget as HTMLElement).style.boxShadow = `0 0 0 0 transparent`
        }}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full opacity-40 blur-2xl transition-opacity duration-500 group-hover:opacity-70"
          style={{ background: machine.colors.glow }}
        />

        <div
          className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/10 transition-transform duration-300 group-hover:scale-[1.04]"
          style={{
            background: `linear-gradient(135deg, ${machine.colors.from}33, ${machine.colors.to}1a)`,
          }}
        >
          <Icon className="h-6 w-6" style={{ color: machine.colors.accent }} />
        </div>

        <h3 className="relative mt-5 text-base font-semibold leading-tight text-white md:text-lg">
          {machine.name}
        </h3>

        <p className="relative mt-2 flex-1 text-sm leading-relaxed text-white/55">
          {description}
        </p>

        <span
          className="relative mt-5 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.15em] transition-all duration-300 group-hover:gap-2.5"
          style={{ color: machine.colors.accent }}
        >
          Ativar
          <ArrowRight className="h-3.5 w-3.5" />
        </span>
      </Link>
    </motion.div>
  )
}

export function MachinesGridSection() {
  const machines = ORDER.map((id) => MACHINES.find((m) => m.id === id)!).filter(Boolean)

  return (
    <section
      id="machines"
      className="relative overflow-hidden bg-machines-dark py-20 text-white md:py-28"
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

      <div className="container relative z-10 mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6 }}
          className="mx-auto max-w-3xl text-center"
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

        <div className="mx-auto mt-12 grid max-w-7xl grid-cols-2 gap-4 md:mt-14 md:grid-cols-3 md:gap-5 lg:grid-cols-4 lg:gap-6">
          {machines.map((m, i) => (
            <MachineCard key={m.id} machine={m} index={i} />
          ))}
        </div>
      </div>
    </section>
  )
}
