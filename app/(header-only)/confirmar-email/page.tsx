import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Mail, CheckCircle2 } from "lucide-react"
import Link from "next/link"

export default function ConfirmarEmailPage() {
  return (
    <div className="bg-page-shell-dark">
      <main className="container mx-auto px-4 py-16">
        <div className="mx-auto max-w-2xl">
          <Card className="text-center">
            <CardHeader className="space-y-4 pb-8 pt-12">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-primary/20">
                <Mail className="h-10 w-10 text-primary" />
              </div>
              <CardTitle className="text-3xl font-bold">Confirme o seu e-mail</CardTitle>
              <CardDescription className="text-base">Enviamos um link de confirmação para o seu e-mail</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 pb-12">
              <div className="space-y-4">
                <div className="flex items-start gap-3 rounded-lg border border-primary/20 bg-primary/10 p-4 text-left">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                  <div className="space-y-1">
                    <p className="font-semibold">Verifique sua caixa de entrada</p>
                    <p className="text-sm text-muted-foreground">
                      Clique no link que enviamos para ativar sua conta e concluir o cadastro.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 rounded-lg bg-amber-500/10 p-4 text-left border border-amber-500/20">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-500" />
                  <div className="space-y-1">
                    <p className="font-semibold">Não encontrou o e-mail?</p>
                    <p className="text-sm text-muted-foreground">
                      Verifique sua pasta de spam ou lixo eletrônico. O e-mail pode levar alguns minutos para chegar.
                    </p>
                  </div>
                </div>


              </div>

              <div className="space-y-3 pt-4">
                <Button className="w-full bg-purple-600 hover:bg-purple-700" size="lg">
                  Reenviar e-mail de confirmação
                </Button>

                <Link href="/" className="block">
                  <Button variant="outline" className="w-full bg-transparent" size="lg">
                    Voltar para o início
                  </Button>
                </Link>
              </div>

              <p className="pt-4 text-sm text-muted-foreground">
                Precisa de ajuda?{" "}
                <a href="#" className="font-semibold text-purple-600 hover:underline">
                  Entre em contato
                </a>
              </p>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
