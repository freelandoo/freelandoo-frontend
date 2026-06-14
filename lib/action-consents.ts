// Aceite geral dos Termos de Uso + Política de Privacidade no cadastro.
// Espelha SIGNUP_TERMS_VERSION do backend (src/utils/terms.js) — manter em sincronia.
// Subir aqui e no backend re-dispara a tela /aceitar-termos para todos.
export const SIGNUP_TERMS_VERSION = 1

export type ConsentActionKey =
  | "publish_content"
  | "publish_offer"
  | "purchase"
  | "platform_purchase"
  | "affiliate"

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
    title: "Antes de contratar",
    summary:
      "A Freelandoo é uma plataforma que conecta você ao vendedor ou profissional. A contratação, a execução e a entrega são responsabilidade direta de quem oferece a oferta — a Freelandoo apenas intermedeia o contato e o pagamento e não é parte do contrato.",
    bullets: [
      "O contrato é firmado diretamente entre você e o vendedor/profissional; a Freelandoo não responde pela execução, qualidade, segurança, prazos ou resultado da oferta.",
      "Você confere os dados, o preço e as condições antes de prosseguir e é responsável por avaliar o fornecedor e a oferta.",
      "Divergências sobre o serviço ou produto são resolvidas diretamente entre as partes; seus direitos de consumidor (CDC) permanecem preservados perante o fornecedor.",
    ],
    links: [
      { label: "Termos do Marketplace", href: "/marketplace-terms" },
      { label: "Política de Devolução", href: "/return-policy" },
      { label: "Termos de Uso", href: "/terms" },
    ],
  },
  platform_purchase: {
    key: "platform_purchase",
    version: 1,
    title: "Antes de concluir",
    summary:
      "Você está adquirindo um recurso digital da própria Freelandoo (como Poléns, destaque ou banner de manifestação). É um item de uso dentro da plataforma, liberado após a confirmação do pagamento.",
    bullets: [
      "É um item digital, sem entrega física, com fruição imediata após a confirmação do pagamento.",
      "Créditos e recursos digitais não são, em regra, reembolsáveis após a liberação ou o uso, salvo quando a lei exigir.",
      "O uso segue os Termos da Freelandoo e as regras específicas do recurso adquirido.",
    ],
    links: [
      { label: "Termos de Uso", href: "/terms" },
      { label: "Termos de Poléns", href: "/polens-terms" },
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
