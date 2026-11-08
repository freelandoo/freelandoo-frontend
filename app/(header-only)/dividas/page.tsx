"use client"

// A2 (mig 338): o FEED DE BOLETOS do Brasil todo + "meus boletos".
//
// A Freelandoo não recebe nem repassa dinheiro: quem ajuda paga no app do
// próprio banco pela linha digitável, anexa o comprovante e o DONO confirma.
// Postar pede a chave "Preciso pagar dívidas", CPF e 18+ (o servidor confere;
// a tela só explica). Valor e vencimento são lidos da linha pelo servidor.

import { useCallback, useEffect, useState } from "react"
import { Check, ExternalLink, Loader2, Plus, X } from "lucide-react"
import { PageBackLink } from "@/components/tabloide/PageBackLink"
import { useTranslations } from "@/components/i18n/I18nProvider"
import { vitrinesApi, type DebtBill, type DebtMine } from "@/lib/vitrines-api"
import { DebtList } from "@/components/vitrines/vitrine-lists"
import { DebtDisclaimer, useDay, useMoney, VITRINE_CARD } from "@/components/vitrines/debt-bill-card"

type Tab = "feed" | "mine" | "helping"

const BTN = "fl-sharp inline-flex items-center gap-2 border-2 border-[#0B0B0D] px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-[0.1em]"

export default function DividasPage() {
  const t = useTranslations("Vitrines")
  const [tab, setTab] = useState<Tab>("feed")
  const loadFeed = useCallback((offset: number) => vitrinesApi.debtFeed(offset).then((r) => r.bills), [])

  const tabs: [Tab, string][] = [
    ["feed", t("dvTabFeed", "Precisam de ajuda")],
    ["mine", t("dvTabMine", "Meus boletos")],
    ["helping", t("dvTabHelping", "Estou ajudando")],
  ]

  return (
    <main className="fl-sharp mx-auto min-h-[100dvh] max-w-5xl px-4 pb-28 pt-6 text-[#F5F1E8]">
      <PageBackLink href="/feed" />
      <h1 className="fl-display mt-4 text-3xl md:text-4xl">{t("dvTitle", "Ajuda com boletos")}</h1>
      <p className="mt-1 max-w-2xl text-sm text-[#9A938A]">
        {t("dvSubtitle", "Pessoas de todo o Brasil pedindo ajuda para pagar uma conta. Quem ajuda paga direto no app do próprio banco.")}
      </p>
      <nav className="mt-6 flex flex-wrap gap-2">
        {tabs.map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`${BTN} ${tab === id ? "bg-[#F2B705] text-[#0B0B0D]" : "bg-[#1D1810] text-[#F5F1E8]"}`}
          >
            {label}
          </button>
        ))}
      </nav>
      <div className="mt-6">
        {tab === "feed" ? <DebtList load={loadFeed} /> : <MinePanel which={tab} />}
      </div>
    </main>
  )
}

function statusLabel(t: ReturnType<typeof useTranslations>, b: DebtBill) {
  if (b.expired && (b.status === "open" || b.status === "review")) return t("dvStExpired", "Venceu")
  switch (b.status) {
    case "review":
      return t("dvStReview", "Em revisão")
    case "open":
      return b.reserved ? t("dvStReserved", "Alguém está pagando") : t("dvStOpen", "No feed")
    case "claimed":
      return t("dvStClaimed", "Comprovante para conferir")
    case "paid":
      return t("dvStPaid", "Pago")
    case "canceled":
      return t("dvStCanceled", "Retirado por você")
    case "removed":
      return t("dvStRemoved", "Retirado pela moderação")
    default:
      return ""
  }
}

function MinePanel({ which }: { which: "mine" | "helping" }) {
  const t = useTranslations("Vitrines")
  const money = useMoney()
  const day = useDay()
  const [data, setData] = useState<DebtMine | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const [form, setForm] = useState(false)

  const reload = useCallback(() => {
    vitrinesApi
      .debtMine()
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e.message : String(e)))
  }, [])
  useEffect(reload, [reload])

  const act = async (key: string, fn: () => Promise<unknown>, done?: string) => {
    setBusy(key)
    setMsg(null)
    try {
      await fn()
      if (done) setMsg(done)
      reload()
    } catch (e) {
      setMsg(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(null)
    }
  }

  const openProof = (id: number) =>
    act(`proof-${id}`, async () => {
      const r = await vitrinesApi.debtProofUrl(id)
      window.open(r.url, "_blank", "noopener")
    })

  if (error) return <p className="text-sm text-[#F2B705]">{error}</p>
  if (!data) return <Loader2 className="mx-auto h-5 w-5 animate-spin text-[#9A938A]" />

  if (which === "helping") {
    return (
      <section className="space-y-3">
        <p className="text-sm text-[#9A938A]">
          {t("dvHelpedCount", "Você já ajudou {n} pessoa(s).").replace("{n}", String(data.helped))}
        </p>
        {data.helping.length === 0 && <p className={`${VITRINE_CARD} text-sm text-[#9A938A]`}>{t("dvHelpingEmpty", "Nenhum boleto reservado ou esperando confirmação.")}</p>}
        {data.helping.map((b) => (
          <article key={b.id_bill} className={VITRINE_CARD}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-bold">{b.beneficiary}</p>
                <p className="text-xs text-[#9A938A]">{t("dbDue", "Vence em {d}").replace("{d}", day(b.due_date))}</p>
              </div>
              <p className="font-black tabular-nums text-[#F2B705]">{money(b.amount_cents)}</p>
            </div>
            <p className="mt-2 text-[11px] font-bold uppercase tracking-[0.1em] text-[#9A938A]">
              {b.status === "claimed" ? t("dvWaitOwner", "Comprovante enviado: esperando o dono confirmar") : t("dvReservedYou", "Reservado para você")}
            </p>
            {b.status === "open" && b.line && <code className="mt-2 block break-all text-[11px] text-[#F5F1E8]">{b.line}</code>}
          </article>
        ))}
      </section>
    )
  }

  const s = data.settings
  return (
    <section className="space-y-4">
      <DebtDisclaimer />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-[#9A938A]">
          {t("dvLimits", "Até {n} boletos abertos, de até {v} cada. Antes de ir para o feed, a moderação confere o beneficiário.")
            .replace("{n}", String(s.max_open))
            .replace("{v}", money(s.max_amount_cents))}
        </p>
        {!form && (
          <button type="button" onClick={() => setForm(true)} className={`${BTN} bg-[#F2B705] text-[#0B0B0D]`}>
            <Plus className="h-3.5 w-3.5" /> {t("dvNew", "Postar boleto")}
          </button>
        )}
      </div>
      {form && <NewBillForm onDone={() => { setForm(false); setMsg(t("dvPosted", "Boleto enviado. Ele entra no feed depois da revisão.")); reload() }} onCancel={() => setForm(false)} />}
      {msg && <p className="text-xs text-[#F2B705]">{msg}</p>}
      {data.bills.length === 0 && <p className={`${VITRINE_CARD} text-sm text-[#9A938A]`}>{t("dvMineEmpty", "Você ainda não postou boletos.")}</p>}
      <div className="grid gap-3 sm:grid-cols-2">
        {data.bills.map((b) => (
          <article key={b.id_bill} className={VITRINE_CARD}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-bold">{b.beneficiary}</p>
                <p className="text-xs text-[#9A938A]">{t("dbDue", "Vence em {d}").replace("{d}", day(b.due_date))}</p>
              </div>
              <p className="font-black tabular-nums text-[#F2B705]">{money(b.amount_cents)}</p>
            </div>
            <p className="mt-2 text-[11px] font-bold uppercase tracking-[0.1em] text-[#9A938A]">{statusLabel(t, b)}</p>
            {b.status === "removed" && b.removed_reason && <p className="mt-1 text-xs text-[#C9A227]">{b.removed_reason}</p>}
            <div className="mt-3 flex flex-wrap gap-2">
              {b.status === "claimed" && (
                <>
                  <button type="button" disabled={!!busy} onClick={() => openProof(b.id_bill)} className={`${BTN} bg-[#1D1810] text-[#F5F1E8]`}>
                    <ExternalLink className="h-3.5 w-3.5" /> {t("dvSeeProof", "Ver comprovante")}
                  </button>
                  <button
                    type="button"
                    disabled={!!busy}
                    onClick={() => act(`ok-${b.id_bill}`, () => vitrinesApi.debtConfirm(b.id_bill), t("dvConfirmed", "Confirmado. Obrigado por avisar quem ajudou!"))}
                    className={`${BTN} bg-[#7BD88F] text-[#0B0B0D]`}
                  >
                    <Check className="h-3.5 w-3.5" /> {t("dvConfirm", "Foi pago no meu banco")}
                  </button>
                  <button
                    type="button"
                    disabled={!!busy}
                    onClick={() => act(`no-${b.id_bill}`, () => vitrinesApi.debtRejectProof(b.id_bill), t("dvRejected", "Comprovante recusado. O boleto volta para o feed."))}
                    className={`${BTN} bg-[#1D1810] text-[#F5F1E8]`}
                  >
                    <X className="h-3.5 w-3.5" /> {t("dvReject", "Não caiu")}
                  </button>
                </>
              )}
              {(b.status === "review" || b.status === "open") && (
                <button
                  type="button"
                  disabled={!!busy}
                  onClick={() => act(`c-${b.id_bill}`, () => vitrinesApi.debtCancel(b.id_bill))}
                  className={`${BTN} bg-[#1D1810] text-[#F5F1E8]`}
                >
                  {t("dvCancel", "Retirar")}
                </button>
              )}
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}

function NewBillForm({ onDone, onCancel }: { onDone: () => void; onCancel: () => void }) {
  const t = useTranslations("Vitrines")
  const [line, setLine] = useState("")
  const [beneficiary, setBeneficiary] = useState("")
  const [due, setDue] = useState("")
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const digits = line.replace(/\D/g, "")
  // Conta de consumo (água, luz…) começa com 8 e não traz o vencimento na linha.
  const utility = digits.startsWith("8")

  const submit = async () => {
    setBusy(true)
    setErr(null)
    try {
      await vitrinesApi.debtCreate({ line: digits, beneficiary: beneficiary.trim(), due_date: utility ? due : undefined })
      onDone()
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  const input = "fl-sharp w-full border-2 border-[#0B0B0D] bg-[#0B0B0D] px-2 py-2 text-sm text-[#F5F1E8]"
  return (
    <div className={`${VITRINE_CARD} space-y-3`}>
      <label className="block text-xs font-bold text-[#C9C2B6]">
        {t("dvLine", "Linha digitável (os números do boleto)")}
        <input value={line} onChange={(e) => setLine(e.target.value)} inputMode="numeric" className={`${input} mt-1`} placeholder="00190.00009 01234.567890 …" />
      </label>
      <label className="block text-xs font-bold text-[#C9C2B6]">
        {t("dvBeneficiary", "Beneficiário (quem recebe, como está no boleto)")}
        <input value={beneficiary} onChange={(e) => setBeneficiary(e.target.value)} maxLength={120} className={`${input} mt-1`} />
      </label>
      {utility && (
        <label className="block text-xs font-bold text-[#C9C2B6]">
          {t("dvDueDate", "Vencimento (contas de consumo não trazem na linha)")}
          <input type="date" value={due} onChange={(e) => setDue(e.target.value)} className={`${input} mt-1`} />
        </label>
      )}
      <p className="text-[11px] text-[#9A938A]">
        {t("dvPrivacy", "Valor e vencimento são lidos da linha. Seu nome, CPF e endereço nunca aparecem, e a imagem do boleto não é publicada.")}
      </p>
      {err && <p className="text-xs text-[#F2B705]">{err}</p>}
      <div className="flex gap-2">
        <button
          type="button"
          disabled={busy || digits.length < 47 || beneficiary.trim().length < 3 || (utility && !due)}
          onClick={submit}
          className={`${BTN} bg-[#F2B705] text-[#0B0B0D] disabled:opacity-50`}
        >
          {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          {t("dvSubmit", "Enviar para revisão")}
        </button>
        <button type="button" onClick={onCancel} className={`${BTN} bg-[#1D1810] text-[#F5F1E8]`}>
          {t("dvCancelForm", "Cancelar")}
        </button>
      </div>
    </div>
  )
}
