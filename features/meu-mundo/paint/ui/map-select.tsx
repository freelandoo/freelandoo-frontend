// features/meu-mundo/paint/ui/map-select.tsx — PAINT (mm3d-76): SELECIONAR MAPA.
//
// Pedido do Alex: depois do modo, os 6 mapas em cartões (como os circuitos da
// Corrida Antigravidade) — miniatura, nome, ambiente, dificuldade, descrição,
// destaques, para quantos e o melhor resultado do aparelho. Tocar seleciona e
// mostra a prévia grande; JOGAR entra. No treino o mapa escolhido é o da
// partida; no multiplayer o cartão é o VOTO: na espera a contagem aparece em
// cada cartão e tocar em outro troca o voto (a sala apura na largada; empate
// = sorteio no servidor). Nada de 3D aqui: só as miniaturas.

import { useEffect, useMemo, useState } from "react"
import { ArrowLeft, Loader2, Play, Trophy, Users, Vote } from "lucide-react"
import { useTranslations } from "@/components/i18n/I18nProvider"
import { MM } from "../../ui/hud/tokens"
import { paintMapArts, type PaintMapArt } from "../engine/paint-map-art"
import type { PaintMode } from "../sim/tuning"

export interface PaintMapRecord {
  /** Maior dano no Guardião numa partida. */
  dmg: number
  wins: number
  plays: number
}

const REC_KEY = "mm-paint-records-v1"
const LAST_KEY = "mm-paint-map"

/** Recorde do aparelho (a pessoa troca de aparelho = começa de novo; é só conveniência). */
export function readPaintRecords(): Record<string, PaintMapRecord> {
  try {
    const raw = window.localStorage.getItem(REC_KEY)
    return raw ? (JSON.parse(raw) as Record<string, PaintMapRecord>) : {}
  } catch {
    return {}
  }
}

export function savePaintRecord(mapId: string, dmg: number, won: boolean) {
  try {
    const all = readPaintRecords()
    const cur = all[mapId] ?? { dmg: 0, wins: 0, plays: 0 }
    all[mapId] = { dmg: Math.max(cur.dmg, Math.round(dmg)), wins: cur.wins + (won ? 1 : 0), plays: cur.plays + 1 }
    window.localStorage.setItem(REC_KEY, JSON.stringify(all))
  } catch {
    /* sem armazenamento: sem recorde */
  }
}

export function lastPaintMap(): string {
  try {
    return window.localStorage.getItem(LAST_KEY) || "cidade"
  } catch {
    return "cidade"
  }
}

function rememberMap(id: string) {
  try {
    window.localStorage.setItem(LAST_KEY, id)
  } catch {
    /* ok */
  }
}

export function PaintMapSelect({
  mode,
  modeLabel,
  joining,
  lobby,
  votes,
  stale,
  error,
  onBack,
  onRun,
  onVote,
  onCancel,
}: {
  mode: PaintMode
  modeLabel: string
  /** Mapa em que se entrou (votando) — null = ainda escolhendo. */
  joining: string | null
  lobby: { n: number; cap: number; until?: number } | null
  votes: Record<string, number>
  stale: boolean
  error: string | null
  onBack: () => void
  onRun: (id: string) => void
  onVote: (id: string) => void
  onCancel: () => void
}) {
  const t = useTranslations("MeuMundo")
  const list = useMemo(() => paintMapArts(), [])
  const records = useMemo(() => readPaintRecords(), [])
  const [sel, setSel] = useState(() => {
    const last = joining ?? lastPaintMap()
    return list.some((m) => m.id === last) ? last : list[0].id
  })
  const chosen = list.find((m) => m.id === sel) ?? list[0]
  const multi = mode !== "solo"
  // relógio da espera (1 minuto; depois as vagas vazias viram computadores)
  const [now, setNow] = useState(() => Date.now())
  const waitUntil = lobby?.until ?? 0
  useEffect(() => {
    if (!waitUntil) return
    const id = setInterval(() => setNow(Date.now()), 500)
    return () => clearInterval(id)
  }, [waitUntil])
  const clock = (until?: number) => {
    if (!until) return "…"
    const left = Math.max(0, Math.ceil((until - now) / 1000))
    return `${Math.floor(left / 60)}:${String(left % 60).padStart(2, "0")}`
  }
  const pick = (id: string) => {
    setSel(id)
    rememberMap(id)
    if (joining) onVote(id)
  }
  return (
    <div className="absolute inset-0 flex flex-col" style={{ background: "radial-gradient(120% 90% at 50% 0%, #2a3f57 0%, #121820 62%, #0b0e13 100%)", color: MM.text }}>
      <header className="flex shrink-0 items-center gap-3 px-5 pb-2 pt-4 max-[759px]:px-4">
        <button
          type="button"
          onClick={joining ? onCancel : onBack}
          aria-label={t("paintMapBack", "Voltar")}
          className="grid h-10 w-10 shrink-0 place-items-center rounded-full"
          style={{ background: MM.card, border: `1px solid ${MM.border}` }}
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="min-w-0">
          <div className="text-[11px] font-bold uppercase tracking-[0.2em]" style={{ color: "#5FE1FF" }}>
            PAINT · {modeLabel}
          </div>
          <h1 className="text-[26px] font-black italic leading-none tracking-tight max-[759px]:text-[21px]">
            {multi ? t("paintMapVoteTitle", "VOTE NO MAPA") : t("paintMapTitle", "SELECIONAR MAPA")}
          </h1>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-4 max-[759px]:px-3">
        {/* prévia grande do selecionado */}
        <Preview m={chosen} rec={records[chosen.id]} votes={votes[chosen.id] ?? 0} showVotes={!!joining} />
        <div className="mx-auto mt-3 grid max-w-[1180px] grid-cols-3 gap-3 max-[1020px]:grid-cols-2 max-[600px]:grid-cols-1">
          {list.map((m) => (
            <Card key={m.id} m={m} selected={m.id === sel} rec={records[m.id]} votes={votes[m.id] ?? 0} showVotes={!!joining} onPick={() => pick(m.id)} onRun={() => !joining && onRun(m.id)} />
          ))}
        </div>
      </div>

      <footer className="flex shrink-0 flex-wrap items-center gap-3 px-5 pb-[calc(14px+env(safe-area-inset-bottom))] pt-3 max-[759px]:px-3" style={{ background: "rgba(8,11,16,0.9)", borderTop: `1px solid ${MM.border}` }}>
        {joining ? (
          <>
            <div className="flex min-w-0 flex-1 items-center gap-2 text-[13px]" style={{ color: MM.muted }}>
              {stale ? null : <Loader2 className="h-4 w-4 shrink-0 animate-spin" />}
              <span className="truncate">
                {stale
                  ? t("paintStale", "O Paint foi atualizado: recarregue a página para jogar.")
                  : lobby
                    ? t("paintWaitingBots", "Esperando jogadores {n}/{k} · {s} · vaga vazia vira computador").replace("{n}", String(lobby.n)).replace("{k}", String(lobby.cap)).replace("{s}", clock(lobby.until))
                    : t("paintJoining", "Procurando sala…")}
              </span>
            </div>
            <button type="button" onClick={onCancel} className="h-12 shrink-0 rounded-none px-5 text-[14px] font-black uppercase tracking-[0.12em]" style={{ background: MM.card, border: `1px solid ${MM.border}`, color: MM.text }}>
              {t("paintCancel", "Cancelar")}
            </button>
          </>
        ) : (
          <>
            <button type="button" onClick={onBack} className="h-12 shrink-0 rounded-none px-5 text-[14px] font-black uppercase tracking-[0.12em]" style={{ background: MM.card, border: `1px solid ${MM.border}`, color: MM.text }}>
              {t("paintMapBack", "Voltar")}
            </button>
            <div className="min-w-0 flex-1 truncate text-[13px] max-[480px]:hidden" style={{ color: MM.muted }}>
              <span className="font-bold" style={{ color: chosen.accent }}>
                {t(chosen.nameKey, chosen.name)}
              </span>{" "}
              · {t(chosen.biomeKey, chosen.biome)}
            </div>
            <button
              type="button"
              onClick={() => onRun(chosen.id)}
              className="ml-auto flex h-12 min-w-[170px] items-center justify-center gap-2 rounded-none px-6 text-[16px] font-black uppercase italic tracking-[0.08em] transition-transform active:scale-[0.98] max-[480px]:flex-1"
              style={{ background: MM.rubyFill, border: `1px solid ${MM.rubyBorder}`, color: "#fff" }}
            >
              {multi ? <Vote className="h-5 w-5" /> : <Play className="h-5 w-5" />} {multi ? t("paintMapVote", "Votar e entrar") : t("paintMapPlay", "Jogar")}
            </button>
          </>
        )}
        {error && (
          <p role="alert" className="w-full text-[13px]" style={{ color: MM.danger }}>
            {error}
          </p>
        )}
      </footer>
    </div>
  )
}

function Thumb({ m, className }: { m: PaintMapArt; className: string }) {
  const [ok, setOk] = useState(true)
  return (
    <div className={`relative w-full overflow-hidden ${className}`} style={{ background: `linear-gradient(135deg, ${m.bg[0]}, ${m.bg[1]})` }}>
      {ok && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={m.thumb} alt="" loading="lazy" onError={() => setOk(false)} className="absolute inset-0 h-full w-full object-cover" />
      )}
      <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, rgba(0,0,0,0) 45%, rgba(5,8,12,0.88) 100%)" }} />
    </div>
  )
}

function Difficulty({ m }: { m: PaintMapArt }) {
  const t = useTranslations("MeuMundo")
  const label = [t("paintDiff1", "Fácil"), t("paintDiff2", "Média"), t("paintDiff3", "Difícil")][m.difficulty - 1]
  return (
    <span className="flex items-center gap-1" title={label}>
      {[1, 2, 3].map((k) => (
        <span key={k} className="h-2.5 w-1.5" style={{ background: k <= m.difficulty ? m.accent : "rgba(255,255,255,0.15)" }} />
      ))}
      <span className="ml-1">{label}</span>
    </span>
  )
}

function RecordLine({ rec }: { rec?: PaintMapRecord }) {
  const t = useTranslations("MeuMundo")
  return (
    <div className="flex items-center gap-1.5 text-[12px]" style={{ color: rec ? MM.gold : MM.muted }}>
      <Trophy className="h-3.5 w-3.5" />
      {rec
        ? t("paintMapRecord", "Recorde: {d} de dano no Guardião · {w} vitória(s)").replace("{d}", String(rec.dmg)).replace("{w}", String(rec.wins))
        : t("paintMapNoRecord", "Sem recorde ainda")}
    </div>
  )
}

function VoteBadge({ n, accent }: { n: number; accent: string }) {
  const t = useTranslations("MeuMundo")
  return (
    <span className="absolute left-2 top-2 flex items-center gap-1 px-2 py-1 text-[11px] font-black uppercase tracking-[0.1em]" style={{ background: n ? accent : "rgba(0,0,0,0.55)", color: n ? "#0b0e13" : "#fff" }}>
      <Vote className="h-3.5 w-3.5" /> {t("paintMapVotes", "{n} voto(s)").replace("{n}", String(n))}
    </span>
  )
}

function Preview({ m, rec, votes, showVotes }: { m: PaintMapArt; rec?: PaintMapRecord; votes: number; showVotes: boolean }) {
  const t = useTranslations("MeuMundo")
  return (
    <div className="mx-auto grid max-w-[1180px] grid-cols-[1.4fr_1fr] gap-0 overflow-hidden max-[760px]:grid-cols-1" style={{ background: MM.surface, border: `2px solid ${m.accent}`, boxShadow: `0 10px 30px -12px ${m.accent}aa` }}>
      <div className="relative">
        <Thumb key={m.id} m={m} className="aspect-[16/9] max-[760px]:aspect-[21/9]" />
        {showVotes && <VoteBadge n={votes} accent={m.accent} />}
        <div className="absolute bottom-3 left-4 right-4">
          <div className="text-[30px] font-black italic leading-none tracking-tight drop-shadow-[0_2px_6px_rgba(0,0,0,0.8)] max-[760px]:text-[24px]">{t(m.nameKey, m.name)}</div>
          <div className="mt-1 text-[13px] text-white/85">{t(m.biomeKey, m.biome)}</div>
        </div>
      </div>
      <div className="flex flex-col gap-2.5 p-4 max-[760px]:p-3">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px]" style={{ color: MM.muted }}>
          <Difficulty m={m} />
          <span className="flex items-center gap-1">
            <Users className="h-3.5 w-3.5" /> {t(m.playersKey, m.players)}
          </span>
        </div>
        <p className="text-[13.5px] leading-snug" style={{ color: MM.text }}>
          {t(m.descKey, m.desc)}
        </p>
        <ul className="flex flex-col gap-1 text-[13px]" style={{ color: MM.text }}>
          {m.highlights.map(([k, f]) => (
            <li key={k} className="flex items-start gap-2">
              <span className="mt-[5px] inline-block h-2 w-2 shrink-0 rotate-45" style={{ background: m.accent }} />
              {t(k, f)}
            </li>
          ))}
        </ul>
        <div className="mt-auto pt-1">
          <RecordLine rec={rec} />
        </div>
      </div>
    </div>
  )
}

function Card({ m, selected, rec, votes, showVotes, onPick, onRun }: { m: PaintMapArt; selected: boolean; rec?: PaintMapRecord; votes: number; showVotes: boolean; onPick: () => void; onRun: () => void }) {
  const t = useTranslations("MeuMundo")
  return (
    <button
      type="button"
      onClick={onPick}
      onDoubleClick={onRun}
      aria-pressed={selected}
      className="group relative flex flex-col overflow-hidden rounded-none text-left transition-transform duration-150 active:scale-[0.99]"
      style={{
        background: MM.surface,
        border: `2px solid ${selected ? "#5FE1FF" : MM.border}`,
        boxShadow: selected ? `0 0 0 1px #5FE1FF55, 0 10px 30px -10px #5FE1FF99` : MM.shadow,
        transform: selected ? "translateY(-2px)" : undefined,
      }}
    >
      <div className="relative">
        <Thumb m={m} className="aspect-[16/9] max-[600px]:aspect-[21/9]" />
        {showVotes && <VoteBadge n={votes} accent={m.accent} />}
        <div className="absolute bottom-2 left-3 right-3">
          <div className="text-[19px] font-black italic leading-none tracking-tight drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">{t(m.nameKey, m.name)}</div>
          <div className="mt-1 text-[12px] leading-tight text-white/80">{t(m.biomeKey, m.biome)}</div>
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-2 p-3">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px]" style={{ color: MM.muted }}>
          <Difficulty m={m} />
        </div>
        <div className="text-[12.5px] leading-snug" style={{ color: MM.text }}>
          ★ {t(m.highlights[0][0], m.highlights[0][1])}
        </div>
        <div className="mt-auto pt-1">
          <RecordLine rec={rec} />
        </div>
      </div>
    </button>
  )
}
