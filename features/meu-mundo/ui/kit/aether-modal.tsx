"use client"

// features/meu-mundo/ui/kit/aether-modal.tsx — mm3d-59: a MOLDURA de todo modal novo.
//
// Superfície chanfrada (ferro + filete de latão + sombra dura). mm3d-60i: o
// miolo tem a MESMA opacidade do menu lateral (pedido do Alex).
// Abertura "encaixe mecânico": desloca poucos px, assenta, um filete de luz
// corre o topo — só transform na moldura; a base nunca fica transparente
// (o véu atrás é que escurece). Foco: entra no primeiro controle, fica preso
// dentro, Escape fecha SÓ o modal de cima (pilha) e o foco volta a quem abriu.

import { useEffect, useId, useRef, type ReactNode } from "react"
import { motion, useReducedMotion } from "framer-motion"
import { X } from "lucide-react"
import { useTranslations } from "@/components/i18n/I18nProvider"
import { archivo, cinzel, teko } from "../status/evo-skin"
import { AE, chamfer } from "./aether-tokens"
import { SteamFrame } from "./steam/steam-frame"

/** Pilha de modais abertos (o de cima recebe Escape). */
const stack: string[] = []

const FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

export function AetherModal({
  title,
  eyebrow,
  onClose,
  children,
  footer,
  width = 560,
  z = 80,
}: {
  title: string
  eyebrow?: string
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
  /** Largura máxima no computador (px). No celular ocupa a tela com as margens seguras. */
  width?: number
  z?: number
}) {
  const t = useTranslations("MeuMundo")
  const id = useId()
  const box = useRef<HTMLDivElement | null>(null)
  const reduce = useReducedMotion()
  const closeRef = useRef(onClose)
  useEffect(() => {
    closeRef.current = onClose
  }, [onClose])

  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null
    stack.push(id)
    const el = box.current
    const first = el?.querySelector<HTMLElement>(FOCUSABLE)
    ;(first || el)?.focus({ preventScroll: true })
    const onKey = (e: KeyboardEvent) => {
      if (stack[stack.length - 1] !== id) return
      if (e.key === "Escape") {
        e.preventDefault()
        e.stopPropagation()
        closeRef.current()
        return
      }
      if (e.key !== "Tab" || !el) return
      const items = [...el.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((x) => !x.closest("[inert]"))
      if (!items.length) return
      const a = items[0]
      const b = items[items.length - 1]
      if (e.shiftKey && document.activeElement === a) {
        e.preventDefault()
        b.focus()
      } else if (!e.shiftKey && document.activeElement === b) {
        e.preventDefault()
        a.focus()
      }
    }
    window.addEventListener("keydown", onKey, true)
    return () => {
      window.removeEventListener("keydown", onKey, true)
      const i = stack.lastIndexOf(id)
      if (i >= 0) stack.splice(i, 1)
      if (opener && document.contains(opener)) opener.focus({ preventScroll: true })
    }
  }, [id])

  return (
    <div
      className="fixed inset-0 flex items-end justify-center sm:items-center"
      style={{
        zIndex: z,
        background: "rgba(6, 8, 12, 0.38)",
        paddingTop: "max(12px, env(safe-area-inset-top))",
        paddingBottom: "max(12px, env(safe-area-inset-bottom))",
        paddingLeft: "max(12px, env(safe-area-inset-left))",
        paddingRight: "max(12px, env(safe-area-inset-right))",
      }}
      onPointerDown={(e) => {
        e.stopPropagation()
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <motion.div
        ref={box}
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${id}-t`}
        tabIndex={-1}
        className="relative flex max-h-full w-full flex-col outline-none"
        style={{ maxWidth: width }}
        initial={reduce ? false : { y: 18, scale: 0.985 }}
        animate={{ y: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 520, damping: 34, mass: 0.7 }}
      >
        {/* mm3d-60: moldura steampunk (aro de ouro, filete ciano, cantoneiras; o
            reflexo do topo e o halo acendem na abertura — a base é opaca) */}
        <SteamFrame className="max-h-[calc(100dvh-24px)] min-h-0" cornerSize={46}>
          <div className="flex min-h-0 flex-1 flex-col">
            <header className="relative flex items-start gap-3 px-5 pb-3 pt-4 max-[759px]:px-4" style={{ background: "linear-gradient(180deg, rgba(74, 58, 28, 0.62) 0%, rgba(46, 36, 18, 0.58) 100%)", borderBottom: `1px solid ${AE.brassLine}`, boxShadow: "inset 0 -1px 0 rgba(32,217,233,0.35)" }}>
              <div className="min-w-0 flex-1">
                {eyebrow && (
                  <div className={`${archivo.className} text-[11px] font-semibold uppercase tracking-[0.22em]`} style={{ color: AE.goldSoft }}>
                    {eyebrow}
                  </div>
                )}
                <h2 id={`${id}-t`} className={`${cinzel.className} text-[24px] font-bold uppercase leading-tight tracking-[0.06em] max-[759px]:text-[20px]`} style={{ color: "#FFD68A", textShadow: "0 2px 0 #000" }}>
                  {title}
                </h2>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label={t("close", "Fechar")}
                className="grid h-11 w-11 shrink-0 place-items-center outline-none focus-visible:ring-2"
                style={{ color: AE.goldSoft, background: AE.well, clipPath: chamfer(AE.cut.button) }}
              >
                <X className="h-5 w-5" />
              </button>
            </header>
            <div className={`${archivo.className} min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4 max-[759px]:px-3`} style={{ color: AE.text }}>
              {children}
            </div>
            {footer && (
              <footer className="flex flex-wrap gap-2 px-5 py-3 max-[759px]:px-3" style={{ borderTop: `1px solid ${AE.brassLine}`, background: "rgba(13, 15, 19, 0.5)" }}>
                {footer}
              </footer>
            )}
          </div>
        </SteamFrame>
      </motion.div>
    </div>
  )
}

/** Botão do kit: principal (dourado) ou secundário (latão). Alvo de toque ≥ 44 px. */
export function AetherButton({
  children,
  onClick,
  tone = "primary",
  disabled,
  busy,
  className = "",
}: {
  children: ReactNode
  onClick?: () => void
  tone?: "primary" | "secondary" | "danger"
  disabled?: boolean
  busy?: boolean
  className?: string
}) {
  const bg = tone === "primary" ? AE.goldPlate : tone === "danger" ? "linear-gradient(180deg,#7a1f1f,#4a1010)" : AE.brassPlate
  const fg = tone === "primary" ? AE.ink : AE.text
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || busy}
      aria-busy={busy || undefined}
      className={`${teko.className} min-h-11 px-5 text-[20px] font-semibold uppercase tracking-wide outline-none transition-transform duration-100 focus-visible:ring-2 active:translate-y-[1px] disabled:cursor-not-allowed ${className}`}
      style={{
        background: disabled ? AE.steel : bg,
        color: disabled ? AE.dim : fg,
        clipPath: chamfer(AE.cut.button),
      }}
    >
      {children}
    </button>
  )
}
