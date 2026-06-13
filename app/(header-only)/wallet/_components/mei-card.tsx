"use client"

// Camada MEI/Recibo da Carteira (v1): termômetro do teto MEI (R$81k/ano,
// faturamento realizado via Freelandoo), lembrete do DAS, emissão de recibo de
// prestação de serviço (impresso via window.print) e configuração dos dados
// fiscais do prestador. Identidade tabloide verde da Carteira.
//
// O recibo IMPRESSO fica em pt-BR de propósito (documento fiscal brasileiro,
// destinado ao cliente). A UI (card/modais) é i18n no namespace "Mei".

import { useCallback, useEffect, useState } from "react"
import type { ReactNode } from "react"
import { FileText, Loader2, Plus, Settings, X, Receipt, AlertTriangle } from "lucide-react"
import { clientFetchWithTimeout } from "@/lib/fetch-with-timeout"
import { useMeProfile } from "@/hooks/use-me-profile"
import { useLocale, useTranslations } from "@/components/i18n/I18nProvider"
import { cn } from "@/lib/utils"

const GREEN = "#16B79A"
const GREEN_DEEP = "#00876B"
const AMBER = "#F2B705"
const RED = "#C0392B"

type TFn = (key: string, fallback?: string) => string

interface MeiProfile {
  is_mei: boolean
  cnpj: string | null
  provider_name: string | null
  provider_doc: string | null
  provider_address: string | null
  das_reminder: boolean
}
interface Overview {
  year: number
  gross_cents: number
  limit_cents: number
  pct: number
  das_due_day: number
  profile: MeiProfile
}
interface ReceiptRow {
  id_receipt: number
  number: number
  taker_name: string
  taker_doc: string | null
  description: string
  amount_cents: number
  issued_for: string | null
  created_at: string
}

function brl(cents?: number | null, locale = "pt-BR") {
  return ((Number(cents) || 0) / 100).toLocaleString(locale, { style: "currency", currency: "BRL" })
}
function token() {
  return typeof window !== "undefined" ? localStorage.getItem("token") : null
}
function esc(s: string) {
  return String(s ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] || c),
  )
}

/* Recibo impresso (pt-BR) — abre uma janela e dispara a impressão. */
function printReceipt(r: ReceiptRow, profile: MeiProfile, fallbackName: string) {
  const amount = brl(r.amount_cents, "pt-BR")
  const dateRaw = r.issued_for || r.created_at
  const date = new Date(dateRaw.length <= 10 ? dateRaw + "T12:00:00" : dateRaw).toLocaleDateString("pt-BR", {
    day: "2-digit", month: "long", year: "numeric",
  })
  const nome = profile.provider_name || fallbackName || "—"
  const doc = profile.cnpj ? `CNPJ ${profile.cnpj}` : profile.provider_doc ? `CPF ${profile.provider_doc}` : ""
  const taker = r.taker_doc ? `${r.taker_name} (${r.taker_doc})` : r.taker_name

  const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">
<title>Recibo Nº ${r.number}</title>
<style>
  *{box-sizing:border-box} body{font-family:Georgia,'Times New Roman',serif;color:#0B0B0D;margin:0;padding:48px;background:#fff}
  .sheet{max-width:680px;margin:0 auto;border:2px solid #0B0B0D;padding:40px}
  .top{display:flex;justify-content:space-between;align-items:flex-end;border-bottom:2px solid #0B0B0D;padding-bottom:16px;margin-bottom:28px}
  h1{font-size:34px;letter-spacing:.18em;margin:0;text-transform:uppercase}
  .meta{text-align:right;font-size:13px;line-height:1.5}
  .amount{font-size:22px;font-weight:bold;border:2px solid #0B0B0D;display:inline-block;padding:6px 14px;margin:8px 0 24px}
  p{font-size:15px;line-height:1.8;margin:0 0 16px}
  .sign{margin-top:64px;text-align:center}
  .line{border-top:1px solid #0B0B0D;width:300px;margin:0 auto 6px}
  .muted{color:#555;font-size:12px}
  @media print{body{padding:0}.sheet{border:none}}
</style></head><body>
  <div class="sheet">
    <div class="top">
      <h1>Recibo</h1>
      <div class="meta"><strong>Nº ${esc(String(r.number))}</strong><br>${esc(date)}</div>
    </div>
    <div class="amount">${esc(amount)}</div>
    <p>Recebi de <strong>${esc(taker)}</strong> a importância de <strong>${esc(amount)}</strong>,
       referente a <strong>${esc(r.description)}</strong>.</p>
    <p>Para clareza firmo o presente recibo.</p>
    <div class="sign">
      <div class="line"></div>
      <div><strong>${esc(nome)}</strong></div>
      ${doc ? `<div class="muted">${esc(doc)}</div>` : ""}
      ${profile.provider_address ? `<div class="muted">${esc(profile.provider_address)}</div>` : ""}
    </div>
  </div>
  <script>window.onload=function(){window.print()}</script>
</body></html>`

  const w = window.open("", "_blank", "width=820,height=940")
  if (!w) return
  w.document.write(html)
  w.document.close()
}

/* ═══════════════════════════════════════════════════════════════════════════ */
export function MeiCard() {
  const t = useTranslations("Mei")
  const locale = useLocale()
  const { perfil } = useMeProfile()
  const fallbackName = perfil?.username ? `@${perfil.username}` : ""

  const [data, setData] = useState<Overview | null>(null)
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState<null | "receipt" | "settings" | "list">(null)

  const load = useCallback(async () => {
    const tk = token()
    if (!tk) return
    setLoading(true)
    try {
      const r = await clientFetchWithTimeout("/api/me/mei/overview", { headers: { Authorization: `Bearer ${tk}` } }, 9000)
      if (r.ok) setData(await r.json())
    } catch {
      /* card acessório — silencioso */
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  if (loading && !data) {
    return <div className="h-40 animate-pulse border-2 border-[#0B0B0D] bg-[#F1EDE2] shadow-[5px_5px_0_0_#0B0B0D]" />
  }
  if (!data) return null

  const pct = Math.max(0, Math.min(1, data.pct))
  const pctLabel = Math.round(data.pct * 100)
  const barColor = pct < 0.7 ? GREEN : pct < 0.9 ? AMBER : RED
  const near = pct >= 0.9
  const profile = data.profile

  return (
    <div className="border-2 border-[#0B0B0D] bg-[#F1EDE2] p-4 shadow-[5px_5px_0_0_#0B0B0D] sm:p-5">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-7 w-7 items-center justify-center border-2 border-[#0B0B0D]" style={{ background: GREEN }}>
            <Receipt className="h-3.5 w-3.5 text-[#06251F]" />
          </span>
          <h2 className="fl-display text-2xl text-[#0B0B0D]">{t("title", "MEI")}</h2>
          <span className="text-[11px] font-extrabold uppercase tracking-wide text-[#6B6457]">{data.year}</span>
        </div>
        <button
          type="button"
          onClick={() => setModal("settings")}
          aria-label={t("configure", "Configurar")}
          className="border-2 border-transparent p-1.5 text-[#6B6457] transition hover:border-[#0B0B0D] hover:text-[#0B0B0D]"
        >
          <Settings className="h-4 w-4" />
        </button>
      </div>

      {/* Termômetro do teto */}
      <p className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-[#6B6457]">
        {t("thermoLabel", "Faturamento via Freelandoo")}
      </p>
      <div className="mt-1 flex items-end justify-between gap-2">
        <span className="fl-display text-2xl leading-none" style={{ color: GREEN_DEEP }}>{brl(data.gross_cents, locale)}</span>
        <span className="text-[11px] font-bold text-[#6B6457]">
          {t("ofLimit", "{pct}% do teto").replace("{pct}", String(pctLabel))}
        </span>
      </div>
      <div className="mt-2 h-4 border-2 border-[#0B0B0D] bg-white">
        <div className="h-full transition-all duration-500" style={{ width: `${Math.max(2, pct * 100)}%`, background: barColor }} />
      </div>
      <p className="mt-1.5 text-[11px] font-semibold text-[#6B6457]">
        {t("limitLine", "Teto MEI: {limit}/ano").replace("{limit}", brl(data.limit_cents, locale))}
      </p>

      {near && (
        <div className="mt-3 flex items-start gap-2 border-2 border-[#C0392B] bg-[#C0392B]/10 px-3 py-2">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[#C0392B]" />
          <p className="text-[11px] font-bold text-[#0B0B0D]">{t("nearLimit", "Você está perto do teto do MEI. Fique de olho para não desenquadrar.")}</p>
        </div>
      )}

      {profile.is_mei && profile.das_reminder && (
        <p className="mt-3 text-[11px] font-semibold text-[#6B6457]">
          📅 {t("dasNote", "DAS vence todo dia {day}.").replace("{day}", String(data.das_due_day))}
        </p>
      )}

      <p className="mt-3 text-[10px] leading-relaxed text-[#6B6457]/80">
        {t("disclaimer", "Estimativa do que entrou pela plataforma neste ano. Receita fora da Freelandoo também conta no teto — confirme com seu contador.")}
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setModal("receipt")}
          className="inline-flex items-center gap-1.5 border-2 border-[#0B0B0D] px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-[0.1em] text-[#06251F] shadow-[3px_3px_0_0_#0B0B0D] transition-transform hover:-translate-y-0.5"
          style={{ background: GREEN }}
        >
          <Plus className="h-3.5 w-3.5" /> {t("issueReceipt", "Emitir recibo")}
        </button>
        <button
          type="button"
          onClick={() => setModal("list")}
          className="inline-flex items-center gap-1.5 border-2 border-[#0B0B0D]/40 px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-[0.1em] text-[#0B0B0D] transition hover:border-[#0B0B0D]"
        >
          <FileText className="h-3.5 w-3.5" /> {t("myReceipts", "Recibos")}
        </button>
      </div>

      {modal === "receipt" && (
        <ReceiptModal t={t} profile={profile} fallbackName={fallbackName} onClose={() => setModal(null)} />
      )}
      {modal === "settings" && (
        <SettingsModal t={t} profile={profile} onClose={() => setModal(null)} onSaved={() => { setModal(null); void load() }} />
      )}
      {modal === "list" && (
        <ReceiptsModal t={t} locale={locale} profile={profile} fallbackName={fallbackName} onClose={() => setModal(null)} />
      )}
    </div>
  )
}

/* ── Modal base (papel) ───────────────────────────────────────────────────── */
function ModalShell({ title, onClose, children, t }: { title: string; onClose: () => void; children: ReactNode; t: TFn }) {
  return (
    <div className="fl-root fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 sm:items-center sm:p-4" onClick={onClose}>
      <div
        className="max-h-[90vh] w-full max-w-md overflow-y-auto border-2 border-[#0B0B0D] bg-[#F1EDE2] text-[#0B0B0D] shadow-[8px_8px_0_0_#0B0B0D]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b-2 border-[#0B0B0D]/15 p-4">
          <h3 className="fl-display text-2xl text-[#0B0B0D]">{title}</h3>
          <button type="button" aria-label={t("close", "Fechar")} onClick={onClose} className="border-2 border-transparent p-1.5 text-[#6B6457] transition hover:border-[#0B0B0D] hover:text-[#0B0B0D]">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  )
}

const FIELD =
  "w-full border-2 border-[#0B0B0D]/30 bg-white px-3 py-2 text-sm text-[#0B0B0D] outline-none focus:border-[#0B0B0D]"
const LABEL = "mb-1 block text-[10px] font-extrabold uppercase tracking-wide text-[#6B6457]"

/* ── Emitir recibo ────────────────────────────────────────────────────────── */
function ReceiptModal({ t, profile, fallbackName, onClose }: { t: TFn; profile: MeiProfile; fallbackName: string; onClose: () => void }) {
  const [takerName, setTakerName] = useState("")
  const [takerDoc, setTakerDoc] = useState("")
  const [description, setDescription] = useState("")
  const [amount, setAmount] = useState("")
  const [issuedFor, setIssuedFor] = useState(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
  })
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState("")

  const submit = async () => {
    setErr("")
    const reais = Number(String(amount).replace(/\./g, "").replace(",", "."))
    const amount_cents = Math.round(reais * 100)
    if (!takerName.trim()) return setErr(t("errTakerName", "Informe o cliente."))
    if (!description.trim()) return setErr(t("errDescription", "Descreva o serviço."))
    if (!Number.isFinite(amount_cents) || amount_cents <= 0) return setErr(t("errAmount", "Informe um valor válido."))
    const tk = token()
    if (!tk) return
    setSaving(true)
    try {
      const r = await clientFetchWithTimeout("/api/me/mei/receipts", {
        method: "POST",
        headers: { Authorization: `Bearer ${tk}`, "Content-Type": "application/json" },
        body: JSON.stringify({ taker_name: takerName.trim(), taker_doc: takerDoc.trim() || null, description: description.trim(), amount_cents, issued_for: issuedFor }),
      }, 9000)
      const d = await r.json().catch(() => null)
      if (!r.ok) throw new Error(d?.error || t("errEmit", "Não deu pra emitir"))
      printReceipt(d.receipt as ReceiptRow, profile, fallbackName)
      onClose()
    } catch (e) {
      setErr(e instanceof Error ? e.message : t("errEmit", "Não deu pra emitir"))
    } finally {
      setSaving(false)
    }
  }

  return (
    <ModalShell t={t} title={t("issueReceipt", "Emitir recibo")} onClose={onClose}>
      <label className="block">
        <span className={LABEL}>{t("takerName", "Cliente (tomador)")}</span>
        <input value={takerName} onChange={(e) => setTakerName(e.target.value)} className={FIELD} placeholder={t("takerNamePh", "Nome de quem pagou")} />
      </label>
      <label className="mt-3 block">
        <span className={LABEL}>{t("takerDoc", "CPF/CNPJ do cliente (opcional)")}</span>
        <input value={takerDoc} onChange={(e) => setTakerDoc(e.target.value)} className={FIELD} />
      </label>
      <label className="mt-3 block">
        <span className={LABEL}>{t("description", "Descrição do serviço")}</span>
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className={cn(FIELD, "resize-none")} placeholder={t("descriptionPh", "Ex: design de unhas, corte e escova...")} />
      </label>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <label className="block">
          <span className={LABEL}>{t("amount", "Valor (R$)")}</span>
          <input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^\d.,]/g, ""))} className={cn(FIELD, "font-black tabular-nums")} placeholder="0,00" />
        </label>
        <label className="block">
          <span className={LABEL}>{t("issuedFor", "Data")}</span>
          <input type="date" value={issuedFor} onChange={(e) => setIssuedFor(e.target.value)} className={FIELD} />
        </label>
      </div>

      {err && <p className="mt-3 text-xs font-bold text-[#C0392B]">{err}</p>}

      <button
        type="button"
        onClick={submit}
        disabled={saving}
        className="mt-4 flex w-full items-center justify-center gap-2 border-2 border-[#0B0B0D] px-4 py-2.5 text-xs font-extrabold uppercase tracking-[0.12em] text-[#06251F] shadow-[4px_4px_0_0_#0B0B0D] transition hover:-translate-y-0.5 disabled:opacity-60"
        style={{ background: GREEN }}
      >
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
        {t("emitAndPrint", "Emitir e imprimir")}
      </button>
    </ModalShell>
  )
}

/* ── Configurar dados fiscais ─────────────────────────────────────────────── */
function SettingsModal({ t, profile, onClose, onSaved }: { t: TFn; profile: MeiProfile; onClose: () => void; onSaved: () => void }) {
  const [isMei, setIsMei] = useState(profile.is_mei)
  const [cnpj, setCnpj] = useState(profile.cnpj || "")
  const [providerName, setProviderName] = useState(profile.provider_name || "")
  const [providerDoc, setProviderDoc] = useState(profile.provider_doc || "")
  const [providerAddress, setProviderAddress] = useState(profile.provider_address || "")
  const [dasReminder, setDasReminder] = useState(profile.das_reminder)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState("")

  const submit = async () => {
    setErr("")
    const tk = token()
    if (!tk) return
    setSaving(true)
    try {
      const r = await clientFetchWithTimeout("/api/me/mei/profile", {
        method: "PUT",
        headers: { Authorization: `Bearer ${tk}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          is_mei: isMei, cnpj: cnpj.trim() || null, provider_name: providerName.trim() || null,
          provider_doc: providerDoc.trim() || null, provider_address: providerAddress.trim() || null, das_reminder: dasReminder,
        }),
      }, 9000)
      if (!r.ok) { const d = await r.json().catch(() => null); throw new Error(d?.error || t("errSave", "Não deu pra salvar")) }
      onSaved()
    } catch (e) {
      setErr(e instanceof Error ? e.message : t("errSave", "Não deu pra salvar"))
    } finally {
      setSaving(false)
    }
  }

  return (
    <ModalShell t={t} title={t("settingsTitle", "Dados do MEI")} onClose={onClose}>
      <label className="flex items-center gap-2">
        <input type="checkbox" checked={isMei} onChange={(e) => setIsMei(e.target.checked)} className="h-4 w-4 accent-[#16B79A]" />
        <span className="text-sm font-bold text-[#0B0B0D]">{t("isMei", "Sou MEI")}</span>
      </label>
      <p className="mt-1 text-[10px] leading-relaxed text-[#6B6457]">{t("settingsHint", "Esses dados aparecem como prestador nos recibos que você emitir.")}</p>

      <label className="mt-3 block">
        <span className={LABEL}>{t("providerName", "Nome do prestador")}</span>
        <input value={providerName} onChange={(e) => setProviderName(e.target.value)} className={FIELD} />
      </label>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <label className="block">
          <span className={LABEL}>{t("providerDoc", "CPF")}</span>
          <input value={providerDoc} onChange={(e) => setProviderDoc(e.target.value)} className={FIELD} />
        </label>
        <label className="block">
          <span className={LABEL}>{t("cnpj", "CNPJ (MEI)")}</span>
          <input value={cnpj} onChange={(e) => setCnpj(e.target.value)} className={FIELD} />
        </label>
      </div>
      <label className="mt-3 block">
        <span className={LABEL}>{t("providerAddress", "Endereço")}</span>
        <input value={providerAddress} onChange={(e) => setProviderAddress(e.target.value)} className={FIELD} />
      </label>
      <label className="mt-3 flex items-center gap-2">
        <input type="checkbox" checked={dasReminder} onChange={(e) => setDasReminder(e.target.checked)} className="h-4 w-4 accent-[#16B79A]" />
        <span className="text-sm font-bold text-[#0B0B0D]">{t("dasReminder", "Lembrar do DAS todo mês")}</span>
      </label>

      {err && <p className="mt-3 text-xs font-bold text-[#C0392B]">{err}</p>}

      <button
        type="button"
        onClick={submit}
        disabled={saving}
        className="mt-4 flex w-full items-center justify-center gap-2 border-2 border-[#0B0B0D] px-4 py-2.5 text-xs font-extrabold uppercase tracking-[0.12em] text-[#06251F] shadow-[4px_4px_0_0_#0B0B0D] transition hover:-translate-y-0.5 disabled:opacity-60"
        style={{ background: GREEN }}
      >
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        {t("save", "Salvar")}
      </button>
    </ModalShell>
  )
}

/* ── Lista de recibos ─────────────────────────────────────────────────────── */
function ReceiptsModal({ t, locale, profile, fallbackName, onClose }: { t: TFn; locale: string; profile: MeiProfile; fallbackName: string; onClose: () => void }) {
  const [items, setItems] = useState<ReceiptRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const tk = token()
    if (!tk) return
    clientFetchWithTimeout("/api/me/mei/receipts?per_page=50", { headers: { Authorization: `Bearer ${tk}` } }, 9000)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setItems(d?.items || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return (
    <ModalShell t={t} title={t("receiptsTitle", "Meus recibos")} onClose={onClose}>
      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-[#6B6457]" /></div>
      ) : items.length === 0 ? (
        <p className="py-8 text-center text-sm text-[#6B6457]">{t("noReceipts", "Nenhum recibo emitido ainda.")}</p>
      ) : (
        <div className="space-y-2">
          {items.map((r) => (
            <div key={r.id_receipt} className="flex items-center justify-between gap-2 border-2 border-[#0B0B0D]/20 bg-white/60 px-3 py-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-[#0B0B0D]">
                  {t("receiptNo", "Recibo Nº {n}").replace("{n}", String(r.number))} · {r.taker_name}
                </p>
                <p className="text-[11px] text-[#6B6457]">
                  {new Date((r.issued_for || r.created_at).slice(0, 10) + "T12:00:00").toLocaleDateString(locale)} · <span className="font-bold" style={{ color: GREEN_DEEP }}>{brl(r.amount_cents, locale)}</span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => printReceipt(r, profile, fallbackName)}
                className="shrink-0 border-2 border-[#0B0B0D]/40 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide text-[#0B0B0D] transition hover:border-[#0B0B0D]"
              >
                {t("reprint", "Reimprimir")}
              </button>
            </div>
          ))}
        </div>
      )}
    </ModalShell>
  )
}
