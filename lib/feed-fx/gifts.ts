// Catálogo VISUAL do Baú (Feed Interativo F3). Os ids são os de
// freelandoo-backend/src/utils/feedGifts.js — figurinha nova = id lá E aqui.

import { Crown, Flame, Gem, Heart, Moon, Music, Rocket, Sparkles, Star, Sun, Trophy, Zap, type LucideIcon } from "lucide-react"

export type Rarity = "comum" | "raro" | "lendario"

export interface StickerDef {
  id: string
  icon: LucideIcon
  bg: string
  fg: string
  rarity: Rarity
  /** fallback pt do nome (a chave i18n é `sticker_<id>`). */
  name: string
}

export const STICKERS: StickerDef[] = [
  { id: "coroa", icon: Crown, bg: "#F2B705", fg: "#0B0B0D", rarity: "raro", name: "Coroa" },
  { id: "raio", icon: Zap, bg: "#FFE15A", fg: "#0B0B0D", rarity: "comum", name: "Raio" },
  { id: "chama", icon: Flame, bg: "#FF5A1F", fg: "#0B0B0D", rarity: "comum", name: "Chama" },
  { id: "estrela", icon: Star, bg: "#F5F1E8", fg: "#0B0B0D", rarity: "comum", name: "Estrela" },
  { id: "coracao", icon: Heart, bg: "#FF3D6E", fg: "#0B0B0D", rarity: "comum", name: "Coração" },
  { id: "foguete", icon: Rocket, bg: "#4FD1FF", fg: "#0B0B0D", rarity: "raro", name: "Foguete" },
  { id: "gema", icon: Gem, bg: "#9B5CFF", fg: "#F5F1E8", rarity: "lendario", name: "Gema" },
  { id: "sol", icon: Sun, bg: "#FFB000", fg: "#0B0B0D", rarity: "comum", name: "Sol" },
  { id: "lua", icon: Moon, bg: "#2B2F6B", fg: "#F5F1E8", rarity: "raro", name: "Lua" },
  { id: "nota", icon: Music, bg: "#3DDC97", fg: "#0B0B0D", rarity: "comum", name: "Nota" },
  { id: "trofeu", icon: Trophy, bg: "#C8A13A", fg: "#0B0B0D", rarity: "lendario", name: "Troféu" },
  { id: "faisca", icon: Sparkles, bg: "#FFD3F0", fg: "#0B0B0D", rarity: "comum", name: "Faísca" },
]

export const STICKER_BY_ID: Record<string, StickerDef> = Object.fromEntries(STICKERS.map((s) => [s.id, s]))

export type Reaction = "confete" | "fogos" | "chuva-de-mel" | "coracoes"
export const REACTIONS: { id: Reaction; name: string; colors: string[] }[] = [
  { id: "confete", name: "Confete", colors: ["#F2B705", "#FF3D6E", "#4FD1FF", "#3DDC97", "#F5F1E8"] },
  { id: "fogos", name: "Fogos", colors: ["#FFE15A", "#FF5A1F", "#F5F1E8"] },
  { id: "chuva-de-mel", name: "Chuva de mel", colors: ["#F2B705", "#FFB000", "#C8A13A"] },
  { id: "coracoes", name: "Corações", colors: ["#FF3D6E", "#FFD3F0", "#F5F1E8"] },
]

export type Chest = "madeira" | "ferro" | "ouro"
export const CHESTS: { id: Chest; name: string; body: string; band: string; glow: string }[] = [
  { id: "madeira", name: "Madeira", body: "#8A5A2B", band: "#3B2412", glow: "#F2B705" },
  { id: "ferro", name: "Ferro", body: "#5E6670", band: "#22262B", glow: "#9FD8FF" },
  { id: "ouro", name: "Ouro", body: "#E2A700", band: "#7A4E00", glow: "#FFF2A8" },
]
export const CHEST_BY_ID: Record<string, (typeof CHESTS)[number]> = Object.fromEntries(CHESTS.map((c) => [c.id, c]))

export const RARITY_COLOR: Record<Rarity, string> = {
  comum: "#F5F1E8",
  raro: "#4FD1FF",
  lendario: "#F2B705",
}
