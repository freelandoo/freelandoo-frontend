"use client"

// /games/ranking — a fila da PLATAFORMA DE GAMES, em três abas planas:
// Minha cidade · Meu estado · Horas jogadas.
//
// É a cópia da página de ranking do Financeiro (`wallet/ranking/page.tsx`) com
// a terceira aba: as duas primeiras são a régua de ATIVIDADE (mig 226 —
// curtida 1 · comentário 2 · compartilhamento 3 · 10 min online = 1 ponto,
// contados só sobre o que acontece DENTRO de games); a terceira é a da Steam
// (mig 220), que responde OUTRA pergunta — "quem joga mais" × "quem está mais
// presente aqui" — e por isso convive com as duas.
//
// ⚠️ OS PESOS VÊM DO BACKEND (`weights`), não são copiados aqui.
//
// ⚠️ A ABA DE HORAS TEM UM VAZIO A MAIS: a flag `games_conexao` (a conexão de
// plataforma) pode estar desligada, e aí o backend responde 403. Não é "ninguém
// jogou": é "a Estante está desligada", e a frase diz isso. E quem não tem
// estante PÚBLICA não tem linha — a fila só entra com `visibility='public'`,
// porque um ranking que publicasse as horas de quem fechou a estante
// transformaria a escolha dela em nada.

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { AlertCircle, Clock, MapPin, Trophy } from "lucide-react"
import { useMeProfile } from "@/hooks/use-me-profile"
import { useTranslations } from "@/components/i18n/I18nProvider"
import { getToken } from "@/lib/auth"
import { cn } from "@/lib/utils"
import { GamesShell } from "../_components/games-shell"
import { GamesHeadcard } from "../_components/games-headcard"
import { PURPLE, PURPLE_DEEP, StateBox, initialsOf } from "../_components/games-ui"

type Scope = "city" | "state" | "hours"

type ActivityRow = {
  id_user: string
  username: string | null
  name: string | null
  avatar_url: string | null
  position: number
  total?: number
  score: number
  likes: number
  comments: number
  shares: number
  minutes: number
}
type ActivityPayload = {
  metric: "activity"
  place: { municipio: string; estado: string } | null
  weights: { like: number; comment: number; share: number; minutes_per_point: number }
  rows: ActivityRow[]
  me: ActivityRow | null
}

type HoursRow = {
  id_user: string
  username: string | null
  name: string | null
  avatar_url: string | null
  position: number
  total?: number
  minutes: number
  games: number
  achievements?: number
}
type HoursPayload = {
  metric: "playtime"
  rows: HoursRow[]
  me: HoursRow | null
  /** 403 do backend: a conexão de plataforma está desligada. */
  locked?: boolean
}

type Payload = ActivityPayload | HoursPayload

export default function GamesRankingPage() {
  const tr = useTranslations("Games")
  const { perfil } = useMeProfile()
  const [scope, setScope] = useState<Scope>("city")
  // Um cache POR ESCOPO: com estado único, ir e voltar entre as abas
  // recarregaria e a tela piscaria a cada troca.
  const [data, setData] = useState<Partial<Record<Scope, Payload>>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const load = useCallback(
    async (which: Scope) => {
      if (data[which]) return
      const token = getToken()
      if (!token) return
      setLoading(true)
      setError("")
      try {
        const url = which === "hours" ? "/api/gamer/ranking" : `/api/gamer/ranking/activity?scope=${which}`
        const r = await fetch(url, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" })
        const d = await r.json().catch(() => null)
        if (which === "hours" && r.status === 403) {
          // A Estante desligada não é erro de rede: é um estado da fila.
          setData((prev) => ({ ...prev, hours: { metric: "playtime", rows: [], me: null, locked: true } }))
          return
        }
        if (!r.ok) throw new Error(d?.error || tr("loadFailedTitle", "Não deu pra carregar."))
        setData((prev) => ({ ...prev, [which]: d }))
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e))
      } finally {
        setLoading(false)
      }
    },
    [data, tr]
  )

  useEffect(() => {
    void load(scope)
  }, [scope, load])

  const payload = data[scope]

  const scopeLabel = (s: Scope) =>
    s === "city"
      ? tr("scopeCity", "Minha cidade")
      : s === "state"
        ? tr("scopeState", "Meu estado")
        : tr("scopeHours", "Horas jogadas")

  return (
    <GamesShell>
      <GamesHeadcard perfil={perfil} title={tr("rankingTitle", "Ranking")} backHref="/games" active="ranking" />

      <section className="mx-auto mt-6 w-full max-w-4xl px-0 md:px-8">
        {/* Três abas PLANAS, e não "atividade" com um sub-seletor dentro: abas
            dentro de abas para escolher entre três coisas. */}
        <div className="mb-4 flex flex-wrap gap-1.5">
          {(["city", "state", "hours"] as Scope[]).map((s) => {
            const active = scope === s
            return (
              <button
                key={s}
                type="button"
                onClick={() => setScope(s)}
                className={cn(
                  "border-2 px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-[0.1em] transition-transform hover:-translate-y-0.5",
                  active
                    ? "border-[#0B0B0D] text-[#F5F1E8] shadow-[3px_3px_0_0_#0B0B0D]"
                    : "border-[#F5F1E8]/25 bg-transparent text-[#F5F1E8] hover:border-[#F5F1E8]"
                )}
                style={active ? { background: PURPLE } : undefined}
              >
                {scopeLabel(s)}
              </button>
            )
          })}
        </div>

        {payload && payload.metric === "activity" && payload.place && (
          <p className="mb-5 inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-[#9A938A]">
            <MapPin className="h-3.5 w-3.5" />
            {scope === "city" ? `${payload.place.municipio} · ${payload.place.estado}` : payload.place.estado}
          </p>
        )}

        {loading && !payload ? (
          <div className="flex flex-col gap-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-14 animate-pulse border-2 border-[#F5F1E8]/10 bg-[#1D1810]" />
            ))}
          </div>
        ) : error ? (
          <StateBox
            icon={<AlertCircle className="h-6 w-6" />}
            title={tr("loadFailedTitle", "Não deu pra carregar.")}
            desc={error}
            accent={PURPLE}
          />
        ) : !payload ? null : payload.metric === "playtime" ? (
          <HoursList payload={payload} tr={tr} />
        ) : !payload.place ? (
          // NÃO é "ninguém pontuou": esta pessoa não declarou onde mora, e a
          // fila é geográfica. A frase tem que dizer o que FAZER.
          <StateBox
            icon={<MapPin className="h-6 w-6" />}
            title={tr("rankingNoPlaceTitle", "Diga em que cidade você está")}
            desc={tr(
              "rankingNoPlaceDesc",
              "A fila de games é por cidade e por estado. Complete a cidade no seu perfil para entrar nela."
            )}
            accent={PURPLE}
            action={
              <Link href="/account" className={ctaClass} style={{ background: PURPLE }}>
                {tr("rankingNoPlaceCta", "Completar meu perfil")}
              </Link>
            }
          />
        ) : payload.rows.length === 0 ? (
          <StateBox
            icon={<Trophy className="h-6 w-6" />}
            title={tr("rankingEmptyTitle", "A fila ainda está vazia por aqui")}
            desc={tr(
              "rankingEmptyDesc",
              "Ninguém pontuou ainda neste recorte. Publique no Games: curtida, comentário e compartilhamento dos outros viram pontos — e o tempo que você passa por aqui também conta."
            )}
            accent={PURPLE}
            action={
              <Link href="/games" className={ctaClass} style={{ background: PURPLE }}>
                {tr("rankingEmptyCta", "Ir para o feed")}
              </Link>
            }
          />
        ) : (
          <div className="flex flex-col gap-2">
            {payload.rows.map((row) => (
              <ActivityRankRow key={row.id_user} row={row} me={payload.me?.id_user === row.id_user} tr={tr} />
            ))}
            {/* A linha de quem olha fica FORA da lista quando ela não está lá. */}
            {payload.me && !payload.rows.some((r) => r.id_user === payload.me?.id_user) && (
              <>
                <p className="mt-4 text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#9A938A]">
                  {tr("rankingYou", "Sua posição")}
                </p>
                <ActivityRankRow row={payload.me} me tr={tr} />
              </>
            )}
          </div>
        )}

        {payload && payload.metric === "activity" && payload.weights && (
          <p className="mt-6 text-[11px] leading-relaxed text-[#9A938A]/70">
            {tr("rankingLegend", "Como pontua:")} {tr("rankingLegendLike", "curtida")} {payload.weights.like} ·{" "}
            {tr("rankingLegendComment", "comentário")} {payload.weights.comment} ·{" "}
            {tr("rankingLegendShare", "compartilhamento")} {payload.weights.share} ·{" "}
            {tr("rankingLegendTime", "{min} min no Games = 1 ponto").replace(
              "{min}",
              String(payload.weights.minutes_per_point)
            )}
            . {tr("rankingLegendSelf", "O que você mesmo curte no seu post não conta.")}
          </p>
        )}
      </section>
    </GamesShell>
  )
}

const ctaClass =
  "border-2 border-[#0B0B0D] px-4 py-2 text-[11px] font-extrabold uppercase tracking-[0.12em] text-[#F5F1E8] shadow-[3px_3px_0_0_#0B0B0D] transition hover:-translate-y-0.5"

type Tr = (key: string, fallback?: string) => string

/** A fila por HORAS (a da Steam). Dois vazios próprios: desligada e sem ninguém. */
function HoursList({ payload, tr }: { payload: HoursPayload; tr: Tr }) {
  if (payload.locked) {
    return (
      <StateBox
        icon={<Clock className="h-6 w-6" />}
        title={tr("hoursLockedTitle", "A Estante está desligada")}
        desc={tr(
          "hoursLockedDesc",
          "A fila de horas vem das plataformas conectadas (Steam), e a conexão está desligada no momento."
        )}
        accent={PURPLE}
      />
    )
  }
  if (payload.rows.length === 0) {
    return (
      <StateBox
        icon={<Clock className="h-6 w-6" />}
        title={tr("hoursEmptyTitle", "Ninguém entrou na fila de horas ainda")}
        desc={tr(
          "hoursEmptyDesc",
          "Quem conecta a Steam com a estante pública entra aqui com as horas que a plataforma verifica."
        )}
        accent={PURPLE}
      />
    )
  }
  return (
    <div className="flex flex-col gap-2">
      {payload.rows.map((row) => (
        <HoursRankRow key={row.id_user} row={row} me={payload.me?.id_user === row.id_user} tr={tr} />
      ))}
      {payload.me ? (
        !payload.rows.some((r) => r.id_user === payload.me?.id_user) && (
          <>
            <p className="mt-4 text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#9A938A]">
              {tr("rankingYou", "Sua posição")}
            </p>
            <HoursRankRow row={payload.me} me tr={tr} />
          </>
        )
      ) : (
        // Sem linha não é zero: é ausência de estante pública. O que FAZER.
        <p className="mt-4 text-[11px] leading-relaxed text-[#9A938A]/80">
          {tr("hoursMeNone", "Você ainda não está na fila: conecte uma plataforma com a estante pública para entrar.")}
        </p>
      )}
    </div>
  )
}

function Avatar({ row }: { row: { avatar_url: string | null; name: string | null } }) {
  return (
    <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden border-2 border-[#0B0B0D] bg-[#0B0B0D]/[0.07]">
      {row.avatar_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={row.avatar_url} alt="" className="h-full w-full object-cover" />
      ) : (
        <span className="text-[11px] font-black text-[#0B0B0D]">{initialsOf(row.name)}</span>
      )}
    </span>
  )
}

/** Uma linha da fila de atividade, com a conta ABERTA embaixo do nome. */
function ActivityRankRow({ row, me, tr }: { row: ActivityRow; me?: boolean; tr: Tr }) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 border-2 border-[#0B0B0D] px-3 py-2.5 shadow-[4px_4px_0_0_#0B0B0D]",
        me ? "bg-[#A78BFA]" : "bg-[#F1EDE2]"
      )}
    >
      <span className="fl-display w-9 shrink-0 text-center text-2xl leading-none text-[#0B0B0D]">{row.position}</span>
      <Avatar row={row} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-extrabold text-[#0B0B0D]">{row.name || row.username || "—"}</p>
        <p className="truncate text-[10px] font-semibold uppercase tracking-wide text-[#0B0B0D]/60">
          {row.likes} {tr("rankingLegendLike", "curtida")} · {row.comments} {tr("rankingLegendComment", "comentário")} ·{" "}
          {row.shares} {tr("rankingLegendShare", "compartilhamento")} · {row.minutes} {tr("rankingMinutes", "min online")}
        </p>
      </div>
      <span className="fl-display shrink-0 text-2xl leading-none" style={{ color: me ? "#2E1065" : PURPLE_DEEP }}>
        {row.score}
      </span>
    </div>
  )
}

/** Uma linha da fila de horas: o número grande são as horas; embaixo, os jogos. */
function HoursRankRow({ row, me, tr }: { row: HoursRow; me?: boolean; tr: Tr }) {
  const hours = Math.floor(row.minutes / 60)
  return (
    <div
      className={cn(
        "flex items-center gap-3 border-2 border-[#0B0B0D] px-3 py-2.5 shadow-[4px_4px_0_0_#0B0B0D]",
        me ? "bg-[#A78BFA]" : "bg-[#F1EDE2]"
      )}
    >
      <span className="fl-display w-9 shrink-0 text-center text-2xl leading-none text-[#0B0B0D]">{row.position}</span>
      <Avatar row={row} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-extrabold text-[#0B0B0D]">{row.name || row.username || "—"}</p>
        <p className="truncate text-[10px] font-semibold uppercase tracking-wide text-[#0B0B0D]/60">
          {tr("hoursGames", "{n} jogos").replace("{n}", String(row.games))}
        </p>
      </div>
      <span className="fl-display shrink-0 text-2xl leading-none" style={{ color: me ? "#2E1065" : PURPLE_DEEP }}>
        {tr("hoursLabel", "{h} h").replace("{h}", String(hours))}
      </span>
    </div>
  )
}
