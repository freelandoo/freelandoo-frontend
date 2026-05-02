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

const SHORTCUTS = [
  { label: "Design", icon: Palette, href: "/search?q=design" },
  { label: "Marketing", icon: TrendingUp, href: "/search?q=marketing" },
  { label: "Construção", icon: HardHat, href: "/search?machine=construcao" },
  { label: "Limpeza", icon: Sparkles, href: "/search?machine=limpeza" },
  { label: "Influenciadores", icon: Megaphone, href: "/search?machine=divulgacao" },
  { label: "Aulas", icon: GraduationCap, href: "/search?q=aulas" },
  { label: "Reformas", icon: Hammer, href: "/search?q=reformas" },
  { label: "Freelas digitais", icon: Laptop, href: "/search?q=freela+digital" },
]

export function PopularShortcutsSection() {
  return (
    <section
      aria-label="Atalhos populares"
      className="relative bg-machines-dark py-12 text-white md:py-16"
    >
      <div className="container relative z-10 mx-auto px-4">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-[10px] uppercase tracking-[0.3em] text-white/40 md:text-xs">
            Atalhos populares
          </p>
          <h3 className="mt-2 text-balance text-base font-medium text-white/70 md:text-lg">
            Prefere começar por categoria?
          </h3>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ duration: 0.5 }}
          className="mx-auto mt-6 grid max-w-5xl grid-cols-2 gap-2 sm:grid-cols-4 md:gap-3"
        >
          {SHORTCUTS.map((s) => {
            const Icon = s.icon
            return (
              <Link
                key={s.label}
                href={s.href}
                data-cta="popular-shortcut"
                data-cta-action={`shortcut-${s.label.toLowerCase()}`}
                className="group flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.025] px-3.5 py-2.5 text-xs text-white/65 backdrop-blur transition hover:border-primary/40 hover:bg-white/[0.05] hover:text-white md:text-sm"
              >
                <Icon className="h-4 w-4 shrink-0 text-white/45 transition-colors group-hover:text-primary" />
                <span className="truncate">{s.label}</span>
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
    </section>
  )
}
