"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import Image from "next/image"
import { AnimatePresence, motion } from "framer-motion"
import {
  AlertCircle, Check, Loader2, Mic, MicOff, RefreshCw, RotateCcw, RotateCw,
  SwitchCamera, Upload, X, Sparkles, Palette,
  SlidersHorizontal, Glasses, Brush, Frame,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { getToken } from "@/lib/auth"
import { detectCapabilities, isH264EncodeSupported, isInAppBrowser, type CameraCapabilities } from "@/lib/camera/capabilities"
import { openCamera, switchCamera, stopStream, CameraPermissionError, type CameraHandle, type Facing } from "@/lib/camera/camera-stream"
import { CameraRenderer } from "@/lib/camera/renderer"
import { StoryRecorder, canvasToPoster, type RecordResult } from "@/lib/camera/recorder"
import { uploadStory } from "@/lib/camera/upload"
import { PRESETS, DEFAULT_PRESET_ID, getPreset } from "@/lib/camera/presets"
import { FaceTracker } from "@/lib/camera/face-tracker"
import {
  FilterState, OverlayState, FrameStyle, StickerInstance, FilterMeta,
  NEUTRAL_OVERLAY, StoryKind, AccessoryType, MakeupState, NEUTRAL_MAKEUP,
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
// Quadradinhos sem nome (só ícone/imagem) — rolagem horizontal por categoria.
const ACCESSORY_TILES: { id: AccessoryType; emoji: string }[] = [
  { id: "none", emoji: "" },
  { id: "glasses", emoji: "👓" },
  { id: "red-glasses", emoji: "🔴" },
  { id: "sunglasses", emoji: "🕶" },
  { id: "crown", emoji: "👑" },
  { id: "hat", emoji: "🎉" },
]
type MakeupItem = "pele" | "batom" | "blush"
const MAKEUP_TILES: { id: MakeupItem; emoji: string }[] = [
  { id: "pele", emoji: "✨" },
  { id: "batom", emoji: "💄" },
  { id: "blush", emoji: "🌸" },
]
type PanelTab = null | "filtros" | "rostos" | "maquiagem" | "molduras"
const CATS: { id: Exclude<PanelTab, null>; Icon: typeof Palette }[] = [
  { id: "filtros", Icon: SlidersHorizontal },
  { id: "rostos", Icon: Glasses },
  { id: "maquiagem", Icon: Brush },
  { id: "molduras", Icon: Frame },
]

// Régua de cor (hue 0..360) ↔ hex, saturação/luminância fixas.
function hueToHex(h: number): string {
  const s = 0.7, l = 0.5
  const a = s * Math.min(l, 1 - l)
  const f = (n: number) => {
    const k = (n + h / 30) % 12
    const c = l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1))
    return Math.round(255 * c).toString(16).padStart(2, "0")
  }
  return `#${f(0)}${f(8)}${f(4)}`
}
function hexToHue(hex: string): number {
  const s = hex.replace("#", "")
  const r = parseInt(s.slice(0, 2), 16) / 255
  const g = parseInt(s.slice(2, 4), 16) / 255
  const b = parseInt(s.slice(4, 6), 16) / 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b)
  const d = max - min
  if (d === 0) return 0
  let h = 0
  if (max === r) h = ((g - b) / d) % 6
  else if (max === g) h = (b - r) / d + 2
  else h = (r - g) / d + 4
  h = Math.round(h * 60)
  return h < 0 ? h + 360 : h
}

// Ângulo da UI vs. orientação natural do aparelho (0 = retrato em phones).
function deviceAngle(): number {
  if (typeof window === "undefined") return 0
  const so = window.screen?.orientation
  if (so && typeof so.angle === "number") return so.angle
  const wo = (window as unknown as { orientation?: number }).orientation
  return typeof wo === "number" ? (((wo % 360) + 360) % 360) : 0
}

// 0..3 = 0/90/180/270°. A cena quase sempre vem EM PÉ (só num quadro paisagem),
// então NÃO giramos por padrão (giraria o rosto). Só rotacionamos quando o
// stream é retrato e o aparelho está deitado (pessoa segurando de lado).
// Casos raros de stream realmente deitado: usar o botão manual de girar.
function autoRotation(vw: number, vh: number, angle: number): 0 | 1 | 2 | 3 {
  if (!vw || !vh) return 0
  const streamPortrait = vh >= vw
  const deviceLandscape = angle === 90 || angle === 270
  if (streamPortrait && deviceLandscape) return angle === 90 ? 1 : 3
  return 0
}

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
  const makeupRef = useRef<MakeupState>(NEUTRAL_MAKEUP)
  const recStartRef = useRef<number>(0)
  const faceTrackerRef = useRef<FaceTracker | null>(null)
  const rotationRef = useRef(0)

  const [caps, setCaps] = useState<CameraCapabilities | null>(null)
  const [phase, setPhase] = useState<Phase>("permission")
  const [facing, setFacing] = useState<Facing>("user")
  const [micOn, setMicOn] = useState(true)
  const [presetId, setPresetId] = useState(DEFAULT_PRESET_ID)
  const [filter, setFilter] = useState<FilterState>(getPreset(DEFAULT_PRESET_ID).filter)
  const [overlay, setOverlay] = useState<OverlayState>(NEUTRAL_OVERLAY)
  const [makeup, setMakeup] = useState<MakeupState>(NEUTRAL_MAKEUP)
  const [panelTab, setPanelTab] = useState<PanelTab>(null)
  const [makeupItem, setMakeupItem] = useState<MakeupItem>("pele")
  const [rotation, setRotation] = useState<0 | 1 | 2 | 3>(0)
  const [inApp, setInApp] = useState(false)
  const [linkCopied, setLinkCopied] = useState(false)
  const [showWebviewTip, setShowWebviewTip] = useState(true)
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
  useEffect(() => { makeupRef.current = makeup }, [makeup])
  useEffect(() => { rotationRef.current = rotation }, [rotation])
  useEffect(() => { setInApp(isInAppBrowser()) }, [])

  const copyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setLinkCopied(true)
      window.setTimeout(() => setLinkCopied(false), 2200)
    } catch {
      /* clipboard bloqueado — usuário copia manual pela barra */
    }
  }, [])

  // ─── loop de render ──────────────────────────────────────────────────────
  const loop = useCallback(() => {
    const r = rendererRef.current
    const v = videoRef.current
    if (r && v && v.readyState >= 2) {
      const mk = makeupRef.current
      const faceActive =
        overlayRef.current.accessory !== "none" ||
        mk.skinSmooth > 0 || mk.lipstick > 0 || mk.blush > 0
      if (faceActive && faceTrackerRef.current) {
        r.setFace(faceTrackerRef.current.detect(v, performance.now()))
      } else {
        r.setFace(null)
      }
      r.setMakeup(mk)
      r.setFilter(filterRef.current)
      r.setOverlay(overlayRef.current)
      r.setRotation(rotationRef.current)
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
      await new Promise<void>((resolve) => {
        if (video.videoWidth && video.videoHeight) { resolve(); return }
        const timer = window.setTimeout(resolve, 1500)
        video.onloadedmetadata = () => { window.clearTimeout(timer); resolve() }
      })
      await video.play().catch(() => {})
      // orientação: tenta corrigir webviews que entregam o stream deitado
      setRotation(autoRotation(video.videoWidth, video.videoHeight, deviceAngle()))
      setPhase("live")
      // O renderer é criado no efeito abaixo, quando o <canvas> já está montado.
      // Na 1ª abertura o canvas só existe DEPOIS de phase virar "live"; criar o
      // renderer aqui pegava canvasRef.current === null → preview preto até a
      // pessoa apertar "trocar câmera" (que rebootava com o canvas já no DOM).
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

  // cria o renderer assim que o <canvas> existe (phase "live") e sincroniza o
  // espelhamento. Resolve a tela preta na 1ª abertura (canvas montado tarde).
  useEffect(() => {
    if (phase !== "live" || !canvasRef.current) return
    let rnd = rendererRef.current
    if (!rnd) {
      rnd = new CameraRenderer(canvasRef.current, filterRef.current, overlayRef.current)
      rnd.setSize(TARGET_W, TARGET_H)
      rendererRef.current = rnd
    }
    rnd.setFlipX(facing === "user")
  }, [phase, facing])

  // init quando abre
  useEffect(() => {
    if (!open) return
    document.body.classList.add("camera-active") // oculta a toolbar global
    const c = detectCapabilities()
    setCaps(c)
    if (!c.getUserMedia || c.recordPath === "none" || !c.canFilter) {
      setPhase("unsupported")
      return () => { document.body.classList.remove("camera-active") }
    }
    setPhase("permission")
    // não auto-inicia: espera o gesto do usuário (botão "Permitir")
    return () => {
      teardown()
      document.body.classList.remove("camera-active")
    }
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

  // recalcula a rotação quando o aparelho gira
  useEffect(() => {
    if (!open) return
    const onRot = () => {
      const v = videoRef.current
      if (!v || !v.videoWidth) return
      setRotation(autoRotation(v.videoWidth, v.videoHeight, deviceAngle()))
    }
    window.addEventListener("orientationchange", onRot)
    const so = window.screen?.orientation
    so?.addEventListener?.("change", onRot)
    return () => {
      window.removeEventListener("orientationchange", onRot)
      so?.removeEventListener?.("change", onRot)
    }
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

  // ─── face tracking lazy (acessórios + maquiagem compartilham o detector) ───
  const ensureFaceLoaded = async (): Promise<boolean> => {
    if (faceTrackerRef.current) return true
    if (faceLoading) return false
    setFaceLoading(true)
    setError(null)
    try {
      faceTrackerRef.current = await FaceTracker.create()
    } catch {
      setError("Não foi possível carregar o detector de rosto neste aparelho.")
      setFaceLoading(false)
      return false
    }
    setFaceLoading(false)
    return true
  }

  const selectAccessory = async (type: AccessoryType) => {
    if (type === "none") { setOverlay((o) => ({ ...o, accessory: "none" })); return }
    if (!(await ensureFaceLoaded())) return
    setOverlay((o) => ({ ...o, accessory: type }))
  }

  const setSkin = async (v: number) => {
    if (v > 0 && !(await ensureFaceLoaded())) return
    setMakeup((m) => ({ ...m, skinSmooth: v }))
  }
  const setLipOpacity = async (v: number) => {
    if (v > 0 && !(await ensureFaceLoaded())) return
    setMakeup((m) => ({ ...m, lipstick: v }))
  }
  const setLipHue = (h: number) => setMakeup((m) => ({ ...m, lipColor: hueToHex(h) }))
  const setLipBlur = (v: number) => setMakeup((m) => ({ ...m, lipBlur: v }))

  const setBlushOpacity = async (v: number) => {
    if (v > 0 && !(await ensureFaceLoaded())) return
    setMakeup((m) => ({ ...m, blush: v }))
  }
  const setBlushHue = (h: number) => setMakeup((m) => ({ ...m, blushColor: hueToHex(h) }))
  const setBlushBlur = (v: number) => setMakeup((m) => ({ ...m, blushBlur: v }))

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
      makeup: { skin_smooth: makeup.skinSmooth, lipstick: makeup.lipstick, blush: makeup.blush },
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
        <video ref={videoRef} className="pointer-events-none absolute h-px w-px opacity-0" playsInline muted />

        {/* ÁREA DE PREVIEW */}
        <div className="relative flex-1 overflow-hidden">
          {(phase === "live" || phase === "review" || phase === "publishing") && (
            <canvas
              ref={canvasRef}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              className={cn(
                "absolute inset-0 h-full w-full object-contain touch-none",
                phase !== "live" && "opacity-0 pointer-events-none"
              )}
            />
          )}

          {/* review player */}
          {phase !== "live" && reviewUrl && (
            <video
              src={reviewUrl}
              className="absolute inset-0 h-full w-full object-contain"
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
                <button onClick={() => setRotation((r) => (((r + 1) % 4) as 0 | 1 | 2 | 3))} className="rounded-full bg-black/50 p-2 text-white backdrop-blur" aria-label="Girar imagem">
                  <RotateCw className="h-5 w-5" />
                </button>
                <button onClick={() => { setMicOn((m) => !m) }} className="rounded-full bg-black/50 p-2 text-white backdrop-blur" aria-label="Microfone">
                  {micOn ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5 text-red-300" />}
                </button>
                <button onClick={() => boot(facing === "user" ? "environment" : "user", micOn)} className="rounded-full bg-black/50 p-2 text-white backdrop-blur" aria-label="Trocar câmera">
                  <SwitchCamera className="h-5 w-5" />
                </button>
              </div>
            )}
          </div>

          {/* aviso de webview embutido (câmera presa em paisagem) */}
          {phase === "live" && inApp && showWebviewTip && (
            <div className="absolute inset-x-3 top-28 z-30 flex items-start gap-2 rounded-2xl border border-amber-400/30 bg-black/70 p-3 text-[12px] text-amber-100 backdrop-blur">
              <AlertCircle className="mt-px h-4 w-4 shrink-0 text-amber-300" />
              <div className="flex-1">
                <p className="font-semibold text-amber-200">Câmera em paisagem neste app</p>
                <p className="mt-0.5 text-amber-100/80">Para retrato e melhor qualidade, abra no navegador: ⋯ → “Abrir no Safari/Chrome”.</p>
                <button onClick={copyLink} className="mt-1.5 rounded-lg bg-amber-400/20 px-2.5 py-1 font-semibold text-amber-100">
                  {linkCopied ? "Copiado!" : "Copiar link"}
                </button>
              </div>
              <button onClick={() => setShowWebviewTip(false)} aria-label="Fechar aviso">
                <X className="h-4 w-4 text-white/60" />
              </button>
            </div>
          )}

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
                    {inApp && (
                      <div className="max-w-xs rounded-2xl border border-amber-400/30 bg-amber-400/10 p-3 text-left text-[12px] text-amber-100">
                        <p className="font-semibold text-amber-200">Abra no navegador para câmera em retrato</p>
                        <p className="mt-1 text-amber-100/80">
                          Você está num navegador dentro de outro app — aqui a câmera vem em paisagem.
                          Toque em <span className="font-semibold">⋯</span> e escolha “Abrir no Safari/Chrome”.
                        </p>
                        <button onClick={copyLink} className="mt-2 rounded-lg bg-amber-400/20 px-3 py-1.5 font-semibold text-amber-100">
                          {linkCopied ? "Link copiado!" : "Copiar link"}
                        </button>
                      </div>
                    )}
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

        {/* CONTROLES (live) — sem caixa: tira de quadradinhos + réguas transparentes */}
        {phase === "live" && (
          <>
            <AnimatePresence>
              {panelTab && !recording && (
                <motion.div
                  key="fx"
                  initial={{ y: 24, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 24, opacity: 0 }}
                  transition={SPRING}
                  className="absolute inset-x-0 bottom-[108px] z-20 flex flex-col gap-3"
                >
                  {/* RÉGUAS transparentes (sobre o vídeo) — só quando o item tem parâmetros */}
                  {panelTab === "filtros" && (
                    <GhostSliders>
                      <Slider label="Brilho" value={filter.brightness} min={-0.5} max={0.5} onChange={(v) => setAdj("brightness", v)} />
                      <Slider label="Contraste" value={filter.contrast} min={-0.5} max={0.5} onChange={(v) => setAdj("contrast", v)} />
                      <Slider label="Saturação" value={filter.saturation} min={-1} max={1} onChange={(v) => setAdj("saturation", v)} />
                      <Slider label="Temperatura" value={filter.temperature} min={-0.5} max={0.5} onChange={(v) => setAdj("temperature", v)} />
                      <Slider label="Vinheta" value={filter.vignette} min={0} max={1} onChange={(v) => setAdj("vignette", v)} />
                    </GhostSliders>
                  )}
                  {panelTab === "maquiagem" && makeupItem === "pele" && (
                    <GhostSliders>
                      <Slider label="Pele" value={makeup.skinSmooth} min={0} max={1} onChange={(v) => setSkin(v)} />
                    </GhostSliders>
                  )}
                  {panelTab === "maquiagem" && makeupItem === "batom" && (
                    <GhostSliders>
                      <HueSlider label="Cor" hue={hexToHue(makeup.lipColor)} color={makeup.lipColor} onChange={setLipHue} />
                      <Slider label="Opacidade" value={makeup.lipstick} min={0} max={1} onChange={setLipOpacity} />
                      <Slider label="Blur" value={makeup.lipBlur} min={0} max={1} onChange={setLipBlur} />
                    </GhostSliders>
                  )}
                  {panelTab === "maquiagem" && makeupItem === "blush" && (
                    <GhostSliders>
                      <HueSlider label="Cor" hue={hexToHue(makeup.blushColor)} color={makeup.blushColor} onChange={setBlushHue} />
                      <Slider label="Opacidade" value={makeup.blush} min={0} max={1} onChange={setBlushOpacity} />
                      <Slider label="Blur" value={makeup.blushBlur} min={0} max={1} onChange={setBlushBlur} />
                    </GhostSliders>
                  )}

                  {/* TIRA HORIZONTAL de quadradinhos (sem nome) */}
                  <div className="flex gap-2.5 overflow-x-auto px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                    {panelTab === "filtros" && PRESETS.map((p) => (
                      <Tile key={p.id} active={presetId === p.id} onClick={() => applyPreset(p.id)} label={p.label}>
                        <span className="h-full w-full" style={{ background: p.swatch }} />
                      </Tile>
                    ))}

                    {panelTab === "rostos" && ACCESSORY_TILES.map((a) => (
                      <Tile key={a.id} active={overlay.accessory === a.id} onClick={() => selectAccessory(a.id)} label={a.id}>
                        {a.id === "none" ? <X className="h-5 w-5 text-white/70" /> : <span className="text-2xl">{a.emoji}</span>}
                      </Tile>
                    ))}

                    {panelTab === "maquiagem" && MAKEUP_TILES.map((m) => (
                      <Tile key={m.id} active={makeupItem === m.id} onClick={() => setMakeupItem(m.id)} label={m.id}>
                        <span className="text-2xl">{m.emoji}</span>
                      </Tile>
                    ))}

                    {panelTab === "molduras" && (
                      <>
                        {FRAMES.map((fr) => (
                          <Tile key={fr.id} active={overlay.frame === fr.id} onClick={() => setOverlay((o) => ({ ...o, frame: fr.id }))} label={fr.label}>
                            <FramePreview id={fr.id} />
                          </Tile>
                        ))}
                        <Tile active={overlay.watermark} onClick={() => setOverlay((o) => ({ ...o, watermark: !o.watermark }))} label="Marca">
                          <span className="text-lg font-extrabold text-yellow-400">f</span>
                        </Tile>
                        {STICKER_CHARS.map((c) => (
                          <Tile key={c} active={false} onClick={() => addSticker(c)} label="sticker">
                            <span className="text-2xl">{c}</span>
                          </Tile>
                        ))}
                        {overlay.stickers.length > 0 && (
                          <Tile active={false} onClick={clearStickers} label="Limpar stickers">
                            <RefreshCw className="h-5 w-5 text-white/70" />
                          </Tile>
                        )}
                      </>
                    )}

                    {faceLoading && (panelTab === "rostos" || panelTab === "maquiagem") && (
                      <span className="flex h-14 w-14 shrink-0 items-center justify-center">
                        <Loader2 className="h-5 w-5 animate-spin text-yellow-300" />
                      </span>
                    )}
                  </div>

                  {/* trocador de categoria — só ícones, transparente */}
                  <div className="flex items-center justify-center gap-2.5">
                    {CATS.map(({ id, Icon }) => (
                      <button
                        key={id}
                        onClick={() => setPanelTab(id)}
                        aria-label={id}
                        className={cn(
                          "rounded-full p-2.5 backdrop-blur transition",
                          panelTab === id ? "bg-yellow-400/25 text-yellow-300" : "bg-black/30 text-white/70"
                        )}
                      >
                        <Icon className="h-5 w-5" />
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* barra de ação mínima sobre o vídeo */}
            <div className="absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-black/55 to-transparent pb-[max(env(safe-area-inset-bottom),1.25rem)] pt-10">
              <div className="relative flex items-center justify-center">
                <button onClick={() => (recording ? stopRecording() : startRecording())} className="relative flex h-[76px] w-[76px] items-center justify-center" aria-label={recording ? "Parar" : "Gravar"}>
                  <svg className="absolute inset-0 -rotate-90" viewBox="0 0 76 76">
                    <circle cx="38" cy="38" r="34" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="4" />
                    {recording && <circle cx="38" cy="38" r="34" fill="none" stroke="#facc15" strokeWidth="4" strokeLinecap="round" strokeDasharray={2 * Math.PI * 34} strokeDashoffset={2 * Math.PI * 34 * (1 - progressPct / 100)} />}
                  </svg>
                  {recording ? (
                    <span className="flex h-14 w-14 items-center justify-center rounded-full bg-yellow-400 ring-4 ring-white/30">
                      <span className="h-6 w-6 rounded-[6px] bg-black" />
                    </span>
                  ) : (
                    <span className="relative h-14 w-14 overflow-hidden rounded-full bg-yellow-400 ring-4 ring-white/30">
                      <Image src="/freelandoo-logo.png" alt="Gravar" fill sizes="56px" className="object-cover" />
                    </span>
                  )}
                </button>
                {!recording && (
                  <button
                    onClick={() => setPanelTab((t) => (t ? null : "filtros"))}
                    className={cn("absolute right-7 top-1/2 -translate-y-1/2 rounded-full p-3.5 backdrop-blur-md transition", panelTab ? "bg-yellow-400/25 text-yellow-300" : "bg-white/15 text-white")}
                    aria-label={panelTab ? "Fechar efeitos" : "Efeitos"}
                  >
                    {panelTab ? <X className="h-5 w-5" /> : <Palette className="h-5 w-5" />}
                  </button>
                )}
              </div>
            </div>
          </>
        )}

        {/* CONTROLES (review) — sobre o vídeo gravado */}
        {phase === "review" && result && (
          <div className="absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-black/70 to-transparent pb-[max(env(safe-area-inset-bottom),1.25rem)] pt-10">
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

const LABEL_SHADOW = { textShadow: "0 1px 3px rgba(0,0,0,0.95)" } as const

// Wrapper das réguas: quase transparente (só um degradê fino p/ legibilidade),
// pra pessoa ver o que está fazendo enquanto arrasta — sem "caixa".
function GhostSliders({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-3 space-y-2.5 rounded-2xl bg-gradient-to-t from-black/45 via-black/15 to-transparent px-4 pb-2 pt-4">
      {children}
    </div>
  )
}

function Slider({ label, value, min, max, onChange }: { label: string; value: number; min: number; max: number; onChange: (v: number) => void }) {
  return (
    <label className="flex items-center gap-3 text-[11px] text-white/85">
      <span className="w-20 shrink-0" style={LABEL_SHADOW}>{label}</span>
      <input type="range" min={min} max={max} step={0.01} value={value} onChange={(e) => onChange(Number(e.target.value))} className="h-1 flex-1 accent-yellow-400 drop-shadow" />
    </label>
  )
}

function HueSlider({ label, hue, color, onChange }: { label: string; hue: number; color: string; onChange: (h: number) => void }) {
  return (
    <label className="flex items-center gap-3 text-[11px] text-white/85">
      <span className="w-20 shrink-0" style={LABEL_SHADOW}>{label}</span>
      <input
        type="range"
        min={0}
        max={360}
        step={1}
        value={hue}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-2 flex-1 cursor-pointer appearance-none rounded-full drop-shadow [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:bg-transparent"
        style={{ background: "linear-gradient(to right,#ff0000,#ffff00,#00ff00,#00ffff,#0000ff,#ff00ff,#ff0000)" }}
      />
      <span className="h-5 w-5 shrink-0 rounded-full ring-1 ring-white/40" style={{ background: color }} />
    </label>
  )
}

// Quadradinho de efeito (sem nome): só ícone/imagem, rolagem horizontal.
function Tile({ active, onClick, label, children }: { active: boolean; onClick: () => void; label: string; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className={cn(
        "flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-black/40 ring-2 backdrop-blur transition",
        active ? "ring-yellow-400" : "ring-white/20"
      )}
    >
      {children}
    </button>
  )
}

// Mini-preview da moldura dentro do quadradinho (sem texto).
function FramePreview({ id }: { id: FrameStyle }) {
  if (id === "none") return <X className="h-5 w-5 text-white/70" />
  if (id === "classic") return <span className="h-8 w-8 rounded-sm border-[3px] border-white/90" />
  if (id === "tabloide")
    return (
      <span className="relative h-9 w-9 bg-neutral-800">
        <span className="absolute inset-x-0 top-0 h-1.5 bg-yellow-400" />
        <span className="absolute inset-x-0 bottom-0 h-1.5 bg-yellow-400" />
      </span>
    )
  return <span className="h-9 w-8 border-[3px] border-b-[10px] border-white bg-neutral-700" /> // polaroid
}
