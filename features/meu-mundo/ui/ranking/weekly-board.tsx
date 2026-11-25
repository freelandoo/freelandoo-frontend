"use client"

// features/meu-mundo/ui/ranking/weekly-board.tsx — lore v2 N1: o placar da SEMANA.
//
// Um ranking por jogável (Jetpack, Rolê, Antigravidade, Gincana, Paint, Lâminas,
// Boxe, Hall e Poder), da semana de agora ou da passada. A semana vai de domingo
// a sábado 23:59 (Brasília); quem grava a marca é o servidor, no recibo da
// partida (utils/meuMundoScores.js no back). N2: a posição vira néctar (o
// servidor manda quanto cada linha vale) e a carteira fica no topo (nectar-card).
// Nada é calculado aqui além do formato do número.

import { useCallback, useEffect, useState } from "react"
import { Crown, RefreshCw } from "lucide-react"
import { getToken } from "@/lib/auth"
import { getWeeklyRanking, WEEKLY_GAMES, type WeeklyGame, type WeeklyRanking } from "../../data"
import { MM } from "../hud/tokens"
import { EvoButton } from "../hud/hud-kit"
import { archivo } from "../status/evo-skin"
import { RankingRowView } from "./ranking-panel"
import { NectarCard, liters } from "./nectar-card"

type Tr = (key: string, fallback: string) => string

/** Nome de cada jogável (chave + fallback pt). */
export const GAME_LABEL: Record<WeeklyGame, [string, string]> = {
  jetpack: ["rkGameJetpack", "Jetpack"],
  noturno: ["rkGameNoturno", "Rolê Noturno"],
  corrida: ["rkGameCorrida", "Antigravidade"],
  gincana: ["rkGameGincana", "Gincana"],
  paint: ["rkGamePaint", "Paint"],
  laminas: ["rkGameLaminas", "Lâminas"],
  boxe: ["rkGameBoxe", "Boxe"],
  hall: ["rkGameHall", "Hall"],
  poder: ["rkGamePoder", "Poder"],
}

/** O que vale em cada jogo (a mesma regra do servidor, dita para quem joga). */
const HINT: Record<WeeklyGame, [string, string]> = {
  jetpack: ["rkWkHintPts", "Vale a sua melhor pontuação numa partida da semana."],
  noturno: ["rkWkHintPts", "Vale a sua melhor pontuação numa partida da semana."],
  corrida: ["rkWkHintTime", "Vale o seu melhor tempo da semana. Só conta quem chega."],
  gincana: ["rkWkHintTime", "Vale o seu melhor tempo da semana. Só conta quem chega."],
  paint: ["rkWkHintPaint", "Vale o maior dano que você causou numa partida da semana."],
  laminas: ["rkWkHintWins", "Vale quantas lutas você venceu na semana."],
  boxe: ["rkWkHintWins", "Vale quantas lutas você venceu na semana."],
  hall: ["rkWkHintWins", "Vale quantas lutas você venceu na semana."],
  poder: ["rkWkHintPoder", "O seu Poder de agora: não zera com a semana."],
}

/** Domingo anterior (AAAA-MM-DD). */
const prevWeek = (w: string) => new Date(Date.parse(`${w}T00:00:00Z`) - 7 * 86400000).toISOString().slice(0, 10)

/**
 * legend-v1 (24/11/2026): o prêmio Lendário do 1º lugar da semana (minijogos) e a regra da disputa — o servidor
 * manda o que o 1º leva (`prize`) e quantas pessoas a partida precisa ter (`multiOnly`).
 */
export function WeeklyPrize({ cur, t, locale }: { cur: WeeklyRanking; t: Tr; locale: string }) {
  if (!cur.prize) return null
  const legend = cur.prize.items.find((x) => x.id === "frag_classe_legendary")
  const extra = cur.prize.items.filter((x) => x.id !== "frag_classe_legendary")
  const from = new Date(`${cur.prize.fromWeek}T12:00:00Z`).toLocaleDateString(locale, { day: "2-digit", month: "2-digit", timeZone: "UTC" })
  return (
    <div className="mb-2 flex gap-2.5 px-3 py-2.5" style={{ background: "linear-gradient(90deg, rgba(242,183,5,0.16), rgba(242,183,5,0.04))", border: `1px solid ${MM.gold}66` }}>
      <Crown className="mt-0.5 h-5 w-5 shrink-0" style={{ color: MM.gold }} />
      <div className="min-w-0 text-[12.5px] leading-snug">
        <div className={`${archivo.className} font-bold`} style={{ color: MM.gold }}>
          {t("rkPrizeTitle", "1º lugar da semana ganha fragmentos Lendários")}
        </div>
        <div style={{ color: MM.text }}>
          {legend &&
            t("rkPrizeLegend", "{n} fragmentos de classe Lendária. Juntando 180, você monta a arma Lendária que quiser na Forja.").replace("{n}", legend.qty.toLocaleString(locale))}
          {extra.length > 0 && cur.game === "paint" && (
            <> {t("rkPrizeBastor", "E mais {n} fragmentos de cada peça do conjunto dos Moldes (Bastor).").replace("{n}", String(extra[0].qty))}</>
          )}
        </div>
        <div className="mt-0.5" style={{ color: MM.muted }}>
          {t("rkPrizeMulti", "Só contam partidas com {n} ou mais jogadores. O prêmio cai na virada da semana (domingo).").replace("{n}", String(cur.multiOnly ?? 2))}
          {!cur.prize.active && <> {t("rkPrizeFrom", "Vale a partir da semana de {d}.").replace("{d}", from)}</>}
        </div>
      </div>
    </div>
  )
}

export function WeeklyBoard({ t, locale, only }: { t: Tr; locale: string; only?: WeeklyGame }) {
  const [picked, setGame] = useState<WeeklyGame>(only ?? "jetpack")
  // legend-v1: dentro da tela de fases de um minijogo, o ranking é só o daquele jogo
  const game = only ?? picked
  const [past, setPast] = useState(false)
  const [cache, setCache] = useState<Record<string, WeeklyRanking>>({})
  const [current, setCurrent] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const week = past && current ? prevWeek(current) : null
  const key = `${game}:${week ?? "now"}`

  const load = useCallback(async (g: WeeklyGame, w: string | null, k: string) => {
    const token = getToken()
    if (!token) return
    setError(null)
    const r = await getWeeklyRanking(token, g, w ?? undefined)
    if (!r.ok) return setError(k)
    setCache((c) => ({ ...c, [k]: r.data }))
    if (r.data.current) setCurrent(r.data.week)
  }, [])
  useEffect(() => {
    if (!cache[key]) void load(game, week, key)
  }, [cache, key, game, week, load])

  const cur = cache[key]
  const fmtTime = (ms: number) => {
    const s = ms / 1000
    const m = Math.floor(s / 60)
    const rest = (s - m * 60).toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2, minimumIntegerDigits: m ? 2 : 1 })
    return m ? `${m}:${rest}` : rest
  }
  const fmt = (n: number) => (cur?.unit === "ms" ? fmtTime(n) : Math.round(n).toLocaleString(locale))
  const unit = !cur
    ? ""
    : cur.unit === "ms"
      ? t("rkUnitTime", "tempo")
      : cur.unit === "wins"
        ? t("rkUnitWins", "vitórias")
        : game === "paint"
          ? t("rkUnitDmg", "de dano")
          : game === "poder"
            ? t("rkUnitPoder", "de poder")
            : t("rkUnitPts", "pts")
  const meInTop = !!cur?.me && cur.top.some((r) => r.position === cur.me!.position)
  const closes = cur ? new Date(cur.endsAt) : null

  const badge = (ml?: number, position?: number) => {
    const nectar = ml ? `+${liters(ml, locale)}` : ""
    // legend-v1: a linha do 1º lugar mostra que leva a Lendária
    const crown = cur?.prize && position === cur.prize.position ? t("rkPrizeBadge", "Lendária") : ""
    return [crown, nectar].filter(Boolean).join(" · ") || undefined
  }

  return (
    <div>
      {!only && <NectarCard t={t} locale={locale} gameName={(g) => t(GAME_LABEL[g][0], GAME_LABEL[g][1])} />}
      {/* os jogáveis */}
      <div className="-mx-1 mb-2 flex gap-1.5 overflow-x-auto px-1 pb-1" role="tablist" aria-label={t("rkWkGames", "Jogos")} hidden={!!only}>
        {WEEKLY_GAMES.map((g) => (
          <button
            key={g}
            type="button"
            role="tab"
            aria-selected={game === g}
            onClick={() => setGame(g)}
            className={`${archivo.className} h-8 shrink-0 rounded-full px-3 text-[12px] font-semibold`}
            style={{ background: game === g ? MM.rubySoft : MM.card, color: game === g ? MM.gold : MM.muted, border: `1px solid ${game === g ? MM.gold : MM.border}` }}
          >
            {t(GAME_LABEL[g][0], GAME_LABEL[g][1])}
          </button>
        ))}
      </div>

      {/* esta semana × a passada (o Poder não tem semana) */}
      {game !== "poder" && (
        <div className="mb-2 flex gap-1.5" role="radiogroup" aria-label={t("rkWkWhich", "Semana")}>
          {[false, true].map((p) => (
            <button
              key={String(p)}
              type="button"
              role="radio"
              aria-checked={past === p}
              disabled={p && !current}
              onClick={() => setPast(p)}
              className={`${archivo.className} h-7 px-2.5 text-[12px] font-semibold disabled:opacity-50`}
              style={{ background: past === p ? MM.rubySoft : "transparent", color: past === p ? MM.text : MM.muted, border: `1px solid ${past === p ? MM.rubyBorder : MM.border}` }}
            >
              {p ? t("rkWkPast", "Semana passada") : t("rkWkNow", "Esta semana")}
            </button>
          ))}
        </div>
      )}

      {cur && <WeeklyPrize cur={cur} t={t} locale={locale} />}

      <p className="mb-2 text-[12px]" style={{ color: MM.muted }}>
        {t(HINT[game][0], HINT[game][1])}
        {cur && game !== "poder" && closes && (
          <>
            {" "}
            {cur.current
              ? t("rkWkCloses", "Fecha {when} (Brasília).").replace(
                  "{when}",
                  closes.toLocaleString(locale, { weekday: "long", hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" })
                )
              : t("rkWkClosed", "Semana encerrada.")}
          </>
        )}
      </p>

      {error === key ? (
        <div className="flex flex-col items-center gap-3 py-10 text-center" style={{ color: MM.muted }} role="alert">
          {t("rkLoadFail", "Não carregou o ranking.")}
          <EvoButton variant="gold" size="sm" icon={<RefreshCw className="h-4 w-4" />} onClick={() => void load(game, week, key)}>
            {t("ibRetry", "Tentar de novo")}
          </EvoButton>
        </div>
      ) : !cur ? (
        <ul className="flex flex-col gap-1.5" aria-hidden>
          {Array.from({ length: 6 }, (_, i) => (
            <li key={i} className="h-12" style={{ background: MM.card }} />
          ))}
        </ul>
      ) : cur.top.length === 0 ? (
        <p className="py-10 text-center text-[14px]" style={{ color: MM.muted }}>
          {cur.current ? t("rkWkEmpty", "Ninguém jogou esta semana ainda. Quem jogar primeiro já começa na frente.") : t("rkEmpty", "Ninguém no ranking ainda.")}
        </p>
      ) : (
        <>
          <ol className="flex max-h-[44vh] flex-col gap-1.5 overflow-y-auto pr-1" aria-label={t(GAME_LABEL[game][0], GAME_LABEL[game][1])}>
            {cur.top.map((r) => (
              <li key={`${r.position}-${r.idUser ?? r.name}`}>
                <RankingRowView row={r} mine={!!cur.me && cur.me.position === r.position} value={fmt(r.value)} unit={unit} t={t} badge={badge(r.ml, r.position)} />
              </li>
            ))}
          </ol>
          {cur.me && !meInTop && (
            <div className="mt-2 border-t pt-2" style={{ borderColor: MM.border }}>
              <RankingRowView row={cur.me} mine value={fmt(cur.me.value)} unit={unit} t={t} badge={badge(cur.me.ml, cur.me.position)} />
            </div>
          )}
          {!cur.me && (
            <p className="mt-2 text-[12px]" style={{ color: MM.muted }}>
              {t("rkWkMeNone", "Você ainda não pontuou neste jogo nesta semana.")}
            </p>
          )}
        </>
      )}
    </div>
  )
}
