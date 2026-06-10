"use client"

import { useRouter } from "next/navigation"
import { PageShell, LoadingState, ErrorState } from "@/components/tabloide"
import { useTranslations } from "@/components/i18n/I18nProvider"

export function FreelancerProfileLoading() {
  const t = useTranslations("Profile")
  return (
    <PageShell>
      <main className="container mx-auto flex min-h-[60vh] items-center justify-center px-4 py-12">
        <LoadingState label={t("loadingProfile", "Carregando perfil…")} />
      </main>
    </PageShell>
  )
}

export function FreelancerProfileError({ message }: { message: string }) {
  const t = useTranslations("Profile")
  const router = useRouter()
  return (
    <PageShell>
      <main className="container mx-auto flex min-h-[60vh] items-center justify-center px-4 py-12">
        <ErrorState
          title={t("profileNotFound", "Perfil não encontrado")}
          description={message || t("profileLoadError", "Não foi possível carregar este perfil.")}
          onRetry={() => router.push("/search")}
          retryLabel={t("backToSearch", "Voltar para busca")}
        />
      </main>
    </PageShell>
  )
}
