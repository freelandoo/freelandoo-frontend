'use client'

import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Clock } from 'lucide-react'

export default function PendingPage() {
  const router = useRouter()

  return (
    <main className="flex flex-1 flex-col items-center justify-center py-12 px-4">
      <Card className="w-full max-w-md border-amber-200">
        <CardHeader className="text-center">
          <div className="mb-4 flex justify-center">
            <Clock className="h-16 w-16 animate-pulse text-amber-600" />
          </div>
          <CardTitle className="text-2xl text-amber-700">Pagamento em processamento</CardTitle>
          <CardDescription className="mt-2 text-base">
            Sua transação está sendo analisada
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Status</span>
              <span className="font-semibold text-amber-700">Pendente</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Iniciado em</span>
              <span className="font-semibold">{new Date().toLocaleTimeString('pt-BR')}</span>
            </div>
          </div>

          <div className="space-y-2">
            <Button onClick={() => router.push('/account')} className="w-full bg-amber-600 hover:bg-amber-700">
              Acompanhar no perfil
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
            Ainda com dúvidas? Verifique seus emails ou entre em contato com nosso suporte
          </p>
        </CardContent>
      </Card>
    </main>
  )
}
