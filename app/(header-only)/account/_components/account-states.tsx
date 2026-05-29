"use client"

import { useRouter } from "next/navigation"
import { LoadingState, ErrorState } from "@/components/tabloide/kit"

export function AccountLoading() {
  return (
    <div className="fl-root fl-paper-texture flex min-h-[100dvh] items-center justify-center px-4 py-16">
      <LoadingState label="Carregando seu perfil…" />
    </div>
  )
}

export function AccountError({ message }: { message: string }) {
  const router = useRouter()
  return (
    <div className="fl-root fl-paper-texture flex min-h-[100dvh] items-center justify-center px-4 py-16">
      <ErrorState
        title="Não foi possível carregar"
        description={message || "Erro ao carregar perfil. Faça login novamente."}
        retryLabel="Voltar ao login"
        onRetry={() => router.push("/login")}
      />
    </div>
  )
}
