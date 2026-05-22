"use client"

import Link from "next/link"
import { useScrollReveal } from "@/lib/scroll-reveal"
import { useTranslations } from "@/components/i18n/I18nProvider"

const connectionCards = [
  { title: "Profissionais conectados", text: "Pessoas de diferentes enxames podem se aproximar, trocar referências e gerar oportunidades." },
  { title: "Clans", text: "Grupos podem reunir participantes e mostrar competências coletivas." },
  { title: "Divulgação", text: "A comunidade pode ajudar profissionais a ganharem mais visibilidade." },
  { title: "Crescimento coletivo", text: "Quanto mais organizada a rede, mais fácil fica encontrar e ser encontrado." },
]

const forWhom = [
  "freelancers", "influenciadores", "designers", "editores", "prestadores locais",
  "profissionais de beleza", "profissionais de pet", "empresas", "criadores", "parceiros",
]

function useReveal() {
  useScrollReveal()
}

export function ComunidadeContent() {
  const t = useTranslations("Community")
  useReveal()

  return (
    <main className="flex-1 bg-background">
      {/* HERO */}
      <section className="relative overflow-hidden py-24 md:py-32">
        <div className="pointer-events-none absolute left-1/2 top-0 -translate-x-1/2 h-[400px] w-[800px] rounded-full bg-primary/5 blur-[120px]" />
        <div className="container mx-auto px-4 relative max-w-3xl">
          <div className="inline-flex items-center rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-sm text-primary mb-6" data-reveal>
            {t("hero.badge", "Comunidade")}
          </div>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground leading-tight mb-6" data-reveal>
            {t("hero.title", "Uma comunidade para quem faz acontecer")}
          </h1>
          <p className="text-xl text-muted-foreground mb-4" data-reveal>
            {t("hero.subtitle", "A Freelandoo aproxima profissionais, criadores, prestadores, empresas e pessoas que procuram soluções reais.")}
          </p>
          <p className="text-muted-foreground mb-10 leading-relaxed" data-reveal>
            {t("hero.description", "Mais do que uma vitrine, a Freelandoo está construindo uma rede de profissionais conectados por enxames, interesses, serviços e oportunidades.")}
          </p>
          <div data-reveal>
            <Link href="/cadastro" className="inline-flex items-center bg-primary text-black font-semibold px-6 py-3 rounded-lg hover:bg-primary/90 hover:shadow-[0_0_20px_rgba(242,196,9,0.35)] transition-all">
              {t("hero.cta", "Entrar na comunidade")}
            </Link>
          </div>
        </div>
      </section>

      {/* O QUE É A COMUNIDADE */}
      <section className="py-16 md:py-24 bg-card/20">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4 max-w-2xl" data-reveal>
            {t("connections.title", "Conexões que vão além do perfil")}
          </h2>
          <p className="text-muted-foreground mb-12 max-w-2xl leading-relaxed" data-reveal>
            {t("connections.description", "A comunidade Freelandoo nasce para fortalecer quem trabalha por conta própria, quem cria, quem presta serviço e quem quer ser encontrado. A ideia é aproximar pessoas, gerar visibilidade e facilitar novas conexões profissionais.")}
          </p>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6" data-stagger>
            {connectionCards.map((card, i) => (
              <div key={card.title} className="bg-card border border-border rounded-xl p-6 hover:border-primary/30 hover:shadow-[0_0_30px_rgba(242,196,9,0.06)] transition-all" data-card>
                <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                  <span className="text-primary">◆</span>
                </div>
                <h3 className="font-semibold text-foreground mb-2">{t(`cards.${i}.title`, card.title)}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{t(`cards.${i}.text`, card.text)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PARA QUEM É */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4" data-reveal>
            {t("audience.title", "Para freelancers, prestadores, creators e empresas")}
          </h2>
          <p className="text-muted-foreground mb-10 max-w-2xl leading-relaxed" data-reveal>
            {t("audience.description", "A comunidade pode reunir quem presta serviços, quem cria conteúdo, quem divulga, quem contrata e quem quer construir presença profissional.")}
          </p>
          <div className="flex flex-wrap gap-3" data-stagger>
            {forWhom.map((tag, i) => (
              <span key={tag} className="bg-card border border-border rounded-full px-4 py-2 text-sm text-foreground hover:border-primary/40 hover:text-primary transition-all cursor-default capitalize" data-card>
                {t(`audience.tags.${i}`, tag)}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* STATUS HONESTO */}
      <section className="py-16 md:py-24 bg-card/20">
        <div className="container mx-auto px-4 max-w-2xl text-center">
          <div className="bg-card border border-border rounded-2xl p-8 md:p-12" data-reveal>
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4">
              {t("status.title", "Estamos construindo essa rede")}
            </h2>
            <p className="text-muted-foreground mb-8 leading-relaxed">
              {t("status.description", "A comunidade Freelandoo está em evolução. Novos recursos, iniciativas e formas de participação poderão ser adicionados conforme a plataforma cresce.")}
            </p>
            <a
              href="https://www.instagram.com/printtei_/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center border border-border text-foreground font-medium px-6 py-3 rounded-lg hover:border-primary/40 transition-all"
            >
              {t("status.cta", "Acompanhar novidades")}
            </a>
          </div>
        </div>
      </section>
    </main>
  )
}
