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

import { useCallback, useEffect, useRef, useState } from "react"
import { Bike, Loader2, Trophy, Volume2, VolumeX, X } from "lucide-react"
import { useTranslations } from "@/components/i18n/I18nProvider"
import { MM } from "../../ui/hud/tokens"
import { archivo } from "../../ui/status/evo-skin"
import { SAFE } from "../../ui/meu-mundo-view"
import type { BodyId } from "../../types"
import { RIDES, type RideKind } from "../sim/run"
import { createRunGame, type RunGameHandle, type RunHud, type RunNotice, type RunResult } from "../engine/run-game"

export interface RunViewProps {
  body: BodyId
  look?: string
  onExit: () => void
}

type Stage = { kind: "menu" } | { kind: "game"; ride: RideKind; key: number }

const RIDE_ORDER: RideKind[] = ["bike", "skate", "skates"]
const NEON = "#FF4FB3"
const CYAN = "#5FE1FF"
const GOLD = "#FFC94A"
const BG = "radial-gradient(120% 90% at 50% 0%, #3a1f5c 0%, #140f26 58%, #07060d 100%)"

/** Recordes do aparelho, por veículo (conveniência local; some se o navegador limpar). */
type Rec = { score: number; coins: number; dist: number }
type Records = Partial<Record<RideKind, Rec>>
const REC_KEY = "mm-noturno-recordes-v1"
const RIDE_KEY = "mm-noturno-veiculo-v1"
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

export function RunView({ body, look, onExit }: RunViewProps) {
  const [stage, setStage] = useState<Stage>({ kind: "menu" })
  const seq = useRef(0)
  const play = useCallback((ride: RideKind) => {
    saveRide(ride)
    setStage({ kind: "game", ride, key: ++seq.current })
  }, [])
  return (
    <div className={`fixed inset-0 z-[70] touch-none select-none overflow-hidden ${archivo.className}`} style={{ background: "#07060d" }}>
      {stage.kind === "game" ? (
        <RunScreen key={stage.key} ride={stage.ride} body={body} look={look} onAgain={() => play(stage.ride)} onMenu={() => setStage({ kind: "menu" })} />
      ) : (
        <RunMenu onPlay={play} onExit={onExit} />
      )}
    </div>
  )
}

// ═══ menu ════════════════════════════════════════════════════════════════════

function Bar({ value, color }: { value: number; color: string }) {
  return (
    <span className="block h-1.5 w-full overflow-hidden rounded-full" style={{ background: "rgba(255,255,255,0.1)" }}>
      <span className="block h-full rounded-full" style={{ width: `${Math.round(value * 100)}%`, background: color }} />
    </span>
  )
}

function RunMenu({ onPlay, onExit }: { onPlay: (r: RideKind) => void; onExit: () => void }) {
  const t = useTranslations("MeuMundo")
  const names = useRideNames()
  const [ride, setRide] = useState<RideKind>("skate")
  const [rec, setRec] = useState<Records>({})
  useEffect(() => {
    setRide(loadRide())
    setRec(loadRecords())
  }, [])
  // barras: velocidade máxima, altura do pulo e agilidade (troca de faixa)
  const stats = (r: RideKind) => ({
    speed: (RIDES[r].at[RIDES[r].at.length - 1] * 3.6 - 420) / 95,
    jump: (RIDES[r].jumpH - 1.1) / 0.8,
    agile: (0.26 - RIDES[r].laneTime) / 0.15,
  })
  const blurb: Record<RideKind, string> = {
    bike: t("noturnoBikeSub", "A mais rápida. Pulo mais baixo."),
    skate: t("noturnoSkateSub", "O pulo mais alto. Manobra nas rampas."),
    skates: t("noturnoSkatesSub", "A mais ágil para trocar de faixa."),
  }
  return (
    <div className="absolute inset-0 flex items-center justify-center overflow-y-auto p-4" style={{ background: BG }}>
      <div className="w-full max-w-[560px] rounded-[22px] p-5 text-left max-[759px]:p-4 [@media(max-height:520px)]:p-3" style={{ background: MM.surface, color: MM.text, boxShadow: MM.shadow, border: `1px solid ${MM.border}` }}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-[12px] font-bold uppercase tracking-[0.18em]" style={{ color: CYAN }}>
              {t("noturnoKicker", "Avenida da madrugada")}
            </div>
            <h1 className="mt-1.5 text-[30px] font-black italic leading-none tracking-tight max-[759px]:text-[25px]">
              ROLÊ <span style={{ color: NEON }}>NOTURNO</span>
            </h1>
            <p className="mt-2 text-[14px] leading-snug max-[759px]:text-[13px] [@media(max-height:520px)]:hidden" style={{ color: MM.muted }}>
              {t("noturnoPitch", "A rua é sua de noite. Desvie dos carros e caminhões, salte das rampas e pegue as moedas — cada vez mais rápido.")}
            </p>
          </div>
          <button type="button" aria-label={t("noturnoLeave", "Voltar ao centro")} onClick={onExit} className="grid h-10 w-10 shrink-0 place-items-center rounded-full" style={{ background: MM.card, border: `1px solid ${MM.border}` }}>
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-4 text-[12px] font-bold uppercase tracking-[0.14em] [@media(max-height:520px)]:mt-2" style={{ color: MM.muted }}>
          {t("noturnoChoose", "Escolha o seu veículo")}
        </div>
        <div className="mt-2 grid grid-cols-3 gap-2" role="radiogroup" aria-label={t("noturnoChoose", "Escolha o seu veículo")}>
          {RIDE_ORDER.map((r) => {
            const on = r === ride
            const s = stats(r)
            const best = rec[r]
            return (
              <button
                key={r}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => setRide(r)}
                onDoubleClick={() => onPlay(r)}
                className="flex flex-col gap-2 rounded-[14px] p-3 text-left transition-transform active:scale-[0.98] max-[480px]:p-2"
                style={{ background: on ? MM.rubySoft : MM.card, border: `1.5px solid ${on ? NEON : MM.border}`, boxShadow: on ? "0 0 18px rgba(255,79,179,0.25)" : "none" }}
              >
                <span className="flex items-center gap-2 max-[480px]:flex-col max-[480px]:gap-1">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full" style={{ background: on ? NEON : "rgba(255,255,255,0.08)", color: on ? "#140f26" : MM.text }}>
                    <RideIcon ride={r} className="h-6 w-6" />
                  </span>
                  <span className="text-[16px] font-bold leading-tight max-[480px]:text-[14px]">{names[r]}</span>
                </span>
                <span className="flex min-w-0 flex-1 flex-col gap-1 text-[11px]" style={{ color: MM.muted }}>
                  <span className="max-[480px]:hidden [@media(max-height:520px)]:hidden">{blurb[r]}</span>
                  <span className="grid grid-cols-[auto_1fr] items-center gap-x-2 gap-y-1 max-[480px]:grid-cols-1 max-[480px]:gap-y-0.5">
                    <span>{t("noturnoStatSpeed", "Velocidade")}</span>
                    <Bar value={s.speed} color={NEON} />
                    <span>{t("noturnoStatJump", "Pulo")}</span>
                    <Bar value={s.jump} color={CYAN} />
                    <span>{t("noturnoStatAgile", "Agilidade")}</span>
                    <Bar value={s.agile} color={GOLD} />
                  </span>
                  {best && (
                    <span className="flex items-center gap-1" style={{ color: MM.gold }}>
                      <Trophy className="h-3 w-3" /> {best.score.toLocaleString()}
                    </span>
                  )}
                </span>
              </button>
            )
          })}
        </div>

        <ul className="mt-3 grid grid-cols-3 gap-2 text-[12.5px] leading-snug max-[759px]:hidden [@media(max-height:620px)]:hidden" style={{ color: MM.muted }}>
          <li className="rounded-[12px] p-2.5" style={{ background: MM.card }}>
            <b style={{ color: GOLD }}>{t("noturnoHowCoinsTitle", "Moedas")}</b>
            <br />
            {t("noturnoHowCoins", "Cada uma vale 10 pontos. Em fila, no ar e em cima dos caminhões.")}
          </li>
          <li className="rounded-[12px] p-2.5" style={{ background: MM.card }}>
            <b style={{ color: CYAN }}>{t("noturnoHowRampTitle", "Rampas")}</b>
            <br />
            {t("noturnoHowRamp", "Te jogam para o alto: para o lado gira 360° (+100), para cima dá um mortal (+150). Caia em cima do caminhão!")}
          </li>
          <li className="rounded-[12px] p-2.5" style={{ background: MM.card }}>
            <b style={{ color: NEON }}>{t("noturnoHowCarsTitle", "Trânsito")}</b>
            <br />
            {t("noturnoHowCars", "De frente derruba. Pule o cavalete e suba no teto dos carros.")}
          </li>
        </ul>

        <button
          type="button"
          onClick={() => onPlay(ride)}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-[14px] px-3 py-3.5 text-[17px] [@media(max-height:520px)]:mt-2.5 [@media(max-height:520px)]:py-2.5 font-black italic tracking-wide text-white transition-transform active:scale-[0.98]"
          style={{ background: MM.rubyFill, border: `1px solid ${MM.rubyBorder}` }}
        >
          <RideIcon ride={ride} className="h-5 w-5" />
          {t("noturnoPlay", "Andar de {ride}").replace("{ride}", names[ride].toLowerCase())}
        </button>

        <p className="mt-3 text-[12px] leading-snug max-[759px]:hidden [@media(max-height:520px)]:hidden" style={{ color: MM.muted }}>
          {t("noturnoKeys", "← → ou A D trocam de faixa · ↑, W ou Espaço pulam · ↓ ou S descem rápido · no ar da rampa: ← → giram 360° e ↑ dá um mortal")}
        </p>
        <p className="mt-3 hidden text-[12px] leading-snug max-[759px]:block" style={{ color: MM.muted }}>
          {t("noturnoSwipe", "Deslize para os lados para trocar de faixa, para cima (ou toque) para pular e para baixo para descer rápido. No ar da rampa: para o lado gira 360° e para cima dá um mortal.")}
        </p>
      </div>
    </div>
  )
}

// ═══ jogo ════════════════════════════════════════════════════════════════════

function RunScreen({ ride, body, look, onAgain, onMenu }: { ride: RideKind; body: BodyId; look?: string; onAgain: () => void; onMenu: () => void }) {
  const t = useTranslations("MeuMundo")
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const gameRef = useRef<RunGameHandle | null>(null)
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading")
  const [hud, setHud] = useState<RunHud | null>(null)
  const [result, setResult] = useState<{ r: RunResult; record: boolean; best: Rec | null } | null>(null)
  const [toast, setToast] = useState<{ text: string; tone: "ok" | "hot" | "bad" | "gold"; id: number } | null>(null)
  const [muted, setMuted] = useState(false)
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
        default:
          break
      }
    }
    const onEnd = (r: RunResult) => {
      if (!alive) return
      const recs = loadRecords()
      const prev = recs[ride]
      const record = !prev || r.score > prev.score
      const best: Rec = { score: Math.max(prev?.score ?? 0, r.score), coins: Math.max(prev?.coins ?? 0, r.coins), dist: Math.max(prev?.dist ?? 0, r.dist) }
      recs[ride] = best
      saveRecords(recs)
      setResult({ r, record: record && r.score > 0, best: prev ?? null })
    }
    try {
      const g = createRunGame({
        canvas,
        ride,
        body,
        look,
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
  }, [ride, body, look])

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
            <div className="rounded-[14px] px-3 py-1.5 leading-none" style={{ background: glass, border: `1px solid ${MM.border}` }}>
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
          </div>
          {/* velocidade e distância no alto */}
          <div className="pointer-events-none absolute left-1/2 -translate-x-1/2 rounded-full px-3 py-1 text-center leading-tight" style={{ top: SAFE.top, background: glass }}>
            <span className="text-[16px] font-black italic tabular-nums text-white">{hud.speed}</span>
            <span className="ml-1 text-[11px]" style={{ color: MM.muted }}>
              km/h · {hud.dist} m
            </span>
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
          {result && <Results ride={ride} result={result.r} record={result.record} best={result.best} onAgain={onAgain} onMenu={onMenu} />}
        </>
      )}

      {status !== "ready" && (
        <div className="absolute inset-0 grid place-items-center" style={{ background: BG }}>
          <div className="flex flex-col items-center gap-3 text-center" style={{ color: MM.text }}>
            {status === "loading" ? (
              <>
                <Loader2 className="h-7 w-7 animate-spin" />
                <span className="text-[15px] font-semibold">{t("noturnoLoading", "Acendendo os postes…")}</span>
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

function Results({ ride, result, record, best, onAgain, onMenu }: { ride: RideKind; result: RunResult; record: boolean; best: Rec | null; onAgain: () => void; onMenu: () => void }) {
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
  const cells: [string, string][] = [
    [t("noturnoScore", "Pontos"), result.score.toLocaleString()],
    [t("noturnoCoins", "Moedas"), String(result.coins)],
    [t("noturnoDistance", "Distância"), `${result.dist} m`],
    [t("noturnoTricks", "Manobras"), String(result.tricks)],
  ]
  return (
    <div className="absolute inset-0 grid place-items-center p-4" style={{ background: MM.scrim }}>
      <div className="w-full max-w-[400px] rounded-[20px] p-4" style={{ background: MM.surface, color: MM.text, border: `1px solid ${MM.border}`, boxShadow: MM.shadow }}>
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
        <dl className="mt-3 grid grid-cols-2 gap-1.5">
          {cells.map(([k, v]) => (
            <div key={k} className="rounded-[12px] px-3 py-2" style={{ background: MM.card }}>
              <dt className="text-[11px] font-bold uppercase tracking-[0.1em]" style={{ color: MM.muted }}>
                {k}
              </dt>
              <dd className="text-[20px] font-black italic tabular-nums">{v}</dd>
            </div>
          ))}
        </dl>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <button type="button" onClick={onAgain} className="rounded-[14px] px-3 py-3 text-[15px] font-bold text-white" style={{ background: MM.rubyFill, border: `1px solid ${MM.rubyBorder}` }}>
            {t("noturnoAgain", "De novo")}
          </button>
          <button type="button" onClick={onMenu} className="rounded-[14px] px-3 py-3 text-[15px] font-bold" style={{ background: MM.card, border: `1px solid ${MM.border}` }}>
            {t("noturnoChange", "Trocar veículo")}
          </button>
        </div>
      </div>
    </div>
  )
}
