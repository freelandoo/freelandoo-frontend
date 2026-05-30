"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import {
  AlertCircle, Check, Loader2, Mic, MicOff, RefreshCw, RotateCcw,
  SwitchCamera, Upload, X, Sliders, Sparkles,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { getToken } from "@/lib/auth"
import { detectCapabilities, isH264EncodeSupported, type CameraCapabilities } from "@/lib/camera/capabilities"
import { openCamera, switchCamera, stopStream, CameraPermissionError, type CameraHandle, type Facing } from "@/lib/camera/camera-stream"
import { CameraRenderer } from "@/lib/camera/renderer"
import { StoryRecorder, canvasToPoster, type RecordResult } from "@/lib/camera/recorder"
import { uploadStory } from "@/lib/camera/upload"
import { PRESETS, DEFAULT_PRESET_ID, getPreset } from "@/lib/camera/presets"
import { FaceTracker } from "@/lib/camera/face-tracker"
import {
  FilterState, OverlayState, FrameStyle, StickerInstance, FilterMeta,
  NEUTRAL_OVERLAY, StoryKind, AccessoryType,
} from "@/lib/camera/types"

const MAX_DURATION = 60
const SPRING = { type: "spring" as const, stiffness: 220, damping: 26 }
const TARGET_W = 720
const TARGET_H = 1280
const STICKER_CHARS = ["🐝", "🔥", "⭐", "👑", "💛", "✨", "📸", "💬"]
const FRAMES: { id: FrameStyle; label: string }[] = [
  { id: "none", label: "Nenhuma" },
  { id: "classic", label: "Clássica" },
  { id: "tabloide", label: "Tabloide" },
  { id: "polaroid", label: "Polaroid" },
]
const ACCESSORIES: { id: AccessoryType; label: string }[] = [
  { id: "none", label: "Nenhum" },
  { id: "glasses", label: "👓 Óculos" },
  { id: "sunglasses", label: "🕶 Escuros" },
  { id: "crown", label: "👑 Coroa" },
  { id: "hat", label: "🎉 Chapéu" },
]

type Phase = "permission" | "denied" | "unsupported" | "live" | "review" | "publishing"

interface CameraStudioProps {
  open: boolean
  profileId: string | null
  kind: StoryKind
  caption?: string
  onClose: () => void
  onPosted?: () => void
}

export function CameraStudio({ open, profileId, kind, caption, onClose, onPosted }: CameraStudioProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const rendererRef = useRef<CameraRenderer | null>(null)
  const recorderRef = useRef<StoryRecorder | null>(null)
  const handleRef = useRef<CameraHandle | null>(null)
  const rafRef = useRef<number | null>(null)
  const filterRef = useRef<FilterState>(getPreset(DEFAULT_PRESET_ID).filter)
  const overlayRef = useRef<OverlayState>(NEUTRAL_OVERLAY)
  const recStartRef = useRef<number>(0)
  const faceTrackerRef = useRef<FaceTracker | null>(null)

  const [caps, setCaps] = useState<CameraCapabilities | null>(null)
  const [phase, setPhase] = useState<Phase>("permission")
  const [facing, setFacing] = useState<Facing>("user")
  const [micOn, setMicOn] = useState(true)
  const [presetId, setPresetId] = useState(DEFAULT_PRESET_ID)
  const [filter, setFilter] = useState<FilterState>(getPreset(DEFAULT_PRESET_ID).filter)
  const [overlay, setOverlay] = useState<OverlayState>(NEUTRAL_OVERLAY)
  const [showAdjust, setShowAdjust] = useState(false)
  const [recording, setRecording] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [result, setResult] = useState<RecordResult | null>(null)
  const [reviewUrl, setReviewUrl] = useState<string | null>(null)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [faceLoading, setFaceLoading] = useState(false)
  const dragRef = useRef<{ id: string } | null>(null)

  useEffect(() => { filterRef.current = filter }, [filter])
  useEffect(() => { overlayRef.current = overlay }, [overlay])

  // ─── loop de render ──────────────────────────────────────────────────────
  const loop = useCallback(() => {
    const r = rendererRef.current
    const v = videoRef.current
    if (r && v && v.readyState >= 2) {
      if (overlayRef.current.accessory !== "none" && faceTrackerRef.current) {
        r.setFace(faceTrackerRef.current.detect(v, performance.now()))
      } else {
        r.setFace(null)
      }
      r.setFilter(filterRef.current)
      r.setOverlay(overlayRef.current)
      r.renderFrame(v)
      recorderRef.current?.captureVideoFrame()
    }
    if (recorderRef.current?.isRecording) {
      const e = (performance.now() - recStartRef.current) / 1000
      setElapsed(e)
      if (e >= MAX_DURATION) { void stopRecording() }
    }
    rafRef.current = requestAnimationFrame(loop)
  }, [])

  // ─── abrir câmera ────────────────────────────────────────────────────────
  const boot = useCallback(async (nextFacing: Facing, audio: boolean) => {
    setError(null)
    try {
      const handle = handleRef.current
        ? await switchCamera(handleRef.current, audio)
        : await openCamera({ facing: nextFacing, audio })
      handleRef.current = handle
      setFacing(handle.facing)
      const video = videoRef.current!
      video.srcObject = handle.stream
      video.muted = true
      await video.play().catch(() => {})
      if (!rendererRef.current && canvasRef.current) {
        const rnd = new CameraRenderer(canvasRef.current, filterRef.current, overlayRef.current)
        rnd.setSize(TARGET_W, TARGET_H)
        rendererRef.current = rnd
      }
      rendererRef.current?.setFlipX(handle.facing === "user")
      setPhase("live")
      if (rafRef.current == null) rafRef.current = requestAnimationFrame(loop)
    } catch (err) {
      if (err instanceof CameraPermissionError) {
        if (err.kind === "denied") setPhase("denied")
        else if (err.kind === "unsupported" || err.kind === "insecure") setPhase("unsupported")
        else { setPhase("denied"); setError(err.message) }
      } else {
        setPhase("denied")
        setError(err instanceof Error ? err.message : "Falha ao abrir a câmera.")
      }
    }
  }, [loop])

  // init quando abre
  useEffect(() => {
    if (!open) return
    const c = detectCapabilities()
    setCaps(c)
    if (!c.getUserMedia || c.recordPath === "none" || !c.canFilter) {
      setPhase("unsupported")
      return
    }
    setPhase("permission")
    // não auto-inicia: espera o gesto do usuário (botão "Permitir")
    return () => { teardown() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  // pausa câmera ao esconder a aba
  useEffect(() => {
    if (!open) return
    const onVis = () => { if (document.visibilityState === "hidden") teardown() }
    document.addEventListener("visibilitychange", onVis)
    return () => document.removeEventListener("visibilitychange", onVis)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const teardown = useCallback(() => {
    if (rafRef.current != null) { cancelAnimationFrame(rafRef.current); rafRef.current = null }
    try { recorderRef.current?.cancel() } catch { /* noop */ }
    recorderRef.current = null
    try { rendererRef.current?.dispose() } catch { /* noop */ }
    rendererRef.current = null
    try { faceTrackerRef.current?.close() } catch { /* noop */ }
    faceTrackerRef.current = null
    stopStream(handleRef.current?.stream)
    handleRef.current = null
    if (videoRef.current) videoRef.current.srcObject = null
  }, [])

  const closeAll = useCallback(() => {
    teardown()
    if (reviewUrl) URL.revokeObjectURL(reviewUrl)
    setReviewUrl(null)
    setResult(null)
    setRecording(false)
    setElapsed(0)
    setProgress(0)
    onClose()
  }, [teardown, reviewUrl, onClose])

  // ─── preset / ajustes ────────────────────────────────────────────────────
  const applyPreset = (id: string) => {
    setPresetId(id)
    setFilter({ ...getPreset(id).filter })
  }
  const setAdj = (k: keyof FilterState, val: number) =>
    setFilter((f) => ({ ...f, [k]: val }))

  // ─── stickers ──────────────────────────────────────────────────────────────
  const addSticker = (char: string) => {
    const s: StickerInstance = { id: crypto.randomUUID(), char, x: 0.5, y: 0.5, size: 0.16 }
    setOverlay((o) => ({ ...o, stickers: [...o.stickers, s] }))
  }
  const clearStickers = () => setOverlay((o) => ({ ...o, stickers: [] }))

  // ─── acessórios de rosto (lazy-load do MediaPipe) ──────────────────────────
  const selectAccessory = async (type: AccessoryType) => {
    if (type === "none") {
      setOverlay((o) => ({ ...o, accessory: "none" }))
      return
    }
    if (!faceTrackerRef.current && !faceLoading) {
      setFaceLoading(true)
      setError(null)
      try {
        faceTrackerRef.current = await FaceTracker.create()
      } catch {
        setError("Não foi possível carregar o detector de rosto neste aparelho.")
        setFaceLoading(false)
        setOverlay((o) => ({ ...o, accessory: "none" }))
        return
      }
      setFaceLoading(false)
    }
    setOverlay((o) => ({ ...o, accessory: type }))
  }

  const canvasPoint = (e: React.PointerEvent) => {
    const rect = (e.target as HTMLCanvasElement).getBoundingClientRect()
    return { x: (e.clientX - rect.left) / rect.width, y: (e.clientY - rect.top) / rect.height }
  }
  const onPointerDown = (e: React.PointerEvent) => {
    if (phase !== "live" || !overlay.stickers.length) return
    const p = canvasPoint(e)
    let nearest: StickerInstance | null = null
    let best = 0.12
    for (const s of overlay.stickers) {
      const d = Math.hypot(s.x - p.x, s.y - p.y)
      if (d < best) { best = d; nearest = s }
    }
    if (nearest) { dragRef.current = { id: nearest.id }; (e.target as HTMLElement).setPointerCapture(e.pointerId) }
  }
  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current) return
    const p = canvasPoint(e)
    setOverlay((o) => ({
      ...o,
      stickers: o.stickers.map((s) =>
        s.id === dragRef.current!.id ? { ...s, x: Math.min(1, Math.max(0, p.x)), y: Math.min(1, Math.max(0, p.y)) } : s
      ),
    }))
  }
  const onPointerUp = () => { dragRef.current = null }

  // ─── gravar ──────────────────────────────────────────────────────────────
  const startRecording = async () => {
    if (!caps || !canvasRef.current) return
    setError(null)
    let path = caps.recordPath
    if (path === "webcodecs") {
      const ok = await isH264EncodeSupported(TARGET_W, TARGET_H)
      if (!ok) path = caps.mediaRecorderMp4 ? "mediarecorder" : "none"
    }
    if (path === "none") { setError("Gravação não suportada neste navegador."); return }
    const audioTrack = micOn ? handleRef.current?.stream.getAudioTracks()[0] || null : null
    const rec = new StoryRecorder({
      getCanvas: () => canvasRef.current!,
      audioTrack,
      width: TARGET_W,
      height: TARGET_H,
      path,
    })
    try {
      await rec.start()
      recorderRef.current = rec
      recStartRef.current = performance.now()
      setElapsed(0)
      setRecording(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao iniciar gravação.")
    }
  }

  const stopRecording = async () => {
    const rec = recorderRef.current
    if (!rec || !rec.isRecording) return
    setRecording(false)
    try {
      const res = await rec.stop()
      recorderRef.current = null
      const poster = canvasRef.current ? await canvasToPoster(canvasRef.current) : null
      ;(res as RecordResult & { poster?: Blob | null }).poster = poster
      setResult(res)
      const url = URL.createObjectURL(res.blob)
      setReviewUrl(url)
      setPhase("review")
      if (rafRef.current != null) { cancelAnimationFrame(rafRef.current); rafRef.current = null }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao finalizar o vídeo.")
    }
  }

  const reRecord = () => {
    if (reviewUrl) URL.revokeObjectURL(reviewUrl)
    setReviewUrl(null)
    setResult(null)
    setElapsed(0)
    setPhase("live")
    if (rafRef.current == null) rafRef.current = requestAnimationFrame(loop)
  }

  // ─── publicar ────────────────────────────────────────────────────────────
  const publish = async () => {
    if (!result || !profileId) return
    const token = getToken()
    if (!token) { setError("Sessão expirada. Faça login novamente."); return }
    setPhase("publishing")
    setProgress(0)
    setError(null)
    const filterMeta: FilterMeta = {
      preset: presetId,
      filter,
      overlay: { frame: overlay.frame, watermark: overlay.watermark, sticker_count: overlay.stickers.length, accessory: overlay.accessory },
      encoder: result.encoder,
    }
    try {
      await uploadStory({
        token,
        id_profile: profileId,
        kind,
        videoBlob: result.blob,
        posterBlob: (result as RecordResult & { poster?: Blob | null }).poster || null,
        durationSeconds: result.durationSec,
        width: result.width,
        height: result.height,
        caption,
        filterMeta,
        onProgress: setProgress,
      })
      onPosted?.()
      closeAll()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao publicar.")
      setPhase("review")
    }
  }

  if (!open) return null

  const progressPct = Math.min(100, (elapsed / MAX_DURATION) * 100)

  return (
    <div className="fixed inset-0 z-[95] flex items-center justify-center bg-black">
      <div className="relative flex h-full w-full max-w-[560px] flex-col overflow-hidden bg-black">
        {/* vídeo cru escondido — fonte do render */}
        <video ref={videoRef} className="hidden" playsInline muted />

        {/* ÁREA DE PREVIEW */}
        <div className="relative flex-1 overflow-hidden">
          {(phase === "live" || phase === "review" || phase === "publishing") && (
            <canvas
              ref={canvasRef}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              className={cn(
                "absolute inset-0 h-full w-full object-cover touch-none",
                phase !== "live" && "opacity-0 pointer-events-none"
              )}
            />
          )}

          {/* review player */}
          {phase !== "live" && reviewUrl && (
            <video
              src={reviewUrl}
              className="absolute inset-0 h-full w-full object-cover"
              autoPlay loop playsInline controls={false}
            />
          )}

          {/* header */}
          <div className="absolute inset-x-0 top-0 z-20 flex items-center justify-between p-4">
            <button onClick={closeAll} className="rounded-full bg-black/50 p-2 text-white backdrop-blur" aria-label="Fechar">
              <X className="h-5 w-5" />
            </button>
            {phase === "live" && (
              <div className="flex items-center gap-2">
                <button onClick={() => { setMicOn((m) => !m) }} className="rounded-full bg-black/50 p-2 text-white backdrop-blur" aria-label="Microfone">
                  {micOn ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5 text-red-300" />}
                </button>
                <button onClick={() => boot(facing === "user" ? "environment" : "user", micOn)} className="rounded-full bg-black/50 p-2 text-white backdrop-blur" aria-label="Trocar câmera">
                  <SwitchCamera className="h-5 w-5" />
                </button>
              </div>
            )}
          </div>

          {/* timer */}
          {phase === "live" && recording && (
            <div className="absolute left-1/2 top-4 z-20 -translate-x-1/2 rounded-full bg-red-600/90 px-3 py-1 text-xs font-semibold text-white tabular-nums">
              ● {Math.floor(elapsed)}s / {MAX_DURATION}s
            </div>
          )}

          {/* PERMISSION / DENIED / UNSUPPORTED overlays */}
          <AnimatePresence>
            {(phase === "permission" || phase === "denied" || phase === "unsupported") && (
              <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-4 bg-gradient-to-b from-neutral-950 to-black px-8 text-center"
              >
                <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-yellow-400/15 text-yellow-300">
                  <Sparkles className="h-7 w-7" />
                </span>
                {phase === "permission" && (
                  <>
                    <div>
                      <h3 className="text-lg font-semibold text-white">Gravar com a câmera</h3>
                      <p className="mt-1 text-sm text-white/55">Filtros e efeitos rodam no seu aparelho. Nada é enviado antes de você publicar.</p>
                    </div>
                    <button onClick={() => boot(facing, micOn)} className="rounded-xl bg-gradient-to-r from-yellow-400 to-amber-500 px-6 py-2.5 text-sm font-semibold text-black">
                      Permitir câmera
                    </button>
                  </>
                )}
                {phase === "denied" && (
                  <>
                    <div>
                      <h3 className="text-lg font-semibold text-white">Permissão negada</h3>
                      <p className="mt-1 text-sm text-white/55">{error || "Libere a câmera nas configurações do navegador para gravar."}</p>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => boot(facing, micOn)} className="rounded-xl border border-white/15 px-4 py-2 text-sm font-medium text-white">Tentar de novo</button>
                      <button onClick={closeAll} className="rounded-xl bg-white/10 px-4 py-2 text-sm font-medium text-white">Enviar arquivo</button>
                    </div>
                  </>
                )}
                {phase === "unsupported" && (
                  <>
                    <div>
                      <h3 className="text-lg font-semibold text-white">Câmera indisponível aqui</h3>
                      <p className="mt-1 text-sm text-white/55">Seu navegador não suporta a câmera com filtros. Use a opção de enviar um arquivo de vídeo.</p>
                    </div>
                    <button onClick={closeAll} className="rounded-xl bg-gradient-to-r from-yellow-400 to-amber-500 px-6 py-2.5 text-sm font-semibold text-black">
                      <Upload className="mr-1.5 inline h-4 w-4" />Enviar arquivo
                    </button>
                  </>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* PUBLISHING overlay */}
          {phase === "publishing" && (
            <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-4 bg-black/70 backdrop-blur-sm">
              <Loader2 className="h-8 w-8 animate-spin text-yellow-300" />
              <div className="w-56">
                <div className="mb-1 flex justify-between text-xs text-white/70"><span>Publicando…</span><span>{Math.round(progress * 100)}%</span></div>
                <div className="h-1.5 overflow-hidden rounded-full bg-white/15">
                  <div className="h-full bg-gradient-to-r from-yellow-400 to-amber-500 transition-all" style={{ width: `${progress * 100}%` }} />
                </div>
              </div>
            </div>
          )}

          {/* erro flutuante */}
          <AnimatePresence>
            {error && phase !== "denied" && phase !== "unsupported" && (
              <motion.div
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}
                className="absolute inset-x-4 bottom-44 z-30 flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-950/80 px-3 py-2 text-xs text-red-200 backdrop-blur"
              >
                <AlertCircle className="mt-px h-4 w-4 shrink-0" /><span>{error}</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* CONTROLES (live) */}
        {phase === "live" && (
          <div className="relative z-20 shrink-0 bg-gradient-to-t from-black via-black/95 to-transparent pb-[max(env(safe-area-inset-bottom),1rem)] pt-2">
            {/* ajustes retráteis */}
            <AnimatePresence>
              {showAdjust && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden px-5"
                >
                  <div className="space-y-2 py-2">
                    <Slider label="Brilho" value={filter.brightness} min={-0.5} max={0.5} onChange={(v) => setAdj("brightness", v)} />
                    <Slider label="Contraste" value={filter.contrast} min={-0.5} max={0.5} onChange={(v) => setAdj("contrast", v)} />
                    <Slider label="Saturação" value={filter.saturation} min={-1} max={1} onChange={(v) => setAdj("saturation", v)} />
                    <Slider label="Temperatura" value={filter.temperature} min={-0.5} max={0.5} onChange={(v) => setAdj("temperature", v)} />
                    <Slider label="Vinheta" value={filter.vignette} min={0} max={1} onChange={(v) => setAdj("vignette", v)} />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* acessórios de rosto */}
            {!recording && (
              <div className="flex items-center gap-2 overflow-x-auto px-5 py-1.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                <span className="shrink-0 text-[10px] uppercase tracking-wider text-white/30">Rostos</span>
                {ACCESSORIES.map((a) => (
                  <Chip key={a.id} active={overlay.accessory === a.id} onClick={() => selectAccessory(a.id)}>{a.label}</Chip>
                ))}
                {faceLoading && <Loader2 className="h-4 w-4 shrink-0 animate-spin text-yellow-300" />}
              </div>
            )}

            {/* molduras + stickers + marca */}
            {!recording && (
              <div className="flex items-center gap-2 overflow-x-auto px-5 py-1.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {FRAMES.map((fr) => (
                  <Chip key={fr.id} active={overlay.frame === fr.id} onClick={() => setOverlay((o) => ({ ...o, frame: fr.id }))}>{fr.label}</Chip>
                ))}
                <Chip active={overlay.watermark} onClick={() => setOverlay((o) => ({ ...o, watermark: !o.watermark }))}>Marca</Chip>
                <span className="mx-1 h-5 w-px shrink-0 bg-white/15" />
                {STICKER_CHARS.map((c) => (
                  <button key={c} onClick={() => addSticker(c)} className="shrink-0 rounded-lg px-1.5 text-xl">{c}</button>
                ))}
                {overlay.stickers.length > 0 && (
                  <button onClick={clearStickers} className="shrink-0 rounded-full bg-white/10 p-1.5 text-white/70"><RefreshCw className="h-3.5 w-3.5" /></button>
                )}
              </div>
            )}

            {/* presets */}
            {!recording && (
              <div className="flex items-center gap-2 overflow-x-auto px-5 py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {PRESETS.map((p) => (
                  <button key={p.id} onClick={() => applyPreset(p.id)} className="flex shrink-0 flex-col items-center gap-1">
                    <span className={cn("h-11 w-11 rounded-xl ring-2 transition", presetId === p.id ? "ring-yellow-400" : "ring-white/15")} style={{ background: p.swatch }} />
                    <span className={cn("text-[10px]", presetId === p.id ? "text-yellow-300" : "text-white/55")}>{p.label}</span>
                  </button>
                ))}
              </div>
            )}

            {/* barra de ação */}
            <div className="flex items-center justify-between px-8 py-3">
              <button onClick={() => setShowAdjust((s) => !s)} className={cn("rounded-full p-3", showAdjust ? "bg-yellow-400/20 text-yellow-300" : "bg-white/10 text-white")} aria-label="Ajustes">
                <Sliders className="h-5 w-5" />
              </button>

              <button onClick={() => (recording ? stopRecording() : startRecording())} className="relative flex h-[72px] w-[72px] items-center justify-center" aria-label={recording ? "Parar" : "Gravar"}>
                <svg className="absolute inset-0 -rotate-90" viewBox="0 0 72 72">
                  <circle cx="36" cy="36" r="33" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="4" />
                  {recording && <circle cx="36" cy="36" r="33" fill="none" stroke="#facc15" strokeWidth="4" strokeLinecap="round" strokeDasharray={2 * Math.PI * 33} strokeDashoffset={2 * Math.PI * 33 * (1 - progressPct / 100)} />}
                </svg>
                <span className={cn("transition-all", recording ? "h-7 w-7 rounded-md bg-red-500" : "h-14 w-14 rounded-full bg-red-500 ring-4 ring-white/30")} />
              </button>

              <div className="w-11" />
            </div>
          </div>
        )}

        {/* CONTROLES (review) */}
        {phase === "review" && result && (
          <div className="relative z-20 shrink-0 bg-black pb-[max(env(safe-area-inset-bottom),1rem)] pt-3">
            {result.audioDropped && (
              <p className="px-6 pb-2 text-center text-[11px] text-amber-300/90">Seu navegador gravou sem áudio (limitação do iOS antigo). O vídeo será publicado sem som.</p>
            )}
            <div className="flex items-center justify-center gap-3 px-6">
              <button onClick={reRecord} className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 px-5 py-2.5 text-sm font-medium text-white">
                <RotateCcw className="h-4 w-4" />Regravar
              </button>
              <button onClick={publish} className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-yellow-400 to-amber-500 px-6 py-2.5 text-sm font-semibold text-black">
                <Check className="h-4 w-4" />Publicar story
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function Slider({ label, value, min, max, onChange }: { label: string; value: number; min: number; max: number; onChange: (v: number) => void }) {
  return (
    <label className="flex items-center gap-3 text-[11px] text-white/60">
      <span className="w-20 shrink-0">{label}</span>
      <input type="range" min={min} max={max} step={0.01} value={value} onChange={(e) => onChange(Number(e.target.value))} className="h-1 flex-1 accent-yellow-400" />
    </label>
  )
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} className={cn("shrink-0 rounded-full border px-3 py-1 text-xs transition", active ? "border-yellow-400 bg-yellow-400/15 text-yellow-300" : "border-white/15 text-white/70")}>
      {children}
    </button>
  )
}
