"use client"

import { useCallback, useEffect, useState } from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Crown, Swords } from "lucide-react"
import { useTranslations } from "@/components/i18n/I18nProvider"
import { getToken } from "@/lib/auth"

type PendingVote = {
  id_vote: number
  community_name: string
  leader_name: string | null
  leader_username: string | null
  leader_avatar: string | null
  leader_level: number | null
  challenger_name: string | null
  challenger_username: string | null
  challenger_avatar: string | null
  challenger_level: number | null
}

export function CommunityVoteModal() {
  const t = useTranslations("Community")
  const [votes, setVotes] = useState<PendingVote[]>([])
  const [idx, setIdx] = useState(0)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  const load = useCallback(async () => {
    const token = getToken()
    if (!token) return
    try {
      const res = await fetch(`/api/communities/votes/pending`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) return
      const data = await res.json()
      if (Array.isArray(data.votes) && data.votes.length > 0) {
        setVotes(data.votes)
        setIdx(0)
      }
    } catch {
      /* silencioso */
    }
  }, [])

  useEffect(() => {
    // Pequeno atraso para não competir com o boot da página.
    const id = setTimeout(load, 1500)
    return () => clearTimeout(id)
  }, [load])

  const current = votes[idx]
  if (!current) return null

  const vote = async (choice: "leader" | "challenger") => {
    const token = getToken()
    if (!token) return
    setBusy(true)
    setMsg(null)
    try {
      const res = await fetch(`/api/communities/votes/${current.id_vote}/ballot`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ choice }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || t("voteError", "Não foi possível votar."))
      // Próximo voto pendente, se houver.
      if (idx + 1 < votes.length) setIdx(idx + 1)
      else setVotes([])
    } catch (err) {
      setMsg(err instanceof Error ? err.message : t("voteError", "Não foi possível votar."))
      setBusy(false)
    }
  }

  const keepLabel = t("voteKeep", "Manter {name}").replace("{name}", current.leader_name || "—")
  const switchLabel = t("voteSwitch", "Trocar para {name}").replace("{name}", current.challenger_name || "—")
  const lvl = (n: number | null) =>
    typeof n === "number" ? t("voteLevelN", "Nível {n}").replace("{n}", String(n)) : ""

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="fl-root fl-paper-card w-full max-w-md rounded-3xl p-6 shadow-2xl">
        <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-amber-600">
          <Swords className="h-4 w-4" /> {t("voteTitle", "Votação de liderança")}
        </div>
        <p className="mt-2 text-base font-semibold">{current.community_name}</p>
        <p className="mt-1 text-sm opacity-70">
          {t("votePrompt", "Sua comunidade está evoluindo pouco. Quem você quer como líder?")}
        </p>

        <div className="mt-5 grid grid-cols-2 gap-3">
          {[
            { who: "leader" as const, name: current.leader_name, avatar: current.leader_avatar, level: current.leader_level, badge: <Crown className="h-3 w-3" /> },
            { who: "challenger" as const, name: current.challenger_name, avatar: current.challenger_avatar, level: current.challenger_level, badge: <Swords className="h-3 w-3" /> },
          ].map((p) => (
            <button
              key={p.who}
              type="button"
              disabled={busy}
              onClick={() => vote(p.who)}
              className="flex flex-col items-center gap-2 rounded-2xl border-2 border-black/10 p-4 transition hover:border-amber-500 disabled:opacity-60"
            >
              <Avatar className="size-16">
                <AvatarImage src={p.avatar || undefined} alt={p.name || ""} />
                <AvatarFallback>{(p.name || "?").slice(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
              <span className="text-center text-sm font-semibold">{p.name || "—"}</span>
              <span className="inline-flex items-center gap-1 text-xs opacity-60">{p.badge} {lvl(p.level)}</span>
              <span className="mt-1 rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-bold text-[#1A1505]">
                {p.who === "leader" ? keepLabel : switchLabel}
              </span>
            </button>
          ))}
        </div>

        {msg ? <p className="mt-3 text-center text-sm text-red-600">{msg}</p> : null}
      </div>
    </div>
  )
}
