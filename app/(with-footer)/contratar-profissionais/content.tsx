"use client"

import Link from "next/link"
import { useScrollReveal } from "@/lib/scroll-reveal"
import { useTranslations } from "@/components/i18n/I18nProvider"

const steps = [
  { n: "1", title: "Escolha um enxame", text: "Comece pela área que representa sua necessidade: marketing, tecnologia, construção, saúde, beleza, pets, eventos e outros." },
  { n: "2", title: "Use os filtros", text: "Refine por estado, cidade, enxame e profissão para encontrar perfis mais alinhados." },
  { n: "3", title: "Analise o perfil", text: "Veja descrição, portfólio, serviços, avaliações e informações públicas." },
  { n: "4", title: "Chame pelo WhatsApp", text: "Converse diretamente com o profissional e combine valores, prazos e detalhes." },
]

const categories = [
  { title: "Conteúdo e crescimento", text: "Editores, thumbmakers, roteiristas e especialistas em conteúdo." },
  { title: "Divulgação e creators", text: "Influenciadores, creators UGC, microinfluenciadores e afiliados." },
  { title: "Serviços locais", text: "Diaristas, faxineiras, pedreiros, pintores, eletricistas e prestadores." },
  { title: "Negócios", text: "Social media, designer, tráfego pago, atendimento, vendas e suporte." },
  { title: "Saúde, beleza e pets", text: "Massagistas, esteticistas, barbeiros, tosadores, pet sitters e cuidadores." },
]

const doesDo = [
  "busca de profissionais",
  "filtros por localização e profissão",
  "perfis públicos",
  "portfólios",
  "avaliações",
  "contato direto",
  "intermediação de pagamento na Loja e em agendamentos pagos",
]

const doesNotDo = [
  "intermediação nas contratações diretas (combinadas pelo WhatsApp ou fora da plataforma)",
  "garantia de entrega ou de resultado",
  "contratação em nome das partes",
  "definição do preço do serviço",
  "gestão do acordo nas contratações feitas diretamente entre cliente e profissional",
]

const tips = [
  "veja o portfólio do profissional",
  "converse sobre prazo, escopo e valor",
  "peça referências quando necessário",
  "registre os combinados por mensagem",
  "evite pagamentos sem alinhamento prévio",
  "confirme disponibilidade antes de iniciar",
]

function useReveal() {
  useScrollReveal()
}

export function ContratarProfissionaisContent() {
  const t = useTranslations("HireProfessionals")
  useReveal()

  return (
    <main className="flex-1 bg-[#141009]">
      {/* HERO */}
      <section className="relative overflow-hidden py-24 md:py-32">
        <div className="pointer-events-none absolute left-1/2 top-0 -translate-x-1/2 h-[400px] w-[800px] rounded-full bg-[#F2B705]/5 blur-[120px]" />
        <div className="container mx-auto px-4 relative">
          <div className="inline-flex items-center rounded-full border border-[#F2B705]/20 bg-[#F2B705]/5 px-4 py-1.5 text-sm text-[#F2B705] mb-6" data-reveal>
            {t("hero.badge", "Para clientes")}
          </div>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-[#F5F1E8] max-w-3xl leading-tight mb-6" data-reveal>
            {t("hero.title", "Encontre profissionais sem burocracia")}
          </h1>
          <p className="text-xl text-[#9A938A] max-w-2xl mb-4" data-reveal>
            {t("hero.subtitle", "Procure por enxame, profissão, estado e cidade. Veja perfis, analise portfólios e fale direto pelo WhatsApp.")}
          </p>
          <p className="text-[#9A938A] max-w-2xl mb-8 leading-relaxed" data-reveal>
            {t("hero.description", "A Freelandoo ajuda você a encontrar profissionais de forma simples. Você não precisa se cadastrar para procurar. Basta escolher o que precisa, filtrar os resultados e entrar em contato diretamente com o profissional.")}
          </p>
          <div className="flex flex-wrap gap-4" data-reveal>
            <Link href="/search" className="inline-flex items-center bg-[#F2B705] text-black font-semibold px-6 py-3 rounded-lg hover:bg-[#F2B705]/90 hover:shadow-[0_0_20px_rgba(242,196,9,0.35)] transition-all">
              {t("hero.primaryCta", "Encontrar freelancers")}
            </Link>
            <Link href="/search" className="inline-flex items-center border border-[#2A2218] text-[#F5F1E8] font-medium px-6 py-3 rounded-lg hover:border-[#F2B705]/40 transition-all">
              {t("hero.secondaryCta", "Ver enxames")}
            </Link>
          </div>
          <p className="mt-5 text-sm text-[#9A938A]" data-reveal>
            {t("hero.note", "A negociação é direta entre cliente e profissional.")}
          </p>
        </div>
      </section>

      {/* COMO CONTRATAR */}
      <section className="py-16 md:py-24 bg-[#1D1810]/20">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-[#F5F1E8] mb-12" data-reveal>
            {t("steps.title", "Contratar ficou mais simples")}
          </h2>
          <div className="grid md:grid-cols-2 gap-6 max-w-3xl" data-stagger>
            {steps.map((step, i) => (
              <div key={step.n} className="flex gap-4 bg-[#1D1810] border border-[#2A2218] rounded-xl p-6 hover:border-[#F2B705]/20 transition-all" data-card>
                <div className="flex-shrink-0 w-10 h-10 bg-[#F2B705]/10 rounded-full flex items-center justify-center text-[#F2B705] font-bold text-sm border border-[#F2B705]/20">
                  {step.n}
                </div>
                <div>
                  <h3 className="font-semibold text-[#F5F1E8] mb-1">{t(`steps.${i}.title`, step.title)}</h3>
                  <p className="text-sm text-[#9A938A] leading-relaxed">{t(`steps.${i}.text`, step.text)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* O QUE VOCÊ PODE ENCONTRAR */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-[#F5F1E8] mb-12" data-reveal>
            {t("categories.title", "Profissionais para diferentes necessidades")}
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6" data-stagger>
            {categories.map((cat, i) => (
              <div key={cat.title} className="bg-[#1D1810] border border-[#2A2218] rounded-xl p-6 hover:border-[#F2B705]/30 hover:shadow-[0_0_30px_rgba(242,196,9,0.06)] transition-all" data-card>
                <h3 className="font-semibold text-[#F5F1E8] mb-2">{t(`categories.${i}.title`, cat.title)}</h3>
                <p className="text-sm text-[#9A938A] leading-relaxed">{t(`categories.${i}.text`, cat.text)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* O QUE A FREELANDOO FAZ E NÃO FAZ */}
      <section className="py-16 md:py-24 bg-[#1D1810]/20">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-[#F5F1E8] mb-4" data-reveal>
            {t("transparency.title", "Transparência desde o início")}
          </h2>
          <p className="text-[#9A938A] mb-12 max-w-2xl leading-relaxed" data-reveal>
            {t("transparency.description", "Em contratações feitas diretamente entre as partes (combinadas pelo WhatsApp ou fora da plataforma), a Freelandoo não intermedia a negociação, não define valores, não garante entregas nem recebe os pagamentos. Em transações realizadas dentro da plataforma — compras na Loja, agendamentos pagos e cursos —, a Freelandoo processa o pagamento e aplica o período de garantia previsto nos Termos do Marketplace.")}
          </p>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-[#1D1810] border border-[#2A2218] rounded-xl p-6" data-reveal>
              <div className="flex items-center gap-2 mb-5">
                <span className="w-6 h-6 rounded-full bg-[#F2B705]/10 flex items-center justify-center text-[#F2B705] text-xs font-bold">✓</span>
                <h3 className="font-semibold text-[#F5F1E8]">{t("doesDo.title", "A Freelandoo ajuda com")}</h3>
              </div>
              <ul className="space-y-2">
                {doesDo.map((item, i) => (
                  <li key={item} className="flex items-center gap-2 text-sm text-[#9A938A]">
                    <span className="text-[#F2B705] text-xs">●</span>{t(`doesDo.${i}`, item)}
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-[#1D1810] border border-[#2A2218] rounded-xl p-6" data-reveal>
              <div className="flex items-center gap-2 mb-5">
                <span className="w-6 h-6 rounded-full bg-destructive/10 flex items-center justify-center text-destructive text-xs font-bold">✗</span>
                <h3 className="font-semibold text-[#F5F1E8]">{t("doesNotDo.title", "A Freelandoo não faz")}</h3>
              </div>
              <ul className="space-y-2">
                {doesNotDo.map((item, i) => (
                  <li key={item} className="flex items-center gap-2 text-sm text-[#9A938A]">
                    <span className="text-[#9A938A]/40 text-xs">●</span>{t(`doesNotDo.${i}`, item)}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* DICAS */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4 max-w-3xl">
          <h2 className="text-3xl md:text-4xl font-bold text-[#F5F1E8] mb-4" data-reveal>
            {t("tips.title", "Antes de fechar, combine tudo com clareza")}
          </h2>
          <div className="mt-8 space-y-3" data-stagger>
            {tips.map((tip, i) => (
              <div key={tip} className="flex items-start gap-4 bg-[#1D1810] border border-[#2A2218] rounded-lg px-5 py-3.5 hover:border-[#F2B705]/20 transition-colors" data-card>
                <span className="text-[#F2B705]/50 text-xs mt-0.5 font-mono">{String(i + 1).padStart(2, "0")}</span>
                <span className="text-sm text-[#F5F1E8]">{t(`tips.${i}`, tip)}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="py-20 md:py-28 relative overflow-hidden bg-[#1D1810]/20">
        <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-[350px] w-[700px] rounded-full bg-[#F2B705]/5 blur-[100px]" />
        <div className="container mx-auto px-4 text-center relative">
          <h2 className="text-3xl md:text-4xl font-bold text-[#F5F1E8] mb-4" data-reveal>
            {t("final.title", "Encontre quem resolve")}
          </h2>
          <p className="text-[#9A938A] mb-10 max-w-lg mx-auto leading-relaxed" data-reveal>
            {t("final.description", "Use a vitrine da Freelandoo para encontrar profissionais e iniciar uma conversa direta.")}
          </p>
          <div data-reveal>
            <Link href="/search" className="inline-flex items-center bg-[#F2B705] text-black font-semibold px-8 py-4 rounded-lg hover:bg-[#F2B705]/90 hover:shadow-[0_0_20px_rgba(242,196,9,0.35)] transition-all text-lg">
              {t("final.cta", "Encontrar freelancers")}
            </Link>
          </div>
        </div>
      </section>
    </main>
  )
}
