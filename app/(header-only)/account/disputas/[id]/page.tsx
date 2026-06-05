"use client"

import { useEffect, useState, use as usePromise } from "react"
import Link from "next/link"
import { AlertTriangle, CheckCircle2, Clock, Package, Truck } from "lucide-react"
import {
  EmptyState,
  ErrorState,
  LoadingState,
  PageShell,
  TabloidBackLink,
  TabloidPageIntro,
} from "@/components/tabloide"

interface Dispute {
  id: number
  domain: "product" | "booking"
  ref_id: number
  reason_code: string
  state: string
  description: string | null
  resolution_note: string | null
  created_at: string
}
interface Evidence { id: number; role: string; photo_url: string | null }
interface ReturnInfo {
  id: number
  reverse_status: string
  reverse_tracking_code: string | null
  reverse_auth_code: string | null
  reverse_label_url: string | null
}

const REASON_LABEL: Record<string, string> = {
  product_not_arrived: "Não chegou",
  product_wrong: "Chegou errado",
  product_defective: "Chegou com defeito",
  service_no_show: "Prestador não apareceu",
  scam: "Golpe / fraude",
  other: "Outro motivo",
}
const STATE_LABEL: Record<string, { label: string; classes: string }> = {
  open: { label: "Aberta", classes: "border-[#A16207] bg-[#FEF3C7] text-[#854D0E]" },
  awaiting_return: { label: "Devolução pendente", classes: "border-[#0369A1] bg-[#E0F2FE] text-[#075985]" },
  return_in_transit: { label: "Devolução a caminho", classes: "border-[#0369A1] bg-[#E0F2FE] text-[#075985]" },
  return_delivered: { label: "Devolução entregue", classes: "border-[#15803D] bg-[#DCFCE7] text-[#166534]" },
  resolved_refund: { label: "Reembolsado", classes: "border-[#15803D] bg-[#DCFCE7] text-[#166534]" },
  resolved_release: { label: "Liberado p/ vendedor", classes: "border-[#52525B] bg-[#E4E4E7] text-[#3F3F46]" },
  escalated_admin: { label: "Em análise", classes: "border-[#A16207] bg-[#FEF3C7] text-[#854D0E]" },
}

function getToken() {
  if (typeof window === "undefined") return null
  return localStorage.getItem("token")
}

export default function DisputeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = usePromise(params)
  const [data, setData] = useState<{ dispute: Dispute; evidence: Evidence[]; return: ReturnInfo | null } | null>(null)
  const [state, setState] = useState<"loading" | "loaded" | "error">("loading")

  useEffect(() => {
    let cancelled = false
    async function load() {
      const token = getToken()
      if (!token) { setState("error"); return }
      try {
        const res = await fetch(`/api/me/disputes/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        })
        const d = await res.json()
        if (cancelled) return
        if (!res.ok) throw new Error(d?.error || "fail")
        setData(d)
        setState("loaded")
      } catch {
        if (!cancelled) setState("error")
      }
    }
    load()
    return () => { cancelled = true }
  }, [id])

  const dispute = data?.dispute
  const ret = data?.return
  const st = dispute ? (STATE_LABEL[dispute.state] || STATE_LABEL.open) : null
  const hasReturn = !!ret && ret.reverse_status !== "pending"
  const refunded = dispute?.state === "resolved_refund"

  return (
    <PageShell className="tabloid-account-page md:pl-[80px]">
      <main className="relative z-10 mx-auto w-full max-w-2xl px-4 py-10 md:py-12">
        <TabloidPageIntro
          eyebrow="Proteção"
          title="DEVOLUÇÃO."
          subtitle="Acompanhe sua disputa e os passos para devolver o produto."
          back={<TabloidBackLink href="/account/compras">Voltar</TabloidBackLink>}
          className="mb-8"
        />

        {state === "loading" && <div className="py-10"><LoadingState label="Carregando disputa..." /></div>}
        {state === "error" && <ErrorState title="Disputa indisponível" description="Não foi possível carregar esta disputa." />}
        {state === "loaded" && !dispute && (
          <EmptyState icon={<AlertTriangle className="h-6 w-6" />} title="Disputa não encontrada" description="" />
        )}

        {state === "loaded" && dispute && (
          <div className="flex flex-col gap-4">
            <div className="fl-card fl-hard rounded-[6px] p-4">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-base font-black text-[var(--fl-ink)]">
                  {REASON_LABEL[dispute.reason_code] || dispute.reason_code}
                </h2>
                {st && (
                  <span className={`inline-flex rounded-[2px] border px-2 py-0.5 text-[10px] font-black uppercase tracking-wide ${st.classes}`}>
                    {st.label}
                  </span>
                )}
              </div>
              <p className="mt-1 text-xs text-[#756d5f]">Disputa #{dispute.id} · {dispute.domain === "product" ? "Pedido" : "Agendamento"} #{dispute.ref_id}</p>
              {dispute.description && <p className="mt-2 whitespace-pre-wrap text-sm text-[#3F3F46]">{dispute.description}</p>}
              {dispute.resolution_note && (
                <p className="mt-2 rounded-[4px] border-2 border-[#0B0B0D]/20 bg-black/5 px-3 py-2 text-xs text-[#5b554b]">
                  {dispute.resolution_note}
                </p>
              )}
            </div>

            {refunded && (
              <div className="fl-card fl-hard rounded-[6px] border-[#15803D] p-4">
                <div className="flex items-center gap-2 text-[#166534]">
                  <CheckCircle2 className="h-5 w-5" />
                  <p className="text-sm font-black">Reembolso efetuado</p>
                </div>
                <p className="mt-1 text-xs text-[#5b554b]">O valor volta pelo mesmo meio de pagamento (cartão pode levar até 2 faturas).</p>
              </div>
            )}

            {hasReturn && !refunded && (
              <div className="fl-card fl-hard rounded-[6px] p-4">
                <div className="mb-3 flex items-center gap-2">
                  <Truck className="h-5 w-5 text-[#075985]" />
                  <h3 className="text-sm font-black text-[var(--fl-ink)]">Como devolver</h3>
                </div>
                <ol className="flex flex-col gap-2 text-sm text-[#3F3F46]">
                  <li className="flex gap-2"><span className="font-black">1.</span> Embale o produto com cuidado.</li>
                  <li className="flex gap-2">
                    <span className="font-black">2.</span>
                    <span>
                      Leve até uma agência dos Correios e informe o código de autorização de postagem:
                      {ret?.reverse_auth_code ? (
                        <span className="ml-1 font-mono font-bold text-[#075985]">{ret.reverse_auth_code}</span>
                      ) : (
                        <span className="ml-1 italic text-[#756d5f]">gerando código…</span>
                      )}
                    </span>
                  </li>
                  {ret?.reverse_label_url && (
                    <li className="flex gap-2">
                      <span className="font-black">3.</span>
                      <a href={ret.reverse_label_url} target="_blank" rel="noreferrer" className="font-bold text-[#075985] underline">
                        Abrir etiqueta de devolução (PDF)
                      </a>
                    </li>
                  )}
                  <li className="flex gap-2"><span className="font-black">4.</span> Acompanhe o retorno — o reembolso sai automaticamente quando o produto chegar à origem.</li>
                </ol>
                {ret?.reverse_tracking_code && (
                  <p className="mt-3 flex items-center gap-1 text-xs font-bold text-[#075985]">
                    <Package className="h-3.5 w-3.5" /> Rastreio reverso: <span className="font-mono">{ret.reverse_tracking_code}</span>
                  </p>
                )}
                <p className="mt-2 text-[11px] text-[#756d5f]">O código de autorização vale 30 dias.</p>
              </div>
            )}

            {dispute.state === "escalated_admin" && (
              <div className="fl-card fl-hard rounded-[6px] p-4">
                <div className="flex items-center gap-2 text-[#854D0E]">
                  <Clock className="h-5 w-5" />
                  <p className="text-sm font-black">Em análise pela equipe</p>
                </div>
                <p className="mt-1 text-xs text-[#5b554b]">Nossa equipe vai avaliar as provas e dar um retorno por aqui e pelas mensagens de O.S.</p>
              </div>
            )}

            {data && data.evidence.length > 0 && (
              <div className="fl-card fl-hard rounded-[6px] p-4">
                <h3 className="mb-2 text-sm font-black text-[var(--fl-ink)]">Evidências</h3>
                <div className="flex flex-wrap gap-2">
                  {data.evidence.map((ev) =>
                    ev.photo_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img key={ev.id} src={ev.photo_url} alt="" className="h-20 w-20 rounded-[4px] border-2 border-[#0B0B0D] object-cover" />
                    ) : null
                  )}
                </div>
              </div>
            )}

            <Link href="/account/compras" className="text-center text-xs font-bold text-[#5b554b] underline">
              Voltar para minhas compras
            </Link>
          </div>
        )}
      </main>
    </PageShell>
  )
}
