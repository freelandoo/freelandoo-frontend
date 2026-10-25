"use client"

// features/meu-mundo/ui/needs/needs-bubble.tsx — o personagem FALA o que
// precisa (mm3d-28): retrato (imagem pré-renderizada do corpo/skin atual,
// sem 3D), ícone da necessidade e uma frase curta. Mora na casca, então vale
// em todas as cenas e a memória dos avisos sobrevive à troca de ambiente.
// O QUE falar e QUANDO é de needs-logic.ts; aqui só se desenha.

import { useEffect, useRef, useState } from "react"
import { BatteryLow, Bed, Flame, HeartPulse, Hourglass, Moon, Utensils, X } from "lucide-react"
import { useTranslations } from "@/components/i18n/I18nProvider"
import type { BodyId, LifeNeed, LifeNeedId } from "../../types"
import { EVO, archivo } from "../status/evo-skin"
import { MM } from "../hud/tokens"
import { PORTRAIT } from "../portraits"
import { NEEDS_TIMING, freshNeedsMemory, pickNeed, type NeedLine } from "./needs-logic"
import { DRAWER_EVENT } from "../hud/hud-kit"
import s from "../hud/hud.module.css"

type Tr = (key: string, fallback: string) => string

function sentence(id: LifeNeedId, t: Tr, hours?: number) {
  switch (id) {
    case "hospital":
      return t("needHospital", "Estou internado. Preciso me recuperar.")
    case "unwell":
      return t("needUnwell", "Não estou me sentindo bem. Preciso de atendimento.")
    case "exhausted":
      return t("needExhausted", "Estou exausto. Preciso descansar.")
    case "starving":
      return t("needStarving", "Nossa, estou com muita fome!")
    case "hungry":
      return t("needHungry", "Estou ficando com fome.")
    case "sleep":
      return t("needSleep", "Já estou há {h} horas acordado. Preciso dormir.").replace("{h}", String(hours ?? 16))
    case "tired":
      return t("needTired", "Estou cansado.")
    case "stressed":
      return t("needStressed", "Estou muito estressado. Preciso de uma pausa.")
    case "aging":
      return t("needAging", "Sinto o peso da idade.")
  }
}

/**
 * As duas linhas do balão: a principal (o que ele sente) e a complementar
 * (há quantas horas está acordado — número real, vindo da vida).
 */
export function needLines(line: NeedLine, t: Tr): { main: string; extra: string | null } {
  const [first, second] = line.ids
  const awake = line.hours != null ? t("needAwakeHours", "Já estou há {h} horas acordado.").replace("{h}", String(line.hours)) : null
  if (first === "sleep") return { main: t("needSleepMain", "Preciso dormir."), extra: awake }
  if (second === "sleep") return { main: sentence(first, t), extra: awake }
  return { main: sentence(first, t), extra: null }
}

function NeedIcon({ id }: { id: LifeNeedId }) {
  const cls = "h-4 w-4"
  if (id === "hospital" || id === "unwell") return <HeartPulse className={cls} />
  if (id === "starving" || id === "hungry") return <Utensils className={cls} />
  if (id === "sleep") return <Moon className={cls} />
  if (id === "exhausted") return <Bed className={cls} />
  if (id === "tired") return <BatteryLow className={cls} />
  if (id === "stressed") return <Flame className={cls} />
  return <Hourglass className={cls} />
}

/**
 * `needs` + `tick`: a lista da última mensagem "life" (o tick sobe a cada
 * mensagem, mesmo se a lista vier igual — é assim que o lembrete das graves
 * acontece sem relógio próprio).
 */
export default function NeedsBubble({ needs, tick, body, below = 0, onOpenStatus }: { needs: LifeNeed[]; tick: number; body: BodyId; /** px abaixo do topo (faixa da visita) */ below?: number; onOpenStatus?: () => void }) {
  const t = useTranslations("MeuMundo")
  const memory = useRef(freshNeedsMemory())
  const [line, setLine] = useState<NeedLine | null>(null)
  // Com a gaveta do menu aberta o balão some (ele cobriria o topo do menu).
  const [drawerOpen, setDrawerOpen] = useState(false)
  useEffect(() => {
    const on = (e: Event) => setDrawerOpen(!!(e as CustomEvent<boolean>).detail)
    window.addEventListener(DRAWER_EVENT, on)
    return () => window.removeEventListener(DRAWER_EVENT, on)
  }, [])
  useEffect(() => {
    const r = pickNeed(needs, memory.current, Date.now())
    memory.current = r.memory
    if (!r.line) return
    setLine(r.line)
    const id = setTimeout(() => setLine(null), NEEDS_TIMING.SHOW_MS + (r.line.level <= 2 ? 4000 : 0))
    return () => clearTimeout(id)
    // `needs` muda junto com `tick` (mesma mensagem).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick])
  if (!line || drawerOpen) return null
  const urgent = line.level <= 2
  const { main, extra } = needLines(line, t)
  return (
    <div
      className="pointer-events-none fixed left-0 z-[72] px-3"
      style={{ top: `calc(max(12px, env(safe-area-inset-top)) + ${below}px)`, paddingLeft: "max(12px, env(safe-area-inset-left))" }}
      role="status"
      aria-live="polite"
    >
      <div
        className={`${archivo.className} ${s.enterTop} pointer-events-auto flex max-w-[min(92vw,440px)] items-start gap-3 p-3 pr-1.5 max-[759px]:max-w-[min(92vw,360px)] max-[759px]:gap-2.5 max-[759px]:p-2 max-[759px]:pr-1`}
        style={{ borderRadius: MM.radius.panel, background: MM.surface, border: `1px solid ${urgent ? MM.rubyBorder : MM.border}`, boxShadow: MM.shadow }}
      >
        <div className="relative shrink-0">
          {/* eslint-disable-next-line @next/next/no-img-element -- retrato pequeno, local, só no jogo (admin) */}
          <img src={PORTRAIT[body] ?? PORTRAIT.normal} alt="" width={56} height={56} className="h-14 w-14 rounded-full object-cover max-[759px]:h-11 max-[759px]:w-11" style={{ boxShadow: `0 0 0 2px ${MM.ruby}` }} />
          <span
            className="absolute -bottom-1 -right-1 inline-flex h-6 w-6 items-center justify-center rounded-full max-[759px]:h-5 max-[759px]:w-5"
            style={{ background: MM.drawer, color: urgent ? "#ff7b86" : MM.gold, border: `1px solid ${MM.border}` }}
            aria-hidden
          >
            <NeedIcon id={line.ids[0]} />
          </span>
        </div>
        <div className="flex min-w-0 flex-1 flex-col justify-center gap-0.5 py-0.5">
          <p className="text-[15px] font-semibold leading-5 max-[759px]:text-[14px] max-[759px]:leading-[18px]" style={{ color: EVO.branco }}>
            {main}
          </p>
          {extra && (
            <p className="text-[13px] leading-[18px] max-[759px]:text-[12px] max-[759px]:leading-4" style={{ color: MM.muted }}>
              {extra}
            </p>
          )}
          {onOpenStatus && (
            <button
              type="button"
              onClick={onOpenStatus}
              className="mt-0.5 self-start py-0.5 text-[13px] font-semibold underline decoration-1 underline-offset-[3px] max-[759px]:text-[12px]"
              style={{ color: MM.gold }}
            >
              {t("needOpenStatus", "Ver status")}
            </button>
          )}
        </div>
        <button type="button" onClick={() => setLine(null)} className="-my-1 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ color: MM.muted }} aria-label={t("close", "Fechar")}>
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
