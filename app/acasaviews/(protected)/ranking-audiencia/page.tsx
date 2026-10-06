import type { Metadata } from "next"
import { MessageSquare, Sparkles, Trophy } from "lucide-react"
import { RealityMotion } from "@/features/acasaviews/components/reality/reality-motion"
import { fetchLiveRanking } from "@/lib/acasaviews/ranking-live"
import { RankingHeader } from "@/features/acasaviews/components/acasaviews/ranking/ranking-header"
import { RankingHero } from "@/features/acasaviews/components/acasaviews/ranking/ranking-hero"
import { RankingFilterBar } from "@/features/acasaviews/components/acasaviews/ranking/ranking-filter-bar"
import { RankingHighlightNote } from "@/features/acasaviews/components/acasaviews/ranking/ranking-highlight-note"
import { RankingPageFooter } from "@/features/acasaviews/components/acasaviews/ranking/ranking-page-footer"
import { AudienceDateAdmin } from "@/features/acasaviews/components/acasaviews/ranking/audience-date-admin"
import { AudienceRankingInteractive } from "./audience-ranking-interactive"

export const metadata: Metadata = {
  title: "Ranking da Audiência | Casa Views",
  description: "A audiência é o 9º jogador. Comentários, teorias e engajamento definem quem domina o ranking.",
}

export const dynamic = "force-dynamic"

export default async function RankingAudienciaPage() {
  const { audience } = await fetchLiveRanking()

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
        lead={
          <>
            A audiência não apenas assiste. <strong>Ela joga.</strong> Comentários relevantes, teorias fortes e
            discussões que movimentam a narrativa fazem o público subir no ranking.
          </>
        }
        bigStat={{ label: "pontos em disputa", value: totalPoints, compact: true }}
        sideStat={{ label: "no público", value: totalPeople }}
      />

      <section className="mx-auto grid max-w-[1600px] gap-4 px-4 pb-10 md:grid-cols-3 md:px-8">
        <RankingHighlightNote
          icon={Sparkles}
          kicker="a melhor teoria sobe"
          text="Quem movimenta a conversa domina o ranking."
          index={1}
        />
        <RankingHighlightNote
          icon={Trophy}
          kicker="o 9º jogador tem poder"
          text="Status e mérito viram vantagem dentro da casa."
          index={2}
        />
        <RankingHighlightNote
          icon={MessageSquare}
          kicker="comentar bem é jogar melhor"
          text="Likes, respostas e relevância valem pontos."
          index={3}
        />
      </section>

      <RankingFilterBar options={["Geral", "Semana", "Hoje", "Em alta"]} accent="cyan" note="atualiza ao vivo" />

      <AudienceRankingInteractive audience={audience} />

      <RankingPageFooter
        tagline="O 9º JOGADOR SUBIU."
        ctaLabel="Entrar no jogo"
        ctaHref="/acasaviews/ranking-participantes"
        accent="cyan"
      />
    </div>
  )
}
