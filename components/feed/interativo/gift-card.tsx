"use client"

// O BAÚ NO FEED (Feed Interativo F3). Cai pesado (DropArrival kind="gift"),
// fica balançando até a pessoa tocar. Ao tocar:
//   1. treme forte (antecipação, 220 ms) — som de abrir
//   2. a tampa abre em 3D com mola, partículas explodem do centro
//   3. a figurinha sobe e assenta com mola; raridade dá o contorno
//   4. a reação surpresa cobre o card uma vez (confete, fogos, mel, corações)
//   5. a mensagem aparece em "recorte" levemente torto
// O conteúdo só existe depois do POST /open (a inbox não revela nada).

import { memo, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { Loader2 } from "lucide-react"
import { fx } from "@/lib/feed-fx"
import { fxApi, type FxDrop } from "@/lib/feed-fx/api"
import { CHEST_BY_ID, RARITY_COLOR, STICKER_BY_ID, type Rarity, type Reaction } from "@/lib/feed-fx/gifts"
import { useTranslations } from "@/components/i18n/I18nProvider"
import { Burst, ChestArt, ReactionOverlay, StickerBadge } from "./fx-art"

interface Opened {
  chest: string
  sticker: string | null
  rarity: Rarity | null
  reaction: Reaction | null
  message: string | null
  lucky: boolean
}

function GiftCardImpl({ drop }: { drop: FxDrop }) {
  const t = useTranslations("FeedFx")
  const [phase, setPhase] = useState<"closed" | "shaking" | "open" | "error">("closed")
  const [gift, setGift] = useState<Opened | null>(null)
  const chest = drop.payload.chest || "madeira"
  const glow = CHEST_BY_ID[chest]?.glow || "#F2B705"

  const open = async () => {
    if (phase !== "closed") return
    setPhase("shaking")
    fx("bau-abre", "bau")
    try {
      const [r] = await Promise.all([
        fxApi<{ gift: Opened }>(`/drops/${drop.id_drop}/open`, { method: "POST" }),
        new Promise((res) => setTimeout(res, 420)),
      ])
      setGift(r.gift)
      setPhase("open")
      window.setTimeout(() => fx("bau-premio", "premio"), 380)
    } catch {
      fx("erro", "erro")
      setPhase("error")
    }
  }

  const s = gift?.sticker ? STICKER_BY_ID[gift.sticker] : null

  return (
    <div className="fl-feed-card relative overflow-hidden border-b border-[#F5F1E8]/10 bg-[#15120E] px-4 pb-8 pt-20 text-[#F5F1E8]">
      {/* fundo de tabloide com raios */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.10]"
        style={{ background: `repeating-conic-gradient(from 0deg at 50% 46%, ${glow} 0deg 9deg, transparent 9deg 18deg)` }}
      />
      <div className="relative flex flex-col items-center">
        <button
          type="button"
          onClick={open}
          disabled={phase !== "closed"}
          aria-label={t("giftOpen", "Abrir o baú")}
          className="relative flex h-[190px] w-full items-center justify-center"
        >
          <motion.div
            animate={phase === "shaking" ? { rotate: [0, -7, 7, -6, 6, -3, 0], scale: [1, 1.06, 1.06, 1.08, 1] } : {}}
            transition={{ duration: 0.42 }}
          >
            <ChestArt chest={chest} open={phase === "open"} shake={phase === "closed"} />
          </motion.div>
          {phase === "open" && <Burst seed={drop.id_drop} colors={[glow, "#F2B705", "#F5F1E8", "#FF3D6E"]} count={30} />}
          {phase === "open" && s && (
            <motion.div
              className="absolute left-1/2 top-2 -ml-[39px]"
              initial={{ y: 70, scale: 0.2, opacity: 0, rotate: -30 }}
              animate={{ y: -8, scale: 1, opacity: 1, rotate: -6 }}
              transition={{ type: "spring", stiffness: 380, damping: 14, delay: 0.18 }}
            >
              <StickerBadge id={s.id} size={78} />
            </motion.div>
          )}
        </button>

        <AnimatePresence mode="wait">
          {phase === "closed" || phase === "shaking" ? (
            <motion.div key="closed" exit={{ opacity: 0, y: -8 }} className="mt-2 flex flex-col items-center gap-1">
              <span className="border-2 border-black bg-[#F2B705] px-3 py-1 text-sm font-black uppercase tracking-wider text-black shadow-[3px_3px_0_#000]">
                {phase === "shaking" ? <Loader2 className="h-4 w-4 animate-spin" /> : t("giftTapToOpen", "Toque para abrir")}
              </span>
            </motion.div>
          ) : phase === "error" ? (
            <motion.p key="err" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-3 text-sm text-[#9A938A]">
              {t("giftOpenFailed", "Esse baú não abriu. Tente de novo mais tarde.")}
            </motion.p>
          ) : (
            <motion.div
              key="open"
              className="mt-4 flex w-full flex-col items-center gap-3"
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.45, type: "spring", stiffness: 300, damping: 24 }}
            >
              {s && gift?.rarity && (
                <span
                  className="border-2 border-black px-2 py-0.5 text-[11px] font-black uppercase tracking-[0.2em] text-black shadow-[2px_2px_0_#000]"
                  style={{ background: RARITY_COLOR[gift.rarity] }}
                >
                  {t(`sticker_${s.id}`, s.name)} · {t(`rarity_${gift.rarity}`, gift.rarity)}
                </span>
              )}
              {gift?.message && (
                <motion.p
                  className="max-w-[90%] whitespace-pre-wrap border-2 border-black bg-[#F5F1E8] px-4 py-3 text-center text-base font-bold text-black shadow-[5px_5px_0_#000]"
                  initial={{ rotate: -4, scale: 0.9 }}
                  animate={{ rotate: -1.5, scale: 1 }}
                  transition={{ delay: 0.6, type: "spring", stiffness: 380, damping: 18 }}
                >
                  {gift.message}
                </motion.p>
              )}
              {gift?.lucky && <span className="text-xs font-bold text-[#F2B705]">{t("giftLucky", "Caiu para você na sorte!")}</span>}
              {s && <span className="text-[11px] text-[#9A938A]">{t("giftCollected", "A figurinha foi para a sua coleção.")}</span>}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      {phase === "open" && gift?.reaction && <ReactionOverlay kind={gift.reaction} seed={drop.id_drop} />}
    </div>
  )
}

export const GiftCard = memo(GiftCardImpl)
