import { Card, CardContent } from "@/components/ui/card"
import { Building2, Sparkles } from "lucide-react"

const features = [
  {
    icon: Building2,
    title: "Para Empresas",
    description:
      "Encontre influenciadores do nicho certo, no tamanho ideal para seu orçamento de forma rápida e eficiente. Acesso 100% gratuito à plataforma completa, busca avançada por filtros relevantes e contato direto sem taxas ou comissões sobre campanhas.",
  },
  {
    icon: Sparkles,
    title: "Para Creators",
    description:
      "Visibilidade real para empresas do seu nicho, perfil profissional que valoriza seu trabalho e custo previsível com taxa anual de R$49. Mantenha 100% dos seus ganhos sem comissões por campanha e controle total das negociações.",
  },
]

export function FeaturesSection() {
  return (
    <section className="py-20 md:py-28">
      <div className="container mx-auto px-4">
        <div className="mx-auto mb-16 max-w-2xl text-center">
          <h2 className="mb-4 text-balance text-3xl font-bold tracking-tight md:text-4xl lg:text-5xl">
            Por que escolher a <span className="text-primary">Freelandoo</span>?
          </h2>
          <p className="text-pretty text-lg text-muted-foreground">
            Empresas encontram creators com facilidade, no tamanho certo para cada campanha e orçamento
          </p>
        </div>

        <div className="mx-auto grid max-w-4xl gap-8 sm:grid-cols-2">
          {features.map((feature, index) => (
            <Card key={index} className="border-border/50 transition-shadow hover:shadow-lg">
              <CardContent className="p-8">
                <div className="mb-4 inline-flex rounded-lg bg-primary/10 p-3">
                  <feature.icon className="h-8 w-8 text-primary" />
                </div>
                <h3 className="mb-3 text-2xl font-semibold">{feature.title}</h3>
                <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}
