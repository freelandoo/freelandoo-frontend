"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Settings, UserPlus } from "lucide-react"
import { getToken } from "@/lib/auth"

/**
 * Toolbar admin-only da Casa. Só renderiza para Administrator (checa via
 * /api/users/me). Aparece nas páginas públicas da Casa para o admin pular
 * direto pros painéis de configuração. Some para usuário comum.
 *
 * `only` permite renderizar só um dos botões (ex.: só a loja no dossiê).
 */
export function AdminCasaToolbar({ only }: { only?: "store" | "participants" }) {
  const [isAdmin, setIsAdmin] = useState(false)

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
      .catch(() => { /* silencioso */ })
    return () => { cancelled = true }
  }, [])

  if (!isAdmin) return null

  const base =
    "inline-flex items-center gap-2 border-2 border-[var(--ink)] px-3 py-1.5 casa-body text-[11px] font-extrabold uppercase tracking-[0.14em] text-[var(--ink)] shadow-[3px_3px_0_0_var(--ink)] transition-transform hover:-translate-y-0.5"

  return (
    <div className="flex flex-wrap items-center gap-2">
      {only !== "store" && (
        <Link href="/administracao/casa" className={base} style={{ background: "var(--cyan)" }}>
          <UserPlus className="h-4 w-4" />
          Participantes
        </Link>
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
