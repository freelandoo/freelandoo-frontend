import type { Metadata } from "next"
import { LegalDocument } from "../_components/legal-document"

export const metadata: Metadata = {
  title: "Termos de Poléns e Itens Digitais — Freelandoo",
  description: "Regras de aquisição e uso dos Poléns e dos itens digitais da plataforma Freelandoo.",
}

const sections = [
  {
    title: "1. O que são Poléns",
    items: [
      "Poléns são créditos virtuais utilizados exclusivamente dentro da plataforma Freelandoo.",
      "Poléns não constituem moeda, não têm valor monetário fora da plataforma e não são meio de pagamento de uso geral.",
      "Poléns não rendem juros, não são transferíveis entre contas e não podem ser convertidos em dinheiro.",
    ],
  },
  {
    title: "2. Aquisição de Poléns",
    items: [
      "Poléns podem ser adquiridos em pacotes pagos, processados pela Stripe.",
      "Poléns também podem ser concedidos pela plataforma em promoções, bonificações ou recompensas.",
      "O preço dos pacotes é exibido antes da compra e pode ser alterado a qualquer momento.",
      "A confirmação da compra ocorre após a aprovação do pagamento.",
    ],
  },
  {
    title: "3. Uso de Poléns",
    items: [
      "Poléns podem ser usados para adquirir itens digitais e recursos pagos da plataforma.",
      "O custo em Poléns de cada item é exibido antes da confirmação.",
      "O uso de Poléns é definitivo após a confirmação da operação.",
      "Alguns recursos podem ser pagos com Poléns ou diretamente via Stripe, conforme a disponibilidade.",
    ],
  },
  {
    title: "4. Itens digitais",
    paragraphs: [
      "A plataforma oferece itens digitais que podem ser adquiridos com Poléns ou via Stripe, entre eles:",
    ],
    items: [
      "Manifestação: banner personalizado e tag exibidos no perfil.",
      "Premium e destaques: maior visibilidade do perfil por um período determinado.",
      "Outros recursos digitais de personalização e divulgação disponibilizados na plataforma.",
      "Itens digitais são de uso pessoal, vinculados à conta e não transferíveis.",
    ],
  },
  {
    title: "5. Ausência de reembolso e de saque",
    items: [
      "Poléns e itens digitais não são reembolsáveis, salvo nas hipóteses obrigatórias previstas em lei.",
      "Poléns não podem ser sacados, resgatados em dinheiro ou transferidos para terceiros.",
      "Itens digitais já ativados não geram direito a devolução por arrependimento, por se tratar de conteúdo digital fornecido de imediato.",
      "Casos excepcionais de estorno podem ser tratados pela administração, a seu critério.",
    ],
  },
  {
    title: "6. Validade e encerramento de conta",
    items: [
      "Poléns ficam disponíveis enquanto a conta estiver ativa e regular.",
      "Em caso de encerramento da conta por violação dos termos, Poléns e itens digitais podem ser perdidos sem direito a compensação.",
      "A Freelandoo pode definir prazos de validade para Poléns promocionais, informando o usuário.",
    ],
  },
  {
    title: "7. Alterações de preços e regras",
    items: [
      "A Freelandoo pode alterar preços, valores em Poléns e regras dos itens digitais a qualquer momento.",
      "Alterações não afetam itens já adquiridos e ativados.",
    ],
  },
  {
    title: "8. Condutas vedadas",
    items: [
      "É proibido obter Poléns por meios fraudulentos, incluindo estornos indevidos.",
      "É proibido comercializar Poléns ou itens digitais fora da plataforma.",
      "O uso indevido pode resultar na perda dos créditos e na suspensão da conta.",
    ],
  },
  {
    title: "9. Lei aplicável",
    paragraphs: [
      "Estes termos são regidos pelas leis da República Federativa do Brasil, observado o Código de Defesa do Consumidor.",
    ],
  },
  {
    title: "10. Contato",
    paragraphs: ["Dúvidas sobre Poléns e itens digitais podem ser enviadas para freelandoogroup@gmail.com ou pelo WhatsApp (11) 96275-7599."],
  },
]

export default function PolensTermsPage() {
  return (
    <LegalDocument
      namespace="PolensTerms"
      title="Termos de Poléns e Itens Digitais"
      updatedAt="Última atualização: 21 de maio de 2026"
      intro="Estes termos regulam a aquisição e o uso dos Poléns, os créditos virtuais da Freelandoo, e dos itens digitais oferecidos na plataforma, como Manifestação e destaques Premium."
      sections={sections}
      footerPrefix="Ao adquirir ou usar Poléns e itens digitais, você concorda com estes termos. Veja também nossos"
      links={[
        { href: "/terms", label: "Termos de Uso" },
        { href: "/subscription-terms", label: "Termo de Ativação" },
      ]}
    />
  )
}
