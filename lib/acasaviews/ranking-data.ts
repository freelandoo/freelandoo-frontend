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

// ----------------------------------------------------------------
// RANKING DA AUDIÊNCIA — o 9º jogador
// ----------------------------------------------------------------
export const audienceRanking: AudienceEntry[] = [
  {
    id: "a1",
    rank: 1,
    name: "Lia Moretti",
    handle: "@lia.teoriza",
    avatar: "/acasaviews/woman-influencer.png",
    points: 12450,
    comments: 184,
    likes: 9820,
    replies: 612,
    trend: "up",
    trendValue: 2,
    tag: "teoria em alta",
    tagAccent: "cyan",
  },
  {
    id: "a2",
    rank: 2,
    name: "Diogo Reis",
    handle: "@diogo.faz.barraco",
    avatar: "/acasaviews/male-speaker-avatar.jpg",
    points: 11230,
    comments: 167,
    likes: 8740,
    replies: 540,
    trend: "up",
    trendValue: 1,
    tag: "comentário explosivo",
    tagAccent: "magenta",
  },
  {
    id: "a3",
    rank: 3,
    name: "Bia Fontes",
    handle: "@biamonitora",
    avatar: "/acasaviews/woman-journalist.png",
    points: 9870,
    comments: 142,
    likes: 7110,
    replies: 498,
    trend: "down",
    trendValue: 1,
    tag: "top estrategista",
    tagAccent: "gold",
  },
  {
    id: "a4",
    rank: 4,
    name: "Caio Drummond",
    handle: "@caio.recapita",
    avatar: "/acasaviews/male-debater-avatar.jpg",
    points: 8610,
    comments: 131,
    likes: 6240,
    replies: 412,
    trend: "up",
    trendValue: 3,
    tag: "mais curtido",
    tagAccent: "cyan",
  },
  {
    id: "a5",
    rank: 5,
    name: "Ju Albuquerque",
    handle: "@ju.natreta",
    avatar: "/acasaviews/female-debater-avatar.jpg",
    points: 7420,
    comments: 118,
    likes: 5380,
    replies: 366,
    trend: "same",
    trendValue: 0,
    tag: "alto engajamento",
    tagAccent: "ink",
  },
  {
    id: "a6",
    rank: 6,
    name: "Theo Vasques",
    handle: "@theo.analisa",
    avatar: "/acasaviews/male-professional-avatar.jpg",
    points: 6890,
    comments: 104,
    likes: 4920,
    replies: 311,
    trend: "up",
    trendValue: 4,
    tag: "subiu forte",
    tagAccent: "magenta",
  },
  {
    id: "a7",
    rank: 7,
    name: "Manu Castro",
    handle: "@manu.spoiler",
    avatar: "/acasaviews/woman-student.png",
    points: 6120,
    comments: 97,
    likes: 4310,
    replies: 288,
    trend: "down",
    trendValue: 2,
    tag: "mais comentado",
    tagAccent: "cyan",
  },
  {
    id: "a8",
    rank: 8,
    name: "Rafa Pingo",
    handle: "@rafa.opina",
    avatar: "/acasaviews/man-teacher.png",
    points: 5430,
    comments: 88,
    likes: 3760,
    replies: 240,
    trend: "up",
    trendValue: 1,
    tag: "em alta",
    tagAccent: "ink",
  },
  {
    id: "a9",
    rank: 9,
    name: "Sol Andrade",
    handle: "@sol.daquestao",
    avatar: "/acasaviews/woman-designer.png",
    points: 4980,
    comments: 81,
    likes: 3320,
    replies: 209,
    trend: "same",
    trendValue: 0,
    tag: "teoria forte",
    tagAccent: "gold",
  },
  {
    id: "a10",
    rank: 10,
    name: "Igor Lemos",
    handle: "@igor.notei",
    avatar: "/acasaviews/man-engineer.png",
    points: 4310,
    comments: 73,
    likes: 2890,
    replies: 178,
    trend: "up",
    trendValue: 2,
    tag: "promessa",
    tagAccent: "cyan",
  },
]

// ----------------------------------------------------------------
// RANKING DOS PARTICIPANTES — atenção vira poder
// ----------------------------------------------------------------
export const participantRanking: ParticipantEntry[] = [
  {
    id: "p1",
    rank: 1,
    name: "Valentina Cruz",
    handle: "@valcruz",
    avatar: "/acasaviews/woman-model.png",
    group: "M",
    points: 9840,
    views: 2840000,
    likes: 412000,
    comments: 58400,
    trend: "up",
    trendValue: 1,
    tag: "dona da atenção",
    tagAccent: "magenta",
  },
  {
    id: "p2",
    rank: 2,
    name: "Enzo Marques",
    handle: "@enzomarques",
    avatar: "/acasaviews/man-musician.jpg",
    group: "H",
    points: 8910,
    views: 2410000,
    likes: 367000,
    comments: 51200,
    trend: "up",
    trendValue: 2,
    tag: "explodiu no feed",
    tagAccent: "cyan",
  },
  {
    id: "p3",
    rank: 3,
    name: "Aline Rocha",
    handle: "@alinerocha",
    avatar: "/acasaviews/woman-actress.png",
    group: "M",
    points: 8120,
    views: 2050000,
    likes: 318000,
    comments: 47800,
    trend: "down",
    trendValue: 1,
    tag: "líder da semana",
    tagAccent: "gold",
  },
  {
    id: "p4",
    rank: 4,
    name: "Murilo Sátiro",
    handle: "@murilosatiro",
    avatar: "/acasaviews/man-personal-trainer.jpg",
    group: "H",
    points: 7430,
    views: 1780000,
    likes: 286000,
    comments: 41300,
    trend: "up",
    trendValue: 3,
    tag: "em alta",
    tagAccent: "magenta",
  },
  {
    id: "p5",
    rank: 5,
    name: "Pri Nogueira",
    handle: "@prinogueira",
    avatar: "/acasaviews/female-host-portrait.jpg",
    group: "M",
    points: 6650,
    views: 1490000,
    likes: 241000,
    comments: 35600,
    trend: "same",
    trendValue: 0,
    tag: "mais comentado",
    tagAccent: "cyan",
  },
  {
    id: "p6",
    rank: 6,
    name: "Léo Bastos",
    handle: "@leobastos",
    avatar: "/acasaviews/man-chef.jpg",
    group: "H",
    points: 5870,
    views: 1230000,
    likes: 198000,
    comments: 29400,
    trend: "down",
    trendValue: 2,
    tag: "constante",
    tagAccent: "ink",
  },
  {
    id: "p7",
    rank: 7,
    name: "Nina Tavares",
    handle: "@ninatavares",
    avatar: "/acasaviews/female-professional-avatar.jpg",
    group: "M",
    points: 5120,
    views: 1010000,
    likes: 164000,
    comments: 24100,
    trend: "up",
    trendValue: 1,
    tag: "subindo",
    tagAccent: "magenta",
  },
  {
    id: "p8",
    rank: 8,
    name: "Bruno Aquino",
    handle: "@brunoaquino",
    avatar: "/acasaviews/man-businessman.jpg",
    group: "H",
    points: 4360,
    views: 842000,
    likes: 131000,
    comments: 19800,
    trend: "down",
    trendValue: 3,
    tag: "precisa reagir",
    tagAccent: "ink",
  },
]

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
