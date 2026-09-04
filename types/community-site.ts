// types/community-site.ts
// Forma do site da comunidade ("Meu Site", mig 212).
//
// ESPELHO de `freelandoo-backend/src/utils/communitySite.js`, que é a fonte
// única de verdade: é ele quem valida e normaliza tudo antes de gravar. Estes
// tipos existem para o construtor não montar payload torto — não substituem a
// validação do servidor, e nada aqui deve ser afrouxado para "passar" um dado
// que o backend recusaria.
//
// Ao criar uma seção nova: adicionar o kind em SITE_SECTION_KINDS, o tipo dos
// dados em SiteSectionData e o normalizador correspondente no backend.

export type SiteColorTheme = {
  primary: string
  background: string
  surface: string
  textPrimary: string
  textSecondary: string
  accent: string
}

/** Lista FECHADA — igual à do backend, que recusa qualquer outro valor. */
export const SITE_OBJECT_POSITIONS = [
  "center",
  "top",
  "bottom",
  "left",
  "right",
  "top left",
  "top right",
  "bottom left",
  "bottom right",
] as const
export type SiteObjectPosition = (typeof SITE_OBJECT_POSITIONS)[number]

export type HeroSlide = {
  id: string
  imageUrl: string
  objectPosition: SiteObjectPosition
  headline: string
  subheadline: string
  ctaText: string
  ctaUrl: string
}

/**
 * Um serviço da vitrine do site.
 *
 * NÃO faz parte do documento do site: vem do cadastro real (tb_profile_service
 * do perfil do líder), servido pelo backend a cada leitura. Por isso não tem
 * `id` local nem campos de apresentação — nada aqui é editado no construtor.
 *
 * Preço em CENTAVOS: quem formata é o front, que sabe o idioma de quem lê.
 */
export type ShowcaseService = {
  id_profile_service: number
  name: string
  description: string
  price_amount: number | null
  duration_minutes: number | null
  image_url: string | null
}

export type HighlightItem = {
  id: string
  title: string
  description: string
}

export type TestimonialItem = {
  id: string
  name: string
  role: string
  avatarUrl: string
  /** Inteiro de 1 a 5 (o backend arredonda e limita). */
  rating: number
  text: string
}

export type PhotoItem = {
  id: string
  imageUrl: string
  objectPosition: SiteObjectPosition
  caption: string
}

export type SocialLink = {
  id: string
  label: string
  url: string
}

export const SITE_SECTION_KINDS = [
  "hero",
  "services_catalog",
  "about",
  "testimonials",
  "gallery",
  "contact",
] as const
export type SiteSectionKind = (typeof SITE_SECTION_KINDS)[number]

export type HeroData = {
  slides: HeroSlide[]
  autoplay: boolean
  height: "short" | "medium" | "tall"
}
/** Só apresentação — o conteúdo são os serviços cadastrados (ShowcaseService). */
export type ServicesCatalogData = { columns: 2 | 3 | 4 }
export type AboutData = { body: string; highlights: HighlightItem[]; photos: PhotoItem[] }
export type TestimonialsData = { items: TestimonialItem[] }
export type GalleryData = { photos: PhotoItem[]; columns: 2 | 3 | 4 }
export type ContactData = {
  address: string
  mapsUrl: string
  whatsapp: string
  email: string
  hours: string
  socials: SocialLink[]
}

/**
 * Une kind e dados no MESMO tipo: assim `section.kind === "hero"` estreita
 * `section.data` para HeroData sozinho, e é impossível ler `slides` de uma
 * seção de contato sem o TypeScript reclamar.
 */
export type SiteSection =
  | SiteSectionBase<"hero", HeroData>
  | SiteSectionBase<"services_catalog", ServicesCatalogData>
  | SiteSectionBase<"about", AboutData>
  | SiteSectionBase<"testimonials", TestimonialsData>
  | SiteSectionBase<"gallery", GalleryData>
  | SiteSectionBase<"contact", ContactData>

type SiteSectionBase<K extends SiteSectionKind, D> = {
  id: string
  kind: K
  enabled: boolean
  title: string
  subtitle: string
  /** Tamanho escolhido nas alças. Ausente/null = AUTO (segue o responsivo). */
  layout?: SiteSectionLayout
  data: D
}

/**
 * Tamanho da seção. `null` é AUTO — a seção nunca redimensionada continua
 * fluida no celular. É diferente de 0, que seria uma escolha do líder.
 */
export type SiteSectionLayout = {
  minHeight: number | null
  maxWidth: number | null
}

/** Tamanho de UMA caixa de texto: corpo da fonte e largura em % do bloco. */
export type SiteTextStyle = {
  fontSize: number | null
  width: number | null
}

/**
 * Faixas de sanidade — ESPELHO de `SIZES` no backend, que é quem manda. Aqui
 * elas existem para a alça não deixar o líder arrastar até um valor que o
 * servidor vai fixar em silêncio (o texto "voltaria" no próximo carregamento).
 */
export const SITE_SIZES = {
  FONT_MIN: 8,
  FONT_MAX: 200,
  WIDTH_MIN: 10,
  WIDTH_MAX: 100,
  HEIGHT_MIN: 40,
  HEIGHT_MAX: 2400,
  MAXW_MIN: 320,
  MAXW_MAX: 1920,
} as const

export function clampSize(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Math.round(value)))
}

/** Dados de uma seção, indexados pelo kind. */
export type SiteSectionDataFor<K extends SiteSectionKind> = Extract<
  SiteSection,
  { kind: K }
>["data"]

export type CommunitySiteConfig = {
  siteName: string
  tagline: string
  theme: SiteColorTheme
  /**
   * Tamanhos por caixa de texto, indexados pelo CAMINHO da caixa
   * (`site.name`, `sec:<id>.title`, `sec:<id>.hero.<slideId>.headline`…).
   *
   * Mapa à parte em vez de um campo dentro de cada texto: os textos são
   * strings simples espalhadas por seis formatos de seção, e pendurar estilo
   * em cada uma mudaria a forma de todos eles para guardar dois números.
   * Site antigo não tem o campo — por isso é opcional.
   */
  textStyles?: Record<string, SiteTextStyle>
  sections: SiteSection[]
}

/** Resposta de `GET/PUT /communities/:id/site`. */
export type CommunitySiteResponse = {
  exists: boolean
  is_leader?: boolean
  is_published: boolean
  published_at?: string | null
  updated_at?: string | null
  /** `true` = publicado, mas a comunidade é fechada para este viewer. */
  locked?: boolean
  /** `null` quando não há nada a mostrar (rascunho alheio ou trancado). */
  config: CommunitySiteConfig | null
  /**
   * Serviços cadastrados que a vitrine mostra. O construtor recebe a MESMA
   * lista que a página pública — é o que garante que o líder edite contra o
   * que vai ser publicado.
   */
  services?: ShowcaseService[]
  provider_profile_id?: string | null
}

export const DEFAULT_SITE_THEME: SiteColorTheme = {
  primary: "#f2b705",
  background: "#0b0b0d",
  surface: "#15120e",
  textPrimary: "#f5f1e8",
  textSecondary: "#9a938a",
  accent: "#e5a800",
}

/** Larguras de prévia. Números batem com os breakpoints reais do Tailwind. */
export const SITE_VIEWPORTS = {
  desktop: 0, // 0 = ocupa o container inteiro
  tablet: 820,
  mobile: 390,
} as const
export type SiteViewport = keyof typeof SITE_VIEWPORTS

/**
 * Dados vazios por kind — usados ao adicionar uma seção no construtor.
 * O backend tem o equivalente (`buildEmptySection`); manter os dois em pé
 * evita um round-trip só para nascer uma seção em branco.
 */
export function emptySectionData(kind: SiteSectionKind): SiteSection["data"] {
  switch (kind) {
    case "hero":
      return { slides: [], autoplay: true, height: "tall" } satisfies HeroData
    case "services_catalog":
      return { columns: 3 } satisfies ServicesCatalogData
    case "about":
      return { body: "", highlights: [], photos: [] } satisfies AboutData
    case "testimonials":
      return { items: [] } satisfies TestimonialsData
    case "gallery":
      return { photos: [], columns: 3 } satisfies GalleryData
    case "contact":
      return {
        address: "",
        mapsUrl: "",
        whatsapp: "",
        email: "",
        hours: "",
        socials: [],
      } satisfies ContactData
  }
}

/** Id local de item novo. `crypto.randomUUID` existe em todo browser alvo. */
export function newLocalId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID()
  }
  return `s-${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`
}
