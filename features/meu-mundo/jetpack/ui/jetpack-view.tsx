"use client"

// features/meu-mundo/jetpack/ui/jetpack-view.tsx — JETPACK (mm3d-63): a tela.
//
// Cobre o centro (suspenso por baixo, como o Paint e o Rolê). Telas:
//  - MENU: "Sozinho" ou "Multiplayer", como jogar e o recorde do aparelho;
//  - ESPERA (grupo): até 1 minuto, 6 largam na hora;
//  - JOGO: a cena (jetpack-game.ts) com o TANQUE de combustível à esquerda,
//    distância/velocidade/pontos no alto, o placar do grupo, e no celular os
//    botões ◀ ▶ (embaixo à esquerda) e PROPULSOR (embaixo à direita, segurar);
//  - FIM: no que bateu, pontos, distância, galões, tempo, o recorde e a
//    classificação do grupo.
//
// "Sozinho" também passa pela sala (só sua, larga na hora) para a prática
// contar; se a sala não abrir, voa assim mesmo no aparelho.

import { useCallback, useEffect, useRef, useState, type PointerEvent as RPointerEvent } from "react"
import { ChevronLeft, ChevronRight, Flame, Loader2, Trophy, User, Users, Volume2, VolumeX, WifiOff, X } from "lucide-react"
import { useTranslations } from "@/components/i18n/I18nProvider"
import { MM } from "../../ui/hud/tokens"
import { archivo } from "../../ui/status/evo-skin"
import { SAFE } from "../../ui/meu-mundo-view"
import { SteamFrame, SteamTitle, Gear } from "../../ui/kit/steam/steam-frame"
import { SP as ST } from "../../ui/kit/steam/steam-tokens"
import type { BodyId } from "../../types"
import { createJetpackGame, type FieldRow, type JetGameHandle, type JetHud, type JetNotice, type JetResult } from "../engine/jetpack-game"
import type { JetpackNet, JetpackNetStatus, JetpackResultRow, JetpackStart } from "../engine/net"

/** Entrar numa sala (sozinho = sala só sua). null = não abriu. */
export type JetpackJoin = (
  solo: boolean,
  body: BodyId,
  hooks: { signal: AbortSignal; onLobby: (list: string[], until: number) => void; onStatus: (s: JetpackNetStatus) => void },
) => Promise<{ net: JetpackNet; start: JetpackStart } | null>

export interface JetpackViewProps {
  body: BodyId
  look?: string
  name?: string
  onExit: () => void
  join?: JetpackJoin
}

const MAX_PILOTS = 6
const BG = "radial-gradient(120% 90% at 50% 0%, #4a2e17 0%, #1a110a 58%, #080504 100%)"
const FUEL = "#43E6AC"
const HOT = "#FF8A2A"

type Mp = { net: JetpackNet; start: JetpackStart }
type Stage = { kind: "menu" } | { kind: "joining"; solo: boolean; ac: AbortController } | { kind: "game"; key: number; mp?: Mp; solo: boolean }

type Rec = { score: number; dist: number }
const REC_KEY = "mm-jetpack-recorde-v2"
function loadRecord(): Rec | null {
  try {
    return JSON.parse(localStorage.getItem(REC_KEY) || "null") as Rec | null
  } catch {
    return null
  }
}
function saveRecord(r: Rec) {
  try {
    localStorage.setItem(REC_KEY, JSON.stringify(r))
  } catch {
    /* sem armazenamento */
  }
}

export function JetpackView({ body, look, name, onExit, join }: JetpackViewProps) {
  const t = useTranslations("MeuMundo")
  const [stage, setStage] = useState<Stage>({ kind: "menu" })
  const [lobby, setLobby] = useState<{ list: string[]; until: number }>({ list: [], until: 0 })
  const [error, setError] = useState<string | null>(null)
  const seq = useRef(0)
  const play = useCallback(
    async (solo: boolean) => {
      setError(null)
      if (!join) {
        setStage({ kind: "game", key: ++seq.current, solo: true })
        return
      }
      const ac = new AbortController()
      setLobby({ list: [], until: 0 })
      setStage({ kind: "joining", solo, ac })
      let got: Mp | null = null
      try {
        got = await join(solo, body, { signal: ac.signal, onLobby: (list, until) => setLobby({ list, until }), onStatus: () => {} })
      } catch {
        got = null
      }
      if (ac.signal.aborted) {
        got?.net.dispose()
        return
      }
      if (got) setStage({ kind: "game", key: ++seq.current, mp: got, solo })
      else if (solo) setStage({ kind: "game", key: ++seq.current, solo: true }) // sem sala: voa no aparelho
      else {
        setError(t("jetJoinFail", "O voo em grupo não abriu agora. Tente de novo ou voe sozinho."))
        setStage({ kind: "menu" })
      }
    },
    [join, body, t],
  )
  return (
    <div className={`fixed inset-0 z-[70] touch-none select-none overflow-hidden ${archivo.className}`} style={{ background: "#080504" }}>
      {stage.kind === "game" ? (
        <JetScreen key={stage.key} body={body} look={look} name={name} mp={stage.mp} onAgain={() => void play(stage.solo)} onMenu={() => setStage({ kind: "menu" })} />
      ) : stage.kind === "joining" ? (
        <JetLobby
          solo={stage.solo}
          list={lobby.list}
          until={lobby.until}
          onCancel={() => {
            stage.ac.abort()
            setStage({ kind: "menu" })
          }}
        />
      ) : (
        <JetMenu onPlay={(solo) => void play(solo)} onExit={onExit} multi={!!join} error={error} />
      )}
    </div>
  )
}

// ═══ espera ══════════════════════════════════════════════════════════════════

function JetLobby({ solo, list, until, onCancel }: { solo: boolean; list: string[]; until: number; onCancel: () => void }) {
  const t = useTranslations("MeuMundo")
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 250)
    return () => clearInterval(id)
  }, [])
  if (solo) {
    return (
      <div className="absolute inset-0 grid place-items-center" style={{ background: BG, color: MM.text }}>
        <div className="flex flex-col items-center gap-3">
          <Gear size={40} spin color={ST.gold} />
          <span className="text-[15px] font-semibold">{t("jetLoading", "Acendendo as caldeiras…")}</span>
        </div>
      </div>
    )
  }
  const left = until ? Math.max(0, Math.ceil((until - now) / 1000)) : null
  return (
    <div className="absolute inset-0 flex items-center justify-center overflow-y-auto p-4" style={{ background: BG }}>
      <SteamFrame className="w-full max-w-[440px]" cornerSize={40}>
        <div className="p-5 text-left max-[759px]:p-4" style={{ color: ST.text }}>
          <div className="flex items-center gap-2 text-[12px] font-bold uppercase tracking-[0.18em]" style={{ color: ST.cyan }}>
            <Users className="h-4 w-4" /> {t("jetModeMulti", "Multiplayer")}
          </div>
          <div className="mt-2 flex items-end justify-between gap-3">
            <h2 className="text-[22px] font-black italic leading-tight">{t("jetLobbyTitle", "Esperando os pilotos…")}</h2>
            <span className="text-[34px] font-black italic tabular-nums leading-none" style={{ color: ST.gold }} aria-live="polite">
              {left === null ? <Loader2 className="h-7 w-7 animate-spin" /> : `0:${String(left).padStart(2, "0")}`}
            </span>
          </div>
          <p className="mt-2 text-[13px] leading-snug [@media(max-height:520px)]:hidden" style={{ color: ST.muted }}>
            {t("jetLobbyHow", "Quem entrar até o fim do tempo voa junto, no mesmo túnel. Ganha quem for mais longe.")}
          </p>
          <ol className="mt-3 grid grid-cols-2 gap-1.5 max-[420px]:grid-cols-1">
            {Array.from({ length: MAX_PILOTS }, (_, i) => {
              const e = list[i]
              return (
                <li key={i} className="flex items-center gap-2 px-2.5 py-2 text-[13.5px]" style={{ background: e ? MM.rubySoft : MM.card, color: e ? ST.text : ST.muted }}>
                  {e ? <Flame className="h-4 w-4 shrink-0" style={{ color: HOT }} /> : <User className="h-4 w-4 shrink-0 opacity-50" />}
                  <span className="min-w-0 truncate font-semibold">{e ?? t("jetLobbyFree", "vaga livre")}</span>
                </li>
              )
            })}
          </ol>
          <p className="mt-2 text-[12.5px]" style={{ color: ST.muted }}>
            {t("jetLobbyCount", "{n} de 6 no túnel").replace("{n}", String(Math.max(1, list.length)))}
          </p>
          <button type="button" onClick={onCancel} className="mt-4 w-full px-3 py-3 text-[15px] font-bold" style={{ background: MM.card, border: `1px solid ${MM.border}`, color: ST.text }}>
            {t("jetLobbyCancel", "Sair da espera")}
          </button>
        </div>
      </SteamFrame>
    </div>
  )
}

// ═══ menu ════════════════════════════════════════════════════════════════════

function JetMenu({ onPlay, onExit, multi, error }: { onPlay: (solo: boolean) => void; onExit: () => void; multi: boolean; error: string | null }) {
  const t = useTranslations("MeuMundo")
  const [rec, setRec] = useState<Rec | null>(null)
  useEffect(() => setRec(loadRecord()), [])
  const tips: [string, string, string][] = [
    [t("jetHowThrustTitle", "Propulsor"), t("jetHowThrust", "Segure para subir, solte para cair. Gasta combustível."), HOT],
    [t("jetHowFuelTitle", "Galões"), t("jetHowFuel", "Os galões verdes enchem o tanque. Tanque seco = o fogo apaga e você cai."), FUEL],
    [t("jetHowPressTitle", "Prensas"), t("jetHowPress", "Prensas, pilões, pistões e engrenagens se mexem. Encostou em qualquer coisa, acabou."), ST.gold],
  ]
  return (
    <div className="absolute inset-0 flex items-center justify-center overflow-y-auto p-4" style={{ background: BG }}>
      <SteamFrame className="w-full max-w-[560px]" cornerSize={46}>
        <div className="p-5 text-left max-[759px]:p-4 [@media(max-height:520px)]:p-3" style={{ color: ST.text }}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-[12px] font-bold uppercase tracking-[0.18em]" style={{ color: ST.cyan }}>
                {t("jetKicker", "Túneis de Lúmen")}
              </div>
              <SteamTitle as="h1" size={34} className="mt-1.5 max-[759px]:!text-[27px]">
                JETPACK
              </SteamTitle>
              <p className="mt-2 text-[14px] leading-snug max-[759px]:text-[13px] [@media(max-height:520px)]:hidden" style={{ color: ST.muted }}>
                {t("jetPitch", "Voe sem parar pelas galerias de vapor debaixo da cidade. Não encoste em nada e não deixe o tanque secar.")}
              </p>
            </div>
            <button type="button" aria-label={t("jetLeave", "Voltar ao centro")} onClick={onExit} className="grid h-10 w-10 shrink-0 place-items-center rounded-full" style={{ background: MM.card, border: `1px solid ${MM.border}`, color: ST.text }}>
              <X className="h-5 w-5" />
            </button>
          </div>

          <ul className="mt-4 grid grid-cols-3 gap-2 text-[12.5px] leading-snug max-[560px]:grid-cols-1 [@media(max-height:620px)]:hidden" style={{ color: ST.muted }}>
            {tips.map(([title, body, c]) => (
              <li key={title} className="p-2.5" style={{ background: MM.card, borderTop: `2px solid ${c}` }}>
                <b style={{ color: c }}>{title}</b>
                <br />
                {body}
              </li>
            ))}
          </ul>
          {rec && (
            <p className="mt-3 flex items-center gap-1.5 text-[13px] font-bold" style={{ color: ST.gold }}>
              <Trophy className="h-4 w-4" /> {t("jetBest", "Seu recorde: {n} m").replace("{n}", rec.dist.toLocaleString())}
            </p>
          )}
          {error && (
            <p className="mt-3 flex items-center gap-2 px-3 py-2 text-[13px]" style={{ background: "rgba(110,16,34,0.5)", color: "#ffd5dc" }} role="alert">
              <WifiOff className="h-4 w-4 shrink-0" /> {error}
            </p>
          )}

          <div className={`mt-4 grid gap-2 [@media(max-height:520px)]:mt-2.5 ${multi ? "grid-cols-2" : "grid-cols-1"}`}>
            <button
              type="button"
              onClick={() => onPlay(true)}
              className="flex w-full items-center justify-center gap-2 px-3 py-3.5 text-[17px] font-black italic tracking-wide transition-transform active:scale-[0.98] max-[420px]:text-[15px] [@media(max-height:520px)]:py-2.5"
              style={{ background: ST.goldPlate, color: ST.ink, border: `1px solid ${ST.goldHi}` }}
            >
              <Flame className="h-5 w-5 shrink-0" /> {multi ? t("jetModeSolo", "Sozinho") : t("jetPlay", "Voar")}
            </button>
            {multi && (
              <button
                type="button"
                onClick={() => onPlay(false)}
                className="flex w-full flex-col items-center justify-center px-3 py-2 transition-transform active:scale-[0.98] [@media(max-height:520px)]:py-1.5"
                style={{ background: MM.card, border: `1.5px solid ${ST.cyan}`, color: ST.text }}
              >
                <span className="flex items-center gap-2 text-[17px] font-black italic tracking-wide max-[420px]:text-[15px]">
                  <Users className="h-5 w-5 shrink-0" style={{ color: ST.cyan }} /> {t("jetModeMulti", "Multiplayer")}
                </span>
                <span className="text-[11px] leading-tight [@media(max-height:520px)]:hidden" style={{ color: ST.muted }}>
                  {t("jetModeMultiSub", "Espera até 1 minuto · mesmo túnel")}
                </span>
              </button>
            )}
          </div>

          <p className="mt-3 text-[12px] leading-snug max-[759px]:hidden [@media(max-height:520px)]:hidden" style={{ color: ST.muted }}>
            {t("jetKeys", "← → ou A D para os lados · Espaço, ↑, W ou o botão do mouse seguram o propulsor")}
          </p>
          <p className="mt-3 hidden text-[12px] leading-snug max-[759px]:block" style={{ color: ST.muted }}>
            {t("jetTouch", "◀ ▶ embaixo à esquerda para os lados · segure PROPULSOR embaixo à direita para subir")}
          </p>
        </div>
      </SteamFrame>
    </div>
  )
}

// ═══ jogo ════════════════════════════════════════════════════════════════════

function JetScreen({ body, look, name, mp, onAgain, onMenu }: { body: BodyId; look?: string; name?: string; mp?: Mp; onAgain: () => void; onMenu: () => void }) {
  const t = useTranslations("MeuMundo")
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const gameRef = useRef<JetGameHandle | null>(null)
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading")
  const [hud, setHud] = useState<JetHud | null>(null)
  const [result, setResult] = useState<{ r: JetResult; record: boolean; best: Rec | null } | null>(null)
  const [toast, setToast] = useState<{ text: string; tone: "ok" | "bad" | "fuel"; id: number } | null>(null)
  const [muted, setMuted] = useState(false)
  const [final, setFinal] = useState<JetpackResultRow[] | null>(null)
  const [offline, setOffline] = useState(false)
  const [isTouch] = useState(() => typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches && !window.matchMedia("(any-pointer: fine)").matches)
  const group = !!mp && !mp.start.solo
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
    const say = (text: string, tone: "ok" | "bad" | "fuel" = "ok", ms = 1300) => {
      const id = ++seq
      setToast({ text, tone, id })
      if (timer) clearTimeout(timer)
      timer = setTimeout(() => alive && setToast((cur) => (cur?.id === id ? null : cur)), ms)
    }
    const onNotice = (n: JetNotice) => {
      if (!alive) return
      const tt = textRef.current
      if (n.kind === "can") say(tt("jetToastCan", "+COMBUSTÍVEL"), "fuel", 700)
      else if (n.kind === "low") say(tt("jetToastLow", "Pouco combustível! Pegue os galões"), "bad", 1800)
      else if (n.kind === "empty") say(tt("jetToastEmpty", "Tanque seco! O fogo apagou"), "bad", 1800)
    }
    const onEnd = (r: JetResult) => {
      if (!alive) return
      if (group) {
        setResult({ r, record: false, best: null })
        return
      }
      const prev = loadRecord()
      const record = !prev || r.dist > prev.dist
      saveRecord({ score: Math.max(prev?.score ?? 0, r.score), dist: Math.max(prev?.dist ?? 0, r.dist) })
      setResult({ r, record: record && r.dist > 0, best: prev })
    }
    try {
      gameRef.current = createJetpackGame({
        canvas,
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
    } catch (err) {
      console.error("[jetpack] falha ao abrir", err)
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

  const glass = "rgba(16, 10, 6, 0.66)"
  const fuel = hud?.fuel ?? 1
  const lowFuel = fuel < 0.25
  return (
    <>
      <canvas ref={canvasRef} className="block h-full w-full outline-none" style={{ touchAction: "none" }} aria-label={t("jetAria", "Jetpack")} />

      {status === "ready" && hud && (
        <>
          {/* borda vermelha: tanque quase seco */}
          <div aria-hidden className="pointer-events-none absolute inset-0" style={{ opacity: lowFuel && !result ? 1 : 0, transition: "opacity 300ms", boxShadow: "inset 0 0 90px rgba(255,60,40,0.5)" }} />

          {/* tanque de combustível (vertical, à esquerda) e o placar do grupo */}
          <div className="pointer-events-none absolute flex items-start gap-2" style={{ top: SAFE.top, left: SAFE.left }}>
            <div className="flex flex-col items-center gap-1 px-1.5 py-2" style={{ background: glass, border: `1px solid ${ST.goldDeep}` }}>
              <Flame className="h-4 w-4" style={{ color: hud.thrust ? HOT : ST.muted }} />
              <div className="relative h-[132px] w-[18px] overflow-hidden max-[759px]:h-[96px]" style={{ background: ST.well, border: `1px solid ${ST.bronze}` }}>
                <div
                  className="absolute inset-x-0 bottom-0 origin-bottom"
                  style={{
                    height: "100%",
                    transform: `scaleY(${fuel})`,
                    background: lowFuel ? "linear-gradient(0deg, #FF3B2F, #FF8A2A)" : `linear-gradient(0deg, #1C9E73, ${FUEL})`,
                    transition: "transform 120ms linear",
                  }}
                />
                {[0.25, 0.5, 0.75].map((k) => (
                  <span key={k} className="absolute inset-x-0 h-px" style={{ bottom: `${k * 100}%`, background: "rgba(232,182,91,0.55)" }} />
                ))}
              </div>
              <span className="text-[11px] font-black tabular-nums" style={{ color: lowFuel ? ST.red : FUEL }}>
                {Math.round(fuel * 100)}
              </span>
            </div>
            <div className="flex flex-col gap-1.5">
              <div className="px-3 py-1.5 leading-none" style={{ background: glass, border: `1px solid ${ST.goldDeep}` }}>
                <div className="text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color: ST.muted }}>
                  {t("jetScore", "Pontos")}
                </div>
                <div className="text-[30px] font-black italic tabular-nums text-white max-[759px]:text-[22px]">{hud.score.toLocaleString()}</div>
              </div>
              {hud.field && !result && <FieldStrip rows={hud.field} glass={glass} />}
              {offline && !result && (
                <div className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold" style={{ background: "rgba(110,16,34,0.85)", color: "#ffd5dc" }}>
                  <WifiOff className="h-3.5 w-3.5" /> {t("jetOffline", "Sem conexão com o grupo")}
                </div>
              )}
            </div>
          </div>

          {/* distância e velocidade no alto */}
          <div className="pointer-events-none absolute left-1/2 -translate-x-1/2" style={{ top: SAFE.top }}>
            <div className="rounded-full px-3.5 py-1 text-center leading-tight" style={{ background: glass, border: `1px solid ${ST.goldDeep}` }}>
              <span className="text-[18px] font-black italic tabular-nums" style={{ color: ST.goldHi }}>
                {hud.dist.toLocaleString()} m
              </span>
              <span className="ml-1.5 text-[11px] tabular-nums" style={{ color: ST.muted }}>
                {hud.speed} km/h
              </span>
            </div>
          </div>

          {/* sair e som */}
          <div className="absolute flex flex-col gap-2" style={{ top: SAFE.top, right: SAFE.right }}>
            <button type="button" aria-label={t("jetBackMenu", "Voltar ao menu")} onClick={onMenu} className="grid h-10 w-10 place-items-center rounded-full text-white" style={{ background: glass, border: `1px solid ${MM.border}` }}>
              <X className="h-5 w-5" />
            </button>
            <button type="button" aria-label={muted ? t("jetSoundOn", "Ligar som") : t("jetSoundOff", "Desligar som")} onClick={toggleMute} className="grid h-10 w-10 place-items-center rounded-full text-white" style={{ background: glass, border: `1px solid ${MM.border}` }}>
              {muted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
            </button>
          </div>

          {/* celular: ◀ ▶ e o propulsor */}
          {isTouch && !result && <TouchPad game={gameRef} label={t("jetThrust", "Propulsor")} />}

          {hud.phase === "countdown" && (
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-4">
              <span key={Math.ceil(hud.countdown)} className="text-[110px] font-black italic leading-none text-white" style={{ textShadow: "0 6px 28px rgba(0,0,0,0.6)" }}>
                {Math.max(1, Math.ceil(hud.countdown))}
              </span>
              <span className="max-w-[360px] rounded-full px-4 py-2 text-center text-[13px] font-semibold" style={{ background: glass, color: ST.text }}>
                {isTouch ? t("jetHintTouch", "Segure PROPULSOR para subir · ◀ ▶ para os lados") : t("jetHintKeys", "Segure Espaço para subir · ← → para os lados")}
              </span>
            </div>
          )}
          {hud.phase === "run" && hud.dist < 12 && (
            <div className="pointer-events-none absolute inset-0 grid place-items-center">
              <span className="text-[96px] font-black italic leading-none" style={{ color: HOT, textShadow: "0 6px 28px rgba(0,0,0,0.6)" }}>
                {t("jetGo", "VOA!")}
              </span>
            </div>
          )}
          {toast && !result && (
            <div className="pointer-events-none absolute left-1/2 -translate-x-1/2" style={{ top: "calc(max(12px, env(safe-area-inset-top)) + 56px)" }}>
              <div
                key={toast.id}
                role="status"
                className="rounded-full px-4 py-1.5 text-[14px] font-black italic tracking-wide max-[759px]:text-[12.5px]"
                style={{
                  background: toast.tone === "bad" ? "rgba(110, 16, 34, 0.9)" : toast.tone === "fuel" ? "rgba(12, 60, 44, 0.9)" : glass,
                  color: toast.tone === "fuel" ? FUEL : "#fff",
                  border: `1px solid ${toast.tone === "fuel" ? "#1C9E73" : MM.border}`,
                }}
              >
                {toast.text}
              </div>
            </div>
          )}
          {result && <Results result={result.r} record={result.record} best={result.best} group={group && mp ? { live: hud.field ?? [], final, me: mp.start.me } : null} onAgain={onAgain} onMenu={onMenu} />}
        </>
      )}

      {status !== "ready" && (
        <div className="absolute inset-0 grid place-items-center" style={{ background: BG }}>
          <div className="flex flex-col items-center gap-3 text-center" style={{ color: ST.text }}>
            {status === "loading" ? (
              <>
                <Gear size={40} spin color={ST.gold} />
                <span className="text-[15px] font-semibold">{t("jetLoading", "Acendendo as caldeiras…")}</span>
              </>
            ) : (
              <>
                <span className="text-[16px] font-bold">{t("jetErrorTitle", "O túnel não abriu")}</span>
                <span className="max-w-[320px] text-[13px]" style={{ color: ST.muted }}>
                  {t("errorDesc", "O navegador não conseguiu iniciar o 3D. Tente de novo; se continuar, volte ao perfil.")}
                </span>
                <button type="button" onClick={onMenu} className="mt-1 rounded-full px-4 py-2 text-[14px] font-bold" style={{ background: ST.goldPlate, color: ST.ink }}>
                  {t("jetBackMenu", "Voltar ao menu")}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}

/** Botões do celular: segurar vale (solta ao tirar o dedo ou sair do botão). */
function TouchPad({ game, label }: { game: { current: JetGameHandle | null }; label: string }) {
  const [on, setOn] = useState({ left: false, right: false, thrust: false })
  const bind = (k: "left" | "right" | "thrust") => {
    const set = (v: boolean) => {
      setOn((o) => (o[k] === v ? o : { ...o, [k]: v }))
      game.current?.setTouch({ [k]: v })
    }
    return {
      onPointerDown: (e: RPointerEvent) => {
        e.preventDefault()
        ;(e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId)
        set(true)
      },
      onPointerUp: () => set(false),
      onPointerCancel: () => set(false),
      onLostPointerCapture: () => set(false),
      onContextMenu: (e: { preventDefault: () => void }) => e.preventDefault(),
    }
  }
  const side = (k: "left" | "right") => (
    <button
      type="button"
      aria-label={k === "left" ? "◀" : "▶"}
      {...bind(k)}
      className="grid h-[78px] w-[78px] place-items-center rounded-full"
      style={{ background: on[k] ? "rgba(232,182,91,0.42)" : "rgba(16,10,6,0.55)", border: `2px solid ${on[k] ? ST.goldHi : ST.goldDeep}`, color: ST.text }}
    >
      {k === "left" ? <ChevronLeft className="h-9 w-9" /> : <ChevronRight className="h-9 w-9" />}
    </button>
  )
  return (
    <>
      <div className="absolute flex gap-3" style={{ bottom: SAFE.bottom, left: SAFE.left }}>
        {side("left")}
        {side("right")}
      </div>
      <button
        type="button"
        {...bind("thrust")}
        className="absolute grid h-[104px] w-[104px] place-items-center rounded-full"
        style={{
          bottom: SAFE.bottom,
          right: SAFE.right,
          background: on.thrust ? "radial-gradient(circle at 50% 40%, #FFD27A, #FF7A1A 60%, #9A3A08)" : "radial-gradient(circle at 50% 40%, rgba(255,160,60,0.5), rgba(60,24,6,0.7))",
          border: `2px solid ${on.thrust ? ST.goldHi : ST.goldDeep}`,
          color: on.thrust ? ST.ink : ST.text,
        }}
      >
        <span className="flex flex-col items-center gap-0.5 text-[11px] font-black uppercase tracking-[0.08em]">
          <Flame className="h-8 w-8" />
          {label}
        </span>
      </button>
    </>
  )
}

function FieldStrip({ rows, glass }: { rows: FieldRow[]; glass: string }) {
  return (
    <ol className="flex w-[168px] flex-col gap-0.5 px-2 py-1.5 max-[759px]:w-[138px]" style={{ background: glass, border: `1px solid ${ST.goldDeep}` }}>
      {rows.map((r, i) => (
        <li key={r.slot} className="flex items-center gap-1.5 text-[12px] leading-tight max-[759px]:text-[11px]" style={{ opacity: r.alive === 1 ? 1 : 0.45, color: r.me ? ST.gold : ST.text }}>
          <span className="w-3 shrink-0 text-right font-black tabular-nums">{i + 1}</span>
          <span className="min-w-0 flex-1 truncate font-semibold">{r.name}</span>
          <span className="shrink-0 font-black tabular-nums">{r.alive === 1 ? `${r.dist} m` : "✕"}</span>
        </li>
      ))}
    </ol>
  )
}

function Results({
  result,
  record,
  best,
  group,
  onAgain,
  onMenu,
}: {
  result: JetResult
  record: boolean
  best: Rec | null
  group: { live: FieldRow[]; final: JetpackResultRow[] | null; me: number } | null
  onAgain: () => void
  onMenu: () => void
}) {
  const t = useTranslations("MeuMundo")
  const by: Record<JetResult["by"], string> = {
    pressV: t("jetByPress", "Esmagado pela prensa!"),
    pressH: t("jetByPress", "Esmagado pela prensa!"),
    crusher: t("jetByCrusher", "O pilão te pegou!"),
    piston: t("jetByPiston", "Bateu no pistão!"),
    pipes: t("jetByPipes", "Bateu no cano!"),
    gears: t("jetByGears", "Pego pela engrenagem!"),
    wall: t("jetByWall", "Raspou na parede!"),
    floor: t("jetByFloor", "Encostou no chão!"),
    ceiling: t("jetByCeiling", "Bateu no teto!"),
    fuel: t("jetByFuel", "O tanque secou!"),
  }
  const secs = Math.floor(result.time)
  const cells: [string, string][] = [
    [t("jetScore", "Pontos"), result.score.toLocaleString()],
    [t("jetDistance", "Distância"), `${result.dist.toLocaleString()} m`],
    [t("jetCans", "Galões"), String(result.cans)],
    [t("jetTime", "Tempo"), `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, "0")}`],
  ]
  const rows = group
    ? group.final
      ? group.final.map((r) => ({ slot: r.slot, name: r.name, dist: r.dist, alive: r.gone ? 2 : 0, me: r.slot === group.me }))
      : group.live.map((r) => ({ slot: r.slot, name: r.name, dist: r.dist, alive: r.alive, me: r.me }))
    : null
  const flying = rows ? rows.filter((r) => r.alive === 1).length : 0
  const place = rows ? rows.findIndex((r) => r.me) + 1 : 0
  return (
    <div className="absolute inset-0 grid place-items-center p-4" style={{ background: MM.scrim }}>
      <SteamFrame className="w-full max-w-[400px]" cornerSize={38}>
        <div className="p-4" style={{ color: ST.text }}>
          <h2 className="text-[24px] font-black italic leading-tight">{by[result.by]}</h2>
          {record ? (
            <p className="mt-1 flex items-center gap-1.5 text-[14px] font-bold" style={{ color: ST.gold }}>
              <Trophy className="h-4 w-4" /> {t("jetNewRecord", "Novo recorde!")}
            </p>
          ) : best ? (
            <p className="mt-1 text-[13px]" style={{ color: ST.muted }}>
              {t("jetBest", "Seu recorde: {n} m").replace("{n}", best.dist.toLocaleString())}
            </p>
          ) : null}
          {rows && (
            <div className="mt-3 p-2" style={{ background: MM.card }}>
              <div className="flex items-center justify-between gap-2 px-1 text-[11px] font-bold uppercase tracking-[0.1em]" style={{ color: ST.muted }}>
                <span className="flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5" /> {t("jetField", "Placar do grupo")}
                </span>
                {flying > 0 ? (
                  <span className="flex items-center gap-1 normal-case tracking-normal" style={{ color: ST.cyan }}>
                    <Loader2 className="h-3 w-3 animate-spin" /> {t("jetStillFlying", "{n} ainda voando").replace("{n}", String(flying))}
                  </span>
                ) : place > 0 ? (
                  <span className="normal-case tracking-normal" style={{ color: ST.gold }}>
                    {t("jetPlace", "Você ficou em {n}º de {t}").replace("{n}", String(place)).replace("{t}", String(rows.length))}
                  </span>
                ) : null}
              </div>
              <ol className="mt-1.5 flex flex-col gap-1">
                {rows.map((r, i) => (
                  <li key={r.slot} className="flex items-center gap-2 px-2 py-1 text-[13px]" style={{ background: r.me ? MM.rubySoft : "transparent" }}>
                    <span className="w-4 shrink-0 text-right font-black tabular-nums" style={{ color: i === 0 ? ST.gold : ST.muted }}>
                      {i + 1}
                    </span>
                    <span className="min-w-0 flex-1 truncate font-semibold">{r.name}</span>
                    <span className="shrink-0 text-[11px]" style={{ color: ST.muted }}>
                      {r.alive === 1 ? t("jetFlying", "voando") : r.alive === 2 ? t("jetGone", "saiu") : ""}
                    </span>
                    <span className="shrink-0 font-black italic tabular-nums">{r.dist.toLocaleString()} m</span>
                  </li>
                ))}
              </ol>
            </div>
          )}
          <dl className={`mt-3 grid grid-cols-2 gap-1.5 ${rows ? "[@media(max-height:560px)]:hidden" : ""}`}>
            {cells.map(([k, v]) => (
              <div key={k} className="px-3 py-2" style={{ background: MM.card }}>
                <dt className="text-[11px] font-bold uppercase tracking-[0.1em]" style={{ color: ST.muted }}>
                  {k}
                </dt>
                <dd className="text-[20px] font-black italic tabular-nums">{v}</dd>
              </div>
            ))}
          </dl>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <button type="button" onClick={onAgain} className="px-3 py-3 text-[15px] font-bold" style={{ background: ST.goldPlate, color: ST.ink, border: `1px solid ${ST.goldHi}` }}>
              {t("jetAgain", "De novo")}
            </button>
            <button type="button" onClick={onMenu} className="px-3 py-3 text-[15px] font-bold" style={{ background: MM.card, border: `1px solid ${MM.border}`, color: ST.text }}>
              {t("jetBackMenu", "Voltar ao menu")}
            </button>
          </div>
        </div>
      </SteamFrame>
    </div>
  )
}
