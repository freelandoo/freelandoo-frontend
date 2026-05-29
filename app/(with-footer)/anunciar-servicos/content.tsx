"use client"

import Link from "next/link"
import { useScrollReveal } from "@/lib/scroll-reveal"
import { useTranslations } from "@/components/i18n/I18nProvider"

const benefits = [
  { title: "Perfil público", text: "Tenha uma página profissional com sua bio, profissão, localização, enxame principal e botão de contato." },
  { title: "Portfólio", text: "Mostre trabalhos, imagens, vídeos, resultados e exemplos reais do que você faz." },
  { title: "Serviços", text: "Cadastre serviços com descrição, valor, duração e informações importantes para o cliente." },
  { title: "Contato direto", text: "Clientes interessados podem falar com você diretamente pelo WhatsApp." },
]

const steps = [
  { n: "1", title: "Crie sua conta", text: "Cadastre seus dados básicos e acesse sua área de perfil." },
  { n: "2", title: "Monte seu perfil", text: "Escolha seu enxame, profissão, cidade, estado, descrição, foto e informações principais." },
  { n: "3", title: "Ative seu perfil", text: "Com a ativação concluída, seu perfil pode aparecer na vitrine pública da Freelandoo." },
  { n: "4", title: "Publique seu portfólio", text: "Adicione trabalhos e exemplos para aumentar a confiança de quem visita seu perfil." },
  { n: "5", title: "Receba contatos", text: "Clientes podem encontrar seu perfil e chamar você diretamente pelo WhatsApp." },
]

const included = [
  "Perfil profissional público",
  "Exibição na vitrine da Freelandoo",
  "Participação em um enxame principal",
  "Cadastro de profissão e localização",
  "Portfólio com trabalhos",
  "Cadastro de serviços",
  "Botão de WhatsApp",
  "Possibilidade de agenda, quando configurada",
  "Participação em rankings e métricas de engajamento, quando disponíveis",
  "Possibilidade de cupom/afiliado, conforme regras ativas da plataforma",
]

const tags = [
  "Editores de vídeo", "Designers", "Influenciadores", "Diaristas", "Pedreiros",
  "Social medias", "Massagistas", "Tosadores", "Prestadores locais", "Autônomos",
  "Criadores", "Profissionais de serviços gerais",
]

function useReveal() {
  useScrollReveal()
}

export function AnunciarServicosContent() {
  const t = useTranslations("AdvertiseServices")
  useReveal()

  return (
    <main className="flex-1 bg-[#141009]">
      {/* HERO */}
      <section className="relative overflow-hidden py-24 md:py-32">
        <div className="pointer-events-none absolute left-1/2 top-0 -translate-x-1/2 h-[400px] w-[800px] rounded-full bg-[#F2B705]/5 blur-[120px]" />
        <div className="container mx-auto px-4 relative">
          <div className="inline-flex items-center rounded-full border border-[#F2B705]/20 bg-[#F2B705]/5 px-4 py-1.5 text-sm text-[#F2B705] mb-6" data-reveal>
            {t("hero.badge", "Para profissionais")}
          </div>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-[#F5F1E8] max-w-3xl leading-tight mb-6" data-reveal>
            {t("hero.title", "Anuncie seus serviços e seja encontrado por quem precisa de você")}
          </h1>
          <p className="text-xl text-[#9A938A] max-w-2xl mb-4" data-reveal>
            {t("hero.subtitle", "Crie seu perfil profissional, apareça nos enxames da Freelandoo e receba contatos diretos de pessoas interessadas no que você faz.")}
          </p>
          <p className="text-[#9A938A] max-w-2xl mb-8 leading-relaxed" data-reveal>
            {t("hero.description", "A Freelandoo é uma vitrine inteligente para profissionais, freelancers, criadores e prestadores de serviço. Você paga uma ativação única, mantém seu perfil ativo e pode ser encontrado por clientes que procuram exatamente o tipo de solução que você oferece.")}
          </p>
          <div className="flex flex-wrap gap-4" data-reveal>
            <Link href="/cadastro" className="inline-flex items-center bg-[#F2B705] text-black font-semibold px-6 py-3 rounded-lg hover:bg-[#F2B705]/90 hover:shadow-[0_0_20px_rgba(242,196,9,0.35)] transition-all">
              {t("hero.primaryCta", "Criar meu perfil")}
            </Link>
            <Link href="/comofunciona" className="inline-flex items-center border border-[#2A2218] text-[#F5F1E8] font-medium px-6 py-3 rounded-lg hover:border-[#F2B705]/40 transition-all">
              {t("hero.secondaryCta", "Ver como funciona")}
            </Link>
          </div>
          <p className="mt-5 text-sm text-[#9A938A]" data-reveal>
            {t("hero.note", "Sem comissão por serviço fechado. Contato direto pelo WhatsApp.")}
          </p>
        </div>
      </section>

      {/* POR QUE ANUNCIAR */}
      <section className="py-16 md:py-24 bg-[#1D1810]/20">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-[#F5F1E8] mb-4 max-w-2xl" data-reveal>
            {t("benefits.title", "Sua presença profissional em uma vitrine feita para gerar oportunidades")}
          </h2>
          <p className="text-[#9A938A] mb-12 max-w-2xl leading-relaxed" data-reveal>
            {t("benefits.description", "Muitos profissionais dependem apenas de indicação, redes sociais ou grupos de mensagem para conseguir clientes. A Freelandoo organiza sua presença em um perfil público, com informações claras, portfólio, serviços, localização e formas de contato.")}
          </p>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6" data-stagger>
            {benefits.map((card, i) => (
              <div key={card.title} className="bg-[#1D1810] border border-[#2A2218] rounded-xl p-6 hover:border-[#F2B705]/30 hover:shadow-[0_0_30px_rgba(242,196,9,0.06)] transition-all" data-card>
                <div className="w-10 h-10 bg-[#F2B705]/10 rounded-lg flex items-center justify-center mb-4">
                  <span className="text-[#F2B705] text-lg">◆</span>
                </div>
                <h3 className="font-semibold text-[#F5F1E8] mb-2">{t(`benefits.${i}.title`, card.title)}</h3>
                <p className="text-sm text-[#9A938A] leading-relaxed">{t(`benefits.${i}.text`, card.text)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* COMO FUNCIONA PARA O PROFISSIONAL */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-[#F5F1E8] mb-12 max-w-2xl" data-reveal>
            {t("steps.title", "Do cadastro à vitrine em poucos passos")}
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-4xl" data-stagger>
            {steps.map((step, i) => (
              <div key={step.n} className="flex gap-4" data-card>
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

      {/* O QUE ESTÁ INCLUSO */}
      <section className="py-16 md:py-24 bg-[#1D1810]/20">
        <div className="container mx-auto px-4 max-w-4xl">
          <h2 className="text-3xl md:text-4xl font-bold text-[#F5F1E8] mb-12" data-reveal>
            {t("included.title", "O que você recebe ao anunciar")}
          </h2>
          <div className="grid md:grid-cols-2 gap-3" data-stagger>
            {included.map((item, i) => (
              <div key={item} className="flex items-start gap-3 bg-[#1D1810] border border-[#2A2218] rounded-lg px-4 py-3 hover:border-[#F2B705]/20 transition-colors" data-card>
                <span className="text-[#F2B705] mt-0.5 font-bold">✓</span>
                <span className="text-sm text-[#F5F1E8]">{t(`included.${i}`, item)}</span>
              </div>
            ))}
          </div>
          <p className="mt-8 text-sm text-[#9A938A] leading-relaxed" data-reveal>
            {t("included.note", "A Freelandoo organiza sua presença para que clientes entendam melhor quem você é, o que você faz e como falar com você.")}
          </p>
        </div>
      </section>

      {/* ANUIDADE */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4 max-w-xl text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-[#F5F1E8] mb-4" data-reveal>
            {t("activation.title", "Uma ativação única simples")}
          </h2>
          <p className="text-[#9A938A] mb-10 leading-relaxed" data-reveal>
            {t("activation.description", "A ativação da Freelandoo custa R$ 300 em pagamento único. Esse valor mantém seu perfil ativo na plataforma e permite que ele participe da vitrine pública, de acordo com as regras e categorias disponíveis.")}
          </p>
          <div className="bg-[#1D1810] border border-[#F2B705]/20 rounded-2xl p-8 shadow-[0_0_50px_rgba(242,196,9,0.06)] mb-6" data-reveal>
            <div className="text-5xl font-bold text-[#F2B705] mb-1">R$ 300</div>
            <div className="text-[#9A938A] mb-8 text-sm">{t("activation.payment", "pagamento único")}</div>
            <div className="space-y-3 text-left mb-8" data-stagger>
              {["Sem comissão por serviço fechado", "Contato direto entre cliente e profissional", "Perfil ativo após a ativação"].map((item, i) => (
                <div key={item} className="flex items-center gap-3" data-card>
                  <span className="text-[#F2B705] font-bold">✓</span>
                  <span className="text-sm text-[#F5F1E8]">{t(`activation.items.${i}`, item)}</span>
                </div>
              ))}
            </div>
            <Link href="/cadastro" className="inline-flex items-center justify-center w-full bg-[#F2B705] text-black font-semibold px-8 py-3.5 rounded-lg hover:bg-[#F2B705]/90 hover:shadow-[0_0_20px_rgba(242,196,9,0.35)] transition-all">
              {t("activation.cta", "Assinar e ativar perfil")}
            </Link>
          </div>
          <p className="text-xs text-[#9A938A] border border-[#2A2218] rounded-xl px-4 py-3 leading-relaxed" data-reveal>
            {t("activation.notice", "A ativação aumenta sua exposição dentro da plataforma, mas não garante contratação. A negociação, valores, prazos e entregas são tratados diretamente entre cliente e profissional.")}
          </p>
        </div>
      </section>

      {/* PARA QUEM É */}
      <section className="py-16 md:py-24 bg-[#1D1810]/20">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-[#F5F1E8] mb-4" data-reveal>
            {t("audience.title", "Feito para quem trabalha, cria, atende e resolve")}
          </h2>
          <p className="text-[#9A938A] mb-10" data-reveal>
            {t("audience.description", "A Freelandoo é para profissionais que querem ser encontrados de forma mais organizada.")}
          </p>
          <div className="flex flex-wrap gap-3" data-stagger>
            {tags.map((tag, i) => (
              <span key={tag} className="bg-[#1D1810] border border-[#2A2218] rounded-full px-4 py-2 text-sm text-[#F5F1E8] hover:border-[#F2B705]/40 hover:text-[#F2B705] transition-all cursor-default" data-card>
                {t(`audience.tags.${i}`, tag)}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="py-20 md:py-28 relative overflow-hidden">
        <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-[350px] w-[700px] rounded-full bg-[#F2B705]/5 blur-[100px]" />
        <div className="container mx-auto px-4 text-center relative">
          <h2 className="text-3xl md:text-4xl font-bold text-[#F5F1E8] mb-4" data-reveal>
            {t("final.title", "Seu trabalho precisa ser visto")}
          </h2>
          <p className="text-[#9A938A] mb-10 max-w-lg mx-auto leading-relaxed" data-reveal>
            {t("final.description", "Crie seu perfil, faça a ativação e comece a construir sua presença na Freelandoo.")}
          </p>
          <div className="flex flex-wrap gap-4 justify-center" data-reveal>
            <Link href="/cadastro" className="inline-flex items-center bg-[#F2B705] text-black font-semibold px-8 py-4 rounded-lg hover:bg-[#F2B705]/90 hover:shadow-[0_0_20px_rgba(242,196,9,0.35)] transition-all text-lg">
              {t("final.primaryCta", "Criar meu perfil")}
            </Link>
            <Link href="/precos" className="inline-flex items-center border border-[#2A2218] text-[#F5F1E8] font-medium px-8 py-4 rounded-lg hover:border-[#F2B705]/40 transition-all text-lg">
              {t("final.secondaryCta", "Ver preços")}
            </Link>
          </div>
        </div>
      </section>
    </main>
  )
}
