'use client'

import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { XCircle } from 'lucide-react'

export default function FailurePage() {
  const router = useRouter()

  return (
    <main className="flex flex-1 flex-col items-center justify-center py-12 px-4">
      <Card className="w-full max-w-md border-red-200">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <XCircle className="h-16 w-16 text-red-600" />
          </div>
          <CardTitle className="text-2xl text-red-600">Pagamento não autorizado</CardTitle>
          <CardDescription className="mt-2 text-base">
            Não conseguimos processar sua transação
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Status</span>
              <span className="font-semibold text-red-600">Recusado</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Data</span>
              <span className="font-semibold">{new Date().toLocaleDateString('pt-BR')}</span>
            </div>
          </div>

          <div className="space-y-2">
            <Button onClick={() => router.back()} className="w-full bg-red-600 hover:bg-red-700">
              Tentar novamente
            </Button>
            <Button
              onClick={() => router.push('/')}
              variant="outline"
              className="w-full"
            >
              Voltar para home
            </Button>
          </div>

          <p className="text-xs text-muted-foreground text-center">
            Se o problema persistir, entre em contato com nosso suporte
          </p>
        </CardContent>
      </Card>
    </main>
  )
}
