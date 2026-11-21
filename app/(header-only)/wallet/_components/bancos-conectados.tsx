"use client"

// BANCOS CONECTADOS (mig 462) + EXTRATO OFX/CSV.
//
// Duas portas para o extrato entrar na Vida Financeira:
//   1. IMPORTAR (grátis, para todo mundo): a pessoa baixa o OFX/CSV no app do
//      banco e sobe aqui. O back deduplica — subir o mesmo arquivo duas vezes
//      não duplica nada.
//   2. CONECTAR (R$ 20/mês, até 2 bancos): Open Finance pela Malvo. O
//      consentimento acontece no widget DA MALVO (iframe): a Freelandoo nunca
//      vê senha de banco. O widget devolve o id do Item e o back confere que o
//      Item é desta pessoa (`clientUserId`) antes de adotá-lo.
//
// O widget é reimplementado aqui (≈ o que o @malvo/react-connect faz): o pacote
// publicado no npm está quebrado (aponta para dist/ que não existe). É só um
// iframe em `malvo.io/connect?token=` que conversa por postMessage — e a gente
// só aceita mensagem vinda da origem da Malvo.
//
// Enquanto a Malvo não confirma o enquadramento da RC BCB 21/2026, a flag
// `bancos_conectados` fica DESLIGADA: só administrador vê a parte de conectar.
//
// Custo: nada aqui faz polling. A sincronização avisa por socket
// (`wallet:bank_synced`); a volta do pagamento confere 3 vezes e para.

import { useCallback, useEffect, useRef, useState } from "react"
import {
  AlertTriangle, Building2, CreditCard, FileUp, Landmark, Link2, Loader2, QrCode, RefreshCw, Trash2, X,
} from "lucide-react"
import { clientFetchWithTimeout } from "@/lib/fetch-with-timeout"
import { onRealtime } from "@/lib/realtime"
import { useLocale, useTranslations } from "@/components/i18n/I18nProvider"

const GREEN = "#16B79A"
const MALVO_ORIGIN = "https://malvo.io"

type Account = {
  id_account: string
  type: string | null
  subtype: string | null
  name: string | null
  number_tail: string | null
  balance_cents: number | null
  credit_limit_cents: number | null
  bill_amount_cents: number | null
  bill_due_date: string | null
}
type Connection = {
  id_connection: string
  institution_name: string | null
  institution_logo: string | null
  primary_color: string | null
  is_sandbox: boolean
  status: string | null
  needs_action: boolean
  syncing: boolean
  last_synced_at: string | null
  accounts: Account[]
}
type BanksData = {
  available: boolean
  sandbox: boolean
  access: { has_access: boolean; by_admin: boolean; paid_until: string | null; renews: boolean }
  price: { monthly_cents: number; for_sale: boolean }
  limits: { max_banks: number; connects_per_month: number; connects_used: number }
  connections: Connection[]
}

function token() {
  return typeof window !== "undefined" ? localStorage.getItem("token") : null
}
function brl(cents: number | null | undefined, locale: string) {
  return ((Number(cents) || 0) / 100).toLocaleString(locale, { style: "currency", currency: "BRL" })
}
function day(iso: string | null | undefined, locale: string) {
  if (!iso) return ""
  const d = new Date(String(iso).slice(0, 10) + "T00:00:00")
  return d.toLocaleDateString(locale, { day: "2-digit", month: "2-digit" })
}
async function call(path: string, init: RequestInit = {}) {
  const t = token()
  if (!t) return { ok: false, status: 401, data: null as Record<string, unknown> | null }
  const r = await clientFetchWithTimeout(
    path,
    { ...init, headers: { Authorization: `Bearer ${t}`, ...(init.body ? { "Content-Type": "application/json" } : {}) } },
    20000
  )
  return { ok: r.ok, status: r.status, data: (await r.json().catch(() => null)) as Record<string, unknown> | null }
}
/** Primeiro UUID que aparecer no payload do widget (o formato varia por evento). */
function findItemId(payload: unknown): string | null {
  const m = JSON.stringify(payload ?? "").match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i)
  return m ? m[0] : null
}

/* ═══════════════════════════════════════════════════════════════════════════ */
export function BancosConectados({ onEntriesChanged }: { onEntriesChanged?: () => void }) {
  const tr = useTranslations("Wallet")
  const locale = useLocale()
  const [data, setData] = useState<BanksData | null>(null)
  const [busy, setBusy] = useState<string>("")
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null)
  const [widget, setWidget] = useState<{ token: string; sandbox: boolean; updateItem?: string; reconnect: boolean } | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const load = useCallback(async () => {
    try {
      const r = await call("/api/me/wallet/banks")
      if (r.ok) setData(r.data as unknown as BanksData)
    } catch {
      /* silencioso: a Vida Financeira segue funcionando sem os bancos */
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  // A sincronização terminou no servidor: saldos e lançamentos novos.
  useEffect(
    () =>
      onRealtime("wallet:bank_synced", () => {
        void load()
        onEntriesChanged?.()
      }),
    [load, onEntriesChanged]
  )

  // Volta do pagamento: o webhook do Mercado Pago confirma em segundos. Confere
  // 3 vezes (0 s, 4 s, 10 s) e para — sem polling contínuo.
  useEffect(() => {
    if (typeof window === "undefined") return
    const q = new URLSearchParams(window.location.search).get("bancos")
    if (!q) return
    if (q === "success") setMsg({ kind: "ok", text: tr("bkPaid", "Pagamento recebido. Liberando os bancos conectados…") })
    if (q === "cancel") setMsg({ kind: "err", text: tr("bkPayCanceled", "Pagamento não concluído.") })
    const timers = q === "success" ? [4000, 10000].map((ms) => window.setTimeout(() => void load(), ms)) : []
    const url = new URL(window.location.href)
    url.searchParams.delete("bancos")
    url.searchParams.delete("session_id")
    window.history.replaceState(null, "", url.toString())
    return () => timers.forEach((id) => window.clearTimeout(id))
  }, [load, tr])

  const errText = (r: { data: Record<string, unknown> | null }) =>
    (typeof r.data?.error === "string" && r.data.error) || tr("bkGenericError", "Não deu certo agora. Tente de novo.")

  const checkout = async (method: "card" | "pix") => {
    setBusy(method)
    setMsg(null)
    try {
      const r = await call("/api/me/wallet/banks/checkout", { method: "POST", body: JSON.stringify({ method }) })
      const url = typeof r.data?.checkout_url === "string" ? r.data.checkout_url : ""
      if (r.ok && url) {
        window.location.href = url
        return
      }
      setMsg({ kind: "err", text: errText(r) })
    } catch {
      setMsg({ kind: "err", text: tr("bkGenericError", "Não deu certo agora. Tente de novo.") })
    }
    setBusy("")
  }

  const cancelRenewal = async () => {
    if (!window.confirm(tr("bkCancelConfirm", "Cancelar a renovação? Os bancos seguem conectados até o fim do mês pago."))) return
    setBusy("cancel")
    const r = await call("/api/me/wallet/banks/cancel", { method: "POST" }).catch(() => null)
    setBusy("")
    if (r && !r.ok) setMsg({ kind: "err", text: errText(r) })
    void load()
  }

  const openWidget = async (conn?: Connection) => {
    setBusy(conn ? `re-${conn.id_connection}` : "connect")
    setMsg(null)
    try {
      const r = await call("/api/me/wallet/banks/connect-token", {
        method: "POST",
        body: JSON.stringify(conn ? { id_connection: conn.id_connection } : {}),
      })
      const tk = typeof r.data?.connect_token === "string" ? r.data.connect_token : ""
      if (!r.ok || !tk) {
        setMsg({ kind: "err", text: errText(r) })
      } else {
        setWidget({
          token: tk,
          sandbox: r.data?.include_sandbox === true,
          updateItem: typeof r.data?.update_item === "string" ? r.data.update_item : undefined,
          reconnect: !!conn,
        })
      }
    } catch {
      setMsg({ kind: "err", text: tr("bkGenericError", "Não deu certo agora. Tente de novo.") })
    }
    setBusy("")
  }

  const onWidgetSuccess = async (itemId: string | null, reconnect: boolean) => {
    setWidget(null)
    if (!itemId) {
      void load()
      return
    }
    setMsg({ kind: "ok", text: tr("bkConnected", "Banco conectado. Puxando o extrato — leva alguns segundos.") })
    const r = await call("/api/me/wallet/banks/items", { method: "POST", body: JSON.stringify({ item_id: itemId, reconnect }) }).catch(
      () => null
    )
    if (r && !r.ok) setMsg({ kind: "err", text: errText(r) })
    void load()
  }

  const disconnect = async (c: Connection) => {
    const name = c.institution_name || tr("bkThisBank", "este banco")
    if (
      !window.confirm(
        tr("bkDisconnectConfirm", "Desconectar {bank}? O consentimento é revogado e os lançamentos que vieram dele saem da Vida Financeira.").replace(
          "{bank}",
          name
        )
      )
    )
      return
    setBusy(`del-${c.id_connection}`)
    const r = await call(`/api/me/wallet/banks/${c.id_connection}`, { method: "DELETE" }).catch(() => null)
    setBusy("")
    if (r && !r.ok) setMsg({ kind: "err", text: errText(r) })
    void load()
    onEntriesChanged?.()
  }

  const importFile = async (file: File) => {
    if (file.size > 3 * 1024 * 1024) {
      setMsg({ kind: "err", text: tr("bkImportTooBig", "Arquivo grande demais (máx. 3 MB).") })
      return
    }
    setBusy("import")
    setMsg(null)
    try {
      const content = await file.text()
      const r = await call("/api/me/wallet/finance/import", { method: "POST", body: JSON.stringify({ content }) })
      if (r.ok) {
        const ins = Number(r.data?.inserted) || 0
        const dup = Number(r.data?.duplicates) || 0
        setMsg({
          kind: "ok",
          text: tr("bkImported", "{n} lançamento(s) importado(s); {d} já estava(m) na Vida Financeira.")
            .replace("{n}", String(ins))
            .replace("{d}", String(dup)),
        })
        onEntriesChanged?.()
      } else {
        setMsg({ kind: "err", text: errText(r) })
      }
    } catch {
      setMsg({ kind: "err", text: tr("bkGenericError", "Não deu certo agora. Tente de novo.") })
    }
    setBusy("")
    if (fileRef.current) fileRef.current.value = ""
  }

  const showBanks = !!data && (data.available || data.connections.length > 0)
  const access = data?.access
  const conns = data?.connections || []
  const limits = data?.limits
  const canAdd =
    !!access?.has_access &&
    !!limits &&
    conns.length < limits.max_banks &&
    limits.connects_used < limits.connects_per_month

  return (
    <div className="border-2 border-[#0B0B0D] bg-[#F1EDE2] p-4 shadow-[5px_5px_0_0_#0B0B0D] sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="flex items-center gap-2 fl-display text-2xl text-[#0B0B0D]">
            <Landmark className="h-5 w-5" /> {tr("bkTitle", "Seus bancos")}
          </h3>
          <p className="mt-1 max-w-xl text-xs font-medium text-[#6B6457]">
            {showBanks
              ? tr("bkIntro", "Conecte o banco e o extrato entra sozinho na Vida Financeira, já com categoria. Ou importe o arquivo OFX/CSV do app do banco, de graça.")
              : tr("bkIntroImport", "Baixe o extrato OFX ou CSV no app do seu banco e importe aqui: entra tudo na Vida Financeira, sem duplicar.")}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <input
            ref={fileRef}
            type="file"
            accept=".ofx,.csv,.txt,text/csv,application/x-ofx"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) void importFile(f)
            }}
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={busy === "import"}
            className="inline-flex items-center gap-2 border-2 border-[#0B0B0D] bg-white px-3 py-2 text-[11px] font-extrabold uppercase tracking-[0.12em] text-[#0B0B0D] shadow-[3px_3px_0_0_#0B0B0D] transition hover:-translate-y-0.5 disabled:opacity-60"
          >
            {busy === "import" ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileUp className="h-4 w-4" />}
            {tr("bkImport", "Importar extrato")}
          </button>
          {canAdd && (
            <button
              type="button"
              onClick={() => void openWidget()}
              disabled={busy === "connect"}
              className="inline-flex items-center gap-2 border-2 border-[#0B0B0D] px-3 py-2 text-[11px] font-extrabold uppercase tracking-[0.12em] text-[#0B0B0D] shadow-[3px_3px_0_0_#0B0B0D] transition hover:-translate-y-0.5 disabled:opacity-60"
              style={{ background: GREEN }}
            >
              {busy === "connect" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />}
              {tr("bkConnect", "Conectar banco")}
            </button>
          )}
        </div>
      </div>

      {msg && (
        <p
          className={`mt-3 border-2 px-3 py-2 text-xs font-bold ${
            msg.kind === "ok" ? "border-[#00876B] bg-[#16B79A]/15 text-[#00563F]" : "border-[#C0392B] bg-[#C0392B]/10 text-[#8E2A20]"
          }`}
        >
          {msg.text}
        </p>
      )}

      {showBanks && data && !access?.has_access && (
        <div className="mt-4 border-2 border-dashed border-[#0B0B0D]/40 p-4">
          <p className="fl-display text-xl text-[#0B0B0D]">
            {tr("bkOffer", "{price}/mês · até {n} bancos")
              .replace("{price}", brl(data.price.monthly_cents, locale))
              .replace("{n}", String(data.limits.max_banks))}
          </p>
          <p className="mt-1 text-xs font-medium text-[#6B6457]">
            {tr("bkOfferDesc", "Open Finance regulado pelo Banco Central: você autoriza no app do seu banco, só leitura, e pode revogar quando quiser. A Freelandoo nunca vê sua senha.")}
          </p>
          {data.price.for_sale ? (
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void checkout("card")}
                disabled={!!busy}
                className="inline-flex items-center gap-2 border-2 border-[#0B0B0D] px-4 py-2 text-[11px] font-extrabold uppercase tracking-[0.12em] text-[#0B0B0D] shadow-[3px_3px_0_0_#0B0B0D] transition hover:-translate-y-0.5 disabled:opacity-60"
                style={{ background: GREEN }}
              >
                {busy === "card" ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
                {tr("bkPayCard", "Assinar no cartão")}
              </button>
              <button
                type="button"
                onClick={() => void checkout("pix")}
                disabled={!!busy}
                className="inline-flex items-center gap-2 border-2 border-[#0B0B0D] bg-white px-4 py-2 text-[11px] font-extrabold uppercase tracking-[0.12em] text-[#0B0B0D] shadow-[3px_3px_0_0_#0B0B0D] transition hover:-translate-y-0.5 disabled:opacity-60"
              >
                {busy === "pix" ? <Loader2 className="h-4 w-4 animate-spin" /> : <QrCode className="h-4 w-4" />}
                {tr("bkPayPix", "1 mês no Pix")}
              </button>
            </div>
          ) : (
            <p className="mt-2 text-xs font-bold text-[#6B6457]">{tr("bkNotForSale", "A assinatura abre em breve.")}</p>
          )}
        </div>
      )}

      {showBanks && access?.has_access && (
        <p className="mt-3 text-[11px] font-semibold uppercase tracking-wide text-[#6B6457]">
          {access.by_admin
            ? tr("bkByAdmin", "Acesso de administrador")
            : access.renews
              ? tr("bkRenews", "Renova em {date}").replace("{date}", day(access.paid_until, locale))
              : tr("bkUntil", "Liberado até {date}").replace("{date}", day(access.paid_until, locale))}
          {" · "}
          {tr("bkBanksCount", "{n} de {max} bancos").replace("{n}", String(conns.length)).replace("{max}", String(limits?.max_banks ?? 0))}
          {limits && limits.connects_used >= limits.connects_per_month && (
            <> · {tr("bkMonthLimit", "limite de conexões do mês atingido")}</>
          )}
          {!access.by_admin && access.renews && (
            <>
              {" · "}
              <button type="button" onClick={() => void cancelRenewal()} className="underline hover:text-[#C0392B]">
                {tr("bkCancel", "cancelar renovação")}
              </button>
            </>
          )}
        </p>
      )}

      {conns.length > 0 && (
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          {conns.map((c) => (
            <ConnectionCard
              key={c.id_connection}
              c={c}
              locale={locale}
              tr={tr}
              busy={busy}
              canReconnect={!!access?.has_access}
              onReconnect={() => void openWidget(c)}
              onDisconnect={() => void disconnect(c)}
            />
          ))}
        </div>
      )}

      {widget && (
        <MalvoWidget
          token={widget.token}
          includeSandbox={widget.sandbox}
          updateItem={widget.updateItem}
          onSuccess={(id) => void onWidgetSuccess(id, widget.reconnect)}
          onClose={() => {
            setWidget(null)
            void load()
          }}
          tr={tr}
        />
      )}
    </div>
  )
}

/* ── Cartão de uma conexão ───────────────────────────────────────────────── */
type TFn = (key: string, fallback: string) => string

function ConnectionCard({
  c, locale, tr, busy, canReconnect, onReconnect, onDisconnect,
}: {
  c: Connection
  locale: string
  tr: TFn
  busy: string
  canReconnect: boolean
  onReconnect: () => void
  onDisconnect: () => void
}) {
  return (
    <div className="border-2 border-[#0B0B0D] bg-white p-3">
      <div className="flex items-center gap-2">
        {c.institution_logo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={c.institution_logo} alt="" loading="lazy" className="h-8 w-8 shrink-0 border border-[#0B0B0D]/20 object-contain" />
        ) : (
          <span
            className="flex h-8 w-8 shrink-0 items-center justify-center border border-[#0B0B0D]/20"
            style={{ background: c.primary_color ? `#${c.primary_color.replace("#", "")}` : "#E5E0D4" }}
          >
            <Building2 className="h-4 w-4 text-[#0B0B0D]" />
          </span>
        )}
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 truncate text-sm font-black text-[#0B0B0D]">
            <span className="truncate">{c.institution_name || tr("bkBank", "Banco")}</span>
            {c.is_sandbox && (
              <span className="shrink-0 border border-[#0B0B0D] bg-[#F2B705] px-1 text-[9px] font-extrabold uppercase">{tr("bkTest", "Teste")}</span>
            )}
          </p>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-[#6B6457]">
            {c.syncing ? (
              <span className="inline-flex items-center gap-1">
                <Loader2 className="h-3 w-3 animate-spin" /> {tr("bkSyncing", "sincronizando")}
              </span>
            ) : c.last_synced_at ? (
              tr("bkSyncedAt", "atualizado {date}").replace("{date}", day(c.last_synced_at, locale))
            ) : (
              tr("bkWaiting", "aguardando o banco")
            )}
          </p>
        </div>
        <button
          type="button"
          aria-label={tr("bkDisconnect", "Desconectar")}
          title={tr("bkDisconnect", "Desconectar")}
          onClick={onDisconnect}
          disabled={busy === `del-${c.id_connection}`}
          className="shrink-0 p-1 text-[#6B6457] transition hover:text-[#C0392B] disabled:opacity-50"
        >
          {busy === `del-${c.id_connection}` ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
        </button>
      </div>

      {c.needs_action && (
        <div className="mt-2 flex flex-wrap items-center gap-2 border-2 border-[#C0392B] bg-[#C0392B]/10 px-2 py-1.5">
          <AlertTriangle className="h-4 w-4 text-[#C0392B]" />
          <span className="flex-1 text-[11px] font-bold text-[#8E2A20]">
            {tr("bkNeedsAction", "A autorização venceu ou o banco pediu confirmação.")}
          </span>
          {canReconnect && (
            <button
              type="button"
              onClick={onReconnect}
              disabled={busy === `re-${c.id_connection}`}
              className="inline-flex items-center gap-1 border-2 border-[#0B0B0D] bg-white px-2 py-1 text-[10px] font-extrabold uppercase tracking-wide text-[#0B0B0D]"
            >
              {busy === `re-${c.id_connection}` ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
              {tr("bkReconnect", "Reconectar")}
            </button>
          )}
        </div>
      )}

      {c.accounts.length > 0 && (
        <div className="mt-2 space-y-1.5">
          {c.accounts.map((a) => {
            const credit = a.type === "CREDIT"
            return (
              <div key={a.id_account} className="flex items-center gap-2 border border-[#0B0B0D]/20 bg-[#F1EDE2]/60 px-2 py-1.5">
                {credit ? <CreditCard className="h-3.5 w-3.5 shrink-0" /> : <Landmark className="h-3.5 w-3.5 shrink-0" />}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-bold text-[#0B0B0D]">
                    {a.name || (credit ? tr("bkCard", "Cartão") : tr("bkAccount", "Conta"))}
                    {a.number_tail ? ` ·${a.number_tail}` : ""}
                  </p>
                  {credit && a.bill_due_date && (
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-[#6B6457]">
                      {tr("bkBillDue", "fatura vence {date}").replace("{date}", day(a.bill_due_date, locale))}
                    </p>
                  )}
                </div>
                <span className="shrink-0 text-right text-xs font-black tabular-nums text-[#0B0B0D]">
                  {credit ? brl(a.bill_amount_cents ?? a.balance_cents, locale) : brl(a.balance_cents, locale)}
                  <span className="block text-[9px] font-bold uppercase text-[#6B6457]">
                    {credit ? tr("bkBill", "fatura") : tr("bkBalance", "saldo")}
                  </span>
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

/* ── Widget da Malvo (iframe) ────────────────────────────────────────────── */
function MalvoWidget({
  token: connectToken, includeSandbox, updateItem, onSuccess, onClose, tr,
}: {
  token: string
  includeSandbox: boolean
  updateItem?: string
  onSuccess: (itemId: string | null) => void
  onClose: () => void
  tr: TFn
}) {
  const [loaded, setLoaded] = useState(false)
  const done = useRef(false)
  // Os callbacks chegam novos a cada render do pai: ficam numa ref para o
  // efeito abaixo assinar o postMessage UMA vez.
  const cb = useRef({ onSuccess, onClose })
  useEffect(() => {
    cb.current = { onSuccess, onClose }
  })

  useEffect(() => {
    const { onSuccess, onClose } = { onSuccess: (id: string | null) => cb.current.onSuccess(id), onClose: () => cb.current.onClose() }
    const onMsg = (ev: MessageEvent) => {
      if (ev.origin !== MALVO_ORIGIN) return
      const d = ev.data as { type?: string; event?: string } | string | null
      const kind = typeof d === "string" ? d : d?.type || d?.event || ""
      if (/success/i.test(kind)) {
        if (done.current) return
        done.current = true
        onSuccess(findItemId(d))
      } else if (/close|exit/i.test(kind)) {
        if (!done.current) onClose()
      }
    }
    window.addEventListener("message", onMsg)
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !done.current) onClose()
    }
    window.addEventListener("keydown", onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      window.removeEventListener("message", onMsg)
      window.removeEventListener("keydown", onKey)
      document.body.style.overflow = prev
    }
  }, [])

  const qs = new URLSearchParams({ token: connectToken })
  if (includeSandbox) qs.set("includeSandbox", "true")
  if (updateItem) qs.set("updateItem", updateItem)

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/70 p-0 sm:p-4" role="dialog" aria-modal="true">
      <div className="relative flex h-full w-full flex-col border-2 border-[#0B0B0D] bg-white shadow-[6px_6px_0_0_#0B0B0D] sm:h-[680px] sm:max-h-[92vh] sm:w-[440px]">
        <div className="flex items-center justify-between border-b-2 border-[#0B0B0D] bg-[#F1EDE2] px-3 py-2">
          <span className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-[#0B0B0D]">{tr("bkWidgetTitle", "Conectar banco")}</span>
          <button type="button" aria-label={tr("close", "Fechar")} onClick={onClose} className="p-1 text-[#0B0B0D]">
            <X className="h-4 w-4" />
          </button>
        </div>
        {!loaded && (
          <div className="absolute inset-0 top-10 flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-[#0B0B0D]" />
          </div>
        )}
        <iframe
          title={tr("bkWidgetTitle", "Conectar banco")}
          src={`${MALVO_ORIGIN}/connect?${qs.toString()}`}
          onLoad={() => setLoaded(true)}
          className="min-h-0 w-full flex-1 border-0"
          allow="clipboard-write"
        />
      </div>
    </div>
  )
}
