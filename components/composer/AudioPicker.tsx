"use client"

// Picker de música do composer (aba "Música"). Consome GET /api/audio-library
// (biblioteca curada por admin, mig 107). A faixa escolhida vira metadado
// (id + offset) anexado à publicação — NÃO é queimada na mídia (slice 5).
// Pele Freelandoo Tabloide.

import { useEffect, useRef, useState } from "react"
import { Loader2, Music, Pause, Play, Search, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { getToken } from "@/lib/auth"
import { useTranslations } from "@/components/i18n/I18nProvider"
import type { AudioPick } from "@/lib/composer/types"

interface AudioTrack {
  id_audio_track: string
  title: string
  artist: string | null
  audio_url: string | null
  cover_url: string | null
  duration_ms: number
}

interface AudioPickerProps {
  value: AudioPick | null
  onChange: (a: AudioPick | null) => void
}

function fmt(ms: number) {
  const s = Math.max(0, Math.round(ms / 1000))
  const m = Math.floor(s / 60)
  return `${m}:${String(s % 60).padStart(2, "0")}`
}

export function AudioPicker({ value, onChange }: AudioPickerProps) {
  const t = useTranslations("Composer")
  const [tracks, setTracks] = useState<AudioTrack[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [q, setQ] = useState("")
  const [previewId, setPreviewId] = useState<string | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const selected = tracks.find((t) => t.id_audio_track === value?.trackId) || null
  const startMs = value?.startMs ?? 0

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    const url = q.trim() ? `/api/audio-library?q=${encodeURIComponent(q.trim())}` : "/api/audio-library"
    fetch(url, { headers: { Authorization: `Bearer ${getToken() || ""}` }, cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("Failed to load audio library"))))
      .then((data) => { if (!cancelled) setTracks(Array.isArray(data?.tracks) ? data.tracks : []) })
      .catch(() => { if (!cancelled) setError(t("audio.loadError", "Não consegui carregar a biblioteca.")) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [q, t])

  // Pára o preview ao desmontar.
  useEffect(() => () => { audioRef.current?.pause() }, [])

  const togglePreview = (track: AudioTrack) => {
    const a = audioRef.current
    if (!a || !track.audio_url) return
    if (previewId === track.id_audio_track) {
      a.pause(); setPreviewId(null); return
    }
    a.src = track.audio_url
    const offset = track.id_audio_track === value?.trackId ? startMs / 1000 : 0
    try { a.currentTime = offset } catch { /* ignore */ }
    a.play().then(() => setPreviewId(track.id_audio_track)).catch(() => setPreviewId(null))
  }

  const pick = (track: AudioTrack) => {
    onChange({ trackId: track.id_audio_track, title: track.title, artist: track.artist, startMs: 0 })
  }

  const maxStartMs = selected ? Math.max(0, selected.duration_ms - 5000) : 0

  return (
    <div className="space-y-3">
      <audio ref={audioRef} className="hidden" onEnded={() => setPreviewId(null)} />

      {/* Faixa selecionada + offset */}
      {selected && (
        <div className="space-y-2 border-2 border-[#0B0B0D] bg-[#F1EDE2] p-2.5">
          <div className="flex items-center gap-2">
            <Music className="h-4 w-4 shrink-0 text-[#0B0B0D]" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[12px] font-black uppercase tracking-[0.04em] text-[#0B0B0D]">{selected.title}</p>
              {selected.artist && <p className="truncate text-[10px] text-[#0B0B0D]/60">{selected.artist}</p>}
            </div>
            <button
              type="button" onClick={() => { audioRef.current?.pause(); setPreviewId(null); onChange(null) }}
              className="border-2 border-[#0B0B0D] bg-[#1D1810] px-2 py-1 text-[#F2B705]" aria-label={t("audio.remove", "Remover música")}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          {selected.duration_ms > 0 && maxStartMs > 0 && (
            <div>
              <div className="flex justify-between text-[9px] font-black uppercase tracking-[0.1em] text-[#0B0B0D]/60">
                <span>{t("audio.start", "Início")}</span><span className="tabular-nums">{fmt(startMs)}</span>
              </div>
              <input
                type="range" min={0} max={maxStartMs} step={500} value={Math.min(startMs, maxStartMs)}
                onChange={(e) => onChange({ trackId: selected.id_audio_track, title: selected.title, artist: selected.artist, startMs: Number(e.target.value) })}
                className="mt-1 w-full accent-[#F2B705]"
              />
            </div>
          )}
        </div>
      )}

      {/* Busca */}
      <div className="flex items-center gap-2 border-2 border-[#0B0B0D] bg-[#F1EDE2] px-2.5 py-1.5">
        <Search className="h-3.5 w-3.5 text-[#0B0B0D]/60" />
        <input
          value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("audio.search", "Buscar música…")}
          className="w-full bg-transparent text-sm text-[#0B0B0D] placeholder:text-[#0B0B0D]/40 focus:outline-none"
        />
      </div>

      {/* Lista */}
      {loading ? (
        <div className="flex items-center justify-center gap-2 py-8 text-sm text-[#a89f8d]">
          <Loader2 className="h-4 w-4 animate-spin text-[#F2B705]" /> {t("loading", "Carregando…")}
        </div>
      ) : error ? (
        <div className="flex flex-col items-center gap-1 py-8 text-center">
          <p className="text-xs text-red-300">{error}</p>
        </div>
      ) : tracks.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-8 text-center">
          <Music className="h-6 w-6 text-[#a89f8d]" />
          <p className="font-[family-name:var(--font-anton)] text-base uppercase text-[#F1EDE2]">{t("audio.emptyTitle", "Sem músicas")}</p>
          <p className="max-w-[220px] text-xs text-[#a89f8d]">{q.trim() ? t("audio.emptySearch", "Nada encontrado para essa busca.") : t("audio.emptyLibrary", "A biblioteca ainda está vazia.")}</p>
        </div>
      ) : (
        <ul className="space-y-1.5">
          {tracks.map((track) => {
            const active = value?.trackId === track.id_audio_track
            const playing = previewId === track.id_audio_track
            return (
              <li key={track.id_audio_track}>
                <div
                  className={cn(
                    "flex items-center gap-2 border-2 border-[#0B0B0D] px-2 py-1.5 transition",
                    active ? "bg-[#F2B705]" : "bg-[#1D1810]",
                  )}
                >
                  <button
                    type="button" onClick={() => togglePreview(track)} disabled={!track.audio_url}
                    className={cn(
                      "grid h-8 w-8 shrink-0 place-items-center border-2 border-[#0B0B0D]",
                      active ? "bg-[#0B0B0D] text-[#F2B705]" : "bg-[#F1EDE2] text-[#0B0B0D]",
                      !track.audio_url && "opacity-40",
                    )}
                    aria-label={playing ? t("audio.pausePreview", "Pausar prévia") : t("audio.playPreview", "Ouvir prévia")}
                  >
                    {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                  </button>
                  <button type="button" onClick={() => pick(track)} className="min-w-0 flex-1 text-left">
                    <p className={cn("truncate text-[12px] font-black uppercase tracking-[0.03em]", active ? "text-[#0B0B0D]" : "text-[#F1EDE2]")}>
                      {track.title}
                    </p>
                    <p className={cn("truncate text-[10px]", active ? "text-[#0B0B0D]/65" : "text-[#a89f8d]")}>
                      {track.artist || "—"}{track.duration_ms > 0 ? ` · ${fmt(track.duration_ms)}` : ""}
                    </p>
                  </button>
                  {!active && (
                    <button
                      type="button" onClick={() => pick(track)}
                      className="shrink-0 border-2 border-[#0B0B0D] bg-[#F1EDE2] px-2 py-1 text-[9px] font-black uppercase tracking-[0.08em] text-[#0B0B0D]"
                    >
                      {t("audio.use", "Usar")}
                    </button>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
