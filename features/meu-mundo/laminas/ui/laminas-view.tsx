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
import { Shield, Sparkles, Swords, Volume2, VolumeX, X } from "lucide-react"
import { useTranslations } from "@/components/i18n/I18nProvider"
import { MM } from "../../ui/hud/tokens"
import { archivo } from "../../ui/status/evo-skin"
import { Joystick, SAFE } from "../../ui/meu-mundo-view"
import { FightPlate, plateHeight, plateWidth, usePlateSize } from "../../ui/hud/fight-plate"
import { PORTRAIT } from "../../ui/portraits"
import type { BodyId } from "../../types"
import { finishFight, getLife, startFight, type FightOrigin, type FightTicket, type Receipt } from "../../data"
import { getToken } from "@/lib/auth"
import { ReceiptLines } from "../../ui/rewards/receipt-lines"
import { VictoryButton, VictoryPanel } from "../../ui/rewards/victory-panel"
import { celebrate, hold } from "../../ui/rewards/reward-bus"
import { createLaminasGame, type LaminasGameHandle, type LaminasHud } from "../engine/laminas-game"
import type { MobKind } from "../sim/fight"

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
}

const SAND = "#E9CF98"
const BRONZE = "#C98A45"
const VIOLET = "#B84DFF"
const BG = "radial-gradient(120% 90% at 50% 0%, #f7b267 0%, #b5502b 50%, #3a1a12 100%)"

type Choice = { kind: MobKind; level: number }

/** Retrato do inimigo na placa: o corpo que a cena desenha (monster-view.ts RIGGED/HUMAN). */
const MOB_BODY: Partial<Record<MobKind, BodyId>> = { soldier: "golem", golem: "ciborgue", harpy: "garras" }
const RING_BODY: Record<MobKind, BodyId> = { soldier: "normal", wolf: "slim", golem: "fat", harpy: "female", brute: "strong" }

export function useMobName(ring = false) {
  const t = useTranslations("MeuMundo")
  return useCallback(
    (k: MobKind) =>
      (ring
        ? {
            soldier: t("ringMobSoldier", "Boxeador da casa"),
            wolf: t("ringMobWolf", "Trio da Rua"),
            golem: t("ringMobGolem", "O Pesadão"),
            harpy: t("ringMobHarpy", "A Ligeira"),
            brute: t("ringMobBrute", "O Campeão"),
          }
        : {
        soldier: t("laminasMobSoldier", "Golem de Pedra"),
        wolf: t("laminasMobWolf", "Lobos de Ferrugem"),
        golem: t("laminasMobGolem", "Ciborgue"),
        harpy: t("laminasMobHarpy", "Dama das Garras"),
            brute: t("laminasMobBrute", "Brutamontes"),
          })[k],
    [t, ring],
  )
}

export function LaminasView({ body, look, onExit, encounter, onEncounterEnd, stage = "arena", tutorial = false, onReceipt }: LaminasViewProps) {
  const [fight, setFight] = useState<{ key: number; choice: Choice } | null>(() =>
    encounter ? { key: 1, choice: { kind: encounter.kind, level: 1 } } : tutorial ? { key: 1, choice: { kind: "soldier", level: 1 } } : null,
  )
  // a celebração (ganho/nível) espera a luta acabar: sai quando a tela fecha
  useEffect(() => {
    hold(true)
    return () => hold(false)
  }, [])
  const seq = useRef(1)
  const reported = useRef(false)
  const start = (c: Choice) => setFight({ key: ++seq.current, choice: c })
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
          onAgain={encounter || tutorial ? undefined : () => start(fight.choice)}
          onMenu={encounter || tutorial ? onExit : () => setFight(null)}
        />
      ) : (
        <Menu onPick={start} onExit={onExit} ring={stage === "ring"} />
      )}
    </div>
  )
}

// ═══ menu de treino ══════════════════════════════════════════════════════════

function Menu({ onPick, onExit, ring }: { onPick: (c: Choice) => void; onExit: () => void; ring: boolean }) {
  const t = useTranslations("MeuMundo")
  const mobName = useMobName(ring)
  const all: { c: Choice; sub: string; tone: string }[] = [
    { c: { kind: "soldier", level: 1 }, sub: t("laminasLevel", "Nível {n}").replace("{n}", "1"), tone: "#C9A46A" },
    { c: { kind: "soldier", level: 2 }, sub: t("laminasLevel", "Nível {n}").replace("{n}", "2"), tone: "#B9BCC4" },
    { c: { kind: "wolf", level: 1 }, sub: ring ? t("ringSubWolf", "Três de uma vez, rápidos") : t("laminasSubWolf", "Bando de 3, rápidos"), tone: "#C2693A" },
    { c: { kind: "golem", level: 1 }, sub: t("laminasSubGolem", "Lento, bate em área"), tone: "#8D95A3" },
    { c: { kind: "harpy", level: 1 }, sub: t("laminasSubHarpy", "Voa e mergulha"), tone: "#7C89A3" },
    { c: { kind: "brute", level: 1 }, sub: t("laminasSubBrute", "Elite: investida e pancada"), tone: VIOLET },
  ]
  const opts = ring ? all.filter((o) => o.c.kind !== "harpy") : all
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
          <button type="button" aria-label={t("laminasLeave", "Voltar ao centro")} onClick={onExit} className="grid h-10 w-10 shrink-0 place-items-center rounded-full" style={{ background: MM.card, border: `1px solid ${MM.border}` }}>
            <X className="h-5 w-5" />
          </button>
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
          {t("laminasKeys", "WASD anda · J, Espaço ou clique ataca (aperte de novo para o combo) · K, Shift ou botão direito esquiva")}
        </p>
        <p className="mt-3 hidden text-[12px] leading-snug max-[759px]:block [@media(max-height:520px)]:hidden" style={{ color: MM.muted }}>
          {t("laminasTouchHelp", "Joystick anda · ATACAR e ESQUIVAR na direita")}
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
  const [result, setResult] = useState<boolean | null>(null)
  const [muted, setMuted] = useState(false)
  const [veil, setVeil] = useState(portal)
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
  }, [choice, stage, portal, mobId, tutorial])
  const receiptRef = useRef(onReceipt)
  useEffect(() => {
    receiptRef.current = onReceipt
  }, [onReceipt])
  const ticketRef = useRef(ticket)
  useEffect(() => {
    ticketRef.current = ticket
  }, [ticket])

  const armed = ticket !== null
  useEffect(() => {
    const canvas = canvasRef.current
    const tk = ticketRef.current
    if (!canvas || !armed) return
    let alive = true
    let endTimer: ReturnType<typeof setTimeout> | null = null
    const fromServer = tk && tk !== "offline" ? tk : null
    try {
      gameRef.current = createLaminasGame({
        canvas,
        body,
        look,
        setup: fromServer
          ? { kind: fromServer.setup.kind, level: fromServer.setup.level, seed: fromServer.setup.seed, stats: fromServer.setup.stats, gear: fromServer.setup.gear ?? undefined, hero: fromServer.setup.hero ?? 1 }
          : { kind: choice.kind, level: choice.level },
        kit: fromServer ? (fromServer.setup.style === "mage" ? "mage" : "blade") : undefined,
        appearance: fromServer?.setup.appearance,
        stage,
        onReady: () => alive && setStatus("ready"),
        onHud: (h) => alive && setHud(h),
        onEnd: (win) => {
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
      if (endTimer) clearTimeout(endTimer)
      gameRef.current?.dispose()
      gameRef.current = null
    }
  }, [body, look, choice, stage, armed])

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
  const foeBody = stage === "ring" ? RING_BODY[choice.kind] : MOB_BODY[choice.kind]
  const foeHp = hud ? hud.mobs.reduce((s, m) => s + Math.max(0, m.hp), 0) : 0
  const foeMax = hud ? hud.mobs.reduce((s, m) => s + m.hpMax, 0) : 1
  const foeTop = narrow ? `calc(${SAFE.top} + 52px)` : SAFE.top
  return (
    <div className="absolute inset-0">
      <canvas ref={canvasRef} className="block h-full w-full outline-none" style={{ touchAction: "none" }} aria-label={t("laminasAria", "Arena das Lâminas")} />

      {/* inimigos: a placa do Cat demon, espelhada (o retrato fica do lado de fora) */}
      {hud && (
        <div className="pointer-events-none absolute" style={narrow ? { top: foeTop, right: SAFE.right } : { top: foeTop, left: "50%", transform: "translateX(-50%)" }}>
          <FightPlate
            pw={pw}
            mirrored
            portrait={foeBody ? PORTRAIT[foeBody] : null}
            name={
              portal && ticket && ticket !== "offline"
                ? `${mobName(choice.kind)} · ${t("laminasFoeLevel", "Nv. {n}").replace("{n}", String(ticket.setup.level))}`
                : `${mobName(choice.kind)}${choice.kind === "soldier" ? ` ${choice.level}` : ""}`
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
          className="pointer-events-none absolute left-1/2 -translate-x-1/2 text-[22px] font-black italic tracking-wide"
          style={{ top: `calc(${foeTop} + ${Math.round(plateHeight(pw)) + 6}px)`, color: "#FF5A5A", textShadow: "0 2px 0 rgba(0,0,0,.45)" }}
        >
          {t("laminasDodge", "ESQUIVE!")}
        </div>
      )}

      {/* eu: a placa com retrato, sangue, fôlego e poder (no celular em cima, longe do joystick) */}
      <div className="pointer-events-none absolute" style={{ left: SAFE.left, top: isTouch ? SAFE.top : undefined, bottom: isTouch ? undefined : SAFE.bottom }}>
        <FightPlate pw={pw} portrait={PORTRAIT[body]} name={t("fightYou", "VOCÊ")} hp={hpPct} hpMax={hud?.hpMax ?? 100} stam={stPct / 100} power={{ v: pwPct / 100, ready: pwFull }}>
          {!isTouch && pwFull && (
            <div className="mt-1 text-[12px] font-black uppercase italic tracking-wide" style={{ paddingLeft: pw * 0.62, color: "#ffb347", textShadow: "0 2px 0 rgba(0,0,0,.45)" }}>
              {t("laminasPowerReady", "PODER pronto — Q")}
            </div>
          )}
        </FightPlate>
      </div>

      {/* som e sair */}
      <div className="absolute flex gap-2" style={{ top: SAFE.top, right: SAFE.right }}>
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
        <button type="button" aria-label={t("laminasQuit", "Sair da luta")} onClick={onMenu} className="grid h-10 w-10 place-items-center rounded-full" style={{ background: MM.surface, border: `1px solid ${MM.border}`, color: MM.text }}>
          <X className="h-5 w-5" />
        </button>
      </div>

      {isTouch && status === "ready" && result === null && (
        <>
          <Joystick gameRef={gameRef} />
          <div className="absolute flex items-end gap-3" style={{ right: SAFE.right, bottom: SAFE.bottom }}>
            <button
              type="button"
              disabled={!pwFull}
              onPointerDown={(e) => {
                e.preventDefault()
                gameRef.current?.power()
              }}
              className="mb-14 grid h-14 w-14 place-items-center rounded-full text-[10px] font-black"
              style={{
                background: pwFull ? "linear-gradient(135deg, #ffb347, #8a5cff)" : MM.surface,
                border: `1.5px solid ${pwFull ? "#ffd27a" : MM.border}`,
                color: pwFull ? "#fff" : MM.disabledText,
                boxShadow: pwFull ? "0 0 16px 4px rgba(255,170,60,.7)" : undefined,
              }}
            >
              <Sparkles className="h-5 w-5" />
              {t("laminasBtnPower", "PODER")}
            </button>
            <button
              type="button"
              onPointerDown={(e) => {
                e.preventDefault()
                gameRef.current?.dodge()
              }}
              className="grid h-16 w-16 place-items-center rounded-full text-[11px] font-black"
              style={{ background: MM.surface, border: `1.5px solid ${MM.borderStrong}`, color: MM.text }}
            >
              <Shield className="h-6 w-6" />
              {t("laminasBtnDodge", "ESQUIVAR")}
            </button>
            <button
              type="button"
              onPointerDown={(e) => {
                e.preventDefault()
                gameRef.current?.attack()
              }}
              className="mb-6 grid h-20 w-20 place-items-center rounded-full text-[12px] font-black"
              style={{ background: MM.rubyFill, border: `1.5px solid ${MM.rubyBorder}`, color: "#fff", boxShadow: MM.shadow }}
            >
              <Swords className="h-7 w-7" />
              {t("laminasBtnAttack", "ATACAR")}
            </button>
          </div>
        </>
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
