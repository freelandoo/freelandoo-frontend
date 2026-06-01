"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Settings, UserPlus, Loader2 } from "lucide-react"
import { getToken } from "@/lib/auth"

/**
 * Toolbar admin-only da Casa. Só renderiza para Administrator (checa via
 * /api/users/me). "Participantes" cria um rascunho e abre a página dele já em
 * modo edição (admin edita tudo inline). Some para usuário comum.
 *
 * `only` permite renderizar só um dos botões (ex.: só a loja no dossiê).
 */
export function AdminCasaToolbar({ only }: { only?: "store" | "participants" }) {
  const router = useRouter()
  const [isAdmin, setIsAdmin] = useState(false)
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    const token = getToken()
    if (!token) return
    let cancelled = false
    fetch("/api/users/me", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled || !data) return
        const admin = Boolean(data.is_admin) ||
          (Array.isArray(data.roles) && data.roles.some((r: { desc_role?: string }) => r.desc_role === "Administrator"))
        setIsAdmin(admin)
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [])

  async function createParticipant() {
    if (creating) return
    setCreating(true)
    const token = getToken()
    try {
      const stamp = Date.now().toString().slice(-6)
      const res = await fetch("/api/admin/casa/participants", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ display_name: `Novo participante ${stamp}`, is_active: false }),
      })
      const data = await res.json()
      if (res.ok && data?.participant?.slug) {
        router.push(`/acasaviews/participantes/${data.participant.slug}`)
      } else {
        setCreating(false)
        alert(data?.error || "Falha ao criar participante")
      }
    } catch {
      setCreating(false)
      alert("Falha ao criar participante")
    }
  }

  if (!isAdmin) return null

  const base =
    "inline-flex items-center gap-2 border-2 border-[var(--ink)] px-3 py-1.5 casa-body text-[11px] font-extrabold uppercase tracking-[0.14em] text-[var(--ink)] shadow-[3px_3px_0_0_var(--ink)] transition-transform hover:-translate-y-0.5 disabled:opacity-60"

  return (
    <div className="flex flex-wrap items-center gap-2">
      {only !== "store" && (
        <button onClick={createParticipant} disabled={creating} className={base} style={{ background: "var(--cyan)" }}>
          {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
          Participante
        </button>
      )}
      {only !== "participants" && (
        <Link href="/administracao/casa-loja" className={base} style={{ background: "var(--gold)" }}>
          <Settings className="h-4 w-4" />
          Conveniência Views
        </Link>
      )}
    </div>
  )
}
