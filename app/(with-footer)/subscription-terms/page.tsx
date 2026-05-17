import type { Metadata } from "next"
import Link from "next/link"

export const metadata: Metadata = {
  title: "Termo de Ativação — Freelandoo",
  description: "Termos e condições da ativação do perfil na plataforma Freelandoo.",
}

export default function SubscriptionTermsPage() {
  return (
    <main className="flex-1 bg-background">
      <div className="container mx-auto px-4 py-12 max-w-3xl">
        <h1 className="text-3xl font-bold text-foreground mb-2">Termo de Ativação</h1>
        <p className="text-sm text-muted-foreground mb-10">Última atualização: 28 de Abril de 2026</p>

        <p className="text-muted-foreground mb-8">
          Este termo estabelece as regras para aquisição e uso da ativação do perfil no Freelandoo.
        </p>

        <Section title="1. Objeto">
          <p className="text-muted-foreground mb-2">A ativação concede ao usuário acesso ao Freelandoo, incluindo:</p>
          <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
            <li>Cadastro e exibição do perfil profissional.</li>
            <li>Acesso a máquinas de oportunidades.</li>
            <li>Participação no sistema de cupons e afiliados.</li>
            <li>Recursos e funcionalidades descritos na plataforma.</li>
          </ul>
        </Section>

        <Section title="2. Valor e pagamento">
          <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 mb-4">
            <p className="font-semibold text-foreground text-lg">R$ 300,00 — pagamento único</p>
            <p className="text-sm text-muted-foreground mt-1">Pagamento processado exclusivamente via Stripe.</p>
          </div>
          <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
            <li>O usuário pode utilizar códigos de desconto/cupom, se aplicáveis.</li>
            <li>O pagamento é único e não possui renovação automática.</li>
          </ul>
        </Section>

        <Section title="3. Reembolso">
          <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
            <li>O usuário pode solicitar reembolso integral em até 7 dias corridos após o pagamento.</li>
            <li>O reembolso desativa o perfil imediatamente.</li>
            <li>Após a janela de 7 dias, pedidos de reembolso seguem a legislação aplicável e as regras do meio de pagamento.</li>
          </ul>
        </Section>

        <Section title="4. Condições do serviço">
          <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
            <li>O acesso ao Freelandoo é condicionado ao pagamento da ativação do perfil.</li>
            <li>Perfis reembolsados ou cancelados manualmente ficam inacessíveis até nova ativação.</li>
            <li>A plataforma se reserva o direito de alterar preços, notificando usuários previamente.</li>
          </ul>
        </Section>

        <Section title="5. Obrigações do assinante">
          <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
            <li>Fornecer informações corretas e válidas.</li>
            <li>Responsabilizar-se por login, senha e integridade do perfil.</li>
            <li>Cumprir termos do sistema de cupons e afiliados.</li>
          </ul>
        </Section>

        <Section title="6. Integração Stripe">
          <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
            <li>Todos os pagamentos são processados via Stripe.</li>
            <li>Dados de cartão de crédito são gerenciados exclusivamente pela Stripe.</li>
            <li>A Freelandoo não armazena informações sensíveis de pagamento.</li>
            <li>Webhooks do Stripe são utilizados para confirmação de pagamento e ativação automática da conta.</li>
          </ul>
        </Section>

        <Section title="7. Cancelamento administrativo e reembolso">
          <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
            <li>Reembolsos são processados via Stripe.</li>
            <li>Ativações podem ser canceladas manualmente pela administração em caso de violação dos termos.</li>
          </ul>
        </Section>

        <Section title="8. Alterações no contrato">
          <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
            <li>Mudanças serão notificadas no site e entram em vigor imediatamente após publicação.</li>
            <li>A continuidade no uso da plataforma implica concordância com alterações.</li>
          </ul>
        </Section>

        <Section title="9. Lei aplicável">
          <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
            <li>Este contrato segue as leis da República Federativa do Brasil.</li>
            <li>Disputas serão resolvidas no foro do domicílio da empresa.</li>
          </ul>
        </Section>

        <div className="mt-10 pt-8 border-t border-border text-sm text-muted-foreground">
          Ao realizar a ativação e pagar via Stripe, o usuário declara ter lido, compreendido e concordado
          integralmente com este contrato. Veja também nossos{" "}
          <Link href="/terms" className="text-primary hover:underline">Termos de Uso</Link> e{" "}
          <Link href="/affiliate-terms" className="text-primary hover:underline">Contrato de Afiliados</Link>.
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
