"use client"

// features/meu-mundo/ui/quest/quest-ui.tsx — lore v2 F3: os CAPÍTULOS na tela.
//
// Um capítulo acompanhado por vez: um card pequeno no canto diz O QUE fazer e
// ONDE; tocar abre os passos em carrossel, com a introdução do capítulo na
// variante da classe (Raposa/Vampiro). O botão do passo só pede ao servidor —
// quem decide se o objetivo foi cumprido é o servidor (MeuMundoQuestService). O
// capítulo seguinte abre pelo nível do TREINADOR (a conta): enquanto não chega,
// o card diz o nível que falta. Textos: chapters-text.json (pt de fallback; as
// traduções saem de lá pelo scripts/i18n-meu-mundo-capitulos-merge.js).

import { useDrawerOpen } from "../hud/hud-kit"
import { useGameCovered } from "../hud/game-cover"
import { useCallback, useEffect, useState } from "react"
import { Loader2, Lock, ScrollText } from "lucide-react"
import { getToken } from "@/lib/auth"
import { useTranslations } from "@/components/i18n/I18nProvider"
import { OPEN_ARCHIVE, advanceQuest, getArchive, getQuest, type LoreVideo as LoreVideoData, type QuestState, type QuestView } from "../../data"
import { LoreVideo } from "../archive/lore-video"
import { arqTx } from "../archive/archive-page"
import { AetherModal, AetherButton } from "../kit/aether-modal"
import { Arc, Card } from "../fridge/shelf"
import { ItemImage, type ItemCategory } from "../kit/item-image"
import { AE, chamfer } from "../kit/aether-tokens"
import { archivo, teko } from "../status/evo-skin"
import { celebrate } from "../rewards/reward-bus"
import TEXT from "./chapters-text.json"

type T = (k: string, f: string) => string

// cada chave é [pt, en, es] (o merge recusa outro formato)
const PT: Record<string, string[]> = TEXT
/** Texto com o pt do JSON de fallback (a chave é a mesma do merge). */
const tx = (t: T, key: string) => t(key, PT[key]?.[0] ?? key)
const stepTxt = (t: T, chapter: string, step: string, part: "what" | "where") => tx(t, `qs_${chapter}_${step}_${part}`)

/** Desenho de cada passo pelo tipo do objetivo (sem arte própria do passo). */
function artOf(check: string | undefined): ItemCategory {
  const type = String(check || "").split(":")[0]
  if (type === "ate" || type === "buy") return "food"
  if (type === "practice" || type === "stat") return "energy"
  if (type === "weapon" || type === "tutorialFight" || type === "fightWin" || type === "nightKill" || type === "hallChallenge") return "weapon"
  if (type === "armory") return "armor"
  if (type === "material" || type === "forge") return "material"
  if (type === "minigame" || type === "game" || type === "games") return "vehicle"
  if (type === "sleep" || type === "visit") return "house"
  return "quest"
}

/** O card pequeno do canto + o modal dos passos. */
export function QuestTracker({
  hidden,
  refreshKey,
  onTutorialFight,
  onOpenGear,
}: {
  hidden?: boolean
  /** Muda quando algo pode ter cumprido o passo (fechou painel, chegou recibo). */
  refreshKey: number
  onTutorialFight: () => void
  onOpenGear: (tab: "bag" | "armory") => void
}) {
  const drawerOpen = useDrawerOpen()
  const covered = useGameCovered()
  const t = useTranslations("MeuMundo") as T
  const [state, setState] = useState<QuestState | null>(null)
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  // F5: o vídeo do capítulo (undefined = fechado; null = ainda não enviado)
  const [video, setVideo] = useState<LoreVideoData | null | undefined>(undefined)

  const load = useCallback(async () => {
    const tk = getToken()
    if (!tk) return
    const r = await getQuest(tk)
    if (r.ok) setState(r.data)
  }, [])
  useEffect(() => {
    void load()
  }, [load, refreshKey])

  const deliver = useCallback(async () => {
    const tk = getToken()
    if (!tk || busy) return
    setBusy(true)
    setMsg(null)
    const r = await advanceQuest(tk, "ack")
    setBusy(false)
    if (!r.ok) return setMsg(r.code === "pending" ? t("questPending", "Ainda falta cumprir o objetivo.") : r.error)
    setState(r.data)
    if (r.data.receipt) celebrate(r.data.receipt)
  }, [busy, t])

  const visitArmory = useCallback(async () => {
    const tk = getToken()
    if (tk) {
      const r = await advanceQuest(tk, "visit_armory")
      if (r.ok) setState(r.data)
    }
    setOpen(false)
    onOpenGear("armory")
  }, [onOpenGear])

  const quest = state?.quest ?? null
  const cur = quest?.current ?? null
  // passo em foco no carrossel (abre no passo de agora)
  const [sel, setSel] = useState(0)
  const [openedAt, setOpenedAt] = useState(false)
  if (open !== openedAt) {
    setOpenedAt(open)
    if (open && quest) setSel(Math.min(quest.step, quest.total - 1))
  }

  /** Botões do passo de agora (o servidor confere; aqui só pede). */
  const actions = () => {
    if (!cur) return null
    const type = cur.check.split(":")[0]
    return (
      <div className="grid gap-1.5">
        {type === "tutorialFight" && (
          <AetherButton
            tone={cur.ready ? "secondary" : "primary"}
            onClick={() => {
              setOpen(false)
              onTutorialFight()
            }}
          >
            {t("questFight", "Lutar no treino")}
          </AetherButton>
        )}
        {type === "armory" && !cur.ready && <AetherButton onClick={() => void visitArmory()}>{t("questOpenArmory", "Abrir o Armeiro")}</AetherButton>}
        {type === "archive" && !cur.ready && (
          <AetherButton
            onClick={() => {
              setOpen(false)
              window.dispatchEvent(new CustomEvent(OPEN_ARCHIVE))
            }}
          >
            {arqTx(t, "arqOpen")}
          </AetherButton>
        )}
        {(type === "weapon" || type === "material") && !cur.ready && (
          <AetherButton
            onClick={() => {
              setOpen(false)
              onOpenGear("bag")
            }}
          >
            {t("questOpenBag", "Abrir a mochila")}
          </AetherButton>
        )}
        {cur.waiting ? (
          <p className={`${archivo.className} text-center text-[11.5px] font-semibold`} style={{ color: AE.muted }}>
            {tx(t, "questWaiting")}
          </p>
        ) : (
          <AetherButton tone={cur.ready ? "primary" : "secondary"} busy={busy} onClick={() => void deliver()}>
            {type === "ack" || type === "minigame" ? t("questUnderstood", "Entendi") : t("questDeliver", "Entregar")}
          </AetherButton>
        )}
      </div>
    )
  }

  if (!quest || quest.done) return null
  const chapterLabel = `${tx(t, "questChapterN").replace("{n}", String(quest.chapter))} · ${tx(t, `qc_${quest.id}_title`)}`
  const lockedLine = quest.locked ? tx(t, "questLockedLevel").replace("{n}", String(quest.locked.level)) : null
  const progress = cur && cur.need > 1 ? ` · ${tx(t, "questProgress").replace("{have}", String(cur.have)).replace("{need}", String(cur.need))}` : ""
  return (
    <>
      {!hidden && !drawerOpen && !covered && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={`${archivo.className} pointer-events-auto fixed z-[64] flex max-w-[min(300px,62vw)] items-start gap-2 p-2.5 text-left outline-none focus-visible:ring-2`}
          style={{
            // logo abaixo do HUD do personagem (--mm-hud-h vem dele)
            top: "calc(max(10px, env(safe-area-inset-top)) + var(--mm-hud-h, 46px) + 10px)",
            left: "max(10px, env(safe-area-inset-left))",
            // pedido do Alex (2026-11-02): o card do canto um pouco transparente (o mundo aparece atrás)
            background: "rgba(20, 23, 28, 0.66)",
            boxShadow: `inset 0 0 0 1px ${cur?.ready ? AE.gold : AE.brassLine}, ${AE.hardSm}`,
            clipPath: chamfer(AE.cut.chip),
          }}
          aria-label={t("questOpen", "Abrir a missão")}
        >
          {quest.locked ? (
            <Lock className="mt-0.5 h-5 w-5 shrink-0" style={{ color: AE.goldSoft }} aria-hidden />
          ) : (
            <ScrollText className="mt-0.5 h-5 w-5 shrink-0" style={{ color: AE.gold }} aria-hidden />
          )}
          <span className="min-w-0">
            <span className="block text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: AE.goldSoft }}>
              {chapterLabel}
              {cur ? ` · ${quest.step + 1}/${quest.total}` : ""}
            </span>
            <span className="block text-[13px] font-bold leading-tight" style={{ color: AE.text }}>
              {cur ? stepTxt(t, quest.id, cur.key, "what") : lockedLine}
            </span>
            <span className="block truncate text-[11px]" style={{ color: cur?.ready ? AE.good : AE.muted }}>
              {cur
                ? cur.ready
                  ? t("questReady", "Pronto para entregar")
                  : `${stepTxt(t, quest.id, cur.key, "where")}${progress}`
                : tx(t, "questTrainerNow").replace("{n}", String(state?.trainer ?? 1))}
            </span>
          </span>
        </button>
      )}
      {open && (
        <AetherModal eyebrow={tx(t, "questChapterN").replace("{n}", String(quest.chapter))} title={tx(t, `qc_${quest.id}_title`)} onClose={() => { setOpen(false); setVideo(undefined) }} width={560}>
          {!state ? (
            <Loader2 className="mx-auto h-6 w-6 animate-spin" />
          ) : (
            <>
              <p className={`${archivo.className} mb-2 text-[12px] leading-snug`} style={{ color: AE.muted }}>
                {tx(t, `qc_${quest.id}_intro_${state.clan === "vampiro" ? "vampiro" : "raposa"}`)}
              </p>
              {/* F5: o vídeo do capítulo (o Alex sobe pelo admin; sem ele, imagem + texto) */}
              {video === undefined ? (
                <button
                  type="button"
                  className={`${archivo.className} mb-2 min-h-11 text-[12px] font-bold uppercase tracking-wide underline-offset-4 hover:underline`}
                  style={{ color: AE.goldSoft }}
                  onClick={() => {
                    const tk = getToken()
                    if (!tk) return
                    setVideo(null)
                    void getArchive(tk).then((r) => r.ok && setVideo(r.data.videos.chapter[quest.id] ?? null))
                  }}
                >
                  ▶ {arqTx(t, "arqChapterVideo")}
                </button>
              ) : (
                <div className="mb-2">
                  <LoreVideo data={video} title={tx(t, `qc_${quest.id}_title`)} t={t} soon={arqTx(t, "arqVideoSoon")} />
                </div>
              )}
              {lockedLine && (
                <p className={`${archivo.className} mb-2 text-[12px] font-semibold`} style={{ color: AE.goldSoft }}>
                  {lockedLine} · {tx(t, "questTrainerNow").replace("{n}", String(state.trainer))}
                </p>
              )}
              <QuestShelf quest={quest} sel={Math.min(sel, quest.steps.length - 1)} onSel={setSel} t={t} actions={actions} />
            </>
          )}
          {msg && (
            <p role="status" className="mt-2 text-center text-[12px] font-semibold" style={{ color: AE.goldSoft }}>
              {msg}
            </p>
          )}
        </AetherModal>
      )}
    </>
  )
}

// ═══ os passos em cards (mm3d-60g, pedido do Alex: "como os de comida no STATUS") ═══
// Thumbnail GRANDE (66% do card) com slot de imagem: a arte de cada passo é
// /meu-mundo/missoes/<capítulo>_<passo>.webp. Sem o arquivo, aparece o desenho
// do tipo do objetivo — a composição não muda.
const CARD_W = 150
const CARD_H = 228
const IMG_K = 0.66
const thumbOf = (chapter: string, key: string) => `/meu-mundo/missoes/${chapter}_${key}.webp`

function QuestShelf({ quest, sel, onSel, t, actions }: { quest: QuestView; sel: number; onSel: (i: number) => void; t: T; actions: () => React.ReactNode }) {
  const s = quest.steps[sel]
  const stateText = (st: string) => (st === "done" ? t("questDone", "Feito") : st === "current" ? t("questNow", "Agora") : t("questLocked", "Depois"))
  const stateColor = (st: string) => (st === "done" ? AE.good : st === "current" ? AE.gold : AE.dim)
  const checkOf = (i: number) => (quest.current && quest.current.index === i ? quest.current.check : undefined)
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between">
        <span className={`${teko.className} text-[16px] font-semibold uppercase leading-none tracking-wide`} style={{ color: AE.goldSoft }}>
          {t("questSteps", "Passos")}
        </span>
        <span className={`${archivo.className} text-[11px]`} style={{ color: AE.muted }}>
          {t("questStepN", "Passo {i} de {n}").replace("{i}", String(sel + 1)).replace("{n}", String(quest.total))}
        </span>
      </div>
      <Arc
        count={quest.steps.length}
        sel={sel}
        onSel={onSel}
        onPick={onSel}
        cardW={CARD_W}
        cardH={CARD_H}
        spacing={126}
        compact
        t={t}
        render={(i, active) => {
          const st = quest.steps[i]
          const locked = st.state === "locked"
          return (
            <Card
              active={active}
              empty={locked}
              art={
                <ItemImage
                  src={locked ? null : thumbOf(quest.id, st.key)}
                  category={artOf(checkOf(i))}
                  rarity={st.state === "done" ? "uncommon" : st.state === "current" ? "legendary" : "common"}
                  alt={locked ? t("questHidden", "???") : stepTxt(t, quest.id, st.key, "what")}
                  ratio={CARD_W / Math.round(CARD_H * IMG_K)}
                />
              }
              imgK={IMG_K}
              badge={st.state === "done" ? "✓" : `+${st.xp} XP`}
              w={CARD_W}
              h={CARD_H}
              compact
            >
              <div className={`${archivo.className} text-[9px] font-bold uppercase tracking-[0.14em]`} style={{ color: stateColor(st.state) }}>
                {i + 1}/{quest.total} · {stateText(st.state)}
              </div>
              <div className={`${teko.className} line-clamp-2 text-[15px] font-semibold uppercase leading-[0.95]`} style={{ color: AE.text }}>
                {locked ? t("questHidden", "???") : stepTxt(t, quest.id, st.key, "what")}
              </div>
            </Card>
          )
        }}
      />
      {/* o escolhido: onde, XP e os botões (só no passo de agora) */}
      {s && (
        <div className="flex flex-col gap-1">
          <div className="flex items-baseline justify-between gap-2">
            <span className={`${archivo.className} min-w-0 text-[13px] font-bold leading-tight`} style={{ color: AE.text }}>
              {s.state === "locked" ? t("questHidden", "???") : stepTxt(t, quest.id, s.key, "what")}
            </span>
            <span className={`${archivo.className} shrink-0 text-[11px] font-semibold`} style={{ color: AE.goldSoft }}>
              ✦ {s.xp} XP
            </span>
          </div>
          {s.state !== "locked" && (
            <p className={`${archivo.className} text-[11px] font-semibold`} style={{ color: AE.aether }}>
              ⌖ {stepTxt(t, quest.id, s.key, "where")}
              {s.state === "current" && quest.current && quest.current.need > 1
                ? ` · ${tx(t, "questProgress").replace("{have}", String(quest.current.have)).replace("{need}", String(quest.current.need))}`
                : ""}
            </p>
          )}
          {s.state === "current" && <div className="mt-1">{actions()}</div>}
        </div>
      )}
    </div>
  )
}
