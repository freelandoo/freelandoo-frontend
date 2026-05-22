"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2, Users, X } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

type FollowedProfile = {
  id_profile: string
  display_name: string | null
  avatar_url: string | null
  is_clan: boolean
  sub_profile_slug: string | null
  username: string | null
  followed_at: string
}

interface FollowingModalProps {
  open: boolean
  onClose: () => void
}

function initials(name: string | null | undefined): string {
  if (!name) return "?"
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() || "")
    .join("")
}

/** Lista os perfis que o usuário logado acompanha. */
export function FollowingModal({ open, onClose }: FollowingModalProps) {
  const router = useRouter()
  const [items, setItems] = useState<FollowedProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    if (!open) return
    const token =
      typeof window !== "undefined" ? localStorage.getItem("token") : null
    if (!token) {
      setError("Sessão expirada. Faça login novamente.")
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)
    setError("")
    fetch("/api/entity-follows/me/following", {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    })
      .then(async (r) => {
        const data = (await r.json().catch(() => null)) as
          | { items?: FollowedProfile[]; error?: string }
          | null
        if (!r.ok) throw new Error(data?.error || "Não foi possível carregar")
        if (!cancelled) setItems(Array.isArray(data?.items) ? data.items : [])
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Erro ao carregar")
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open, onClose])

  if (!open) return null

  function goToProfile(p: FollowedProfile) {
    onClose()
    router.push(
      p.is_clan ? `/clans/${p.id_profile}` : `/freelancer/${p.id_profile}`,
    )
  }

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="flex max-h-[80vh] w-full max-w-md flex-col overflow-hidden rounded-2xl border border-white/10 bg-zinc-900 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Perfis que você acompanha"
      >
        <div className="flex items-center justify-between border-b border-white/[0.07] px-5 py-4">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-amber-300" />
            <h2 className="text-base font-semibold tracking-tight text-white">
              Acompanhando
              {!loading && !error && items.length > 0 && (
                <span className="ml-1.5 text-sm font-normal text-white/45">
                  {items.length}
                </span>
              )}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-white/55 transition hover:bg-white/10 hover:text-white"
            aria-label="Fechar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-white/40" />
            </div>
          ) : error ? (
            <div className="px-6 py-14 text-center text-sm text-red-400">
              {error}
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
              <Users className="mb-3 h-9 w-9 text-white/20" />
              <p className="text-sm font-medium text-white">
                Você ainda não acompanha ninguém
              </p>
              <p className="mt-1 text-xs text-white/45">
                Acompanhe perfis e clans para vê-los aqui.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-white/5">
              {items.map((p) => (
                <li key={p.id_profile}>
                  <button
                    type="button"
                    onClick={() => goToProfile(p)}
                    className="flex w-full items-center gap-3 px-5 py-3 text-left transition-colors hover:bg-white/5"
                  >
                    <Avatar className="h-11 w-11 shrink-0">
                      <AvatarImage src={p.avatar_url || undefined} />
                      <AvatarFallback className="bg-neutral-800 text-xs text-white">
                        {initials(p.display_name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-white">
                        {p.display_name || "Perfil sem nome"}
                      </p>
                      {p.username && (
                        <p className="truncate text-xs text-white/45">
                          @{p.username}
                        </p>
                      )}
                    </div>
                    {p.is_clan && (
                      <span className="shrink-0 rounded-full bg-amber-400/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-300">
                        Clan
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
