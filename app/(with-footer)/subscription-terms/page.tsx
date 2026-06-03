import type { Metadata } from "next"
import { LegalDocument } from "../_components/legal-document"

export const metadata: Metadata = {
  title: "Termo de Ativação — Freelandoo",
  description: "Termos e condições da ativação do perfil profissional na plataforma Freelandoo.",
}

const sections = [
  {
    title: "1. Objeto",
    paragraphs: [
      "Este termo regula a ativação paga do perfil profissional na plataforma Freelandoo, que habilita o usuário a ser exibido publicamente e a utilizar as funcionalidades profissionais.",
    ],
  },
  {
    title: "2. Valor e forma de pagamento",
    items: [
      "A ativação custa R$ 300,00 (trezentos reais), em pagamento único.",
      "A ativação é vitalícia para o subperfil profissional ativado e não possui renovação nem cobrança recorrente.",
      "Cada subperfil profissional exige a sua própria ativação.",
      "O pagamento é processado exclusivamente pela Stripe.",
    ],
  },
  {
    title: "3. O que a ativação inclui",
    paragraphs: ["A ativação do perfil concede acesso a:"],
    items: [
      "Exibição do perfil profissional na vitrine e nos Enxames.",
      "Publicação de portfólio, posts, vídeos e stories profissionais.",
      "Recebimento de mensagens e contato de clientes.",
      "Participação no ranking, no programa de afiliados e nas demais funcionalidades profissionais.",
      "Recursos adicionais podem exigir pagamentos próprios, como Premium, Manifestação, cursos e itens da Loja.",
    ],
  },
  {
    title: "4. Direito de arrependimento e reembolso",
    items: [
      "Nos termos do art. 49 do Código de Defesa do Consumidor, o usuário pode solicitar o cancelamento e o reembolso integral em até 7 (sete) dias corridos a partir do pagamento.",
      "O pedido de arrependimento deve ser enviado para freelandoogroup@gmail.com ou pelo WhatsApp (11) 96275-7599.",
      "O reembolso desativa o perfil imediatamente e é processado pelo mesmo meio de pagamento.",
      "Após o prazo de 7 dias, por se tratar de pagamento único de acesso já disponibilizado, não há reembolso, salvo nas hipóteses previstas em lei.",
    ],
  },
  {
    title: "5. Processamento de pagamento",
    items: [
      "Todos os pagamentos são processados pela Stripe.",
      "Os dados de cartão são gerenciados exclusivamente pela Stripe; a Freelandoo não armazena dados completos de cartão.",
      "A ativação do perfil é confirmada automaticamente após a aprovação do pagamento.",
    ],
  },
  {
    title: "6. Cupons e descontos",
    items: [
      "O usuário pode aplicar cupons de desconto válidos no momento da ativação.",
      "Cupons de desconto incidem exclusivamente sobre o valor da ativação.",
      "As regras do programa de afiliados e de cupons constam no Contrato de Afiliados e Uso de Cupons.",
    ],
  },
  {
    title: "7. Cancelamento administrativo",
    items: [
      "A Freelandoo pode cancelar a ativação em caso de violação dos Termos de Uso, fraude ou conduta indevida.",
      "O cancelamento por violação não gera direito a reembolso, salvo disposição legal.",
      "Perfis cancelados ficam inacessíveis até eventual nova ativação.",
    ],
  },
  {
    title: "8. Obrigações do usuário ativado",
    items: [
      "Fornecer informações verdadeiras e mantê-las atualizadas.",
      "Responsabilizar-se pela segurança de login e senha.",
      "Cumprir os Termos de Uso e as Diretrizes da Comunidade.",
    ],
  },
  {
    title: "9. Alterações de preço e condições",
    items: [
      "A Freelandoo pode alterar o valor da ativação e as condições deste termo a qualquer momento.",
      "Alterações de preço não afetam ativações já concluídas.",
      "Mudanças serão comunicadas na plataforma antes de entrarem em vigor.",
    ],
  },
  {
    title: "10. Lei aplicável",
    paragraphs: [
      "Este termo é regido pelas leis da República Federativa do Brasil, observado o Código de Defesa do Consumidor.",
    ],
  },
  {
    title: "11. Contato",
    paragraphs: ["Dúvidas sobre a ativação podem ser enviadas para freelandoogroup@gmail.com ou pelo WhatsApp (11) 96275-7599."],
  },
]

export default function SubscriptionTermsPage() {
  return (
    <LegalDocument
      namespace="SubscriptionTerms"
      title="Termo de Ativação"
      updatedAt="Última atualização: 21 de maio de 2026"
      intro="Este termo estabelece as regras para a aquisição e o uso da ativação do perfil profissional no Freelandoo."
      sections={sections}
      footerPrefix="Ao realizar a ativação e pagar via Stripe, você declara ter lido, compreendido e concordado integralmente com este termo. Veja também nossos"
      links={[
        { href: "/terms", label: "Termos de Uso" },
        { href: "/affiliate-terms", label: "Contrato de Afiliados" },
      ]}
    />
  )
}
