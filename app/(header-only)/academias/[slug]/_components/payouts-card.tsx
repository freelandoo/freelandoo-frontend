"use client"

// RECEBIMENTOS E REPASSES da academia (mig 310 do backend) — só o dono.
//
// O aluno paga a mensalidade pela Freelandoo (Mercado Pago dela); a Freelandoo
// fica com a tarifa real do Mercado Pago + R$ 2,50 e repassa o resto por PIX
// para a chave cadastrada aqui (pode ser uma chave do Asaas). O "Pagar" só
// aparece para os alunos quando há chave E a API da academia sabe dar baixa.
//
// A chave e o documento voltam SEMPRE mascarados (o back guarda selado); o
// titular tem que ser o CPF da conta do dono ou o CNPJ da academia.

import { useCallback, useEffect, useMemo, useState } from "react"
import { toast } from "sonner"
import { motion } from "framer-motion"
import { Banknote, CheckCircle2, Loader2, Pencil, Wallet, XCircle } from "lucide-react"
import { getToken } from "@/lib/auth"
import { useLocale, useTranslations } from "@/components/i18n/I18nProvider"
import { BTN_DARK, BTN_GOLD, H_SECTION, PANEL } from "./academy-ui"
import { INPUT } from "@/app/(header-only)/esportes/_components/fitness-ui"
import { SP, TX } from "@/app/(header-only)/esportes/_components/ui/sp-tokens"
import { CountUp, Reveal } from "@/app/(header-only)/esportes/_components/ui/motion-kit"

type Account = {
  pix_key_type: string
  pix_key_hint: string
  holder_name: string
  holder_doc_type: "cpf" | "cnpj"
  holder_doc_hint: string
  updated_at: string
}

type Payout = {
  id_payout: string
  charge_cents: number
  platform_fee_cents: number
  processor_fee_cents: number
  net_cents: number
  status: "aguardando" | "aprovado" | "pago" | "revertido" | "devido"
  available_at: string
  paid_out_at: string | null
  created_at: string
  member_name: string | null
  due_date: string | null
}

type Summary = { aguardando_cents: number; aprovado_cents: number; pago_cents: number; devido_cents: number }

const PIX_TYPES: [string, string, string][] = [
  ["cpf", "pixTypeCpf", "CPF"],
  ["cnpj", "pixTypeCnpj", "CNPJ"],
  ["email", "pixTypeEmail", "E-mail"],
  ["phone", "pixTypePhone", "Celular"],
  ["random", "pixTypeRandom", "Chave aleatória"],
]

const STATUS: Record<Payout["status"], [string, string, string]> = {
  aguardando: ["payoutWaiting", "Aguardando", SP.warn],
  aprovado: ["payoutReleased", "Liberado", SP.water],
  pago: ["payoutPaid", "Pago", SP.ok],
  revertido: ["payoutReverted", "Revertido", "#C9BFB3"],
  devido: ["payoutOwed", "Devido", SP.bad],
}

function headers(json = false): Record<string, string> {
  const token = getToken()
  const h: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {}
  if (json) h["Content-Type"] = "application/json"
  return h
}

export function PayoutsCard({ academyId }: { academyId: string }) {
  const t = useTranslations("Academies")
  const locale = useLocale()
  const money = useCallback(
    (c: number) => (c / 100).toLocaleString(locale, { style: "currency", currency: "BRL" }),
    [locale]
  )
  const [info, setInfo] = useState<{
    account: Account | null
    pay_callback: boolean
    platform_fee_cents: number
    holdback_days: number
  } | null>(null)
  const [editing, setEditing] = useState(false)
  const [payouts, setPayouts] = useState<Payout[] | null>(null)
  const [summary, setSummary] = useState<Summary | null>(null)

  const load = useCallback(() => {
    fetch(`/api/academies/${academyId}/payout-account`, { headers: headers(), cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setInfo(d))
      .catch(() => {})
    fetch(`/api/academies/${academyId}/payouts`, { headers: headers(), cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!d) return
        setPayouts(Array.isArray(d.payouts) ? d.payouts : [])
        setSummary(d.summary || null)
      })
      .catch(() => setPayouts([]))
  }, [academyId])

  useEffect(() => {
    load()
  }, [load])

  const fmt = useMemo(() => (n: number) => money(n), [money])
  const ready = !!info?.account && !!info?.pay_callback

  return (
    <section className={`${PANEL} mt-4 p-4`} style={{ boxShadow: `6px 6px 0 0 ${SP.room.academy}` }}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className={H_SECTION}>
          <Wallet className="h-4 w-4 text-[#FB923C]" />
          {t("payoutsTitle", "Recebimentos pela Freelandoo")}
        </h2>
        {info && (
          <span
            className="inline-flex items-center gap-1 border-2 border-[#0B0B0D] px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-[0.1em] text-[#0B0B0D]"
            style={{ background: ready ? SP.ok : SP.warn }}
          >
            {ready ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
            {ready ? t("payoutsOn", "Alunos já podem pagar") : t("payoutsOff", "Pagamento desligado")}
          </span>
        )}
      </div>
      <p className="mt-2 text-xs text-[#9A938A]">
        {t(
          "payoutsExplain",
          "Seus alunos pagam a mensalidade pelo app. A Freelandoo fica com a tarifa do Mercado Pago + {fee} por pagamento e manda o resto por PIX para a chave abaixo, {days} dias depois do pagamento."
        )
          .replace("{fee}", money(info?.platform_fee_cents ?? 250))
          .replace("{days}", String(info?.holdback_days ?? 8))}
      </p>
      {info && !info.pay_callback && (
        <p className="mt-2 border-2 border-dashed border-[#9A938A]/60 px-3 py-2 text-[11px] text-[#9A938A]">
          {t(
            "payoutsNoCallback",
            "O software da sua academia ainda não avisa a Freelandoo das baixas (capabilities). Enquanto isso, o botão Pagar não aparece para os alunos."
          )}
        </p>
      )}

      {/* ── a chave ── */}
      {info === null ? (
        <div className="mt-4 flex justify-center py-4">
          <Loader2 className="h-5 w-5 animate-spin text-[#9A938A]" />
        </div>
      ) : info.account && !editing ? (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-2 border-[#0B0B0D] px-3 py-3" style={{ background: SP.inner }}>
          <div className="min-w-0">
            <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#9A938A]">
              {t("payoutsKey", "Chave PIX")} · {labelOf(info.account.pix_key_type, t)}
            </p>
            <p className="fl-display mt-1 text-2xl leading-none text-[#FFF1E6]">•••• {info.account.pix_key_hint}</p>
            <p className="mt-1 font-mono text-[11px] text-[#9A938A]">
              {info.account.holder_name} · {info.account.holder_doc_type.toUpperCase()} •••{info.account.holder_doc_hint}
            </p>
          </div>
          <button type="button" onClick={() => setEditing(true)} className={`${BTN_DARK} px-3 py-2 text-[11px]`}>
            <Pencil className="h-3.5 w-3.5" /> {t("payoutsChange", "Trocar chave")}
          </button>
        </div>
      ) : (
        <AccountForm
          academyId={academyId}
          canCancel={!!info.account}
          onCancel={() => setEditing(false)}
          onSaved={(acc) => {
            setInfo((i) => (i ? { ...i, account: acc } : i))
            setEditing(false)
          }}
        />
      )}

      {/* ── repasses ── */}
      {summary && (
        <Reveal className="mt-5 grid grid-cols-2 gap-2 md:grid-cols-4" step={0.05}>
          {(
            [
              ["aguardando_cents", "payoutWaiting", "Aguardando", SP.warn],
              ["aprovado_cents", "payoutReleased", "Liberado", SP.water],
              ["pago_cents", "payoutPaid", "Pago", SP.ok],
              ["devido_cents", "payoutOwed", "Devido", SP.bad],
            ] as const
          ).map(([k, key, fb, color]) => (
            <div key={k} className="border-2 border-[#0B0B0D] px-3 py-2" style={{ background: SP.panel, boxShadow: `3px 3px 0 0 ${color}` }}>
              <p className="text-[10px] font-extrabold uppercase tracking-[0.14em]" style={{ color }}>
                {t(key, fb)}
              </p>
              <CountUp value={Number(summary[k]) || 0} format={fmt} className="fl-display mt-1 text-xl leading-none text-[#FFF1E6]" />
            </div>
          ))}
        </Reveal>
      )}

      <h3 className="mt-5 flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-[0.16em] text-[#F5F1E8]">
        <Banknote className="h-4 w-4 text-[#FB923C]" />
        {t("payoutsList", "Repasses")}
      </h3>
      {payouts === null ? (
        <div className="mt-3 h-16 border-2 border-dashed border-[#9A938A]/40" />
      ) : payouts.length === 0 ? (
        <p className="mt-2 text-xs text-[#9A938A]">{t("payoutsEmpty", "Nenhuma mensalidade paga pela Freelandoo ainda.")}</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {payouts.map((p, i) => {
            const st = STATUS[p.status] || STATUS.aguardando
            return (
              <motion.li
                key={p.id_payout}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.28, delay: Math.min(i, 5) * 0.035 }}
                className="relative border-2 border-[#1A0A05] px-3 py-2.5"
                style={{ background: SP.paper, color: SP.paperInk, backgroundImage: TX.paperGrain }}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-extrabold uppercase">{p.member_name || t("payoutsStudent", "Aluno")}</p>
                    <p className="font-mono text-[11px]" style={{ color: SP.paperMute }}>
                      {t("payoutsPaidOn", "pago em {d}").replace("{d}", new Date(p.created_at).toLocaleDateString(locale))}
                      {p.status === "aguardando" &&
                        ` · ${t("payoutsAvailableOn", "liberado em {d}").replace("{d}", new Date(p.available_at).toLocaleDateString(locale))}`}
                      {p.paid_out_at && ` · ${t("payoutsSentOn", "PIX em {d}").replace("{d}", new Date(p.paid_out_at).toLocaleDateString(locale))}`}
                    </p>
                  </div>
                  <span className="border-2 border-[#0B0B0D] px-1.5 py-0.5 text-[10px] font-extrabold uppercase text-[#0B0B0D]" style={{ background: st[2] }}>
                    {t(st[0], st[1])}
                  </span>
                </div>
                {/* a conta do recibo: bruto − tarifa − taxa = líquido */}
                <div className="mt-2 grid grid-cols-[1fr_auto] gap-x-4 border-t border-dashed border-[#1A0A05]/40 pt-2 font-mono text-[11px]">
                  <span>{t("payoutsGross", "Mensalidade")}</span>
                  <span className="text-right">{money(p.charge_cents)}</span>
                  <span style={{ color: SP.paperMute }}>− {t("payoutsMpFee", "Tarifa Mercado Pago")}</span>
                  <span className="text-right" style={{ color: SP.paperMute }}>
                    {money(p.processor_fee_cents)}
                  </span>
                  <span style={{ color: SP.paperMute }}>− {t("payoutsFlFee", "Taxa Freelandoo")}</span>
                  <span className="text-right" style={{ color: SP.paperMute }}>
                    {money(p.platform_fee_cents)}
                  </span>
                  <span className="fl-display text-base">{t("payoutsNet", "Você recebe")}</span>
                  <span className="fl-display text-right text-base">{money(p.net_cents)}</span>
                </div>
              </motion.li>
            )
          })}
        </ul>
      )}
    </section>
  )
}

function labelOf(type: string, t: (k: string, fb: string) => string) {
  const row = PIX_TYPES.find((p) => p[0] === type)
  return row ? t(row[1], row[2]) : type
}

function AccountForm({
  academyId,
  canCancel,
  onCancel,
  onSaved,
}: {
  academyId: string
  canCancel: boolean
  onCancel: () => void
  onSaved: (acc: Account) => void
}) {
  const t = useTranslations("Academies")
  const [type, setType] = useState("cnpj")
  const [key, setKey] = useState("")
  const [holder, setHolder] = useState("")
  const [doc, setDoc] = useState("")
  const [saving, setSaving] = useState(false)

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await fetch(`/api/academies/${academyId}/payout-account`, {
        method: "PUT",
        headers: headers(true),
        body: JSON.stringify({ pix_key_type: type, pix_key: key, holder_name: holder, holder_doc: doc }),
      })
      const d = await res.json().catch(() => ({}))
      if (!res.ok || !d.account) throw new Error(d.error || "")
      toast.success(t("payoutsSaved", "Chave PIX salva"))
      onSaved(d.account)
    } catch (err) {
      toast.error(err instanceof Error && err.message ? err.message : t("payoutsSaveError", "Não deu para salvar a chave"))
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={save} className="mt-4 grid gap-3 border-2 border-[#0B0B0D] p-3 md:grid-cols-2" style={{ background: SP.inner }}>
      <label className="block md:col-span-2">
        <span className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#9A938A]">{t("payoutsKeyType", "Tipo de chave")}</span>
        <div className="mt-1 flex flex-wrap gap-1">
          {PIX_TYPES.map(([v, k, fb]) => (
            <button
              key={v}
              type="button"
              onClick={() => setType(v)}
              className="border-2 border-[#0B0B0D] px-2.5 py-1 text-[11px] font-extrabold uppercase"
              style={{ background: type === v ? SP.ember : SP.panel, color: type === v ? "#0B0B0D" : SP.ink }}
            >
              {t(k, fb)}
            </button>
          ))}
        </div>
      </label>
      <label className="block md:col-span-2">
        <span className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#9A938A]">{t("payoutsKey", "Chave PIX")}</span>
        <input className={`${INPUT} mt-1`} value={key} onChange={(e) => setKey(e.target.value)} required autoComplete="off" />
      </label>
      <label className="block">
        <span className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#9A938A]">{t("payoutsHolder", "Nome do titular")}</span>
        <input className={`${INPUT} mt-1`} value={holder} onChange={(e) => setHolder(e.target.value)} required />
      </label>
      <label className="block">
        <span className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#9A938A]">{t("payoutsDoc", "CPF ou CNPJ do titular")}</span>
        <input className={`${INPUT} mt-1`} value={doc} onChange={(e) => setDoc(e.target.value)} required inputMode="numeric" />
      </label>
      <p className="text-[11px] text-[#9A938A] md:col-span-2">
        {t("payoutsDocRule", "O titular precisa ser você (o CPF da sua conta) ou a academia (CNPJ).")}
      </p>
      <div className="flex gap-2 md:col-span-2">
        <button type="submit" disabled={saving} className={`${BTN_GOLD} px-4 py-2 text-xs`}>
          {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          {t("payoutsSave", "Salvar chave")}
        </button>
        {canCancel && (
          <button type="button" onClick={onCancel} className={`${BTN_DARK} px-4 py-2 text-xs`}>
            {t("cancel", "Cancelar")}
          </button>
        )}
      </div>
    </form>
  )
}
