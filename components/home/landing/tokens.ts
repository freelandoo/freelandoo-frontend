/**
 * Freelandoo Landing — tokens de design + dados de copy.
 *
 * A homepage editorial roda em tema light com cores explícitas (o app é dark
 * globalmente). Centralizamos paleta, links canônicos e o conteúdo textual
 * aqui para manter os componentes enxutos e a copy fácil de editar/indexar.
 *
 * Regra de copy (taste skill): proibido travessão (—) em qualquer texto visível.
 */

export const FL = {
  paper: "#FAF7F0",
  paperDeep: "#F2EDE1",
  ink: "#14110B",
  inkSoft: "#2A2418",
  gold: "#F2B705",
  goldDeep: "#E6A800",
  graphite: "#6B6457",
} as const

/** Links canônicos — NÃO quebrar rotas existentes (login/cadastro/explorar). */
export const LINKS = {
  cadastro: "/cadastro",
  login: "/login",
  explorar: "/search",
  comoFunciona: "/comofunciona",
  cursos: "/cursos",
  feed: "/feed",
  afiliados: "/account",
  influenciadores: "/search?enxame=influencer",
} as const

export type MoneyPath = {
  id: string
  kicker: string
  title: string
  desc: string
  cta: string
  href: string
  accent: string
}

/** Seção 2 — "Como você quer ganhar dinheiro?" (5 caminhos) */
export const MONEY_PATHS: MoneyPath[] = [
  {
    id: "afiliado",
    kicker: "Afiliado",
    title: "Indique e ganhe comissão",
    desc: "Use seu cupom ou link para divulgar e receber por cada indicação que converte.",
    cta: "Quero indicar",
    href: LINKS.afiliados,
    accent: "#E6A800",
  },
  {
    id: "cursos",
    kicker: "Cursos",
    title: "Monetize seu conhecimento",
    desc: "Crie aulas e cursos de graça e comece a vender o que você sabe.",
    cta: "Criar curso",
    href: LINKS.cursos,
    accent: "#0EA5E9",
  },
  {
    id: "produtos",
    kicker: "Produtos",
    title: "Venda físico ou digital",
    desc: "Produtos novos, usados, digitais ou artesanais viram renda na plataforma.",
    cta: "Vender produto",
    href: LINKS.cadastro,
    accent: "#10B981",
  },
  {
    id: "servicos",
    kicker: "Serviços",
    title: "Crie seu subperfil e seja contratado",
    desc: "Sua vitrine profissional aparece para quem procura por cidade e categoria.",
    cta: "Oferecer serviço",
    href: LINKS.cadastro,
    accent: "#F2B705",
  },
  {
    id: "influenciador",
    kicker: "Influenciador",
    title: "Venda sua influência como freelancer",
    desc: "Monte seu media kit e seja encontrado por marcas e comércios locais.",
    cta: "Virar creator",
    href: LINKS.influenciadores,
    accent: "#EC4899",
  },
]

export type DeckSlideData = {
  n: number
  id: string
  kicker: string
  title: string
  desc: string
  href: string
  cta: string
}

/** Sequência do deck horizontal (GSAP) — seção de motion */
export const DECK_SLIDES: DeckSlideData[] = [
  { n: 1, id: "cursos", kicker: "Cursos", title: "Crie cursos de graça", desc: "Transforme conhecimento em aulas e materiais digitais sem pagar pra começar.", href: LINKS.cursos, cta: "Criar curso" },
  { n: 2, id: "perfis", kicker: "Vários perfis", title: "Uma conta, vários perfis", desc: "Marceneiro, professor, vendedor e influenciador na mesma conta.", href: LINKS.cadastro, cta: "Criar conta" },
  { n: 3, id: "servicos", kicker: "Serviços", title: "Seja encontrado", desc: "Sua vitrine aparece por cidade, categoria e profissão.", href: LINKS.cadastro, cta: "Oferecer serviço" },
  { n: 4, id: "produtos", kicker: "Produtos", title: "Venda o que você tem", desc: "Novos, usados, digitais ou artesanais. Tudo vira renda.", href: LINKS.cadastro, cta: "Vender" },
  { n: 5, id: "lojinha", kicker: "Lojinha", title: "Monte sua lojinha", desc: "Cadastre produtos, organize a vitrine e acompanhe pedidos.", href: LINKS.cadastro, cta: "Abrir loja" },
  { n: 6, id: "busca", kicker: "Busca", title: "Encontre o que procura", desc: "Serviço, curso, produto ou influenciador por cidade e nicho.", href: LINKS.explorar, cta: "Explorar" },
  { n: 7, id: "chamados", kicker: "Chamados", title: "Não achou? Abra um chamado", desc: "Publique o que precisa e as pessoas certas recebem a oportunidade.", href: LINKS.cadastro, cta: "Abrir chamado" },
  { n: 8, id: "afiliados", kicker: "Afiliados", title: "Indique e ganhe", desc: "Cupom, link, comissões e saques no painel do afiliado.", href: LINKS.afiliados, cta: "Ser afiliado" },
  { n: 9, id: "influenciadores", kicker: "Influenciadores", title: "Influência é freela", desc: "Marcas encontram creators por nicho, público e cidade.", href: LINKS.influenciadores, cta: "Ver creators" },
  { n: 10, id: "parental", kicker: "Controle parental", title: "Segurança em primeiro lugar", desc: "Menor só entra com autorização e supervisão do responsável.", href: LINKS.comoFunciona, cta: "Saber mais" },
]

/** Cores dos enxames (espelha globals.css [data-machine]) p/ tags de profissão */
export const ENXAME_COLORS: Record<string, string> = {
  marketing: "#f43f5e",
  tecnologia: "#3b82f6",
  transporte: "#f59e0b",
  artistas: "#a855f7",
  influencer: "#ec4899",
  servicos_residenciais: "#10b981",
  construcao: "#f97316",
  saude: "#06b6d4",
  beleza_bem_estar: "#d946ef",
  veiculos: "#ef4444",
  pets: "#22c55e",
  rural: "#84cc16",
  educacao: "#0ea5e9",
  eventos: "#eab308",
  justica: "#6366f1",
}
