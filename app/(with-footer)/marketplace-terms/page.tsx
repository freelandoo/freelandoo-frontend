import type { Metadata } from "next"
import { LegalDocument } from "../_components/legal-document"

export const metadata: Metadata = {
  title: "Termos do Marketplace — Freelandoo",
  description: "Regras de compra, venda e agendamento na Loja da plataforma Freelandoo.",
}

const sections = [
  {
    title: "1. Objeto e definições",
    items: [
      "Estes termos regulam a Loja da Freelandoo, ambiente em que usuários anunciam, compram e vendem produtos dentro da plataforma.",
      "Vendedor: usuário com perfil ativado que anuncia produtos na Loja.",
      "Comprador: usuário que adquire produtos na Loja.",
      "Pedido: a compra de um ou mais produtos, com pagamento processado pela plataforma.",
    ],
  },
  {
    title: "2. Quem pode comprar e vender",
    items: [
      "Vender na Loja exige um perfil profissional ativado e em conformidade com os Termos de Uso.",
      "Comprar exige uma conta cadastrada e ativa.",
      "Contas Supervisionadas de menores não podem vender produtos e podem ter o acesso à compra restrito pelo responsável.",
    ],
  },
  {
    title: "3. Anúncio de produtos",
    items: [
      "O vendedor deve descrever cada produto de forma verdadeira, clara e completa, incluindo fotos reais, condição, preço e prazo de envio.",
      "É proibido anunciar produtos com informações enganosas ou com imagens de terceiros sem autorização.",
      "O vendedor é responsável pela legalidade, pela origem e pela regularidade fiscal dos produtos anunciados.",
      "Cada produto deve ser classificado na categoria adequada.",
    ],
  },
  {
    title: "4. Produtos proibidos",
    paragraphs: ["É vedado anunciar na Loja, entre outros:"],
    items: [
      "Armas, munições, explosivos e itens de uso restrito.",
      "Drogas, medicamentos controlados e substâncias ilícitas.",
      "Produtos falsificados, pirateados ou que violem propriedade intelectual.",
      "Conteúdo sexual, material que explore menores e itens que incitem violência ou discriminação.",
      "Animais, partes do corpo, documentos e quaisquer itens cuja venda seja proibida por lei.",
      "Produtos que a Freelandoo classifique como proibidos em sua política interna de produtos.",
    ],
  },
  {
    title: "5. Preço, frete e etiqueta de envio",
    items: [
      "O preço do produto é definido livremente pelo vendedor e exibido ao comprador antes da compra.",
      "O frete é calculado por integração com serviços de logística, como o Melhor Envio, e informado no checkout.",
      "A plataforma pode gerar a etiqueta de envio para facilitar a postagem do produto pelo vendedor.",
      "Os custos de frete são considerados na composição do pedido e no repasse ao vendedor, conforme informado no momento da compra.",
    ],
  },
  {
    title: "6. Pagamento e processamento",
    items: [
      "O pagamento do pedido é processado pela plataforma por meio da Stripe.",
      "O valor pago pelo comprador fica sob gestão da plataforma até a conclusão das etapas de garantia.",
      "A confirmação do pedido depende da aprovação do pagamento.",
    ],
  },
  {
    title: "7. Repasse ao vendedor",
    items: [
      "Após a confirmação do pagamento, o valor devido ao vendedor entra em um período de garantia de 8 (oito) dias.",
      "O período de garantia acompanha o prazo de arrependimento e devolução previsto no Código de Defesa do Consumidor.",
      "Concluído o período de garantia sem devolução ou contestação, o valor é liberado como saldo do vendedor.",
      "O repasse ao vendedor corresponde ao valor da venda, deduzidos o frete e as tarifas aplicáveis.",
      "Em caso de devolução, reembolso ou estorno, o valor correspondente é retido ou revertido.",
    ],
  },
  {
    title: "8. Entrega e responsabilidade do vendedor",
    items: [
      "O vendedor deve enviar o produto no prazo informado, com embalagem adequada.",
      "O vendedor é responsável pela conformidade, pela qualidade e pela integridade do produto entregue.",
      "Atrasos, extravios e divergências devem ser tratados com diligência pelo vendedor.",
      "A Freelandoo pode intervir, reter valores ou cancelar pedidos diante de descumprimento.",
    ],
  },
  {
    title: "9. Pedir Produto",
    paragraphs: [
      "A funcionalidade Pedir Produto permite que usuários publiquem pedidos de produtos que desejam encontrar. Essas publicações seguem as Diretrizes da Comunidade e a política de produtos proibidos descrita nestes termos.",
    ],
  },
  {
    title: "10. Agendamento de serviços",
    items: [
      "Serviços agendados e pagos pela plataforma seguem um modelo de repasse semelhante ao da Loja, com período de garantia antes da liberação do saldo ao profissional.",
      "A execução, a qualidade e o cumprimento do serviço são de responsabilidade do profissional contratado.",
      "Serviços negociados e pagos diretamente entre as partes, fora da plataforma, não contam com essa intermediação nem com as garantias correspondentes.",
    ],
  },
  {
    title: "11. Devoluções, trocas e reembolsos",
    paragraphs: [
      "As regras de arrependimento, devolução por defeito, troca e reembolso constam na Política de Trocas, Devoluções e Frete.",
    ],
  },
  {
    title: "12. Tarifas da plataforma",
    items: [
      "A Freelandoo pode cobrar tarifas sobre as transações da Loja e dos Agendamentos.",
      "As tarifas aplicáveis são informadas antes da conclusão da venda ou refletidas no repasse ao vendedor.",
    ],
  },
  {
    title: "13. Condutas vedadas e sanções",
    items: [
      "É proibido combinar pagamentos por fora para burlar a intermediação e as garantias da plataforma.",
      "É proibido manipular avaliações, criar pedidos fraudulentos ou usar a Loja para fins ilícitos.",
      "O descumprimento pode resultar em remoção de anúncios, retenção de valores, suspensão ou exclusão da conta.",
    ],
  },
  {
    title: "14. Limitação de responsabilidade",
    items: [
      "A Freelandoo atua como facilitadora da transação e do pagamento, não sendo a vendedora dos produtos nem a prestadora dos serviços.",
      "A responsabilidade pela qualidade, pela entrega e pela conformidade é do vendedor ou do profissional.",
      "A Freelandoo pode mediar conflitos e aplicar as garantias previstas, sem assumir a obrigação principal das partes.",
    ],
  },
  {
    title: "15. Alterações",
    paragraphs: [
      "Estes termos podem ser atualizados a qualquer momento, com comunicação na plataforma. O uso continuado da Loja implica concordância.",
    ],
  },
  {
    title: "16. Contato",
    paragraphs: ["Dúvidas sobre a Loja podem ser enviadas para freelandoogroup@gmail.com ou pelo WhatsApp (11) 96275-7599."],
  },
]

export default function MarketplaceTermsPage() {
  return (
    <LegalDocument
      namespace="MarketplaceTerms"
      title="Termos do Marketplace"
      updatedAt="Última atualização: 21 de maio de 2026"
      intro="Estes termos regulam a compra, a venda e o agendamento de serviços realizados dentro da plataforma Freelandoo. Ao utilizar a Loja, comprador e vendedor declaram ter lido e concordado com estas regras."
      sections={sections}
      footerPrefix="Ao comprar ou vender na Loja da Freelandoo, você concorda com estes termos. Veja também nossa"
      links={[
        { href: "/return-policy", label: "Política de Trocas e Devoluções" },
        { href: "/terms", label: "Termos de Uso" },
      ]}
    />
  )
}
