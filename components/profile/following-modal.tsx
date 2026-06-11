"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2, Users, X } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useTranslations } from "@/components/i18n/I18nProvider"

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
  const t = useTranslations("Account")
  const router = useRouter()
  const [items, setItems] = useState<FollowedProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    if (!open) return
    const token =
      typeof window !== "undefined" ? localStorage.getItem("token") : null
    if (!token) {
      setError(t("sessionExpired", "Sessão expirada. Faça login novamente."))
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
        if (!r.ok) throw new Error(data?.error || t("loadFailed", "Não foi possível carregar"))
        if (!cancelled) setItems(Array.isArray(data?.items) ? data.items : [])
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : t("loadFailed", "Erro ao carregar"))
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [open, t])

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
        className="flex max-h-[80vh] w-full max-w-md flex-col overflow-hidden rounded-2xl border-2 border-[#0B0B0D] bg-[#F1EDE2] text-[#0B0B0D] shadow-[8px_8px_0_0_#0B0B0D]"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={t("followingAria", "Perfis que você acompanha")}
      >
        <div className="flex items-center justify-between border-b-2 border-[#0B0B0D]/15 px-5 py-4">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-[#E0A500]" />
            <h2 className="fl-display text-xl tracking-tight text-[#0B0B0D]">
              {t("countFollowing", "Acompanhando")}
              {!loading && !error && items.length > 0 && (
                <span className="ml-1.5 text-sm font-normal text-[#5b554b]">
                  {items.length}
                </span>
              )}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-[#0B0B0D]/55 transition hover:bg-[#0B0B0D]/10 hover:text-[#0B0B0D]"
            aria-label={t("close", "Fechar")}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-[#0B0B0D]/40" />
            </div>
          ) : error ? (
            <div className="px-6 py-14 text-center text-sm font-medium text-[#b91c1c]">
              {error}
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
              <Users className="mb-3 h-9 w-9 text-[#0B0B0D]/20" />
              <p className="text-sm font-bold text-[#0B0B0D]">
                {t("notFollowingAnyone", "Você ainda não acompanha ninguém")}
              </p>
              <p className="mt-1 text-xs text-[#5b554b]">
                {t("followToSeeHere", "Acompanhe perfis e clans para vê-los aqui.")}
              </p>
            </div>
          ) : (
            <ul className="divide-y-2 divide-[#0B0B0D]/[0.07]">
              {items.map((p) => (
                <li key={p.id_profile}>
                  <button
                    type="button"
                    onClick={() => goToProfile(p)}
                    className="flex w-full items-center gap-3 px-5 py-3 text-left transition-colors hover:bg-[#0B0B0D]/[0.05]"
                  >
                    <Avatar className="h-11 w-11 shrink-0 border-2 border-[#0B0B0D]">
                      <AvatarImage src={p.avatar_url || undefined} />
                      <AvatarFallback className="bg-[#F2B705]/20 text-xs text-[#0B0B0D]">
                        {initials(p.display_name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-[#0B0B0D]">
                        {p.display_name || t("unnamedProfile", "Perfil sem nome")}
                      </p>
                      {p.username && (
                        <p className="truncate text-xs text-[#5b554b]">
                          @{p.username}
                        </p>
                      )}
                    </div>
                    {p.is_clan && (
                      <span className="shrink-0 rounded-full border-2 border-[#0B0B0D] bg-[#F2B705] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#1A1505]">
                        {t("clanLabel", "Clan")}
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
