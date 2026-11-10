"use client"

// Admin (lore v2 F5): os vídeos do Meu Mundo — um por capítulo e um por
// personagem. O Alex gera o vídeo (cenas de 8 s) e sobe aqui; o jogo toca o
// arquivo enviado e, enquanto não existe, mostra a imagem de capa + texto.
// Envio DIRETO no Railway (getPublicBackendUrl): vídeo passa do limite de
// corpo do proxy da Vercel. Pele tabloide utilitária (admin interno: sem i18n).

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { getToken } from "@/lib/auth"
import { useAuth } from "@/hooks/use-auth"
import { getPublicBackendUrl } from "@/lib/backend-public"
import { PageBackLink } from "@/components/tabloide/PageBackLink"

type Kind = "chapter" | "character"
interface Slot {
  video: string | null
  poster: string | null
  at?: string
}
interface VideosState {
  slots: Record<Kind, string[]>
  videos: Record<Kind, Record<string, Slot>>
}

const BASE = () => `${getPublicBackendUrl()}/meu-mundo/admin/videos`
const auth = (): Record<string, string> => {
  const t = getToken()
  return t ? { Authorization: `Bearer ${t}` } : {}
}
const isAdmin = (user: ReturnType<typeof useAuth>["user"]): boolean => {
  const u = user as unknown as { is_admin?: boolean; roles?: { desc_role: string }[] }
  return !!(u?.is_admin || u?.roles?.some((r) => r.desc_role === "Administrator"))
}

/** Nome de cada lugar (admin interno: pt direto). */
const NAMES: Record<string, string> = {
  raposa: "As Raposas",
  vampiro: "Os Vampiros",
  aurion: "Aurion",
  morkhan: "Morkhan",
  maru: "Marú",
  kragor: "Kragor",
  iris: "Íris",
  zephyra: "Zéphyra",
  noctis: "Noctis",
  aeryn: "Aeryn",
  bastor: "Bastor",
  ciborgue: "Ciborgue",
  garras: "Dama das Garras",
  stone: "Golem de Pedra",
  cavaleiro: "Cavaleiro Dourado",
  wolf: "Lobos de Ferrugem",
  brute: "Brutamontes",
}
const nameOf = (kind: Kind, ref: string) => (kind === "chapter" ? `Capítulo ${ref.replace("cap", "")}` : (NAMES[ref] ?? ref))

export default function AdminMeuMundoVideosPage() {
  const router = useRouter()
  const { user, status } = useAuth()
  const [state, setState] = useState<VideosState | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)

  const load = useCallback(async () => {
    setError(null)
    try {
      const res = await fetch(BASE(), { headers: auth(), cache: "no-store" })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || `Erro ${res.status}`)
      setState(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao carregar")
    }
  }, [])

  useEffect(() => {
    if (status === "loading") return
    if (status !== "authenticated" || !isAdmin(user)) {
      router.replace("/")
      return
    }
    void load()
  }, [status, user, router, load])

  const send = async (kind: Kind, ref: string, field: "video" | "poster", file: File | null) => {
    if (!file) return
    const key = `${kind}:${ref}:${field}`
    setBusy(key)
    setError(null)
    try {
      const fd = new FormData()
      fd.append(field, file)
      const res = await fetch(`${BASE()}/${kind}/${ref}`, { method: "POST", headers: auth(), body: fd })
      const data = await res.json().catch(() => null)
      if (!res.ok) throw new Error(data?.error || `Erro ${res.status}`)
      setState(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha no envio")
    } finally {
      setBusy(null)
    }
  }

  const clear = async (kind: Kind, ref: string, what: "video" | "poster") => {
    if (!window.confirm(what === "video" ? "Tirar o vídeo? O jogo volta a mostrar a imagem e o texto." : "Tirar a imagem de capa?")) return
    const res = await fetch(`${BASE()}/${kind}/${ref}/clear`, { method: "POST", headers: { ...auth(), "Content-Type": "application/json" }, body: JSON.stringify({ what }) })
    const data = await res.json().catch(() => null)
    if (res.ok) setState(data)
    else setError(data?.error || "Falha ao tirar")
  }

  if (status === "loading" || (status === "authenticated" && !isAdmin(user))) {
    return <div className="fl-root fl-paper-texture min-h-[100dvh]" />
  }

  const row = (kind: Kind, ref: string) => {
    const s = state?.videos[kind]?.[ref]
    const pick = (field: "video" | "poster", accept: string, label: string) => (
      <label className="fl-btn-gold cursor-pointer px-2.5 py-1.5 text-[10px] font-black uppercase tracking-[0.08em]">
        {busy === `${kind}:${ref}:${field}` ? "Enviando…" : label}
        <input type="file" accept={accept} className="sr-only" disabled={!!busy} onChange={(e) => void send(kind, ref, field, e.target.files?.[0] ?? null)} />
      </label>
    )
    return (
      <div key={ref} className="flex flex-wrap items-center gap-3 border-2 border-[#0B0B0D] bg-[#F1EDE2] px-3 py-2.5 text-[#0B0B0D] shadow-[4px_4px_0_0_#0B0B0D]">
        <span
          className="h-12 w-20 shrink-0 border-2 border-[#0B0B0D] bg-[#1D1810]"
          style={s?.poster ? { backgroundImage: `url(${s.poster})`, backgroundSize: "cover", backgroundPosition: "center" } : undefined}
        />
        <div className="min-w-[140px] flex-1">
          <div className="font-[family-name:var(--font-anton)] text-lg uppercase leading-none">{nameOf(kind, ref)}</div>
          <div className="mt-0.5 text-[11px] font-bold uppercase tracking-[0.06em] text-[#6B6457]">
            {s?.video ? "Vídeo no ar" : s?.poster ? "Só imagem (o jogo mostra imagem + texto)" : "Vazio (o jogo mostra o texto)"}
          </div>
        </div>
        {s?.video && <video src={s.video} controls preload="none" className="h-16 w-28 border-2 border-[#0B0B0D] bg-black" />}
        <div className="flex flex-wrap gap-1.5">
          {pick("video", "video/mp4,video/webm", s?.video ? "Trocar vídeo" : "Subir vídeo")}
          {pick("poster", "image/webp,image/png,image/jpeg", s?.poster ? "Trocar imagem" : "Subir imagem")}
          {s?.video && (
            <button type="button" onClick={() => void clear(kind, ref, "video")} className="border-2 border-[#0B0B0D] bg-[#1D1810] px-2 py-1 text-[9px] font-black uppercase tracking-[0.06em] text-[#F2B705]">
              Tirar vídeo
            </button>
          )}
          {s?.poster && (
            <button type="button" onClick={() => void clear(kind, ref, "poster")} className="border-2 border-[#0B0B0D] bg-[#e8e2d4] px-2 py-1 text-[9px] font-black uppercase tracking-[0.06em]">
              Tirar imagem
            </button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="fl-root fl-paper-texture min-h-[100dvh] px-4 py-8 sm:px-8">
      <div className="mx-auto max-w-5xl">
        <PageBackLink href="/admin" className="mb-5" />
        <header className="mb-6 border-b-2 border-[#F1EDE2]/12 pb-4">
          <h1 className="fl-display text-4xl leading-none text-[#F2B705]">Meu Mundo · vídeos</h1>
          <p className="mt-1 text-[11px] font-black uppercase tracking-[0.16em] text-[#a89f8d]">Um por capítulo e um por personagem · MP4/WebM até 100 MB · capa WebP/PNG/JPEG</p>
        </header>

        {error && <div className="mb-4 border-2 border-red-500/40 bg-red-950/30 px-3 py-2 text-sm text-red-200">{error}</div>}

        {!state ? (
          <div className="flex justify-center py-16">
            <span className="h-8 w-8 animate-spin rounded-full border-[3px] border-[#F1EDE2]/15 border-t-[#F2B705]" />
          </div>
        ) : (
          <div className="space-y-8">
            <section>
              <h2 className="fl-display mb-3 text-2xl uppercase text-[#F1EDE2]">Capítulos</h2>
              <div className="space-y-2.5">{state.slots.chapter.map((ref) => row("chapter", ref))}</div>
            </section>
            <section>
              <h2 className="fl-display mb-3 text-2xl uppercase text-[#F1EDE2]">Personagens</h2>
              <div className="space-y-2.5">{state.slots.character.map((ref) => row("character", ref))}</div>
            </section>
          </div>
        )}
      </div>
    </div>
  )
}
