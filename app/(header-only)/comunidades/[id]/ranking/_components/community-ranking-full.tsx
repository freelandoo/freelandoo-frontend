"use client"

/**
 * O RANKING CHEIO DA COMUNIDADE — pódio editorial + a lista inteira.
 *
 * É a página que o botão retrátil "Ranking" (roxo) do headcard abre, e ela vale
 * para TODA modalidade: comum, condomínio, bairro, pet, carro e games usam a
 * mesma casca de comunidade, então nenhuma delas precisou de tela própria. A
 * academia tem a sua (`/academias/<slug>/ranking`) porque a régua lá é outra —
 * dias de catraca, que só existem com a API da academia do outro lado.
 *
 * ⚠️ QUEM DECIDE A MÉTRICA É A TEMPORADA, e é o backend que a guarda.
 * `GET /communities/:id/goal` devolve `metric` (xp | posts | shares) junto do
 * ranking já pontuado por ela; sem temporada em andamento a fila é o XP dos
 * membros (`/members`, mesma ordenação da gaveta dos números da página). Somar
 * ou reordenar aqui produziria uma segunda verdade: a gaveta mostraria um
 * primeiro lugar e esta página, outro.
 *
 * A gaveta continua mostrando os CINCO primeiros de propósito — ela é resumo,
 * não porta. O que não pode existir em dois lugares é a tabela inteira, e ela
 * mora só aqui.
 *
 * ─── GAMES TEM TRÊS FILAS, E ELAS RESPONDEM PERGUNTAS DIFERENTES ─────────────
 *
 * Pedido do Alex (2026-09-07): "usa as métricas de fora da plataforma games e
 * aplica somente para dentro (...) só conta os likes, compartilhamentos, tempo
 * online dentro da plataforma games (...) cria o ranking ali por cidade e
 * estado apenas".
 *
 *   • MINHA CIDADE e MEU ESTADO (mig 226) — atividade: curtida, comentário e
 *     compartilhamento RECEBIDOS nos posts publicados dentro da plataforma de
 *     games, mais o tempo online lá dentro. É o ranking novo.
 *   • HORAS JOGADAS (mig 220) — o que a Steam verifica. Continua, porque
 *     responde outra coisa: "quem joga mais", não "quem está mais presente".
 *
 * As três são ABAS IRMÃS e não telas: pódio, lista, barra e a linha "sua
 * posição" são os mesmos, e é para isso que as fontes convergem no tipo `Row`.
 * Uma tela por régua seria o mesmo desenho escrito três vezes — e a segunda
 * pararia de acompanhar a primeira na primeira mudança de layout.
 *
 * A recusa é DITA EM VOZ ALTA: comunidade privada e condomínio devolvem 403 na
 * lista de membros para quem está de fora (a política declara o tier mínimo).
 * O botão do headcard aparece para todo mundo — botão que abre o nada parece
 * quebrado —, então a página precisa explicar por que não há lista, em vez de
 * mostrar um pódio vazio que pareceria "ninguém pontuou".
 */

import { useCallback, useEffect, useMemo, useState } from "react"
import dynamic from "next/dynamic"
import Link from "next/link"
import { Loader2, Lock, MapPin, ShieldAlert, Trophy } from "lucide-react"
import { DoodleCrown } from "@/components/home/landing/primitives"
import { PageBackLink } from "@/components/tabloide"
import { useTranslations } from "@/components/i18n/I18nProvider"
import { getToken, getStoredUser } from "@/lib/auth"
import { cn } from "@/lib/utils"
import {
  accentHex,
  backdropTint,
  canBuildCommunitySite,
  compact,
  platformSkinVars,
} from "../../_components/community-ui"
import { CommunityShellBeacon } from "@/components/layout/community-shell"
import { useFeature } from "@/components/feature-flags/FeatureFlagsProvider"

// O ranking também é uma tela DE DENTRO do ambiente games: mesmo fundo, mesma
// pele. Por `dynamic` para não pesar no ranking das outras seis modalidades.
const TechBackdrop = dynamic(
  () => import("@/components/platform/tech-backdrop").then((m) => m.TechBackdrop),
  { ssr: false }
)

type Community = {
  id_profile: string
  display_name: string
  avatar_url: string | null
  kind?: string | null
  /** Quem manda na comunidade — aqui só para saber se o dock mostra o Site. */
  id_leader_user?: string | null
  community_theme: { accent?: string; background?: string } | null
}
/**
 * A TERCEIRA FONTE do pódio (a plataforma de games).
 *
 * ⚠️ Ela não vira uma página nova, e isso é decisão: pódio, lista e barra já
 * existem aqui e convergem para o tipo `Row` abaixo. Uma segunda tela de
 * ranking seria o mesmo desenho escrito duas vezes — e a segunda pararia de
 * acompanhar a primeira na primeira mudança de layout.
 *
 * O que muda é só a RÉGUA: sem membros, o que existe para comparar são as
 * horas que as plataformas verificam.
 */
type GamerRow = {
  id_user: string
  username: string | null
  name: string | null
  avatar_url: string | null
  position: number
  minutes: number
  games: number
  achievements: number
}
type GamerMe = { position: number; total: number; minutes: number; games: number } | null

/**
 * A QUARTA FONTE: a atividade dentro da plataforma de games (mig 226).
 *
 * `place` é a cidade/estado de quem está olhando, e vem `null` para quem nunca
 * declarou onde mora — o que é DIFERENTE de "ninguém pontuou na sua cidade".
 * Só o primeiro tem conserto, e a tela precisa poder dizer qual é o caso.
 *
 * `weights` viaja na resposta em vez de ser copiado aqui: dois lugares
 * guardando o peso fariam a legenda prometer uma conta que a fila não faz.
 */
type ActivityRow = {
  id_user: string
  username: string | null
  name: string | null
  avatar_url: string | null
  position: number
  total: number
  score: number
  likes: number
  comments: number
  shares: number
  minutes: number
}
type ActivityPayload = {
  scope: "city" | "state"
  place: { municipio: string; estado: string } | null
  weights: { like: number; comment: number; share: number; minutes_per_point: number }
  rows: ActivityRow[]
  me: ActivityRow | null
}
type Member = {
  id_user: string
  role: "leader" | "vice" | "member"
  user_name: string | null
  user_username: string | null
  top_profile_name: string | null
  top_profile_avatar: string | null
  top_profile_xp: number
}
type GoalRow = {
  id_user: string
  name: string | null
  username: string | null
  avatar_url: string | null
  score: number
  posts?: number
  eng?: number
}
type Goal = {
  title: string
  metric: string
  status: string
  ends_at: string | null
  winner_user_id: string | null
  ranking: GoalRow[]
}
/** A linha desenhada — o formato para o qual as duas fontes convergem. */
type Row = { id_user: string; name: string; avatar_url: string | null; value: string; raw: number }

/**
 * As abas possíveis das duas famílias de comunidade.
 *
 * `season`/`xp` são das seis modalidades com membros; `city`/`state`/`playtime`
 * são da plataforma de games. Um tipo só (em vez de dois) porque o estado da
 * aba é um só e a barra que o desenha também — separar daria duas barras a
 * manter, e a que fosse esquecida pararia de refletir a outra.
 */
type Tab = "season" | "xp" | "city" | "state" | "playtime"

/** As duas filas de games que são "atividade" (as que leem a mig 226). */
const ACTIVITY_TABS = ["city", "state"] as const
type ActivityScope = (typeof ACTIVITY_TABS)[number]
function isActivityTab(tab: Tab): tab is ActivityScope {
  return tab === "city" || tab === "state"
}

function initials(name: string | null | undefined) {
  if (!name) return "?"
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() || "")
    .join("")
}

export function CommunityRankingFull({ communityId }: { communityId: string }) {
  const t = useTranslations("Community")
  const [community, setCommunity] = useState<Community | null>(null)
  const [members, setMembers] = useState<Member[]>([])
  const [goal, setGoal] = useState<Goal | null>(null)
  const [state, setState] = useState<"loading" | "loaded" | "error">("loading")
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  /** 403 na lista: a comunidade é fechada e quem olha está de fora. */
  const [locked, setLocked] = useState<string | null>(null)
  const [tab, setTab] = useState<Tab>("season")
  const [daysLeft, setDaysLeft] = useState<number | null>(null)
  const [gamerRows, setGamerRows] = useState<GamerRow[]>([])
  const [gamerMe, setGamerMe] = useState<GamerMe>(null)
  const [isGames, setIsGames] = useState(false)
  /**
   * A atividade é guardada POR ESCOPO, e não numa variável só.
   *
   * Trocar de aba não pode limpar a fila que já chegou: com um estado único,
   * ir e voltar entre cidade e estado recarregaria as duas o tempo todo e a
   * tela piscaria em cada troca. O escopo que ainda não chegou vale `undefined`
   * (carregando); o que chegou vazio vale um payload com `rows: []`.
   */
  const [activity, setActivity] = useState<Partial<Record<ActivityScope, ActivityPayload>>>({})

  const load = useCallback(async () => {
    try {
      const tk = getToken()
      const headers = tk ? { Authorization: `Bearer ${tk}` } : undefined

      // A comunidade vem PRIMEIRO, sozinha: é ela que diz qual régua vale.
      // Buscar membros e temporada em paralelo "por via das dúvidas" pediria
      // duas respostas que a plataforma de games não tem — e a de temporada
      // voltaria como "nenhuma temporada", que ali não quer dizer nada.
      const cRes = await fetch(`/api/communities/${communityId}`, headers ? { headers } : undefined)
      const cData = await cRes.json().catch(() => ({}))
      if (!cRes.ok) {
        setErrorMsg(cData?.error || t("notFound", "Comunidade não encontrada."))
        setState("error")
        return
      }
      setCommunity(cData.community)

      if (cData.community?.kind === "games") {
        setIsGames(true)
        setTab("city")
        // As duas de uma vez porque a tela abre na cidade e o par de abas
        // aparece junto: sem a fila de horas em mãos, o primeiro clique nela
        // mostraria um vazio que pareceria "ninguém jogou".
        const rRes = await fetch("/api/gamer/ranking?limit=50", headers ? { headers } : undefined)
        const rData = await rRes.json().catch(() => ({}))
        if (rRes.ok) {
          setGamerRows(Array.isArray(rData.rows) ? rData.rows : [])
          setGamerMe(rData.me || null)
        } else if (rRes.status !== 403) {
          // 403 aqui é a flag da CONEXÃO de plataforma desligada, e ela não
          // derruba a fila de atividade — que não depende de conectar nada.
          // Só um erro de verdade vira aviso.
          setLocked(rData?.error || t("rankingLoadError", "Não deu para carregar o ranking agora."))
        }
        setState("loaded")
        return
      }

      const [mRes, gRes] = await Promise.all([
        fetch(`/api/communities/${communityId}/members`, headers ? { headers } : undefined),
        fetch(`/api/communities/${communityId}/goal`, headers ? { headers } : undefined),
      ])

      const mData = await mRes.json().catch(() => ({}))
      if (mRes.ok) {
        setMembers(Array.isArray(mData.members) ? mData.members : [])
      } else {
        // A recusa da lista NÃO derruba a página: o nome da comunidade e o
        // caminho de volta continuam de pé, e o motivo aparece escrito.
        setLocked(mData?.error || t("rankingLocked", "Só quem é da comunidade vê o ranking."))
      }

      const gData = await gRes.json().catch(() => ({}))
      const g: Goal | null = gRes.ok ? gData.goal || null : null
      setGoal(g)
      // Quantos dias faltam é conta com o RELÓGIO, e relógio no render torna a
      // tela impura (o mesmo estado desenharia números diferentes). Aqui a
      // resposta é congelada no instante em que a temporada chega — e para uma
      // contagem em dias, o instante do carregamento é tão bom quanto qualquer
      // outro.
      setDaysLeft(
        g?.ends_at && g.status !== "closed"
          ? Math.max(0, Math.ceil((new Date(g.ends_at).getTime() - Date.now()) / 86400000))
          : null
      )
      setState("loaded")
    } catch {
      setState("error")
    }
  }, [communityId, t])

  useEffect(() => {
    void load()
  }, [load])

  const accent = accentHex(community?.community_theme?.accent)
  // Games não tem temporada — lá as abas são outras três (cidade, estado,
  // horas), e o par Temporada/XP não diria nada.
  // ─── O AMBIENTE (o dock global lê isto pelo beacon lá embaixo) ────────────
  // A régua do Site é a MESMA da página da comunidade, importada e não copiada:
  // são duas telas do mesmo espaço, e duas cópias divergiriam na primeira
  // mudança de regra — o globo apareceria numa e não na outra.
  const siteEnabled = useFeature("comunidade_site")
  const viewerId = getStoredUser()?.id_user ?? null
  const canBuildSite = canBuildCommunitySite({
    kind: community?.kind,
    isLeader: !!community?.id_leader_user && community.id_leader_user === viewerId,
    siteEnabled,
  })
  // ⚠️ MESMO PREDICADO DA PÁGINA: é a plataforma de negócio que decide o
  // ambiente do dock, a pele e o fundo. Aqui ele também escolhe as variáveis de
  // cor — o pódio é outra sala do mesmo espaço, e chegar nele com outro fundo
  // faria a comunidade trocar de cara ao andar dois metros.
  const isBusiness = (community?.kind ?? null) === "common"

  const shellKind: "games" | "business" | null = isGames
    ? "games"
    : isBusiness
      ? "business"
      : null

  const bgKey = community?.community_theme?.background
  const skinVars = useMemo(
    () => (isBusiness ? platformSkinVars(bgKey) : undefined),
    [isBusiness, bgKey]
  )
  const bizTint = useMemo(() => backdropTint(bgKey), [bgKey])

  const seasonOn = !!goal && !isGames

  useEffect(() => {
    // Sem temporada não existe a aba dela — cair nela deixaria a tela vazia.
    // ⚠️ E isto NÃO vale para games: lá a aba inicial é "cidade", e um reset
    // cego para "xp" jogaria a tela numa fila que a plataforma não tem.
    if (!seasonOn && !isGames) setTab("xp")
  }, [seasonOn, isGames])

  /**
   * A fila de atividade do escopo aberto.
   *
   * Busca SOB DEMANDA e uma vez por escopo: a maioria das visitas fica na
   * cidade, e pedir as duas de saída pagaria por uma resposta que ninguém
   * pediu — a mesma disciplina do `onOpen` da gaveta dos números.
   */
  useEffect(() => {
    if (!isGames || !isActivityTab(tab) || activity[tab]) return
    let alive = true
    const tk = getToken()
    void fetch(`/api/gamer/ranking/activity?scope=${tab}&limit=50`, {
      headers: tk ? { Authorization: `Bearer ${tk}` } : undefined,
    })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}))
        if (!alive) return
        if (res.ok) {
          setActivity((prev) => ({
            ...prev,
            [tab]: {
              scope: tab,
              place: data.place ?? null,
              weights: data.weights ?? { like: 1, comment: 2, share: 3, minutes_per_point: 10 },
              rows: Array.isArray(data.rows) ? data.rows : [],
              me: data.me ?? null,
            },
          }))
        } else {
          setLocked(data?.error || t("rankingLoadError", "Não deu para carregar o ranking agora."))
        }
      })
      .catch(() => {
        if (alive) setLocked(t("rankingLoadError", "Não deu para carregar o ranking agora."))
      })
    return () => {
      alive = false
    }
  }, [isGames, tab, activity, t])

  /** O payload do escopo aberto (undefined enquanto não chegou). */
  const activeActivity = isActivityTab(tab) ? activity[tab] : undefined

  const metricLabel = useCallback(
    (m: string) =>
      m === "posts"
        ? t("metricPosts", "Publicações")
        : m === "shares"
          ? t("metricShares", "Compartilhamentos")
          : t("metricXp", "XP coletivo"),
    [t]
  )

  /**
   * A fila desenhada. A pontuação já vem pronta das duas fontes; aqui só se
   * escolhe QUAL delas responde e como o número é escrito.
   */
  const rows: Row[] = useMemo(() => {
    if (isGames && isActivityTab(tab)) {
      return (activity[tab]?.rows ?? []).map((r) => ({
        id_user: r.id_user,
        name: r.name || r.username || "—",
        avatar_url: r.avatar_url,
        value: compact(r.score),
        raw: Number(r.score) || 0,
      }))
    }
    if (isGames) {
      return gamerRows.map((r) => ({
        id_user: r.id_user,
        name: r.name || r.username || "—",
        avatar_url: r.avatar_url,
        // Hora inteira: minuto exato não diz nada em cima de 9.000 deles — a
        // mesma régua que a Estante já usa.
        value: `${compact(Math.round(r.minutes / 60))}h`,
        raw: r.minutes,
      }))
    }
    if (tab === "season" && goal) {
      return goal.ranking.map((r) => ({
        id_user: r.id_user,
        name: r.name || r.username || "—",
        avatar_url: r.avatar_url,
        // Em "posts" a temporada pontua publicação E engajamento, e mostrar só
        // o total esconderia metade da conta — é o mesmo par que a gaveta dos
        // números escreve.
        value:
          goal.metric === "posts"
            ? `${r.posts ?? 0}/${r.eng ?? 0}`
            : goal.metric === "xp"
              ? `${compact(r.score)} XP`
              : compact(r.score),
        raw: Number(r.score) || 0,
      }))
    }
    return [...members]
      .sort((a, b) => Number(b.top_profile_xp || 0) - Number(a.top_profile_xp || 0))
      .map((m) => ({
        id_user: m.id_user,
        name: m.top_profile_name || m.user_name || m.user_username || "—",
        avatar_url: m.top_profile_avatar,
        value: `${compact(Number(m.top_profile_xp || 0))} XP`,
        raw: Number(m.top_profile_xp || 0),
      }))
  }, [tab, goal, members, isGames, gamerRows, activity])

  const unitWord = isGames
    ? isActivityTab(tab)
      ? t("rankingUnitPoints", "pontos de atividade")
      : t("rankingUnitHours", "horas jogadas")
    : tab === "season" && goal
      ? metricLabel(goal.metric)
      : t("metricXp", "XP coletivo")

  if (state === "loading") {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-[#0b0804]">
        <Loader2 className="h-6 w-6 animate-spin text-[#9A938A]" />
      </div>
    )
  }
  if (state === "error" || !community) {
    return (
      <div className="fl-sharp flex min-h-[100dvh] items-center justify-center bg-[#0b0804] px-4 text-center text-[#F5F1E8]">
        <div>
          <ShieldAlert className="mx-auto h-10 w-10 text-[#9A938A]" />
          <p className="mt-4 text-sm text-[#9A938A]">
            {errorMsg || t("rankingLoadError", "Não deu para carregar o ranking agora.")}
          </p>
          <div className="mt-4 flex justify-center">
            <PageBackLink href={`/comunidades/${communityId}`} />
          </div>
        </div>
      </div>
    )
  }

  const top3 = rows.slice(0, 3)
  const rest = rows.slice(3)

  return (
    <div
      style={skinVars}
      className={cn(
        "fl-root relative min-h-[100dvh] bg-[#0b0804] pb-24 text-[#F1EDE2]",
        isGames && "fl-games",
        isBusiness && "fl-business"
      )}
    >
      {isGames && <TechBackdrop />}
      {isBusiness && <TechBackdrop variant="business" tint={bizTint} />}
      {/* ⚠️ ESTA TELA TAMBÉM É O AMBIENTE. O "Ranking" do dock de negócios (e o
          "Posts games" do de games) leva para uma página irmã: sem o beacon
          aqui, o dock voltaria a ser o da Freelandoo no meio do ambiente e a
          pessoa perderia os controles do espaço em que ainda está. */}
      {shellKind && (
        <CommunityShellBeacon
          communityId={communityId}
          kind={shellKind}
          canBuildSite={canBuildSite}
        />
      )}
      <div className="relative mx-auto max-w-4xl px-4 pt-6 md:px-6">
        <PageBackLink href={`/comunidades/${communityId}`} label={community.display_name} />

        {/* A troca de fila só existe quando há mais de uma: com uma opção só,
            o par de botões pediria um clique que não decide nada.

            Em games são TRÊS, e planas — cidade, estado e horas. Aninhar
            "atividade" com um sub-seletor de escopo dentro daria abas dentro de
            abas para escolher entre três coisas; plano, o caminho até qualquer
            uma delas é um toque. */}
        {(seasonOn || isGames) && !locked && (
          <div className="mt-5 flex flex-wrap items-center gap-1">
            {(isGames
              ? ([
                  ["city", "rankingTabCity", "Minha cidade"],
                  ["state", "rankingTabState", "Meu estado"],
                  ["playtime", "rankingTabPlaytime", "Horas jogadas"],
                ] as const)
              : ([
                  ["season", "rankingTabSeason", "Temporada"],
                  ["xp", "rankingTabXp", "XP geral"],
                ] as const)
            ).map(([id, key, fallback]) => (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id)}
                className={cn(
                  "border-2 border-[#0B0B0D] px-3 py-1 text-[11px] font-extrabold uppercase tracking-[0.1em]",
                  tab === id ? "text-[#0B0B0D]" : "bg-[#1D1810] text-[#9A938A]"
                )}
                style={tab === id ? { background: accent } : undefined}
              >
                {t(key, fallback)}
              </button>
            ))}
          </div>
        )}

        {/* ONDE a fila está sendo medida. Sem esta linha, "Minha cidade" seria
            uma promessa sem prova — e quem se mudou não teria como perceber que
            está sendo comparado com a cidade errada. */}
        {isGames && isActivityTab(tab) && activeActivity?.place && (
          <p className="mt-3 text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#9A938A]">
            {tab === "city"
              ? `${activeActivity.place.municipio} · ${activeActivity.place.estado}`
              : activeActivity.place.estado}
          </p>
        )}

        {/* Cabeçalho do pódio */}
        <div className="mt-8 text-center">
          <p className="fl-marker text-2xl" style={{ color: accent }}>
            {tab === "season" && goal
              ? goal.status === "closed"
                ? `${t("goalEnded", "Temporada encerrada")} · ${unitWord}`
                : daysLeft != null
                  ? `${t("goalDaysLeft", "faltam")} ${daysLeft} ${t("goalDaysWord", "dias")} · ${unitWord}`
                  : unitWord
              : isGames && isActivityTab(tab)
                ? tab === "city"
                  ? t("rankingEyebrowCity", "quem mais aparece na sua cidade")
                  : t("rankingEyebrowState", "quem mais aparece no seu estado")
                : isGames
                  ? t("rankingEyebrowGames", "quem mais jogou na plataforma")
                  : t("rankingEyebrowXp", "o topo da comunidade")}
          </p>
          <h1 className="fl-display text-4xl text-[#F1EDE2] md:text-6xl">{t("rankingHeading", "O pódio.")}</h1>
        </div>

        {locked ? (
          <div
            className="mt-10 border-2 border-[#0B0B0D] bg-[#15120E] p-8 text-center"
            style={{ boxShadow: `6px 6px 0 0 ${accent}` }}
          >
            <Lock className="mx-auto h-8 w-8 text-[#9A938A]" />
            <p className="mt-3 text-sm font-semibold text-[#F5F1E8]">{locked}</p>
            <Link
              href={`/comunidades/${communityId}`}
              className="mt-4 inline-block border-2 border-[#0B0B0D] px-4 py-2 text-[11px] font-extrabold uppercase tracking-[0.12em] text-[#0B0B0D]"
              style={{ background: accent }}
            >
              {t("rankingGoToCommunity", "Ir para a comunidade")}
            </Link>
          </div>
        ) : isGames && isActivityTab(tab) && !activeActivity ? (
          // A fila ainda não chegou. Um "ninguém pontuou" aqui seria mentira
          // por meio segundo — e mentira que a pessoa lê antes de a verdade
          // aparecer.
          <div className="mt-10 flex items-center justify-center border-2 border-[#0B0B0D] bg-[#15120E] p-8">
            <Loader2 className="h-6 w-6 animate-spin text-[#9A938A]" />
          </div>
        ) : isGames && isActivityTab(tab) && !activeActivity?.place ? (
          // NÃO É "ninguém pontuou": é "você não disse onde mora", e a fila é
          // por cidade. O que aparece é o que FAZER.
          <div
            className="mt-10 border-2 border-[#0B0B0D] bg-[#15120E] p-8 text-center"
            style={{ boxShadow: `6px 6px 0 0 ${accent}` }}
          >
            <MapPin className="mx-auto h-8 w-8 text-[#9A938A]" />
            <p className="mt-3 text-sm font-semibold text-[#F5F1E8]">
              {t(
                "rankingNoCity",
                "Este ranking compara quem é da sua cidade — e a sua ainda não está declarada."
              )}
            </p>
            <Link
              href="/account"
              className="mt-4 inline-block border-2 border-[#0B0B0D] px-4 py-2 text-[11px] font-extrabold uppercase tracking-[0.12em] text-[#0B0B0D]"
              style={{ background: accent }}
            >
              {t("rankingSetCity", "Declarar minha cidade")}
            </Link>
          </div>
        ) : top3.length === 0 ? (
          <div className="mt-10 border-2 border-[#0B0B0D] bg-[#15120E] p-8 text-center">
            <Trophy className="mx-auto h-8 w-8 text-[#9A938A]" />
            <p className="mt-3 text-sm text-[#9A938A]">
              {isGames && isActivityTab(tab)
                ? tab === "city"
                  ? t("rankingEmptyCity", "Ninguém da sua cidade pontuou na plataforma de games ainda.")
                  : t("rankingEmptyState", "Ninguém do seu estado pontuou na plataforma de games ainda.")
                : isGames
                  ? t("rankingEmptyGames", "Ninguém conectou uma plataforma com a estante pública ainda.")
                  : tab === "season"
                    ? t("rankingEmptySeason", "Ninguém pontuou nesta temporada ainda.")
                    : t("membersEmpty", "Sem membros ainda.")}
            </p>
          </div>
        ) : (
          <>
            <div className="mt-8 flex items-end justify-center gap-1.5 sm:gap-3 md:gap-5">
              {top3.map((row, i) => (
                <PodiumCol
                  key={row.id_user}
                  row={row}
                  rank={(i + 1) as 1 | 2 | 3}
                  unitWord={unitWord}
                  accent={accent}
                  crowned={
                    // Temporada ENCERRADA tem vencedor gravado (é quem levou o
                    // prêmio). Fora disso, a coroa é de quem está em primeiro.
                    !(tab === "season" && goal?.status === "closed") ||
                    goal?.winner_user_id === row.id_user
                  }
                  t={t}
                />
              ))}
            </div>

            {rest.length > 0 && (
              <div className="mt-16">
                <h2 className="fl-display text-4xl text-[#F1EDE2] md:text-6xl">
                  {t("rankingListHeading", "A lista inteira")}
                </h2>
                <ol className="mt-6 space-y-2">
                  {rest.map((row, i) => {
                    // A barra é RELATIVA AO LÍDER, não a uma meta: a temporada
                    // da comunidade tem alvo opcional e o XP não tem alvo
                    // nenhum, então "quanto falta para o primeiro" é a única
                    // régua que existe nas duas filas.
                    const top = rows[0]?.raw || 0
                    const pct = top > 0 ? Math.min(100, Math.round((row.raw / top) * 100)) : 0
                    return (
                      <li
                        key={row.id_user}
                        className="flex items-center gap-3 border-2 border-[#0B0B0D] bg-[#15120E] p-3"
                      >
                        <span className="w-8 shrink-0 fl-display text-2xl leading-none text-[#F1EDE2]/40">{i + 4}</span>
                        {row.avatar_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={row.avatar_url}
                            alt=""
                            loading="lazy"
                            className="h-10 w-10 shrink-0 border-2 border-[#0B0B0D] object-cover"
                          />
                        ) : (
                          <span
                            className="flex h-10 w-10 shrink-0 items-center justify-center border-2 border-[#0B0B0D] bg-[#1D1810] fl-display text-sm"
                            style={{ color: accent }}
                          >
                            {initials(row.name)}
                          </span>
                        )}
                        <span className="min-w-0 flex-1 truncate text-sm font-bold text-[#F1EDE2]">{row.name}</span>
                        <div className="hidden h-2 w-32 border-2 border-[#0B0B0D] bg-[#1D1810] sm:block">
                          <div className="h-full" style={{ width: `${pct}%`, background: accent }} />
                        </div>
                        <span className="w-20 shrink-0 text-right fl-display text-xl" style={{ color: accent }}>
                          {row.value}
                        </span>
                      </li>
                    )
                  })}
                </ol>
              </div>
            )}

            {tab === "season" && goal?.metric === "posts" && (
              <p className="mt-4 text-[10px] font-bold uppercase tracking-[0.1em] text-[#9A938A]/70">
                {t("postsEngHint", "posts / engajamento")}
              </p>
            )}
          </>
        )}

        {/* ONDE VOCÊ ESTÁ.
            Sem esta linha, quem não entrou no topo veria um pódio de estranhos
            sem saber a própria posição — e "não apareço aqui" seria
            indistinguível de "não pontuei". Ela vale para a fila cheia e para a
            vazia, por isso está fora do ramo acima.

            Quem não tem estante pública com horas volta como `null` do
            backend, e aí o que aparece é o que FAZER (conectar a plataforma,
            abrir a estante) em vez de um zero que pareceria nota. */}
        {isGames && isActivityTab(tab) && !locked && activeActivity?.place && (
          <div
            className="mt-10 border-2 border-[#0B0B0D] bg-[#15120E] px-5 py-4"
            style={{ boxShadow: `0 0 0 1px ${accent}66, 0 18px 48px -18px ${accent}` }}
          >
            {activeActivity.me ? (
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                <span className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#9A938A]">
                  {t("rankingYouLabel", "Sua posição")}
                </span>
                <span className="fl-display text-3xl leading-none" style={{ color: accent }}>
                  #{activeActivity.me.position}
                </span>
                {/* A CONTA ABERTA, e não só o total: o número sozinho não diz
                    o que fazer para subir. Aqui a pessoa vê de onde ele veio. */}
                <span className="text-xs font-bold uppercase tracking-[0.12em] text-[#9A938A]">
                  {t("rankingYouOf", "de")} {activeActivity.me.total} · {compact(activeActivity.me.score)}{" "}
                  {t("rankingPointsShort", "pts")} · {activeActivity.me.likes}{" "}
                  {t("rankingYouLikes", "curtidas")} · {activeActivity.me.comments}{" "}
                  {t("rankingYouComments", "comentários")} · {activeActivity.me.shares}{" "}
                  {t("rankingYouShares", "compart.")} · {compact(activeActivity.me.minutes)}{" "}
                  {t("rankingYouMinutes", "min online")}
                </span>
              </div>
            ) : (
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-[#9A938A]">
                  {t(
                    "rankingYouAbsentActivity",
                    "Você ainda não pontuou aqui: publique na plataforma de games e apareça."
                  )}
                </p>
                <Link
                  href={`/comunidades/${communityId}`}
                  className="shrink-0 border-2 border-[#0B0B0D] px-4 py-2 text-[11px] font-extrabold uppercase tracking-[0.12em] text-[#0B0B0D]"
                  style={{ background: accent }}
                >
                  {t("rankingGoPublish", "Publicar")}
                </Link>
              </div>
            )}
            {/* COMO SE PONTUA, com os pesos que vieram do backend. Copiar os
                números aqui faria a legenda prometer uma conta que a fila não
                faz no dia em que um peso mudasse. */}
            <p className="mt-3 text-[10px] font-bold uppercase tracking-[0.1em] text-[#9A938A]/70">
              {t("rankingActivityHint", "Curtida {like} · comentário {comment} · compartilhamento {share} · {min} min online = 1 ponto")
                .replace("{like}", String(activeActivity.weights.like))
                .replace("{comment}", String(activeActivity.weights.comment))
                .replace("{share}", String(activeActivity.weights.share))
                .replace("{min}", String(activeActivity.weights.minutes_per_point))}
            </p>
          </div>
        )}

        {isGames && tab === "playtime" && !locked && (
          <div
            className="mt-10 border-2 border-[#0B0B0D] bg-[#15120E] px-5 py-4"
            style={{ boxShadow: `0 0 0 1px ${accent}66, 0 18px 48px -18px ${accent}` }}
          >
            {gamerMe ? (
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                <span className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#9A938A]">
                  {t("rankingYouLabel", "Sua posição")}
                </span>
                <span className="fl-display text-3xl leading-none" style={{ color: accent }}>
                  #{gamerMe.position}
                </span>
                <span className="text-xs font-bold uppercase tracking-[0.12em] text-[#9A938A]">
                  {t("rankingYouOf", "de")} {gamerMe.total} · {compact(Math.round(gamerMe.minutes / 60))}h ·{" "}
                  {gamerMe.games} {t("rankingYouGames", "jogos")}
                </span>
              </div>
            ) : (
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-[#9A938A]">
                  {t(
                    "rankingYouAbsent",
                    "Você ainda não está na fila: conecte uma plataforma e deixe a estante pública."
                  )}
                </p>
                <Link
                  href={`/comunidades/${communityId}?aba=estante`}
                  className="shrink-0 border-2 border-[#0B0B0D] px-4 py-2 text-[11px] font-extrabold uppercase tracking-[0.12em] text-[#0B0B0D]"
                  style={{ background: accent }}
                >
                  {t("tabShelf", "Estante")}
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function PodiumCol({
  row,
  rank,
  unitWord,
  accent,
  crowned,
  t,
}: {
  row: Row
  rank: 1 | 2 | 3
  unitWord: string
  accent: string
  /** A coroa é do vencedor: em temporada encerrada ela segue o `winner_user_id`. */
  crowned: boolean
  t: (k: string, f: string) => string
}) {
  const isFirst = rank === 1
  const order = rank === 1 ? "order-2" : rank === 2 ? "order-1" : "order-3"
  const width = isFirst ? "w-[40%]" : "w-[30%]"
  const pedestalH = isFirst ? "h-14 md:h-36" : rank === 2 ? "h-10 md:h-24" : "h-8 md:h-16"

  return (
    <div className={cn("flex min-w-0 flex-col items-center", order, width)}>
      <div className="relative w-full">
        {isFirst && (
          <>
            <div
              className="absolute -inset-6 -z-10 rounded-full blur-3xl"
              style={{ background: accent, opacity: 0.25 }}
            />
            {crowned && (
              <DoodleCrown
                className="absolute -top-7 left-1/2 z-20 h-8 w-12 -translate-x-1/2 md:-top-11 md:h-11 md:w-16"
                style={{ color: accent }}
              />
            )}
          </>
        )}
        <span
          className={cn(
            "absolute -left-1.5 -top-1.5 z-20 flex h-6 w-6 rotate-[-6deg] items-center justify-center fl-display text-base md:h-12 md:w-12 md:text-3xl",
            isFirst ? "text-[#0B0B0D]" : "bg-[#0B0B0D] text-[#F1EDE2]"
          )}
          style={isFirst ? { background: accent } : undefined}
        >
          {rank}
        </span>

        <div
          className="fl-torn-1 fl-cut relative overflow-hidden p-2"
          style={{ background: isFirst ? accent : "#0B0B0D" }}
        >
          {row.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={row.avatar_url}
              alt={row.name}
              loading="lazy"
              className={cn("w-full object-cover", isFirst ? "aspect-[4/5]" : "aspect-square")}
            />
          ) : (
            <div
              className={cn(
                "flex w-full items-center justify-center bg-[#1D1810] fl-display",
                isFirst ? "aspect-[4/5] text-6xl" : "aspect-square text-5xl"
              )}
              style={{ color: accent }}
            >
              {initials(row.name)}
            </div>
          )}
        </div>

        <div className="fl-card relative mt-2 p-2 text-center md:mt-3 md:p-3">
          <span className="inline-block -rotate-1 bg-[#0B0B0D] px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-[0.14em] text-[#F1EDE2]">
            {t("roleMember", "Membro")}
          </span>
          <h3
            className={cn(
              "fl-display mt-1.5 leading-none text-[#0B0B0D] md:mt-2",
              isFirst ? "text-sm md:text-4xl" : "text-xs md:text-3xl"
            )}
          >
            {row.name}
          </h3>
          <div className="mt-1.5 fl-display leading-none text-[#E0A500] md:mt-2">
            <span className={isFirst ? "text-xl md:text-5xl" : "text-lg md:text-4xl"}>{row.value}</span>
          </div>
          <p className="text-[8px] font-bold uppercase tracking-[0.18em] text-[#6B6457] md:text-[10px]">{unitWord}</p>
        </div>
      </div>

      <div className={cn("relative mt-3 flex w-[78%] items-center justify-center md:w-full", pedestalH)}>
        <div
          className="absolute inset-0"
          style={{ clipPath: "polygon(6% 0, 94% 0, 100% 100%, 0 100%)", background: isFirst ? accent : "#0B0B0D" }}
        />
        <span
          className={cn(
            "fl-display relative z-10 text-2xl md:text-7xl",
            isFirst ? "text-[#0B0B0D]/85" : "text-[#F1EDE2]/85"
          )}
        >
          {rank}
        </span>
      </div>
    </div>
  )
}
