"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft, Download, Loader2, ShieldCheck, Trash2 } from "lucide-react"
import { PageShell } from "@/components/tabloide"

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
    <PageShell className="md:pl-[80px]">
      <main className="relative z-10 px-4 py-10">
        <div className="mx-auto flex max-w-xl flex-col gap-6">
          <header>
            <Link
              href="/account"
              className="mb-4 inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.25em] text-[#9A938A] transition hover:text-[#F5F1E8]"
            >
              <ArrowLeft className="h-4 w-4" />
              Voltar para minha conta
            </Link>
            <h1 className="fl-display flex items-center gap-3 text-4xl text-[#F5F1E8]">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl border-2 border-[#F5F1E8]/20 bg-[#F2B705]/12 text-[#F2B705]">
                <ShieldCheck className="h-6 w-6" />
              </span>
              Meus Dados
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-[#C9C2B6]">
              Gerencie seus dados pessoais conforme a Lei Geral de Proteção de Dados.
            </p>
          </header>

          {error && (
            <div className="rounded-2xl border border-red-500/35 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              {error}
            </div>
          )}

          <article className="fl-card fl-hard rounded-2xl p-5 sm:p-6">
            <div>
              <h2 className="flex items-center gap-2 text-base font-black text-[var(--fl-ink)]">
                <Download className="h-4 w-4" />
                Exportar meus dados
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-[#5b554b]">
                Baixe um arquivo JSON com todos os seus dados: perfil, ativações e cupons.
              </p>
            </div>
            <button
              type="button"
              onClick={handleExport}
              disabled={exporting}
              className="fl-btn-card mt-5 inline-flex items-center justify-center rounded-full px-5 py-2.5 text-sm font-black disabled:cursor-not-allowed disabled:opacity-55"
            >
              {exporting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Exportando...</> : "Baixar meus dados"}
            </button>
          </article>

          <article className="fl-card rounded-2xl border-red-900 p-5 sm:p-6">
            <div>
              <h2 className="flex items-center gap-2 text-base font-black text-red-700">
                <Trash2 className="h-4 w-4" />
                Desativar conta
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-[#5b554b]">
                Desativa sua conta e preserva o histórico de ativações. Esta ação não pode ser desfeita.
                Seus dados são mantidos por obrigação legal e removidos após o prazo regulatório.
              </p>
            </div>
            <div className="mt-5">
              {confirmDelete ? (
                <div className="flex flex-col gap-3">
                  <p className="text-sm font-bold text-[var(--fl-ink)]">
                    Tem certeza? Você perderá acesso imediatamente.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={deleting}
                      onClick={handleDelete}
                      className="inline-flex items-center justify-center rounded-full border-2 border-red-900 bg-red-700 px-4 py-2 text-xs font-black text-white shadow-[3px_3px_0_0_#7f1d1d] disabled:cursor-not-allowed disabled:opacity-55"
                    >
                      {deleting ? <><Loader2 className="mr-1 h-3 w-3 animate-spin" />Desativando...</> : "Sim, desativar minha conta"}
                    </button>
                    <button
                      type="button"
                      className="fl-btn-card rounded-full px-4 py-2 text-xs font-black"
                      onClick={() => setConfirmDelete(false)}
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmDelete(true)}
                  className="inline-flex items-center justify-center rounded-full border-2 border-red-900 bg-red-700 px-5 py-2.5 text-sm font-black text-white shadow-[4px_4px_0_0_#7f1d1d] transition hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[6px_6px_0_0_#7f1d1d]"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Desativar conta
                </button>
              )}
            </div>
          </article>
        </div>
      </main>
    </PageShell>
  )
}
