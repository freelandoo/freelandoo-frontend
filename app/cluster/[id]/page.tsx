"use client"

// Sala do MEMBRO de um Cluster de Live. O membro entra, escolhe por qual
// subperfil vai transmitir (a câmera já fica pronta em preview) e AGUARDA:
// quando o administrador aperta Iniciar na sala de comando, a live de todo
// mundo começa NA MESMA HORA (push socket cluster:start — zero poll). Os
// sinais do admin (botões grandes e caixas de texto) estampam a tela via
// <ClusterSignalOverlay/>. Encerrar do admin para todo mundo junto.
// Sem subperfil pago o membro fica em modo "só sinais" (recebe tudo, não
// transmite). Gated pela flag live_clusters; visual escuro, cantos retos.
import { useCallback, useEffect, useRef, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { AnimatePresence, motion } from "framer-motion"
import { AlertCircle, ChevronLeft, Loader2, Mic, MicOff, Radio, Users } from "lucide-react"
import { LocalAudioTrack, LocalVideoTrack, Room, RoomEvent } from "livekit-client"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useAuth } from "@/hooks/use-auth"
import { getToken } from "@/lib/auth"
import { cn } from "@/lib/utils"
import { startLive, endLive, fetchOwnedProfiles, type OwnedProfile } from "@/lib/lives/api"
import { FilteredCamera } from "@/lib/lives/filtered-camera"
import { emitRealtime, onRealtime } from "@/lib/realtime"
import { useFeature } from "@/components/feature-flags/FeatureFlagsProvider"
import { useTranslations } from "@/components/i18n/I18nProvider"
import { ClusterSignalOverlay, type ClusterSignal } from "@/components/lives/cluster-signal-overlay"

const SPRING = { type: "spring" as const, stiffness: 220, damping: 26 }

interface Cluster {
  id_live_cluster: string
  name: string
  status: "idle" | "started"
}

type Phase = "lobby" | "connecting" | "live"

export default function ClusterRoomPage() {
  const t = useTranslations("Cluster")
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const id = params?.id
  const enabled = useFeature("live_clusters")
  const { user, status } = useAuth()

  const [cluster, setCluster] = useState<Cluster | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [forbidden, setForbidden] = useState(false)
  const [loading, setLoading] = useState(true)

  const [profiles, setProfiles] = useState<OwnedProfile[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [phase, setPhase] = useState<Phase>("lobby")
  const [error, setError] = useState<string | null>(null)
  const [micOn, setMicOn] = useState(true)
  const [camReady, setCamReady] = useState(false)
  const [onlineCount, setOnlineCount] = useState(0)
  const [signal, setSignal] = useState<ClusterSignal | null>(null)
  const [endedNote, setEndedNote] = useState(false)

  const videoRef = useRef<HTMLVideoElement | null>(null)
  const camRef = useRef<FilteredCamera | null>(null)
  const roomRef = useRef<Room | null>(null)
  const audioTrackRef = useRef<LocalAudioTrack | null>(null)
  const activeLiveIdRef = useRef<string | null>(null)
  const phaseRef = useRef<Phase>("lobby")
  phaseRef.current = phase
  const selectedIdRef = useRef<string | null>(null)
  selectedIdRef.current = selectedId
  const profilesRef = useRef<OwnedProfile[]>([])
  profilesRef.current = profiles

  // ── Detalhe do cluster ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!id) return
    const token = getToken()
    if (!token) { router.push("/login"); return }
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch(`/api/live-clusters/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        })
        const data = await res.json()
        if (cancelled) return
        if (res.status === 403) { setForbidden(true); return }
        if (!res.ok) throw new Error(data?.error || `Erro ${res.status}`)
        setCluster(data.cluster)
      } catch (err) {
        if (!cancelled) {
          setLoadError(err instanceof Error ? err.message : t("loadError", "Erro ao carregar clusters"))
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [id, router, t])

  // ── Subperfis (prefere o primeiro pago — único que transmite) ─────────────
  useEffect(() => {
    if (status !== "authenticated" || !user) return
    let cancelled = false
    fetchOwnedProfiles(user.id_user)
      .then((list) => {
        if (cancelled) return
        setProfiles(list)
        const firstPaid = list.find((p) => p.is_paid)
        setSelectedId((prev) => prev || firstPaid?.id_profile || null)
      })
      .catch(() => { if (!cancelled) setProfiles([]) })
    return () => { cancelled = true }
  }, [status, user?.id_user]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Câmera pronta em preview desde o lobby (início instantâneo) ───────────
  useEffect(() => {
    if (forbidden || !enabled) return
    let cancelled = false
    const cam = new FilteredCamera()
    cam
      .start("user")
      .then(() => {
        if (cancelled) { cam.stop(); return }
        camRef.current = cam
        if (videoRef.current) videoRef.current.srcObject = cam.previewStream
        setCamReady(true)
      })
      .catch(() => {
        if (!cancelled) setError(t("cameraError", "Não consegui acessar câmera/microfone"))
      })
    return () => { cancelled = true; cam.stop(); camRef.current = null }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [forbidden, enabled])

  const teardownRoom = useCallback(async () => {
    audioTrackRef.current = null
    const current = roomRef.current
    roomRef.current = null
    if (current) {
      try { await current.disconnect() } catch { /* ignore */ }
    }
  }, [])

  // Início sincronizado: dispara quando o admin aperta Iniciar (ou se o
  // cluster já estava iniciado quando o membro entrou).
  const autoStart = useCallback(async () => {
    if (phaseRef.current !== "lobby") return
    const profileId = selectedIdRef.current
    const profile = profilesRef.current.find((p) => p.id_profile === profileId)
    if (!profileId || !profile?.is_paid || !camRef.current) {
      // Modo "só sinais": sem subperfil pago (ou sem câmera) não transmite,
      // mas continua recebendo os botões/textos do admin.
      return
    }
    setError(null)
    setPhase("connecting")
    try {
      const cam = camRef.current
      const session = await startLive({ id_profile: profileId })
      const room = new Room({ adaptiveStream: true, dynacast: true })
      roomRef.current = room
      room.on(RoomEvent.Disconnected, () => {
        if (roomRef.current === room) roomRef.current = null
      })
      await room.connect(session.ws_url, session.token)
      const vRaw = cam.videoTrack
      const aRaw = cam.audioTrack
      if (vRaw) await room.localParticipant.publishTrack(new LocalVideoTrack(vRaw))
      if (aRaw) {
        const aTrack = new LocalAudioTrack(aRaw)
        audioTrackRef.current = aTrack
        await room.localParticipant.publishTrack(aTrack)
      }
      activeLiveIdRef.current = session.live.id_live
      setPhase("live")
    } catch (err) {
      await teardownRoom()
      setPhase("lobby")
      setError(err instanceof Error ? err.message : t("startFailed", "Falha ao iniciar a sua live"))
    }
  }, [teardownRoom, t])

  // Encerramento vindo do admin: todo mundo para junto.
  const stopFromAdmin = useCallback(async () => {
    const liveId = activeLiveIdRef.current
    activeLiveIdRef.current = null
    await teardownRoom()
    if (liveId) {
      try { await endLive(liveId) } catch { /* best-effort */ }
    }
    setPhase("lobby")
    setEndedNote(true)
  }, [teardownRoom])

  // ── Sala em tempo real ────────────────────────────────────────────────────
  useEffect(() => {
    if (!id || forbidden || !enabled) return
    emitRealtime("cluster:subscribe", { id_live_cluster: id })
    const offStart = onRealtime("cluster:start", (payload) => {
      const p = payload as { id_live_cluster?: string }
      if (p?.id_live_cluster !== id) return
      setCluster((c) => (c ? { ...c, status: "started" } : c))
      setEndedNote(false)
      autoStart()
    })
    const offEnd = onRealtime("cluster:end", (payload) => {
      const p = payload as { id_live_cluster?: string }
      if (p?.id_live_cluster !== id) return
      setCluster((c) => (c ? { ...c, status: "idle" } : c))
      stopFromAdmin()
    })
    const offSignal = onRealtime("cluster:signal", (payload) => {
      const p = payload as ClusterSignal & { id_live_cluster?: string }
      if (p?.id_live_cluster !== id) return
      setSignal({ signal_id: p.signal_id, kind: p.kind, label: p.label, color: p.color, text: p.text })
    })
    const offPresence = onRealtime("cluster:presence", (payload) => {
      const p = payload as { id_live_cluster?: string; user_ids?: string[] }
      if (p?.id_live_cluster !== id) return
      setOnlineCount((p.user_ids || []).length)
    })
    return () => {
      emitRealtime("cluster:unsubscribe", { id_live_cluster: id })
      offStart(); offEnd(); offSignal(); offPresence()
    }
  }, [id, forbidden, enabled, autoStart, stopFromAdmin])

  // Cluster já iniciado quando o membro chegou → entra na live assim que a
  // câmera e os subperfis estiverem prontos.
  useEffect(() => {
    if (cluster?.status === "started" && camReady && profiles.length > 0 && phase === "lobby") {
      autoStart()
    }
  }, [cluster?.status, camReady, profiles.length, phase, autoStart])

  // Saiu da tela sem encerrar → derruba a própria live (best-effort).
  useEffect(() => () => {
    teardownRoom()
    const liveId = activeLiveIdRef.current
    if (liveId) {
      activeLiveIdRef.current = null
      try {
        const token = getToken()
        fetch(`/api/lives/${encodeURIComponent(liveId)}/end`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token || ""}`, "Content-Type": "application/json" },
          keepalive: true,
        }).catch(() => {})
      } catch { /* ignore */ }
    }
  }, [teardownRoom])

  const toggleMic = useCallback(() => {
    const next = !micOn
    setMicOn(next)
    if (audioTrackRef.current) {
      if (next) audioTrackRef.current.unmute()
      else audioTrackRef.current.mute()
    }
  }, [micOn])

  const handleLeave = useCallback(async () => {
    const liveId = activeLiveIdRef.current
    activeLiveIdRef.current = null
    await teardownRoom()
    if (liveId) {
      try { await endLive(liveId) } catch { /* best-effort */ }
    }
    router.push("/cluster")
  }, [teardownRoom, router])

  // ── Estados de página ─────────────────────────────────────────────────────
  if (!enabled) {
    return (
      <div className="fl-sharp flex min-h-[100dvh] items-center justify-center bg-[#0b0804] px-6">
        <p className="text-sm text-white/60">{t("unavailable", "Recurso indisponível.")}</p>
      </div>
    )
  }
  if (forbidden) {
    return (
      <div className="fl-sharp flex min-h-[100dvh] flex-col items-center justify-center gap-4 bg-[#0b0804] px-6 text-center">
        <AlertCircle className="h-8 w-8 text-red-400" />
        <p className="text-sm text-white/70">{t("notMember", "Você não faz parte deste cluster.")}</p>
        <button
          type="button"
          onClick={() => router.push("/cluster")}
          className="border border-white/20 px-4 py-2 text-sm text-white transition hover:bg-white/10"
        >
          {t("back", "Voltar")}
        </button>
      </div>
    )
  }
  if (loading || loadError) {
    return (
      <div className="fl-sharp flex min-h-[100dvh] flex-col items-center justify-center gap-3 bg-[#0b0804] px-6 text-center">
        {loadError ? (
          <>
            <AlertCircle className="h-8 w-8 text-red-400" />
            <p className="text-sm text-white/70">{loadError}</p>
          </>
        ) : (
          <Loader2 className="h-8 w-8 animate-spin text-[#F2B705]" />
        )}
      </div>
    )
  }

  const selectedProfile = profiles.find((p) => p.id_profile === selectedId) || null
  const cueOnly = profiles.length > 0 && !profiles.some((p) => p.is_paid)

  return (
    <div className="fl-sharp fixed inset-0 z-[90] flex flex-col bg-black">
      {/* Preview / transmissão fullbleed */}
      <video ref={videoRef} className="absolute inset-0 h-full w-full object-cover" autoPlay playsInline muted />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/55 via-transparent to-black/70" />

      {/* Topo */}
      <div className="relative z-10 flex items-center gap-2 px-4 pt-[max(1rem,env(safe-area-inset-top))]">
        <button
          type="button"
          onClick={handleLeave}
          className="flex h-9 w-9 items-center justify-center bg-black/50 text-white backdrop-blur transition hover:bg-black/70"
          aria-label={t("leave", "Sair")}
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <span className="max-w-[40vw] truncate bg-black/45 px-3 py-1 text-xs font-bold text-white backdrop-blur">
          {cluster?.name}
        </span>
        <span className="inline-flex items-center gap-1 bg-black/45 px-2 py-1 text-xs text-white/80 backdrop-blur">
          <Users className="h-3.5 w-3.5" /> {onlineCount}
        </span>
        <div className="ml-auto flex items-center gap-2">
          {phase === "live" && (
            <>
              <span className="inline-flex items-center gap-1.5 bg-red-600 px-3 py-1 text-xs font-bold uppercase tracking-wider text-white shadow-lg">
                <span className="h-2 w-2 animate-pulse bg-white" />
                {t("liveBadge", "Ao vivo")}
              </span>
              <button
                type="button"
                onClick={toggleMic}
                className={cn(
                  "flex h-9 w-9 items-center justify-center backdrop-blur transition",
                  micOn ? "bg-black/50 text-white hover:bg-black/70" : "bg-red-600 text-white",
                )}
                aria-label={micOn ? t("micOff", "Desligar microfone") : t("micOn", "Ligar microfone")}
              >
                {micOn ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Lobby: escolha de subperfil + aguardando o admin */}
      <AnimatePresence>
        {phase !== "live" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={SPRING}
            className="relative z-10 mt-auto flex flex-col gap-4 border-t border-white/10 bg-neutral-950/85 px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-5 backdrop-blur-xl"
          >
            {endedNote && (
              <p className="border border-white/15 bg-white/[0.05] px-3 py-2 text-xs text-white/75">
                {t("endedNote", "O administrador encerrou — todo mundo parou junto.")}
              </p>
            )}

            <div className="flex items-center gap-2 text-white">
              {phase === "connecting" ? (
                <Loader2 className="h-5 w-5 animate-spin text-[#F2B705]" />
              ) : (
                <span className="h-2.5 w-2.5 animate-pulse bg-[#F2B705]" />
              )}
              <p className="text-sm font-bold">
                {phase === "connecting"
                  ? t("connecting", "Iniciando a sua live…")
                  : t("waitingTitle", "Aguardando o administrador iniciar…")}
              </p>
            </div>
            <p className="text-xs text-white/60">
              {t("waitingHint", "Fique nesta tela. Quando o administrador apertar Iniciar, a live de todo mundo começa na mesma hora — e os sinais dele aparecem aqui, bem grandes.")}
            </p>

            {/* Subperfil de transmissão */}
            {profiles.length > 0 && (
              <div className="space-y-2">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-white/50">
                  {t("broadcastAs", "Transmitir como")}
                </p>
                <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {profiles.map((p) => {
                    const isSel = p.id_profile === selectedId
                    return (
                      <button
                        key={p.id_profile}
                        type="button"
                        onClick={() => setSelectedId(p.id_profile)}
                        className={cn(
                          "flex w-[78px] shrink-0 flex-col items-center gap-1.5 border p-2.5 text-center transition-colors",
                          isSel ? "border-[#F2B705]/70 bg-[#F2B705]/10" : "border-white/10 bg-white/[0.03] hover:border-white/25",
                        )}
                      >
                        <Avatar className={cn("h-11 w-11 ring-2 transition", isSel ? "ring-[#F2B705]/80" : "ring-transparent")} data-avatar>
                          {p.avatar_url && <AvatarImage src={p.avatar_url} alt={p.display_name} />}
                          <AvatarFallback className="bg-zinc-800 text-[10px] text-white/80">
                            {p.display_name?.[0]?.toUpperCase() || "?"}
                          </AvatarFallback>
                        </Avatar>
                        <span className="line-clamp-1 text-[10px] font-medium text-white/90">{p.display_name}</span>
                        <span
                          className={cn(
                            "px-1.5 py-px text-[8px] font-semibold uppercase tracking-wider",
                            p.is_paid ? "bg-emerald-400/20 text-emerald-200" : "bg-white/10 text-white/40",
                          )}
                        >
                          {p.is_paid ? t("profilePaid", "Ativo") : t("profileUnpaid", "Sem assinatura")}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {(cueOnly || (selectedProfile && !selectedProfile.is_paid)) && (
              <p className="border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-[11px] text-amber-200">
                {t("cueOnlyHint", "Sem subperfil com assinatura ativa você recebe os sinais do administrador, mas não transmite a sua própria live.")}
              </p>
            )}

            <AnimatePresence>
              {error && (
                <motion.p
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  className="flex items-start gap-2 border border-red-500/30 bg-red-500/[0.08] px-3 py-2 text-xs text-red-200"
                >
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </motion.p>
              )}
            </AnimatePresence>

            {!camReady && !error && (
              <p className="flex items-center gap-2 text-xs text-white/50">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> {t("preparingCamera", "Preparando câmera…")}
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sinais gigantes do admin (lobby E live) */}
      <ClusterSignalOverlay signal={signal} />

      {/* Selo AO VIVO no rodapé durante a live */}
      {phase === "live" && (
        <div className="pointer-events-none relative z-10 mt-auto flex justify-center pb-[max(1.5rem,env(safe-area-inset-bottom))]">
          <span className="inline-flex items-center gap-2 bg-black/50 px-4 py-2 text-xs font-bold text-white backdrop-blur">
            <Radio className="h-4 w-4 text-red-500" />
            {t("liveFooter", "Sua live está no ar — comandos do administrador aparecem na tela.")}
          </span>
        </div>
      )}
    </div>
  )
}
