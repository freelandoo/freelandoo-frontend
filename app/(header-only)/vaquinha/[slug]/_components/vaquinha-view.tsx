"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { toast } from "sonner"
import { HeartHandshake, Loader2, Users, Clock, Target, Pencil, Square, ArrowLeft } from "lucide-react"
import { getToken } from "@/lib/auth"
import { useLocale, useTranslations } from "@/components/i18n/I18nProvider"

type Vaquinha = {
  id_vaquinha: string
  id_user: string
  title: string
  slug: string
  bio: string | null
  cover_url: string | null
  goal_cents: number
  raised_cents: number
  donors_count: number
  deadline: string
  status: "active" | "ended" | "canceled"
}
type Donor = { id_donation: string; donor_name: string; message: string | null; amount_cents: number; paid_at: string }

const PRESETS = [1000, 2500, 5000, 10000, 20000]

export function VaquinhaView({ slug }: { slug: string }) {
  const t = useTranslations("Vaquinha")
  const locale = useLocale()
  const router = useRouter()
  const searchParams = useSearchParams()

  const [v, setV] = useState<Vaquinha | null>(null)
  const [donors, setDonors] = useState<Donor[]>([])
  const [minCents, setMinCents] = useState(500)
  const [state, setState] = useState<"loading" | "loaded" | "error">("loading")
  const [meId, setMeId] = useState<string | null>(null)

  const [donateOpen, setDonateOpen] = useState(false)
  const [amount, setAmount] = useState(2500)
  const [donorName, setDonorName] = useState("")
  const [message, setMessage] = useState("")
  const [submitting, setSubmitting] = useState(false)

  const money = useCallback(
    (cents: number) => (cents / 100).toLocaleString(locale, { style: "currency", currency: "BRL" }),
    [locale],
  )

  const load = useCallback(async () => {
    setState("loading")
    try {
      const token = getToken()
      const res = await fetch(`/api/vaquinhas/${encodeURIComponent(slug)}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        cache: "no-store",
      })
      if (!res.ok) throw new Error()
      const data = await res.json()
      setV(data.vaquinha)
      setDonors(Array.isArray(data.donors) ? data.donors : [])
      setMinCents(Number(data.min_donation_cents) || 500)
      setState("loaded")
    } catch {
      setState("error")
    }
  }, [slug])

  useEffect(() => {
    void load()
  }, [load])

  // Descobre se o visitante é o dono (mostra controles).
  useEffect(() => {
    const token = getToken()
    if (!token) return
    fetch("/api/users/me", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setMeId(d?.id_user || null))
      .catch(() => {})
  }, [])

  // Feedback pós-retorno do Stripe.
  useEffect(() => {
    const d = searchParams.get("doacao")
    if (d === "sucesso") {
      toast.success(t("thanksTitle", "Obrigado pela sua doação!"), {
        description: t("thanksBody", "Pode levar alguns segundos para aparecer no contador."),
      })
      setTimeout(() => void load(), 2500)
    } else if (d === "cancelada") {
      toast.info(t("canceled", "Doação cancelada."))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  const progress = useMemo(() => {
    if (!v || v.goal_cents <= 0) return 0
    return Math.min(100, Math.round((v.raised_cents / v.goal_cents) * 100))
  }, [v])

  const daysLeft = useMemo(() => {
    if (!v) return 0
    const ms = new Date(v.deadline).getTime() - Date.now()
    return Math.max(0, Math.ceil(ms / (24 * 60 * 60 * 1000)))
  }, [v])

  const isOwner = !!v && !!meId && v.id_user === meId
  const isActive = !!v && v.status === "active" && daysLeft > 0

  async function submitDonation() {
    if (amount < minCents) {
      toast.error(t("minError", "Valor abaixo do mínimo."))
      return
    }
    setSubmitting(true)
    try {
      const token = getToken()
      const res = await fetch(`/api/vaquinhas/${encodeURIComponent(slug)}/donate`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ amount_cents: amount, donor_name: donorName.trim() || undefined, message: message.trim() || undefined }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data.checkout_url) throw new Error(data?.error || "donate")
      window.location.href = data.checkout_url
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("donateError", "Não foi possível iniciar a doação."))
      setSubmitting(false)
    }
  }

  async function closeCampaign() {
    if (!v) return
    if (!confirm(t("confirmClose", "Encerrar esta vaquinha? Ela para de receber doações."))) return
    const token = getToken()
    const res = await fetch(`/api/me/vaquinha/${v.id_vaquinha}/close`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    })
    if (res.ok) {
      toast.success(t("closed", "Vaquinha encerrada."))
      void load()
    } else {
      toast.error(t("closeError", "Falha ao encerrar."))
    }
  }

  if (state === "loading") {
    return (
      <main className="flex min-h-[60vh] items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" aria-hidden />
      </main>
    )
  }

  if (state === "error" || !v) {
    return (
      <main className="flex min-h-[60vh] flex-col items-center justify-center gap-3 bg-background px-4 text-center">
        <HeartHandshake className="h-10 w-10 text-muted-foreground" />
        <h1 className="fl-display text-3xl text-foreground">{t("notFound", "Vaquinha não encontrada")}</h1>
        <Link href="/" className="text-sm font-bold text-primary underline">
          {t("backHome", "Voltar ao início")}
        </Link>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-background pb-16">
      {/* Hero */}
      <div className="relative">
        <div className="h-44 w-full overflow-hidden border-b-2 border-[#0B0B0D] bg-[#1d1810] md:h-60">
          {v.cover_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={v.cover_url} alt={v.title} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#1d1810] to-[#0B0B0D]">
              <HeartHandshake className="h-16 w-16 text-[#F2B705]/40" />
            </div>
          )}
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-4">
        <button
          type="button"
          onClick={() => router.back()}
          className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-muted-foreground transition hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> {t("back", "Voltar")}
        </button>

        {/* Cabeçalho + status */}
        <div className="mt-4 flex flex-wrap items-start justify-between gap-3">
          <h1 className="fl-display text-4xl leading-none text-foreground md:text-5xl">{v.title}</h1>
          {!isActive && (
            <span className="border-2 border-[#0B0B0D] bg-[#dc2626] px-2 py-0.5 text-xs font-black uppercase tracking-wide text-[#F1EDE2]">
              {t("ended", "Encerrada")}
            </span>
          )}
        </div>

        {isOwner && (
          <div className="mt-3 flex gap-2">
            <Link
              href={`/vaquinha/nova?edit=${v.id_vaquinha}`}
              className="inline-flex items-center gap-1.5 border-2 border-[#0B0B0D] bg-[#F1EDE2] px-3 py-1.5 text-[12px] font-bold text-[#0B0B0D] shadow-[3px_3px_0_0_#0B0B0D] transition hover:-translate-y-0.5"
            >
              <Pencil className="h-3.5 w-3.5" /> {t("edit", "Editar")}
            </Link>
            {isActive && (
              <button
                type="button"
                onClick={closeCampaign}
                className="inline-flex items-center gap-1.5 border-2 border-[#0B0B0D] bg-[#1D1810] px-3 py-1.5 text-[12px] font-bold text-[#F1EDE2] shadow-[3px_3px_0_0_#0B0B0D] transition hover:-translate-y-0.5"
              >
                <Square className="h-3.5 w-3.5" /> {t("close", "Encerrar")}
              </button>
            )}
          </div>
        )}

        {/* Painel do contador */}
        <section className="mt-5 border-2 border-[#0B0B0D] bg-[#F1EDE2] p-5 text-[#0B0B0D] shadow-[5px_5px_0_0_#0B0B0D]">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#0B0B0D]/60">{t("raised", "Arrecadado")}</p>
              <p className="fl-display text-4xl leading-none md:text-5xl">{money(v.raised_cents)}</p>
            </div>
            <div className="text-right">
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#0B0B0D]/60">{t("goal", "Meta")}</p>
              <p className="fl-display text-2xl leading-none">{money(v.goal_cents)}</p>
            </div>
          </div>

          {/* Barra */}
          <div className="mt-4 h-4 w-full overflow-hidden border-2 border-[#0B0B0D] bg-[#0B0B0D]/10">
            <div className="h-full bg-[#16a34a] transition-all" style={{ width: `${progress}%` }} />
          </div>
          <div className="mt-2 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-[12px] font-bold text-[#0B0B0D]/70">
            <span>{progress}% {t("ofGoal", "da meta")}</span>
            <span className="inline-flex items-center gap-1"><Users className="h-3.5 w-3.5" /> {v.donors_count} {t("donors", "doadores")}</span>
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" /> {isActive ? `${daysLeft} ${t("daysLeft", "dias restantes")}` : t("finished", "finalizada")}
            </span>
          </div>

          {isActive ? (
            <button
              type="button"
              onClick={() => { setAmount(2500); setDonateOpen(true) }}
              className="mt-5 inline-flex w-full items-center justify-center gap-2 border-2 border-[#0B0B0D] bg-[#F2B705] px-4 py-3 text-sm font-black uppercase tracking-wide text-[#0B0B0D] shadow-[4px_4px_0_0_#0B0B0D] transition hover:-translate-y-0.5"
            >
              <HeartHandshake className="h-4 w-4" /> {t("donate", "Doar")}
            </button>
          ) : (
            <p className="mt-5 border-2 border-dashed border-[#0B0B0D]/30 py-3 text-center text-sm font-bold text-[#0B0B0D]/60">
              {t("endedHint", "Esta vaquinha não está mais recebendo doações.")}
            </p>
          )}
        </section>

        {/* Bio */}
        {v.bio && (
          <section className="mt-6">
            <h2 className="fl-display mb-2 inline-flex items-center gap-2 text-xl text-foreground">
              <Target className="h-4 w-4 text-primary" /> {t("about", "Sobre a campanha")}
            </h2>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">{v.bio}</p>
          </section>
        )}

        {/* Doadores */}
        <section className="mt-8">
          <h2 className="fl-display mb-3 text-xl text-foreground">{t("recentDonors", "Doações recentes")}</h2>
          {donors.length === 0 ? (
            <p className="border-2 border-dashed border-foreground/15 py-8 text-center text-sm text-muted-foreground">
              {t("noDonors", "Seja o primeiro a doar.")}
            </p>
          ) : (
            <ul className="space-y-2">
              {donors.map((d) => (
                <li key={d.id_donation} className="flex items-start justify-between gap-3 border-2 border-[#0B0B0D] bg-[#1D1810] px-3 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-[#F1EDE2]">{d.donor_name}</p>
                    {d.message && <p className="mt-0.5 line-clamp-2 text-xs text-[#F1EDE2]/60">{d.message}</p>}
                  </div>
                  <span className="shrink-0 font-mono text-sm font-bold text-[#16a34a]">{money(d.amount_cents)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {/* Modal de doação */}
      {donateOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 sm:items-center sm:p-4" onClick={() => !submitting && setDonateOpen(false)}>
          <div
            className="w-full max-w-md border-2 border-[#0B0B0D] bg-[#F1EDE2] p-5 text-[#0B0B0D] shadow-[6px_6px_0_0_#0B0B0D]"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="fl-display text-2xl">{t("donateTo", "Doar para")} “{v.title}”</h3>
            <p className="mt-1 text-xs text-[#0B0B0D]/60">{t("minLabel", "Mínimo")}: {money(minCents)}</p>

            <div className="mt-4 grid grid-cols-3 gap-2">
              {PRESETS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setAmount(p)}
                  className={`border-2 border-[#0B0B0D] px-2 py-2 text-sm font-bold transition ${amount === p ? "bg-[#F2B705]" : "bg-white hover:bg-[#F2B705]/20"}`}
                >
                  {money(p)}
                </button>
              ))}
            </div>

            <label className="mt-4 block text-[11px] font-bold uppercase tracking-wide text-[#0B0B0D]/60">{t("otherAmount", "Outro valor (R$)")}</label>
            <input
              type="number"
              min={minCents / 100}
              step="1"
              value={(amount / 100).toString()}
              onChange={(e) => setAmount(Math.round(Number(e.target.value) * 100) || 0)}
              className="mt-1 w-full border-2 border-[#0B0B0D] bg-white px-3 py-2 text-sm outline-none"
            />

            <label className="mt-3 block text-[11px] font-bold uppercase tracking-wide text-[#0B0B0D]/60">{t("yourName", "Seu nome (opcional)")}</label>
            <input
              value={donorName}
              onChange={(e) => setDonorName(e.target.value)}
              maxLength={80}
              placeholder={t("anon", "Anônimo")}
              className="mt-1 w-full border-2 border-[#0B0B0D] bg-white px-3 py-2 text-sm outline-none"
            />

            <label className="mt-3 block text-[11px] font-bold uppercase tracking-wide text-[#0B0B0D]/60">{t("messageLabel", "Mensagem (opcional)")}</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              maxLength={280}
              rows={2}
              className="mt-1 w-full resize-none border-2 border-[#0B0B0D] bg-white px-3 py-2 text-sm outline-none"
            />

            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={() => setDonateOpen(false)}
                disabled={submitting}
                className="flex-1 border-2 border-[#0B0B0D] bg-white px-3 py-2.5 text-sm font-bold transition hover:bg-[#0B0B0D]/5 disabled:opacity-50"
              >
                {t("cancel", "Cancelar")}
              </button>
              <button
                type="button"
                onClick={submitDonation}
                disabled={submitting}
                className="flex-[2] inline-flex items-center justify-center gap-2 border-2 border-[#0B0B0D] bg-[#16a34a] px-3 py-2.5 text-sm font-black uppercase tracking-wide text-white shadow-[3px_3px_0_0_#0B0B0D] transition hover:-translate-y-0.5 disabled:opacity-60"
              >
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <HeartHandshake className="h-4 w-4" />}
                {t("continueToPay", "Ir para o pagamento")}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
