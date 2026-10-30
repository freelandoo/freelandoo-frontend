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

import { useCallback, useEffect, useRef, useState } from "react"
import { Shield, Swords, Volume2, VolumeX, X } from "lucide-react"
import { useTranslations } from "@/components/i18n/I18nProvider"
import { MM } from "../../ui/hud/tokens"
import { archivo } from "../../ui/status/evo-skin"
import { Joystick, SAFE } from "../../ui/meu-mundo-view"
import type { BodyId } from "../../types"
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
  stage?: "arena" | "ring"
}

const SAND = "#E9CF98"
const BRONZE = "#C98A45"
const VIOLET = "#B84DFF"
const BG = "radial-gradient(120% 90% at 50% 0%, #f7b267 0%, #b5502b 50%, #3a1a12 100%)"

type Choice = { kind: MobKind; level: number }

export function useMobName() {
  const t = useTranslations("MeuMundo")
  return useCallback(
    (k: MobKind) =>
      ({
        soldier: t("laminasMobSoldier", "Golem de Pedra"),
        wolf: t("laminasMobWolf", "Lobos de Ferrugem"),
        golem: t("laminasMobGolem", "Ciborgue"),
        harpy: t("laminasMobHarpy", "Dama das Garras"),
        brute: t("laminasMobBrute", "Brutamontes"),
      })[k],
    [t],
  )
}

export function LaminasView({ body, look, onExit, encounter, onEncounterEnd, stage = "arena" }: LaminasViewProps) {
  const [fight, setFight] = useState<{ key: number; choice: Choice } | null>(() => (encounter ? { key: 1, choice: { kind: encounter.kind, level: 1 } } : null))
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
          onEnd={(win) => {
            if (encounter && !reported.current) {
              reported.current = true
              onEncounterEnd?.(win)
            }
          }}
          onAgain={encounter ? undefined : () => start(fight.choice)}
          onMenu={encounter ? onExit : () => setFight(null)}
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
  const mobName = useMobName()
  const opts: { c: Choice; sub: string; tone: string }[] = [
    { c: { kind: "soldier", level: 1 }, sub: t("laminasLevel", "Nível {n}").replace("{n}", "1"), tone: "#C9A46A" },
    { c: { kind: "soldier", level: 2 }, sub: t("laminasLevel", "Nível {n}").replace("{n}", "2"), tone: "#B9BCC4" },
    { c: { kind: "wolf", level: 1 }, sub: t("laminasSubWolf", "Bando de 3, rápidos"), tone: "#C2693A" },
    { c: { kind: "golem", level: 1 }, sub: t("laminasSubGolem", "Lento, bate em área"), tone: "#8D95A3" },
    { c: { kind: "harpy", level: 1 }, sub: t("laminasSubHarpy", "Voa e mergulha"), tone: "#7C89A3" },
    { c: { kind: "brute", level: 1 }, sub: t("laminasSubBrute", "Elite: investida e pancada"), tone: VIOLET },
  ]
  return (
    <div className="absolute inset-0 flex items-center justify-center overflow-y-auto p-4" style={{ background: BG }}>
      <div className="w-full max-w-[600px] rounded-[26px] p-5 text-left max-[759px]:p-4 [@media(max-height:520px)]:p-3" style={{ background: MM.surface, color: MM.text, boxShadow: MM.shadow, border: `1px solid ${MM.border}` }}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-[12px] font-bold uppercase tracking-[0.18em]" style={{ color: BRONZE }}>
              {t("laminasKicker", "Os Jogos Eternos de Lúmen")}
            </div>
            <h1 className="mt-1.5 text-[32px] font-black italic leading-none tracking-tight max-[759px]:text-[26px]" style={{ color: SAND }}>
              {ring ? t("centerPlace_boxe", "Arena de Boxe") : t("laminasTitle", "Arena das Lâminas")}
            </h1>
            <p className="mt-2 text-[14px] leading-snug max-[759px]:text-[13px] [@media(max-height:520px)]:hidden" style={{ color: MM.muted }}>
              {t("laminasPitch", "Treine a espada contra a máquina. Quando o chão acender vermelho, o golpe vem ali: esquive e corte na brecha.")}
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
              className="flex flex-col items-start rounded-[16px] px-3 py-2.5 text-left transition-transform active:scale-[0.98]"
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
  onEnd,
  onAgain,
  onMenu,
}: {
  body: BodyId
  look?: string
  choice: Choice
  stage: "arena" | "ring"
  portal: boolean
  onEnd: (win: boolean) => void
  onAgain?: () => void
  onMenu: () => void
}) {
  const t = useTranslations("MeuMundo")
  const mobName = useMobName()
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

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    let alive = true
    let endTimer: ReturnType<typeof setTimeout> | null = null
    try {
      gameRef.current = createLaminasGame({
        canvas,
        body,
        look,
        setup: { kind: choice.kind, level: choice.level },
        stage,
        onReady: () => alive && setStatus("ready"),
        onHud: (h) => alive && setHud(h),
        onEnd: (win) => {
          endRef.current(win)
          endTimer = setTimeout(() => alive && setResult(win), 1400)
        },
        onError: () => alive && setStatus("error"),
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
  }, [body, look, choice, stage])

  // a passagem violeta do portal some quando a cena está pronta
  useEffect(() => {
    if (status !== "ready" || !veil) return
    const id = setTimeout(() => setVeil(false), 900)
    return () => clearTimeout(id)
  }, [status, veil])

  const hpPct = hud ? Math.max(0, hud.hp) : 100
  const stPct = hud ? Math.max(0, hud.stam) : 100
  return (
    <div className="absolute inset-0">
      <canvas ref={canvasRef} className="block h-full w-full outline-none" style={{ touchAction: "none" }} aria-label={t("laminasAria", "Arena das Lâminas")} />

      {/* inimigos */}
      {hud && (
        <div className="pointer-events-none absolute left-1/2 flex -translate-x-1/2 flex-col items-center gap-1" style={{ top: SAFE.top }}>
          <div className="text-[13px] font-black uppercase italic tracking-[0.14em]" style={{ color: SAND, textShadow: "0 2px 0 rgba(0,0,0,.4)" }}>
            {mobName(choice.kind)}
            {choice.kind === "soldier" ? ` · ${t("laminasLevel", "Nível {n}").replace("{n}", String(choice.level))}` : ""}
          </div>
          <div className="flex gap-1.5">
            {hud.mobs.map((m) => (
              <div key={m.id} className="h-3 overflow-hidden rounded-full" style={{ width: hud.mobs.length > 1 ? 110 : 280, background: "rgba(0,0,0,.45)", border: `1px solid ${MM.border}` }}>
                <div className="h-full rounded-full" style={{ width: `${(100 * m.hp) / m.hpMax}%`, background: `linear-gradient(90deg, ${VIOLET}, #7a2bd6)`, transition: "width 120ms linear" }} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* aviso de golpe */}
      {hud?.danger && !hud.over && (
        <div className="pointer-events-none absolute left-1/2 -translate-x-1/2 text-[22px] font-black italic tracking-wide" style={{ top: "calc(max(12px, env(safe-area-inset-top)) + 44px)", color: "#FF5A5A", textShadow: "0 2px 0 rgba(0,0,0,.45)" }}>
          {t("laminasDodge", "ESQUIVE!")}
        </div>
      )}

      {/* eu: vida e fôlego */}
      <div className="pointer-events-none absolute flex w-[min(52vw,260px)] flex-col gap-1" style={{ left: SAFE.left, top: isTouch ? SAFE.top : undefined, bottom: isTouch ? undefined : SAFE.bottom }}>
        <div className="h-4 overflow-hidden rounded-full" style={{ background: "rgba(0,0,0,.45)", border: `1px solid ${MM.border}` }}>
          <div className="h-full rounded-full" style={{ width: `${hpPct}%`, background: "linear-gradient(90deg, #ff5a6e, #c3123a)", transition: "width 120ms linear" }} />
        </div>
        <div className="h-2 overflow-hidden rounded-full" style={{ background: "rgba(0,0,0,.45)" }}>
          <div className="h-full rounded-full" style={{ width: `${stPct}%`, background: "linear-gradient(90deg, #ffe08a, #e5be70)" }} />
        </div>
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
                <button type="button" onClick={onMenu} className="mt-3 rounded-[14px] px-4 py-2 text-[15px] font-bold" style={{ background: MM.card, border: `1px solid ${MM.border}` }}>
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

      {/* fim */}
      {result !== null && (
        <div className="absolute inset-0 grid place-items-center p-4" style={{ background: "rgba(6,8,12,.55)" }}>
          <div className="w-full max-w-[380px] rounded-[24px] p-5 text-center" style={{ background: MM.surface, color: MM.text, border: `1px solid ${MM.border}`, boxShadow: MM.shadow }}>
            <h2 className="text-[30px] font-black italic" style={{ color: result ? "#FFD23F" : MM.danger }}>
              {result ? t("laminasWin", "VITÓRIA!") : t("laminasLose", "Você caiu")}
            </h2>
            <p className="mt-2 text-[14px]" style={{ color: MM.muted }}>
              {result
                ? portal
                  ? t("laminasWinPortal", "O monstro foi derrotado e sumiu da cidade.")
                  : t("laminasWinTrain", "Mais um treino vencido. Os Sete estão de olho.")
                : portal
                  ? t("laminasLosePortal", "O monstro continua na cidade. Volte quando estiver pronto.")
                  : t("laminasLoseTrain", "Leia o chão vermelho, esquive e corte na brecha.")}
            </p>
            <div className="mt-4 grid gap-2">
              {onAgain && (
                <button type="button" onClick={onAgain} className="rounded-[16px] px-3 py-3 text-[16px] font-black italic" style={{ background: MM.rubyFill, border: `1px solid ${MM.rubyBorder}`, color: "#fff" }}>
                  {t("laminasAgain", "Lutar de novo")}
                </button>
              )}
              <button type="button" onClick={onMenu} className="rounded-[16px] px-3 py-3 text-[15px] font-bold" style={{ background: MM.card, border: `1px solid ${MM.border}` }}>
                {portal ? t("laminasBackCity", "Voltar à cidade") : t("laminasBackMenu", "Escolher outro")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
