"use client"

import { useEffect } from "react"
import Link from "next/link"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"
import { useTranslations } from "@/components/i18n/I18nProvider"

const building = [
  "enxames de intenção",
  "perfis profissionais",
  "portfólios",
  "serviços e agenda",
  "clans",
  "cupons e afiliados",
  "rankings e métricas de engajamento",
  "vitrine pública de profissionais",
]

const roles = [
  { title: "Desenvolvimento", text: "Pessoas com experiência em frontend, backend, integrações, SaaS, pagamentos e infraestrutura." },
  { title: "Design e produto", text: "Profissionais que pensam experiência, interface, identidade visual e clareza de uso." },
  { title: "Marketing e crescimento", text: "Pessoas que entendem aquisição, comunidade, creators, conteúdo e posicionamento." },
  { title: "Suporte e operação", text: "Pessoas organizadas, cuidadosas e boas em ajudar usuários." },
  { title: "Parcerias", text: "Creators, empresas, profissionais e grupos que queiram crescer junto com a plataforma." },
]

function useReveal() {
  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger)
    gsap.utils.toArray<HTMLElement>("[data-reveal]").forEach((el) => {
      gsap.from(el, { y: 30, opacity: 0, duration: 0.7, ease: "power3.out", scrollTrigger: { trigger: el, start: "top 88%" } })
    })
    gsap.utils.toArray<HTMLElement>("[data-stagger]").forEach((container) => {
      gsap.from(container.querySelectorAll("[data-card]"), { y: 25, opacity: 0, duration: 0.6, stagger: 0.1, ease: "power2.out", scrollTrigger: { trigger: container, start: "top 85%" } })
    })
    return () => ScrollTrigger.getAll().forEach((t) => t.kill())
  }, [])
}

export function CarreirasContent() {
  const t = useTranslations("Careers")
  useReveal()

  return (
    <main className="flex-1 bg-background">
      {/* HERO */}
      <section className="relative overflow-hidden py-24 md:py-36">
        <div className="pointer-events-none absolute left-1/2 top-0 -translate-x-1/2 h-[400px] w-[800px] rounded-full bg-primary/5 blur-[120px]" />
        <div className="container mx-auto px-4 relative max-w-3xl">
          <div className="inline-flex items-center rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-sm text-primary mb-6" data-reveal>
            {t("hero.badge", "Carreiras")}
          </div>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground leading-tight mb-6" data-reveal>
            {t("hero.title", "Carreiras na Freelandoo")}
          </h1>
          <p className="text-xl text-muted-foreground mb-4" data-reveal>
            {t("hero.subtitle", "Estamos construindo uma plataforma para conectar profissionais e oportunidades de um jeito mais simples, direto e inteligente.")}
          </p>
          <p className="text-muted-foreground mb-10 leading-relaxed" data-reveal>
            {t("hero.description", "A Freelandoo está em crescimento. Talvez ainda não tenhamos vagas abertas, mas queremos manter uma porta aberta para pessoas que se identificam com nossa visão.")}
          </p>
          <div data-reveal>
            <Link href="/cadastro" className="inline-flex items-center bg-primary text-black font-semibold px-6 py-3 rounded-lg hover:bg-primary/90 hover:shadow-[0_0_20px_rgba(242,196,9,0.35)] transition-all">
              {t("hero.cta", "Fale com a Freelandoo")}
            </Link>
          </div>
        </div>
      </section>

      {/* O QUE ESTAMOS CONSTRUINDO */}
      <section className="py-16 md:py-24 bg-card/20">
        <div className="container mx-auto px-4 max-w-3xl">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4" data-reveal>
            {t("building.title", "Uma plataforma para profissionais, creators e prestadores")}
          </h2>
          <p className="text-muted-foreground mb-10 leading-relaxed" data-reveal>
            {t("building.description", "Nosso objetivo é criar uma vitrine inteligente onde quem trabalha possa aparecer melhor e quem procura serviços encontre profissionais com mais clareza.")}
          </p>
          <div className="mb-4 text-sm font-medium text-foreground" data-reveal>{t("building.label", "Estamos desenvolvendo recursos como:")}</div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3" data-stagger>
            {building.map((item, i) => (
              <div key={item} className="bg-card border border-border rounded-lg px-4 py-3 text-sm text-foreground hover:border-primary/20 transition-colors" data-card>
                {t(`building.items.${i}`, item)}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* COM QUEM QUEREMOS CONVERSAR */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-12" data-reveal>
            {t("roles.title", "Pessoas que podem construir com a gente")}
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6" data-stagger>
            {roles.map((role, i) => (
              <div key={role.title} className="bg-card border border-border rounded-xl p-6 hover:border-primary/30 hover:shadow-[0_0_30px_rgba(242,196,9,0.06)] transition-all" data-card>
                <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                  <span className="text-primary text-sm">◆</span>
                </div>
                <h3 className="font-semibold text-foreground mb-2">{t(`roles.${i}.title`, role.title)}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{t(`roles.${i}.text`, role.text)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* STATUS ATUAL */}
      <section className="py-16 md:py-24 bg-card/20">
        <div className="container mx-auto px-4 max-w-2xl">
          <div className="bg-card border border-border rounded-2xl p-8 md:p-12" data-reveal>
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4">
              {t("status.title", "No momento, estamos em fase de construção")}
            </h2>
            <p className="text-muted-foreground mb-4 leading-relaxed">
              {t("status.description", "Ainda podemos não ter vagas abertas, mas estamos abertos a conhecer pessoas que se conectam com a visão da Freelandoo.")}
            </p>
            <p className="text-muted-foreground mb-8 text-sm leading-relaxed">
              {t("status.note", "Se você acredita que pode contribuir com tecnologia, produto, design, marketing, comunidade ou parcerias, acompanhe a evolução da plataforma.")}
            </p>
            <Link href="/cadastro" className="inline-flex items-center bg-primary text-black font-semibold px-6 py-3 rounded-lg hover:bg-primary/90 hover:shadow-[0_0_20px_rgba(242,196,9,0.35)] transition-all">
              {t("status.cta", "Entrar em contato")}
            </Link>
          </div>
        </div>
      </section>
    </main>
  )
}
