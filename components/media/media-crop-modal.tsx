"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Crop, Loader2, RotateCcw, ZoomIn } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Slider } from "@/components/ui/slider"
import { cn } from "@/lib/utils"
import { useTranslations } from "@/components/i18n/I18nProvider"
import { cropImageToAspectRatio, type ProcessedImage } from "@/lib/media/image-processing"
import {
  formatBytes,
  nearestPostOrientation,
  POST_ORIENTATIONS,
  type PostOrientation,
} from "@/lib/media/media-validation"

type MediaCropModalProps = {
  file: File
  /** Em `post_image` é só o ponto de partida: o usuário troca entre 4:5, 1:1 e
   *  16:9 dentro do modal. Em avatar/site-asset a moldura é fixa neste valor. */
  aspectRatio: number
  outputWidth: number
  outputHeight: number
  maxSizeMB: number
  mediaType: "post_image" | "profile_avatar"
  title: string
  description: string
  onCancel: () => void
  onConfirm: (image: ProcessedImage) => void
}

type DragState = {
  startX: number
  startY: number
  originX: number
  originY: number
} | null

export function MediaCropModal({
  file,
  aspectRatio,
  outputWidth,
  outputHeight,
  maxSizeMB,
  mediaType,
  title,
  description,
  onCancel,
  onConfirm,
}: MediaCropModalProps) {
  const t = useTranslations("MediaCrop")
  const frameRef = useRef<HTMLDivElement | null>(null)
  const [previewUrl, setPreviewUrl] = useState("")
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 })
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [drag, setDrag] = useState<DragState>(null)
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState("")

  const label =
    mediaType === "profile_avatar"
      ? t("labelAvatar", "foto de perfil")
      : t("labelPost", "imagem do post")
  const maxSizeBytes = maxSizeMB * 1024 * 1024

  // Post aceita 3 orientações; avatar e imagem de site continuam com moldura
  // fixa (um avatar 16:9 não existe).
  const pickable = mediaType === "post_image"
  const [orientation, setOrientation] = useState<PostOrientation | null>(null)
  const frameRatio = pickable && orientation ? orientation.ratio : aspectRatio
  const frameWidthOut = pickable && orientation ? orientation.width : outputWidth
  const frameHeightOut = pickable && orientation ? orientation.height : outputHeight

  useEffect(() => {
    const url = URL.createObjectURL(file)
    setPreviewUrl(url)
    const img = new Image()
    img.onload = () => {
      setImageSize({ width: img.naturalWidth, height: img.naturalHeight })
      // Abre já na orientação mais próxima do arquivo: quem escolheu uma foto
      // deitada não deveria ter que perceber sozinho que dá pra trocar o chip.
      setOrientation(nearestPostOrientation(img.naturalWidth, img.naturalHeight))
    }
    img.src = url
    return () => URL.revokeObjectURL(url)
  }, [file])

  const ratioLabel = useMemo(() => {
    if (Math.abs(frameRatio - 1) < 0.001) return "1:1"
    if (Math.abs(frameRatio - 4 / 5) < 0.001) return "4:5"
    if (Math.abs(frameRatio - 16 / 9) < 0.001) return "16:9"
    return frameRatio.toFixed(2)
  }, [frameRatio])

  const clampPosition = (next: { x: number; y: number }, nextZoom = zoom) => {
    const frame = frameRef.current?.getBoundingClientRect()
    if (!frame || !imageSize.width || !imageSize.height) return next

    const imageRatio = imageSize.width / imageSize.height
    let baseWidth: number
    let baseHeight: number
    if (imageRatio > frameRatio) {
      baseHeight = frame.height
      baseWidth = frame.height * imageRatio
    } else {
      baseWidth = frame.width
      baseHeight = frame.width / imageRatio
    }

    const renderWidth = baseWidth * nextZoom
    const renderHeight = baseHeight * nextZoom
    const maxX = Math.max(0, (renderWidth - frame.width) / 2)
    const maxY = Math.max(0, (renderHeight - frame.height) / 2)

    return {
      x: Math.max(-maxX, Math.min(maxX, next.x)),
      y: Math.max(-maxY, Math.min(maxY, next.y)),
    }
  }

  const updateZoom = (value: number[]) => {
    const nextZoom = value[0] || 1
    setZoom(nextZoom)
    setPosition((current) => clampPosition(current, nextZoom))
  }

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (processing) return
    event.currentTarget.setPointerCapture(event.pointerId)
    setDrag({
      startX: event.clientX,
      startY: event.clientY,
      originX: position.x,
      originY: position.y,
    })
  }

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!drag || processing) return
    setPosition(
      clampPosition({
        x: drag.originX + event.clientX - drag.startX,
        y: drag.originY + event.clientY - drag.startY,
      })
    )
  }

  const resetCrop = () => {
    setZoom(1)
    setPosition({ x: 0, y: 0 })
    setError("")
  }

  const applyCrop = async () => {
    const frame = frameRef.current?.getBoundingClientRect()
    if (!frame) return

    setProcessing(true)
    setError("")
    try {
      const processed = await cropImageToAspectRatio(
        file,
        {
          zoom,
          position,
          frameWidth: frame.width,
          frameHeight: frame.height,
        },
        {
          outputWidth: frameWidthOut,
          outputHeight: frameHeightOut,
          maxSizeBytes,
          mimeType: "image/webp",
          errorMessage:
            mediaType === "profile_avatar"
              ? t("avatarTooBig", "A foto de perfil precisa ter no máximo 2MB.")
              : t("postTooBig", "A imagem do post precisa ter no máximo 3MB."),
        }
      )
      onConfirm(processed)
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t("optimizeError", "Não foi possível otimizar esse arquivo. Tente outro.")
      )
    } finally {
      setProcessing(false)
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && !processing && onCancel()}>
      <DialogContent
        className="max-h-[92vh] gap-0 overflow-hidden border-white/10 bg-zinc-950 p-0 text-white shadow-2xl sm:max-w-[760px]"
        showCloseButton={!processing}
      >
        <DialogHeader className="border-b border-white/10 px-5 py-4">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-primary/15 text-primary">
              <Crop className="h-4 w-4" />
            </span>
            <div>
              <DialogTitle className="text-base text-white">{title}</DialogTitle>
              <DialogDescription className="mt-1 text-xs text-white/55">
                {description}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="grid gap-5 overflow-y-auto px-5 py-5 md:grid-cols-[minmax(0,1fr)_220px]">
          <div className="flex min-w-0 flex-col items-center gap-3">
            {pickable && (
              <div
                role="group"
                aria-label={t("orientationGroup", "Orientação do post")}
                className="flex items-center gap-1.5"
              >
                {POST_ORIENTATIONS.map((o) => {
                  const active = orientation?.id === o.id
                  return (
                    <button
                      key={o.id}
                      type="button"
                      disabled={processing}
                      aria-pressed={active}
                      onClick={() => {
                        if (active) return
                        setOrientation(o)
                        // Trocar a moldura invalida o enquadramento anterior —
                        // manter zoom/posição deixaria a foto fora do quadro.
                        setZoom(1)
                        setPosition({ x: 0, y: 0 })
                        setError("")
                      }}
                      className={cn(
                        "border px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] transition disabled:opacity-50",
                        active
                          ? "border-primary bg-primary text-black"
                          : "border-white/15 bg-white/[0.04] text-white/60 hover:border-white/35 hover:text-white"
                      )}
                    >
                      {o.id}
                    </button>
                  )
                })}
              </div>
            )}
            <div
              ref={frameRef}
              className={cn(
                "relative w-full max-w-[420px] overflow-hidden rounded-2xl border border-primary/40 bg-black shadow-[0_24px_70px_-36px_rgba(242,196,9,0.55)] touch-none",
                mediaType === "profile_avatar" && "rounded-full"
              )}
              style={{ aspectRatio: frameRatio }}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={() => setDrag(null)}
              onPointerCancel={() => setDrag(null)}
            >
              {previewUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={previewUrl}
                  alt={t("previewAlt", "Prévia da {label}").replace("{label}", label)}
                  draggable={false}
                  className="h-full w-full select-none object-cover"
                  style={{
                    transform: `translate(${position.x}px, ${position.y}px) scale(${zoom})`,
                    transformOrigin: "center",
                  }}
                />
              )}
              <div aria-hidden className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-white/15" />
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,.14)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,.14)_1px,transparent_1px)] bg-[size:33.333%_33.333%] opacity-35"
              />
            </div>
          </div>

          <aside className="space-y-5">
            <div className="rounded-xl border border-white/10 bg-white/[0.04] p-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/40">
                {t("outputTitle", "Saída")}
              </p>
              <dl className="mt-3 space-y-2 text-sm">
                <div className="flex justify-between gap-3">
                  <dt className="text-white/50">{t("ratio", "Proporção")}</dt>
                  <dd className="font-medium text-primary">{ratioLabel}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-white/50">{t("resolution", "Resolução")}</dt>
                  <dd className="text-white/85">
                    {frameWidthOut}x{frameHeightOut}
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-white/50">{t("sizeLimit", "Limite")}</dt>
                  <dd className="text-white/85">{formatBytes(maxSizeBytes)}</dd>
                </div>
              </dl>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <label className="inline-flex items-center gap-2 text-sm font-medium text-white/80">
                  <ZoomIn className="h-4 w-4 text-primary" />
                  {t("zoom", "Zoom")}
                </label>
                <button
                  type="button"
                  onClick={resetCrop}
                  disabled={processing}
                  className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs text-white/50 transition hover:bg-white/5 hover:text-white"
                >
                  <RotateCcw className="h-3 w-3" />
                  {t("reset", "Resetar")}
                </button>
              </div>
              <Slider
                value={[zoom]}
                min={1}
                max={3}
                step={0.01}
                onValueChange={updateZoom}
                disabled={processing}
                aria-label={t("zoomAria", "Zoom do corte")}
              />
              <p className="text-xs leading-relaxed text-white/45">
                {t(
                  "dragHint",
                  "Arraste a imagem para escolher o enquadramento. O arquivo final será otimizado antes do envio."
                )}
              </p>
            </div>

            {error && (
              <div className="rounded-xl border border-red-500/25 bg-red-500/10 p-3 text-xs leading-relaxed text-red-200">
                {error}
              </div>
            )}
          </aside>
        </div>

        <DialogFooter className="border-t border-white/10 bg-white/[0.02] px-5 py-4">
          <Button variant="outline" onClick={onCancel} disabled={processing}>
            {t("cancel", "Cancelar")}
          </Button>
          <Button onClick={applyCrop} disabled={processing} className="font-semibold">
            {processing && <Loader2 className="h-4 w-4 animate-spin" />}
            {t("apply", "Aplicar corte")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
