"use client"

/**
 * Painel do Atendente com IA (mig 253).
 *
 * ─── POR QUE ESTA TELA EXISTE ───────────────────────────────────────────────
 *
 * Sem chave de provedor cadastrada o subsistema inteiro é INERTE: as mensagens
 * chegam, os trabalhos entram na fila e ninguém é respondido. A fila não
 * reclama e o cliente do dono só fica sem resposta — a falha mais silenciosa
 * deste produto. É aqui que a chave entra, e é aqui que se vê se ela funciona.
 *
 * ⚠️ NÃO CONFUNDIR COM /administracao/atendimento-ia: aquele vende a assinatura
 * de um bot de TERCEIRO (mig 175, provisionado por webhook). Este é o atendente
 * da PRÓPRIA plataforma — quem paga o provedor aqui somos nós, e é por isso que
 * o consumo aparece nesta mesma tela.
 *
 * ⚠️ A CHAVE NUNCA VOLTA DO BACKEND. Ela é selada na gravação e o que se lê de
 * volta são os 4 últimos caracteres (`key_hint`). Campo vazio no formulário
 * significa "mantém a que já está lá", nunca "apaga" — apagar é botão próprio.
 * Se esta tela um dia exibir a chave inteira, o selamento virou enfeite.
 *
 * Estilo dark utilitário, pt-only (padrão admin: o que traduz é o produto, não
 * a sala de máquinas) e cantos retos (.fl-sharp). Sem shadcn — o lint da casa
 * proíbe importar de components/ui em página.
 */

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
  AlertTriangle,
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  Loader2,
  PlugZap,
  RefreshCw,
  Trash2,
} from "lucide-react"

type CatalogItem = {
  name: string
  label: string
  default_model: string
  key_placeholder: string
  suggested_models: string[]
}

type KeyRow = {
  provider: string
  label: string | null
  key_hint: string
  model: string
  is_enabled: boolean
  priority: number
  price_in_mtok: string | number | null
  price_out_mtok: string | number | null
  last_ok_at: string | null
  last_error: string | null
  updated_at: string
}

type Settings = { catalog: CatalogItem[]; keys: KeyRow[]; ready: boolean }

type UsageRow = {
  provider: string
  model: string
  calls: number
  input_tokens: number
  output_tokens: number
  cost_usd: number | null
  calls_without_price: number
}

type JobRow = {
  id_job: string
  id_user: string
  username: string | null
  channel: string
  ref_id: string
  status: string
  attempts: number
  trigger_text: string | null
  answer: string | null
  skip_reason: string | null
  last_error: string | null
  created_at: string
  updated_at: string
}

type Rascunho = {
  api_key: string
  model: string
  priority: number
  is_enabled: boolean
  price_in_mtok: string
  price_out_mtok: string
}

async function api<T>(url: string, init: RequestInit = {}): Promise<T> {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null
  const res = await fetch(url, {
    ...init,
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      Authorization: token ? `Bearer ${token}` : "",
      ...(init.headers || {}),
    },
  })
  const text = await res.text()
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    data = { error: text }
  }
  if (!res.ok) throw new Error((data as { error?: string })?.error || `HTTP ${res.status}`)
  return data as T
}

const CANAL_LABEL: Record<string, string> = {
  whatsapp: "WhatsApp",
  dm: "Mensagem direta",
  os: "O.S.",
}

const STATUS_COR: Record<string, string> = {
  pending: "text-amber-300 border-amber-500/40",
  running: "text-sky-300 border-sky-500/40",
  done: "text-emerald-300 border-emerald-500/40",
  failed: "text-red-300 border-red-500/40",
  skipped: "text-neutral-400 border-neutral-600",
}

function fmtData(v: string | null) {
  if (!v) return "—"
  try {
    return new Date(v).toLocaleString("pt-BR")
  } catch {
    return "—"
  }
}

function fmtNum(n: number) {
  return new Intl.NumberFormat("pt-BR").format(n)
}

export default function PainelAtendentePage() {
  const router = useRouter()
  const [settings, setSettings] = useState<Settings | null>(null)
  const [usage, setUsage] = useState<{ days: number; rows: UsageRow[] } | null>(null)
  const [jobs, setJobs] = useState<JobRow[]>([])
  const [statusFiltro, setStatusFiltro] = useState<string>("")
  const [dias, setDias] = useState(30)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)
  const [ocupado, setOcupado] = useState<string | null>(null)

  // Rascunho por provedor: o formulário é local até o Salvar. A chave nasce
  // VAZIA de propósito — vazio quer dizer "mantém a que está lá".
  const [form, setForm] = useState<Record<string, Rascunho>>({})

  const carregar = useCallback(async () => {
    setCarregando(true)
    setErro(null)
    try {
      const [s, u, j] = await Promise.all([
        api<Settings>("/api/admin/ai/settings"),
        api<{ days: number; rows: UsageRow[] }>(`/api/admin/ai/usage?days=${dias}`),
        api<{ jobs: JobRow[] }>(
          `/api/admin/ai/jobs?limit=50${statusFiltro ? `&status=${statusFiltro}` : ""}`
        ),
      ])
      setSettings(s)
      setUsage(u)
      setJobs(j.jobs || [])

      // O rascunho espelha o que está gravado, menos a chave.
      const next: Record<string, Rascunho> = {}
      for (const c of s.catalog) {
        const k = s.keys.find((x) => x.provider === c.name)
        next[c.name] = {
          api_key: "",
          model: k?.model || c.default_model,
          priority: k?.priority ?? 1,
          is_enabled: k ? k.is_enabled : true,
          price_in_mtok: k?.price_in_mtok != null ? String(k.price_in_mtok) : "",
          price_out_mtok: k?.price_out_mtok != null ? String(k.price_out_mtok) : "",
        }
      }
      setForm(next)
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Falha ao carregar")
    } finally {
      setCarregando(false)
    }
  }, [dias, statusFiltro])

  useEffect(() => {
    void carregar()
  }, [carregar])

  async function salvar(provider: string) {
    const f = form[provider]
    if (!f) return
    setOcupado(`save:${provider}`)
    setAviso(null)
    setErro(null)
    try {
      const body: Record<string, unknown> = {
        model: f.model,
        priority: f.priority,
        is_enabled: f.is_enabled,
        price_in_mtok: f.price_in_mtok === "" ? null : f.price_in_mtok,
        price_out_mtok: f.price_out_mtok === "" ? null : f.price_out_mtok,
      }
      // ⚠️ Só manda a chave quando o admin digitou alguma: mandar string vazia
      // seria pedir para o backend regravar um segredo em branco.
      if (f.api_key.trim()) body.api_key = f.api_key.trim()
      await api(`/api/admin/ai/keys/${provider}`, { method: "PUT", body: JSON.stringify(body) })
      setAviso(`${provider}: gravado.`)
      await carregar()
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Falha ao gravar")
    } finally {
      setOcupado(null)
    }
  }

  async function testar(provider: string) {
    setOcupado(`test:${provider}`)
    setAviso(null)
    setErro(null)
    try {
      const r = await api<{ ok?: boolean; model?: string; reply?: string }>(
        `/api/admin/ai/keys/${provider}/test`,
        { method: "POST" }
      )
      setAviso(`${provider} respondeu (${r.model}): ${r.reply || "—"}`)
      await carregar()
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Falha no teste")
    } finally {
      setOcupado(null)
    }
  }

  async function remover(provider: string) {
    if (!window.confirm(`Apagar a chave do ${provider}? O atendente para de usar este provedor.`)) {
      return
    }
    setOcupado(`del:${provider}`)
    setErro(null)
    try {
      await api(`/api/admin/ai/keys/${provider}`, { method: "DELETE" })
      await carregar()
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Falha ao apagar")
    } finally {
      setOcupado(null)
    }
  }

  const semChave = settings && !settings.ready

  return (
    <div className="fl-sharp min-h-screen bg-neutral-950 text-neutral-100">
      <div className="mx-auto max-w-6xl px-4 py-8">
        <button
          onClick={() => router.push("/administracao")}
          className="mb-6 inline-flex items-center gap-2 text-sm text-neutral-400 hover:text-neutral-200"
        >
          <ArrowLeft className="h-4 w-4" /> Voltar
        </button>

        <header className="mb-6">
          <h1 className="text-2xl font-bold">Atendente com IA</h1>
          <p className="mt-1 text-sm text-neutral-400">
            A plataforma responde pelo dono no WhatsApp, nas mensagens diretas e na O.S., com o que
            ela já sabe do negócio. Aqui ficam a chave do provedor, o consumo e a fila.
          </p>
        </header>

        {erro && (
          <div className="mb-4 border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {erro}
          </div>
        )}
        {aviso && (
          <div className="mb-4 border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
            {aviso}
          </div>
        )}

        {carregando && (
          <div className="flex items-center gap-2 py-10 text-neutral-400">
            <Loader2 className="h-4 w-4 animate-spin" /> Carregando…
          </div>
        )}

        {!carregando && semChave && (
          <div className="mb-6 flex items-start gap-3 border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              <b>Nenhum provedor ligado.</b> As mensagens continuam chegando e entrando na fila, mas
              ninguém é respondido. Cadastre uma chave abaixo e use o <b>Testar</b> antes de confiar.
            </span>
          </div>
        )}

        {!carregando && settings && (
          <>
            <section className="mb-10">
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-neutral-400">
                Provedores
              </h2>
              <p className="mb-4 text-xs text-neutral-500">
                Prioridade <b>1</b> é o principal e <b>2</b> é a reserva: o atendente tenta o
                principal e só cai para a reserva quando ele falha. Preço é o que <b>nós</b> pagamos
                por milhão de tokens — em branco, os tokens continuam sendo contados e o custo
                aparece como <b>não apurado</b>, nunca como zero.
              </p>

              <div className="grid gap-4 md:grid-cols-2">
                {settings.catalog.map((c) => {
                  const k = settings.keys.find((x) => x.provider === c.name)
                  const f = form[c.name]
                  if (!f) return null
                  return (
                    <div key={c.name} className="border border-neutral-800 bg-neutral-900/60 p-4">
                      <div className="mb-3 flex items-start justify-between gap-2">
                        <div>
                          <div className="font-semibold">{c.label}</div>
                          <div className="text-xs text-neutral-500">
                            {k ? (
                              <>
                                chave ···{k.key_hint} · gravada em {fmtData(k.updated_at)}
                              </>
                            ) : (
                              <>nenhuma chave cadastrada</>
                            )}
                          </div>
                        </div>
                        {k?.last_ok_at ? (
                          <span className="inline-flex items-center gap-1 border border-emerald-500/40 px-2 py-0.5 text-[11px] text-emerald-300">
                            <CheckCircle2 className="h-3 w-3" /> ok
                          </span>
                        ) : null}
                      </div>

                      {k?.last_error && (
                        <div className="mb-3 border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-200">
                          último erro: {k.last_error}
                        </div>
                      )}

                      <label className="mb-1 block text-xs text-neutral-400">
                        Chave da API{" "}
                        {k && <span className="text-neutral-600">(vazio mantém a atual)</span>}
                      </label>
                      <input
                        type="password"
                        autoComplete="off"
                        value={f.api_key}
                        placeholder={c.key_placeholder}
                        onChange={(e) => setForm({ ...form, [c.name]: { ...f, api_key: e.target.value } })}
                        className="mb-3 w-full border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm"
                      />

                      <label className="mb-1 block text-xs text-neutral-400">Modelo</label>
                      <input
                        value={f.model}
                        list={`modelos-${c.name}`}
                        onChange={(e) => setForm({ ...form, [c.name]: { ...f, model: e.target.value } })}
                        className="mb-1 w-full border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm"
                      />
                      <datalist id={`modelos-${c.name}`}>
                        {c.suggested_models.map((m) => (
                          <option key={m} value={m} />
                        ))}
                      </datalist>
                      <div className="mb-3 text-[11px] text-neutral-600">
                        padrão: {c.default_model}
                      </div>

                      <div className="mb-3 grid grid-cols-2 gap-3">
                        <div>
                          <label className="mb-1 block text-xs text-neutral-400">
                            US$ / Mtok entrada
                          </label>
                          <input
                            inputMode="decimal"
                            value={f.price_in_mtok}
                            placeholder="não informado"
                            onChange={(e) =>
                              setForm({ ...form, [c.name]: { ...f, price_in_mtok: e.target.value } })
                            }
                            className="w-full border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm"
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-xs text-neutral-400">
                            US$ / Mtok saída
                          </label>
                          <input
                            inputMode="decimal"
                            value={f.price_out_mtok}
                            placeholder="não informado"
                            onChange={(e) =>
                              setForm({ ...form, [c.name]: { ...f, price_out_mtok: e.target.value } })
                            }
                            className="w-full border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm"
                          />
                        </div>
                      </div>

                      <div className="mb-4 flex flex-wrap items-center gap-4 text-sm">
                        <label className="flex items-center gap-2">
                          <span className="text-xs text-neutral-400">Prioridade</span>
                          <select
                            value={f.priority}
                            onChange={(e) =>
                              setForm({ ...form, [c.name]: { ...f, priority: Number(e.target.value) } })
                            }
                            className="border border-neutral-700 bg-neutral-950 px-2 py-1 text-sm"
                          >
                            <option value={1}>1 — principal</option>
                            <option value={2}>2 — reserva</option>
                          </select>
                        </label>
                        <label className="flex items-center gap-2 text-xs text-neutral-400">
                          <input
                            type="checkbox"
                            checked={f.is_enabled}
                            onChange={(e) =>
                              setForm({ ...form, [c.name]: { ...f, is_enabled: e.target.checked } })
                            }
                          />
                          Ligado
                        </label>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          onClick={() => salvar(c.name)}
                          disabled={ocupado === `save:${c.name}`}
                          className="inline-flex items-center gap-2 border border-neutral-600 bg-neutral-800 px-3 py-1.5 text-sm hover:bg-neutral-700 disabled:opacity-50"
                        >
                          {ocupado === `save:${c.name}` && (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          )}
                          Salvar
                        </button>
                        <button
                          onClick={() => testar(c.name)}
                          disabled={!k || ocupado === `test:${c.name}`}
                          title={k ? "Faz uma chamada real ao provedor" : "Cadastre a chave antes de testar"}
                          className="inline-flex items-center gap-2 border border-sky-600/50 px-3 py-1.5 text-sm text-sky-200 hover:bg-sky-500/10 disabled:opacity-40"
                        >
                          {ocupado === `test:${c.name}` ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <PlugZap className="h-3.5 w-3.5" />
                          )}
                          Testar
                        </button>
                        {k && (
                          <button
                            onClick={() => remover(c.name)}
                            disabled={ocupado === `del:${c.name}`}
                            className="inline-flex items-center gap-2 border border-red-600/50 px-3 py-1.5 text-sm text-red-200 hover:bg-red-500/10 disabled:opacity-40"
                          >
                            <Trash2 className="h-3.5 w-3.5" /> Apagar
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>

              <Link
                href="/account/atendente"
                className="mt-4 inline-flex items-center gap-2 text-sm text-neutral-400 underline hover:text-neutral-200"
              >
                <BookOpen className="h-4 w-4" /> Base de conhecimento da minha conta
              </Link>
            </section>

            <section className="mb-10">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-400">
                  Consumo
                </h2>
                <div className="flex items-center gap-2">
                  <select
                    value={dias}
                    onChange={(e) => setDias(Number(e.target.value))}
                    className="border border-neutral-700 bg-neutral-950 px-2 py-1 text-sm"
                  >
                    <option value={7}>7 dias</option>
                    <option value={30}>30 dias</option>
                    <option value={90}>90 dias</option>
                  </select>
                  <button
                    onClick={() => void carregar()}
                    className="inline-flex items-center gap-2 border border-neutral-700 px-2 py-1 text-sm text-neutral-300 hover:bg-neutral-800"
                  >
                    <RefreshCw className="h-3.5 w-3.5" /> Atualizar
                  </button>
                </div>
              </div>

              {!usage?.rows.length ? (
                <div className="border border-neutral-800 bg-neutral-900/40 px-4 py-6 text-sm text-neutral-500">
                  Nenhuma chamada nos últimos {dias} dias.
                </div>
              ) : (
                <div className="overflow-x-auto border border-neutral-800">
                  <table className="w-full text-sm">
                    <thead className="bg-neutral-900 text-left text-xs uppercase text-neutral-500">
                      <tr>
                        <th className="px-3 py-2">Provedor</th>
                        <th className="px-3 py-2">Modelo</th>
                        <th className="px-3 py-2 text-right">Chamadas</th>
                        <th className="px-3 py-2 text-right">Tokens entrada</th>
                        <th className="px-3 py-2 text-right">Tokens saída</th>
                        <th className="px-3 py-2 text-right">Custo (US$)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {usage.rows.map((r) => (
                        <tr key={`${r.provider}:${r.model}`} className="border-t border-neutral-800">
                          <td className="px-3 py-2">{r.provider}</td>
                          <td className="px-3 py-2 text-neutral-400">{r.model}</td>
                          <td className="px-3 py-2 text-right">{fmtNum(r.calls)}</td>
                          <td className="px-3 py-2 text-right">{fmtNum(r.input_tokens)}</td>
                          <td className="px-3 py-2 text-right">{fmtNum(r.output_tokens)}</td>
                          <td className="px-3 py-2 text-right">
                            {r.cost_usd == null ? (
                              <span className="text-neutral-500">não apurado</span>
                            ) : (
                              <>
                                {r.cost_usd.toFixed(4)}
                                {r.calls_without_price > 0 && (
                                  <span
                                    className="ml-1 text-amber-400"
                                    title={`${r.calls_without_price} chamada(s) sem preço informado — o total está por baixo`}
                                  >
                                    *
                                  </span>
                                )}
                              </>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            <section>
              <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-400">
                  Fila de respostas
                </h2>
                <select
                  value={statusFiltro}
                  onChange={(e) => setStatusFiltro(e.target.value)}
                  className="border border-neutral-700 bg-neutral-950 px-2 py-1 text-sm"
                >
                  <option value="">todos</option>
                  <option value="pending">pendentes</option>
                  <option value="running">em execução</option>
                  <option value="done">respondidos</option>
                  <option value="failed">falharam</option>
                  <option value="skipped">ignorados</option>
                </select>
              </div>

              {!jobs.length ? (
                <div className="border border-neutral-800 bg-neutral-900/40 px-4 py-6 text-sm text-neutral-500">
                  Nada na fila.
                </div>
              ) : (
                <div className="space-y-2">
                  {jobs.map((j) => (
                    <div
                      key={j.id_job}
                      className="border border-neutral-800 bg-neutral-900/40 p-3 text-sm"
                    >
                      <div className="mb-1 flex flex-wrap items-center gap-2 text-xs">
                        <span
                          className={`border px-2 py-0.5 ${
                            STATUS_COR[j.status] || "text-neutral-400 border-neutral-700"
                          }`}
                        >
                          {j.status}
                        </span>
                        <span className="text-neutral-400">
                          {CANAL_LABEL[j.channel] || j.channel}
                        </span>
                        <span className="text-neutral-500">@{j.username || "—"}</span>
                        <span className="text-neutral-600">{fmtData(j.created_at)}</span>
                        {j.attempts > 1 && (
                          <span className="text-amber-400">{j.attempts} tentativas</span>
                        )}
                      </div>
                      {j.trigger_text && (
                        <div className="text-neutral-400">
                          <span className="text-neutral-600">cliente: </span>
                          {j.trigger_text.slice(0, 220)}
                        </div>
                      )}
                      {j.answer && (
                        <div className="text-neutral-200">
                          <span className="text-neutral-600">atendente: </span>
                          {j.answer.slice(0, 220)}
                        </div>
                      )}
                      {j.skip_reason && <div className="text-neutral-500">ignorado: {j.skip_reason}</div>}
                      {j.last_error && <div className="text-red-300">erro: {j.last_error}</div>}
                    </div>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  )
}
