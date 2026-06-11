// Onda 7 do i18n (Homepage do vendedor + Ranking): merge de chaves novas em
// messages/{pt-BR,en,es}.json. Idempotente e não-destrutivo: só ADICIONA chaves
// ausentes, nunca sobrescreve.
//
// Namespace "Home": as chaves do tipo `home_seller_*` são keyed PELO SLOT do
// EditableText — o EditableText agora resolve t("Home", slot, fallback), então
// cada slot vira locale-aware sem mexer nas call-sites. As demais chaves (nav*,
// header*, footer*, carousel*, bento*) são texto plano de LandingHeader/Footer/
// FeatureCarousel/FeatureBento (server→client onde precisou).
//
// Namespace "Ranking": /ranking (ranking-page-client + ranking-podium). Enxames
// e profissões continuam via useTaxonomy() (dicts Tax* da Onda 1).
//
// Rodar: node scripts/i18n-onda7-merge.js
const fs = require("fs")
const path = require("path")

const dir = path.join(__dirname, "..", "messages")

const HOME = {
  // ===== Slots do EditableText (auto-traduzidos por slot) =====
  // Hero
  home_seller_hero_headline: ["Venda serviços, cursos, produtos e *ganhe* como afiliado.", "Sell services, courses, products and *earn* as an affiliate.", "Vende servicios, cursos, productos y *gana* como afiliado."],
  home_seller_hero_subcopy: ["A Freelandoo conecta quem quer *ganhar dinheiro* com quem precisa aprender, criar, comprar e empreender. Onde quiser.", "Freelandoo connects people who want to *make money* with those who need to learn, create, buy and build. Anywhere.", "Freelandoo conecta a quien quiere *ganar dinero* con quien necesita aprender, crear, comprar y emprender. Donde quieras."],
  home_seller_hero_cta_primary: ["Começar agora", "Get started", "Empezar ahora"],
  home_seller_hero_cta_secondary: ["Conhecer o marketplace", "Explore the marketplace", "Conocer el marketplace"],
  home_seller_hero_proof_count: ["+10 mil pessoas", "+10k people", "+10 mil personas"],
  home_seller_hero_proof_text: ["já estão ganhando", "are already earning", "ya están ganando"],
  home_seller_hero_sticker: ["comece de graça", "start for free", "empieza gratis"],
  // Hero stats
  home_seller_stat_afiliados_label: ["Novos afiliados", "New affiliates", "Nuevos afiliados"],
  home_seller_stat_afiliados_line: ["todos os dias", "every day", "todos los días"],
  home_seller_stat_afiliados_value: ["127 afiliados hoje", "127 affiliates today", "127 afiliados hoy"],
  home_seller_stat_cursos_label: ["Cursos vendidos", "Courses sold", "Cursos vendidos"],
  home_seller_stat_cursos_line: ["Mais de 5.2k por dia", "Over 5.2k per day", "Más de 5.2k por día"],
  home_seller_stat_cursos_value: ["R$ 1.2M faturados", "R$ 1.2M earned", "R$ 1.2M facturados"],
  home_seller_stat_produtos_label: ["Produtos vendidos", "Products sold", "Productos vendidos"],
  home_seller_stat_produtos_line: ["Mais de 12k por dia", "Over 12k per day", "Más de 12k por día"],
  home_seller_stat_produtos_value: ["R$ 780k faturados", "R$ 780k earned", "R$ 780k facturados"],
  home_seller_stat_comissoes_label: ["Comissões pagas", "Commissions paid", "Comisiones pagadas"],
  home_seller_stat_comissoes_line: ["para afiliados", "to affiliates", "para afiliados"],
  home_seller_stat_comissoes_value: ["R$ 1.8M só", "R$ 1.8M alone", "R$ 1.8M solo"],
  // Caminhos
  home_seller_paths_eyebrow: ["escolha o seu", "choose yours", "elige el tuyo"],
  home_seller_paths_heading: ["Seu caminho dentro da *Freelandoo.*", "Your path inside *Freelandoo.*", "Tu camino dentro de *Freelandoo.*"],
  home_seller_path_afiliado_kicker: ["Afiliado", "Affiliate", "Afiliado"],
  home_seller_path_afiliado_desc: ["Promova e ganhe com produtos, serviços e cursos que você acredita.", "Promote and earn with products, services and courses you believe in.", "Promociona y gana con productos, servicios y cursos en los que crees."],
  home_seller_path_cursos_kicker: ["Cursos", "Courses", "Cursos"],
  home_seller_path_cursos_desc: ["Crie e venda seus cursos online com todas as ferramentas que você precisa.", "Create and sell your online courses with all the tools you need.", "Crea y vende tus cursos online con todas las herramientas que necesitas."],
  home_seller_path_produtos_kicker: ["Produtos", "Products", "Productos"],
  home_seller_path_produtos_desc: ["Venda produtos físicos, digitais e infoprodutos na plataforma.", "Sell physical, digital products and infoproducts on the platform.", "Vende productos físicos, digitales e infoproductos en la plataforma."],
  home_seller_path_servicos_kicker: ["Serviços", "Services", "Servicios"],
  home_seller_path_servicos_desc: ["Divulgue seus serviços e conecte-se com clientes que buscam talento.", "Showcase your services and connect with clients looking for talent.", "Difunde tus servicios y conéctate con clientes que buscan talento."],
  home_seller_path_influenciador_kicker: ["Influenciador", "Influencer", "Influencer"],
  home_seller_path_influenciador_desc: ["Monetize sua audiência recomendando o que você acredita.", "Monetize your audience by recommending what you believe in.", "Monetiza tu audiencia recomendando lo que crees."],
  home_seller_path_cta: ["Começar", "Start", "Empezar"],
  // Carrossel
  home_seller_carousel_eyebrow: ["é rápido e fácil", "it's quick and easy", "es rápido y fácil"],
  home_seller_carousel_heading: ["Tudo que você precisa para *ganhar mais.*", "Everything you need to *earn more.*", "Todo lo que necesitas para *ganar más.*"],
  // Bento (eyebrow/heading)
  home_seller_bento_eyebrow: ["tudo num lugar só", "all in one place", "todo en un solo lugar"],
  home_seller_bento_heading: ["Vender, ensinar, *aprender e ganhar.*", "Sell, teach, *learn and earn.*", "Vender, enseñar, *aprender y ganar.*"],
  // CTA final
  home_seller_final_headline: ["Serviços, cursos, produtos, afiliados, influenciadores e oportunidades. *Tudo em um só lugar.*", "Services, courses, products, affiliates, influencers and opportunities. *All in one place.*", "Servicios, cursos, productos, afiliados, influencers y oportunidades. *Todo en un solo lugar.*"],
  home_seller_final_subcopy: ["A Freelandoo é para quem quer vender, ensinar, aprender e ganhar mais todos os dias.", "Freelandoo is for those who want to sell, teach, learn and earn more every day.", "Freelandoo es para quien quiere vender, enseñar, aprender y ganar más cada día."],
  home_seller_final_cta: ["Entrar na Freelandoo e começar agora", "Join Freelandoo and start now", "Entra en Freelandoo y empieza ahora"],

  // ===== Texto plano (header / footer / controles) =====
  // Nav (compartilhado header + footer)
  navComoFunciona: ["Como funciona", "How it works", "Cómo funciona"],
  navRecursos: ["Recursos", "Features", "Recursos"],
  navParaQuemE: ["Para quem é", "Who it's for", "Para quién es"],
  navDepoimentos: ["Depoimentos", "Testimonials", "Testimonios"],
  navPrecos: ["Preços", "Pricing", "Precios"],
  navMarketplace: ["Marketplace", "Marketplace", "Marketplace"],
  // Header
  headerEntrar: ["Entrar", "Log in", "Entrar"],
  headerComeceAgora: ["Comece agora", "Get started", "Empieza ahora"],
  headerHomeAria: ["Freelandoo, página inicial", "Freelandoo, home page", "Freelandoo, página de inicio"],
  headerOpenMenu: ["Abrir menu", "Open menu", "Abrir menú"],
  headerCloseMenu: ["Fechar menu", "Close menu", "Cerrar menú"],
  // Carrossel — controles e textos alternativos
  carouselPrev: ["Banner anterior", "Previous banner", "Banner anterior"],
  carouselNext: ["Próximo banner", "Next banner", "Banner siguiente"],
  carouselGoTo: ["Ir para o banner {n}", "Go to banner {n}", "Ir al banner {n}"],
  carouselAlt1: ["Crie e gerencie sua conta na Freelandoo", "Create and manage your account on Freelandoo", "Crea y gestiona tu cuenta en Freelandoo"],
  carouselAlt2: ["Crie sua lojinha na Freelandoo", "Create your shop on Freelandoo", "Crea tu tienda en Freelandoo"],
  carouselAlt3: ["Crie e venda cursos de graça na Freelandoo", "Create and sell courses for free on Freelandoo", "Crea y vende cursos gratis en Freelandoo"],
  carouselAlt4: ["Seja afiliado e compartilhe conteúdo na Freelandoo", "Become an affiliate and share content on Freelandoo", "Sé afiliado y comparte contenido en Freelandoo"],
  carouselAlt5: ["Poste vídeos e stories que vendem na Freelandoo", "Post videos and stories that sell on Freelandoo", "Publica videos y stories que venden en Freelandoo"],
  // Bento — títulos / descrições / CTAs (01–13)
  bento1Title: ["Vendas fáceis", "Easy sales", "Ventas fáciles"],
  bento1Desc: ["Painel completo para acompanhar suas vendas, cliques e comissões em tempo real.", "A complete dashboard to track your sales, clicks and commissions in real time.", "Panel completo para seguir tus ventas, clics y comisiones en tiempo real."],
  bento1Cta: ["Saiba mais", "Learn more", "Saber más"],
  bento2Title: ["Tenha liberdade", "Get freedom", "Ten libertad"],
  bento2Desc: ["Venda do seu jeito, com estratégia e autonomia para escalar resultados.", "Sell your way, with strategy and autonomy to scale results.", "Vende a tu manera, con estrategia y autonomía para escalar resultados."],
  bento2Cta: ["Comece agora", "Get started", "Empieza ahora"],
  bento3Title: ["Tenha serviços", "Offer services", "Ten servicios"],
  bento3Desc: ["Ofereça seus serviços e conecte-se com clientes que buscam o seu talento.", "Offer your services and connect with clients looking for your talent.", "Ofrece tus servicios y conéctate con clientes que buscan tu talento."],
  bento4Title: ["Venda produtos", "Sell products", "Vende productos"],
  bento4Desc: ["Venda produtos físicos, digitais e infoprodutos na plataforma.", "Sell physical, digital products and infoproducts on the platform.", "Vende productos físicos, digitales e infoproductos en la plataforma."],
  bento4Cta: ["Ver produtos", "View products", "Ver productos"],
  bento5Title: ["Saque sua liberdade", "Cash out your freedom", "Retira tu libertad"],
  bento5Desc: ["Receba comissões com transparência e saque quando quiser, com total segurança.", "Receive commissions with transparency and withdraw whenever you want, fully secure.", "Recibe comisiones con transparencia y retira cuando quieras, con total seguridad."],
  bento5Cta: ["Sacar", "Withdraw", "Retirar"],
  bento6Title: ["Construa o que precisar", "Build whatever you need", "Construye lo que necesites"],
  bento6Desc: ["Página de vendas, área de membros, cupons e mais. Tudo o que você precisa para vender.", "Sales page, members area, coupons and more. Everything you need to sell.", "Página de ventas, área de miembros, cupones y más. Todo lo que necesitas para vender."],
  bento6Cta: ["Saiba mais", "Learn more", "Saber más"],
  bento7Title: ["Seja um criador", "Be a creator", "Sé un creador"],
  bento7Desc: ["Compartilhe seu conhecimento e transforme sua paixão em fonte de renda real.", "Share your knowledge and turn your passion into a real income source.", "Comparte tu conocimiento y convierte tu pasión en una fuente de ingresos real."],
  bento8Title: ["Ganhe com o afiliado", "Earn as an affiliate", "Gana como afiliado"],
  bento8Desc: ["Divulgue produtos e cursos e ganhe comissões e recorrentes.", "Promote products and courses and earn commissions and recurring income.", "Difunde productos y cursos y gana comisiones e ingresos recurrentes."],
  bento8Cta: ["Quero ser afiliado", "I want to be an affiliate", "Quiero ser afiliado"],
  bento9Title: ["Vídeos e cursos", "Videos and courses", "Videos y cursos"],
  bento9Desc: ["Aprenda, ensine e venda seu conhecimento em vídeos e aulas online.", "Learn, teach and sell your knowledge in videos and online classes.", "Aprende, enseña y vende tu conocimiento en videos y clases online."],
  bento9Cta: ["Explorar", "Explore", "Explorar"],
  bento10Title: ["Posts & stories", "Posts & stories", "Posts y stories"],
  bento10Desc: ["Compartilhe nas redes e aumente seu alcance como afiliado.", "Share on social and grow your reach as an affiliate.", "Comparte en redes y aumenta tu alcance como afiliado."],
  bento10Cta: ["Ver ideias", "See ideas", "Ver ideas"],
  bento11Title: ["Influenciadores premiados", "Award-winning influencers", "Influencers premiados"],
  bento11Desc: ["Reconhecimento para os que mais vendem e inspiram.", "Recognition for those who sell and inspire the most.", "Reconocimiento para los que más venden e inspiran."],
  bento11Cta: ["Ver ranking", "See ranking", "Ver ranking"],
  bento12Title: ["Encontre influenciadores", "Find influencers", "Encuentra influencers"],
  bento12Desc: ["Busque parceiros para divulgar seus produtos e cresça junto.", "Find partners to promote your products and grow together.", "Busca socios para promocionar tus productos y crece junto a ellos."],
  bento12Cta: ["Buscar", "Search", "Buscar"],
  bento13Title: ["Controle financeiro", "Financial control", "Control financiero"],
  bento13Desc: ["Acompanhe tudo: suas vendas, saques e comissões.", "Track everything: your sales, withdrawals and commissions.", "Sigue todo: tus ventas, retiros y comisiones."],
  bento13Cta: ["Ver finanças", "View finances", "Ver finanzas"],
  // Bento — visuais ilustrativos
  bentoVSaldo: ["Saldo disponível", "Available balance", "Saldo disponible"],
  bentoVMonth: ["+12% no mês", "+12% this month", "+12% en el mes"],
  bentoVFaturamento: ["Faturamento aprovado", "Approved revenue", "Facturación aprobada"],
  bentoVAnalise: ["Em análise", "Under review", "En análisis"],
  bentoVSejaAfiliado: ["Seja um afiliado", "Become an affiliate", "Sé un afiliado"],
  bentoVAte70: ["até 70%", "up to 70%", "hasta 70%"],
  bentoVCriadores: ["+999 criadores", "+999 creators", "+999 creadores"],
  bentoVResultados: ["+999 resultados", "+999 results", "+999 resultados"],
  bentoVPronto: ["Pronto para usar", "Ready to use", "Listo para usar"],
  bentoVSearchMarketing: ["Marketing", "Marketing", "Marketing"],
  bentoVSearchSaude: ["Saúde, fitness", "Health, fitness", "Salud, fitness"],
  bentoVSearchCripto: ["Cripto, investimentos", "Crypto, investing", "Cripto, inversiones"],
  // Footer
  footerColNavegar: ["Navegue", "Browse", "Navega"],
  footerColSuporte: ["Suporte", "Support", "Soporte"],
  footerColSobre: ["Sobre", "About", "Sobre"],
  footerCentralAjuda: ["Central de ajuda", "Help center", "Centro de ayuda"],
  footerContato: ["Contato", "Contact", "Contacto"],
  footerSeguranca: ["Segurança", "Security", "Seguridad"],
  footerGarantia: ["Garantia", "Guarantee", "Garantía"],
  footerQuemSomos: ["Quem somos", "About us", "Quiénes somos"],
  footerBlog: ["Blog", "Blog", "Blog"],
  footerCarreiras: ["Carreiras", "Careers", "Carreras"],
  footerImprensa: ["Imprensa", "Press", "Prensa"],
  footerBandVenda: ["Venda", "Sell", "Vende"],
  footerBandEnsine: ["Ensine", "Teach", "Enseña"],
  footerBandAprenda: ["Aprenda", "Learn", "Aprende"],
  footerBandGanhe: ["Ganhe", "Earn", "Gana"],
  footerHeadlinePre: ["Sua próxima ", "Your next ", "Tu próxima "],
  footerHeadlineHighlight: ["renda", "income", "renta"],
  footerHeadlinePost: [" começa aqui.", " starts here.", " empieza aquí."],
  footerCta: ["Começar agora", "Get started", "Empieza ahora"],
  footerDescription: ["A plataforma de negócios digitais completa para você vender, ensinar, aprender e ganhar mais todos os dias.", "The complete digital business platform for you to sell, teach, learn and earn more every day.", "La plataforma de negocios digitales completa para que vendas, enseñes, aprendas y ganes más cada día."],
  footerSigaFreelandoo: ["Siga a Freelandoo", "Follow Freelandoo", "Sigue a Freelandoo"],
  footerBaixeApp: ["Baixe o app", "Get the app", "Descarga la app"],
  footerPwaNote: ["Acesse pelo navegador ou instale como app (PWA)", "Use it in the browser or install as an app (PWA)", "Accede desde el navegador o instálala como app (PWA)"],
  footerCopyright: ["Todos os direitos reservados.", "All rights reserved.", "Todos los derechos reservados."],
  footerTermos: ["Termos", "Terms", "Términos"],
  footerPrivacidade: ["Privacidade", "Privacy", "Privacidad"],
  footerCookies: ["Cookies", "Cookies", "Cookies"],
  footerMenores: ["Menores", "Minors", "Menores"],
}

const RANKING = {
  scopeGeral: ["Geral", "Overall", "General"],
  scopeEnxame: ["Enxame", "Swarm", "Enjambre"],
  scopeProfissao: ["Profissão", "Profession", "Profesión"],
  scopeRegiao: ["Região", "Region", "Región"],
  scopeBrasil: ["Brasil", "Brazil", "Brasil"],
  badgeRanking: ["Ranking Freelandoo", "Freelandoo Ranking", "Ranking Freelandoo"],
  updatesEvery2h: ["atualiza a cada 2h", "updates every 2h", "se actualiza cada 2h"],
  heroLine1: ["Os líderes", "The leaders", "Los líderes"],
  heroLine2: ["do momento.", "of the moment.", "del momento."],
  heroParaPre: ["Na Freelandoo, ", "On Freelandoo, ", "En Freelandoo, "],
  heroParaHighlight: ["aparecer é subir.", "showing up is rising.", "aparecer es subir."],
  heroParaPost: [" Pontos, avaliações e presença definem quem domina o ranking. Inspire-se e suba mais.", " Points, ratings and presence define who dominates the ranking. Get inspired and climb higher.", " Puntos, valoraciones y presencia definen quién domina el ranking. Inspírate y sube más."],
  professionPlaceholder: ["Profissão", "Profession", "Profesión"],
  regionPlaceholder: ["Região", "Region", "Región"],
  podiumEyebrow: ["o topo da temporada", "the top of the season", "la cima de la temporada"],
  podiumHeading: ["O pódio.", "The podium.", "El podio."],
  top3: ["Top 3", "Top 3", "Top 3"],
  listHeading: ["A lista inteira", "The full list", "La lista completa"],
  top10: ["Top 10", "Top 10", "Top 10"],
  allShownOnPodium: ["O pódio já mostra todos os colocados.", "The podium already shows everyone.", "El podio ya muestra a todos."],
  loadError: ["Erro ao carregar ranking", "Error loading ranking", "Error al cargar el ranking"],
  badgeClan: ["Clan", "Clan", "Clan"],
  badgePerfil: ["Perfil", "Profile", "Perfil"],
  levelPrefix: ["Lv.", "Lv.", "Nv."],
  pontos: ["pontos", "points", "puntos"],
  metaFallback: ["Perfil Freelandoo", "Freelandoo profile", "Perfil Freelandoo"],
  emptyTitle: ["Ninguém no ranking ainda.", "Nobody in the ranking yet.", "Nadie en el ranking todavía."],
  emptyDesc: ["Assim que houver dados suficientes, o top 10 aparece aqui.", "As soon as there's enough data, the top 10 shows up here.", "En cuanto haya datos suficientes, el top 10 aparecerá aquí."],
  errorTitle: ["Não deu pra carregar.", "Couldn't load.", "No se pudo cargar."],
}

const GROUPS = { Home: HOME, Ranking: RANKING }

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
