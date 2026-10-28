"use client"

// features/meu-mundo/boxe/ui/boxe-view.tsx — ARENA DE BOXE (mm3d-43 → mm3d-44): a tela.
//
// Cobre o centro (suspenso por baixo, como os outros minijogos). Telas:
//  - FICHA: o seu lutador com os números da VIDA (força, velocidade, defesa,
//    fôlego, queixo) e as condições de hoje (alimentado, descansado, com fome,
//    cansado, estressado, machucado…), o cartel, e se pode lutar. Sozinho =
//    escolher um dos 3 do computador (mais fraco / parelho / mais forte, com a
//    bolsa); Multiplayer = espera um adversário de verdade.
//  - ESPERA (multiplayer): até 1 minuto; ninguém = computador parelho.
//  - LUTA (mm3d-44: a pessoa luta): a cena (fight-game.ts) com o placar de TV —
//    sangue e fôlego dos dois, round e relógio, a contagem do árbitro, avisos.
//    Celular: joystick à esquerda, ATACAR (combo sorteado) e ESQUIVAR à
//    direita; PC: WASD/setas, J/espaço/clique, K/Shift. No chão, ATACAR vira
//    LEVANTAR (cada toque ajuda). A TOALHA (com confirmação) conta como derrota.
//  - FIM: vitória/derrota/empate e como, os números, e o que a luta deixou na
//    vida (saúde, energia, comida, estresse, força, bolsa, lesão, hospital).

import { useCallback, useEffect, useRef, useState } from "react"
import { Loader2, Swords, User, Users, Volume2, VolumeX, Wind, X, Zap } from "lucide-react"
import { useTranslations } from "@/components/i18n/I18nProvider"
import { MM } from "../../ui/hud/tokens"
import { archivo } from "../../ui/status/evo-skin"
import { Joystick, SAFE } from "../../ui/meu-mundo-view"
import type { BoxeCard, BoxeCondition, BoxeStrategy, BoxeTier, BoxeView as BoxeStats } from "../../types"
import type { BoxeHud, BoxeNotice, FightGameHandle } from "../engine/fight-game"
import type { FightStart } from "../engine/fight"
import type { BoxeLobbyEntry, BoxeNet, BoxeNetStatus, BoxeResult } from "../engine/net"

/** Entrar numa luta (null = a sala não abriu; error = a vida recusou). */
export type BoxeJoin = (
  mode: "solo" | "mp",
  tier: BoxeTier,
  strategy: BoxeStrategy,
  hooks: { signal: AbortSignal; onLobby: (list: BoxeLobbyEntry[], until: number) => void; onStatus: (s: BoxeNetStatus) => void },
) => Promise<{ net: BoxeNet; start: FightStart } | { error: string; code?: string } | null>

export interface BoxeViewProps {
  onExit: () => void
  /** A ficha (GET /center/boxe). */
  loadCard: () => Promise<BoxeCard | { error: string; code?: string } | null>
  join: BoxeJoin
}

type Fight = { net: BoxeNet; start: FightStart }
type Stage = { kind: "menu" } | { kind: "wait"; mode: "solo" | "mp"; ac: AbortController } | { kind: "fight"; key: number; fight: Fight }

const RED = "#E8203F"
const BLUE = "#2F6BF2"
const GOLD = "#F2C230"
const BG = "radial-gradient(120% 90% at 50% 0%, #3a0f1d 0%, #140b10 58%, #07060a 100%)"
const TIERS: BoxeTier[] = ["easy", "even", "hard"]
const GOOD: BoxeCondition[] = ["fed", "rested"]

function useWords() {
  const t = useTranslations("MeuMundo")
  return {
    t,
    stat: {
      power: t("boxeStatPower", "Força"),
      speed: t("boxeStatSpeed", "Velocidade"),
      defense: t("boxeStatDefense", "Defesa"),
      stamina: t("boxeStatStamina", "Fôlego"),
      chin: t("boxeStatChin", "Queixo"),
    } satisfies Record<keyof BoxeStats, string>,
    cond: {
      fed: t("boxeCondFed", "Alimentado"),
      peckish: t("boxeCondPeckish", "Com um pouco de fome"),
      hungry: t("boxeCondHungry", "Com fome"),
      stuffed: t("boxeCondStuffed", "Cheio demais"),
      rested: t("boxeCondRested", "Descansado"),
      tired: t("boxeCondTired", "Cansado"),
      exhausted: t("boxeCondExhausted", "Exausto"),
      sleepy: t("boxeCondSleepy", "Com sono"),
      stressed: t("boxeCondStressed", "Estressado"),
      hurt: t("boxeCondHurt", "Machucado"),
      heavy: t("boxeCondHeavy", "Pesado"),
    } satisfies Record<BoxeCondition, string>,
    tier: {
      easy: t("boxeTierEasy", "Mais fraco"),
      even: t("boxeTierEven", "Parelho"),
      hard: t("boxeTierHard", "Mais forte"),
    } satisfies Record<BoxeTier, string>,
  }
}

/** Por que não pode lutar (o código vem da vida). */
function blockedText(t: ReturnType<typeof useTranslations>, code: string | null, hours: number) {
  switch (code) {
    case "tired":
      return t("boxeNoTired", "Ele está cansado demais para lutar. Durma ou descanse um pouco.")
    case "unfit":
      return t("boxeNoUnfit", "Com a saúde assim o médico não libera a luta. Cuide-se antes.")
    case "injured":
      return t("boxeNoInjured", "Ele está lesionado: sem lutar por mais {h} h.").replace("{h}", String(Math.max(1, Math.ceil(hours))))
    case "hospital":
      return t("boxeNoHospital", "Ele está internado no hospital.")
    case "jail":
      return t("boxeNoJail", "Ele está preso na delegacia.")
    case "sleeping":
      return t("boxeNoSleeping", "Ele está dormindo.")
    case "dead":
      return t("boxeNoDead", "Seu hóspede morreu.")
    default:
      return t("boxeNoGeneric", "Ele não pode lutar agora.")
  }
}

export function BoxeView({ onExit, loadCard, join }: BoxeViewProps) {
  const { t } = useWords()
  const [stage, setStage] = useState<Stage>({ kind: "menu" })
  const [lobby, setLobby] = useState<{ list: BoxeLobbyEntry[]; until: number }>({ list: [], until: 0 })
  const [error, setError] = useState<string | null>(null)
  const seq = useRef(0)
  const fight = useCallback(
    async (mode: "solo" | "mp", tier: BoxeTier, strategy: BoxeStrategy) => {
      setError(null)
      const ac = new AbortController()
      setLobby({ list: [], until: 0 })
      setStage({ kind: "wait", mode, ac })
      try {
        const got = await join(mode, tier, strategy, { signal: ac.signal, onLobby: (list, until) => setLobby({ list, until }), onStatus: () => {} })
        if (ac.signal.aborted) {
          if (got && "net" in got) got.net.dispose()
          return
        }
        if (!got || "error" in got) {
          setError(got && "error" in got ? blockedText(t, got.code ?? null, 0) : t("boxeJoinFail", "A arena não abriu agora. Tente de novo."))
          setStage({ kind: "menu" })
          return
        }
        setStage({ kind: "fight", key: ++seq.current, fight: got })
      } catch {
        if (!ac.signal.aborted) {
          setError(t("boxeJoinFail", "A arena não abriu agora. Tente de novo."))
          setStage({ kind: "menu" })
        }
      }
    },
    [join, t],
  )
  return (
    <div className={`fixed inset-0 z-[70] touch-none select-none overflow-hidden ${archivo.className}`} style={{ background: "#07060a" }}>
      {stage.kind === "fight" ? (
        <FightScreen key={stage.key} fight={stage.fight} onMenu={() => setStage({ kind: "menu" })} onExit={onExit} />
      ) : stage.kind === "wait" ? (
        <Waiting
          mode={stage.mode}
          list={lobby.list}
          until={lobby.until}
          onCancel={() => {
            stage.ac.abort()
            setStage({ kind: "menu" })
          }}
        />
      ) : (
        <Menu loadCard={loadCard} onFight={(m, tier, s) => void fight(m, tier, s)} onExit={onExit} error={error} />
      )}
    </div>
  )
}

// ═══ peças ═══════════════════════════════════════════════════════════════════

function Bar({ value, color, h = 6 }: { value: number; color: string; h?: number }) {
  return (
    <span className="block w-full overflow-hidden rounded-full" style={{ height: h, background: "rgba(255,255,255,0.1)" }}>
      <span className="block h-full rounded-full" style={{ width: `${Math.max(0, Math.min(100, value))}%`, background: color }} />
    </span>
  )
}

function Stats({ view, compact = false }: { view: BoxeStats; compact?: boolean }) {
  const { stat } = useWords()
  const keys: (keyof BoxeStats)[] = ["power", "speed", "defense", "stamina", "chin"]
  return (
    <span className={`grid grid-cols-[auto_1fr_auto] items-center ${compact ? "gap-x-1.5 gap-y-0.5 text-[10.5px]" : "gap-x-2 gap-y-1 text-[12px]"}`} style={{ color: MM.muted }}>
      {keys.map((k) => (
        <span key={k} className="contents">
          <span>{stat[k]}</span>
          <Bar value={view[k]} color={k === "power" ? RED : k === "speed" ? GOLD : k === "defense" ? BLUE : k === "stamina" ? "#38E881" : "#C9A2FF"} h={compact ? 4 : 6} />
          <span className="tabular-nums" style={{ color: MM.text }}>
            {view[k]}
          </span>
        </span>
      ))}
    </span>
  )
}

// ═══ ficha ═══════════════════════════════════════════════════════════════════

function Menu({
  loadCard,
  onFight,
  onExit,
  error,
}: {
  loadCard: BoxeViewProps["loadCard"]
  onFight: (mode: "solo" | "mp", tier: BoxeTier, s: BoxeStrategy) => void
  onExit: () => void
  error: string | null
}) {
  const { t, cond, tier: tierName } = useWords()
  const [card, setCard] = useState<BoxeCard["boxe"] | null>(null)
  const [fail, setFail] = useState<string | null>(null)
  const [mode, setMode] = useState<"solo" | "mp">("solo")
  const [tier, setTier] = useState<BoxeTier>("even")
  useEffect(() => {
    let alive = true
    void loadCard().then((r) => {
      if (!alive) return
      if (!r) setFail(t("boxeCardFail", "Não deu para ler a ficha agora."))
      else if ("error" in r) setFail(r.code === "far" ? t("boxeFar", "Chegue perto da porta da arena.") : r.error)
      else setCard(r.boxe)
    })
    return () => {
      alive = false
    }
  }, [loadCard, t])
  const rec = card?.me.record
  return (
    <div className="absolute inset-0 flex overflow-y-auto p-4 max-[520px]:p-2.5" style={{ background: BG }}>
      <div className="m-auto w-full max-w-[620px] rounded-[22px] p-5 text-left max-[759px]:p-4 [@media(max-height:520px)]:p-3" style={{ background: MM.surface, color: MM.text, boxShadow: MM.shadow, border: `1px solid ${MM.border}` }}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-[12px] font-bold uppercase tracking-[0.18em]" style={{ color: GOLD }}>
              {t("boxeKicker", "Arena de Boxe")}
            </div>
            <h1 className="mt-1.5 text-[30px] font-black italic leading-none tracking-tight max-[759px]:text-[25px]">
              {(() => {
                const [a, ...b] = t("boxeTitle", "NO RINGUE").split(" ")
                return (
                  <>
                    <span style={{ color: RED }}>{a}</span> {b.join(" ")}
                  </>
                )
              })()}
            </h1>
            <p className="mt-2 text-[13.5px] leading-snug max-[759px]:text-[12.5px] [@media(max-height:560px)]:hidden" style={{ color: MM.muted }}>
              {t("boxePitch2", "Agora é você quem luta: ande pelo ringue e aperte ATACAR para soltar um combo — cada toque é uma sequência diferente — e ESQUIVAR para escapar. O treino, a comida e o descanso do seu hóspede decidem a força, a velocidade e o fôlego. Apanhar demais machuca de verdade — pode até ir para o hospital.")}
            </p>
          </div>
          <button type="button" aria-label={t("boxeLeave", "Voltar ao centro")} onClick={onExit} className="grid h-10 w-10 shrink-0 place-items-center rounded-full" style={{ background: MM.card, border: `1px solid ${MM.border}` }}>
            <X className="h-5 w-5" />
          </button>
        </div>

        {!card && !fail && (
          <div className="mt-6 flex items-center gap-2 text-[14px]" style={{ color: MM.muted }}>
            <Loader2 className="h-5 w-5 animate-spin" /> {t("boxeCardLoading", "Pesando o lutador…")}
          </div>
        )}
        {fail && (
          <p className="mt-4 rounded-[12px] px-3 py-2 text-[13px]" style={{ background: "rgba(255,90,110,0.12)", color: MM.danger }}>
            {fail}
          </p>
        )}
        {card && (
          <>
            {/* o seu lutador */}
            <div className="mt-4 grid grid-cols-[1fr_1.15fr] gap-3 rounded-[16px] p-3 max-[520px]:grid-cols-1" style={{ background: MM.card, border: `1px solid ${MM.border}` }}>
              <div>
                <div className="flex items-center gap-2 text-[12px] font-bold uppercase tracking-[0.14em]" style={{ color: RED }}>
                  <User className="h-4 w-4" /> {t("boxeYou", "Seu lutador")}
                </div>
                <div className="mt-1 text-[12.5px]" style={{ color: MM.muted }}>
                  {t("boxeRecord", "Cartel: {w}V · {l}D · {d}E · {ko} nocautes")
                    .replace("{w}", String(rec?.w ?? 0))
                    .replace("{l}", String(rec?.l ?? 0))
                    .replace("{d}", String(rec?.d ?? 0))
                    .replace("{ko}", String(rec?.ko ?? 0))}
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {card.me.conditions.map((c) => (
                    <span
                      key={c}
                      className="rounded-full px-2 py-0.5 text-[11.5px] font-semibold"
                      style={GOOD.includes(c) ? { background: "rgba(56,232,129,0.14)", color: "#7CF0AE" } : { background: "rgba(255,90,110,0.14)", color: "#FF8A99" }}
                    >
                      {cond[c]}
                    </span>
                  ))}
                </div>
              </div>
              <Stats view={card.me.view} />
            </div>
            {!card.ok && (
              <p className="mt-3 rounded-[12px] px-3 py-2 text-[13px] font-semibold" style={{ background: "rgba(255,90,110,0.12)", color: MM.danger }}>
                {blockedText(t, card.code, card.injuredH)}
              </p>
            )}

            {/* modo */}
            <div className="mt-4 grid grid-cols-2 gap-2" role="radiogroup" aria-label={t("boxeMode", "Modo")}>
              {(["solo", "mp"] as const).map((m) => {
                const on = m === mode
                return (
                  <button
                    key={m}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    onClick={() => setMode(m)}
                    className="flex items-center justify-center gap-2 rounded-[12px] px-3 py-2.5 text-[14px] font-bold"
                    style={{ background: on ? MM.rubySoft : MM.card, border: `1.5px solid ${on ? RED : MM.border}` }}
                  >
                    {m === "solo" ? <User className="h-4 w-4" /> : <Users className="h-4 w-4" />}
                    {m === "solo" ? t("boxeModeSolo", "Sozinho") : t("boxeModeMulti", "Multiplayer")}
                  </button>
                )
              })}
            </div>

            {mode === "solo" ? (
              <div className="mt-3 grid grid-cols-3 gap-2 max-[520px]:gap-1.5" role="radiogroup" aria-label={t("boxeOpponent", "Adversário")}>
                {TIERS.map((k) => {
                  const o = card.opponents.find((x) => x.tier === k)
                  if (!o) return null
                  const on = k === tier
                  return (
                    <button
                      key={k}
                      type="button"
                      role="radio"
                      aria-checked={on}
                      onClick={() => setTier(k)}
                      className="flex flex-col gap-1.5 rounded-[14px] p-2.5 text-left max-[520px]:p-2"
                      style={{ background: on ? "rgba(47,107,242,0.18)" : MM.card, border: `1.5px solid ${on ? BLUE : MM.border}` }}
                    >
                      <span className="min-w-0">
                        <span className="block text-[11px] font-bold uppercase tracking-[0.12em]" style={{ color: k === "hard" ? RED : k === "easy" ? "#7CF0AE" : GOLD }}>
                          {tierName[k]}
                        </span>
                        <span className="block truncate text-[15px] font-black italic">{o.name}</span>
                        <span className="block text-[11px]" style={{ color: MM.muted }}>
                          {t("boxePurse", "Bolsa: {n} moedas").replace("{n}", String(o.purse))}
                        </span>
                      </span>
                      <span className="min-w-0 flex-1 max-[520px]:hidden">
                        <Stats view={o.view} compact />
                      </span>
                    </button>
                  )
                })}
              </div>
            ) : (
              <p className="mt-3 rounded-[12px] px-3 py-2.5 text-[13px] leading-snug" style={{ background: MM.card, color: MM.muted }}>
                {t("boxeMultiHow", "Você entra na fila da arena e luta com quem estiver no centro agora, cada um com os números da própria vida. Se ninguém aparecer em 1 minuto, você luta contra o computador. Bolsa da vitória: 60 moedas.")}
              </p>
            )}

            {/* controles */}
            <p className="mt-3 rounded-[12px] px-3 py-2.5 text-[12.5px] leading-snug [@media(max-height:560px)]:hidden" style={{ background: MM.card, color: MM.muted }}>
              {t("boxeControls", "Celular: joystick anda, ATACAR solta o combo, ESQUIVAR abaixa. Computador: WASD ou setas, J/espaço/clique ataca, K/Shift esquiva. No chão, aperte ATACAR para levantar.")}
            </p>

            {error && (
              <p className="mt-3 rounded-[12px] px-3 py-2 text-[13px]" style={{ background: "rgba(255,90,110,0.12)", color: MM.danger }}>
                {error}
              </p>
            )}
            <button
              type="button"
              disabled={!card.ok}
              onClick={() => onFight(mode, tier, "balanced")}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-[14px] px-3 py-3.5 text-[16px] font-black uppercase italic tracking-wide"
              style={card.ok ? { background: MM.rubyFill, border: `1px solid ${MM.rubyBorder}`, color: "#fff" } : { background: MM.card, color: MM.disabledText, border: `1px solid ${MM.border}` }}
            >
              <Swords className="h-5 w-5" /> {mode === "solo" ? t("boxeFight", "Subir no ringue") : t("boxeQueue", "Entrar na fila")}
            </button>
          </>
        )}
      </div>
    </div>
  )
}

// ═══ espera ══════════════════════════════════════════════════════════════════

function Waiting({ mode, list, until, onCancel }: { mode: "solo" | "mp"; list: BoxeLobbyEntry[]; until: number; onCancel: () => void }) {
  const { t } = useWords()
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 250)
    return () => clearInterval(id)
  }, [])
  const left = until ? Math.max(0, Math.ceil((until - now) / 1000)) : null
  return (
    <div className="absolute inset-0 flex items-center justify-center p-4" style={{ background: BG }}>
      <div className="w-full max-w-[420px] rounded-[22px] p-5 text-left" style={{ background: MM.surface, color: MM.text, boxShadow: MM.shadow, border: `1px solid ${MM.border}` }}>
        {mode === "solo" ? (
          <div className="flex items-center gap-3 text-[16px] font-bold">
            <Loader2 className="h-6 w-6 animate-spin" style={{ color: RED }} /> {t("boxeGoingUp", "Subindo no ringue…")}
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2 text-[12px] font-bold uppercase tracking-[0.18em]" style={{ color: GOLD }}>
              <Users className="h-4 w-4" /> {t("boxeModeMulti", "Multiplayer")}
            </div>
            <div className="mt-2 flex items-end justify-between gap-3">
              <h2 className="text-[22px] font-black italic leading-tight">{t("boxeLobbyTitle", "Esperando um adversário…")}</h2>
              <span className="text-[34px] font-black italic tabular-nums leading-none" style={{ color: RED }} aria-live="polite">
                {left === null ? <Loader2 className="h-7 w-7 animate-spin" /> : `0:${String(left).padStart(2, "0")}`}
              </span>
            </div>
            <p className="mt-2 text-[13px] leading-snug" style={{ color: MM.muted }}>
              {t("boxeLobbyHow", "Se ninguém aparecer até o fim do tempo, você luta contra o computador (parelho).")}
            </p>
            <ol className="mt-3 grid grid-cols-2 gap-1.5">
              {[0, 1].map((i) => {
                const e = list[i]
                return (
                  <li key={i} className="flex items-center gap-2 rounded-[10px] px-2.5 py-2 text-[13.5px]" style={{ background: e ? MM.rubySoft : MM.card, color: e ? MM.text : MM.muted }}>
                    <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: i === 0 ? RED : BLUE }} />
                    <span className="min-w-0 truncate font-semibold">{e ? e.name : t("boxeLobbyFree", "vaga livre")}</span>
                  </li>
                )
              })}
            </ol>
          </>
        )}
        <button type="button" onClick={onCancel} className="mt-4 w-full rounded-[14px] px-3 py-3 text-[15px] font-bold" style={{ background: MM.card, border: `1px solid ${MM.border}` }}>
          {t("boxeCancel", "Desistir")}
        </button>
      </div>
    </div>
  )
}

// ═══ luta ════════════════════════════════════════════════════════════════════

function clockText(s: number) {
  const v = Math.ceil(s)
  return `${Math.floor(v / 60)}:${String(v % 60).padStart(2, "0")}`
}

function FightScreen({ fight, onMenu, onExit }: { fight: Fight; onMenu: () => void; onExit: () => void }) {
  const { t, cond } = useWords()
  const { start, net } = fight
  const me = start.me
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const gameRef = useRef<FightGameHandle | null>(null)
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading")
  const [hud, setHud] = useState<BoxeHud | null>(null)
  const [toast, setToast] = useState<{ text: string; tone: "red" | "gold" | "white"; id: number } | null>(null)
  const [muted, setMuted] = useState(false)
  const [result, setResult] = useState<BoxeResult | null>(net.result)
  const [confirmTowel, setConfirmTowel] = useState(false)
  const [towel, setTowel] = useState(net.towel)
  const [offline, setOffline] = useState(false)
  // Tela de celular só em aparelho SÓ de toque (como o Paint); mexeu um mouse: PC
  const [isTouch, setIsTouch] = useState(() => typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches && !window.matchMedia("(any-pointer: fine)").matches)
  useEffect(() => {
    if (!isTouch) return
    const onMove = (e: PointerEvent) => e.pointerType === "mouse" && setIsTouch(false)
    window.addEventListener("pointermove", onMove)
    return () => window.removeEventListener("pointermove", onMove)
  }, [isTouch])
  const textRef = useRef(t)
  useEffect(() => {
    textRef.current = t
  }, [t])
  const nameOf = useCallback((who: number) => start.corners[who]?.name ?? "", [start])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    let alive = true
    let timer: ReturnType<typeof setTimeout> | null = null
    let seq = 0
    const say = (text: string, tone: "red" | "gold" | "white" = "white", ms = 1400) => {
      const id = ++seq
      setToast({ text, tone, id })
      if (timer) clearTimeout(timer)
      timer = setTimeout(() => alive && setToast((cur) => (cur?.id === id ? null : cur)), ms)
    }
    const onNotice = (n: BoxeNotice) => {
      if (!alive) return
      const tt = textRef.current
      switch (n.kind) {
        case "bell":
          say(tt("boxeToastRound", "ROUND {n}").replace("{n}", String(n.round)), "gold", 1300)
          break
        case "break":
          say(tt("boxeToastBreak", "Fim do {n}º round").replace("{n}", String(n.round)), "white", 1500)
          break
        case "clean":
          say(tt("boxeToastClean", "Golpe limpo de {name}!").replace("{name}", nameOf(n.who)), "gold", 1000)
          break
        case "down":
          say(tt("boxeToastDown", "KNOCKDOWN! {name} no chão").replace("{name}", nameOf(n.who)), "red", 1800)
          break
        case "up":
          say(tt("boxeToastUp", "{name} levantou!").replace("{name}", nameOf(n.who)), "white", 1200)
          break
        case "ko":
          say(n.tko ? tt("boxeToastTko", "NOCAUTE TÉCNICO!") : tt("boxeToastKo", "NOCAUTE!"), "red", 2600)
          break
        case "end":
          say(tt("boxeToastEnd", "Fim da luta! Decisão dos juízes…"), "gold", 2000)
          break
        case "towel":
          setTowel({ who: n.who, at: 0 })
          say(tt("boxeToastTowel", "{name} jogou a toalha").replace("{name}", nameOf(n.who)), "white", 2400)
          break
        default:
          break
      }
    }
    const onResult = (r: BoxeResult) => alive && setResult(r)
    net.listeners.result.push(onResult)
    let disposeGame: (() => void) | null = null
    void import("../engine/fight-game").then(({ createFightGame }) => {
      if (!alive) return
      try {
        const g = createFightGame({
          canvas,
          net,
          start,
          onReady: () => alive && setStatus("ready"),
          onHud: (h) => alive && setHud(h),
          onNotice,
          onError: () => alive && setStatus("error"),
        })
        gameRef.current = g
        disposeGame = () => g.dispose()
      } catch (err) {
        console.warn("[boxe] cena não abriu", err)
        setStatus("error")
      }
    })
    const watch = setInterval(() => alive && setOffline(net.status === "offline"), 1000)
    return () => {
      alive = false
      if (timer) clearTimeout(timer)
      clearInterval(watch)
      const i = net.listeners.result.indexOf(onResult)
      if (i >= 0) net.listeners.result.splice(i, 1)
      disposeGame?.()
      gameRef.current = null
      net.dispose()
    }
  }, [net, start, nameOf])

  const ph = hud?.phase
  const showResult = !!result && (hud?.over ?? true)
  const myDown = !!hud?.count.down && hud.count.who === me
  const fighting = ph?.kind === "round" || ph?.kind === "count"
  const corner = (who: number) => {
    const c = start.corners[who]
    const color = who === 0 ? RED : BLUE
    const right = who === 1
    return (
      <div className={`flex min-w-0 flex-1 flex-col gap-1 ${right ? "items-end text-right" : ""}`}>
        <div className={`flex max-w-full items-center gap-1.5 ${right ? "flex-row-reverse" : ""}`}>
          <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: color }} />
          <span className="truncate text-[15px] font-black italic leading-none max-[600px]:text-[13px]">{c.name}</span>
          {who === me && (
            <span className="shrink-0 rounded-full px-1.5 text-[10px] font-bold uppercase" style={{ background: color }}>
              {t("boxeYouTag", "você")}
            </span>
          )}
        </div>
        <div className="w-full" style={{ transform: right ? "scaleX(-1)" : undefined }}>
          <Bar value={hud?.blood[who] ?? 100} color={`linear-gradient(90deg, #7a0a14, ${RED})`} h={10} />
        </div>
        <div className="w-[82%]" style={{ transform: right ? "scaleX(-1)" : undefined }}>
          <Bar value={hud?.stam[who] ?? 100} color={`linear-gradient(90deg, #8a6a10, ${GOLD})`} h={5} />
        </div>
      </div>
    )
  }

  return (
    <div className="absolute inset-0">
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full outline-none" />
      {status !== "ready" && (
        <div className="absolute inset-0 grid place-items-center" style={{ background: BG }}>
          {status === "error" ? (
            <div className="max-w-[340px] text-center text-[14px]" style={{ color: MM.text }}>
              {t("boxeSceneFail", "A arena não abriu neste aparelho. A luta continua e vale na vida.")}
              <button type="button" onClick={onExit} className="mt-3 block w-full rounded-[12px] px-3 py-2.5 font-bold" style={{ background: MM.card, border: `1px solid ${MM.border}` }}>
                {t("boxeLeave", "Voltar ao centro")}
              </button>
            </div>
          ) : (
            <Loader2 className="h-9 w-9 animate-spin" style={{ color: RED }} />
          )}
        </div>
      )}

      {/* placar de TV */}
      <div className="pointer-events-none absolute inset-x-0 flex items-start gap-3 px-3" style={{ top: SAFE.top, color: MM.text }}>
        <div className="mx-auto flex w-full max-w-[860px] items-start gap-3 rounded-[16px] px-3 py-2" style={{ background: "rgba(8,8,12,0.62)", border: `1px solid ${MM.border}` }}>
          {corner(0)}
          <div className="flex shrink-0 flex-col items-center px-1">
            <span className="text-[11px] font-bold uppercase tracking-[0.16em]" style={{ color: GOLD }}>
              {ph?.kind === "break" ? t("boxeBreakTag", "Intervalo") : t("boxeRoundTag", "Round {n}").replace("{n}", String(ph?.round ?? 1))}
            </span>
            <span className="text-[24px] font-black italic tabular-nums leading-none max-[600px]:text-[20px]">{ph ? clockText(ph.left) : "1:00"}</span>
          </div>
          {corner(1)}
        </div>
      </div>

      {/* som e toalha: embaixo do placar, à direita (embaixo ficam os controles) */}
      <div className="absolute flex gap-2" style={{ top: `calc(${SAFE.top} + 76px)`, right: SAFE.right }}>
        <button
          type="button"
          aria-label={muted ? t("boxeSoundOn", "Ligar o som") : t("boxeSoundOff", "Desligar o som")}
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
        {!hud?.over && !towel && (
          <button
            type="button"
            onClick={() => {
              if (!confirmTowel) {
                setConfirmTowel(true)
                setTimeout(() => setConfirmTowel(false), 3500)
                return
              }
              net.sendTowel()
              setConfirmTowel(false)
            }}
            className="h-10 rounded-full px-3.5 text-[13px] font-bold"
            style={confirmTowel ? { background: MM.rubyFill, border: `1px solid ${MM.rubyBorder}`, color: "#fff" } : { background: MM.surface, border: `1px solid ${MM.border}`, color: MM.text }}
          >
            {confirmTowel ? t("boxeTowelConfirm", "Confirmar: perder agora") : t("boxeTowel", "Jogar a toalha")}
          </button>
        )}
      </div>
      <div className="absolute" style={{ top: `calc(${SAFE.top} + 76px)`, left: SAFE.left }}>
        <button type="button" onClick={onExit} className="h-10 rounded-full px-4 text-[13px] font-semibold" style={{ background: MM.surface, border: `1px solid ${MM.border}`, color: MM.muted }} title={t("boxeLeaveHint", "Sair não para a luta: ela continua e vale na vida.")}>
          {t("boxeLeaveShort", "Sair")}
        </button>
      </div>

      {/* apresentação */}
      {ph?.kind === "intro" && (
        <div className="pointer-events-none absolute inset-x-0 bottom-[16%] flex justify-center px-3">
          <div className="grid w-full max-w-[720px] grid-cols-[1fr_auto_1fr] items-center gap-3 rounded-[18px] p-3" style={{ background: "rgba(8,8,12,0.72)", border: `1px solid ${MM.border}`, color: MM.text }}>
            {[0, 1].map((who) => {
              const c = start.corners[who]
              const box = (
                <div key={who} className={`min-w-0 ${who === 1 ? "text-right" : ""}`}>
                  <div className="truncate text-[17px] font-black italic" style={{ color: who === 0 ? RED : BLUE }}>
                    {c.name}
                  </div>
                  <div className="text-[11.5px]" style={{ color: MM.muted }}>
                    {c.cpu ? t("boxeCpu", "computador") : who === me ? t("boxeYouTag", "você") : t("boxeHuman", "jogador")}
                  </div>
                  <div className={`mt-1 flex flex-wrap gap-1 ${who === 1 ? "justify-end" : ""} max-[600px]:hidden`}>
                    {c.view.conditions
                      .filter((x) => !GOOD.includes(x))
                      .slice(0, 3)
                      .map((x) => (
                        <span key={x} className="rounded-full px-1.5 text-[10.5px]" style={{ background: "rgba(255,90,110,0.16)", color: "#FF8A99" }}>
                          {cond[x]}
                        </span>
                      ))}
                  </div>
                </div>
              )
              return who === 0 ? (
                <span key="a" className="contents">
                  {box}
                  <span className="text-[22px] font-black italic" style={{ color: GOLD }}>
                    VS
                  </span>
                </span>
              ) : (
                box
              )
            })}
          </div>
        </div>
      )}
      {start.nobody && ph?.kind === "intro" && (
        <div className="pointer-events-none absolute inset-x-0 top-[22%] text-center text-[13px] font-semibold" style={{ color: MM.text }}>
          {t("boxeNobody", "Ninguém apareceu: você vai lutar contra o computador.")}
        </div>
      )}

      {/* contagem do árbitro */}
      {hud?.count.down && hud.count.n > 0 && !showResult && (
        <div className="pointer-events-none absolute inset-0 grid place-items-center">
          <div className="flex flex-col items-center">
            <span className="text-[120px] font-black italic leading-none max-[600px]:text-[88px]" style={{ color: "#fff", textShadow: `0 0 30px ${RED}, 0 6px 0 rgba(0,0,0,0.5)` }}>
              {hud.count.n}
            </span>
            {myDown && (
              <span className="mt-2 rounded-full px-3 py-1 text-[15px] font-black uppercase italic" style={{ background: "rgba(8,8,12,0.7)", color: GOLD }}>
                {isTouch ? t("boxeRiseTap", "Toque em LEVANTAR sem parar!") : t("boxeRiseKey", "Aperte J ou espaço sem parar para levantar!")}
              </span>
            )}
          </div>
        </div>
      )}

      {/* intervalo: os números até aqui */}
      {ph?.kind === "break" && hud && (
        <div className="pointer-events-none absolute inset-x-0 bottom-[18%] flex justify-center px-3">
          <div className="grid w-full max-w-[420px] grid-cols-[1fr_auto_1fr] gap-x-3 gap-y-1 rounded-[16px] px-4 py-3 text-[13px]" style={{ background: "rgba(8,8,12,0.72)", border: `1px solid ${MM.border}`, color: MM.text }}>
            <span className="text-right tabular-nums">
              {hud.tally[0].landed}/{hud.tally[0].thrown}
            </span>
            <span style={{ color: MM.muted }}>{t("boxeTallyPunches", "golpes certos")}</span>
            <span className="tabular-nums">
              {hud.tally[1].landed}/{hud.tally[1].thrown}
            </span>
            <span className="text-right tabular-nums">{hud.tally[0].kd}</span>
            <span style={{ color: MM.muted }}>{t("boxeTallyKd", "quedas provocadas")}</span>
            <span className="tabular-nums">{hud.tally[1].kd}</span>
          </div>
        </div>
      )}

      {/* avisos */}
      {toast && !showResult && (
        <div className="pointer-events-none absolute inset-x-0 top-[26%] flex justify-center px-4">
          <span
            key={toast.id}
            className="rounded-[14px] px-4 py-2 text-center text-[22px] font-black italic leading-tight max-[600px]:text-[17px]"
            style={{
              background: "rgba(8,8,12,0.66)",
              color: toast.tone === "red" ? "#FF5A6E" : toast.tone === "gold" ? GOLD : "#fff",
              border: `1px solid ${MM.border}`,
            }}
          >
            {toast.text}
          </span>
        </div>
      )}
      {offline && !result && (
        <div className="absolute inset-x-0 text-center text-[12.5px]" style={{ top: "calc(" + SAFE.top + " + 92px)", color: MM.danger }}>
          {t("boxeOffline", "Sem conexão com a arena. A luta continua e vale na vida.")}
        </div>
      )}

      {/* controles */}
      {status === "ready" && !showResult && isTouch && <Joystick gameRef={gameRef} />}
      {status === "ready" && !showResult && (isTouch || fighting) && (
        <div className="absolute flex items-end gap-3" style={{ bottom: `calc(${SAFE.bottom} + 10px)`, right: SAFE.right }}>
          {!myDown && (
            <ActionButton size={isTouch ? 72 : 58} color={BLUE} label={t("boxeDodge", "Esquivar")} hint={isTouch ? null : "K"} dim={!fighting || !hud?.canAct} onPress={() => gameRef.current?.dodge()}>
              <Wind className="h-6 w-6" />
            </ActionButton>
          )}
          <ActionButton size={isTouch ? 96 : 74} color={myDown ? GOLD : RED} label={myDown ? t("boxeRise", "Levantar") : t("boxeAttack", "Atacar")} hint={isTouch ? null : "J"} dim={!myDown && (!fighting || !hud?.canAct)} onPress={() => gameRef.current?.attack()}>
            <Swords className="h-8 w-8" />
          </ActionButton>
        </div>
      )}
      {status === "ready" && !isTouch && ph?.kind === "intro" && (
        <div className="pointer-events-none absolute inset-x-0 text-center text-[13px] font-semibold" style={{ bottom: `calc(${SAFE.bottom} + 4px)`, color: MM.muted }}>
          {t("boxeKeys2", "D/→ avança · A/← recua · W/S de lado · J, espaço ou clique: atacar · K ou Shift: esquivar")}
        </div>
      )}

      {showResult && result && <ResultCard result={result} start={start} onMenu={onMenu} onExit={onExit} />}
    </div>
  )
}

/** Botão redondo de luta: dispara no toque (pointerdown, sem esperar soltar). */
function ActionButton({ size, color, label, hint, dim, onPress, children }: { size: number; color: string; label: string; hint: string | null; dim: boolean; onPress: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      onPointerDown={(e) => {
        e.preventDefault()
        onPress()
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") onPress()
      }}
      className="relative flex shrink-0 flex-col items-center justify-center rounded-full font-black uppercase italic text-white transition-transform active:scale-95"
      style={{
        width: size,
        height: size,
        touchAction: "none",
        background: `radial-gradient(circle at 35% 30%, ${color}, ${color}cc 60%, ${color}88)`,
        boxShadow: `0 6px 18px rgba(0,0,0,0.35), 0 0 0 2px rgba(255,255,255,0.18) inset`,
        opacity: dim ? 0.55 : 1,
      }}
    >
      {children}
      <span className="mt-0.5 text-[10.5px] leading-none tracking-wide">{label}</span>
      {hint && (
        <span className="absolute -top-1 -right-1 grid h-5 min-w-5 place-items-center rounded-full px-1 text-[10px] not-italic" style={{ background: "rgba(8,8,12,0.8)", color: MM.text }}>
          {hint}
        </span>
      )}
    </button>
  )
}

// ═══ fim ═════════════════════════════════════════════════════════════════════

function ResultCard({ result, start, onMenu, onExit }: { result: BoxeResult; start: FightStart; onMenu: () => void; onExit: () => void }) {
  const { t } = useWords()
  const me = result.me
  const row = result.rows[me]
  const other = start.corners[1 - me]?.name ?? ""
  const a = result.aftermath
  const title = row.outcome === "win" ? t("boxeWin", "VITÓRIA") : row.outcome === "loss" ? t("boxeLoss", "DERROTA") : t("boxeDraw", "EMPATE")
  const color = row.outcome === "win" ? GOLD : row.outcome === "loss" ? "#FF5A6E" : MM.text
  const roundTxt = t("boxeRoundN", "{n}º round").replace("{n}", String(row.round))
  const score = result.score ?? [0, 0]
  const how = (() => {
    switch (row.method) {
      case "ko":
        return (row.outcome === "win" ? t("boxeHowKoWin", "Nocaute em {name} no {r}") : t("boxeHowKoLoss", "Nocauteado por {name} no {r}")).replace("{name}", other).replace("{r}", roundTxt)
      case "tko":
        return (row.outcome === "win" ? t("boxeHowTkoWin", "Nocaute técnico no {r} (3 quedas)") : t("boxeHowTkoLoss", "Nocaute técnico no {r} (3 quedas)")).replace("{r}", roundTxt)
      case "towel":
        return row.outcome === "loss" ? t("boxeHowTowelMine", "Você jogou a toalha no {r}").replace("{r}", roundTxt) : t("boxeHowTowelTheirs", "{name} jogou a toalha").replace("{name}", other)
      case "draw":
        return t("boxeHowDraw", "Empate nos pontos ({a} × {b})").replace("{a}", String(score[0])).replace("{b}", String(score[1]))
      default:
        return t("boxeHowPoints", "Nos pontos: {a} × {b}")
          .replace("{a}", String(score[me]))
          .replace("{b}", String(score[1 - me]))
    }
  })()
  const sign = (v: number) => {
    const s = String(Math.round(v * 10) / 10)
    return v > 0 ? `+${s}` : s
  }
  const lines: { label: string; v: number; good: boolean }[] = a
    ? [
        { label: t("boxeLifeHealth", "Saúde"), v: a.delta.health, good: a.delta.health >= 0 },
        { label: t("boxeLifeEnergy", "Energia"), v: a.delta.energy, good: a.delta.energy >= 0 },
        { label: t("boxeLifeSatiety", "Saciedade"), v: a.delta.satiety, good: a.delta.satiety >= 0 },
        { label: t("boxeLifeStress", "Estresse"), v: a.delta.stress, good: a.delta.stress <= 0 },
        { label: t("boxeLifeMood", "Humor"), v: a.delta.mood, good: a.delta.mood >= 0 },
        { label: t("boxeLifeStrength", "Força"), v: a.delta.strength, good: true },
        { label: t("boxeLifeSpeed", "Velocidade"), v: a.delta.speed, good: true },
      ].filter((l) => Math.abs(l.v) >= 0.05)
    : []
  return (
    <div className="absolute inset-0 flex overflow-y-auto p-4" style={{ background: "rgba(6,6,10,0.55)" }}>
      <div className="m-auto w-full max-w-[460px] rounded-[22px] p-5 text-left max-[600px]:p-4" style={{ background: MM.surface, color: MM.text, boxShadow: MM.shadow, border: `1px solid ${MM.border}` }}>
        <div className="text-[40px] font-black italic leading-none max-[600px]:text-[32px]" style={{ color }}>
          {title}
        </div>
        <div className="mt-1.5 text-[14px] font-semibold">{how}</div>
        <div className="mt-3 grid grid-cols-3 gap-2 text-center text-[12px]" style={{ color: MM.muted }}>
          <div className="rounded-[12px] p-2" style={{ background: MM.card }}>
            <div className="text-[18px] font-black tabular-nums" style={{ color: MM.text }}>
              {row.landed}/{row.thrown}
            </div>
            {t("boxeStatLanded", "golpes certos")}
          </div>
          <div className="rounded-[12px] p-2" style={{ background: MM.card }}>
            <div className="text-[18px] font-black tabular-nums" style={{ color: MM.text }}>
              {row.kd}
            </div>
            {t("boxeStatKd", "vezes no chão")}
          </div>
          <div className="rounded-[12px] p-2" style={{ background: MM.card }}>
            <div className="text-[18px] font-black tabular-nums" style={{ color: MM.text }}>
              {Math.round(row.taken)}
            </div>
            {t("boxeStatTaken", "dano levado")}
          </div>
        </div>

        <div className="mt-4 text-[12px] font-bold uppercase tracking-[0.14em]" style={{ color: MM.muted }}>
          {t("boxeLifeTitle", "Na vida do seu hóspede")}
        </div>
        {!a ? (
          <p className="mt-1.5 text-[13px]" style={{ color: MM.muted }}>
            {t("boxeLifeNone", "Nada mudou (a vida não estava disponível).")}
          </p>
        ) : (
          <>
            <div className="mt-1.5 grid grid-cols-2 gap-x-4 gap-y-1 text-[13.5px]">
              {lines.map((l) => (
                <div key={l.label} className="flex justify-between gap-2">
                  <span style={{ color: MM.muted }}>{l.label}</span>
                  <span className="font-bold tabular-nums" style={{ color: l.good ? "#7CF0AE" : "#FF8A99" }}>
                    {sign(l.v)}
                  </span>
                </div>
              ))}
            </div>
            {a.coins > 0 && (
              <p className="mt-2 flex items-center gap-1.5 text-[14px] font-bold" style={{ color: GOLD }}>
                <Zap className="h-4 w-4" /> {t("boxeLifeCoins", "Bolsa: +{n} moedas").replace("{n}", String(a.coins))}
              </p>
            )}
            {a.injuryH > 0 && (
              <p className="mt-2 rounded-[12px] px-3 py-2 text-[13px]" style={{ background: "rgba(255,90,110,0.12)", color: "#FF8A99" }}>
                {t("boxeLifeInjury", "Lesionado por {h} h: sem lutar e a saúde volta pela metade.").replace("{h}", String(a.injuryH))}
              </p>
            )}
            {a.hospital && (
              <p className="mt-2 rounded-[12px] px-3 py-2 text-[13px] font-bold" style={{ background: "rgba(255,90,110,0.18)", color: MM.danger }}>
                {t("boxeLifeHospital", "Ele saiu da arena de ambulância: está internado no hospital.")}
              </p>
            )}
          </>
        )}
        <div className="mt-4 grid grid-cols-2 gap-2">
          <button type="button" onClick={onMenu} disabled={!!a?.hospital} className="rounded-[14px] px-3 py-3 text-[15px] font-bold" style={a?.hospital ? { background: MM.card, color: MM.disabledText, border: `1px solid ${MM.border}` } : { background: MM.rubyFill, border: `1px solid ${MM.rubyBorder}`, color: "#fff" }}>
            {t("boxeAgain", "Outra luta")}
          </button>
          <button type="button" onClick={onExit} className="rounded-[14px] px-3 py-3 text-[15px] font-bold" style={{ background: MM.card, border: `1px solid ${MM.border}` }}>
            {t("boxeLeave", "Voltar ao centro")}
          </button>
        </div>
      </div>
    </div>
  )
}
