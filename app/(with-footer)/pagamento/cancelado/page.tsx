"use client"

import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { XCircle } from "lucide-react"

export default function CanceladoPage() {
  const router = useRouter()

  return (
    <main className="flex-1 container mx-auto px-4 py-16">
      <div className="max-w-xl mx-auto">
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 inline-flex h-14 w-14 items-center justify-center rounded-full bg-red-100">
              <XCircle className="h-8 w-8 text-red-600" />
            </div>
            <CardTitle>Pagamento cancelado</CardTitle>
            <CardDescription>
              Nenhum valor foi cobrado. Você pode tentar novamente quando quiser.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 sm:flex-row sm:justify-center">
            <Button onClick={() => router.push("/payment/taxa")}>Tentar novamente</Button>
            <Button variant="outline" onClick={() => router.push("/")}>
              Voltar ao início
            </Button>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
