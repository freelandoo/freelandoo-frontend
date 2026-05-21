/**
 * Catálogo de dicas mostradas ao passar o mouse (hover) nos elementos
 * marcados. O `id` casa com `data-tour` quando faz sentido reutilizar.
 */

export type HintId =
  | "sidebar-profile"
  | "sidebar-feed"
  | "sidebar-bees"
  | "sidebar-enxames"
  | "sidebar-messages"
  | "sidebar-ranking"
  | "sidebar-admin"
  | "account-find-service"
  | "account-find-product"

export interface Hint {
  /** Título curto, em CAIXA-ALTA visual (estilo etiqueta). */
  title: string
  /** Frase única e direta explicando o que esse botão faz. */
  text: string
}

export const HINTS: Record<HintId, Hint> = {
  "sidebar-profile": {
    title: "Sua conta",
    text: "Abre o menu da conta — perfil, manifestação, pólens, pagamentos e configurações.",
  },
  "sidebar-feed": {
    title: "Feed",
    text: "Posts dos perfis que você acompanha: fotos, vídeos curtos e atualizações.",
  },
  "sidebar-bees": {
    title: "Bees",
    text: "Feed vertical 9:16, estilo TikTok, com vídeos curtos da plataforma.",
  },
  "sidebar-enxames": {
    title: "Enxames",
    text: "Vitrine de profissionais organizada por área. Aqui você é encontrado por clientes.",
  },
  "sidebar-messages": {
    title: "Mensagens",
    text: "Conversas privadas, grupos e a aba O.S. dos pedidos de serviço.",
  },
  "sidebar-ranking": {
    title: "Ranking",
    text: "Posição dos perfis por atividade e XP — recalculado a cada 2 horas.",
  },
  "sidebar-admin": {
    title: "Administração",
    text: "Painel de gestão da plataforma (apenas administradores).",
  },
  "account-find-service": {
    title: "Pedir serviço",
    text: "Descreve o que você precisa e profissionais compatíveis respondem com proposta.",
  },
  "account-find-product": {
    title: "Pedir produto",
    text: "Publica o que quer comprar e vendedores da loja entram em contato.",
  },
}
