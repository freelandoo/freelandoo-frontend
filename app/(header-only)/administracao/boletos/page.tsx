"use client"

/**
 * Moderação do feed de boletos (admin, A2 / mig 338).
 *
 * Fila: boletos esperando a conferência do beneficiário (só entram no feed
 * depois daqui) e boletos no ar com denúncia aberta. A régua do feed (teto,
 * quantidade, reserva, Esmeralda de quem ajuda, pausa) é um UPDATE, sem deploy.
 *
 * Admin interno: só pt, cantos retos (.fl-sharp), padrão das telas de admin.
 */
import { useCallback, useEffect, useState } from "react"
import { ExternalLink, Loader2, RefreshCw } from "lucide-react"
import { PageBackLink } from "@/components/tabloide/PageBackLink"
import { vitrinesApi, type AdminDebt, type DebtSettings } from "@/lib/vitrines-api"

const BTN = "fl-sharp inline-flex items-center gap-2 border-2 border-[#0B0B0D] px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-[0.1em]"
const money = (c: number) => (c / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
const day = (d: string) => new Date(`${String(d).slice(0, 10)}T12:00:00`).toLocaleDateString("pt-BR")
const line = (d?: string | null) => (d ? d.replace(/(\d{5})(\d{5})(\d{5})(\d{6})(\d{5})(\d{6})(\d)(\d+)/, "$1.$2 $3.$4 $5.$6 $7 $8") : "")

export default function AdminBoletosPage() {
  const [items, setItems] = useState<AdminDebt[] | null>(null)
  const [settings, setSettings] = useState<DebtSettings | null>(null)
  const [draft, setDraft] = useState<DebtSettings | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const [edit, setEdit] = useState<Record<number, string>>({})

  const reload = useCallback(() => {
    vitrinesApi.adminQueue().then((r) => setItems(r.items)).catch((e) => setMsg(String(e.message || e)))
    vitrinesApi
      .adminSettings()
      .then((r) => {
        setSettings(r.settings)
        setDraft(r.settings)
      })
      .catch(() => {})
  }, [])
  useEffect(reload, [reload])

  const act = async (key: string, fn: () => Promise<unknown>) => {
    setBusy(key)
    setMsg(null)
    try {
      await fn()
      reload()
    } catch (e) {
      setMsg(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(null)
    }
  }

  const ask = (q: string) => (typeof window !== "undefined" ? window.prompt(q) : null)

  return (
    <main className="fl-sharp mx-auto min-h-[100dvh] max-w-5xl px-4 pb-24 pt-6 text-[#F5F1E8]">
      <PageBackLink href="/admin" />
      <div className="mt-4 flex items-center justify-between gap-3">
        <h1 className="fl-display text-3xl">Feed de boletos</h1>
        <button type="button" onClick={reload} className={`${BTN} bg-[#1D1810] text-[#F5F1E8]`}>
          <RefreshCw className="h-3.5 w-3.5" /> Atualizar
        </button>
      </div>
      <p className="mt-1 text-sm text-[#9A938A]">
        A Freelandoo não recebe nem repassa dinheiro. Aqui só se confere o beneficiário antes do boleto ir ao feed e se resolvem denúncias (3 denúncias tiram do feed sozinhas).
      </p>
      {msg && <p className="mt-3 text-sm text-[#F2B705]">{msg}</p>}

      {draft && settings && (
        <section className="fl-sharp mt-6 grid gap-3 border-2 border-[#0B0B0D] bg-[#15120E] p-4 sm:grid-cols-5">
          {([
            ["max_open", "Boletos abertos por pessoa"],
            ["max_amount_cents", "Teto por boleto (centavos)"],
            ["reserve_minutes", "Reserva (min)"],
            ["helper_emerald", "Esmeralda para quem ajuda"],
          ] as [keyof DebtSettings, string][]).map(([k, label]) => (
            <label key={k} className="text-[11px] font-bold text-[#C9C2B6]">
              {label}
              <input
                type="number"
                value={Number(draft[k])}
                onChange={(e) => setDraft({ ...draft, [k]: Number(e.target.value) })}
                className="fl-sharp mt-1 w-full border-2 border-[#0B0B0D] bg-[#0B0B0D] px-2 py-1.5 text-sm text-[#F5F1E8]"
              />
            </label>
          ))}
          <div className="flex flex-col justify-end gap-2">
            <label className="flex items-center gap-2 text-[11px] font-bold text-[#C9C2B6]">
              <input type="checkbox" checked={draft.is_active} onChange={(e) => setDraft({ ...draft, is_active: e.target.checked })} /> Feed ligado
            </label>
            <button
              type="button"
              disabled={!!busy || JSON.stringify(draft) === JSON.stringify(settings)}
              onClick={() => act("settings", () => vitrinesApi.adminUpdateSettings(draft))}
              className={`${BTN} bg-[#F2B705] text-[#0B0B0D] disabled:opacity-50`}
            >
              Salvar régua
            </button>
          </div>
        </section>
      )}

      <section className="mt-6 space-y-3">
        {!items && <Loader2 className="mx-auto h-5 w-5 animate-spin text-[#9A938A]" />}
        {items && items.length === 0 && <p className="text-sm text-[#9A938A]">Nada na fila.</p>}
        {items?.map((b) => (
          <article key={b.id_bill} className="fl-sharp border-2 border-[#0B0B0D] bg-[#15120E] p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#9A938A]">
                  #{b.id_bill} · {b.status === "review" ? "Esperando revisão" : `No ar com ${b.reports.length} denúncia(s)`} · {b.bill_kind === "utility" ? "Consumo" : "Bancário"}
                  {b.expired ? " · VENCIDO" : ""}
                </p>
                <p className="mt-1 text-sm font-bold">{b.beneficiary}</p>
                <p className="text-xs text-[#9A938A]">
                  {money(b.amount_cents)} · vence {day(b.due_date)} · dono @{b.owner_username || "?"} ({b.owner_name || "sem nome"})
                </p>
                <code className="mt-1 block break-all text-[11px] text-[#C9C2B6]">{line(b.line_digits)}</code>
              </div>
            </div>
            {b.reports.length > 0 && (
              <ul className="mt-2 list-disc pl-5 text-xs text-[#C9A227]">
                {b.reports.map((r) => (
                  <li key={r.id_report}>{r.reason}</li>
                ))}
              </ul>
            )}
            {b.status === "review" && (
              <input
                value={edit[b.id_bill] ?? b.beneficiary}
                onChange={(e) => setEdit({ ...edit, [b.id_bill]: e.target.value })}
                maxLength={120}
                className="fl-sharp mt-3 w-full border-2 border-[#0B0B0D] bg-[#0B0B0D] px-2 py-1.5 text-sm text-[#F5F1E8]"
                aria-label="Beneficiário conferido"
              />
            )}
            <div className="mt-3 flex flex-wrap gap-2">
              {b.status === "review" ? (
                <>
                  <button
                    type="button"
                    disabled={!!busy}
                    onClick={() => act(`a-${b.id_bill}`, () => vitrinesApi.adminReview(b.id_bill, { approve: true, beneficiary: (edit[b.id_bill] ?? b.beneficiary).trim() }))}
                    className={`${BTN} bg-[#7BD88F] text-[#0B0B0D]`}
                  >
                    Aprovar para o feed
                  </button>
                  <button
                    type="button"
                    disabled={!!busy}
                    onClick={() => {
                      const reason = ask("Motivo da recusa (o dono vê):")
                      if (reason) void act(`r-${b.id_bill}`, () => vitrinesApi.adminReview(b.id_bill, { approve: false, reason }))
                    }}
                    className={`${BTN} bg-[#1D1810] text-[#F5F1E8]`}
                  >
                    Recusar
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    disabled={!!busy}
                    onClick={() => {
                      const reason = ask("Motivo da retirada (o dono vê):")
                      if (reason) void act(`x-${b.id_bill}`, () => vitrinesApi.adminRemove(b.id_bill, reason))
                    }}
                    className={`${BTN} bg-[#C0392B] text-[#F5F1E8]`}
                  >
                    Retirar do feed
                  </button>
                  <button type="button" disabled={!!busy} onClick={() => act(`k-${b.id_bill}`, () => vitrinesApi.adminResolveReports(b.id_bill))} className={`${BTN} bg-[#1D1810] text-[#F5F1E8]`}>
                    Denúncias improcedentes
                  </button>
                </>
              )}
              {b.has_proof && (
                <button
                  type="button"
                  disabled={!!busy}
                  onClick={() => act(`p-${b.id_bill}`, async () => window.open((await vitrinesApi.adminProofUrl(b.id_bill)).url, "_blank", "noopener"))}
                  className={`${BTN} bg-[#1D1810] text-[#F5F1E8]`}
                >
                  <ExternalLink className="h-3.5 w-3.5" /> Comprovante
                </button>
              )}
            </div>
          </article>
        ))}
      </section>
    </main>
  )
}
