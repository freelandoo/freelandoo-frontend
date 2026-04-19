"use client"

import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"

export function FreelancerProfileLoading() {
  return (
    <div className="bg-page-shell-dark">
      <main className="container mx-auto flex min-h-[60vh] items-center justify-center px-4 py-8">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-primary" />
          <p className="mt-4 text-muted-foreground">Carregando perfil...</p>
        </div>
      </main>
    </div>
  )
}

export function FreelancerProfileError({ message }: { message: string }) {
  const router = useRouter()
  return (
    <div className="bg-page-shell-dark">
      <main className="container mx-auto flex min-h-[60vh] flex-col items-center justify-center gap-4 px-4 py-8">
        <p className="text-lg text-red-500">{message || "Perfil não encontrado"}</p>
        <Button onClick={() => router.push("/search")} variant="outline">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar para busca
        </Button>
      </main>
    </div>
  )
}
