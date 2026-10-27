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
import { ArrowBigUp, Cat, DoorOpen, Droplet, Loader2, Sparkles, Swords, Trophy, User, Users, X } from "lucide-react"
import { useTranslations } from "@/components/i18n/I18nProvider"
import type { BodyId } from "../../types"
import { MM } from "../../ui/hud/tokens"
import { archivo } from "../../ui/status/evo-skin"
import { Joystick, SAFE } from "../../ui/meu-mundo-view"
import { createPaintGame, type PaintGameHandle, type PaintHud, type PaintNotice } from "../engine/paint-game"
import { LocalPort, type PaintPort } from "../engine/port"
import { CAT_ASSETS } from "../engine/cat-herd"
import { PAINT_COLORS, TUNING, type PaintColor, type PaintMode } from "../sim/tuning"

export type PaintNetStatus = "connecting" | "online" | "reconnecting" | "replaced" | "offline"
export type PaintJoin = (
  mode: Exclude<PaintMode, "solo">,
  hooks: { signal: AbortSignal; onLobby: (n: number, cap: number) => void; onStatus: (s: PaintNetStatus) => void },
) => Promise<PaintPort | null>

export interface PaintViewProps {
  body: BodyId
  /** Cores do personagem (mm3d-36). */
  look?: string
  onExit: () => void
  /** Sala multiplayer (S4). Sem ela, só o treino. */
  join?: PaintJoin
}

type Stage =
  | { kind: "menu" }
  | { kind: "joining"; mode: Exclude<PaintMode, "solo">; ac: AbortController }
  | { kind: "game"; port: PaintPort; key: number }

const COLOR_KEYS = ["paintColorBridge", "paintColorHarm", "paintColorStep"] as const
const COLOR_FALLBACK = ["Ponte", "Dano", "Cama elástica"]

export function PaintView({ body, look = "", onExit, join }: PaintViewProps) {
  const t = useTranslations("MeuMundo")
  const [stage, setStage] = useState<Stage>({ kind: "menu" })
  const [error, setError] = useState<string | null>(null)
  const [lobby, setLobby] = useState<{ n: number; cap: number } | null>(null)
  const [net, setNet] = useState<PaintNetStatus>("online")
  const seq = useRef(0)

  const play = useCallback(
    async (mode: PaintMode) => {
      setError(null)
      if (mode === "solo") {
        setStage({ kind: "game", port: new LocalPort(), key: ++seq.current })
        return
      }
      if (!join) return
      const ac = new AbortController()
      setStage({ kind: "joining", mode, ac })
      setLobby(null)
      setNet("online")
      try {
        const port = await join(mode, { signal: ac.signal, onLobby: (n, cap) => setLobby({ n, cap }), onStatus: setNet })
        if (ac.signal.aborted) {
          port?.dispose()
          return
        }
        if (!port) {
          setError(t("paintJoinFail", "A sala não abriu agora. Tente de novo ou treine sozinho."))
          setStage({ kind: "menu" })
          return
        }
        setStage({ kind: "game", port, key: ++seq.current })
      } catch {
        if (ac.signal.aborted) return
        setError(t("paintJoinFail", "A sala não abriu agora. Tente de novo ou treine sozinho."))
        setStage({ kind: "menu" })
      }
    },
    [join, t],
  )

  return (
    <div className={`fixed inset-0 z-[70] touch-none select-none overflow-hidden ${archivo.className}`} style={{ background: "#e6edf3" }}>
      {stage.kind === "game" ? (
        <PaintGameScreen key={stage.key} port={stage.port} body={body} look={look} net={stage.port.mode === "solo" ? "online" : net} onLeave={() => setStage({ kind: "menu" })} />
      ) : (
        <PaintMenu
          joining={stage.kind === "joining" ? stage.mode : null}
          lobby={lobby}
          onCancel={() => {
            if (stage.kind !== "joining") return
            stage.ac.abort()
            setStage({ kind: "menu" })
          }}
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
  lobby,
  onCancel,
  versus,
  error,
  onPlay,
  onExit,
}: {
  joining: PaintMode | null
  lobby: { n: number; cap: number } | null
  onCancel: () => void
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
                    : t("paintHowStep", "Atire no chão (ou no pé, pulando): pise nela e seja lançado para cima.")}
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
                    {busy
                      ? lobby
                        ? t("paintWaiting", "Esperando jogadores {n}/{k}").replace("{n}", String(lobby.n)).replace("{k}", String(lobby.cap))
                        : t("paintJoining", "Procurando sala…")
                      : m.mode !== "solo" && !versus
                        ? t("paintSoon", "Em breve")
                        : m.sub}
                  </span>
                </span>
              </button>
            )
          })}
        </div>
        {joining && (
          <button type="button" onClick={onCancel} className="mt-3 w-full rounded-[14px] py-2.5 text-[14px] font-bold" style={{ background: MM.card, border: `1px solid ${MM.border}`, color: MM.text }}>
            {t("paintCancel", "Cancelar")}
          </button>
        )}
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

function PaintGameScreen({ port, body, look, net, onLeave }: { port: PaintPort; body: BodyId; look: string; net: PaintNetStatus; onLeave: () => void }) {
  const t = useTranslations("MeuMundo")
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const gameRef = useRef<PaintGameHandle | null>(null)
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading")
  const [hud, setHud] = useState<PaintHud | null>(null)
  const [toast, setToast] = useState<{ text: string; tone: "ok" | "bad" | "gold"; id: number } | null>(null)
  const [hurt, setHurt] = useState(0)
  // Tela de celular só em aparelho SÓ de toque: notebook com mouse e tela de
  // toque fica com a tela de PC (o mouse é a mira).
  const [isTouch, setIsTouch] = useState(() => typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches && !window.matchMedia("(any-pointer: fine)").matches)
  // o jogo nasce com o modo do aparelho; trocar a tela depois não recria a cena
  const touchAtStart = useRef(isTouch)
  // mexeu um mouse de verdade: tela de PC (o mouse é a mira)
  useEffect(() => {
    if (!isTouch) return
    const onMove = (e: PointerEvent) => e.pointerType === "mouse" && setIsTouch(false)
    window.addEventListener("pointermove", onMove)
    return () => window.removeEventListener("pointermove", onMove)
  }, [isTouch])
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
        case "steal":
          say(
            n.gained
              ? tt("paintToastStealGain", "Derrubou! +{n} gatinhos para você").replace("{n}", String(n.n))
              : tt("paintToastStealLoss", "Derrubaram você: perdeu {n} gatinhos").replace("{n}", String(n.n)),
            n.gained ? "gold" : "bad",
          )
          break
        case "fell":
          say(tt("paintToastFell", "Caiu nas nuvens — de volta à base"), "bad")
          break
        case "drop":
          say(tt("paintToastDrop", "Caiu nas nuvens: {n} gatinhos voltaram para o mapa").replace("{n}", String(n.n)), "bad")
          break
        case "bossAct":
          if (n.act === "slam") say(tt("paintToastBossSlam", "Tapa no chão — pule!"), "bad")
          else if (n.act === "roar") say(tt("paintToastBossRoar", "O chefão rugiu!"), "bad")
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
        look,
        touch: touchAtStart.current,
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
  }, [port, body, look])

  const ended = hud?.phase === "end" && !!hud.result
  useEffect(() => {
    gameRef.current?.setBlocked(ended)
  }, [ended])

  return (
    <>
      <canvas
        ref={canvasRef}
        className="block h-full w-full outline-none"
        style={{ touchAction: "none" }}
        aria-label={t("paintAria", "Jogo Paint")}
      />

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
          {!ended && net !== "online" && net !== "connecting" && (
            <div className="absolute inset-x-0 grid place-items-center" style={{ top: "calc(max(12px, env(safe-area-inset-top)) + 110px)" }}>
              <div className="flex items-center gap-2 rounded-full px-4 py-2 text-[13px] font-bold" style={{ background: MM.surface, color: MM.text }}>
                {net === "reconnecting" && <Loader2 className="h-4 w-4 animate-spin" />}
                {net === "reconnecting"
                  ? t("paintReconnecting", "Reconectando…")
                  : net === "replaced"
                    ? t("paintReplaced", "Aberto em outra janela")
                    : t("paintOffline", "Sem conexão com a sala")}
                {net !== "reconnecting" && (
                  <button type="button" onClick={onLeave} className="ml-1 rounded-full px-2.5 py-1 text-[12px]" style={{ background: MM.rubyFill }}>
                    {t("paintBackMenu", "Voltar ao menu")}
                  </button>
                )}
              </div>
            </div>
          )}
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
      {/* sangue (mm3d-38: barra no lugar dos corações) */}
      <div
        key={hurt}
        role="meter"
        aria-label={t("paintBlood", "Sangue")}
        aria-valuemin={0}
        aria-valuemax={TUNING.hpMax}
        aria-valuenow={hud.hp}
        className="pointer-events-none absolute flex items-center gap-1.5"
        style={{ top: SAFE.top, left: SAFE.left }}
      >
        <Droplet className="h-6 w-6 drop-shadow max-[759px]:h-5 max-[759px]:w-5" strokeWidth={2.2} style={{ color: "#C8203F", fill: "#E0284A" }} />
        <div className="overflow-hidden rounded-full" style={{ height: 14, width: "min(180px, 34vw)", background: "rgba(255,255,255,0.55)", boxShadow: "inset 0 0 0 1.5px rgba(80,60,50,0.45)" }}>
          <div
            className="h-full rounded-full"
            style={{ transition: "width 200ms", width: `${(hud.hp / TUNING.hpMax) * 100}%`, background: hud.hp <= TUNING.hpMax * 0.3 ? "linear-gradient(90deg, #7a0f1e, #C8203F)" : "linear-gradient(90deg, #9E1B2B, #E0284A)" }}
          />
        </div>
        <span className="text-[13px] font-bold tabular-nums drop-shadow" style={{ color: "#3b3127" }}>
          {hud.hp}
        </span>
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

      {/* como jogar: na contagem e nos primeiros segundos */}
      {(hud.phase === "countdown" || (hud.phase === "play" && hud.timeLeft > TUNING.matchTime - 12)) && (
        <div
          className="pointer-events-none absolute left-1/2 w-max max-w-[92vw] -translate-x-1/2 text-center"
          style={{ bottom: touch ? "calc(max(16px, env(safe-area-inset-bottom)) + 190px)" : "calc(max(16px, env(safe-area-inset-bottom)) + 12px)" }}
        >
          <span className="inline-block rounded-full px-4 py-2 text-[13px] font-semibold max-[759px]:text-[12px]" style={{ background: MM.surface, color: MM.text }}>
            {touch
              ? t("paintHelpTouch", "Arraste o dedo para mirar · toque e segure para atirar · as cores embaixo trocam a tinta")
              : t("paintHelpPc", "O mouse mira · botão esquerdo atira · E troca a cor · botão direito gira a câmera · Espaço pula · F soco")}
          </span>
        </div>
      )}
    </>
  )
}

/** Card dos gatinhos (mm3d-35k): a foto do gatinho e o número grande; pula a cada gatinho novo. */
function CatCount({ label, n, goal, open, dim }: { label: string | null; n: number; goal: number; open: boolean; dim?: boolean }) {
  const num = useRef<HTMLSpanElement>(null)
  const last = useRef(n)
  useEffect(() => {
    if (n > last.current) num.current?.animate([{ transform: "scale(1.45)" }, { transform: "scale(1)" }], { duration: 380, easing: "cubic-bezier(.2,.9,.25,1)" })
    last.current = n
  }, [n])
  return (
    <div
      className={`flex items-center rounded-2xl ${dim ? "gap-2 p-1.5 pr-3" : "gap-3 p-2 pr-4 max-[759px]:gap-2 max-[759px]:p-1.5 max-[759px]:pr-3"}`}
      style={{ background: dim ? "rgba(255,255,255,0.62)" : "rgba(255,255,255,0.9)", boxShadow: open ? `0 0 0 3px #F2C230, ${MM.shadowSoft}` : MM.shadowSoft, color: "#3b3127" }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`${CAT_ASSETS}gatinho-card.webp`}
        alt=""
        draggable={false}
        className={`shrink-0 rounded-xl object-cover ${dim ? "h-9 w-9" : "h-16 w-16 max-[759px]:h-12 max-[759px]:w-12"}`}
      />
      <div className="flex flex-col items-start leading-none">
        {label && <span className="mb-1 text-[10px] font-semibold uppercase tracking-wide opacity-70">{label}</span>}
        <span className="flex items-baseline font-black tabular-nums">
          <span ref={num} className={`inline-block origin-center ${dim ? "text-[22px]" : "text-[44px] max-[759px]:text-[34px]"}`}>
            {Math.min(n, 99)}
          </span>
          <span className={`ml-0.5 opacity-45 ${dim ? "text-[13px]" : "text-[18px] max-[759px]:text-[15px]"}`}>/{goal}</span>
        </span>
      </div>
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
              {on ? "E" : c + 1}
            </span>
          </button>
        )
      })}
    </div>
  )
}

function TouchControls({ gameRef, hud }: { gameRef: React.RefObject<PaintGameHandle | null>; hud: PaintHud }) {
  const t = useTranslations("MeuMundo")
  const bottom = (px: number) => `calc(max(16px, env(safe-area-inset-bottom)) + ${px}px)`
  return (
    <>
      <Joystick gameRef={gameRef} />
      <div className="absolute flex items-end gap-2.5" style={{ bottom: bottom(118), right: SAFE.right }}>
        {([0, 1, 2] as PaintColor[]).map((c) => (
          <button key={c} type="button" className="flex flex-col items-center gap-0.5" style={{ touchAction: "none" }} aria-label={t(COLOR_KEYS[c], COLOR_FALLBACK[c])} aria-pressed={hud.color === c} onPointerDown={() => gameRef.current?.selectColor(c)}>
            <Bubble c={c} size={hud.color === c ? 60 : 50} ring={hud.color === c} />
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
