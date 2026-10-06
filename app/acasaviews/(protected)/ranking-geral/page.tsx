import type { Metadata } from "next"
import { RealityMotion } from "@/features/acasaviews/components/reality/reality-motion"
import { fetchGeneralRanking, type GeneralEntry } from "@/lib/acasaviews/ranking-geral"
import { fetchLiveRanking } from "@/lib/acasaviews/ranking-live"
import type { AudienceEntry, ParticipantEntry } from "@/lib/acasaviews/ranking-data"
import { RankingHeader } from "@/features/acasaviews/components/acasaviews/ranking/ranking-header"
import { RankingHero } from "@/features/acasaviews/components/acasaviews/ranking/ranking-hero"
import { RankingNav } from "@/features/acasaviews/components/acasaviews/ranking/ranking-nav"
import { PodiumTop3, type PodiumItem } from "@/features/acasaviews/components/acasaviews/ranking/podium-top3"
import { RankingList } from "@/features/acasaviews/components/acasaviews/ranking/ranking-list"
import { RankingCard } from "@/features/acasaviews/components/acasaviews/ranking/ranking-card"
import { RankingPageFooter } from "@/features/acasaviews/components/acasaviews/ranking/ranking-page-footer"

export const metadata: Metadata = {
  title: "Ranking Geral | Casa Views",
  description:
    "A temporada inteira em um placar. Cada dia fecha valendo pontos por posição (8/7/6/5/4) — consistência vence o pico viral.",
}

export const dynamic = "force-dynamic"

export default async function RankingGeralPage() {
  const [standings, live] = await Promise.all([
    fetchGeneralRanking(),
    fetchLiveRanking().catch(() => ({ audience: [] as AudienceEntry[], participants: [] as ParticipantEntry[] })),
  ])

  const handleOf = (e: GeneralEntry) => (e.slug ? `@${e.slug}` : `@${e.ranking_user_id}`)
  const tagOf = (e: GeneralEntry) => (e.vitorias > 0 ? `${e.vitorias}× 1º lugar` : "na disputa")
  const statsOf = (e: GeneralEntry) => [
    { label: "vitórias", value: e.vitorias },
    { label: "dias", value: e.dias },
  ]

  const top3: PodiumItem[] = standings.slice(0, 3).map((e) => ({
    rank: e.posicao,
    name: e.display_name,
    handle: handleOf(e),
    avatar: e.avatar_url || "",
    score: e.pontos_geral,
    scoreLabel: "pontos",
    tag: tagOf(e),
    tagAccent: "gold",
    meta: statsOf(e),
  }))

  const rest = standings.slice(3)
  const totalPoints = standings.reduce((s, e) => s + e.pontos_geral, 0)
  const totalPeople = standings.length

  return (
    <div className="casa-rank rv rv-grid rv-page-in">
      <RealityMotion />
      <RankingHeader
        category={["RANKING", "GERAL", "TEMPORADA"]}
        pageCurrent={9}
        pageTotal={20}
        switchHref="/acasaviews/ranking-participantes"
        switchLabel="Ver o diário →"
      />

      <RankingHero
        title1="RANKING"
        title2="GERAL"
        accent="magenta"
        liveLabel="temporada"
        kicker="consistência vence o viral"
        boxLabel="placar da temporada"
        lead={
          <>
            Todo dia <strong>fecha valendo pontos por posição</strong>: 1º = 8, 2º = 7, 3º = 6, 4º = 5 e os demais 4.
          </>
        }
        bigStat={{ label: "pontos acumulados", value: totalPoints, compact: true }}
        sideStat={{ label: "na disputa da temporada", value: totalPeople }}
      />

      <RankingNav
        current="geral"
        photos={{
          audiencia: live.audience[0]?.avatar || null,
          participantes: live.participants[0]?.avatar || null,
          geral: standings[0]?.avatar_url || null,
        }}
      />

      <PodiumTop3
        items={top3}
        accent="magenta"
        side={{
          title: ["Top 3", "da temporada"],
          text: "Não importa o tamanho do número — importa a posição do dia. Quem é consistente sobe.",
          script: "todo dia conta",
        }}
      />

      <RankingList
        title="A temporada inteira!"
        subtitle="soma dos pontos de posição, dia a dia"
        note="atualiza a cada fechamento diário"
        emptyText={top3.length === 0 ? "O placar geral começa após o primeiro fechamento diário." : undefined}
      >
        {rest.map((e) => (
          <RankingCard
            key={e.ranking_user_id}
            rank={e.posicao}
            name={e.display_name}
            handle={handleOf(e)}
            avatar={e.avatar_url || ""}
            score={e.pontos_geral}
            scoreLabel="pontos"
            trend="same"
            trendValue={0}
            tag={tagOf(e)}
            tagAccent="gold"
            accent="magenta"
            stats={statsOf(e)}
          />
        ))}
      </RankingList>

      <RankingPageFooter
        tagline="CONSISTÊNCIA VENCE."
        script="fechou em 1º, fechou com 8"
        ctaLabel="Ver o ranking do dia"
        ctaHref="/acasaviews/ranking-participantes"
        accent="magenta"
      />
    </div>
  )
}
