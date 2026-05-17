"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { AnimatePresence, motion } from "framer-motion"
import {
  AlertCircle,
  Loader2,
  Sparkles,
  Upload,
  Video,
  X,
} from "lucide-react"
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
const MAX_CAPTION = 280
const SPRING = { type: "spring" as const, stiffness: 220, damping: 26 }

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
      setFile(f)
    }
    v.onerror = () => setError("Não consegui ler esse vídeo.")
    v.src = url
  }

  const handleDrop = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault()
    const f = e.dataTransfer.files?.[0]
    if (f) handleFile(f)
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

  const segments = duration && duration > MAX_DURATION ? Math.ceil(duration / MAX_DURATION) : 0

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, y: 12, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={SPRING}
        className="relative flex h-full w-full max-w-[560px] flex-col overflow-hidden bg-gradient-to-b from-neutral-950 to-black sm:my-4 sm:h-auto sm:max-h-[92dvh] sm:rounded-2xl sm:border sm:border-white/10 sm:shadow-[0_40px_120px_-30px_rgba(0,0,0,0.8)]"
      >
        <header className="flex items-center justify-between border-b border-white/[0.06] px-6 pt-6 pb-3">
          <div className="flex min-w-0 items-center gap-3">
            <span
              className={cn(
                "flex h-9 w-9 items-center justify-center rounded-xl",
                effectiveKind === "trampo"
                  ? "bg-gradient-to-br from-amber-400/30 to-orange-500/20 text-amber-300"
                  : "bg-gradient-to-br from-yellow-400/25 to-amber-500/15 text-yellow-300"
              )}
            >
              <Sparkles className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <h2 className="text-base font-semibold text-white">Postar story</h2>
              <p className="truncate text-xs text-white/50">
                Vídeo vertical · expira em 24h
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 text-white/60 transition hover:bg-white/10 hover:text-white"
            aria-label="Fechar"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-6 pt-5 pb-4 space-y-5 [scrollbar-width:thin]">
          {/* Subperfil */}
          <section className="space-y-2.5">
            <Label>Subperfil</Label>
            {loadingProfiles ? (
              <div className="flex items-center gap-2 text-sm text-white/60">
                <Loader2 className="h-4 w-4 animate-spin text-yellow-300" />
                Carregando perfis…
              </div>
            ) : profiles.length === 0 ? (
              <p className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-white/60">
                Sem subperfis elegíveis. Crie um subperfil para postar stories.
              </p>
            ) : (
              <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {profiles.map((p) => {
                  const isSel = p.id_profile === selectedProfileId
                  return (
                    <motion.button
                      key={p.id_profile}
                      type="button"
                      onClick={() => setSelectedProfileId(p.id_profile)}
                      whileTap={{ scale: 0.96 }}
                      transition={SPRING}
                      className={cn(
                        "flex w-[82px] shrink-0 flex-col items-center gap-1.5 rounded-2xl border p-2.5 text-center transition-colors",
                        isSel
                          ? "border-yellow-400/60 bg-gradient-to-br from-yellow-400/15 to-amber-500/[0.06] shadow-[0_8px_24px_-12px_rgba(250,204,21,0.4)]"
                          : "border-white/10 bg-white/[0.03] hover:border-white/25"
                      )}
                    >
                      <Avatar className={cn("h-12 w-12 ring-2 transition", isSel ? "ring-yellow-400/60" : "ring-transparent")}>
                        {p.avatar_url && <AvatarImage src={p.avatar_url} alt={p.display_name} />}
                        <AvatarFallback className="bg-zinc-800 text-[10px] text-white/80">
                          {p.display_name?.[0]?.toUpperCase() || "?"}
                        </AvatarFallback>
                      </Avatar>
                      <span className="line-clamp-1 text-[10px] font-medium text-white/90">{p.display_name}</span>
                      {p.is_clan && (
                        <span className="rounded-full bg-amber-400/20 px-1.5 py-px text-[8px] font-semibold uppercase tracking-wider text-amber-200">
                          Clan
                        </span>
                      )}
                    </motion.button>
                  )
                })}
              </div>
            )}
          </section>

          {/* Canal */}
          <section className="space-y-2.5">
            <Label>Canal</Label>
            <div className="grid grid-cols-2 gap-2">
              <ChannelButton
                active={kind === "trampo" && !trampoBlocked}
                disabled={trampoBlocked}
                onClick={() => setKind("trampo")}
                title="Trampo"
                subtitle="Aparece em /maquinas"
              />
              <ChannelButton
                active={kind === "rest"}
                onClick={() => setKind("rest")}
                title="Rest"
                subtitle="Aparece em /feed"
              />
            </div>
            {trampoBlocked && (
              <p className="text-[11px] text-white/55">Clans não postam Trampo — só Rest.</p>
            )}
          </section>

          {/* Vídeo */}
          <section className="space-y-2.5">
            <div className="flex items-center justify-between">
              <Label>Vídeo</Label>
              <span className="text-[10px] uppercase tracking-wider text-white/30">
                9:16 · até 60s · 80MB
              </span>
            </div>

            <AnimatePresence mode="wait" initial={false}>
              {previewUrl ? (
                <motion.div
                  key="preview"
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  transition={SPRING}
                  className="relative mx-auto w-full aspect-[9/16] max-w-[260px] max-h-[460px] overflow-hidden rounded-2xl ring-1 ring-white/10 bg-black shadow-[0_30px_60px_-30px_rgba(0,0,0,0.8)]"
                >
                  <div className="pointer-events-none absolute inset-0 z-10 rounded-2xl bg-gradient-to-tr from-yellow-400/0 via-amber-300/[0.06] to-transparent" />
                  <video
                    src={previewUrl}
                    className="h-full w-full object-cover"
                    muted
                    playsInline
                    autoPlay
                    loop
                  />
                  {duration != null && (
                    <span className="absolute right-3 top-3 z-20 rounded-full bg-black/70 px-2.5 py-1 text-[10px] font-semibold text-white/90 backdrop-blur">
                      {duration}s · {width || "?"}×{height || "?"}
                      {segments > 0 && (
                        <span className="ml-1 text-amber-300">· {segments} partes</span>
                      )}
                    </span>
                  )}
                  <div className="absolute inset-x-3 bottom-3 z-20 flex items-center justify-end">
                    <button
                      type="button"
                      onClick={() => handleFile(null)}
                      className="inline-flex items-center gap-1.5 rounded-full bg-black/70 px-3 py-1.5 text-[11px] font-medium text-white backdrop-blur transition-colors hover:bg-red-500/30 hover:text-red-100"
                    >
                      <X className="h-3 w-3" />
                      Remover
                    </button>
                  </div>
                </motion.div>
              ) : (
                <motion.label
                  key="empty"
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  transition={SPRING}
                  className="group relative mx-auto flex w-full aspect-[9/16] max-w-[260px] max-h-[460px] cursor-pointer flex-col items-center justify-center overflow-hidden rounded-2xl border border-dashed border-white/15 bg-white/[0.02] transition-all hover:border-yellow-400/40 hover:bg-yellow-400/[0.04]"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={handleDrop}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="video/mp4,video/webm,video/quicktime"
                    className="hidden"
                    onChange={(e) => handleFile(e.target.files?.[0] || null)}
                  />
                  <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(250,204,21,0.06),transparent_70%)] opacity-0 transition-opacity group-hover:opacity-100" />
                  <motion.div
                    animate={{ y: [0, -4, 0] }}
                    transition={{ repeat: Infinity, duration: 2.4, ease: "easeInOut" }}
                    className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/[0.06] ring-1 ring-white/10"
                  >
                    <Video className="h-5 w-5 text-yellow-300" />
                  </motion.div>
                  <span className="px-6 text-center text-sm font-medium text-white/85">
                    Toque ou arraste seu vídeo 9:16
                  </span>
                  <span className="mt-1 px-6 text-center text-[11px] text-white/40">
                    MP4, WebM ou MOV · vertical
                  </span>
                </motion.label>
              )}
            </AnimatePresence>
          </section>

          {/* Legenda */}
          <section className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="story-caption">Legenda (opcional)</Label>
              <span className="text-[10px] tabular-nums text-white/30">
                {caption.length}/{MAX_CAPTION}
              </span>
            </div>
            <textarea
              id="story-caption"
              value={caption}
              onChange={(e) => setCaption(e.target.value.slice(0, MAX_CAPTION))}
              placeholder="Diga algo curto…"
              rows={2}
              className="w-full resize-none rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-white placeholder:text-white/30 transition focus:border-yellow-400/40 focus:outline-none focus:ring-2 focus:ring-yellow-400/20"
            />
          </section>

          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ type: "spring", stiffness: 200, damping: 24 }}
                className="flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-500/[0.08] px-3 py-2 text-xs text-red-200"
              >
                <AlertCircle className="h-4 w-4 shrink-0 mt-px" />
                <span>{error}</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <footer className="flex items-center gap-2 border-t border-white/[0.06] bg-black/40 px-6 py-4 backdrop-blur-sm">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="h-10 rounded-xl border border-white/10 bg-transparent px-4 text-sm font-medium text-white/70 transition hover:bg-white/[0.04] hover:text-white disabled:opacity-50"
          >
            Cancelar
          </button>
          <motion.button
            type="button"
            onClick={submit}
            disabled={!file || !selectedProfileId || submitting}
            whileTap={{ scale: 0.97 }}
            transition={SPRING}
            className="ml-auto inline-flex h-10 items-center gap-2 rounded-xl bg-gradient-to-r from-yellow-400 to-amber-500 px-5 text-sm font-semibold text-black shadow-[0_8px_24px_-8px_rgba(250,204,21,0.55)] transition hover:from-yellow-300 hover:to-amber-400 disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            {submitting ? "Publicando…" : "Publicar story"}
          </motion.button>
        </footer>
      </motion.div>
    </div>
  )
}

function Label({ children, htmlFor }: { children: React.ReactNode; htmlFor?: string }) {
  return (
    <label
      htmlFor={htmlFor}
      className="block text-[11px] font-semibold uppercase tracking-wider text-white/50"
    >
      {children}
    </label>
  )
}

function ChannelButton({
  active,
  disabled,
  onClick,
  title,
  subtitle,
}: {
  active: boolean
  disabled?: boolean
  onClick: () => void
  title: string
  subtitle: string
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={disabled}
      whileTap={disabled ? undefined : { scale: 0.97 }}
      transition={SPRING}
      className={cn(
        "rounded-2xl border p-3 text-left transition-colors",
        active
          ? "border-yellow-400/60 bg-gradient-to-br from-yellow-400/15 to-amber-500/[0.06] text-yellow-200 shadow-[0_8px_24px_-12px_rgba(250,204,21,0.4)]"
          : "border-white/10 bg-white/[0.03] text-white/85 hover:border-white/25",
        disabled && "cursor-not-allowed opacity-40"
      )}
    >
      <div className="text-sm font-semibold">{title}</div>
      <div className="mt-0.5 text-[11px] text-white/55">{subtitle}</div>
    </motion.button>
  )
}
