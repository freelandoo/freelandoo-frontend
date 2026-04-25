"use client"

import { useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CheckCircle2 } from "lucide-react"

export default function SucessoPage() {
  const router = useRouter()
  const params = useSearchParams()
  const sessionId = params.get("session_id")

  useEffect(() => {
    // Placeholder: futuramente podemos puxar /api/stripe/subscription/me
    // para refletir o estado na UI enquanto o webhook processa.
  }, [sessionId])

  return (
    <main className="flex-1 container mx-auto px-4 py-16">
      <div className="max-w-xl mx-auto">
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 inline-flex h-14 w-14 items-center justify-center rounded-full bg-green-100">
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
            <CardTitle>Pagamento confirmado</CardTitle>
            <CardDescription>
              Recebemos seu pagamento. Assim que o Stripe confirmar, seu perfil será ativado
              automaticamente nos classificados.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-center">
            <p className="text-sm text-muted-foreground">
              Em alguns segundos o status do seu perfil será atualizado. Você pode acompanhar em
              &quot;Minha conta&quot;.
            </p>
            <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
              <Button onClick={() => router.push("/account")}>Ir para minha conta</Button>
              <Button variant="outline" onClick={() => router.push("/")}>
                Voltar ao início
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
