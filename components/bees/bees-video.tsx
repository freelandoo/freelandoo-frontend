"use client"

import { useEffect, useRef, useState } from "react"
import { Volume2, VolumeX, Play } from "lucide-react"
import { cn } from "@/lib/utils"

interface BeesVideoProps {
  url: string
  poster?: string | null
  isActive: boolean
  muted: boolean
  onToggleMute: () => void
}

/**
 * Vídeo vertical 9:16 estilo TikTok:
 * - autoplay + loop + playsInline + muted (sempre muted no autoplay inicial)
 * - play/pause guiado por `isActive` (definido pelo IntersectionObserver da página)
 * - tap no vídeo alterna mute/unmute (gesto do usuário libera o som)
 * - duplo-tap pausa/resume manualmente
 */
export function BeesVideo({ url, poster, isActive, muted, onToggleMute }: BeesVideoProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const [manuallyPaused, setManuallyPaused] = useState(false)
  const [showPlayOverlay, setShowPlayOverlay] = useState(false)

  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    if (isActive && !manuallyPaused) {
      video.currentTime = 0
      const p = video.play()
      if (p && typeof p.catch === "function") p.catch(() => {})
      setShowPlayOverlay(false)
    } else {
      video.pause()
    }
  }, [isActive, manuallyPaused])

  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    video.muted = muted
  }, [muted])

  const handleTap = () => {
    onToggleMute()
  }

  const handleVideoClick = (e: React.MouseEvent<HTMLVideoElement>) => {
    e.stopPropagation()
    onToggleMute()
  }

  const togglePause = () => {
    const video = videoRef.current
    if (!video) return
    if (video.paused) {
      setManuallyPaused(false)
      const p = video.play()
      if (p && typeof p.catch === "function") p.catch(() => {})
      setShowPlayOverlay(false)
    } else {
      setManuallyPaused(true)
      video.pause()
      setShowPlayOverlay(true)
    }
  }

  return (
    <div
      className="relative h-full w-full"
      onDoubleClick={togglePause}
      onClick={handleTap}
      role="presentation"
    >
      <video
        ref={videoRef}
        src={url}
        poster={poster || undefined}
        className="absolute inset-0 h-full w-full object-cover"
        loop
        playsInline
        muted={muted}
        preload="metadata"
        onClick={handleVideoClick}
      />

      {showPlayOverlay && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            togglePause()
          }}
          aria-label="Reproduzir"
          className="absolute inset-0 z-10 flex items-center justify-center"
        >
          <span className="rounded-full bg-black/50 p-5 backdrop-blur-md">
            <Play className="h-10 w-10 fill-white text-white" />
          </span>
        </button>
      )}

      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          onToggleMute()
        }}
        aria-label={muted ? "Ativar som" : "Mudo"}
        className={cn(
          "absolute right-3 top-3 z-20 inline-flex h-9 w-9 items-center justify-center rounded-full",
          "border border-white/15 bg-black/45 text-white/85 backdrop-blur-md transition",
          "hover:bg-black/65 active:scale-95"
        )}
      >
        {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
      </button>
    </div>
  )
}
