export type TourKey =
  | "welcome"
  | "account_auth"
  | "profile"
  | "subprofiles"
  | "enxames"
  | "feed"
  | "messages_private"
  | "groups"
  | "global_chat_rooms"
  | "service_orders"
  | "courses"
  | "subprofile_store"
  | "products"
  | "pollens"
  | "manifestations"
  | "coupons"
  | "affiliates"
  | "ranking"
  | "xp_levels"
  | "premium_highlight"
  | "booking"
  | "admin"
  | "moderation"
  | "uploads_r2"
  | "payments"
  | "internationalization"
  | "notifications"
  | "security";

export type TourStepAction = "openDropside" | "closeDropside" | "openSidebar" | "closeSidebar";

export interface TourStepConfig {
  id: string;
  target?: string;
  title: string;
  content: string;
  placement?: "top" | "bottom" | "left" | "right" | "center";
  fallbackTarget?: string;
  onEnter?: TourStepAction;
  onLeave?: TourStepAction;
}

export interface TourConfig {
  tourKey: TourKey;
  title: string;
  description: string;
  version: number;
  autoStart?: boolean;
  pagePath?: string[];
  requiredRole?: "admin";
  steps: TourStepConfig[];
}

export const TOUR_CONFIGS: TourConfig[] = [
  {
    tourKey: "welcome",
    title: "Bem-vindo à Freelandoo",
    description: "Tour completo da Colmeia (sidebar + menu da conta)",
    version: 1,
    autoStart: true,
    pagePath: ["/account"],
    steps: [
      { id: "welcome-1", title: "Bem-vindo à Freelandoo", content: "Vamos te mostrar tudo que dá pra fazer aqui — sidebar e menu da conta.", placement: "center" },
      { id: "welcome-sidebar-profile", target: "[data-tour='sidebar-profile']", title: "Sua conta", content: "O atalho principal: abre o menu da conta com todas as ações da plataforma.", placement: "right" },
      { id: "welcome-sidebar-feed", target: "[data-tour='sidebar-feed']", title: "Feed", content: "Posts dos perfis que você acompanha — fotos, vídeos curtos e atualizações.", placement: "right" },
      { id: "welcome-sidebar-bees", target: "[data-tour='sidebar-bees']", title: "Bees", content: "Feed vertical 9:16 estilo TikTok, com vídeos curtos da plataforma.", placement: "right" },
      { id: "welcome-sidebar-enxames", target: "[data-tour='sidebar-enxames']", title: "Enxames", content: "Vitrine de profissionais organizada por área — onde clientes te encontram.", placement: "right" },
      { id: "welcome-sidebar-messages", target: "[data-tour='sidebar-messages']", title: "Mensagens", content: "Conversas privadas, grupos e a aba O.S. dos pedidos de serviço.", placement: "right" },
      { id: "welcome-sidebar-ranking", target: "[data-tour='sidebar-ranking']", title: "Ranking", content: "Posições dos perfis por atividade e XP — recalculado a cada 2 horas.", placement: "right" },
      { id: "welcome-dropside-open", target: "[data-tour='dropside-edit']", title: "Menu da conta", content: "Esse é o menu da sua conta. Vamos passar por cada botão.", placement: "right", onEnter: "openDropside" },
      { id: "welcome-dropside-manifestation", target: "[data-tour='dropside-manifestation']", title: "Manifestação", content: "Loja de banners — desbloqueia com pólens ou cartão e aplica no headcard do seu perfil.", placement: "right" },
      { id: "welcome-dropside-earnings", target: "[data-tour='dropside-earnings']", title: "Faturamentos", content: "Saldo, comissões de afiliado, cupons compartilhados e histórico financeiro.", placement: "right" },
      { id: "welcome-dropside-request-service", target: "[data-tour='dropside-request-service']", title: "Pedir serviço", content: "Cria um pedido de serviço (O.S.) — profissionais respondem com proposta.", placement: "right" },
      { id: "welcome-dropside-request-product", target: "[data-tour='dropside-request-product']", title: "Pedir produto", content: "Publica o que quer comprar e vendedores da loja entram em contato.", placement: "right" },
      { id: "welcome-dropside-pollens", target: "[data-tour='dropside-pollens']", title: "Pólens", content: "Loja de pólens — compre pacotes ou veja seu saldo e como gastar.", placement: "right" },
      { id: "welcome-dropside-account", target: "[data-tour='dropside-account']", title: "Minha conta", content: "Visão geral da sua conta: perfis, subperfis, clans, pólens e XP.", placement: "right" },
      { id: "welcome-dropside-payments", target: "[data-tour='dropside-payments']", title: "Pagamentos & Ativações", content: "Histórico de cobranças, assinaturas dos subperfis e reembolsos.", placement: "right" },
      { id: "welcome-dropside-settings", target: "[data-tour='dropside-settings']", title: "Configurações", content: "Dados pessoais, e-mail, senha, supervisão (menores) e preferências da conta.", placement: "right" },
      { id: "welcome-dropside-preferences", target: "[data-tour='dropside-preferences']", title: "Idioma e país", content: "Troca a interface entre pt/en/es e o país que filtra conteúdo e moeda.", placement: "right" },
      { id: "welcome-dropside-logout", target: "[data-tour='dropside-logout']", title: "Sair", content: "Faz logout desta sessão. Você pode entrar de novo a qualquer momento.", placement: "right" },
      { id: "welcome-done", title: "Pronto!", content: "Você pode refazer este tour a qualquer momento pela Central de Ajuda em Configurações.", placement: "center", onLeave: "closeDropside" },
    ],
  },
  { tourKey: "account_auth", title: "Conta e Autenticação", description: "Segurança e conta-base", version: 1, pagePath: ["/account", "/login", "/cadastro"], steps: [
    { id: "account-1", title: "Sua conta-base", content: "Essa é sua conta principal na Freelandoo. Ela guarda dados, pólens, cupons e configurações.", placement: "center" },
    { id: "account-2", title: "Segurança primeiro", content: "Mantenha e-mail verificado e dados atualizados para proteger sua conta.", placement: "center" },
    { id: "account-3", title: "A conta não é vitrine", content: "Para aparecer para clientes, crie um subperfil.", placement: "center" },
  ]},
  { tourKey: "profile", title: "Perfil", description: "Conta principal", version: 1, pagePath: ["/account"], steps: [{ id: "profile-1", target: "[data-tour='sidebar-profile']", title: "Seu espaço principal", content: "Aqui você controla sua presença na Freelandoo.", placement: "right" }] },
  { tourKey: "subprofiles", title: "Subperfis", description: "Vitrines profissionais", version: 1, pagePath: ["/account"], steps: [{ id: "subprofiles-1", title: "Subperfis são suas vitrines", content: "É no subperfil que você vende serviços, produtos e cursos.", placement: "center" }] },
  {
    tourKey: "enxames",
    title: "Vitrine de Enxames",
    description: "Filtros e descoberta na /search",
    version: 1,
    autoStart: true,
    pagePath: ["/search", "/enxame"],
    steps: [
      { id: "search-1", title: "Vitrine de profissionais", content: "Aqui você descobre profissionais de todas as áreas — filtros refinam o que aparece.", placement: "center" },
      { id: "search-2", target: "[data-tour='search-filter-machine']", title: "Filtrar por Enxame", content: "Escolhe a área (Views, Limpeza, Construção, etc.). Define quais profissões aparecem.", placement: "bottom" },
      { id: "search-3", target: "[data-tour='search-filter-profession']", title: "Profissão", content: "Profissão específica dentro do Enxame escolhido. Ative um Enxame primeiro.", placement: "bottom" },
      { id: "search-4", target: "[data-tour='search-filter-city']", title: "Cidade", content: "Estado ou cidade do profissional. Combinável com Enxame e profissão.", placement: "bottom" },
      { id: "search-5", target: "[data-tour='search-filter-level']", title: "Nível mínimo", content: "Filtra por nível de XP. Quanto maior, mais ativo na plataforma.", placement: "bottom" },
      { id: "search-6", target: "[data-tour='search-filter-premium']", title: "Só Premium", content: "Mostra apenas perfis com destaque Premium ativo.", placement: "bottom" },
      { id: "search-7", target: "[data-tour='search-bell']", title: "Notificações", content: "Abre o painel com likes, comentários, follows e mensagens novas.", placement: "left" },
      { id: "search-done", title: "Pronto!", content: "Combine filtros para encontrar exatamente o profissional que você precisa.", placement: "center" },
    ],
  },
  {
    tourKey: "feed",
    title: "Feed",
    description: "Descoberta de conteúdo e stories",
    version: 1,
    autoStart: true,
    pagePath: ["/feed"],
    steps: [
      { id: "feed-1", title: "Seu feed", content: "Aqui aparecem posts dos perfis que você acompanha — fotos, vídeos curtos e atualizações.", placement: "center" },
      { id: "feed-2", target: "[data-tour='feed-filters']", title: "Filtros do feed", content: "Filtre por Enxame ou cidade para refinar o que aparece.", placement: "bottom" },
      { id: "feed-3", target: "[data-tour='feed-bell']", title: "Notificações", content: "Likes, comentários, follows e mensagens novas — tudo aqui.", placement: "left" },
      { id: "feed-done", title: "Boa rolagem!", content: "Curta, comente e siga perfis pra deixar o feed mais relevante.", placement: "center" },
    ],
  },
  {
    tourKey: "messages_private",
    title: "Mensagens",
    description: "Conversas, O.S. e chats ao vivo",
    version: 1,
    autoStart: true,
    pagePath: ["/mensagens"],
    steps: [
      { id: "messages-1", title: "Suas mensagens", content: "Aqui ficam suas conversas privadas, ordens de serviço e chats ao vivo da plataforma.", placement: "center" },
      { id: "messages-2", target: "[data-tour='messages-tab-conv']", title: "Conversas", content: "Mensagens privadas 1-a-1 e grupos. Negociações, combinados e histórico.", placement: "bottom" },
      { id: "messages-3", target: "[data-tour='messages-tab-os']", title: "O.S.", content: "Chats dos seus pedidos de serviço — separados das conversas comuns.", placement: "bottom" },
      { id: "messages-4", target: "[data-tour='messages-tab-global']", title: "Global", content: "Chat ao vivo com até 200 usuários. Mensagens somem após 24h.", placement: "bottom" },
      { id: "messages-5", target: "[data-tour='messages-tab-machine']", title: "Enxames", content: "Chat por área (designers, faxineiros, etc.). Conversa entre quem é do mesmo Enxame.", placement: "bottom" },
      { id: "messages-done", title: "Pronto!", content: "Use a aba certa: privado para combinar trabalho, O.S. para pedidos formais, global/enxames para conhecer pessoas.", placement: "center" },
    ],
  },
  { tourKey: "groups", title: "Grupos", description: "Comunidade", version: 1, pagePath: ["/mensagens"], steps: [{ id: "groups-1", title: "Grupos estilo comunidade", content: "Reúna pessoas por interesse e projeto.", placement: "center" }] },
  { tourKey: "global_chat_rooms", title: "Chat global", description: "Salas em tempo real", version: 1, pagePath: ["/feed", "/search"], steps: [{ id: "chat-1", title: "Chat global e por Enxame", content: "Conversa pública com moderação ativa.", placement: "center" }] },
  { tourKey: "service_orders", title: "Pedido de serviço", description: "O.S.", version: 1, pagePath: ["/pedir-servico"], steps: [{ id: "os-1", title: "Peça um serviço", content: "Descreva a necessidade para receber respostas compatíveis.", placement: "center" }] },
  { tourKey: "courses", title: "Cursos", description: "Monetize conhecimento", version: 1, pagePath: ["/cursos", "/account/courses"], steps: [{ id: "courses-1", title: "Venda conhecimento", content: "Crie módulos, aulas e materiais para gerar renda.", placement: "center" }] },
  { tourKey: "subprofile_store", title: "Loja em subperfil", description: "Vendas no perfil", version: 1, pagePath: ["/account/profile"], steps: [{ id: "store-1", title: "Sua loja dentro do subperfil", content: "Subperfis pagos podem vender produtos no próprio perfil.", placement: "center" }] },
  { tourKey: "products", title: "Produtos", description: "Catálogo e pedidos", version: 1, pagePath: ["/pedir-produto"], steps: [{ id: "products-1", title: "Catálogo e pedidos", content: "Categorias e mural conectam compradores e vendedores.", placement: "center" }] },
  { tourKey: "pollens", title: "Pólens", description: "Energia da plataforma", version: 1, pagePath: ["/loja-polens", "/account"], steps: [{ id: "pollens-1", title: "Pólens são sua energia", content: "Ganhe e use com estratégia para desbloquear vantagens.", placement: "center" }] },
  { tourKey: "manifestations", title: "Manifestações", description: "Banners do perfil", version: 1, pagePath: ["/manifestacao"], steps: [{ id: "manifestations-1", title: "Escolha seu banner", content: "Compre com pólens e personalize seu headcard.", placement: "center" }] },
  { tourKey: "coupons", title: "Cupons", description: "Compartilhamento", version: 1, pagePath: ["/account/afiliado", "/oferta"], steps: [{ id: "coupons-1", title: "Seu cupom acompanha você", content: "Links com cupom podem aplicar vantagens automaticamente.", placement: "center" }] },
  { tourKey: "affiliates", title: "Afiliados", description: "Ganhos por indicação", version: 1, pagePath: ["/account/afiliado"], steps: [{ id: "affiliates-1", title: "Ganhe indicando", content: "Acompanhe cliques, conversões e comissões.", placement: "center" }] },
  { tourKey: "ranking", title: "Ranking", description: "Destaque por atividade", version: 1, pagePath: ["/ranking"], steps: [{ id: "ranking-1", target: "[data-tour='sidebar-ranking']", title: "Ranking mostra quem está ativo", content: "Mais presença aumenta sua chance de destaque.", placement: "right" }] },
  { tourKey: "xp_levels", title: "XP e níveis", description: "Gamificação", version: 1, pagePath: ["/account", "/ranking"], steps: [{ id: "xp-1", title: "Ganhe XP e suba de nível", content: "Atividade real vira evolução visível na plataforma.", placement: "center" }] },
  { tourKey: "premium_highlight", title: "Premium", description: "Mais visibilidade", version: 1, pagePath: ["/search", "/account"], steps: [{ id: "premium-1", title: "Destaque aumenta visibilidade", content: "Combine premium com bom perfil e portfólio.", placement: "center" }] },
  { tourKey: "booking", title: "Booking", description: "Agenda profissional", version: 1, pagePath: ["/account/profile", "/agendamento"], steps: [{ id: "booking-1", title: "Agende atendimentos", content: "Organize horários e evite conversa perdida.", placement: "center" }] },
  { tourKey: "admin", title: "Admin", description: "Gestão da plataforma", version: 1, requiredRole: "admin", pagePath: ["/admin", "/administracao"], steps: [{ id: "admin-1", title: "Painel de controle", content: "Ações administrativas impactam toda a plataforma.", placement: "center" }] },
  { tourKey: "moderation", title: "Moderação", description: "Proteção da comunidade", version: 1, requiredRole: "admin", pagePath: ["/administracao/chat-moderation", "/administracao/blocked-terms"], steps: [{ id: "mod-1", title: "Proteção da comunidade", content: "Denúncias e termos bloqueados ajudam na segurança.", placement: "center" }] },
  { tourKey: "uploads_r2", title: "Upload e R2", description: "Mídia escalável", version: 1, pagePath: ["/account", "/account/courses"], steps: [{ id: "r2-1", title: "Envio de mídia", content: "Arquivos vão para R2 com regras por tipo de upload.", placement: "center" }] },
  { tourKey: "payments", title: "Pagamentos", description: "Checkout seguro", version: 1, pagePath: ["/pagamentos", "/checkout"], steps: [{ id: "payments-1", title: "Checkout protegido", content: "Confirmação acontece no backend com webhooks.", placement: "center" }] },
  { tourKey: "internationalization", title: "Internacionalização", description: "Idioma e país", version: 1, pagePath: ["/feed", "/search"], steps: [{ id: "i18n-1", title: "Escolha idioma e país", content: "A navegação pode ser adaptada ao seu contexto.", placement: "center" }] },
  { tourKey: "notifications", title: "Notificações", description: "Avisos importantes", version: 1, pagePath: ["/notificacoes"], steps: [{ id: "notifications-1", title: "Fique por dentro", content: "Notificações mostram interações e oportunidades.", placement: "center" }] },
  { tourKey: "security", title: "Segurança", description: "Proteção da conta", version: 1, pagePath: ["/account", "/dicas-de-seguranca"], steps: [{ id: "security-1", title: "Segurança da conta", content: "Permissões, supervisão e denúncias protegem a comunidade.", placement: "center" }] },
];
