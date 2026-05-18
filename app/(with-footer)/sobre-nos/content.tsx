"use client"

import { useEffect } from "react"
import Link from "next/link"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"
import { useTranslations } from "@/components/i18n/I18nProvider"

const values = [
  { title: "Autonomia", text: "Cliente e profissional negociam diretamente, com liberdade para combinar valores, prazos e entregas." },
  { title: "Visibilidade", text: "Quem trabalha precisa ser encontrado de forma mais clara e profissional." },
  { title: "Organização", text: "Máquinas, profissões e filtros ajudam a transformar busca em direção." },
  { title: "Oportunidade", text: "A plataforma existe para aproximar pessoas de soluções reais." },
  { title: "Transparência", text: "A Freelandoo não promete contratação garantida. Ela entrega exposição, organização e conexão." },
]

const platform = [
  "perfis profissionais",
  "portfólios",
  "serviços",
  "máquinas",
  "clans",
  "cupons e afiliados",
  "métricas de engajamento",
  "contato direto",
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

export function SobreNosContent() {
  const t = useTranslations("AboutUs")
  useReveal()

  return (
    <main className="flex-1 bg-background">
      {/* HERO */}
      <section className="relative overflow-hidden py-24 md:py-36">
        <div className="pointer-events-none absolute left-1/2 top-0 -translate-x-1/2 h-[500px] w-[900px] rounded-full bg-primary/5 blur-[130px]" />
        <div className="container mx-auto px-4 relative max-w-3xl">
          <div className="inline-flex items-center rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-sm text-primary mb-6" data-reveal>
            {t("hero.badge", "Sobre a Freelandoo")}
          </div>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground leading-tight mb-6" data-reveal>
            {t("hero.title", "Uma plataforma para quem faz acontecer")}
          </h1>
          <p className="text-xl text-muted-foreground mb-4" data-reveal>
            {t("hero.subtitle", "A Freelandoo nasceu para facilitar a conexão entre profissionais, prestadores, criadores, empresas e pessoas que precisam resolver algo.")}
          </p>
          <p className="text-muted-foreground leading-relaxed" data-reveal>
            {t("hero.description", "Em um mundo onde está cada vez mais fácil criar sites, apps e perfis, o desafio real é gerar conexão útil. A Freelandoo existe para organizar profissionais por intenção, dar visibilidade a quem trabalha e facilitar o encontro entre demanda e solução.")}
          </p>
        </div>
      </section>

      {/* NOSSA VISÃO */}
      <section className="py-16 md:py-24 bg-card/20">
        <div className="container mx-auto px-4 max-w-3xl">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-6" data-reveal>
            {t("vision.title", "Menos ruído. Mais conexão.")}
          </h2>
          <div className="text-muted-foreground leading-relaxed space-y-4" data-reveal>
            <p>
              {t("vision.p1", "A Freelandoo acredita que profissionais precisam de mais do que uma rede social. Eles precisam de uma vitrine organizada, com filtros claros, portfólio, serviços e uma forma simples de contato.")}
            </p>
            <p>
              {t("vision.p2", "Para quem procura, a plataforma reduz o caminho. Para quem anuncia, cria presença. Para ambos, facilita a conversa.")}
            </p>
          </div>
        </div>
      </section>

      {/* O QUE DEFENDEMOS */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-12" data-reveal>
            {t("values.title", "O que defendemos")}
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6" data-stagger>
            {values.map((v, i) => (
              <div key={v.title} className="bg-card border border-border rounded-xl p-6 hover:border-primary/30 hover:shadow-[0_0_30px_rgba(242,196,9,0.06)] transition-all" data-card>
                <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                  <span className="text-primary text-sm">◆</span>
                </div>
                <h3 className="font-semibold text-foreground mb-2">{t(`values.${i}.title`, v.title)}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{t(`values.${i}.text`, v.text)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* COMO FUNCIONAMOS */}
      <section className="py-16 md:py-24 bg-card/20">
        <div className="container mx-auto px-4 max-w-3xl">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4" data-reveal>
            {t("platform.title", "Uma vitrine com lógica de máquinas")}
          </h2>
          <p className="text-muted-foreground mb-10 leading-relaxed" data-reveal>
            {t("platform.description", "As máquinas organizam profissionais por tipo de necessidade. Isso permite que clientes encontrem perfis de maneira mais intuitiva e que profissionais se posicionem com mais clareza.")}
          </p>
          <div className="mb-4 text-sm font-medium text-foreground" data-reveal>{t("platform.label", "A Freelandoo reúne:")}</div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3" data-stagger>
            {platform.map((item, i) => (
              <div key={item} className="bg-card border border-border rounded-lg px-4 py-3 text-sm text-foreground hover:border-primary/20 transition-colors" data-card>
                {t(`platform.items.${i}`, item)}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="py-20 md:py-28 relative overflow-hidden">
        <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-[350px] w-[700px] rounded-full bg-primary/5 blur-[100px]" />
        <div className="container mx-auto px-4 text-center relative">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4" data-reveal>
            {t("final.title", "Estamos construindo uma nova forma de encontrar profissionais")}
          </h2>
          <p className="text-muted-foreground mb-10 max-w-lg mx-auto leading-relaxed" data-reveal>
            {t("final.description", "Uma plataforma simples, direta e feita para quem quer aparecer e para quem precisa resolver.")}
          </p>
          <div className="flex flex-wrap gap-4 justify-center" data-reveal>
            <Link href="/search" className="inline-flex items-center bg-primary text-black font-semibold px-8 py-4 rounded-lg hover:bg-primary/90 hover:shadow-[0_0_20px_rgba(242,196,9,0.35)] transition-all text-lg">
              {t("final.primaryCta", "Encontrar profissionais")}
            </Link>
            <Link href="/anunciar-servicos" className="inline-flex items-center border border-border text-foreground font-medium px-8 py-4 rounded-lg hover:border-primary/40 transition-all text-lg">
              {t("final.secondaryCta", "Anunciar serviços")}
            </Link>
          </div>
        </div>
      </section>
    </main>
  )
}
