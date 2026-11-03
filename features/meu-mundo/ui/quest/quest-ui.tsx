"use client"

// features/meu-mundo/ui/quest/quest-ui.tsx — mm3d-59: o PRÓLOGO na tela.
//
// Uma missão principal acompanhada por vez: um card pequeno no canto diz O QUE
// fazer, ONDE e POR QUÊ; tocar abre os passos em carrossel. O botão do passo
// só pede ao servidor — quem decide se o objetivo foi cumprido é o servidor
// (MeuMundoQuestService). A recompensa chega como recibo e vai para a fila de
// celebração (a primeira subida de nível acontece aqui dentro).

import { useDrawerOpen } from "../hud/hud-kit"
import { useGameCovered } from "../hud/game-cover"
import { useCallback, useEffect, useState } from "react"
import { Loader2, ScrollText } from "lucide-react"
import { getToken } from "@/lib/auth"
import { useTranslations } from "@/components/i18n/I18nProvider"
import { advanceQuest, getQuest, type QuestView } from "../../data"
import { AetherModal, AetherButton } from "../kit/aether-modal"
import { Arc, Card } from "../fridge/shelf"
import { ItemImage, type ItemCategory } from "../kit/item-image"
import { AE, chamfer } from "../kit/aether-tokens"
import { archivo, teko } from "../status/evo-skin"
import { celebrate } from "../rewards/reward-bus"

type T = (k: string, f: string) => string

/** Textos de cada passo (fallback pt; as traduções no merge da reforma). */
const STEP_TEXT: Record<string, { what: string; where: string; why: string; art: ItemCategory }> = {
  chegada: {
    what: "Conheça seu bairro e sua casa",
    where: "No seu bairro",
    why: "Aurion te chamou para Lúmen: as máquinas da cidade andam estranhas e alguém precisa ver de perto.",
    art: "house",
  },
  recuperar: {
    what: "Coma alguma coisa",
    where: "Geladeira de casa ou um restaurante do centro",
    why: "Energia, fome e estresse decidem o quanto você rende. Cuidar do corpo vem antes da luta.",
    art: "food",
  },
  treinar: {
    what: "Comece um treino ou um estudo",
    where: "Academia, universidade, escola ou biblioteca do centro",
    why: "Força e inteligência crescem praticando — com um teto por dia, então volte amanhã.",
    art: "energy",
  },
  arma: {
    what: "Receba a arma da sua classe",
    where: "Mochila",
    why: "Aurion entrega a espada aos vampiros e o cajado às raposas. A skin muda a aparência; a classe decide como você luta.",
    art: "weapon",
  },
  aprender: {
    what: "Faça a luta de treino",
    where: "Treino da Arena (sem custo)",
    why: "Ataque no tempo, leia o aviso vermelho no chão e esquive. Aqui errar não custa nada.",
    art: "weapon",
  },
  vitoria: {
    what: "Vença uma luta",
    where: "Treino da Arena, Lâminas ou um monstro da noite",
    why: "As criaturas que aparecem à noite vieram das máquinas que Morkhan tocou. Mostre que Lúmen resiste.",
    art: "quest",
  },
  espolio: {
    what: "Veja o que você ganhou",
    where: "Mochila",
    why: "Toda luta deixa material. É com ele que a Forja melhora seu equipamento.",
    art: "material",
  },
  armeiro: {
    what: "Visite o Armeiro e equipe sua arma",
    where: "Equipamento → Armeiro",
    why: "O Armeiro vende equipamento; a Forja transforma material em peças melhores.",
    art: "armor",
  },
  jogos: {
    what: "Conheça os minijogos do centro",
    where: "Paint, Gincana, Corrida, Rolê Noturno, Jetpack, Lâminas e Boxe",
    why: "Cada jogo treina um atributo (destreza, força, velocidade, inteligência) e deixa um tipo de material.",
    art: "vehicle",
  },
  pista: {
    what: "Leve o cristal à estátua de Morkhan",
    where: "Praça do centro",
    why: "O cristal rachado pulsa perto das máquinas. Morkhan, o Sem-Nome, está acordando — e Aurion quer você na próxima missão.",
    art: "quest",
  },
}

const txt = (key: string, part: "what" | "where" | "why", t: T) => t(`quest_${key}_${part}`, STEP_TEXT[key]?.[part] || key)

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
  // mm3d-60d: com a gaveta aberta o card sai (ela cobre o canto no celular)
  const drawerOpen = useDrawerOpen()
  const covered = useGameCovered()
  const t = useTranslations("MeuMundo") as T
  const [quest, setQuest] = useState<QuestView | null>(null)
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  const load = useCallback(async () => {
    const tk = getToken()
    if (!tk) return
    const r = await getQuest(tk)
    if (r.ok) setQuest(r.data.quest)
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
    setQuest(r.data.quest)
    if (r.data.receipt) celebrate(r.data.receipt)
  }, [busy, t])

  const visitArmory = useCallback(async () => {
    const tk = getToken()
    if (tk) {
      const r = await advanceQuest(tk, "visit_armory")
      if (r.ok) setQuest(r.data.quest)
    }
    setOpen(false)
    onOpenGear("armory")
  }, [onOpenGear])

  const cur = quest?.current
  // passo em foco no carrossel (abre no passo de agora)
  const [sel, setSel] = useState(0)
  const [openedAt, setOpenedAt] = useState(false)
  if (open !== openedAt) {
    setOpenedAt(open)
    if (open && quest) setSel(Math.min(quest.step, quest.total - 1))
  }

  /** Botões do passo de agora (o servidor confere; aqui só pede). */
  const actions = () =>
    cur && (
      <div className="grid gap-1.5">
        {(cur.key === "aprender" || cur.key === "vitoria") && (
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
        {cur.key === "armeiro" && !cur.ready && <AetherButton onClick={() => void visitArmory()}>{t("questOpenArmory", "Abrir o Armeiro")}</AetherButton>}
        {(cur.key === "arma" || cur.key === "espolio") && !cur.ready && (
          <AetherButton
            onClick={() => {
              setOpen(false)
              onOpenGear("bag")
            }}
          >
            {t("questOpenBag", "Abrir a mochila")}
          </AetherButton>
        )}
        <AetherButton tone={cur.ready ? "primary" : "secondary"} busy={busy} onClick={() => void deliver()}>
          {cur.check === "ack" || cur.check === "minigame" ? t("questUnderstood", "Entendi") : t("questDeliver", "Entregar")}
        </AetherButton>
      </div>
    )

  if (!quest || quest.done || !cur) return null
  return (
    <>
      {!hidden && !drawerOpen && !covered && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={`${archivo.className} pointer-events-auto fixed z-[64] flex max-w-[min(300px,62vw)] items-start gap-2 p-2.5 text-left outline-none focus-visible:ring-2`}
          style={{
            // mm3d-60d: logo abaixo do HUD do personagem (--mm-hud-h vem dele)
            top: "calc(max(10px, env(safe-area-inset-top)) + var(--mm-hud-h, 46px) + 10px)",
            left: "max(10px, env(safe-area-inset-left))",
            // pedido do Alex (2026-11-02): o card do canto um pouco transparente (o mundo aparece atrás)
            background: "rgba(20, 23, 28, 0.66)",
            boxShadow: `inset 0 0 0 1px ${cur.ready ? AE.gold : AE.brassLine}, ${AE.hardSm}`,
            clipPath: chamfer(AE.cut.chip),
          }}
          aria-label={t("questOpen", "Abrir a missão")}
        >
          <ScrollText className="mt-0.5 h-5 w-5 shrink-0" style={{ color: AE.gold }} aria-hidden />
          <span className="min-w-0">
            <span className="block text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: AE.goldSoft }}>
              {t("questPrologue", "O Despertar de Lúmen")} · {quest.step + 1}/{quest.total}
            </span>
            <span className="block text-[13px] font-bold leading-tight" style={{ color: AE.text }}>
              {txt(cur.key, "what", t)}
            </span>
            <span className="block truncate text-[11px]" style={{ color: cur.ready ? AE.good : AE.muted }}>
              {cur.ready ? t("questReady", "Pronto para entregar") : txt(cur.key, "where", t)}
            </span>
          </span>
        </button>
      )}
      {open && (
        <AetherModal eyebrow={t("questMain", "Missão principal")} title={t("questPrologue", "O Despertar de Lúmen")} onClose={() => setOpen(false)} width={560}>
          {!quest ? (
            <Loader2 className="mx-auto h-6 w-6 animate-spin" />
          ) : (
            <QuestShelf quest={quest} sel={Math.min(sel, quest.steps.length - 1)} onSel={setSel} t={t} actions={actions} />
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
// /meu-mundo/missoes/<chave>.webp (ex.: chegada.webp, recuperar.webp…). Sem o
// arquivo, aparece o desenho da categoria — a composição não muda.
const CARD_W = 150
const CARD_H = 228
const IMG_K = 0.66
const thumbOf = (key: string) => `/meu-mundo/missoes/${key}.webp`

function QuestShelf({ quest, sel, onSel, t, actions }: { quest: QuestView; sel: number; onSel: (i: number) => void; t: T; actions: () => React.ReactNode }) {
  const s = quest.steps[sel]
  const stateText = (st: string) => (st === "done" ? t("questDone", "Feito") : st === "current" ? t("questNow", "Agora") : t("questLocked", "Depois"))
  const stateColor = (st: string) => (st === "done" ? AE.good : st === "current" ? AE.gold : AE.dim)
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
          const art = STEP_TEXT[st.key]?.art || "quest"
          return (
            <Card
              active={active}
              empty={locked}
              art={
                <ItemImage
                  src={locked ? null : thumbOf(st.key)}
                  category={art}
                  rarity={st.state === "done" ? "uncommon" : st.state === "current" ? "legendary" : "common"}
                  alt={locked ? t("questHidden", "???") : txt(st.key, "what", t)}
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
                {locked ? t("questHidden", "???") : txt(st.key, "what", t)}
              </div>
            </Card>
          )
        }}
      />
      {/* o escolhido: onde, por quê, XP e os botões (só no passo de agora) */}
      {s && (
        <div className="flex flex-col gap-1">
          <div className="flex items-baseline justify-between gap-2">
            <span className={`${archivo.className} min-w-0 text-[13px] font-bold leading-tight`} style={{ color: AE.text }}>
              {s.state === "locked" ? t("questHidden", "???") : txt(s.key, "what", t)}
            </span>
            <span className={`${archivo.className} shrink-0 text-[11px] font-semibold`} style={{ color: AE.goldSoft }}>
              ✦ {s.xp} XP
            </span>
          </div>
          {s.state !== "locked" && (
            <>
              <p className={`${archivo.className} text-[11px] font-semibold`} style={{ color: AE.aether }}>
                ⌖ {txt(s.key, "where", t)}
              </p>
              <p className={`${archivo.className} text-[11.5px] leading-snug`} style={{ color: AE.muted }}>
                {txt(s.key, "why", t)}
              </p>
            </>
          )}
          {s.state === "current" && <div className="mt-1">{actions()}</div>}
        </div>
      )}
    </div>
  )
}
