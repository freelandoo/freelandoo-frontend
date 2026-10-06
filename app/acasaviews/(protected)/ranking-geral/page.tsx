import type { Metadata } from "next"
import { Trophy, Scale, CalendarDays } from "lucide-react"
import { RealityMotion } from "@/features/acasaviews/components/reality/reality-motion"
import { fetchGeneralRanking } from "@/lib/acasaviews/ranking-geral"
import { RankingHeader } from "@/features/acasaviews/components/acasaviews/ranking/ranking-header"
import { RankingHero } from "@/features/acasaviews/components/acasaviews/ranking/ranking-hero"
import { PodiumTop3, type PodiumItem } from "@/features/acasaviews/components/acasaviews/ranking/podium-top3"
import { RankingList } from "@/features/acasaviews/components/acasaviews/ranking/ranking-list"
import { RankingCard } from "@/features/acasaviews/components/acasaviews/ranking/ranking-card"
import { RankingHighlightNote } from "@/features/acasaviews/components/acasaviews/ranking/ranking-highlight-note"
import { RankingPageFooter } from "@/features/acasaviews/components/acasaviews/ranking/ranking-page-footer"

export const metadata: Metadata = {
  title: "Ranking Geral | Casa Views",
  description:
    "A temporada inteira em um placar. Cada dia fecha valendo pontos por posição (8/7/6/5/4) — consistência vence o pico viral.",
}

export const dynamic = "force-dynamic"

export default async function RankingGeralPage() {
  const standings = await fetchGeneralRanking()

  const top3: PodiumItem[] = standings.slice(0, 3).map((e) => ({
    rank: e.posicao,
    name: e.display_name,
    handle: e.slug ? `@${e.slug}` : `@${e.ranking_user_id}`,
    avatar: e.avatar_url || "",
    score: e.pontos_geral,
    scoreLabel: "pontos",
    tag: e.vitorias > 0 ? `${e.vitorias}× 1º lugar` : "na disputa",
    tagAccent: "gold",
    meta: [],
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
        lead={
          <>
            A temporada inteira em um placar. Todo dia <strong>fecha valendo pontos por posição</strong> — 1º = 8, 2º = 7,
            3º = 6, 4º = 5 e os demais 4. Consistência vence o pico viral.
          </>
        }
        bigStat={{ label: "pontos acumulados", value: totalPoints, compact: true }}
        sideStat={{ label: "na disputa", value: totalPeople }}
      />

      {/* Como funciona */}
      <section className="mx-auto grid max-w-[1600px] gap-4 px-4 pb-6 md:grid-cols-3 md:px-8">
        <RankingHighlightNote
          icon={Scale}
          kicker="paridade acima de tudo"
          text="Não importa o tamanho do número — importa a posição do dia."
          index={1}
        />
        <RankingHighlightNote
          icon={Trophy}
          kicker="fechou em 1º, fechou com 8"
          text="Cada dia vira 8/7/6/5/4 pontos e soma na temporada."
          index={2}
        />
        <RankingHighlightNote
          icon={CalendarDays}
          kicker="todo dia conta"
          text="Quem é consistente sobe — um viral isolado não decide."
          index={3}
        />
      </section>

      <PodiumTop3 items={top3} accent="magenta" />

      <RankingList
        title="A temporada inteira"
        subtitle="soma dos pontos de posição, dia a dia"
        emptyText={top3.length === 0 ? "O placar geral começa após o primeiro fechamento diário." : undefined}
      >
        {rest.map((e) => (
            <RankingCard
              key={e.ranking_user_id}
              rank={e.posicao}
              name={e.display_name}
              handle={e.slug ? `@${e.slug}` : `@${e.ranking_user_id}`}
              avatar={e.avatar_url || ""}
              score={e.pontos_geral}
              scoreLabel="pontos"
              trend="same"
              trendValue={0}
              tag={e.vitorias > 0 ? `${e.vitorias}× 1º` : "na disputa"}
              tagAccent="gold"
              accent="magenta"
              stats={[
                { label: "vitórias", value: e.vitorias },
                { label: "dias", value: e.dias },
              ]}
            />
          ))}
      </RankingList>

      <RankingPageFooter
        tagline="CONSISTÊNCIA VENCE."
        ctaLabel="Ver o ranking do dia"
        ctaHref="/acasaviews/ranking-participantes"
        accent="magenta"
      />
    </div>
  )
}
