"use client"

import { useRouter } from "next/navigation"
import { PageShell, LoadingState, ErrorState } from "@/components/tabloide"

export function FreelancerProfileLoading() {
  return (
    <PageShell>
      <main className="container mx-auto flex min-h-[60vh] items-center justify-center px-4 py-12">
        <LoadingState label="Carregando perfil…" />
      </main>
    </PageShell>
  )
}

export function FreelancerProfileError({ message }: { message: string }) {
  const router = useRouter()
  return (
    <PageShell>
      <main className="container mx-auto flex min-h-[60vh] items-center justify-center px-4 py-12">
        <ErrorState
          title="Perfil não encontrado"
          description={message || "Não foi possível carregar este perfil."}
          onRetry={() => router.push("/search")}
          retryLabel="Voltar para busca"
        />
      </main>
    </PageShell>
  )
}
