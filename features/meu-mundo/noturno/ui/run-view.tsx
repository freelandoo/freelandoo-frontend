"use client"

// features/meu-mundo/noturno/ui/run-view.tsx — ROLÊ NOTURNO (mm3d-40): a tela.
//
// Cobre o centro (suspenso por baixo, como a Corrida e o Paint). Telas:
//  - MENU: escolher bicicleta, skate ou patins (o último fica lembrado no
//    aparelho), como jogar e os recordes de cada veículo.
//  - JOGO: a cena (run-game.ts) com pontos e moedas em cima à esquerda,
//    velocidade no alto, contagem, avisos (manobra, tropeço, 50 moedas) e a
//    borda vermelha enquanto o próximo tropeço derruba.
//  - FIM: o que derrubou, pontos, moedas, distância, manobras e o recorde.
//
// mm3d-42: MULTIPLAYER (pedido do Alex, "na mesma tela como o Antigravidade"):
// a sala espera até 20 s por quem está no centro (4 largam na hora; vaga vazia vira computador), todos
// correm na MESMA rua; o placar do grupo fica embaixo das moedas e o fim mostra
// a classificação ao vivo até o último cair. Até 4 no rolê: vaga vazia vira
// computador (regra do Alex, 2026-11-09). O logo da Freelandoo (a cada 700 m) acende
// a barra dourada do PODER embaixo da velocidade.
//
// ROLÊ NOTURNO 2.0: o menu virou ESCOLHA SUA ROTA (route-select.tsx) — cinco
// rotas novas com curvas, descidas e loops e a Clássica de antes; a rota vai
// para a sala (largada só com quem escolheu a mesma) e para a cena. Recordes
// por rota e veículo (a Clássica guarda os de antes, por veículo).

import { useCallback, useEffect, useRef, useState } from "react"
import { Bike, Loader2, Trophy, User, Users, Volume2, VolumeX, WifiOff, X } from "lucide-react"
import { BackToCity } from "../../ui/kit/back-to-city"
import { useTranslations } from "@/components/i18n/I18nProvider"
import { WaitingRoom } from "../../ui/kit/waiting-room"
import { MM } from "../../ui/hud/tokens"
import { archivo } from "../../ui/status/evo-skin"
import { SAFE } from "../../ui/meu-mundo-view"
import type { BodyId } from "../../types"
import type { RideKind } from "../sim/run"
import { isRunPhase, type RunPhase } from "../sim/track"
import { RouteSelect, type RouteRecord } from "./route-select"
import { CRASH_TEXT } from "../engine/route-art"
import { createRunGame, type FieldRow, type RunGameHandle, type RunHud, type RunNotice, type RunResult } from "../engine/run-game"
import type { NoturnoLobbyEntry, NoturnoNet, NoturnoNetStatus, NoturnoResultRow, NoturnoStart } from "../engine/net"

/** O servidor recusou a entrada; a mensagem já vem traduzida. */
export class JoinRefused extends Error {}

/** Entrar numa largada em grupo (null = a sala não abriu; JoinRefused = recusou com motivo). */
export type NoturnoJoin = (
  ride: RideKind,
  body: BodyId,
  hooks: { signal: AbortSignal; onLobby: (list: NoturnoLobbyEntry[], until: number) => void; onStatus: (s: NoturnoNetStatus) => void },
  phase: RunPhase,
) => Promise<{ net: NoturnoNet; start: NoturnoStart } | null>

export interface RunViewProps {
  body: BodyId
  look?: string
  /** Nome do jogador (no placar do grupo). */
  name?: string
  onExit: () => void
  /** Multiplayer (sem isto, só sozinho). */
  join?: NoturnoJoin
}

/** Vagas da largada em grupo. */
const MAX_RIDERS = 4

type Mp = { net: NoturnoNet; start: NoturnoStart }
type Stage = { kind: "menu" } | { kind: "lobby"; ride: RideKind; ac: AbortController } | { kind: "game"; ride: RideKind; phase: RunPhase; key: number; mp?: Mp }

const RIDE_ORDER: RideKind[] = ["bike", "skate", "skates"]
const NEON = "#FF4FB3"
const CYAN = "#5FE1FF"
const GOLD = "#FFC94A"
const BG = "radial-gradient(120% 90% at 50% 0%, #3a1f5c 0%, #140f26 58%, #07060d 100%)"

/** Recordes do aparelho, por veículo (conveniência local; some se o navegador limpar). */
type Rec = { score: number; coins: number; dist: number }
type Records = Partial<Record<RideKind, Rec>>
const REC_KEY = "mm-noturno-recordes-v1"
/** Rolê 2.0: recordes das rotas novas (rota → veículo → recorde). A Clássica segue em REC_KEY. */
const REC2_KEY = "mm-noturno-recordes-v2"
const RIDE_KEY = "mm-noturno-veiculo-v1"
const ROUTE_KEY = "mm-noturno-rota-v1"
type Records2 = Partial<Record<RunPhase, Records>>
function loadRecords2(): Records2 {
  try {
    return (JSON.parse(localStorage.getItem(REC2_KEY) || "null") as Records2 | null) ?? {}
  } catch {
    return {}
  }
}
/** Recorde de um veículo numa rota (a Clássica lê os de antes). */
function recordOf(phase: RunPhase, ride: RideKind): Rec | null {
  if (phase === "classica") return loadRecords()[ride] ?? null
  return loadRecords2()[phase]?.[ride] ?? null
}
function saveRecordOf(phase: RunPhase, ride: RideKind, rec: Rec) {
  try {
    if (phase === "classica") {
      const r = loadRecords()
      r[ride] = rec
      saveRecords(r)
      return
    }
    const all = loadRecords2()
    all[phase] = { ...(all[phase] ?? {}), [ride]: rec }
    localStorage.setItem(REC2_KEY, JSON.stringify(all))
  } catch {
    /* sem armazenamento */
  }
}
function loadRoute(): RunPhase {
  try {
    const r = localStorage.getItem(ROUTE_KEY)
    return isRunPhase(r) ? r : "canion"
  } catch {
    return "canion"
  }
}
function saveRoute(r: RunPhase) {
  try {
    localStorage.setItem(ROUTE_KEY, r)
  } catch {
    /* sem armazenamento */
  }
}
function loadRecords(): Records {
  try {
    return (JSON.parse(localStorage.getItem(REC_KEY) || "null") as Records | null) ?? {}
  } catch {
    return {}
  }
}
function saveRecords(r: Records) {
  try {
    localStorage.setItem(REC_KEY, JSON.stringify(r))
  } catch {
    /* sem armazenamento */
  }
}
function loadRide(): RideKind {
  try {
    const r = localStorage.getItem(RIDE_KEY) as RideKind | null
    return r && RIDE_ORDER.includes(r) ? r : "skate"
  } catch {
    return "skate"
  }
}
function saveRide(r: RideKind) {
  try {
    localStorage.setItem(RIDE_KEY, r)
  } catch {
    /* sem armazenamento */
  }
}

/** Skate visto de lado (a lucide não tem). */
function SkateIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M2 11.5c1 1.5 2 2 3.5 2h13c1.5 0 2.5-.5 3.5-2" />
      <circle cx="7" cy="17.5" r="1.8" />
      <circle cx="17" cy="17.5" r="1.8" />
    </svg>
  )
}

/** Patins (bota com rodinhas). */
function SkatesIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M6 3h5v7l6 2.5c1.5.6 2 1.5 2 3V17H5V4.5" />
      <circle cx="7.5" cy="20" r="1.6" />
      <circle cx="12" cy="20" r="1.6" />
      <circle cx="16.5" cy="20" r="1.6" />
    </svg>
  )
}

function RideIcon({ ride, className }: { ride: RideKind; className?: string }) {
  if (ride === "bike") return <Bike className={className} aria-hidden />
  if (ride === "skate") return <SkateIcon className={className} />
  return <SkatesIcon className={className} />
}

function useRideNames() {
  const t = useTranslations("MeuMundo")
  return {
    bike: t("noturnoRideBike", "Bicicleta"),
    skate: t("noturnoRideSkate", "Skate"),
    skates: t("noturnoRideSkates", "Patins"),
  } satisfies Record<RideKind, string>
}

export function RunView({ body, look, name, onExit, join }: RunViewProps) {
  const t = useTranslations("MeuMundo")
  const [stage, setStage] = useState<Stage>({ kind: "menu" })
  const [lobby, setLobby] = useState<{ list: NoturnoLobbyEntry[]; until: number }>({ list: [], until: 0 })
  const [error, setError] = useState<string | null>(null)
  const [pref, setPref] = useState<{ ride: RideKind; phase: RunPhase } | null>(null)
  useEffect(() => setPref({ ride: loadRide(), phase: loadRoute() }), [])
  const seq = useRef(0)
  const play = useCallback(
    async (ride: RideKind, multi = false, phase: RunPhase = "classica") => {
      saveRide(ride)
      saveRoute(phase)
      setPref({ ride, phase })
      setError(null)
      if (!multi || !join) {
        setStage({ kind: "game", ride, phase, key: ++seq.current })
        return
      }
      const ac = new AbortController()
      setLobby({ list: [], until: 0 })
      setStage({ kind: "lobby", ride, ac })
      const fail = (why?: string) => {
        setError(why || t("noturnoJoinFail2", "O rolê não abriu agora. Tente de novo."))
        setStage({ kind: "menu" })
      }
      try {
        const got = await join(ride, body, { signal: ac.signal, onLobby: (list, until) => setLobby({ list, until }), onStatus: () => {} }, phase)
        if (ac.signal.aborted) {
          got?.net.dispose()
          return
        }
        if (!got) return fail()
        // a rota que vale é a da sala (o servidor junta quem escolheu a mesma)
        const real = isRunPhase(got.start.phase) ? got.start.phase : "classica"
        setStage({ kind: "game", ride, phase: real, key: ++seq.current, mp: got })
      } catch (err) {
        // a recusa do servidor vem com o motivo (ex.: longe da porta) — mostra ele, não o genérico
        if (!ac.signal.aborted) fail(err instanceof JoinRefused ? err.message : undefined)
      }
    },
    [join, body, t],
  )
  return (
    <div className={`fixed inset-0 z-[70] touch-none select-none overflow-hidden ${archivo.className}`} style={{ background: "#07060d" }}>
      {stage.kind === "game" ? (
        <RunScreen
          key={stage.key}
          ride={stage.ride}
          phase={stage.phase}
          body={body}
          look={look}
          name={name}
          mp={stage.mp}
          onAgain={() => void play(stage.ride, !!stage.mp, stage.phase)}
          onMenu={() => setStage({ kind: "menu" })}
        />
      ) : stage.kind === "lobby" ? (
        <RunLobby
          list={lobby.list}
          until={lobby.until}
          onCancel={() => {
            stage.ac.abort()
            setStage({ kind: "menu" })
          }}
        />
      ) : (
        pref && (
          <RouteSelect
            phase={pref.phase}
            ride={pref.ride}
            records={(ph, r): RouteRecord | null => recordOf(ph, r)}
            multi={!!join}
            error={error}
            onExit={onExit}
            onPlay={(r, ph) => void play(r, !!join, ph)}
          />
        )
      )}
    </div>
  )
}

// ═══ espera (multiplayer) ════════════════════════════════════════════════════

function RunLobby({ list, until, onCancel }: { list: NoturnoLobbyEntry[]; until: number; onCancel: () => void }) {
  const t = useTranslations("MeuMundo")
  const names = useRideNames()
  // a mesma espera de todos os minijogos (ui/kit/waiting-room)
  return (
    <WaitingRoom
      background={BG}
      title={t("noturnoLobbyTitle", "Esperando a galera…")}
      text={t("noturnoLobbyHow20", "Quem entrar até o fim do tempo corre junto, na mesma rua. Ganha quem fizer mais pontos antes de cair.")}
      seats={list.map((e) => ({ name: e.name, icon: <RideIcon ride={e.ride} className="h-4 w-4 shrink-0" />, note: names[e.ride] }))}
      cap={MAX_RIDERS}
      count={t("noturnoLobbyCount4", "{n} de 4 no rolê").replace("{n}", String(Math.max(1, list.length)))}
      until={until}
      onCancel={onCancel}
    />
  )
}

// ═══ jogo ════════════════════════════════════════════════════════════════════

function RunScreen({
  ride,
  phase,
  body,
  look,
  name,
  mp,
  onAgain,
  onMenu,
}: {
  ride: RideKind
  phase: RunPhase
  body: BodyId
  look?: string
  name?: string
  mp?: Mp
  onAgain: () => void
  onMenu: () => void
}) {
  const t = useTranslations("MeuMundo")
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const gameRef = useRef<RunGameHandle | null>(null)
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading")
  const [hud, setHud] = useState<RunHud | null>(null)
  const [result, setResult] = useState<{ r: RunResult; record: boolean; best: Rec | null } | null>(null)
  const [toast, setToast] = useState<{ text: string; tone: "ok" | "hot" | "bad" | "gold"; id: number } | null>(null)
  const [muted, setMuted] = useState(false)
  const [final, setFinal] = useState<NoturnoResultRow[] | null>(null)
  const [offline, setOffline] = useState(false)
  const [isTouch] = useState(() => typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches && !window.matchMedia("(any-pointer: fine)").matches)
  const textRef = useRef(t)
  useEffect(() => {
    textRef.current = t
  }, [t])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    let alive = true
    let timer: ReturnType<typeof setTimeout> | null = null
    let seq = 0
    const say = (text: string, tone: "ok" | "hot" | "bad" | "gold" = "ok", ms = 1300) => {
      const id = ++seq
      setToast({ text, tone, id })
      if (timer) clearTimeout(timer)
      timer = setTimeout(() => alive && setToast((cur) => (cur?.id === id ? null : cur)), ms)
    }
    const onNotice = (n: RunNotice) => {
      if (!alive) return
      const tt = textRef.current
      switch (n.kind) {
        case "trick":
          say(
            (n.trick === "flip" ? tt("noturnoToastFlip", "Mortal! +{n}") : tt("noturnoToastTrick", "360°! +{n}")).replace("{n}", String(n.points)),
            "hot",
            1000,
          )
          break
        case "stumble":
          say(tt("noturnoToastStumble", "Quase! Mais um esbarrão e você cai"), "bad", 1600)
          break
        case "coins":
          say(tt("noturnoToastCoins", "{n} moedas!").replace("{n}", String(n.n)), "gold", 1100)
          break
        case "power":
          say(tt("noturnoToastPower", "PODER DA FREELANDOO! Exploda tudo!"), "gold", 1600)
          break
        case "smash":
          say(tt("noturnoToastSmash", "BOOM! +{n}").replace("{n}", String(n.points)), "hot", 650)
          break
        default:
          break
      }
    }
    const onEnd = (r: RunResult) => {
      if (!alive) return
      // em grupo o recorde do aparelho não conta (a rua é a do grupo)
      if (mp) {
        setResult({ r, record: false, best: null })
        return
      }
      const prev = recordOf(phase, ride)
      const record = !prev || r.score > prev.score
      const best: Rec = { score: Math.max(prev?.score ?? 0, r.score), coins: Math.max(prev?.coins ?? 0, r.coins), dist: Math.max(prev?.dist ?? 0, r.dist) }
      saveRecordOf(phase, ride, best)
      setResult({ r, record: record && r.score > 0, best: prev ?? null })
    }
    try {
      const g = createRunGame({
        canvas,
        ride,
        phase,
        body,
        look,
        name,
        mp,
        onReady: () => alive && setStatus("ready"),
        onHud: (h) => alive && setHud(h),
        onNotice,
        onEnd,
        onError: () => alive && setStatus("error"),
      })
      gameRef.current = g
    } catch (err) {
      console.error("[noturno] falha ao abrir", err)
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
  }, [ride, body, look])

  // em grupo: o resultado da sala (quando o último cai) e a queda da conexão; a sala sai com a tela
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

  const glass = "rgba(10, 8, 20, 0.62)"
  return (
    <>
      <canvas ref={canvasRef} className="block h-full w-full outline-none" style={{ touchAction: "none" }} aria-label={t("noturnoAria", "Rolê Noturno")} />

      {status === "ready" && hud && (
        <>
          {/* borda vermelha: o próximo esbarrão derruba */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{ opacity: hud.wobble && !result ? 1 : 0, transition: "opacity 250ms", boxShadow: "inset 0 0 90px rgba(255,40,60,0.55)" }}
          />
          {/* pontos e moedas */}
          <div className="pointer-events-none absolute flex flex-col items-start gap-1.5" style={{ top: SAFE.top, left: SAFE.left }}>
            <div className="rounded-none px-3 py-1.5 leading-none" style={{ background: glass, border: `1px solid ${MM.border}` }}>
              <div className="text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color: MM.muted }}>
                {t("noturnoScore", "Pontos")}
              </div>
              <div className="text-[32px] font-black italic tabular-nums text-white max-[759px]:text-[24px]">{hud.score.toLocaleString()}</div>
            </div>
            <div className="flex items-center gap-1.5 rounded-full px-2.5 py-1" style={{ background: glass, border: `1px solid ${MM.goldBorder}` }}>
              <span className="grid h-5 w-5 place-items-center rounded-full text-[11px] font-black" style={{ background: "radial-gradient(circle at 40% 35%, #FFE58A, #E9A714 70%)", color: "#7a4b00" }}>
                $
              </span>
              <span className="text-[17px] font-black tabular-nums" style={{ color: GOLD }}>
                {hud.coins}
              </span>
            </div>
            {hud.field && !result && <FieldStrip rows={hud.field} glass={glass} />}
            {offline && !result && (
              <div className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold" style={{ background: "rgba(110,16,34,0.85)", color: "#ffd5dc" }}>
                <WifiOff className="h-3.5 w-3.5" /> {t("noturnoOffline", "Sem conexão com o grupo")}
              </div>
            )}
          </div>
          {/* velocidade e distância no alto; embaixo, a barra do poder do logo */}
          <div className="pointer-events-none absolute left-1/2 flex -translate-x-1/2 flex-col items-center gap-1.5" style={{ top: SAFE.top }}>
            <div className="rounded-full px-3 py-1 text-center leading-tight" style={{ background: glass, boxShadow: hud.power > 0 ? "0 0 18px rgba(242,183,5,0.55)" : "none" }}>
              <span className="text-[16px] font-black italic tabular-nums" style={{ color: hud.power > 0 ? GOLD : "#fff" }}>
                {hud.speed}
              </span>
              <span className="ml-1 text-[11px]" style={{ color: MM.muted }}>
                km/h · {hud.dist} m
              </span>
            </div>
            {hud.power > 0 && (
              <div className="flex items-center gap-2 rounded-full px-2.5 py-1" style={{ background: "rgba(70,52,12,0.88)", border: `1px solid ${MM.goldBorder}` }}>
                <span className="text-[11px] font-black italic uppercase tracking-[0.12em]" style={{ color: "#FFE3A0" }}>
                  {t("noturnoPower", "Poder")}
                </span>
                <span className="block h-1.5 w-[92px] overflow-hidden rounded-full" style={{ background: "rgba(255,255,255,0.15)" }}>
                  <span className="block h-full origin-left rounded-full" style={{ width: "100%", transform: `scaleX(${hud.power})`, background: "linear-gradient(90deg, #FFE58A, #F2B705)" }} />
                </span>
              </div>
            )}
          </div>
          {/* sair e som */}
          <div className="absolute flex flex-col gap-2" style={{ top: SAFE.top, right: SAFE.right }}>
            <button type="button" aria-label={t("noturnoBackMenu", "Voltar ao menu")} onClick={onMenu} className="grid h-10 w-10 place-items-center rounded-full text-white" style={{ background: glass, border: `1px solid ${MM.border}` }}>
              <X className="h-5 w-5" />
            </button>
            <button type="button" aria-label={muted ? t("noturnoSoundOn", "Ligar som") : t("noturnoSoundOff", "Desligar som")} onClick={toggleMute} className="grid h-10 w-10 place-items-center rounded-full text-white" style={{ background: glass, border: `1px solid ${MM.border}` }}>
              {muted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
            </button>
          </div>

          {hud.phase === "countdown" && (
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-4">
              <span key={Math.ceil(hud.countdown)} className="text-[110px] font-black italic leading-none text-white" style={{ textShadow: "0 6px 28px rgba(0,0,0,0.5)" }}>
                {Math.max(1, Math.ceil(hud.countdown))}
              </span>
              <span className="max-w-[340px] rounded-full px-4 py-2 text-center text-[13px] font-semibold" style={{ background: glass, color: MM.text }}>
                {isTouch ? t("noturnoHintTouch", "Deslize ← → para trocar de faixa · ↑ ou toque para pular") : t("noturnoHintKeys", "← → trocam de faixa · ↑ ou Espaço pulam · ↓ desce")}
              </span>
            </div>
          )}
          {hud.phase === "run" && hud.dist < 14 && (
            <div className="pointer-events-none absolute inset-0 grid place-items-center">
              <span className="text-[96px] font-black italic leading-none" style={{ color: NEON, textShadow: "0 6px 28px rgba(0,0,0,0.5)" }}>
                {t("noturnoGo", "VAI!")}
              </span>
            </div>
          )}
          {toast && !result && (
            <div className="pointer-events-none absolute left-1/2 -translate-x-1/2" style={{ top: "calc(max(12px, env(safe-area-inset-top)) + 72px)" }}>
              <div
                key={toast.id}
                role="status"
                className="rounded-full px-4 py-2 text-[15px] font-black italic tracking-wide shadow-lg max-[759px]:text-[13px]"
                style={{
                  background: toast.tone === "hot" ? `linear-gradient(90deg, ${NEON}, #FF9A4D)` : toast.tone === "bad" ? "rgba(110, 16, 34, 0.9)" : toast.tone === "gold" ? "rgba(70, 52, 12, 0.88)" : MM.surface,
                  color: toast.tone === "gold" ? "#FFE3A0" : "#fff",
                  border: `1px solid ${toast.tone === "gold" ? MM.goldBorder : MM.border}`,
                }}
              >
                {toast.text}
              </div>
            </div>
          )}
          {result && (
            <Results
              ride={ride}
              phase={phase}
              result={result.r}
              record={result.record}
              best={result.best}
              group={mp ? { live: hud.field ?? [], final, me: mp.start.me } : null}
              onAgain={onAgain}
              onMenu={onMenu}
            />
          )}
        </>
      )}

      {status !== "ready" && (
        <div className="absolute inset-0 grid place-items-center" style={{ background: BG }}>
          <div className="flex flex-col items-center gap-3 text-center" style={{ color: MM.text }}>
            {status === "loading" ? (
              <>
                <Loader2 className="h-7 w-7 animate-spin" />
                <span className="text-[15px] font-semibold">{phase === "classica" ? t("noturnoLoading", "Acendendo os postes…") : t("rnLoading", "Montando a rota…")}</span>
              </>
            ) : (
              <>
                <span className="text-[16px] font-bold">{t("noturnoErrorTitle", "O rolê não abriu")}</span>
                <span className="max-w-[320px] text-[13px]" style={{ color: MM.muted }}>
                  {t("errorDesc", "O navegador não conseguiu iniciar o 3D. Tente de novo; se continuar, volte ao perfil.")}
                </span>
                <button type="button" onClick={onMenu} className="mt-1 rounded-full px-4 py-2 text-[14px] font-bold text-white" style={{ background: MM.rubyFill }}>
                  {t("noturnoBackMenu", "Voltar ao menu")}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}

/** Placar do grupo ao vivo, embaixo das moedas (pelos pontos). */
function FieldStrip({ rows, glass }: { rows: FieldRow[]; glass: string }) {
  return (
    <ol className="flex w-[168px] flex-col gap-0.5 rounded-none px-2 py-1.5 max-[759px]:w-[138px]" style={{ background: glass, border: `1px solid ${MM.border}` }}>
      {rows.map((r, i) => (
        <li key={r.slot} className="flex items-center gap-1.5 text-[12px] leading-tight max-[759px]:text-[11px]" style={{ opacity: r.alive === 1 ? 1 : 0.45, color: r.me ? GOLD : MM.text }}>
          <span className="w-3 shrink-0 text-right font-black tabular-nums">{i + 1}</span>
          <RideIcon ride={r.ride} className="h-3 w-3 shrink-0" />
          <span className="min-w-0 flex-1 truncate font-semibold">{r.name}</span>
          <span className="shrink-0 font-black tabular-nums">{r.alive === 1 ? r.score.toLocaleString() : "✕"}</span>
        </li>
      ))}
    </ol>
  )
}

function Results({
  ride,
  phase,
  result,
  record,
  best,
  group,
  onAgain,
  onMenu,
}: {
  ride: RideKind
  phase: RunPhase
  result: RunResult
  record: boolean
  best: Rec | null
  group: { live: FieldRow[]; final: NoturnoResultRow[] | null; me: number } | null
  onAgain: () => void
  onMenu: () => void
}) {
  const t = useTranslations("MeuMundo")
  const names = useRideNames()
  const by: Record<RunResult["by"], string> = {
    car: t("noturnoByCar", "Bateu no carro!"),
    amb: t("noturnoByAmb", "Bateu na ambulância!"),
    truck: t("noturnoByTruck", "Bateu no caminhão!"),
    barrier: t("noturnoByBarrier", "Tropeçou no cavalete!"),
    ramp: t("noturnoByRamp", "Caiu da rampa!"),
    stumble: t("noturnoByStumble", "Dois esbarrões: caiu!"),
  }
  // rota 2.0: o nome do obstáculo dela
  const themed = CRASH_TEXT[phase]
  if (themed) for (const k of Object.keys(themed) as (keyof typeof themed)[]) by[k] = t(themed[k].key, themed[k].label)
  const cells: [string, string][] = [
    [t("noturnoScore", "Pontos"), result.score.toLocaleString()],
    [t("noturnoCoins", "Moedas"), String(result.coins)],
    [t("noturnoDistance", "Distância"), `${result.dist} m`],
    [t("noturnoTricks", "Manobras"), String(result.tricks)],
    ...(result.smashed ? ([[t("noturnoSmashed", "Explodidos"), String(result.smashed)]] as [string, string][]) : []),
  ]
  // em grupo: a classificação da sala quando fecha; até lá, a ao vivo
  const rows = group
    ? group.final
      ? group.final.map((r) => ({ slot: r.slot, name: r.name, ride: r.ride, score: r.score, alive: r.gone ? 2 : 0, me: r.slot === group.me }))
      : group.live.map((r) => ({ slot: r.slot, name: r.name, ride: r.ride, score: r.score, alive: r.alive, me: r.me }))
    : null
  const running = rows ? rows.filter((r) => r.alive === 1).length : 0
  const place = rows ? rows.findIndex((r) => r.me) + 1 : 0
  return (
    <div className="absolute inset-0 grid place-items-center p-4" style={{ background: MM.scrim }}>
      <div className="w-full max-w-[400px] rounded-none p-4" style={{ background: MM.surface, color: MM.text, border: `1px solid ${MM.border}`, boxShadow: MM.shadow }}>
        <div className="flex items-center gap-2 text-[12px] font-bold uppercase tracking-[0.14em]" style={{ color: CYAN }}>
          <RideIcon ride={ride} className="h-4 w-4" /> {names[ride]}
        </div>
        <h2 className="mt-1 text-[24px] font-black italic leading-tight">{by[result.by]}</h2>
        {record ? (
          <p className="mt-1 flex items-center gap-1.5 text-[14px] font-bold" style={{ color: MM.gold }}>
            <Trophy className="h-4 w-4" /> {t("noturnoNewRecord", "Novo recorde!")}
          </p>
        ) : best ? (
          <p className="mt-1 text-[13px]" style={{ color: MM.muted }}>
            {t("noturnoBest", "Seu recorde de {ride}: {n}").replace("{ride}", names[ride].toLowerCase()).replace("{n}", best.score.toLocaleString())}
          </p>
        ) : null}
        {rows && (
          <div className="mt-3 rounded-none p-2" style={{ background: MM.card }}>
            <div className="flex items-center justify-between gap-2 px-1 text-[11px] font-bold uppercase tracking-[0.1em]" style={{ color: MM.muted }}>
              <span className="flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5" /> {t("noturnoField", "Placar do grupo")}
              </span>
              {running > 0 ? (
                <span className="flex items-center gap-1 normal-case tracking-normal" style={{ color: CYAN }}>
                  <Loader2 className="h-3 w-3 animate-spin" /> {t("noturnoStillRunning", "{n} ainda no rolê").replace("{n}", String(running))}
                </span>
              ) : place > 0 ? (
                <span className="normal-case tracking-normal" style={{ color: MM.gold }}>
                  {t("noturnoPlace", "Você ficou em {n}º de {t}").replace("{n}", String(place)).replace("{t}", String(rows.length))}
                </span>
              ) : null}
            </div>
            <ol className="mt-1.5 flex flex-col gap-1">
              {rows.map((r, i) => (
                <li key={r.slot} className="flex items-center gap-2 rounded-none px-2 py-1 text-[13px]" style={{ background: r.me ? MM.rubySoft : "transparent" }}>
                  <span className="w-4 shrink-0 text-right font-black tabular-nums" style={{ color: i === 0 ? MM.gold : MM.muted }}>
                    {i + 1}
                  </span>
                  <RideIcon ride={r.ride} className="h-3.5 w-3.5 shrink-0" />
                  <span className="min-w-0 flex-1 truncate font-semibold">{r.name}</span>
                  <span className="shrink-0 text-[11px]" style={{ color: MM.muted }}>
                    {r.alive === 1 ? t("noturnoRiding", "correndo") : r.alive === 2 ? t("noturnoGone", "saiu") : ""}
                  </span>
                  <span className="shrink-0 font-black italic tabular-nums">{r.score.toLocaleString()}</span>
                </li>
              ))}
            </ol>
          </div>
        )}
        <dl className={`mt-3 grid grid-cols-2 gap-1.5 ${rows ? "[@media(max-height:560px)]:hidden" : ""}`}>
          {cells.map(([k, v]) => (
            <div key={k} className="rounded-none px-3 py-2" style={{ background: MM.card }}>
              <dt className="text-[11px] font-bold uppercase tracking-[0.1em]" style={{ color: MM.muted }}>
                {k}
              </dt>
              <dd className="text-[20px] font-black italic tabular-nums">{v}</dd>
            </div>
          ))}
        </dl>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <button type="button" onClick={onAgain} className="rounded-none px-3 py-3 text-[15px] font-bold text-white" style={{ background: MM.rubyFill, border: `1px solid ${MM.rubyBorder}` }}>
            {t("noturnoAgain", "De novo")}
          </button>
          <button type="button" onClick={onMenu} className="rounded-none px-3 py-3 text-[15px] font-bold" style={{ background: MM.card, border: `1px solid ${MM.border}` }}>
            {group ? t("noturnoBackMenu", "Voltar ao menu") : t("rnChange", "Trocar rota ou veículo")}
          </button>
        </div>
      </div>
    </div>
  )
}
