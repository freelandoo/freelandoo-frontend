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

// `k` = chave i18n no namespace "Home" (fallback = label pt).
export const NAV = [
  { label: "Como funciona", href: LINKS.comoFunciona, k: "navComoFunciona" },
  { label: "Recursos", href: "#recursos", k: "navRecursos" },
  { label: "Para quem é", href: "#caminhos", k: "navParaQuemE" },
  { label: "Depoimentos", href: "#caminhos", k: "navDepoimentos" },
  { label: "Preços", href: LINKS.precos, k: "navPrecos" },
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
  { id: "afiliado", kicker: "Afiliado", desc: "Promova e ganhe com produtos, serviços e cursos que você acredita.", href: LINKS.afiliados, icon: "percent", photo: "/landing/path-afiliado.png" },
  { id: "cursos", kicker: "Cursos", desc: "Crie e venda seus cursos online com todas as ferramentas que você precisa.", href: LINKS.cursos, icon: "cap", photo: "/landing/path-cursos.png" },
  { id: "produtos", kicker: "Produtos", desc: "Venda produtos físicos, digitais e infoprodutos na plataforma.", href: LINKS.cadastro, icon: "bag", photo: "/landing/path-produtos.png" },
  { id: "servicos", kicker: "Serviços", desc: "Divulgue seus serviços e conecte-se com clientes que buscam talento.", href: LINKS.cadastro, icon: "briefcase", photo: "/landing/path-servicos.png" },
  { id: "influenciador", kicker: "Influenciador", desc: "Monetize sua audiência recomendando o que você acredita.", href: LINKS.influenciadores, icon: "star", photo: "/landing/path-influenciador.png" },
]

export type CarouselSlide = {
  n: number
  img: string
  alt: string
  href: string
}

/** Carrossel da 3ª seção — só banners (18:7), sem tipografia. Setas + dots.
   Imagens em /public/landing (banner-3-1..5.png), proporção 2011x782 = 18:7. */
export const CAROUSEL_SLIDES: CarouselSlide[] = [
  { n: 1, img: "/landing/banner-3-1.png", alt: "Crie e gerencie sua conta na Freelandoo", href: LINKS.cadastro },
  { n: 2, img: "/landing/banner-3-2.png", alt: "Crie sua lojinha na Freelandoo", href: LINKS.cadastro },
  { n: 3, img: "/landing/banner-3-3.png", alt: "Crie e venda cursos de graça na Freelandoo", href: LINKS.cursos },
  { n: 4, img: "/landing/banner-3-4.png", alt: "Seja afiliado e compartilhe conteúdo na Freelandoo", href: LINKS.afiliados },
  { n: 5, img: "/landing/banner-3-5.png", alt: "Poste vídeos e stories que vendem na Freelandoo", href: LINKS.feed },
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
  photo?: string // imagem real para os visuais photo/video/stories
}

/** Grade numerada 01-13 (bento). `span` = col-span no grid de 12 (lg). */
export const BENTO: BentoItem[] = [
  { n: 1, title: "Vendas fáceis", desc: "Painel completo para acompanhar suas vendas, cliques e comissões em tempo real.", cta: "Saiba mais", href: LINKS.afiliados, kind: "photo", span: 3, photo: "/landing/bento-1.png" },
  { n: 2, title: "Tenha liberdade", desc: "Venda do seu jeito, com estratégia e autonomia para escalar resultados.", cta: "Comece agora", href: LINKS.cadastro, kind: "photo", span: 3, photo: "/landing/bento-2.png" },
  { n: 3, title: "Tenha serviços", desc: "Ofereça seus serviços e conecte-se com clientes que buscam o seu talento.", href: LINKS.cadastro, kind: "metrics", span: 3, icon: "briefcase" },
  { n: 4, title: "Venda produtos", desc: "Venda produtos físicos, digitais e infoprodutos na plataforma.", cta: "Ver produtos", href: LINKS.cadastro, kind: "photo", span: 3, photo: "/landing/bento-4.png" },
  { n: 5, title: "Saque sua liberdade", desc: "Receba comissões com transparência e saque quando quiser, com total segurança.", cta: "Sacar", href: LINKS.afiliados, kind: "saque", span: 4 },
  { n: 6, title: "Construa o que precisar", desc: "Página de vendas, área de membros, cupons e mais. Tudo o que você precisa para vender.", cta: "Saiba mais", href: LINKS.cursos, kind: "metrics", span: 4, icon: "blocks" },
  { n: 7, title: "Seja um criador", desc: "Compartilhe seu conhecimento e transforme sua paixão em fonte de renda real.", href: LINKS.cursos, kind: "avatars", span: 4 },
  { n: 8, title: "Ganhe com o afiliado", desc: "Divulgue produtos e cursos e ganhe comissões e recorrentes.", cta: "Quero ser afiliado", href: LINKS.afiliados, kind: "comissao", span: 4 },
  { n: 9, title: "Vídeos e cursos", desc: "Aprenda, ensine e venda seu conhecimento em vídeos e aulas online.", cta: "Explorar", href: LINKS.cursos, kind: "video", span: 4, photo: "/landing/bento-9.png" },
  { n: 10, title: "Posts & stories", desc: "Compartilhe nas redes e aumente seu alcance como afiliado.", cta: "Ver ideias", href: LINKS.feed, kind: "stories", span: 4, photo: "/landing/bento-10.png" },
  { n: 11, title: "Influenciadores premiados", desc: "Reconhecimento para os que mais vendem e inspiram.", cta: "Ver ranking", href: LINKS.ranking, kind: "photo", span: 4, photo: "/landing/bento-11.png" },
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
