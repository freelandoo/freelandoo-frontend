"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2, Upload, Video, X } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useAuth } from "@/hooks/use-auth"
import { getToken } from "@/lib/auth"
import { getPublicBackendUrl } from "@/lib/backend-public"
import { cn } from "@/lib/utils"

type StoryKind = "trampo" | "rest"

interface ProfileLite {
  id_profile: string
  display_name: string
  avatar_url: string | null
  is_clan: boolean
  is_active: boolean
}

interface StoryCreatorProps {
  open: boolean
  initialKind?: StoryKind
  onClose: () => void
  onPosted?: () => void
}

const MAX_DURATION = 60
const MAX_BYTES = 80 * 1024 * 1024

export function StoryCreator({ open, initialKind = "rest", onClose, onPosted }: StoryCreatorProps) {
  const router = useRouter()
  const { user, status } = useAuth()
  const [profiles, setProfiles] = useState<ProfileLite[]>([])
  const [loadingProfiles, setLoadingProfiles] = useState(false)
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null)
  const [kind, setKind] = useState<StoryKind>(initialKind)
  const [file, setFile] = useState<File | null>(null)
  const [duration, setDuration] = useState<number | null>(null)
  const [width, setWidth] = useState<number | null>(null)
  const [height, setHeight] = useState<number | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [caption, setCaption] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => { setKind(initialKind) }, [initialKind])

  useEffect(() => {
    if (!open) return
    if (status !== "authenticated" || !user) return
    let cancelled = false
    setLoadingProfiles(true)
    fetch(`/api/profile/user/${encodeURIComponent(user.id_user)}`, {
      headers: { Authorization: `Bearer ${getToken() || ""}` },
      cache: "no-store",
    })
      .then((r) => r.ok ? r.json() : { profiles: [] })
      .then((data) => {
        if (cancelled) return
        const list: ProfileLite[] = Array.isArray(data?.profiles) ? data.profiles : []
        const eligible = list.filter((p) => p.is_active)
        setProfiles(eligible)
        if (eligible.length > 0 && !selectedProfileId) {
          setSelectedProfileId(eligible[0].id_profile)
        }
      })
      .catch(() => { if (!cancelled) setProfiles([]) })
      .finally(() => { if (!cancelled) setLoadingProfiles(false) })
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, status, user?.id_user])

  useEffect(() => {
    if (!open) {
      setFile(null)
      setDuration(null)
      setWidth(null)
      setHeight(null)
      if (previewUrl) URL.revokeObjectURL(previewUrl)
      setPreviewUrl(null)
      setCaption("")
      setError(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const selectedProfile = profiles.find((p) => p.id_profile === selectedProfileId) || null
  const trampoBlocked = !!selectedProfile?.is_clan
  const effectiveKind: StoryKind = trampoBlocked && kind === "trampo" ? "rest" : kind

  const handleFile = (f: File | null) => {
    setError(null)
    setFile(null)
    setDuration(null)
    setWidth(null)
    setHeight(null)
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl)
      setPreviewUrl(null)
    }
    if (!f) return
    if (!f.type.startsWith("video/")) {
      setError("Selecione um arquivo de vídeo.")
      return
    }
    if (f.size > MAX_BYTES) {
      setError("Vídeo acima de 80MB. Reduza ou corte.")
      return
    }
    const url = URL.createObjectURL(f)
    setPreviewUrl(url)
    const v = document.createElement("video")
    v.preload = "metadata"
    v.onloadedmetadata = () => {
      const d = Math.round(v.duration)
      setDuration(d)
      setWidth(v.videoWidth || null)
      setHeight(v.videoHeight || null)
      if (!Number.isFinite(v.duration) || v.duration <= 0) {
        setError("Não consegui ler a duração do vídeo.")
        return
      }
      // Vídeos > 60s entram em fluxo de split automático no backend.
      setFile(f)
    }
    v.onerror = () => setError("Não consegui ler esse vídeo.")
    v.src = url
  }

  const submit = async () => {
    if (!file || !selectedProfileId || !duration) return
    setSubmitting(true)
    setError(null)
    try {
      const fd = new FormData()
      fd.append("video", file)
      fd.append("id_profile", selectedProfileId)
      fd.append("kind", effectiveKind)
      const willSplit = duration > MAX_DURATION
      if (willSplit) {
        fd.append("auto_split", "true")
      } else {
        fd.append("duration_seconds", String(duration))
      }
      if (width) fd.append("width", String(width))
      if (height) fd.append("height", String(height))
      if (caption.trim()) fd.append("caption", caption.trim())

      // Upload direto pro backend (não pelo proxy /api) — Vercel limita serverless
      // function body a 4.5MB, então vídeos maiores quebram via proxy. CORS no
      // backend já libera *.vercel.app + freelandoo.com.br.
      const res = await fetch(`${getPublicBackendUrl()}/me/stories`, {
        method: "POST",
        headers: { Authorization: `Bearer ${getToken() || ""}` },
        body: fd,
      })
      const text = await res.text()
      let data: { error?: string; story?: unknown } = {}
      try { data = text ? JSON.parse(text) : {} } catch { /* non-JSON */ }
      if (!res.ok) {
        setError(data?.error || `Erro ${res.status}${text && text.length < 200 ? `: ${text}` : ""}`)
        return
      }
      onPosted?.()
      onClose()
      router.refresh()
    } catch (err) {
      const msg = err instanceof Error ? err.message : "desconhecido"
      setError(`Falha de rede ao publicar: ${msg}`)
    } finally {
      setSubmitting(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="relative flex h-full w-full max-w-md flex-col overflow-hidden bg-zinc-950 sm:my-4 sm:h-auto sm:max-h-[92dvh] sm:rounded-2xl sm:border sm:border-white/10">
        <header className="flex items-center justify-between border-b border-white/8 px-4 py-3">
          <h2 className="text-base font-semibold text-white">Postar story</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1 text-white/70 transition hover:bg-white/10 hover:text-white"
            aria-label="Fechar"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-4 py-4 [scrollbar-width:thin]">
          <section className="mb-4">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-white/55">Subperfil</p>
            {loadingProfiles ? (
              <div className="flex items-center gap-2 text-sm text-white/60">
                <Loader2 className="h-4 w-4 animate-spin" />
                Carregando perfis…
              </div>
            ) : profiles.length === 0 ? (
              <p className="text-sm text-white/60">Sem subperfis elegíveis. Crie um subperfil para postar stories.</p>
            ) : (
              <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {profiles.map((p) => {
                  const isSel = p.id_profile === selectedProfileId
                  return (
                    <button
                      key={p.id_profile}
                      type="button"
                      onClick={() => setSelectedProfileId(p.id_profile)}
                      className={cn(
                        "flex w-[78px] shrink-0 flex-col items-center gap-1 rounded-xl border p-2 transition",
                        isSel ? "border-amber-400 bg-amber-400/10" : "border-white/10 bg-white/[0.03] hover:border-white/25"
                      )}
                    >
                      <Avatar className="h-12 w-12">
                        {p.avatar_url && <AvatarImage src={p.avatar_url} alt={p.display_name} />}
                        <AvatarFallback className="bg-zinc-800 text-[10px] text-white/80">
                          {p.display_name?.[0]?.toUpperCase() || "?"}
                        </AvatarFallback>
                      </Avatar>
                      <span className="line-clamp-1 text-[10px] font-medium text-white/85">{p.display_name}</span>
                      {p.is_clan && <span className="text-[9px] uppercase tracking-wider text-amber-300">Clan</span>}
                    </button>
                  )
                })}
              </div>
            )}
          </section>

          <section className="mb-4">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-white/55">Canal</p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setKind("trampo")}
                disabled={trampoBlocked}
                className={cn(
                  "rounded-xl border p-3 text-left text-sm transition",
                  kind === "trampo" && !trampoBlocked
                    ? "border-amber-400 bg-amber-400/10 text-amber-200"
                    : "border-white/10 bg-white/[0.03] text-white/80 hover:border-white/25",
                  trampoBlocked && "cursor-not-allowed opacity-40"
                )}
              >
                <div className="font-semibold">Trampo</div>
                <div className="text-[11px] text-white/55">Aparece em /maquinas. Requer assinatura ativa.</div>
              </button>
              <button
                type="button"
                onClick={() => setKind("rest")}
                className={cn(
                  "rounded-xl border p-3 text-left text-sm transition",
                  kind === "rest"
                    ? "border-amber-400 bg-amber-400/10 text-amber-200"
                    : "border-white/10 bg-white/[0.03] text-white/80 hover:border-white/25"
                )}
              >
                <div className="font-semibold">Rest</div>
                <div className="text-[11px] text-white/55">Aparece em /feed. Aberto para todos.</div>
              </button>
            </div>
            {trampoBlocked && (
              <p className="mt-1.5 text-[11px] text-white/55">Clans não postam Trampo — só Rest.</p>
            )}
          </section>

          <section className="mb-4">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-white/55">Vídeo (segmentos de 60s)</p>
            {previewUrl ? (
              <div className="relative aspect-[9/16] w-full overflow-hidden rounded-xl border border-white/10 bg-black">
                <video src={previewUrl} controls className="absolute inset-0 h-full w-full object-contain" />
                {duration != null && (
                  <span className="absolute right-2 top-2 rounded-full bg-black/65 px-2 py-0.5 text-[10px] font-semibold text-white/85 backdrop-blur">
                    {duration}s · {width || "?"}×{height || "?"}
                    {duration > MAX_DURATION && (
                      <span className="ml-1 text-amber-300">· {Math.ceil(duration / MAX_DURATION)} partes</span>
                    )}
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => handleFile(null)}
                  className="absolute left-2 top-2 rounded-full bg-black/65 p-1 text-white/85 backdrop-blur transition hover:bg-black/85"
                  aria-label="Remover vídeo"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex aspect-[9/16] w-full max-w-[280px] flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-white/20 bg-white/[0.02] p-6 text-center transition hover:border-white/40 hover:bg-white/[0.05]"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-400/15">
                  <Video className="h-6 w-6 text-amber-300" />
                </div>
                <p className="text-sm font-semibold text-white">Selecionar vídeo</p>
                <p className="text-[11px] text-white/55">MP4/WebM/MOV. Até 60s e 80MB.</p>
              </button>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="video/mp4,video/webm,video/quicktime"
              className="hidden"
              onChange={(e) => handleFile(e.target.files?.[0] || null)}
            />
          </section>

          <section>
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-white/55">
              Legenda (opcional)
            </label>
            <textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value.slice(0, 280))}
              placeholder="Diga algo curto…"
              rows={2}
              className="w-full resize-none rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white placeholder:text-white/35 focus:border-amber-400/60 focus:outline-none"
            />
            <p className="mt-1 text-right text-[10px] text-white/40">{caption.length}/280</p>
          </section>

          {error && (
            <div className="mt-3 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
              {error}
            </div>
          )}
        </div>

        <footer className="flex items-center gap-2 border-t border-white/8 px-4 py-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-white/15 px-4 py-2 text-sm font-medium text-white/80 transition hover:border-white/30 hover:text-white"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={!file || !selectedProfileId || submitting}
            className="ml-auto inline-flex items-center gap-2 rounded-full bg-amber-400 px-4 py-2 text-sm font-bold text-zinc-900 transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            {submitting ? "Publicando…" : "Publicar story"}
          </button>
        </footer>
      </div>
    </div>
  )
}
