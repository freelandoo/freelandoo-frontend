"use client"

import Link from "next/link"
import { motion } from "framer-motion"
import {
  ArrowRight,
  Palette,
  TrendingUp,
  HardHat,
  Sparkles,
  Megaphone,
  GraduationCap,
  Hammer,
  Laptop,
} from "lucide-react"

type Shortcut = {
  label: string
  icon: React.ComponentType<{ className?: string }>
  href: string
  tint: string
}

const SHORTCUTS: Shortcut[] = [
  { label: "Design", icon: Palette, href: "/search?q=design", tint: "#a78bfa" },
  { label: "Marketing", icon: TrendingUp, href: "/search?q=marketing", tint: "#38bdf8" },
  { label: "Construção", icon: HardHat, href: "/search?machine=construcao", tint: "#fb923c" },
  { label: "Limpeza", icon: Sparkles, href: "/search?machine=limpeza", tint: "#34d399" },
  { label: "Influenciadores", icon: Megaphone, href: "/search?machine=divulgacao", tint: "#fb7185" },
  { label: "Aulas", icon: GraduationCap, href: "/search?q=aulas", tint: "#fbbf24" },
  { label: "Reformas", icon: Hammer, href: "/search?q=reformas", tint: "#f59e0b" },
  { label: "Freelas digitais", icon: Laptop, href: "/search?q=freela+digital", tint: "#2dd4bf" },
]

export function PopularShortcutsSection() {
  return (
    <section
      aria-label="Categorias populares"
      className="relative bg-machines-dark py-12 text-white md:py-16"
    >
      <div className="container relative z-10 mx-auto px-4">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-[10px] uppercase tracking-[0.3em] text-white/40 md:text-xs">
            Categorias populares
          </p>
          <h3 className="mt-2 text-balance text-base font-medium text-white/75 md:text-lg">
            Prefere começar por categoria?
          </h3>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ duration: 0.5 }}
          className="shortcuts-scroller mx-auto mt-7 flex max-w-5xl gap-3 overflow-x-auto px-1 pb-2 md:grid md:grid-cols-8 md:gap-3 md:overflow-visible md:px-0"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {SHORTCUTS.map((s) => {
            const Icon = s.icon
            return (
              <Link
                key={s.label}
                href={s.href}
                data-cta="popular-shortcut"
                data-cta-action={`shortcut-${s.label.toLowerCase()}`}
                className="group flex h-[100px] w-[96px] shrink-0 flex-col items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.025] p-2.5 text-center backdrop-blur transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/40 hover:bg-white/[0.05] md:h-[104px] md:w-auto"
                style={{ boxShadow: "0 0 0 0 transparent" }}
                onMouseEnter={(e) => {
                  ;(e.currentTarget as HTMLElement).style.boxShadow = `0 0 30px -10px ${s.tint}66`
                }}
                onMouseLeave={(e) => {
                  ;(e.currentTarget as HTMLElement).style.boxShadow = `0 0 0 0 transparent`
                }}
              >
                <span
                  className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 transition-transform duration-300 group-hover:scale-[1.06]"
                  style={{
                    background: `${s.tint}1a`,
                    color: s.tint,
                  }}
                >
                  <Icon className="h-5 w-5" />
                </span>
                <span className="line-clamp-2 text-[11px] font-medium leading-tight text-white/75 transition-colors group-hover:text-white">
                  {s.label}
                </span>
              </Link>
            )
          })}
        </motion.div>

        <div className="mt-6 flex justify-center">
          <Link
            href="/search"
            data-cta="popular-shortcut"
            data-cta-action="ver-todas-categorias"
            className="group inline-flex items-center gap-1.5 text-xs font-medium text-white/50 transition hover:text-white/90"
          >
            Ver todas as categorias
            <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
      </div>

      <style jsx>{`
        .shortcuts-scroller::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </section>
  )
}
