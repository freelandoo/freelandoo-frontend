"use client"

import Link from "next/link"
import { useScrollReveal } from "@/lib/scroll-reveal"
import { useTranslations } from "@/components/i18n/I18nProvider"

const values = [
  { title: "Autonomia", text: "Cliente e profissional negociam diretamente, com liberdade para combinar valores, prazos e entregas." },
  { title: "Visibilidade", text: "Quem trabalha precisa ser encontrado de forma mais clara e profissional." },
  { title: "Organização", text: "Enxames, profissões e filtros ajudam a transformar busca em direção." },
  { title: "Oportunidade", text: "A plataforma existe para aproximar pessoas de soluções reais." },
  { title: "Transparência", text: "A Freelandoo não promete contratação garantida. Ela entrega exposição, organização e conexão." },
]

const platform = [
  "perfis profissionais",
  "portfólios",
  "serviços",
  "enxames",
  "clans",
  "cupons e afiliados",
  "métricas de engajamento",
  "contato direto",
]

function useReveal() {
  useScrollReveal()
}

export function SobreNosContent() {
  const t = useTranslations("AboutUs")
  useReveal()

  return (
    <main className="flex-1 bg-[#0b0804]">
      {/* HERO */}
      <section className="relative overflow-hidden py-24 md:py-36">
        <div className="pointer-events-none absolute left-1/2 top-0 -translate-x-1/2 h-[500px] w-[900px] rounded-full bg-[#F2B705]/5 blur-[130px]" />
        <div className="container mx-auto px-4 relative max-w-3xl">
          <div className="inline-flex items-center rounded-full border border-[#F2B705]/20 bg-[#F2B705]/5 px-4 py-1.5 text-sm text-[#F2B705] mb-6" data-reveal>
            {t("hero.badge", "Sobre a Freelandoo")}
          </div>
          <h1 className="fl-display text-5xl md:text-6xl lg:text-7xl text-[#F5F1E8] leading-tight mb-6" data-reveal>
            {t("hero.title", "Uma plataforma para quem faz acontecer")}
          </h1>
          <p className="text-xl text-[#9A938A] mb-4" data-reveal>
            {t("hero.subtitle", "A Freelandoo nasceu para facilitar a conexão entre profissionais, prestadores, criadores, empresas e pessoas que precisam resolver algo.")}
          </p>
          <p className="text-[#9A938A] leading-relaxed" data-reveal>
            {t("hero.description", "Em um mundo onde está cada vez mais fácil criar sites, apps e perfis, o desafio real é gerar conexão útil. A Freelandoo existe para organizar profissionais por intenção, dar visibilidade a quem trabalha e facilitar o encontro entre demanda e solução.")}
          </p>
        </div>
      </section>

      {/* NOSSA VISÃO */}
      <section className="py-16 md:py-24 bg-[#1D1810]/20">
        <div className="container mx-auto px-4 max-w-3xl">
          <h2 className="fl-display text-4xl md:text-5xl text-[#F5F1E8] mb-6" data-reveal>
            {t("vision.title", "Menos ruído. Mais conexão.")}
          </h2>
          <div className="text-[#9A938A] leading-relaxed space-y-4" data-reveal>
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
          <h2 className="fl-display text-4xl md:text-5xl text-[#F5F1E8] mb-12" data-reveal>
            {t("values.title", "O que defendemos")}
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6" data-stagger>
            {values.map((v, i) => (
              <div key={v.title} className="bg-[#1D1810] border border-[#2A2218] rounded-xl p-6 hover:border-[#F2B705]/30 hover:shadow-[0_0_30px_rgba(242,196,9,0.06)] transition-all" data-card>
                <div className="w-8 h-8 bg-[#F2B705]/10 rounded-lg flex items-center justify-center mb-4">
                  <span className="text-[#F2B705] text-sm">◆</span>
                </div>
                <h3 className="font-semibold text-[#F5F1E8] mb-2">{t(`values.${i}.title`, v.title)}</h3>
                <p className="text-sm text-[#9A938A] leading-relaxed">{t(`values.${i}.text`, v.text)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* COMO FUNCIONAMOS */}
      <section className="py-16 md:py-24 bg-[#1D1810]/20">
        <div className="container mx-auto px-4 max-w-3xl">
          <h2 className="fl-display text-4xl md:text-5xl text-[#F5F1E8] mb-4" data-reveal>
            {t("platform.title", "Uma vitrine com lógica de enxames")}
          </h2>
          <p className="text-[#9A938A] mb-10 leading-relaxed" data-reveal>
            {t("platform.description", "Os enxames organizam profissionais por tipo de necessidade. Isso permite que clientes encontrem perfis de maneira mais intuitiva e que profissionais se posicionem com mais clareza.")}
          </p>
          <div className="mb-4 text-sm font-medium text-[#F5F1E8]" data-reveal>{t("platform.label", "A Freelandoo reúne:")}</div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3" data-stagger>
            {platform.map((item, i) => (
              <div key={item} className="bg-[#1D1810] border border-[#2A2218] rounded-lg px-4 py-3 text-sm text-[#F5F1E8] hover:border-[#F2B705]/20 transition-colors" data-card>
                {t(`platform.items.${i}`, item)}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="py-20 md:py-28 relative overflow-hidden">
        <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-[350px] w-[700px] rounded-full bg-[#F2B705]/5 blur-[100px]" />
        <div className="container mx-auto px-4 text-center relative">
          <h2 className="fl-display text-4xl md:text-5xl text-[#F5F1E8] mb-4" data-reveal>
            {t("final.title", "Estamos construindo uma nova forma de encontrar profissionais")}
          </h2>
          <p className="text-[#9A938A] mb-10 max-w-lg mx-auto leading-relaxed" data-reveal>
            {t("final.description", "Uma plataforma simples, direta e feita para quem quer aparecer e para quem precisa resolver.")}
          </p>
          <div className="flex flex-wrap gap-4 justify-center" data-reveal>
            <Link href="/search" className="inline-flex items-center bg-[#F2B705] text-black font-semibold px-8 py-4 rounded-lg hover:bg-[#F2B705]/90 hover:shadow-[0_0_20px_rgba(242,196,9,0.35)] transition-all text-lg">
              {t("final.primaryCta", "Encontrar profissionais")}
            </Link>
            <Link href="/anunciar-servicos" className="inline-flex items-center border border-[#2A2218] text-[#F5F1E8] font-medium px-8 py-4 rounded-lg hover:border-[#F2B705]/40 transition-all text-lg">
              {t("final.secondaryCta", "Anunciar serviços")}
            </Link>
          </div>
        </div>
      </section>
    </main>
  )
}
