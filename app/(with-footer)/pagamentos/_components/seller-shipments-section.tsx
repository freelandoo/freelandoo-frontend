"use client"

import { useEffect, useRef, useState } from "react"
import { motion } from "framer-motion"
import { Loader2, PackageCheck, Truck, Camera, ShieldCheck } from "lucide-react"

interface Sale {
  id_order: number
  product_name: string
  product_cover_url: string | null
  status: "pending" | "paid" | "shipped" | "delivered" | "canceled" | "refunded"
  tracking_code: string | null
  melhor_envio_order_id: string | null
  buyer_name: string | null
  created_at: string
}

function formatDate(s: string | null) {
  if (!s) return "—"
  try { return new Date(s).toLocaleDateString("pt-BR") } catch { return "—" }
}
function getToken() {
  if (typeof window === "undefined") return null
  return localStorage.getItem("token")
}

export function SellerShipmentsSection() {
  const [sales, setSales] = useState<Sale[]>([])
  const [state, setState] = useState<"loading" | "loaded" | "hidden" | "error">("loading")
  const [busy, setBusy] = useState<number | null>(null)
  const fileRefs = useRef<Record<number, HTMLInputElement | null>>({})

  async function load() {
    const token = getToken()
    if (!token) { setState("hidden"); return }
    try {
      const res = await fetch("/api/me/sales", { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" })
      const d = await res.json()
      if (!res.ok) { setState("error"); return }
      const list = ((d.orders || []) as Sale[]).filter((o) => o.status === "paid")
      if (list.length === 0) { setState("hidden"); return }
      setSales(list)
      setState("loaded")
    } catch {
      setState("error")
    }
  }

  useEffect(() => { load() /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [])

  async function confirmShipment(id_order: number, file: File) {
    const token = getToken()
    if (!token) return
    setBusy(id_order)
    try {
      const fd = new FormData()
      fd.append("photo", file)
      const res = await fetch(`/api/me/orders/${id_order}/shipment-proof`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      })
      const d = await res.json()
      if (!res.ok) { alert(d?.error || "Falha ao confirmar postagem"); return }
      // Sai da lista (vira shipped → entra na janela de proteção).
      setSales((prev) => prev.filter((s) => s.id_order !== id_order))
    } catch {
      alert("Erro de conexão.")
    } finally {
      setBusy(null)
    }
  }

  if (state === "hidden" || state === "error") return null
  if (state === "loading") {
    return <div className="flex h-20 items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-[#9A938A]" /></div>
  }

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
      className="rounded-2xl border border-[#2A2218] bg-[#1D1810] p-5"
    >
      <header className="mb-1 flex items-center gap-2">
        <PackageCheck className="h-4 w-4 text-[#F2B705]" />
        <p className="text-xs font-medium uppercase tracking-widest text-[#9A938A]">A enviar — confirme a postagem</p>
      </header>
      <p className="mb-4 flex items-center gap-1.5 text-[11px] text-[#9A938A]">
        <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
        O repasse só começa a contar quando você confirma a postagem com foto.
      </p>

      <ul className="divide-y divide-[#2A2218]/70">
        {sales.map((o) => (
          <li key={o.id_order} className="flex flex-wrap items-center justify-between gap-3 py-3">
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-[#2A2218] bg-[#0F0C08]">
                {o.product_cover_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={o.product_cover_url} alt="" className="h-full w-full object-cover" />
                ) : null}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-[#F5F1E8]">{o.product_name}</p>
                <p className="text-xs text-[#9A938A]">Pedido #{o.id_order} · {formatDate(o.created_at)}{o.buyer_name ? ` · ${o.buyer_name}` : ""}</p>
                {o.tracking_code && (
                  <p className="mt-0.5 inline-flex items-center gap-1 text-[11px] text-sky-300">
                    <Truck className="h-3 w-3" /> Rastreio: <span className="font-mono">{o.tracking_code}</span>
                  </p>
                )}
              </div>
            </div>
            <div className="text-right">
              <input
                ref={(el) => { fileRefs.current[o.id_order] = el }}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) confirmShipment(o.id_order, f)
                }}
              />
              <button
                type="button"
                disabled={busy === o.id_order}
                onClick={() => fileRefs.current[o.id_order]?.click()}
                className="inline-flex items-center gap-1.5 rounded-full border border-[#F2B705]/40 bg-[#F2B705]/10 px-3 py-1.5 text-[11px] font-semibold text-[#F2B705] hover:bg-[#F2B705]/20 disabled:opacity-50"
              >
                {busy === o.id_order ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Camera className="h-3.5 w-3.5" />}
                Confirmar postagem
              </button>
            </div>
          </li>
        ))}
      </ul>
    </motion.section>
  )
}
