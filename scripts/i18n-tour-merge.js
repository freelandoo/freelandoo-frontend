// Namespace "Tour" — tour de boas-vindas (/bem-vindo). Textos editáveis pelo
// admin via site-texts; estes são os fallbacks i18n (3 idiomas). Idempotente,
// fill-if-absent. Rodar: node scripts/i18n-tour-merge.js
const fs = require("fs")
const path = require("path")

const dir = path.join(__dirname, "..", "messages")

const TOUR = {
  // UI
  eyebrow: ["Bem-vindo à Freelandoo", "Welcome to Freelandoo", "Bienvenido a Freelandoo"],
  headlinePrefix: ["Um tour", "A quick", "Un tour"],
  headlineHighlight: ["rápido", "tour", "rápido"],
  uiStep: ["Passo {step} de {total}", "Step {step} of {total}", "Paso {step} de {total}"],
  uiBack: ["Voltar", "Back", "Volver"],
  uiSkip: ["Pular tour", "Skip tour", "Saltar tour"],
  uiNext: ["Avançar", "Next", "Siguiente"],
  uiFinish: ["Começar a usar", "Start using", "Empezar a usar"],

  // Títulos das telas
  tour_toolbar_title: ["A barra de ferramentas", "The toolbar", "La barra de herramientas"],
  tour_messages_title: ["Mensagens", "Messages", "Mensajes"],
  tour_chats_title: ["Chats e Ordens de Serviço (O.S.)", "Chats and Service Orders", "Chats y Órdenes de Servicio"],
  tour_account_title: ["Sua conta", "Your account", "Tu cuenta"],
  tour_wallet_title: ["Carteira", "Wallet", "Billetera"],
  tour_shop_title: ["Cursos e Produtos", "Courses and Products", "Cursos y Productos"],
  tour_community_title: ["Comunidades", "Communities", "Comunidades"],

  // Tela 1 — Toolbar
  tour_toolbar_feed: [
    "Feed — o que rola na sua rede: posts e bees de quem você segue.",
    "Feed — what's happening in your network: posts and bees from people you follow.",
    "Feed — lo que pasa en tu red: posts y bees de quienes sigues.",
  ],
  tour_toolbar_bees: [
    "Bees — vídeos curtos em tela cheia, no embalo dos reels.",
    "Bees — short full-screen videos, reels-style.",
    "Bees — videos cortos a pantalla completa, estilo reels.",
  ],
  tour_toolbar_enxames: [
    "Enxames — a vitrine: busque profissionais, produtos e cursos por região.",
    "Swarms — the marketplace: find professionals, products and courses by region.",
    "Enjambres — la vitrina: busca profesionales, productos y cursos por región.",
  ],
  tour_toolbar_mensagens: [
    "Mensagens — suas conversas e pedidos (O.S.) num lugar só.",
    "Messages — your chats and service orders in one place.",
    "Mensajes — tus conversaciones y pedidos en un solo lugar.",
  ],
  tour_toolbar_ranking: [
    "Ranking — sua posição na temporada; suba postando e engajando.",
    "Ranking — your spot this season; climb by posting and engaging.",
    "Ranking — tu posición en la temporada; sube publicando e interactuando.",
  ],
  tour_toolbar_conta: [
    "Conta — sua foto abre o menu: perfis, carteira e configurações.",
    "Account — your photo opens the menu: profiles, wallet and settings.",
    "Cuenta — tu foto abre el menú: perfiles, billetera y ajustes.",
  ],

  // Tela 2 — Mensagens
  tour_messages_list: [
    "Lista de conversas — toque para abrir e responder.",
    "Conversation list — tap to open and reply.",
    "Lista de conversaciones — toca para abrir y responder.",
  ],
  tour_messages_tabs: [
    "Abas e filtros separam conversas diretas dos pedidos.",
    "Tabs and filters split direct chats from orders.",
    "Pestañas y filtros separan los chats directos de los pedidos.",
  ],
  tour_messages_unread: [
    "As bolinhas mostram o que está sem ler em cada conversa.",
    "The dots show what's unread in each conversation.",
    "Los puntos muestran lo no leído en cada conversación.",
  ],

  // Tela 3 — Chats / O.S.
  tour_chats_os: [
    "Cada pedido de serviço vira uma O.S. com seu próprio chat.",
    "Each service request becomes an order with its own chat.",
    "Cada pedido de servicio se vuelve una orden con su propio chat.",
  ],
  tour_chats_groups: [
    "Chats em grupo de comunidades também ficam aqui.",
    "Community group chats live here too.",
    "Los chats grupales de comunidades también están aquí.",
  ],
  tour_chats_status: [
    "Acompanhe o andamento do pedido direto na conversa.",
    "Track the order's progress right in the chat.",
    "Sigue el avance del pedido directo en el chat.",
  ],

  // Tela 4 — Conta
  tour_account_tabs: [
    "Abas do seu hub: Portfólio, Bees, Cursos, Salvos e Perfis.",
    "Your hub tabs: Portfolio, Bees, Courses, Saved and Profiles.",
    "Pestañas de tu hub: Portafolio, Bees, Cursos, Guardados y Perfiles.",
  ],
  tour_account_profiles: [
    "Crie e alterne entre subperfis profissionais.",
    "Create and switch between professional sub-profiles.",
    "Crea y alterna entre subperfiles profesionales.",
  ],
  tour_account_menu: [
    "O menu lateral dá acesso rápido a tudo da conta.",
    "The side menu gives quick access to everything in your account.",
    "El menú lateral da acceso rápido a todo en tu cuenta.",
  ],

  // Tela 5 — Carteira
  tour_wallet_extrato: [
    "Seus ganhos reais por subperfil, com gráfico por período.",
    "Your real earnings per sub-profile, with a chart by period.",
    "Tus ganancias reales por subperfil, con gráfico por período.",
  ],
  tour_wallet_market: [
    "Um resumo do mercado (ações e cripto) para acompanhar.",
    "A market snapshot (stocks and crypto) to keep an eye on.",
    "Un resumen del mercado (acciones y cripto) para seguir.",
  ],
  tour_wallet_payouts: [
    "Acompanhe saldos e repasses dos seus recebimentos.",
    "Track balances and payouts of what you receive.",
    "Sigue saldos y transferencias de lo que recibes.",
  ],

  // Tela 6 — Cursos & Produtos
  tour_shop_courses: [
    "Crie e venda cursos com módulos, aulas e quizzes.",
    "Create and sell courses with modules, lessons and quizzes.",
    "Crea y vende cursos con módulos, clases y cuestionarios.",
  ],
  tour_shop_products: [
    "Venda produtos físicos com frete e etiqueta automáticos.",
    "Sell physical products with automatic shipping and labels.",
    "Vende productos físicos con envío y etiqueta automáticos.",
  ],
  tour_shop_manage: [
    "Gerencie vendas, alunos e estoque pela sua conta.",
    "Manage sales, students and stock from your account.",
    "Gestiona ventas, alumnos y stock desde tu cuenta.",
  ],

  // Tela 7 — Comunidade
  tour_community_feed: [
    "Um feed coletivo onde os membros postam juntos.",
    "A collective feed where members post together.",
    "Un feed colectivo donde los miembros publican juntos.",
  ],
  tour_community_ranking: [
    "Ranking interno e benchmark entre comunidades.",
    "Internal ranking and benchmark across communities.",
    "Ranking interno y benchmark entre comunidades.",
  ],
  tour_community_goal: [
    "Metas e temporadas mobilizam o grupo.",
    "Goals and seasons rally the group.",
    "Metas y temporadas movilizan al grupo.",
  ],
  tour_community_recados: [
    "Recados rápidos e o mural do líder.",
    "Quick notes and the leader's board.",
    "Recados rápidos y el muro del líder.",
  ],
}

// Link "Rever tour" no menu da conta (ns Nav).
const NAV = {
  reviewTour: ["Rever tour", "Review tour", "Repasar tour"],
}

const GROUPS = { Tour: TOUR, Nav: NAV }

function load(file) {
  return JSON.parse(fs.readFileSync(path.join(dir, file), "utf8"))
}
function save(file, obj) {
  fs.writeFileSync(path.join(dir, file), JSON.stringify(obj, null, 2) + "\n", "utf8")
}
function fill(target, ns, key, val) {
  if (!target[ns]) target[ns] = {}
  if (!(key in target[ns])) {
    target[ns][key] = val
    return 1
  }
  return 0
}

for (const [file, idx] of [["pt-BR.json", 0], ["en.json", 1], ["es.json", 2]]) {
  const d = load(file)
  let added = 0
  for (const [ns, group] of Object.entries(GROUPS)) {
    for (const [k, vals] of Object.entries(group)) added += fill(d, ns, k, vals[idx])
  }
  save(file, d)
  console.log(`${file}: +${added} chaves`)
}
