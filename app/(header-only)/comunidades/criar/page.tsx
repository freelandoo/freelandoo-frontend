"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Plus, Ticket } from "lucide-react"
import { PageShell } from "@/components/tabloide"
import { useTranslations } from "@/components/i18n/I18nProvider"
import { useTaxonomy } from "@/lib/i18n/taxonomy"
import { getToken } from "@/lib/auth"

type Enxame = { id_machine: number; name: string; slug?: string }
type Eligibility = {
  eligible: boolean
  required_level: number
  current_level: number
  create_cap: number
  member_cap: number
  owned: number
  memberships: number
}

const inputCls =
  "h-11 w-full rounded-xl border-2 border-[#F5F1E8]/10 bg-[#0B0B0D]/40 px-4 text-sm text-[#F5F1E8] placeholder:text-[#F5F1E8]/40 outline-none focus:border-[#F2B705]/60"

export default function CreateCommunityPage() {
  const t = useTranslations("Community")
  const tx = useTaxonomy()
  const router = useRouter()

  const [enxames, setEnxames] = useState<Enxame[]>([])
  const [name, setName] = useState("")
  const [idMachine, setIdMachine] = useState("")
  const [bio, setBio] = useState("")
  const [elig, setElig] = useState<Eligibility | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [buyingSlot, setBuyingSlot] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  const loadElig = useCallback(async () => {
    const token = getToken()
    if (!token) return
    try {
      const res = await fetch(`/api/communities/eligibility`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      if (res.ok) setElig(data)
    } catch {
      /* silencioso */
    }
  }, [])

  useEffect(() => {
    fetch("/api/enxames")
      .then((r) => r.json())
      .then((d) => setEnxames(d.enxames || d.machines || []))
      .catch(() => setEnxames([]))
    loadElig()
  }, [loadElig])

  const capReached = !!elig && elig.owned >= elig.create_cap
  const levelOk = !elig || elig.current_level >= elig.required_level

  const submit = async () => {
    const token = getToken()
    if (!token) {
      setMsg(t("loginToJoin", "Entre para participar"))
      return
    }
    if (!name.trim() || !idMachine) {
      setMsg(t("nameLabel", "Nome da comunidade"))
      return
    }
    setSubmitting(true)
    setMsg(null)
    try {
      const res = await fetch(`/api/communities`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ display_name: name.trim(), id_machine: Number(idMachine), bio: bio.trim() || null }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || t("createError", "Não foi possível criar a comunidade."))
      router.push(`/comunidades/${data.id_profile}`)
    } catch (err) {
      setMsg(err instanceof Error ? err.message : t("createError", "Não foi possível criar a comunidade."))
    } finally {
      setSubmitting(false)
    }
  }

  const buySlot = async () => {
    const token = getToken()
    if (!token) {
      setMsg(t("loginToJoin", "Entre para participar"))
      return
    }
    setBuyingSlot(true)
    setMsg(t("slotRedirect", "Redirecionando para o pagamento..."))
    try {
      const res = await fetch(`/api/communities/slots/checkout`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      if (!res.ok || !data.url) throw new Error(data.error || t("slotError", "Não foi possível iniciar o pagamento."))
      window.location.href = data.url
    } catch (err) {
      setMsg(err instanceof Error ? err.message : t("slotError", "Não foi possível iniciar o pagamento."))
      setBuyingSlot(false)
    }
  }

  return (
    <PageShell>
      <div className="mx-auto w-full max-w-xl px-5 py-10 sm:px-8">
        <Link href="/comunidades" className="inline-flex items-center gap-2 text-sm text-[#F5F1E8]/70 hover:text-[#F5F1E8]">
          <ArrowLeft className="h-4 w-4" /> {t("back", "Voltar")}
        </Link>

        <h1 className="mt-6 text-2xl font-extrabold text-[#F5F1E8]">{t("createTitle", "Criar comunidade")}</h1>
        <p className="mt-1 text-sm text-[#F5F1E8]/60">{t("createSubtitle", "Reúna pessoas em torno de um enxame.")}</p>

        {!levelOk ? (
          <p className="mt-6 rounded-xl border-2 border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
            {t("needLevel5", "Você precisa de pelo menos um subperfil nível 5 para criar uma comunidade.")}
          </p>
        ) : null}

        <div className="mt-6 space-y-4">
          <div>
            <label className="mb-1 block text-sm font-semibold text-[#F5F1E8]/80">{t("nameLabel", "Nome da comunidade")}</label>
            <input className={inputCls} placeholder={t("namePlaceholder", "Ex.: Confeiteiros de SP")} value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-[#F5F1E8]/80">{t("enxameLabel", "Enxame")}</label>
            <select className={inputCls} value={idMachine} onChange={(e) => setIdMachine(e.target.value)}>
              <option value="">—</option>
              {enxames.map((e) => (
                <option key={e.id_machine} value={e.id_machine}>{tx.enxame(e.slug ?? null, e.name)}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-[#F5F1E8]/80">{t("bioLabel", "Descrição (opcional)")}</label>
            <textarea className={`${inputCls} h-24 py-2`} value={bio} onChange={(e) => setBio(e.target.value)} maxLength={200} />
          </div>

          {msg ? <p className="rounded-lg bg-[#F2B705]/15 px-3 py-2 text-sm text-[#F5F1E8]">{msg}</p> : null}

          {capReached ? (
            <div className="rounded-2xl border-2 border-[#F2B705]/30 bg-[#1D1810]/60 p-4">
              <p className="flex items-center gap-2 text-sm font-semibold text-[#F2B705]"><Ticket className="h-4 w-4" /> {t("slotTitle", "Ingresso de Comunidade")}</p>
              <p className="mt-1 text-sm text-[#F5F1E8]/70">{t("slotDesc", "Por R$100 você libera +1 comunidade para criar e +1 para participar (máximo de 3).")}</p>
              <button type="button" disabled={buyingSlot} onClick={buySlot} className="mt-3 inline-flex items-center gap-2 rounded-xl bg-[#F2B705] px-5 py-2.5 text-sm font-bold text-[#1A1505] disabled:opacity-60">
                <Ticket className="h-4 w-4" /> {t("slotBuy", "Comprar ingresso (R$100)")}
              </button>
            </div>
          ) : (
            <button
              type="button"
              disabled={submitting || !levelOk}
              onClick={submit}
              className="inline-flex items-center gap-2 rounded-xl bg-[#F2B705] px-6 py-2.5 text-sm font-bold text-[#1A1505] disabled:opacity-60"
            >
              <Plus className="h-4 w-4" /> {submitting ? t("creating", "Criando...") : t("createButton", "Criar")}
            </button>
          )}
        </div>
      </div>
    </PageShell>
  )
}
