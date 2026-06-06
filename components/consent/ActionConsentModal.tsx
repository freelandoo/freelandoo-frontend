"use client"

import { useEffect, useState } from "react"
import { AnimatePresence, motion, useReducedMotion } from "framer-motion"
import Link from "next/link"
import { Check, X } from "lucide-react"
import { CONSENT_ACTIONS, type ConsentActionKey } from "@/lib/action-consents"

export function ActionConsentModal({
  actionKey,
  onAccept,
  onDecline,
}: {
  actionKey: ConsentActionKey | null
  onAccept: (key: ConsentActionKey) => void
  onDecline: () => void
}) {
  const reduceMotion = useReducedMotion()
  const [checked, setChecked] = useState(false)

  useEffect(() => {
    setChecked(false)
  }, [actionKey])

  const def = actionKey ? CONSENT_ACTIONS[actionKey] : null

  return (
    <AnimatePresence>
      {def && (
        <motion.div
          className="fixed inset-0 z-[130] flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onDecline}
          role="presentation"
        >
          <motion.div
            className="fl-root fl-paper-card relative w-full max-w-lg rounded-2xl border-2 border-[#0B0B0D] p-6 shadow-[10px_10px_0_0_#0B0B0D] sm:p-8"
            initial={reduceMotion ? { opacity: 0 } : { scale: 0.94, y: 16, opacity: 0 }}
            animate={reduceMotion ? { opacity: 1 } : { scale: 1, y: 0, opacity: 1 }}
            exit={reduceMotion ? { opacity: 0 } : { scale: 0.96, opacity: 0 }}
            transition={reduceMotion ? { duration: 0.15 } : { type: "spring", stiffness: 100, damping: 20 }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="consent-modal-title"
          >
            <button
              type="button"
              onClick={onDecline}
              className="absolute right-4 top-4 rounded-full p-1.5 text-[#0B0B0D]/50 transition hover:bg-[#0B0B0D]/10 hover:text-[#0B0B0D] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0B0B0D]"
              aria-label="Fechar"
            >
              <X className="h-5 w-5" />
            </button>

            <h2 id="consent-modal-title" className="fl-display text-2xl text-[#0B0B0D] sm:text-3xl">
              {def.title}
            </h2>
            <p className="mt-2 text-sm text-[#3a352c]">{def.summary}</p>

            <ul className="mt-4 space-y-2">
              {def.bullets.map((b) => (
                <li key={b} className="flex items-start gap-2 text-sm text-[#0B0B0D]">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#0B0B0D]" />
                  <span>{b}</span>
                </li>
              ))}
            </ul>

            <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-xs">
              {def.links.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  target="_blank"
                  className="font-bold text-[#0B0B0D] underline underline-offset-2"
                >
                  {l.label}
                </Link>
              ))}
            </div>

            <label className="mt-5 flex cursor-pointer items-start gap-2 text-sm text-[#0B0B0D]">
              <input
                type="checkbox"
                checked={checked}
                onChange={(e) => setChecked(e.target.checked)}
                className="mt-0.5 h-4 w-4 accent-[#F2B705]"
              />
              <span>Li e concordo com os termos acima.</span>
            </label>

            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={onDecline}
                className="rounded-full border-2 border-[#0B0B0D] px-4 py-2 text-sm font-bold text-[#0B0B0D] transition hover:bg-[#0B0B0D]/5 active:scale-[0.98]"
              >
                Recusar
              </button>
              <button
                type="button"
                disabled={!checked}
                onClick={() => def && onAccept(def.key)}
                className="rounded-full bg-[#F2B705] px-5 py-2 text-sm font-bold text-[#1A1505] transition hover:brightness-105 active:scale-[0.98] disabled:opacity-50"
              >
                Aceitar e continuar
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
