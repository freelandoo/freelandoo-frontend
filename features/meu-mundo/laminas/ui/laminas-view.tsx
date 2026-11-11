"use client"

// features/meu-mundo/laminas/ui/laminas-view.tsx — ARENA DAS LÂMINAS (mm3d-48a): a tela.
//
// Luta de espada contra a máquina (pedido do Alex, 29/10). Duas portas:
//  - o PRÉDIO no centro abre o MENU de treino: escolher o inimigo (Soldado de
//    Pedra em 3 níveis, Lobos, Golem, Harpia, Brutamontes; 29/10: Golem de Pedra
//    em 2 níveis, Lobo, Ciborgue, Dama das Garras, Brutamontes);
//  - o PORTAL de um monstro na cidade abre DIRETO a luta contra ele (com a
//    passagem violeta) e, no fim, avisa quem chamou (vitória remove o
//    monstro da cidade para todos).
// Na luta: vida e fôlego embaixo à esquerda, a vida dos inimigos em cima, o
// aviso "ESQUIVE!" quando um golpe vem; no celular joystick + ATACAR e
// ESQUIVAR à direita.
//
// mm3d-56: o prédio do BOXE abre esta mesma tela com stage="ring" — a mesma
// luta, o mesmo menu, só o lugar é o ringue grande (ring-view.ts).
// mm3d-57: no ringue não tem espada (luvas) e os adversários são gente — os
// mesmos tipos da regra com nomes de boxeador; a harpia (voa) fica de fora.

import { useCallback, useEffect, useRef, useState } from "react"
import { Crown, Flag, Swords, Volume2, VolumeX, X } from "lucide-react"
import { BackToCity } from "../../ui/kit/back-to-city"
import { useTranslations } from "@/components/i18n/I18nProvider"
import { MM } from "../../ui/hud/tokens"
import { archivo } from "../../ui/status/evo-skin"
import { Joystick, SAFE } from "../../ui/meu-mundo-view"
import { FightPlate, plateHeight, plateWidth, usePlateSize } from "../../ui/hud/fight-plate"
import { PORTRAIT, WOLF_PORTRAIT } from "../../ui/portraits"
import type { BodyId } from "../../types"
import { finishFight, getLife, startFight, type FightOrigin, type FightTicket, type Receipt } from "../../data"
import { getToken } from "@/lib/auth"
import { ReceiptLines } from "../../ui/rewards/receipt-lines"
import { VictoryButton, VictoryPanel } from "../../ui/rewards/victory-panel"
import { celebrate, hold } from "../../ui/rewards/reward-bus"
import { createLaminasGame, type FightSheet, type LaminasGameHandle, type LaminasHud } from "../engine/laminas-game"
import { VersusScreen } from "./versus-screen"
import { MOB_KINDS, peerOf, type MobKind, type SkillId } from "../sim/fight"
import { SkillHud, skillZoneTop, useSkillScale } from "./skill-hud"
import { HallOfFame } from "./hall-of-fame"
import { abilityKit } from "../abilities/registry"
import { probeClose, probeNote, probeOpen } from "../../crash-probe"
import { emitMinigame } from "../../banter"
import { MinigameBanter } from "../../ui/inbox/minigame-banter"
import { GodVoice } from "../../ui/quest/god-voice"

/** Luta vinda de um monstro da cidade (id na sala do centro). */
export interface LaminasEncounter {
  mobId: number
  kind: MobKind
}

export interface LaminasViewProps {
  body: BodyId
  look?: string
  onExit: () => void
  encounter?: LaminasEncounter | null
  /** Fim da luta do portal (vitória = o monstro some da cidade). */
  onEncounterEnd?: (win: boolean) => void
  /** O lugar: coliseu (padrão) ou o ringue do prédio do Boxe (mm3d-56). */
  stage?: "arena" | "ring" | "bairro" | "centro"
  /** mm3d-59: a luta de treino do prólogo (sem custo; só abre nos passos de luta). */
  tutorial?: boolean
  /** O fim da luta conferida (recibo do servidor). */
  onReceipt?: (r: Receipt) => void
  /** B8: luta já aberta pelo servidor (o desafio do Hall) e o nome de quem defende. */
  opened?: { ticket: FightTicket; foe: string; foeBody?: BodyId | null } | null
}

const SAND = "#E9CF98"
const BRONZE = "#C98A45"
const VIOLET = "#B84DFF"
const BG = "radial-gradient(120% 90% at 50% 0%, #f7b267 0%, #b5502b 50%, #3a1a12 100%)"

type Choice = { kind: MobKind; level: number }

/** Retrato do inimigo na placa: o corpo que a cena desenha (monster-view.ts RIGGED/HUMAN). */
const MOB_BODY: Partial<Record<MobKind, BodyId>> = { cavaleiro: "cavaleiro", stone: "golem", ciborgue: "ciborgue", garras: "garras", brute: "brutamontes" }
/** Cor da energia do card do inimigo na tela de versus. */
const FOE_ACCENT: Record<MobKind, string> = { cavaleiro: "#FFB030", stone: "#86FF22", wolf: "#FF7A2F", ciborgue: "#FF315A", garras: "#C05CFF", brute: "#B84DFF" }
const RING_BODY: Record<MobKind, BodyId> = { cavaleiro: "normal", stone: "strong", wolf: "slim", ciborgue: "fat", garras: "female", brute: "strong" }

/** F1 (lore v2): o Soldado de Pedra é o Cavaleiro Dourado; o Golem de Pedra tem tipo próprio (`stone`). */
export function useMobName(ring = false) {
  const t = useTranslations("MeuMundo")
  return useCallback(
    (k: MobKind) =>
      (ring
        ? {
            cavaleiro: t("ringMobSoldier", "Boxeador da casa"),
            stone: t("laminasMobStoneGolem", "Golem de Pedra"),
            wolf: t("ringMobWolf", "Trio da Rua"),
            ciborgue: t("ringMobGolem", "O Pesadão"),
            garras: t("ringMobHarpy", "A Ligeira"),
            brute: t("ringMobBrute", "O Campeão"),
          }
        : {
        cavaleiro: t("laminasMobKnight", "Cavaleiro Dourado"),
        stone: t("laminasMobStoneGolem", "Golem de Pedra"),
        wolf: t("laminasMobWolf", "Lobos de Ferrugem"),
        ciborgue: t("laminasMobGolem", "Ciborgue"),
        garras: t("laminasMobHarpy", "Dama das Garras"),
            brute: t("laminasMobBrute", "Brutamontes"),
          })[k],
    [t, ring],
  )
}

export function LaminasView({ body: bodyNow, look: lookNow, onExit, encounter, onEncounterEnd, stage = "arena", tutorial = false, onReceipt, opened = null }: LaminasViewProps) {
  // Corpo e cores ficam os da abertura: se a sala mandar outros no meio, recriar a cena
  // deixaria a luta parada para sempre (ela nasce esperando o botão, que já foi apertado).
  const [{ body, look }] = useState({ body: bodyNow, look: lookNow })
  // 2026-11-08 (pedido do Alex): a Arena abre no HALL DA FAMA (pódio + top 10); o treino
  // contra a máquina fica no botão "Treinar". `duel` = o desafio aberto pelo servidor.
  const [fight, setFight] = useState<{ key: number; choice: Choice; duel?: { ticket: FightTicket; foe: string; foeBody?: BodyId | null } } | null>(() =>
    opened ? { key: 1, choice: { kind: opened.ticket.setup.kind, level: opened.ticket.setup.level }, duel: opened } : encounter ? { key: 1, choice: { kind: encounter.kind, level: 1 } } : tutorial ? { key: 1, choice: { kind: "cavaleiro", level: 1 } } : null,
  )
  // a celebração (ganho/nível) espera a luta acabar: sai quando a tela fecha
  useEffect(() => {
    hold(true)
    return () => hold(false)
  }, [])
  const seq = useRef(1)
  const reported = useRef(false)
  const start = (c: Choice) => setFight({ key: ++seq.current, choice: c })
  const duel = (ticket: FightTicket, foe: string, foeBody?: BodyId | null) => setFight({ key: ++seq.current, choice: { kind: ticket.setup.kind, level: ticket.setup.level }, duel: { ticket, foe, foeBody } })
  return (
    <div className={`fixed inset-0 z-[70] touch-none select-none overflow-hidden ${archivo.className}`} style={{ background: "#3a1a12" }}>
      {fight ? (
        <LaminasScreen
          key={fight.key}
          body={body}
          look={look}
          choice={fight.choice}
          stage={stage}
          portal={!!encounter}
          mobId={encounter?.mobId}
          tutorial={tutorial}
          opened={fight.duel ?? null}
          onReceipt={(r) => {
            celebrate(r)
            onReceipt?.(r)
          }}
          onEnd={(win) => {
            if (encounter && !reported.current) {
              reported.current = true
              onEncounterEnd?.(win)
            }
          }}
          onAgain={encounter || tutorial || fight.duel ? undefined : () => start(fight.choice)}
          onMenu={encounter || tutorial || opened ? onExit : () => setFight(null)}
        />
      ) : stage === "arena" ? (
        // Arena: só o Hall da Fama (Alex, 2026-11-08: a tela de treino "Arena das Lâminas" saiu)
        <HallOfFame onExit={onExit} onFight={duel} />
      ) : (
        <Menu onPick={start} onExit={onExit} ring={stage === "ring"} />
      )}
    </div>
  )
}

// ═══ menu de treino ══════════════════════════════════════════════════════════

function Menu({ onPick, onExit, onBack, ring }: { onPick: (c: Choice) => void; onExit: () => void; onBack?: () => void; ring: boolean }) {
  const t = useTranslations("MeuMundo")
  const mobName = useMobName(ring)
  const all: { c: Choice; sub: string; tone: string }[] = [
    { c: { kind: "cavaleiro", level: 1 }, sub: ring ? t("laminasSubPeer", "Com os seus status") : t("laminasSubKnight", "Espada e armadura: muita defesa"), tone: "#C9A46A" },
    { c: { kind: "wolf", level: 1 }, sub: ring ? t("ringSubWolf", "Três de uma vez, rápidos") : t("laminasSubWolf", "Bando de 3, rápidos"), tone: "#C2693A" },
    { c: { kind: "ciborgue", level: 1 }, sub: ring ? t("ringSubGolem", "Lento e pesado") : t("laminasSubGolem", "Lento, atira de longe"), tone: "#8D95A3" },
    { c: { kind: "garras", level: 1 }, sub: t("laminasSubHarpy", "Rápida, ataca com as garras"), tone: "#7C89A3" },
    { c: { kind: "stone", level: 1 }, sub: t("laminasSubStone", "Pedra: muita defesa, pouca velocidade"), tone: "#7FA36A" },
    { c: { kind: "brute", level: 1 }, sub: ring ? t("laminasSubChampion", "20% mais forte que você") : t("laminasSubBrute", "Elite: investida e pancada"), tone: VIOLET },
  ]
  const opts = ring ? all.filter((o) => o.c.kind !== "garras" && o.c.kind !== "stone") : all
  return (
    <div className="absolute inset-0 flex items-center justify-center overflow-y-auto p-4" style={{ background: BG }}>
      <div className="w-full max-w-[600px] rounded-none p-5 text-left max-[759px]:p-4 [@media(max-height:520px)]:p-3" style={{ background: MM.surface, color: MM.text, boxShadow: MM.shadow, border: `1px solid ${MM.border}` }}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-[12px] font-bold uppercase tracking-[0.18em]" style={{ color: BRONZE }}>
              {t("laminasKicker", "Os Jogos Eternos de Lúmen")}
            </div>
            <h1 className="mt-1.5 text-[32px] font-black italic leading-none tracking-tight max-[759px]:text-[26px]" style={{ color: SAND }}>
              {ring ? t("centerPlace_boxe", "Arena de Boxe") : t("laminasTitle", "Arena das Lâminas")}
            </h1>
            <p className="mt-2 text-[14px] leading-snug max-[759px]:text-[13px] [@media(max-height:520px)]:hidden" style={{ color: MM.muted }}>
              {ring
                ? t("ringPitch", "Calce as luvas e encare os lutadores. Quando o chão acender vermelho, o golpe vem ali: esquive e bata na brecha.")
                : t("laminasPitch", "Treine a espada contra a máquina. Quando o chão acender vermelho, o golpe vem ali: esquive e corte na brecha.")}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {onBack && (
              <button type="button" aria-label={t("hfBack", "Voltar ao Hall da Fama")} onClick={onBack} className="grid h-10 w-10 place-items-center rounded-full" style={{ background: MM.card, border: `1px solid ${MM.border}` }}>
                <Crown className="h-5 w-5" style={{ color: MM.gold }} />
              </button>
            )}
            <BackToCity onExit={onExit} className="pointer-events-auto" />
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2 max-[420px]:grid-cols-1 [@media(max-height:520px)]:grid-cols-4">
          {opts.map(({ c, sub, tone }) => (
            <button
              key={`${c.kind}-${c.level}`}
              type="button"
              onClick={() => onPick(c)}
              className="flex flex-col items-start rounded-none px-3 py-2.5 text-left transition-transform active:scale-[0.98]"
              style={{ background: MM.card, border: `1.5px solid ${tone}55` }}
            >
              <span className="flex items-center gap-2 text-[15.5px] font-black italic" style={{ color: tone }}>
                <Swords className="h-4 w-4 shrink-0" /> {mobName(c.kind)}
              </span>
              <span className="text-[12px] leading-tight" style={{ color: MM.muted }}>
                {sub}
              </span>
            </button>
          ))}
        </div>
        <p className="mt-3 text-[12px] leading-snug max-[759px]:hidden" style={{ color: MM.muted }}>
          {t("laminasKeys2", "WASD anda · J, Espaço ou clique ataca (aperte de novo para o combo) · K, Shift ou botão direito esquiva · 1 Corte Mágico · 2 Investida · 3 Escudo · Q Poder Máximo")}
        </p>
        <p className="mt-3 hidden text-[12px] leading-snug max-[759px]:block [@media(max-height:520px)]:hidden" style={{ color: MM.muted }}>
          {t("laminasTouchHelp2", "Joystick anda · ATACAR, ESQUIVAR e as habilidades na direita")}
        </p>
      </div>
    </div>
  )
}

// ═══ a luta ══════════════════════════════════════════════════════════════════

function LaminasScreen({
  body,
  look,
  choice,
  stage,
  portal,
  mobId,
  tutorial,
  opened = null,
  onReceipt,
  onEnd,
  onAgain,
  onMenu,
}: {
  body: BodyId
  look?: string
  choice: Choice
  stage: "arena" | "ring" | "bairro" | "centro"
  portal: boolean
  mobId?: number
  tutorial?: boolean
  opened?: { ticket: FightTicket; foe: string; foeBody?: BodyId | null } | null
  onReceipt?: (r: Receipt) => void
  onEnd: (win: boolean) => void
  onAgain?: () => void
  onMenu: () => void
}) {
  const t = useTranslations("MeuMundo")
  const mobName = useMobName(stage === "ring")
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const gameRef = useRef<LaminasGameHandle | null>(null)
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading")
  const [hud, setHud] = useState<LaminasHud | null>(null)
  // o personagem comenta a luta (banter.ts): vida no fim e golpe vindo
  const lowHp = !!hud && !hud.over && hud.hpMax > 0 && hud.hp / hud.hpMax < 0.3
  const danger = !!hud && !hud.over && hud.danger
  useEffect(() => {
    if (lowHp) emitMinigame("luta", { kind: "low" })
  }, [lowHp])
  useEffect(() => {
    if (danger) emitMinigame("luta", { kind: "danger" })
  }, [danger])
  const [sheet, setSheet] = useState<FightSheet | null>(null)
  const [started, setStarted] = useState(false)
  const begin = useCallback(() => {
    gameRef.current?.begin()
    probeNote("begin")
    setStarted(true)
  }, [])
  const [result, setResult] = useState<boolean | null>(null)
  const [muted, setMuted] = useState(false)
  // mm3d-72: Desistir pede um segundo toque (3 s para confirmar)
  const [quitArmed, setQuitArmed] = useState(false)
  useEffect(() => {
    if (!quitArmed) return
    const id = setTimeout(() => setQuitArmed(false), 3000)
    return () => clearTimeout(id)
  }, [quitArmed])
  const [veil, setVeil] = useState(portal)
  const [denied, setDenied] = useState<{ id: SkillId | "ult"; n: number } | null>(null)
  const [isTouch] = useState(() => typeof window !== "undefined" && (window.matchMedia("(pointer: coarse)").matches || navigator.maxTouchPoints > 0))
  const endRef = useRef(onEnd)
  useEffect(() => {
    endRef.current = onEnd
  }, [onEnd])

  // ── mm3d-59: o servidor abre a luta (semente, atributos, kit) e confere o fim ──
  // null = pedindo; "offline" = sem ticket (treino sem prêmio).
  const [ticket, setTicket] = useState<FightTicket | "offline" | null>(null)
  const [receipt, setReceipt] = useState<Receipt | null>(null)
  const [settling, setSettling] = useState(false)
  useEffect(() => {
    let alive = true
    const token = getToken()
    if (!token) {
      setTicket("offline")
      return
    }
    // B8: o desafio do Hall chega com o ticket aberto pelo servidor
    if (opened) {
      setTicket(opened.ticket)
      return
    }
    const origin: FightOrigin = portal ? "mob" : tutorial ? "tutorial" : stage === "ring" ? "boxe" : "laminas"
    const ask = async (tries: number): Promise<void> => {
      const r = await startFight(token, { origin, kind: choice.kind, level: choice.level, mobId })
      if (!alive) return
      if (r.ok) return setTicket(r.data.fight)
      // o "Lutar" vai pela sala e o ticket por HTTP: a sala pode ainda não ter visto
      if (r.code === "mob" && tries > 0) {
        await new Promise((ok) => setTimeout(ok, 400))
        return ask(tries - 1)
      }
      setTicket("offline")
    }
    void ask(3)
    return () => {
      alive = false
    }
  }, [choice, stage, portal, mobId, tutorial, opened])
  const ultName = abilityKit(body, stage).slots.ult.name
  const labelsRef = useRef({
    evade: t("laminasEvade", "ESQUIVOU!"),
    miss: t("laminasMiss", "ERROU!"),
    ult: t(ultName.key, ultName.fallback),
    // mm3d-72: a personalidade na luta e os poderes dos monstros (com os nomes do corpo de cada um)
    psycho: t("laminasPsycho", "PSICOPATA"),
    hits: t("laminasHits", "GOLPES"),
    damage: t("laminasDamage", "DANO"),
    fleeWarn: t("laminasFleeWarn", "Tô com medo dessa luta, vou sair."),
    foes: Object.fromEntries(
      MOB_KINDS.map((k) => {
        const sl = abilityKit(MOB_BODY[k] ?? null).slots
        return [k, { slash: t(sl.slash.name.key, sl.slash.name.fallback), dash: t(sl.dash.name.key, sl.dash.name.fallback), shield: t(sl.shield.name.key, sl.shield.name.fallback), ult: t(sl.ult.name.key, sl.ult.name.fallback) }]
      }),
    ) as Record<MobKind, Record<"slash" | "dash" | "shield" | "ult", string>>,
  })
  const receiptRef = useRef(onReceipt)
  useEffect(() => {
    receiptRef.current = onReceipt
  }, [onReceipt])
  const ticketRef = useRef(ticket)
  useEffect(() => {
    ticketRef.current = ticket
  }, [ticket])

  const armed = ticket !== null
  const foeBodyOpened = opened?.foeBody ?? null
  useEffect(() => {
    const canvas = canvasRef.current
    const tk = ticketRef.current
    if (!canvas || !armed) return
    let alive = true
    let endTimer: ReturnType<typeof setTimeout> | null = null
    const fromServer = tk && tk !== "offline" ? tk : null
    probeOpen(`${stage}:${choice.kind}`)
    try {
      gameRef.current = createLaminasGame({
        canvas,
        body,
        look,
        foe: foeBodyOpened ? { body: foeBodyOpened } : undefined,
        hold: true,
        labels: { ...labelsRef.current, foeSkills: labelsRef.current.foes[fromServer ? fromServer.setup.kind : choice.kind] },
        setup: fromServer
          ? { kind: fromServer.setup.kind, level: fromServer.setup.level, seed: fromServer.setup.seed, stats: fromServer.setup.stats, gear: fromServer.setup.gear ?? undefined, hero: fromServer.setup.hero ?? 1, peer: fromServer.setup.peer ?? undefined, tier: fromServer.setup.tier ?? undefined, body: fromServer.setup.body ?? undefined, temper: fromServer.setup.temper ?? undefined, affection: fromServer.setup.affection ?? undefined }
          : { kind: choice.kind, level: choice.level, body, peer: stage === "ring" ? peerOf(choice.kind) : undefined, tier: tutorial || stage === "ring" ? undefined : portal ? "street" : "arena" },
        kit: fromServer ? (fromServer.setup.kit === "hammer" ? "hammer" : fromServer.setup.kit === "bow" ? "bow" : fromServer.setup.kit === "gun" ? "gun" : fromServer.setup.style === "mage" ? "mage" : "blade") : undefined,
        appearance: fromServer?.setup.appearance,
        stage,
        onReady: () => {
          if (!alive) return
          probeNote("ready")
          setSheet(gameRef.current?.sheet() ?? null)
          setStatus("ready")
        },
        onHud: (h) => alive && setHud(h),
        onEnd: (win) => {
          probeNote("end")
          endRef.current(win)
          endTimer = setTimeout(() => alive && setResult(win), 1400)
          // o prêmio é o do SERVIDOR: manda a gravação e espera o recibo
          const token = getToken()
          const frames = gameRef.current?.frames()
          if (fromServer && token && frames) {
            setSettling(true)
            void finishFight(token, fromServer.ticket, frames).then((r) => {
              if (!alive) return
              setSettling(false)
              if (r.ok) {
                setReceipt(r.data.receipt)
                receiptRef.current?.(r.data.receipt)
              }
            })
          }
        },
        onError: () => alive && setStatus("error"),
      })
      gameRef.current.onDenied((id) => alive && setDenied((d) => ({ id, n: (d?.n ?? 0) + 1 })))
      // atributos da vida (inteligência puxa os golpes fortes; força e velocidade no dano/ritmo)
      const token = getToken()
      if (token && !fromServer)
        void getLife(token).then((r) => {
          if (!alive || !r.ok || !r.data) return
          const at = r.data.character.attributes
          gameRef.current?.setStats({ intelligence: at.intelligence, strength: at.strength, speed: at.speed })
        })
    } catch (err) {
      console.error("[meu-mundo] arena das lâminas não abriu", err)
      setStatus("error")
    }
    return () => {
      alive = false
      probeClose()
      if (endTimer) clearTimeout(endTimer)
      gameRef.current?.dispose()
      gameRef.current = null
    }
  }, [body, look, choice, stage, armed, tutorial, portal, foeBodyOpened])

  // a passagem violeta do portal some quando a cena está pronta
  useEffect(() => {
    if (status !== "ready" || !veil) return
    const id = setTimeout(() => setVeil(false), 900)
    return () => clearTimeout(id)
  }, [status, veil])

  const hpPct = hud ? Math.max(0, hud.hp) : 100
  const stPct = hud ? Math.max(0, hud.stam) : 100
  const pwPct = hud ? Math.max(0, Math.min(100, hud.power)) : 0
  const pwFull = pwPct >= 100
  const { pw, vw } = usePlateSize()
  // celular em pé: as duas placas não cabem lado a lado — a do inimigo desce para a direita
  const narrow = vw < plateWidth(pw) * 2 + 140
  // apresentação 07 (D2 + Anexo A §9.4): a placa NÃO afina — só o encaixe muda.
  // Inimigo: em cima, logo abaixo da fileira de som/desistir/sair, barra esticada pela largura
  // (72% da tela em pé, 36% deitado, como a referência) sem mudar a espessura (que sai de `pw`).
  // Eu: no celular desce para logo acima da zona dos botões (o que só se lê fica em cima, o que se
  // toca no terço de baixo — a placa fica no limite, longe do rosto do inimigo e do centro).
  const foeBarK = Math.max(2.9, Math.min(5, (vw * (narrow ? 0.72 : 0.36) - pw * 0.62) / pw))
  const sk = useSkillScale()
  // a HUD inteira some durante o close do Poder Máximo e volta junto com o controle (Anexo A §4.4)
  const cinema = !!hud?.cinema
  const hudFade = { opacity: cinema ? 0 : 1, transition: `opacity ${cinema ? 140 : 220}ms ease-out` }
  // desafio do Hall: o retrato é o do personagem de quem foi desafiado
  const foeBody = opened?.foeBody ?? (stage === "ring" ? RING_BODY[choice.kind] : MOB_BODY[choice.kind])
  const foePortrait = foeBody ? PORTRAIT[foeBody] : stage !== "ring" && choice.kind === "wolf" ? WOLF_PORTRAIT : null
  const heroLevel = ticket && ticket !== "offline" ? (ticket.setup.hero ?? 1) : 1
  const foeHp = hud ? hud.mobs.reduce((s, m) => s + Math.max(0, m.hp), 0) : 0
  const foeMax = hud ? hud.mobs.reduce((s, m) => s + m.hpMax, 0) : 1
  const foeTop = narrow ? `calc(${SAFE.top} + 48px)` : `calc(${SAFE.top} + 4px)`
  return (
    <div className="absolute inset-0">
      <canvas ref={canvasRef} className="block h-full w-full outline-none" style={{ touchAction: "none" }} aria-label={t("laminasAria", "Arena das Lâminas")} />

      {/* antes da luta: os status dos dois lados; a luta só anda com um toque */}
      {status === "ready" && !veil && !started && sheet && (
        <VersusScreen
          me={{ name: t("fightYou", "VOCÊ"), level: heroLevel, portrait: PORTRAIT[body], accent: "#FFB43B" }}
          foe={{ name: opened ? opened.foe : mobName(choice.kind), level: portal && ticket && ticket !== "offline" ? ticket.setup.level : heroLevel, portrait: foePortrait, accent: FOE_ACCENT[choice.kind] }}
          sheet={sheet}
          onStart={begin}
        />
      )}

      {/* inimigos: a placa do Cat demon, espelhada (o retrato fica do lado de fora) */}
      {hud && started && (
        <div data-plate="foe" data-fight-hud="" className="pointer-events-none absolute" style={{ ...(narrow ? { top: foeTop, right: SAFE.right } : { top: foeTop, left: "50%", transform: "translateX(-50%)" }), ...hudFade }}>
          <FightPlate
            pw={pw}
            barK={foeBarK}
            mirrored
            portrait={foePortrait}
            name={
              portal && ticket && ticket !== "offline"
                ? `${mobName(choice.kind)} · ${t("laminasFoeLevel", "Nv. {n}").replace("{n}", String(ticket.setup.level))}`
                : `${mobName(choice.kind)}${choice.kind === "cavaleiro" ? ` ${choice.level}` : ""}`
            }
            hp={foeHp}
            hpMax={foeMax}
          >
            {hud.mobs.length > 1 && (
              <div className="mt-1 flex justify-end gap-1" style={{ paddingRight: pw * 0.62 }}>
                {hud.mobs.map((m) => (
                  <div key={m.id} className="h-1.5 overflow-hidden" style={{ width: pw * 0.7, background: "rgba(5,3,8,.82)", outline: "1px solid rgba(214,167,91,.6)", transform: "skewX(-20deg)" }}>
                    <div className="ml-auto h-full" style={{ width: `${(100 * Math.max(0, m.hp)) / m.hpMax}%`, background: "linear-gradient(180deg, #ff168a, #bf0052)", transition: "width 140ms linear" }} />
                  </div>
                ))}
              </div>
            )}
          </FightPlate>
        </div>
      )}

      {/* aviso de golpe */}
      {hud?.danger && !hud.over && (
        <div
          data-fight-hud=""
          className="pointer-events-none absolute left-1/2 -translate-x-1/2 text-[24px] font-black italic tracking-wide"
          style={{ top: `calc(${foeTop} + ${Math.round(plateHeight(pw)) + 6}px)`, color: "#FF5A5A", textShadow: "0 2px 0 rgba(0,0,0,.45)", ...hudFade }}
        >
          {t("laminasDodge", "ESQUIVE!")}
        </div>
      )}

      {/* eu: a placa com retrato, sangue, fôlego e poder (no celular em cima, longe do joystick) */}
      {started && (
        <div data-plate="me" data-fight-hud="" className="pointer-events-none absolute" style={{ left: SAFE.left, bottom: isTouch ? `calc(${SAFE.bottom} + ${skillZoneTop(sk) + 8}px)` : SAFE.bottom, ...hudFade }}>
          <FightPlate pw={pw} portrait={PORTRAIT[body]} name={t("fightYou", "VOCÊ")} hp={hpPct} hpMax={hud?.hpMax ?? 100} stam={stPct / 100} power={{ v: pwPct / 100, ready: pwFull }} />
        </div>
      )}

      {/* som e sair */}
      <div data-fight-hud="" className="absolute flex gap-2" style={{ top: SAFE.top, right: SAFE.right, ...hudFade, pointerEvents: cinema ? "none" : undefined }}>
        <button
          type="button"
          aria-label={muted ? t("laminasSoundOn", "Ligar som") : t("laminasSoundOff", "Desligar som")}
          onClick={() => {
            const m = !muted
            setMuted(m)
            gameRef.current?.setMuted(m)
          }}
          className="grid h-10 w-10 place-items-center rounded-full"
          style={{ background: MM.surface, border: `1px solid ${MM.border}`, color: MM.text }}
        >
          {muted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
        </button>
        {started && result === null && (
          <button
            type="button"
            aria-label={t("laminasGiveUp", "Desistir")}
            onClick={() => {
              if (!quitArmed) return setQuitArmed(true)
              setQuitArmed(false)
              gameRef.current?.quit()
            }}
            className="flex h-10 items-center gap-1.5 rounded-full px-3 text-[11px] font-black uppercase tracking-[0.1em]"
            style={{ background: quitArmed ? MM.rubyFill : MM.surface, border: `1px solid ${quitArmed ? MM.rubyBorder : MM.border}`, color: MM.text }}
          >
            <Flag className="h-4 w-4" />
            {quitArmed ? t("laminasGiveUpConfirm", "Confirmar?") : t("laminasGiveUp", "Desistir")}
          </button>
        )}
        <button type="button" aria-label={t("laminasQuit", "Sair da luta")} onClick={onMenu} className="grid h-10 w-10 place-items-center rounded-full" style={{ background: MM.surface, border: `1px solid ${MM.border}`, color: MM.text }}>
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* 2026-11-03: botões de habilidade no desenho da referência do Alex (no computador com as teclas) */}
      {status === "ready" && started && result === null && hud && (
        <div data-fight-hud="" style={hudFade}>
          <MinigameBanter running={!hud.over} />
          {isTouch && <Joystick gameRef={gameRef} skin="gold" />}
          <SkillHud
            kit={abilityKit(body, stage)}
            casting={hud.casting}
            locked={hud.locked}
            cd={hud.cd}
            power={hud.power}
            shield={hud.shield}
            keys={!isTouch}
            denied={denied}
            onAttack={() => gameRef.current?.attack()}
            onDodge={() => gameRef.current?.dodge()}
            onSkill={(id) => gameRef.current?.skill(id)}
            onPower={() => gameRef.current?.power()}
          />
        </div>
      )}

      {/* carregando / passagem do portal */}
      {(status !== "ready" || veil) && (
        <div
          className="absolute inset-0 grid place-items-center"
          style={{
            background: portal ? "radial-gradient(circle at 50% 50%, #e6b3ff 0%, #8a2be2 35%, #2a0a45 75%)" : BG,
            transition: "opacity 600ms",
            opacity: status === "ready" && !veil ? 0 : 1,
          }}
        >
          <div className="text-center" style={{ color: "#fff" }}>
            {status === "error" ? (
              <>
                <p className="text-[18px] font-bold">{t("laminasError", "A arena não abriu neste aparelho.")}</p>
                <button type="button" onClick={onMenu} className="mt-3 rounded-none px-4 py-2 text-[15px] font-bold" style={{ background: MM.card, border: `1px solid ${MM.border}` }}>
                  {t("laminasBack", "Voltar")}
                </button>
              </>
            ) : (
              <>
                <div className="mx-auto h-24 w-24 animate-spin rounded-full" style={{ border: "6px solid rgba(255,255,255,.25)", borderTopColor: "#fff", animationDuration: portal ? "0.6s" : "1s" }} />
                <p className="mt-4 text-[18px] font-black italic">{portal ? t("laminasPortal", "Atravessando o portal…") : t("laminasLoading", "Entrando na arena…")}</p>
              </>
            )}
          </div>
        </div>
      )}

      {/* C2: a voz de Kragor no fim da luta do ringue (cap. 3 em diante) */}
      {stage === "ring" && !tutorial && !portal && <GodVoice god="kragor" show={result !== null} />}
      {/* fim — mm3d-60: celebração steampunk (mesmos textos, mesmas ações) */}
      {result !== null && (
        <VictoryPanel
          win={result}
          title={result ? t("laminasWin", "VITÓRIA!") : t("laminasLose", "Você caiu")}
          subtitle={
            result
              ? portal
                ? t("laminasWinPortal", "O monstro foi derrotado e sumiu da cidade.")
                : t("laminasWinTrain", "Mais um treino vencido. Os Sete estão de olho.")
              : portal
                ? t("laminasLosePortal", "O monstro continua na cidade. Volte quando estiver pronto.")
                : t("laminasLoseTrain", "Leia o chão vermelho, esquive e corte na brecha.")
          }
          actions={
            <>
              {onAgain && <VictoryButton onClick={onAgain}>{t("laminasAgain", "Lutar de novo")}</VictoryButton>}
              <VictoryButton onClick={onMenu} alt={!!onAgain}>
                {portal ? t("laminasBackCity", "Voltar à cidade") : t("laminasBackMenu", "Escolher outro")}
              </VictoryButton>
            </>
          }
        >
          {/* mm3d-59: o prêmio é o que o SERVIDOR conferiu (recibo) */}
          {settling ? (
            <p className="text-[13px]" style={{ color: MM.muted }}>
              {t("fightChecking", "Conferindo a luta…")}
            </p>
          ) : receipt ? (
            <ReceiptLines receipt={receipt} />
          ) : ticket === "offline" ? (
            <p className="text-[12px]" style={{ color: MM.muted }}>
              {t("fightOffline", "Treino sem conexão com o servidor: sem prêmio desta vez.")}
            </p>
          ) : null}
        </VictoryPanel>
      )}
    </div>
  )
}
