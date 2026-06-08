"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { AlertCircle, Loader2, Radio, Mic, MicOff, SwitchCamera, X } from "lucide-react"
import {
  LocalVideoTrack,
  Room,
  RoomEvent,
  Track,
  createLocalTracks,
  type LocalTrack,
} from "livekit-client"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useAuth } from "@/hooks/use-auth"
import { cn } from "@/lib/utils"
import { startLive, endLive, fetchOwnedProfiles, type OwnedProfile } from "@/lib/lives/api"
import type { Live } from "@/lib/lives/types"

const SPRING = { type: "spring" as const, stiffness: 220, damping: 26 }
const MAX_TITLE = 120

type Phase = "setup" | "connecting" | "live"

interface GoLiveOverlayProps {
  open: boolean
  onClose: () => void
  onLiveStarted?: (live: Live) => void
  onLiveEnded?: () => void
}

export function GoLiveOverlay({ open, onClose, onLiveStarted, onLiveEnded }: GoLiveOverlayProps) {
  const { user, status } = useAuth()
  const [profiles, setProfiles] = useState<OwnedProfile[]>([])
  const [loadingProfiles, setLoadingProfiles] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [title, setTitle] = useState("")
  const [phase, setPhase] = useState<Phase>("setup")
  const [error, setError] = useState<string | null>(null)
  const [micOn, setMicOn] = useState(true)
  const [live, setLive] = useState<Live | null>(null)

  const videoRef = useRef<HTMLVideoElement | null>(null)
  const roomRef = useRef<Room | null>(null)
  const localTracksRef = useRef<LocalTrack[]>([])

  // ── Carrega subperfis ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!open || status !== "authenticated" || !user) return
    let cancelled = false
    setLoadingProfiles(true)
    fetchOwnedProfiles(user.id_user)
      .then((list) => {
        if (cancelled) return
        setProfiles(list)
        setSelectedId((prev) => prev || list[0]?.id_profile || null)
      })
      .catch(() => { if (!cancelled) setProfiles([]) })
      .finally(() => { if (!cancelled) setLoadingProfiles(false) })
    return () => { cancelled = true }
  }, [open, status, user?.id_user]) // eslint-disable-line react-hooks/exhaustive-deps

  const teardown = useCallback(async () => {
    localTracksRef.current.forEach((t) => t.stop())
    localTracksRef.current = []
    const room = roomRef.current
    roomRef.current = null
    if (room) {
      try { await room.disconnect() } catch { /* ignore */ }
    }
  }, [])

  // Cleanup ao fechar/desmontar.
  useEffect(() => {
    if (!open) {
      teardown()
      setPhase("setup")
      setLive(null)
      setError(null)
      setTitle("")
    }
  }, [open, teardown])
  useEffect(() => () => { teardown() }, [teardown])

  const attachLocalVideo = useCallback((track: LocalVideoTrack) => {
    if (videoRef.current) {
      track.attach(videoRef.current)
    }
  }, [])

  const handleStart = useCallback(async () => {
    if (!selectedId) return
    setError(null)
    setPhase("connecting")
    try {
      const session = await startLive({ id_profile: selectedId, title: title.trim() || undefined })
      const room = new Room({ adaptiveStream: true, dynacast: true })
      roomRef.current = room
      room.on(RoomEvent.Disconnected, () => {
        // Encerramento externo (servidor derrubou a sala).
        if (roomRef.current === room) {
          roomRef.current = null
        }
      })
      await room.connect(session.ws_url, session.token)

      // Captura câmera + mic e publica.
      const tracks = await createLocalTracks({ audio: true, video: { facingMode: "user" } })
      localTracksRef.current = tracks
      for (const track of tracks) {
        await room.localParticipant.publishTrack(track)
        if (track.kind === Track.Kind.Video) {
          attachLocalVideo(track as LocalVideoTrack)
        }
      }
      setLive(session.live)
      setPhase("live")
      onLiveStarted?.(session.live)
    } catch (err) {
      await teardown()
      setPhase("setup")
      setError(err instanceof Error ? err.message : "Falha ao iniciar a live")
    }
  }, [selectedId, title, attachLocalVideo, teardown, onLiveStarted])

  const handleEnd = useCallback(async () => {
    const current = live
    await teardown()
    if (current) {
      try { await endLive(current.id_live) } catch { /* best-effort */ }
    }
    setLive(null)
    setPhase("setup")
    onLiveEnded?.()
    onClose()
  }, [live, teardown, onLiveEnded, onClose])

  const toggleMic = useCallback(() => {
    const next = !micOn
    setMicOn(next)
    localTracksRef.current.forEach((t) => {
      if (t.kind === Track.Kind.Audio) {
        if (next) t.unmute()
        else t.mute()
      }
    })
  }, [micOn])

  if (!open) return null

  const selectedProfile = profiles.find((p) => p.id_profile === selectedId) || null

  return (
    <div className="fixed inset-0 z-[95] flex flex-col bg-black">
      {/* Preview / vídeo ao vivo em fullbleed 9:16 */}
      <video
        ref={videoRef}
        className="absolute inset-0 h-full w-full object-cover"
        autoPlay
        playsInline
        muted
      />
      {/* Vinheta para legibilidade dos controles */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/70" />

      {/* Topo: fechar + selo AO VIVO */}
      <div className="relative z-10 flex items-center justify-between px-4 pt-[max(1rem,env(safe-area-inset-top))]">
        {phase === "live" ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-red-600 px-3 py-1 text-xs font-bold uppercase tracking-wider text-white shadow-lg">
            <span className="h-2 w-2 animate-pulse rounded-full bg-white" />
            Ao vivo
          </span>
        ) : (
          <span />
        )}
        <button
          type="button"
          onClick={phase === "live" ? handleEnd : onClose}
          className="rounded-full bg-black/50 p-2 text-white/90 backdrop-blur transition hover:bg-black/70"
          aria-label="Fechar"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Setup (escolha de perfil + título) */}
      <AnimatePresence>
        {phase !== "live" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={SPRING}
            className="relative z-10 mt-auto flex flex-col gap-4 rounded-t-3xl border-t border-white/10 bg-neutral-950/85 px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-5 backdrop-blur-xl"
          >
            <div className="flex items-center gap-2 text-white">
              <Radio className="h-5 w-5 text-red-400" />
              <h2 className="text-lg font-semibold">Ir ao vivo</h2>
            </div>

            {/* Subperfil */}
            <div className="space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-white/50">Transmitir como</p>
              {loadingProfiles ? (
                <div className="flex items-center gap-2 text-sm text-white/60">
                  <Loader2 className="h-4 w-4 animate-spin text-yellow-300" /> Carregando perfis…
                </div>
              ) : profiles.length === 0 ? (
                <p className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-white/60">
                  Sem subperfis ativos para transmitir.
                </p>
              ) : (
                <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {profiles.map((p) => {
                    const isSel = p.id_profile === selectedId
                    return (
                      <button
                        key={p.id_profile}
                        type="button"
                        onClick={() => setSelectedId(p.id_profile)}
                        className={cn(
                          "flex w-[78px] shrink-0 flex-col items-center gap-1.5 rounded-2xl border p-2.5 text-center transition-colors",
                          isSel
                            ? "border-red-400/60 bg-red-500/10"
                            : "border-white/10 bg-white/[0.03] hover:border-white/25",
                        )}
                      >
                        <Avatar className={cn("h-11 w-11 ring-2 transition", isSel ? "ring-red-400/70" : "ring-transparent")}>
                          {p.avatar_url && <AvatarImage src={p.avatar_url} alt={p.display_name} />}
                          <AvatarFallback className="bg-zinc-800 text-[10px] text-white/80">
                            {p.display_name?.[0]?.toUpperCase() || "?"}
                          </AvatarFallback>
                        </Avatar>
                        <span className="line-clamp-1 text-[10px] font-medium text-white/90">{p.display_name}</span>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Título */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-white/50">Título (opcional)</p>
                <span className="text-[10px] tabular-nums text-white/30">{title.length}/{MAX_TITLE}</span>
              </div>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value.slice(0, MAX_TITLE))}
                placeholder="Sobre o que é a sua live?"
                className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-white placeholder:text-white/30 focus:border-red-400/40 focus:outline-none focus:ring-2 focus:ring-red-400/20"
              />
            </div>

            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  className="flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-500/[0.08] px-3 py-2 text-xs text-red-200"
                >
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </motion.div>
              )}
            </AnimatePresence>

            <button
              type="button"
              onClick={handleStart}
              disabled={!selectedId || phase === "connecting"}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-red-600 text-sm font-bold text-white shadow-[0_8px_24px_-8px_rgba(220,38,38,0.7)] transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {phase === "connecting" ? <Loader2 className="h-5 w-5 animate-spin" /> : <Radio className="h-5 w-5" />}
              {phase === "connecting" ? "Conectando…" : "Iniciar transmissão"}
            </button>
            {selectedProfile?.is_clan && (
              <p className="text-center text-[11px] text-white/45">
                Dica: clans podem transmitir, mas só perfis com assinatura ativa entram no ar.
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Controles durante a live */}
      {phase === "live" && (
        <div className="relative z-10 mt-auto flex items-center justify-center gap-4 px-5 pb-[max(2rem,env(safe-area-inset-bottom))]">
          <button
            type="button"
            onClick={toggleMic}
            className={cn(
              "flex h-12 w-12 items-center justify-center rounded-full backdrop-blur transition",
              micOn ? "bg-white/15 text-white hover:bg-white/25" : "bg-red-600 text-white",
            )}
            aria-label={micOn ? "Desligar microfone" : "Ligar microfone"}
          >
            {micOn ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
          </button>
          <button
            type="button"
            onClick={handleEnd}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-red-600 px-6 text-sm font-bold text-white shadow-lg transition hover:bg-red-500"
          >
            Encerrar live
          </button>
          <button
            type="button"
            disabled
            className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-white/40"
            aria-label="Trocar câmera (em breve)"
            title="Trocar câmera (em breve)"
          >
            <SwitchCamera className="h-5 w-5" />
          </button>
        </div>
      )}
    </div>
  )
}
