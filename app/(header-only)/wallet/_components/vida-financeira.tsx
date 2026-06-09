"use client"

// Vida Financeira — orçamento manual mensal (entradas × saídas), no estilo da
// planilha de controle. Coluna de meses à esquerda, duas colunas (Entradas /
// Saídas) com botões "todo mês" (fixo) e "hoje" (variável) que abrem modal de
// categoria + valor, e o fechamento do mês embaixo (verde se sobrou, vermelho
// se faltou). Identidade tabloide: papel + cantos retos + sombra dura.

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import type { ReactNode } from "react"
import {
  Plus, Minus, Trash2, X, ChevronLeft, ChevronRight, Loader2, Wallet, PiggyBank, TrendingDown,
} from "lucide-react"
import { clientFetchWithTimeout } from "@/lib/fetch-with-timeout"
import { cn } from "@/lib/utils"
import { Underline } from "@/components/home/landing/primitives"

const GREEN = "#16B79A"
const GREEN_DEEP = "#00876B"
const RED = "#C0392B"

type Dir = "in" | "out"
type Rec = "recurring" | "oneoff"
type Entry = {
  id: number; direction: Dir; recurrence: Rec; title: string; category: string | null
  amount_cents: number; entry_date: string | null; due_day: number | null; active: boolean
}
type MonthData = {
  ym: number
  totals: { in_cents: number; out_cents: number; net_cents: number }
  entries: { recurring_in: Entry[]; oneoff_in: Entry[]; recurring_out: Entry[]; oneoff_out: Entry[] }
}

const MONTHS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"]
const MONTHS_FULL = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"]

function brl(cents?: number | null) {
  return ((Number(cents) || 0) / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
}
function currentYm() {
  const d = new Date()
  return d.getFullYear() * 100 + (d.getMonth() + 1)
}
function token() {
  return typeof window !== "undefined" ? localStorage.getItem("token") : null
}
function fmtDay(e: Entry) {
  if (e.recurrence === "recurring") return `todo dia ${e.due_day ?? 1}`
  if (!e.entry_date) return ""
  const d = new Date(e.entry_date + "T00:00:00")
  return `dia ${String(d.getDate()).padStart(2, "0")}`
}

/* ═══════════════════════════════════════════════════════════════════════════ */
export function VidaFinanceira() {
  const [ym, setYm] = useState(currentYm())
  const [data, setData] = useState<MonthData | null>(null)
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState<{ direction: Dir; recurrence: Rec; prefill?: string } | null>(null)

  const year = Math.floor(ym / 100)
  const month = ym % 100

  const load = useCallback(async () => {
    const t = token()
    if (!t) return
    setLoading(true)
    try {
      const r = await clientFetchWithTimeout(`/api/me/wallet/finance?ym=${ym}`, { headers: { Authorization: `Bearer ${t}` } }, 9000)
      if (r.ok) setData(await r.json())
    } catch {
      /* silencioso — bloco é acessório à página */
    } finally {
      setLoading(false)
    }
  }, [ym])

  useEffect(() => {
    void load()
  }, [load])

  const del = async (id: number) => {
    const t = token()
    if (!t) return
    setData((prev) => prev ? stripEntry(prev, id) : prev)
    try {
      await clientFetchWithTimeout(`/api/me/wallet/finance/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${t}` } }, 8000)
    } finally {
      void load()
    }
  }

  const totals = data?.totals || { in_cents: 0, out_cents: 0, net_cents: 0 }
  const positive = totals.net_cents >= 0

  return (
    <section className="mx-auto mt-16 w-full max-w-6xl px-5 md:px-8">
      <div className="relative mb-8">
        <p className="fl-marker text-2xl" style={{ color: GREEN }}>controle de verdade</p>
        <h2 className="fl-display text-4xl text-[#F1EDE2] md:text-6xl">Vida Financeira</h2>
        <Underline className="absolute -bottom-2 left-0 h-3.5 w-48" style={{ color: GREEN }} />
        <p className="mt-4 max-w-xl text-sm font-medium text-[#C9C2B6]">
          Some o que entra e sai fora da plataforma. Custos fixos entram sozinhos todo mês; o resto você lança no clique.
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-[160px_minmax(0,1fr)]">
        {/* Coluna de meses */}
        <MonthRail year={year} month={month} onPick={(y, m) => setYm(y * 100 + m)} />

        <div>
          <div className="grid gap-4 md:grid-cols-2">
            <Column
              dir="in"
              data={data}
              loading={loading}
              onAdd={(recurrence, prefill) => setModal({ direction: "in", recurrence, prefill })}
              onDelete={del}
            />
            <Column
              dir="out"
              data={data}
              loading={loading}
              onAdd={(recurrence, prefill) => setModal({ direction: "out", recurrence, prefill })}
              onDelete={del}
            />
          </div>

          {/* Fechamento do mês */}
          <div
            className="mt-5 flex flex-col gap-2 border-2 border-[#0B0B0D] p-5 shadow-[6px_6px_0_0_#0B0B0D] sm:flex-row sm:items-center sm:justify-between"
            style={{ background: positive ? GREEN : RED }}
          >
            <div>
              <p className="text-[11px] font-extrabold uppercase tracking-[0.18em]" style={{ color: positive ? "#06251F" : "#fff" }}>
                Fechamento de {MONTHS_FULL[month - 1]}
              </p>
              <p className="fl-display text-3xl leading-none md:text-4xl" style={{ color: positive ? "#06251F" : "#fff" }}>
                {positive ? "" : "− "}{brl(Math.abs(totals.net_cents))}
              </p>
            </div>
            <p className="max-w-xs text-sm font-bold leading-snug" style={{ color: positive ? "#06251F" : "#fff" }}>
              {positive
                ? "Parabéns! Você gastou menos do que recebeu este mês. Continue assim."
                : "Você gastou mais do que recebeu este mês. Hora de ajustar."}
            </p>
          </div>

          {/* Gráfico de controle de custos */}
          <CostChart data={data} />
        </div>
      </div>

      {modal && (
        <EntryModal
          direction={modal.direction}
          recurrence={modal.recurrence}
          ym={ym}
          prefill={modal.prefill}
          onClose={() => setModal(null)}
          onCreated={() => {
            setModal(null)
            void load()
          }}
        />
      )}
    </section>
  )
}

function stripEntry(d: MonthData, id: number): MonthData {
  const filt = (arr: Entry[]) => arr.filter((e) => e.id !== id)
  const e = d.entries
  const next = {
    recurring_in: filt(e.recurring_in), oneoff_in: filt(e.oneoff_in),
    recurring_out: filt(e.recurring_out), oneoff_out: filt(e.oneoff_out),
  }
  const sum = (arr: Entry[]) => arr.reduce((s, x) => s + x.amount_cents, 0)
  const in_cents = sum(next.recurring_in) + sum(next.oneoff_in)
  const out_cents = sum(next.recurring_out) + sum(next.oneoff_out)
  return { ...d, entries: next, totals: { in_cents, out_cents, net_cents: in_cents - out_cents } }
}

/* ── Gráfico de controle de custos ────────────────────────────────────────── */
function CostChart({ data }: { data: MonthData | null }) {
  const inTotal = data?.totals.in_cents || 0
  const outTotal = data?.totals.out_cents || 0
  const max = Math.max(inTotal, outTotal, 1)

  // "Para onde foi": agrega saídas por título.
  const byCategory = useMemo(() => {
    const m = new Map<string, number>()
    const all = [...(data?.entries.recurring_out || []), ...(data?.entries.oneoff_out || [])]
    for (const e of all) m.set(e.title, (m.get(e.title) || 0) + e.amount_cents)
    return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6)
  }, [data])

  const catMax = Math.max(1, ...byCategory.map(([, v]) => v))
  const empty = inTotal === 0 && outTotal === 0

  return (
    <div className="mt-5 border-2 border-[#0B0B0D] bg-[#F1EDE2] p-4 shadow-[5px_5px_0_0_#0B0B0D] sm:p-5">
      <h3 className="mb-4 fl-display text-2xl text-[#0B0B0D]">Controle de custos</h3>

      {empty ? (
        <p className="py-6 text-center text-xs font-semibold text-[#6B6457]">
          Lance entradas e saídas para ver o panorama do mês aqui.
        </p>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {/* Entradas x Saídas */}
          <div>
            <p className="mb-2 text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#6B6457]">Entradas × Saídas</p>
            <CompareBar label="Entrou" value={inTotal} max={max} color={GREEN_DEEP} />
            <CompareBar label="Saiu" value={outTotal} max={max} color={RED} />
          </div>

          {/* Para onde foi */}
          <div>
            <p className="mb-2 text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#6B6457]">Para onde foi</p>
            {byCategory.length === 0 ? (
              <p className="py-2 text-xs font-semibold text-[#6B6457]">Sem saídas neste mês.</p>
            ) : (
              <div className="space-y-2">
                {byCategory.map(([label, v]) => (
                  <div key={label}>
                    <div className="flex items-center justify-between text-[11px] font-bold text-[#0B0B0D]">
                      <span className="truncate">{label}</span>
                      <span className="tabular-nums">{brl(v)}</span>
                    </div>
                    <div className="mt-0.5 h-2.5 border border-[#0B0B0D] bg-white">
                      <div className="h-full" style={{ width: `${Math.max(3, Math.round((v / catMax) * 100))}%`, background: RED }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function CompareBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const w = Math.max(3, Math.round((value / max) * 100))
  return (
    <div className="mb-2">
      <div className="flex items-center justify-between text-[11px] font-bold text-[#0B0B0D]">
        <span className="uppercase tracking-wide">{label}</span>
        <span className="tabular-nums">{brl(value)}</span>
      </div>
      <div className="mt-0.5 h-4 border-2 border-[#0B0B0D] bg-white">
        <div className="h-full transition-all duration-500" style={{ width: `${w}%`, background: color }} />
      </div>
    </div>
  )
}

/* ── Coluna de meses ──────────────────────────────────────────────────────── */
function MonthRail({ year, month, onPick }: { year: number; month: number; onPick: (y: number, m: number) => void }) {
  return (
    <div className="border-2 border-[#0B0B0D] bg-[#15120E] p-2 shadow-[5px_5px_0_0_#0B0B0D]">
      <div className="mb-2 flex items-center justify-between px-1">
        <button type="button" aria-label="Ano anterior" onClick={() => onPick(year - 1, month)} className="text-[#C9C2B6] hover:text-[#F1EDE2]">
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="fl-display text-xl text-[#F1EDE2]">{year}</span>
        <button type="button" aria-label="Próximo ano" onClick={() => onPick(year + 1, month)} className="text-[#C9C2B6] hover:text-[#F1EDE2]">
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
      <div className="flex gap-1 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible lg:pb-0">
        {MONTHS.map((m, i) => {
          const active = month === i + 1
          return (
            <button
              key={m}
              type="button"
              onClick={() => onPick(year, i + 1)}
              className={cn(
                "shrink-0 border-2 px-3 py-1.5 text-left text-[11px] font-extrabold uppercase tracking-[0.1em] transition lg:w-full",
                active ? "border-[#0B0B0D] text-[#06251F]" : "border-transparent text-[#C9C2B6] hover:text-[#F1EDE2]"
              )}
              style={active ? { background: GREEN } : undefined}
            >
              {m}
            </button>
          )
        })}
      </div>
    </div>
  )
}

/* ── Coluna Entradas / Saídas ─────────────────────────────────────────────── */
function Column({
  dir, data, loading, onAdd, onDelete,
}: {
  dir: Dir
  data: MonthData | null
  loading: boolean
  onAdd: (recurrence: Rec, prefill?: string) => void
  onDelete: (id: number) => void
}) {
  const isIn = dir === "in"
  const accent = isIn ? GREEN : RED
  const total = isIn ? data?.totals.in_cents : data?.totals.out_cents
  const recurring = isIn ? data?.entries.recurring_in : data?.entries.recurring_out
  const oneoff = isIn ? data?.entries.oneoff_in : data?.entries.oneoff_out

  // chips de acesso rápido: títulos já usados nos lançamentos do dia (oneoff)
  const quick = useMemo(() => {
    const seen = new Set<string>()
    const out: string[] = []
    for (const e of oneoff || []) {
      if (!seen.has(e.title)) { seen.add(e.title); out.push(e.title) }
      if (out.length >= 6) break
    }
    return out
  }, [oneoff])

  return (
    <div className="border-2 border-[#0B0B0D] bg-[#F1EDE2] p-4 shadow-[5px_5px_0_0_#0B0B0D]">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="flex items-center gap-2 fl-display text-2xl text-[#0B0B0D]">
          {isIn ? <PiggyBank className="h-5 w-5" /> : <TrendingDown className="h-5 w-5" />}
          {isIn ? "Entradas" : "Saídas"}
        </h3>
        <span className="fl-display text-2xl leading-none" style={{ color: isIn ? GREEN_DEEP : RED }}>
          {brl(total)}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <ActionBtn accent={accent} onClick={() => onAdd("recurring")} icon={isIn ? <Plus className="h-3.5 w-3.5" /> : <Minus className="h-3.5 w-3.5" />}>
          {isIn ? "Recebo todo mês" : "Gasto todo mês"}
        </ActionBtn>
        <ActionBtn accent={accent} onClick={() => onAdd("oneoff")} icon={isIn ? <Plus className="h-3.5 w-3.5" /> : <Minus className="h-3.5 w-3.5" />}>
          {isIn ? "Recebi hoje" : "Gastei hoje"}
        </ActionBtn>
      </div>

      {quick.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {quick.map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => onAdd("oneoff", q)}
              className="border border-[#0B0B0D]/40 bg-white/60 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#0B0B0D] transition hover:bg-[#0B0B0D] hover:text-[#F1EDE2]"
            >
              {q}
            </button>
          ))}
        </div>
      )}

      <div className="mt-3 space-y-2.5">
        {loading && !data ? (
          <RowSkeleton />
        ) : (
          <>
            <Group title="Fixos do mês" entries={recurring} accent={accent} onDelete={onDelete} />
            <Group title="No dia" entries={oneoff} accent={accent} onDelete={onDelete} />
            {(recurring?.length || 0) + (oneoff?.length || 0) === 0 && (
              <p className="py-4 text-center text-xs font-semibold text-[#6B6457]">
                Nada lançado ainda. Use os botões acima.
              </p>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function Group({ title, entries, accent, onDelete }: { title: string; entries?: Entry[]; accent: string; onDelete: (id: number) => void }) {
  if (!entries || entries.length === 0) return null
  return (
    <div>
      <p className="mb-1.5 text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#6B6457]">{title}</p>
      <div className="space-y-1.5">
        {entries.map((e) => (
          <div key={e.id} className="group flex items-center gap-2 border border-[#0B0B0D]/25 bg-white/70 px-2.5 py-1.5">
            <span className="h-2 w-2 shrink-0" style={{ background: accent }} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-bold text-[#0B0B0D]">{e.title}</p>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-[#6B6457]">{fmtDay(e)}</p>
            </div>
            <span className="shrink-0 text-xs font-black tabular-nums text-[#0B0B0D]">{brl(e.amount_cents)}</span>
            <button
              type="button"
              aria-label="Excluir"
              onClick={() => onDelete(e.id)}
              className="shrink-0 text-[#6B6457] opacity-60 transition hover:text-[#C0392B] hover:opacity-100"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

function ActionBtn({ accent, onClick, icon, children }: { accent: string; onClick: () => void; icon: ReactNode; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center justify-center gap-1.5 border-2 border-[#0B0B0D] px-2 py-2 text-[10px] font-extrabold uppercase tracking-[0.08em] text-[#0B0B0D] transition-transform hover:-translate-y-0.5"
      style={{ background: `${accent}26` }}
    >
      {icon}
      {children}
    </button>
  )
}

function RowSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="h-9 animate-pulse border border-[#0B0B0D]/15 bg-[#0B0B0D]/[0.05]" />
      ))}
    </div>
  )
}

/* ── Modal de lançamento ──────────────────────────────────────────────────── */
function EntryModal({
  direction, recurrence, ym, prefill, onClose, onCreated,
}: {
  direction: Dir; recurrence: Rec; ym: number; prefill?: string
  onClose: () => void; onCreated: () => void
}) {
  const isIn = direction === "in"
  const accent = isIn ? GREEN : RED
  const [cats, setCats] = useState<string[]>([])
  const [recent, setRecent] = useState<string[]>([])
  const [title, setTitle] = useState(prefill || "")
  const [amount, setAmount] = useState("")
  const [dueDay, setDueDay] = useState("5")
  const [date, setDate] = useState(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
  })
  const [adding, setAdding] = useState(false)
  const [newCat, setNewCat] = useState("")
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState("")
  const amountRef = useRef<HTMLInputElement | null>(null)

  const heading = isIn
    ? recurrence === "recurring" ? "Recebo todo mês" : "Recebi hoje"
    : recurrence === "recurring" ? "Gasto todo mês" : "Gastei hoje"

  const loadCats = useCallback(async () => {
    const t = token()
    if (!t) return
    try {
      const r = await clientFetchWithTimeout(
        `/api/me/wallet/finance/categories?direction=${direction}&recurrence=${recurrence}`,
        { headers: { Authorization: `Bearer ${t}` } }, 8000
      )
      if (r.ok) {
        const d = await r.json()
        setCats((d.categories || []).map((c: { label: string }) => c.label))
        setRecent(d.recent || [])
      }
    } catch { /* presets são acessórios */ }
  }, [direction, recurrence])

  useEffect(() => { void loadCats() }, [loadCats])

  const addCategory = async () => {
    const label = newCat.trim()
    if (!label) return
    const t = token()
    if (!t) return
    setCats((p) => (p.includes(label) ? p : [label, ...p]))
    setTitle(label)
    setNewCat("")
    setAdding(false)
    try {
      await clientFetchWithTimeout("/api/me/wallet/finance/categories", {
        method: "POST",
        headers: { Authorization: `Bearer ${t}`, "Content-Type": "application/json" },
        body: JSON.stringify({ direction, recurrence, label }),
      }, 8000)
    } catch { /* já refletiu localmente */ }
  }

  const submit = async () => {
    setErr("")
    const reais = Number(String(amount).replace(",", "."))
    const amount_cents = Math.round(reais * 100)
    if (!title.trim()) return setErr("Escolha ou digite uma categoria.")
    if (!Number.isFinite(amount_cents) || amount_cents <= 0) return setErr("Informe um valor válido.")
    const t = token()
    if (!t) return
    setSaving(true)
    try {
      const body: Record<string, unknown> = {
        direction, recurrence, title: title.trim(), category: title.trim(), amount_cents,
      }
      if (recurrence === "recurring") { body.due_day = Number(dueDay) || 1; body.ym = ym }
      else body.entry_date = date
      const r = await clientFetchWithTimeout("/api/me/wallet/finance", {
        method: "POST",
        headers: { Authorization: `Bearer ${t}`, "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }, 9000)
      if (!r.ok) {
        const d = await r.json().catch(() => null)
        throw new Error(d?.error || "Não deu pra salvar")
      }
      onCreated()
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Erro ao salvar")
    } finally {
      setSaving(false)
    }
  }

  const chips = useMemo(() => {
    const seen = new Set<string>()
    const out: string[] = []
    for (const c of [...recent, ...cats]) {
      if (!seen.has(c)) { seen.add(c); out.push(c) }
    }
    return out
  }, [recent, cats])

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-[#0B0B0D]/70" onClick={onClose} />
      <div className="relative w-full max-w-md border-2 border-[#0B0B0D] bg-[#F1EDE2] p-5 shadow-[8px_8px_0_0_#0B0B0D]">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="flex items-center gap-2 fl-display text-2xl text-[#0B0B0D]">
            <span className="inline-flex h-7 w-7 items-center justify-center border-2 border-[#0B0B0D]" style={{ background: accent }}>
              {isIn ? <Plus className="h-4 w-4 text-[#06251F]" /> : <Minus className="h-4 w-4 text-white" />}
            </span>
            {heading}
          </h3>
          <button type="button" aria-label="Fechar" onClick={onClose} className="text-[#6B6457] hover:text-[#0B0B0D]">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Categorias */}
        <p className="mb-1.5 text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#6B6457]">Categoria</p>
        <div className="flex max-h-28 flex-wrap gap-1.5 overflow-y-auto">
          {chips.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setTitle(c)}
              className={cn(
                "border-2 px-2 py-1 text-[11px] font-bold uppercase tracking-wide transition",
                title === c ? "border-[#0B0B0D] text-[#06251F]" : "border-[#0B0B0D]/25 bg-white/60 text-[#0B0B0D] hover:border-[#0B0B0D]"
              )}
              style={title === c ? { background: accent } : undefined}
            >
              {c}
            </button>
          ))}
          {adding ? (
            <span className="inline-flex items-center gap-1">
              <input
                autoFocus
                value={newCat}
                onChange={(e) => setNewCat(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") void addCategory() }}
                placeholder="Nova"
                className="w-24 border-2 border-[#0B0B0D] bg-white px-2 py-1 text-[11px] text-[#0B0B0D] outline-none"
              />
              <button type="button" onClick={addCategory} className="border-2 border-[#0B0B0D] px-2 py-1 text-[11px] font-bold" style={{ background: accent }}>ok</button>
            </span>
          ) : (
            <button
              type="button"
              onClick={() => setAdding(true)}
              className="inline-flex items-center gap-1 border-2 border-dashed border-[#0B0B0D]/40 px-2 py-1 text-[11px] font-bold uppercase text-[#0B0B0D] hover:border-[#0B0B0D]"
            >
              <Plus className="h-3 w-3" /> Categoria
            </button>
          )}
        </div>

        {/* Título (editável) */}
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Título do lançamento"
          className="mt-3 w-full border-2 border-[#0B0B0D] bg-white px-3 py-2 text-sm font-bold text-[#0B0B0D] outline-none focus:shadow-[3px_3px_0_0_#0B0B0D]"
        />

        {/* Valor + (dia ou data) */}
        <div className="mt-3 grid grid-cols-2 gap-2">
          <label className="flex flex-col gap-1">
            <span className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#6B6457]">Valor (R$)</span>
            <input
              ref={amountRef}
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value.replace(/[^\d.,]/g, ""))}
              placeholder="0,00"
              className="border-2 border-[#0B0B0D] bg-white px-3 py-2 text-sm font-black tabular-nums text-[#0B0B0D] outline-none"
            />
          </label>
          {recurrence === "recurring" ? (
            <label className="flex flex-col gap-1">
              <span className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#6B6457]">Dia do mês</span>
              <input
                type="number" min={1} max={31}
                value={dueDay}
                onChange={(e) => setDueDay(e.target.value)}
                className="border-2 border-[#0B0B0D] bg-white px-3 py-2 text-sm font-bold text-[#0B0B0D] outline-none"
              />
            </label>
          ) : (
            <label className="flex flex-col gap-1">
              <span className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#6B6457]">Data</span>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="border-2 border-[#0B0B0D] bg-white px-3 py-2 text-sm font-bold text-[#0B0B0D] outline-none"
              />
            </label>
          )}
        </div>

        {err && <p className="mt-3 text-xs font-bold text-[#C0392B]">{err}</p>}

        <button
          type="button"
          onClick={submit}
          disabled={saving}
          className="mt-4 flex w-full items-center justify-center gap-2 border-2 border-[#0B0B0D] px-4 py-2.5 text-xs font-extrabold uppercase tracking-[0.14em] text-[#0B0B0D] shadow-[4px_4px_0_0_#0B0B0D] transition hover:-translate-y-0.5 disabled:opacity-60"
          style={{ background: accent }}
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wallet className="h-4 w-4" />}
          {recurrence === "recurring" ? "Salvar fixo do mês" : "Lançar"}
        </button>
      </div>
    </div>
  )
}
