"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import { getToken } from "@/lib/auth"

/**
 * Guard de auth da Casa Views (route group sem efeito na URL). A landing
 * /acasaviews é pública; tudo aqui dentro exige sessão do Freelandoo. Sem token
 * no localStorage, redireciona pra /login?next=<rota atual> — depois do login,
 * o usuário volta exatamente pra onde tentou entrar. Auth = identidade única do
 * Freelandoo (mesmo /login e /cadastro do produto).
 */
export default function ProtectedCasaLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()
  const [authed, setAuthed] = useState(false)

  useEffect(() => {
    if (getToken()) {
      setAuthed(true)
      return
    }
    const next = encodeURIComponent(pathname || "/acasaviews/rankings")
    router.replace(`/login?next=${next}`)
  }, [pathname, router])

  if (!authed) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-background text-foreground">
        <span className="casa-marker text-3xl text-white/70">Carregando…</span>
      </div>
    )
  }

  return <>{children}</>
}
