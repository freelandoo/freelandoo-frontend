"use client"

// features/meu-mundo/gincana/ui/gincana-view.tsx — GINCANA (mm3d-47): a tela.
//
// Corrida de obstáculos sobre o mar (pedido do Alex: a dinâmica do vídeo, com
// os nossos personagens, cores vivas e tudo arredondado). Cobre o centro
// (suspenso por baixo, como o Paint e o Rolê). Telas:
//  - MENU: os 5 trechos, o recorde do aparelho, Sozinho ou Multiplayer;
//  - ESPERA (multiplayer): até 1 minuto; o computador completa as 8 vagas;
//  - PROVA: posição e tempo em cima à esquerda, o trecho no alto, placar ao
//    vivo, contagem, avisos; no celular joystick + PULAR e MERGULHAR;
//  - FIM: colocação, tempo, recorde e a classificação.
//
// Gincana 2.0 (2026-11-16): o MENU escolhe a FASE (a de sempre + uma por
// Domínio; phase-themes.ts); recorde por fase; na prova, quantos já
// classificaram (a vaga fecha a prova) e o AGARRAR (F/Ctrl; botão no celular,
// segurando); no fim, classificou ou eliminado.
// 18/11: o MENU usa a tela comum dos minijogos (layout da Antigravidade, phase-select.tsx).

import { useCallback, useEffect, useRef, useState } from "react"
import { Crown, Flag, Loader2, Star, Timer, Trophy, User, Users, Volume2, VolumeX, WifiOff, X } from "lucide-react"
import { TrainButton } from "../../ui/kit/train-button"
import { BackToCity } from "../../ui/kit/back-to-city"
import { useTranslations } from "@/components/i18n/I18nProvider"
import { WaitingRoom } from "../../ui/kit/waiting-room"
import { MM } from "../../ui/hud/tokens"
import { archivo } from "../../ui/status/evo-skin"
import { Joystick, SAFE } from "../../ui/meu-mundo-view"
import type { BodyId } from "../../types"
import { createGincanaGame, type BoardRow, type GincanaGameHandle, type GincanaHud, type GincanaNotice, type GincanaResult } from "../engine/gincana-game"
import type { GincanaLobbyEntry, GincanaNet, GincanaNetStatus, GincanaResultRow, GincanaStart } from "../engine/net"
import { emitMinigame } from "../../banter"
import { MinigameBanter } from "../../ui/inbox/minigame-banter"
import { GodVoice } from "../../ui/quest/god-voice"
import { GINCANA_THEMES, themeOf, type GincanaTheme } from "../engine/phase-themes"
import { MemSymbol } from "./mem-symbol"
import { GincanaPhaseSelect } from "./phase-select"

/** Entrar numa largada em grupo (null = a sala não abriu). */
export type GincanaJoin = (
  body: BodyId,
  hooks: { signal: AbortSignal; onLobby: (list: GincanaLobbyEntry[], until: number) => void; onStatus: (s: GincanaNetStatus) => void },
  phase?: string,
) => Promise<{ net: GincanaNet; start: GincanaStart } | null>

export interface GincanaViewProps {
  body: BodyId
  look?: string
  name?: string
  onExit: () => void
  join?: GincanaJoin
}

const SEATS = 8
const PINK = "#FF5FA8"
const TEAL = "#19C6D1"
const YELLOW = "#FFD21F"
const ORANGE = "#FF6A13"
const BG = "radial-gradient(120% 90% at 50% 0%, #4fd6ff 0%, #8a6cff 48%, #3a1d6e 100%)"
/** Computadores do treino (nomes de doce; iguais nos três idiomas). */
const BOT_NAMES = ["Pipoca", "Jujuba", "Paçoca", "Cocada", "Quindim", "Bolacha", "Brigadeiro", "Pudim", "Canjica", "Suspiro"]

type Mp = { net: GincanaNet; start: GincanaStart }
/** Programa (solo, contra o computador): as rodadas sorteadas e em qual se está. */
type Show = { phases: string[]; round: number }
type Stage = { kind: "menu" } | { kind: "lobby"; ac: AbortController } | { kind: "game"; key: number; mp?: Mp; phase: string; show?: Show }

// Gincana 3 (G3-13): o programa abre com uma corrida, segue com duas provas de sobrevivência/coleta
// (diferentes) e fecha na final, a Coroa da Torre (vaga 1). Não classificou = fim do programa.
const SHOW_RACE = ["cidade", "feira", "floresta", "clareira", "comportas", "portoes", "altoforno", "moinhos", "helices", "serraria", "crosta", "tanque", "estaleiro", "gangorras"]
const SHOW_MID = ["canion", "orbital", "forja", "fabrica", "gelo", "relogio"]
const SHOW_FINAL = "coroa"
function drawShow(): string[] {
  const mid = [...SHOW_MID]
  const m1 = mid.splice(Math.floor(Math.random() * mid.length), 1)[0]
  const m2 = mid[Math.floor(Math.random() * mid.length)]
  return [SHOW_RACE[Math.floor(Math.random() * SHOW_RACE.length)], m1, m2, SHOW_FINAL]
}

/** Recorde do aparelho por fase (conveniência local; some se o navegador limpar). A de sempre fica na chave antiga. */
const REC_KEY = "mm-gincana-recorde-v1"
const PHASE_KEY = "mm-gincana-fase-v1"
const recKey = (phase: string) => (phase === "cidade" ? REC_KEY : `${REC_KEY}:${phase}`)
function loadRecord(phase: string): number | null {
  try {
    const v = Number(localStorage.getItem(recKey(phase)))
    return Number.isFinite(v) && v > 0 ? v : null
  } catch {
    return null
  }
}
function saveRecord(phase: string, t: number) {
  try {
    localStorage.setItem(recKey(phase), String(t))
  } catch {
    /* sem armazenamento */
  }
}
function loadPhase(): string {
  try {
    const v = localStorage.getItem(PHASE_KEY)
    return v && GINCANA_THEMES.some((x) => x.id === v) ? v : "cidade"
  } catch {
    return "cidade"
  }
}
function savePhase(phase: string) {
  try {
    localStorage.setItem(PHASE_KEY, phase)
  } catch {
    /* sem armazenamento */
  }
}

/** 1:05.3 */
function fmt(t: number) {
  const m = Math.floor(t / 60)
  const s = t - m * 60
  return `${m}:${s < 10 ? "0" : ""}${s.toFixed(1)}`
}

function useSections(theme: GincanaTheme) {
  const t = useTranslations("MeuMundo")
  return theme.sections.map(([k, v]) => t(k, v))
}

export function GincanaView({ body, look, name, onExit, join }: GincanaViewProps) {
  const t = useTranslations("MeuMundo")
  const [stage, setStage] = useState<Stage>({ kind: "menu" })
  const [lobby, setLobby] = useState<{ list: GincanaLobbyEntry[]; until: number }>({ list: [], until: 0 })
  const [error, setError] = useState<string | null>(null)
  const [phase, setPhase] = useState("cidade")
  useEffect(() => setPhase(loadPhase()), [])
  const seq = useRef(0)
  const startShow = useCallback((show: Show) => {
    setError(null)
    setStage({ kind: "game", key: ++seq.current, phase: show.phases[show.round], show })
  }, [])
  const play = useCallback(
    async (multi: boolean) => {
      setError(null)
      savePhase(phase)
      if (!multi || !join) {
        setStage({ kind: "game", key: ++seq.current, phase })
        return
      }
      const ac = new AbortController()
      setLobby({ list: [], until: 0 })
      setStage({ kind: "lobby", ac })
      const fail = () => {
        setError(t("gincanaJoinFail", "A gincana em grupo não abriu agora. Tente de novo ou jogue sozinho."))
        setStage({ kind: "menu" })
      }
      try {
        const got = await join(body, { signal: ac.signal, onLobby: (list, until) => setLobby({ list, until }), onStatus: () => {} }, phase)
        if (ac.signal.aborted) {
          got?.net.dispose()
          return
        }
        if (!got) return fail()
        setStage({ kind: "game", key: ++seq.current, mp: got, phase: got.start.phase ?? phase })
      } catch {
        if (!ac.signal.aborted) fail()
      }
    },
    [join, body, t, phase],
  )
  return (
    <div className={`fixed inset-0 z-[70] touch-none select-none overflow-hidden ${archivo.className}`} style={{ background: "#3a1d6e" }}>
      {stage.kind === "game" ? (
        <GincanaScreen
          key={stage.key}
          body={body}
          look={look}
          name={name}
          mp={stage.mp}
          phase={stage.phase}
          show={stage.show}
          onAgain={() => (stage.show ? startShow({ phases: drawShow(), round: 0 }) : void play(!!stage.mp))}
          onNext={stage.show && stage.show.round < stage.show.phases.length - 1 ? () => startShow({ phases: stage.show!.phases, round: stage.show!.round + 1 }) : undefined}
          onMenu={() => setStage({ kind: "menu" })}
        />
      ) : stage.kind === "lobby" ? (
        <Lobby
          list={lobby.list}
          until={lobby.until}
          onCancel={() => {
            stage.ac.abort()
            setStage({ kind: "menu" })
          }}
        />
      ) : (
        <Menu phase={phase} onPhase={setPhase} onPlay={(m) => void play(m)} onShow={() => startShow({ phases: drawShow(), round: 0 })} onExit={onExit} multi={!!join} error={error} />
      )}
    </div>
  )
}

// ═══ espera (multiplayer) ════════════════════════════════════════════════════

function Lobby({ list, until, onCancel }: { list: GincanaLobbyEntry[]; until: number; onCancel: () => void }) {
  const t = useTranslations("MeuMundo")
  // a mesma espera de todos os minijogos (ui/kit/waiting-room)
  return (
    <WaitingRoom
      background={BG}
      title={t("gincanaLobbyTitle", "Esperando a galera…")}
      text={t("gincanaLobbyHow20", "Quem entrar até o fim do tempo corre junto.")}
      seats={list.map((e) => ({ name: e.name }))}
      cap={SEATS}
      count={t("gincanaLobbyCount", "{n} de 8 na gincana").replace("{n}", String(Math.max(1, list.length)))}
      until={until}
      onCancel={onCancel}
    />
  )
}

// ═══ menu ════════════════════════════════════════════════════════════════════
// 18/11: a escolha de fase no layout da Antigravidade mora em phase-select.tsx.

function Menu(props: { phase: string; onPhase: (p: string) => void; onPlay: (multi: boolean) => void; onShow?: () => void; onExit: () => void; multi: boolean; error: string | null }) {
  return <GincanaPhaseSelect {...props} record={loadRecord} fmt={fmt} />
}

// ═══ prova ═══════════════════════════════════════════════════════════════════

function GincanaScreen({
  body,
  look,
  name,
  mp,
  phase,
  show,
  onAgain,
  onNext,
  onMenu,
}: {
  body: BodyId
  look?: string
  name?: string
  mp?: Mp
  phase: string
  show?: Show
  onAgain: () => void
  onNext?: () => void
  onMenu: () => void
}) {
  const t = useTranslations("MeuMundo")
  const theme = themeOf(phase)
  const sections = useSections(theme)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const gameRef = useRef<GincanaGameHandle | null>(null)
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading")
  const [hud, setHud] = useState<GincanaHud | null>(null)
  const [result, setResult] = useState<{ r: GincanaResult; record: boolean; best: number | null } | null>(null)
  const [toast, setToast] = useState<{ text: string; tone: "ok" | "hot" | "bad" | "gold"; id: number } | null>(null)
  const [muted, setMuted] = useState(false)
  const [final, setFinal] = useState<GincanaResultRow[] | null>(null)
  const [offline, setOffline] = useState(false)
  const [isTouch, setIsTouch] = useState(() => typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches && !window.matchMedia("(any-pointer: fine)").matches)
  const textRef = useRef(t)
  useEffect(() => {
    textRef.current = t
  }, [t])
  // tela de toque que ganha mouse vira PC
  useEffect(() => {
    if (!isTouch) return
    const onMove = (e: PointerEvent) => e.pointerType === "mouse" && setIsTouch(false)
    window.addEventListener("pointermove", onMove)
    return () => window.removeEventListener("pointermove", onMove)
  }, [isTouch])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    let alive = true
    let timer: ReturnType<typeof setTimeout> | null = null
    let seq = 0
    const say = (text: string, tone: "ok" | "hot" | "bad" | "gold" = "ok", ms = 1400) => {
      const id = ++seq
      setToast({ text, tone, id })
      if (timer) clearTimeout(timer)
      timer = setTimeout(() => alive && setToast((cur) => (cur?.id === id ? null : cur)), ms)
    }
    const onNotice = (n: GincanaNotice) => {
      if (!alive) return
      emitMinigame("gincana", n) // o personagem comenta a jogada (banter.ts)
      const tt = textRef.current
      switch (n.kind) {
        case "go":
          say(tt("gincanaGo", "VAI!"), "hot", 900)
          break
        case "hit":
          say(
            n.by === "bar"
              ? theme.id === "estaleiro"
                ? tt("gincanaHitBlade", "Pancada da pá!")
                : tt("gincanaHitBar", "Barrada!")
              : n.by === "swing"
                ? theme.id === "tanque"
                  ? tt("gincanaHitHook", "Pancada do gancho!")
                  : tt("gincanaHitSwing", "Bolada do pêndulo!")
                : n.by === "glove"
                  ? theme.id === "tanque"
                    ? tt("gincanaHitPiston", "Socado pelo pistão!")
                    : tt("gincanaHitGlove", "Luvada!")
                  : n.by === "push"
                    ? tt("gincanaHitPush", "Empurrado!")
                    : n.by === "tackle"
                      ? tt("gincanaHitTackle", "Derrubado por um mergulho!")
                      : theme.id === "tanque"
                        ? tt("gincanaHitBarrel", "Atropelado pelo barril!")
                        : tt("gincanaHitBall", "Atropelado pela bola!"),
            "bad",
            1100,
          )
          break
        case "splash":
          say(tt("gincanaSplash", "Tchibum! Voltando ao último posto"), "bad", 1500)
          break
        case "logo":
          say(tt("gincanaLogo", "TURBO DA FREELANDOO!"), "gold", 1100)
          break
        case "cp":
          say(tt("gincanaCheckpoint", "Posto {n} garantido").replace("{n}", String(n.cp)), "ok", 1200)
          break
        case "finish":
          say(tt("gincanaFinishToast", "Chegou em {n}º!").replace("{n}", String(n.place)), "gold", 2200)
          break
        case "timeout":
          say(tt("gincanaTimeout", "Tempo esgotado!"), "bad", 2000)
          break
        case "door":
          say(n.open ? tt("gincanaDoorOpen", "Porta aberta!") : tt("gincanaDoorFake", "Porta falsa!"), n.open ? "ok" : "bad", 900)
          break
        case "grab":
          say(tt("gincanaGrab", "Agarrou!"), "hot", 800)
          break
        case "held":
          say(tt("gincanaHeld", "Te agarraram!"), "bad", 900)
          break
        case "climb":
          say(tt("gincanaClimb", "Subiu na beira!"), "ok", 700)
          break
        case "eliminated":
          say(tt("gincanaEliminated", "Eliminado: a vaga encheu!"), "bad", 2200)
          break
        case "out":
          say(theme.id === "floresta" ? tt("gincanaOutSwamp", "O pântano te pegou! Fora da prova") : theme.id === "tanque" ? tt("gincanaOutOil", "O óleo te pegou! Fora da prova") : tt("gincanaOutFall", "Caiu! Fora da prova"), "bad", 2400)
          break
        case "rise":
          say(theme.id === "tanque" ? tt("gincanaRiseNearOil", "O óleo está chegando: suba!") : tt("gincanaRiseNear", "O pântano está chegando: suba!"), "hot", 1300)
          break
        case "gem":
          say(tt("gincanaGem", "+{n} engrenagem").replace("{n}", String(n.v)), "gold", 800)
          break
        default:
          break
      }
    }
    const onEnd = (r: GincanaResult) => {
      if (!alive) return
      if (mp || r.time < 0) {
        setResult({ r, record: false, best: mp ? null : loadRecord(phase) })
        return
      }
      const prev = loadRecord(phase)
      const record = prev === null || r.time < prev
      if (record) saveRecord(phase, r.time)
      setResult({ r, record, best: prev })
    }
    try {
      gameRef.current = createGincanaGame({
        canvas,
        body,
        look,
        name,
        mp,
        phase,
        botNames: BOT_NAMES,
        onReady: () => alive && setStatus("ready"),
        onHud: (h) => alive && setHud(h),
        onNotice,
        onEnd: (r) => {
          // a chegada aparece um pouco antes do quadro de resultado
          setTimeout(() => onEnd(r), r.time >= 0 ? 1800 : 600)
        },
        onError: () => alive && setStatus("error"),
      })
    } catch (err) {
      console.error("[gincana] falha ao abrir", err)
      setStatus("error")
    }
    return () => {
      alive = false
      if (timer) clearTimeout(timer)
      gameRef.current?.dispose()
      gameRef.current = null
    }
    // a largada (mp) é fixa durante a vida desta tela
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [body, look])

  // em grupo: o resultado da sala e a queda da conexão; a sala sai com a tela
  useEffect(() => {
    if (!mp) return
    const id = setInterval(() => {
      if (mp.net.result) setFinal(mp.net.result)
      setOffline(mp.net.status === "offline" || mp.net.status === "replaced")
    }, 400)
    return () => {
      clearInterval(id)
      mp.net.dispose()
    }
  }, [mp])

  const toggleMute = useCallback(() => {
    setMuted((m) => {
      gameRef.current?.setMuted(!m)
      return !m
    })
  }, [])

  const glass = "rgba(28, 16, 52, 0.58)"
  const ord = (n: number) => t("gincanaOrd", "{n}º").replace("{n}", String(n))
  return (
    <>
      <canvas ref={canvasRef} className="block h-full w-full outline-none" style={{ touchAction: "none" }} aria-label={t("gincanaAria", "Gincana")} />

      {status === "ready" && hud && (
        <>
          <MinigameBanter running={hud.phase === "run" && !hud.finished} body={body} />
          <GodVoice god="maru" show={!!result || !!final} />
          {/* posição, tempo e o placar ao vivo */}
          <div className="pointer-events-none absolute flex flex-col items-start gap-1.5" style={{ top: SAFE.top, left: SAFE.left }}>
            <div className="flex items-end gap-2 rounded-none px-3 py-1.5 leading-none" style={{ background: glass, border: `1px solid ${MM.border}` }}>
              <span className="text-[34px] font-black italic tabular-nums text-white max-[759px]:text-[26px]">{ord(hud.place)}</span>
              <span className="pb-1 text-[13px] font-bold" style={{ color: MM.muted }}>
                / {hud.total}
              </span>
              <span className="ml-1 flex items-center gap-1 pb-1 text-[14px] font-black tabular-nums" style={{ color: YELLOW }}>
                <Timer className="h-3.5 w-3.5" /> {fmt(hud.finished ? hud.myTime : hud.time)}
              </span>
            </div>
            {/* celular: o trecho e o tempo que falta aqui (a faixa do topo não cabe) */}
            <div className="hidden items-center gap-1.5 max-[759px]:flex">
              {hud.mode === "race" && hud.section > 0 && hud.section < 6 && (
                <span className="rounded-full px-2 py-0.5 text-[11px] font-black italic" style={{ background: YELLOW, color: "#3a1d6e" }}>
                  {hud.section}. {sections[hud.section]}
                </span>
              )}
              {hud.phase === "run" && hud.timeLeft < 30 && !hud.finished && (
                <span className="rounded-full px-2 py-0.5 text-[11px] font-black tabular-nums" style={{ background: "rgba(110,16,34,0.85)", color: "#fff" }}>
                  {t("gincanaTimeLeft", "Faltam {s} s").replace("{s}", String(Math.ceil(hud.timeLeft)))}
                </span>
              )}
            </div>
            {/* Gincana 3: o perigo que sobe (a quantos metros do pé) */}
            {!result && hud.riseGap < 5 && (
              <div className="rounded-full px-2.5 py-0.5 text-[11px] font-black italic tabular-nums" style={{ background: hud.riseGap < 2.5 ? "rgba(110,16,34,0.9)" : "rgba(40,90,40,0.85)", color: "#fff" }}>
                {(theme.id === "tanque" ? t("gincanaRiseGapOil", "Óleo a {m} m") : t("gincanaRiseGap", "Pântano a {m} m")).replace("{m}", Math.max(0, hud.riseGap).toFixed(1))}
              </div>
            )}
            {/* sobrevivência: quantos ainda em pé; coleta/zona: meus pontos */}
            {!result && hud.mode === "survive" && (
              <div className="flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-black" style={{ background: glass, color: hud.alive <= hud.quota + 1 ? PINK : MM.text }}>
                <Users className="h-3 w-3" style={{ color: TEAL }} />
                {t("gincanaAlive", "Em pé {n} · vaga {q}").replace("{n}", String(hud.alive)).replace("{q}", String(hud.quota))}
              </div>
            )}
            {!result && (hud.mode === "collect" || hud.mode === "zone") && (
              <div className="flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-black tabular-nums" style={{ background: glass, color: YELLOW }}>
                <Trophy className="h-3 w-3" />
                {(hud.mode === "zone" ? t("gincanaZonePts", "{n} s no topo") : t("gincanaPts", "{n} pontos")).replace("{n}", String(Math.floor(hud.pts)))}
              </div>
            )}
            {/* quantos já classificaram (a vaga fecha a prova) */}
            {!result && hud.mode === "race" && (
              <div className="flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-black" style={{ background: glass, color: hud.qualified >= hud.quota - 1 ? PINK : MM.text }}>
                <Flag className="h-3 w-3" style={{ color: TEAL }} />
                {t("gincanaQualified", "Classificados {n}/{q}").replace("{n}", String(hud.qualified)).replace("{q}", String(hud.quota))}
              </div>
            )}
            {(hud.grabbing || hud.held) && !result && (
              <div className="rounded-full px-2.5 py-0.5 text-[11px] font-black italic" style={{ background: hud.held ? "rgba(110,16,34,0.85)" : `${PINK}dd`, color: "#fff" }}>
                {hud.held ? t("gincanaHeldNow", "Segurado!") : t("gincanaGrabbingNow", "Agarrando")}
              </div>
            )}
            {hud.boost > 0 && !result && (
              <div className="flex items-center gap-2 rounded-full px-2.5 py-1" style={{ background: "rgba(70,52,12,0.88)", border: `1px solid ${MM.goldBorder}`, boxShadow: "0 0 18px rgba(242,183,5,0.55)" }}>
                <span className="text-[11px] font-black italic uppercase tracking-[0.12em]" style={{ color: "#FFE3A0" }}>
                  {t("gincanaTurbo", "Turbo")}
                </span>
                <span className="block h-1.5 w-[88px] overflow-hidden rounded-full" style={{ background: "rgba(255,255,255,0.15)" }}>
                  <span className="block h-full origin-left rounded-full" style={{ width: "100%", transform: `scaleX(${hud.boost})`, background: "linear-gradient(90deg, #FFE58A, #F2B705)" }} />
                </span>
              </div>
            )}
            {!result && <BoardStrip rows={hud.board} glass={glass} />}
            {offline && !result && (
              <div className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold" style={{ background: "rgba(110,16,34,0.85)", color: "#ffd5dc" }}>
                <WifiOff className="h-3.5 w-3.5" /> {t("gincanaOffline", "Sem conexão com o grupo")}
              </div>
            )}
          </div>
          {/* trecho e tempo que falta */}
          <div className="pointer-events-none absolute left-1/2 flex -translate-x-1/2 flex-col items-center gap-1 max-[759px]:hidden" style={{ top: SAFE.top }}>
            <div className="flex items-center gap-1 rounded-full px-2 py-1" style={{ background: glass, display: hud.mode === "race" ? undefined : "none" }}>
              {sections.slice(1, 6).map((s, i) => {
                const on = hud.section === i + 1
                const done = hud.section > i + 1
                return (
                  <span
                    key={i}
                    className="rounded-full px-2 py-0.5 text-[11px] font-black italic max-[759px]:px-1.5 max-[759px]:text-[10px]"
                    style={{ background: on ? YELLOW : done ? "rgba(255,255,255,0.22)" : "transparent", color: on ? "#3a1d6e" : done ? "#fff" : MM.muted }}
                  >
                    {on ? s : i + 1}
                  </span>
                )
              })}
            </div>
            {hud.phase === "run" && hud.timeLeft < 30 && !hud.finished && (
              <span className="rounded-full px-2.5 py-0.5 text-[12px] font-black tabular-nums" style={{ background: "rgba(110,16,34,0.85)", color: "#fff" }}>
                {t("gincanaTimeLeft", "Faltam {s} s").replace("{s}", String(Math.ceil(hud.timeLeft)))}
              </span>
            )}
          </div>
          {/* sair e som */}
          <div className="absolute flex flex-col gap-2" style={{ top: SAFE.top, right: SAFE.right }}>
            <button type="button" aria-label={t("gincanaBackMenu", "Voltar ao menu")} onClick={onMenu} className="grid h-10 w-10 place-items-center rounded-full text-white" style={{ background: glass, border: `1px solid ${MM.border}` }}>
              <X className="h-5 w-5" />
            </button>
            <button type="button" aria-label={muted ? t("gincanaSoundOn", "Ligar som") : t("gincanaSoundOff", "Desligar som")} onClick={toggleMute} className="grid h-10 w-10 place-items-center rounded-full text-white" style={{ background: glass, border: `1px solid ${MM.border}` }}>
              {muted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
            </button>
          </div>

          {/* Relógio da Praça: decore / atenção / o símbolo chamado */}
          {!result && hud.phase === "run" && hud.mem && hud.mem.ph >= 1 && hud.mem.ph <= 4 && (
            <div className="pointer-events-none absolute inset-x-0 flex flex-col items-center gap-1" style={{ top: "22%" }}>
              <span className="rounded-full px-3 py-0.5 text-[11px] font-black uppercase tracking-wider" style={{ background: "rgba(0,0,0,0.55)", color: "#F2B705" }}>
                {t("gincanaMemRound", "Rodada {n}").replace("{n}", String(hud.mem.r + 1))}
              </span>
              {hud.mem.sym >= 0 ? (
                <div className="flex flex-col items-center gap-1 rounded-2xl px-5 py-2" style={{ background: "rgba(10,8,6,0.62)" }}>
                  <span className="text-[13px] font-black italic text-white">{t("gincanaMemCall", "O relógio chama:")}</span>
                  <MemSymbol s={hud.mem.sym} size={isTouch ? 64 : 84} />
                </div>
              ) : (
                <span className="rounded-2xl px-4 py-1.5 text-[18px] font-black italic text-white" style={{ background: "rgba(10,8,6,0.55)", textShadow: "0 2px 10px rgba(0,0,0,0.6)" }}>
                  {hud.mem.ph === 1 ? t("gincanaMemShow", "Decore os símbolos!") : t("gincanaMemHide", "Atenção…")}
                  {hud.mem.ph === 1 && <span className="ml-2 tabular-nums text-[#F2B705]">{Math.ceil(hud.mem.left)}</span>}
                </span>
              )}
            </div>
          )}
          {hud.phase === "countdown" && (
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-4">
              <span key={Math.ceil(hud.countdown)} className="text-[120px] font-black italic leading-none text-white" style={{ textShadow: "0 6px 28px rgba(58,29,110,0.55)", WebkitTextStroke: `3px ${PINK}` }}>
                {Math.max(1, Math.ceil(hud.countdown))}
              </span>
              <span className="max-w-[360px] rounded-full px-4 py-2 text-center text-[13px] font-semibold" style={{ background: glass, color: MM.text }}>
                {isTouch ? t("gincanaHintTouch2", "Joystick anda · PULAR, MERGULHAR e AGARRAR à direita") : t("gincanaHintKeys2", "WASD anda · Espaço pula · Shift mergulha · F agarra")}
              </span>
            </div>
          )}
          {toast && !result && (
            <div className="pointer-events-none absolute left-1/2 -translate-x-1/2" style={{ top: "calc(max(12px, env(safe-area-inset-top)) + 64px)" }}>
              <div
                key={toast.id}
                role="status"
                className="rounded-full px-4 py-2 text-[16px] font-black italic tracking-wide shadow-lg max-[759px]:text-[13.5px]"
                style={{
                  background: toast.tone === "hot" ? `linear-gradient(90deg, ${PINK}, ${ORANGE})` : toast.tone === "bad" ? "rgba(110, 16, 34, 0.9)" : toast.tone === "gold" ? `linear-gradient(90deg, ${YELLOW}, ${ORANGE})` : MM.surface,
                  color: toast.tone === "gold" ? "#3a1d6e" : "#fff",
                  border: `1px solid ${MM.border}`,
                }}
              >
                {toast.text}
              </div>
            </div>
          )}
          {isTouch && !result && hud.phase !== "end" && <TouchControls gameRef={gameRef} />}
          {result && <Results result={result.r} record={result.record} best={result.best} live={hud.board} quota={hud.quota} final={final} me={mp ? mp.start.me : 0} group={!!mp} onAgain={onAgain} onNext={onNext} show={show} onMenu={onMenu} mode={hud.mode} phaseId={theme.id} />}
        </>
      )}

      {status !== "ready" && (
        <div className="absolute inset-0 grid place-items-center" style={{ background: BG }}>
          <div className="flex flex-col items-center gap-3 text-center" style={{ color: MM.text }}>
            {status === "loading" ? (
              <>
                <Loader2 className="h-7 w-7 animate-spin" />
                <span className="text-[15px] font-semibold">{t("gincanaLoading", "Enchendo os infláveis…")}</span>
              </>
            ) : (
              <>
                <span className="text-[16px] font-bold">{t("gincanaErrorTitle", "A gincana não abriu")}</span>
                <span className="max-w-[320px] text-[13px]" style={{ color: MM.muted }}>
                  {t("errorDesc", "O navegador não conseguiu iniciar o 3D. Tente de novo; se continuar, volte ao perfil.")}
                </span>
                <button type="button" onClick={onMenu} className="mt-1 rounded-full px-4 py-2 text-[14px] font-bold text-white" style={{ background: MM.rubyFill }}>
                  {t("gincanaBackMenu", "Voltar ao menu")}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}

function ActionBtn({ label, color, size, onPress }: { label: string; color: string; size: number; onPress: () => void }) {
  return (
    <button
      type="button"
      aria-label={label}
      onPointerDown={(e) => {
        e.preventDefault()
        e.stopPropagation()
        onPress()
      }}
      className="grid shrink-0 place-items-center rounded-full text-[12px] font-black uppercase italic tracking-wide text-white transition-transform active:scale-95"
      style={{ width: size, height: size, touchAction: "none", background: `radial-gradient(circle at 35% 30%, ${color}, ${color}cc 62%, ${color}99)`, boxShadow: "0 6px 18px rgba(0,0,0,0.3), 0 0 0 2px rgba(255,255,255,0.25) inset" }}
    >
      {label}
    </button>
  )
}

/** Botão que vale enquanto está apertado (AGARRAR). */
function HoldBtn({ label, color, size, onHold }: { label: string; color: string; size: number; onHold: (on: boolean) => void }) {
  const [on, setOn] = useState(false)
  const set = (v: boolean) => {
    setOn(v)
    onHold(v)
  }
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={on}
      onPointerDown={(e) => {
        e.preventDefault()
        e.stopPropagation()
        ;(e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId)
        set(true)
      }}
      onPointerUp={() => set(false)}
      onPointerCancel={() => set(false)}
      onLostPointerCapture={() => set(false)}
      className="grid shrink-0 place-items-center rounded-full text-[11px] font-black uppercase italic tracking-wide text-white"
      style={{ width: size, height: size, touchAction: "none", transform: on ? "scale(0.94)" : "none", background: `radial-gradient(circle at 35% 30%, ${color}, ${color}cc 62%, ${color}99)`, boxShadow: on ? `0 0 0 3px #fff inset, 0 0 16px ${color}` : "0 6px 18px rgba(0,0,0,0.3), 0 0 0 2px rgba(255,255,255,0.25) inset" }}
    >
      {label}
    </button>
  )
}

function TouchControls({ gameRef }: { gameRef: React.RefObject<GincanaGameHandle | null> }) {
  const t = useTranslations("MeuMundo")
  const dive = useCallback(() => gameRef.current?.dive(), [gameRef])
  const jump = useCallback(() => gameRef.current?.jump(), [gameRef])
  const grab = useCallback((on: boolean) => gameRef.current?.setGrab(on), [gameRef])
  return (
    <>
      <Joystick gameRef={gameRef} />
      <div className="absolute flex items-end gap-3" style={{ right: SAFE.right, bottom: "calc(max(16px, env(safe-area-inset-bottom)) + 16px)" }}>
        <div className="flex flex-col items-center gap-3">
          <HoldBtn label={t("gincanaGrabBtn", "Agarrar")} color={ORANGE} size={60} onHold={grab} />
          <ActionBtn label={t("gincanaDive", "Mergulhar")} color={TEAL} size={72} onPress={dive} />
        </div>
        <div className="pb-10">
          <ActionBtn label={t("gincanaJump", "Pular")} color={PINK} size={92} onPress={jump} />
        </div>
      </div>
    </>
  )
}

/** Placar ao vivo: os 4 primeiros e eu (se não estiver entre eles). */
function BoardStrip({ rows, glass }: { rows: BoardRow[]; glass: string }) {
  const mine = rows.findIndex((r) => r.me)
  const shown = rows.map((r, i) => ({ r, i })).filter(({ i }) => i < 4 || i === mine)
  return (
    <ol className="flex w-[176px] flex-col gap-0.5 rounded-none px-2 py-1.5 max-[759px]:w-[140px]" style={{ background: glass, border: `1px solid ${MM.border}` }}>
      {shown.map(({ r, i }) => (
        <li key={r.slot} className="flex items-center gap-1.5 text-[12px] leading-tight max-[759px]:text-[11px]" style={{ color: r.me ? YELLOW : MM.text }}>
          <span className="w-4 shrink-0 text-right font-black tabular-nums">{i + 1}</span>
          <span className="min-w-0 flex-1 truncate font-semibold">{r.name}</span>
          {r.out ? (
            <span className="shrink-0 text-[10px] font-black uppercase" style={{ color: PINK }}>
              ✕
            </span>
          ) : r.pts > 0 ? (
            <span className="shrink-0 text-[11px] font-black tabular-nums" style={{ color: YELLOW }}>
              {Math.floor(r.pts)}
            </span>
          ) : r.fin >= 0 ? (
            <Flag className="h-3 w-3 shrink-0" style={{ color: TEAL }} />
          ) : (
            <span className="block h-1 w-8 shrink-0 overflow-hidden rounded-full" style={{ background: "rgba(255,255,255,0.15)" }}>
              <span className="block h-full origin-left rounded-full" style={{ width: "100%", transform: `scaleX(${r.progress})`, background: r.me ? YELLOW : PINK }} />
            </span>
          )}
        </li>
      ))}
    </ol>
  )
}

function Results({
  result,
  record,
  best,
  live,
  quota,
  final,
  me,
  group,
  onAgain,
  onNext,
  show,
  onMenu,
  mode,
  phaseId,
}: {
  onNext?: () => void
  show?: Show
  mode: GincanaHud["mode"]
  phaseId: string
  result: GincanaResult
  record: boolean
  best: number | null
  live: BoardRow[]
  quota: number
  final: GincanaResultRow[] | null
  me: number
  group: boolean
  onAgain: () => void
  onMenu: () => void
}) {
  const t = useTranslations("MeuMundo")
  const rows = final
    ? final.map((r) => ({ slot: r.slot, name: r.name, fin: r.fin, gone: r.gone, me: r.slot === me, bot: r.bot, out: (r.out ?? -1) >= 0, pts: r.pts ?? 0 }))
    : live.map((r) => ({ slot: r.slot, name: r.name, fin: r.fin, gone: false, me: r.me, bot: r.bot, out: r.out, pts: r.pts }))
  const place = rows.findIndex((r) => r.me) + 1 || result.place
  // ainda na prova (o quadro final da sala não chegou)
  const running = final ? 0 : rows.filter((r) => r.fin < 0 && !r.out).length
  const scored = mode === "collect" || mode === "zone"
  const title = result.out
    ? phaseId === "floresta"
      ? t("gincanaOutSwampTitle", "O pântano te pegou!")
      : t("gincanaOutTitle", "Fora da prova!")
    : scored
      ? place === 1
        ? t("gincanaWin", "1º lugar! Você venceu!")
        : t("gincanaPlaceScore", "{n}º lugar").replace("{n}", String(place))
      : mode === "survive"
        ? t("gincanaSurvived", "Você ficou em pé!")
        : result.time < 0
          ? result.qualified
            ? t("gincanaNoTime", "O tempo acabou!")
            : t("gincanaOut", "Eliminado! A vaga encheu antes")
          : place === 1
            ? t("gincanaWin", "1º lugar! Você venceu!")
            : t("gincanaPlaceTitle", "Você chegou em {n}º").replace("{n}", String(place))
  return (
    <div className="absolute inset-0 grid place-items-center p-4" style={{ background: MM.scrim }}>
      <div className="w-full max-w-[420px] rounded-none p-4" style={{ background: MM.surface, color: MM.text, border: `1px solid ${MM.border}`, boxShadow: MM.shadow }}>
        <div className="flex items-center gap-2 text-[12px] font-bold uppercase tracking-[0.14em]" style={{ color: TEAL }}>
          <Flag className="h-4 w-4" /> {t("gincanaAria", "Gincana")}
          {show && (
            <span style={{ color: MM.muted }}>
              · {t("gincanaShowRound", "Rodada {n} de {m}").replace("{n}", String(show.round + 1)).replace("{m}", String(show.phases.length))}
            </span>
          )}
        </div>
        <h2 className="mt-1 text-[25px] font-black italic leading-tight" style={{ color: place === 1 && result.time >= 0 ? YELLOW : MM.text }}>
          {title}
        </h2>
        <p className="mt-1 inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[12px] font-black uppercase tracking-[0.08em]" style={{ background: result.qualified ? "rgba(99,224,90,0.18)" : "rgba(110,16,34,0.6)", color: result.qualified ? "#9BF59A" : "#ffd5dc" }}>
          {result.qualified ? t("gincanaQualifiedTag", "Classificado") : t("gincanaEliminatedTag", "Eliminado")}
        </p>
        {show && result.qualified && !onNext && (
          <p className="mt-2 flex items-center gap-2 text-[16px] font-black italic" style={{ color: YELLOW }}>
            <Crown className="h-5 w-5" /> {t("gincanaShowChampion", "Campeão da Gincana! A coroa é sua.")}
          </p>
        )}
        {show && !result.qualified && (
          <p className="mt-2 text-[13px]" style={{ color: MM.muted }}>
            {t("gincanaShowOver", "Fim do programa na rodada {n}. Tente de novo: as provas são sorteadas outra vez.").replace("{n}", String(show.round + 1))}
          </p>
        )}
        {result.time >= 0 && (
          <p className="mt-1 flex items-center gap-1.5 text-[15px] font-bold tabular-nums">
            <Timer className="h-4 w-4" style={{ color: YELLOW }} /> {fmt(result.time)}
            {record && (
              <span className="ml-2 flex items-center gap-1 text-[13px]" style={{ color: MM.gold }}>
                <Trophy className="h-4 w-4" /> {t("gincanaNewRecord", "Novo recorde!")}
              </span>
            )}
          </p>
        )}
        {!record && best && !group && (
          <p className="mt-1 text-[13px]" style={{ color: MM.muted }}>
            {t("gincanaRecord", "Seu recorde: {t}").replace("{t}", fmt(best))}
          </p>
        )}
        <div className="mt-3 rounded-none p-2" style={{ background: MM.card }}>
          <div className="flex items-center justify-between gap-2 px-1 text-[11px] font-bold uppercase tracking-[0.1em]" style={{ color: MM.muted }}>
            <span>{t("gincanaStandings", "Classificação")}</span>
            {running > 0 && (
              <span className="flex items-center gap-1 normal-case tracking-normal" style={{ color: TEAL }}>
                <Loader2 className="h-3 w-3 animate-spin" /> {t("gincanaStillRunning", "{n} ainda correndo").replace("{n}", String(running))}
              </span>
            )}
          </div>
          <ol className="mt-1.5 flex max-h-[38vh] flex-col gap-1 overflow-y-auto">
            {rows.map((r, i) => (
              <li key={r.slot} className="flex items-center gap-2 rounded-none px-2 py-1 text-[13px]" style={{ background: r.me ? MM.rubySoft : "transparent", borderTop: i === quota ? `1px dashed ${PINK}` : undefined }}>
                <span className="w-5 shrink-0 text-right font-black tabular-nums" style={{ color: i === 0 ? YELLOW : MM.muted }}>
                  {i + 1}
                </span>
                <span className="min-w-0 flex-1 truncate font-semibold">{r.name}</span>
                <span className="shrink-0 text-[11px]" style={{ color: MM.muted }}>
                  {r.gone ? t("gincanaGone", "saiu") : r.bot ? t("gincanaCpu", "computador") : ""}
                </span>
                <span className="shrink-0 font-black italic tabular-nums" style={{ color: r.out ? PINK : undefined }}>
                  {scored ? Math.floor(r.pts) : r.out ? t("gincanaOutTag", "fora") : r.fin >= 0 ? fmt(r.fin) : "—"}
                </span>
              </li>
            ))}
          </ol>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2">
          {show && result.qualified && onNext ? (
            <button type="button" onClick={onNext} className="rounded-none px-3 py-3 text-[15px] font-bold" style={{ background: `linear-gradient(180deg, #FFE58A, ${YELLOW})`, color: "#3a1d6e" }}>
              {t("gincanaShowNext", "Próxima rodada")}
            </button>
          ) : (
            <button type="button" onClick={onAgain} className="rounded-none px-3 py-3 text-[15px] font-bold text-white" style={{ background: `linear-gradient(180deg, ${PINK}, #d93a86)` }}>
              {t("gincanaAgain", "De novo")}
            </button>
          )}
          <button type="button" onClick={onMenu} className="rounded-none px-3 py-3 text-[15px] font-bold" style={{ background: MM.card, border: `1px solid ${MM.border}` }}>
            {t("gincanaBackMenu", "Voltar ao menu")}
          </button>
        </div>
      </div>
    </div>
  )
}
