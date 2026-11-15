"use client"

// A CÁPSULA DO TEMPO NO FEED (F4). Entrada elegante (DropArrival
// kind="capsule": desce devagar, brilho suave). O selo "escrita em … /
// aberta hoje" e a carta, que se desdobra de cima para baixo.

import { memo } from "react"
import { motion } from "framer-motion"
import { Hourglass } from "lucide-react"
import type { FxDrop } from "@/lib/feed-fx/api"
import { useLocale, useTranslations } from "@/components/i18n/I18nProvider"

function fmt(iso: string | null | undefined, locale: string) {
  if (!iso) return ""
  try {
    return new Date(iso).toLocaleDateString(locale, { day: "2-digit", month: "short", year: "numeric" })
  } catch {
    return ""
  }
}

function CapsuleCardImpl({ drop, compact }: { drop: FxDrop; compact?: boolean }) {
  const t = useTranslations("FeedFx")
  const locale = useLocale()
  const written = fmt(drop.payload.written_at, locale)
  if (!drop.payload.message) return null
  return (
    <div
      className={
        compact
          ? "relative border-b-2 border-[#F2B705]/40 bg-[#1D1810] px-4 py-4 text-[#F5F1E8]"
          : "fl-feed-card relative overflow-hidden border-b border-[#F5F1E8]/10 bg-[#15120E] px-5 pb-10 pt-20 text-[#F5F1E8]"
      }
    >
      <div className="relative mx-auto max-w-[400px]">
        <motion.div
          className="mx-auto mb-4 flex w-fit items-center gap-2 border-2 border-[#F2B705] bg-black/40 px-3 py-1 text-[11px] font-black uppercase tracking-[0.2em] text-[#F2B705]"
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.5 }}
        >
          <motion.span animate={{ rotate: [0, 180, 180, 360] }} transition={{ duration: 2.4, times: [0, 0.3, 0.7, 1], repeat: 1 }}>
            <Hourglass className="h-3.5 w-3.5" />
          </motion.span>
          {written ? t("capsuleWritten", "Escrita em {d}").replace("{d}", written) : t("capsuleTitle", "Cápsula do tempo")}
        </motion.div>
        {/* a carta desdobra de cima para baixo */}
        <motion.div
          className="origin-top border-[3px] border-black bg-[#F5F1E8] px-5 py-5 text-black shadow-[6px_6px_0_#F2B705]"
          initial={{ scaleY: 0.05, opacity: 0 }}
          animate={{ scaleY: 1, opacity: 1 }}
          transition={{ delay: 0.75, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        >
          <motion.p
            className="whitespace-pre-wrap text-lg font-bold leading-snug"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.25, duration: 0.6 }}
          >
            {drop.payload.message}
          </motion.p>
        </motion.div>
      </div>
    </div>
  )
}

export const CapsuleCard = memo(CapsuleCardImpl)
