import type { Metadata } from "next"
import { RealityMotion } from "@/features/acasaviews/components/reality/reality-motion"
import { fetchLiveRanking } from "@/lib/acasaviews/ranking-live"
import { fetchGeneralRanking, type GeneralEntry } from "@/lib/acasaviews/ranking-geral"
import { RankingHeader } from "@/features/acasaviews/components/acasaviews/ranking/ranking-header"
import { RankingHero } from "@/features/acasaviews/components/acasaviews/ranking/ranking-hero"
import { RankingNav } from "@/features/acasaviews/components/acasaviews/ranking/ranking-nav"
import { RankingPageFooter } from "@/features/acasaviews/components/acasaviews/ranking/ranking-page-footer"
import { AudienceDateAdmin } from "@/features/acasaviews/components/acasaviews/ranking/audience-date-admin"
import { AudienceRankingInteractive } from "./audience-ranking-interactive"

export const metadata: Metadata = {
  title: "Ranking da Audiência | Casa Views",
  description: "A audiência é o 9º jogador. Comentários, teorias e engajamento definem quem domina o ranking.",
}

export const dynamic = "force-dynamic"

export default async function RankingAudienciaPage() {
  const [{ audience, participants }, season] = await Promise.all([
    fetchLiveRanking(),
    fetchGeneralRanking().catch(() => [] as GeneralEntry[]),
  ])

  const totalPoints = audience.reduce((s, e) => s + e.points, 0)
  const totalPeople = audience.length

  return (
    <div className="casa-rank rv rv-grid rv-page-in">
      <RealityMotion />
      <RankingHeader
        category={["RANKING", "AUDIÊNCIA", "JOGO"]}
        pageCurrent={9}
        pageTotal={20}
        switchHref="/acasaviews/ranking-participantes"
        switchLabel="Ver participantes →"
      />

      <AudienceDateAdmin />

      <RankingHero
        title1="RANKING DA"
        title2="AUDIÊNCIA"
        accent="cyan"
        liveLabel="ao vivo"
        kicker="a audiência também joga"
        boxLabel="placar do público"
        lead={
          <>
            A audiência da Casa Views define rumos. Teorias, comentários e engajamento{" "}
            <strong>transformam a conversa em poder.</strong>
          </>
        }
        bigStat={{ label: "pontos em disputa", value: totalPoints, compact: true }}
        sideStat={{ label: "pessoas no público", value: totalPeople }}
      />

      <RankingNav
        current="audiencia"
        photos={{
          audiencia: audience[0]?.avatar || null,
          participantes: participants[0]?.avatar || null,
          geral: season[0]?.avatar_url || null,
        }}
      />

      <AudienceRankingInteractive audience={audience} />

      <RankingPageFooter
        tagline="O 9º JOGADOR SUBIU."
        script="vem também decidir"
        ctaLabel="Entrar no jogo"
        ctaHref="/acasaviews/ranking-participantes"
        accent="cyan"
      />
    </div>
  )
}
