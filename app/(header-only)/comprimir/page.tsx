"use client"

// Ferramenta "Comprimir mídia" (tabloide). v1: imagem comprimida no navegador
// (sem subir nada) + download. A pessoa baixa o arquivo menor e posta depois.
// Vídeo (estúdio temporário no servidor com expiração em 3h) entra na próxima
// slice — a aba aparece desabilitada ("em breve") só pra sinalizar o roadmap.

import { useCallback, useRef, useState } from "react"
import { ArrowDownToLine, ImageIcon, Loader2, RotateCcw, UploadCloud, Video, X } from "lucide-react"
import { PageShell, Section } from "@/components/tabloide"
import { compressImage } from "@/lib/media/compress-image"
import { formatBytes } from "@/lib/media/media-validation"
import { useTranslations } from "@/components/i18n/I18nProvider"
import { cn } from "@/lib/utils"

const ACCEPTED = ["image/jpeg", "image/png", "image/webp"]
const MAX_INPUT = 40 * 1024 * 1024 // teto de entrada da imagem (browser)
const TARGET_BYTES = 2 * 1024 * 1024 // alvo de saída (suficiente p/ qualquer superfície)

type Result = {
  url: string
  blob: Blob
  fileName: string
  width: number
  height: number
  originalBytes: number
}

export default function ComprimirPage() {
  const t = useTranslations("Compress")
  const [tab, setTab] = useState<"image" | "video">("image")
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [dragging, setDragging] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<Result | null>(null)

  const reset = useCallback(() => {
    setResult((prev) => {
      if (prev) URL.revokeObjectURL(prev.url)
      return null
    })
    setError(null)
  }, [])

  const handleFile = useCallback(
    async (file: File) => {
      setError(null)
      if (!ACCEPTED.includes(file.type.toLowerCase())) {
        setError(t("errFormat", "Formato não aceito. Envie JPG, PNG ou WebP."))
        return
      }
      if (file.size > MAX_INPUT) {
        setError(t("errTooBig", "Imagem grande demais para comprimir aqui (máx. 40MB)."))
        return
      }
      setBusy(true)
      try {
        const out = await compressImage(file, TARGET_BYTES)
        setResult({
          url: URL.createObjectURL(out.blob),
          blob: out.blob,
          fileName: out.fileName,
          width: out.width,
          height: out.height,
          originalBytes: file.size,
        })
      } catch (e) {
        setError(e instanceof Error ? e.message : t("errGeneric", "Não deu pra comprimir essa imagem."))
      } finally {
        setBusy(false)
      }
    },
    [t],
  )

  const onSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (f) void handleFile(f)
    e.target.value = ""
  }

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    if (busy) return
    const f = e.dataTransfer.files?.[0]
    if (f) void handleFile(f)
  }

  const download = () => {
    if (!result) return
    const a = document.createElement("a")
    a.href = result.url
    a.download = result.fileName
    document.body.appendChild(a)
    a.click()
    a.remove()
  }

  const saved =
    result && result.originalBytes > 0
      ? Math.max(0, Math.round((1 - result.blob.size / result.originalBytes) * 100))
      : 0

  return (
    <PageShell>
      <Section className="py-10 sm:py-14">
        <div className="mx-auto max-w-2xl">
          <p className="mb-3 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.3em] text-[#F2B705]">
            {t("eyebrow", "Ferramenta")}
          </p>
          <h1 className="fl-display text-4xl leading-[0.95] text-[#F5F1E8] sm:text-5xl">
            {t("title", "Comprimir mídia")}
          </h1>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-[#C9C2B6]">
            {t(
              "subtitle",
              "Deixe sua imagem mais leve para postar sem estourar o limite. Tudo acontece no seu aparelho — depois é só baixar e postar.",
            )}
          </p>

          {/* Abas */}
          <div className="mt-8 flex gap-2">
            <button
              type="button"
              onClick={() => setTab("image")}
              className={cn(
                "inline-flex items-center gap-2 rounded-full border-2 px-4 py-2 text-sm font-bold transition",
                tab === "image"
                  ? "border-[#F2B705] bg-[#F2B705] text-[#1A1505]"
                  : "border-[#F5F1E8]/20 text-[#C9C2B6] hover:border-[#F5F1E8]/40",
              )}
            >
              <ImageIcon className="h-4 w-4" /> {t("tabImage", "Imagem")}
            </button>
            <button
              type="button"
              disabled
              className="inline-flex cursor-not-allowed items-center gap-2 rounded-full border-2 border-[#F5F1E8]/10 px-4 py-2 text-sm font-bold text-[#C9C2B6]/40"
            >
              <Video className="h-4 w-4" /> {t("tabVideo", "Vídeo")}
              <span className="rounded-full bg-[#F5F1E8]/10 px-2 py-0.5 text-[10px] uppercase tracking-wide">
                {t("soon", "em breve")}
              </span>
            </button>
          </div>

          {/* Card */}
          <div className="mt-5 rounded-2xl border-2 border-[#0B0B0D] bg-[#F1EDE2] p-5 shadow-[8px_8px_0_0_#0B0B0D] sm:p-6">
            {!result ? (
              <>
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => !busy && inputRef.current?.click()}
                  onKeyDown={(e) => {
                    if ((e.key === "Enter" || e.key === " ") && !busy) {
                      e.preventDefault()
                      inputRef.current?.click()
                    }
                  }}
                  onDragOver={(e) => {
                    e.preventDefault()
                    if (!busy) setDragging(true)
                  }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={onDrop}
                  aria-disabled={busy}
                  className={cn(
                    "flex min-h-[200px] cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-6 py-10 text-center transition",
                    dragging ? "border-[#16B79A] bg-[#16B79A]/10" : "border-[#0B0B0D]/30 hover:border-[#0B0B0D]/60",
                    busy && "cursor-wait opacity-70",
                  )}
                >
                  {busy ? (
                    <Loader2 className="h-9 w-9 animate-spin text-[#0B0B0D]" />
                  ) : (
                    <span className="inline-flex h-12 w-12 items-center justify-center rounded-full border-2 border-[#0B0B0D] bg-[#F2B705]">
                      <UploadCloud className="h-5 w-5 text-[#1A1505]" />
                    </span>
                  )}
                  <p className="text-sm font-bold text-[#0B0B0D]">
                    {busy ? t("compressing", "Comprimindo…") : t("dropHere", "Arraste a imagem ou clique para escolher")}
                  </p>
                  <p className="text-[11px] text-[#6B6457]">{t("formatsHint", "JPG, PNG ou WebP · até 40MB")}</p>
                </div>
                {error && (
                  <div className="mt-3 flex items-start gap-2 rounded-lg border-2 border-[#C0392B] bg-[#C0392B]/10 px-3 py-2">
                    <X className="mt-0.5 h-4 w-4 shrink-0 text-[#C0392B]" />
                    <p className="text-xs font-bold text-[#0B0B0D]">{error}</p>
                  </div>
                )}
                <input
                  ref={inputRef}
                  type="file"
                  accept={ACCEPTED.join(",")}
                  onChange={onSelect}
                  className="hidden"
                />
              </>
            ) : (
              <div>
                <div className="overflow-hidden rounded-xl border-2 border-[#0B0B0D] bg-black">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={result.url} alt="" className="max-h-[340px] w-full object-contain" />
                </div>

                <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-lg border-2 border-[#0B0B0D]/15 bg-white/60 px-2 py-2">
                    <p className="text-[10px] font-extrabold uppercase tracking-wide text-[#6B6457]">{t("before", "Antes")}</p>
                    <p className="text-sm font-black text-[#0B0B0D]">{formatBytes(result.originalBytes)}</p>
                  </div>
                  <div className="rounded-lg border-2 border-[#16B79A] bg-[#16B79A]/10 px-2 py-2">
                    <p className="text-[10px] font-extrabold uppercase tracking-wide text-[#00876B]">{t("after", "Depois")}</p>
                    <p className="text-sm font-black text-[#00876B]">{formatBytes(result.blob.size)}</p>
                  </div>
                  <div className="rounded-lg border-2 border-[#0B0B0D]/15 bg-white/60 px-2 py-2">
                    <p className="text-[10px] font-extrabold uppercase tracking-wide text-[#6B6457]">{t("saved", "Economia")}</p>
                    <p className="text-sm font-black text-[#0B0B0D]">{saved}%</p>
                  </div>
                </div>
                <p className="mt-2 text-center text-[11px] text-[#6B6457]">
                  {result.width}×{result.height}px · WebP
                </p>

                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={download}
                    className="inline-flex flex-1 items-center justify-center gap-2 rounded-full border-2 border-[#0B0B0D] bg-[#F2B705] px-4 py-2.5 text-sm font-extrabold text-[#1A1505] shadow-[4px_4px_0_0_#0B0B0D] transition hover:-translate-y-0.5"
                  >
                    <ArrowDownToLine className="h-4 w-4" /> {t("download", "Baixar imagem")}
                  </button>
                  <button
                    type="button"
                    onClick={reset}
                    className="inline-flex items-center justify-center gap-2 rounded-full border-2 border-[#0B0B0D]/40 px-4 py-2.5 text-sm font-bold text-[#0B0B0D] transition hover:border-[#0B0B0D]"
                  >
                    <RotateCcw className="h-4 w-4" /> {t("another", "Outra imagem")}
                  </button>
                </div>
                <p className="mt-3 text-center text-[11px] text-[#6B6457]">
                  {t("postHint", "Agora é só baixar e enviar esse arquivo no lugar do original.")}
                </p>
              </div>
            )}
          </div>
        </div>
      </Section>
    </PageShell>
  )
}
