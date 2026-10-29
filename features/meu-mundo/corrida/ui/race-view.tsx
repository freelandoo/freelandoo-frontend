"use client"

// features/meu-mundo/corrida/ui/race-view.tsx — CORRIDA ANTIGRAVIDADE (mm3d-39): a tela.
//
// Cobre o centro (suspenso por baixo, como o jetpack e o Paint). Telas:
//  - GARAGEM (mm3d-49): a primeira — escolher a nave (holograma que
//    materializa, status). A escolha fica no aparelho e vai para a corrida.
//  - MENU: Sozinho (5 computadores), Multiplayer (mm3d-39b) ou Contra o relógio.
//  - ESPERA (multiplayer): a sala aguarda até 1 minuto por mais gente; quem
//    entrar corre junto e as vagas que sobram viram computador (6 naves).
//  - JOGO: a cena (race-game.ts) com a HUD no molde do vídeo do Alex —
//    posição e volta em cima à esquerda, tempo/melhor volta embaixo delas,
//    minimapa em cima à direita, velocímetro e cargas de turbo embaixo à
//    direita. Celular: joystick à esquerda (acelera sozinho; trás freia) e o
//    botão TURBO à direita. Turbo = linhas de velocidade na borda da tela.
//  - RESULTADO: a classificação, o tempo e o recorde do aparelho.

import { useCallback, useEffect, useRef, useState } from "react"
import { Bot, Flag, Flame, Loader2, Rocket, Timer, Trophy, Users, Volume2, VolumeX, WifiOff, X } from "lucide-react"
import { useTranslations } from "@/components/i18n/I18nProvider"
import { MM } from "../../ui/hud/tokens"
import { archivo } from "../../ui/status/evo-skin"
import { Joystick, SAFE } from "../../ui/meu-mundo-view"
import { createRaceGame, type RaceGameHandle, type RaceHud, type RaceMode, type RaceNotice } from "../engine/race-game"
import { DEFAULT_SHIP, SHIPS, TUNING } from "../sim/race"
import { shipArt } from "../engine/ship-art"
import { GarageView } from "./garage-view"
import type { CorridaNet, CorridaNetStatus, CorridaStart } from "../engine/net"

/** Entrar numa largada em grupo (null = a sala não abriu). */
export type CorridaJoin = (hooks: {
  signal: AbortSignal
  onLobby: (names: string[], until: number) => void
  onStatus: (s: CorridaNetStatus) => void
  /** Nave da garagem (os outros a veem; mm3d-49). */
  ship: string
}) => Promise<{ net: CorridaNet; start: CorridaStart } | null>

export interface RaceViewProps {
  /** Nome do jogador (na classificação). */
  name?: string
  onExit: () => void
  /** Multiplayer (sem isto, só sozinho e contra o relógio). */
  join?: CorridaJoin
}

/** A largada em grupo. */
const MAX_CARS = 6

type Stage =
  | { kind: "garage" }
  | { kind: "menu" }
  | { kind: "lobby"; ac: AbortController }
  | { kind: "game"; mode: RaceMode; key: number; mp?: { net: CorridaNet; start: CorridaStart } }

/** Recorde do aparelho (conveniência local; some se o navegador limpar). */
interface Records {
  race: number | null
  time: number | null
  lap: number | null
}
const REC_KEY = "mm-corrida-recordes-v1"
/** Nave escolhida na garagem (conveniência do aparelho; sem ela, a padrão). */
const SHIP_KEY = "mm-corrida-nave-v1"
function loadShip(): string {
  try {
    const id = localStorage.getItem(SHIP_KEY)
    return id && SHIPS.some((s) => s.id === id) ? id : DEFAULT_SHIP
  } catch {
    return DEFAULT_SHIP
  }
}
function saveShip(id: string) {
  try {
    localStorage.setItem(SHIP_KEY, id)
  } catch {
    /* sem armazenamento */
  }
}
function loadRecords(): Records {
  try {
    const r = JSON.parse(localStorage.getItem(REC_KEY) || "null") as Partial<Records> | null
    return { race: r?.race ?? null, time: r?.time ?? null, lap: r?.lap ?? null }
  } catch {
    return { race: null, time: null, lap: null }
  }
}
function saveRecords(r: Records) {
  try {
    localStorage.setItem(REC_KEY, JSON.stringify(r))
  } catch {
    /* sem armazenamento */
  }
}

export function fmtRace(s: number): string {
  const m = Math.floor(s / 60)
  const r = s - m * 60
  return `${String(m).padStart(2, "0")}:${r.toFixed(3).padStart(6, "0")}`
}

export function RaceView({ name, onExit, join }: RaceViewProps) {
  const t = useTranslations("MeuMundo")
  const [stage, setStage] = useState<Stage>({ kind: "garage" })
  const [ship, setShip] = useState(DEFAULT_SHIP)
  useEffect(() => setShip(loadShip()), [])
  const [lobby, setLobby] = useState<{ names: string[]; until: number }>({ names: [], until: 0 })
  const [error, setError] = useState<string | null>(null)
  const seq = useRef(0)

  const play = useCallback(
    async (mode: RaceMode) => {
      setError(null)
      if (mode !== "multi") {
        setStage({ kind: "game", mode, key: ++seq.current })
        return
      }
      if (!join) return
      const ac = new AbortController()
      setLobby({ names: [], until: 0 })
      setStage({ kind: "lobby", ac })
      const fail = () => {
        setError(t("corridaJoinFail", "A corrida em grupo não abriu agora. Tente de novo ou corra sozinho."))
        setStage({ kind: "menu" })
      }
      try {
        const got = await join({ signal: ac.signal, onLobby: (names, until) => setLobby({ names, until }), onStatus: () => {}, ship })
        if (ac.signal.aborted) {
          got?.net.dispose()
          return
        }
        if (!got) return fail()
        setStage({ kind: "game", mode: "multi", key: ++seq.current, mp: got })
      } catch {
        if (!ac.signal.aborted) fail()
      }
    },
    [join, t, ship],
  )

  return (
    <div className={`fixed inset-0 z-[70] touch-none select-none overflow-hidden ${archivo.className}`} style={{ background: "#0d1117" }}>
      {stage.kind === "game" ? (
        <RaceScreen
          key={stage.key}
          mode={stage.mode}
          name={name}
          ship={ship}
          mp={stage.mp}
          onAgain={() => void play(stage.mode)}
          onMenu={() => setStage({ kind: "menu" })}
        />
      ) : stage.kind === "lobby" ? (
        <RaceLobby
          names={lobby.names}
          until={lobby.until}
          onCancel={() => {
            stage.ac.abort()
            setStage({ kind: "menu" })
          }}
        />
      ) : stage.kind === "garage" ? (
        <GarageView
          current={ship}
          onChoose={(id) => {
            setShip(id)
            saveShip(id)
            setStage({ kind: "menu" })
          }}
          onExit={onExit}
        />
      ) : (
        <RaceMenu onPlay={(mode) => void play(mode)} onExit={onExit} multi={!!join} error={error} ship={ship} onGarage={() => setStage({ kind: "garage" })} />
      )}
    </div>
  )
}

// ═══ espera (multiplayer) ════════════════════════════════════════════════════

function RaceLobby({ names, until, onCancel }: { names: string[]; until: number; onCancel: () => void }) {
  const t = useTranslations("MeuMundo")
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 250)
    return () => clearInterval(id)
  }, [])
  const left = until ? Math.max(0, Math.ceil((until - now) / 1000)) : null
  const bots = Math.max(0, MAX_CARS - Math.max(1, names.length))
  return (
    <div className="absolute inset-0 flex items-center justify-center overflow-y-auto p-4" style={{ background: "radial-gradient(120% 90% at 50% 0%, #2b4a66 0%, #111820 60%, #0b0f14 100%)" }}>
      <div className="w-full max-w-[440px] rounded-[22px] p-5 text-left max-[759px]:p-4" style={{ background: MM.surface, color: MM.text, boxShadow: MM.shadow, border: `1px solid ${MM.border}` }}>
        <div className="flex items-center gap-2 text-[12px] font-bold uppercase tracking-[0.18em]" style={{ color: "#5FE1FF" }}>
          <Users className="h-4 w-4" /> {t("corridaModeMulti", "Multiplayer")}
        </div>
        <div className="mt-2 flex items-end justify-between gap-3">
          <h2 className="text-[22px] font-black italic leading-tight">{t("corridaLobbyTitle", "Esperando pilotos…")}</h2>
          <span className="text-[34px] font-black italic tabular-nums leading-none" style={{ color: "#FF7A2F" }} aria-live="polite">
            {left === null ? <Loader2 className="h-7 w-7 animate-spin" /> : `0:${String(left).padStart(2, "0")}`}
          </span>
        </div>
        <p className="mt-2 text-[13px] leading-snug" style={{ color: MM.muted }}>
          {t("corridaLobbyHow", "Quem entrar até o fim do tempo corre junto. As vagas que sobrarem viram computador — sempre 6 naves.")}
        </p>
        <ol className="mt-3 grid grid-cols-2 gap-1.5 max-[420px]:grid-cols-1">
          {Array.from({ length: MAX_CARS }, (_, i) => {
            const n = names[i]
            return (
              <li key={i} className="flex items-center gap-2 rounded-[10px] px-2.5 py-2 text-[13.5px]" style={{ background: n ? MM.rubySoft : MM.card, color: n ? MM.text : MM.muted }}>
                {n ? <Flag className="h-4 w-4 shrink-0" style={{ color: MM.gold }} /> : <Bot className="h-4 w-4 shrink-0" />}
                <span className="min-w-0 truncate font-semibold">{n || t("corridaBot", "computador")}</span>
              </li>
            )
          })}
        </ol>
        <p className="mt-2 text-[12.5px]" style={{ color: MM.muted }}>
          {t("corridaLobbyCount", "{n} de 6 pilotos · {b} computadores se ninguém mais entrar").replace("{n}", String(Math.max(1, names.length))).replace("{b}", String(bots))}
        </p>
        <button type="button" onClick={onCancel} className="mt-4 w-full rounded-[14px] px-3 py-3 text-[15px] font-bold" style={{ background: MM.card, border: `1px solid ${MM.border}` }}>
          {t("corridaLobbyCancel", "Sair da espera")}
        </button>
      </div>
    </div>
  )
}

// ═══ menu ════════════════════════════════════════════════════════════════════

function RaceMenu({
  onPlay,
  onExit,
  multi,
  error,
  ship,
  onGarage,
}: {
  onPlay: (m: RaceMode) => void
  onExit: () => void
  multi: boolean
  error: string | null
  ship: string
  onGarage: () => void
}) {
  const t = useTranslations("MeuMundo")
  const [rec, setRec] = useState<Records>({ race: null, time: null, lap: null })
  useEffect(() => setRec(loadRecords()), [])
  const modes: { mode: RaceMode; icon: React.ReactNode; title: string; sub: string }[] = [
    { mode: "race", icon: <Flag className="h-5 w-5" />, title: t("corridaModeSolo", "Sozinho"), sub: t("corridaModeRaceSub", "Você contra 5 computadores · 3 voltas") },
    ...(multi
      ? [{ mode: "multi" as const, icon: <Users className="h-5 w-5" />, title: t("corridaModeMulti", "Multiplayer"), sub: t("corridaModeMultiSub", "Espera até 1 minuto · o resto é computador") }]
      : []),
    { mode: "time", icon: <Timer className="h-5 w-5" />, title: t("corridaModeTime", "Contra o relógio"), sub: t("corridaModeTimeSub", "Sozinho na pista · 3 voltas") },
  ]
  return (
    <div
      className="absolute inset-0 flex items-center justify-center overflow-y-auto p-4"
      style={{ background: "radial-gradient(120% 90% at 50% 0%, #2b4a66 0%, #111820 60%, #0b0f14 100%)" }}
    >
      <div className="w-full max-w-[520px] rounded-[22px] p-5 text-left max-[759px]:p-4" style={{ background: MM.surface, color: MM.text, boxShadow: MM.shadow, border: `1px solid ${MM.border}` }}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-[12px] font-bold uppercase tracking-[0.18em]" style={{ color: "#5FE1FF" }}>
              <Rocket className="h-4 w-4" /> {t("corridaKicker", "Baía Suspensa")}
            </div>
            <h1 className="mt-1.5 text-[30px] font-black italic leading-none tracking-tight max-[759px]:text-[25px]">
              ANTI<span style={{ color: "#FF7A2F" }}>GRAVIDADE</span>
            </h1>
            <p className="mt-2 text-[14px] leading-snug" style={{ color: MM.muted }}>
              {t("corridaPitch", "Naves que flutuam sobre a pista. Pegue o turbo, salte dos penhascos e voe até a chegada.")}
            </p>
          </div>
          <button type="button" aria-label={t("corridaLeave", "Voltar ao centro")} onClick={onExit} className="grid h-10 w-10 shrink-0 place-items-center rounded-full" style={{ background: MM.card, border: `1px solid ${MM.border}` }}>
            <X className="h-5 w-5" />
          </button>
        </div>

        <button
          type="button"
          onClick={onGarage}
          className="mt-4 flex w-full items-center justify-between gap-3 rounded-[14px] px-3.5 py-2.5 text-left transition-transform active:scale-[0.99]"
          style={{ background: MM.card, border: `1px solid ${MM.border}`, color: MM.text }}
        >
          <span className="flex items-center gap-2.5">
            <span className="h-3 w-3 rounded-full" style={{ background: shipArt(ship).holo.color, boxShadow: `0 0 10px ${shipArt(ship).holo.color}` }} />
            <span>
              <span className="block text-[11px] font-bold uppercase tracking-[0.16em]" style={{ color: MM.muted }}>
                {t("corridaMenuShip", "Sua nave")}
              </span>
              <span className="block text-[16px] font-bold leading-tight">{t(shipArt(ship).labelKey, shipArt(ship).fallback)}</span>
            </span>
          </span>
          <span className="text-[13px] font-bold" style={{ color: "#5FE1FF" }}>
            {t("corridaMenuGarage", "Trocar na garagem")}
          </span>
        </button>

        <ul className="mt-3 grid grid-cols-3 gap-2 text-[12.5px] leading-snug max-[759px]:grid-cols-1" style={{ color: MM.muted }}>
          <li className="rounded-[12px] p-2.5" style={{ background: MM.card }}>
            <b style={{ color: "#5FE1FF" }}>{t("corridaHowPadTitle", "Faixa de turbo")}</b>
            <br />
            {t("corridaHowPad", "Passe por cima das setas azuis: arrancada na hora.")}
          </li>
          <li className="rounded-[12px] p-2.5" style={{ background: MM.card }}>
            <b style={{ color: "#FF9A4D" }}>{t("corridaHowOrbTitle", "Cápsula de fogo")}</b>
            <br />
            {t("corridaHowOrb", "Guarda até 3 turbos. Use quando quiser.")}
          </li>
          <li className="rounded-[12px] p-2.5" style={{ background: MM.card }}>
            <b style={{ color: "#FFD45C" }}>{t("corridaHowJumpTitle", "Penhascos")}</b>
            <br />
            {t("corridaHowJump", "Chegue rápido na rampa e segure acelerar no ar para planar.")}
          </li>
        </ul>

        <div className={`mt-4 grid gap-2 max-[420px]:grid-cols-1 ${modes.length === 3 ? "grid-cols-3 max-[759px]:grid-cols-1" : "grid-cols-2"}`}>
          {modes.map((m, i) => (
            <button
              key={m.mode}
              type="button"
              onClick={() => onPlay(m.mode)}
              className="flex min-h-[64px] items-center gap-3 rounded-[14px] px-3.5 text-left transition-transform active:scale-[0.98]"
              style={{ background: i === 0 ? MM.rubyFill : MM.card, border: `1px solid ${i === 0 ? MM.rubyBorder : MM.border}`, color: MM.text }}
            >
              <span className="shrink-0" style={{ color: i === 0 ? "#fff" : MM.gold }}>
                {m.icon}
              </span>
              <span>
                <span className="block text-[16px] font-bold leading-tight">{m.title}</span>
                <span className="block text-[12px] leading-tight" style={{ color: i === 0 ? "rgba(255,255,255,0.8)" : MM.muted }}>
                  {m.sub}
                </span>
              </span>
            </button>
          ))}
        </div>

        {error && (
          <p role="alert" className="mt-3 rounded-[12px] px-3 py-2 text-[13px]" style={{ background: "rgba(110, 16, 34, 0.55)", color: "#FFD9DF" }}>
            {error}
          </p>
        )}

        {(rec.race !== null || rec.time !== null || rec.lap !== null) && (
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[12.5px]" style={{ color: MM.muted }}>
            <span className="flex items-center gap-1.5" style={{ color: MM.gold }}>
              <Trophy className="h-3.5 w-3.5" /> {t("corridaRecords", "Seus recordes")}
            </span>
            {rec.race !== null && <span>{t("corridaRecRace", "Corrida {t}").replace("{t}", fmtRace(rec.race))}</span>}
            {rec.time !== null && <span>{t("corridaRecTime", "Relógio {t}").replace("{t}", fmtRace(rec.time))}</span>}
            {rec.lap !== null && <span>{t("corridaRecLap", "Volta {t}").replace("{t}", fmtRace(rec.lap))}</span>}
          </div>
        )}

        <p className="mt-3 text-[12px] leading-snug max-[759px]:hidden" style={{ color: MM.muted }}>
          {t("corridaKeys", "Setas ou WASD dirigem · Espaço ou Shift = turbo")}
        </p>
      </div>
    </div>
  )
}

// ═══ jogo ════════════════════════════════════════════════════════════════════

function RaceScreen({
  mode,
  name,
  ship,
  mp,
  onAgain,
  onMenu,
}: {
  mode: RaceMode
  name?: string
  ship: string
  mp?: { net: CorridaNet; start: CorridaStart }
  onAgain: () => void
  onMenu: () => void
}) {
  const t = useTranslations("MeuMundo")
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const gameRef = useRef<RaceGameHandle | null>(null)
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading")
  const [hud, setHud] = useState<RaceHud | null>(null)
  const [path, setPath] = useState<string>("")
  const [toast, setToast] = useState<{ text: string; tone: "ok" | "hot" | "bad" | "gold"; id: number } | null>(null)
  const [muted, setMuted] = useState(false)
  const [newRecord, setNewRecord] = useState(false)
  const [isTouch] = useState(() => typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches && !window.matchMedia("(any-pointer: fine)").matches)
  const textRef = useRef(t)
  useEffect(() => {
    textRef.current = t
  }, [t])
  // o jogo nasce com o modo do aparelho (trocar depois não recria a cena)
  const touchRef = useRef(isTouch)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    let alive = true
    let timer: ReturnType<typeof setTimeout> | null = null
    let seq = 0
    const say = (text: string, tone: "ok" | "hot" | "bad" | "gold" = "ok", ms = 1600) => {
      const id = ++seq
      setToast({ text, tone, id })
      if (timer) clearTimeout(timer)
      timer = setTimeout(() => alive && setToast((cur) => (cur?.id === id ? null : cur)), ms)
    }
    const onNotice = (n: RaceNotice) => {
      if (!alive) return
      const tt = textRef.current
      switch (n.kind) {
        case "pad":
          say(tt("corridaToastPad", "TURBO!"), "hot", 900)
          break
        case "turbo":
          say(tt("corridaToastFire", "FOGO!"), "hot", 900)
          break
        case "orb":
          say(tt("corridaToastOrb", "+1 turbo ({n}/{max})").replace("{n}", String(n.charges)).replace("{max}", String(TUNING.maxCharges)), "gold", 1100)
          break
        case "fell":
          say(tt("corridaToastFell", "Caiu do penhasco! Voltando à pista…"), "bad", 1600)
          try {
            navigator.vibrate?.(120)
          } catch {
            /* sem vibração */
          }
          break
        case "lap":
          if (!n.last) say(n.best ? tt("corridaToastLapBest", "Volta {n}: {t} — melhor volta!").replace("{n}", String(n.lap)).replace("{t}", fmtRace(n.time)) : tt("corridaToastLap", "Volta {n}: {t}").replace("{n}", String(n.lap)).replace("{t}", fmtRace(n.time)), n.best ? "gold" : "ok", 1800)
          break
        case "finish": {
          if (mode === "multi") break // em grupo o recorde não conta (o resultado é da sala)
          const rec = loadRecords()
          const key = mode === "race" ? "race" : "time"
          let better = false
          if (rec[key] === null || n.time < (rec[key] as number)) {
            rec[key] = n.time
            better = true
          }
          saveRecords(rec)
          setNewRecord(better)
          break
        }
        case "wall":
          try {
            navigator.vibrate?.(25)
          } catch {
            /* sem vibração */
          }
          break
        default:
          break
      }
    }
    try {
      const g = createRaceGame({
        canvas,
        mode,
        playerName: name || textRef.current("corridaYou", "Você"),
        ship,
        touch: touchRef.current,
        net: mp,
        onReady: () => alive && setStatus("ready"),
        onHud: (h) => {
          if (!alive) return
          setHud(h)
          if (h.best !== null) {
            const rec = loadRecords()
            if (rec.lap === null || h.best < rec.lap) saveRecords({ ...rec, lap: h.best })
          }
        },
        onNotice,
        onError: () => alive && setStatus("error"),
      })
      gameRef.current = g
      setPath(
        g
          .minimap()
          .map((p, i) => `${i ? "L" : "M"}${(p.x * 100).toFixed(1)} ${(p.z * 100).toFixed(1)}`)
          .join(" ") + " Z",
      )
    } catch (err) {
      console.error("[corrida] falha ao abrir", err)
      setStatus("error")
    }
    return () => {
      alive = false
      if (timer) clearTimeout(timer)
      gameRef.current?.dispose()
      gameRef.current = null
    }
  }, [mode, name, mp, ship])

  const toggleMute = useCallback(() => {
    setMuted((m) => {
      gameRef.current?.setMuted(!m)
      return !m
    })
  }, [])

  const ended = !!hud?.results && (hud.phase === "end" || hud.finished)
  return (
    <>
      <canvas ref={canvasRef} className="block h-full w-full outline-none" style={{ touchAction: "none" }} aria-label={t("corridaAria", "Corrida antigravidade")} />

      {status === "ready" && hud && (
        <>
          <SpeedLines on={hud.boost && !hud.down} />
          <Hud hud={hud} path={path} muted={muted} onMute={toggleMute} onLeave={onMenu} />
          {isTouch && !ended && (
            <>
              <div className="absolute" style={{ left: SAFE.left, bottom: SAFE.bottom }}>
                <Joystick gameRef={gameRef} />
              </div>
              <button
                type="button"
                aria-label={t("corridaTurbo", "Turbo")}
                onPointerDown={(e) => {
                  e.preventDefault()
                  gameRef.current?.turbo()
                }}
                className="absolute grid h-[88px] w-[88px] place-items-center rounded-full text-[12px] font-black uppercase tracking-wide text-white active:scale-95"
                style={{
                  right: "calc(max(12px, env(safe-area-inset-right)) + 8px)",
                  bottom: "calc(max(16px, env(safe-area-inset-bottom)) + 118px)",
                  background: hud.charges > 0 ? "radial-gradient(circle at 50% 40%, #FFB347 0%, #F2541B 60%, #A8240B 100%)" : "rgba(30,35,43,0.7)",
                  border: `2px solid ${hud.charges > 0 ? "rgba(255,210,140,0.8)" : MM.border}`,
                  boxShadow: hud.charges > 0 ? "0 0 22px rgba(255,120,40,0.55)" : "none",
                  color: hud.charges > 0 ? "#fff" : MM.disabledText,
                }}
              >
                <span className="flex flex-col items-center gap-0.5">
                  <Flame className="h-6 w-6" />
                  {t("corridaTurbo", "Turbo")}
                </span>
              </button>
            </>
          )}
          {toast && (
            <div className="pointer-events-none absolute left-1/2 -translate-x-1/2" style={{ top: "calc(max(12px, env(safe-area-inset-top)) + 86px)" }}>
              <div
                key={toast.id}
                role="status"
                className="rounded-full px-4 py-2 text-[15px] font-black italic tracking-wide shadow-lg max-[759px]:text-[13px]"
                style={{
                  background: toast.tone === "hot" ? "linear-gradient(90deg, #F2541B, #FFB347)" : toast.tone === "bad" ? "rgba(110, 16, 34, 0.9)" : toast.tone === "gold" ? "rgba(70, 52, 12, 0.88)" : MM.surface,
                  color: toast.tone === "gold" ? "#FFE3A0" : "#fff",
                  border: `1px solid ${toast.tone === "gold" ? MM.goldBorder : MM.border}`,
                }}
              >
                {toast.text}
              </div>
            </div>
          )}
          {ended && hud.results && <Results hud={hud} mode={mode} newRecord={newRecord} onAgain={onAgain} onMenu={onMenu} />}
          {!ended && (hud.net === "offline" || hud.net === "replaced") && (
            <div className="absolute inset-x-0 grid place-items-center" style={{ top: "calc(max(12px, env(safe-area-inset-top)) + 130px)" }}>
              <div className="flex items-center gap-2 rounded-full px-4 py-2 text-[13px] font-bold" style={{ background: MM.surface, color: MM.text }}>
                <WifiOff className="h-4 w-4" />
                {hud.net === "replaced" ? t("corridaReplaced", "Aberto em outra janela") : t("corridaOffline", "Sem conexão com a corrida")}
                <button type="button" onClick={onMenu} className="ml-1 rounded-full px-2.5 py-1 text-[12px]" style={{ background: MM.rubyFill }}>
                  {t("corridaBackMenu", "Voltar ao menu")}
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {status !== "ready" && (
        <div className="absolute inset-0 grid place-items-center" style={{ background: "radial-gradient(120% 90% at 50% 0%, #2b4a66 0%, #111820 60%, #0b0f14 100%)" }}>
          <div className="flex flex-col items-center gap-3 text-center" style={{ color: MM.text }}>
            {status === "loading" ? (
              <>
                <Loader2 className="h-7 w-7 animate-spin" />
                <span className="text-[15px] font-semibold">{t("corridaLoading", "Ligando os motores…")}</span>
              </>
            ) : (
              <>
                <span className="text-[16px] font-bold">{t("corridaErrorTitle", "A corrida não abriu")}</span>
                <span className="max-w-[320px] text-[13px]" style={{ color: MM.muted }}>
                  {t("errorDesc", "O navegador não conseguiu iniciar o 3D. Tente de novo; se continuar, volte ao perfil.")}
                </span>
                <button type="button" onClick={onMenu} className="mt-1 rounded-full px-4 py-2 text-[14px] font-bold text-white" style={{ background: MM.rubyFill }}>
                  {t("corridaBackMenu", "Voltar ao menu")}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}

/** Linhas de velocidade na borda (só transform/opacity; a camada é estática). */
function SpeedLines({ on }: { on: boolean }) {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0"
      style={{
        opacity: on ? 1 : 0,
        transition: "opacity 220ms",
        background:
          "repeating-conic-gradient(from 0deg at 50% 55%, rgba(255,255,255,0) 0deg 5deg, rgba(255,255,255,0.32) 5.4deg, rgba(255,255,255,0) 6deg 11deg)",
        WebkitMaskImage: "radial-gradient(ellipse 62% 58% at 50% 55%, transparent 55%, black 100%)",
        maskImage: "radial-gradient(ellipse 62% 58% at 50% 55%, transparent 55%, black 100%)",
      }}
    />
  )
}

const ordinal = (n: number) => `${n}º`

function Hud({ hud, path, muted, onMute, onLeave }: { hud: RaceHud; path: string; muted: boolean; onMute: () => void; onLeave: () => void }) {
  const t = useTranslations("MeuMundo")
  const glass = "rgba(12, 16, 22, 0.62)"
  return (
    <>
      {/* posição e volta */}
      <div className="pointer-events-none absolute flex flex-col gap-1.5" style={{ top: SAFE.top, left: SAFE.left }}>
        <div className="flex items-end gap-3 rounded-[14px] px-3 py-2" style={{ background: glass, border: `1px solid ${MM.border}` }}>
          {hud.total > 1 && (
            <div className="leading-none">
              <div className="text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color: MM.muted }}>
                {t("corridaPosition", "Posição")}
              </div>
              <div className="text-[34px] font-black italic tabular-nums max-[759px]:text-[26px]" style={{ color: "#FF7A2F" }}>
                {ordinal(hud.place)}
                <span className="text-[15px] not-italic" style={{ color: MM.muted }}>
                  /{hud.total}
                </span>
              </div>
            </div>
          )}
          <div className="leading-none">
            <div className="text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color: MM.muted }}>
              {t("corridaLap", "Volta")}
            </div>
            <div className="text-[34px] font-black italic tabular-nums text-white max-[759px]:text-[26px]">
              {hud.lap}
              <span className="text-[15px] not-italic" style={{ color: MM.muted }}>
                /{hud.laps}
              </span>
            </div>
          </div>
        </div>
        <div className="rounded-[12px] px-3 py-1.5 text-[12px] leading-tight" style={{ background: glass, border: `1px solid ${MM.border}`, color: MM.muted }}>
          <div className="text-[17px] font-bold tabular-nums text-white max-[759px]:text-[15px]">{fmtRace(hud.time)}</div>
          <div className="tabular-nums">
            {t("corridaBest", "Melhor volta")} {hud.best !== null ? fmtRace(hud.best) : "—"}
          </div>
        </div>
      </div>

      {/* minimapa + botões */}
      <div className="absolute flex items-start gap-2" style={{ top: SAFE.top, right: SAFE.right }}>
        <div className="pointer-events-none rounded-[14px] p-1.5" style={{ background: glass, border: `1px solid ${MM.border}` }}>
          <svg viewBox="-6 -6 112 112" className="h-[112px] w-[112px] max-[759px]:h-[84px] max-[759px]:w-[84px]" aria-hidden>
            <path d={path} fill="none" stroke="rgba(255,255,255,0.28)" strokeWidth={7} strokeLinejoin="round" />
            <path d={path} fill="none" stroke="#5FE1FF" strokeWidth={2.2} strokeLinejoin="round" />
            {[...hud.dots].reverse().map((d, i) => (
              <circle key={i} cx={d.x * 100} cy={d.z * 100} r={d.me ? 5 : 3.6} fill={d.color} stroke="#fff" strokeWidth={d.me ? 2 : 1} />
            ))}
          </svg>
        </div>
        <div className="flex flex-col gap-2">
          <button type="button" aria-label={t("corridaBackMenu", "Voltar ao menu")} onClick={onLeave} className="grid h-10 w-10 place-items-center rounded-full text-white" style={{ background: glass, border: `1px solid ${MM.border}` }}>
            <X className="h-5 w-5" />
          </button>
          <button type="button" aria-label={muted ? t("corridaSoundOn", "Ligar som") : t("corridaSoundOff", "Desligar som")} onClick={onMute} className="grid h-10 w-10 place-items-center rounded-full text-white" style={{ background: glass, border: `1px solid ${MM.border}` }}>
            {muted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* velocímetro + cargas de turbo */}
      <div className="pointer-events-none absolute flex flex-col items-end gap-1.5 max-[759px]:items-center" style={{ bottom: SAFE.bottom, right: SAFE.right }}>
        <div className="flex items-center gap-1" aria-label={t("corridaCharges", "Turbos guardados")}>
          {Array.from({ length: TUNING.maxCharges }, (_, i) => (
            <span
              key={i}
              className="grid h-6 w-9 place-items-center rounded-[8px]"
              style={{
                background: i < hud.charges ? "linear-gradient(180deg, #FFB347, #F2541B)" : "rgba(12,16,22,0.62)",
                border: `1px solid ${i < hud.charges ? "rgba(255,210,140,0.8)" : MM.border}`,
              }}
            >
              <Flame className="h-3.5 w-3.5" style={{ color: i < hud.charges ? "#fff" : "rgba(255,255,255,0.3)" }} />
            </span>
          ))}
        </div>
        <div className="rounded-[14px] px-3 py-1 text-right leading-none max-[759px]:hidden" style={{ background: glass, border: `1px solid ${MM.border}` }}>
          <span className="text-[44px] font-black italic tabular-nums" style={{ color: hud.boost ? "#FFB347" : "#fff" }}>
            {hud.speed}
          </span>
          <span className="ml-1 text-[13px] font-bold" style={{ color: MM.muted }}>
            km/h
          </span>
        </div>
      </div>
      {/* celular: velocidade pequena no alto, no meio */}
      <div className="pointer-events-none absolute left-1/2 hidden -translate-x-1/2 rounded-full px-3 py-1 text-[16px] font-black italic tabular-nums max-[759px]:block" style={{ top: SAFE.top, background: glass, color: hud.boost ? "#FFB347" : "#fff" }}>
        {hud.speed} <span className="text-[11px] not-italic" style={{ color: MM.muted }}>km/h</span>
      </div>

      {/* contagem */}
      {hud.phase === "countdown" && (
        <div className="pointer-events-none absolute inset-0 grid place-items-center">
          <span key={Math.ceil(hud.countdown)} className="text-[110px] font-black italic leading-none text-white" style={{ textShadow: "0 6px 28px rgba(0,0,0,0.45)" }}>
            {Math.max(1, Math.ceil(hud.countdown))}
          </span>
        </div>
      )}
      {hud.phase === "race" && hud.time < 1 && (
        <div className="pointer-events-none absolute inset-0 grid place-items-center">
          <span className="text-[96px] font-black italic leading-none" style={{ color: "#FF7A2F", textShadow: "0 6px 28px rgba(0,0,0,0.45)" }}>
            {t("corridaGo", "VAI!")}
          </span>
        </div>
      )}
    </>
  )
}

function Results({ hud, mode, newRecord, onAgain, onMenu }: { hud: RaceHud; mode: RaceMode; newRecord: boolean; onAgain: () => void; onMenu: () => void }) {
  const t = useTranslations("MeuMundo")
  const rows = hud.results ?? []
  const me = rows.find((r) => r.me)
  const place = rows.findIndex((r) => r.me) + 1
  const waiting = hud.phase !== "end"
  const title = mode === "time" ? t("corridaFinishTime", "Chegada!") : place === 1 ? t("corridaWin", "Vitória!") : t("corridaPlaceTitle", "{n}º lugar").replace("{n}", String(place))
  const group = mode === "multi"
  return (
    <div className="absolute inset-0 grid place-items-center p-4" style={{ background: MM.scrim }}>
      <div className="w-full max-w-[420px] rounded-[20px] p-4" style={{ background: MM.surface, color: MM.text, border: `1px solid ${MM.border}`, boxShadow: MM.shadow }}>
        <div className="flex items-center gap-2">
          <Trophy className="h-6 w-6" style={{ color: place === 1 || mode === "time" ? MM.gold : MM.muted }} />
          <h2 className="text-[24px] font-black italic leading-none">{title}</h2>
        </div>
        {me?.time !== null && me?.time !== undefined && (
          <p className="mt-1.5 text-[14px]" style={{ color: MM.muted }}>
            {t("corridaYourTime", "Seu tempo: {t}").replace("{t}", fmtRace(me.time))}
            {newRecord && (
              <b className="ml-2" style={{ color: MM.gold }}>
                {t("corridaNewRecord", "Recorde!")}
              </b>
            )}
          </p>
        )}
        {mode !== "time" && (
          <ol className="mt-3 flex flex-col gap-1">
            {rows.map((r, i) => (
              <li key={r.id} className="flex items-center gap-2 rounded-[10px] px-2.5 py-1.5 text-[14px]" style={{ background: r.me ? MM.rubySoft : MM.card }}>
                <span className="w-6 font-black italic tabular-nums">{i + 1}º</span>
                <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: r.color }} />
                <span className="min-w-0 flex-1 truncate font-semibold">{r.name}</span>
                {group && !r.human && (
                  <span className="flex shrink-0 items-center gap-1 text-[11px]" style={{ color: MM.muted }}>
                    <Bot className="h-3.5 w-3.5" /> {t("corridaBot", "computador")}
                  </span>
                )}
                <span className="tabular-nums" style={{ color: MM.muted }}>
                  {r.time !== null ? fmtRace(r.time) : r.gone ? t("corridaLeft", "saiu") : waiting ? "…" : t("corridaDnf", "não terminou")}
                </span>
              </li>
            ))}
          </ol>
        )}
        <div className="mt-4 grid grid-cols-2 gap-2">
          <button type="button" onClick={onAgain} className="rounded-[14px] px-3 py-3 text-[15px] font-bold text-white" style={{ background: MM.rubyFill, border: `1px solid ${MM.rubyBorder}` }}>
            {group ? t("corridaAgainMulti", "Nova largada") : t("corridaAgain", "Correr de novo")}
          </button>
          <button type="button" onClick={onMenu} className="rounded-[14px] px-3 py-3 text-[15px] font-bold" style={{ background: MM.card, border: `1px solid ${MM.border}` }}>
            {t("corridaBackMenu", "Voltar ao menu")}
          </button>
        </div>
      </div>
    </div>
  )
}
