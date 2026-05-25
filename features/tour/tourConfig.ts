export type TourKey =
  | "welcome"
  | "account_auth"
  | "profile"
  | "subprofiles"
  | "enxames"
  | "feed"
  | "bees_feed"
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
  | "security"
  | "affiliate_path"
  | "explore_path_feed"
  | "explore_path_bees"
  | "explore_path_enxames"
  | "explore_path_ranking"
  | "explore_path_account";

// Encadeamento dos mini-tours "Explorar": ao completar o tour atual, o
// TourProvider faz router.push para a próxima rota e dispara o próximo tour.
// Mantido aqui (e não no TourProvider) para ficar perto da definição dos
// próprios tours — fica óbvio o que vai onde.
export const EXPLORE_CHAIN: Partial<Record<TourKey, { route: string; nextKey: TourKey }>> = {
  explore_path_feed: { route: "/bees", nextKey: "explore_path_bees" },
  explore_path_bees: { route: "/search", nextKey: "explore_path_enxames" },
  explore_path_enxames: { route: "/ranking", nextKey: "explore_path_ranking" },
  explore_path_ranking: { route: "/account", nextKey: "explore_path_account" },
};

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
    version: 2,
    autoStart: true,
    pagePath: ["/search", "/enxame"],
    steps: [
      { id: "search-1", title: "Vitrine da Freelandoo", content: "Aqui você descobre profissionais, produtos e cursos de todas as áreas.", placement: "center" },
      { id: "search-tab-services", target: "[data-tour='search-tab-services']", title: "Aba Serviços", content: "Profissionais por Enxame e profissão para contratar serviços.", placement: "bottom" },
      { id: "search-tab-products", target: "[data-tour='search-tab-products']", title: "Aba Produtos", content: "Produtos à venda na plataforma, filtrados por categoria e cidade.", placement: "bottom" },
      { id: "search-tab-courses", target: "[data-tour='search-tab-courses']", title: "Aba Cursos", content: "Cursos para aprender uma habilidade, filtrados por Enxame e profissão.", placement: "bottom" },
      { id: "search-stories", target: "[data-tour='search-stories-trampo']", title: "Trampos", content: "Stories tipo Trampo: profissionais mostram trabalhos curtos em vídeo (24h). Aparece quem você acompanha.", placement: "bottom" },
      { id: "search-2", target: "[data-tour='search-filter-machine']", title: "Filtrar por Enxame", content: "Escolhe a área (Views, Limpeza, Construção, etc.). Define quais profissões aparecem.", placement: "bottom" },
      { id: "search-3", target: "[data-tour='search-filter-profession']", title: "Profissão", content: "Profissão específica dentro do Enxame escolhido. Ative um Enxame primeiro.", placement: "bottom" },
      { id: "search-4", target: "[data-tour='search-filter-city']", title: "Cidade", content: "Estado ou cidade do profissional. Combinável com Enxame e profissão.", placement: "bottom" },
      { id: "search-5", target: "[data-tour='search-filter-level']", title: "Nível mínimo", content: "Filtra por nível de XP. Quanto maior, mais ativo na plataforma.", placement: "bottom" },
      { id: "search-6", target: "[data-tour='search-filter-premium']", title: "Só Premium", content: "Mostra apenas perfis com destaque Premium ativo.", placement: "bottom" },
      { id: "search-7", target: "[data-tour='search-bell']", title: "Notificações", content: "Abre o painel com likes, comentários, follows e mensagens novas.", placement: "left" },
      { id: "search-chamado", target: "[data-tour='search-open-chamado']", title: "Abrir chamado", content: "Não achou o que queria? Abra um chamado de serviço, produto ou curso — os profissionais compatíveis respondem na aba Solicitações das suas mensagens.", placement: "left" },
      { id: "search-done", title: "Pronto!", content: "Use as abas e os filtros para encontrar exatamente o que precisa.", placement: "center" },
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
      { id: "feed-stories", target: "[data-tour='feed-stories-rest']", title: "Rest stories", content: "Stories tipo Rest: postagens curtas (24h) de quem você acompanha — momentos do dia, bastidores, lazer.", placement: "bottom" },
      { id: "feed-2", target: "[data-tour='feed-filters']", title: "Filtros do feed", content: "Filtre por Enxame ou cidade para refinar o que aparece.", placement: "bottom" },
      { id: "feed-3", target: "[data-tour='feed-bell']", title: "Notificações", content: "Likes, comentários, follows e mensagens novas — tudo aqui.", placement: "left" },
      { id: "feed-report", target: "[data-tour='feed-report']", title: "Denunciar publicação", content: "Conteúdo abusivo, spam ou off-topic? Use a bandeira pra denunciar — a moderação revisa.", placement: "left" },
      { id: "feed-done", title: "Boa rolagem!", content: "Curta, comente e siga perfis pra deixar o feed mais relevante.", placement: "center" },
    ],
  },
  {
    tourKey: "bees_feed",
    title: "Bees",
    description: "Feed vertical 9:16",
    version: 1,
    autoStart: true,
    pagePath: ["/bees"],
    steps: [
      { id: "bees-1", title: "Bees", content: "Feed vertical estilo TikTok — vídeos curtos 9:16 dos perfis da plataforma. Role pra ver o próximo.", placement: "center" },
      { id: "bees-report", target: "[data-tour='bees-report']", title: "Denunciar", content: "Use a bandeira pra denunciar conteúdo abusivo, spam ou off-topic.", placement: "left" },
      { id: "bees-done", title: "Pronto!", content: "Curta, comente, salve e siga. Quanto mais você interage, mais o feed se ajusta ao seu gosto.", placement: "center" },
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
  {
    tourKey: "ranking",
    title: "Ranking",
    description: "Pódio, escopos e níveis de XP",
    version: 1,
    autoStart: true,
    pagePath: ["/ranking"],
    steps: [
      { id: "ranking-1", title: "Os líderes do momento", content: "Quem está dominando a plataforma. Atualiza automaticamente a cada 2 horas.", placement: "center" },
      { id: "ranking-podium", target: "[data-tour='ranking-podium']", title: "Pódio Top 3", content: "Os três líderes do escopo escolhido. Ouro, prata e bronze — quanto mais ativo, mais alto.", placement: "bottom" },
      { id: "ranking-level", target: "[data-tour='ranking-level']", title: "Nível e XP", content: "A posição é definida pelo nível de XP do perfil — somando posts, interações, vendas e ativações. Suba de nível ganhando XP no dia-a-dia da plataforma.", placement: "top" },
      { id: "ranking-scope-general", target: "[data-tour='ranking-scope-general']", title: "Ranking Geral", content: "Top 10 de toda a plataforma — todos os Enxames, profissões e cidades juntos.", placement: "bottom" },
      { id: "ranking-scope-machine", target: "[data-tour='ranking-scope-machine']", title: "Por Enxame", content: "Top 10 dentro de uma área (Views, Construção, Saúde & Beleza, etc.).", placement: "bottom" },
      { id: "ranking-scope-profession", target: "[data-tour='ranking-scope-profession']", title: "Por Profissão", content: "Top 10 de uma profissão específica (editor de vídeo, faxineira, eletricista, etc.).", placement: "bottom" },
      { id: "ranking-scope-city", target: "[data-tour='ranking-scope-city']", title: "Por Cidade", content: "Top 10 de uma cidade ou estado específicos.", placement: "bottom" },
      { id: "ranking-done", title: "Suba no ranking", content: "Para subir: poste, interaja, ative serviços, complete pedidos. Cada ação rende XP.", placement: "center" },
    ],
  },
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

  // ---------------------------------------------------------------------
  // Caminho "Afiliado" — disparado pelo IntentModal quando o usuário
  // escolhe o card Afiliados. 2 passos, ambos em /account: cupom e link
  // do painel dentro do dropside (abre automaticamente entre passos).
  // ---------------------------------------------------------------------
  {
    tourKey: "affiliate_path",
    title: "Caminho do Afiliado",
    description: "Como começar a ganhar indicando pessoas",
    version: 1,
    autoStart: false,
    pagePath: ["/account"],
    steps: [
      {
        id: "affiliate-path-coupon",
        target: "[data-tour='account-coupon']",
        title: "Esse é seu cupom",
        content: "Copie e compartilhe. Quando alguém entrar pelo Freelandoo usando seu cupom, você ganha comissão. Se ainda não tem cupom, clique no botão para gerar.",
        placement: "bottom",
      },
      {
        id: "affiliate-path-panel",
        target: "[data-tour='dropside-earnings']",
        title: "Painel do Afiliado",
        content: "Aqui no menu da conta você acompanha indicações, comissões pendentes e liberadas, e as regras de saque.",
        placement: "right",
        onEnter: "openDropside",
        onLeave: "closeDropside",
      },
    ],
  },

  // ---------------------------------------------------------------------
  // Caminho "Explorar" — 5 mini-tours encadeados. Cada um tem 1 passo
  // centralizado (sem spotlight em elemento específico, pra evitar o
  // problema do revert quando o elemento não existe). O encadeamento
  // entre páginas é feito pelo TourProvider via EXPLORE_CHAIN.
  // ---------------------------------------------------------------------
  {
    tourKey: "explore_path_feed",
    title: "Explorar — Feed",
    description: "Primeira parada da turnê pelas áreas da plataforma",
    version: 1,
    autoStart: false,
    pagePath: ["/feed"],
    steps: [
      {
        id: "explore-path-feed-1",
        title: "O Feed é o ponto de partida",
        content: "Aqui aparecem posts e momentos curtos (Rest) de quem você acompanha. Se algo fugir do tom da comunidade, use a bandeira pra denunciar.",
        placement: "center",
      },
    ],
  },
  {
    tourKey: "explore_path_bees",
    title: "Explorar — Bees",
    description: "Segunda parada da turnê",
    version: 1,
    autoStart: false,
    pagePath: ["/bees"],
    steps: [
      {
        id: "explore-path-bees-1",
        title: "Bees: vídeos curtos, vertical",
        content: "Feed estilo TikTok com vídeos da plataforma — incluindo os Trampos dos profissionais. Role pra descobrir gente nova.",
        placement: "center",
      },
    ],
  },
  {
    tourKey: "explore_path_enxames",
    title: "Explorar — Enxames",
    description: "Terceira parada da turnê",
    version: 1,
    autoStart: false,
    pagePath: ["/search"],
    steps: [
      {
        id: "explore-path-enxames-1",
        title: "Enxames: onde você acha quem precisa",
        content: "Filtre por área, profissão e cidade. Não achou? Clique em 'Abrir chamado' e os profissionais compatíveis te respondem nas Mensagens.",
        placement: "center",
      },
    ],
  },
  {
    tourKey: "explore_path_ranking",
    title: "Explorar — Ranking",
    description: "Quarta parada da turnê",
    version: 1,
    autoStart: false,
    pagePath: ["/ranking"],
    steps: [
      {
        id: "explore-path-ranking-1",
        title: "Ranking: quem tá brilhando",
        content: "Os perfis mais ativos da temporada. Sobe quem posta, interage, vende e completa pedidos — atualiza a cada 2 horas.",
        placement: "center",
      },
    ],
  },
  {
    tourKey: "explore_path_account",
    title: "Explorar — Sua Conta",
    description: "Última parada da turnê",
    version: 1,
    autoStart: false,
    pagePath: ["/account"],
    steps: [
      {
        id: "explore-path-account-1",
        title: "Aqui é onde você decide como ganhar",
        content: "Você pode indicar pessoas (Afiliados), vender cursos, oferecer serviços ou vender produtos. Cada caminho tem seu tour quando você quiser começar.",
        placement: "center",
      },
    ],
  },
];
