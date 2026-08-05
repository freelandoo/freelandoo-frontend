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
  is_for_sale: boolean
  sort_order: number
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

/** Numeração editorial dos cards (01, 02, …). */
export function padIndex(n: number): string {
  return String(n).padStart(2, "0")
}
