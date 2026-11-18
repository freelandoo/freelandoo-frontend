// features/meu-mundo/paint/ui/map-select.tsx — PAINT (mm3d-76): SELECIONAR MAPA.
//
// Pedido do Alex: depois do modo, os 6 mapas em cartões (como os circuitos da
// Corrida Antigravidade) — miniatura, nome, ambiente, dificuldade, descrição,
// destaques, para quantos e o melhor resultado do aparelho. Tocar seleciona;
// os modos no rodapé (Treinar, 1×1, 2×2, 3×3) entram nele. 18/11 (pedido do Alex):
// mesmo layout da Antigravidade (ui/kit/stage-select.tsx), sem a tela de modo antes. No treino o mapa escolhido é o da
// partida; no multiplayer o cartão é o VOTO: na espera a contagem aparece em
// cada cartão e tocar em outro troca o voto (a sala apura na largada; empate
// = sorteio no servidor). Nada de 3D aqui: só as miniaturas.

import { useMemo, useState } from "react"
import { Swords, Users, Vote, X } from "lucide-react"
import { useTranslations } from "@/components/i18n/I18nProvider"
import { TrainButton } from "../../ui/kit/train-button"
import { StageSelect, StageButton, type StageCardData } from "../../ui/kit/stage-select"
import { WaitingRoom } from "../../ui/kit/waiting-room"
import { paintMapArts } from "../engine/paint-map-art"
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
  joiningMode,
  joining,
  versus,
  lobby,
  votes,
  stale,
  error,
  help,
  onPlay,
  onVote,
  onCancel,
  onExit,
}: {
  /** Modo da sala em que se entrou (null = escolhendo). */
  joiningMode: Exclude<PaintMode, "solo"> | null
  /** Mapa em que se entrou (votando) — null = ainda escolhendo. */
  joining: string | null
  /** Salas disponíveis (no centro). Sem elas, só Treinar. */
  versus: boolean
  lobby: { n: number; cap: number; until?: number } | null
  votes: Record<string, number>
  stale: boolean
  error: string | null
  help: React.ReactNode
  onPlay: (mode: PaintMode, id: string) => void
  onVote: (id: string) => void
  onCancel: () => void
  onExit: () => void
}) {
  const t = useTranslations("MeuMundo")
  const list = useMemo(() => paintMapArts(), [])
  const records = useMemo(() => readPaintRecords(), [])
  const [sel, setSel] = useState(() => {
    const last = joining ?? lastPaintMap()
    return list.some((m) => m.id === last) ? last : list[0].id
  })
  // na espera (sala aberta, sem aviso de versão velha) entra o cartão de espera de todos os minijogos
  const waiting = !!joining && !stale
  const pick = (id: string) => {
    setSel(id)
    rememberMap(id)
    if (joining) onVote(id)
  }
  const diffs = [t("paintDiff1", "Fácil"), t("paintDiff2", "Média"), t("paintDiff3", "Difícil")]
  const cards: StageCardData[] = list.map((m) => {
    const rec = records[m.id]
    const n = votes[m.id] ?? 0
    return {
      id: m.id,
      thumb: m.thumb,
      bg: m.bg,
      accent: m.accent,
      name: t(m.nameKey, m.name),
      sub: t(m.descKey, m.desc),
      env: t(m.biomeKey, m.biome),
      difficulty: { level: m.difficulty, of: 3, label: diffs[m.difficulty - 1] },
      facts: [
        <>
          <Users className="h-3.5 w-3.5" /> {t(m.playersKey, m.players)}
        </>,
      ],
      highlight: t(m.highlights[0][0], m.highlights[0][1]),
      tags: m.highlights.slice(1).map(([k, f]) => t(k, f)),
      record: {
        has: !!rec,
        text: rec
          ? t("paintMapRecord", "Recorde: {d} de dano no Guardião · {w} vitória(s)").replace("{d}", String(rec.dmg)).replace("{w}", String(rec.wins))
          : t("paintMapNoRecord", "Sem recorde ainda"),
      },
      badge: joining ? (
        <span className="absolute right-2 top-2 flex items-center gap-1 px-2 py-1 text-[11px] font-black uppercase tracking-[0.1em]" style={{ background: n ? m.accent : "rgba(0,0,0,0.55)", color: n ? "#0b0e13" : "#fff" }}>
          <Vote className="h-3.5 w-3.5" /> {t("paintMapVotes", "{n} voto(s)").replace("{n}", String(n))}
        </span>
      ) : undefined,
    }
  })
  const modes: { mode: Exclude<PaintMode, "solo">; icon: React.ReactNode; title: string; sub: string }[] = [
    // 2026-11-08 (regra do Alex): só 1×1, 2×2 e 3×3; vaga vazia depois de 20 s vira computador
    { mode: "1v1", icon: <Swords className="h-5 w-5" />, title: "1 × 1", sub: t("paintMode1Sub", "Um contra um") },
    { mode: "2v2", icon: <Users className="h-5 w-5" />, title: "2 × 2", sub: t("paintMode2Sub", "Duplas") },
    { mode: "3v3", icon: <Users className="h-5 w-5" />, title: "3 × 3", sub: t("paintMode3Sub", "Times de três") },
  ]
  const modeTitle = joiningMode ? (modes.find((m) => m.mode === joiningMode)?.title ?? "") : ""
  return (
    <StageSelect
      brand={joining ? `PAINT · ${modeTitle}` : "PAINT"}
      title={joining ? t("paintMapVoteTitle", "VOTE NO MAPA") : t("paintMapTitle", "SELECIONAR MAPA")}
      cards={cards}
      selected={sel}
      onSelect={pick}
      onRun={joining ? undefined : (id) => onPlay(versus ? "1v1" : "solo", id)}
      onBack={joining ? onCancel : undefined}
      onExit={joining ? undefined : onExit}
      help={help}
      footerLine={
        joining
          ? stale
            ? t("paintStale", "O Paint foi atualizado: recarregue a página para jogar.")
            : t("paintJoining", "Procurando sala…")
          : versus
            ? t("paintModeBotsNote", "Espera até 20 segundos")
            : undefined
      }
      error={error}
      footerHidden={waiting && !!lobby}
      padBottom={waiting && lobby ? 360 : undefined}
      actionCols={joining ? 1 : versus ? 4 : 1}
      actions={
        joining ? (
          <StageButton icon={<X className="h-5 w-5" />} title={t("paintCancel", "Cancelar")} onClick={onCancel} />
        ) : (
          <>
            <TrainButton onTrain={() => onPlay("solo", sel)} className="min-w-[150px] max-[759px]:min-w-0" />
            {versus && modes.map((m, i) => <StageButton key={m.mode} primary={i === 0} icon={m.icon} title={m.title} sub={m.sub} onClick={() => onPlay(m.mode, sel)} />)}
          </>
        )
      }
      overlay={
        waiting && lobby ? (
          // a espera de todos os minijogos (ui/kit/waiting-room), presa embaixo: dá para votar no mapa enquanto espera
          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 pb-[env(safe-area-inset-bottom)]">
            <WaitingRoom
              docked
              title={t("paintLobbyTitle", "Esperando jogadores…")}
              text={t("paintLobbyHow", "Vote no mapa enquanto espera: o mais votado é o da partida.")}
              seats={Array.from({ length: Math.max(1, lobby.n) }, (_, i) => ({ name: i === 0 ? t("paintLobbyYou", "Você") : t("paintLobbyPlayer", "Jogador {k}").replace("{k}", String(i + 1)) }))}
              cap={lobby.cap}
              until={lobby.until ?? 0}
              onCancel={onCancel}
            />
          </div>
        ) : undefined
      }
    />
  )
}
