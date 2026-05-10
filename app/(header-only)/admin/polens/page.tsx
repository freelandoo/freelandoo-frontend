"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Hexagon, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AdminPolensSettings } from "@/components/polens/AdminPolensSettings"
import { AdminPolensMetrics } from "@/components/polens/AdminPolensMetrics"
import { AdminPolenProducts } from "@/components/polens/AdminPolenProducts"

function token() {
  return typeof window !== "undefined" ? localStorage.getItem("token") : null
}

export default function AdminPolensPage() {
  const router = useRouter()
  const [ok, setOk] = useState(false)
  const [loading, setLoading] = useState(true)
  const [metrics, setMetrics] = useState<Record<string, number> | null>(null)

  const loadMetrics = useCallback(async () => {
    const t = token()
    if (!t) return
    const res = await fetch("/api/admin/polens/metrics", { headers: { Authorization: `Bearer ${t}` }, cache: "no-store" })
    const data = await res.json().catch(() => ({}))
    if (res.ok) setMetrics(data.metrics || {})
  }, [])

  useEffect(() => {
    const t = token()
    if (!t) {
      router.push("/login")
      return
    }
    fetch("/api/users/me", { headers: { Authorization: `Bearer ${t}` } })
      .then((r) => r.ok ? r.json() : Promise.reject())
      .then((u) => {
        const admin = u.is_admin || u.roles?.some((r: { desc_role: string }) => r.desc_role === "Administrator")
        if (!admin) router.push("/")
        else {
          setOk(true)
          void loadMetrics()
        }
      })
      .catch(() => router.push("/"))
      .finally(() => setLoading(false))
  }, [loadMetrics, router])

  if (loading || !ok) return <div className="grid min-h-screen place-items-center"><Loader2 className="h-6 w-6 animate-spin" /></div>

  return (
    <main className="container mx-auto max-w-5xl px-4 py-8">
      <Button variant="ghost" className="mb-5" onClick={() => router.push("/admin")}>
        <ArrowLeft className="mr-1 h-4 w-4" />
        Voltar
      </Button>
      <div className="mb-6 flex items-center gap-3">
        <Hexagon className="h-7 w-7 fill-amber-300 text-amber-300" />
        <div>
          <h1 className="text-2xl font-bold">Poléns</h1>
          <p className="text-sm text-muted-foreground">Configurações, limites e métricas da moeda interna.</p>
        </div>
      </div>
      <div className="grid gap-5">
        <Card>
          <CardHeader>
            <CardTitle>Cadastro de produtos</CardTitle>
            <CardDescription>
              Pacotes de Poléns vendidos via Stripe. Aparecem na Loja de Polén do usuário.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AdminPolenProducts />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Métricas</CardTitle>
            <CardDescription>Resumo operacional de hoje no fuso do Brasil.</CardDescription>
          </CardHeader>
          <CardContent>
            <AdminPolensMetrics metrics={metrics} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Configurações</CardTitle>
            <CardDescription>Valores não são hardcoded: ajuste limites, cooldown e preços.</CardDescription>
          </CardHeader>
          <CardContent>
            <AdminPolensSettings onSaved={loadMetrics} />
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
