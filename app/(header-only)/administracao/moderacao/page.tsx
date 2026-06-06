"use client"

import { Suspense, useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { ArrowLeft, Loader2, ShieldAlert, ShieldX, Flag, type LucideIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ChatModerationConfig } from "@/app/(header-only)/administracao/chat-moderation/page"
import { BlockedTermsConfig } from "@/app/(header-only)/administracao/blocked-terms/page"
import { PostsModeracaoConfig } from "@/app/(header-only)/administracao/posts/page"

type TabId = "chat" | "termos" | "posts"

const TABS: { id: TabId; label: string; icon: LucideIcon }[] = [
  { id: "chat", label: "Chat", icon: ShieldAlert },
  { id: "termos", label: "Termos bloqueados", icon: ShieldX },
  { id: "posts", label: "Posts denunciados", icon: Flag },
]

function isTab(v: string | null): v is TabId {
  return !!v && TABS.some((t) => t.id === v)
}

function ModeracaoInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [authChecked, setAuthChecked] = useState(false)
  const initial = searchParams.get("tab")
  const [tab, setTab] = useState<TabId>(isTab(initial) ? initial : "chat")

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
    router.replace(`/administracao/moderacao?${params.toString()}`, { scroll: false })
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
          <h1 className="text-2xl font-bold">Moderação</h1>
          <p className="text-sm text-muted-foreground">
            Fila do chat, termos bloqueados e posts denunciados, num só lugar.
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
                <Icon className="h-4 w-4" aria-hidden /> {t.label}
              </button>
            )
          })}
        </div>

        {tab === "chat" && <ChatModerationConfig />}
        {tab === "termos" && <BlockedTermsConfig />}
        {tab === "posts" && <PostsModeracaoConfig />}
      </main>
    </div>
  )
}

export default function ModeracaoPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[100dvh] items-center justify-center bg-background">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <ModeracaoInner />
    </Suspense>
  )
}
