"use client"

// Ferramenta "Comprimir mídia" (tabloide).
// - Imagem: comprimida 100% no navegador (nada sobe) → download.
// - Vídeo: sobe direto pro R2 (presigned PUT) → backend roda ffmpeg em estúdio
//   temporário (temp-compress/, expira em ~3h) → link de download. Requer login.

import { useCallback, useRef, useState } from "react"
import { ArrowDownToLine, ImageIcon, Loader2, LogIn, RotateCcw, UploadCloud, Video, X } from "lucide-react"
import Link from "next/link"
import { PageShell, Section } from "@/components/tabloide"
import { compressImage } from "@/lib/media/compress-image"
import { compressVideo, isAllowedVideo, MAX_VIDEO_INPUT_BYTES, type CompressResult } from "@/lib/media/compress-video"
import { formatBytes } from "@/lib/media/media-validation"
import { getToken } from "@/lib/auth"
import { useTranslations } from "@/components/i18n/I18nProvider"
import { cn } from "@/lib/utils"

const IMG_ACCEPTED = ["image/jpeg", "image/png", "image/webp"]
const VIDEO_ACCEPTED = ["video/mp4", "video/webm", "video/quicktime"]
const IMG_MAX_INPUT = 40 * 1024 * 1024
const TARGET_BYTES = 2 * 1024 * 1024

type ImageResult = {
  url: string
  blob: Blob
  fileName: string
  width: number
  height: number
  originalBytes: number
}

type VideoPhase = "idle" | "uploading" | "processing" | "done" | "error"

export default function ComprimirPage() {
  const t = useTranslations("Compress")
  const [tab, setTab] = useState<"image" | "video">("image")

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
              onClick={() => setTab("video")}
              className={cn(
                "inline-flex items-center gap-2 rounded-full border-2 px-4 py-2 text-sm font-bold transition",
                tab === "video"
                  ? "border-[#F2B705] bg-[#F2B705] text-[#1A1505]"
                  : "border-[#F5F1E8]/20 text-[#C9C2B6] hover:border-[#F5F1E8]/40",
              )}
            >
              <Video className="h-4 w-4" /> {t("tabVideo", "Vídeo")}
            </button>
          </div>

          {tab === "image" ? <ImagePanel /> : <VideoPanel />}
        </div>
      </Section>
    </PageShell>
  )
}

// ─── Imagem (no navegador) ───────────────────────────────────────────────────
function ImagePanel() {
  const t = useTranslations("Compress")
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [dragging, setDragging] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<ImageResult | null>(null)

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
      if (!IMG_ACCEPTED.includes(file.type.toLowerCase())) {
        setError(t("errFormat", "Formato não aceito. Envie JPG, PNG ou WebP."))
        return
      }
      if (file.size > IMG_MAX_INPUT) {
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
          {error && <ErrorBox>{error}</ErrorBox>}
          <input ref={inputRef} type="file" accept={IMG_ACCEPTED.join(",")} onChange={onSelect} className="hidden" />
        </>
      ) : (
        <div>
          <div className="overflow-hidden rounded-xl border-2 border-[#0B0B0D] bg-black">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={result.url} alt="" className="max-h-[340px] w-full object-contain" />
          </div>

          <Stats originalBytes={result.originalBytes} outputBytes={result.blob.size} saved={saved} />
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
  )
}

// ─── Vídeo (no servidor, temporário) ─────────────────────────────────────────
function VideoPanel() {
  const t = useTranslations("Compress")
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [dragging, setDragging] = useState(false)
  const [phase, setPhase] = useState<VideoPhase>("idle")
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<CompressResult | null>(null)

  const busy = phase === "uploading" || phase === "processing"

  const reset = useCallback(() => {
    setResult(null)
    setError(null)
    setProgress(0)
    setPhase("idle")
  }, [])

  const handleFile = useCallback(async (file: File) => {
    setError(null)
    if (!isAllowedVideo(file.type)) {
      setError(t("errVideoFormat", "Formato de vídeo não aceito. Envie MP4, WebM ou MOV."))
      return
    }
    if (file.size > MAX_VIDEO_INPUT_BYTES) {
      setError(t("errVideoTooBig", "Vídeo grande demais (máx. 500MB)."))
      return
    }
    const token = getToken()
    if (!token) {
      setError(t("errLogin", "Entre na sua conta para comprimir vídeos."))
      return
    }

    setProgress(0)
    setPhase("uploading")
    try {
      const out = await compressVideo({
        token,
        file,
        onUploadProgress: (f) => {
          setProgress(Math.round(f * 100))
          if (f >= 1) setPhase("processing")
        },
      })
      setResult(out)
      setPhase("done")
    } catch (e) {
      setError(e instanceof Error ? e.message : t("errVideoGeneric", "Não deu pra comprimir esse vídeo."))
      setPhase("error")
    }
  }, [t])

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

  const isLoggedOut = typeof window !== "undefined" && !getToken()

  return (
    <div className="mt-5 rounded-2xl border-2 border-[#0B0B0D] bg-[#F1EDE2] p-5 shadow-[8px_8px_0_0_#0B0B0D] sm:p-6">
      {phase === "done" && result ? (
        <div>
          <div className="rounded-xl border-2 border-[#16B79A] bg-[#16B79A]/10 px-4 py-5 text-center">
            <p className="text-sm font-black uppercase tracking-wide text-[#00876B]">
              {t("videoDone", "Vídeo comprimido!")}
            </p>
          </div>
          <Stats originalBytes={result.original_bytes} outputBytes={result.size_bytes} saved={result.saved_percent} />
          <div className="mt-4 flex flex-wrap gap-2">
            <a
              href={result.download_url}
              download
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-full border-2 border-[#0B0B0D] bg-[#F2B705] px-4 py-2.5 text-sm font-extrabold text-[#1A1505] shadow-[4px_4px_0_0_#0B0B0D] transition hover:-translate-y-0.5"
            >
              <ArrowDownToLine className="h-4 w-4" /> {t("downloadVideo", "Baixar vídeo")}
            </a>
            <button
              type="button"
              onClick={reset}
              className="inline-flex items-center justify-center gap-2 rounded-full border-2 border-[#0B0B0D]/40 px-4 py-2.5 text-sm font-bold text-[#0B0B0D] transition hover:border-[#0B0B0D]"
            >
              <RotateCcw className="h-4 w-4" /> {t("anotherVideo", "Outro vídeo")}
            </button>
          </div>
          <p className="mt-3 text-center text-[11px] text-[#6B6457]">
            {t("videoExpireHint", "O link fica disponível por cerca de 3 horas. Baixe agora e poste no lugar do original.")}
          </p>
        </div>
      ) : (
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
              <>
                <Loader2 className="h-9 w-9 animate-spin text-[#0B0B0D]" />
                <p className="text-sm font-bold text-[#0B0B0D]">
                  {phase === "uploading"
                    ? `${t("uploading", "Enviando…")} ${progress}%`
                    : t("processing", "Comprimindo no servidor… isso pode levar alguns minutos.")}
                </p>
                {phase === "uploading" && (
                  <div className="mt-1 h-2 w-full max-w-xs overflow-hidden rounded-full bg-[#0B0B0D]/10">
                    <div className="h-full rounded-full bg-[#16B79A] transition-all" style={{ width: `${progress}%` }} />
                  </div>
                )}
              </>
            ) : (
              <>
                <span className="inline-flex h-12 w-12 items-center justify-center rounded-full border-2 border-[#0B0B0D] bg-[#F2B705]">
                  <UploadCloud className="h-5 w-5 text-[#1A1505]" />
                </span>
                <p className="text-sm font-bold text-[#0B0B0D]">
                  {t("dropVideoHere", "Arraste o vídeo ou clique para escolher")}
                </p>
                <p className="text-[11px] text-[#6B6457]">{t("videoFormatsHint", "MP4, WebM ou MOV · até 500MB")}</p>
              </>
            )}
          </div>

          {isLoggedOut && !busy && (
            <Link
              href="/login"
              className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-full border-2 border-[#0B0B0D]/40 px-4 py-2 text-sm font-bold text-[#0B0B0D] transition hover:border-[#0B0B0D]"
            >
              <LogIn className="h-4 w-4" /> {t("loginToCompress", "Entrar para comprimir vídeos")}
            </Link>
          )}

          {error && <ErrorBox>{error}</ErrorBox>}
          <input ref={inputRef} type="file" accept={VIDEO_ACCEPTED.join(",")} onChange={onSelect} className="hidden" />

          <p className="mt-3 text-[11px] leading-relaxed text-[#6B6457]">
            {t(
              "videoPrivacyHint",
              "O vídeo sobe para um estúdio temporário só para a compressão e é apagado automaticamente em cerca de 3 horas.",
            )}
          </p>
        </>
      )}
    </div>
  )
}

// ─── Compartilhados ──────────────────────────────────────────────────────────
function Stats({ originalBytes, outputBytes, saved }: { originalBytes: number; outputBytes: number; saved: number }) {
  const t = useTranslations("Compress")
  return (
    <div className="mt-4 grid grid-cols-3 gap-2 text-center">
      <div className="rounded-lg border-2 border-[#0B0B0D]/15 bg-white/60 px-2 py-2">
        <p className="text-[10px] font-extrabold uppercase tracking-wide text-[#6B6457]">{t("before", "Antes")}</p>
        <p className="text-sm font-black text-[#0B0B0D]">{formatBytes(originalBytes)}</p>
      </div>
      <div className="rounded-lg border-2 border-[#16B79A] bg-[#16B79A]/10 px-2 py-2">
        <p className="text-[10px] font-extrabold uppercase tracking-wide text-[#00876B]">{t("after", "Depois")}</p>
        <p className="text-sm font-black text-[#00876B]">{formatBytes(outputBytes)}</p>
      </div>
      <div className="rounded-lg border-2 border-[#0B0B0D]/15 bg-white/60 px-2 py-2">
        <p className="text-[10px] font-extrabold uppercase tracking-wide text-[#6B6457]">{t("saved", "Economia")}</p>
        <p className="text-sm font-black text-[#0B0B0D]">{saved}%</p>
      </div>
    </div>
  )
}

function ErrorBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-3 flex items-start gap-2 rounded-lg border-2 border-[#C0392B] bg-[#C0392B]/10 px-3 py-2">
      <X className="mt-0.5 h-4 w-4 shrink-0 text-[#C0392B]" />
      <p className="text-xs font-bold text-[#0B0B0D]">{children}</p>
    </div>
  )
}
