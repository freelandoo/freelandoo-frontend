"use client"

// features/meu-mundo/paint/ui/paint-view.tsx — PAINT (mm3d-35): a tela do jogo.
//
// Cobre o centro (que fica suspenso por baixo, como no jetpack). Três telas:
//  - MENU: Treinar (sozinho, no aparelho) ou 1×1 / 2×2 / 3×3 (sala).
//  - JOGO: a cena (paint-game.ts) com a HUD no molde do vídeo — corações em
//    cima à esquerda, gatinhos em cima à direita, mira no meio, as três cores
//    embaixo à direita. No celular: joystick à esquerda; à direita Pular,
//    Soco e as três cores em cima (apertar = atirar aquela cor).
//  - RESULTADO: quem deu mais dano no chefão, gatinhos de cada um.

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react"
import { ArrowBigUp, Cat, Crosshair, DoorOpen, Heart, Loader2, Sparkles, Swords, Trophy, User, Users, X } from "lucide-react"
import { useTranslations } from "@/components/i18n/I18nProvider"
import type { BodyId } from "../../types"
import { MM } from "../../ui/hud/tokens"
import { archivo } from "../../ui/status/evo-skin"
import { Joystick, SAFE } from "../../ui/meu-mundo-view"
import { createPaintGame, type PaintGameHandle, type PaintHud, type PaintNotice } from "../engine/paint-game"
import { LocalPort, type PaintPort } from "../engine/port"
import { PAINT_COLORS, TUNING, type PaintColor, type PaintMode } from "../sim/tuning"

export type PaintJoin = (mode: Exclude<PaintMode, "solo">, signal: AbortSignal) => Promise<PaintPort | null>

export interface PaintViewProps {
  body: BodyId
  onExit: () => void
  /** Sala multiplayer (S4). Sem ela, só o treino. */
  join?: PaintJoin
}

type Stage = { kind: "menu" } | { kind: "joining"; mode: Exclude<PaintMode, "solo"> } | { kind: "game"; port: PaintPort; key: number }

const COLOR_KEYS = ["paintColorBridge", "paintColorHarm", "paintColorStep"] as const
const COLOR_FALLBACK = ["Ponte", "Dano", "Degrau"]

export function PaintView({ body, onExit, join }: PaintViewProps) {
  const t = useTranslations("MeuMundo")
  const [stage, setStage] = useState<Stage>({ kind: "menu" })
  const [error, setError] = useState<string | null>(null)
  const seq = useRef(0)

  const play = useCallback(
    async (mode: PaintMode) => {
      setError(null)
      if (mode === "solo") {
        setStage({ kind: "game", port: new LocalPort(), key: ++seq.current })
        return
      }
      if (!join) return
      setStage({ kind: "joining", mode })
      const ac = new AbortController()
      try {
        const port = await join(mode, ac.signal)
        if (!port) {
          setError(t("paintJoinFail", "A sala não abriu agora. Tente de novo ou treine sozinho."))
          setStage({ kind: "menu" })
          return
        }
        setStage({ kind: "game", port, key: ++seq.current })
      } catch {
        setError(t("paintJoinFail", "A sala não abriu agora. Tente de novo ou treine sozinho."))
        setStage({ kind: "menu" })
      }
    },
    [join, t],
  )

  return (
    <div className={`fixed inset-0 z-[70] touch-none select-none overflow-hidden ${archivo.className}`} style={{ background: "#e6edf3" }}>
      {stage.kind === "game" ? (
        <PaintGameScreen key={stage.key} port={stage.port} body={body} onLeave={() => setStage({ kind: "menu" })} />
      ) : (
        <PaintMenu
          joining={stage.kind === "joining" ? stage.mode : null}
          versus={!!join}
          error={error}
          onPlay={play}
          onExit={onExit}
        />
      )}
    </div>
  )
}

// ═══ menu ════════════════════════════════════════════════════════════════════

function PaintMenu({
  joining,
  versus,
  error,
  onPlay,
  onExit,
}: {
  joining: PaintMode | null
  versus: boolean
  error: string | null
  onPlay: (m: PaintMode) => void
  onExit: () => void
}) {
  const t = useTranslations("MeuMundo")
  const modes: { mode: PaintMode; icon: ReactNode; title: string; sub: string }[] = [
    { mode: "solo", icon: <User className="h-5 w-5" />, title: t("paintModeSolo", "Treinar"), sub: t("paintModeSoloSub", "Sozinho, no seu ritmo") },
    { mode: "1v1", icon: <Swords className="h-5 w-5" />, title: "1 × 1", sub: t("paintMode1Sub", "Um contra um") },
    { mode: "2v2", icon: <Users className="h-5 w-5" />, title: "2 × 2", sub: t("paintMode2Sub", "Duplas") },
    { mode: "3v3", icon: <Users className="h-5 w-5" />, title: "3 × 3", sub: t("paintMode3Sub", "Times de três") },
  ]
  return (
    <div className="absolute inset-0 flex items-center justify-center overflow-y-auto p-4" style={{ background: "linear-gradient(180deg, #e9f0f6 0%, #f4ece0 100%)" }}>
      <div className="w-full max-w-[520px] rounded-[22px] p-5 text-left max-[759px]:p-4" style={{ background: MM.surface, color: MM.text, boxShadow: MM.shadow, border: `1px solid ${MM.border}` }}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-1.5">
              {PAINT_COLORS.map((c) => (
                <span key={c} className="inline-block h-3 w-3 rounded-full" style={{ background: c }} />
              ))}
            </div>
            <h1 className="mt-2 text-[28px] font-extrabold leading-none tracking-tight max-[759px]:text-[24px]">PAINT</h1>
            <p className="mt-2 text-[14px] leading-snug" style={{ color: MM.muted }}>
              {t("paintPitch", "Suba pelas ilhas pintando o caminho, ache os gatinhos e abra o portal do chefão.")}
            </p>
          </div>
          <button type="button" aria-label={t("paintLeave", "Voltar ao centro")} onClick={onExit} className="grid h-10 w-10 shrink-0 place-items-center rounded-full" style={{ background: MM.card, border: `1px solid ${MM.border}` }}>
            <X className="h-5 w-5" />
          </button>
        </div>

        <ul className="mt-4 grid grid-cols-3 gap-2 text-[12.5px] leading-snug max-[759px]:grid-cols-1" style={{ color: MM.muted }}>
          {([0, 1, 2] as PaintColor[]).map((c) => (
            <li key={c} className="flex items-start gap-2 rounded-[12px] p-2.5" style={{ background: MM.card }}>
              <Bubble c={c} size={22} />
              <span>
                <b style={{ color: MM.text }}>{t(COLOR_KEYS[c], COLOR_FALLBACK[c])}</b>
                <br />
                {c === 0
                  ? t("paintHowBridge", "Segure mirando o vão: a ponte cresce.")
                  : c === 1
                    ? t("paintHowHarm", "Tira coração do outro time e apaga a tinta dele.")
                    : t("paintHowStep", "Pule e atire no pé: degrau embaixo de você.")}
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-2 text-[12.5px] leading-snug" style={{ color: MM.muted }}>
          {t("paintHowGoal", "20 gatinhos do seu time abrem o portal no topo. Na ilha do chefão, vence quem der mais dano.")}
        </p>

        <div className="mt-4 grid grid-cols-2 gap-2">
          {modes.map((m) => {
            const busy = joining === m.mode
            const off = (m.mode !== "solo" && !versus) || (!!joining && !busy)
            return (
              <button
                key={m.mode}
                type="button"
                disabled={off}
                onClick={() => onPlay(m.mode)}
                className="flex min-h-[64px] items-center gap-3 rounded-[14px] px-3.5 text-left transition-transform active:scale-[0.98]"
                style={{
                  background: m.mode === "solo" ? MM.rubyFill : MM.card,
                  border: `1px solid ${m.mode === "solo" ? MM.rubyBorder : MM.border}`,
                  color: off ? MM.disabledText : MM.text,
                }}
              >
                <span className="shrink-0" style={{ color: m.mode === "solo" ? "#fff" : MM.gold }}>
                  {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : m.icon}
                </span>
                <span>
                  <span className="block text-[16px] font-bold leading-tight">{m.title}</span>
                  <span className="block text-[12px] leading-tight" style={{ color: off ? MM.disabledText : MM.muted }}>
                    {busy ? t("paintJoining", "Procurando sala…") : m.mode !== "solo" && !versus ? t("paintSoon", "Em breve") : m.sub}
                  </span>
                </span>
              </button>
            )
          })}
        </div>
        {error && (
          <p role="alert" className="mt-3 text-[13px]" style={{ color: MM.danger }}>
            {error}
          </p>
        )}
      </div>
    </div>
  )
}

/** Bolha de tinta brilhante (botão e legenda), como as do vídeo. */
function Bubble({ c, size, ring }: { c: PaintColor; size: number; ring?: boolean }) {
  const col = PAINT_COLORS[c]
  return (
    <span
      aria-hidden
      className="relative inline-block shrink-0 rounded-full"
      style={{
        width: size,
        height: size,
        background: `radial-gradient(circle at 34% 30%, rgba(255,255,255,0.95) 0 9%, ${col} 32%, ${col} 62%, rgba(0,0,0,0.28) 100%)`,
        boxShadow: ring ? `0 0 0 3px rgba(255,255,255,0.9), 0 0 0 6px ${col}66, 0 4px 12px rgba(0,0,0,0.25)` : "0 3px 8px rgba(0,0,0,0.22)",
      }}
    />
  )
}

// ═══ jogo ════════════════════════════════════════════════════════════════════

function fmtTime(s: number) {
  const m = Math.floor(s / 60)
  const r = Math.floor(s % 60)
  return `${m}:${String(r).padStart(2, "0")}`
}

function PaintGameScreen({ port, body, onLeave }: { port: PaintPort; body: BodyId; onLeave: () => void }) {
  const t = useTranslations("MeuMundo")
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const gameRef = useRef<PaintGameHandle | null>(null)
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading")
  const [hud, setHud] = useState<PaintHud | null>(null)
  const [toast, setToast] = useState<{ text: string; tone: "ok" | "bad" | "gold"; id: number } | null>(null)
  const [hurt, setHurt] = useState(0)
  const [isTouch] = useState(() => typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches)
  const toastSeq = useRef(0)
  const textRef = useRef(t)
  useEffect(() => {
    textRef.current = t
  }, [t])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    let alive = true
    let timer: ReturnType<typeof setTimeout> | null = null
    const say = (text: string, tone: "ok" | "bad" | "gold" = "ok") => {
      const id = ++toastSeq.current
      setToast({ text, tone, id })
      if (timer) clearTimeout(timer)
      timer = setTimeout(() => alive && setToast((cur) => (cur?.id === id ? null : cur)), 2200)
    }
    const onNotice = (n: PaintNotice) => {
      if (!alive) return
      const tt = textRef.current
      switch (n.kind) {
        case "cat":
          if (n.mine) say(tt("paintToastCat", "Gatinho! {n}/{k}").replace("{n}", String(port.state.teamCats[n.team])).replace("{k}", String(TUNING.catsToPortal)), "gold")
          break
        case "capsule":
          say(tt("paintToastCapsule", "+{n} {cor}").replace("{n}", String(TUNING.capsuleGive)).replace("{cor}", tt(COLOR_KEYS[n.c], COLOR_FALLBACK[n.c])))
          break
        case "empty":
          say(tt("paintToastEmpty", "Sem tinta de {cor} — pegue uma cápsula").replace("{cor}", tt(COLOR_KEYS[n.c], COLOR_FALLBACK[n.c])), "bad")
          break
        case "hurt":
          setHurt((h) => h + 1)
          try {
            navigator.vibrate?.(n.how === "punch" ? 90 : 50)
          } catch {
            /* sem vibração */
          }
          break
        case "ko":
          say(tt("paintToastKo", "Nocaute! Voltando à base…"), "bad")
          break
        case "portal":
          say(n.mine ? tt("paintToastPortalMine", "Portal aberto! Suba ao topo da sua torre") : tt("paintToastPortalOther", "O outro time abriu o portal!"), n.mine ? "gold" : "bad")
          break
        case "enterBoss":
          say(tt("paintToastBoss", "Ilha do chefão: dano com vermelho e soco!"), "gold")
          break
        case "fell":
          say(tt("paintToastFell", "Caiu nas nuvens — de volta à base"), "bad")
          break
        default:
          break
      }
    }
    try {
      gameRef.current = createPaintGame({
        canvas,
        port,
        body,
        touch: isTouch,
        onReady: () => alive && setStatus("ready"),
        onHud: (h) => alive && setHud(h),
        onNotice,
        onError: () => alive && setStatus("error"),
      })
    } catch (err) {
      console.error("[paint] falha ao abrir", err)
      setStatus("error")
    }
    return () => {
      alive = false
      if (timer) clearTimeout(timer)
      gameRef.current?.dispose()
      gameRef.current = null
    }
  }, [port, body, isTouch])

  const ended = hud?.phase === "end" && !!hud.result
  useEffect(() => {
    gameRef.current?.setBlocked(ended)
  }, [ended])

  return (
    <>
      <canvas ref={canvasRef} className="block h-full w-full outline-none" style={{ touchAction: "none" }} aria-label={t("paintAria", "Jogo Paint")} />

      {status === "ready" && hud && (
        <>
          <Hud hud={hud} touch={isTouch} hurt={hurt} onLeave={onLeave} />
          {isTouch ? <TouchControls gameRef={gameRef} hud={hud} /> : <DesktopColors hud={hud} onPick={(c) => gameRef.current?.selectColor(c)} />}
          {toast && (
            <div className="pointer-events-none absolute left-1/2 -translate-x-1/2" style={{ top: "calc(max(12px, env(safe-area-inset-top)) + 64px)" }}>
              <div
                key={toast.id}
                role="status"
                className="rounded-full px-4 py-2 text-[14px] font-bold shadow-lg max-[759px]:text-[13px]"
                style={{
                  background: toast.tone === "bad" ? "rgba(110, 16, 34, 0.9)" : toast.tone === "gold" ? "rgba(70, 52, 12, 0.88)" : MM.surface,
                  color: toast.tone === "gold" ? "#FFE3A0" : MM.text,
                  border: `1px solid ${toast.tone === "gold" ? MM.goldBorder : MM.border}`,
                }}
              >
                {toast.text}
              </div>
            </div>
          )}
          {ended && hud.result && <Results hud={hud} port={port} onAgain={onLeave} />}
        </>
      )}

      {status !== "ready" && (
        <div className="absolute inset-0 grid place-items-center" style={{ background: "linear-gradient(180deg, #e9f0f6 0%, #f4ece0 100%)" }}>
          <div className="flex flex-col items-center gap-3 text-center" style={{ color: "#4a3f33" }}>
            {status === "loading" ? (
              <>
                <Loader2 className="h-7 w-7 animate-spin" />
                <span className="text-[15px] font-semibold">{t("paintLoading", "Preparando as ilhas…")}</span>
              </>
            ) : (
              <>
                <span className="text-[16px] font-bold">{t("paintErrorTitle", "O Paint não abriu")}</span>
                <span className="max-w-[320px] text-[13px]">{t("errorDesc", "O navegador não conseguiu iniciar o 3D. Tente de novo; se continuar, volte ao perfil.")}</span>
                <button type="button" onClick={onLeave} className="mt-1 rounded-full px-4 py-2 text-[14px] font-bold text-white" style={{ background: MM.rubyFill }}>
                  {t("paintBackMenu", "Voltar ao menu")}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}

function Hud({ hud, touch, hurt, onLeave }: { hud: PaintHud; touch: boolean; hurt: number; onLeave: () => void }) {
  const t = useTranslations("MeuMundo")
  const goal = TUNING.catsToPortal
  const mine = hud.teamCats[hud.myTeam]
  const other = hud.teams > 1 ? hud.teamCats[1 - hud.myTeam] : null
  return (
    <>
      {/* corações */}
      <div key={hurt} className="pointer-events-none absolute flex items-center gap-1" style={{ top: SAFE.top, left: SAFE.left }}>
        {Array.from({ length: TUNING.hearts }, (_, i) => (
          <Heart
            key={i}
            className="h-7 w-7 drop-shadow max-[759px]:h-6 max-[759px]:w-6"
            strokeWidth={2.2}
            style={{ color: i < hud.hp ? "#C8203F" : "rgba(80,60,50,0.45)", fill: i < hud.hp ? "#E0284A" : "rgba(255,255,255,0.55)" }}
          />
        ))}
      </div>

      {/* tempo / contagem / chefão */}
      <div className="pointer-events-none absolute left-1/2 flex -translate-x-1/2 flex-col items-center gap-1.5" style={{ top: SAFE.top }}>
        {hud.phase === "play" && (
          <span className="rounded-full px-3 py-1 text-[14px] font-bold tabular-nums" style={{ background: "rgba(255,255,255,0.78)", color: "#3b3127" }}>
            {fmtTime(hud.timeLeft)}
          </span>
        )}
        {hud.inBoss && (
          <div className="w-[min(320px,60vw)]">
            <div className="h-3 overflow-hidden rounded-full" style={{ background: "rgba(0,0,0,0.25)" }}>
              <div className="h-full rounded-full" style={{ width: `${(hud.bossHp / TUNING.bossHp) * 100}%`, background: "linear-gradient(90deg, #9E1B2B, #E0284A)" }} />
            </div>
            <div className="mt-1 text-center text-[12px] font-bold" style={{ color: "#3b3127" }}>
              {t("paintYourDamage", "Seu dano: {n}").replace("{n}", String(hud.dmg))}
            </div>
          </div>
        )}
      </div>

      {/* gatinhos */}
      <div className="absolute flex items-start gap-2" style={{ top: SAFE.top, right: SAFE.right }}>
        <div className="pointer-events-none flex flex-col items-end gap-1">
          <CatCount label={hud.teams > 1 ? t("paintYourTeam", "Seu time") : null} n={mine} goal={goal} open={hud.portalOpen} />
          {other !== null && <CatCount label={t("paintOtherTeam", "Outro time")} n={other} goal={goal} open={false} dim />}
          {hud.portalOpen && !hud.inBoss && (
            <span className="flex items-center gap-1 rounded-full px-2.5 py-1 text-[12px] font-bold" style={{ background: "rgba(70, 52, 12, 0.85)", color: "#FFE3A0" }}>
              <Sparkles className="h-3.5 w-3.5" /> {t("paintPortalOpen", "Portal aberto no topo")}
            </span>
          )}
        </div>
        <button
          type="button"
          aria-label={t("paintBackMenu", "Voltar ao menu")}
          onClick={onLeave}
          className="grid h-10 w-10 place-items-center rounded-full"
          style={{ background: "rgba(255,255,255,0.78)", color: "#3b3127", boxShadow: MM.shadowSoft }}
        >
          <DoorOpen className="h-5 w-5" />
        </button>
      </div>

      {/* mira */}
      <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
        <Crosshair className="h-7 w-7" strokeWidth={1.6} style={{ color: "rgba(255,255,255,0.95)", filter: "drop-shadow(0 0 2px rgba(0,0,0,0.6))" }} />
      </div>

      {/* contagem */}
      {hud.phase === "countdown" && (
        <div className="pointer-events-none absolute inset-0 grid place-items-center">
          <span className="text-[96px] font-black leading-none text-white" style={{ textShadow: "0 6px 24px rgba(0,0,0,0.35)" }}>
            {Math.ceil(hud.countdown) || t("paintGo", "VAI!")}
          </span>
        </div>
      )}

      {/* nocaute */}
      {hud.ko > 0 && (
        <div className="pointer-events-none absolute inset-0 grid place-items-center" style={{ background: "rgba(120, 10, 30, 0.18)" }}>
          <span className="rounded-full px-5 py-2.5 text-[18px] font-black text-white" style={{ background: "rgba(110, 16, 34, 0.9)" }}>
            {t("paintKo", "Nocaute · {n}").replace("{n}", String(Math.ceil(hud.ko)))}
          </span>
        </div>
      )}

      {/* computador: clique para mirar */}
      {!touch && !hud.locked && hud.phase !== "end" && (
        <div className="pointer-events-none absolute left-1/2 -translate-x-1/2" style={{ bottom: "calc(max(16px, env(safe-area-inset-bottom)) + 12px)" }}>
          <span className="rounded-full px-4 py-2 text-[13px] font-semibold" style={{ background: MM.surface, color: MM.text }}>
            {t("paintClickToAim", "Clique no jogo para mirar · WASD anda · Espaço pula · F soco · 1/2/3 cor · Esc solta o mouse")}
          </span>
        </div>
      )}
    </>
  )
}

function CatCount({ label, n, goal, open, dim }: { label: string | null; n: number; goal: number; open: boolean; dim?: boolean }) {
  return (
    <div className="flex items-center gap-2 rounded-full py-1 pl-2 pr-3" style={{ background: dim ? "rgba(255,255,255,0.6)" : "rgba(255,255,255,0.86)", boxShadow: MM.shadowSoft, color: "#3b3127" }}>
      <span className="grid h-7 w-7 place-items-center rounded-full" style={{ background: open ? "#F2C230" : "#efe4d2" }}>
        <Cat className="h-4 w-4" />
      </span>
      {label && <span className="text-[11px] font-semibold uppercase tracking-wide opacity-70">{label}</span>}
      <span className="text-[15px] font-extrabold tabular-nums">
        {Math.min(n, 99)}
        <span className="opacity-50">/{goal}</span>
      </span>
    </div>
  )
}

function DesktopColors({ hud, onPick }: { hud: PaintHud; onPick: (c: PaintColor) => void }) {
  const t = useTranslations("MeuMundo")
  return (
    <div className="absolute flex items-end gap-3" style={{ bottom: SAFE.bottom, right: SAFE.right }}>
      {([0, 1, 2] as PaintColor[]).map((c) => {
        const on = hud.color === c
        return (
          <button key={c} type="button" onClick={() => onPick(c)} className="flex flex-col items-center gap-1" aria-label={t(COLOR_KEYS[c], COLOR_FALLBACK[c])}>
            <span className="text-[12px] font-bold tabular-nums" style={{ color: hud.ammo[c] < TUNING.cost[c] ? "#C8203F" : "#3b3127" }}>
              {hud.ammo[c]}
            </span>
            <Bubble c={c} size={on ? 58 : 46} ring={on} />
            <span className="text-[12px] font-bold" style={{ color: "#3b3127" }}>
              {c + 1}
            </span>
          </button>
        )
      })}
    </div>
  )
}

function TouchControls({ gameRef, hud }: { gameRef: React.RefObject<PaintGameHandle | null>; hud: PaintHud }) {
  const t = useTranslations("MeuMundo")
  const hold = (c: PaintColor) => ({
    onPointerDown: (e: React.PointerEvent) => {
      e.currentTarget.setPointerCapture(e.pointerId)
      gameRef.current?.setFiring(c)
    },
    onPointerUp: () => gameRef.current?.setFiring(null),
    onPointerCancel: () => gameRef.current?.setFiring(null),
  })
  const bottom = (px: number) => `calc(max(16px, env(safe-area-inset-bottom)) + ${px}px)`
  return (
    <>
      <Joystick gameRef={gameRef} />
      <div className="absolute flex items-end gap-2.5" style={{ bottom: bottom(118), right: SAFE.right }}>
        {([0, 1, 2] as PaintColor[]).map((c) => (
          <button key={c} type="button" className="flex flex-col items-center gap-0.5" style={{ touchAction: "none" }} aria-label={t(COLOR_KEYS[c], COLOR_FALLBACK[c])} {...hold(c)}>
            <Bubble c={c} size={hud.firing === c ? 60 : 54} ring={hud.firing === c} />
            <span className="rounded-full px-1.5 text-[11px] font-bold tabular-nums" style={{ background: "rgba(255,255,255,0.75)", color: hud.ammo[c] < TUNING.cost[c] ? "#C8203F" : "#3b3127" }}>
              {hud.ammo[c]}
            </span>
          </button>
        ))}
      </div>
      <div className="absolute flex items-end gap-3" style={{ bottom: bottom(14), right: SAFE.right }}>
        <button
          type="button"
          aria-label={t("paintPunch", "Soco")}
          onPointerDown={() => gameRef.current?.punch()}
          className="grid h-[60px] w-[60px] place-items-center rounded-full text-[24px]"
          style={{ background: "rgba(255,255,255,0.82)", boxShadow: MM.shadowSoft, touchAction: "none" }}
        >
          <span aria-hidden>👊</span>
        </button>
        <button
          type="button"
          aria-label={t("paintJump", "Pular")}
          onPointerDown={() => gameRef.current?.jump()}
          className="grid h-[84px] w-[84px] place-items-center rounded-full text-white"
          style={{ background: MM.rubyFill, border: `1px solid ${MM.rubyBorder}`, boxShadow: MM.shadow, touchAction: "none" }}
        >
          <ArrowBigUp className="h-10 w-10" />
        </button>
      </div>
    </>
  )
}

function Results({ hud, port, onAgain }: { hud: PaintHud; port: PaintPort; onAgain: () => void }) {
  const t = useTranslations("MeuMundo")
  const r = hud.result!
  const rows = [...r.rows].sort((a, b) => b.dmg - a.dmg || b.cats - a.cats)
  const won = r.winnerSlot === port.me || (r.winnerSlot < 0 && r.winnerTeam === hud.myTeam)
  const name = (slot: number) => (slot === port.me ? t("paintYou", "Você") : (port.info(slot)?.name ?? t("paintPlayer", "Jogador")))
  return (
    <div className="absolute inset-0 grid place-items-center p-4" style={{ background: MM.scrim }}>
      <div className="w-full max-w-[420px] rounded-[20px] p-5" style={{ background: MM.surface, color: MM.text, border: `1px solid ${MM.border}`, boxShadow: MM.shadow }}>
        <div className="flex items-center gap-2" style={{ color: MM.gold }}>
          <Trophy className="h-5 w-5" />
          <span className="text-[12px] font-bold uppercase tracking-wider">{t("paintResults", "Resultado")}</span>
        </div>
        <h2 className="mt-1 text-[24px] font-extrabold leading-tight">
          {port.mode === "solo"
            ? hud.bossHp <= 0
              ? t("paintSoloBossDown", "Chefão derrotado!")
              : t("paintSoloTime", "Tempo esgotado")
            : won
              ? t("paintWin", "Vitória!")
              : r.winnerTeam < 0
                ? t("paintDraw", "Empate")
                : t("paintLose", "Não foi desta vez")}
        </h2>
        <ul className="mt-3 flex flex-col gap-1.5">
          {rows.map((row) => (
            <li
              key={row.slot}
              className="flex items-center justify-between rounded-[12px] px-3 py-2 text-[14px]"
              style={{ background: row.slot === r.winnerSlot ? MM.rubySoft : MM.card, border: `1px solid ${row.slot === r.winnerSlot ? MM.rubyBorder : MM.border}` }}
            >
              <span className="font-semibold">
                {name(row.slot)}
                {port.mode !== "solo" && (
                  <span className="ml-2 text-[11px] font-bold uppercase" style={{ color: MM.muted }}>
                    {row.team === hud.myTeam ? t("paintYourTeam", "Seu time") : t("paintOtherTeam", "Outro time")}
                  </span>
                )}
              </span>
              <span className="flex items-center gap-3 tabular-nums" style={{ color: MM.muted }}>
                <span className="flex items-center gap-1">
                  <Cat className="h-4 w-4" />
                  {row.cats}
                </span>
                <span className="font-bold" style={{ color: MM.text }}>
                  {t("paintDamageShort", "{n} de dano").replace("{n}", String(row.dmg))}
                </span>
              </span>
            </li>
          ))}
        </ul>
        <button type="button" onClick={onAgain} className="mt-4 w-full rounded-[14px] py-3 text-[15px] font-bold text-white" style={{ background: MM.rubyFill, border: `1px solid ${MM.rubyBorder}` }}>
          {t("paintBackMenu", "Voltar ao menu")}
        </button>
      </div>
    </div>
  )
}
