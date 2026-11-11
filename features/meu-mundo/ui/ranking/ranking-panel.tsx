"use client"

// features/meu-mundo/ui/ranking/ranking-panel.tsx — a aba RANKING do menu (B7, 2026-11-08).
// Três abas: PODER (número calculado pelo servidor: os 5 atributos + HP máx do nível +
// equipamento), NÍVEL (nível de aventura) e FREELANDOO (pontos do perfil no site). Top 100 do
// Brasil e, embaixo, a minha posição. Nada é calculado aqui: a tela só mostra o que vem pronto.
// Lore v2 N1: a aba SEMANA (weekly-board.tsx) — o placar semanal de cada jogável.

import { useCallback, useEffect, useState } from "react"
import { CalendarDays, Crown, RefreshCw, Trophy, Zap, Star } from "lucide-react"
import { getToken } from "@/lib/auth"
import { useLocale, useTranslations } from "@/components/i18n/I18nProvider"
import { getRanking, type RankingResult, type RankingRow, type RankingTab, type PoderParts } from "../../data"
import { MM } from "../hud/tokens"
import { EvoButton, EvoDialog } from "../hud/hud-kit"
import { archivo, teko } from "../status/evo-skin"
import { faceOf } from "../portraits"
import { WeeklyBoard } from "./weekly-board"

type Tr = (key: string, fallback: string) => string

type PanelTab = RankingTab | "semana"
const TABS: { id: PanelTab; key: string; label: string; icon: React.ReactNode }[] = [
  { id: "semana", key: "rkTabSemana", label: "Semana", icon: <CalendarDays className="h-3.5 w-3.5" /> },
  { id: "poder", key: "rkTabPoder", label: "Poder", icon: <Zap className="h-3.5 w-3.5" /> },
  { id: "nivel", key: "rkTabNivel", label: "Nível", icon: <Star className="h-3.5 w-3.5" /> },
  { id: "freelandoo", key: "rkTabFreelandoo", label: "Freelandoo", icon: <Trophy className="h-3.5 w-3.5" /> },
]

/** Ordem das parcelas do Poder na linha "como o seu Poder se forma". */
const PARTS: { k: keyof PoderParts; key: string; label: string }[] = [
  { k: "strength", key: "atStrength", label: "Acuracidade" },
  { k: "speed", key: "atSpeed", label: "Velocidade" },
  { k: "dexterity", key: "attrDexterity", label: "Destreza" },
  { k: "intelligence", key: "atIntelligence", label: "Inteligência" },
  { k: "accuracy", key: "attrAccuracy", label: "Acurácia" },
  { k: "hp", key: "rkPartHp", label: "HP máx" },
  { k: "gear", key: "rkPartGear", label: "Equipamento" },
]

export default function RankingPanel({ onClose }: { onClose: () => void }) {
  const t = useTranslations("MeuMundo")
  const locale = useLocale()
  const [tab, setTab] = useState<PanelTab>("semana")
  const [data, setData] = useState<Partial<Record<RankingTab, RankingResult>>>({})
  const [error, setError] = useState<RankingTab | null>(null)

  const load = useCallback(async (which: RankingTab) => {
    const token = getToken()
    if (!token) return
    setError(null)
    const r = await getRanking(token, which)
    if (r.ok) setData((d) => ({ ...d, [which]: r.data }))
    else setError(which)
  }, [])
  useEffect(() => {
    if (tab !== "semana" && !data[tab]) void load(tab)
  }, [tab, data, load])

  const cur = tab === "semana" ? undefined : data[tab]
  const fmt = (n: number) => Math.round(n).toLocaleString(locale)
  const unit = tab === "poder" ? t("rkUnitPoder", "de poder") : tab === "nivel" ? t("rkUnitNivel", "nível") : t("rkUnitPts", "pts")
  const meInTop = !!cur?.me && cur.top.some((r) => r.position === cur.me!.position)

  return (
    <EvoDialog fixed z="z-[78]" labelId="mm-ranking" eyebrow={t("rkEyebrow", "Brasil · top 100")} title={t("rkTitle", "Ranking")} onClose={onClose} width="max-w-lg">
      <div className="-mx-1 mb-3 flex gap-1.5 overflow-x-auto px-1 pb-1" role="tablist" aria-label={t("rkTitle", "Ranking")}>
        {TABS.map((x) => (
          <button
            key={x.id}
            type="button"
            role="tab"
            aria-selected={tab === x.id}
            onClick={() => setTab(x.id)}
            className={`${archivo.className} inline-flex h-8 shrink-0 items-center gap-1 rounded-full px-3 text-[13px] font-semibold`}
            style={{ background: tab === x.id ? MM.ruby : MM.card, color: tab === x.id ? "#fff" : MM.muted, border: `1px solid ${tab === x.id ? MM.rubyBorder : MM.border}` }}
          >
            {x.icon}
            {t(x.key, x.label)}
          </button>
        ))}
      </div>

      {tab === "semana" ? (
        <WeeklyBoard t={t} locale={locale} />
      ) : (
        <>
      <p className="mb-2 text-[12px]" style={{ color: MM.muted }}>
        {tab === "poder"
          ? t("rkHintPoder", "Soma do que é permanente: atributos, HP máx do nível e equipamento. Entra o seu melhor personagem.")
          : tab === "nivel"
            ? t("rkHintNivel", "Nível de aventura: sobe com as lutas, os minijogos e as missões.")
            : t("rkHintFreelandoo", "Pontos do seu perfil na Freelandoo: posts, visitas, curtidas e avaliações.")}
      </p>

      {error === tab ? (
        <div className="flex flex-col items-center gap-3 py-10 text-center" style={{ color: MM.muted }} role="alert">
          {t("rkLoadFail", "Não carregou o ranking.")}
          <EvoButton variant="gold" size="sm" icon={<RefreshCw className="h-4 w-4" />} onClick={() => void load(tab)}>
            {t("ibRetry", "Tentar de novo")}
          </EvoButton>
        </div>
      ) : !cur ? (
        <ul className="flex flex-col gap-1.5" aria-hidden>
          {Array.from({ length: 8 }, (_, i) => (
            <li key={i} className="h-12" style={{ background: MM.card }} />
          ))}
        </ul>
      ) : cur.top.length === 0 ? (
        <p className="py-10 text-center text-[14px]" style={{ color: MM.muted }}>
          {t("rkEmpty", "Ninguém no ranking ainda.")}
        </p>
      ) : (
        <>
          <ol className="flex max-h-[50vh] flex-col gap-1.5 overflow-y-auto pr-1" aria-label={t(TABS.find((x) => x.id === tab)!.key, TABS.find((x) => x.id === tab)!.label)}>
            {cur.top.map((r) => (
              <li key={`${r.position}-${r.idUser ?? r.idProfile ?? r.name}`}>
                <RankingRowView row={r} mine={!!cur.me && cur.me.position === r.position} value={fmt(r.value)} unit={unit} t={t} />
              </li>
            ))}
          </ol>
          {cur.me && !meInTop && (
            <div className="mt-2 border-t pt-2" style={{ borderColor: MM.border }}>
              <RankingRowView row={cur.me} mine value={fmt(cur.me.value)} unit={unit} t={t} />
            </div>
          )}
          {!cur.me && (
            <p className="mt-2 text-[12px]" style={{ color: MM.muted }}>
              {tab === "freelandoo" ? t("rkMeNoneSite", "Seu perfil ainda não entrou no ranking da Freelandoo.") : t("rkMeNone", "Você ainda não está no ranking.")}
            </p>
          )}
          {tab === "poder" && cur.me?.parts && <PoderBreakdown parts={cur.me.parts} fmt={fmt} t={t} />}
        </>
      )}
        </>
      )}
    </EvoDialog>
  )
}

export function RankingRowView({ row, mine, value, unit, t, badge }: { row: RankingRow; mine: boolean; value: string; unit: string; t: Tr; badge?: string }) {
  const top3 = row.position <= 3
  const face = row.body ? faceOf(row.body) : row.avatar
  const name = mine && !row.name ? t("rkYou", "Você") : row.name || t("rkNoName", "Jogador")
  return (
    <div
      className="flex h-12 items-center gap-2.5 px-2.5"
      style={{
        background: mine ? MM.rubySoft : MM.card,
        border: `1px solid ${mine ? MM.rubyBorder : MM.border}`,
      }}
      aria-current={mine ? "true" : undefined}
    >
      <span className={`${teko.className} flex w-9 shrink-0 items-center justify-center gap-0.5 text-[22px] leading-none tabular-nums`} style={{ color: top3 ? MM.gold : MM.muted }}>
        {row.position === 1 && <Crown className="h-3.5 w-3.5" aria-hidden />}
        {row.position}
      </span>
      {face ? (
        // eslint-disable-next-line @next/next/no-img-element -- retrato local/foto de perfil em lista (regra 4: <img> lazy)
        <img src={face} alt="" loading="lazy" decoding="async" draggable={false} className="h-9 w-9 shrink-0 rounded-full object-cover" style={{ background: "rgba(0,0,0,0.35)" }} />
      ) : (
        <span className="h-9 w-9 shrink-0 rounded-full" style={{ background: "rgba(0,0,0,0.35)" }} aria-hidden />
      )}
      <span className={`${archivo.className} min-w-0 flex-1 truncate text-[14px] font-semibold`} style={{ color: MM.text }}>
        {name}
        {mine && row.name ? <span style={{ color: MM.gold }}> · {t("rkYou", "Você")}</span> : null}
      </span>
      {badge ? (
        <span className={`${archivo.className} shrink-0 text-[11px] font-semibold tabular-nums`} style={{ color: MM.gold }}>
          {badge}
        </span>
      ) : null}
      <span className="shrink-0 text-right">
        <span className={`${teko.className} block text-[22px] leading-none tabular-nums`} style={{ color: MM.text }}>
          {value}
        </span>
        <span className="block text-[10px] uppercase tracking-wide" style={{ color: MM.muted }}>
          {unit}
        </span>
      </span>
    </div>
  )
}

function PoderBreakdown({ parts, fmt, t }: { parts: PoderParts; fmt: (n: number) => string; t: Tr }) {
  return (
    <div className="mt-3">
      <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide" style={{ color: MM.gold }}>
        {t("rkBreakdown", "Como o seu Poder se forma")}
      </p>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-[12px] sm:grid-cols-4">
        {PARTS.map((p) => (
          <div key={p.k} className="flex justify-between gap-2">
            <dt style={{ color: MM.muted }}>{t(p.key, p.label)}</dt>
            <dd className="tabular-nums" style={{ color: MM.text }}>
              {fmt(parts[p.k] ?? 0)}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  )
}
