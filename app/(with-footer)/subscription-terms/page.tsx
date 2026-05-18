import type { Metadata } from "next"
import { LegalDocument } from "../_components/legal-document"

export const metadata: Metadata = {
  title: "Termo de Ativação — Freelandoo",
  description: "Termos e condições da ativação do perfil na plataforma Freelandoo.",
}

const sections = [
  {
    title: "1. Objeto",
    paragraphs: ["A ativação concede ao usuário acesso ao Freelandoo, incluindo:"],
    items: [
      "Cadastro e exibição do perfil profissional.",
      "Acesso a máquinas de oportunidades.",
      "Participação no sistema de cupons e afiliados.",
      "Recursos e funcionalidades descritos na plataforma.",
    ],
  },
  {
    title: "2. Valor e pagamento",
    paragraphs: ["R$ 300,00 — pagamento único. Pagamento processado exclusivamente via Stripe."],
    items: [
      "O usuário pode utilizar códigos de desconto/cupom, se aplicáveis.",
      "O pagamento é único e não possui renovação automática.",
    ],
  },
  {
    title: "3. Reembolso",
    items: [
      "O usuário pode solicitar reembolso integral em até 7 dias corridos após o pagamento.",
      "O reembolso desativa o perfil imediatamente.",
      "Após a janela de 7 dias, pedidos de reembolso seguem a legislação aplicável e as regras do meio de pagamento.",
    ],
  },
  {
    title: "4. Condições do serviço",
    items: [
      "O acesso ao Freelandoo é condicionado ao pagamento da ativação do perfil.",
      "Perfis reembolsados ou cancelados manualmente ficam inacessíveis até nova ativação.",
      "A plataforma se reserva o direito de alterar preços, notificando usuários previamente.",
    ],
  },
  {
    title: "5. Obrigações do assinante",
    items: [
      "Fornecer informações corretas e válidas.",
      "Responsabilizar-se por login, senha e integridade do perfil.",
      "Cumprir termos do sistema de cupons e afiliados.",
    ],
  },
  {
    title: "6. Integração Stripe",
    items: [
      "Todos os pagamentos são processados via Stripe.",
      "Dados de cartão de crédito são gerenciados exclusivamente pela Stripe.",
      "A Freelandoo não armazena informações sensíveis de pagamento.",
      "Webhooks do Stripe são utilizados para confirmação de pagamento e ativação automática da conta.",
    ],
  },
  {
    title: "7. Cancelamento administrativo e reembolso",
    items: [
      "Reembolsos são processados via Stripe.",
      "Ativações podem ser canceladas manualmente pela administração em caso de violação dos termos.",
    ],
  },
  {
    title: "8. Alterações no contrato",
    items: [
      "Mudanças serão notificadas no site e entram em vigor imediatamente após publicação.",
      "A continuidade no uso da plataforma implica concordância com alterações.",
    ],
  },
  {
    title: "9. Lei aplicável",
    items: [
      "Este contrato segue as leis da República Federativa do Brasil.",
      "Disputas serão resolvidas no foro do domicílio da empresa.",
    ],
  },
]

export default function SubscriptionTermsPage() {
  return (
    <LegalDocument
      namespace="SubscriptionTerms"
      title="Termo de Ativação"
      updatedAt="Última atualização: 28 de Abril de 2026"
      intro="Este termo estabelece as regras para aquisição e uso da ativação do perfil no Freelandoo."
      sections={sections}
      footerPrefix="Ao realizar a ativação e pagar via Stripe, o usuário declara ter lido, compreendido e concordado integralmente com este contrato. Veja também nossos"
      links={[
        { href: "/terms", label: "Termos de Uso" },
        { href: "/affiliate-terms", label: "Contrato de Afiliados" },
      ]}
    />
  )
}
