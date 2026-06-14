import type { Metadata } from "next"
import { LegalDocument } from "../_components/legal-document"

export const metadata: Metadata = {
  title: "Termos do Marketplace — Freelandoo",
  description: "Regras de compra, venda e agendamento na Loja da plataforma Freelandoo.",
}

const sections = [
  {
    title: "1. Objeto e definições",
    paragraphs: [
      "Estes termos regulam as transações realizadas dentro da plataforma Freelandoo. Para evitar dúvidas, distinguimos dois cenários:",
    ],
    items: [
      "Transações processadas pela plataforma: a Loja (produtos), os Agendamentos pagos (serviços agendados e pagos dentro da plataforma) e os Cursos. Nesses casos, o pagamento é processado pela plataforma (via Stripe) e podem existir garantia, retenção e repasse, conforme cada seção.",
      "Serviços negociados diretamente entre as partes: combinações feitas fora da plataforma (por exemplo, pelo WhatsApp). Nesse caso, a Freelandoo apenas conecta as pessoas e não intermedia o pagamento, não retém valores e não oferece as garantias da plataforma (ver seção própria).",
      "Vendedor: usuário com perfil ativado que anuncia produtos na Loja ou oferece cursos e agendamentos pagos pela plataforma.",
      "Comprador: usuário que adquire produtos, cursos ou agendamentos na plataforma.",
      "Pedido: a compra de um ou mais itens, com pagamento processado pela plataforma.",
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
      "O pagamento do pedido é processado pela plataforma por meio da Stripe, incluindo cartão e Pix, quando disponíveis.",
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
    title: "10. Agendamentos pagos (serviços na plataforma)",
    items: [
      "Quando um serviço é agendado e pago dentro da plataforma, o pagamento é processado pela Freelandoo e segue um modelo de repasse semelhante ao da Loja, com período de garantia antes da liberação do saldo ao profissional.",
      "A execução, a qualidade e o cumprimento do serviço são de responsabilidade do profissional contratado.",
      "Serviços combinados e pagos diretamente entre as partes, fora da plataforma, são tratados na seção 'Serviços negociados diretamente'.",
    ],
  },
  {
    title: "11. Cursos",
    items: [
      "Os Cursos são produtos digitais criados por usuários e vendidos dentro da plataforma; a compra dá acesso ao conteúdo ao aluno.",
      "A compra do curso é processada pela plataforma (via Stripe). O preço definido pelo criador corresponde ao valor que ele recebe; o comprador paga esse valor acrescido das tarifas da plataforma, informadas antes da conclusão da compra.",
      "O conteúdo, a qualidade e a atualização do curso são de responsabilidade de quem o criou. A Freelandoo não garante resultado de aprendizado nem volume de vendas.",
      "Eventuais regras de reembolso de cursos seguem a Política de Trocas, Devoluções e Frete e as condições informadas no momento da compra.",
    ],
  },
  {
    title: "12. Serviços negociados diretamente (fora da plataforma)",
    items: [
      "Quando cliente e profissional combinam um serviço diretamente entre si — por exemplo, pelo WhatsApp ou outro canal externo —, trata-se de negociação direta entre as partes.",
      "Nessas contratações, a Freelandoo apenas conecta as pessoas: não intermedia o pagamento, não retém valores, não define preço e não oferece as garantias de retenção, repasse ou mediação aplicáveis às transações processadas pela plataforma.",
      "Preço, escopo, prazos, execução e eventuais reembolsos desses serviços são acordados e cumpridos exclusivamente entre cliente e profissional.",
    ],
  },
  {
    title: "13. Devoluções, trocas e reembolsos",
    paragraphs: [
      "As regras de arrependimento, devolução por defeito, troca e reembolso das transações processadas pela plataforma constam na Política de Trocas, Devoluções e Frete.",
    ],
  },
  {
    title: "14. Tarifas da plataforma",
    items: [
      "A Freelandoo pode cobrar tarifas sobre as transações processadas pela plataforma (Loja, Agendamentos pagos e Cursos).",
      "As tarifas aplicáveis são informadas antes da conclusão da compra ou refletidas no repasse ao vendedor.",
      "Serviços negociados diretamente entre as partes não geram tarifa de intermediação, justamente por não serem processados pela plataforma.",
    ],
  },
  {
    title: "15. Condutas vedadas e sanções",
    items: [
      "É proibido usar a plataforma para induzir compradores a burlar transações que deveriam ser processadas por ela (por exemplo, simular uma venda da Loja e desviar o pagamento para fora).",
      "É proibido manipular avaliações, criar pedidos fraudulentos ou usar a plataforma para fins ilícitos.",
      "O descumprimento pode resultar em remoção de anúncios, retenção de valores, suspensão ou exclusão da conta.",
    ],
  },
  {
    title: "16. Limitação de responsabilidade",
    items: [
      "Nas transações processadas pela plataforma, a Freelandoo atua como facilitadora da transação e do pagamento, não sendo a vendedora dos produtos, a criadora dos cursos nem a prestadora dos serviços.",
      "Nas contratações diretas entre as partes, a Freelandoo atua apenas como ponto de conexão e não participa do acordo, do pagamento ou da entrega.",
      "A responsabilidade pela qualidade, pela entrega e pela conformidade é sempre do vendedor ou do profissional. A Freelandoo não garante contratação, entrega ou resultado.",
    ],
  },
  {
    title: "17. Alterações",
    paragraphs: [
      "Estes termos podem ser atualizados a qualquer momento, com comunicação na plataforma. O uso continuado da plataforma implica concordância.",
    ],
  },
  {
    title: "18. Contato",
    paragraphs: ["Dúvidas sobre a Loja, os Cursos e os Agendamentos podem ser enviadas para freelandoogroup@gmail.com ou pelo WhatsApp (11) 96275-7599."],
  },
]

export default function MarketplaceTermsPage() {
  return (
    <LegalDocument
      namespace="MarketplaceTerms"
      title="Termos do Marketplace"
      updatedAt="Última atualização: 14 de junho de 2026"
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
