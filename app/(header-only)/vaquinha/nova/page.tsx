"use client"

import { useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"
import { getToken } from "@/lib/auth"
import { useTranslations } from "@/components/i18n/I18nProvider"
import { useFeature } from "@/components/feature-flags/FeatureFlagsProvider"

// Não há mais formulário de criação: a vaquinha nasce "na própria pele".
// Esta rota só cria-ou-abre a vaquinha do usuário e manda pra página dela,
// onde tudo é editável inline.
export default function NovaVaquinhaPage() {
  const t = useTranslations("Vaquinha")
  const router = useRouter()
  const vaquinhaOn = useFeature("vaquinha")
  const startedRef = useRef(false)

  useEffect(() => {
    if (!vaquinhaOn) {
      router.replace("/")
      return
    }
    if (startedRef.current) return
    startedRef.current = true

    const token = getToken()
    if (!token) {
      router.replace("/login")
      return
    }
    ;(async () => {
      try {
        const res = await fetch("/api/me/vaquinha/start", {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok || !data?.vaquinha?.slug) throw new Error(data?.error || "start")
        router.replace(`/vaquinha/${data.vaquinha.slug}`)
      } catch (err) {
        toast.error(err instanceof Error ? err.message : t("startError", "Não foi possível abrir sua vaquinha."))
        router.replace("/account")
      }
    })()
  }, [vaquinhaOn, router, t])

  return (
    <main className="flex min-h-[60vh] items-center justify-center bg-background">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" aria-hidden />
    </main>
  )
}
