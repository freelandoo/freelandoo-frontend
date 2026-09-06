"use client"

// Ícones que um destaque de "Sobre" pode usar.
//
// ESPELHO da lista `ICONS` de `freelandoo-backend/src/utils/communitySite.js`,
// que é quem manda: o nome gravado no documento vem de lá, e é ele que indexa
// este mapa. Ícone novo entra nos DOIS lugares — declarado só aqui, o
// normalizador do servidor o troca pelo default no primeiro save e a escolha
// do líder "volta atrás" sozinha, sem erro nenhum aparecer.
//
// A lista é fechada, e não um nome livre de lucide, porque o valor escolhe um
// componente: nome livre seria um jeito de pedir um componente que não existe.

import {
  Award,
  Camera,
  Check,
  Clock,
  Coffee,
  Gift,
  Heart,
  Home,
  Leaf,
  MapPin,
  Music,
  Shield,
  Smile,
  Sparkles,
  Star,
  Sun,
  ThumbsUp,
  Users,
  Wifi,
  Zap,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"
import type { SiteIcon } from "@/types/community-site"

/** `none` não tem componente de propósito: é a escolha de não ter ícone. */
export const HIGHLIGHT_ICONS: Record<Exclude<SiteIcon, "none">, LucideIcon> = {
  sparkles: Sparkles,
  star: Star,
  heart: Heart,
  shield: Shield,
  clock: Clock,
  users: Users,
  award: Award,
  coffee: Coffee,
  camera: Camera,
  music: Music,
  "map-pin": MapPin,
  wifi: Wifi,
  gift: Gift,
  leaf: Leaf,
  zap: Zap,
  check: Check,
  home: Home,
  smile: Smile,
  "thumbs-up": ThumbsUp,
  sun: Sun,
}

/** `null` quando o líder escolheu não ter ícone, ou o nome não é conhecido. */
export function highlightIcon(name: SiteIcon): LucideIcon | null {
  if (name === "none") return null
  return HIGHLIGHT_ICONS[name] || null
}
