"use client"

import { useCallback, useRef, useState } from "react"
import {
  Video,
  VideoOff,
  Loader2,
  AlertTriangle,
  UploadCloud,
  Trash2,
  RefreshCw,
} from "lucide-react"
import type { CourseLesson } from "@/hooks/use-module-lessons"
import { useTranslations } from "@/components/i18n/I18nProvider"

type Translator = (key: string, fallback: string) => string

interface Props {
  lesson: CourseLesson
  onUpload: (
    file: File,
    onProgress?: (ratio: number) => void,
  ) => Promise<CourseLesson>
  onRemove: () => Promise<CourseLesson>
}

const ACCEPTED_MIME = ["video/mp4", "video/quicktime", "video/webm"]
const ACCEPTED_HINT = ".mp4, .mov, .webm"
const MAX_BYTES = 100 * 1024 * 1024

function validateFile(file: File, t: Translator): string | null {
  if (!ACCEPTED_MIME.includes(file.type.toLowerCase())) {
    return t("videoFormatRejected", "Formato não aceito. Envie MP4, MOV ou WebM.")
  }
  if (file.size > MAX_BYTES) {
    return t("videoTooLarge", "Arquivo maior que 100MB. Comprima antes de enviar.")
  }
  return null
}

function formatPercent(ratio: number): string {
  return `${Math.min(100, Math.max(0, Math.round(ratio * 100)))}%`
}

export function LessonVideoPlaceholder({ lesson, onUpload, onRemove }: Props) {
  const t = useTranslations("Account")
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [progress, setProgress] = useState(0)
  const [localError, setLocalError] = useState<string | null>(null)
  const [removing, setRemoving] = useState(false)

  const startUpload = useCallback(
    async (file: File) => {
      setLocalError(null)
      const err = validateFile(file, t)
      if (err) {
        setLocalError(err)
        return
      }
      try {
        setProgress(0)
        await onUpload(file, (ratio) => setProgress(ratio))
      } catch (e) {
        setLocalError(e instanceof Error ? e.message : t("uploadFailed", "Falha no envio"))
      } finally {
        setProgress(0)
      }
    },
    [onUpload, t],
  )

  const handleDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault()
      setIsDragging(false)
      const file = event.dataTransfer.files?.[0]
      if (file) void startUpload(file)
    },
    [startUpload],
  )

  const handleSelect = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0]
      if (file) void startUpload(file)
      // Permite re-selecionar o mesmo arquivo se necessário
      event.target.value = ""
    },
    [startUpload],
  )

  const handleRemove = useCallback(async () => {
    if (removing) return
    setLocalError(null)
    setRemoving(true)
    try {
      await onRemove()
    } catch (e) {
      setLocalError(e instanceof Error ? e.message : t("removeFailed", "Falha ao remover"))
    } finally {
      setRemoving(false)
    }
  }, [removing, onRemove, t])

  const status = lesson.video_status
  const previewUrl =
    lesson.processed_video_url || lesson.original_video_url || null

  // -----------------------------------------------------------------
  // Estado: uploading
  // -----------------------------------------------------------------
  if (status === "uploading") {
    return (
      <section className="overflow-hidden rounded-[2rem] border border-white/[0.07] bg-gradient-to-b from-white/[0.04] to-white/[0.01] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
        <div className="relative aspect-video w-full bg-zinc-950/80">
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-center">
            <UploadCloud className="h-9 w-9 animate-pulse text-sky-300" />
            <p className="text-sm font-semibold text-white">
              {t("uploadingVideo", "Enviando vídeo...")} {formatPercent(progress)}
            </p>
            <div className="mx-auto h-1.5 w-56 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full bg-sky-400 transition-[width] duration-150"
                style={{ width: formatPercent(progress) }}
              />
            </div>
            <p className="text-[11px] text-white/45">
              {t("dontCloseTab", "Não feche esta aba até o envio terminar.")}
            </p>
          </div>
        </div>
      </section>
    )
  }

  // -----------------------------------------------------------------
  // Estado: processing sem preview — bytes já enviados, ffmpeg rodando
  // -----------------------------------------------------------------
  if (status === "processing" && !previewUrl) {
    return (
      <section className="overflow-hidden rounded-[2rem] border border-white/[0.07] bg-gradient-to-b from-white/[0.04] to-white/[0.01] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
        <div className="relative aspect-video w-full bg-zinc-950/80">
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-6 text-center">
            <Loader2 className="h-9 w-9 animate-spin text-sky-300" />
            <p className="text-sm font-semibold text-white">
              {t("processingVideo", "Processando vídeo...")}
            </p>
            <p className="mx-auto max-w-md text-xs text-white/55">
              {t(
                "processingVideoDesc",
                "Padronizando em 4:5 e gerando a capa. Isso pode levar alguns minutos dependendo do tamanho. Não feche esta aba.",
              )}
            </p>
          </div>
        </div>
      </section>
    )
  }

  // -----------------------------------------------------------------
  // Estado: processing / ready — preview com player + ações
  // -----------------------------------------------------------------
  if ((status === "processing" || status === "ready") && previewUrl) {
    return (
      <section className="overflow-hidden rounded-[2rem] border border-white/[0.07] bg-gradient-to-b from-white/[0.04] to-white/[0.01] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
        <div className="relative aspect-video w-full bg-black">
          <video
            key={previewUrl}
            src={previewUrl}
            controls
            playsInline
            preload="metadata"
            poster={lesson.thumbnail_url || undefined}
            className="h-full w-full object-contain"
          />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/[0.06] px-5 py-3">
          <div className="inline-flex items-center gap-2 text-[12px] text-white/65">
            <Video className="h-3.5 w-3.5 text-primary/80" />
            {status === "processing" ? (
              <span className="inline-flex items-center gap-1.5">
                <Loader2 className="h-3 w-3 animate-spin text-sky-300" />
                {t("processingPreviewAvailable", "Processando 4:5 — preview do original disponível")}
              </span>
            ) : (
              <span>{t("videoReady", "Vídeo pronto")}</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="inline-flex items-center gap-1.5 rounded-full border border-white/12 bg-white/[0.04] px-3 py-1.5 text-[12px] font-medium text-white/85 transition hover:border-white/25 hover:text-white"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              {t("changeVideo", "Trocar vídeo")}
            </button>
            <button
              type="button"
              onClick={handleRemove}
              disabled={removing}
              className="inline-flex items-center gap-1.5 rounded-full border border-red-400/25 bg-red-500/10 px-3 py-1.5 text-[12px] font-medium text-red-200 transition hover:bg-red-500/15 disabled:opacity-50"
            >
              <Trash2 className="h-3.5 w-3.5" />
              {removing ? t("removingShort", "Removendo...") : t("remove", "Remover")}
            </button>
          </div>
        </div>
        {localError && (
          <div className="border-t border-red-500/20 bg-red-500/10 px-5 py-2 text-xs text-red-200">
            {localError}
          </div>
        )}
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_HINT}
          onChange={handleSelect}
          className="hidden"
        />
      </section>
    )
  }

  // -----------------------------------------------------------------
  // Estado: empty / error — dropzone ativo
  // -----------------------------------------------------------------
  const isError = status === "error"

  return (
    <section className="overflow-hidden rounded-[2rem] border border-white/[0.07] bg-gradient-to-b from-white/[0.04] to-white/[0.01] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
      <div
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault()
            inputRef.current?.click()
          }
        }}
        onDragOver={(e) => {
          e.preventDefault()
          setIsDragging(true)
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={`relative flex aspect-video w-full cursor-pointer flex-col items-center justify-center gap-3 bg-zinc-950/80 text-center transition ${
          isDragging
            ? "bg-primary/10 ring-2 ring-inset ring-primary/40"
            : "hover:bg-white/[0.03]"
        }`}
      >
        {isError ? (
          <AlertTriangle className="h-9 w-9 text-red-300" />
        ) : (
          <UploadCloud
            className={`h-9 w-9 transition ${
              isDragging ? "text-primary" : "text-white/40"
            }`}
          />
        )}
        <div>
          <p className="text-sm font-semibold text-white">
            {isError
              ? t("lastUploadFailed", "Algo deu errado no último envio")
              : t("dragVideoHere", "Arraste o vídeo aqui ou clique para selecionar")}
          </p>
          <p className="mt-1 text-xs text-white/55">
            {t("videoFormatsHint", "MP4, MOV ou WebM · até 100MB")}
          </p>
        </div>
        {isError && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-red-500/15 px-3 py-1 text-[11px] font-medium text-red-200">
            <VideoOff className="h-3 w-3" />
            {t("tryUploadAgain", "Tente enviar novamente")}
          </span>
        )}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/[0.06] px-5 py-3">
        <div className="inline-flex items-center gap-2 text-[12px] text-white/55">
          <Video className="h-3.5 w-3.5 text-primary/70" />
          {t("lessonVideo", "Vídeo da aula")}
        </div>
        <span className="rounded-full bg-white/[0.06] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white/45">
          {t("videoProcessingBadge", "Processamento 4:5")}
        </span>
      </div>
      {localError && (
        <div className="border-t border-red-500/20 bg-red-500/10 px-5 py-2 text-xs text-red-200">
          {localError}
        </div>
      )}
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_HINT}
        onChange={handleSelect}
        className="hidden"
      />
    </section>
  )
}
