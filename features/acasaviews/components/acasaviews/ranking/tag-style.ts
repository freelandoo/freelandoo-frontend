import type { Accent } from "@/lib/acasaviews/ranking-data"

/**
 * Etiqueta (tag) de participante/audiência na pele escura. O dado ainda fala
 * a paleta antiga (magenta/cyan/gold/ink); aqui ela vira preto, branco e rosa.
 * Um lugar só — o pódio e o cartão da lista desenham a MESMA etiqueta.
 */
export function tagClass(accent: Accent): string {
  switch (accent) {
    case "magenta":
      return "bg-[var(--rv-pink)] text-[var(--rv-white)]"
    case "cyan":
      return "bg-[var(--rv-white)] text-[var(--rv-bg)]"
    case "gold":
      return "border border-[var(--rv-pink)] text-[var(--rv-pink-ink)]"
    default:
      return "border border-[var(--rv-line-strong)] text-[var(--rv-white)]"
  }
}
