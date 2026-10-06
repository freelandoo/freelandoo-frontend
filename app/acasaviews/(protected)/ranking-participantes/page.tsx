import type { Metadata } from "next"
import { RealityMotion } from "@/features/acasaviews/components/reality/reality-motion"
import { fetchLiveRanking } from "@/lib/acasaviews/ranking-live"
import { fetchGeneralRanking, type GeneralEntry } from "@/lib/acasaviews/ranking-geral"
import { RankingHeader } from "@/features/acasaviews/components/acasaviews/ranking/ranking-header"
import { RankingHero } from "@/features/acasaviews/components/acasaviews/ranking/ranking-hero"
import { RankingNav } from "@/features/acasaviews/components/acasaviews/ranking/ranking-nav"
import { PodiumTop3, type PodiumItem } from "@/features/acasaviews/components/acasaviews/ranking/podium-top3"
import { RankingList } from "@/features/acasaviews/components/acasaviews/ranking/ranking-list"
import { RankingCard } from "@/features/acasaviews/components/acasaviews/ranking/ranking-card"
import { RankingPageFooter } from "@/features/acasaviews/components/acasaviews/ranking/ranking-page-footer"

export const metadata: Metadata = {
  title: "Ranking dos Participantes | Casa Views",
  description: "Visualizações, likes e comentários definem quem domina a temporada na Casa Views.",
}

export const dynamic = "force-dynamic"

export default async function RankingParticipantesPage() {
  const [{ audience, participants }, season] = await Promise.all([
    fetchLiveRanking(),
    fetchGeneralRanking().catch(() => [] as GeneralEntry[]),
  ])

  // os números que o placar soma — os mesmos no pódio e na tabela
  const statsOf = (e: (typeof participants)[number]) => [
    { label: "views", value: e.views, compact: true },
    { label: "likes", value: e.likes, compact: true },
    { label: "comentários", value: e.comments, compact: true },
  ]

  const top3: PodiumItem[] = participants.slice(0, 3).map((e) => ({
    rank: e.rank,
    name: e.name,
    handle: e.handle,
    avatar: e.avatar,
    score: e.points,
    scoreLabel: "pontos",
    tag: e.tag,
    tagAccent: e.tagAccent,
    meta: statsOf(e),
  }))

  const rest = participants.slice(3)
  const totalPoints = participants.reduce((s, e) => s + e.points, 0)
  const totalPeople = participants.length

  return (
    <div className="casa-rank rv rv-grid rv-page-in">
      <RealityMotion />
      <RankingHeader
        category={["RANKING", "PARTICIPANTES", "PERFORMANCE"]}
        pageCurrent={8}
        pageTotal={20}
        switchHref="/acasaviews/ranking-audiencia"
        switchLabel="Ver audiência →"
      />

      <RankingHero
        title1="RANKING DOS"
        title2="PARTICIPANTES"
        accent="magenta"
        liveLabel="ao vivo"
        kicker="atenção vira poder"
        boxLabel="placar da casa"
        lead={
          <>
            Visualizações, likes e comentários <strong>definem quem domina a temporada.</strong> Postou, pontuou.
          </>
        }
        bigStat={{ label: "pontos somados hoje", value: totalPoints, compact: true }}
        sideStat={{ label: "participantes em disputa", value: totalPeople }}
      />

      <RankingNav
        current="participantes"
        photos={{
          audiencia: audience[0]?.avatar || null,
          participantes: participants[0]?.avatar || null,
          geral: season[0]?.avatar_url || null,
        }}
      />

      <PodiumTop3
        items={top3}
        accent="magenta"
        side={{
          title: ["Top 3", "da casa"],
          text: "Quem domina o post domina a casa. Views, likes e comentários das redes, somados ao vivo.",
          script: "performance também é jogo",
        }}
      />

      <RankingList
        title="A casa inteira!"
        subtitle="quem está dominando a temporada"
        emptyText={top3.length === 0 ? "O placar abre assim que os números chegarem das redes." : undefined}
      >
        {rest.map((e) => (
          <RankingCard
            key={e.id}
            rank={e.rank}
            name={e.name}
            handle={e.handle}
            avatar={e.avatar}
            score={e.points}
            scoreLabel="pontos"
            trend={e.trend}
            trendValue={e.trendValue}
            tag={e.tag}
            tagAccent={e.tagAccent}
            accent="magenta"
            stats={statsOf(e)}
          />
        ))}
      </RankingList>

      <RankingPageFooter
        tagline="QUEM PERFORMA, SOBE."
        script="postou, pontuou"
        ctaLabel="Ver a audiência"
        ctaHref="/acasaviews/ranking-audiencia"
        accent="magenta"
      />
    </div>
  )
}
