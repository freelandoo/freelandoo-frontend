import type { Metadata } from "next"
import { MessageSquare, Sparkles, Trophy } from "lucide-react"
import { casaFontVars } from "@/lib/acasaviews/fonts"
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
  title: "Ranking da Audiência | Casa Views",
  description: "A audiência é o 9º jogador. Comentários, teorias e engajamento definem quem domina o ranking.",
}

export const dynamic = "force-dynamic"

export default async function RankingAudienciaPage() {
  const { audience } = await fetchLiveRanking()

  const top3: PodiumItem[] = audience.slice(0, 3).map((e) => ({
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

  const rest = audience.slice(3)
  const totalPoints = audience.reduce((s, e) => s + e.points, 0)
  const totalPeople = audience.length

  return (
    <div className={`${casaFontVars} casa-rank casa-paper min-h-screen overflow-hidden`}>
      {/* halftone decorativo nos cantos */}
      <div className="casa-dots pointer-events-none absolute right-0 top-24 h-32 w-32 opacity-[0.07]" />

      <RankingHeader
        category={["RANKING", "AUDIÊNCIA", "JOGO"]}
        pageCurrent={9}
        pageTotal={20}
        switchHref="/acasaviews/ranking-participantes"
        switchLabel="Ver participantes →"
      />

      <RankingHero
        title1="RANKING DA"
        title2="AUDIÊNCIA"
        accent="cyan"
        liveLabel="ao vivo"
        lead={
          <>
            A audiência não apenas assiste. <span className="casa-hl casa-hl-magenta font-bold text-white">Ela joga.</span>{" "}
            Comentários relevantes, <span className="casa-hl font-bold">teorias fortes</span> e discussões que
            movimentam a narrativa fazem o público subir no ranking.
          </>
        }
        bigStat={{ label: "pontos em disputa", value: totalPoints, compact: true }}
        sideStat={{ label: "no público", value: totalPeople }}
      />

      {/* Insights */}
      <section className="mx-auto grid max-w-7xl gap-4 px-5 pb-6 md:grid-cols-3 md:px-10">
        <RankingHighlightNote
          icon={Sparkles}
          kicker="a melhor teoria sobe"
          text="Quem movimenta a conversa domina o ranking."
          accent="cyan"
          rotate={-1}
        />
        <RankingHighlightNote
          icon={Trophy}
          kicker="o 9º jogador tem poder"
          text="Status e mérito viram vantagem dentro da casa."
          accent="gold"
        />
        <RankingHighlightNote
          icon={MessageSquare}
          kicker="comentar bem é jogar melhor"
          text="Likes, respostas e relevância valem pontos."
          accent="magenta"
          rotate={1}
        />
      </section>

      <PodiumTop3 items={top3} accent="cyan" />

      <RankingFilterBar options={["Geral", "Semana", "Hoje", "Em alta"]} accent="cyan" note="atualiza ao vivo" />

      <RankingList title="O resto do júri" subtitle="quem mais movimenta o jogo">
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
            accent="cyan"
            stats={[]}
          />
        ))}
      </RankingList>

      <RankingPageFooter
        tagline="O 9º JOGADOR SUBIU."
        ctaLabel="Entrar no jogo"
        ctaHref="/acasaviews/ranking-participantes"
        accent="cyan"
      />
    </div>
  )
}
