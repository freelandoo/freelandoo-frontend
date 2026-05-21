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
    description: "Tour inicial da Colmeia",
    version: 1,
    autoStart: true,
    pagePath: ["/account", "/feed", "/search"],
    steps: [
      { id: "welcome-1", title: "Bem-vindo à Freelandoo", content: "Aqui você cria presença, vende serviços, divulga produtos, cursos e cresce na plataforma.", placement: "center" },
      { id: "welcome-2", title: "Sua conta principal", content: "Sua conta controla tudo, mas não vende serviços diretamente.", placement: "center" },
      { id: "welcome-3", title: "Crie subperfis para vender", content: "Para aparecer para clientes e vender, use subperfis profissionais.", placement: "center" },
      { id: "welcome-4", target: "[data-tour='sidebar-enxames']", title: "Entre no Enxame certo", content: "Os Enxames organizam profissionais por área.", placement: "right" },
      { id: "welcome-5", title: "Use seus pólens", content: "Pólens desbloqueiam banners, vantagens e recursos.", placement: "center" },
      { id: "welcome-6", target: "[data-tour='sidebar-feed']", title: "Movimente seu perfil", content: "Posts, interações e XP ajudam no ranking e na descoberta.", placement: "right" },
      { id: "welcome-7", target: "[data-tour='sidebar-profile']", title: "Comece pelo seu primeiro subperfil", content: "Crie ou complete um subperfil para entrar no jogo.", placement: "right" },
      { id: "welcome-8", target: "[data-tour='dropside-account']", title: "Sua conta", content: "Aqui você acessa a visão geral da sua conta — perfis, clans, pólens e XP.", placement: "right", onEnter: "openDropside" },
      { id: "welcome-9", target: "[data-tour='dropside-payments']", title: "Pagamentos e assinaturas", content: "Histórico de cobranças, assinaturas dos subperfis e reembolsos.", placement: "right" },
      { id: "welcome-10", title: "Pronto!", content: "Você pode refazer este tour a qualquer momento pela Central de Ajuda em Configurações.", placement: "center", onLeave: "closeDropside" },
    ],
  },
  { tourKey: "account_auth", title: "Conta e Autenticação", description: "Segurança e conta-base", version: 1, pagePath: ["/account", "/login", "/cadastro"], steps: [
    { id: "account-1", title: "Sua conta-base", content: "Essa é sua conta principal na Freelandoo. Ela guarda dados, pólens, cupons e configurações.", placement: "center" },
    { id: "account-2", title: "Segurança primeiro", content: "Mantenha e-mail verificado e dados atualizados para proteger sua conta.", placement: "center" },
    { id: "account-3", title: "A conta não é vitrine", content: "Para aparecer para clientes, crie um subperfil.", placement: "center" },
  ]},
  { tourKey: "profile", title: "Perfil", description: "Conta principal", version: 1, pagePath: ["/account"], steps: [{ id: "profile-1", target: "[data-tour='sidebar-profile']", title: "Seu espaço principal", content: "Aqui você controla sua presença na Freelandoo.", placement: "right" }] },
  { tourKey: "subprofiles", title: "Subperfis", description: "Vitrines profissionais", version: 1, pagePath: ["/account"], steps: [{ id: "subprofiles-1", title: "Subperfis são suas vitrines", content: "É no subperfil que você vende serviços, produtos e cursos.", placement: "center" }] },
  { tourKey: "enxames", title: "Enxames", description: "Vitrine por áreas", version: 1, pagePath: ["/search", "/enxame"], steps: [{ id: "enxames-1", target: "[data-tour='sidebar-enxames']", title: "Enxames organizam profissionais", content: "Escolha Enxame e profissão para ser encontrado por clientes.", placement: "right" }] },
  { tourKey: "feed", title: "Feed", description: "Conteúdo e descoberta", version: 1, pagePath: ["/feed"], steps: [{ id: "feed-1", target: "[data-tour='sidebar-feed']", title: "O feed movimenta a plataforma", content: "Publicar com qualidade aumenta sua presença.", placement: "right" }] },
  { tourKey: "messages_private", title: "Mensagens privadas", description: "Conversa 1:1", version: 1, pagePath: ["/mensagens"], steps: [{ id: "messages-1", target: "[data-tour='sidebar-messages']", title: "Converse direto", content: "Use o privado para negociar e manter histórico.", placement: "right" }] },
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
