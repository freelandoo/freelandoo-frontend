"use client"

import { useRouter } from "next/navigation"
import { LoadingState, ErrorState } from "@/components/tabloide/kit"
import { useTranslations } from "@/components/i18n/I18nProvider"

export function AccountLoading() {
  const t = useTranslations("Account")
  return (
    <div className="fl-root fl-paper-texture flex min-h-[100dvh] items-center justify-center px-4 py-16">
      <LoadingState label={t("loadingProfile", "Carregando seu perfil…")} />
    </div>
  )
}

export function AccountError({ message }: { message: string }) {
  const t = useTranslations("Account")
  const router = useRouter()
  return (
    <div className="fl-root fl-paper-texture flex min-h-[100dvh] items-center justify-center px-4 py-16">
      <ErrorState
        title={t("loadFailed", "Não foi possível carregar")}
        description={message || t("loadProfileErrorRelogin", "Erro ao carregar perfil. Faça login novamente.")}
        retryLabel={t("backToLogin", "Voltar ao login")}
        onRetry={() => router.push("/login")}
      />
    </div>
  )
}
