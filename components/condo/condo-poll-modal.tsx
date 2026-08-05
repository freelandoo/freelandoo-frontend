"use client"

// Modal de enquete do condomínio (mig 199): quando existe enquete ABERTA que o
// morador ainda não respondeu, ela aparece ao acessar a plataforma.
//
// Só morador CONFIRMADO entra na fila (o backend filtra por titularidade de
// unidade), e o voto é único — o modal some assim que ele responde.
// NÃO é a votação de liderança da comunidade: aquela tem modal próprio
// (CommunityVoteModal) e troca o líder; esta é consulta e não muda papel.

import { useCallback, useEffect, useState } from "react"
import { Building2, Loader2, Vote } from "lucide-react"
import { useTranslations } from "@/components/i18n/I18nProvider"
import { getToken } from "@/lib/auth"

type PendingPoll = {
  id_poll: number
  id_condo: string
  question: string
  description: string | null
  condo_name: string
  options: { id_option: number; label: string }[]
}

export function CondoPollModal() {
  const t = useTranslations("Condo")
  const [polls, setPolls] = useState<PendingPoll[]>([])
  const [idx, setIdx] = useState(0)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  const load = useCallback(async () => {
    const token = getToken()
    if (!token) return
    try {
      const res = await fetch(`/api/condos/polls/pending`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) return
      const data = await res.json()
      if (Array.isArray(data.polls) && data.polls.length > 0) {
        setPolls(data.polls)
        setIdx(0)
      }
    } catch {
      /* silencioso */
    }
  }, [])

  useEffect(() => {
    // Pequeno atraso: não competir com o boot da página.
    const id = setTimeout(load, 1800)
    return () => clearTimeout(id)
  }, [load])

  const current = polls[idx]
  if (!current) return null

  const vote = async (idOption: number) => {
    const token = getToken()
    if (!token) return
    setBusy(true)
    setMsg(null)
    try {
      const res = await fetch(`/api/condos/${current.id_condo}/polls/${current.id_poll}/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ id_option: idOption }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || t("pollVoteError", "Não foi possível votar."))
      if (idx + 1 < polls.length) {
        setIdx(idx + 1)
        setBusy(false)
      } else {
        setPolls([])
      }
    } catch (err) {
      setMsg(err instanceof Error ? err.message : t("pollVoteError", "Não foi possível votar."))
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="fl-sharp w-full max-w-md border-2 border-[#0B0B0D] bg-[#15120E] p-6 text-[#F5F1E8] shadow-2xl">
        <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.14em] text-[#F2B705]">
          <Vote className="h-4 w-4" /> {t("pollModalTitle", "Enquete do condomínio")}
        </div>
        <p className="mt-2 inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-[#9A938A]">
          <Building2 className="h-3.5 w-3.5" /> {current.condo_name}
        </p>

        <p className="mt-3 fl-display text-2xl leading-tight">{current.question}</p>
        {current.description && <p className="mt-1 text-sm text-[#9A938A]">{current.description}</p>}

        <div className="mt-5 space-y-2">
          {current.options.map((o) => (
            <button
              key={o.id_option}
              type="button"
              disabled={busy}
              onClick={() => vote(o.id_option)}
              className="w-full border-2 border-[#0B0B0D] bg-[#1D1810] px-4 py-3 text-left text-sm font-bold transition hover:border-[#F2B705] disabled:opacity-60"
            >
              {o.label}
            </button>
          ))}
        </div>

        {busy && (
          <p className="mt-3 flex items-center justify-center gap-2 text-xs text-[#9A938A]">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> {t("sending", "Enviando...")}
          </p>
        )}
        {msg && <p className="mt-3 text-center text-sm text-[#ff7a6a]">{msg}</p>}
        <p className="mt-4 text-center text-[11px] text-[#9A938A]/70">
          {t("pollOnceHint", "Cada morador vota uma única vez.")}
        </p>
      </div>
    </div>
  )
}
