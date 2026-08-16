// Tipos e helpers compartilhados da Loja de Funções (/funcoes).
import {
  Briefcase,
  CalendarDays,
  Dumbbell,
  GraduationCap,
  HeartHandshake,
  Package,
  Store,
  UserRound,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react"

export interface FunctionProduct {
  id: string
  feature_key: string
  nav_label: string
  eyebrow: string
  headline: string
  short_description: string
  full_description: string
  background_color: string
  accent_color: string
  text_color: string
  placeholder_color: string
  image_url: string | null
  price_cents: number
  /** Preço alternativo em Poléns (mig 195). null/0 = só dinheiro. */
  price_polens: number | null
  is_for_sale: boolean
  sort_order: number
}

/** A função aceita pagamento pela carteira de Poléns? */
export function acceptsPolens(product: Pick<FunctionProduct, "price_polens">): boolean {
  return Number(product.price_polens) > 0
}

export function formatPolens(polens: number, locale: string): string {
  return new Intl.NumberFormat(locale).format(Number(polens) || 0)
}

// Mesmos ícones da seção "Funções" do UserDropside — identidade única.
export const FUNCTION_ICONS: Record<string, LucideIcon> = {
  courses: GraduationCap,
  store: Package,
  services: Briefcase,
  vaquinha: HeartHandshake,
  communities: Users,
  wallet: Wallet,
  fitness_academias: Dumbbell,
  profiles: UserRound,
  agenda: CalendarDays,
  vitrine: Store,
}

export function formatPriceBRL(cents: number, locale: string): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "BRL",
  }).format((Number(cents) || 0) / 100)
}

/** Papel de cada card no palco (mesma coreografia da home do TENKA). */
export type CardRole = "center" | "previous" | "next"

export interface CardSlotVars {
  left: string
  top: string
  xPercent: number
  yPercent: number
  scale: number
  rotationY: number
  rotationZ: number
  opacity: number
  filter: string
  zIndex: number
}

/**
 * O palco é um ANEL, não uma fila de três. Cada índice do array é a
 * PROFUNDIDADE do slot (distância até o card central) e o sinal do
 * deslocamento decide o lado: direita para quem vem, esquerda para quem já
 * passou. Os slots mais fundos ficam fora da tela e invisíveis — é por eles
 * que a lista fecha a volta.
 */
interface RingConfig {
  /** Distância horizontal do centro, em % da largura do palco. */
  offsets: number[]
  tops: number[]
  scales: number[]
  opacities: number[]
  blurs: number[]
  /** Giro no eixo Y (perspectiva) por profundidade. */
  tilts: number[]
  /** Inclinação no plano da tela por profundidade. */
  rolls: number[]
  zIndexes: number[]
}

const DESKTOP_RING: RingConfig = {
  offsets: [0, 38, 68, 96],
  tops: [56, 54, 53, 53],
  scales: [1, 0.6, 0.42, 0.34],
  opacities: [1, 0.72, 0.34, 0],
  blurs: [0, 2, 4, 6],
  tilts: [0, 18, 22, 24],
  rolls: [0, 3, 4, 4],
  zIndexes: [30, 20, 10, 2],
}

const MOBILE_RING: RingConfig = {
  offsets: [0, 56, 92, 120],
  tops: [48, 50, 50, 50],
  scales: [1, 0.52, 0.4, 0.34],
  opacities: [1, 0.5, 0.2, 0],
  blurs: [0, 2, 4, 6],
  tilts: [0, 12, 16, 18],
  rolls: [0, 2, 3, 3],
  zIndexes: [30, 20, 10, 2],
}

const MAX_DEPTH = DESKTOP_RING.offsets.length - 1

/**
 * Deslocamento circular assinado até o card ativo: 0 = centro, +1 = o próximo
 * (à direita), -1 = o anterior (à esquerda). Como o anel fecha, o card mais à
 * esquerda é vizinho do mais à direita.
 */
export function getCardOffset(index: number, activeIndex: number, total: number): number {
  if (total <= 0) return 0
  const raw = (((index - activeIndex) % total) + total) % total
  return raw > Math.floor(total / 2) ? raw - total : raw
}

/**
 * A partir de qual profundidade o slot é invisível. Depende do tamanho do
 * catálogo: com poucos cards não sobra anel escondido, então o ponto de virada
 * sobe pra dentro da tela — mas nunca engole os vizinhos imediatos.
 */
function hiddenDepthFor(total: number): number {
  return Math.max(2, Math.min(MAX_DEPTH, Math.floor(total / 2)))
}

export function getSlotVars(offset: number, isMobile: boolean, total: number): CardSlotVars {
  const ring = isMobile ? MOBILE_RING : DESKTOP_RING
  const depth = Math.min(Math.abs(offset), MAX_DEPTH)
  const side = Math.sign(offset)
  const hidden = depth >= hiddenDepthFor(total)
  return {
    left: `${50 + side * ring.offsets[depth]}%`,
    top: `${ring.tops[depth]}%`,
    xPercent: -50,
    yPercent: -50,
    scale: ring.scales[depth],
    rotationY: -side * ring.tilts[depth],
    rotationZ: side * ring.rolls[depth],
    opacity: hidden ? 0 : ring.opacities[depth],
    filter: `blur(${ring.blurs[depth]}px)`,
    zIndex: hidden ? 1 : ring.zIndexes[depth],
  }
}

/**
 * O fundo do anel: atrás do card central, pequeno e invisível. É por aqui que
 * passa o card que dá a volta — assim o salto do fim da lista pro começo vira
 * um giro contínuo em vez de um pulo atravessando o palco.
 */
export function getBackstageVars(isMobile: boolean): CardSlotVars {
  const ring = isMobile ? MOBILE_RING : DESKTOP_RING
  return {
    left: "50%",
    top: `${ring.tops[0]}%`,
    xPercent: -50,
    yPercent: -50,
    scale: 0.26,
    rotationY: 0,
    rotationZ: 0,
    opacity: 0,
    filter: "blur(8px)",
    zIndex: 1,
  }
}

export function getCardRole(index: number, activeIndex: number, total: number): CardRole {
  const offset = getCardOffset(index, activeIndex, total)
  if (offset === 0) return "center"
  return offset > 0 ? "next" : "previous"
}

/** Vars prontas pra tween: zIndex vai via set() em posições exatas da timeline. */
export function toTweenVars(vars: CardSlotVars): Omit<CardSlotVars, "zIndex"> & { x: number; y: number } {
  const { zIndex, ...rest } = vars
  void zIndex
  return { ...rest, x: 0, y: 0 }
}

export function padIndex(n: number): string {
  return String(n).padStart(2, "0")
}
