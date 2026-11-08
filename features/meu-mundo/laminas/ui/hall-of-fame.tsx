"use client"

// features/meu-mundo/laminas/ui/hall-of-fame.tsx — o HALL DA FAMA da Arena das Lâminas
// (2026-11-08, pedido do Alex). A Arena abre aqui: um PÓDIO com o top 3 renderizado no palco
// antigo do vestuário (SkinStage no coliseu), um por vez, com setas para o lado; ao lado, o
// painel do 4º ao 10º. Dá para desafiar qualquer um, até o 1º, mesmo com pouco Poder — a ficha
// congelada dele luta por ele (B8, re-simulado no servidor). Cadeira vazia aparece preenchida
// pelo próximo do top do Poder: vencer essa pessoa dá aquela cadeira (mig 425). Sem ninguém =
// vaga (holograma no pódio). A regra mora no servidor (MeuMundoHallService): aqui só se mostra
// e se pede o ticket.

import { useCallback, useEffect, useRef, useState } from "react"
import { ChevronLeft, ChevronRight, Crown, Loader2, RefreshCw, Shield, Swords, X } from "lucide-react"
import { getToken } from "@/lib/auth"
import { useLocale, useTranslations } from "@/components/i18n/I18nProvider"
import { getHallBoard, postHallChallenge, type FightTicket, type HallBoard, type HallRank } from "../../data"
import { SkinStage } from "../../engine/skin-stage"
import { MM } from "../../ui/hud/tokens"
import { EvoButton } from "../../ui/hud/hud-kit"
import { archivo, teko } from "../../ui/status/evo-skin"
import { faceOf } from "../../ui/portraits"

type Tr = (key: string, fallback: string) => string

const STAGE_IMG = "/meu-mundo/skins/v1/coliseu.webp"
const STAGE_SMALL = "/meu-mundo/skins/v1/coliseu-1024.webp"
/** Ouro, prata e bronze do pódio. */
const MEDAL = ["#F2B705", "#C9D1DA", "#C98A45"] as const

export function HallOfFame({ onExit, onTrain, onFight }: { onExit: () => void; onTrain: () => void; onFight: (ticket: FightTicket, foe: string) => void }) {
  const t = useTranslations("MeuMundo") as Tr
  const locale = useLocale()
  const [board, setBoard] = useState<HallBoard | null>(null)
  const [error, setError] = useState(false)
  const [busy, setBusy] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [idx, setIdx] = useState(0)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const stageRef = useRef<SkinStage | null>(null)

  const load = useCallback(async () => {
    const token = getToken()
    if (!token) return
    setError(false)
    const r = await getHallBoard(token)
    if (r.ok) setBoard(r.data)
    else setError(true)
  }, [])
  useEffect(() => {
    void load()
  }, [load])

  // o palco (motor próprio; sair da tela descarta tudo)
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const reduced = typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
    const stage = new SkinStage(canvas, reduced)
    stageRef.current = stage
    return () => {
      stageRef.current = null
      stage.dispose()
    }
  }, [])

  const podium = board ? board.top.slice(0, 3) : []
  const cur: HallRank | undefined = podium[idx]
  const curBody = cur?.person?.body ?? "normal"
  const curEmpty = !!cur && !cur.person
  useEffect(() => {
    if (!cur) return
    const c = MEDAL[idx] ?? MEDAL[0]
    void stageRef.current?.show({ body: curBody, holo: curEmpty, color: c, accent: "#FFFFFF", look: "" }).catch(() => {})
  }, [cur, curBody, curEmpty, idx])

  const go = useCallback((d: number) => setIdx((i) => (i + d + 3) % 3), [])
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") go(-1)
      else if (e.key === "ArrowRight") go(1)
      else if (e.key === "Escape") onExit()
    }
    window.addEventListener("keydown", key)
    return () => window.removeEventListener("keydown", key)
  }, [go, onExit])

  const challenge = async (r: HallRank) => {
    const p = r.person
    const token = getToken()
    if (!p || !token || busy) return
    setBusy(p.id)
    setNotice(null)
    const res = await postHallChallenge(token, p.id)
    setBusy(null)
    if (!res.ok) {
      setNotice(res.error)
      void load()
      return
    }
    onFight(res.data.fight, p.name)
  }

  const fmt = (n: number) => Math.round(n).toLocaleString(locale)
  const left = board?.me.left ?? 0
  const can = (r: HallRank) => !!r.person && !r.person.isMe && !r.person.cooldown && left > 0 && (board?.me.power ?? 0) > 0
  const myPos = board?.top.find((r) => r.person?.isMe)?.pos ?? null

  const challengeButton = (r: HallRank, size: "sm" | "md") =>
    r.person && !r.person.isMe ? (
      <EvoButton
        variant="gold"
        size={size}
        icon={busy === r.person.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Swords className="h-4 w-4" />}
        disabled={!can(r) || !!busy}
        onClick={() => void challenge(r)}
      >
        {r.person.cooldown ? t("hlCooldown", "Amanhã") : t("hlChallenge", "Desafiar")}
      </EvoButton>
    ) : null

  return (
    <div className={`${archivo.className} absolute inset-0 select-none overflow-hidden bg-black`}>
      {/* palco: o coliseu + o personagem do pódio (canvas transparente por cima) */}
      {/* eslint-disable-next-line @next/next/no-img-element -- arte local do jogo (admin) */}
      <img src={STAGE_IMG} srcSet={`${STAGE_SMALL} 1024w, ${STAGE_IMG} 1672w`} sizes="100vw" alt="" draggable={false} className="pointer-events-none absolute inset-0 h-full w-full object-cover" />
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full touch-none" style={{ cursor: "grab" }} aria-label={cur?.person?.name ?? t("hfTitle", "Hall da Fama")} />

      {/* topo: título, treinar e sair */}
      <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-3 px-4" style={{ paddingTop: "max(14px, env(safe-area-inset-top))" }}>
        <div style={{ textShadow: "0 2px 8px rgba(0,0,0,0.6)" }}>
          <div className="text-[11px] font-bold uppercase tracking-[0.2em] max-[759px]:hidden" style={{ color: MM.gold }}>
            {t("hfKicker", "Arena das Lâminas · Os Jogos Eternos de Lúmen")}
          </div>
          <h1 className={`${teko.className} whitespace-nowrap text-[46px] font-bold uppercase leading-none tracking-[0.08em] max-[759px]:text-[28px]`} style={{ color: MM.text }}>
            {t("hfTitle", "Hall da Fama")}
          </h1>
        </div>
        <div className="pointer-events-auto flex shrink-0 items-center gap-2">
          <EvoButton variant="gold" size="sm" icon={<Swords className="h-4 w-4" />} onClick={onTrain} aria-label={t("hfTrain", "Treinar")}>
            <span className="max-[759px]:hidden">{t("hfTrain", "Treinar")}</span>
          </EvoButton>
          <button type="button" aria-label={t("laminasLeave", "Voltar ao centro")} onClick={onExit} className="grid h-10 w-10 place-items-center rounded-full" style={{ background: MM.surface, border: `1px solid ${MM.border}`, color: MM.text }}>
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      {error ? (
        <div className="absolute inset-0 grid place-items-center">
          <div className="flex flex-col items-center gap-3 p-5 text-center" style={{ background: MM.surface, border: `1px solid ${MM.border}`, color: MM.muted }} role="alert">
            {t("hlLoadFail", "Não carregou o Hall.")}
            <EvoButton variant="gold" size="sm" icon={<RefreshCw className="h-4 w-4" />} onClick={() => void load()}>
              {t("ibRetry", "Tentar de novo")}
            </EvoButton>
          </div>
        </div>
      ) : !board ? (
        <div className="absolute inset-0 grid place-items-center" style={{ color: MM.text }}>
          <Loader2 className="h-7 w-7 animate-spin" aria-label={t("gearLoading", "Carregando…")} />
        </div>
      ) : (
        <>
          {/* setas do pódio (1º, 2º, 3º) */}
          {/* (a faixa do palco: no PC termina antes do painel, então a seta da direita não some atrás dele) */}
          <div className="pointer-events-none absolute inset-y-0 left-0 right-0 min-[760px]:right-[380px]">
            {(["prev", "next"] as const).map((dir) => (
              <button
                key={dir}
                type="button"
                onClick={() => go(dir === "prev" ? -1 : 1)}
                aria-label={dir === "prev" ? t("hfPrev", "Lugar anterior") : t("hfNext", "Próximo lugar")}
                className={`pointer-events-auto absolute top-[42%] flex h-14 w-14 -translate-y-1/2 items-center justify-center rounded-full max-[759px]:top-[38%] max-[759px]:h-11 max-[759px]:w-11 ${dir === "prev" ? "left-3 sm:left-6" : "right-3 sm:right-6"}`}
                style={{ color: MM.text, background: MM.surface, border: `1px solid ${MM.border}`, boxShadow: MM.shadow }}
              >
                {dir === "prev" ? <ChevronLeft className="h-7 w-7 max-[759px]:h-6 max-[759px]:w-6" /> : <ChevronRight className="h-7 w-7 max-[759px]:h-6 max-[759px]:w-6" />}
              </button>
            ))}
          </div>

          {/* a placa do pódio: lugar, nome, Poder e Desafiar */}
          {cur && (
            <div className="absolute bottom-0 left-0 right-0 flex justify-center px-3 pb-[max(14px,env(safe-area-inset-bottom))] min-[760px]:right-[380px] max-[759px]:bottom-auto max-[759px]:top-[60px] max-[759px]:pb-0">
              <div className="flex w-full max-w-[520px] items-center gap-4 p-4 max-[759px]:gap-3 max-[759px]:p-2.5" style={{ background: MM.surface, border: `1px solid ${MEDAL[idx]}`, boxShadow: MM.shadow }}>
                <div className={`${teko.className} flex shrink-0 flex-col items-center leading-none`} style={{ color: MEDAL[idx] }}>
                  <Crown className="h-6 w-6 max-[759px]:h-5 max-[759px]:w-5" aria-hidden />
                  <span className="text-[54px] font-bold max-[759px]:text-[38px]">{cur.pos}º</span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className={`${teko.className} truncate text-[36px] font-bold uppercase leading-none max-[759px]:text-[24px]`} style={{ color: MM.text }}>
                    {cur.person ? cur.person.name : t("hfEmpty", "Vaga")}
                    {cur.person?.isMe ? <span style={{ color: MM.gold }}> · {t("rkYou", "Você")}</span> : null}
                  </div>
                  <div className="mt-1 text-[13px] max-[759px]:text-[12px]" style={{ color: MM.muted }}>
                    {cur.person
                      ? [
                          t("hlPower", "Poder {n}").replace("{n}", fmt(cur.person.power)),
                          cur.person.defenses === 1 ? t("hlDefense1", "1 defesa") : cur.person.defenses ? t("hlDefenses", "{n} defesas").replace("{n}", String(cur.person.defenses)) : null,
                          cur.seated ? null : t("hfFromPower", "pelo Poder · vença e a cadeira é sua"),
                        ]
                          .filter(Boolean)
                          .join(" · ")
                      : t("hfEmptyHint", "Ninguém aqui ainda")}
                  </div>
                  <div className="mt-2 flex items-center gap-1.5">
                    {[0, 1, 2].map((i) => (
                      <button key={i} type="button" aria-label={`${i + 1}º`} onClick={() => setIdx(i)} className="block" style={{ width: i === idx ? 26 : 8, height: 8, borderRadius: 999, background: i === idx ? MEDAL[i] : "rgba(243,239,230,0.35)" }} />
                    ))}
                  </div>
                </div>
                <div className="shrink-0">{challengeButton(cur, "md")}</div>
              </div>
            </div>
          )}

          {/* o painel do 4º ao 10º */}
          <aside
            className="absolute flex flex-col gap-2 p-3 min-[760px]:bottom-4 min-[760px]:right-4 min-[760px]:top-[88px] min-[760px]:w-[360px] max-[759px]:inset-x-0 max-[759px]:bottom-0 max-[759px]:h-[36vh]"
            style={{ background: MM.surface, border: `1px solid ${MM.border}`, boxShadow: MM.shadow, color: MM.text }}
            aria-label={t("hfTop", "Top 10")}
          >
            <div className="flex items-center justify-between gap-2">
              <h2 className={`${teko.className} text-[24px] uppercase leading-none tracking-wide`} style={{ color: MM.gold }}>
                {t("hfTop", "Top 10")}
              </h2>
              <span className="px-2 py-1 text-[11px] font-semibold" style={{ background: MM.card, border: `1px solid ${left ? MM.border : MM.rubyBorder}` }}>
                {t("hlLeft", "Desafios hoje: {n} de {max}").replace("{n}", String(left)).replace("{max}", String(board.me.perDay))}
              </span>
            </div>
            <p className="text-[12px] leading-snug" style={{ color: MM.muted }}>
              {myPos ? t("hfMyPos", "Você está em {n}º").replace("{n}", String(myPos)) : t("hfAnyone", "Desafie qualquer um, até o 1º. A ficha dele luta por ele; vencendo, você fica com o lugar.")}
            </p>
            {notice && (
              <p role="status" className="text-[12px]" style={{ color: MM.gold }}>
                {notice}
              </p>
            )}
            <ol className="grid min-h-0 flex-1 auto-rows-min gap-1.5 overflow-y-auto pr-0.5">
              {board.top.slice(3).map((r) => (
                <li key={r.pos} className="flex min-h-12 items-center gap-2.5 px-2.5 py-1.5" style={{ background: r.person?.isMe ? MM.rubySoft : MM.card, border: `1px ${r.person ? "solid" : "dashed"} ${r.person?.isMe ? MM.rubyBorder : MM.border}` }}>
                  <span className={`${teko.className} w-8 shrink-0 text-center text-[24px] leading-none tabular-nums`} style={{ color: MM.gold }}>
                    {r.pos}
                  </span>
                  {r.person ? (
                    // eslint-disable-next-line @next/next/no-img-element -- retrato local em lista (regra 4: <img> lazy)
                    <img src={faceOf(r.person.body)} alt="" loading="lazy" decoding="async" draggable={false} className="h-9 w-9 shrink-0 rounded-full object-cover" style={{ background: "rgba(0,0,0,0.35)" }} />
                  ) : (
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full" style={{ background: "rgba(0,0,0,0.35)", color: MM.muted }} aria-hidden>
                      <Shield className="h-4 w-4" />
                    </span>
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[14px] font-semibold">
                      {r.person ? r.person.name : t("hfEmpty", "Vaga")}
                      {r.person?.isMe ? <span style={{ color: MM.gold }}> · {t("rkYou", "Você")}</span> : null}
                    </span>
                    <span className="block text-[11px]" style={{ color: MM.muted }}>
                      {r.person ? t("hlPower", "Poder {n}").replace("{n}", fmt(r.person.power)) : t("hfEmptyHint", "Ninguém aqui ainda")}
                    </span>
                  </span>
                  {challengeButton(r, "sm")}
                </li>
              ))}
            </ol>
          </aside>
        </>
      )}
    </div>
  )
}
