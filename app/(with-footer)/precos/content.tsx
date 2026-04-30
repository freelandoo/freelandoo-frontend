"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"

const planIncludes = [
  "Perfil profissional público",
  "Participação em uma máquina principal",
  "Exibição por profissão e localização",
  "Botão de WhatsApp",
  "Portfólio",
  "Cadastro de serviços",
  "Possibilidade de agenda",
  "Acesso a métricas e recursos disponíveis",
  "Possibilidade de cupom/afiliado conforme regras ativas",
]

const noCommission = [
  "sem taxa por job fechado",
  "sem intermediação obrigatória",
  "contato direto",
  "autonomia para negociar",
]

const faqs = [
  { q: "A Freelandoo cobra comissão?", a: "Não. A Freelandoo não cobra comissão sobre serviços fechados diretamente entre clientes e profissionais." },
  { q: "O valor é mensal ou anual?", a: "O valor é anual. A assinatura do perfil profissional custa R$ 300 por ano." },
  { q: "Posso cancelar?", a: "O usuário pode cancelar a renovação conforme as regras da assinatura e do meio de pagamento utilizado." },
  { q: "O pagamento ativa meu perfil automaticamente?", a: "A ativação depende da confirmação do pagamento. Após aprovação, o perfil pode ficar ativo conforme as regras da plataforma." },
  { q: "Tenho garantia de clientes?", a: "Não. A Freelandoo aumenta sua exposição, mas não garante contratação." },
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

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border border-border rounded-xl overflow-hidden transition-colors hover:border-primary/20">
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

export function PrecosContent() {
  useReveal()

  return (
    <main className="flex-1 bg-background">
      {/* HERO */}
      <section className="relative overflow-hidden py-24 md:py-32">
        <div className="pointer-events-none absolute left-1/2 top-0 -translate-x-1/2 h-[400px] w-[800px] rounded-full bg-primary/5 blur-[120px]" />
        <div className="container mx-auto px-4 relative">
          <div className="inline-flex items-center rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-sm text-primary mb-6" data-reveal>
            Preços
          </div>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground max-w-3xl leading-tight mb-6" data-reveal>
            Preço simples para profissionais que querem aparecer
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mb-10" data-reveal>
            Uma anuidade para manter seu perfil ativo na vitrine da Freelandoo, sem comissão por serviço fechado.
          </p>
          <div className="flex flex-wrap gap-4" data-reveal>
            <Link href="/cadastro" className="inline-flex items-center bg-primary text-black font-semibold px-6 py-3 rounded-lg hover:bg-primary/90 hover:shadow-[0_0_20px_rgba(242,196,9,0.35)] transition-all">
              Assinar e ativar perfil
            </Link>
            <Link href="/anunciar-servicos" className="inline-flex items-center border border-border text-foreground font-medium px-6 py-3 rounded-lg hover:border-primary/40 transition-all">
              Anunciar serviços
            </Link>
          </div>
        </div>
      </section>

      {/* PLANO PRINCIPAL */}
      <section className="py-16 md:py-24 bg-card/20">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-12 text-center" data-reveal>
            Assinatura anual Freelandoo
          </h2>
          <div className="max-w-md mx-auto bg-card border border-primary/20 rounded-2xl p-8 shadow-[0_0_60px_rgba(242,196,9,0.08)]" data-reveal>
            <div className="text-center mb-8">
              <div className="font-semibold text-foreground mb-1">Perfil Profissional Anual</div>
              <div className="text-5xl font-bold text-primary mt-4 mb-1">R$ 300</div>
              <div className="text-sm text-muted-foreground">por ano</div>
              <p className="mt-4 text-sm text-muted-foreground leading-relaxed">
                Mantenha seu perfil ativo na plataforma e apareça na vitrine pública da Freelandoo.
              </p>
            </div>
            <div className="space-y-3 mb-8" data-stagger>
              {planIncludes.map((item) => (
                <div key={item} className="flex items-start gap-3" data-card>
                  <span className="text-primary font-bold mt-0.5">✓</span>
                  <span className="text-sm text-foreground">{item}</span>
                </div>
              ))}
            </div>
            <Link href="/cadastro" className="inline-flex items-center justify-center w-full bg-primary text-black font-semibold px-8 py-3.5 rounded-lg hover:bg-primary/90 hover:shadow-[0_0_20px_rgba(242,196,9,0.35)] transition-all">
              Assinar agora
            </Link>
          </div>
        </div>
      </section>

      {/* SEM COMISSÃO */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4 max-w-3xl">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4" data-reveal>
            Você paga a assinatura. O serviço fechado é seu.
          </h2>
          <p className="text-muted-foreground mb-10 leading-relaxed" data-reveal>
            A Freelandoo não cobra comissão sobre os serviços que você fechar com clientes. A plataforma funciona como uma vitrine de divulgação e conexão. Depois do contato, a negociação acontece diretamente entre você e o cliente.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4" data-stagger>
            {noCommission.map((item) => (
              <div key={item} className="bg-card border border-border rounded-xl px-4 py-5 text-center hover:border-primary/30 transition-colors" data-card>
                <span className="text-sm text-foreground">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* AVISO DE TRANSPARÊNCIA */}
      <section className="py-12 bg-card/20">
        <div className="container mx-auto px-4 max-w-3xl">
          <div className="border border-border rounded-xl p-6 md:p-8" data-reveal>
            <h3 className="font-semibold text-foreground mb-3">Exposição não é promessa de contratação</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              A assinatura aumenta sua exposição dentro da plataforma, mas não garante contratação, quantidade de contatos ou volume de faturamento. Os resultados dependem da demanda, qualidade do perfil, portfólio, localização, categoria, atividade e negociação do próprio profissional.
            </p>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4 max-w-3xl">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-10" data-reveal>
            Perguntas sobre preço
          </h2>
          <div className="space-y-3" data-reveal>
            {faqs.map((faq) => (
              <FaqItem key={faq.q} q={faq.q} a={faq.a} />
            ))}
          </div>
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="py-20 md:py-28 relative overflow-hidden bg-card/20">
        <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-[350px] w-[700px] rounded-full bg-primary/5 blur-[100px]" />
        <div className="container mx-auto px-4 text-center relative">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4" data-reveal>
            Pronto para aparecer?
          </h2>
          <p className="text-muted-foreground mb-10 max-w-lg mx-auto leading-relaxed" data-reveal>
            Ative seu perfil e coloque seus serviços em uma vitrine feita para conexão direta.
          </p>
          <div data-reveal>
            <Link href="/cadastro" className="inline-flex items-center bg-primary text-black font-semibold px-8 py-4 rounded-lg hover:bg-primary/90 hover:shadow-[0_0_20px_rgba(242,196,9,0.35)] transition-all text-lg">
              Assinar e ativar perfil
            </Link>
          </div>
        </div>
      </section>
    </main>
  )
}
