import type { Metadata } from "next"
import Link from "next/link"

export const metadata: Metadata = {
  title: "Termos de Uso — Freelandoo",
  description: "Leia os Termos de Uso da plataforma Freelandoo.",
}

export default function TermsPage() {
  return (
    <main className="flex-1 bg-background">
      <div className="container mx-auto px-4 py-12 max-w-3xl">
        <h1 className="text-3xl font-bold text-foreground mb-2">Termos de Uso</h1>
        <p className="text-sm text-muted-foreground mb-10">Última atualização: 28 de Abril de 2026</p>

        <p className="text-muted-foreground mb-8">
          Ao acessar e utilizar a plataforma Freelandoo, você declara que leu, compreendeu e concorda
          integralmente com os termos abaixo.
        </p>

        <Section title="1. Sobre a plataforma">
          <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
            <li>A Freelandoo atua exclusivamente como plataforma de divulgação e conexão entre freelancers e clientes.</li>
            <li>Não intermedeia negociações, não participa de acordos financeiros e não recebe pagamentos entre usuários.</li>
            <li>Toda relação contratual, valores e entregas são tratadas diretamente entre as partes.</li>
          </ul>
        </Section>

        <Section title="2. Cadastro e responsabilidade do usuário">
          <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
            <li>Cada usuário é responsável pela veracidade e completude das informações em seu perfil.</li>
            <li>É proibido fornecer informações falsas ou enganosas.</li>
            <li>O usuário é responsável pelo cumprimento de acordos e prazos com outros usuários.</li>
            <li>A Freelandoo não se responsabiliza por descumprimento de acordos, atrasos, qualidade de entregas ou prejuízos.</li>
          </ul>
        </Section>

        <Section title="3. Conta e segurança">
          <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
            <li>É obrigatório fornecer e manter dados corretos e atualizados.</li>
            <li>O usuário é responsável por manter senha e credenciais seguras.</li>
            <li>Qualquer uso não autorizado da conta deve ser reportado imediatamente.</li>
          </ul>
        </Section>

        <Section title="4. Pagamentos e assinatura">
          <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
            <li>O acesso à plataforma é concedido mediante pagamento da assinatura anual.</li>
            <li>
              Valores, formas de pagamento e políticas de renovação/cancelamento estão disponíveis na{" "}
              <Link href="/subscription-terms" className="text-primary hover:underline">página de assinatura</Link>.
            </li>
            <li>O usuário é responsável por seus dados de pagamento; a Freelandoo não guarda informações sensíveis de cartão (usamos Stripe).</li>
          </ul>
        </Section>

        <Section title="5. Conteúdo e propriedade intelectual">
          <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
            <li>Todo conteúdo criado e publicado pelos usuários é de responsabilidade do próprio usuário.</li>
            <li>A Freelandoo detém direitos sobre a marca, logo e interface da plataforma.</li>
            <li>Nenhum material da plataforma pode ser copiado, distribuído ou comercializado sem autorização.</li>
          </ul>
        </Section>

        <Section title="6. Privacidade e dados">
          <p className="text-muted-foreground">
            A coleta e uso de dados segue a{" "}
            <Link href="/privacy-policy" className="text-primary hover:underline">Política de Privacidade</Link>.
          </p>
        </Section>

        <Section title="7. Suspensão e exclusão">
          <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
            <li>A Freelandoo reserva o direito de suspender ou excluir contas que violem os termos.</li>
            <li>Motivos incluem: conduta inadequada, fraude, violação de propriedade intelectual, ou descumprimento destes termos.</li>
          </ul>
        </Section>

        <Section title="8. Limitação de responsabilidade">
          <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
            <li>A plataforma é fornecida &ldquo;no estado em que se encontra&rdquo;, sem garantias de qualquer tipo.</li>
            <li>A Freelandoo não será responsável por danos diretos, indiretos, incidentais ou consequentes.</li>
          </ul>
        </Section>

        <Section title="9. Alterações nos termos">
          <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
            <li>A Freelandoo pode atualizar estes termos periodicamente.</li>
            <li>Atualizações são comunicadas no site e entram em vigor imediatamente após publicação.</li>
          </ul>
        </Section>

        <Section title="10. Legislação aplicável">
          <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
            <li>Estes termos seguem as leis da República Federativa do Brasil.</li>
            <li>Qualquer disputa será resolvida no foro de domicílio da empresa.</li>
          </ul>
        </Section>

        <div className="mt-10 pt-8 border-t border-border text-sm text-muted-foreground">
          Ao utilizar o Freelandoo, você concorda integralmente com estes Termos de Uso. Veja também nossa{" "}
          <Link href="/privacy-policy" className="text-primary hover:underline">Política de Privacidade</Link> e{" "}
          <Link href="/subscription-terms" className="text-primary hover:underline">Contrato de Assinatura</Link>.
        </div>
      </div>
    </main>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <h2 className="text-lg font-semibold text-foreground mb-3">{title}</h2>
      {children}
    </section>
  )
}
