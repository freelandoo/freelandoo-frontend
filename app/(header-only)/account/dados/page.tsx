"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Download, Trash2, Loader2, ShieldCheck, ArrowLeft } from "lucide-react"
import Link from "next/link"

export default function DadosPage() {
  const router = useRouter()
  const [exporting, setExporting] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null

  const handleExport = async () => {
    if (!token) { router.push("/login"); return }
    setExporting(true)
    setError(null)
    try {
      const res = await fetch("/api/users/me/export", {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error("Erro ao exportar dados")
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = "freelandoo-meus-dados.json"
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao exportar dados")
    } finally {
      setExporting(false)
    }
  }

  const handleDelete = async () => {
    if (!token) { router.push("/login"); return }
    setDeleting(true)
    setError(null)
    try {
      const res = await fetch("/api/users/me", {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || "Erro ao desativar conta")
      }
      localStorage.clear()
      router.push("/")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao desativar conta")
      setDeleting(false)
    }
  }

  return (
    <main className="min-h-screen bg-background px-4 py-10">
      <div className="max-w-xl mx-auto space-y-6">
        <div>
          <Link href="/account" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
            <ArrowLeft className="h-4 w-4" /> Voltar para minha conta
          </Link>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-primary" />
            Meus Dados — LGPD
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Gerencie seus dados pessoais conforme a Lei Geral de Proteção de Dados.
          </p>
        </div>

        {error && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Download className="h-4 w-4" /> Exportar meus dados
            </CardTitle>
            <CardDescription>
              Baixe um arquivo JSON com todos os seus dados: perfil, assinaturas e cupons.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={handleExport} disabled={exporting} variant="outline">
              {exporting ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Exportando...</> : "Baixar meus dados"}
            </Button>
          </CardContent>
        </Card>

        <Card className="border-destructive/30">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2 text-destructive">
              <Trash2 className="h-4 w-4" /> Desativar conta
            </CardTitle>
            <CardDescription>
              Desativa sua conta e cancela assinaturas ativas. Esta ação não pode ser desfeita.
              Seus dados são mantidos por obrigação legal e removidos após o prazo regulatório.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {confirmDelete ? (
              <div className="space-y-3">
                <p className="text-sm font-medium text-foreground">
                  Tem certeza? Você perderá acesso imediatamente.
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="destructive"
                    size="sm"
                    disabled={deleting}
                    onClick={handleDelete}
                  >
                    {deleting ? <><Loader2 className="h-3 w-3 animate-spin mr-1" />Desativando...</> : "Sim, desativar minha conta"}
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setConfirmDelete(false)}>
                    Cancelar
                  </Button>
                </div>
              </div>
            ) : (
              <Button variant="destructive" onClick={() => setConfirmDelete(true)}>
                <Trash2 className="h-4 w-4 mr-2" /> Desativar conta
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
