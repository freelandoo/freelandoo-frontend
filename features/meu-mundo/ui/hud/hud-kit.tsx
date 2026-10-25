"use client"

// features/meu-mundo/ui/hud/hud-kit.tsx — a interface do jogo numa peça só.
//
// Pedido do Alex (2026-10-20): botões e modais organizados como os do
// estábulo do EVO Brazil, com o menu numa GAVETA lateral que a pessoa puxa
// quando quer, e a mesma identidade em tudo (tabloide futurista: placas
// pretas retas e chanfradas, filete dourado, neon magenta só no que está
// aceso). A rua e a casa montam a HUD com estas peças — botão escrito duas
// vezes diverge em silêncio, então nenhum outro arquivo do jogo pinta botão
// ou modal à mão.
//
//   HudChip     etiqueta de estado (rede, pessoas, casa)
//   Drawer      puxador na borda direita + gaveta com os itens do menu
//   EvoDialog   modal (centro no computador, de baixo no celular)
//   EvoButton   ação magenta, ouro ou fantasma (com a tecla do atalho)
//   EvoToast    aviso curto
//   WindedToast "sem fôlego" (mm3d-28; rua, centro e casa)

import { useCallback, useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react"
import { ChevronRight, Menu, Wind, X } from "lucide-react"
import { useTranslations } from "@/components/i18n/I18nProvider"
import { Chamfer, EVO, archivo, teko } from "../status/evo-skin"
import s from "./hud.module.css"

export type ChipTone = "bom" | "ambar" | "perigo" | "ouro" | "escuro"
const CHIP: Record<ChipTone, [string, string]> = {
  bom: ["#123d27", EVO.bom],
  ambar: ["#3d2a0c", EVO.ambar],
  perigo: ["#4a0a1c", "#ff6b78"],
  ouro: [EVO.douradoClaro, EVO.preto],
  escuro: ["rgba(245,240,237,0.08)", EVO.branco],
}

export function HudChip({ tone = "escuro", icon, children, onClick, title }: { tone?: ChipTone; icon?: ReactNode; children: ReactNode; onClick?: () => void; title?: string }) {
  const [bg, fg] = CHIP[tone]
  const cls = `${teko.className} inline-flex h-[22px] items-center gap-1 px-1.5 pt-[2px] text-[15px] font-medium uppercase leading-none tracking-[0.08em]`
  const style: CSSProperties = { background: bg, color: fg, boxShadow: tone === "ouro" ? undefined : `inset 0 0 0 1px ${fg}44` }
  return onClick ? (
    <button type="button" onClick={onClick} className={cls} style={style} title={title}>
      {icon}
      {children}
    </button>
  ) : (
    <span className={cls} style={style} title={title} role={title ? undefined : undefined}>
      {icon}
      {children}
    </span>
  )
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
}

/**
 * Puxador na borda direita + a gaveta. Abre clicando no puxador, arrastando
 * ele para a esquerda ou com a tecla M; fecha com M, ESC, arrastando para a
 * direita, tocando fora ou escolhendo um item. Setas sobem e descem em anel,
 * como num menu de console. Enquanto aberta, o jogo não lê teclas (`onOpenChange`
 * avisa quem segura o bloqueio).
 */
export function Drawer({
  open,
  onOpenChange,
  heading,
  items,
  footer,
  hotkeys = true,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  heading: string
  items: DrawerItem[]
  footer?: ReactNode
  /** Desligar quando outro painel está por cima (o M não abre por trás dele). */
  hotkeys?: boolean
}) {
  const t = useTranslations("MeuMundo")
  const listRef = useRef<HTMLDivElement | null>(null)
  const drag = useRef<{ id: number; x: number; from: "pull" | "drawer" } | null>(null)
  const [dx, setDx] = useState(0)

  const close = useCallback(() => onOpenChange(false), [onOpenChange])

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
        close()
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
  }, [hotkeys, open, onOpenChange, close])

  // Ao abrir, o foco vai para o primeiro item (teclado e leitor de tela).
  useEffect(() => {
    if (!open) return
    const id = requestAnimationFrame(() => listRef.current?.querySelector<HTMLButtonElement>("button:not(:disabled)")?.focus({ preventScroll: true }))
    return () => cancelAnimationFrame(id)
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
      {/* puxador */}
      <button
        type="button"
        className={s.pull}
        style={{ top: "38%", opacity: open ? 0 : 1, transform: open ? "translateX(40px)" : undefined, pointerEvents: open ? "none" : "auto" }}
        onClick={() => onOpenChange(true)}
        onPointerDown={down("pull")}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
        aria-label={t("menuOpen", "Abrir o menu (M)")}
        aria-expanded={open}
        tabIndex={open ? -1 : 0}
      >
        <span className={s.halo} />
        <span className={s.plate} />
        <span className={s.fill} />
        <span className={s.hot} />
        <span className={s.pullInner}>
          <Menu className="h-4 w-4" />
          <span className={`${s.pullText} ${teko.className}`}>{t("menu", "Menu")}</span>
        </span>
      </button>

      {/* fora da gaveta: tocar fecha */}
      {open && <div className="pointer-events-auto absolute inset-0 bg-black/65 sm:bg-transparent" onPointerDown={close} aria-hidden />}

      <nav
        className={`${s.drawer} pointer-events-auto`}
        data-open={open ? "" : undefined}
        style={{
          paddingTop: "max(12px, env(safe-area-inset-top))",
          paddingBottom: "max(12px, env(safe-area-inset-bottom))",
          paddingRight: "max(12px, env(safe-area-inset-right))",
          paddingLeft: 28,
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
        <div className={`${s.slot} relative pb-1 pt-3`}>
          <div className="flex items-end justify-between">
            <span className={`${teko.className} text-[19px] font-semibold uppercase leading-none tracking-[0.5em]`} style={{ color: EVO.douradoClaro }}>
              {heading}
            </span>
          </div>
          <div className={`${s.fio} mt-1.5`} />
          <button
            type="button"
            onClick={close}
            className="absolute -top-1 right-12 inline-flex h-9 w-9 items-center justify-center"
            style={{ color: EVO.mudo }}
            aria-label={t("menuClose", "Fechar o menu")}
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div ref={listRef} className="mt-3 flex min-h-0 flex-1 flex-col gap-[7px] overflow-y-auto pb-2 pr-0.5" style={{ overscrollBehavior: "contain" }}>
          {items.map((it, i) => (
            <div key={it.id} className={s.slot} style={{ transitionDelay: open ? `${60 + i * 40}ms` : "0ms" }}>
              <MenuItem
                {...it}
                onSelect={() => {
                  close()
                  it.onSelect()
                }}
              />
            </div>
          ))}
        </div>
        {footer && (
          <div className={`${s.slot} ${archivo.className} border-t pt-2 text-[11px] font-medium leading-4`} style={{ borderColor: EVO.linha, color: EVO.mudo }}>
            {footer}
          </div>
        )}
      </nav>
    </>
  )
}

export function MenuItem({ label, icon, onSelect, hint, disabled, active, badge }: Omit<DrawerItem, "id">) {
  return (
    <button
      type="button"
      className={s.item}
      onClick={onSelect}
      disabled={disabled}
      data-active={active ? "" : undefined}
      data-hint={hint ? "" : undefined}
      aria-pressed={active || undefined}
      title={hint}
    >
      <span className={s.halo} />
      <span className={s.plate} />
      <span className={s.fill} />
      <span className={s.hot} />
      <span className={s.shine} />
      <span className={s.metal} />
      <span className={s.icon}>{icon}</span>
      <span className={`${s.label} ${teko.className}`}>{label}</span>
      {hint && <span className={`${s.hint} ${archivo.className}`}>{hint}</span>}
      {badge && <span className={`${s.badge} ${teko.className}`}>{badge}</span>}
      <span className={s.arrow}>
        <ChevronRight className="h-6 w-6" strokeWidth={3} />
      </span>
      <span className={s.bar} />
    </button>
  )
}

// ═══ botões ════════════════════════════════════════════════════════════════
export function EvoButton({
  variant = "gold",
  icon,
  kbd,
  children,
  className = "",
  size = "md",
  ...rest
}: {
  variant?: "primary" | "gold" | "ghost"
  icon?: ReactNode
  kbd?: string
  /** "none": quem chama dá altura e corpo da letra (sem classe concorrente). */
  size?: "sm" | "md" | "lg" | "none"
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const sz = size === "lg" ? "min-h-14 px-5 text-[22px]" : size === "sm" ? "min-h-9 px-3 text-[16px]" : size === "md" ? "text-[19px]" : ""
  return (
    <button type="button" className={`${s.btn} ${s[variant]} ${teko.className} ${sz} ${className}`} {...rest}>
      {icon}
      {children != null && <span className="pt-[3px]">{children}</span>}
      {kbd && <kbd className={s.kbd}>{kbd}</kbd>}
    </button>
  )
}

// ═══ modal ═════════════════════════════════════════════════════════════════
/**
 * Modal do jogo: placa chanfrada escura, filete dourado, fio magenta sob o
 * título. ESC e tocar fora fecham. No celular encosta embaixo.
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
      className={`fl-sharp ${fixed ? "fixed" : "absolute"} inset-0 ${z} flex items-end justify-center sm:items-center`}
      style={{
        background: "rgba(8,7,11,0.55)",
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
      <div role="dialog" aria-modal="true" aria-labelledby={labelId} className={`relative flex max-h-full w-full ${width} flex-col`}>
        <Chamfer cut={18} border={`${EVO.dourado}bb`} width={1.5} className="flex max-h-full min-h-0 flex-col" style={{ boxShadow: "none" }}>
          <div className="flex max-h-[calc(100dvh-24px)] min-h-0 flex-col">
            <div className="relative px-5 pb-2 pt-4">
              {eyebrow && (
                <div className={`${archivo.className} text-[11px] font-semibold uppercase tracking-[0.28em]`} style={{ color: EVO.douradoClaro }}>
                  {eyebrow}
                </div>
              )}
              <h2 id={labelId} className={`${teko.className} pr-12 text-[34px] font-bold uppercase leading-[0.95]`} style={{ color: EVO.branco }}>
                {title}
              </h2>
              <div className={`${s.fio} mt-2`} />
              {onClose && (
                <button
                  type="button"
                  onClick={onClose}
                  className="absolute right-3 top-3 inline-flex h-10 w-10 items-center justify-center"
                  style={{ color: EVO.douradoClaro, background: "rgba(8,7,11,0.9)", boxShadow: `inset 0 0 0 1.5px ${EVO.dourado}99` }}
                  aria-label={t("close", "Fechar")}
                >
                  <X className="h-5 w-5" />
                </button>
              )}
            </div>
            <div className={`${archivo.className} min-h-0 flex-1 overflow-y-auto px-5 pb-4 text-[14px] leading-5`} style={{ color: EVO.branco }}>
              {children}
            </div>
            {footer && (
              <div className="flex flex-wrap gap-2 border-t px-5 py-3" style={{ borderColor: EVO.linha }}>
                {footer}
              </div>
            )}
          </div>
        </Chamfer>
      </div>
    </div>
  )
}

/** Linha "rótulo · valor" dos modais (ficha da casa etc.). */
export function InfoRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b py-1.5" style={{ borderColor: EVO.linha }}>
      <span className={`${teko.className} text-[17px] uppercase tracking-[0.14em]`} style={{ color: EVO.mudo }}>
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

export function EvoToast({ icon, children, tone = "ouro" }: { icon?: ReactNode; children: ReactNode; tone?: "ouro" | "magenta" }) {
  const c = tone === "magenta" ? "#ff5fae" : EVO.dourado
  return (
    <Chamfer cut={10} border={c} width={1.5}>
      <div role="status" className={`${teko.className} flex items-center gap-2 px-4 pb-1.5 pt-2 text-[18px] font-medium uppercase leading-none tracking-[0.1em]`} style={{ color: EVO.branco }}>
        {icon}
        {children}
      </div>
    </Chamfer>
  )
}
