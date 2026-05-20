"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { ArrowLeft, ShieldCheck, Send, Check, AlertCircle } from "lucide-react"

const REQUESTABLE: Array<{ key: string; label: string; hint?: string }> = [
  { key: "can_view_feed", label: "Ver o feed" },
  { key: "can_post_feed", label: "Postar no feed" },
  { key: "can_use_bees", label: "Usar Bees" },
  { key: "can_watch_courses", label: "Assistir cursos" },
  { key: "can_sell_courses", label: "Vender cursos", hint: "Permite publicar cursos para venda" },
  { key: "can_message", label: "Enviar mensagens" },
  { key: "can_receive_messages", label: "Receber mensagens" },
  { key: "can_use_global_chat", label: "Chat global" },
  { key: "can_use_machine_chat", label: "Chat de enxames" },
]

function authHeaders(): HeadersInit {
  if (typeof window === "undefined") return {}
  const token = localStorage.getItem("token")
  return token ? { Authorization: `Bearer ${token}` } : {}
}

export default function ParentalRequestPage() {
  const router = useRouter()
  const [selected, setSelected] = useState<string>("can_sell_courses")
  const [note, setNote] = useState("")
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState<Set<string>>(new Set())
  const [isMinor, setIsMinor] = useState<boolean | null>(null)

  const checkSelf = useCallback(async () => {
    try {
      const res = await fetch("/api/users/me", {
        headers: authHeaders(),
        cache: "no-store",
      })
      if (!res.ok) {
        router.push("/login")
        return
      }
      const data = await res.json()
      setIsMinor(!!data?.is_minor)
      if (!data?.is_minor) router.push("/account")
    } catch {
      router.push("/account")
    }
  }, [router])

  useEffect(() => {
    checkSelf()
  }, [checkSelf])

  const submit = async () => {
    setSending(true)
    setError(null)
    try {
      const res = await fetch("/api/supervision/me/request-permission", {
        method: "POST",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ permission_key: selected, note: note.trim() || undefined }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data?.error || "Falha ao enviar pedido")
        return
      }
      setSent((prev) => new Set(prev).add(selected))
      setNote("")
    } catch {
      setError("Erro de conexão. Tente novamente.")
    } finally {
      setSending(false)
    }
  }

  if (isMinor === null) {
    return (
      <div className="min-h-[100dvh] bg-background flex items-center justify-center">
        <p className="text-sm text-muted-foreground">Carregando...</p>
      </div>
    )
  }

  return (
    <div className="min-h-[100dvh] bg-background">
      <main className="container mx-auto max-w-2xl px-4 py-8 md:py-10">
        <div className="mb-6 flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => router.push("/account")}>
            <ArrowLeft className="mr-1 h-4 w-4" />
            Voltar
          </Button>
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
              <ShieldCheck className="h-6 w-6 text-amber-500" />
              Pedir permissão
            </h1>
            <p className="text-sm text-muted-foreground">
              Envie um pedido ao responsável para liberar uma ação bloqueada.
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-4 flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/5 p-3 text-sm text-red-500">
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Qual permissão você quer?</CardTitle>
            <CardDescription>
              O responsável recebe a notificação e decide se libera. Você pode incluir um recado.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {REQUESTABLE.map((item) => {
                const isSent = sent.has(item.key)
                const isSelected = selected === item.key
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setSelected(item.key)}
                    className={`flex items-start gap-2 rounded-md border p-3 text-left transition ${
                      isSelected
                        ? "border-amber-400 bg-amber-400/10"
                        : "border-white/10 hover:bg-white/[0.04]"
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-white/95">{item.label}</p>
                      {item.hint && (
                        <p className="text-xs text-muted-foreground">{item.hint}</p>
                      )}
                    </div>
                    {isSent && <Check className="h-4 w-4 text-green-500 shrink-0" />}
                  </button>
                )
              })}
            </div>

            <div className="space-y-2">
              <label htmlFor="note" className="text-sm font-medium">
                Recado para o responsável (opcional)
              </label>
              <Textarea
                id="note"
                rows={3}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Ex.: Quero publicar um curso de violão. Posso?"
                maxLength={280}
              />
              <p className="text-[10px] text-muted-foreground">{note.length}/280</p>
            </div>

            <div className="flex justify-end">
              <Button onClick={submit} disabled={sending || !selected}>
                <Send className="mr-2 h-4 w-4" />
                {sending ? "Enviando..." : "Enviar pedido"}
              </Button>
            </div>

            {sent.size > 0 && (
              <div className="rounded-md border border-green-500/30 bg-green-500/5 p-3 text-sm text-green-400">
                Pedido enviado. O responsável vai receber uma notificação.
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
