"use client"

// features/meu-mundo/jetpack/ui/jetpack-view.tsx — JETPACK (mm3d-63): a tela.
//
// Cobre o centro (suspenso por baixo, como o Paint e o Rolê). Telas:
//  - SELECIONAR FASE (mm3d-75, phase-select.tsx): os cartões das fases, a
//    escolhida em destaque, o modo (Treino ou Multiplayer) e CORRER;
//  - ESPERA (grupo): até 1 minuto, 6 largam na hora;
//  - JOGO: a cena (jetpack-game.ts) com o TANQUE de combustível à esquerda,
//    distância/velocidade/pontos no alto, o placar do grupo, e no celular os
//    arrastar o dedo em qualquer lugar dirige (sem ◀ ▶) e PROPULSOR (embaixo à direita, segurar);
//  - FIM: no que bateu, pontos, distância, galões, tempo, as estrelas da
//    fase, o recorde (por fase) e a classificação do grupo.
//
// "Sozinho" também passa pela sala (só sua, larga na hora) para a prática
// contar; se a sala não abrir, voa assim mesmo no aparelho.

import { useCallback, useEffect, useRef, useState, type PointerEvent as RPointerEvent } from "react"
import { ChevronDown, ChevronUp, Flame, Loader2, Star, Trophy, User, Users, Volume2, VolumeX, WifiOff, X } from "lucide-react"
import { useTranslations } from "@/components/i18n/I18nProvider"
import { MM } from "../../ui/hud/tokens"
import { archivo } from "../../ui/status/evo-skin"
import { SAFE } from "../../ui/meu-mundo-view"
import { SteamFrame, SteamTitle, Gear } from "../../ui/kit/steam/steam-frame"
import { WaitingRoom } from "../../ui/kit/waiting-room"
import { SP as ST } from "../../ui/kit/steam/steam-tokens"
import type { BodyId } from "../../types"
import { createJetpackGame, type FieldRow, type JetGameHandle, type JetHud, type JetNotice, type JetResult } from "../engine/jetpack-game"
import type { JetpackNet, JetpackNetStatus, JetpackResultRow, JetpackStart } from "../engine/net"
import { phaseArt, starsFor } from "../engine/phase-art"
import { phaseRule, type PhaseId } from "../sim/phases"
import { PhaseSelect, type PhaseRecord } from "./phase-select"
import { emitMinigame } from "../../banter"
import { MinigameBanter } from "../../ui/inbox/minigame-banter"
import { GodVoice } from "../../ui/quest/god-voice"

/** Entrar numa sala (sozinho = sala só sua) da fase escolhida. null = não abriu. */
export type JetpackJoin = (
  solo: boolean,
  body: BodyId,
  hooks: { signal: AbortSignal; onLobby: (list: string[], until: number) => void; onStatus: (s: JetpackNetStatus) => void },
  phase?: PhaseId,
) => Promise<{ net: JetpackNet; start: JetpackStart } | null>

export interface JetpackViewProps {
  body: BodyId
  look?: string
  name?: string
  onExit: () => void
  join?: JetpackJoin
}

// 2026-11-08: sempre 4 no túnel (você e mais 3)
const MAX_PILOTS = 4
const BG = "radial-gradient(120% 90% at 50% 0%, #4a2e17 0%, #1a110a 58%, #080504 100%)"
const FUEL = "#43E6AC"
const HOT = "#FF8A2A"

type Mp = { net: JetpackNet; start: JetpackStart }
type Stage = { kind: "menu" } | { kind: "joining"; solo: boolean; ac: AbortController } | { kind: "game"; key: number; mp?: Mp; solo: boolean; train?: boolean }

// recordes POR FASE no aparelho (mm3d-75); o do túnel original herda o recorde antigo
type Rec = PhaseRecord
const REC_KEY = "mm-jetpack-recorde-v3:"
const OLD_KEY = "mm-jetpack-recorde-v2"
const LAST_KEY = "mm-jetpack-fase"
function loadRecord(phase: PhaseId): Rec | null {
  try {
    const raw = localStorage.getItem(REC_KEY + phase)
    if (raw) return JSON.parse(raw) as Rec
    if (phase === "industrial") {
      const old = JSON.parse(localStorage.getItem(OLD_KEY) || "null") as { score: number; dist: number } | null
      if (old) return { score: old.score, dist: old.dist, stars: starsFor(phase, old.dist), runs: 0 }
    }
    return null
  } catch {
    return null
  }
}
function saveRecord(phase: PhaseId, r: Rec) {
  try {
    localStorage.setItem(REC_KEY + phase, JSON.stringify(r))
  } catch {
    /* sem armazenamento */
  }
}
function loadLast(): PhaseId {
  try {
    return phaseRule(localStorage.getItem(LAST_KEY)).id
  } catch {
    return "industrial"
  }
}

export function JetpackView({ body, look, name, onExit, join }: JetpackViewProps) {
  const t = useTranslations("MeuMundo")
  const [stage, setStage] = useState<Stage>({ kind: "menu" })
  const [lobby, setLobby] = useState<{ list: string[]; until: number }>({ list: [], until: 0 })
  const [error, setError] = useState<string | null>(null)
  const [phase, setPhase] = useState<PhaseId>("industrial")
  const [recs, setRecs] = useState(0)
  useEffect(() => setPhase(loadLast()), [])
  const seq = useRef(0)
  const play = useCallback(
    async (solo: boolean, ph: PhaseId) => {
      setError(null)
      setPhase(ph)
      try {
        localStorage.setItem(LAST_KEY, ph)
      } catch {
        /* sem armazenamento */
      }
      if (!join) {
        setStage({ kind: "game", key: ++seq.current, solo: true })
        return
      }
      const ac = new AbortController()
      setLobby({ list: [], until: 0 })
      setStage({ kind: "joining", solo, ac })
      let got: Mp | null = null
      try {
        got = await join(solo, body, { signal: ac.signal, onLobby: (list, until) => setLobby({ list, until }), onStatus: () => {} }, ph)
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
        setError(t("jetJoinFail2", "O voo não abriu agora. Tente de novo."))
        setStage({ kind: "menu" })
      }
    },
    [join, body, t],
  )
  return (
    <div className={`fixed inset-0 z-[70] touch-none select-none overflow-hidden ${archivo.className}`} style={{ background: "#080504" }}>
      {stage.kind === "game" ? (
        <JetScreen
          key={stage.key}
          body={body}
          look={look}
          name={name}
          phase={phase}
          mp={stage.mp}
          onAgain={() => {
            // Treinar de novo = outro voo no aparelho, sem sala (antes passava pela sala de grupo
            // e ficava 20 s em "Acendendo as caldeiras…", sem contador nem como cancelar)
            if (stage.train) setStage({ kind: "game", key: ++seq.current, solo: true, train: true })
            else void play(stage.solo, phase)
          }}
          onMenu={() => {
            setRecs((n) => n + 1)
            setStage({ kind: "menu" })
          }}
        />
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
        <PhaseSelect
          key={recs}
          current={phase}
          records={loadRecord}
          onPlay={(solo, ph) => void play(solo, ph)}
          onTrain={(ph) => {
            // Treinar: voo no aparelho, sem sala e sem espera (não dá prêmio: o resultado é só do aparelho)
            setError(null)
            setPhase(ph)
            setStage({ kind: "game", key: ++seq.current, solo: true, train: true })
          }}
          onExit={onExit}
          multi={!!join}
          error={error}
        />
      )}
    </div>
  )
}

// ═══ espera ══════════════════════════════════════════════════════════════════

function JetLobby({ list, until, onCancel }: { solo: boolean; list: string[]; until: number; onCancel: () => void }) {
  const t = useTranslations("MeuMundo")
  // até a sala responder (sem prazo ainda): a engrenagem, mas já com como sair
  if (!until) {
    return (
      <div className="absolute inset-0 grid place-items-center" style={{ background: BG, color: MM.text }}>
        <div className="flex flex-col items-center gap-3">
          <Gear size={40} spin color={ST.gold} />
          <span className="text-[15px] font-semibold">{t("jetLoading", "Acendendo as caldeiras…")}</span>
          <button type="button" onClick={onCancel} className="mt-2 px-4 py-2 text-[13px] font-bold" style={{ color: MM.text, border: `1px solid ${ST.goldDeep}` }}>
            {t("mmWaitCancel", "Sair da espera")}
          </button>
        </div>
      </div>
    )
  }
  return (
    <WaitingRoom
      background={BG}
      title={t("jetLobbyTitle", "Esperando os pilotos…")}
      text={t("jetLobbyHow20", "Quem entrar até o fim do tempo voa junto, no mesmo túnel. Ganha quem for mais longe.")}
      seats={list.map((name) => ({ name, icon: <Flame className="h-4 w-4 shrink-0" style={{ color: HOT }} /> }))}
      cap={MAX_PILOTS}
      count={t("jetLobbyCount4", "{n} de 4 no túnel").replace("{n}", String(Math.max(1, list.length)))}
      until={until}
      onCancel={onCancel}
    />
  )
}

// ═══ jogo ════════════════════════════════════════════════════════════════════

function JetScreen({ body, look, name, phase, mp, onAgain, onMenu }: { body: BodyId; look?: string; name?: string; phase: PhaseId; mp?: Mp; onAgain: () => void; onMenu: () => void }) {
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
      emitMinigame("jetpack", n) // o personagem comenta a jogada (banter.ts)
      const tt = textRef.current
      if (n.kind === "can") say(tt("jetToastCan", "+COMBUSTÍVEL"), "fuel", 700)
      else if (n.kind === "low") say(tt("jetToastLow", "Pouco combustível! Pegue os galões"), "bad", 1800)
      else if (n.kind === "empty") say(tt("jetToastEmpty", "Tanque seco! O fogo apagou"), "bad", 1800)
    }
    const onEnd = (r: JetResult) => {
      if (!alive) return
      // o recorde e as estrelas valem por fase (em grupo também conta: o voo é o mesmo)
      const prev = loadRecord(r.phase)
      const record = !prev || r.dist > prev.dist
      saveRecord(r.phase, {
        score: Math.max(prev?.score ?? 0, r.score),
        dist: Math.max(prev?.dist ?? 0, r.dist),
        stars: Math.max(prev?.stars ?? 0, starsFor(r.phase, r.dist)),
        runs: (prev?.runs ?? 0) + 1,
      })
      setResult({ r, record: !group && record && r.dist > 0, best: prev })
    }
    try {
      gameRef.current = createJetpackGame({
        canvas,
        body,
        look,
        name,
        phase,
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
  }, [body, look, phase])

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
          <MinigameBanter running={hud.phase === "run"} body={body} />
          <GodVoice god="aeryn" show={!!result || !!final} />
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
            {hud.phase !== "countdown" && <AltGauge alt={hud.alt} gap={hud.gap} cue={hud.cue} glass={glass} />}
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
          <div className="pointer-events-none absolute left-1/2 -translate-x-1/2 max-[429px]:left-auto max-[429px]:right-[60px] max-[429px]:translate-x-0" style={{ top: SAFE.top }}>
            <div className="rounded-full px-3.5 py-1 text-center leading-tight max-[429px]:ml-auto max-[429px]:w-fit max-[429px]:rounded-2xl max-[429px]:px-3" style={{ background: glass, border: `1px solid ${ST.goldDeep}` }}>
              <span className="text-[18px] font-black italic tabular-nums" style={{ color: ST.goldHi }}>
                {hud.dist.toLocaleString()} m
              </span>
              <span className="ml-1.5 text-[11px] tabular-nums max-[429px]:ml-0 max-[429px]:block" style={{ color: ST.muted }}>
                {hud.speed} km/h
              </span>
            </div>
            <div className="mt-1 text-center text-[10.5px] font-black uppercase italic tracking-[0.1em] max-[429px]:ml-auto max-[429px]:max-w-[150px] max-[429px]:truncate max-[429px]:text-right" style={{ color: phaseArt(mp?.start.phase ?? phase).accent, textShadow: "0 1px 0 #000" }}>
              {phaseArt(mp?.start.phase ?? phase).num} · {t(phaseArt(mp?.start.phase ?? phase).nameKey, phaseArt(mp?.start.phase ?? phase).name)}
            </div>
            {hud.phase === "run" && !result && hud.gap < 0.6 && (
              <div className="mt-1.5 flex justify-center">
                <span className="rounded-full px-3 py-0.5 text-[11px] font-black uppercase tracking-[0.12em]" style={{ background: "rgba(110, 16, 34, 0.85)", color: "#ffd5dc", border: "1px solid #ff5a4a" }}>
                  {hud.alt > 0.5 ? t("jetLimitTop", "Limite superior") : t("jetLimitBottom", "Limite inferior")}
                </span>
              </div>
            )}
            {hud.phase === "countdown" && (
              <div className="mt-1 text-center text-[11px] font-bold tabular-nums" style={{ color: ST.cyan }}>
                {t("jetSpeedK", "Velocidade do personagem ×{k}").replace("{k}", hud.k.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }))}
              </div>
            )}
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

          {/* celular: arrastar o dedo dirige; o propulsor no botão */}
          {isTouch && !result && <TouchPad game={gameRef} label={t("jetThrust", "Propulsor")} />}

          {hud.phase === "countdown" && (
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-4">
              <span key={Math.ceil(hud.countdown)} className="text-[110px] font-black italic leading-none text-white" style={{ textShadow: "0 6px 28px rgba(0,0,0,0.6)" }}>
                {Math.max(1, Math.ceil(hud.countdown))}
              </span>
              <span className="max-w-[360px] rounded-full px-4 py-2 text-center text-[13px] font-semibold" style={{ background: glass, color: ST.text }}>
                {isTouch ? t("jetHintTouch", "Segure PROPULSOR para subir · arraste o dedo para os lados") : t("jetHintKeys", "Segure Espaço para subir · ← → para os lados")}
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

/**
 * Celular (pedido do Alex): sem botões de direção — a pessoa EMPURRA o personagem.
 * Toca em qualquer lugar e desliza: dedo para a direita = vai para a direita, para a
 * esquerda = vem para a esquerda; quanto mais longe do ponto do toque, mais forte
 * (cheio a STEER_PX). Soltou = segue reto. Se o dedo passa do cheio, o ponto de
 * partida vai junto: voltar o dedo um pouco já inverte. O PROPULSOR segue no botão.
 */
const STEER_PX = 56
function TouchPad({ game, label }: { game: { current: JetGameHandle | null }; label: string }) {
  const [thrust, setThrust] = useState(false)
  const drag = useRef<{ id: number; x0: number } | null>(null)
  const [knob, setKnob] = useState<{ x: number; y: number; v: number } | null>(null)
  const steer = (v: number) => game.current?.setTouch({ steer: v })
  const end = (e: RPointerEvent) => {
    if (drag.current?.id !== e.pointerId) return
    drag.current = null
    setKnob(null)
    steer(0)
  }
  const setT = (v: boolean) => {
    setThrust(v)
    game.current?.setTouch({ thrust: v })
  }
  return (
    <>
      <div
        // a área do arrasto começa abaixo dos botões do topo (fechar, som)
        className="absolute inset-x-0 bottom-0"
        style={{ top: "calc(max(12px, env(safe-area-inset-top)) + 104px)", touchAction: "none" }}
        onPointerDown={(e) => {
          e.preventDefault()
          ;(e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId)
          drag.current = { id: e.pointerId, x0: e.clientX }
          setKnob({ x: e.clientX, y: e.clientY, v: 0 })
          steer(0)
        }}
        onPointerMove={(e) => {
          const d = drag.current
          if (!d || d.id !== e.pointerId) return
          let dx = e.clientX - d.x0
          if (Math.abs(dx) > STEER_PX) {
            d.x0 = e.clientX - Math.sign(dx) * STEER_PX
            dx = Math.sign(dx) * STEER_PX
          }
          const v = dx / STEER_PX
          steer(v)
          setKnob({ x: d.x0, y: e.clientY, v })
        }}
        onPointerUp={end}
        onPointerCancel={end}
        onLostPointerCapture={end}
        onContextMenu={(e) => e.preventDefault()}
      />
      {knob && (
        // onde o dedo começou e para que lado está empurrando
        <div aria-hidden className="pointer-events-none absolute" style={{ left: knob.x - STEER_PX, top: knob.y - 4, width: STEER_PX * 2, height: 8 }}>
          <div className="absolute inset-0 rounded-full" style={{ background: "rgba(16,10,6,0.45)", border: `1px solid ${ST.goldDeep}` }} />
          <div
            className="absolute top-1/2 h-9 w-9 -translate-x-1/2 -translate-y-1/2 rounded-full"
            style={{ left: STEER_PX + knob.v * STEER_PX, background: "rgba(232,182,91,0.55)", border: `2px solid ${ST.goldHi}` }}
          />
        </div>
      )}
      <button
        type="button"
        onPointerDown={(e) => {
          e.preventDefault()
          e.stopPropagation()
          ;(e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId)
          setT(true)
        }}
        onPointerUp={() => setT(false)}
        onPointerCancel={() => setT(false)}
        onLostPointerCapture={() => setT(false)}
        onContextMenu={(e) => e.preventDefault()}
        className="absolute grid h-[104px] w-[104px] place-items-center rounded-full"
        style={{
          bottom: SAFE.bottom,
          right: SAFE.right,
          background: thrust ? "radial-gradient(circle at 50% 40%, #FFD27A, #FF7A1A 60%, #9A3A08)" : "radial-gradient(circle at 50% 40%, rgba(255,160,60,0.5), rgba(60,24,6,0.7))",
          border: `2px solid ${thrust ? ST.goldHi : ST.goldDeep}`,
          color: thrust ? ST.ink : ST.text,
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
    band: t("jetByBarrier", "Bateu na barreira!"),
    cliff: t("jetByCliff", "Raspou no penhasco!"),
    slider: t("jetBySlider", "O portão te pegou!"),
    energy: t("jetByEnergy", "Tocou na barreira de energia!"),
    roots: t("jetByRoots", "Preso nas raízes!"),
    narrow: t("jetByNarrow", "Não passou no vão estreito!"),
    iris: t("jetByIris", "A flor mecânica fechou!"),
    ring: t("jetByRing", "Errou o anel!"),
    beam: t("jetByBeam", "Bateu na viga!"),
    rocks: t("jetByRocks", "Bateu na rocha!"),
    crystals: t("jetByCrystals", "Bateu no cristal!"),
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
          <div className="text-[11px] font-black uppercase italic tracking-[0.12em]" style={{ color: phaseArt(result.phase).accent }}>
            {phaseArt(result.phase).num} · {t(phaseArt(result.phase).nameKey, phaseArt(result.phase).name)}
          </div>
          <h2 className="text-[24px] font-black italic leading-tight">{by[result.by]}</h2>
          <StarRow phase={result.phase} dist={result.dist} />
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

/** As 3 estrelas de desempenho da fase (metas em metros embaixo). */
function StarRow({ phase, dist }: { phase: PhaseId; dist: number }) {
  const art = phaseArt(phase)
  const got = starsFor(phase, dist)
  return (
    <div className="mt-2 grid grid-cols-3 gap-1.5">
      {art.stars.map((m, i) => (
        <div key={i} className="flex flex-col items-center px-1 py-1" style={{ background: MM.card, border: `1px solid ${i < got ? "#FFC21A" : MM.border}` }}>
          <Star className="h-5 w-5" style={{ color: i < got ? "#FFC21A" : "rgba(255,255,255,0.25)" }} fill={i < got ? "#FFC21A" : "transparent"} />
          <span className="text-[11px] font-bold tabular-nums" style={{ color: i < got ? ST.text : ST.muted }}>
            {m.toLocaleString()} m
          </span>
        </div>
      ))}
    </div>
  )
}

/**
 * Jetpack 3.0: ALTITUDE — onde o corpo está entre o chão e o teto da caixa do voo (a mesma conta da
 * regra: bate quando o corpo, 0,68 m para cima e para baixo do meio, encosta em 0 ou 8 m). As faixas
 * vermelhas são o último 0,8 m antes do limite; a seta avisa a próxima passagem bem mais baixa/alta.
 */
function AltGauge({ alt, gap, cue, glass }: { alt: number; gap: number; cue: -1 | 0 | 1; glass: string }) {
  const t = useTranslations("MeuMundo")
  const near = gap < 0.8
  // o meio do corpo encosta no limite em 0,68/8 (8,5%) e 91,5%
  const lim = (0.68 / 8) * 100
  const warn = ((0.68 + 0.8) / 8) * 100
  return (
    <div className="flex flex-col items-center gap-1 px-1 py-2" style={{ background: glass, border: `1px solid ${near ? "#ff5a4a" : ST.goldDeep}` }} aria-label={t("jetAltitude", "Altitude")}>
      <span className="text-[9px] font-black uppercase tracking-[0.1em]" style={{ color: ST.muted }}>
        {t("jetAltShort", "Alt")}
      </span>
      <div className="relative h-[132px] w-[14px] max-[759px]:h-[96px]" style={{ background: ST.well, border: `1px solid ${ST.bronze}` }}>
        <span className="absolute inset-x-0 top-0" style={{ height: `${warn}%`, background: "linear-gradient(180deg, rgba(255,70,50,0.75), rgba(255,70,50,0))" }} />
        <span className="absolute inset-x-0 bottom-0" style={{ height: `${warn}%`, background: "linear-gradient(0deg, rgba(255,70,50,0.75), rgba(255,70,50,0))" }} />
        <span className="absolute inset-x-0 h-[2px]" style={{ top: `${lim}%`, background: "#ff5a4a" }} />
        <span className="absolute inset-x-0 h-[2px]" style={{ bottom: `${lim}%`, background: "#ff5a4a" }} />
        <span
          className="absolute -left-[5px] -right-[5px] h-[4px]"
          style={{ bottom: `calc(${alt * 100}% - 2px)`, background: near ? "#ffd5dc" : "#fff", boxShadow: `0 0 6px ${near ? "#ff5a4a" : "rgba(255,255,255,0.8)"}`, transition: "bottom 80ms linear" }}
        />
      </div>
      <span className="grid h-4 w-4 place-items-center" style={{ color: ST.cyan, opacity: cue ? 1 : 0, transition: "opacity 200ms" }}>
        {cue > 0 ? <ChevronUp className="h-4 w-4 animate-bounce" /> : <ChevronDown className="h-4 w-4 animate-bounce" />}
      </span>
    </div>
  )
}
