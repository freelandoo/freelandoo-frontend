export type ConsentActionKey = "publish_content" | "publish_offer" | "purchase" | "affiliate"

export interface ConsentActionDef {
  key: ConsentActionKey
  version: number
  title: string
  summary: string
  bullets: string[]
  links: { label: string; href: string }[]
}

/**
 * Minuta de boas práticas (CDC/LGPD/autoral/Marco Civil) — texto final pendente de revisão
 * jurídica. Subir `version` re-dispara o aceite para todos os usuários.
 */
export const CONSENT_ACTIONS: Record<ConsentActionKey, ConsentActionDef> = {
  publish_content: {
    key: "publish_content",
    version: 1,
    title: "Antes de publicar",
    summary:
      "Você é responsável pelo conteúdo que publica. Ao continuar, declara que tem os direitos necessários e que o conteúdo respeita as regras da plataforma.",
    bullets: [
      "O conteúdo é seu ou você tem autorização para publicá-lo.",
      "Não viola direitos de terceiros (autorais, imagem, marca).",
      "Não é ilegal, ofensivo ou enganoso.",
    ],
    links: [
      { label: "Direitos Autorais", href: "/copyright-policy" },
      { label: "Diretrizes da Comunidade", href: "/community-guidelines" },
      { label: "Política de Moderação", href: "/moderation-policy" },
    ],
  },
  publish_offer: {
    key: "publish_offer",
    version: 1,
    title: "Antes de publicar sua oferta",
    summary:
      "Ao publicar um curso, serviço ou produto pago, você assume a responsabilidade de fornecedor pela oferta e pela entrega.",
    bullets: [
      "As informações da oferta são verdadeiras e você pode cumpri-la.",
      "Você é responsável pela entrega, pela qualidade e pelos impostos/nota fiscal.",
      "Concorda com as regras de comissão e repasse do marketplace.",
    ],
    links: [
      { label: "Termos do Marketplace", href: "/marketplace-terms" },
      { label: "Direitos Autorais", href: "/copyright-policy" },
    ],
  },
  purchase: {
    key: "purchase",
    version: 1,
    title: "Antes de concluir a compra",
    summary:
      "A contratação é entre você e o vendedor; a Freelandoo intermedia o pagamento com proteção. Confira seus direitos antes de continuar.",
    bullets: [
      "Direito de arrependimento em até 7 dias em compras online (CDC, art. 49).",
      "O pagamento fica protegido até a confirmação da entrega.",
      "Você leu a Política de Devolução e as regras da compra.",
    ],
    links: [
      { label: "Política de Devolução", href: "/return-policy" },
      { label: "Termos do Marketplace", href: "/marketplace-terms" },
    ],
  },
  affiliate: {
    key: "affiliate",
    version: 1,
    title: "Antes de virar afiliado",
    summary:
      "Como afiliado, você divulga ofertas de terceiros e recebe comissão pelas vendas atribuídas a você, conforme os termos.",
    bullets: [
      "A comissão segue as regras e os prazos de liberação (holdback) do programa.",
      "Divulgação honesta — sem spam, fraude ou promessas enganosas.",
      "A Freelandoo pode reverter comissões de vendas canceladas ou fraudulentas.",
    ],
    links: [{ label: "Termos de Afiliados", href: "/affiliate-terms" }],
  },
}
