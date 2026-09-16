"use client"

/**
 * Painel de qualidade dos números do WhatsApp (W6).
 *
 * ─── POR QUE ESTA TELA EXISTE ───────────────────────────────────────────────
 *
 * Na fase 1 da Cloud API os números dos clientes moram no WABA da Freelandoo, e
 * o teto de números (2 no começo, até 20) sobe sozinho conforme a qualidade
 * AGREGADA do portfólio. Um número ruim trava o aumento para todo mundo.
 *
 * A punição direta é do dono do número; o crescimento travado é nosso. Sem esta
 * lista, o sintoma chega meses depois como "o limite parou de subir" — sem nome
 * e sem data, e aí já não há como saber quem causou.
 *
 * Estilo dark utilitário, pt-only (padrão admin: o que traduz é o produto, não
 * a sala de máquinas) e cantos retos (.fl-sharp). Sem shadcn direto — o lint da
 * casa proíbe em página.
 */

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Loader2, RefreshCw, ShieldAlert, Unplug } from "lucide-react"

type NumberRow = {
  id_instance: string
  id_user: string
  provider: string
  evolution_instance: string | null
  waba_id: string | null
  status: string
  connected_number: string | null
  quality_rating: string | null
  number_status: string | null
  quality_checked_at: string | null
  last_seen_at: string | null
  created_at: string
  username: string | null
  user_name: string | null
  email: string | null
}

type Payload = {
  numbers: NumberRow[]
  tally: Record<string, number>
  total: number
  phone_number_limit: number
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

/**
 * ⚠️ `null` é "ainda não sabemos", NUNCA "está tudo bem". Pintar de verde o
 * desconhecido é a única leitura que faria este painel mentir na direção
 * perigosa — quem olha concluiria que o portfólio está saudável sem nenhuma
 * medição por trás.
 */
function ratingStyle(rating: string | null) {
  switch (String(rating || "").toUpperCase()) {
    case "GREEN":
      return { label: "Verde", cls: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400" }
    case "YELLOW":
      return { label: "Amarelo", cls: "border-amber-500/30 bg-amber-500/10 text-amber-400" }
    case "RED":
      return { label: "Vermelho", cls: "border-red-500/30 bg-red-500/10 text-red-400" }
    default:
      return { label: "Sem medição", cls: "border-border bg-card text-muted-foreground" }
  }
}

function fmtDate(iso: string | null) {
  if (!iso) return "—"
  return new Date(iso).toLocaleString("pt-BR")
}

function fmtPhone(digits: string | null) {
  const d = String(digits || "").replace(/\D/g, "")
  if (d.length < 12) return digits || "—"
  const rest = d.slice(4)
  const half = rest.length > 8 ? 5 : 4
  return `+${d.slice(0, 2)} (${d.slice(2, 4)}) ${rest.slice(0, half)}-${rest.slice(half)}`
}

export default function AdminWhatsappPage() {
  const router = useRouter()
  const [data, setData] = useState<Payload | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [busy, setBusy] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError("")
    try {
      setData(await api<Payload>("/api/admin/whatsapp/numbers"))
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao carregar")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  async function disconnect(row: NumberRow) {
    const who = row.username ? `@${row.username}` : row.id_user
    const ok = window.confirm(
      `Desligar o número ${fmtPhone(row.connected_number)} de ${who}?\n\n` +
        "O número sai do nosso WABA na Meta e a pessoa perde o canal até reconectar. " +
        "As conversas já recebidas continuam na caixa dela."
    )
    if (!ok) return
    setBusy(row.id_instance)
    try {
      await api(`/api/admin/whatsapp/numbers/${row.id_instance}`, { method: "DELETE" })
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao desligar")
    } finally {
      setBusy(null)
    }
  }

  const tally = data?.tally || {}
  const limit = data?.phone_number_limit ?? 20

  return (
    <div className="fl-sharp min-h-screen bg-background p-4 md:p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.push("/administracao")}
            className="flex h-9 items-center gap-2 border border-border bg-card px-3 text-sm text-muted-foreground transition hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </button>
          <h1 className="flex items-center gap-2 text-xl font-bold md:text-2xl">
            <ShieldAlert className="h-6 w-6" />
            WhatsApp — qualidade dos números
          </h1>
          <button
            type="button"
            onClick={load}
            disabled={loading}
            className="ml-auto flex h-9 w-9 items-center justify-center border border-border bg-card text-muted-foreground transition hover:text-foreground disabled:opacity-50"
            aria-label="Atualizar"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          </button>
        </div>

        {error && (
          <p className="border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400">{error}</p>
        )}

        <section className="border border-border bg-card p-4">
          <h2 className="text-sm font-bold uppercase tracking-wide">O portfólio</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Os números vivem no WABA da Freelandoo. O teto sobe sozinho com a qualidade agregada — um
            número ruim trava o aumento para todos. Acima de {limit} exige ticket no Direct Support, e
            esse é o gatilho da fase 2 (Tech Provider), onde cada cliente traz o WABA dele.
          </p>

          <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-5">
            <div className="border border-border p-3">
              <div className="text-2xl font-bold">
                {data?.total ?? "—"}
                <span className="text-sm font-normal text-muted-foreground"> / {limit}</span>
              </div>
              <div className="text-xs text-muted-foreground">números no portfólio</div>
            </div>
            {(["GREEN", "YELLOW", "RED", "UNKNOWN"] as const).map((k) => {
              const s = ratingStyle(k === "UNKNOWN" ? null : k)
              return (
                <div key={k} className={`border p-3 ${s.cls}`}>
                  <div className="text-2xl font-bold">{tally[k] ?? 0}</div>
                  <div className="text-xs opacity-80">{s.label}</div>
                </div>
              )
            })}
          </div>

          {(data?.total ?? 0) >= Math.max(1, limit - 5) && (
            <p className="mt-3 border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-400">
              Perto do teto — hora de abrir a fase 2 (Tech Provider), onde este limite deixa de existir.
            </p>
          )}
        </section>

        <section className="border border-border bg-card p-4">
          <h2 className="text-sm font-bold uppercase tracking-wide">Números conectados</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Ordenados por gravidade. &quot;Sem medição&quot; é ausência de notícia, não saúde: a Meta só
            manda evento quando algo muda, e o rating só é lido quando a pessoa abre a aba.
          </p>

          {loading && !data ? (
            <div className="flex items-center gap-2 py-10 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Carregando…
            </div>
          ) : !data || data.numbers.length === 0 ? (
            <div className="mt-4 border border-dashed border-border py-16 text-center text-sm text-muted-foreground">
              Nenhum número conectado ainda.
            </div>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-border text-left text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="py-2 pr-3">Número</th>
                    <th className="py-2 pr-3">Dono</th>
                    <th className="py-2 pr-3">Qualidade</th>
                    <th className="py-2 pr-3">Status na Meta</th>
                    <th className="py-2 pr-3">Provedor</th>
                    <th className="py-2 pr-3">Última notícia</th>
                    <th className="py-2" />
                  </tr>
                </thead>
                <tbody>
                  {data.numbers.map((row) => {
                    const s = ratingStyle(row.quality_rating)
                    return (
                      <tr key={row.id_instance} className="border-b border-border/50">
                        <td className="py-2 pr-3 font-mono">{fmtPhone(row.connected_number)}</td>
                        <td className="py-2 pr-3">
                          <div>{row.user_name || "—"}</div>
                          <div className="text-xs text-muted-foreground">
                            {row.username ? `@${row.username}` : row.email || ""}
                          </div>
                        </td>
                        <td className="py-2 pr-3">
                          <span className={`border px-2 py-0.5 text-xs ${s.cls}`}>{s.label}</span>
                        </td>
                        <td className="py-2 pr-3">
                          <div>{row.number_status || "—"}</div>
                          <div className="text-xs text-muted-foreground">sessão: {row.status}</div>
                        </td>
                        <td className="py-2 pr-3 text-xs uppercase text-muted-foreground">{row.provider}</td>
                        <td className="py-2 pr-3 text-xs text-muted-foreground">
                          {fmtDate(row.quality_checked_at)}
                        </td>
                        <td className="py-2 text-right">
                          <button
                            type="button"
                            onClick={() => disconnect(row)}
                            disabled={busy === row.id_instance}
                            className="inline-flex h-8 items-center gap-2 border border-border px-3 text-xs text-muted-foreground transition hover:border-red-500/40 hover:text-red-400 disabled:opacity-50"
                          >
                            {busy === row.id_instance ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Unplug className="h-3.5 w-3.5" />
                            )}
                            Desligar
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
