export type Trend = "up" | "down" | "same"
export type Accent = "magenta" | "cyan" | "gold" | "ink"

export interface AudienceEntry {
  id: string
  rank: number
  name: string
  handle: string
  avatar: string
  points: number
  comments: number
  likes: number
  replies: number
  trend: Trend
  trendValue: number
  tag: string
  tagAccent: Accent
}

export interface ParticipantEntry {
  id: string
  rank: number
  name: string
  handle: string
  avatar: string
  group: "H" | "M"
  points: number
  views: number
  likes: number
  comments: number
  trend: Trend
  trendValue: number
  tag: string
  tagAccent: Accent
}

// Placar agregado Homens × Mulheres (soma de pontos por grupo, normalizado)
export function groupScore(entries: ParticipantEntry[]) {
  const men = entries.filter((e) => e.group === "H").reduce((s, e) => s + e.points, 0)
  const women = entries.filter((e) => e.group === "M").reduce((s, e) => s + e.points, 0)
  const total = men + women || 1
  return {
    men,
    women,
    menPct: Math.round((men / total) * 100),
    womenPct: Math.round((women / total) * 100),
  }
}
