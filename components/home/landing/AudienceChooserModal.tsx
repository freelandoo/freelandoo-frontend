"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { AnimatePresence, motion, useReducedMotion } from "framer-motion"
import Image from "next/image"
import { Search, Sparkles, X } from "lucide-react"

const STORAGE_KEY = "fl_audience"
const DISMISS_KEY = "fl_audience_dismissed"

/**
 * Modal de boas-vindas (wedge comprador × vendedor). Não-bloqueante: monta só após
 * a hidratação, não aparece pra logado nem pra quem já escolheu/dispensou. A escolha
 * fica em localStorage; o dispensar (X/backdrop) é leve (sessionStorage), não grava lado.
 */
export function AudienceChooserModal() {
  const router = useRouter()
  const reduceMotion = useReducedMotion()
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null
    if (token) return
    if (localStorage.getItem(STORAGE_KEY)) return
    if (sessionStorage.getItem(DISMISS_KEY)) return
    setOpen(true)
  }, [])

  // Mede o split do wedge. Empurra pro dataLayer (GTM/Consent Mode v2 já existe);
  // no-op seguro se ausente.
  function track(choice: "buyer" | "seller") {
    try {
      const w = window as unknown as { dataLayer?: Record<string, unknown>[] }
      w.dataLayer = w.dataLayer || []
      w.dataLayer.push({ event: "audience_choice", audience: choice })
    } catch {
      /* no-op */
    }
  }

  function chooseBuyer() {
    track("buyer")
    localStorage.setItem(STORAGE_KEY, "buyer")
    setOpen(false)
  }
  function chooseSeller() {
    track("seller")
    localStorage.setItem(STORAGE_KEY, "seller")
    setOpen(false)
    router.push("/ganhar")
  }
  function dismiss() {
    sessionStorage.setItem(DISMISS_KEY, "1")
    setOpen(false)
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[120] flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={dismiss}
          role="presentation"
        >
          <motion.div
            className="fl-root fl-paper-card relative w-full max-w-2xl border-2 border-[#0B0B0D] p-8 shadow-[10px_10px_0_0_#0B0B0D] sm:p-10"
            initial={reduceMotion ? { opacity: 0 } : { scale: 0.92, y: 20, opacity: 0 }}
            animate={reduceMotion ? { opacity: 1 } : { scale: 1, y: 0, opacity: 1 }}
            exit={reduceMotion ? { opacity: 0 } : { scale: 0.95, opacity: 0 }}
            transition={reduceMotion ? { duration: 0.15 } : { type: "spring", stiffness: 100, damping: 20 }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="audience-modal-title"
          >
            <button
              type="button"
              onClick={dismiss}
              className="absolute right-4 top-4 p-1.5 text-[#0B0B0D]/50 transition hover:bg-[#0B0B0D]/10 hover:text-[#0B0B0D] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0B0B0D]"
              aria-label="Fechar"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex flex-col items-center text-center">
              <Image
                src="/freelandoo-logo.png"
                alt="Freelandoo"
                width={200}
                height={56}
                className="h-12 w-auto sm:h-14"
                priority
              />
              <h2
                id="audience-modal-title"
                className="fl-display mt-5 text-3xl leading-none tracking-tight text-[#0B0B0D] sm:text-4xl"
              >
                Bem-vindo à Freelandoo
              </h2>
              <p className="mt-2 text-base text-[#3a352c]">O que você quer fazer agora?</p>
            </div>

            <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2">
              <button
                type="button"
                onClick={chooseBuyer}
                className="group flex flex-col items-start gap-3 border-2 border-[#0B0B0D] bg-white p-5 text-left transition hover:-translate-y-0.5 hover:shadow-[6px_6px_0_0_#F2B705] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0B0B0D]"
              >
                <span className="inline-flex h-11 w-11 items-center justify-center border-2 border-[#0B0B0D] bg-[#F2B705]">
                  <Search className="h-5 w-5 text-[#0B0B0D]" />
                </span>
                <span className="text-lg font-bold leading-snug text-[#0B0B0D]">
                  Quero encontrar um profissional, influenciador ou produto
                </span>
                <span className="text-sm text-[#3a352c]">Contrate e compre com segurança.</span>
              </button>

              <button
                type="button"
                onClick={chooseSeller}
                className="group flex flex-col items-start gap-3 border-2 border-[#0B0B0D] bg-white p-5 text-left transition hover:-translate-y-0.5 hover:shadow-[6px_6px_0_0_#F2B705] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0B0B0D]"
              >
                <span className="inline-flex h-11 w-11 items-center justify-center border-2 border-[#0B0B0D] bg-[#0B0B0D]">
                  <Sparkles className="h-5 w-5 text-[#F2B705]" />
                </span>
                <span className="text-lg font-bold leading-snug text-[#0B0B0D]">
                  Sou profissional ou influenciador e quero ganhar dinheiro
                </span>
                <span className="text-sm text-[#3a352c]">Comece de graça e venda seu talento.</span>
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
