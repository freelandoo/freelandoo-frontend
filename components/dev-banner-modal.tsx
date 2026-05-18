"use client"

import { useEffect, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { Sparkles, X } from "lucide-react"

const STORAGE_KEY = "freelandoo:dev_banner_seen_v1"
const SPRING = { type: "spring" as const, stiffness: 200, damping: 22 }

export function DevBannerModal() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (typeof window === "undefined") return
    let seen = false
    try {
      seen = window.sessionStorage.getItem(STORAGE_KEY) === "1"
    } catch {
      seen = false
    }
    if (!seen) setOpen(true)
  }, [])

  const close = () => {
    setOpen(false)
    try {
      window.sessionStorage.setItem(STORAGE_KEY, "1")
    } catch {
      /* sessionStorage indisponível — modal não reabre na navegação porque o
       * state já é false; mas reabre em nova request */
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="dev-banner-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          onClick={close}
          role="dialog"
          aria-modal="true"
          aria-labelledby="dev-banner-title"
        >
          <motion.div
            initial={{ opacity: 0, y: 14, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 14, scale: 0.96 }}
            transition={SPRING}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-md overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-neutral-950 to-black shadow-[0_40px_120px_-30px_rgba(0,0,0,0.8)]"
          >
            {/* Glow gradient subtil no topo */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-[radial-gradient(80%_60%_at_50%_0%,rgba(250,204,21,0.18),transparent_70%)]"
            />

            <button
              type="button"
              onClick={close}
              aria-label="Fechar"
              className="absolute right-3 top-3 z-10 rounded-full p-1.5 text-white/55 transition hover:bg-white/10 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="relative px-7 pt-9 pb-7 text-center">
              <motion.span
                animate={{ y: [0, -4, 0] }}
                transition={{ repeat: Infinity, duration: 2.4, ease: "easeInOut" }}
                className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-yellow-400/30 to-amber-500/15 text-yellow-300 ring-1 ring-yellow-400/30 shadow-[0_8px_24px_-12px_rgba(250,204,21,0.55)]"
              >
                <Sparkles className="h-7 w-7" />
              </motion.span>

              <h2
                id="dev-banner-title"
                className="bg-gradient-to-br from-white via-white to-white/70 bg-clip-text text-xl font-semibold tracking-tight text-transparent sm:text-2xl"
              >
                Plataforma em desenvolvimento
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-white/65 sm:text-[15px]">
                Estamos finalizando os últimos detalhes do <span className="font-semibold text-white">Freelandoo</span>.
                <br className="hidden sm:inline" /> Em breve no ar.
              </p>

              <motion.button
                type="button"
                onClick={close}
                whileTap={{ scale: 0.96 }}
                transition={SPRING}
                className="mt-6 inline-flex h-11 items-center justify-center rounded-xl bg-gradient-to-br from-yellow-400 to-amber-500 px-6 text-sm font-semibold text-neutral-950 shadow-[0_10px_28px_-10px_rgba(250,204,21,0.6)] transition hover:from-yellow-300 hover:to-amber-400"
              >
                Entendi
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
