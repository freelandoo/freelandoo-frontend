/**
 * Catálogo de dicas (hover-hints) por elemento. O `id` casa com `data-tour`
 * quando faz sentido reutilizar. Cobre as superfícies de mais alto tráfego —
 * sidebar, dropside da conta e toolbar do headcard — que entregam os pontos
 * de entrada para a maioria dos 27 módulos do Freelandoo.
 */

export type HintId =
  // ── Sidebar (esquerda no desktop / inferior no mobile) ─────────────────
  | "sidebar-profile"
  | "sidebar-feed"
  | "sidebar-bees"
  | "sidebar-enxames"
  | "sidebar-messages"
  | "sidebar-ranking"
  | "sidebar-admin"
  // ── /account (atalhos do headcard) ─────────────────────────────────────
  | "account-find-service"
  | "account-find-product"
  | "account-activate"
  // ── Dropside (menu da conta) — Ações primárias ─────────────────────────
  | "dropside-edit"
  | "dropside-manifestation"
  | "dropside-earnings"
  | "dropside-request-service"
  | "dropside-request-product"
  | "dropside-pollens"
  // ── Dropside — Ações secundárias ───────────────────────────────────────
  | "dropside-account"
  | "dropside-payments"
  | "dropside-settings"
  | "dropside-admin"
  | "dropside-logout"
  // ── Dropside — Preferências (i18n) ─────────────────────────────────────
  | "dropside-country"
  | "dropside-language"
  // ── Toolbar do headcard (próprio perfil) ───────────────────────────────
  | "headcard-settings"
  | "headcard-edit-profile"
  | "headcard-edit-clan"
  | "headcard-messages"
  | "headcard-clans"
  | "headcard-members"
  | "headcard-manage"
  | "headcard-engagement"
  | "headcard-ranking"
  | "headcard-agenda"
  | "headcard-mural"
  // ── Toolbar do headcard (perfil de visitante) ──────────────────────────
  | "headcard-follow"
  | "headcard-visit-message"
  | "headcard-view-members"
  | "headcard-view-ranking"

export interface Hint {
  /** Título curto em CAIXA-ALTA (etiqueta). */
  title: string
  /** Frase única e direta explicando o que esse elemento faz. */
  text: string
}

export const HINTS: Record<HintId, Hint> = {
  // ── Sidebar ────────────────────────────────────────────────────────────
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

  // ── /account ───────────────────────────────────────────────────────────
  "account-find-service": {
    title: "Pedir serviço",
    text: "Descreva o que precisa e profissionais compatíveis respondem com proposta.",
  },
  "account-find-product": {
    title: "Pedir produto",
    text: "Publica o que quer comprar e vendedores da loja entram em contato.",
  },
  "account-activate": {
    title: "Ativar conta",
    text: "Paga a anuidade da plataforma e desbloqueia a publicação do seu perfil profissional.",
  },

  // ── Dropside — primárias ───────────────────────────────────────────────
  "dropside-edit": {
    title: "Editar perfil",
    text: "Edita seu perfil principal — foto, nome, bio, redes sociais e localização.",
  },
  "dropside-manifestation": {
    title: "Manifestação",
    text: "Loja de banners. Desbloqueia com pólens ou cartão e aplica no headcard do perfil.",
  },
  "dropside-earnings": {
    title: "Meus faturamentos",
    text: "Saldo, comissões de afiliado, cupons compartilhados e histórico financeiro.",
  },
  "dropside-request-service": {
    title: "Pedir serviço",
    text: "Cria um pedido de serviço (O.S.) — profissionais respondem com proposta.",
  },
  "dropside-request-product": {
    title: "Pedir produto",
    text: "Publica o que quer comprar e os vendedores da loja entram em contato.",
  },
  "dropside-pollens": {
    title: "Seus Pólens",
    text: "Loja de Pólens — compre pacotes ou veja seu saldo e como gastar.",
  },

  // ── Dropside — secundárias ─────────────────────────────────────────────
  "dropside-account": {
    title: "Minha conta",
    text: "Visão geral da sua conta: perfis, subperfis, clans, pólens e XP.",
  },
  "dropside-payments": {
    title: "Pagamentos e ativações",
    text: "Histórico de pagamentos, assinaturas dos subperfis e reembolsos.",
  },
  "dropside-settings": {
    title: "Configurações",
    text: "Dados pessoais, e-mail, senha, supervisão (menores) e preferências da conta.",
  },
  "dropside-admin": {
    title: "Administração",
    text: "Painel admin (somente administradores): enxames, cupons, premium, moderação.",
  },
  "dropside-logout": {
    title: "Sair",
    text: "Faz logout desta sessão. Você pode entrar de novo a qualquer momento.",
  },

  // ── Dropside — i18n ────────────────────────────────────────────────────
  "dropside-country": {
    title: "Seu país",
    text: "Filtra conteúdo e moeda pelo país. Afeta vitrine, loja e preços.",
  },
  "dropside-language": {
    title: "Idioma",
    text: "Troca o idioma da interface: português, inglês ou espanhol.",
  },

  // ── Headcard — próprio perfil ──────────────────────────────────────────
  "headcard-settings": {
    title: "Configurações",
    text: "Expande os atalhos deste perfil. Passe o mouse para abrir.",
  },
  "headcard-edit-profile": {
    title: "Editar perfil",
    text: "Edita avatar, bio, profissão, redes sociais e localização deste perfil.",
  },
  "headcard-edit-clan": {
    title: "Editar clan",
    text: "Edita os dados deste clan: nome, descrição, redes e foto.",
  },
  "headcard-messages": {
    title: "Minhas mensagens",
    text: "Abre /mensagens — conversas privadas, grupos e a aba O.S.",
  },
  "headcard-clans": {
    title: "Clans",
    text: "Lista os clans deste subperfil — comunidades coletivas associadas.",
  },
  "headcard-members": {
    title: "Membros do clan",
    text: "Vê e gerencia os subperfis membros deste clan.",
  },
  "headcard-manage": {
    title: "Gerenciar clan",
    text: "Configurações administrativas do clan: papéis, convites e permissões.",
  },
  "headcard-engagement": {
    title: "Engajamento",
    text: "Métricas de interação do seu perfil: visualizações, seguidores e atividade.",
  },
  "headcard-ranking": {
    title: "Ranking",
    text: "Sua posição no ranking de perfis ativos — atualizada a cada 2 horas.",
  },
  "headcard-agenda": {
    title: "Agenda",
    text: "Calendário e horários de agendamento (booking) dos seus serviços.",
  },
  "headcard-mural": {
    title: "Mural",
    text: "Mural da conta — avisos importantes e atalhos da comunidade.",
  },

  // ── Headcard — visitante ───────────────────────────────────────────────
  "headcard-follow": {
    title: "Acompanhar",
    text: "Seguir este perfil para ver os posts e stories no seu feed.",
  },
  "headcard-visit-message": {
    title: "Enviar mensagem",
    text: "Abre uma conversa privada direto com este perfil.",
  },
  "headcard-view-members": {
    title: "Membros do clan",
    text: "Vê quais subperfis fazem parte deste clan.",
  },
  "headcard-view-ranking": {
    title: "Ranking deste perfil",
    text: "Vê a posição deste perfil no ranking geral.",
  },
}
