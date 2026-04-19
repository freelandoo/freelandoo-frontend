import { Button } from "@/components/ui/button"
import { ArrowRight, Building2, Users } from "lucide-react"

export function CtaSection() {
  return (
    <section className="bg-gradient-to-b from-background to-neutral-900 py-20 md:py-28">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-5xl text-center">
          <h2 className="mb-4 text-balance text-3xl font-bold tracking-tight md:text-4xl lg:text-5xl">
            Comece hoje mesmo na Freelandoo
          </h2>
          <p className="mx-auto mb-12 max-w-2xl text-pretty text-lg text-muted-foreground md:text-xl">
            Conecte sua marca com influenciadores autênticos ou transforme sua audiência em oportunidades reais
          </p>

          <div className="grid gap-6 md:grid-cols-2">
            <div className="rounded-xl border border-border bg-card p-8 text-left shadow-lg transition-all hover:shadow-xl">
              <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-primary/20 text-primary">
                <Building2 className="h-6 w-6" />
              </div>
              <h3 className="mb-2 text-2xl font-bold">Para Empresas</h3>
              <p className="mb-6 text-muted-foreground">
                Encontre influenciadores qualificados do seu nicho. Acesso 100% gratuito, sem comissões.
              </p>
              <Button className="w-full gap-2">
                Buscar Influenciadores
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>

            <div className="rounded-xl border border-border bg-card p-8 text-left shadow-lg transition-all hover:shadow-xl">
              <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Users className="h-6 w-6" />
              </div>
              <h3 className="mb-2 text-2xl font-bold">Para Creators</h3>
              <p className="mb-6 text-muted-foreground">
                Conecte-se com marcas que buscam seu perfil. Taxa única de R$10, sem mensalidades.
              </p>
              <Button variant="outline" className="w-full gap-2 border-primary text-primary hover:bg-primary/10">
                Cadastrar Perfil
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
