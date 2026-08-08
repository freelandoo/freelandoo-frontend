"use client"

/**
 * Painel de Fraude (admin, mig 201) — antifraude de custo zero.
 *
 * A tela materializa a regra do desenho: SINAL NÃO BLOQUEIA. O backend só
 * pontua e enfileira; aqui um humano olha a evidência e decide. Por isso o
 * centro da página é a FILA e o caso aberto, não um "score" automático.
 *
 * Estilo dark utilitário (padrão admin) — pt-only como as demais telas admin,
 * cantos retos (.fl-sharp).
 */
import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import {
  Loader2, ShieldAlert, RefreshCw, Search, X, ExternalLink, Copy,
  Ban, Eye, CheckCircle2, Users, Globe, Mail, CreditCard, AlertTriangle,
} from "lucide-react"

// ---------------------------------------------------------------------------
// tipos
// ---------------------------------------------------------------------------
interface Reason { code: string; weight: number; detail: string }

interface ReviewRow {
  id_review: number
  id_user: string
  score: number
  reasons: Reason[]
  status: string
  notes: string | null
  created_at: string
  decided_at: string | null
  nome: string
  username: string | null
  email: string
  user_created_at: string
  blocked_at: string | null
  cpf_masked: string | null
  signup_ip: string | null
  email_domain: string | null
  signup_source: string | null
  decided_by_username: string | null
}

interface CaseDetail {
  review: ReviewRow & {
    user_agent: string | null
    uf: string | null
    municipio: string | null
    data_nascimento: string | null
    has_cpf: boolean
    blocked_reason: string | null
  }
  same_ip: {
    id_user: string
    username: string | null
    nome: string
    email: string
    created_at: string
    blocked_at: string | null
  }[]
}

interface PayoutMismatch {
  id_user: string
  username: string | null
  nome: string
  email: string
  has_cpf: boolean
  pix_key: string | null
  pix_key_type: string | null
  legal_name: string | null
  payout_digits: string
  payout_len: number
  updated_at: string
}

interface Kpis {
  pending: number
  watching: number
  decided_30d: number
  blocked_total: number
  avg_pending_score: number
  signups_7d: number
}

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------
// Espelha os codes de src/utils/fraudScore.js. Code desconhecido cai no próprio
// code em vez de sumir — sinal novo no backend aparece aqui mesmo sem deploy
// do front.
const REASON_LABEL: Record<string, string> = {
  cpf_region_mismatch: "Região do CPF",
  disposable_email: "E-mail descartável",
  suspicious_name: "Nome atípico",
  shared_ip: "IP compartilhado",
  burst_signup: "Cadastro em rajada",
  payout_cpf_mismatch: "CPF do repasse",
  payout_cnpj: "Repasse em CNPJ",
}

const STATUS_LABEL: Record<string, string> = {
  pending: "Na fila",
  cleared: "Liberado",
  watch: "Em observação",
  blocked: "Bloqueado",
}

function fmtDate(iso: string | null) {
  if (!iso) return "—"
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit", month: "2-digit", year: "2-digit",
    hour: "2-digit", minute: "2-digit",
  })
}

function authHeaders(): HeadersInit {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null
  return { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }
}

// Faixa de score: só orienta o olho, não decide nada.
function scoreStyle(score: number) {
  if (score >= 70) return "border-red-500/40 bg-red-500/10 text-red-300"
  if (score >= 45) return "border-amber-500/40 bg-amber-500/10 text-amber-300"
  return "border-sky-500/40 bg-sky-500/10 text-sky-300"
}

function statusStyle(status: string) {
  switch (status) {
    case "pending": return "border-amber-500/40 bg-amber-500/10 text-amber-300"
    case "blocked": return "border-red-500/40 bg-red-500/10 text-red-300"
    case "watch": return "border-sky-500/40 bg-sky-500/10 text-sky-300"
    case "cleared": return "border-green-500/40 bg-green-500/10 text-green-300"
    default: return "border-white/20 bg-white/5 text-muted-foreground"
  }
}

// ---------------------------------------------------------------------------
// página
// ---------------------------------------------------------------------------
export default function FraudeAdminPage() {
  const router = useRouter()
  const [checkingAuth, setCheckingAuth] = useState(true)
  const [tab, setTab] = useState<"queue" | "payouts">("queue")

  useEffect(() => {
    const token = localStorage.getItem("token")
    if (!token) { router.push("/login"); return }
    fetch("/api/users/me", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((data) => {
        const isAdmin =
          data.is_admin ||
          data.roles?.some((r: { desc_role: string }) => r.desc_role === "Administrator")
        if (!isAdmin) { router.push("/"); return }
        setCheckingAuth(false)
      })
      .catch(() => router.push("/"))
  }, [router])

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center py-32">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="fl-sharp min-h-screen bg-background">
      <main className="container mx-auto space-y-8 px-4 py-8">
        <div className="flex items-center gap-3">
          <ShieldAlert className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-2xl font-bold text-foreground">Painel de Fraude</h1>
            <p className="text-sm text-muted-foreground">
              Sinais de cadastro · fila de revisão humana · destino do dinheiro
            </p>
          </div>
        </div>

        <KpiSection />

        <div className="flex gap-2 border-b border-border">
          <button
            onClick={() => setTab("queue")}
            className={`px-4 py-2 text-sm font-semibold ${
              tab === "queue"
                ? "border-b-2 border-primary text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Fila de revisão
          </button>
          <button
            onClick={() => setTab("payouts")}
            className={`px-4 py-2 text-sm font-semibold ${
              tab === "payouts"
                ? "border-b-2 border-primary text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Repasses divergentes
          </button>
        </div>

        {tab === "queue" ? <QueueSection /> : <PayoutSection />}
      </main>
    </div>
  )
}

// ---------------------------------------------------------------------------
// KPIs
// ---------------------------------------------------------------------------
function KpiSection() {
  const [kpis, setKpis] = useState<Kpis | null>(null)
  const [threshold, setThreshold] = useState<number | null>(null)

  useEffect(() => {
    fetch("/api/admin/fraud/dashboard", { headers: authHeaders() })
      .then((r) => r.json())
      .then((d) => {
        setKpis(d?.kpis ?? null)
        setThreshold(d?.settings?.review_threshold ?? null)
      })
      .catch(() => setKpis(null))
  }, [])

  const cards: { label: string; value: number | string; hint?: string; tone?: string }[] = [
    { label: "Na fila", value: kpis?.pending ?? "—", tone: "text-amber-400" },
    { label: "Em observação", value: kpis?.watching ?? "—", tone: "text-sky-400" },
    { label: "Bloqueados", value: kpis?.blocked_total ?? "—", tone: "text-red-400" },
    { label: "Decididos (30d)", value: kpis?.decided_30d ?? "—" },
    { label: "Score médio na fila", value: kpis?.avg_pending_score ?? "—", hint: threshold ? `limiar ${threshold}` : undefined },
    { label: "Cadastros (7d)", value: kpis?.signups_7d ?? "—" },
  ]

  return (
    <section className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
      {cards.map((c) => (
        <div key={c.label} className="border border-border bg-card p-3">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{c.label}</p>
          <p className={`mt-1 text-2xl font-bold ${c.tone || "text-foreground"}`}>{c.value}</p>
          {c.hint && <p className="text-[10px] text-muted-foreground">{c.hint}</p>}
        </div>
      ))}
    </section>
  )
}

// ---------------------------------------------------------------------------
// Fila
// ---------------------------------------------------------------------------
function QueueSection() {
  const [rows, setRows] = useState<ReviewRow[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState("pending")
  const [q, setQ] = useState("")
  const [openCase, setOpenCase] = useState<number | null>(null)

  const load = useCallback(() => {
    setLoading(true)
    const params = new URLSearchParams({ status, per_page: "100" })
    if (q.trim()) params.set("q", q.trim())
    fetch(`/api/admin/fraud/queue?${params.toString()}`, { headers: authHeaders() })
      .then((r) => r.json())
      .then((d) => {
        setRows(Array.isArray(d?.reviews) ? d.reviews : [])
        setTotal(d?.total ?? 0)
      })
      .catch(() => setRows([]))
      .finally(() => setLoading(false))
  }, [status, q])

  useEffect(() => { load() }, [load])

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {["pending", "watch", "blocked", "cleared", "all"].map((s) => (
          <button
            key={s}
            onClick={() => setStatus(s)}
            className={`border px-3 py-1.5 text-xs font-semibold ${
              status === s
                ? "border-primary/50 bg-primary/15 text-primary"
                : "border-border bg-card text-muted-foreground hover:text-foreground"
            }`}
          >
            {s === "all" ? "Todos" : STATUS_LABEL[s]}
          </button>
        ))}

        <div className="ml-auto flex items-center gap-2">
          <div className="flex items-center gap-2 border border-border bg-card px-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="@username, e-mail, nome ou IP"
              className="w-56 bg-transparent py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground"
            />
          </div>
          <button
            onClick={load}
            disabled={loading}
            className="flex items-center gap-2 border border-primary/40 bg-primary/10 px-3 py-2 text-sm text-primary hover:bg-primary/20 disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Atualizar
          </button>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        {total} {total === 1 ? "caso" : "casos"} · nenhum bloqueio é automático — a decisão é sempre humana
      </p>

      {loading && rows.length === 0 && (
        <div className="flex items-center justify-center border border-border bg-card py-16">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      )}

      {!loading && rows.length === 0 && (
        <div className="border border-border bg-card px-4 py-12 text-center">
          <CheckCircle2 className="mx-auto h-8 w-8 text-green-500" />
          <p className="mt-2 text-sm font-semibold text-foreground">Nada para revisar</p>
          <p className="text-xs text-muted-foreground">
            Nenhum cadastro atingiu o limiar de suspeita neste filtro.
          </p>
        </div>
      )}

      {rows.length > 0 && (
        <div className="overflow-x-auto border border-border bg-card">
          <table className="w-full min-w-[880px] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                <th className="px-3 py-2">Score</th>
                <th className="px-3 py-2">Usuário</th>
                <th className="px-3 py-2">Sinais</th>
                <th className="px-3 py-2">IP</th>
                <th className="px-3 py-2">Cadastro</th>
                <th className="px-3 py-2">Situação</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id_review} className="border-b border-border/60 last:border-0">
                  <td className="px-3 py-2">
                    <span className={`border px-2 py-1 text-xs font-bold ${scoreStyle(r.score)}`}>
                      {r.score}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <p className="font-semibold text-foreground">{r.nome}</p>
                    <p className="text-xs text-muted-foreground">
                      @{r.username || "—"} · {r.email}
                    </p>
                    <p className="text-[11px] text-muted-foreground">CPF {r.cpf_masked || "não informado"}</p>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex max-w-[260px] flex-wrap gap-1">
                      {(r.reasons || []).map((reason) => (
                        <span
                          key={reason.code}
                          title={reason.detail}
                          className="border border-white/15 bg-white/5 px-1.5 py-0.5 text-[10px] text-muted-foreground"
                        >
                          {REASON_LABEL[reason.code] || reason.code}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">{r.signup_ip || "—"}</td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">{fmtDate(r.user_created_at)}</td>
                  <td className="px-3 py-2">
                    <span className={`border px-2 py-0.5 text-[11px] ${statusStyle(r.status)}`}>
                      {STATUS_LABEL[r.status] || r.status}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right">
                    <button
                      onClick={() => setOpenCase(r.id_review)}
                      className="border border-primary/40 bg-primary/10 px-3 py-1.5 text-xs text-primary hover:bg-primary/20"
                    >
                      Revisar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {openCase !== null && (
        <CaseModal
          idReview={openCase}
          onClose={() => setOpenCase(null)}
          onDecided={() => { setOpenCase(null); load() }}
        />
      )}
    </section>
  )
}

// ---------------------------------------------------------------------------
// Caso aberto — a tela do "olho humano"
// ---------------------------------------------------------------------------
function CaseModal({
  idReview, onClose, onDecided,
}: { idReview: number; onClose: () => void; onDecided: () => void }) {
  const [data, setData] = useState<CaseDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [notes, setNotes] = useState("")
  const [saving, setSaving] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    fetch(`/api/admin/fraud/${idReview}`, { headers: authHeaders() })
      .then((r) => r.json())
      .then((d) => setData(d?.review ? d : null))
      .catch(() => setData(null))
      .finally(() => setLoading(false))
  }, [idReview])

  const decide = async (status: string) => {
    setSaving(status)
    setError(null)
    try {
      const res = await fetch(`/api/admin/fraud/${idReview}/decide`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ status, notes: notes.trim() || null }),
      })
      const body = await res.json()
      if (!res.ok) {
        setError(body?.error || "Falha ao salvar a decisão")
        setSaving(null)
        return
      }
      onDecided()
    } catch {
      setError("Erro de conexão")
      setSaving(null)
    }
  }

  const r = data?.review

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 p-4">
      <div className="fl-sharp mt-8 w-full max-w-3xl border border-border bg-card">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="text-lg font-bold text-foreground">Revisar cadastro</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        )}

        {!loading && !r && (
          <p className="px-4 py-12 text-center text-sm text-muted-foreground">Caso não encontrado.</p>
        )}

        {r && (
          <div className="space-y-5 p-4">
            {/* Identidade */}
            <div className="grid gap-3 sm:grid-cols-2">
              <Field icon={<Users className="h-4 w-4" />} label="Nome" value={r.nome} />
              <Field icon={<Mail className="h-4 w-4" />} label="E-mail" value={r.email} />
              <Field label="Usuário" value={r.username ? `@${r.username}` : "—"} />
              <Field
                icon={<CreditCard className="h-4 w-4" />}
                label="CPF"
                value={r.cpf_masked || "não informado"}
              />
              <Field label="Nascimento" value={r.data_nascimento ? fmtDate(r.data_nascimento).split(",")[0] : "—"} />
              <Field label="Cidade declarada" value={[r.municipio, r.uf].filter(Boolean).join(" · ") || "—"} />
              <Field icon={<Globe className="h-4 w-4" />} label="IP do cadastro" value={r.signup_ip || "—"} />
              <Field label="Origem" value={r.signup_source === "google" ? "Google" : "E-mail/senha"} />
            </div>

            {r.user_agent && (
              <p className="break-all border border-border bg-background px-3 py-2 text-[11px] text-muted-foreground">
                {r.user_agent}
              </p>
            )}

            {/* Sinais */}
            <div>
              <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                Por que este caso apareceu — score {r.score}
              </h3>
              <ul className="space-y-1">
                {(r.reasons || []).map((reason) => (
                  <li
                    key={reason.code}
                    className="flex items-center justify-between border border-border bg-background px-3 py-2 text-sm"
                  >
                    <span className="text-foreground">
                      <span className="font-semibold">{REASON_LABEL[reason.code] || reason.code}</span>
                      <span className="ml-2 text-xs text-muted-foreground">{reason.detail}</span>
                    </span>
                    <span className="text-xs font-bold text-amber-400">+{reason.weight}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Conferência manual — o "olho humano" que a automação não pode fazer */}
            <div className="border border-sky-500/30 bg-sky-500/5 p-3">
              <p className="text-xs text-sky-200">
                Conferência manual na Receita Federal: a consulta pública exige captcha e o
                ToS não permite automatizar — mas conferir um caso à mão é legítimo.
                Abra o serviço oficial e digite o CPF completo do usuário e a data de nascimento.
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <a
                  href="https://servicos.receita.fazenda.gov.br/servicos/cpf/consultasituacao/consultapublica.asp"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 border border-sky-500/40 bg-sky-500/10 px-3 py-1.5 text-xs text-sky-200 hover:bg-sky-500/20"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  Abrir consulta da Receita
                </a>
                <button
                  onClick={() => navigator.clipboard?.writeText(r.email)}
                  className="flex items-center gap-1.5 border border-border bg-background px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground"
                >
                  <Copy className="h-3.5 w-3.5" />
                  Copiar e-mail
                </button>
              </div>
              <p className="mt-2 text-[11px] text-muted-foreground">
                O CPF completo não sai da API por decisão de privacidade — use o banco de dados
                se precisar do número inteiro.
              </p>
            </div>

            {/* Vizinhos de IP */}
            <div>
              <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                Outras contas do mesmo IP ({data?.same_ip.length ?? 0})
              </h3>
              {(data?.same_ip.length ?? 0) === 0 ? (
                <p className="border border-border bg-background px-3 py-2 text-xs text-muted-foreground">
                  Nenhuma outra conta nasceu deste IP.
                </p>
              ) : (
                <div className="max-h-48 overflow-y-auto border border-border">
                  {data?.same_ip.map((n) => (
                    <div
                      key={n.id_user}
                      className="flex items-center justify-between border-b border-border/60 bg-background px-3 py-2 text-xs last:border-0"
                    >
                      <span className="text-foreground">
                        {n.nome} <span className="text-muted-foreground">@{n.username || "—"} · {n.email}</span>
                      </span>
                      <span className="text-muted-foreground">
                        {n.blocked_at ? <span className="text-red-400">bloqueado</span> : fmtDate(n.created_at)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Decisão */}
            <div className="space-y-2 border-t border-border pt-4">
              <label className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                Anotação da decisão
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder="O que você verificou e por que decidiu assim"
                className="w-full border border-border bg-background px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground"
              />

              {error && (
                <p className="flex items-center gap-2 border border-red-500/30 bg-red-500/5 px-3 py-2 text-sm text-red-400">
                  <AlertTriangle className="h-4 w-4" /> {error}
                </p>
              )}

              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => decide("cleared")}
                  disabled={!!saving}
                  className="flex items-center gap-2 border border-green-500/40 bg-green-500/10 px-4 py-2 text-sm font-semibold text-green-300 hover:bg-green-500/20 disabled:opacity-50"
                >
                  {saving === "cleared" ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                  Liberar
                </button>
                <button
                  onClick={() => decide("watch")}
                  disabled={!!saving}
                  className="flex items-center gap-2 border border-sky-500/40 bg-sky-500/10 px-4 py-2 text-sm font-semibold text-sky-300 hover:bg-sky-500/20 disabled:opacity-50"
                >
                  {saving === "watch" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />}
                  Observar
                </button>
                <button
                  onClick={() => decide("blocked")}
                  disabled={!!saving}
                  className="flex items-center gap-2 border border-red-500/40 bg-red-500/10 px-4 py-2 text-sm font-semibold text-red-300 hover:bg-red-500/20 disabled:opacity-50"
                >
                  {saving === "blocked" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Ban className="h-4 w-4" />}
                  Bloquear conta
                </button>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Bloquear impede novos logins (inclusive pelo Google). Quem já está logado
                continua até o token expirar. Liberar ou observar desfaz o bloqueio.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function Field({ icon, label, value }: { icon?: React.ReactNode; label: string; value: string }) {
  return (
    <div className="border border-border bg-background px-3 py-2">
      <p className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-muted-foreground">
        {icon}
        {label}
      </p>
      <p className="mt-0.5 break-all text-sm text-foreground">{value}</p>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Repasses divergentes
// ---------------------------------------------------------------------------
function PayoutSection() {
  const [rows, setRows] = useState<PayoutMismatch[]>([])
  const [loading, setLoading] = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    fetch("/api/admin/fraud/payout-mismatches", { headers: authHeaders() })
      .then((r) => r.json())
      .then((d) => setRows(Array.isArray(d?.mismatches) ? d.mismatches : []))
      .catch(() => setRows([]))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  return (
    <section className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <p className="max-w-2xl text-xs text-muted-foreground">
          A regra é: <span className="text-foreground">o CPF que recebe o dinheiro tem que ser o CPF
          da conta</span>. O gate já barra cadastros novos fora da regra — esta lista é o
          histórico que entrou antes dele, mais os destinos em CNPJ (legítimos para MEI/empresa,
          mas cuja titularidade não dá para verificar sem consulta paga).
        </p>
        <button
          onClick={load}
          disabled={loading}
          className="flex shrink-0 items-center gap-2 border border-primary/40 bg-primary/10 px-3 py-2 text-sm text-primary hover:bg-primary/20 disabled:opacity-50"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          Atualizar
        </button>
      </div>

      {!loading && rows.length === 0 && (
        <div className="border border-border bg-card px-4 py-12 text-center">
          <CheckCircle2 className="mx-auto h-8 w-8 text-green-500" />
          <p className="mt-2 text-sm font-semibold text-foreground">Nenhum destino divergente</p>
          <p className="text-xs text-muted-foreground">
            Todo repasse configurado aponta para o CPF do próprio titular.
          </p>
        </div>
      )}

      {rows.length > 0 && (
        <div className="overflow-x-auto border border-border bg-card">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                <th className="px-3 py-2">Usuário</th>
                <th className="px-3 py-2">Tipo</th>
                <th className="px-3 py-2">Chave Pix</th>
                <th className="px-3 py-2">Titular declarado</th>
                <th className="px-3 py-2">Atualizado</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((m) => (
                <tr key={m.id_user} className="border-b border-border/60 last:border-0">
                  <td className="px-3 py-2">
                    <p className="font-semibold text-foreground">{m.nome}</p>
                    <p className="text-xs text-muted-foreground">@{m.username || "—"} · {m.email}</p>
                    {!m.has_cpf && (
                      <p className="text-[11px] text-red-400">conta sem CPF cadastrado</p>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <span
                      className={`border px-2 py-0.5 text-[11px] ${
                        m.payout_len === 14
                          ? "border-amber-500/40 bg-amber-500/10 text-amber-300"
                          : "border-red-500/40 bg-red-500/10 text-red-300"
                      }`}
                    >
                      {m.payout_len === 14 ? "CNPJ" : "CPF de terceiro"}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">
                    {m.pix_key_type || "—"} · {m.pix_key || "—"}
                  </td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">{m.legal_name || "—"}</td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">{fmtDate(m.updated_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
