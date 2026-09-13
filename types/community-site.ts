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

import type { SiteTemplate } from "./site-template"

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
  /** Segundo botão, ao lado do primeiro e com peso menor. */
  ctaSecondaryText: string
  /** Vazio = o botão ancora na seção seguinte (destino óbvio, sem pedir link). */
  ctaSecondaryUrl: string
}

/**
 * Ícones que um destaque pode usar — lista FECHADA, igual à do backend.
 *
 * O valor indexa `HIGHLIGHT_ICONS` no front. Ícone novo entra nos DOIS lugares;
 * presente só aqui, o normalizador do servidor o troca pelo default no primeiro
 * save e a escolha do líder "volta atrás" sozinha.
 */
export const SITE_ICONS = [
  "none",
  "sparkles",
  "star",
  "heart",
  "shield",
  "clock",
  "users",
  "award",
  "coffee",
  "camera",
  "music",
  "map-pin",
  "wifi",
  "gift",
  "leaf",
  "zap",
  "check",
  "home",
  "smile",
  "thumbs-up",
  "sun",
] as const
export type SiteIcon = (typeof SITE_ICONS)[number]

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
  /** `null` quando o serviço é sob orçamento — nunca zero (ver abaixo). */
  price_amount: number | null
  /**
   * Sob orçamento (mig 239): o card troca o preço por "Pedir orçamento" e o
   * clique vai para o WhatsApp, não para o agendamento — não há o que cobrar
   * antes da visita.
   */
  price_on_request?: boolean
  duration_minutes: number | null
  image_url: string | null
  /**
   * De QUEM é o serviço (mig 221). Serviço pertence a um perfil, e é a agenda
   * desse perfil que a página de agendamento abre depois da escolha — sem isto
   * a tela não saberia qual calendário mostrar.
   */
  provider_profile_id?: string | null
}

/**
 * Quem atende pelo site: o líder e a equipe que ele promoveu (mig 221).
 *
 * `id_profile` é o perfil-conta — o alvo do agendamento, porque é nele que
 * moram a agenda (mig 190) e os serviços cadastrados.
 */
export type SiteProfessional = {
  id_profile: string
  /**
   * A PESSOA. Só vem na lista do líder (o painel da equipe), porque é por ela
   * que se remove alguém — a página pública não precisa de id de usuário e por
   * isso não o recebe.
   */
  id_user?: string
  name: string
  username?: string
  avatar_url: string | null
  /** Só quando declarada no onboarding; `null` vira o rótulo genérico na tela. */
  profession: string | null
  is_leader?: boolean
  service_count?: number
}

export type HighlightItem = {
  id: string
  icon: SiteIcon
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
  /** ISO `AAAA-MM-DD`, ou vazio. Quem escreve por extenso é o front. */
  date: string
}

/** Uma informação do bloco de chamada: rótulo em cima, valor embaixo. */
export type CtaItem = { id: string; label: string; value: string }

/** Selo da seção "quem está por trás" ("Cuidado", "Qualidade"...). */
export type PersonTag = { id: string; label: string }

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
  "cta",
  "person",
  "gallery",
  "contact",
  "faq",
  "areas",
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
/**
 * Bloco de chamada: selo, informações lado a lado e um botão grande.
 *
 * Os valores são TEXTO do líder, não agenda viva — o site não consulta
 * disponibilidade. Quem tem agenda, sinal e pagamento é o perfil.
 */
export type CtaData = {
  badge: string
  items: CtaItem[]
  ctaText: string
  ctaUrl: string
  note: string
}
/** Quem está por trás: retrato ao lado do texto, com selos. */
export type PersonData = {
  photoUrl: string
  objectPosition: SiteObjectPosition
  body: string
  tags: PersonTag[]
  ctaText: string
  ctaUrl: string
}
export type GalleryData = { photos: PhotoItem[]; columns: 2 | 3 | 4 }

export type FaqItem = { id: string; question: string; answer: string }
export type FaqData = { items: FaqItem[] }

export type AreaItem = {
  id: string
  name: string
  uf: string
  note: string
  /** Destino do item. Token `pagina:<slug>`, `agendar`, ou link externo. */
  url: string
}
export type AreasData = { items: AreaItem[]; columns: 2 | 3 | 4; note: string }
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
  | SiteSectionBase<"cta", CtaData>
  | SiteSectionBase<"person", PersonData>
  | SiteSectionBase<"gallery", GalleryData>
  | SiteSectionBase<"contact", ContactData>
  | SiteSectionBase<"faq", FaqData>
  | SiteSectionBase<"areas", AreasData>

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
  /**
   * Respiro vertical da seção (o `py` de cima e de baixo), em pixels.
   *
   * ⚠️ Existe porque `minHeight` sozinho SÓ CRESCE: as seções têm respiro fixo
   * no CSS (`py-16 md:py-24`), então pedir altura menor que o conteúdo mais
   * esse respiro não encolhia nada e a alça parecia quebrada. Quem cede
   * primeiro quando o líder aperta a linha divisória é o respiro.
   *
   * `null` é AUTO (o do CSS); **zero é escolha** — é ele que faz a seção
   * encostar no conteúdo.
   */
  padY: number | null
}

/**
 * Tamanho e posição de UMA caixa de texto.
 *
 * `x`/`y` são DESLOCAMENTO, não coordenada absoluta: viram `left`/`top` de um
 * elemento `position: relative`, que empurra a caixa sem tirar o espaço dela do
 * fluxo — o parágrafo de baixo não sobe quando a manchete anda. Um `absolute`
 * congelaria a caixa num ponto da tela do computador e a página deixaria de
 * caber no celular de quem visita.
 *
 * ⚠️ As unidades são diferentes de propósito: X em % da largura do bloco (a
 * mesma régua de `width`), porque é a largura que muda entre aparelhos; Y em
 * pixels, porque a altura de um texto não acompanha a largura da janela.
 */
export type SiteTextStyle = {
  fontSize: number | null
  width: number | null
  x: number | null
  y: number | null
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
  X_MIN: -100,
  X_MAX: 100,
  Y_MIN: -600,
  Y_MAX: 600,
  PADY_MIN: 0,
  PADY_MAX: 240,
} as const

export function clampSize(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Math.round(value)))
}

/** Dados de uma seção, indexados pelo kind. */
export type SiteSectionDataFor<K extends SiteSectionKind> = Extract<
  SiteSection,
  { kind: K }
>["data"]

/**
 * Sub-página do site: endereço próprio e a MESMA pilha de seções da home.
 *
 * `title` vai para a aba do navegador e para o resultado de busca; `subtitle` é
 * a descrição. O `slug` é kebab-case e não pode ser `agendar` — o backend
 * (utils/communitySite.js) descarta a página que desobedecer, em vez de
 * recusar o save inteiro.
 */
export type SitePage = {
  id: string
  slug: string
  title: string
  subtitle: string
  enabled: boolean
  sections: SiteSection[]
}

/** Prefixo do link para outra página do próprio site: `pagina:<slug>`. */
export const PAGE_LINK_PREFIX = "pagina:"

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
  /**
   * Sub-páginas do site (mig 238). Ausente num documento antigo = site de uma
   * página só, que é como ele sempre foi — por isso é opcional.
   */
  pages?: SitePage[]
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
  professionals?: SiteProfessional[]
  provider_profile_id?: string | null
  /**
   * Endereço reservado do site (`/c/<slug>`). Nasce na PRIMEIRA publicação —
   * `null` enquanto o site nunca foi publicado. É daqui que o construtor tira
   * o destino de agendar: sem ele, o botão principal do banner não teria para
   * onde apontar e sumiria da pré-visualização.
   */
  slug?: string | null
  /**
   * `true` = o site é feito e mantido pela Freelandoo (mig 241): o documento de
   * seções não é mais o que o endereço desenha, e a escrita do cliente é
   * recusada. O construtor lê isto para não oferecer uma edição que o backend
   * vai negar — sem ele o sintoma é o autosave falhando enquanto a pessoa
   * digita.
   */
  managed?: boolean
  /**
   * `true` = existe um site pronto RESERVADO para esta comunidade, esperando o
   * líder aceitar (mig 242). É o que acende a bolinha no botão "Site pronto" —
   * a oferta não tem outra forma de se anunciar, e um site reservado que
   * ninguém vê é o mesmo que site não reservado.
   */
  has_offer?: boolean

  /**
   * O tema autoral que desenha, quando gerenciado. `null` = canvas de seções.
   *
   * ⚠️ É O OBJETO `{ slug, data }`, e não o slug solto — este tipo declarava
   * `string` e o backend sempre devolveu o objeto (`toTemplate` em
   * CommunitySiteService). A mentira era inofensiva enquanto ninguém lia o
   * campo; no primeiro leitor ela vira `undefined` em tempo de execução com o
   * typecheck passando, que é o pior jeito de errar.
   *
   * ⚠️ NÃO CONFUNDIR com o `template` do estado do painel de site pronto
   * (`readyState`), que é o slug em string — endpoints diferentes, formas
   * diferentes, de propósito: lá o painel só escreve o nome do tema na tela.
   */
  template?: SiteTemplate | null
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
    case "cta":
      return { badge: "", items: [], ctaText: "", ctaUrl: "", note: "" } satisfies CtaData
    case "person":
      return {
        photoUrl: "",
        objectPosition: "center",
        body: "",
        tags: [],
        ctaText: "",
        ctaUrl: "",
      } satisfies PersonData
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
    case "faq":
      return { items: [] } satisfies FaqData
    case "areas":
      return { items: [], columns: 3, note: "" } satisfies AreasData
  }
}

/** Id local de item novo. `crypto.randomUUID` existe em todo browser alvo. */
export function newLocalId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID()
  }
  return `s-${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`
}
