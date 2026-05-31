"use client"

// Admin: biblioteca de áudio do composer (Post/Bee/Story). CRUD de faixas
// royalty-free guardadas no R2. Pode nascer vazia. Pele tabloide utilitária.

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { getToken } from "@/lib/auth"
import { useAuth } from "@/hooks/use-auth"

interface AudioTrack {
  id_audio_track: string
  title: string
  artist: string | null
  audio_url: string | null
  cover_url: string | null
  duration_ms: number
  is_active: boolean
  sort_order: number
}

const headers = (): Record<string, string> => {
  const t = getToken()
  return t ? { Authorization: `Bearer ${t}` } : {}
}

const isAdmin = (user: ReturnType<typeof useAuth>["user"]): boolean => {
  const u = user as unknown as { is_admin?: boolean; roles?: { desc_role: string }[] }
  return !!(u?.is_admin || u?.roles?.some((r) => r.desc_role === "Administrator"))
}

function fmtDur(ms: number): string {
  if (!ms) return "—"
  const s = Math.round(ms / 1000)
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`
}

export default function AdminAudiosPage() {
  const router = useRouter()
  const { user, status } = useAuth()
  const [tracks, setTracks] = useState<AudioTrack[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<AudioTrack | null>(null)

  const load = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const res = await fetch("/api/admin/audio-library", { headers: headers(), cache: "no-store" })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || `Erro ${res.status}`)
      setTracks(Array.isArray(data?.tracks) ? data.tracks : [])
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao carregar faixas")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (status === "loading") return
    if (status !== "authenticated" || !isAdmin(user)) { router.replace("/"); return }
    load()
  }, [status, user, router, load])

  const remove = async (id: string) => {
    if (!window.confirm("Excluir esta faixa? Sem volta.")) return
    const res = await fetch(`/api/admin/audio-library/${id}`, { method: "DELETE", headers: headers() })
    if (res.ok) load()
    else alert("Falha ao excluir.")
  }

  const toggleActive = async (t: AudioTrack) => {
    const fd = new FormData()
    fd.append("is_active", String(!t.is_active))
    const res = await fetch(`/api/admin/audio-library/${t.id_audio_track}`, { method: "PUT", headers: headers(), body: fd })
    if (res.ok) load()
  }

  if (status === "loading" || (status === "authenticated" && !isAdmin(user))) {
    return <div className="fl-root fl-paper-texture min-h-[100dvh]" />
  }

  return (
    <div className="fl-root fl-paper-texture min-h-[100dvh] px-4 py-8 sm:px-8">
      <div className="mx-auto max-w-5xl">
        <header className="mb-6 flex items-end justify-between border-b-2 border-[#F1EDE2]/12 pb-4">
          <div>
            <h1 className="fl-display text-4xl leading-none text-[#F2B705]">Biblioteca de áudio</h1>
            <p className="mt-1 text-[11px] font-black uppercase tracking-[0.16em] text-[#a89f8d]">
              Faixas do composer · Post · Bee · Story
            </p>
          </div>
          <button
            type="button"
            onClick={() => { setEditing(null); setModalOpen(true) }}
            className="fl-btn-gold px-4 py-2.5 text-[11px] font-black uppercase tracking-[0.12em]"
          >
            + Subir faixa
          </button>
        </header>

        {error && (
          <div className="mb-4 border-2 border-red-500/40 bg-red-950/30 px-3 py-2 text-sm text-red-200">{error}</div>
        )}

        {loading ? (
          <div className="flex justify-center py-16">
            <span className="h-8 w-8 animate-spin rounded-full border-[3px] border-[#F1EDE2]/15 border-t-[#F2B705]" />
          </div>
        ) : tracks.length === 0 ? (
          <div className="grid place-items-center border-2 border-dashed border-[#F2B705]/60 py-16 text-center">
            <div className="fl-display text-2xl uppercase text-[#F2B705]">Sem faixas ainda</div>
            <p className="mt-2 max-w-sm text-sm text-[#a89f8d]">
              Suba MP3/AAC royalty-free. Título, artista, capa e duração. A aba Música do composer
              fica vazia até você adicionar a primeira faixa.
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {tracks.map((t) => (
              <div
                key={t.id_audio_track}
                className="flex items-center gap-3 border-2 border-[#0B0B0D] bg-[#F1EDE2] px-3 py-2.5 text-[#0B0B0D] shadow-[4px_4px_0_0_#0B0B0D]"
              >
                <span
                  className="h-11 w-11 shrink-0 -rotate-2 border-2 border-[#0B0B0D] bg-[#1D1810]"
                  style={t.cover_url ? { backgroundImage: `url(${t.cover_url})`, backgroundSize: "cover" } : undefined}
                />
                <div className="min-w-0 flex-1">
                  <div className="truncate font-[family-name:var(--font-anton)] text-lg uppercase leading-none">{t.title}</div>
                  <div className="mt-0.5 truncate text-[11px] font-bold uppercase tracking-[0.06em] text-[#6B6457]">
                    {t.artist || "—"} · {fmtDur(t.duration_ms)}
                  </div>
                </div>
                {t.audio_url && <audio src={t.audio_url} controls className="h-8 w-40 max-w-[40vw]" preload="none" />}
                <button
                  type="button" onClick={() => toggleActive(t)}
                  className={`border-2 border-[#0B0B0D] px-2 py-1 text-[9px] font-black uppercase tracking-[0.06em] ${t.is_active ? "bg-[#F2B705]" : "bg-[#e8e2d4] text-[#6B6457]"}`}
                >
                  {t.is_active ? "Ativa" : "Oculta"}
                </button>
                <button
                  type="button" onClick={() => { setEditing(t); setModalOpen(true) }}
                  className="border-2 border-[#0B0B0D] bg-[#e8e2d4] px-2 py-1 text-[9px] font-black uppercase tracking-[0.06em]"
                >
                  Editar
                </button>
                <button
                  type="button" onClick={() => remove(t.id_audio_track)}
                  className="border-2 border-[#0B0B0D] bg-[#1D1810] px-2 py-1 text-[9px] font-black uppercase tracking-[0.06em] text-[#F2B705]"
                >
                  Excluir
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {modalOpen && (
        <TrackModal
          editing={editing}
          onClose={() => setModalOpen(false)}
          onSaved={() => { setModalOpen(false); load() }}
        />
      )}
    </div>
  )
}

function TrackModal({ editing, onClose, onSaved }: { editing: AudioTrack | null; onClose: () => void; onSaved: () => void }) {
  const [title, setTitle] = useState(editing?.title || "")
  const [artist, setArtist] = useState(editing?.artist || "")
  const [sortOrder, setSortOrder] = useState(String(editing?.sort_order ?? 0))
  const [audioFile, setAudioFile] = useState<File | null>(null)
  const [coverFile, setCoverFile] = useState<File | null>(null)
  const [durationMs, setDurationMs] = useState<number>(editing?.duration_ms ?? 0)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const onAudio = (f: File | null) => {
    setAudioFile(f)
    if (f) {
      const a = document.createElement("audio")
      a.preload = "metadata"
      a.onloadedmetadata = () => { if (Number.isFinite(a.duration)) setDurationMs(Math.round(a.duration * 1000)) }
      a.src = URL.createObjectURL(f)
    }
  }

  const submit = async () => {
    setErr(null)
    if (!title.trim()) { setErr("Título é obrigatório."); return }
    if (!editing && !audioFile) { setErr("Selecione o arquivo de áudio."); return }
    setSaving(true)
    try {
      const fd = new FormData()
      fd.append("title", title.trim())
      fd.append("artist", artist.trim())
      fd.append("sort_order", sortOrder || "0")
      if (durationMs) fd.append("duration_ms", String(durationMs))
      if (audioFile) fd.append("audio", audioFile)
      if (coverFile) fd.append("cover", coverFile)
      const url = editing ? `/api/admin/audio-library/${editing.id_audio_track}` : "/api/admin/audio-library"
      const res = await fetch(url, { method: editing ? "PUT" : "POST", headers: headers(), body: fd })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error || `Erro ${res.status}`)
      onSaved()
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Erro ao salvar")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4" onClick={onClose}>
      <div
        className="w-full max-w-md border-2 border-[#0B0B0D] bg-[#F1EDE2] p-5 text-[#0B0B0D] shadow-[8px_8px_0_0_#F2B705]"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="fl-display mb-4 text-2xl uppercase">{editing ? "Editar faixa" : "Nova faixa"}</h2>
        <div className="space-y-3">
          <Field label="Título">
            <input value={title} onChange={(e) => setTitle(e.target.value)} className="w-full border-2 border-[#0B0B0D] bg-white px-3 py-2 text-sm" />
          </Field>
          <Field label="Artista">
            <input value={artist} onChange={(e) => setArtist(e.target.value)} className="w-full border-2 border-[#0B0B0D] bg-white px-3 py-2 text-sm" />
          </Field>
          <Field label={`Áudio ${editing ? "(deixe vazio p/ manter)" : "(MP3/AAC/OGG/WAV)"}`}>
            <input type="file" accept="audio/*" onChange={(e) => onAudio(e.target.files?.[0] || null)} className="w-full text-xs" />
            {durationMs > 0 && (
              <span className="mt-1 block text-[10px] font-bold uppercase text-[#6B6457]">
                Duração: {Math.floor(durationMs / 60000)}:{String(Math.round(durationMs / 1000) % 60).padStart(2, "0")}
              </span>
            )}
          </Field>
          <Field label="Capa (opcional)">
            <input type="file" accept="image/*" onChange={(e) => setCoverFile(e.target.files?.[0] || null)} className="w-full text-xs" />
          </Field>
          <Field label="Ordem">
            <input type="number" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} className="w-24 border-2 border-[#0B0B0D] bg-white px-3 py-2 text-sm" />
          </Field>
          {err && <p className="text-xs text-red-700">{err}</p>}
        </div>
        <div className="mt-5 flex gap-2">
          <button type="button" onClick={onClose} className="flex-1 border-2 border-[#0B0B0D] bg-[#e8e2d4] py-2 text-[11px] font-black uppercase tracking-[0.08em]">Cancelar</button>
          <button type="button" onClick={submit} disabled={saving} className="fl-btn-gold flex-1 py-2 text-[11px] font-black uppercase tracking-[0.08em] disabled:opacity-50">
            {saving ? "Salvando…" : "Salvar"}
          </button>
        </div>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[10px] font-black uppercase tracking-[0.12em] text-[#6B6457]">{label}</span>
      {children}
    </label>
  )
}
