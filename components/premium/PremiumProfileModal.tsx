"use client"

import { useCallback, useEffect, useState } from "react"
import { CheckCircle2, CreditCard, Crown, Hexagon, Loader2, Sparkles, Trophy } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { getCapturedCoupon } from "@/lib/share-coupon"

type Quote = {
  profile?: {
    id_profile: string
    display_name: string | null
    uf: string
    city_name: string
  }
  pricing?: {
    duration_days: number
    price_cents: number
    price_polens: number
  }
  slots?: { total: number; taken: number; available: number }
  active?: { id: string; activated_at: string; expires_at: string } | null
  error?: string
}

function token() {
  return typeof window !== "undefined" ? localStorage.getItem("token") : null
}

function fmtBRL(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" })
}

export function PremiumProfileModal({
  open,
  onOpenChange,
  profileId,
  profileName,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  profileId: string
  profileName?: string
}) {
  const [quote, setQuote] = useState<Quote | null>(null)
  const [loading, setLoading] = useState(false)
  const [buying, setBuying] = useState<"polens" | "stripe" | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/premium/quote/${profileId}`, { cache: "no-store" })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Não foi possível carregar")
      setQuote(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar")
    } finally {
      setLoading(false)
    }
  }, [profileId])

  useEffect(() => {
    if (open) void load()
  }, [open, load])

  async function buy(method: "polens" | "stripe") {
    const t = token()
    if (!t) {
      window.location.href = "/login?next=/account"
      return
    }
    setBuying(method)
    setError(null)
    try {
      const sharedCoupon = method === "stripe" ? getCapturedCoupon() : null
      const res = await fetch(`/api/premium/checkout/${method}/${profileId}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${t}`, "Content-Type": "application/json" },
        body: JSON.stringify(sharedCoupon?.code ? { coupon_code: sharedCoupon.code } : {}),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Erro ao processar compra")
      if (method === "stripe" && data.checkout_url) {
        window.location.href = data.checkout_url
        return
      }
      // Polens: já ativou. Recarrega quote pra mostrar "Ativo até".
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao processar compra")
    } finally {
      setBuying(null)
    }
  }

  const active = quote?.active
  const pricing = quote?.pricing
  const slots = quote?.slots
  const noSlots = slots && slots.available === 0
  const fatalError = error || quote?.error

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Crown className="h-5 w-5 fill-amber-300 text-amber-400" />
            Quer dar destaque nesse perfil?
          </DialogTitle>
          <DialogDescription>
            {profileName ? `Premium para ${profileName}` : "Coloque seu perfil em destaque na vitrine."}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : active ? (
          <div className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 p-4">
            <div className="flex items-center gap-2 text-emerald-300">
              <CheckCircle2 className="h-5 w-5" />
              <span className="font-semibold">Premium ativo</span>
            </div>
            <p className="mt-2 text-sm text-emerald-100/85">
              Este perfil está em destaque até <strong>{fmtDate(active.expires_at)}</strong>. Volte para
              comprar de novo quando expirar.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <ul className="space-y-2 text-sm">
              <li className="flex gap-2">
                <Trophy className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
                <span>
                  <strong className="text-white">Primeiras posições</strong> nas vitrines de enxame e
                  profissão na sua cidade.
                </span>
              </li>
              <li className="flex gap-2">
                <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
                <span>
                  Tag <strong className="text-white">Premium</strong> aparece no card e dentro do perfil.
                </span>
              </li>
              <li className="flex gap-2">
                <Crown className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
                <span>
                  Card com fundo e borda da cor do seu enxame, com brilho e botão preto destacado.
                </span>
              </li>
            </ul>

            {pricing && (
              <div className="rounded-xl border border-amber-300/15 bg-amber-300/5 p-4">
                <p className="text-xs uppercase tracking-wider text-amber-200/70">
                  Destaque por {pricing.duration_days} dias
                </p>
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  <div className="rounded-lg border border-white/10 bg-zinc-950/40 p-3">
                    <p className="text-xs text-white/60">Cartão</p>
                    <p className="mt-1 text-lg font-semibold tracking-tight">{fmtBRL(pricing.price_cents)}</p>
                  </div>
                  <div className="rounded-lg border border-white/10 bg-zinc-950/40 p-3">
                    <p className="text-xs text-white/60">Poléns</p>
                    <p className="mt-1 flex items-center gap-1 text-lg font-semibold tracking-tight text-amber-200">
                      <Hexagon className="h-4 w-4 fill-amber-300 text-amber-300" />
                      {pricing.price_polens.toLocaleString("pt-BR")}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {slots && (
              <p className="text-xs text-white/60">
                Vagas em <strong>{quote?.profile?.city_name}/{quote?.profile?.uf}</strong>:{" "}
                <span className={noSlots ? "text-rose-300" : "text-emerald-300"}>
                  {slots.available} de {slots.total} {slots.available === 1 ? "disponível" : "disponíveis"}
                </span>
              </p>
            )}

            {fatalError && <p className="text-sm text-rose-400">{fatalError}</p>}

            <div className="flex flex-col gap-2 sm:flex-row">
              <Button
                onClick={() => buy("stripe")}
                disabled={buying !== null || noSlots || !!fatalError}
                className="flex-1 bg-amber-300 text-zinc-950 hover:bg-amber-200"
              >
                {buying === "stripe" ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <CreditCard className="mr-2 h-4 w-4" />
                )}
                Comprar com cartão
              </Button>
              <Button
                onClick={() => buy("polens")}
                disabled={buying !== null || noSlots || !!fatalError}
                variant="outline"
                className="flex-1 border-amber-300/30 text-amber-100 hover:bg-amber-300/10"
              >
                {buying === "polens" ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Hexagon className="mr-2 h-4 w-4 fill-amber-300 text-amber-300" />
                )}
                Comprar com Poléns
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
