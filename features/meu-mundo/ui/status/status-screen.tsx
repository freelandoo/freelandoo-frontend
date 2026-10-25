"use client"

// features/meu-mundo/ui/status/status-screen.tsx — a tela de STATUS do
// hóspede (mm3d-13): SEIS MODAIS GRANDES NUMA PRATELEIRA CIRCULAR, a "gaveta
// rolante" do STATUS do EVO Brazil/Cat demon (pedido do Alex, 20/10/2026).
//
// A geometria é a de Cat demon/jogo/ui/evo/status/geometria_status.gd: UM
// cursor contínuo; cada modal tem a distância relativa a ele e, por ela, uma
// posição interpolada entre CHAVES (frente; um de cada lado girando para trás;
// atrás escondido). A perspectiva é a do CSS (perspective = FOCO do jogo).
// Por quadro só mudam `transform` e `opacity` (escritos direto no DOM, sem
// re-render) — nada de animar filtro ou camada do tamanho da janela.
//
// Navegar: setas, A/D, Q/E, 1–6, roda, arrasto ou clique no modal de lado.
// ESC/VOLTAR fecha, e tocar fora dos modais também. Celular (tela estreita):
// um card por vez em tela cheia, deslizar para trocar.

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { ChevronLeft, ChevronRight, X } from "lucide-react"
import { getToken } from "@/lib/auth"
import { useTranslations } from "@/components/i18n/I18nProvider"
import { getLife, postLifeActivity, postLifeBuy, postLifeNewcomer } from "../../data"
import type { BodyId, LifeFull } from "../../types"
import { EVO, archivo, chamfer, teko } from "./evo-skin"
import { PAGES, StatusPage, type PageActions } from "./status-pages"
import SkinWardrobe from "./skin-wardrobe"
import { PORTRAIT } from "../portraits"

const N = PAGES.length
const W = 1460
const H = 870
const FOCO = 1500
const PX_POR_MODAL = 520
const DURA_TROCA = 550
const DURA_ENTRADA = 600
const DURA_SAIDA = 320
// geometria_status.gd — por distância do centro (0, 1, 2).
const CHAVES = [
  { x: 0, z: 0, giro: 0, alfa: 1, escuro: 0 },
  { x: 1120, z: 820, giro: 48, alfa: 0.95, escuro: 0.5 },
  { x: 0, z: 1900, giro: 90, alfa: 0, escuro: 0.85 },
]

/** Distância do modal `i` ao cursor, no círculo (−N/2 … +N/2). */
function relativo(i: number, cursor: number) {
  let r = (((i - cursor) % N) + N) % N
  if (r > N / 2) r -= N
  return r
}

function estado(r: number) {
  const a = Math.abs(r)
  const lado = r >= 0 ? 1 : -1
  const i = Math.min(Math.floor(a), CHAVES.length - 2)
  const f = Math.max(0, Math.min(1, a - i))
  const c0 = CHAVES[i]
  const c1 = CHAVES[i + 1]
  const lerp = (k: keyof (typeof CHAVES)[number]) => c0[k] + (c1[k] - c0[k]) * f
  return {
    x: lerp("x") * lado,
    z: lerp("z"),
    giro: lerp("giro") * lado,
    alfa: lerp("alfa"),
    escuro: lerp("escuro"),
    aceso: Math.max(0, Math.min(1, 1 - a * 1.8)),
  }
}

const easeOutQuart = (x: number) => 1 - Math.pow(1 - x, 4)
const easeOutCubic = (x: number) => 1 - Math.pow(1 - x, 3)
const easeInCubic = (x: number) => x * x * x

export interface StatusScreenProps {
  name: string
  body: BodyId
  onClose: () => void
  /** Sobe quando a sala avisa que a vida mudou (mensagem "life"). */
  lifeTick?: number
}

export default function StatusScreen({ name, body, onClose, lifeTick = 0 }: StatusScreenProps) {
  const t = useTranslations("MeuMundo")
  const [life, setLife] = useState<LifeFull | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [sel, setSel] = useState(0)
  const [compact, setCompact] = useState(false)
  const [scale, setScale] = useState(0.6)
  // Vestuário (mm3d-16) por cima do STATUS; o retrato segue o que está vestido.
  const [wardrobe, setWardrobe] = useState(false)
  const wardrobeOpen = useRef(false)
  useEffect(() => {
    wardrobeOpen.current = wardrobe
  }, [wardrobe])
  const [avatar, setAvatar] = useState<BodyId>(body)

  // ── dados ────────────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    const token = getToken()
    if (!token) return
    const r = await getLife(token)
    if (r.ok) {
      setLife(r.data)
      if (r.data.avatar) setAvatar(r.data.avatar)
      setError(null)
    } else setError(r.error)
  }, [])
  useEffect(() => {
    void load()
  }, [load])
  const lastTick = useRef(0)
  useEffect(() => {
    if (!lifeTick) return
    const now = Date.now()
    if (now - lastTick.current < 5000) return
    lastTick.current = now
    void load()
  }, [lifeTick, load])

  const say = useCallback((msg: string) => {
    setNotice(msg)
    window.setTimeout(() => setNotice(null), 2800)
  }, [])
  const run = useCallback(
    async (fn: (token: string) => Promise<{ ok: boolean; error?: string }>, done?: string) => {
      const token = getToken()
      if (!token || busy) return
      setBusy(true)
      const r = await fn(token)
      if (!r.ok) say(r.error || t("stActionFail", "Não deu certo agora"))
      else if (done) say(done)
      await load()
      setBusy(false)
    },
    [busy, load, say, t],
  )
  const act: PageActions = useMemo(
    () => ({
      busy,
      activity: (kind, hours) => void run((tk) => postLifeActivity(tk, kind, hours)),
      buy: (item) => void run((tk) => postLifeBuy(tk, item), t("mkStored", "Guardado na geladeira")),
      newcomer: () => void run((tk) => postLifeNewcomer(tk)),
      openSkins: () => setWardrobe(true),
    }),
    [busy, run, t],
  )

  // ── tamanho: carrossel no computador, card único no celular ─────────────
  useEffect(() => {
    const fit = () => {
      const w = window.innerWidth
      const h = window.innerHeight
      setCompact(w < 980 || h < 560)
      // Como no EVO: o da frente ocupa ~88% da largura e os vizinhos aparecem dos lados.
      setScale(Math.min(w / (W + 760), (h - 190) / (H + 60)))
    }
    fit()
    window.addEventListener("resize", fit)
    return () => window.removeEventListener("resize", fit)
  }, [])

  // ── cursor, entrada e saída (por quadro, direto no DOM) ─────────────────
  const modalRefs = useRef<(HTMLDivElement | null)[]>([])
  const glowRefs = useRef<(HTMLDivElement | null)[]>([])
  const dimRefs = useRef<(HTMLDivElement | null)[]>([])
  const cursor = useRef(0)
  const alvo = useRef(0)
  const tween = useRef<{ from: number; to: number; t0: number; dur: number } | null>(null)
  const entrada = useRef<number[]>(Array(N).fill(0))
  const entradaAnim = useRef<{ from: number[]; to: number; t0: number; dur: number; delay: number[]; ease: (x: number) => number } | null>(null)
  const closing = useRef(false)
  const aceita = useRef(false)

  const paint = useCallback(() => {
    for (let i = 0; i < N; i++) {
      const el = modalRefs.current[i]
      if (!el) continue
      const e = estado(relativo(i, cursor.current))
      const en = entrada.current[i]
      const z = e.z + (1 - en) * 1100
      const y = (1 - en) * 90
      const alfa = e.alfa * Math.max(0, Math.min(1, en * 1.4))
      el.style.transform = `translate3d(${e.x}px, ${y}px, ${-z}px) rotateY(${e.giro}deg)`
      el.style.opacity = String(alfa)
      el.style.visibility = alfa > 0.003 ? "visible" : "hidden"
      el.style.zIndex = String(1000 - Math.round(z))
      el.style.pointerEvents = alfa > 0.2 ? "auto" : "none"
      const g = glowRefs.current[i]
      if (g) g.style.opacity = String(e.aceso * (aceita.current ? 1 : en))
      const d = dimRefs.current[i]
      if (d) d.style.opacity = String(e.escuro)
    }
  }, [])

  useEffect(() => {
    let raf = 0
    const loop = (now: number) => {
      const tw = tween.current
      if (tw) {
        const k = Math.min(1, (now - tw.t0) / tw.dur)
        cursor.current = tw.from + (tw.to - tw.from) * easeOutQuart(k)
        if (k >= 1) tween.current = null
      }
      const ea = entradaAnim.current
      if (ea) {
        let done = true
        for (let i = 0; i < N; i++) {
          const k = Math.max(0, Math.min(1, (now - ea.t0 - ea.delay[i]) / ea.dur))
          if (k < 1) done = false
          entrada.current[i] = ea.from[i] + (ea.to - ea.from[i]) * ea.ease(k)
        }
        if (done) {
          entradaAnim.current = null
          if (ea.to === 1) aceita.current = true
        }
      }
      paint()
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [paint])

  // Entrada: do mais perto da frente para o mais longe, 80 ms entre um e outro.
  useEffect(() => {
    const ordem = [...Array(N).keys()].sort((a, b) => Math.abs(relativo(a, 0)) - Math.abs(relativo(b, 0)))
    const delay = Array(N).fill(0)
    ordem.forEach((i, k) => (delay[i] = k * 80))
    entradaAnim.current = { from: Array(N).fill(0), to: 1, t0: performance.now(), dur: DURA_ENTRADA, delay, ease: easeOutCubic }
  }, [])

  const close = useCallback(() => {
    if (closing.current) return
    closing.current = true
    aceita.current = false
    entradaAnim.current = { from: [...entrada.current], to: 0, t0: performance.now(), dur: DURA_SAIDA, delay: Array(N).fill(0), ease: easeInCubic }
    window.setTimeout(onClose, compact ? 0 : DURA_SAIDA + 40)
  }, [onClose, compact])

  const animateTo = useCallback((to: number) => {
    const dist = Math.abs(to - cursor.current)
    const dur = Math.max(DURA_TROCA * 0.7, Math.min(1000, DURA_TROCA + 100 * (dist - 1)))
    tween.current = { from: cursor.current, to, t0: performance.now(), dur }
    alvo.current = to
    setSel((((Math.round(to) % N) + N) % N))
  }, [])
  const go = useCallback((passos: number) => animateTo(Math.round(alvo.current) + passos), [animateTo])
  const goTo = useCallback(
    (i: number) => {
      const a = Math.round(alvo.current)
      let d = (((i - a) % N) + N) % N
      if (d > N / 2) d -= N
      if (d) animateTo(a + d)
    },
    [animateTo],
  )

  // ── teclado e roda ───────────────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Com o vestuário aberto, as teclas são dele.
      if (wardrobeOpen.current) return
      const k = e.key
      let handled = true
      if (k === "Escape") close()
      else if (k === "ArrowLeft" || k === "a" || k === "A" || k === "q" || k === "Q") go(-1)
      else if (k === "ArrowRight" || k === "d" || k === "D" || k === "e" || k === "E" || k === "Tab") go(1)
      else if (/^[1-6]$/.test(k)) goTo(Number(k) - 1)
      else handled = false
      if (handled) {
        e.preventDefault()
        e.stopPropagation()
      }
    }
    window.addEventListener("keydown", onKey, true)
    return () => window.removeEventListener("keydown", onKey, true)
  }, [close, go, goTo])
  const lastWheel = useRef(0)
  const onWheel = (e: React.WheelEvent) => {
    if (compact) return
    const now = performance.now()
    if (now - lastWheel.current < 180) return
    lastWheel.current = now
    go(e.deltaY < 0 && Math.abs(e.deltaY) >= Math.abs(e.deltaX) ? -1 : e.deltaY > 0 || e.deltaX > 0 ? 1 : -1)
  }

  // ── arrasto (computador: gira a prateleira; celular: troca o card) ──────
  const drag = useRef<{ x: number; c: number; moved: boolean; id: number } | null>(null)
  // Soltar um arrasto em cima do fundo não conta como "tocar fora".
  const draggedAt = useRef(0)
  const onPointerDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest("button")) return
    drag.current = { x: e.clientX, c: cursor.current, moved: false, id: e.pointerId }
  }
  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current
    if (!d || d.id !== e.pointerId) return
    const dx = e.clientX - d.x
    if (Math.abs(dx) > 8) d.moved = true
    if (d.moved && !compact) {
      tween.current = null
      cursor.current = d.c - dx / (PX_POR_MODAL * scale)
      alvo.current = cursor.current
    }
  }
  const onPointerUp = (e: React.PointerEvent) => {
    const d = drag.current
    drag.current = null
    if (!d || !d.moved) return
    draggedAt.current = performance.now()
    const dx = e.clientX - d.x
    if (compact) {
      if (Math.abs(dx) > 60) go(dx < 0 ? 1 : -1)
      return
    }
    const moved = cursor.current - d.c
    animateTo(Math.round(cursor.current + Math.sign(moved) * 0.18))
  }

  const portrait = PORTRAIT[avatar] ?? PORTRAIT.normal
  // Irmão (não filho) das telas: arrastar no palco não troca o card do STATUS.
  const skins = wardrobe && (
    <SkinWardrobe
      t={t}
      onClose={() => setWardrobe(false)}
      onChanged={(r) => {
        if (r.avatar) setAvatar(r.avatar)
        setLife((l) => (l ? { ...l, wallet: r.wallet, character: r.character } : l))
      }}
    />
  )
  const frameFill = "linear-gradient(160deg, #1b0711 0%, #0d070b 50%, #14060e 100%)"

  // ── estados de espera ────────────────────────────────────────────────────
  const shell = (children: React.ReactNode) => (
    <div className={`${archivo.className} fixed inset-0 z-[80] flex items-center justify-center bg-black/55`} onClick={close}>
      {children}
    </div>
  )
  if (!life) {
    return shell(
      <div className={`${teko.className} text-[34px] uppercase tracking-[0.3em]`} style={{ color: EVO.douradoClaro }}>
        {error ? t("stLoadFail", "Não carregou o status") : t("stLoading", "Carregando…")}
      </div>,
    )
  }

  // ── celular: um card por vez ─────────────────────────────────────────────
  // A página cabe na tela (sem rolagem, como no computador); a moldura é
  // levemente translúcida (alfa no fundo, nunca backdrop-filter).
  if (compact) {
    const page = PAGES[sel]
    const compactFill = "linear-gradient(160deg, rgba(27,7,17,0.86) 0%, rgba(13,7,11,0.86) 50%, rgba(20,6,14,0.86) 100%)"
    return (
      <>
      <div
        className={`${archivo.className} fixed inset-0 z-[80] flex flex-col bg-black/45`}
        style={{ paddingTop: "max(8px, env(safe-area-inset-top))", paddingBottom: "max(6px, env(safe-area-inset-bottom))" }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
      >
        <div className="relative mx-2 min-h-0 flex-1" style={{ clipPath: chamfer(18), background: EVO.magenta, padding: 2 }}>
          <div className="h-full overflow-hidden p-2.5" style={{ clipPath: chamfer(17), background: compactFill }}>
            <StatusPage page={page} life={life} name={name} portrait={portrait} compact t={t} act={act} />
          </div>
        </div>
        {/* rodapé numa linha de 40 px: ‹ pontos › e fechar (o nome da página está no cabeçalho) */}
        <div className="mx-2 mt-1.5 flex h-10 shrink-0 items-center gap-1">
          <button type="button" onClick={() => go(-1)} aria-label={t("stPrev", "Tela anterior")} className="flex h-9 w-9 shrink-0 items-center justify-center" style={{ color: EVO.magenta }}>
            <ChevronLeft className="h-6 w-6" />
          </button>
          <div className="flex min-w-0 flex-1 items-center justify-center gap-2">
            <Dots sel={sel} onPick={goTo} small />
            <span className={`${teko.className} shrink-0 text-[14px] leading-none tracking-wider`} style={{ color: EVO.mudo }}>
              {sel + 1}/{N}
            </span>
          </div>
          <button type="button" onClick={() => go(1)} aria-label={t("stNext", "Próxima tela")} className="flex h-9 w-9 shrink-0 items-center justify-center" style={{ color: EVO.magenta }}>
            <ChevronRight className="h-6 w-6" />
          </button>
          <BackButton onClick={close} t={t} icon />
        </div>
        {notice && <Notice text={notice} small />}
      </div>
      {skins}
      </>
    )
  }

  // ── computador: a prateleira circular ────────────────────────────────────
  // Só o da frente e os dois de lado desenham o conteúdo (o de trás é invisível).
  const rel = (i: number) => Math.abs(relativo(i, sel))
  return (
    <>
    <div
      className={`${archivo.className} fixed inset-0 z-[80] select-none overflow-hidden`}
      style={{ background: "radial-gradient(ellipse at 50% 55%, rgba(8,7,11,0.35), rgba(8,7,11,0.78))" }}
      onClick={(e) => {
        if (e.target === e.currentTarget && performance.now() - draggedAt.current > 250) close()
      }}
      onWheel={onWheel}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
    >
      <div className="pointer-events-none absolute left-1/2 top-1/2" style={{ width: 0, height: 0, transform: `translateY(-30px) scale(${scale})` }}>
        <div className="absolute" style={{ perspective: `${FOCO}px`, perspectiveOrigin: "0px -120px", left: 0, top: 0 }}>
          {PAGES.map((page, i) => (
            <div
              key={page}
              ref={(el) => {
                modalRefs.current[i] = el
              }}
              className="pointer-events-auto absolute"
              style={{ width: W, height: H, left: -W / 2, top: -H / 2, willChange: "transform, opacity", visibility: "hidden" }}
              onClick={(e) => {
                e.stopPropagation()
                if (i !== sel && performance.now() - draggedAt.current > 250) goTo(i)
              }}
            >
              {/* neon da frente: camada estática, só a opacidade anima */}
              <div
                ref={(el) => {
                  glowRefs.current[i] = el
                }}
                className="pointer-events-none absolute -inset-4"
                style={{ opacity: 0 }}
              >
                <svg width={W + 32} height={H + 32} className="absolute inset-0" style={{ filter: "blur(14px)" }}>
                  <polygon points={chamferPoints(16, 16, W, H, 40)} fill="none" stroke={EVO.magenta} strokeWidth={14} />
                </svg>
                <svg width={W + 32} height={H + 32} className="absolute inset-0">
                  <polygon points={chamferPoints(16, 16, W, H, 40)} fill="none" stroke={EVO.rosaClaro} strokeWidth={3} />
                </svg>
              </div>
              <div className="absolute inset-0" style={{ clipPath: chamfer(40), background: `linear-gradient(135deg, ${EVO.magenta}, ${EVO.ritual} 55%, ${EVO.magenta})`, padding: 4 }}>
                <div className="relative h-full w-full overflow-hidden" style={{ clipPath: chamfer(37), background: frameFill }}>
                  {/* pinceladas magenta atrás do título, como no anexo */}
                  <div
                    className="pointer-events-none absolute left-[22%] top-6 h-28 w-[46%]"
                    style={{
                      background: `repeating-linear-gradient(-8deg, transparent 0 14px, ${EVO.magenta}22 14px 17px, transparent 17px 30px)`,
                      transform: "skewX(-20deg)",
                    }}
                  />
                  <div className="relative h-full px-9 pb-7 pt-6">
                    {rel(i) <= 1 && <StatusPage page={page} life={life} name={name} portrait={portrait} compact={false} t={t} act={act} />}
                  </div>
                  <div
                    ref={(el) => {
                      dimRefs.current[i] = el
                    }}
                    className="pointer-events-none absolute inset-0 bg-black"
                    style={{ opacity: 0 }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
        {/* setas, rodapé, pontos e VOLTAR — no plano da tela, fora da perspectiva */}
        <button
          type="button"
          onClick={() => go(-1)}
          aria-label={t("stPrev", "Tela anterior")}
          className="pointer-events-auto absolute flex items-center justify-center"
          style={{ left: -W / 2 - 130, top: -60, width: 110, height: 120, color: EVO.magenta, filter: `drop-shadow(0 0 12px ${EVO.magenta})` }}
        >
          <ChevronLeft className="h-28 w-28" strokeWidth={2.4} />
        </button>
        <button
          type="button"
          onClick={() => go(1)}
          aria-label={t("stNext", "Próxima tela")}
          className="pointer-events-auto absolute flex items-center justify-center"
          style={{ left: W / 2 + 20, top: -60, width: 110, height: 120, color: EVO.magenta, filter: `drop-shadow(0 0 12px ${EVO.magenta})` }}
        >
          <ChevronRight className="h-28 w-28" strokeWidth={2.4} />
        </button>
        <div
          className={`${teko.className} absolute whitespace-nowrap text-[24px] uppercase tracking-[0.12em]`}
          style={{ left: -W / 2, top: H / 2 + 18, color: `${EVO.branco}b3` }}
        >
          ◀ ▶ {t("stHintSwap", "Trocar tela")} &nbsp;&nbsp; 1 – 6 {t("stHintDirect", "Ir direto")} &nbsp;&nbsp; ESC {t("stHintBack", "Voltar")}
        </div>
        <div className="pointer-events-auto absolute" style={{ left: -60, top: H / 2 + 24, width: 120 }}>
          <Dots sel={sel} onPick={goTo} />
        </div>
        <div className="pointer-events-auto absolute" style={{ left: W / 2 + 20, top: H / 2 - 56 }}>
          <BackButton onClick={close} t={t} big />
        </div>
      </div>
      {notice && <Notice text={notice} />}
    </div>
    {skins}
    </>
  )
}

/** Pontos do polígono chanfrado (para o SVG do neon). */
function chamferPoints(ox: number, oy: number, w: number, h: number, cut: number) {
  return [
    [ox, oy],
    [ox + w - cut, oy],
    [ox + w, oy + cut],
    [ox + w, oy + h],
    [ox + cut, oy + h],
    [ox, oy + h - cut],
  ]
    .map((p) => p.join(","))
    .join(" ")
}

function Dots({ sel, onPick, small = false }: { sel: number; onPick: (i: number) => void; small?: boolean }) {
  // Celular: pontos menores, com área de toque de 22 px em volta de cada um.
  if (small) {
    return (
      <div className="flex items-center justify-center">
        {PAGES.map((p, i) => (
          <button key={p} type="button" aria-label={String(i + 1)} onClick={() => onPick(i)} className="flex h-[22px] items-center justify-center px-[4px]">
            <span
              className="block"
              style={
                i === sel
                  ? { width: 18, height: 8, border: `2px solid ${EVO.magenta}`, boxShadow: `0 0 6px ${EVO.magenta}` }
                  : { width: 6, height: 6, background: `${EVO.branco}55` }
              }
            />
          </button>
        ))}
      </div>
    )
  }
  return (
    <div className="flex items-center justify-center gap-2 py-1">
      {PAGES.map((p, i) => (
        <button
          key={p}
          type="button"
          aria-label={String(i + 1)}
          onClick={() => onPick(i)}
          className="block"
          style={
            i === sel
              ? { width: 26, height: 12, border: `2px solid ${EVO.magenta}`, boxShadow: `0 0 8px ${EVO.magenta}` }
              : { width: 8, height: 8, background: `${EVO.branco}55` }
          }
        />
      ))}
    </div>
  )
}

function BackButton({ onClick, t, big = false, icon = false }: { onClick: () => void; t: (k: string, f: string) => string; big?: boolean; icon?: boolean }) {
  // Celular: só o X, 36×36, com o nome no aria-label.
  if (icon) {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-label={t("stBack", "Voltar")}
        className="inline-flex h-9 w-9 shrink-0 items-center justify-center"
        style={{ clipPath: chamfer(8), background: `linear-gradient(180deg, ${EVO.carvao2}, ${EVO.preto})`, color: EVO.douradoClaro, boxShadow: `inset 0 0 0 2px ${EVO.douradoEscuro}` }}
      >
        <X className="h-5 w-5" />
      </button>
    )
  }
  return (
    <button
      type="button"
      onClick={onClick}
      className={`${teko.className} inline-flex items-center gap-3 font-semibold uppercase tracking-[0.18em]`}
      style={{
        height: big ? 56 : 46,
        padding: big ? "6px 26px 0" : "4px 16px 0",
        fontSize: big ? 28 : 22,
        clipPath: chamfer(12),
        background: `linear-gradient(180deg, ${EVO.carvao2}, ${EVO.preto})`,
        color: EVO.douradoClaro,
        boxShadow: `inset 0 0 0 2px ${EVO.douradoEscuro}`,
      }}
    >
      {t("stBack", "Voltar")} <X className={big ? "h-6 w-6" : "h-5 w-5"} />
    </button>
  )
}

function Notice({ text, small = false }: { text: string; small?: boolean }) {
  return (
    <div className={`pointer-events-none fixed inset-x-0 z-[90] flex justify-center px-4 ${small ? "top-3" : "top-6"}`}>
      <div className={`${teko.className} font-semibold uppercase tracking-wider ${small ? "px-3 pb-0.5 pt-1.5 text-[15px]" : "px-4 pb-1 pt-2 text-[22px]"}`} style={{ background: EVO.douradoClaro, color: EVO.preto, clipPath: chamfer(10) }}>
        {text}
      </div>
    </div>
  )
}
