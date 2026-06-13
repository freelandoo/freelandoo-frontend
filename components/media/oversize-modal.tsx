"use client"

// Modal amigável de "arquivo muito grande": mostra o limite da superfície e leva
// pra ferramenta /comprimir. Substitui o erro seco nos pontos de upload.

import Link from "next/link"
import { AlertTriangle, Wand2, X } from "lucide-react"
import { useTranslations } from "@/components/i18n/I18nProvider"

export function OversizeModal({
  open,
  onClose,
  limitLabel,
}: {
  open: boolean
  onClose: () => void
  /** Rótulo do limite da superfície, ex.: "100MB". */
  limitLabel: string
}) {
  const t = useTranslations("Compress")
  if (!open) return null
  return (
    <div
      className="fixed inset-0 z-[140] flex items-center justify-center bg-black/70 p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="fl-root fl-paper-card relative w-full max-w-sm rounded-2xl border-2 border-[#0B0B0D] p-6 shadow-[10px_10px_0_0_#0B0B0D]"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label={t("close", "Fechar")}
          className="absolute right-3 top-3 rounded-full p-1.5 text-[#0B0B0D]/50 transition hover:bg-[#0B0B0D]/10 hover:text-[#0B0B0D]"
        >
          <X className="h-5 w-5" />
        </button>

        <span className="inline-flex h-11 w-11 items-center justify-center rounded-full border-2 border-[#0B0B0D] bg-[#F2B705]">
          <AlertTriangle className="h-5 w-5 text-[#1A1505]" />
        </span>
        <h2 className="fl-display mt-3 text-2xl text-[#0B0B0D]">{t("oversizeTitle", "Arquivo muito grande")}</h2>
        <p className="mt-2 text-sm text-[#3a352c]">
          {t("oversizeBody", "O limite aqui é {limit}. Comprima o arquivo e poste a versão menor.").replace(
            "{limit}",
            limitLabel,
          )}
        </p>

        <div className="mt-5 flex flex-col gap-2">
          <Link
            href="/comprimir"
            target="_blank"
            className="inline-flex items-center justify-center gap-2 rounded-full border-2 border-[#0B0B0D] bg-[#F2B705] px-4 py-2.5 text-sm font-extrabold text-[#1A1505] shadow-[4px_4px_0_0_#0B0B0D] transition hover:-translate-y-0.5"
          >
            <Wand2 className="h-4 w-4" /> {t("compressCta", "Comprimir mídia")}
          </Link>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center justify-center rounded-full border-2 border-[#0B0B0D]/40 px-4 py-2.5 text-sm font-bold text-[#0B0B0D] transition hover:border-[#0B0B0D]"
          >
            {t("chooseAnother", "Escolher outro arquivo")}
          </button>
        </div>
      </div>
    </div>
  )
}
