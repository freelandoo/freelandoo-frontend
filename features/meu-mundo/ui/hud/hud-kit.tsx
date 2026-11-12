"use client"

// features/meu-mundo/ui/hud/hud-kit.tsx — a interface do jogo numa peça só.
//
// Pedido do Alex (2026-10-20): o menu numa GAVETA lateral que a pessoa puxa
// quando quer, e a mesma identidade em tudo. Desde a modernização visual
// (2026-10-25): grafite translúcido, cantos arredondados, bordas finas, rubi
// nas ações principais e no que está aceso, dourado discreto nos ícones,
// verde na presença online (cores em tokens.ts, pele em hud.module.css). A
// rua, a casa e o centro montam a HUD com estas peças — botão escrito duas
// vezes diverge em silêncio, então nenhum outro arquivo do jogo pinta botão
// ou modal à mão.
//
//   HudChip     etiqueta de estado
//   Drawer      aba ‹ na borda direita + gaveta (cabeçalho, cards, presença)
//   EvoDialog   modal (centro no computador, de baixo no celular)
//   EvoButton   primário (rubi), secundário (grafite), fantasma; com atalho
//   EvoToast    aviso curto
//   WindedToast "sem fôlego" (mm3d-28; rua, centro e casa)

import { useCallback, useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react"
import { ChevronLeft, ChevronRight, Loader2, Wind, X } from "lucide-react"
import { useTranslations } from "@/components/i18n/I18nProvider"
import gsap from "gsap"
import { archivo, cinzel } from "../status/evo-skin"
import { SteamFrame } from "../kit/steam/steam-frame"
import { currentUiFx } from "../kit/steam/fx-tier"
import { MM } from "./tokens"
import s from "./hud.module.css"
import d from "./drawer.module.css"
import { DrawerMachine } from "./drawer-machine"
import { Shape } from "./shape"
import { drawerGates, type DrawerGates } from "./drawer-gates"
import { uiSound } from "../../engine/audio"

export type ChipTone = "bom" | "ambar" | "perigo" | "ouro" | "escuro"
const CHIP: Record<ChipTone, [string, string]> = {
  bom: ["rgba(56,232,129,0.14)", "#5fe39a"],
  ambar: ["rgba(255,170,74,0.14)", "#ffaa4a"],
  perigo: ["rgba(255,51,68,0.16)", "#ff7b86"],
  ouro: ["rgba(229,190,112,0.16)", MM.gold],
  escuro: ["rgba(255,255,255,0.07)", MM.text],
}

export function HudChip({ tone = "escuro", icon, children, onClick, title }: { tone?: ChipTone; icon?: ReactNode; children: ReactNode; onClick?: () => void; title?: string }) {
  const [bg, fg] = CHIP[tone]
  const cls = `${archivo.className} inline-flex h-[22px] items-center gap-1 rounded-full px-2 text-[11px] font-bold uppercase leading-none tracking-[0.08em]`
  const style: CSSProperties = { background: bg, color: fg, boxShadow: `inset 0 0 0 1px ${fg}44` }
  return onClick ? (
    <button type="button" onClick={onClick} className={cls} style={style} title={title}>
      {icon}
      {children}
    </button>
  ) : (
    <span className={cls} style={style} title={title}>
      {icon}
      {children}
    </span>
  )
}

/** Evento de janela: a gaveta abriu (true) ou fechou (false). */
export const DRAWER_EVENT = "mm-drawer"

/** A gaveta está aberta? (peças da casca que dividem o canto com ela se escondem.) */
export function useDrawerOpen() {
  const [open, setOpen] = useState(false)
  useEffect(() => {
    const on = (e: Event) => setOpen(!!(e as CustomEvent<boolean>).detail)
    window.addEventListener(DRAWER_EVENT, on)
    return () => window.removeEventListener(DRAWER_EVENT, on)
  }, [])
  return open
}

// ═══ a gaveta ══════════════════════════════════════════════════════════════
export interface DrawerItem {
  id: string
  label: string
  icon: ReactNode
  onSelect: () => void
  hint?: string
  disabled?: boolean
  /** Fica aceso (a tela que esse item abriu está aberta). */
  active?: boolean
  badge?: string
  /** "nav" abre painel/tela (ganha o chevron); "action" age na hora. */
  kind?: "nav" | "action"
  /** Esperando resposta (spinner no lugar do chevron, não aceita toque). */
  loading?: boolean
  /** Não fecha a gaveta ao escolher (ex.: Gráficos troca e mostra o valor). */
  keepOpen?: boolean
  /**
   * Portão com lista própria (apresentação 02: Ajustes, Mochila): tocar troca a lista da
   * gaveta pela dele, com "Voltar" no topo; `onSelect` não é chamado.
   */
  children?: DrawerItem[]
}

/** Presença da sala desta cena: `count` só vale com `state: "online"`. */
export interface DrawerPresence {
  count: number | null
  /** "Neste bairro", "Nesta casa", "No centro". */
  scope: string
  state: "online" | "connecting" | "offline"
}

/** Estado da rede da cena → estado da presença (nunca mostra "0" conectando). */
export function presenceState(net: string): DrawerPresence["state"] {
  if (net === "online") return "online"
  if (net === "offline" || net === "replaced") return "offline"
  return "connecting"
}

/**
 * Aba ‹ na borda direita + a gaveta. Abre tocando na aba, arrastando ela
 * para a esquerda ou com a tecla M; fecha pelo X do cabeçalho, M, ESC,
 * arrastando para a direita, tocando fora ou escolhendo um item. Setas sobem
 * e descem em anel. Ao fechar, o foco volta para a aba.
 */
export function Drawer({
  open,
  onOpenChange,
  heading,
  items: plainItems,
  gates,
  presence,
  footer,
  hotkeys = true,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  heading: string
  /** Lista solta (minijogos etc.). */
  items?: DrawerItem[]
  /** Cenas do mundo: os 5 portões montados aqui (apresentação 02). */
  gates?: DrawerGates
  presence?: DrawerPresence
  /** Linha miúda extra embaixo da presença (opcional). */
  footer?: ReactNode
  /** Desligar quando outro painel está por cima (o M não abre por trás dele). */
  hotkeys?: boolean
}) {
  const t = useTranslations("MeuMundo")
  const items = gates ? drawerGates(t, gates) : (plainItems ?? [])
  const listRef = useRef<HTMLDivElement | null>(null)
  const navRef = useRef<HTMLElement | null>(null)
  const pullRef = useRef<HTMLButtonElement | null>(null)
  const drag = useRef<{ id: number; x: number; from: "pull" | "drawer" } | null>(null)
  const [dx, setDx] = useState(0)
  // portão aberto dentro da gaveta (Ajustes, Mochila…): a lista é a dele
  const [sub, setSub] = useState<string | null>(null)
  const subItem = sub ? items.find((it) => it.id === sub && it.children?.length) : undefined
  const list = subItem?.children ?? items

  const close = useCallback(() => onOpenChange(false), [onOpenChange])
  // fechou: a próxima abertura começa nos portões
  useEffect(() => {
    if (!open) setSub(null)
  }, [open])
  // trocou de lista: o foco vai para o primeiro card e os cards entram da direita (~300 ms)
  useEffect(() => {
    if (!open) return
    const id = requestAnimationFrame(() => listRef.current?.querySelector<HTMLButtonElement>("button:not(:disabled)")?.focus({ preventScroll: true }))
    const el = listRef.current
    if (el && currentUiFx() !== "low") gsap.fromTo(el.children, { x: 28, opacity: 0 }, { x: 0, opacity: 1, duration: 0.3, ease: "power3.out", stagger: 0.03, clearProps: "transform,opacity" })
    if (el) el.scrollTop = 0
    return () => cancelAnimationFrame(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sub])

  useEffect(() => {
    if (!hotkeys) return
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable)) return
      if (e.ctrlKey || e.metaKey || e.altKey) return
      if (e.code === "KeyM" && !e.repeat) {
        e.preventDefault()
        onOpenChange(!open)
      } else if (open && e.key === "Escape") {
        e.preventDefault()
        if (sub) setSub(null)
        else close()
      } else if (open && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
        const list = [...(listRef.current?.querySelectorAll<HTMLButtonElement>("button:not(:disabled)") ?? [])]
        if (!list.length) return
        e.preventDefault()
        const i = list.indexOf(document.activeElement as HTMLButtonElement)
        const next = e.key === "ArrowDown" ? (i + 1) % list.length : (i - 1 + list.length) % list.length
        list[i < 0 ? 0 : next].focus()
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [hotkeys, open, onOpenChange, close, sub])

  // áudio S1: a gaveta abrindo e fechando (não toca na primeira montagem)
  const wasOpen = useRef(open)
  useEffect(() => {
    if (wasOpen.current === open) return
    wasOpen.current = open
    uiSound(open ? "drawerOpen" : "drawerClose")
  }, [open])

  // Gaveta aberta: o balão de avisos (que mora na casca, acima da cena) se
  // esconde para não cobrir o topo do menu (os cards de notificação ouvem este evento).
  useEffect(() => {
    window.dispatchEvent(new CustomEvent(DRAWER_EVENT, { detail: open }))
    return () => {
      if (open) window.dispatchEvent(new CustomEvent(DRAWER_EVENT, { detail: false }))
    }
  }, [open])

  // Abriu: o foco vai para o primeiro card (o anel só aparece no teclado —
  // :focus-visible —, então nada fica "marcado" para quem abriu tocando).
  // Fechou com o foco lá dentro: volta para a aba.
  useEffect(() => {
    if (open) {
      const id = requestAnimationFrame(() => listRef.current?.querySelector<HTMLButtonElement>("button:not(:disabled)")?.focus({ preventScroll: true }))
      return () => cancelAnimationFrame(id)
    }
    if (navRef.current?.contains(document.activeElement)) pullRef.current?.focus({ preventScroll: true })
  }, [open])

  // mm3d-60c: abertura em coreografia (GSAP), menu "O BAIRRO" em prata + azul —
  // o painel desliza (CSS); o halo azul da borda acende; relógio e engrenagens
  // dão um micro giro; a câmara de energia acende; os botões entram em
  // sequência. ~750 ms, só transform/opacity (as placas ficam opacas; só
  // deslizam). Gráficos baixos ou movimento reduzido: sem coreografia.
  useEffect(() => {
    const nav = navRef.current
    if (!open || !nav || currentUiFx() === "low") return
    nav.dataset.anim = ""
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ onComplete: () => void delete nav.dataset.anim })
      tl.fromTo(`.${d.edgeGlow}`, { opacity: 0 }, { opacity: 1, duration: 0.4, ease: "power2.out" }, 0.05)
      tl.fromTo(`.${d.plate}`, { y: -10 }, { y: 0, duration: 0.35, ease: "back.out(2)" }, 0.12)
      tl.fromTo(`.${d.clockBox}`, { rotate: -28, scale: 0.86 }, { rotate: 0, scale: 1, duration: 0.55, ease: "back.out(1.8)" }, 0.22)
      tl.fromTo(`.${d.gear}`, { rotate: -50 }, { rotate: 0, duration: 0.7, ease: "power3.out", stagger: 0.05 }, 0.22)
      tl.fromTo(`.${d.tubeGlass}`, { opacity: 0.25 }, { opacity: 1, duration: 0.3, ease: "power1.in", yoyo: false }, 0.35)
      tl.fromTo(`.${d.tubeCore}`, { scale: 0 }, { scale: 1, duration: 0.45, ease: "back.out(2.4)", clearProps: "transform" }, 0.42)
      tl.fromTo(`.${d.item}`, { x: 40 }, { x: 0, duration: 0.4, ease: "power3.out", stagger: 0.04, clearProps: "transform" }, 0.4)
    }, nav)
    return () => {
      ctx.revert()
      delete nav.dataset.anim
    }
  }, [open])

  const down = (from: "pull" | "drawer") => (e: React.PointerEvent) => {
    if (drag.current || (e.pointerType === "mouse" && e.button !== 0)) return
    drag.current = { id: e.pointerId, x: e.clientX, from }
  }
  const move = (e: React.PointerEvent) => {
    const d = drag.current
    if (!d || d.id !== e.pointerId) return
    const delta = e.clientX - d.x
    if (d.from === "drawer" && delta > 0) setDx(delta)
    if (d.from === "pull" && delta < -36) {
      drag.current = null
      onOpenChange(true)
    }
  }
  const up = (e: React.PointerEvent) => {
    const d = drag.current
    if (!d || d.id !== e.pointerId) return
    drag.current = null
    if (d.from === "drawer" && e.clientX - d.x > 70) close()
    setDx(0)
  }

  return (
    <>
      {/* a aba: só a seta ‹ */}
      <button
        ref={pullRef}
        type="button"
        className={d.pull}
        data-hidden={open ? "" : undefined}
        data-world={gates ? "" : undefined}
        onClick={() => onOpenChange(true)}
        onPointerDown={down("pull")}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
        aria-label={t("menuOpenNav", "Abrir navegação")}
        aria-expanded={open}
        aria-controls="mm-drawer"
        tabIndex={open ? -1 : 0}
      >
        <span className={d.tab}>
          <span className={d.tabIn}>
            <ChevronLeft strokeWidth={2.4} />
          </span>
        </span>
      </button>

      {/* fora da gaveta: tocar fecha */}
      {open && <div className={d.scrim} onPointerDown={close} aria-hidden />}

      <nav
        ref={navRef}
        id="mm-drawer"
        className={`${d.drawer} ${archivo.className} pointer-events-auto`}
        data-open={open ? "" : undefined}
        style={{
          ...(dx ? { transform: `translateX(${dx}px)`, transition: "none" } : null),
          visibility: open || dx ? "visible" : undefined,
        }}
        aria-label={heading}
        aria-hidden={!open}
        inert={!open}
        onPointerDown={down("drawer")}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
      >
        <span aria-hidden className={d.edgeGlow} />
        <DrawerMachine open={open} />
        <div className={d.body}>
          {/* placa do título (o relógio encaixa na ponta esquerda) */}
          <div className={d.plate}>
            <div className={d.box}>
              <Shape c={14} />
              <div className={d.boxIn}>
                <span aria-hidden className={d.rivets} />
                <h2 className={`${cinzel.className} ${d.title}`}>{subItem ? subItem.label : heading}</h2>
                <button type="button" onClick={close} className={d.close} aria-label={t("menuClose", "Fechar o menu")}>
                  <X />
                </button>
              </div>
            </div>
            <span aria-hidden className={d.plateGem} />
          </div>
          {/* a lista, dentro da moldura de aço */}
          <div className={`${d.frame} ${d.box}`}>
            <Shape c={14} />
            <div className={d.boxIn}>
                  <span aria-hidden className={d.rivets} />
                  <div ref={listRef} className={d.list}>
                    {subItem && (
                      <MenuItem
                        key="__back"
                        label={t("menuBack", "Voltar")}
                        hint={heading}
                        icon={<ChevronLeft className="h-5 w-5" />}
                        onSelect={() => {
                          uiSound("card")
                          setSub(null)
                        }}
                      />
                    )}
                    {list.map(({ children: inner, keepOpen, id, ...it }) => (
                      <MenuItem
                        key={id}
                        {...it}
                        kind={inner?.length ? "nav" : it.kind}
                        onSelect={() => {
                          // áudio S1: mochila tem o som dela; portão com lista troca de página; card age
                          uiSound(id === "bag" ? "bagOpen" : inner?.length ? "gate" : "card")
                          if (inner?.length) return setSub(id)
                          if (!keepOpen) close()
                          it.onSelect()
                        }}
                      />
                    ))}
              </div>
            </div>
          </div>
          {(presence || footer) && (
            <div className={`${d.foot} ${d.box}`}>
              <Shape c={14} />
              <div className={d.boxIn}>
                <span aria-hidden className={d.rivets} />
                {presence && <Presence {...presence} />}
                {footer && <div className={d.extra}>{footer}</div>}
              </div>
            </div>
          )}
        </div>
      </nav>
    </>
  )
}

/** "● 3 jogadores online / Neste bairro" — neutro enquanto não conecta. */
function Presence({ count, scope, state }: DrawerPresence) {
  const t = useTranslations("MeuMundo")
  const live = state === "online" && count != null
  const text = live
    ? (count === 1 ? t("presenceOne", "{n} jogador online") : t("presenceMany", "{n} jogadores online")).replace("{n}", String(count))
    : state === "offline"
      ? t("presenceOffline", "Sem conexão")
      : t("presenceConnecting", "Conectando…")
  return (
    <div className={d.presence} data-state={live ? "online" : state === "offline" ? "offline" : "connecting"} role="status" aria-live="polite">
      <span className={d.dot} aria-hidden />
      <span className={d.count}>{text}</span>
      <span className={d.scope}>{scope}</span>
    </div>
  )
}

export function MenuItem({ label, icon, onSelect, hint, disabled, active, badge, kind = "action", loading }: Omit<DrawerItem, "id" | "keepOpen" | "children">) {
  return (
    <button
      type="button"
      className={d.item}
      onClick={onSelect}
      disabled={disabled || loading}
      data-active={active ? "" : undefined}
      data-hint={hint ? "" : undefined}
      aria-pressed={active || undefined}
      aria-busy={loading || undefined}
    >
      {/* placa: aro de prata (e o azul que acende), miolo grafite, reflexo e filete */}
      <Shape kind="point" c={16} className={d.itemShape} />
      <span aria-hidden className={d.itemShine} />
      <span aria-hidden className={d.itemStrip} />
      <span className={d.icon}>{icon}</span>
      <span className={d.text}>
        <span className={d.label}>{label}</span>
        {hint && <span className={d.hint}>{hint}</span>}
      </span>
      {badge ? <span className={d.badge}>{badge}</span> : <span />}
      <span className={d.arrow} aria-hidden>
        {loading ? <Loader2 className={d.spin} /> : kind === "nav" ? <ChevronRight /> : null}
      </span>
    </button>
  )
}

// ═══ botões ════════════════════════════════════════════════════════════════
/**
 * `primary` = ação principal (rubi). `gold` = secundário (grafite, ícone e
 * borda dourados discretos). `ghost` = terciário. Sem filhos vira botão de
 * ícone 44 × 44. `loading` troca o ícone por spinner e bloqueia o toque.
 */
export function EvoButton({
  variant = "gold",
  icon,
  kbd,
  children,
  className = "",
  size = "md",
  loading = false,
  disabled,
  ...rest
}: {
  variant?: "primary" | "gold" | "ghost"
  icon?: ReactNode
  kbd?: string
  /** "none": quem chama dá altura e corpo da letra (sem classe concorrente). */
  size?: "sm" | "md" | "lg" | "none"
  loading?: boolean
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const sz =
    size === "lg"
      ? "min-h-[52px] px-5 text-[16px] max-[759px]:min-h-11 max-[759px]:text-[15px]"
      : size === "sm"
        ? "min-h-9 px-3 text-[13px]"
        : size === "md"
          ? "text-[15px] max-[759px]:text-[14px]"
          : ""
  const only = children == null
  return (
    <button
      type="button"
      data-size={size}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={`${s.btn} ${s[variant]} ${only ? s.iconOnly : ""} ${archivo.className} ${sz} ${className}`}
      {...rest}
    >
      {loading ? <Loader2 className={`h-5 w-5 ${s.spin}`} /> : icon}
      {!only && <span>{children}</span>}
      {kbd && <kbd className={s.kbd}>{kbd}</kbd>}
    </button>
  )
}

// ═══ modal ═════════════════════════════════════════════════════════════════
/**
 * Modal do jogo: painel grafite arredondado, borda fina, título claro.
 * ESC e tocar fora fecham. No celular encosta embaixo.
 */
export function EvoDialog({
  eyebrow,
  title,
  onClose,
  children,
  footer,
  width = "max-w-md",
  z = "z-10",
  fixed = false,
  labelId,
}: {
  eyebrow?: string
  title: string
  onClose?: () => void
  children?: ReactNode
  footer?: ReactNode
  width?: string
  z?: string
  /** `fixed` para os modais da casca (fora do quadro do jogo). */
  fixed?: boolean
  labelId: string
}) {
  const t = useTranslations("MeuMundo")
  useEffect(() => {
    if (!onClose) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault()
        onClose()
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [onClose])
  return (
    <div
      className={`${fixed ? "fixed" : "absolute"} inset-0 ${z} ${s.fade} flex items-end justify-center sm:items-center`}
      style={{
        background: MM.scrim,
        paddingTop: "max(12px, env(safe-area-inset-top))",
        paddingBottom: "max(12px, env(safe-area-inset-bottom))",
        paddingLeft: "max(12px, env(safe-area-inset-left))",
        paddingRight: "max(12px, env(safe-area-inset-right))",
      }}
      onPointerDown={(e) => {
        e.stopPropagation()
        if (e.target === e.currentTarget) onClose?.()
      }}
    >
      <div role="dialog" aria-modal="true" aria-labelledby={labelId} className={`${s.enter} relative flex max-h-full w-full ${width} flex-col`}>
        <SteamFrame className="max-h-[calc(100dvh-24px)] min-h-0" cornerSize={42}>
          <div className="relative px-5 pb-3 pt-4 max-[759px]:px-4 max-[759px]:pb-2 max-[759px]:pt-3">
            {eyebrow && (
              <div className={`${archivo.className} text-[11px] font-semibold uppercase tracking-[0.2em]`} style={{ color: MM.gold }}>
                {eyebrow}
              </div>
            )}
            <h2 id={labelId} className={`${cinzel.className} mt-0.5 pr-12 text-[20px] font-bold uppercase leading-tight tracking-[0.06em] max-[759px]:text-[17px]`} style={{ color: "#FFD68A", textShadow: "0 2px 0 #000" }}>
              {title}
            </h2>
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className={`${s.close} absolute right-3 top-2.5`}
                aria-label={t("close", "Fechar")}
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>
          <div className={`${archivo.className} min-h-0 flex-1 overflow-y-auto px-5 pb-4 text-[14px] leading-5 max-[759px]:px-4 max-[759px]:pb-3 max-[759px]:text-[13px] max-[759px]:leading-[18px]`} style={{ color: MM.text }}>
            {children}
          </div>
          {footer && (
            <div className="flex flex-wrap gap-2 border-t px-5 py-3 max-[759px]:px-4 max-[759px]:py-2.5" style={{ borderColor: MM.border }}>
              {footer}
            </div>
          )}
        </SteamFrame>
      </div>
    </div>
  )
}

/** Linha "rótulo · valor" dos modais (ficha da casa etc.). */
export function InfoRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b py-2 max-[759px]:py-1.5" style={{ borderColor: MM.border }}>
      <span className={`${archivo.className} text-[13px]`} style={{ color: MM.muted }}>
        {label}
      </span>
      <span className="text-right font-semibold">{children}</span>
    </div>
  )
}

// ═══ aviso ═════════════════════════════════════════════════════════════════
/** Sem fôlego (a sala parou a corrida até ele recuperar 30%). */
export function WindedToast() {
  const t = useTranslations("MeuMundo")
  return <EvoToast icon={<Wind className="h-4 w-4 shrink-0" />}>{t("winded", "Sem fôlego — andando até recuperar")}</EvoToast>
}

/** Aviso curto. `magenta` (nome antigo) = destaque rubi. */
export function EvoToast({ icon, children, tone = "ouro" }: { icon?: ReactNode; children: ReactNode; tone?: "ouro" | "magenta" }) {
  return (
    <div
      role="status"
      className={`${s.panel} ${s.enterTop} ${archivo.className} flex items-center gap-2.5 px-4 py-2.5 text-[14px] font-semibold leading-tight max-[759px]:gap-2 max-[759px]:px-3 max-[759px]:py-2 max-[759px]:text-[13px]`}
      style={{ borderRadius: MM.radius.card, borderColor: tone === "magenta" ? MM.rubyBorder : MM.border }}
    >
      {icon && <span className="inline-flex shrink-0" style={{ color: MM.gold }}>{icon}</span>}
      <span>{children}</span>
    </div>
  )
}
