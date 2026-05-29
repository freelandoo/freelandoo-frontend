/**
 * Freelandoo Landing — tokens + dados de copy (tema warm-dark, estilo poster).
 *
 * Cores explícitas (o app é dark globalmente). Centraliza paleta, links
 * canônicos e o conteúdo textual para manter os componentes enxutos.
 * Regra de copy (taste skill): proibido travessão (—) em texto visível.
 *
 * NOTA SOBRE FOTOS: os slots de imagem apontam para /landing/*.jpg (ainda não
 * existem). Enquanto o arquivo não estiver em /public/landing, o PhotoFrame
 * mostra um placeholder dourado elegante. Basta soltar as fotos com esses
 * nomes para a página ficar idêntica ao mockup.
 */

export const FL = {
  canvas: "#15120E",
  canvas2: "#1D1914",
  ink: "#F5F1E8",
  gold: "#F2B705",
  goldDeep: "#E0A500",
  muted: "#9A938A",
} as const

/** Links canônicos — NÃO quebrar rotas existentes. */
export const LINKS = {
  cadastro: "/cadastro",
  login: "/login",
  explorar: "/search",
  marketplace: "/search",
  comoFunciona: "/comofunciona",
  cursos: "/cursos",
  feed: "/feed",
  afiliados: "/account",
  precos: "/precos",
  ranking: "/ranking",
  influenciadores: "/search?enxame=influencer",
} as const

export const NAV = [
  { label: "Como funciona", href: LINKS.comoFunciona },
  { label: "Recursos", href: "#recursos" },
  { label: "Para quem é", href: "#caminhos" },
  { label: "Depoimentos", href: "#caminhos" },
  { label: "Preços", href: LINKS.precos },
] as const

/** Cards de estatística flutuantes do hero (brancos). Números ilustrativos. */
export type HeroStat = { id: string; label: string; line: string; value: string; icon: string }
export const HERO_STATS: HeroStat[] = [
  { id: "afiliados", label: "Novos afiliados", line: "todos os dias", value: "127 afiliados hoje", icon: "star" },
  { id: "cursos", label: "Cursos vendidos", line: "Mais de 5.2k por dia", value: "R$ 1.2M faturados", icon: "cap" },
  { id: "produtos", label: "Produtos vendidos", line: "Mais de 12k por dia", value: "R$ 780k faturados", icon: "cart" },
  { id: "comissoes", label: "Comissões pagas", line: "para afiliados", value: "R$ 1.8M só", icon: "wallet" },
]

export type MoneyPath = {
  id: string
  kicker: string
  desc: string
  href: string
  icon: string
  photo: string
}

/** Seção "Escolha seu caminho" — 5 caminhos com foto + ícone dourado. */
export const MONEY_PATHS: MoneyPath[] = [
  { id: "afiliado", kicker: "Afiliado", desc: "Promova e ganhe com produtos, serviços e cursos que você acredita.", href: LINKS.afiliados, icon: "percent", photo: "/landing/path-afiliado.jpg" },
  { id: "cursos", kicker: "Cursos", desc: "Crie e venda seus cursos online com todas as ferramentas que você precisa.", href: LINKS.cursos, icon: "cap", photo: "/landing/path-cursos.jpg" },
  { id: "produtos", kicker: "Produtos", desc: "Venda produtos físicos, digitais e infoprodutos na plataforma.", href: LINKS.cadastro, icon: "bag", photo: "/landing/path-produtos.jpg" },
  { id: "servicos", kicker: "Serviços", desc: "Divulgue seus serviços e conecte-se com clientes que buscam talento.", href: LINKS.cadastro, icon: "briefcase", photo: "/landing/path-servicos.jpg" },
  { id: "influenciador", kicker: "Influenciador", desc: "Monetize sua audiência recomendando o que você acredita.", href: LINKS.influenciadores, icon: "star", photo: "/landing/path-influenciador.jpg" },
]

export type CarouselSlide = {
  n: number
  title: string
  desc: string
  href: string
  cta: string
  metrics: string[]
  photo: string
}

/** Carrossel "Tudo que você precisa para ganhar mais" (setas + dots). */
export const CAROUSEL_SLIDES: CarouselSlide[] = [
  { n: 1, title: "Crie cursos de graça", desc: "Tenha acesso gratuito às ferramentas da Freelandoo e publique seu curso em poucos passos.", href: LINKS.cursos, cta: "Saiba mais", metrics: ["Novos afiliados", "Aulas vistas", "Vendas", "Comissões"], photo: "/landing/car-cursos.jpg" },
  { n: 2, title: "Abra vários perfis", desc: "Marceneiro, professor, vendedor e influenciador na mesma conta, sem complicação.", href: LINKS.cadastro, cta: "Criar conta", metrics: ["Perfis ativos", "Visitas", "Contatos", "Avaliações"], photo: "/landing/car-perfis.jpg" },
  { n: 3, title: "Venda seus serviços", desc: "Sua vitrine aparece para quem procura por cidade, categoria e profissão.", href: LINKS.cadastro, cta: "Oferecer serviço", metrics: ["Visitas", "Contatos", "Orçamentos", "Avaliações"], photo: "/landing/car-servicos.jpg" },
  { n: 4, title: "Monte sua lojinha", desc: "Cadastre produtos, organize a vitrine e acompanhe pedidos e faturamento.", href: LINKS.cadastro, cta: "Abrir loja", metrics: ["Vendas", "Pedidos", "Produtos", "Faturamento"], photo: "/landing/car-loja.jpg" },
  { n: 5, title: "Ganhe como afiliado", desc: "Use cupom ou link para divulgar e receba comissões e recorrentes.", href: LINKS.afiliados, cta: "Ser afiliado", metrics: ["Indicações", "Conversões", "Comissão", "A sacar"], photo: "/landing/car-afiliado.jpg" },
  { n: 6, title: "Receba oportunidades", desc: "Notificações chegam quando existe um chamado compatível com o que você oferece.", href: LINKS.cadastro, cta: "Ativar alertas", metrics: ["Chamados", "Compatíveis", "Respostas", "Fechados"], photo: "/landing/car-oportunidades.jpg" },
  { n: 7, title: "Grave vídeos curtos", desc: "Mostre serviço, produto, bastidores e resultado em vídeos dentro da plataforma.", href: LINKS.feed, cta: "Explorar", metrics: ["Views", "Curtidas", "Salvos", "Contatos"], photo: "/landing/car-videos.jpg" },
  { n: 8, title: "Poste e use stories", desc: "Divulgue agenda aberta, promoções e lançamentos para o seu público.", href: LINKS.feed, cta: "Ver ideias", metrics: ["Alcance", "Cliques", "Salvos", "Vendas"], photo: "/landing/car-posts.jpg" },
  { n: 9, title: "Seja encontrado", desc: "Busca por serviço, curso, produto ou influenciador por nicho e cidade.", href: LINKS.explorar, cta: "Buscar", metrics: ["Buscas", "Cliques", "Perfis", "Contatos"], photo: "/landing/car-busca.jpg" },
  { n: 10, title: "Segurança em primeiro lugar", desc: "Menor só entra com autorização e supervisão do responsável.", href: LINKS.comoFunciona, cta: "Saiba mais", metrics: ["Contas", "Autorizações", "Filtros", "Alertas"], photo: "/landing/car-parental.jpg" },
]

export type BentoKind = "photo" | "saque" | "faturamento" | "comissao" | "video" | "stories" | "avatars" | "search" | "metrics"
export type BentoItem = {
  n: number
  title: string
  desc: string
  cta?: string
  href: string
  kind: BentoKind
  span: number // colunas em lg (grid de 12)
  icon?: string
}

/** Grade numerada 01-13 (bento). `span` = col-span no grid de 12 (lg). */
export const BENTO: BentoItem[] = [
  { n: 1, title: "Vendas fáceis", desc: "Painel completo para acompanhar suas vendas, cliques e comissões em tempo real.", cta: "Saiba mais", href: LINKS.afiliados, kind: "photo", span: 3 },
  { n: 2, title: "Tenha liberdade", desc: "Venda do seu jeito, com estratégia e autonomia para escalar resultados.", cta: "Comece agora", href: LINKS.cadastro, kind: "photo", span: 3 },
  { n: 3, title: "Tenha serviços", desc: "Ofereça seus serviços e conecte-se com clientes que buscam o seu talento.", href: LINKS.cadastro, kind: "metrics", span: 3, icon: "briefcase" },
  { n: 4, title: "Venda produtos", desc: "Venda produtos físicos, digitais e infoprodutos na plataforma.", cta: "Ver produtos", href: LINKS.cadastro, kind: "photo", span: 3 },
  { n: 5, title: "Saque sua liberdade", desc: "Receba comissões com transparência e saque quando quiser, com total segurança.", cta: "Sacar", href: LINKS.afiliados, kind: "saque", span: 4 },
  { n: 6, title: "Construa o que precisar", desc: "Página de vendas, área de membros, cupons e mais. Tudo o que você precisa para vender.", cta: "Saiba mais", href: LINKS.cursos, kind: "metrics", span: 4, icon: "blocks" },
  { n: 7, title: "Seja um criador", desc: "Compartilhe seu conhecimento e transforme sua paixão em fonte de renda real.", href: LINKS.cursos, kind: "avatars", span: 4 },
  { n: 8, title: "Ganhe com o afiliado", desc: "Divulgue produtos e cursos e ganhe comissões e recorrentes.", cta: "Quero ser afiliado", href: LINKS.afiliados, kind: "comissao", span: 4 },
  { n: 9, title: "Vídeos e cursos", desc: "Aprenda, ensine e venda seu conhecimento em vídeos e aulas online.", cta: "Explorar", href: LINKS.cursos, kind: "video", span: 4 },
  { n: 10, title: "Posts & stories", desc: "Compartilhe nas redes e aumente seu alcance como afiliado.", cta: "Ver ideias", href: LINKS.feed, kind: "stories", span: 4 },
  { n: 11, title: "Influenciadores premiados", desc: "Reconhecimento para os que mais vendem e inspiram.", cta: "Ver ranking", href: LINKS.ranking, kind: "photo", span: 4 },
  { n: 12, title: "Encontre influenciadores", desc: "Busque parceiros para divulgar seus produtos e cresça junto.", cta: "Buscar", href: LINKS.influenciadores, kind: "search", span: 4 },
  { n: 13, title: "Controle financeiro", desc: "Acompanhe tudo: suas vendas, saques e comissões.", cta: "Ver finanças", href: LINKS.afiliados, kind: "faturamento", span: 4 },
]

/** Cores dos enxames (espelha globals.css [data-machine]). */
export const ENXAME_COLORS: Record<string, string> = {
  marketing: "#f43f5e", tecnologia: "#3b82f6", transporte: "#f59e0b", artistas: "#a855f7",
  influencer: "#ec4899", servicos_residenciais: "#10b981", construcao: "#f97316", saude: "#06b6d4",
  beleza_bem_estar: "#d946ef", veiculos: "#ef4444", pets: "#22c55e", rural: "#84cc16",
  educacao: "#0ea5e9", eventos: "#eab308", justica: "#6366f1",
}
