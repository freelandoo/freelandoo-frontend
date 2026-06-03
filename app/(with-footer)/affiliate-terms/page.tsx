import type { Metadata } from "next"
import { LegalDocument } from "../_components/legal-document"

export const metadata: Metadata = {
  title: "Contrato de Afiliados — Freelandoo",
  description: "Regras do programa de afiliados e uso de cupons da plataforma Freelandoo.",
}

const sections = [
  {
    title: "1. Objeto",
    items: [
      "O programa de afiliados permite que usuários ativos divulguem a Freelandoo e recebam comissão sobre transações originadas por suas indicações.",
      "Cada usuário ativado recebe automaticamente um código de cupom vinculado à sua conta.",
    ],
  },
  {
    title: "2. Adesão",
    items: [
      "Para participar, o usuário deve ter um perfil ativado.",
      "A inscrição no programa é automática após a ativação do perfil.",
      "Cada cupom é vinculado de forma rastreável ao usuário que o gerou.",
    ],
  },
  {
    title: "3. Cupom de desconto",
    items: [
      "O cupom de afiliado concede desconto exclusivamente sobre a ativação de perfil de novos usuários.",
      "O cupom não concede desconto em compras da Loja, pacotes de Poléns, cursos ou outros produtos.",
      "O percentual de desconto é definido pela Freelandoo e pode ser alterado a qualquer momento.",
    ],
  },
  {
    title: "4. Comissões",
    paragraphs: ["A comissão do afiliado é apurada da seguinte forma:"],
    items: [
      "Ativação de perfil: o afiliado recebe comissão sobre o valor líquido da ativação realizada com o seu cupom.",
      "Loja, Poléns e cursos: quando a compra é feita a partir de um link de indicação com o cupom embutido, o afiliado recebe comissão, sem que o comprador receba desconto.",
      "Agendamentos não geram comissão de afiliado.",
      "Os percentuais de comissão são definidos pela Freelandoo e podem ser alterados, valendo a regra vigente no momento da transação.",
      "As comissões não são cumulativas com outros benefícios aplicados à mesma transação.",
    ],
  },
  {
    title: "5. Apuração, garantia e pagamento",
    items: [
      "Após a transação, a comissão entra em um período de garantia de 8 (oito) dias, durante o qual permanece com status de aguardando.",
      "O período de garantia acompanha o prazo de arrependimento e devolução previsto no Código de Defesa do Consumidor.",
      "Concluído o período de garantia sem reembolso ou contestação, a comissão é confirmada e paga conforme o cronograma da plataforma.",
      "O afiliado acompanha cupons usados, valores e status de pagamento no painel de afiliados.",
    ],
  },
  {
    title: "6. Reversão de comissões",
    items: [
      "Comissões são revertidas em caso de reembolso, estorno (chargeback) ou cancelamento da transação que as originou.",
      "Comissões revertidas são deduzidas do saldo do afiliado.",
    ],
  },
  {
    title: "7. Vedações e uso indevido",
    items: [
      "É proibido criar múltiplas contas ou usar o próprio cupom para gerar comissão de forma fraudulenta.",
      "É proibida divulgação enganosa, spam ou uso do cupom em contextos não autorizados.",
      "O uso indevido pode resultar em perda das comissões acumuladas e exclusão do programa.",
    ],
  },
  {
    title: "8. Alterações no programa",
    items: [
      "A Freelandoo pode alterar regras, percentuais de desconto e de comissão a qualquer momento.",
      "Alterações valem para transações realizadas após a sua publicação.",
    ],
  },
  {
    title: "9. Encerramento",
    paragraphs: [
      "A Freelandoo pode suspender ou encerrar a participação de um afiliado em caso de violação destes termos. O afiliado também pode deixar o programa a qualquer momento, ressalvado o pagamento de comissões já confirmadas.",
    ],
  },
  {
    title: "10. Lei aplicável",
    paragraphs: ["Este contrato é regido pelas leis da República Federativa do Brasil."],
  },
  {
    title: "11. Contato",
    paragraphs: ["Dúvidas sobre o programa de afiliados podem ser enviadas para freelandoogroup@gmail.com ou pelo WhatsApp (11) 96275-7599."],
  },
]

export default function AffiliateTermsPage() {
  return (
    <LegalDocument
      namespace="AffiliateTerms"
      title="Contrato de Afiliados e Uso de Cupons"
      updatedAt="Última atualização: 21 de maio de 2026"
      intro="Este contrato regula a utilização do sistema de cupons e a participação no programa de afiliados da plataforma Freelandoo."
      sections={sections}
      footerPrefix="Ao gerar ou compartilhar um cupom, você concorda com este contrato. Veja também nossos"
      links={[
        { href: "/terms", label: "Termos de Uso" },
        { href: "/subscription-terms", label: "Termo de Ativação" },
      ]}
    />
  )
}
