"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { AlertCircle, Loader2, Radio, Mic, MicOff, SwitchCamera, SlidersHorizontal, X } from "lucide-react"
import {
  LocalAudioTrack,
  LocalVideoTrack,
  Room,
  RoomEvent,
} from "livekit-client"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useAuth } from "@/hooks/use-auth"
import { cn } from "@/lib/utils"
import { startLive, endLive, fetchOwnedProfiles, type OwnedProfile } from "@/lib/lives/api"
import type { Live } from "@/lib/lives/types"
import { FilteredCamera } from "@/lib/lives/filtered-camera"
import { PRESETS } from "@/lib/camera/presets"
import { LiveSocialLayer } from "./live-social-layer"

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
  const [room, setRoom] = useState<Room | null>(null)
  const [presetId, setPresetId] = useState(PRESETS[0].id)
  const [showFilters, setShowFilters] = useState(false)
  const [camReady, setCamReady] = useState(false)

  const videoRef = useRef<HTMLVideoElement | null>(null)
  const roomRef = useRef<Room | null>(null)
  const camRef = useRef<FilteredCamera | null>(null)
  const audioTrackRef = useRef<LocalAudioTrack | null>(null)

  // ── Carrega subperfis ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!open || status !== "authenticated" || !user) return
    let cancelled = false
    setLoadingProfiles(true)
    fetchOwnedProfiles(user.id_user)
      .then((list) => {
        if (cancelled) return
        setProfiles(list)
        // Prefere o primeiro perfil pago (único que pode transmitir).
        const firstPaid = list.find((p) => p.is_paid)
        setSelectedId((prev) => prev || firstPaid?.id_profile || list[0]?.id_profile || null)
      })
      .catch(() => { if (!cancelled) setProfiles([]) })
      .finally(() => { if (!cancelled) setLoadingProfiles(false) })
    return () => { cancelled = true }
  }, [open, status, user?.id_user]) // eslint-disable-line react-hooks/exhaustive-deps

  const teardown = useCallback(async () => {
    audioTrackRef.current = null
    camRef.current?.stop()
    camRef.current = null
    setCamReady(false)
    const current = roomRef.current
    roomRef.current = null
    setRoom(null)
    if (current) {
      try { await current.disconnect() } catch { /* ignore */ }
    }
  }, [])

  // Abre a câmera (com filtro) assim que o overlay aparece — preview + escolha
  // de filtro antes de ir ao ar.
  useEffect(() => {
    if (!open) return
    let cancelled = false
    const cam = new FilteredCamera()
    cam
      .start("user")
      .then(() => {
        if (cancelled) { cam.stop(); return }
        camRef.current = cam
        cam.setPreset(presetId)
        if (videoRef.current) videoRef.current.srcObject = cam.previewStream
        setCamReady(true)
      })
      .catch((err) => {
        if (cancelled) return
        setError(err instanceof Error ? err.message : "Não consegui acessar a câmera")
      })
    return () => { cancelled = true; cam.stop() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  // Cleanup ao fechar/desmontar.
  useEffect(() => {
    if (!open) {
      teardown()
      setPhase("setup")
      setLive(null)
      setError(null)
      setTitle("")
      setShowFilters(false)
    }
  }, [open, teardown])
  useEffect(() => () => { teardown() }, [teardown])

  const handlePreset = useCallback((id: string) => {
    setPresetId(id)
    camRef.current?.setPreset(id)
  }, [])

  const handleSwitchCamera = useCallback(async () => {
    try { await camRef.current?.switchFacing() } catch { /* ignore */ }
    // Reaponta o preview (o track publicado segue o mesmo canvas).
    if (videoRef.current && camRef.current) videoRef.current.srcObject = camRef.current.previewStream
  }, [])

  const handleStart = useCallback(async () => {
    if (!selectedId || !camRef.current) return
    setError(null)
    setPhase("connecting")
    try {
      const cam = camRef.current
      const session = await startLive({ id_profile: selectedId, title: title.trim() || undefined })
      const room = new Room({ adaptiveStream: true, dynacast: true })
      roomRef.current = room
      room.on(RoomEvent.Disconnected, () => {
        if (roomRef.current === room) roomRef.current = null
      })
      await room.connect(session.ws_url, session.token)

      // Publica o track de vídeo (canvas filtrado) + áudio do mic.
      const vRaw = cam.videoTrack
      const aRaw = cam.audioTrack
      if (vRaw) await room.localParticipant.publishTrack(new LocalVideoTrack(vRaw))
      if (aRaw) {
        const aTrack = new LocalAudioTrack(aRaw)
        audioTrackRef.current = aTrack
        await room.localParticipant.publishTrack(aTrack)
      }
      setRoom(room)
      setLive(session.live)
      setPhase("live")
      onLiveStarted?.(session.live)
    } catch (err) {
      // Mantém a câmera aberta (só desfaz a conexão) p/ permitir nova tentativa.
      const current = roomRef.current
      roomRef.current = null
      setRoom(null)
      if (current) { try { await current.disconnect() } catch { /* ignore */ } }
      setPhase("setup")
      setError(err instanceof Error ? err.message : "Falha ao iniciar a live")
    }
  }, [selectedId, title, onLiveStarted])

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
    if (audioTrackRef.current) {
      if (next) audioTrackRef.current.unmute()
      else audioTrackRef.current.mute()
    }
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
        <div className="flex items-center gap-2">
          {camReady && (
            <>
              <button
                type="button"
                onClick={() => setShowFilters((s) => !s)}
                className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-full backdrop-blur transition",
                  showFilters ? "bg-yellow-400 text-black" : "bg-black/50 text-white hover:bg-black/70",
                )}
                aria-label="Filtros"
              >
                <SlidersHorizontal className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={handleSwitchCamera}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur transition hover:bg-black/70"
                aria-label="Trocar câmera"
              >
                <SwitchCamera className="h-4 w-4" />
              </button>
            </>
          )}
          {phase === "live" && (
            <button
              type="button"
              onClick={toggleMic}
              className={cn(
                "flex h-9 w-9 items-center justify-center rounded-full backdrop-blur transition",
                micOn ? "bg-black/50 text-white hover:bg-black/70" : "bg-red-600 text-white",
              )}
              aria-label={micOn ? "Desligar microfone" : "Ligar microfone"}
            >
              {micOn ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
            </button>
          )}
          <button
            type="button"
            onClick={phase === "live" ? handleEnd : onClose}
            className={cn(
              "rounded-full p-2 backdrop-blur transition",
              phase === "live"
                ? "bg-red-600 text-white hover:bg-red-500"
                : "bg-black/50 text-white/90 hover:bg-black/70",
            )}
            aria-label={phase === "live" ? "Encerrar live" : "Fechar"}
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Tira de filtros (mesmos presets das Stories/Bees) */}
      <AnimatePresence>
        {showFilters && camReady && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={SPRING}
            className="relative z-20 mt-3 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {PRESETS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => handlePreset(p.id)}
                className={cn(
                  "flex shrink-0 flex-col items-center gap-1",
                )}
              >
                <span
                  className={cn(
                    "h-12 w-12 rounded-2xl ring-2 transition",
                    presetId === p.id ? "ring-yellow-400" : "ring-white/20",
                  )}
                  style={{ background: p.swatch }}
                />
                <span className={cn("text-[10px] font-medium", presetId === p.id ? "text-yellow-300" : "text-white/70")}>
                  {p.label}
                </span>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

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
                        <span
                          className={cn(
                            "rounded-full px-1.5 py-px text-[8px] font-semibold uppercase tracking-wider",
                            p.is_paid ? "bg-emerald-400/20 text-emerald-200" : "bg-white/10 text-white/40",
                          )}
                        >
                          {p.is_paid ? "Ativo" : "Sem assinatura"}
                        </span>
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
              disabled={!selectedId || !selectedProfile?.is_paid || phase === "connecting" || !camReady}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-red-600 text-sm font-bold text-white shadow-[0_8px_24px_-8px_rgba(220,38,38,0.7)] transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {phase === "connecting" ? <Loader2 className="h-5 w-5 animate-spin" /> : <Radio className="h-5 w-5" />}
              {phase === "connecting" ? "Conectando…" : !camReady ? "Preparando câmera…" : "Iniciar transmissão"}
            </button>
            {selectedProfile && !selectedProfile.is_paid && (
              <p className="text-center text-[11px] text-amber-300/80">
                Só perfis com assinatura ativa entram ao vivo. Ative a assinatura deste perfil para transmitir.
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Camada social: contador + chat + presentes (durante a live) */}
      {phase === "live" && live && (
        <LiveSocialLayer room={room} live={live} role="broadcaster" />
      )}
    </div>
  )
}
