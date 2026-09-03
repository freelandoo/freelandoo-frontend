"use client"

// Painel do Afiliado dentro da Carteira.
//
// Veio inteiro do extinto /account/afiliado ("Meus Faturamentos"), que foi
// apagado: o extrato de lá já era o MESMO `/api/me/earnings` da Carteira, e o
// que só existia lá era isto — vínculo de afiliado, indicados, regra vigente e
// dados de recebimento. Sem trazer estas quatro coisas, apagar aquela página
// teria feito o afiliado perder o cadastro do PIX e a lista de indicados.
//
// O visual é o da Carteira (papel creme, borda preta, sombra dura, acento
// verde-teal) e não o dark/shadcn da página antiga: dois estilos na mesma
// página leriam como duas telas coladas.

import { useCallback, useEffect, useState } from "react"
import { Loader2, Percent, Info } from "lucide-react"
import { useActionConsent } from "@/hooks/use-action-consent"
import { useLocale, useTranslations } from "@/components/i18n/I18nProvider"

const GREEN = "#16B79A"
const GREEN_DEEP = "#00876B"

type Affiliate = {
  id_affiliate: string
  status: "ACTIVE" | "PAUSED" | "BLOCKED"
  pix_key: string | null
  pix_key_type: string | null
  legal_name: string | null
  tax_id: string | null
}

type DefaultRule = {
  commission_percent: number
  commission_base: "GROSS" | "NET_OF_DISCOUNT"
  min_order_cents: number
  max_commission_cents: number | null
  approval_delay_days: number
}

type ReferralRow = {
  id_referral: string
  username: string | null
  display_name: string | null
  bound_at: string
  earned_cents: number
}

const PIX_TYPES = [
  { value: "CPF", labelKey: "pixTypeCpf", label: "CPF" },
  { value: "EMAIL", labelKey: "pixTypeEmail", label: "E-mail" },
  { value: "PHONE", labelKey: "pixTypePhone", label: "Telefone" },
  { value: "RANDOM", labelKey: "pixTypeRandom", label: "Chave aleatória" },
]

function brl(cents: number, locale: string) {
  return ((Number(cents) || 0) / 100).toLocaleString(locale, { style: "currency", currency: "BRL" })
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-2 border-[#0B0B0D] bg-[#F1EDE2] p-4 shadow-[5px_5px_0_0_#0B0B0D] sm:p-5">
      <h3 className="fl-display mb-4 text-2xl text-[#0B0B0D]">{title}</h3>
      {children}
    </div>
  )
}

function Field({
  id,
  label,
  children,
  hint,
}: {
  id: string
  label: string
  children: React.ReactNode
  hint?: string
}) {
  return (
    <div>
      <label
        htmlFor={id}
        className="mb-1.5 block text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#6B6457]"
      >
        {label}
      </label>
      {children}
      {hint && <p className="mt-1.5 text-[11px] text-[#6B6457]">{hint}</p>}
    </div>
  )
}

const inputCls =
  "h-11 w-full border-2 border-[#0B0B0D]/25 bg-transparent px-3 text-sm font-semibold text-[#0B0B0D] outline-none transition focus:border-[#16B79A]"

export function AfiliadoPanel() {
  const tr = useTranslations("Wallet")
  const locale = useLocale()
  const { ensureConsent } = useActionConsent()

  const [affiliate, setAffiliate] = useState<Affiliate | null>(null)
  const [rule, setRule] = useState<DefaultRule | null>(null)
  const [referrals, setReferrals] = useState<ReferralRow[]>([])
  const [referralTotal, setReferralTotal] = useState(0)
  const [recurring30d, setRecurring30d] = useState(0)
  const [loading, setLoading] = useState(true)

  const [pixForm, setPixForm] = useState({ pix_key: "", pix_key_type: "", legal_name: "", tax_id: "" })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const token = () => (typeof window !== "undefined" ? localStorage.getItem("token") : null)

  const loadAffiliate = useCallback(async () => {
    const t = token()
    if (!t) {
      setLoading(false)
      return
    }
    try {
      const res = await fetch("/api/me/affiliate", { headers: { Authorization: `Bearer ${t}` } })
      if (!res.ok) return
      const data = await res.json()
      setAffiliate(data.affiliate || null)
      setRule(data.default_rule || null)
      if (data.affiliate) {
        setPixForm({
          pix_key: data.affiliate.pix_key || "",
          pix_key_type: data.affiliate.pix_key_type || "",
          legal_name: data.affiliate.legal_name || "",
          tax_id: data.affiliate.tax_id || "",
        })
      }
    } catch {
      /* silencioso: o resto da Carteira continua de pé */
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadAffiliate()
  }, [loadAffiliate])

  useEffect(() => {
    const t = token()
    if (!t) return
    let cancelled = false
    fetch("/api/me/affiliate/referrals", { headers: { Authorization: `Bearer ${t}` } })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (cancelled || !d) return
        setReferrals(Array.isArray(d.items) ? d.items : [])
        setReferralTotal(Number(d.total || 0))
        setRecurring30d(Number(d.totals?.recurring_cents_30d || 0))
      })
      .catch(() => {
        /* silencioso */
      })
    return () => {
      cancelled = true
    }
  }, [])

  const handleSavePix = async () => {
    const t = token()
    if (!t) return
    if (!(await ensureConsent("affiliate"))) return
    setSaving(true)
    setSaved(false)
    setSaveError(null)
    try {
      const res = await fetch("/api/me/affiliate/payout-info", {
        method: "PUT",
        headers: { Authorization: `Bearer ${t}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          pix_key: pixForm.pix_key || null,
          pix_key_type: pixForm.pix_key_type || null,
          legal_name: pixForm.legal_name || null,
          tax_id: pixForm.tax_id || null,
        }),
      })
      if (res.ok) {
        setSaved(true)
        setTimeout(() => setSaved(false), 2500)
        await loadAffiliate()
      } else {
        // O backend recusa destino cujo CPF não é o da conta (gate antifraude
        // da mig 201). Sem mostrar a mensagem, o botão parece quebrado.
        const body = await res.json().catch(() => null)
        setSaveError(body?.error || tr("pixSaveFail", "Não foi possível salvar os dados de recebimento."))
      }
    } catch {
      setSaveError(tr("pixSaveFail", "Não foi possível salvar os dados de recebimento."))
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center border-2 border-dashed border-[#F1EDE2]/20 py-12">
        <Loader2 className="h-5 w-5 animate-spin text-[#C9C2B6]" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4" data-tour="wallet-affiliate">
      {affiliate && (
        <span
          className="inline-flex w-fit items-center gap-1.5 border-2 border-[#0B0B0D] px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#06251F]"
          style={{ background: GREEN }}
        >
          <Percent className="h-3 w-3" />
          {tr("kindAffiliate", "Afiliado")} · {affiliate.status}
        </span>
      )}

      {!affiliate && (
        <div className="flex items-start gap-3 border-2 border-dashed border-[#F1EDE2]/25 bg-[#1D1810] p-4">
          <Info className="mt-0.5 h-4 w-4 shrink-0" style={{ color: GREEN }} />
          <p className="text-[13px] text-[#C9C2B6]">
            {tr(
              "affiliateNotEnrolled",
              "Você ainda não está cadastrado no programa de afiliados. Fale com a equipe Freelandoo para ativar sua afiliação e habilitar pagamentos."
            )}
          </p>
        </div>
      )}

      {/* Meus indicados — o ativo do afiliado no modelo vitalício (mig 193).
          Sem esta lista ele não tem como saber que segue ganhando de quem
          indicou meses atrás. */}
      <Panel title={tr("myReferralsTitle", "Meus indicados")}>
        <p className="mb-4 text-[12px] leading-relaxed text-[#6B6457]">
          {tr(
            "myReferralsDesc",
            "Quem usou seu cupom numa compra da plataforma fica vinculado a você para sempre — toda compra futura dessa pessoa gera comissão."
          )}
        </p>
        {referralTotal === 0 ? (
          <div className="border-2 border-dashed border-[#0B0B0D]/20 p-5 text-center text-[13px] text-[#6B6457]">
            {tr(
              "myReferralsEmpty",
              "Ninguém vinculado ainda. Compartilhe seu cupom: o primeiro que comprar algo da plataforma por ele fica seu para sempre."
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-6">
              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#6B6457]">
                  {tr("myReferralsCount", "Vinculados")}
                </p>
                <p className="fl-display text-2xl" style={{ color: GREEN_DEEP }}>
                  {referralTotal}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#6B6457]">
                  {tr("myReferralsRecurring", "Comissão por vínculo (30 dias)")}
                </p>
                <p className="fl-display text-2xl" style={{ color: GREEN_DEEP }}>
                  {brl(recurring30d, locale)}
                </p>
              </div>
            </div>
            <div className="divide-y-2 divide-[#0B0B0D]/10">
              {referrals.map((r) => (
                <div key={r.id_referral} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-[#0B0B0D]">
                      {r.display_name || r.username || "—"}
                    </p>
                    <p className="truncate text-[11px] text-[#6B6457]">
                      {r.username ? `@${r.username} · ` : ""}
                      {tr("myReferralsSince", "desde {date}").replace(
                        "{date}",
                        new Date(r.bound_at).toLocaleDateString(locale)
                      )}
                    </p>
                  </div>
                  <span
                    className="shrink-0 text-sm font-black tabular-nums"
                    style={{ color: GREEN_DEEP }}
                  >
                    {brl(r.earned_cents, locale)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </Panel>

      {/* Regra vigente */}
      {rule && (
        <Panel title={tr("currentRule", "Regra vigente")}>
          <p className="mb-4 text-[12px] text-[#6B6457]">
            {tr("currentRuleDesc", "Aplicada por padrão aos seus cupons.")}
          </p>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <Cell label={tr("ruleCommission", "Comissão")} value={`${rule.commission_percent}%`} />
            <Cell
              label={tr("ruleBase", "Base")}
              value={
                rule.commission_base === "GROSS"
                  ? tr("ruleBaseGross", "Bruto")
                  : tr("ruleBaseNet", "Líquido do desconto")
              }
            />
            <Cell label={tr("ruleMinOrder", "Pedido mínimo")} value={brl(rule.min_order_cents, locale)} />
            <Cell
              label={tr("ruleReleaseAfter", "Liberação após")}
              value={`${rule.approval_delay_days} ${tr("daysWord", "dias")}`}
            />
          </div>
        </Panel>
      )}

      {/* Dados de recebimento (PIX) */}
      <Panel title={tr("payoutData", "Dados para pagamento")}>
        <p className="mb-4 text-[12px] text-[#6B6457]">
          {tr("payoutDataDesc", "Usaremos estas informações quando gerarmos um lote de pagamento.")}
        </p>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field id="pix-type" label={tr("pixKeyType", "Tipo de chave PIX")}>
            <select
              id="pix-type"
              value={pixForm.pix_key_type}
              onChange={(e) => setPixForm((p) => ({ ...p, pix_key_type: e.target.value }))}
              className={inputCls}
            >
              <option value="">{tr("select", "Selecione")}</option>
              {PIX_TYPES.map((o) => (
                <option key={o.value} value={o.value}>
                  {tr(o.labelKey, o.label)}
                </option>
              ))}
            </select>
          </Field>
          <Field id="pix-key" label={tr("pixKey", "Chave PIX")}>
            <input
              id="pix-key"
              className={inputCls}
              placeholder={tr("pixKeyPlaceholder", "Sua chave")}
              value={pixForm.pix_key}
              onChange={(e) => setPixForm((p) => ({ ...p, pix_key: e.target.value }))}
            />
          </Field>
          <Field id="legal-name" label={tr("legalName", "Nome / Razão social")}>
            <input
              id="legal-name"
              className={inputCls}
              value={pixForm.legal_name}
              onChange={(e) => setPixForm((p) => ({ ...p, legal_name: e.target.value }))}
            />
          </Field>
          <Field
            id="tax-id"
            label={tr("taxId", "CPF / CNPJ")}
            hint={tr(
              "payoutOwnershipHint",
              "O CPF do recebedor precisa ser o mesmo CPF cadastrado na sua conta."
            )}
          >
            <input
              id="tax-id"
              className={inputCls}
              value={pixForm.tax_id}
              onChange={(e) => setPixForm((p) => ({ ...p, tax_id: e.target.value }))}
            />
          </Field>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleSavePix}
            disabled={saving || !affiliate}
            className="inline-flex items-center gap-2 border-2 border-[#0B0B0D] px-5 py-2.5 text-[11px] font-extrabold uppercase tracking-[0.12em] text-[#0B0B0D] shadow-[3px_3px_0_0_#0B0B0D] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
            style={{ background: GREEN }}
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {saving ? tr("saving", "Salvando...") : tr("save", "Salvar")}
          </button>
          {saved && (
            <span className="text-[12px] font-bold" style={{ color: GREEN_DEEP }}>
              {tr("dataSaved", "Dados salvos.")}
            </span>
          )}
          {!affiliate && (
            <span className="text-[12px] text-[#6B6457]">
              {tr("availableAfterActivation", "Disponível após ativação.")}
            </span>
          )}
        </div>
        {saveError && (
          <p className="mt-3 border-2 border-[#9A3412] bg-[#9A3412]/10 px-3 py-2 text-[12px] font-semibold text-[#9A3412]">
            {saveError}
          </p>
        )}
      </Panel>
    </div>
  )
}

function Cell({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#6B6457]">{label}</p>
      <p className="mt-1 text-sm font-black text-[#0B0B0D]">{value}</p>
    </div>
  )
}
