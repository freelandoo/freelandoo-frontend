import type { Metadata } from "next"
import { RankingPageClient } from "./_components/ranking-page-client"

export const metadata: Metadata = {
  title: "Ranking | Freelandoo",
  description:
    "Top 10 da Freelandoo por ranking geral, máquina, profissão e cidade.",
}

export default function RankingPage() {
  return <RankingPageClient />
}
