import type { Metadata } from "next"
import { GraduationCap, LayoutList, Rocket, Wallet } from "lucide-react"
import { SiteFooter } from "@/components/layout"
import {
  PageShell,
  PageHero,
  TabloidHeader,
  Section,
  SectionHeading,
  GoldButton,
  OutlineButton,
  TornPaperCard,
  Badge,
} from "@/components/tabloide"
import { ROUTES } from "@/lib/routes"

const BASE_URL = "https://www.freelandoo.com.br"

export const metadata: Metadata = {
  title: "Cursos — crie e venda cursos dentro da Freelandoo",
  description:
    "Transforme seu conhecimento em renda: monte cursos com módulos e aulas e venda dentro da Freelandoo. As regras comerciais e os pagamentos seguem os termos da plataforma.",
  alternates: { canonical: `${BASE_URL}${ROUTES.courses}` },
  openGraph: {
    type: "website",
    title: "Cursos na Freelandoo",
    description: "Crie e venda cursos dentro da Freelandoo. Você ensina, a plataforma cuida da venda.",
    url: `${BASE_URL}${ROUTES.courses}`,
  },
}

const steps = [
  {
    icon: <GraduationCap className="h-5 w-5" />,
    title: "Crie seu curso",
    text: "Dê um título, uma capa e uma descrição clara do que o aluno vai aprender. Comece pelo resultado que você entrega.",
  },
  {
    icon: <LayoutList className="h-5 w-5" />,
    title: "Estruture em módulos e aulas",
    text: "Divida o conteúdo em etapas lógicas. Cada módulo é um passo; cada aula, um pedaço fácil de assistir e concluir.",
  },
  {
    icon: <Rocket className="h-5 w-5" />,
    title: "Publique",
    text: "Defina o preço e publique. Seu curso passa a ficar disponível para os alunos dentro da plataforma.",
  },
  {
    icon: <Wallet className="h-5 w-5" />,
    title: "Venda e acompanhe",
    text: "A plataforma processa a compra e libera o acesso ao aluno. Você acompanha matrículas e receita pela sua área.",
  },
]

export default function CursosPage() {
  return (
    <PageShell header={<TabloidHeader />} footer={<SiteFooter />}>
      <PageHero
        kicker="Cursos"
        title="Crie e venda cursos"
        highlight="dentro da Freelandoo"
        subtitle="Você sabe algo que outras pessoas querem aprender. Monte um curso com módulos e aulas, defina o preço e venda para a sua audiência — sem montar uma estrutura própria de pagamento. Você ensina; a plataforma cuida da venda e do acesso."
        actions={
          <>
            <GoldButton href={ROUTES.signup} className="px-6 py-3 text-sm">
              Criar conta grátis
            </GoldButton>
            <OutlineButton href={ROUTES.account} className="px-6 py-3 text-sm">
              Acessar meus cursos
            </OutlineButton>
          </>
        }
      />

      {/* O QUE É */}
      <Section className="py-10">
        <div className="max-w-3xl">
          <SectionHeading>Cursos são uma funcionalidade da plataforma</SectionHeading>
          <p className="mt-4 text-base leading-relaxed text-[#C9C2B6]">
            Os Cursos são parte da Freelandoo, ao lado do seu perfil profissional, do portfólio, da Loja e da agenda.
            É uma forma de transformar o que você domina em uma fonte de renda que escala: você cria uma vez e vende
            para várias pessoas, sem trabalho extra a cada nova matrícula.
          </p>
        </div>
      </Section>

      {/* COMO FUNCIONA */}
      <Section className="py-8">
        <SectionHeading>Como funciona</SectionHeading>
        <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2">
          {steps.map((s, i) => (
            <TornPaperCard key={s.title} variant={i % 2 === 0 ? "1" : "2"} className="p-6">
              <div className="mb-3 flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#F2B705]/15 text-[#F2B705]">
                  {s.icon}
                </span>
                <span className="fl-display text-xl text-[#1D1810]">{String(i + 1).padStart(2, "0")}</span>
              </div>
              <h3 className="text-lg font-black text-[#1D1810]">{s.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-[#3a3326]">{s.text}</p>
            </TornPaperCard>
          ))}
        </div>
      </Section>

      {/* REGRAS COMERCIAIS */}
      <Section className="py-8">
        <div className="max-w-3xl rounded-2xl border-2 border-[#F5F1E8]/12 bg-[#1D1810] p-7">
          <Badge>Regras comerciais e pagamentos</Badge>
          <h3 className="fl-display mt-3 text-2xl text-[#F5F1E8]">Transparente, dentro das regras da plataforma</h3>
          <p className="mt-3 text-sm leading-relaxed text-[#C9C2B6]">
            As compras de cursos são processadas dentro da Freelandoo. O preço que você define é o valor que você
            recebe como criador; o comprador paga esse valor acrescido das taxas da plataforma, sempre informadas antes
            da conclusão da compra. As condições comerciais, de pagamento, de repasse e de eventual reembolso seguem os
            termos próprios da plataforma.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <OutlineButton href={ROUTES.marketplaceTerms} className="px-5 py-2.5 text-sm">
              Termos do Marketplace
            </OutlineButton>
            <OutlineButton href={ROUTES.subscriptionTerms} className="px-5 py-2.5 text-sm">
              Termo de Ativação
            </OutlineButton>
          </div>
          <p className="mt-4 text-xs leading-relaxed text-[#9A938A]">
            A Freelandoo não garante volume de vendas nem resultado. A qualidade e a entrega do conteúdo são de
            responsabilidade de quem cria o curso.
          </p>
        </div>
      </Section>

      {/* CTA FINAL */}
      <Section className="py-12">
        <div className="flex flex-col items-start gap-4 border-t-2 border-[#F1EDE2]/12 pt-10 sm:flex-row sm:items-center sm:justify-between">
          <div className="max-w-xl">
            <h3 className="fl-display text-3xl text-[#F5F1E8]">Pronto para ensinar?</h3>
            <p className="mt-2 text-sm leading-relaxed text-[#C9C2B6]">
              Crie sua conta e comece a montar seu primeiro curso hoje. Se já tem conta, é só acessar sua área.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <GoldButton href={ROUTES.signup} className="px-6 py-3 text-sm">
              Criar conta grátis
            </GoldButton>
            <OutlineButton href={ROUTES.account} className="px-6 py-3 text-sm">
              Acessar minha área
            </OutlineButton>
          </div>
        </div>
      </Section>
    </PageShell>
  )
}
