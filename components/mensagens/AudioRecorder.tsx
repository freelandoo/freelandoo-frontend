"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { Loader2, Mic, Play, Pause, Send, Square, Trash2 } from "lucide-react"
import { getToken } from "@/lib/auth"
import { getPublicBackendUrl } from "@/lib/backend-public"
import { cn } from "@/lib/utils"
import { useTranslations } from "@/components/i18n/I18nProvider"

interface AudioRecorderProps {
  conversationId: string
  actorId: string
  actorType?: "profile" | "clan"
  onSent?: () => void
  /** Notifica o pai quando o gravador está expandido (recording/preview/uploading),
   *  para esconder textarea/emoji/send. */
  onActiveChange?: (active: boolean) => void
  disabled?: boolean
}

const MAX_DURATION_SEC = 120
const MAX_BYTES = 5 * 1024 * 1024
const SPRING = { type: "spring" as const, stiffness: 200, damping: 22 }

type RecorderState = "idle" | "recording" | "preview" | "uploading" | "error"

/**
 * Escolhe o melhor MIME suportado pelo navegador, preferindo Opus/WebM 24kbps.
 * Retorna { mimeType, audioBitsPerSecond | undefined }.
 */
function pickRecorderOptions(): { mimeType?: string; audioBitsPerSecond?: number } {
  if (typeof window === "undefined" || typeof MediaRecorder === "undefined") {
    return {}
  }
  const candidates: Array<{ mime: string; bps?: number }> = [
    { mime: "audio/webm;codecs=opus", bps: 24000 },
    { mime: "audio/webm", bps: 24000 },
    { mime: "audio/ogg;codecs=opus", bps: 24000 },
    { mime: "audio/ogg" },
    { mime: "audio/mp4" },
    { mime: "audio/mpeg" },
  ]
  for (const c of candidates) {
    if (MediaRecorder.isTypeSupported(c.mime)) {
      return { mimeType: c.mime, audioBitsPerSecond: c.bps }
    }
  }
  return {}
}

function formatTime(seconds: number): string {
  const s = Math.max(0, Math.round(seconds))
  const mm = Math.floor(s / 60)
  const ss = s % 60
  return `${mm.toString().padStart(2, "0")}:${ss.toString().padStart(2, "0")}`
}

export function AudioRecorder({
  conversationId,
  actorId,
  actorType = "profile",
  onSent,
  onActiveChange,
  disabled,
}: AudioRecorderProps) {
  const t = useTranslations("Conversation")
  const [state, setState] = useState<RecorderState>("idle")
  const [error, setError] = useState<string | null>(null)
  const [elapsed, setElapsed] = useState(0)
  const [blob, setBlob] = useState<Blob | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [playing, setPlaying] = useState(false)
  const [progress, setProgress] = useState(0)

  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const streamRef = useRef<MediaStream | null>(null)
  const timerRef = useRef<number | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const startedAtRef = useRef<number>(0)
  const recorderMimeRef = useRef<string>("audio/webm")

  const cleanupStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
  }, [])

  const reset = useCallback(() => {
    if (timerRef.current) {
      window.clearInterval(timerRef.current)
      timerRef.current = null
    }
    cleanupStream()
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setPreviewUrl(null)
    setBlob(null)
    setElapsed(0)
    setProgress(0)
    setPlaying(false)
    setError(null)
    setState("idle")
  }, [cleanupStream, previewUrl])

  // Cleanup ao desmontar
  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current)
      cleanupStream()
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
  }, [cleanupStream, previewUrl])

  // Avisa o pai quando recorder está ativo (expandido)
  useEffect(() => {
    onActiveChange?.(state === "recording" || state === "preview" || state === "uploading")
  }, [state, onActiveChange])

  const startRecording = useCallback(async () => {
    if (state !== "idle" && state !== "error") return
    setError(null)
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setError(t("noAudioSupportError", "Seu navegador não suporta gravação de áudio."))
      setState("error")
      return
    }
    let stream: MediaStream
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      })
    } catch (err) {
      const msg = err instanceof DOMException && err.name === "NotAllowedError"
        ? t("microphonePermissionDenied", "Permissão de microfone negada.")
        : t("microphoneAccessError", "Não foi possível acessar o microfone.")
      setError(msg)
      setState("error")
      return
    }
    streamRef.current = stream

    const opts = pickRecorderOptions()
    let recorder: MediaRecorder
    try {
      recorder = opts.mimeType
        ? new MediaRecorder(stream, opts)
        : new MediaRecorder(stream)
    } catch {
      try {
        recorder = new MediaRecorder(stream)
      } catch (err) {
        cleanupStream()
        setError(t("recordingNotSupportedError", "Gravação não suportada neste navegador."))
        setState("error")
        return
      }
    }
    recorderMimeRef.current = recorder.mimeType || opts.mimeType || "audio/webm"
    chunksRef.current = []

    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) chunksRef.current.push(e.data)
    }
    recorder.onstop = () => {
      const finalBlob = new Blob(chunksRef.current, { type: recorderMimeRef.current })
      cleanupStream()
      if (finalBlob.size === 0) {
        setError(t("emptyRecordingError", "Gravação vazia. Tente de novo."))
        setState("error")
        return
      }
      if (finalBlob.size > MAX_BYTES) {
        setError(t("audioTooLargeError", "Áudio muito grande (>5MB). Grave mais curto."))
        setState("error")
        return
      }
      const url = URL.createObjectURL(finalBlob)
      setBlob(finalBlob)
      setPreviewUrl(url)
      setState("preview")
    }

    try {
      recorder.start()
    } catch {
      cleanupStream()
      setError(t("recordingStartError", "Falha ao iniciar gravação."))
      setState("error")
      return
    }
    recorderRef.current = recorder
    startedAtRef.current = Date.now()
    setElapsed(0)
    setState("recording")

    timerRef.current = window.setInterval(() => {
      const sec = Math.floor((Date.now() - startedAtRef.current) / 1000)
      setElapsed(sec)
      if (sec >= MAX_DURATION_SEC) {
        try { recorder.stop() } catch { /* noop */ }
        if (timerRef.current) {
          window.clearInterval(timerRef.current)
          timerRef.current = null
        }
      }
    }, 200)
  }, [cleanupStream, state, t])

  const stopRecording = useCallback(() => {
    if (state !== "recording") return
    if (timerRef.current) {
      window.clearInterval(timerRef.current)
      timerRef.current = null
    }
    try {
      recorderRef.current?.stop()
    } catch { /* noop */ }
  }, [state])

  const cancelRecording = useCallback(() => {
    if (state === "recording") {
      try { recorderRef.current?.stop() } catch { /* noop */ }
    }
    reset()
  }, [reset, state])

  const togglePlay = useCallback(() => {
    const el = audioRef.current
    if (!el) return
    if (playing) {
      el.pause()
    } else {
      el.play().catch(() => { /* user gesture issue */ })
    }
  }, [playing])

  const handleAudioTime = useCallback(() => {
    const el = audioRef.current
    if (!el || !el.duration || !Number.isFinite(el.duration)) return
    setProgress(el.currentTime / el.duration)
  }, [])

  const submit = useCallback(async () => {
    if (!blob || !conversationId || !actorId) return
    setState("uploading")
    setError(null)
    try {
      const fd = new FormData()
      // Nome com extensão coerente para o multer + file-type detectar
      const ext = recorderMimeRef.current.includes("webm")
        ? "webm"
        : recorderMimeRef.current.includes("ogg")
          ? "ogg"
          : recorderMimeRef.current.includes("mp4")
            ? "m4a"
            : recorderMimeRef.current.includes("mpeg")
              ? "mp3"
              : "webm"
      const file = new File([blob], `audio-${Date.now()}.${ext}`, {
        type: recorderMimeRef.current,
      })
      fd.append("audio", file)
      fd.append("actor_id", actorId)
      fd.append("actor_type", actorType)
      fd.append("duration_seconds", String(Math.max(1, elapsed)))

      // Upload direto pro backend (não pelo proxy /api) — Vercel limita
      // serverless function body a 4.5MB. CORS já libera *.vercel.app.
      const res = await fetch(
        `${getPublicBackendUrl()}/conversations/${encodeURIComponent(conversationId)}/messages/audio`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${getToken() || ""}` },
          body: fd,
        }
      )
      const text = await res.text()
      let data: { error?: string } = {}
      try { data = text ? JSON.parse(text) : {} } catch { /* non-json */ }
      if (!res.ok) {
        setError(data?.error || t("sendAudioStatusError", "Erro {status} ao enviar áudio").replace("{status}", String(res.status)))
        setState("preview")
        return
      }
      onSent?.()
      reset()
    } catch (err) {
      setError(err instanceof Error ? err.message : t("sendAudioError", "Falha ao enviar áudio"))
      setState("preview")
    }
  }, [actorId, actorType, blob, conversationId, elapsed, onSent, reset, t])

  if (state === "idle" || state === "error") {
    return (
      <div className="flex items-center gap-2">
        {error && state === "error" && (
          <span className="hidden truncate text-[11px] text-red-300 sm:inline">{error}</span>
        )}
        <motion.button
          type="button"
          onClick={startRecording}
          disabled={disabled}
          whileTap={{ scale: 0.94 }}
          transition={SPRING}
          aria-label={t("startRecordingAriaLabel", "Gravar áudio")}
          title={t("startRecordingAriaLabel", "Gravar áudio")}
          className={cn(
            "inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-white/65 transition-colors hover:bg-white/[0.08] hover:text-yellow-300",
            disabled && "cursor-not-allowed opacity-40"
          )}
        >
          <Mic className="h-5 w-5" />
        </motion.button>
      </div>
    )
  }

  if (state === "recording") {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={SPRING}
        className="flex w-full items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/[0.06] px-3 py-2"
      >
        <motion.span
          animate={{ scale: [1, 1.35, 1], opacity: [1, 0.6, 1] }}
          transition={{ repeat: Infinity, duration: 1.2, ease: "easeInOut" }}
          className="h-2.5 w-2.5 shrink-0 rounded-full bg-red-400"
        />
        <span className="flex-1 text-sm tabular-nums text-red-100">
          {t("recordingLabel", "Gravando · {time} / {max}")
            .replace("{time}", formatTime(elapsed))
            .replace("{max}", formatTime(MAX_DURATION_SEC))}
        </span>
        <button
          type="button"
          onClick={cancelRecording}
          aria-label={t("cancelRecordingAriaLabel", "Cancelar")}
          title={t("cancelRecordingAriaLabel", "Cancelar")}
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-white/60 transition hover:bg-white/5 hover:text-red-300"
        >
          <Trash2 className="h-4 w-4" />
        </button>
        <motion.button
          type="button"
          onClick={stopRecording}
          whileTap={{ scale: 0.94 }}
          transition={SPRING}
          aria-label={t("stopRecordingAriaLabel", "Parar gravação")}
          className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-red-500 to-red-600 text-white shadow-[0_8px_20px_-8px_rgba(239,68,68,0.55)]"
        >
          <Square className="h-4 w-4 fill-current" />
        </motion.button>
      </motion.div>
    )
  }

  // preview ou uploading
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={SPRING}
      className="flex w-full items-center gap-2 rounded-xl border border-yellow-400/30 bg-yellow-400/[0.05] px-3 py-2"
    >
      {previewUrl && (
        <audio
          ref={audioRef}
          src={previewUrl}
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onEnded={() => { setPlaying(false); setProgress(0) }}
          onTimeUpdate={handleAudioTime}
          preload="metadata"
        />
      )}
      <button
        type="button"
        onClick={togglePlay}
        aria-label={playing ? t("pauseAudioAriaLabel", "Pausar") : t("playAudioAriaLabel", "Tocar")}
        className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/[0.08] text-yellow-300 transition hover:bg-white/[0.14]"
      >
        {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 translate-x-px" />}
      </button>
      <div className="flex-1 min-w-0">
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full bg-gradient-to-r from-yellow-400 to-amber-500 transition-[width] duration-150"
            style={{ width: `${Math.min(100, progress * 100)}%` }}
          />
        </div>
        <div className="mt-1 flex items-center justify-between text-[10px] tabular-nums text-white/55">
          <span>{formatTime(elapsed)}</span>
          {error ? (
            <span className="text-red-300">{error}</span>
          ) : (
            <span className="text-white/40">{t("readyToSendLabel", "Pronto pra enviar")}</span>
          )}
        </div>
      </div>
      <button
        type="button"
        onClick={cancelRecording}
        disabled={state === "uploading"}
        aria-label={t("cancelAriaLabel", "Cancelar")}
        title={t("cancelAriaLabel", "Cancelar")}
        className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-white/55 transition hover:bg-white/5 hover:text-red-300 disabled:opacity-40"
      >
        <Trash2 className="h-4 w-4" />
      </button>
      <motion.button
        type="button"
        onClick={submit}
        disabled={state === "uploading" || !blob}
        whileTap={{ scale: 0.94 }}
        transition={SPRING}
        aria-label={t("sendAudioAriaLabel", "Enviar áudio")}
        className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-yellow-400 to-amber-500 text-neutral-950 shadow-[0_8px_20px_-8px_rgba(250,204,21,0.55)] transition disabled:cursor-not-allowed disabled:opacity-50"
      >
        {state === "uploading" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
      </motion.button>
    </motion.div>
  )
}

export { AudioRecorder as default }

/* === Player de áudio para mensagens recebidas/enviadas === */

interface AudioMessageProps {
  src: string
  durationSeconds?: number | null
  mine?: boolean
}

export function AudioMessage({ src, durationSeconds, mine }: AudioMessageProps) {
  const t = useTranslations("Conversation")
  const [playing, setPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(Math.max(0, Math.round(durationSeconds || 0)))
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const toggle = () => {
    const el = audioRef.current
    if (!el) return
    if (playing) el.pause()
    else el.play().catch(() => { /* noop */ })
  }

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = audioRef.current
    if (!el || !duration) return
    const rect = e.currentTarget.getBoundingClientRect()
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    el.currentTime = ratio * duration
    setProgress(ratio)
  }

  return (
    <div className={cn("flex w-full max-w-[260px] items-center gap-3 px-3 py-2.5", mine ? "text-neutral-950" : "text-white")}>
      <audio
        ref={audioRef}
        src={src}
        preload="metadata"
        onLoadedMetadata={(e) => {
          const d = (e.target as HTMLAudioElement).duration
          if (Number.isFinite(d) && d > 0) setDuration(Math.round(d))
        }}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => { setPlaying(false); setProgress(0); setCurrentTime(0) }}
        onTimeUpdate={(e) => {
          const a = e.target as HTMLAudioElement
          if (!a.duration || !Number.isFinite(a.duration)) return
          setProgress(a.currentTime / a.duration)
          setCurrentTime(a.currentTime)
        }}
      />
      <button
        type="button"
        onClick={toggle}
        aria-label={playing ? t("pauseAudioAriaLabel", "Pausar") : t("playAudioAriaLabel", "Tocar")}
        className={cn(
          "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition",
          mine
            ? "bg-neutral-950/15 hover:bg-neutral-950/25"
            : "bg-white/10 hover:bg-white/15"
        )}
      >
        {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 translate-x-px" />}
      </button>
      <div className="min-w-0 flex-1">
        <div
          role="slider"
          aria-label={t("audioProgressAriaLabel", "Progresso do áudio")}
          aria-valuenow={Math.round(progress * 100)}
          aria-valuemin={0}
          aria-valuemax={100}
          tabIndex={0}
          onClick={handleSeek}
          className={cn(
            "h-1.5 w-full cursor-pointer overflow-hidden rounded-full",
            mine ? "bg-neutral-950/15" : "bg-white/10"
          )}
        >
          <div
            className={cn(
              "h-full transition-[width] duration-150",
              mine ? "bg-neutral-950" : "bg-gradient-to-r from-yellow-400 to-amber-500"
            )}
            style={{ width: `${Math.min(100, progress * 100)}%` }}
          />
        </div>
        <div className="mt-1 flex items-center justify-between text-[10px] tabular-nums opacity-75">
          <span>{formatTime(playing || currentTime > 0 ? currentTime : 0)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>
    </div>
  )
}
