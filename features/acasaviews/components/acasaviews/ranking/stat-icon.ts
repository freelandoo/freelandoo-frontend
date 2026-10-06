import {
  BarChart3,
  Bookmark,
  CalendarDays,
  Eye,
  Heart,
  MessageCircle,
  Reply,
  Send,
  Trophy,
  type LucideIcon,
} from "lucide-react"

/**
 * Ícone de cada número do placar, pelo RÓTULO que a página já manda
 * ("likes", "comentários"…). Um lugar só: o pódio e a linha da tabela
 * desenham o mesmo ícone para o mesmo número. Rótulo desconhecido cai no
 * gráfico — nunca some.
 */
const MAP: [RegExp, LucideIcon][] = [
  [/^view|visualiz/i, Eye],
  [/^like|curtid/i, Heart],
  [/^coment/i, MessageCircle],
  [/^respost|repl/i, Reply],
  [/^share|compart/i, Send],
  [/^salv/i, Bookmark],
  [/^vit[oó]ri/i, Trophy],
  [/^dia/i, CalendarDays],
]

export function statIcon(label: string): LucideIcon {
  for (const [re, icon] of MAP) if (re.test(label)) return icon
  return BarChart3
}
