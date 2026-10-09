"use client"

/**
 * Livro caixa: a ME no Simples pode escriturar só ele (LC 123, art. 26 §2º).
 * O TIPO do lançamento decide a direção e o papel na conta do DAS — o valor
 * é sempre positivo.
 */
import { useCallback, useEffect, useState } from "react"
import { Loader2, Plus, Pencil, Trash2 } from "lucide-react"
import {
  api, brl, fmtDate, centsToInput, todayLocal, ENTRY_TYPE_LABEL, IN_TYPES,
  INPUT, BTN_PRIMARY, BTN_GHOST, Field, Modal, Notice,
  type Company, type Entry, type EntryType,
} from "./accounting-ui"

function monthRange(month: string) {
  const [y, m] = month.split("-").map(Number)
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate()
  return { from: `${month}-01`, to: `${month}-${String(last).padStart(2, "0")}` }
}

export function LedgerTab({ company, onChanged }: { company: Company; onChanged: () => void }) {
  const [month, setMonth] = useState(todayLocal().slice(0, 7))
  const [allTime, setAllTime] = useState(false)
  const [rows, setRows] = useState<Entry[]>([])
  const [totals, setTotals] = useState({ in: 0, out: 0, balance: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState<Entry | "new" | null>(null)

  const load = useCallback(() => {
    setLoading(true)
    setError(null)
    const q = allTime ? "" : `?from=${monthRange(month).from}&to=${monthRange(month).to}`
    api<{ entries: Entry[]; totals: typeof totals }>(`companies/${company.id_company}/entries${q}`)
      .then((d) => { setRows(d.entries || []); setTotals(d.totals) })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false))
  }, [company.id_company, month, allTime])

  useEffect(() => { load() }, [load])

  async function remove(e: Entry) {
    if (!confirm(`Apagar o lançamento "${e.description}"?`)) return
    try {
      await api(`companies/${company.id_company}/entries/${e.id_entry}`, { method: "DELETE" })
      load(); onChanged()
    } catch (err) {
      alert((err as Error).message)
    }
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <Field label="Mês">
          <input
            type="month"
            className={INPUT}
            value={month}
            disabled={allTime}
            onChange={(e) => setMonth(e.target.value)}
          />
        </Field>
        <label className="flex items-center gap-2 pb-2 text-sm text-foreground">
          <input type="checkbox" checked={allTime} onChange={(e) => setAllTime(e.target.checked)} />
          Todo o período
        </label>
        <button className={`${BTN_PRIMARY} ml-auto`} onClick={() => setEditing("new")}>
          <Plus className="h-4 w-4" /> Novo lançamento
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Kpi label="Entradas" value={brl(totals.in)} tone="text-green-400" />
        <Kpi label="Saídas" value={brl(totals.out)} tone="text-red-400" />
        <Kpi label="Saldo" value={brl(totals.balance)} tone={totals.balance < 0 ? "text-red-400" : "text-foreground"} />
      </div>

      {error && <Notice tone="error">{error}</Notice>}

      {loading ? (
        <div className="flex justify-center border border-border bg-card py-12">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : rows.length === 0 ? (
        <div className="border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">
          Nenhum lançamento no período. Sem faturamento no mês, o PGDAS-D é declarado com valor zero.
        </div>
      ) : (
        <div className="overflow-x-auto border border-border">
          <table className="w-full text-sm">
            <thead className="bg-card text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-3 py-2">Data</th>
                <th className="px-3 py-2">Tipo</th>
                <th className="px-3 py-2">Descrição</th>
                <th className="px-3 py-2 text-right">Valor</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {rows.map((e) => {
                const isIn = IN_TYPES.has(e.entry_type)
                return (
                  <tr key={e.id_entry} className="border-t border-border">
                    <td className="whitespace-nowrap px-3 py-2 text-muted-foreground">{fmtDate(e.entry_date)}</td>
                    <td className="whitespace-nowrap px-3 py-2">{ENTRY_TYPE_LABEL[e.entry_type]}</td>
                    <td className="px-3 py-2 text-foreground">
                      {e.description}
                      {e.counterparty && <span className="block text-xs text-muted-foreground">{e.counterparty}</span>}
                    </td>
                    <td className={`whitespace-nowrap px-3 py-2 text-right font-semibold ${isIn ? "text-green-400" : "text-red-400"}`}>
                      {isIn ? "+" : "−"} {brl(e.amount_cents)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-right">
                      <button className="p-1 text-muted-foreground hover:text-foreground" aria-label="Editar" onClick={() => setEditing(e)}>
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button className="p-1 text-muted-foreground hover:text-red-400" aria-label="Apagar" onClick={() => remove(e)}>
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {editing && (
        <EntryForm
          company={company}
          initial={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); load(); onChanged() }}
        />
      )}
    </section>
  )
}

function Kpi({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <div className="border border-border bg-card p-3">
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={`mt-1 text-xl font-bold ${tone}`}>{value}</p>
    </div>
  )
}

function EntryForm({
  company, initial, onClose, onSaved,
}: {
  company: Company
  initial: Entry | null
  onClose: () => void
  onSaved: () => void
}) {
  const [entryDate, setEntryDate] = useState(initial?.entry_date || todayLocal())
  const [entryType, setEntryType] = useState<EntryType>(initial?.entry_type || "revenue")
  const [amount, setAmount] = useState(centsToInput(initial?.amount_cents))
  const [description, setDescription] = useState(initial?.description || "")
  const [counterparty, setCounterparty] = useState(initial?.counterparty || "")
  const [documentRef, setDocumentRef] = useState(initial?.document_ref || "")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function save() {
    setSaving(true)
    setError(null)
    const body = { entry_date: entryDate, entry_type: entryType, amount, description, counterparty, document_ref: documentRef }
    try {
      if (initial) {
        await api(`companies/${company.id_company}/entries/${initial.id_entry}`, { method: "PUT", body })
      } else {
        await api(`companies/${company.id_company}/entries`, { method: "POST", body })
      }
      onSaved()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal title={initial ? "Editar lançamento" : "Novo lançamento"} onClose={onClose}>
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Data">
            <input type="date" className={INPUT} value={entryDate} onChange={(e) => setEntryDate(e.target.value)} />
          </Field>
          <Field label="Tipo">
            <select className={INPUT} value={entryType} onChange={(e) => setEntryType(e.target.value as EntryType)}>
              {(Object.keys(ENTRY_TYPE_LABEL) as EntryType[]).map((k) => (
                <option key={k} value={k}>{ENTRY_TYPE_LABEL[k]}</option>
              ))}
            </select>
          </Field>
        </div>
        {entryType === "revenue" && (
          <p className="text-xs text-muted-foreground">Faturamento entra na base do DAS e na receita dos 12 meses.</p>
        )}
        {(entryType === "prolabore" || entryType === "payroll") && (
          <p className="text-xs text-muted-foreground">Entra na folha usada pelo Fator R.</p>
        )}
        <Field label="Valor (R$)">
          <input className={INPUT} value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="1.500,00" inputMode="decimal" />
        </Field>
        <Field label="Descrição">
          <input className={INPUT} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Ex.: Serviço de site para cliente X" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Cliente / fornecedor">
            <input className={INPUT} value={counterparty} onChange={(e) => setCounterparty(e.target.value)} />
          </Field>
          <Field label="Documento" hint="Nº da nota, recibo…">
            <input className={INPUT} value={documentRef} onChange={(e) => setDocumentRef(e.target.value)} />
          </Field>
        </div>
        {error && <Notice tone="error">{error}</Notice>}
        <div className="flex justify-end gap-2">
          <button className={BTN_GHOST} onClick={onClose}>Cancelar</button>
          <button className={BTN_PRIMARY} onClick={save} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin" />} Salvar
          </button>
        </div>
      </div>
    </Modal>
  )
}
