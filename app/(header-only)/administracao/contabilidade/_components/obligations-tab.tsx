"use client"

/**
 * Guias e obrigações: o que pagar, o que declarar, o que venceu e quanto ficou.
 * A estimativa de multa + juros é só ordem de grandeza — o valor oficial é o
 * da guia recalculada no portal (a tela diz isso ao lado do número).
 */
import { useCallback, useEffect, useRef, useState } from "react"
import {
  Loader2, Plus, CalendarPlus, CheckCircle2, FileCheck2, Ban, RotateCcw,
  Paperclip, ExternalLink, Pencil, Trash2, AlertTriangle,
} from "lucide-react"
import {
  api, uploadReceipt, brl, pct, fmtDate, fmtMonth, centsToInput, todayLocal,
  STATUS_LABEL, SPHERE_LABEL, INPUT, BTN_PRIMARY, BTN_GHOST, Field, Modal, Notice,
  type Company, type Obligation,
} from "./accounting-ui"

type Filter = "pending" | "paid" | "filed" | "canceled" | "all"

export function ObligationsTab({ company, onChanged }: { company: Company; onChanged: () => void }) {
  const [rows, setRows] = useState<Obligation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<Filter>("pending")
  const [editing, setEditing] = useState<Obligation | "new" | null>(null)
  const [paying, setPaying] = useState<Obligation | null>(null)
  const [generating, setGenerating] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const receiptTarget = useRef<string | null>(null)

  const load = useCallback(() => {
    setLoading(true)
    setError(null)
    const q = filter === "all" ? "" : `?status=${filter}`
    api<{ obligations: Obligation[] }>(`companies/${company.id_company}/obligations${q}`)
      .then((d) => setRows(d.obligations || []))
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false))
  }, [company.id_company, filter])

  useEffect(() => { load() }, [load])

  const refresh = () => { load(); onChanged() }

  async function setStatus(ob: Obligation, status: Obligation["status"], extra: Record<string, unknown> = {}) {
    setBusyId(ob.id_obligation)
    try {
      await api(`companies/${company.id_company}/obligations/${ob.id_obligation}/status`, {
        method: "POST",
        body: { status, ...extra },
      })
      refresh()
    } catch (e) {
      alert((e as Error).message)
    } finally {
      setBusyId(null)
    }
  }

  async function remove(ob: Obligation) {
    if (!confirm(`Apagar "${ob.name}"? O comprovante anexado também é apagado.`)) return
    setBusyId(ob.id_obligation)
    try {
      await api(`companies/${company.id_company}/obligations/${ob.id_obligation}`, { method: "DELETE" })
      refresh()
    } catch (e) {
      alert((e as Error).message)
    } finally {
      setBusyId(null)
    }
  }

  async function openReceipt(ob: Obligation) {
    try {
      const d = await api<{ url: string }>(`companies/${company.id_company}/obligations/${ob.id_obligation}/receipt`)
      window.open(d.url, "_blank", "noopener,noreferrer")
    } catch (e) {
      alert((e as Error).message)
    }
  }

  async function onFile(file: File | undefined) {
    const id = receiptTarget.current
    if (!file || !id) return
    setBusyId(id)
    try {
      await uploadReceipt(company.id_company, id, file)
      load()
    } catch (e) {
      alert((e as Error).message)
    } finally {
      setBusyId(null)
      receiptTarget.current = null
      if (fileRef.current) fileRef.current.value = ""
    }
  }

  return (
    <section className="space-y-4">
      <input
        ref={fileRef}
        type="file"
        accept="application/pdf,image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => onFile(e.target.files?.[0])}
      />

      <div className="flex flex-wrap items-center gap-2">
        {(["pending", "paid", "filed", "canceled", "all"] as Filter[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`border px-3 py-1.5 text-xs font-semibold ${
              filter === f
                ? "border-primary/50 bg-primary/15 text-primary"
                : "border-border bg-card text-muted-foreground hover:text-foreground"
            }`}
          >
            {f === "all" ? "Todas" : STATUS_LABEL[f]}
          </button>
        ))}
        <div className="ml-auto flex flex-wrap gap-2">
          <button className={BTN_GHOST} onClick={() => setGenerating(true)}>
            <CalendarPlus className="h-4 w-4" /> Gerar calendário do ano
          </button>
          <button className={BTN_PRIMARY} onClick={() => setEditing("new")}>
            <Plus className="h-4 w-4" /> Nova guia
          </button>
        </div>
      </div>

      {error && <Notice tone="error">{error}</Notice>}

      {loading ? (
        <div className="flex justify-center border border-border bg-card py-12">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : rows.length === 0 ? (
        <div className="border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">
          Nenhuma guia aqui. Cadastre uma guia (TFE, DARF, DAS…) ou gere o calendário do ano.
        </div>
      ) : (
        <div className="space-y-2">
          {rows.map((ob) => (
            <ObligationRow
              key={ob.id_obligation}
              ob={ob}
              busy={busyId === ob.id_obligation}
              onPay={() => setPaying(ob)}
              onFile={() => setStatus(ob, "filed")}
              onCancel={() => { if (confirm(`Marcar "${ob.name}" como cancelada (não era devida ou foi substituída)?`)) setStatus(ob, "canceled") }}
              onReopen={() => setStatus(ob, "pending")}
              onEdit={() => setEditing(ob)}
              onDelete={() => remove(ob)}
              onAttach={() => { receiptTarget.current = ob.id_obligation; fileRef.current?.click() }}
              onOpenReceipt={() => openReceipt(ob)}
            />
          ))}
        </div>
      )}

      {editing && (
        <ObligationForm
          company={company}
          initial={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); refresh() }}
        />
      )}
      {paying && (
        <PayForm
          company={company}
          ob={paying}
          onClose={() => setPaying(null)}
          onSaved={() => { setPaying(null); refresh() }}
        />
      )}
      {generating && (
        <GenerateForm
          company={company}
          onClose={() => setGenerating(false)}
          onDone={() => { setGenerating(false); setFilter("pending"); refresh() }}
        />
      )}
    </section>
  )
}

function ObligationRow({
  ob, busy, onPay, onFile, onCancel, onReopen, onEdit, onDelete, onAttach, onOpenReceipt,
}: {
  ob: Obligation
  busy: boolean
  onPay: () => void
  onFile: () => void
  onCancel: () => void
  onReopen: () => void
  onEdit: () => void
  onDelete: () => void
  onAttach: () => void
  onOpenReceipt: () => void
}) {
  const lc = ob.late_charges
  const statusTone = ob.overdue
    ? "border-red-500/40 bg-red-500/10 text-red-300"
    : ob.status === "pending"
      ? "border-amber-500/40 bg-amber-500/10 text-amber-300"
      : ob.status === "canceled"
        ? "border-white/20 bg-white/5 text-muted-foreground"
        : "border-green-500/40 bg-green-500/10 text-green-300"

  return (
    <div className={`border bg-card p-4 ${ob.overdue ? "border-red-500/40" : "border-border"}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-bold text-foreground">{ob.name}</p>
            <span className={`border px-2 py-0.5 text-[11px] font-semibold ${statusTone}`}>
              {ob.overdue ? "Vencida" : STATUS_LABEL[ob.status]}
            </span>
            <span className="border border-border px-2 py-0.5 text-[11px] text-muted-foreground">
              {SPHERE_LABEL[ob.sphere]} · {ob.kind === "payment" ? "guia" : "declaração"}
            </span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Vence {fmtDate(ob.due_date)}
            {ob.competence && <> · competência {fmtMonth(ob.competence)}</>}
            {ob.paid_at && <> · {ob.status === "filed" ? "entregue" : "paga"} em {fmtDate(ob.paid_at)}</>}
          </p>
          {ob.notes && <p className="mt-1 text-xs text-muted-foreground">{ob.notes}</p>}
        </div>

        <div className="text-right">
          {ob.kind === "payment" && (
            <p className="text-lg font-bold text-foreground">
              {ob.status === "paid" ? brl(ob.paid_amount_cents) : ob.amount_cents == null ? "valor a definir" : brl(ob.amount_cents)}
            </p>
          )}
          {lc && (
            <div className="mt-1 text-xs text-red-300">
              <p className="font-semibold">≈ {brl(lc.total_cents)} hoje</p>
              <p>
                {lc.days_late} dias · multa {pct(lc.fine_rate)} + juros {pct(lc.interest_rate)}
                {lc.estimated && " (Selic estimada)"}
              </p>
            </div>
          )}
        </div>
      </div>

      {ob.overdue && ob.kind === "payment" && (
        <p className="mt-3 flex items-start gap-2 text-xs text-amber-200">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          Guia vencida não é aceita pelo banco: gere a guia recalculada no portal (Sicalc/e-CAC, PGDAS-D ou
          prefeitura). O valor acima é estimativa.
        </p>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        {busy && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
        {ob.status === "pending" && ob.kind === "payment" && (
          <button className={BTN_PRIMARY} onClick={onPay} disabled={busy}>
            <CheckCircle2 className="h-4 w-4" /> Marcar paga
          </button>
        )}
        {ob.status === "pending" && ob.kind === "declaration" && (
          <button className={BTN_PRIMARY} onClick={onFile} disabled={busy}>
            <FileCheck2 className="h-4 w-4" /> Marcar entregue
          </button>
        )}
        {ob.status === "pending" && (
          <button className={BTN_GHOST} onClick={onCancel} disabled={busy}>
            <Ban className="h-4 w-4" /> Cancelar
          </button>
        )}
        {ob.status !== "pending" && (
          <button className={BTN_GHOST} onClick={onReopen} disabled={busy}>
            <RotateCcw className="h-4 w-4" /> Reabrir
          </button>
        )}
        <button className={BTN_GHOST} onClick={onAttach} disabled={busy}>
          <Paperclip className="h-4 w-4" /> {ob.receipt_key ? "Trocar comprovante" : "Anexar comprovante"}
        </button>
        {ob.receipt_key && (
          <button className={BTN_GHOST} onClick={onOpenReceipt} disabled={busy}>
            <ExternalLink className="h-4 w-4" /> Ver comprovante
          </button>
        )}
        <button className={BTN_GHOST} onClick={onEdit} disabled={busy} aria-label="Editar">
          <Pencil className="h-4 w-4" />
        </button>
        <button className={BTN_GHOST} onClick={onDelete} disabled={busy} aria-label="Apagar">
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}

const PRESETS: { label: string; name: string; sphere: Obligation["sphere"]; kind: Obligation["kind"] }[] = [
  { label: "TFE", name: "TFE", sphere: "municipal", kind: "payment" },
  { label: "DARF", name: "DARF", sphere: "federal", kind: "payment" },
  { label: "DAS", name: "DAS (PGDAS-D)", sphere: "federal", kind: "payment" },
  { label: "ISS", name: "ISS", sphere: "municipal", kind: "payment" },
  { label: "DCTFWeb", name: "DCTFWeb", sphere: "federal", kind: "declaration" },
  { label: "DEFIS", name: "DEFIS", sphere: "federal", kind: "declaration" },
]

function ObligationForm({
  company, initial, onClose, onSaved,
}: {
  company: Company
  initial: Obligation | null
  onClose: () => void
  onSaved: () => void
}) {
  const [kind, setKind] = useState<Obligation["kind"]>(initial?.kind || "payment")
  const [name, setName] = useState(initial?.name || "")
  const [sphere, setSphere] = useState<Obligation["sphere"]>(initial?.sphere || "federal")
  const [competence, setCompetence] = useState(initial?.competence?.slice(0, 7) || "")
  const [dueDate, setDueDate] = useState(initial?.due_date || "")
  const [amount, setAmount] = useState(centsToInput(initial?.amount_cents))
  const [notes, setNotes] = useState(initial?.notes || "")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function save() {
    setSaving(true)
    setError(null)
    const body = { kind, name, sphere, competence: competence || null, due_date: dueDate, amount: kind === "payment" ? amount : null, notes }
    try {
      if (initial) {
        await api(`companies/${company.id_company}/obligations/${initial.id_obligation}`, { method: "PUT", body })
      } else {
        await api(`companies/${company.id_company}/obligations`, { method: "POST", body })
      }
      onSaved()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal title={initial ? "Editar guia" : "Nova guia"} onClose={onClose}>
      <div className="space-y-3">
        {!initial && (
          <div className="flex flex-wrap gap-2">
            {PRESETS.map((p) => (
              <button
                key={p.label}
                type="button"
                className={BTN_GHOST}
                onClick={() => { setName(p.name); setSphere(p.sphere); setKind(p.kind) }}
              >
                {p.label}
              </button>
            ))}
          </div>
        )}
        <div className="grid grid-cols-2 gap-3">
          <Field label="Tipo">
            <select className={INPUT} value={kind} onChange={(e) => setKind(e.target.value as Obligation["kind"])}>
              <option value="payment">Guia a pagar</option>
              <option value="declaration">Declaração</option>
            </select>
          </Field>
          <Field label="Esfera">
            <select className={INPUT} value={sphere} onChange={(e) => setSphere(e.target.value as Obligation["sphere"])}>
              <option value="federal">Federal</option>
              <option value="estadual">Estadual</option>
              <option value="municipal">Municipal</option>
            </select>
          </Field>
        </div>
        <Field label="Nome">
          <input className={INPUT} value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: DARF unificado" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Vencimento">
            <input type="date" className={INPUT} value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </Field>
          <Field label="Competência" hint="Mês de referência (opcional)">
            <input type="month" className={INPUT} value={competence} onChange={(e) => setCompetence(e.target.value)} />
          </Field>
        </div>
        {kind === "payment" && (
          <Field label="Valor original (R$)" hint="O valor da guia sem multa nem juros">
            <input className={INPUT} value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="236,35" inputMode="decimal" />
          </Field>
        )}
        <Field label="Observação">
          <textarea className={INPUT} rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </Field>
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

function PayForm({
  company, ob, onClose, onSaved,
}: {
  company: Company
  ob: Obligation
  onClose: () => void
  onSaved: () => void
}) {
  const [paidAt, setPaidAt] = useState(todayLocal())
  // Vencida: sugere o valor com acréscimos — é o que vai sair do banco.
  const [amount, setAmount] = useState(centsToInput(ob.late_charges?.total_cents ?? ob.amount_cents))
  const [register, setRegister] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function save() {
    setSaving(true)
    setError(null)
    try {
      await api(`companies/${company.id_company}/obligations/${ob.id_obligation}/status`, {
        method: "POST",
        body: { status: "paid", paid_at: paidAt, paid_amount: amount, register_entry: register },
      })
      onSaved()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal title={`Pagar: ${ob.name}`} onClose={onClose}>
      <div className="space-y-3">
        {ob.late_charges && (
          <Notice tone="warn">
            Estimativa: {brl(ob.late_charges.principal_cents)} + multa {brl(ob.late_charges.fine_cents)} + juros{" "}
            {brl(ob.late_charges.interest_cents)}. Informe abaixo o valor que realmente saiu da conta.
          </Notice>
        )}
        <div className="grid grid-cols-2 gap-3">
          <Field label="Data do pagamento">
            <input type="date" className={INPUT} value={paidAt} onChange={(e) => setPaidAt(e.target.value)} />
          </Field>
          <Field label="Valor pago (R$)">
            <input className={INPUT} value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal" />
          </Field>
        </div>
        <label className="flex items-center gap-2 text-sm text-foreground">
          <input type="checkbox" checked={register} onChange={(e) => setRegister(e.target.checked)} />
          Lançar a saída no livro caixa
        </label>
        {error && <Notice tone="error">{error}</Notice>}
        <div className="flex justify-end gap-2">
          <button className={BTN_GHOST} onClick={onClose}>Cancelar</button>
          <button className={BTN_PRIMARY} onClick={save} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin" />} Confirmar pagamento
          </button>
        </div>
      </div>
    </Modal>
  )
}

function GenerateForm({ company, onClose, onDone }: { company: Company; onClose: () => void; onDone: () => void }) {
  const [year, setYear] = useState(Number(todayLocal().slice(0, 4)))
  const [dctfweb, setDctfweb] = useState(false)
  const [saving, setSaving] = useState(false)
  const [result, setResult] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function run() {
    setSaving(true)
    setError(null)
    try {
      const d = await api<{ created: number; skipped: number }>(`companies/${company.id_company}/obligations/generate`, {
        method: "POST",
        body: { year, dctfweb },
      })
      setResult(`${d.created} criadas, ${d.skipped} já existiam.`)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  const canGenerate = company.regime === "simples" || company.regime === "mei" || dctfweb

  return (
    <Modal title="Gerar calendário do ano" onClose={result ? onDone : onClose}>
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Cria as obrigações recorrentes de {company.regime === "mei" ? "MEI (DAS-MEI e DASN-SIMEI)" : "Simples (DAS mensal e DEFIS)"}.
          Rodar de novo só completa o que falta. Taxas municipais (TFE, IPTU) não entram: o vencimento muda por cidade
          — cadastre pela &quot;Nova guia&quot;.
        </p>
        <Field label="Ano">
          <input type="number" className={INPUT} value={year} onChange={(e) => setYear(Number(e.target.value))} />
        </Field>
        <label className="flex items-start gap-2 text-sm text-foreground">
          <input type="checkbox" className="mt-1" checked={dctfweb} onChange={(e) => setDctfweb(e.target.checked)} />
          <span>
            Incluir DCTFWeb mensal
            <span className="block text-xs text-muted-foreground">
              Só se houver pró-labore ou funcionário declarado — é dela que sai o &quot;DARF unificado&quot;.
            </span>
          </span>
        </label>
        {!canGenerate && <Notice tone="warn">Para este regime, só a DCTFWeb é gerada automaticamente.</Notice>}
        {error && <Notice tone="error">{error}</Notice>}
        {result && <Notice>{result}</Notice>}
        <div className="flex justify-end gap-2">
          {result ? (
            <button className={BTN_PRIMARY} onClick={onDone}>Fechar</button>
          ) : (
            <>
              <button className={BTN_GHOST} onClick={onClose}>Cancelar</button>
              <button className={BTN_PRIMARY} onClick={run} disabled={saving || !canGenerate}>
                {saving && <Loader2 className="h-4 w-4 animate-spin" />} Gerar
              </button>
            </>
          )}
        </div>
      </div>
    </Modal>
  )
}
