"use client"

import Link from "next/link"
import { useScrollReveal } from "@/lib/scroll-reveal"
import { useTranslations } from "@/components/i18n/I18nProvider"

const clientTips = [
  { title: "Analise o perfil", text: "Leia a descrição, veja a profissão, localização, serviços e portfólio." },
  { title: "Confira o portfólio", text: "Trabalhos publicados ajudam a entender estilo, experiência e qualidade." },
  { title: "Converse antes de fechar", text: "Alinhe prazo, valor, escopo, forma de entrega e disponibilidade." },
  { title: "Registre combinados", text: "Mantenha acordos importantes por mensagem para evitar dúvidas." },
  { title: "Cuidado com pagamentos antecipados", text: "Evite enviar valores sem confirmar identidade, escopo e condições." },
  { title: "Desconfie de promessas exageradas", text: "Resultados muito garantidos ou ofertas fora da realidade merecem atenção." },
]

const proTips = [
  { title: "Confirme quem está falando com você", text: "Antes de aceitar uma demanda, entenda quem é o cliente e o que ele precisa." },
  { title: "Defina escopo", text: "Combine exatamente o que será entregue, prazo, revisões e forma de pagamento." },
  { title: "Não compartilhe senhas", text: "Nunca envie senhas, códigos ou acessos sensíveis sem necessidade e proteção." },
  { title: "Cuidado com golpes", text: "Fique atento a links suspeitos, comprovantes falsos e pedidos fora do combinado." },
  { title: "Proteja seu trabalho", text: "Evite enviar arquivos finais sem combinar pagamento, aprovação ou etapas." },
  { title: "Mantenha seu perfil verdadeiro", text: "Informações falsas podem prejudicar sua reputação e levar à remoção da plataforma." },
]

const freelandooDoes = [
  "ajudamos na descoberta",
  "organizamos perfis e filtros",
  "facilitamos contato direto",
  "incentivamos transparência",
  "fornecemos informações de segurança",
]

function useReveal() {
  useScrollReveal()
}

export function DicasDeSegurancaContent() {
  const t = useTranslations("SafetyTips")
  useReveal()

  return (
    <main className="flex-1 bg-background">
      {/* HERO */}
      <section className="relative overflow-hidden py-20 md:py-28">
        <div className="pointer-events-none absolute left-1/2 top-0 -translate-x-1/2 h-[350px] w-[700px] rounded-full bg-primary/5 blur-[100px]" />
        <div className="container mx-auto px-4 relative max-w-3xl">
          <div className="inline-flex items-center rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-sm text-primary mb-6" data-reveal>
            {t("hero.badge", "Segurança")}
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-foreground leading-tight mb-6" data-reveal>
            {t("hero.title", "Dicas de segurança")}
          </h1>
          <p className="text-xl text-muted-foreground mb-4" data-reveal>
            {t("hero.subtitle", "A Freelandoo conecta pessoas. A segurança começa com informação, clareza e cuidado nas negociações.")}
          </p>
          <p className="text-muted-foreground leading-relaxed" data-reveal>
            {t("hero.description", "A plataforma ajuda clientes e profissionais a se encontrarem. Em contratações diretas, os combinados, pagamentos e entregas são tratados entre as partes; em transações feitas dentro da plataforma — Loja, agendamentos pagos e cursos — valem as regras dos Termos do Marketplace.")}
          </p>
        </div>
      </section>

      {/* PARA CLIENTES */}
      <section className="py-16 md:py-20 bg-card/20">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-10" data-reveal>
            {t("client.title", "Se você vai contratar um profissional")}
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5" data-stagger>
            {clientTips.map((tip, i) => (
              <div key={tip.title} className="bg-card border border-border rounded-xl p-6 hover:border-primary/20 transition-all" data-card>
                <div className="text-primary/40 text-xs font-mono mb-3">{String(i + 1).padStart(2, "0")}</div>
                <h3 className="font-semibold text-foreground mb-2">{t(`client.tips.${i}.title`, tip.title)}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{t(`client.tips.${i}.text`, tip.text)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PARA PROFISSIONAIS */}
      <section className="py-16 md:py-20">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-10" data-reveal>
            {t("pro.title", "Se você anuncia seus serviços")}
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5" data-stagger>
            {proTips.map((tip, i) => (
              <div key={tip.title} className="bg-card border border-border rounded-xl p-6 hover:border-primary/20 transition-all" data-card>
                <div className="text-primary/40 text-xs font-mono mb-3">{String(i + 1).padStart(2, "0")}</div>
                <h3 className="font-semibold text-foreground mb-2">{t(`pro.tips.${i}.title`, tip.title)}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{t(`pro.tips.${i}.text`, tip.text)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* O PAPEL DA FREELANDOO */}
      <section className="py-16 md:py-20 bg-card/20">
        <div className="container mx-auto px-4 max-w-3xl">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4" data-reveal>
            {t("role.title", "O que a Freelandoo faz")}
          </h2>
          <p className="text-muted-foreground mb-10 leading-relaxed" data-reveal>
            {t("role.description", "A Freelandoo atua como plataforma de divulgação, conexão e, em algumas funcionalidades, intermediação. Em contratações diretas, não participa da negociação, do pagamento nem da entrega. Em transações realizadas dentro da plataforma — Loja, agendamentos pagos e cursos —, processa o pagamento e aplica o período de garantia previsto nos Termos do Marketplace.")}
          </p>
          <div className="flex flex-wrap gap-3" data-stagger>
            {freelandooDoes.map((item, i) => (
              <div key={item} className="flex items-center gap-2 bg-card border border-border rounded-full px-4 py-2" data-card>
                <span className="text-primary font-bold text-xs">✓</span>
                <span className="text-sm text-foreground">{t(`role.items.${i}`, item)}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="py-20 md:py-28 relative overflow-hidden">
        <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-[300px] w-[600px] rounded-full bg-primary/5 blur-[100px]" />
        <div className="container mx-auto px-4 text-center relative">
          <h2 className="text-3xl font-bold text-foreground mb-4" data-reveal>
            {t("final.title", "Contrate e anuncie com mais clareza")}
          </h2>
          <p className="text-muted-foreground mb-10 max-w-md mx-auto leading-relaxed" data-reveal>
            {t("final.description", "Use as informações disponíveis, converse com cuidado e combine tudo antes de avançar.")}
          </p>
          <div data-reveal>
            <Link href="/search" className="inline-flex items-center bg-primary text-black font-semibold px-8 py-4 rounded-lg hover:bg-primary/90 hover:shadow-[0_0_20px_rgba(242,196,9,0.35)] transition-all text-lg">
              {t("final.cta", "Encontrar profissionais")}
            </Link>
          </div>
        </div>
      </section>
    </main>
  )
}
