"use client"

// Modal amigável de "arquivo muito grande".
//
// ⚠️ O botão principal COMPRIME DE VERDADE quando quem abre o modal entrega o
// arquivo (`file`) e um destino (`onCompressed`) — a pessoa já escolheu a foto,
// mandá-la para outra aba refazer a escolha, baixar e voltar é o mesmo que não
// comprimir. O link para /comprimir fica como saída de VÍDEO (que o navegador
// não comprime) e de imagem que a compressão local não deu conta.

import { useState } from "react"
import Link from "next/link"
import { AlertTriangle, Loader2, Wand2, X } from "lucide-react"
import { useTranslations } from "@/components/i18n/I18nProvider"
import { compressImage } from "@/lib/media/compress-image"
import { formatBytes } from "@/lib/media/media-validation"

export function OversizeModal({
  open,
  onClose,
  limitLabel,
  file,
  targetBytes,
  onCompressed,
}: {
  open: boolean
  onClose: () => void
  /** Rótulo do limite da superfície, ex.: "100MB". */
  limitLabel: string
  /** Arquivo que a pessoa acabou de escolher. Com ele + `onCompressed`, o
   *  botão comprime aqui mesmo em vez de mandar para /comprimir. */
  file?: File | null
  /** Alvo da compressão em bytes. Default: o que couber em 2MB. */
  targetBytes?: number
  /** Recebe a versão comprimida e segue o fluxo de quem abriu o modal. */
  onCompressed?: (file: File) => void
}) {
  const t = useTranslations("Compress")
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState(false)

  // Vídeo não comprime no navegador; imagem sim.
  const canCompressHere = !!file && !!onCompressed && file.type.toLowerCase().startsWith("image/") && !failed

  if (!open) return null

  const close = () => {
    if (busy) return
    setFailed(false)
    onClose()
  }

  const compressHere = async () => {
    if (!file || !onCompressed) return
    setBusy(true)
    try {
      const out = await compressImage(file, targetBytes ?? 2 * 1024 * 1024)
      const compressed = new File([out.blob], out.fileName, { type: out.blob.type || "image/webp" })
      setFailed(false)
      onCompressed(compressed)
    } catch {
      // Sem alarde: a saída passa a ser a ferramenta completa.
      setFailed(true)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-[140] flex items-center justify-center bg-black/70 p-4"
      onClick={close}
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
          onClick={close}
          disabled={busy}
          aria-label={t("close", "Fechar")}
          className="absolute right-3 top-3 rounded-full p-1.5 text-[#0B0B0D]/50 transition hover:bg-[#0B0B0D]/10 hover:text-[#0B0B0D] disabled:opacity-40"
        >
          <X className="h-5 w-5" />
        </button>

        <span className="inline-flex h-11 w-11 items-center justify-center rounded-full border-2 border-[#0B0B0D] bg-[#F2B705]">
          <AlertTriangle className="h-5 w-5 text-[#1A1505]" />
        </span>
        <h2 className="fl-display mt-3 text-2xl text-[#0B0B0D]">{t("oversizeTitle", "Arquivo muito grande")}</h2>
        <p className="mt-2 text-sm text-[#3a352c]">
          {(canCompressHere
            ? t("oversizeBodyHere", "O limite aqui é {limit}. Dá pra deixar esse arquivo mais leve agora mesmo.")
            : t("oversizeBody", "O limite aqui é {limit}. Comprima o arquivo e poste a versão menor.")
          ).replace("{limit}", limitLabel)}
        </p>
        {file && (
          <p className="mt-1 text-[11px] font-bold text-[#6B6457]">
            {file.name} · {formatBytes(file.size)}
          </p>
        )}
        {failed && (
          <p className="mt-2 text-xs font-bold text-[#C0392B]">
            {t("errGeneric", "Não deu pra comprimir essa imagem.")}
          </p>
        )}

        <div className="mt-5 flex flex-col gap-2">
          {canCompressHere ? (
            <button
              type="button"
              onClick={compressHere}
              disabled={busy}
              className="inline-flex items-center justify-center gap-2 rounded-full border-2 border-[#0B0B0D] bg-[#F2B705] px-4 py-2.5 text-sm font-extrabold text-[#1A1505] shadow-[4px_4px_0_0_#0B0B0D] transition hover:-translate-y-0.5 disabled:translate-y-0 disabled:opacity-70"
            >
              {busy ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> {t("compressing", "Comprimindo…")}
                </>
              ) : (
                <>
                  <Wand2 className="h-4 w-4" /> {t("compressNow", "Comprimir agora")}
                </>
              )}
            </button>
          ) : (
            <Link
              href="/comprimir"
              target="_blank"
              className="inline-flex items-center justify-center gap-2 rounded-full border-2 border-[#0B0B0D] bg-[#F2B705] px-4 py-2.5 text-sm font-extrabold text-[#1A1505] shadow-[4px_4px_0_0_#0B0B0D] transition hover:-translate-y-0.5"
            >
              <Wand2 className="h-4 w-4" /> {t("compressCta", "Comprimir mídia")}
            </Link>
          )}
          <button
            type="button"
            onClick={close}
            disabled={busy}
            className="inline-flex items-center justify-center rounded-full border-2 border-[#0B0B0D]/40 px-4 py-2.5 text-sm font-bold text-[#0B0B0D] transition hover:border-[#0B0B0D] disabled:opacity-40"
          >
            {t("chooseAnother", "Escolher outro arquivo")}
          </button>
        </div>
      </div>
    </div>
  )
}
