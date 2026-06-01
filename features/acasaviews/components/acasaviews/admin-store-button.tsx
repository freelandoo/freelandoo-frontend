"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Settings } from "lucide-react"
import { getToken } from "@/lib/auth"

/**
 * Atalho admin-only para configurar a loja "Conveniência Views".
 * Só renderiza se o usuário logado for Administrator. Aparece nas páginas
 * públicas da Casa (rankings + dossiê do participante) para o admin pular
 * direto pro /administracao/casa-loja.
 */
export function AdminStoreButton() {
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

  return (
    <Link
      href="/administracao/casa-loja"
      className="inline-flex items-center gap-2 border-2 border-[var(--ink)] bg-[var(--gold)] px-3 py-1.5 casa-body text-[11px] font-extrabold uppercase tracking-[0.14em] text-[var(--ink)] shadow-[3px_3px_0_0_var(--ink)] transition-transform hover:-translate-y-0.5"
    >
      <Settings className="h-4 w-4" />
      Conveniência Views · admin
    </Link>
  )
}
