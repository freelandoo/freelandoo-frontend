import type { Metadata } from "next"
import { Eye, Flame, TrendingUp } from "lucide-react"
import { RealityMotion } from "@/features/acasaviews/components/reality/reality-motion"
import { fetchLiveRanking } from "@/lib/acasaviews/ranking-live"
import { RankingHeader } from "@/features/acasaviews/components/acasaviews/ranking/ranking-header"
import { RankingHero } from "@/features/acasaviews/components/acasaviews/ranking/ranking-hero"
import { PodiumTop3, type PodiumItem } from "@/features/acasaviews/components/acasaviews/ranking/podium-top3"
import { RankingFilterBar } from "@/features/acasaviews/components/acasaviews/ranking/ranking-filter-bar"
import { RankingList } from "@/features/acasaviews/components/acasaviews/ranking/ranking-list"
import { RankingCard } from "@/features/acasaviews/components/acasaviews/ranking/ranking-card"
import { RankingHighlightNote } from "@/features/acasaviews/components/acasaviews/ranking/ranking-highlight-note"
import { RankingPageFooter } from "@/features/acasaviews/components/acasaviews/ranking/ranking-page-footer"

export const metadata: Metadata = {
  title: "Ranking dos Participantes | Casa Views",
  description: "Atenção vira poder. Views, likes e comentários definem quem domina a temporada.",
}

export const dynamic = "force-dynamic"

export default async function RankingParticipantesPage() {
  const { participants } = await fetchLiveRanking()

  const top3: PodiumItem[] = participants.slice(0, 3).map((e) => ({
    rank: e.rank,
    name: e.name,
    handle: e.handle,
    avatar: e.avatar,
    score: e.points,
    scoreLabel: "pontos",
    tag: e.tag,
    tagAccent: e.tagAccent,
    meta: [],
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
        lead={
          <>
            Na Casa Views, <strong>atenção vira poder.</strong> Visualizações, likes e comentários definem quem está
            dominando a temporada.
          </>
        }
        bigStat={{ label: "pontos da temporada", value: totalPoints, compact: true }}
        sideStat={{ label: "na casa", value: totalPeople }}
      />

      {/* Insights */}
      <section className="mx-auto grid max-w-[1600px] gap-4 px-4 pb-6 md:grid-cols-3 md:px-8">
        <RankingHighlightNote
          icon={Eye}
          kicker="postou, pontuou"
          text="Cada view conta no placar da casa."
          index={1}
        />
        <RankingHighlightNote
          icon={Flame}
          kicker="quem domina o post domina a casa"
          text="A atenção virou a moeda da temporada."
          index={2}
        />
        <RankingHighlightNote
          icon={TrendingUp}
          kicker="performance também é jogo"
          text="Subir no feed é subir no ranking."
          index={3}
        />
      </section>

      <PodiumTop3 items={top3} accent="magenta" />

      <RankingFilterBar options={["Geral", "Views", "Likes", "Em alta"]} accent="magenta" note="quem performa, sobe" />

      <RankingList
        title="A casa inteira"
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
            stats={[]}
          />
        ))}
      </RankingList>

      <RankingPageFooter
        tagline="QUEM PERFORMA, SOBE."
        ctaLabel="Ver a audiência"
        ctaHref="/acasaviews/ranking-audiencia"
        accent="magenta"
      />
    </div>
  )
}
