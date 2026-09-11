"use client"

/**
 * O RANKING CHEIO DA COMUNIDADE — pódio editorial + a lista inteira.
 *
 * É a página que o botão retrátil "Ranking" (roxo) do headcard abre, e ela vale
 * para TODA modalidade: comum, condomínio, bairro, pet e carro usam a mesma
 * casca de comunidade, então nenhuma delas precisou de tela própria. A
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
 * ⚠️ AS FILAS DE GAMES SAÍRAM DAQUI (2026-09-09). Esta tela chegou a servir
 * mais duas fontes — cidade/estado e horas jogadas da plataforma de games —, e
 * elas foram embora inteiras com o frontend daquele ambiente: as abas, os dois
 * blocos de "sua posição", os dois `fetch` de `/api/gamer/*` e a pele roxa. O
 * que sobrou é a régua das comunidades DE VERDADE — as que têm membros —, que
 * é a única para a qual esta página ainda tem porta.
 *
 * A recusa é DITA EM VOZ ALTA: comunidade privada e condomínio devolvem 403 na
 * lista de membros para quem está de fora (a política declara o tier mínimo).
 * O botão do headcard aparece para todo mundo — botão que abre o nada parece
 * quebrado —, então a página precisa explicar por que não há lista, em vez de
 * mostrar um pódio vazio que pareceria "ninguém pontuou".
 */

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { Loader2, Lock, ShieldAlert, Trophy } from "lucide-react"
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

// O fundo do ambiente: uma textura estática na cor da plataforma. Import
// DIRETO (e não por `dynamic`) porque ele deixou de ser um shader e virou
// quatro divs de CSS — um chunk à parte só faria a cor do ambiente piscar na
// entrada da tela. Ver components/platform/tech-backdrop.tsx.
import { TechBackdrop } from "@/components/platform/tech-backdrop"

type Community = {
  id_profile: string
  display_name: string
  avatar_url: string | null
  kind?: string | null
  /** Quem manda na comunidade — aqui só para saber se o dock mostra o Site. */
  id_leader_user?: string | null
  community_theme: { accent?: string; background?: string } | null
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
 * As duas filas de uma comunidade: a temporada em andamento e o XP dos
 * membros. Um tipo só porque o estado da aba é um só e a barra que o desenha
 * também.
 */
type Tab = "season" | "xp"

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
  const load = useCallback(async () => {
    try {
      const tk = getToken()
      const headers = tk ? { Authorization: `Bearer ${tk}` } : undefined

      // A comunidade vem PRIMEIRO, sozinha: é ela que diz o nome da tela e a
      // cor do pódio antes de qualquer fila chegar.
      const cRes = await fetch(`/api/communities/${communityId}`, headers ? { headers } : undefined)
      const cData = await cRes.json().catch(() => ({}))
      if (!cRes.ok) {
        setErrorMsg(cData?.error || t("notFound", "Comunidade não encontrada."))
        setState("error")
        return
      }
      setCommunity(cData.community)

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
  // ─── O AMBIENTE (o dock global lê isto pelo beacon lá embaixo) ────────────
  // A régua do Site é a MESMA da página da comunidade, importada e não copiada:
  // são duas telas do mesmo espaço, e duas cópias divergiriam na primeira
  // mudança de regra — o globo apareceria numa e não na outra.
  const siteEnabled = useFeature("comunidade_site")
  const viewerId = getStoredUser()?.id_user ?? null
  const isLeader = !!community?.id_leader_user && community.id_leader_user === viewerId
  const canBuildSite = canBuildCommunitySite({
    kind: community?.kind,
    isLeader,
    siteEnabled,
  })
  // ⚠️ MESMO PREDICADO DA PÁGINA: é a plataforma de negócio que decide o
  // ambiente do dock, a pele e o fundo. Aqui ele também escolhe as variáveis de
  // cor — o pódio é outra sala do mesmo espaço, e chegar nele com outro fundo
  // faria a comunidade trocar de cara ao andar dois metros.
  const isBusiness = (community?.kind ?? null) === "common"

  // ⚠️ SÓ O NEGÓCIO TROCA O DOCK — é o único ambiente que sobrou depois que a
  // plataforma de games saiu do ar (2026-09-09).
  const shellKind: "business" | null = isBusiness ? "business" : null

  const bgKey = community?.community_theme?.background
  const skinVars = useMemo(
    () => (isBusiness ? platformSkinVars(bgKey) : undefined),
    [isBusiness, bgKey]
  )
  const bizTint = useMemo(() => backdropTint(bgKey), [bgKey])

  const seasonOn = !!goal

  useEffect(() => {
    // Sem temporada não existe a aba dela — cair nela deixaria a tela vazia.
    if (!seasonOn) setTab("xp")
  }, [seasonOn])

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
  }, [tab, goal, members])

  const unitWord =
    tab === "season" && goal ? metricLabel(goal.metric) : t("metricXp", "XP coletivo")

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
        "fl-root relative min-h-[100dvh] overflow-x-clip bg-[#0b0804] pb-24 text-[#F1EDE2]",
        isBusiness && "fl-business"
      )}
    >
      {isBusiness && <TechBackdrop variant="business" tint={bizTint} />}
      {/* ⚠️ ESTA TELA TAMBÉM É O AMBIENTE. O "Ranking" do dock de negócios leva
          para uma página irmã: sem o beacon aqui, o dock voltaria a ser o da
          Freelandoo no meio do ambiente e a pessoa perderia os controles do
          espaço em que ainda está. */}
      {shellKind && (
        <CommunityShellBeacon
          communityId={communityId}
          kind={shellKind}
          canBuildSite={canBuildSite}
          canSeeIndicators={isLeader}
        />
      )}
      <div className="relative mx-auto max-w-4xl px-0 pt-6 md:px-6">
        <PageBackLink href={`/comunidades/${communityId}`} label={community.display_name} className="px-3 md:px-0" />

        {/* A troca de fila só existe quando há mais de uma: com uma opção só,
            o par de botões pediria um clique que não decide nada. */}
        {seasonOn && !locked && (
          <div className="mt-5 flex flex-wrap items-center gap-1">
            {([
              ["season", "rankingTabSeason", "Temporada"],
              ["xp", "rankingTabXp", "XP geral"],
            ] as const).map(([id, key, fallback]) => (
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

        {/* Cabeçalho do pódio */}
        <div className="mt-8 text-center">
          <p className="fl-marker text-2xl" style={{ color: accent }}>
            {tab === "season" && goal
              ? goal.status === "closed"
                ? `${t("goalEnded", "Temporada encerrada")} · ${unitWord}`
                : daysLeft != null
                  ? `${t("goalDaysLeft", "faltam")} ${daysLeft} ${t("goalDaysWord", "dias")} · ${unitWord}`
                  : unitWord
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
        ) : top3.length === 0 ? (
          <div className="mt-10 border-2 border-[#0B0B0D] bg-[#15120E] p-8 text-center">
            <Trophy className="mx-auto h-8 w-8 text-[#9A938A]" />
            <p className="mt-3 text-sm text-[#9A938A]">
              {tab === "season"
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
