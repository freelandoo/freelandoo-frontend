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

export interface CardRoleVars {
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

const DESKTOP_ROLES: Record<CardRole, CardRoleVars> = {
  center: {
    left: "50%", top: "56%", xPercent: -50, yPercent: -50,
    scale: 1, rotationY: 0, rotationZ: 0, opacity: 1, filter: "blur(0px)", zIndex: 30,
  },
  previous: {
    left: "12%", top: "54%", xPercent: -50, yPercent: -50,
    scale: 0.6, rotationY: 18, rotationZ: -3, opacity: 0.72, filter: "blur(2px)", zIndex: 15,
  },
  next: {
    left: "88%", top: "54%", xPercent: -50, yPercent: -50,
    scale: 0.6, rotationY: -18, rotationZ: 3, opacity: 0.72, filter: "blur(2px)", zIndex: 15,
  },
}

const MOBILE_ROLES: Record<CardRole, CardRoleVars> = {
  center: {
    left: "50%", top: "48%", xPercent: -50, yPercent: -50,
    scale: 1, rotationY: 0, rotationZ: 0, opacity: 1, filter: "blur(0px)", zIndex: 30,
  },
  previous: {
    left: "-6%", top: "50%", xPercent: -50, yPercent: -50,
    scale: 0.52, rotationY: 12, rotationZ: -2, opacity: 0.5, filter: "blur(2px)", zIndex: 15,
  },
  next: {
    left: "106%", top: "50%", xPercent: -50, yPercent: -50,
    scale: 0.52, rotationY: -12, rotationZ: 2, opacity: 0.5, filter: "blur(2px)", zIndex: 15,
  },
}

export function getRoleVars(role: CardRole, isMobile: boolean): CardRoleVars {
  return (isMobile ? MOBILE_ROLES : DESKTOP_ROLES)[role]
}

export function getCardRole(index: number, activeIndex: number, total: number): CardRole {
  if (index === activeIndex || total === 1) return "center"
  if (index === (activeIndex + 1) % total) return "next"
  return "previous"
}

/** Vars prontas pra tween: zIndex vai via set() em posições exatas da timeline. */
export function toTweenVars(vars: CardRoleVars): Omit<CardRoleVars, "zIndex"> & { x: number; y: number } {
  const { zIndex, ...rest } = vars
  void zIndex
  return { ...rest, x: 0, y: 0 }
}

export function padIndex(n: number): string {
  return String(n).padStart(2, "0")
}
