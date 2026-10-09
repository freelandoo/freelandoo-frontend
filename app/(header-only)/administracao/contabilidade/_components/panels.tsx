"use client"

/**
 * As abas menores do painel de Contabilidade: Painel (resumo), DAS, Selic e o
 * formulário da empresa.
 */
import { useCallback, useEffect, useState } from "react"
import { Loader2, AlertTriangle, CalendarClock, Calculator, Trash2 } from "lucide-react"
import {
  api, brl, pct, fmtDate, fmtMonth, todayLocal, formatCnpj,
  REGIME_LABEL, ANEXO_OPTIONS, INPUT, BTN_PRIMARY, BTN_GHOST, Field, Modal, Notice,
  type Company, type Obligation, type Regime,
} from "./accounting-ui"

// ─── Painel ──────────────────────────────────────────────────────────────────
interface DasEstimate {
  competence: string
  due_date: string
  anexo_applied: string
  fator_r: number | null
  bracket: number
  nominal_rate: number
  effective_rate: number
  revenue_cents: number
  rbt12_cents: number
  payroll12_cents: number
  das_cents: number
  over_ceiling: boolean
}

interface Dashboard {
  today: string
  overdue: Obligation[]
  upcoming: Obligation[]
  overdue_total: { principal: number; with_charges: number; estimated: boolean }
  month: { in: number; out: number; balance: number; revenue: number }
  series: { month: string; in: number; out: number; revenue: number }[]
  das: (DasEstimate & { error?: string }) | null
}

export function DashboardTab({ company, version, onGoTo }: { company: Company; version: number; onGoTo: (tab: "obligations" | "das") => void }) {
  const [data, setData] = useState<Dashboard | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setData(null)
    setError(null)
    api<Dashboard>(`companies/${company.id_company}/dashboard`)
      .then(setData)
      .catch((e: Error) => setError(e.message))
  }, [company.id_company, version])

  if (error) return <Notice tone="error">{error}</Notice>
  if (!data) {
    return (
      <div className="flex justify-center border border-border bg-card py-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    )
  }

  const t = data.overdue_total
  return (
    <section className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="Em atraso (original)" value={brl(t.principal)} tone={t.principal ? "text-red-400" : "text-foreground"} hint={`${data.overdue.length} guia(s)`} />
        <Kpi label="Em atraso hoje (estim.)" value={brl(t.with_charges)} tone={t.with_charges ? "text-red-400" : "text-foreground"} hint={t.estimated ? "com Selic estimada" : "multa + juros"} />
        <Kpi label="Entradas no mês" value={brl(data.month.in)} tone="text-green-400" hint={`faturamento ${brl(data.month.revenue)}`} />
        <Kpi label="Saídas no mês" value={brl(data.month.out)} tone="text-foreground" hint={`saldo ${brl(data.month.balance)}`} />
      </div>

      {data.overdue.length > 0 && (
        <div className="space-y-2">
          <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-red-300">
            <AlertTriangle className="h-4 w-4" /> Em atraso
          </h3>
          <ObligationList items={data.overdue} />
          <button className={BTN_PRIMARY} onClick={() => onGoTo("obligations")}>Resolver nas guias</button>
        </div>
      )}

      <div className="space-y-2">
        <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-muted-foreground">
          <CalendarClock className="h-4 w-4" /> Próximos 30 dias
        </h3>
        {data.upcoming.length === 0 ? (
          <p className="border border-dashed border-border bg-card p-4 text-sm text-muted-foreground">
            Nada vencendo nos próximos 30 dias. Gere o calendário do ano na aba Guias para não depender da memória.
          </p>
        ) : (
          <ObligationList items={data.upcoming} />
        )}
      </div>

      {data.das && !data.das.error && (
        <div className="border border-border bg-card p-4">
          <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-muted-foreground">
            <Calculator className="h-4 w-4" /> DAS estimado — competência {fmtMonth(data.das.competence)}
          </h3>
          <p className="mt-2 text-2xl font-bold text-foreground">{brl(data.das.das_cents)}</p>
          <p className="text-xs text-muted-foreground">
            Faturamento do mês {brl(data.das.revenue_cents)} · Anexo {data.das.anexo_applied} · alíquota efetiva{" "}
            {pct(data.das.effective_rate)} · vence {fmtDate(data.das.due_date)}
          </p>
          <button className={`${BTN_GHOST} mt-3`} onClick={() => onGoTo("das")}>Ver o cálculo</button>
        </div>
      )}

      {data.series.length > 0 && (
        <div className="overflow-x-auto border border-border">
          <table className="w-full text-sm">
            <thead className="bg-card text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-3 py-2">Mês</th>
                <th className="px-3 py-2 text-right">Faturamento</th>
                <th className="px-3 py-2 text-right">Entradas</th>
                <th className="px-3 py-2 text-right">Saídas</th>
                <th className="px-3 py-2 text-right">Saldo</th>
              </tr>
            </thead>
            <tbody>
              {[...data.series].reverse().map((s) => (
                <tr key={s.month} className="border-t border-border">
                  <td className="px-3 py-2">{fmtMonth(s.month)}</td>
                  <td className="px-3 py-2 text-right">{brl(s.revenue)}</td>
                  <td className="px-3 py-2 text-right text-green-400">{brl(s.in)}</td>
                  <td className="px-3 py-2 text-right text-red-400">{brl(s.out)}</td>
                  <td className="px-3 py-2 text-right font-semibold">{brl(s.in - s.out)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}

function ObligationList({ items }: { items: Obligation[] }) {
  return (
    <div className="divide-y divide-border border border-border bg-card">
      {items.map((o) => (
        <div key={o.id_obligation} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm">
          <div>
            <p className="font-semibold text-foreground">{o.name}</p>
            <p className="text-xs text-muted-foreground">
              vence {fmtDate(o.due_date)}{o.competence && ` · competência ${fmtMonth(o.competence)}`}
            </p>
          </div>
          <div className="text-right">
            {o.kind === "declaration" ? (
              <p className="text-xs text-muted-foreground">declaração</p>
            ) : (
              <p className="font-semibold">{o.amount_cents == null ? "valor a definir" : brl(o.amount_cents)}</p>
            )}
            {o.late_charges && <p className="text-xs text-red-300">≈ {brl(o.late_charges.total_cents)} hoje</p>}
          </div>
        </div>
      ))}
    </div>
  )
}

function Kpi({ label, value, tone, hint }: { label: string; value: string; tone: string; hint?: string }) {
  return (
    <div className="border border-border bg-card p-3">
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={`mt-1 text-xl font-bold ${tone}`}>{value}</p>
      {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  )
}

// ─── DAS ─────────────────────────────────────────────────────────────────────
function prevMonth() {
  const [y, m] = todayLocal().split("-").map(Number)
  const d = new Date(Date.UTC(y, m - 2, 1))
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`
}

export function DasTab({ company }: { company: Company }) {
  const [competence, setCompetence] = useState(prevMonth())
  const [anexo, setAnexo] = useState(company.simples_anexo || "III_V")
  const [das, setDas] = useState<DasEstimate | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const run = useCallback(() => {
    setLoading(true)
    setError(null)
    api<{ das: DasEstimate }>(`companies/${company.id_company}/das?competence=${competence}&anexo=${anexo}`)
      .then((d) => setDas(d.das))
      .catch((e: Error) => { setDas(null); setError(e.message) })
      .finally(() => setLoading(false))
  }, [company.id_company, competence, anexo])

  useEffect(() => { run() }, [run])

  if (company.regime !== "simples") {
    return (
      <Notice>
        A estimativa de DAS vale para empresas do Simples Nacional. Esta está como {REGIME_LABEL[company.regime]}
        {company.regime === "mei" && " — no MEI o DAS tem valor fixo mensal"}.
      </Notice>
    )
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <Field label="Competência">
          <input type="month" className={INPUT} value={competence} onChange={(e) => setCompetence(e.target.value)} />
        </Field>
        <Field label="Anexo">
          <select className={INPUT} value={anexo} onChange={(e) => setAnexo(e.target.value)}>
            {ANEXO_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </Field>
        {loading && <Loader2 className="mb-2 h-5 w-5 animate-spin text-primary" />}
      </div>

      {error && <Notice tone="error">{error}</Notice>}

      {das && (
        <div className="space-y-3 border border-border bg-card p-4">
          <p className="text-3xl font-bold text-foreground">{brl(das.das_cents)}</p>
          <p className="text-sm text-muted-foreground">vence {fmtDate(das.due_date)}</p>
          <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
            <Row k="Faturamento do mês" v={brl(das.revenue_cents)} />
            <Row k="Receita dos 12 meses anteriores (RBT12)" v={brl(das.rbt12_cents)} />
            <Row k="Folha dos 12 meses (pró-labore + salários)" v={brl(das.payroll12_cents)} />
            {das.fator_r != null && <Row k="Fator R" v={`${pct(das.fator_r)} (${das.fator_r >= 0.28 ? "≥" : "<"} 28%)`} />}
            <Row k="Anexo aplicado" v={das.anexo_applied} />
            <Row k="Faixa" v={`${das.bracket}ª · nominal ${pct(das.nominal_rate)}`} />
            <Row k="Alíquota efetiva" v={pct(das.effective_rate)} />
          </dl>
          {das.revenue_cents === 0 && (
            <Notice>Sem faturamento no mês: declare o PGDAS-D com valor zero. Não há DAS a pagar.</Notice>
          )}
          {das.over_ceiling && <Notice tone="warn">A receita dos 12 meses passou do teto do Simples (R$ 4,8 milhões).</Notice>}
          <p className="text-xs text-muted-foreground">
            Estimativa a partir do livro caixa (lançamentos do tipo Faturamento, Pró-labore e Salário). O valor oficial é o
            calculado no PGDAS-D — retenções, ISS fixo e substituição tributária mudam a conta.
          </p>
        </div>
      )}
    </section>
  )
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-3 border-b border-border/50 py-1">
      <dt className="text-muted-foreground">{k}</dt>
      <dd className="font-semibold text-foreground">{v}</dd>
    </div>
  )
}

// ─── Selic ───────────────────────────────────────────────────────────────────
export function SelicTab({ onChanged }: { onChanged: () => void }) {
  const [rows, setRows] = useState<{ month: string; rate: number }[]>([])
  const [month, setMonth] = useState(prevMonth())
  const [rate, setRate] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const load = useCallback(() => {
    api<{ selic: { month: string; rate: number }[] }>("selic")
      .then((d) => setRows(d.selic || []))
      .catch((e: Error) => setError(e.message))
  }, [])

  useEffect(() => { load() }, [load])

  async function save() {
    setSaving(true)
    setError(null)
    try {
      await api("selic", { method: "PUT", body: { month, rate_percent: rate } })
      setRate("")
      load(); onChanged()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  async function remove(m: string) {
    try {
      await api(`selic/${m}`, { method: "DELETE" })
      load(); onChanged()
    } catch (e) {
      setError((e as Error).message)
    }
  }

  return (
    <section className="space-y-4">
      <Notice>
        Os juros de guia federal vencida são a Selic acumulada dos meses de atraso + 1% no mês do pagamento. Cadastre a
        taxa mensal publicada pela Receita (tabela &quot;Taxa de juros Selic&quot;). Mês sem taxa usa 1,15% e a conta sai
        marcada como estimada.
      </Notice>
      <div className="flex flex-wrap items-end gap-3">
        <Field label="Mês">
          <input type="month" className={INPUT} value={month} onChange={(e) => setMonth(e.target.value)} />
        </Field>
        <Field label="Taxa do mês (%)">
          <input className={INPUT} value={rate} onChange={(e) => setRate(e.target.value)} placeholder="1,15" inputMode="decimal" />
        </Field>
        <button className={BTN_PRIMARY} onClick={save} disabled={saving || !rate}>
          {saving && <Loader2 className="h-4 w-4 animate-spin" />} Salvar
        </button>
      </div>
      {error && <Notice tone="error">{error}</Notice>}
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhuma taxa cadastrada.</p>
      ) : (
        <div className="divide-y divide-border border border-border bg-card">
          {rows.map((r) => (
            <div key={r.month} className="flex items-center justify-between px-3 py-2 text-sm">
              <span>{fmtMonth(r.month)}</span>
              <span className="flex items-center gap-3">
                <span className="font-semibold">{pct(r.rate)}</span>
                <button className="text-muted-foreground hover:text-red-400" aria-label="Apagar" onClick={() => remove(r.month)}>
                  <Trash2 className="h-4 w-4" />
                </button>
              </span>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

// ─── Empresa ─────────────────────────────────────────────────────────────────
export function CompanyForm({
  initial, onClose, onSaved,
}: {
  initial: Company | null
  onClose: () => void
  onSaved: (c: Company) => void
}) {
  const [name, setName] = useState(initial?.name || "")
  const [cnpj, setCnpj] = useState(formatCnpj(initial?.cnpj || null))
  const [regime, setRegime] = useState<Regime>(initial?.regime || "simples")
  const [anexo, setAnexo] = useState(initial?.simples_anexo || "III_V")
  const [municipio, setMunicipio] = useState(initial?.municipio || "")
  const [uf, setUf] = useState(initial?.uf || "SP")
  const [notes, setNotes] = useState(initial?.notes || "")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function save() {
    setSaving(true)
    setError(null)
    const body = { name, cnpj, regime, simples_anexo: regime === "simples" ? anexo : null, municipio, uf, notes }
    try {
      const d = initial
        ? await api<{ company: Company }>(`companies/${initial.id_company}`, { method: "PUT", body })
        : await api<{ company: Company }>("companies", { method: "POST", body })
      onSaved(d.company)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal title={initial ? "Editar empresa" : "Nova empresa"} onClose={onClose}>
      <div className="space-y-3">
        <Field label="Nome / razão social">
          <input className={INPUT} value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label="CNPJ">
          <input className={INPUT} value={cnpj} onChange={(e) => setCnpj(e.target.value)} placeholder="00.000.000/0000-00" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Regime">
            <select className={INPUT} value={regime} onChange={(e) => setRegime(e.target.value as Regime)}>
              {(Object.keys(REGIME_LABEL) as Regime[]).map((r) => <option key={r} value={r}>{REGIME_LABEL[r]}</option>)}
            </select>
          </Field>
          {regime === "simples" && (
            <Field label="Anexo" hint="Serviço intelectual costuma ser Fator R">
              <select className={INPUT} value={anexo} onChange={(e) => setAnexo(e.target.value)}>
                {ANEXO_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </Field>
          )}
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-2">
            <Field label="Município">
              <input className={INPUT} value={municipio} onChange={(e) => setMunicipio(e.target.value)} />
            </Field>
          </div>
          <Field label="UF">
            <input className={INPUT} value={uf} maxLength={2} onChange={(e) => setUf(e.target.value.toUpperCase())} />
          </Field>
        </div>
        <Field label="Observações" hint="Ex.: contabilidade contratada, vencimento do certificado digital. Não guarde senhas aqui.">
          <textarea className={INPUT} rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
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
