"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"
import { useTranslations } from "@/components/i18n/I18nProvider"
import { TourHelpCenter } from "@/features/tour/TourHelpCenter"

const categories = [
  "Conta e cadastro",
  "Ativação e pagamento",
  "Perfil profissional",
  "Portfólio",
  "Serviços e agenda",
  "Enxames",
  "Clans",
  "Cupons e afiliados",
  "Segurança",
  "Suporte",
]

const faqs = [
  { q: "Como criar minha conta?", a: "Você pode criar sua conta informando seus dados básicos ou usando as opções de login disponíveis. Depois disso, poderá acessar sua área e configurar seu perfil." },
  { q: "Como ativar meu perfil profissional?", a: "Para aparecer na vitrine pública da Freelandoo, o profissional precisa configurar seu perfil e concluir a ativação. A ativação acontece após a confirmação do pagamento." },
  { q: "Quanto custa anunciar na Freelandoo?", a: "A ativação do perfil profissional custa R$ 300 em pagamento único." },
  { q: "A Freelandoo cobra comissão sobre serviços fechados?", a: "Não. A Freelandoo não cobra comissão sobre os serviços negociados diretamente entre cliente e profissional." },
  { q: "Como funcionam os enxames?", a: "Os enxames organizam profissionais por intenção. Em vez de navegar por categorias soltas, o usuário escolhe um enxame, como Marketing, Tecnologia, Construção, Saúde, Beleza e Bem-estar, Pets ou Eventos." },
  { q: "Como escolher minha profissão?", a: "Sua profissão deve estar ligada ao enxame principal do seu perfil. Isso ajuda a plataforma a mostrar seu perfil para buscas mais compatíveis." },
  { q: "Como funciona o portfólio?", a: "O portfólio permite mostrar trabalhos, imagens, vídeos, resultados e exemplos do que você faz. Ele ajuda clientes a entenderem melhor sua experiência." },
  { q: "Como funcionam os serviços?", a: "O profissional pode cadastrar serviços com descrição, duração, valor e informações importantes. Esses serviços ajudam o cliente a entender melhor o que pode contratar." },
  { q: "Como funcionam os cupons?", a: "Cupons podem oferecer desconto para novos assinantes e, em alguns casos, gerar comissão para quem indicou, conforme as regras ativas da plataforma." },
  { q: "O que são clans?", a: "Clans são agrupamentos de profissionais, criadores ou prestadores que podem reunir competências e mostrar a distribuição de enxames dos participantes." },
  { q: "Como excluir minha conta?", a: "O usuário deve acessar sua área de conta ou entrar em contato com o suporte para solicitar exclusão, conforme as regras de privacidade da plataforma." },
  { q: "Como falar com suporte?", a: "Use o canal de suporte indicado na plataforma ou entre em contato pelo e-mail oficial da Freelandoo." },
]

function useReveal() {
  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger)
    gsap.utils.toArray<HTMLElement>("[data-reveal]").forEach((el) => {
      gsap.from(el, { y: 30, opacity: 0, duration: 0.7, ease: "power3.out", scrollTrigger: { trigger: el, start: "top 88%" } })
    })
    gsap.utils.toArray<HTMLElement>("[data-stagger]").forEach((container) => {
      gsap.from(container.querySelectorAll("[data-card]"), { y: 25, opacity: 0, duration: 0.6, stagger: 0.08, ease: "power2.out", scrollTrigger: { trigger: container, start: "top 85%" } })
    })
    return () => ScrollTrigger.getAll().forEach((t) => t.kill())
  }, [])
}

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border border-border rounded-xl overflow-hidden hover:border-primary/20 transition-colors">
      <button
        className="w-full flex items-center justify-between px-6 py-4 text-left font-medium text-foreground hover:bg-card/50 transition-colors gap-4"
        onClick={() => setOpen((o) => !o)}
      >
        <span>{q}</span>
        <span className={`flex-shrink-0 text-muted-foreground transition-transform duration-200 ${open ? "rotate-180" : ""}`}>▾</span>
      </button>
      {open && (
        <div className="px-6 pb-5 text-sm text-muted-foreground leading-relaxed border-t border-border/50 pt-4">
          {a}
        </div>
      )}
    </div>
  )
}

export function CentralDeAjudaContent() {
  const t = useTranslations("HelpCenter")
  const [search, setSearch] = useState("")
  useReveal()

  const filtered = search.trim()
    ? faqs.filter((f) =>
        f.q.toLowerCase().includes(search.toLowerCase()) ||
        f.a.toLowerCase().includes(search.toLowerCase())
      )
    : faqs

  return (
    <main className="flex-1 bg-background">
      {/* HERO */}
      <section className="relative overflow-hidden py-20 md:py-28">
        <div className="pointer-events-none absolute left-1/2 top-0 -translate-x-1/2 h-[300px] w-[700px] rounded-full bg-primary/5 blur-[100px]" />
        <div className="container mx-auto px-4 relative text-center max-w-2xl">
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4" data-reveal>
            {t("hero.title", "Central de ajuda")}
          </h1>
          <p className="text-xl text-muted-foreground mb-10" data-reveal>
            {t("hero.description", "Encontre respostas sobre conta, ativação, perfis, enxames, serviços, agenda, cupons e segurança.")}
          </p>
          <div className="relative" data-reveal>
            <input
              type="text"
              placeholder={t("search.placeholder", "Busque uma dúvida...")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-card border border-border rounded-xl px-5 py-4 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/10 transition-all pr-12"
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground">⌕</span>
          </div>
        </div>
      </section>

      {/* CATEGORIAS */}
      <section className="py-10 bg-card/20">
        <div className="container mx-auto px-4">
          <div className="flex flex-wrap gap-3 justify-center" data-stagger>
            {categories.map((cat, i) => (
              <button
                key={cat}
                className="bg-card border border-border rounded-full px-4 py-2 text-sm text-foreground hover:border-primary/40 hover:text-primary transition-all"
                onClick={() => setSearch(cat)}
                data-card
              >
                {t(`categories.${i}`, cat)}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4 max-w-3xl">
          {search && (
            <div className="mb-6 flex items-center gap-3">
              <span className="text-sm text-muted-foreground">
                {filtered.length} {filtered.length === 1 ? t("results.singular", "resultado") : t("results.plural", "resultados")} {t("results.for", "para")} &quot;{search}&quot;
              </span>
              <button onClick={() => setSearch("")} className="text-xs text-primary hover:underline">
                {t("results.clear", "limpar")}
              </button>
            </div>
          )}
          {filtered.length > 0 ? (
            <div className="space-y-3">
              {filtered.map((faq) => {
                const originalIndex = faqs.indexOf(faq)
                return <FaqItem key={faq.q} q={t(`faqs.${originalIndex}.q`, faq.q)} a={t(`faqs.${originalIndex}.a`, faq.a)} />
              })}
            </div>
          ) : (
            <div className="text-center py-16 text-muted-foreground">
              <p className="mb-2 text-lg font-medium text-foreground">{t("empty.title", "Nenhum resultado encontrado")}</p>
              <p className="text-sm">{t("empty.description", "Tente outra busca ou fale diretamente com o suporte.")}</p>
            </div>
          )}
        </div>
      </section>

      {/* CTA SUPORTE */}
      <section className="py-16 bg-card/20">
        <div className="container mx-auto px-4 max-w-xl text-center">
          <div className="bg-card border border-border rounded-2xl p-8" data-reveal>
            <h2 className="text-2xl font-bold text-foreground mb-3">
              {t("support.title", "Não encontrou o que precisava?")}
            </h2>
            <p className="text-muted-foreground mb-6 text-sm leading-relaxed">
              {t("support.description", "Entre em contato com a Freelandoo para receber ajuda.")}
            </p>
            <Link href="/cadastro" className="inline-flex items-center bg-primary text-black font-semibold px-6 py-3 rounded-lg hover:bg-primary/90 hover:shadow-[0_0_20px_rgba(242,196,9,0.35)] transition-all">
              {t("support.cta", "Falar com suporte")}
            </Link>
          </div>
          <TourHelpCenter />
        </div>
      </section>
    </main>
  )
}
