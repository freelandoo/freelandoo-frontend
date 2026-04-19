'use client'

import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { CheckCircle2 } from 'lucide-react'

export default function SuccessPage() {
  const router = useRouter()

  return (
    <main className="flex flex-1 flex-col items-center justify-center py-12 px-4">
      <Card className="w-full max-w-md border-green-200">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <CheckCircle2 className="h-16 w-16 text-green-600" />
          </div>
          <CardTitle className="text-2xl text-green-600">Pagamento Realizado!</CardTitle>
          <CardDescription className="mt-2 text-base">
            Sua transação foi processada com sucesso
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Status</span>
              <span className="font-semibold text-green-600">Confirmado</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Data</span>
              <span className="font-semibold">{new Date().toLocaleDateString('pt-BR')}</span>
            </div>
          </div>

          <div className="space-y-2">
            <Button onClick={() => router.push('/account')} className="w-full bg-green-600 hover:bg-green-700">
              Acessar meu perfil
            </Button>
            <Button
              onClick={() => router.push('/')}
              variant="outline"
              className="w-full"
            >
              Voltar para home
            </Button>
          </div>
        </CardContent>
      </Card>
    </main>
  )
}
