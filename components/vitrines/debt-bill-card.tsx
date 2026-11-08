"use client"

// A2 (mig 338): o cartão de um boleto no feed (nacional ou aba Dívidas).
//
// ⚠️ A FREELANDOO NÃO TOCA NO DINHEIRO. "Vou pagar" só RESERVA o boleto por
// alguns minutos e mostra a linha digitável; quem ajuda paga no app do PRÓPRIO
// banco e anexa o comprovante. Quem confirma é o dono (só ele vê o boleto
// baixar). A linha só aparece para quem reservou — no feed ela não é pública.
//
// ⚠️ LGPD: o cartão mostra beneficiário, valor e vencimento. Nada do dono.

import { useRef, useState } from "react"
import { Check, Copy, Flag, Loader2, Receipt, Timer, Upload, X } from "lucide-react"
import { useLocale, useTranslations } from "@/components/i18n/I18nProvider"
import { vitrinesApi, type DebtBill } from "@/lib/vitrines-api"

export const VITRINE_CARD = "fl-sharp border-2 border-[#0B0B0D] bg-[#15120E] p-4"

export function useMoney() {
  const locale = useLocale()
  return (cents: number) => (cents / 100).toLocaleString(locale, { style: "currency", currency: "BRL" })
}

export function useDay() {
  const locale = useLocale()
  // A data do boleto é um DIA (sem hora): ler como meio-dia evita voltar um dia no fuso.
  return (d: string) => new Date(`${String(d).slice(0, 10)}T12:00:00`).toLocaleDateString(locale)
}

export function DebtBillCard({ bill, accent = "#F2B705", onChanged }: { bill: DebtBill; accent?: string; onChanged?: () => void }) {
  const t = useTranslations("Vitrines")
  const money = useMoney()
  const day = useDay()
  const [line, setLine] = useState<string | null>(bill.line ?? null)
  const [until, setUntil] = useState<string | null>(bill.reserved_until ?? null)
  const [busy, setBusy] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [reporting, setReporting] = useState(false)
  const [reason, setReason] = useState("")
  const [sent, setSent] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const reservedByMe = !!line || !!bill.reserved_by_me

  const run = async (key: string, fn: () => Promise<void>) => {
    setBusy(key)
    setMsg(null)
    try {
      await fn()
    } catch (e) {
      setMsg(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(null)
    }
  }

  const reserve = () =>
    run("reserve", async () => {
      const r = await vitrinesApi.debtReserve(bill.id_bill)
      setLine(r.bill.line ?? null)
      setUntil(r.bill.reserved_until ?? null)
    })
  const release = () =>
    run("release", async () => {
      await vitrinesApi.debtRelease(bill.id_bill)
      setLine(null)
      setUntil(null)
      onChanged?.()
    })
  const proof = (file: File) =>
    run("proof", async () => {
      await vitrinesApi.debtProof(bill.id_bill, file)
      setSent(true)
      onChanged?.()
    })
  const report = () =>
    run("report", async () => {
      await vitrinesApi.debtReport(bill.id_bill, reason.trim())
      setReporting(false)
      setReason("")
      setMsg(t("dbReported", "Denúncia enviada. A moderação vai conferir."))
    })

  const copy = async () => {
    if (!line) return
    try {
      await navigator.clipboard.writeText(line.replace(/\D/g, ""))
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      /* sem permissão de área de transferência: a linha está na tela */
    }
  }

  const kind = bill.bill_kind === "utility" ? t("dbKindUtility", "Conta de consumo") : t("dbKindBank", "Boleto bancário")

  return (
    <article className={VITRINE_CARD}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#9A938A]">{kind}</p>
          <p className="mt-1 truncate text-sm font-bold text-[#F5F1E8]" title={bill.beneficiary}>
            {bill.beneficiary}
          </p>
          <p className="mt-1 text-xs text-[#9A938A]">
            {t("dbDue", "Vence em {d}").replace("{d}", day(bill.due_date))}
          </p>
        </div>
        <p className="shrink-0 text-xl font-black tabular-nums" style={{ color: accent }}>
          {money(bill.amount_cents)}
        </p>
      </div>

      {bill.mine ? (
        <p className="mt-3 text-[11px] font-bold uppercase tracking-[0.1em] text-[#9A938A]">{t("dbMine", "Este boleto é seu")}</p>
      ) : sent ? (
        <p className="mt-3 flex items-center gap-2 text-xs font-bold text-[#7BD88F]">
          <Check className="h-4 w-4" /> {t("dbProofSent", "Comprovante enviado. Agora o dono confere no banco dele.")}
        </p>
      ) : reservedByMe && line ? (
        <div className="mt-3 space-y-2">
          <p className="flex items-center gap-1.5 text-[11px] text-[#9A938A]">
            <Timer className="h-3.5 w-3.5" />
            {until
              ? t("dbReservedUntil", "Reservado para você até {h}. Pague no app do seu banco.").replace(
                  "{h}",
                  new Date(until).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                )
              : t("dbReservedNow", "Reservado para você. Pague no app do seu banco.")}
          </p>
          <div className="flex items-stretch gap-2">
            <code className="min-w-0 flex-1 break-all border-2 border-[#0B0B0D] bg-[#0B0B0D] px-2 py-1.5 text-[11px] text-[#F5F1E8]">{line}</code>
            <button type="button" onClick={copy} className="fl-sharp shrink-0 border-2 border-[#0B0B0D] bg-[#1D1810] px-2 text-[#F5F1E8]" aria-label={t("dbCopy", "Copiar linha")}>
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </button>
          </div>
          <p className="text-[11px] text-[#C9A227]">{t("dbCheckBeneficiary", "No app do banco, confira se o beneficiário é o mesmo daqui antes de pagar.")}</p>
          <div className="flex flex-wrap gap-2">
            <input
              ref={fileRef}
              type="file"
              accept="application/pdf,image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) proof(f)
                e.target.value = ""
              }}
            />
            <button
              type="button"
              disabled={!!busy}
              onClick={() => fileRef.current?.click()}
              className="fl-sharp inline-flex items-center gap-2 border-2 border-[#0B0B0D] px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-[0.1em] text-[#0B0B0D]"
              style={{ background: accent }}
            >
              {busy === "proof" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
              {t("dbSendProof", "Já paguei: enviar comprovante")}
            </button>
            <button
              type="button"
              disabled={!!busy}
              onClick={release}
              className="fl-sharp inline-flex items-center gap-2 border-2 border-[#0B0B0D] bg-[#1D1810] px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-[0.1em] text-[#F5F1E8]"
            >
              <X className="h-3.5 w-3.5" /> {t("dbRelease", "Desistir")}
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {bill.reserved ? (
            <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-[#9A938A]">{t("dbTaken", "Alguém está pagando agora")}</span>
          ) : (
            <button
              type="button"
              disabled={!!busy}
              onClick={reserve}
              className="fl-sharp inline-flex items-center gap-2 border-2 border-[#0B0B0D] px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-[0.1em] text-[#0B0B0D]"
              style={{ background: accent }}
            >
              {busy === "reserve" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Receipt className="h-3.5 w-3.5" />}
              {t("dbWillPay", "Vou pagar")}
            </button>
          )}
          <button
            type="button"
            onClick={() => setReporting((v) => !v)}
            className="ml-auto inline-flex items-center gap-1 text-[11px] text-[#9A938A] hover:text-[#F5F1E8]"
          >
            <Flag className="h-3.5 w-3.5" /> {t("dbReport", "Denunciar")}
          </button>
        </div>
      )}

      {reporting && (
        <div className="mt-3 flex gap-2">
          <input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            maxLength={280}
            placeholder={t("dbReportPh", "O que há de errado com este boleto?")}
            className="fl-sharp min-w-0 flex-1 border-2 border-[#0B0B0D] bg-[#0B0B0D] px-2 py-1.5 text-xs text-[#F5F1E8]"
          />
          <button
            type="button"
            disabled={!reason.trim() || !!busy}
            onClick={report}
            className="fl-sharp border-2 border-[#0B0B0D] bg-[#1D1810] px-3 text-[11px] font-extrabold uppercase text-[#F5F1E8] disabled:opacity-50"
          >
            {t("dbSend", "Enviar")}
          </button>
        </div>
      )}
      {msg && <p className="mt-2 text-xs text-[#F2B705]">{msg}</p>}
    </article>
  )
}

/** O aviso fixo do feed (o backend manda o mesmo texto em pt; aqui, traduzido). */
export function DebtDisclaimer() {
  const t = useTranslations("Vitrines")
  return (
    <p className="fl-sharp border-2 border-[#0B0B0D] bg-[#1D1810] p-3 text-[11px] leading-relaxed text-[#C9C2B6]">
      {t(
        "dbDisclaimer",
        "Ajuda voluntária entre pessoas. A Freelandoo não recebe nem repassa dinheiro e não garante que o boleto seja pago ou que a ajuda chegue. Pague só pelo app do seu banco e confira o beneficiário antes."
      )}
    </p>
  )
}
