"use client"

// features/meu-mundo/gincana/ui/phase-select.tsx — GINCANA: ESCOLHER A FASE.
//
// 18/11 (pedido do Alex): mesmo layout da Antigravidade (ui/kit/stage-select.tsx). Os cartões
// das fases (miniatura, número, nome, Domínio, dificuldade em 5 barras, a prova e o recorde do
// aparelho), embaixo Treinar e Multiplayer; as dicas de cada trecho e o logo foram para o "?".
// Pronta para a Gincana 3: `onShow` (programa completo) e `event` (o nome da prova) aparecem
// quando o tema/a tela os têm.

import { useEffect, useMemo, useState } from "react"
import { Crown, Users } from "lucide-react"
import { TrainButton } from "../../ui/kit/train-button"
import { StageSelect, StageButton, type StageCardData } from "../../ui/kit/stage-select"
import { useTranslations } from "@/components/i18n/I18nProvider"
import { MM } from "../../ui/hud/tokens"
import { GINCANA_THEMES, themeOf, type GincanaTheme } from "../engine/phase-themes"
import { gincanaThumb } from "../engine/phase-thumbs"

const YELLOW = "#FFD21F"
const TIP_COLORS = ["#FF6A13", "#8A4DFF", "#FF5FA8", "#63E05A", "#19C6D1"]

/** O nome da prova (Gincana 3); ausente nos temas antigos. */
const eventOf = (th: GincanaTheme) => (th as GincanaTheme & { event?: readonly [string, string] }).event

export function GincanaPhaseSelect({
  phase,
  onPhase,
  onPlay,
  onShow,
  onExit,
  multi,
  error,
  record,
  fmt,
}: {
  phase: string
  onPhase: (p: string) => void
  onPlay: (multi: boolean) => void
  /** Programa completo (rodadas sorteadas até a final). */
  onShow?: () => void
  onExit: () => void
  multi: boolean
  error: string | null
  /** Recorde do aparelho na fase (segundos) ou null. */
  record: (phase: string) => number | null
  fmt: (t: number) => string
}) {
  const t = useTranslations("MeuMundo")
  // recordes lidos do aparelho só no cliente (localStorage)
  const [recs, setRecs] = useState<Record<string, number | null>>({})
  useEffect(() => setRecs(Object.fromEntries(GINCANA_THEMES.map((th) => [th.id, record(th.id)]))), [record])
  const diffLabel = (d: number) => [t("jetDiff1", "Muito fácil"), t("jetDiff2", "Fácil"), t("jetDiff3", "Média"), t("jetDiff4", "Difícil"), t("jetDiff5", "Extrema")][d - 1]
  const cards: StageCardData[] = useMemo(
    () =>
      GINCANA_THEMES.map((th) => {
        const r = recs[th.id] ?? null
        const ev = eventOf(th)
        return {
          id: th.id,
          thumb: gincanaThumb(th.id),
          bg: [th.bg[0], th.bg[1]],
          accent: th.accent,
          num: th.num,
          name: t(th.nameKey, th.name),
          sub: ev ? t(ev[0], ev[1]) : undefined,
          env: t(th.domainKey, th.domain),
          difficulty: { level: th.difficulty, of: 5, label: diffLabel(th.difficulty) },
          highlight: t(th.pitchKey, th.pitch),
          tags: th.sections.slice(1, -1).map(([k, v]) => t(k, v)),
          record: { has: r !== null, text: r !== null ? t("gincanaRecord", "Seu recorde: {t}").replace("{t}", fmt(r)) : t("gincanaNoRecord", "Ainda sem recorde neste aparelho.") },
        }
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [recs, t, fmt],
  )
  const theme = themeOf(phase)
  const tips = theme.tips.map(([k, v], i) => ({ c: TIP_COLORS[i % TIP_COLORS.length], title: t(theme.sections[i + 1][0], theme.sections[i + 1][1]), text: t(k, v) }))
  const help = (
    <div style={{ color: MM.text }}>
      <p className="text-[14px] leading-snug" style={{ color: MM.muted }}>
        {t("gincanaPitch2", "Oito na largada e só seis classificam: quando a vaga enche, a prova fecha. Caiu? Volta ao último posto e segue.")}
      </p>
      <div className="mt-3 text-[15px] font-black italic" style={{ color: theme.accent }}>
        {theme.num} · {t(theme.nameKey, theme.name)}
      </div>
      <ul className="mt-2 grid grid-cols-1 gap-1.5">
        {tips.map((x, i) => (
          <li key={i} className="rounded-none p-2.5 text-[12.5px] leading-snug" style={{ background: MM.card, color: MM.muted, border: `1px solid ${MM.border}` }}>
            <b className="mr-1.5" style={{ color: x.c }}>
              {i + 1}. {x.title}
            </b>
            {x.text}
          </li>
        ))}
      </ul>
      <p className="mt-3 rounded-none px-2.5 py-2 text-[12.5px] leading-snug" style={{ background: "rgba(242,183,5,0.1)", color: MM.muted, border: `1px solid ${MM.goldBorder}` }}>
        <b style={{ color: YELLOW }}>{t("gincanaHowLogoTitle", "Logo da Freelandoo")}</b> · {t("gincanaHowLogo", "Pegou: brilha e corre 50% mais rápido por alguns segundos.")}
      </p>
      <p className="mt-3 text-[12px] leading-snug max-[759px]:hidden" style={{ color: MM.muted }}>
        {t("gincanaKeys2", "WASD ou setas andam · Espaço pula · Shift ou E mergulha · segure F ou Ctrl para agarrar · arraste para girar a câmera")}
      </p>
      <p className="mt-3 hidden text-[12px] leading-snug max-[759px]:block" style={{ color: MM.muted }}>
        {t("gincanaTouchHelp2", "Joystick anda · PULAR, MERGULHAR e AGARRAR (segure) na direita · arraste a tela para girar a câmera")}
      </p>
    </div>
  )
  const cols = 1 + (multi ? 1 : 0) + (onShow ? 1 : 0)
  return (
    <StageSelect
      brand={
        <>
          <span style={{ color: YELLOW }}>GIN</span>
          <span style={{ color: "#FF5FA8" }}>CA</span>
          <span style={{ color: "#19C6D1" }}>NA</span>
        </>
      }
      title={t("gincanaSelectTitle", "Selecionar fase")}
      cards={cards}
      selected={phase}
      onSelect={onPhase}
      onRun={() => onPlay(multi)}
      onExit={onExit}
      help={help}
      footerLine={t("gincanaKeysShort", "WASD ou setas andam · Espaço pula · Shift mergulha · F agarra")}
      error={error}
      actionCols={cols}
      actions={
        <>
          <TrainButton onTrain={() => onPlay(false)} sub={t("mmTrainSubBots", "Contra o computador · sem esperar")} className="min-w-[150px] max-[759px]:min-w-0" />
          {onShow && <StageButton icon={<Crown className="h-5 w-5" />} title={t("gincanaShow", "Programa completo")} sub={t("gincanaShowSub", "4 rodadas sorteadas até a final da coroa · contra o computador")} onClick={onShow} />}
          {multi && <StageButton primary icon={<Users className="h-5 w-5" />} title={t("gincanaModeMulti", "Multiplayer")} sub={t("gincanaModeMultiSub", "Espera até 1 minuto · até 8")} onClick={() => onPlay(true)} />}
        </>
      }
    />
  )
}
