/**
 * Mapa central de rotas públicas da Freelandoo.
 *
 * Fonte única de verdade para links de navegação (header, footers, CTAs) e para
 * o teste de regressão de links públicos (e2e/public-links.spec.ts). Evita links
 * quebrados como `/cursos` apontando para rota inexistente.
 *
 * Ao criar/renomear uma página pública, atualize aqui e tudo que importa este
 * módulo passa a apontar para a rota correta.
 */
export const ROUTES = {
  // Núcleo
  home: "/",
  login: "/login",
  signup: "/cadastro",
  account: "/account",

  // Marketing / institucional
  howItWorks: "/comofunciona",
  pricing: "/precos",
  courses: "/cursos",
  ranking: "/ranking",
  search: "/search",
  advertiseServices: "/anunciar-servicos",
  hireProfessionals: "/contratar-profissionais",
  helpCenter: "/central-de-ajuda",
  shippingProtocol: "/protocolo-de-envios",
  blog: "/blog",
  community: "/comunidade",
  about: "/sobre-nos",
  careers: "/carreiras",
  safetyTips: "/dicas-de-seguranca",

  // Legais
  terms: "/terms",
  privacy: "/privacy-policy",
  cookies: "/cookies-policy",
  marketplaceTerms: "/marketplace-terms",
  returnPolicy: "/return-policy",
  affiliateTerms: "/affiliate-terms",
  subscriptionTerms: "/subscription-terms",
  communityGuidelines: "/community-guidelines",
  moderationPolicy: "/moderation-policy",
  copyrightPolicy: "/copyright-policy",
  polensTerms: "/polens-terms",
  minorsPolicy: "/minors-policy",
  advertisingPolicy: "/advertising-policy",
} as const

export type RouteKey = keyof typeof ROUTES

/**
 * Rotas públicas que renderizam sem autenticação nem parâmetros — usadas pelo
 * teste de regressão de links (devem responder 200, sem 404/500).
 */
export const PUBLIC_ROUTES: readonly string[] = [
  ROUTES.home,
  ROUTES.login,
  ROUTES.signup,
  ROUTES.howItWorks,
  ROUTES.pricing,
  ROUTES.courses,
  ROUTES.ranking,
  ROUTES.search,
  ROUTES.advertiseServices,
  ROUTES.hireProfessionals,
  ROUTES.helpCenter,
  ROUTES.blog,
  ROUTES.community,
  ROUTES.about,
  ROUTES.careers,
  ROUTES.safetyTips,
  ROUTES.terms,
  ROUTES.privacy,
  ROUTES.cookies,
  ROUTES.marketplaceTerms,
  ROUTES.returnPolicy,
  ROUTES.affiliateTerms,
  ROUTES.subscriptionTerms,
  ROUTES.communityGuidelines,
  ROUTES.moderationPolicy,
  ROUTES.copyrightPolicy,
  ROUTES.polensTerms,
  ROUTES.minorsPolicy,
  ROUTES.advertisingPolicy,
]
