"use client"

import { useCallback, useRef, useState } from "react"
import { ImagePlus, Loader2, RefreshCw, Trash2, Upload } from "lucide-react"
import { cn } from "@/lib/utils"
import { OversizeModal } from "@/components/media/oversize-modal"
import { UPLOAD_LIMITS } from "@/lib/media/upload-limits"

const ACCEPTED_MIMES = new Set(["image/jpeg", "image/png", "image/webp"])
const MAX_BYTES = 12 * 1024 * 1024

interface Props {
  currentUrl?: string | null
  /**
   * Proporção visual do contêiner. "16/9" para banner, "4/5" para card de aula.
   */
  aspect?: string
  /** Texto principal exibido na zona vazia. */
  title?: string
  /** Subtítulo / dicas de formato. */
  hint?: string
  /** Texto pequeno opcional acima do título (ex.: "Banner do curso"). */
  label?: string
  /** Realiza o upload e retorna a nova URL. */
  onUpload: (file: File) => Promise<string | void>
  /** Remove a imagem atual. Opcional. */
  onRemove?: () => Promise<void> | void
  /** Permite reset/troca. Default true quando há imagem. */
  className?: string
  disabled?: boolean
}

export function ImageDropZone({
  currentUrl,
  aspect = "16/9",
  title = "Arraste ou envie uma imagem",
  hint = "JPG, PNG ou WebP · até 12MB",
  label,
  onUpload,
  onRemove,
  className,
  disabled = false,
}: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [dragging, setDragging] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [oversize, setOversize] = useState(false)

  const validate = useCallback((file: File): string | null => {
    if (!ACCEPTED_MIMES.has(file.type.toLowerCase())) {
      return "Formato não aceito. Envie JPG, PNG ou WebP."
    }
    return null
  }, [])

  const handleFile = useCallback(
    async (file: File) => {
      // Arquivo grande → modal amigável com atalho pra /comprimir.
      if (file.size > MAX_BYTES) {
        setOversize(true)
        return
      }
      const err = validate(file)
      if (err) {
        setError(err)
        return
      }
      setBusy(true)
      setError(null)
      try {
        await onUpload(file)
      } catch (e) {
        setError(e instanceof Error ? e.message : "Falha no envio")
      } finally {
        setBusy(false)
      }
    },
    [onUpload, validate],
  )

  const onDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault()
      setDragging(false)
      if (disabled || busy) return
      const file = e.dataTransfer.files?.[0]
      if (file) void handleFile(file)
    },
    [disabled, busy, handleFile],
  )

  const onSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) void handleFile(file)
      e.target.value = ""
    },
    [handleFile],
  )

  const handleRemove = useCallback(async () => {
    if (!onRemove || busy) return
    setBusy(true)
    setError(null)
    try {
      await onRemove()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao remover")
    } finally {
      setBusy(false)
    }
  }, [onRemove, busy])

  const hasImage = !!currentUrl

  return (
    <div className={cn("w-full", className)}>
      <div
        onDragOver={(e) => {
          e.preventDefault()
          if (!disabled && !busy) setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => !disabled && !busy && inputRef.current?.click()}
        role="button"
        tabIndex={0}
        aria-disabled={disabled || busy}
        className={cn(
          "group relative w-full overflow-hidden rounded-[1.5rem] border border-white/10 bg-zinc-950 text-white transition",
          hasImage
            ? "cursor-pointer hover:border-primary/40"
            : "cursor-pointer border-dashed bg-[radial-gradient(circle_at_top,rgba(230,184,0,0.08),transparent_60%),rgba(255,255,255,0.02)] hover:border-primary/40 hover:bg-white/[0.04]",
          dragging && "border-primary/55 bg-primary/[0.08]",
          (disabled || busy) && "cursor-not-allowed opacity-80",
        )}
        style={{ aspectRatio: aspect }}
      >
        {hasImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={currentUrl!}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-6 text-center">
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-white/[0.04]">
              {busy ? (
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
              ) : (
                <ImagePlus className="h-5 w-5 text-primary" />
              )}
            </span>
            {label && (
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-primary/85">
                {label}
              </p>
            )}
            <p className="text-sm font-semibold text-white/90">{title}</p>
            <p className="text-[11px] text-white/45">{hint}</p>
          </div>
        )}

        {hasImage && (
          <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/0 to-black/35 opacity-0 transition group-hover:opacity-100" />
        )}

        {hasImage && (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 p-3 opacity-0 transition group-hover:opacity-100">
            <span className="pointer-events-auto inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-zinc-950/85 px-3 py-1 text-[11px] font-semibold text-white/85 backdrop-blur-sm">
              <RefreshCw className="h-3.5 w-3.5" />
              Trocar imagem
            </span>
            {onRemove && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  void handleRemove()
                }}
                disabled={busy}
                className="pointer-events-auto inline-flex items-center gap-1.5 rounded-full border border-red-500/35 bg-zinc-950/85 px-3 py-1 text-[11px] font-semibold text-red-200 backdrop-blur-sm transition hover:bg-red-500/15"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Remover
              </button>
            )}
          </div>
        )}

        {busy && hasImage && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/55">
            <Loader2 className="h-7 w-7 animate-spin text-primary" />
          </div>
        )}

        {dragging && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-primary/[0.12]">
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/35 bg-zinc-950/85 px-3 py-1 text-xs font-semibold text-primary">
              <Upload className="h-3.5 w-3.5" />
              Solte para enviar
            </span>
          </div>
        )}

        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={onSelect}
          className="hidden"
        />
      </div>

      {error && (
        <p className="mt-2 text-xs font-medium text-red-300">{error}</p>
      )}

      <OversizeModal open={oversize} onClose={() => setOversize(false)} limitLabel={UPLOAD_LIMITS.courseThumb.label} />
    </div>
  )
}
