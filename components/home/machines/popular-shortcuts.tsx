"use client"

import Link from "next/link"
import { motion } from "framer-motion"

const SHORTCUTS = [
  { label: "Design", href: "/search?q=design" },
  { label: "Marketing", href: "/search?q=marketing" },
  { label: "Construção", href: "/search?machine=construcao" },
  { label: "Limpeza", href: "/search?machine=limpeza" },
  { label: "Influenciadores", href: "/search?machine=divulgacao" },
  { label: "Aulas", href: "/search?q=aulas" },
  { label: "Reformas", href: "/search?q=reformas" },
  { label: "Freelas digitais", href: "/search?q=freela+digital" },
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
          <h3 className="mt-2 text-balance text-lg font-medium text-white/75 md:text-xl">
            Prefere começar por categoria?
          </h3>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ duration: 0.5 }}
          className="mx-auto mt-6 flex max-w-3xl flex-wrap justify-center gap-2"
        >
          {SHORTCUTS.map((s) => (
            <Link
              key={s.label}
              href={s.href}
              data-cta="popular-shortcut"
              data-cta-action={`shortcut-${s.label.toLowerCase()}`}
              className="rounded-full border border-white/10 bg-white/[0.03] px-4 py-1.5 text-xs text-white/65 backdrop-blur transition hover:border-white/25 hover:bg-white/10 hover:text-white md:text-sm"
            >
              {s.label}
            </Link>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
