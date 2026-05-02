"use client"

import Link from "next/link"
import { useMemo } from "react"
import { motion } from "framer-motion"
import * as Icons from "lucide-react"
import { ArrowRight, Sparkles } from "lucide-react"
import { useMachinesCatalog, type CatalogMachine } from "./use-machines-catalog"

type IconComponent = React.ComponentType<{ className?: string }>

function resolveIcon(name: string | null | undefined): IconComponent {
  if (!name) return Sparkles
  const candidate = (Icons as unknown as Record<string, unknown>)[name]
  if (candidate && typeof candidate === "object") return candidate as IconComponent
  return Sparkles
}

type ProfessionItem = {
  key: string
  label: string
  href: string
  tint: string
  icon: IconComponent
}

const MAX_ITEMS = 12

/**
 * Spread strategy: pega até 2 profissões ativas por máquina ativa, intercalando
 * para variedade visual. Dessa forma cada máquina aparece pelo menos uma vez se
 * houver categorias suficientes.
 */
function buildItems(machines: CatalogMachine[]): ProfessionItem[] {
  const active = machines.filter((m) => m.is_active)
  if (active.length === 0) return []

  const buckets = active.map((m) => {
    const cats = m.categories.filter((c) => c.is_active).slice(0, 2)
    const Icon = resolveIcon(m.icon_name)
    const tint = m.color_accent || "#fbbf24"
    return cats.map((c) => ({
      key: `${m.id_machine}:${c.id_category}`,
      label: c.desc_category,
      href: `/search?machine=${encodeURIComponent(m.slug)}&id_category=${c.id_category}`,
      tint,
      icon: Icon,
    }))
  })

  // Round-robin para intercalar máquinas
  const out: ProfessionItem[] = []
  let added = true
  let round = 0
  while (added && out.length < MAX_ITEMS) {
    added = false
    for (const bucket of buckets) {
      if (round < bucket.length && out.length < MAX_ITEMS) {
        out.push(bucket[round])
        added = true
      }
    }
    round += 1
  }

  return out
}

export function PopularShortcutsSection() {
  const { machines } = useMachinesCatalog()
  const items = useMemo(() => buildItems(machines), [machines])

  if (items.length === 0) return null

  return (
    <section
      aria-label="Profissões populares"
      className="relative bg-machines-dark py-12 text-white md:py-16"
    >
      <div className="container relative z-10 mx-auto px-4">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-[10px] uppercase tracking-[0.3em] text-white/40 md:text-xs">
            Profissões populares
          </p>
          <h3 className="mt-2 text-balance text-base font-medium text-white/75 md:text-lg">
            Vá direto pelo profissional certo
          </h3>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ duration: 0.5 }}
          className="shortcuts-scroller mx-auto mt-7 flex max-w-6xl gap-3 overflow-x-auto px-1 pb-2 md:flex-wrap md:justify-center md:overflow-visible md:px-0"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {items.map((s) => {
            const Icon = s.icon
            return (
              <Link
                key={s.key}
                href={s.href}
                data-cta="popular-profession"
                data-cta-action={`profession-${s.label.toLowerCase()}`}
                className="group flex h-[100px] w-[104px] shrink-0 flex-col items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.025] p-2.5 text-center backdrop-blur transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/40 hover:bg-white/[0.05] md:h-[108px] md:w-[120px]"
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
            data-cta="popular-profession"
            data-cta-action="ver-todas-profissoes"
            className="group inline-flex items-center gap-1.5 text-xs font-medium text-white/50 transition hover:text-white/90"
          >
            Ver todas as profissões
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
