/**
 * Catálogo de dicas (hover-hints) por elemento. O `id` casa com `data-tour`
 * quando faz sentido reutilizar. Cobre as superfícies de mais alto tráfego —
 * sidebar, dropside da conta e toolbar do headcard — que entregam os pontos
 * de entrada para a maioria dos 27 módulos do Freelandoo.
 */

export type HintId =
  // ── /search — filtros do header retrátil ───────────────────────────────
  | "search-filter-machine"
  | "search-filter-profession"
  | "search-filter-city"
  | "search-filter-level"
  | "search-filter-premium"
  | "search-clear-filters"
  | "search-bell"
  // ── /ranking — escopos ─────────────────────────────────────────────────
  | "ranking-scope-general"
  | "ranking-scope-machine"
  | "ranking-scope-profession"
  | "ranking-scope-city"
  // ── /admin — cards ─────────────────────────────────────────────────────
  | "admin-users"
  | "admin-entries"
  | "admin-stats"
  | "admin-items"
  | "admin-enxames"
  | "admin-coupons"
  | "admin-anuidade"
  | "admin-booking-fees"
  | "admin-affiliates"
  | "admin-ranking"
  | "admin-polens"
  | "admin-manifestation"
  | "admin-premium"
  | "admin-chat-mod"
  | "admin-blocked-terms"
  | "admin-store-payouts"
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
  // ── /account — badges do headcard ──────────────────────────────────────
  | "account-manifestation-tag"
  | "account-parental"
  | "account-parental-supervised"
  | "account-coupon"
  | "account-coupon-generate"
  // ── /account — contadores do header retrátil ───────────────────────────
  | "account-counter-profiles"
  | "account-counter-visible"
  | "account-counter-clans"
  | "account-counter-following"
  | "account-counter-unread"
  // ── /account — abas do portfólio ───────────────────────────────────────
  | "account-tab-feed"
  | "account-tab-bees"
  | "account-tab-courses"
  | "account-tab-saved"
  | "account-tab-profiles"
  | "account-tab-clans"
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

  // ── /account — badges ──────────────────────────────────────────────────
  "account-manifestation-tag": {
    title: "Tag da Manifestação",
    text: "Aparece quando você tem uma Manifestação ativa. Aplica banner + tag no headcard dos perfis escolhidos.",
  },
  "account-parental": {
    title: "Controle parental",
    text: "Gerencia contas supervisionadas (filhos): aprovar conteúdo, ver mensagens read-only e bloquear áreas.",
  },
  "account-parental-supervised": {
    title: "Conta supervisionada",
    text: "Sua conta é supervisionada por um responsável. Aqui você pede permissão pra liberar áreas restritas.",
  },
  "account-coupon": {
    title: "Seu cupom",
    text: "Compartilhe — quem usar seu cupom em assinatura ganha desconto e você recebe comissão de afiliado.",
  },
  "account-coupon-generate": {
    title: "Gerar cupom",
    text: "Cria seu cupom único de afiliado. Usado em links de compartilhamento pra gerar comissão.",
  },

  // ── /account — contadores ──────────────────────────────────────────────
  "account-counter-profiles": {
    title: "Total de perfis",
    text: "Quantos subperfis profissionais você tem criados (visíveis ou não).",
  },
  "account-counter-visible": {
    title: "Perfis publicados",
    text: "Subperfis que estão publicados e aparecendo na vitrine para clientes.",
  },
  "account-counter-clans": {
    title: "Seus clans",
    text: "Comunidades coletivas que você criou ou participa como dono.",
  },
  "account-counter-following": {
    title: "Acompanhando",
    text: "Subperfis e clans que você segue — geram conteúdo no seu feed e stories.",
  },
  "account-counter-unread": {
    title: "Mensagens não lidas",
    text: "Conversas privadas ou de grupo com mensagens novas pra você ler.",
  },

  // ── /account — abas do portfólio ───────────────────────────────────────
  "account-tab-feed": {
    title: "Portfólio (Feed)",
    text: "Seus posts de imagem 4:5 — aparecem no feed dos seguidores.",
  },
  "account-tab-bees": {
    title: "Bees",
    text: "Vídeos verticais 9:16 (até 100MB) — aparecem na vitrine Bees estilo TikTok.",
  },
  "account-tab-courses": {
    title: "Cursos",
    text: "Cursos que você criou pra vender conhecimento (módulos, aulas, certificado).",
  },
  "account-tab-saved": {
    title: "Salvos",
    text: "Posts e Bees que você marcou pra ver depois — bookmark privado.",
  },
  "account-tab-profiles": {
    title: "Meus perfis",
    text: "Lista dos seus subperfis profissionais. Clique pra abrir e editar cada um.",
  },
  "account-tab-clans": {
    title: "Meus clans",
    text: "Lista dos clans que você criou ou administra.",
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

  // ── /search — filtros e ações do header retrátil ──────────────────────
  "search-filter-machine": {
    title: "Filtrar por Enxame",
    text: "Escolhe a área (Views, Limpeza, Construção, etc.). Define quais profissões aparecem em \"Profissão\".",
  },
  "search-filter-profession": {
    title: "Filtrar por profissão",
    text: "Profissão específica dentro do Enxame escolhido. Ative um Enxame primeiro.",
  },
  "search-filter-city": {
    title: "Filtrar por cidade",
    text: "Estado ou cidade do profissional. Combinável com Enxame, profissão e nível.",
  },
  "search-filter-level": {
    title: "Filtrar por nível",
    text: "Nível mínimo de XP do profissional. Quanto maior, mais ativo na plataforma.",
  },
  "search-filter-premium": {
    title: "Só Premium",
    text: "Mostra apenas perfis com destaque Premium ativo — pago pra subir na vitrine.",
  },
  "search-clear-filters": {
    title: "Limpar filtros",
    text: "Remove todos os filtros aplicados e mostra a vitrine inteira de novo.",
  },
  "search-bell": {
    title: "Notificações",
    text: "Abre o painel com likes, comentários, follows e mensagens novas.",
  },

  // ── /ranking — abas de escopo ──────────────────────────────────────────
  "ranking-scope-general": {
    title: "Ranking geral",
    text: "Top 10 da plataforma inteira — todos os Enxames, profissões e cidades juntos.",
  },
  "ranking-scope-machine": {
    title: "Ranking por Enxame",
    text: "Top 10 dentro de uma área específica (Views, Construção, Saúde & Beleza, etc.).",
  },
  "ranking-scope-profession": {
    title: "Ranking por profissão",
    text: "Top 10 de uma profissão específica (editor de vídeo, faxineira, eletricista, etc.).",
  },
  "ranking-scope-city": {
    title: "Ranking por cidade",
    text: "Top 10 de uma cidade ou estado específicos.",
  },

  // ── /admin — cards principais ──────────────────────────────────────────
  "admin-users": {
    title: "Usuários / Perfis",
    text: "Lista de usuários cadastrados com seus subperfis, premium e total recebido.",
  },
  "admin-entries": {
    title: "Entradas",
    text: "Histórico de ativações pagas (anuidade) e taxas de agendamento recebidas.",
  },
  "admin-stats": {
    title: "Estatísticas",
    text: "Métricas globais da plataforma: cadastros, receita, engajamento, conversão.",
  },
  "admin-items": {
    title: "Itens",
    text: "Catálogo de itens e preços usados em produtos e cursos.",
  },
  "admin-enxames": {
    title: "Controle de Enxames",
    text: "Ativa/desativa Enxames, define cores e gerencia as profissões dentro de cada um.",
  },
  "admin-coupons": {
    title: "Cupons",
    text: "Desconto e comissão de afiliado: regra geral e overrides por cupom específico.",
  },
  "admin-anuidade": {
    title: "Ativação do perfil",
    text: "Configura o valor da ativação anual (Stripe) e ativa/desativa a cobrança.",
  },
  "admin-booking-fees": {
    title: "Agendamento (taxas)",
    text: "Taxa da maquininha (%) e taxa de serviço fixa exibidas no modal de cadastro de serviço.",
  },
  "admin-affiliates": {
    title: "Afiliados",
    text: "Comissões acumuladas, alertas de prazo (holdback 8 dias) e confirmação de pagamento.",
  },
  "admin-ranking": {
    title: "Ranking",
    text: "Configura pesos do score (XP, ratings, likes, visitas) e visualiza posições.",
  },
  "admin-polens": {
    title: "Poléns",
    text: "Moeda interna: rewarded ads, preços dos pacotes e métricas de gasto/ganho.",
  },
  "admin-manifestation": {
    title: "Manifestação",
    text: "Cadastro de banners, tags, preços e dashboard de uso da loja de Manifestação.",
  },
  "admin-premium": {
    title: "Premium",
    text: "Destaque pago por perfil: preço, duração em dias e vagas por cidade.",
  },
  "admin-chat-mod": {
    title: "Moderação do Chat",
    text: "Fila de revisão de mensagens denunciadas, mute e ban de usuários do chat público.",
  },
  "admin-blocked-terms": {
    title: "Termos bloqueados",
    text: "Lista de palavras/expressões proibidas no chat — categoria, severity e ação automática.",
  },
  "admin-store-payouts": {
    title: "Loja — Payouts",
    text: "Saldo dos vendedores da Loja após holdback de 8 dias. Pagamento PIX manual.",
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
