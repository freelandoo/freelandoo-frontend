"use client"

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react"
import { ChevronLeft, ChevronRight, Volume2, VolumeX } from "lucide-react"
import type { FeedMedia } from "@/lib/types/portfolio-feed"
import { useTranslations } from "@/components/i18n/I18nProvider"
import { cn } from "@/lib/utils"

interface PostMediaProps {
  media: FeedMedia[]
  glow?: string | null
  /** Preenche altura disponível (ex.: feed estilo TikTok) em vez de proporção fixa */
  fillContainer?: boolean
  /** Sobe indicadores inferiores para não colidir com legenda sobreposta (feed paged). */
  reserveBottomOverlay?: boolean
  /** Proporção quando não é fillContainer. Default 4:5. */
  aspect?: "4:5" | "9:16"
}

// Estado global do mute compartilhado entre todos os players do feed.
// O default é "mudo" (browsers exigem isso para autoplay).
// O usuário "destrava" clicando em qualquer player; a preferência persiste em sessionStorage.
const SESSION_KEY = "feed:video_unmuted"
const muteListeners = new Set<() => void>()
let globalUnmuted = false
if (typeof window !== "undefined") {
  try {
    globalUnmuted = window.sessionStorage.getItem(SESSION_KEY) === "1"
  } catch {
    globalUnmuted = false
  }
}

function setGlobalUnmuted(next: boolean) {
  globalUnmuted = next
  if (typeof window !== "undefined") {
    try {
      if (next) window.sessionStorage.setItem(SESSION_KEY, "1")
      else window.sessionStorage.removeItem(SESSION_KEY)
    } catch {
      /* ignore */
    }
  }
  muteListeners.forEach((cb) => cb())
}

function subscribeMute(cb: () => void) {
  muteListeners.add(cb)
  return () => muteListeners.delete(cb)
}

function getMuteSnapshot() {
  return globalUnmuted
}

function getMuteServerSnapshot() {
  return false
}

function useGlobalVideoUnmuted(): [boolean, (next: boolean) => void] {
  const unmuted = useSyncExternalStore(subscribeMute, getMuteSnapshot, getMuteServerSnapshot)
  return [unmuted, setGlobalUnmuted]
}

interface AutoPlayVideoProps {
  src: string
  poster: string | null
  fillContainer?: boolean
}

function AutoPlayVideo({ src, poster, fillContainer }: AutoPlayVideoProps) {
  const t = useTranslations("Post")
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [unmuted, setUnmuted] = useGlobalVideoUnmuted()
  const [isVisible, setIsVisible] = useState(false)

  // Mantém o muted do elemento alinhado com o estado global, mesmo após troca de src.
  useEffect(() => {
    const v = videoRef.current
    if (!v) return
    v.muted = !unmuted
  }, [unmuted, src])

  // IntersectionObserver: ≥50% visível → play(); senão pause().
  useEffect(() => {
    const node = containerRef.current
    const video = videoRef.current
    if (!node || !video) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry) return
        const visible = entry.intersectionRatio >= 0.5
        setIsVisible(visible)
        if (visible) {
          // play() pode rejeitar (autoplay bloqueado mesmo com muted em alguns casos);
          // se falhar e estávamos com som, volta pra mudo e tenta de novo.
          video.play().catch(() => {
            if (!video.muted) {
              video.muted = true
              setGlobalUnmuted(false)
              video.play().catch(() => {})
            }
          })
        } else {
          video.pause()
        }
      },
      { threshold: [0, 0.5, 1] }
    )

    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  // Pausa quando a aba perde foco — economia de bateria.
  useEffect(() => {
    const onVisibility = () => {
      const v = videoRef.current
      if (!v) return
      if (document.hidden) v.pause()
      else if (isVisible) v.play().catch(() => {})
    }
    document.addEventListener("visibilitychange", onVisibility)
    return () => document.removeEventListener("visibilitychange", onVisibility)
  }, [isVisible])

  const handleToggleSound = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      setUnmuted(!unmuted)
    },
    [unmuted, setUnmuted]
  )

  return (
    <div ref={containerRef} className="absolute inset-0">
      <video
        ref={videoRef}
        src={src}
        poster={poster || undefined}
        muted={!unmuted}
        loop
        playsInline
        preload="metadata"
        className={cn(
          "h-full w-full",
          fillContainer ? "object-contain" : "object-cover"
        )}
      />

      {/* Toggle de som — canto inferior esquerdo, fora da área do gradient direito */}
      <button
        type="button"
        onClick={handleToggleSound}
        aria-label={unmuted ? t("muteVideo", "Desligar som") : t("unmuteVideo", "Ligar som")}
        className="absolute bottom-3 left-3 z-[3] inline-flex h-8 w-8 items-center justify-center rounded-full bg-black/55 text-white/85 backdrop-blur transition hover:bg-black/75 hover:text-white active:scale-95"
      >
        {unmuted ? (
          <Volume2 className="h-4 w-4" />
        ) : (
          <VolumeX className="h-4 w-4" />
        )}
      </button>
    </div>
  )
}

export function PostMedia({ media, glow, fillContainer, reserveBottomOverlay, aspect = "4:5" }: PostMediaProps) {
  const t = useTranslations("Post")
  const aspectClass = aspect === "9:16" ? "aspect-[9/16]" : "aspect-[4/5]"
  const [index, setIndex] = useState(0)
  if (!media || media.length === 0) {
    return (
      <div
        className={cn(
          "flex items-center justify-center bg-white/[0.03] text-xs text-white/30",
          fillContainer ? "min-h-0 min-w-0 max-w-full flex-1" : `${aspectClass} w-full`
        )}
      >
        {t("noMedia", "sem mídia")}
      </div>
    )
  }

  const current = media[Math.min(index, media.length - 1)]
  const total = media.length

  return (
    <div
      className={cn(
        "relative w-full overflow-hidden bg-black",
        fillContainer ? "min-h-0 flex-1" : aspectClass
      )}
    >
      {current.type === "video" ? (
        <AutoPlayVideo
          key={current.url}
          src={current.url}
          poster={current.thumbnail_url}
          fillContainer={fillContainer}
        />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={current.url}
          src={current.url}
          alt=""
          loading="lazy"
          className="h-full w-full object-cover transition-opacity duration-300"
        />
      )}

      {/* Subtle inner glow tint by machine */}
      {glow && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{ boxShadow: `inset 0 0 80px ${glow}` }}
        />
      )}

      {/* Bottom legibility gradient */}
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t to-transparent",
          reserveBottomOverlay ? "h-28 from-black/70" : "h-16 from-black/55"
        )}
      />

      {total > 1 && (
        <>
          <button
            type="button"
            aria-label={t("previousMedia", "Mídia anterior")}
            onClick={() => setIndex((i) => (i - 1 + total) % total)}
            className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/55 p-1.5 text-white/85 backdrop-blur transition hover:bg-black/75 hover:text-white active:scale-95"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            aria-label={t("nextMedia", "Próxima mídia")}
            onClick={() => setIndex((i) => (i + 1) % total)}
            className={cn(
              "absolute top-1/2 -translate-y-1/2 rounded-full bg-black/55 p-1.5 text-white/85 backdrop-blur transition hover:bg-black/75 hover:text-white active:scale-95",
              reserveBottomOverlay ? "right-14" : "right-2"
            )}
          >
            <ChevronRight className="h-4 w-4" />
          </button>

          <div
            className={cn(
              "absolute left-1/2 flex -translate-x-1/2 items-center gap-1.5",
              reserveBottomOverlay ? "bottom-20" : "bottom-3"
            )}
          >
            {media.map((_, i) => (
              <span
                key={i}
                className={cn(
                  "h-1.5 rounded-full transition-all duration-300",
                  i === index ? "w-4 bg-white" : "w-1.5 bg-white/40"
                )}
              />
            ))}
          </div>

          <div className="absolute right-3 top-3 rounded-full bg-black/55 px-2 py-0.5 text-[10px] font-medium text-white/85 backdrop-blur">
            {index + 1}/{total}
          </div>
        </>
      )}
    </div>
  )
}
