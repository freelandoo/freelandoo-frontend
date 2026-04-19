"use client"

import { useState, useMemo } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { ChevronDown, Zap } from "lucide-react"
import { MACHINES, type MachineTheme } from "./tokens"
import { useMachinesCatalog, type CatalogMachine } from "./use-machines-catalog"

type MergedGroup = {
  seed: MachineTheme
  categories: string[]
}

/**
 * Merge backend catalog categories over static seed.
 * When backend categories are available for a machine, they replace the static
 * resultCards. Falls back to seed resultCards titles when API is unavailable.
 */
function useMergedGroups(): MergedGroup[] {
  const { machines: catalog } = useMachinesCatalog()

  return useMemo(() => {
    const bySlug = new Map<string, CatalogMachine>(
      catalog.map((c) => [c.slug, c])
    )

    return MACHINES.filter((m) => m.id !== "oportunidades").map((seed) => {
      const remote = bySlug.get(seed.id)
      const categories =
        remote && remote.categories.length > 0
          ? remote.categories.filter((c) => c.is_active).map((c) => c.desc_category)
          : seed.resultCards.map((r) => r.title) // fallback

      return { seed, categories }
    })
  }, [catalog])
}

export function NewCategoriesSection() {
  const groups = useMergedGroups()
  const [openId, setOpenId] = useState<string | null>(null)

  const toggle = (id: string) => {
    setOpenId((prev) => (prev === id ? null : id))
  }

  return (
    <section className="relative overflow-hidden bg-machines-dark py-24 text-white md:py-32">
      <div
        aria-hidden
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.3) 1px, transparent 1px)",
          backgroundSize: "80px 80px",
        }}
      />

      <div className="container relative z-10 mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.8 }}
          className="mx-auto max-w-3xl text-center"
        >
          <p className="mb-4 text-xs uppercase tracking-[0.3em] text-white/50">
            Categorias
          </p>
          <h2 className="text-balance text-3xl font-semibold tracking-tight md:text-5xl">
            Uma plataforma. Várias máquinas.{" "}
            <span className="bg-gradient-to-r from-primary via-amber-300 to-primary bg-clip-text text-transparent">
              Inúmeras soluções.
            </span>
          </h2>
          <p className="mt-4 text-pretty text-white/60 md:text-lg">
            Explore categorias e veja como cada máquina pode atender objetivos diferentes.
          </p>
        </motion.div>

        <div className="mx-auto mt-14 max-w-2xl space-y-3">
          {groups.map(({ seed: m, categories: cats }, gi) => {
            const isOpen = openId === m.id

            return (
              <motion.div
                key={m.id}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.5, delay: gi * 0.06 }}
              >
                <button
                  onClick={() => toggle(m.id)}
                  className="group flex w-full items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-left backdrop-blur transition hover:border-white/20"
                  style={{
                    boxShadow: isOpen ? `0 0 30px -10px ${m.colors.glow}` : undefined,
                  }}
                >
                  <div
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10"
                    style={{
                      background: `linear-gradient(135deg, ${m.colors.from}33, ${m.colors.to}22)`,
                    }}
                  >
                    <Zap className="h-5 w-5" style={{ color: m.colors.accent }} />
                  </div>
                  <div className="flex-1">
                    <span className="text-sm font-semibold">{m.name}</span>
                    <span className="ml-2 text-xs text-white/40">{cats.length} categorias</span>
                  </div>
                  <ChevronDown
                    className="h-4 w-4 text-white/40 transition-transform"
                    style={{ transform: isOpen ? "rotate(180deg)" : "rotate(0deg)" }}
                  />
                </button>

                <AnimatePresence>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="overflow-hidden"
                    >
                      <div className="grid grid-cols-2 gap-2 px-2 pb-2 pt-3 sm:grid-cols-3">
                        {cats.map((cat, ci) => (
                          <motion.div
                            key={cat}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: ci * 0.05 }}
                            className="flex items-center gap-2 rounded-xl border border-white/5 bg-white/[0.02] px-3 py-2.5 text-sm text-white/70"
                          >
                            <span
                              className="h-1.5 w-1.5 shrink-0 rounded-full"
                              style={{ background: m.colors.accent }}
                            />
                            {cat}
                          </motion.div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
