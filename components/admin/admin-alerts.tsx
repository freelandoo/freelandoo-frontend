"use client"

/**
 * AdminAlerts — modal de pendências que aparece 1x por login (sessão) para
 * administradores. Lista posts denunciados pendentes e afiliados com comissão
 * urgente (>20d). Montado no layout raiz; é no-op para quem não é admin ou não
 * está logado. Nunca quebra a navegação (tudo em try/catch silencioso).
 *
 * "1x por login": a sessão é marcada pelo token atual — um novo login gera um
 * token novo e o alerta volta a aparecer uma vez.
 *
 * Resolver um post (botão "Resolvido" na lista /administracao/posts) o remove
 * deste alerta no próximo login.
 */
import { useEffect, useState } from "react"
import Link from "next/link"
import { AlertTriangle, Flag, Coins, X, ArrowRight, ShieldAlert } from "lucide-react"
import { getToken } from "@/lib/auth"

type ReportedPost = {
  id: string
  title: string | null
  feed_kind: "feed" | "bees" | null
  report_count: number
  top_report_reason: string | null
  owner_name: string | null
  owner_username: string | null
  thumbnail_url: string | null
}
type UrgentAffiliate = {
  id_affiliate: string
  name: string | null
  email: string | null
  urgent_cents: number
  unpaid_count: number
  oldest_unpaid_at: string | null
}
type AlertSummary = {
  reported_posts: ReportedPost[]
  reported_posts_count: number
  urgent_affiliates: UrgentAffiliate[]
  urgent_affiliates_count: number
  urgent_total_cents: number
  escalated_disputes_count?: number
  has_alerts: boolean
}

const REASON_LABEL: Record<string, string> = {
  spam: "Spam",
  fraud: "Golpe",
  harassment: "Assédio",
  inappropriate: "Impróprio",
  hate: "Ódio",
  forbidden_item: "Proibido",
  personal_data: "Dados",
  other: "Outros",
}

const SESSION_KEY = "admin_alerts_token"

function brl(cents: number) {
  return ((cents || 0) / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
}

export function AdminAlerts() {
  const [data, setData] = useState<AlertSummary | null>(null)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const token = getToken()
    if (!token || typeof window === "undefined") return
    // Já mostrado nesta sessão para este token? (mesmo login) → não repete.
    if (sessionStorage.getItem(SESSION_KEY) === token) return

    let cancelled = false
    ;(async () => {
      try {
        const meRes = await fetch("/api/users/me", { headers: { Authorization: `Bearer ${token}` } })
        if (!meRes.ok) return
        const me = await meRes.json()
        const isAdmin =
          me.is_admin || me.roles?.some((r: { desc_role: string }) => r.desc_role === "Administrator")
        // Marca a sessão independente do resultado: evita refetch a cada navegação.
        sessionStorage.setItem(SESSION_KEY, token)
        if (!isAdmin) return

        const res = await fetch("/api/admin/alerts/summary", {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (!res.ok) return
        const summary: AlertSummary = await res.json()
        if (cancelled || !summary.has_alerts) return
        setData(summary)
        setOpen(true)
      } catch {
        /* silencioso — alerta nunca atrapalha a navegação */
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  if (!open || !data) return null

  const close = () => setOpen(false)

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4"
      role="dialog"
      aria-modal
      onClick={close}
    >
      <div
        className="relative flex max-h-[88vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start gap-3 border-b border-border px-5 py-4">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 text-amber-300 ring-1 ring-white/10">
            <AlertTriangle className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <h2 className="text-lg font-semibold tracking-tight">Pendências para resolver</h2>
            <p className="text-sm text-muted-foreground">
              {data.reported_posts_count > 0 && (
                <>{data.reported_posts_count} post{data.reported_posts_count > 1 ? "s" : ""} denunciado{data.reported_posts_count > 1 ? "s" : ""}</>
              )}
              {data.reported_posts_count > 0 && data.urgent_affiliates_count > 0 && " · "}
              {data.urgent_affiliates_count > 0 && (
                <>{data.urgent_affiliates_count} afiliado{data.urgent_affiliates_count > 1 ? "s" : ""} urgente{data.urgent_affiliates_count > 1 ? "s" : ""}</>
              )}
            </p>
          </div>
          <button
            type="button"
            onClick={close}
            className="ml-auto rounded-full p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Fechar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          {/* Posts denunciados */}
          {data.reported_posts_count > 0 && (
            <section>
              <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                <Flag className="h-3.5 w-3.5 text-amber-300" />
                Posts denunciados
              </div>
              <ul className="space-y-1.5">
                {data.reported_posts.slice(0, 6).map((p) => (
                  <li
                    key={p.id}
                    className="flex items-center gap-3 rounded-lg border border-border bg-background/40 px-2.5 py-2"
                  >
                    <div className="h-10 w-10 shrink-0 overflow-hidden rounded-md bg-muted">
                      {p.thumbnail_url ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img src={p.thumbnail_url} alt="" className="h-full w-full object-cover" />
                      ) : null}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {p.title || <span className="italic text-muted-foreground">Sem título</span>}
                      </p>
                      <p className="truncate text-[11px] text-muted-foreground">
                        {(p.owner_name || p.owner_username || "—")} · {p.feed_kind === "bees" ? "Bees" : "Feed"}
                      </p>
                    </div>
                    <span className="shrink-0 rounded-full bg-red-500/15 px-2 py-0.5 text-[11px] font-semibold text-red-300">
                      {p.report_count}× {p.top_report_reason ? REASON_LABEL[p.top_report_reason] || p.top_report_reason : ""}
                    </span>
                  </li>
                ))}
              </ul>
              {data.reported_posts_count > 6 && (
                <p className="mt-1.5 text-[11px] text-muted-foreground">
                  +{data.reported_posts_count - 6} outro{data.reported_posts_count - 6 > 1 ? "s" : ""}…
                </p>
              )}
              <Link
                href="/administracao/posts"
                onClick={close}
                className="mt-2.5 inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-sm font-medium hover:border-primary/50 hover:text-primary"
              >
                Revisar posts denunciados <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </section>
          )}

          {/* Afiliados urgentes */}
          {data.urgent_affiliates_count > 0 && (
            <section>
              <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                <Coins className="h-3.5 w-3.5 text-red-300" />
                Afiliados a pagar (urgente · &gt;20d) · total {brl(data.urgent_total_cents)}
              </div>
              <ul className="space-y-1.5">
                {data.urgent_affiliates.slice(0, 6).map((a) => (
                  <li
                    key={a.id_affiliate}
                    className="flex items-center gap-3 rounded-lg border border-red-500/20 bg-red-500/5 px-2.5 py-2"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{a.name || "—"}</p>
                      <p className="truncate text-[11px] text-muted-foreground">{a.email}</p>
                    </div>
                    <span className="shrink-0 rounded-full bg-red-500/15 px-2 py-0.5 text-[11px] font-semibold text-red-300">
                      {brl(a.urgent_cents)}
                    </span>
                  </li>
                ))}
              </ul>
              {data.urgent_affiliates_count > 6 && (
                <p className="mt-1.5 text-[11px] text-muted-foreground">
                  +{data.urgent_affiliates_count - 6} outro{data.urgent_affiliates_count - 6 > 1 ? "s" : ""}…
                </p>
              )}
              <Link
                href="/admin/afiliados"
                onClick={close}
                className="mt-2.5 inline-flex items-center gap-1.5 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-sm font-medium text-red-300 hover:bg-red-500/20"
              >
                Pagar afiliados <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </section>
          )}
          {/* Disputas escaladas (proteção de pagamento) */}
          {(data.escalated_disputes_count ?? 0) > 0 && (
            <section>
              <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                <ShieldAlert className="h-3.5 w-3.5 text-rose-300" />
                Disputas escaladas
              </div>
              <p className="text-sm text-muted-foreground">
                {data.escalated_disputes_count} disputa{(data.escalated_disputes_count ?? 0) > 1 ? "s" : ""} aguardando sua decisão (reembolsar ou liberar).
              </p>
              <Link
                href="/administracao/disputas"
                onClick={close}
                className="mt-2.5 inline-flex items-center gap-1.5 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-1.5 text-sm font-medium text-rose-300 hover:bg-rose-500/20"
              >
                Revisar disputas <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </section>
          )}
        </div>

        <div className="border-t border-border px-5 py-3 text-right">
          <button
            type="button"
            onClick={close}
            className="rounded-lg border border-border px-4 py-2 text-sm text-muted-foreground hover:text-foreground"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  )
}
