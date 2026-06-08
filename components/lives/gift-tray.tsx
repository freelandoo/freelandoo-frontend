"use client"

import { useEffect, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { Gift, Loader2, X } from "lucide-react"
import { fetchGifts, sendGift } from "@/lib/lives/api"
import type { LiveGift } from "@/lib/lives/types"

const SPRING = { type: "spring" as const, stiffness: 220, damping: 26 }

interface GiftTrayProps {
  liveId: string
  // Chamado após o presente ser cobrado no backend: anima + avisa a sala.
  onSent: (g: { emoji: string; color: string; animation: string; gift_name: string }) => void
}

export function GiftTray({ liveId, onSent }: GiftTrayProps) {
  const [open, setOpen] = useState(false)
  const [gifts, setGifts] = useState<LiveGift[]>([])
  const [loading, setLoading] = useState(false)
  const [sendingId, setSendingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open || gifts.length > 0) return
    setLoading(true)
    fetchGifts()
      .then(setGifts)
      .catch(() => setError("Não consegui carregar os presentes"))
      .finally(() => setLoading(false))
  }, [open, gifts.length])

  const handleSend = async (g: LiveGift) => {
    setSendingId(g.id_live_gift)
    setError(null)
    try {
      await sendGift(liveId, g.id_live_gift)
      onSent({ emoji: g.emoji, color: g.color, animation: g.animation, gift_name: g.name })
      setOpen(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao enviar")
    } finally {
      setSendingId(null)
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-pink-500/80 to-amber-400/80 text-white shadow-[0_6px_18px_-6px_rgba(236,72,153,0.7)] backdrop-blur transition hover:from-pink-500 hover:to-amber-400"
        aria-label="Enviar presente"
      >
        <Gift className="h-5 w-5" />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            className="absolute inset-0 z-40 flex flex-col justify-end"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <button
              type="button"
              className="absolute inset-0 bg-black/50"
              onClick={() => setOpen(false)}
              aria-label="Fechar presentes"
            />
            <motion.div
              initial={{ y: 40 }}
              animate={{ y: 0 }}
              exit={{ y: 40 }}
              transition={SPRING}
              className="relative z-10 rounded-t-3xl border-t border-white/10 bg-neutral-950/95 px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-4 backdrop-blur-xl"
            >
              <div className="mb-3 flex items-center justify-between">
                <h3 className="flex items-center gap-1.5 text-base font-semibold text-white">
                  <Gift className="h-4 w-4 text-pink-400" /> Presentes
                </h3>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-full p-1.5 text-white/60 transition hover:bg-white/10 hover:text-white"
                  aria-label="Fechar"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {error && (
                <p className="mb-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-200">{error}</p>
              )}

              {loading ? (
                <div className="flex h-24 items-center justify-center text-white/60">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : gifts.length === 0 ? (
                <p className="py-6 text-center text-sm text-white/50">Nenhum presente disponível.</p>
              ) : (
                <div className="grid grid-cols-4 gap-2">
                  {gifts.map((g) => (
                    <motion.button
                      key={g.id_live_gift}
                      type="button"
                      onClick={() => handleSend(g)}
                      disabled={!!sendingId}
                      whileTap={{ scale: 0.95 }}
                      transition={SPRING}
                      className="flex flex-col items-center gap-1 rounded-2xl border border-white/10 bg-white/[0.03] p-3 transition hover:border-white/25 disabled:opacity-50"
                      style={{ boxShadow: `inset 0 0 0 1px ${g.color}22` }}
                    >
                      {sendingId === g.id_live_gift ? (
                        <Loader2 className="h-7 w-7 animate-spin text-white/70" />
                      ) : (
                        <span className="text-3xl" style={{ filter: `drop-shadow(0 0 8px ${g.color}88)` }}>{g.emoji}</span>
                      )}
                      <span className="line-clamp-1 text-[10px] font-medium text-white/85">{g.name}</span>
                      <span className="rounded-full px-1.5 py-px text-[10px] font-bold" style={{ color: g.color }}>
                        {g.price_polens} 🐝
                      </span>
                    </motion.button>
                  ))}
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
