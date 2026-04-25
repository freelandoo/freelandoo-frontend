import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Check, Building2, Users, TrendingUp } from "lucide-react"
import Link from "next/link"
export default function ComoFunciona() {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="border-b border-border bg-gradient-to-b from-primary/5 to-background py-20">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="mb-6 text-4xl font-bold tracking-tight text-balance md:text-5xl lg:text-6xl">
              Como funciona a Freelandoo
            </h1>
            <p className="text-lg text-muted-foreground text-pretty md:text-xl">
              Uma plataforma que conecta empresas e influenciadores de forma simples, rápida e sem complicações
            </p>
          </div>
        </div>
      </section>

      {/* Para Empresas */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-6xl">
            <div className="mb-12 text-center">
              <div className="mb-4 inline-flex items-center justify-center rounded-full bg-accent/10 p-3">
                <Building2 className="h-8 w-8 text-accent" />
              </div>
              <h2 className="mb-4 text-3xl font-bold tracking-tight md:text-4xl">Para Empresas</h2>
              <p className="text-lg text-muted-foreground text-pretty">
                Encontrar influenciadores do nicho certo, no orçamento certo, de forma rápida e eficiente
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              <Card className="border-2 border-accent/20 bg-card">
                <CardContent className="pt-6">
                  <div className="mb-4 inline-flex items-center justify-center rounded-lg bg-accent/10 p-2">
                    <Check className="h-5 w-5 text-accent" />
                  </div>
                  <h3 className="mb-2 text-lg font-semibold">Acesso 100% gratuito</h3>
                  <p className="text-sm text-muted-foreground">
                    Acesso gratuito à plataforma completa, busca avançada e contato direto sem taxas ou comissões
                  </p>
                </CardContent>
              </Card>

              <Card className="border-2 border-accent/20 bg-card">
                <CardContent className="pt-6">
                  <div className="mb-4 inline-flex items-center justify-center rounded-lg bg-accent/10 p-2">
                    <Check className="h-5 w-5 text-accent" />
                  </div>
                  <h3 className="mb-2 text-lg font-semibold">Busca por nicho específico</h3>
                  <p className="text-sm text-muted-foreground">
                    Filtros relevantes para encontrar exatamente o perfil que você procura
                  </p>
                </CardContent>
              </Card>

              <Card className="border-2 border-accent/20 bg-card">
                <CardContent className="pt-6">
                  <div className="mb-4 inline-flex items-center justify-center rounded-lg bg-accent/10 p-2">
                    <Check className="h-5 w-5 text-accent" />
                  </div>
                  <h3 className="mb-2 text-lg font-semibold">Comparação fácil entre perfis</h3>
                  <p className="text-sm text-muted-foreground">
                    Compare influenciadores lado a lado para tomar a melhor decisão
                  </p>
                </CardContent>
              </Card>

              <Card className="border-2 border-accent/20 bg-card">
                <CardContent className="pt-6">
                  <div className="mb-4 inline-flex items-center justify-center rounded-lg bg-accent/10 p-2">
                    <Check className="h-5 w-5 text-accent" />
                  </div>
                  <h3 className="mb-2 text-lg font-semibold">Economia de tempo e recursos</h3>
                  <p className="text-sm text-muted-foreground">
                    Encontre e contate influenciadores em minutos, não em dias
                  </p>
                </CardContent>
              </Card>
            </div>

            <div className="mt-12 text-center">
              <Button size="lg" className="font-semibold">
                Começar Gratuitamente
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Para Creators */}
      <section className="border-y border-border bg-muted/30 py-20">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-6xl">
            <div className="mb-12 text-center">
              <div className="mb-4 inline-flex items-center justify-center rounded-full bg-primary/10 p-3">
                <Users className="h-8 w-8 text-primary" />
              </div>
              <h2 className="mb-4 text-3xl font-bold tracking-tight md:text-4xl">Para Creators</h2>
              <p className="text-lg text-muted-foreground text-pretty">
                Visibilidade real para empresas do seu nicho, perfil profissional que valoriza seu trabalho e custo
                previsível com anuidade de R$ 300
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              <Card className="border-2 border-primary/20 bg-card">
                <CardContent className="pt-6">
                  <div className="mb-4 inline-flex items-center justify-center rounded-lg bg-primary/10 p-2">
                    <Check className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="mb-2 text-lg font-semibold">Anuidade de R$ 300</h3>
                  <p className="text-sm text-muted-foreground">
                    Cobrança anual única. Sem comissões por campanha — mantenha 100% dos seus ganhos
                  </p>
                </CardContent>
              </Card>

              <Card className="border-2 border-primary/20 bg-card">
                <CardContent className="pt-6">
                  <div className="mb-4 inline-flex items-center justify-center rounded-lg bg-primary/10 p-2">
                    <Check className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="mb-2 text-lg font-semibold">Perfil profissional indexado</h3>
                  <p className="text-sm text-muted-foreground">
                    Seu perfil aparece nas buscas de empresas do seu nicho
                  </p>
                </CardContent>
              </Card>

              <Card className="border-2 border-primary/20 bg-card">
                <CardContent className="pt-6">
                  <div className="mb-4 inline-flex items-center justify-center rounded-lg bg-primary/10 p-2">
                    <Check className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="mb-2 text-lg font-semibold">Controle total das negociações</h3>
                  <p className="text-sm text-muted-foreground">
                    Você define seus preços e condições. Sem comissões por campanha
                  </p>
                </CardContent>
              </Card>

              <Card className="border-2 border-primary/20 bg-card">
                <CardContent className="pt-6">
                  <div className="mb-4 inline-flex items-center justify-center rounded-lg bg-primary/10 p-2">
                    <Check className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="mb-2 text-lg font-semibold">Oportunidades de destaque</h3>
                  <p className="text-sm text-muted-foreground">
                    Opções pagas para aumentar sua visibilidade quando quiser
                  </p>
                </CardContent>
              </Card>
            </div>

            <div className="mt-12 text-center">
              <Button size="lg" className="font-semibold">
                Cadastrar como Creator
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Final */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-6 inline-flex items-center justify-center rounded-full bg-primary/10 p-3">
              <TrendingUp className="h-8 w-8 text-primary" />
            </div>
            <h2 className="mb-4 text-3xl font-bold tracking-tight text-balance md:text-4xl">Pronto para começar?</h2>
            <p className="mb-8 text-lg text-muted-foreground text-pretty">
              Junte-se à Freelandoo e revolucione a forma como você encontra ou oferece serviços de marketing de
              influência
            </p>
            <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Button size="lg" className="w-full font-semibold sm:w-auto">
                Sou Empresa
              </Button>
              <Button size="lg" variant="outline" className="w-full font-semibold sm:w-auto bg-transparent">
                Sou Creator
              </Button>
            </div>
            <p className="mt-6 text-sm text-muted-foreground">
              <Link href="/" className="text-primary underline-offset-4 hover:underline">
                Voltar para a página inicial
              </Link>
            </p>
          </div>
        </div>
      </section>
    </div>
  )
}
