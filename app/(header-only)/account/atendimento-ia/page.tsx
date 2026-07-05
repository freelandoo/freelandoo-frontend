"use client"

// Atendimento IA — página do vendedor: assinar um plano (mensal, Stripe),
// acompanhar o uso de tokens do ciclo e controlar o bot (pausar, canais,
// instruções extras). O bot responde DMs e O.S. sabendo os perfis, serviços
// e preços da conta (APIs de Atendimento + Dados). UI nova nasce reta.

import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
  Bot, Loader2, ArrowLeft, Check, X, Zap, Pause, Play,
  MessageCircle, ClipboardList, Save, XCircle, AlertTriangle, RefreshCw,
} from "lucide-react"
import { getToken } from "@/lib/auth"
import { useLocale, useTranslations } from "@/components/i18n/I18nProvider"
import { useFeature } from "@/components/feature-flags/FeatureFlagsProvider"

type Plan = {
  id_plan: number
  name: string
  description: string | null
  monthly_cents: number
  token_limit_monthly: number
}
type Sub = {
  id_sub: number
  id_plan: number
  monthly_cents: number
  token_limit_monthly: number
  status: "pending" | "active" | "past_due" | "canceled" | "expired"
  provisioning_status: "pending" | "provisioned" | "failed" | "deprovisioned"
  current_period_end: string | null
  config: { paused?: boolean; answer_dm?: boolean; answer_os?: boolean; extra_instructions?: string }
  activated_at: string | null
}
type Usage = {
  cycle_start: string | null
  tokens_used: number
  token_limit: number | null
  paused_by_limit: boolean
} | null

function compactTokens(n: number): string {
  const v = Number(n) || 0
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`
  if (v >= 1_000) return `${Math.round(v / 1_000)}k`
  return String(v)
}

export default function AtendimentoIaPage() {
  const t = useTranslations("AtendimentoIa")
  const locale = useLocale()
  const router = useRouter()
  const vendaOn = useFeature("atendimento_ia_venda")

  const [plans, setPlans] = useState<Plan[]>([])
  const [sub, setSub] = useState<Sub | null>(null)
  const [usage, setUsage] = useState<Usage>(null)
  const [state, setState] = useState<"loading" | "loaded" | "unauth" | "error">("loading")
  const [busyPlan, setBusyPlan] = useState<number | null>(null)
  const [savingConfig, setSavingConfig] = useState(false)
  const [canceling, setCanceling] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [instructions, setInstructions] = useState("")
  const [instructionsSeeded, setInstructionsSeeded] = useState(false)

  const money = useCallback(
    (cents: number) => (cents / 100).toLocaleString(locale, { style: "currency", currency: "BRL" }),
    [locale],
  )

  const load = useCallback(async () => {
    const token = getToken()
    if (!token) { setState("unauth"); return }
    try {
      const res = await fetch("/api/me/atendimento-ia", {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      })
      if (res.status === 401) { setState("unauth"); return }
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || "load")
      setPlans(Array.isArray(data.plans) ? data.plans : [])
      setSub(data.sub || null)
      setUsage(data.usage || null)
      if (!instructionsSeeded && data.sub) {
        setInstructions(String(data.sub.config?.extra_instructions || ""))
        setInstructionsSeeded(true)
      }
      setState("loaded")
    } catch {
      setState("error")
    }
  }, [instructionsSeeded])

  useEffect(() => { void load() }, [load])

  // Volta do checkout (?atendimento_ia=sucesso) + polling curto do provisionamento.
  useEffect(() => {
    if (typeof window === "undefined") return
    const sp = new URLSearchParams(window.location.search)
    const st = sp.get("atendimento_ia")
    if (!st) return
    if (st === "sucesso") setMsg(t("checkoutSuccess", "Pagamento confirmado! Estamos ativando seu bot…"))
    else if (st === "cancelado") setMsg(t("checkoutCanceled", "Assinatura cancelada — você não foi cobrado."))
    window.history.replaceState({}, "", window.location.pathname)
  }, [t])

  // Enquanto está "ativando", recarrega a cada 5s (o provisionamento leva segundos).
  const activating = !!sub && ["active", "past_due"].includes(sub.status) && sub.provisioning_status !== "provisioned"
  useEffect(() => {
    if (!activating) return
    const timer = setInterval(() => { void load() }, 5000)
    return () => clearInterval(timer)
  }, [activating, load])

  const subscribe = async (id_plan: number) => {
    const token = getToken()
    if (!token) { router.push("/login?next=/account/atendimento-ia"); return }
    setBusyPlan(id_plan); setMsg(null)
    try {
      const res = await fetch("/api/me/atendimento-ia/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ id_plan }),
      })
      const data = await res.json()
      if (!res.ok || !data.checkout_url) throw new Error(data?.error || t("checkoutError", "Não foi possível iniciar a assinatura."))
      window.location.href = data.checkout_url
    } catch (err) {
      setMsg(err instanceof Error ? err.message : t("checkoutError", "Não foi possível iniciar a assinatura."))
      setBusyPlan(null)
    }
  }

  const patchConfig = async (patch: Record<string, unknown>) => {
    const token = getToken()
    if (!token || !sub) return
    setSavingConfig(true); setMsg(null)
    try {
      const res = await fetch("/api/me/atendimento-ia/config", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(patch),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || t("saveError", "Não foi possível salvar."))
      setSub((prev) => (prev ? { ...prev, config: data.config || prev.config } : prev))
      setMsg(t("configSaved", "Configuração salva."))
      setTimeout(() => setMsg(null), 2500)
    } catch (err) {
      setMsg(err instanceof Error ? err.message : t("saveError", "Não foi possível salvar."))
    } finally { setSavingConfig(false) }
  }

  const cancelSub = async () => {
    if (!confirm(t("cancelConfirm", "Cancelar o Atendimento IA? O bot para de responder na hora e o mês já pago não é estornado."))) return
    const token = getToken()
    if (!token) return
    setCanceling(true); setMsg(null)
    try {
      const res = await fetch("/api/me/atendimento-ia/cancel", {
        method: "POST", headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || t("cancelError", "Não foi possível cancelar."))
      setMsg(t("cancelDone", "Assinatura cancelada. O bot foi desligado."))
      setInstructionsSeeded(false)
      await load()
    } catch (err) {
      setMsg(err instanceof Error ? err.message : t("cancelError", "Não foi possível cancelar."))
    } finally { setCanceling(false) }
  }

  const config = sub?.config || {}
  const hasLiveSub = !!sub && ["active", "past_due"].includes(sub.status)
  const tokensUsed = Number(usage?.tokens_used || 0)
  const tokenLimit = Number(usage?.token_limit || sub?.token_limit_monthly || 0)
  const usagePct = tokenLimit > 0 ? Math.min(100, Math.round((tokensUsed / tokenLimit) * 100)) : 0
  const limitHit = !!usage?.paused_by_limit || (tokenLimit > 0 && tokensUsed >= tokenLimit)
  const currentPlan = useMemo(() => plans.find((p) => p.id_plan === sub?.id_plan) || null, [plans, sub])

  if (state === "loading") {
    return (
      <main className="flex min-h-[60vh] items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" aria-hidden />
      </main>
    )
  }
  if (state === "unauth") {
    return (
      <main className="fl-sharp flex min-h-[60vh] flex-col items-center justify-center gap-3 bg-background px-4 text-center">
        <Bot className="h-10 w-10 text-muted-foreground" />
        <h1 className="fl-display text-3xl text-foreground">{t("pageTitle", "Atendimento IA")}</h1>
        <p className="text-sm text-muted-foreground">{t("loginRequired", "Entre na sua conta para contratar o bot.")}</p>
        <Link href="/login?next=/account/atendimento-ia" className="border-2 border-[#0B0B0D] bg-[#F2B705] px-5 py-2 text-sm font-black uppercase tracking-wide text-[#0B0B0D] shadow-[3px_3px_0_0_#0B0B0D]">
          {t("loginCta", "Entrar")}
        </Link>
      </main>
    )
  }
  if (state === "error") {
    return (
      <main className="fl-sharp flex min-h-[60vh] flex-col items-center justify-center gap-3 bg-background px-4 text-center">
        <AlertTriangle className="h-10 w-10 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">{t("loadError", "Não foi possível carregar. Tente de novo.")}</p>
        <button type="button" onClick={() => { setState("loading"); void load() }} className="border-2 border-[#0B0B0D] bg-[#F1EDE2] px-4 py-2 text-sm font-bold text-[#0B0B0D]">
          {t("retry", "Tentar de novo")}
        </button>
      </main>
    )
  }

  return (
    <main className="fl-sharp min-h-[100dvh] bg-background pb-16">
      <div className="mx-auto max-w-3xl px-4 pt-6">
        <button type="button" onClick={() => router.push("/account")}
          className="inline-flex items-center gap-2 text-sm font-bold text-muted-foreground transition hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> {t("backToAccount", "Minha conta")}
        </button>

        <div className="mt-4 flex items-center gap-3">
          <span className="grid h-12 w-12 place-items-center border-2 border-[#0B0B0D] bg-[#F2B705] text-[#0B0B0D]"><Bot className="h-6 w-6" /></span>
          <div>
            <h1 className="fl-display text-4xl leading-none text-foreground">{t("pageTitle", "Atendimento IA")}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {t("pageSubtitle", "Um bot que responde suas conversas sabendo seus perfis, serviços e preços — 24h por dia.")}
            </p>
          </div>
        </div>

        {msg && (
          <p className="mt-4 inline-block border-2 border-[#0B0B0D] bg-[#F1EDE2] px-3 py-1.5 text-xs font-bold text-[#0B0B0D]">{msg}</p>
        )}

        {/* ── Sem assinatura viva: pitch + planos ── */}
        {!hasLiveSub && (
          <>
            <section className="mt-6 border-2 border-[#0B0B0D] bg-[#F1EDE2] p-5 text-[#0B0B0D] shadow-[5px_5px_0_0_#0B0B0D]">
              <h2 className="fl-display text-xl">{t("howTitle", "Como funciona")}</h2>
              <ul className="mt-3 space-y-2 text-sm">
                <li className="flex items-start gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-[#16a34a]" /> {t("how1", "O bot lê seus perfis, subperfis, serviços, produtos, cursos e preços e monta a própria base de conhecimento (atualizada todo dia).")}</li>
                <li className="flex items-start gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-[#16a34a]" /> {t("how2", "Responde suas conversas diretas e chats de O.S. em segundos, com os valores certos.")}</li>
                <li className="flex items-start gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-[#16a34a]" /> {t("how3", "Nunca inicia conversa — só responde quem falou com você. Você pausa quando quiser.")}</li>
                <li className="flex items-start gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-[#16a34a]" /> {t("how4", "Cada plano tem uma cota mensal de uso. Bateu a cota, o bot pausa até o próximo ciclo.")}</li>
              </ul>
            </section>

            {sub?.status === "pending" && (
              <p className="mt-4 text-xs font-bold text-muted-foreground">{t("pendingHint", "Você tem um pagamento em aberto — assine de novo para gerar um novo link.")}</p>
            )}

            <section className="mt-6">
              <h2 className="fl-display mb-3 text-xl text-foreground">{t("plansTitle", "Planos")}</h2>
              {!vendaOn ? (
                <p className="border-2 border-dashed border-foreground/20 py-8 text-center text-sm text-muted-foreground">
                  {t("salesOff", "A contratação está temporariamente indisponível.")}
                </p>
              ) : plans.length === 0 ? (
                <p className="border-2 border-dashed border-foreground/20 py-8 text-center text-sm text-muted-foreground">
                  {t("noPlans", "Nenhum plano disponível no momento.")}
                </p>
              ) : (
                <div className="grid gap-3 sm:grid-cols-3">
                  {plans.map((p, i) => (
                    <div key={p.id_plan} className={`flex flex-col border-2 border-[#0B0B0D] p-4 ${i === 1 ? "bg-[#F2B705]/15" : "bg-[#F1EDE2]"} text-[#0B0B0D] shadow-[4px_4px_0_0_#0B0B0D]`}>
                      <p className="fl-display text-lg leading-tight">{p.name}</p>
                      <p className="mt-1 fl-display text-3xl leading-none">{money(p.monthly_cents)}<span className="text-sm font-bold text-[#0B0B0D]/60">/{t("perMonthShort", "mês")}</span></p>
                      <p className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-[#0B0B0D]/70">
                        <Zap className="h-3.5 w-3.5" /> {compactTokens(p.token_limit_monthly)} {t("tokensPerMonth", "tokens/mês")}
                      </p>
                      {p.description && <p className="mt-2 text-xs leading-relaxed text-[#0B0B0D]/70">{p.description}</p>}
                      <button type="button" disabled={busyPlan !== null} onClick={() => subscribe(p.id_plan)}
                        className="mt-4 inline-flex items-center justify-center gap-2 border-2 border-[#0B0B0D] bg-[#F2B705] px-3 py-2 text-xs font-black uppercase tracking-wide text-[#0B0B0D] shadow-[3px_3px_0_0_#0B0B0D] transition hover:-translate-y-0.5 disabled:opacity-60">
                        {busyPlan === p.id_plan ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bot className="h-4 w-4" />} {t("subscribeCta", "Assinar")}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </>
        )}

        {/* ── Assinatura ativa ── */}
        {hasLiveSub && (
          <>
            {sub!.status === "past_due" && (
              <p className="mt-4 border-2 border-[#dc2626] bg-[#dc2626]/10 px-3 py-2 text-xs font-bold text-[#dc2626]">
                {t("pastDueBanner", "Pagamento pendente — atualize o cartão para o bot continuar no próximo ciclo.")}
              </p>
            )}

            {activating ? (
              <section className="mt-6 border-2 border-[#0B0B0D] bg-[#F1EDE2] p-6 text-center text-[#0B0B0D] shadow-[5px_5px_0_0_#0B0B0D]">
                <Loader2 className="mx-auto h-8 w-8 animate-spin" />
                <p className="mt-3 fl-display text-xl">{t("activatingTitle", "Ativando seu bot…")}</p>
                <p className="mt-1 text-sm text-[#0B0B0D]/70">
                  {t("activatingText", "Estamos conectando o bot à sua conta e montando a base de conhecimento. Isso leva menos de um minuto.")}
                </p>
              </section>
            ) : (
              <>
                {/* Medidor de tokens */}
                <section className="mt-6 border-2 border-[#0B0B0D] bg-[#F1EDE2] p-5 text-[#0B0B0D] shadow-[5px_5px_0_0_#0B0B0D]">
                  <div className="flex items-center justify-between gap-3">
                    <h2 className="fl-display text-xl">{t("usageTitle", "Uso do ciclo")}</h2>
                    <span className="text-xs font-bold text-[#0B0B0D]/60">
                      {currentPlan ? currentPlan.name : t("planWord", "Plano")} · {money(Number(sub!.monthly_cents))}/{t("perMonthShort", "mês")}
                    </span>
                  </div>
                  {usage ? (
                    <>
                      <div className="mt-3 h-5 w-full overflow-hidden border-2 border-[#0B0B0D] bg-[#0B0B0D]/10">
                        <div className={`h-full transition-all ${limitHit ? "bg-[#dc2626]" : "bg-[#16a34a]"}`} style={{ width: `${usagePct}%` }} />
                      </div>
                      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs font-bold text-[#0B0B0D]/70">
                        <span><Zap className="mr-1 inline h-3.5 w-3.5" />{compactTokens(tokensUsed)} / {compactTokens(tokenLimit)} {t("tokensWord", "tokens")} ({usagePct}%)</span>
                        {sub!.current_period_end && (
                          <span>{t("resetsAt", "Renova em")} {new Date(sub!.current_period_end).toLocaleDateString(locale)}</span>
                        )}
                      </div>
                      {limitHit && (
                        <p className="mt-3 border-2 border-[#dc2626] bg-[#dc2626]/10 px-3 py-2 text-xs font-bold text-[#dc2626]">
                          {t("limitHit", "Cota do ciclo atingida — o bot está pausado até a renovação. Precisa de mais? Cancele e assine um plano maior.")}
                        </p>
                      )}
                    </>
                  ) : (
                    <p className="mt-3 text-sm text-[#0B0B0D]/60">{t("usageUnavailable", "Medidor indisponível no momento — tente recarregar.")}</p>
                  )}
                </section>

                {/* Controles do bot */}
                <section className="mt-6 border-2 border-[#0B0B0D] bg-[#F1EDE2] p-5 text-[#0B0B0D] shadow-[5px_5px_0_0_#0B0B0D]">
                  <h2 className="fl-display text-xl">{t("controlsTitle", "Controles do bot")}</h2>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button type="button" disabled={savingConfig} onClick={() => patchConfig({ paused: !(config.paused === true) })}
                      className={`inline-flex items-center gap-2 border-2 border-[#0B0B0D] px-4 py-2 text-xs font-black uppercase tracking-wide transition disabled:opacity-60 ${config.paused ? "bg-[#dc2626] text-white" : "bg-[#16a34a] text-white"}`}>
                      {config.paused ? <><Play className="h-4 w-4" /> {t("resume", "Retomar bot")}</> : <><Pause className="h-4 w-4" /> {t("pause", "Pausar bot")}</>}
                    </button>
                    <ToggleChip
                      active={config.answer_dm !== false}
                      disabled={savingConfig}
                      icon={<MessageCircle className="h-4 w-4" />}
                      label={t("answerDm", "Responder diretas")}
                      onClick={() => patchConfig({ answer_dm: !(config.answer_dm !== false) })}
                    />
                    <ToggleChip
                      active={config.answer_os !== false}
                      disabled={savingConfig}
                      icon={<ClipboardList className="h-4 w-4" />}
                      label={t("answerOs", "Responder O.S.")}
                      onClick={() => patchConfig({ answer_os: !(config.answer_os !== false) })}
                    />
                    <button type="button" onClick={() => { void load() }} title={t("refresh", "Atualizar")}
                      className="inline-flex items-center gap-2 border-2 border-[#0B0B0D] bg-white px-3 py-2 text-xs font-bold text-[#0B0B0D]">
                      <RefreshCw className="h-4 w-4" />
                    </button>
                  </div>
                  {config.paused === true && (
                    <p className="mt-2 text-xs font-bold text-[#0B0B0D]/60">{t("pausedHint", "Pausado: o bot não responde ninguém até você retomar. A cobrança continua.")}</p>
                  )}

                  <label className="mt-5 block text-[11px] font-bold uppercase tracking-wide text-[#0B0B0D]/60">
                    {t("instructionsLabel", "Instruções extras pro bot (opcional)")}
                  </label>
                  <textarea value={instructions} maxLength={2000} rows={4}
                    onChange={(e) => setInstructions(e.target.value)}
                    placeholder={t("instructionsPlaceholder", "Ex.: sempre ofereça o combo de social media; não prometo entrega em menos de 5 dias úteis…")}
                    className="mt-1 w-full resize-y border-2 border-[#0B0B0D] bg-white px-3 py-2 text-sm outline-none" />
                  <div className="mt-1 flex items-center justify-between">
                    <span className="text-[10px] tabular-nums text-[#0B0B0D]/50">{instructions.length}/2000</span>
                    <button type="button" disabled={savingConfig || instructions === String(config.extra_instructions || "")}
                      onClick={() => patchConfig({ extra_instructions: instructions })}
                      className="inline-flex items-center gap-2 border-2 border-[#0B0B0D] bg-[#F2B705] px-4 py-1.5 text-xs font-black uppercase tracking-wide text-[#0B0B0D] shadow-[2px_2px_0_0_#0B0B0D] disabled:opacity-50">
                      {savingConfig ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} {t("saveInstructions", "Salvar")}
                    </button>
                  </div>
                </section>
              </>
            )}

            {/* Cancelar */}
            <section className="mt-6 flex flex-wrap items-center justify-between gap-3 border-2 border-[#0B0B0D]/20 bg-[#0B0B0D]/[0.03] p-4">
              <p className="text-xs text-muted-foreground">
                {t("changePlanHint", "Quer trocar de plano? Cancele e assine o novo (sem devolução proporcional do mês em curso).")}
              </p>
              <button type="button" disabled={canceling} onClick={cancelSub}
                className="inline-flex items-center gap-2 border-2 border-[#dc2626] px-4 py-2 text-xs font-black uppercase tracking-wide text-[#dc2626] transition hover:bg-[#dc2626]/10 disabled:opacity-60">
                {canceling ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />} {t("cancelCta", "Cancelar Atendimento IA")}
              </button>
            </section>
          </>
        )}
      </div>
    </main>
  )
}

function ToggleChip({ active, disabled, icon, label, onClick }: {
  active: boolean; disabled?: boolean; icon: React.ReactNode; label: string; onClick: () => void
}) {
  return (
    <button type="button" disabled={disabled} onClick={onClick}
      className={`inline-flex items-center gap-2 border-2 border-[#0B0B0D] px-4 py-2 text-xs font-black uppercase tracking-wide transition disabled:opacity-60 ${active ? "bg-[#F2B705] text-[#0B0B0D]" : "bg-white text-[#0B0B0D]/50"}`}>
      {icon} {label} {active ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}
    </button>
  )
}
