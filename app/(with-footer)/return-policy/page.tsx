import type { Metadata } from "next"
import { LegalDocument } from "../_components/legal-document"

export const metadata: Metadata = {
  title: "Política de Trocas, Devoluções e Frete — Freelandoo",
  description: "Como funcionam o arrependimento, a devolução, a troca, o frete e o reembolso na Loja da Freelandoo.",
}

const sections = [
  {
    title: "1. Aplicação desta política",
    items: [
      "Esta política aplica-se às compras de produtos realizadas na Loja da Freelandoo.",
      "Os direitos aqui descritos observam o Código de Defesa do Consumidor (Lei nº 8.078/1990).",
      "Serviços e produtos negociados diretamente entre usuários, fora da plataforma, não são cobertos por esta política.",
    ],
  },
  {
    title: "2. Direito de arrependimento (7 dias)",
    items: [
      "Por se tratar de compra realizada fora de estabelecimento físico, o comprador pode desistir da compra em até 7 (sete) dias corridos a contar do recebimento do produto.",
      "No arrependimento, não é necessário justificar o motivo.",
      "O produto deve ser devolvido nas condições em que foi recebido, preferencialmente com a embalagem e os acessórios.",
      "No arrependimento dentro do prazo, o valor pago, incluindo o frete, é reembolsado integralmente.",
    ],
  },
  {
    title: "3. Produtos com defeito ou em desconformidade",
    items: [
      "Produtos com vício ou defeito podem ser reclamados em até 30 dias para itens não duráveis e 90 dias para itens duráveis.",
      "O comprador pode exigir a substituição, a reexecução, o abatimento proporcional do preço ou a devolução do valor pago.",
      "Produtos que não correspondam ao anunciado são tratados como desconformidade.",
    ],
  },
  {
    title: "4. Como solicitar devolução ou troca",
    items: [
      "A solicitação deve ser feita pelos canais da plataforma ou por freelandoogroup@gmail.com, dentro dos prazos aplicáveis.",
      "O comprador deve informar o número do pedido e descrever o motivo, anexando fotos quando houver defeito.",
      "Após a análise, a plataforma orienta os próximos passos para a devolução.",
    ],
  },
  {
    title: "5. Frete da devolução",
    items: [
      "No arrependimento dentro de 7 dias e nos casos de defeito ou desconformidade, o custo do frete de devolução não é suportado pelo comprador.",
      "A plataforma pode disponibilizar a etiqueta de devolução para a postagem do produto.",
      "O produto deve ser postado no prazo indicado após a aprovação da devolução.",
    ],
  },
  {
    title: "6. Reembolso",
    items: [
      "O reembolso é processado após o recebimento e a conferência do produto devolvido.",
      "O valor é restituído pelo mesmo meio de pagamento utilizado na compra, por meio da Stripe.",
      "O prazo de crédito pode variar conforme o meio de pagamento e a instituição financeira.",
    ],
  },
  {
    title: "7. Trocas",
    paragraphs: [
      "A troca por outro produto depende da disponibilidade e da concordância do vendedor. Quando não for possível, a solicitação é tratada como devolução com reembolso.",
    ],
  },
  {
    title: "8. Situações não elegíveis",
    items: [
      "Produtos danificados por mau uso após o recebimento.",
      "Produtos personalizados ou perecíveis, quando a devolução for incompatível com a natureza do item.",
      "Solicitações feitas fora dos prazos legais.",
      "Compras realizadas fora da Loja da Freelandoo.",
    ],
  },
  {
    title: "9. Prazos e período de garantia",
    paragraphs: [
      "O repasse do valor ao vendedor ocorre após um período de garantia de 8 dias, descrito nos Termos do Marketplace. Devoluções aprovadas dentro desse período são tratadas antes da liberação do saldo ao vendedor.",
    ],
  },
  {
    title: "10. Contato",
    paragraphs: ["Dúvidas sobre trocas, devoluções e frete podem ser enviadas para freelandoogroup@gmail.com ou pelo WhatsApp (11) 96275-7599."],
  },
]

export default function ReturnPolicyPage() {
  return (
    <LegalDocument
      namespace="ReturnPolicy"
      title="Política de Trocas, Devoluções e Frete"
      updatedAt="Última atualização: 21 de maio de 2026"
      intro="Esta política explica como funcionam o direito de arrependimento, a devolução de produtos com defeito, as trocas, o frete e o reembolso nas compras realizadas na Loja da Freelandoo, em conformidade com o Código de Defesa do Consumidor."
      sections={sections}
      footerPrefix="Esta política integra os Termos do Marketplace da Freelandoo. Veja também nossos"
      links={[
        { href: "/marketplace-terms", label: "Termos do Marketplace" },
        { href: "/terms", label: "Termos de Uso" },
      ]}
    />
  )
}
