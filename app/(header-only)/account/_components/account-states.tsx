"use client"

import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

export function AccountLoading() {
  return (
    <div className="bg-page-shell-dark">
      <div className="container mx-auto flex items-center justify-center px-4 py-16">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-primary" />
          <p className="mt-4 text-muted-foreground">Carregando perfil...</p>
        </div>
      </div>
    </div>
  )
}

export function AccountError({ message }: { message: string }) {
  const router = useRouter()
  return (
    <div className="bg-page-shell-dark">
      <div className="container mx-auto px-4 py-16">
        <Card className="mx-auto max-w-md">
          <CardContent className="pt-6 text-center">
            <p className="mb-4 text-red-600">{message || "Erro ao carregar perfil"}</p>
            <Button onClick={() => router.push("/login")}>Voltar ao Login</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
