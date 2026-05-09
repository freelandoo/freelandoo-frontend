"use client"

import { useEffect, useState } from "react"
import { Loader2 } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import type { PolenTransaction } from "./types"

function token() {
  return typeof window !== "undefined" ? localStorage.getItem("token") : null
}

export function PolensHistoryModal({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const [items, setItems] = useState<PolenTransaction[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open) return
    const t = token()
    if (!t) return
    let cancelled = false
    const timeout = window.setTimeout(() => {
      setLoading(true)
      fetch("/api/polens/history?limit=50", { headers: { Authorization: `Bearer ${t}` } })
        .then((r) => r.json())
        .then((d) => { if (!cancelled) setItems(Array.isArray(d.transactions) ? d.transactions : []) })
        .catch(() => { if (!cancelled) setItems([]) })
        .finally(() => { if (!cancelled) setLoading(false) })
    }, 0)
    return () => {
      cancelled = true
      window.clearTimeout(timeout)
    }
  }, [open])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-white/10 bg-zinc-950 text-white sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Histórico de Poléns</DialogTitle>
        </DialogHeader>
        {loading ? (
          <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin" /></div>
        ) : items.length === 0 ? (
          <p className="py-8 text-center text-sm text-white/50">Nenhuma transação ainda.</p>
        ) : (
          <div className="max-h-[55vh] divide-y divide-white/10 overflow-y-auto">
            {items.map((tx) => (
              <div key={tx.id} className="flex items-center justify-between gap-3 py-3">
                <div>
                  <p className="text-sm font-medium text-white">{tx.type.replace(/_/g, " ")}</p>
                  <p className="text-xs text-white/45">{new Date(tx.created_at).toLocaleString("pt-BR")}</p>
                </div>
                <span className={tx.amount >= 0 ? "text-emerald-300" : "text-amber-300"}>
                  {tx.amount >= 0 ? "+" : ""}{tx.amount.toLocaleString("pt-BR")}
                </span>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
