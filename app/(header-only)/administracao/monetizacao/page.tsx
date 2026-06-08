"use client"

import { Suspense, useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import {
  ArrowLeft,
  Loader2,
  Wallet,
  Calendar,
  Hexagon,
  Crown,
  Sparkles,
  Ticket,
  Radio,
  type LucideIcon,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { AtivacaoConfig } from "@/components/admin/monetizacao/AtivacaoConfig"
import { AgendamentoConfig } from "@/components/admin/monetizacao/AgendamentoConfig"
import { PolensConfig } from "@/components/admin/monetizacao/PolensConfig"
import { PremiumConfig } from "@/components/admin/monetizacao/PremiumConfig"
import { ManifestacaoConfig } from "@/app/(header-only)/administracao/manifestacao/page"
import { CuponsConfig } from "@/app/(header-only)/administracao/cupons/page"
import { LivesConfig } from "@/components/admin/monetizacao/LivesConfig"

type TabId = "ativacao" | "agendamento" | "polens" | "premium" | "manifestacao" | "lives" | "cupons"

const TABS: { id: TabId; label: string; icon: LucideIcon; iconClass?: string }[] = [
  { id: "ativacao", label: "Ativação", icon: Wallet },
  { id: "agendamento", label: "Agendamento", icon: Calendar },
  { id: "polens", label: "Poléns", icon: Hexagon, iconClass: "fill-amber-300 text-amber-300" },
  { id: "premium", label: "Premium", icon: Crown, iconClass: "fill-amber-300 text-amber-400" },
  { id: "manifestacao", label: "Manifestação", icon: Sparkles },
  { id: "lives", label: "Lives", icon: Radio },
  { id: "cupons", label: "Cupons", icon: Ticket },
]

function isTab(v: string | null): v is TabId {
  return !!v && TABS.some((t) => t.id === v)
}

function MonetizacaoInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [authChecked, setAuthChecked] = useState(false)
  const initial = searchParams.get("tab")
  const [tab, setTab] = useState<TabId>(isTab(initial) ? initial : "ativacao")

  useEffect(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null
    if (!token) {
      router.push("/login")
      return
    }
    fetch("/api/users/me", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
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

  function selectTab(id: TabId) {
    setTab(id)
    const params = new URLSearchParams(Array.from(searchParams.entries()))
    params.set("tab", id)
    router.replace(`/administracao/monetizacao?${params.toString()}`, { scroll: false })
  }

  if (!authChecked) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="min-h-[100dvh] bg-background">
      <main className="container mx-auto px-4 py-8">
        <Button variant="ghost" size="sm" className="mb-5" onClick={() => router.push("/admin")}>
          <ArrowLeft className="mr-1 h-4 w-4" /> Voltar
        </Button>

        <div className="mb-6">
          <h1 className="text-2xl font-bold">Configurações de monetização</h1>
          <p className="text-sm text-muted-foreground">
            Preços e taxas de cada produto da plataforma, num só lugar.
          </p>
        </div>

        {/* Tab bar */}
        <div className="mb-8 flex flex-wrap gap-2 border-b border-border pb-3">
          {TABS.map((t) => {
            const Icon = t.icon
            const active = tab === t.id
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => selectTab(t.id)}
                className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-semibold transition ${
                  active
                    ? "bg-primary/15 border-primary/40 text-primary"
                    : "border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className={`h-4 w-4 ${t.iconClass ?? ""}`} aria-hidden /> {t.label}
              </button>
            )
          })}
        </div>

        {tab === "ativacao" && <AtivacaoConfig />}
        {tab === "agendamento" && <AgendamentoConfig />}
        {tab === "polens" && <PolensConfig />}
        {tab === "premium" && <PremiumConfig />}
        {tab === "manifestacao" && <ManifestacaoConfig />}
        {tab === "lives" && <LivesConfig />}
        {tab === "cupons" && <CuponsConfig />}
      </main>
    </div>
  )
}

export default function MonetizacaoPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[100dvh] items-center justify-center bg-background">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <MonetizacaoInner />
    </Suspense>
  )
}
