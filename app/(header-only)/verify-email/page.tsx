"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Mail, CheckCircle2, RefreshCw, Pencil, Loader2 } from "lucide-react"
import { isValidEmail } from "@/lib/validation/signup"

export default function VerifyEmailPage() {
  const router = useRouter()
  const [email, setEmail] = useState<string>("")
  const [loadingMe, setLoadingMe] = useState(true)
  const [resending, setResending] = useState(false)
  const [checking, setChecking] = useState(false)
  const [editingEmail, setEditingEmail] = useState(false)
  const [newEmail, setNewEmail] = useState("")
  const [savingEmail, setSavingEmail] = useState(false)
  const [msg, setMsg] = useState<{ kind: "ok" | "error"; text: string } | null>(null)

  useEffect(() => {
    const token = localStorage.getItem("token")
    if (!token) {
      router.push("/login")
      return
    }
    fetch("/api/users/me", { headers: { Authorization: `Bearer ${token}` } })
      .then(async (r) => {
        if (!r.ok) {
          if (r.status === 401) {
            localStorage.removeItem("token")
            router.push("/login")
          }
          return
        }
        const data = await r.json()
        if (data.ativo) {
          router.push("/account")
          return
        }
        setEmail(data.email || "")
        setNewEmail(data.email || "")
      })
      .finally(() => setLoadingMe(false))
  }, [router])

  const handleResend = async () => {
    const token = localStorage.getItem("token")
    if (!token) return
    setResending(true)
    setMsg(null)
    try {
      const res = await fetch("/api/auth/resend-activation", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok) {
        setMsg({ kind: "ok", text: data.message || "Email reenviado." })
      } else {
        setMsg({ kind: "error", text: data.error || "Erro ao reenviar email." })
      }
    } finally {
      setResending(false)
    }
  }

  const handleCheck = async () => {
    const token = localStorage.getItem("token")
    if (!token) return
    setChecking(true)
    setMsg(null)
    try {
      const res = await fetch("/api/users/me", {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      })
      if (res.ok) {
        const data = await res.json()
        if (data.ativo) {
          router.push("/account")
          return
        }
        setMsg({ kind: "error", text: "Ainda não detectamos a confirmação. Verifique o link no seu email." })
      }
    } finally {
      setChecking(false)
    }
  }

  const handleChangeEmail = async () => {
    if (!newEmail || newEmail === email) {
      setEditingEmail(false)
      return
    }
    if (!isValidEmail(newEmail)) {
      setMsg({ kind: "error", text: "Digite um email válido." })
      return
    }
    const token = localStorage.getItem("token")
    if (!token) return
    setSavingEmail(true)
    setMsg(null)
    try {
      const res = await fetch("/api/auth/change-email", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ new_email: newEmail }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok) {
        setEmail(data.email || newEmail)
        setEditingEmail(false)
        setMsg({ kind: "ok", text: data.message || "Email atualizado. Confirme no novo endereço." })
      } else {
        setMsg({ kind: "error", text: data.error || "Erro ao alterar email." })
      }
    } finally {
      setSavingEmail(false)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem("token")
    localStorage.removeItem("user")
    router.push("/login")
  }

  if (loadingMe) {
    return (
      <main className="container mx-auto px-4 py-12 flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin" />
      </main>
    )
  }

  return (
    <div className="bg-page-shell-dark">
      <main className="container mx-auto px-4 py-12">
        <div className="mx-auto max-w-2xl">
          <Card>
            <CardHeader className="text-center space-y-3 pt-10">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/20">
                <Mail className="h-8 w-8 text-primary" />
              </div>
              <CardTitle className="text-2xl">Ative seu email</CardTitle>
              <CardDescription>
                Enviamos um link de confirmação para o seu email. Confirme para continuar usando a Freelandoo.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 pb-10">
              <div className="rounded-lg border bg-muted/40 p-4">
                <p className="text-sm text-muted-foreground mb-1">Email atual</p>
                {editingEmail ? (
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <Label htmlFor="new-email">Novo email</Label>
                      <Input
                        id="new-email"
                        type="email"
                        value={newEmail}
                        onChange={(e) => setNewEmail(e.target.value)}
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={handleChangeEmail} disabled={savingEmail} size="sm">
                        {savingEmail ? "Salvando..." : "Salvar e reenviar"}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setEditingEmail(false)
                          setNewEmail(email)
                        }}
                        disabled={savingEmail}
                      >
                        Cancelar
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <p className="font-medium">{email}</p>
                    <Button variant="ghost" size="sm" onClick={() => setEditingEmail(true)}>
                      <Pencil className="h-3.5 w-3.5 mr-1" />
                      Alterar
                    </Button>
                  </div>
                )}
              </div>

              {msg && (
                <div
                  className={`rounded-md p-3 text-sm ${
                    msg.kind === "ok"
                      ? "bg-green-500/10 text-green-700 border border-green-500/20"
                      : "bg-red-500/10 text-red-600 border border-red-500/20"
                  }`}
                >
                  {msg.text}
                </div>
              )}

              <div className="flex items-start gap-3 rounded-lg bg-amber-500/10 p-4 text-left border border-amber-500/20">
                <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-500" />
                <div className="space-y-1 text-sm text-muted-foreground">
                  <p className="font-semibold text-foreground">Não encontrou o email?</p>
                  <p>Verifique sua pasta de spam. Pode levar alguns minutos para chegar.</p>
                </div>
              </div>

              <div className="space-y-2">
                <Button onClick={handleCheck} disabled={checking} className="w-full" size="lg">
                  {checking ? "Verificando..." : "Já confirmei, verificar agora"}
                </Button>
                <Button onClick={handleResend} disabled={resending} variant="outline" className="w-full" size="lg">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  {resending ? "Enviando..." : "Reenviar email de ativação"}
                </Button>
                <Button onClick={handleLogout} variant="ghost" className="w-full" size="sm">
                  Sair
                </Button>
              </div>

              <p className="text-center text-xs text-muted-foreground">
                <Link href="/login" className="hover:underline">
                  Voltar para login
                </Link>
              </p>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
