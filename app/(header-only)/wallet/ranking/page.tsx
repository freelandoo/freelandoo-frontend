"use client"

// /wallet/ranking — a fila do FINANCEIRO, por cidade e por estado.
//
// "Contagem própria de pontos, ranking, igualmente o games mas para o mundo
// financeiro" (Alex, 2026-09-08). A conta é a MESMA do ranking de games e mora
// no backend (utils/gamesScore.js): curtida 1 · comentário 2 ·
// compartilhamento 3 · 10 min online = 1 ponto, contados só sobre o que
// acontece DENTRO do Financeiro.
//
// ⚠️ O TEMPO ONLINE É O DAQUI. Esta tela nasceu sem ele — a única batida de
// presença que existia era a do ambiente de games, e somá-la aqui daria ponto
// de presença de games a quem nunca entrou lá. A mig 230 pôs a plataforma na
// chave da presença, e a Carteira passou a ter o relógio dela (a batida sai do
// `wallet-headcard`, que é a peça das cinco telas). Quem fica na Carteira
// pontua pela Carteira; quem fica em games, por games.
//
// ⚠️ OS PESOS VÊM DO BACKEND (`weights`), não são copiados aqui: dois lugares
// guardando o peso fariam a legenda prometer uma conta que a fila não faz.
//
// ⚠️ TRÊS VAZIOS DIFERENTES, cada um com sua frase — ainda carregando · você
// não declarou cidade · ninguém pontuou ainda. Só o do meio tem conserto, e a
// pessoa precisa saber qual é o caso: um pódio vazio diria "ninguém pontuou"
// para quem, na verdade, nunca disse onde mora.
//
// A PORTA É O PILL ROSA do headcard (pedido do Alex, 2026-09-08: "tira a
// vaquinha do pill rosa, coloca o ranking ali"). Antes era um botão no topo do
// mural, porque com a Vaquinha na pilha um quinto pill não caberia atrás da
// foto; com ela fora, o lugar abriu. O botão do mural SAIU junto — duas portas
// para a mesma página na mesma tela é como uma delas para de acompanhar a
// outra.

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { AlertCircle, MapPin, Trophy } from "lucide-react"
import { Halftone, Underline } from "@/components/home/landing/primitives"
import { useMeProfile } from "@/hooks/use-me-profile"
import { useTranslations } from "@/components/i18n/I18nProvider"
import { getToken } from "@/lib/auth"
import { cn } from "@/lib/utils"
import { WalletHeadcard } from "../_components/wallet-headcard"
import { GREEN, GREEN_DEEP, StateBox, initialsOf } from "../_components/wallet-ui"

type Scope = "city" | "state"
type Row = {
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
type Payload = {
  scope: Scope
  place: { municipio: string; estado: string } | null
  weights: { like: number; comment: number; share: number; minutes_per_point: number }
  rows: Row[]
  me: Row | null
}

export default function FinanceRankingPage() {
  const tr = useTranslations("Wallet")
  const { perfil } = useMeProfile()
  const [scope, setScope] = useState<Scope>("city")
  // Um cache POR ESCOPO: com estado único, ir e voltar entre as duas abas
  // recarregaria as duas e a tela piscaria a cada troca.
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
        const r = await fetch(`/api/finance/ranking?scope=${which}`, {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        })
        const d = await r.json().catch(() => null)
        if (!r.ok) throw new Error(d?.error || tr("loadError", "Erro ao carregar"))
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
  const weights = payload?.weights

  return (
    <main className="fl-root fl-paper-texture relative min-h-[100dvh] overflow-x-clip pb-24">
      <Halftone className="absolute left-3 top-40 h-24 w-24 opacity-[0.1]" />

      <WalletHeadcard
        perfil={perfil}
        eyebrow={tr("rankingEyebrow", "quem move o dinheiro")}
        title={tr("rankingTitle", "Ranking")}
        backHref="/wallet"
        active="ranking"
      />

      <section className="mx-auto mt-6 w-full max-w-4xl px-3 md:px-8">
        {/* As duas abas. Planas, e não um seletor dentro de "atividade": são
            dois recortes do mesmo número, não duas métricas. */}
        <div className="mb-4 flex flex-wrap gap-1.5">
          {(["city", "state"] as Scope[]).map((s) => {
            const active = scope === s
            return (
              <button
                key={s}
                type="button"
                onClick={() => setScope(s)}
                className={cn(
                  "border-2 px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-[0.1em] transition-transform hover:-translate-y-0.5",
                  active
                    ? "border-[#0B0B0D] text-[#0B0B0D] shadow-[3px_3px_0_0_#0B0B0D]"
                    : "border-[#F1EDE2]/25 bg-transparent text-[#F1EDE2] hover:border-[#F1EDE2]"
                )}
                style={active ? { background: GREEN } : undefined}
              >
                {s === "city" ? tr("scopeCity", "Minha cidade") : tr("scopeState", "Meu estado")}
              </button>
            )
          })}
        </div>

        {payload?.place && (
          <p className="mb-5 inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-[#C9C2B6]">
            <MapPin className="h-3.5 w-3.5" />
            {scope === "city"
              ? `${payload.place.municipio} · ${payload.place.estado}`
              : payload.place.estado}
          </p>
        )}

        {loading && !payload ? (
          <div className="flex flex-col gap-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-14 animate-pulse border-2 border-[#F1EDE2]/10 bg-[#1D1810]" />
            ))}
          </div>
        ) : error ? (
          <StateBox
            icon={<AlertCircle className="h-6 w-6" />}
            title={tr("loadFailedTitle", "Não deu pra carregar.")}
            desc={error}
          />
        ) : !payload?.place ? (
          // NÃO é "ninguém pontuou": esta pessoa não declarou onde mora, e a
          // fila é geográfica. A frase tem que dizer o que FAZER.
          <StateBox
            icon={<MapPin className="h-6 w-6" />}
            title={tr("rankingNoPlaceTitle", "Diga em que cidade você está")}
            desc={tr(
              "rankingNoPlaceDesc",
              "A fila do Financeiro é por cidade e por estado. Complete a cidade no seu perfil para entrar nela."
            )}
            action={
              <Link
                href="/account"
                className="border-2 border-[#0B0B0D] px-4 py-2 text-[11px] font-extrabold uppercase tracking-[0.12em] text-[#0B0B0D] shadow-[3px_3px_0_0_#0B0B0D] transition hover:-translate-y-0.5"
                style={{ background: GREEN }}
              >
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
              "Ninguém pontuou ainda neste recorte. Publique no Financeiro: curtida, comentário e compartilhamento dos outros viram pontos — e o tempo que você passa por aqui também conta."
            )}
            action={
              <Link
                href="/wallet"
                className="border-2 border-[#0B0B0D] px-4 py-2 text-[11px] font-extrabold uppercase tracking-[0.12em] text-[#0B0B0D] shadow-[3px_3px_0_0_#0B0B0D] transition hover:-translate-y-0.5"
                style={{ background: GREEN }}
              >
                {tr("rankingEmptyCta", "Ir para o mural")}
              </Link>
            }
          />
        ) : (
          <div className="flex flex-col gap-2">
            {payload.rows.map((row) => (
              <RankRow key={row.id_user} row={row} me={payload.me?.id_user === row.id_user} tr={tr} />
            ))}

            {/* A linha de quem olha fica FORA da lista quando ela não está lá:
                sem isso, quem pontuou mas não entrou no topo não saberia a
                própria posição. */}
            {payload.me && !payload.rows.some((r) => r.id_user === payload.me?.id_user) && (
              <>
                <p className="mt-4 text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#C9C2B6]">
                  {tr("rankingYou", "Sua posição")}
                </p>
                <RankRow row={payload.me} me tr={tr} />
              </>
            )}
          </div>
        )}

        {weights && (
          <p className="mt-6 text-[11px] leading-relaxed text-[#C9C2B6]/70">
            {tr("rankingLegend", "Como pontua:")}{" "}
            {tr("rankingLegendLike", "curtida")} {weights.like} ·{" "}
            {tr("rankingLegendComment", "comentário")} {weights.comment} ·{" "}
            {tr("rankingLegendShare", "compartilhamento")} {weights.share} ·{" "}
            {/* O peso do tempo vem do backend como os outros três: copiá-lo aqui
                faria a legenda prometer uma conta que a fila não faz. */}
            {tr("rankingLegendTime", "{min} min no Financeiro = 1 ponto").replace(
              "{min}",
              String(weights.minutes_per_point)
            )}
            .{" "}
            {tr("rankingLegendSelf", "O que você mesmo curte no seu post não conta.")}
          </p>
        )}
      </section>
    </main>
  )
}

/** Uma linha da fila. A conta aberta fica embaixo do nome — o total sozinho não
 *  diz o que fazer para subir. */
function RankRow({
  row,
  me,
  tr,
}: {
  row: Row
  me?: boolean
  tr: (key: string, fallback?: string) => string
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 border-2 border-[#0B0B0D] px-3 py-2.5 shadow-[4px_4px_0_0_#0B0B0D]",
        me ? "bg-[#16B79A]" : "bg-[#F1EDE2]"
      )}
    >
      <span className="fl-display w-9 shrink-0 text-center text-2xl leading-none text-[#0B0B0D]">
        {row.position}
      </span>
      <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden border-2 border-[#0B0B0D] bg-[#0B0B0D]/[0.07]">
        {row.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={row.avatar_url} alt="" className="h-full w-full object-cover" />
        ) : (
          <span className="text-[11px] font-black text-[#0B0B0D]">{initialsOf(row.name)}</span>
        )}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-extrabold text-[#0B0B0D]">
          {row.name || row.username || "—"}
        </p>
        {/* A conta ABERTA, e não só o total: o número sozinho não diz o que
            fazer para subir. */}
        <p className="truncate text-[10px] font-semibold uppercase tracking-wide text-[#0B0B0D]/60">
          {row.likes} {tr("rankingLegendLike", "curtida")} · {row.comments}{" "}
          {tr("rankingLegendComment", "comentário")} · {row.shares}{" "}
          {tr("rankingLegendShare", "compartilhamento")} · {row.minutes}{" "}
          {tr("rankingMinutes", "min online")}
        </p>
      </div>
      <span className="fl-display shrink-0 text-2xl leading-none" style={{ color: me ? "#06251F" : GREEN_DEEP }}>
        {row.score}
      </span>
    </div>
  )
}
