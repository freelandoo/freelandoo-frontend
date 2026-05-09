"use client"

import { useMemo, useState } from "react"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { PolensProductCard, type PolenProduct } from "./PolensProductCard"

type ProfileOption = { id_profile: string; display_name?: string; is_paid?: boolean; is_clan?: boolean }

function token() {
  return typeof window !== "undefined" ? localStorage.getItem("token") : null
}

export function PolensStore({
  open,
  onOpenChange,
  balance,
  prices,
  profiles,
  onPurchased,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  balance: number
  prices: Record<string, number>
  profiles: ProfileOption[]
  onPurchased: () => void
}) {
  const [selectedProfile, setSelectedProfile] = useState("")
  const [buying, setBuying] = useState<string | null>(null)
  const products = useMemo<PolenProduct[]>(() => [
    { key: "profile_activation", title: "Ativar perfil", description: "Ative um perfil seu usando Poléns.", price: prices.price_profile_activation || 0, needsProfile: true },
    { key: "premium_highlight", title: "Destaque premium", description: "Dê mais visibilidade a um recurso interno.", price: prices.price_premium_highlight || 0 },
    { key: "post_boost", title: "Impulsionar post", description: "Reserve Poléns para impulsionar uma publicação.", price: prices.price_post_boost || 0 },
    { key: "profile_boost", title: "Impulsionar perfil", description: "Reserve Poléns para impulsionar um perfil.", price: prices.price_profile_boost || 0 },
    { key: "clan_highlight", title: "Destacar clan", description: "Reserve Poléns para destaque de clan.", price: prices.price_clan_highlight || 0 },
  ], [prices])

  async function buy(product: PolenProduct) {
    const t = token()
    if (!t) return
    if (product.needsProfile && !selectedProfile) {
      alert("Selecione um perfil para ativar.")
      return
    }
    if (!confirm(`Comprar "${product.title}" por ${product.price} Poléns?`)) return
    setBuying(product.key)
    try {
      const res = await fetch("/api/polens/spend", {
        method: "POST",
        headers: { Authorization: `Bearer ${t}`, "Content-Type": "application/json" },
        body: JSON.stringify({ product: product.key, target_id: product.needsProfile ? selectedProfile : undefined }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || "Erro ao comprar")
      onPurchased()
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erro ao comprar")
    } finally {
      setBuying(null)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-white/10 bg-zinc-950 text-white sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Usar Poléns</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3 text-sm text-white/60">
            Saldo disponível: <span className="font-semibold text-amber-200">{balance.toLocaleString("pt-BR")} Poléns</span>
          </div>
          <Select value={selectedProfile} onValueChange={setSelectedProfile}>
            <SelectTrigger className="border-white/10 bg-zinc-900">
              <SelectValue placeholder="Perfil para ativação (quando necessário)" />
            </SelectTrigger>
            <SelectContent>
              {profiles.map((p) => (
                <SelectItem key={p.id_profile} value={p.id_profile}>
                  {p.display_name || "Perfil"} {p.is_paid ? "(ativo)" : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="grid gap-3 sm:grid-cols-2">
            {products.map((product) => (
              <div key={product.key} className="relative">
                <PolensProductCard product={product} balance={balance} onBuy={buy} />
                {buying === product.key && (
                  <div className="absolute inset-0 grid place-items-center rounded-lg bg-black/50">
                    <Loader2 className="h-5 w-5 animate-spin" />
                  </div>
                )}
              </div>
            ))}
          </div>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Fechar</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
