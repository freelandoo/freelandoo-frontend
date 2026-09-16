"use client"

/**
 * COMÉRCIO ENTRE VIZINHOS — a tela de admin das migs 248 (delivery) e 249
 * (venda na vitrine).
 *
 * ⚠️ ESTA TELA É A RAZÃO DE AS DUAS TABELAS DE PREÇO EXISTIREM. A lição da mig
 * 244: a taxa do agendamento era `PLATFORM_FEE_CENTS = 1000` no código enquanto
 * a tela de admin escrevia noutro lugar — em produção havia 5% + R$2,50
 * configurados sem efeito nenhum. Tela morta é ruim; tela morta que MENTE é
 * pior, porque a pessoa decide preço olhando para ela. Aqui a tela e o service
 * leem a MESMA linha.
 *
 * ⚠️ A FILA DE DISPUTAS VEM PRIMEIRO, e não por estética: enquanto uma disputa
 * está aberta o repasse do vendedor fica CONGELADO (o varredor pula quem está
 * em disputa, de propósito). Sem esta fila, o dinheiro de uma briga entre dois
 * vizinhos ficaria preso para sempre — o único jeito de soltá-lo seria um
 * UPDATE na mão em produção.
 *
 * ⚠️ E QUEM JULGA É O ADMIN DA PLATAFORMA, não o síndico: ele é vizinho dos
 * dois lados, e julgar o 302 contra o 501 é o tipo de poder que transforma o
 * cargo num problema. (Difere do comprovante de residência da mig 206, que o
 * síndico lê porque ali ele é a autoridade natural sobre quem mora no prédio.)
 *
 * Convenções da casa respeitadas aqui: painel de admin é **pt-only** (não passa
 * por i18n) e a página **não fala com shadcn direto** — as peças saem de
 * `@/components/tabloide`.
 */

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { AlertCircle, Check, Gavel, Loader2, Package, ShoppingBag, Truck } from "lucide-react"
import {
  PageBackLink,
  TabloidField,
  TabloidInput,
  LoadingState,
  TABLOID_ACTION_CLASSES,
  TABLOID_OUTLINE_ACTION_CLASSES,
} from "@/components/tabloide"

type DeliveryType = {
  kind: string
  label: string
  price_cents: number
  expires_minutes: number
  confirm_hours: number
  is_active: boolean
}

type ListingSettings = {
  id: number
  platform_fee_cents: number
  platform_fee_percent: number
  holdback_days: number
  confirm_days: number
  is_active: boolean
} | null

type Dispute = {
  id_dispute: number
  id_order: number
  reason: string
  detail: string | null
  created_at: string
  listing_title: string
  amount_cents: number
  buyer_username: string | null
  seller_username: string | null
  community_name: string
}

/**
 * Os TRÊS motivos que existem — os mesmos do `DISPUTE_REASONS` do service e do
 * CHECK da mig 249. Listar um quarto aqui insinuaria um estado que o banco
 * recusa. Motivo desconhecido cai no próprio valor, em vez de sumir.
 */
const REASON_LABEL: Record<string, string> = {
  not_received: "Não recebeu",
  not_as_described: "Diferente do anunciado",
  other: "Outro",
}

const PANEL = "border-2 border-[#0B0B0D] bg-[#15120E] p-5 text-[#F5F1E8]"
const INNER = "border-2 border-[#0B0B0D] bg-[#1D1810] p-4"
const DANGER =
  "inline-flex items-center justify-center gap-2 border-2 border-[#0B0B0D] bg-[#B4231D] px-5 py-2.5 text-[11px] font-black uppercase tracking-[0.14em] text-[#F5F1E8] disabled:cursor-not-allowed disabled:opacity-55"

async function api<T>(url: string, init: RequestInit = {}): Promise<T> {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null
  const res = await fetch(url, {
    ...init,
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

const brl = (c: number) =>
  (Number(c || 0) / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })

/** "12,34" → 1234. Aceita o que o admin digita com ponto de milhar. */
function reaisToCents(v: string): number {
  const n = parseFloat(String(v).replace(/\./g, "").replace(",", "."))
  return Number.isFinite(n) ? Math.round(n * 100) : NaN
}

export default function ComercioVizinhoPage() {
  const router = useRouter()
  const [authChecked, setAuthChecked] = useState(false)
  const [loading, setLoading] = useState(true)
  const [feedback, setFeedback] = useState<{ ok: boolean; msg: string } | null>(null)

  const [types, setTypes] = useState<DeliveryType[]>([])
  const [listing, setListing] = useState<ListingSettings>(null)
  const [disputes, setDisputes] = useState<Dispute[]>([])

  /* Rascunhos editáveis: o formulário é separado do que veio do banco para que
     "salvar" seja um gesto explícito, e não cada tecla digitada. */
  const [draftTypes, setDraftTypes] = useState<Record<string, DeliveryType>>({})
  const [feeCents, setFeeCents] = useState("0,00")
  const [feePercent, setFeePercent] = useState("0")
  const [holdbackDays, setHoldbackDays] = useState("8")
  const [confirmDays, setConfirmDays] = useState("7")
  const [listingActive, setListingActive] = useState(true)

  const [savingKind, setSavingKind] = useState<string | null>(null)
  const [savingListing, setSavingListing] = useState(false)
  const [deciding, setDeciding] = useState<number | null>(null)
  const [notes, setNotes] = useState<Record<number, string>>({})

  useEffect(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null
    if (!token) {
      router.push("/login")
      return
    }
    fetch("/api/users/me", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("auth"))))
      .then((data) => {
        const isAdmin =
          data.is_admin ||
          data.roles?.some((r: { desc_role: string }) => r.desc_role === "Administrator")
        if (!isAdmin) {
          router.push("/")
          return
        }
        setAuthChecked(true)
      })
      .catch(() => router.push("/"))
  }, [router])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [s, d] = await Promise.all([
        api<{ delivery_types: DeliveryType[]; listing_settings: ListingSettings }>(
          "/api/admin/community-commerce/settings"
        ),
        api<{ disputes: Dispute[] }>("/api/admin/community-commerce/disputes"),
      ])
      setTypes(s.delivery_types || [])
      setDraftTypes(Object.fromEntries((s.delivery_types || []).map((t) => [t.kind, { ...t }])))
      setListing(s.listing_settings)
      if (s.listing_settings) {
        setFeeCents((s.listing_settings.platform_fee_cents / 100).toFixed(2).replace(".", ","))
        setFeePercent(String(s.listing_settings.platform_fee_percent))
        setHoldbackDays(String(s.listing_settings.holdback_days))
        setConfirmDays(String(s.listing_settings.confirm_days))
        setListingActive(s.listing_settings.is_active)
      }
      setDisputes(d.disputes || [])
    } catch (err) {
      setFeedback({ ok: false, msg: err instanceof Error ? err.message : "Erro ao carregar" })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (authChecked) void load()
  }, [authChecked, load])

  async function saveType(kind: string) {
    const d = draftTypes[kind]
    if (!d) return
    setSavingKind(kind)
    setFeedback(null)
    try {
      if (!Number.isFinite(d.price_cents) || d.price_cents < 0) throw new Error("Preço inválido")
      const r = await api<{ delivery_type: DeliveryType }>(
        `/api/admin/community-commerce/delivery-types/${kind}`,
        {
          method: "PUT",
          body: JSON.stringify({
            label: d.label,
            price_cents: d.price_cents,
            expires_minutes: d.expires_minutes,
            confirm_hours: d.confirm_hours,
            is_active: d.is_active,
          }),
        }
      )
      setTypes((prev) => prev.map((t) => (t.kind === kind ? r.delivery_type : t)))
      setDraftTypes((p) => ({ ...p, [kind]: { ...r.delivery_type } }))
      setFeedback({ ok: true, msg: `"${r.delivery_type.label}" salvo.` })
    } catch (err) {
      setFeedback({ ok: false, msg: err instanceof Error ? err.message : "Erro ao salvar" })
    } finally {
      setSavingKind(null)
    }
  }

  async function saveListing() {
    setSavingListing(true)
    setFeedback(null)
    try {
      const cents = reaisToCents(feeCents)
      if (!Number.isFinite(cents) || cents < 0) throw new Error("Taxa fixa inválida")
      const pct = parseFloat(feePercent.replace(",", "."))
      if (!Number.isFinite(pct) || pct < 0 || pct > 99) throw new Error("Percentual entre 0 e 99")
      const hold = parseInt(holdbackDays, 10)
      if (!Number.isFinite(hold) || hold < 0 || hold > 60) throw new Error("Retenção entre 0 e 60")
      const conf = parseInt(confirmDays, 10)
      if (!Number.isFinite(conf) || conf < 1 || conf > 60)
        throw new Error("Confirmação entre 1 e 60")

      const r = await api<{ listing_settings: ListingSettings }>(
        "/api/admin/community-commerce/listing-settings",
        {
          method: "PUT",
          body: JSON.stringify({
            platform_fee_cents: cents,
            platform_fee_percent: pct,
            holdback_days: hold,
            confirm_days: conf,
            is_active: listingActive,
          }),
        }
      )
      setListing(r.listing_settings)
      setFeedback({ ok: true, msg: "Régua da venda salva." })
    } catch (err) {
      setFeedback({ ok: false, msg: err instanceof Error ? err.message : "Erro ao salvar" })
    } finally {
      setSavingListing(false)
    }
  }

  async function decide(id: number, verdict: "refund" | "release") {
    // ⚠️ CONFIRMAÇÃO EXPLÍCITA: os dois vereditos MOVEM DINHEIRO DE VERDADE e
    // não têm desfazer — "estornar" chama o gateway, "liberar" aprova o repasse.
    const d = disputes.find((x) => x.id_dispute === id)
    const label =
      verdict === "refund"
        ? `Estornar ${brl(d?.amount_cents || 0)} para @${d?.buyer_username || "?"}?`
        : `Liberar o repasse para @${d?.seller_username || "?"}?`
    if (!window.confirm(`${label}\n\nIsto move dinheiro e não tem desfazer.`)) return

    setDeciding(id)
    setFeedback(null)
    try {
      await api(`/api/admin/community-commerce/disputes/${id}/decide`, {
        method: "POST",
        body: JSON.stringify({ verdict, note: notes[id] || "" }),
      })
      setDisputes((prev) => prev.filter((x) => x.id_dispute !== id))
      setFeedback({
        ok: true,
        msg: verdict === "refund" ? "Estornado ao comprador." : "Repasse liberado ao vendedor.",
      })
    } catch (err) {
      setFeedback({ ok: false, msg: err instanceof Error ? err.message : "Erro ao decidir" })
    } finally {
      setDeciding(null)
    }
  }

  if (!authChecked) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10">
        <LoadingState />
      </div>
    )
  }

  return (
    <div className="fl-sharp mx-auto max-w-4xl px-4 py-8">
      <PageBackLink href="/administracao" className="mb-5" />

      <div className="mb-6">
        <h1 className="fl-display flex items-center gap-2 text-3xl leading-none">
          <ShoppingBag className="h-6 w-6" /> Comércio entre vizinhos
        </h1>
        <p className="mt-2 text-sm text-[#9A938A]">
          Preços do delivery (mig 248), régua da venda na vitrine (mig 249) e a fila de disputas.
        </p>
      </div>

      {feedback && (
        <div
          className={`mb-4 flex items-center gap-2 border-2 px-3 py-2 text-sm ${
            feedback.ok
              ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
              : "border-red-500/40 bg-red-500/10 text-red-400"
          }`}
        >
          {feedback.ok ? <Check className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
          {feedback.msg}
        </div>
      )}

      {loading ? (
        <LoadingState />
      ) : (
        <div className="space-y-6">
          {/* ── DISPUTAS ───────────────────────────────────────────────────
              Primeiro na página porque é a única seção com dinheiro PARADO
              esperando uma decisão humana. */}
          <section className={PANEL}>
            <h2 className="fl-display flex items-center gap-2 text-xl leading-none">
              <Gavel className="h-5 w-5" /> Disputas abertas
              {disputes.length > 0 && (
                <span className="border-2 border-[#0B0B0D] bg-[#B4231D] px-2 py-0.5 text-xs font-black">
                  {disputes.length}
                </span>
              )}
            </h2>
            <p className="mt-2 text-xs text-[#9A938A]">
              Enquanto a disputa está aberta o repasse do vendedor fica congelado — o varredor pula
              quem está em disputa, de propósito. Decidir aqui é o que solta o dinheiro.
            </p>

            {disputes.length === 0 ? (
              <p className="py-6 text-center text-sm text-[#9A938A]">Nenhuma disputa aberta.</p>
            ) : (
              <div className="mt-4 space-y-4">
                {disputes.map((d) => (
                  <div key={d.id_dispute} className={INNER}>
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-bold">{d.listing_title}</p>
                        <p className="text-xs text-[#9A938A]">
                          {d.community_name} · @{d.buyer_username} comprou de @{d.seller_username} ·{" "}
                          {new Date(d.created_at).toLocaleDateString("pt-BR")}
                        </p>
                      </div>
                      <span className="font-black">{brl(d.amount_cents)}</span>
                    </div>

                    <p className="mt-3 text-sm">
                      <span className="font-bold">{REASON_LABEL[d.reason] || d.reason}</span>
                      {d.detail ? <span className="text-[#9A938A]"> — {d.detail}</span> : null}
                    </p>

                    <TabloidInput
                      className="mt-3"
                      placeholder="Nota da decisão (opcional, fica no histórico)"
                      value={notes[d.id_dispute] || ""}
                      onChange={(e) => setNotes((p) => ({ ...p, [d.id_dispute]: e.target.value }))}
                    />

                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        className={DANGER}
                        disabled={deciding === d.id_dispute}
                        onClick={() => decide(d.id_dispute, "refund")}
                      >
                        {deciding === d.id_dispute ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : null}
                        Estornar ao comprador
                      </button>
                      <button
                        type="button"
                        className={TABLOID_ACTION_CLASSES}
                        disabled={deciding === d.id_dispute}
                        onClick={() => decide(d.id_dispute, "release")}
                      >
                        {deciding === d.id_dispute ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : null}
                        Liberar ao vendedor
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* ── DELIVERY: a tabela de preços ───────────────────────────────── */}
          <section className={PANEL}>
            <h2 className="fl-display flex items-center gap-2 text-xl leading-none">
              <Truck className="h-5 w-5" /> Delivery entre vizinhos
            </h2>
            <p className="mt-2 text-xs text-[#9A938A]">
              O preço que quem pede paga. Quem entrega absorve a tarifa do gateway, então o líquido
              depende de quem cobra hoje — a tela de quem entrega mostra o líquido, nunca este
              bruto.
            </p>

            <div className="mt-4 space-y-4">
              {types.length === 0 ? (
                <p className="text-sm text-[#9A938A]">Nenhum tipo cadastrado.</p>
              ) : (
                types.map((t) => {
                  const d = draftTypes[t.kind] || t
                  const dirty =
                    d.label !== t.label ||
                    d.price_cents !== t.price_cents ||
                    d.expires_minutes !== t.expires_minutes ||
                    d.confirm_hours !== t.confirm_hours ||
                    d.is_active !== t.is_active
                  const set = (patch: Partial<DeliveryType>) =>
                    setDraftTypes((p) => ({ ...p, [t.kind]: { ...d, ...patch } }))
                  return (
                    <div key={t.kind} className={INNER}>
                      <div className="mb-3 flex items-center justify-between">
                        <span className="flex items-center gap-2 font-mono text-xs uppercase text-[#9A938A]">
                          <Package className="h-3.5 w-3.5" /> {t.kind}
                        </span>
                        <label className="flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={d.is_active}
                            onChange={(e) => set({ is_active: e.target.checked })}
                          />
                          Ativo
                        </label>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2">
                        <TabloidField label="Nome na tela">
                          <TabloidInput
                            value={d.label}
                            onChange={(e) => set({ label: e.target.value })}
                          />
                        </TabloidField>
                        <TabloidField label="Preço (R$)">
                          <TabloidInput
                            value={(d.price_cents / 100).toFixed(2).replace(".", ",")}
                            onChange={(e) => {
                              const c = reaisToCents(e.target.value)
                              set({ price_cents: Number.isFinite(c) ? c : 0 })
                            }}
                          />
                        </TabloidField>
                        <TabloidField
                          label="Expira em (minutos)"
                          hint="Chamado que ninguém pega morre sem custo: só cobra no aceite."
                        >
                          <TabloidInput
                            type="number"
                            value={d.expires_minutes}
                            onChange={(e) =>
                              set({ expires_minutes: parseInt(e.target.value, 10) || 0 })
                            }
                          />
                        </TabloidField>
                        <TabloidField label="Prazo de confirmação (horas)">
                          <TabloidInput
                            type="number"
                            value={d.confirm_hours}
                            onChange={(e) =>
                              set({ confirm_hours: parseInt(e.target.value, 10) || 1 })
                            }
                          />
                        </TabloidField>
                      </div>

                      <button
                        type="button"
                        className={`${TABLOID_ACTION_CLASSES} mt-3`}
                        disabled={!dirty || savingKind === t.kind}
                        onClick={() => saveType(t.kind)}
                      >
                        {savingKind === t.kind ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                        Salvar
                      </button>
                    </div>
                  )
                })
              )}
            </div>
          </section>

          {/* ── VENDA NA VITRINE: a régua ──────────────────────────────────── */}
          <section className={PANEL}>
            <h2 className="fl-display flex items-center gap-2 text-xl leading-none">
              <ShoppingBag className="h-5 w-5" /> Venda na vitrine
            </h2>
            <p className="mt-2 text-xs text-[#9A938A]">
              A taxa é GLOBAL: mexer aqui muda o que todo vendedor de toda comunidade recebe. Ela
              nasceu em zero porque a venda entre vizinhos foi pedida sem taxa.
            </p>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <TabloidField label="Taxa fixa por venda (R$)">
                <TabloidInput value={feeCents} onChange={(e) => setFeeCents(e.target.value)} />
              </TabloidField>
              <TabloidField label="Taxa percentual (%)">
                <TabloidInput value={feePercent} onChange={(e) => setFeePercent(e.target.value)} />
              </TabloidField>
              <TabloidField
                label="Retenção / holdback (dias)"
                hint="Existe por causa do CDC (arrependimento em compra remota). Diferente do delivery, que é entrega em mãos e não tem retenção."
              >
                <TabloidInput
                  type="number"
                  value={holdbackDays}
                  onChange={(e) => setHoldbackDays(e.target.value)}
                />
              </TabloidField>
              <TabloidField
                label="Prazo para o comprador confirmar (dias)"
                hint="Vencido o prazo sem resposta, o pedido conclui sozinho — senão o repasse dependeria da boa vontade de quem já ficou com a mercadoria."
              >
                <TabloidInput
                  type="number"
                  value={confirmDays}
                  onChange={(e) => setConfirmDays(e.target.value)}
                />
              </TabloidField>
            </div>

            <label className="mt-3 flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={listingActive}
                onChange={(e) => setListingActive(e.target.checked)}
              />
              Cobrar taxa da plataforma (desmarcado = sem taxa)
            </label>

            <button
              type="button"
              className={`${TABLOID_ACTION_CLASSES} mt-4`}
              disabled={savingListing}
              onClick={saveListing}
            >
              {savingListing ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Salvar régua
            </button>

            {listing && (
              <p className="mt-3 text-[11px] text-[#9A938A]">
                Valendo agora: {brl(listing.platform_fee_cents)} + {listing.platform_fee_percent}% ·
                retenção de {listing.holdback_days} dia(s) · confirmação em {listing.confirm_days}{" "}
                dia(s) · {listing.is_active ? "taxa ativa" : "taxa desligada"}
              </p>
            )}

            <button
              type="button"
              className={`${TABLOID_OUTLINE_ACTION_CLASSES} mt-4`}
              onClick={() => void load()}
            >
              Recarregar
            </button>
          </section>
        </div>
      )}
    </div>
  )
}
