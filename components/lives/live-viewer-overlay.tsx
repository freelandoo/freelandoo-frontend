"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { AlertCircle, Loader2, Volume2, VolumeX, X } from "lucide-react"
import {
  RemoteTrack,
  Room,
  RoomEvent,
  Track,
  type RemoteTrackPublication,
  type RemoteParticipant,
} from "livekit-client"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"
import { joinLive } from "@/lib/lives/api"
import type { Live } from "@/lib/lives/types"

const SPRING = { type: "spring" as const, stiffness: 220, damping: 26 }

interface LiveViewerOverlayProps {
  liveId: string | null
  onClose: () => void
  onEnded?: () => void
}

export function LiveViewerOverlay({ liveId, onClose, onEnded }: LiveViewerOverlayProps) {
  const [live, setLive] = useState<Live | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [muted, setMuted] = useState(false)
  const [hasVideo, setHasVideo] = useState(false)

  const videoRef = useRef<HTMLVideoElement | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const roomRef = useRef<Room | null>(null)

  const teardown = useCallback(async () => {
    const room = roomRef.current
    roomRef.current = null
    if (room) {
      try { await room.disconnect() } catch { /* ignore */ }
    }
    setHasVideo(false)
  }, [])

  const attachTrack = useCallback((track: RemoteTrack) => {
    if (track.kind === Track.Kind.Video && videoRef.current) {
      track.attach(videoRef.current)
      setHasVideo(true)
    } else if (track.kind === Track.Kind.Audio && audioRef.current) {
      track.attach(audioRef.current)
    }
  }, [])

  useEffect(() => {
    if (!liveId) return
    let cancelled = false
    setLoading(true)
    setError(null)
    setLive(null)

    ;(async () => {
      try {
        const session = await joinLive(liveId)
        if (cancelled) return
        setLive(session.live)

        const room = new Room({ adaptiveStream: true })
        roomRef.current = room

        room.on(RoomEvent.TrackSubscribed, (track: RemoteTrack) => attachTrack(track))
        room.on(
          RoomEvent.TrackUnsubscribed,
          (track: RemoteTrack) => {
            track.detach()
            if (track.kind === Track.Kind.Video) setHasVideo(false)
          },
        )
        room.on(RoomEvent.Disconnected, () => {
          if (roomRef.current === room) {
            roomRef.current = null
            onEnded?.()
          }
        })

        await room.connect(session.ws_url, session.token)
        if (cancelled) { await room.disconnect(); return }

        // Anexa o que já estava publicado quando entramos.
        room.remoteParticipants.forEach((p: RemoteParticipant) => {
          p.trackPublications.forEach((pub: RemoteTrackPublication) => {
            if (pub.isSubscribed && pub.track) attachTrack(pub.track)
          })
        })
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Não foi possível entrar na live")
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
      teardown()
    }
  }, [liveId, attachTrack, teardown, onEnded])

  const toggleMute = useCallback(() => {
    setMuted((m) => {
      const next = !m
      if (audioRef.current) audioRef.current.muted = next
      return next
    })
  }, [])

  if (!liveId) return null

  return (
    <div className="fixed inset-0 z-[95] flex flex-col bg-black">
      <video
        ref={videoRef}
        className="absolute inset-0 h-full w-full object-cover"
        autoPlay
        playsInline
      />
      <audio ref={audioRef} autoPlay />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/55 via-transparent to-black/65" />

      {/* Estados sem vídeo (conectando / aguardando câmera) */}
      {!hasVideo && (
        <div className="absolute inset-0 z-[5] flex flex-col items-center justify-center gap-3 text-white/70">
          {loading ? (
            <>
              <Loader2 className="h-8 w-8 animate-spin text-red-400" />
              <p className="text-sm">Entrando na live…</p>
            </>
          ) : error ? (
            <div className="flex max-w-xs flex-col items-center gap-3 px-6 text-center">
              <AlertCircle className="h-8 w-8 text-red-400" />
              <p className="text-sm">{error}</p>
            </div>
          ) : (
            <>
              <div className="h-3 w-3 animate-pulse rounded-full bg-red-500" />
              <p className="text-sm">Aguardando a transmissão…</p>
            </>
          )}
        </div>
      )}

      {/* Topo */}
      <div className="relative z-10 flex items-center justify-between px-4 pt-[max(1rem,env(safe-area-inset-top))]">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-red-600 px-3 py-1 text-xs font-bold uppercase tracking-wider text-white shadow-lg">
            <span className="h-2 w-2 animate-pulse rounded-full bg-white" />
            Ao vivo
          </span>
          <AnimatePresence>
            {live && (
              <motion.div
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={SPRING}
                className="flex items-center gap-2 rounded-full bg-black/45 py-1 pl-1 pr-3 backdrop-blur"
              >
                <Avatar className="h-7 w-7">
                  {live.profile.avatar_url && (
                    <AvatarImage src={live.profile.avatar_url} alt={live.profile.display_name || ""} />
                  )}
                  <AvatarFallback className="bg-zinc-800 text-[10px] text-white/80">
                    {live.profile.display_name?.[0]?.toUpperCase() || "?"}
                  </AvatarFallback>
                </Avatar>
                <span className="max-w-[40vw] truncate text-xs font-medium text-white">
                  {live.profile.display_name}
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-full bg-black/50 p-2 text-white/90 backdrop-blur transition hover:bg-black/70"
          aria-label="Sair da live"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Título + controles */}
      <div className="relative z-10 mt-auto flex items-end justify-between gap-3 px-4 pb-[max(2rem,env(safe-area-inset-bottom))]">
        <div className="min-w-0">
          {live?.title && <p className="line-clamp-2 max-w-[70vw] text-sm font-medium text-white drop-shadow">{live.title}</p>}
        </div>
        <button
          type="button"
          onClick={toggleMute}
          className={cn(
            "flex h-11 w-11 shrink-0 items-center justify-center rounded-full backdrop-blur transition",
            muted ? "bg-white/15 text-white/70" : "bg-white/20 text-white hover:bg-white/30",
          )}
          aria-label={muted ? "Ativar som" : "Silenciar"}
        >
          {muted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
        </button>
      </div>
    </div>
  )
}
