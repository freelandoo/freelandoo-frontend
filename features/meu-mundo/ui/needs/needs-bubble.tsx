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
import { Chamfer, EVO, archivo } from "../status/evo-skin"
import { PORTRAIT } from "../portraits"
import { NEEDS_TIMING, freshNeedsMemory, pickNeed, type NeedLine } from "./needs-logic"

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

/** Frase do balão: uma necessidade ou a combinação com o sono. */
export function needText(line: NeedLine, t: Tr) {
  const [first, second] = line.ids
  if (second !== "sleep") return sentence(first, t, line.hours)
  const h = String(line.hours ?? 16)
  if (first === "starving") return t("needStarvingSleep", "Estou com muita fome e já estou há {h} horas acordado.").replace("{h}", h)
  if (first === "hungry") return t("needHungrySleep", "Estou ficando com fome e já estou há {h} horas acordado.").replace("{h}", h)
  return `${sentence(first, t)} ${t("needAlsoSleep", "E já estou há {h} horas acordado.").replace("{h}", h)}`
}

function NeedIcon({ id }: { id: LifeNeedId }) {
  const cls = "h-5 w-5"
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
export default function NeedsBubble({ needs, tick, body, onOpenStatus }: { needs: LifeNeed[]; tick: number; body: BodyId; onOpenStatus?: () => void }) {
  const t = useTranslations("MeuMundo")
  const memory = useRef(freshNeedsMemory())
  const [line, setLine] = useState<NeedLine | null>(null)
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
  if (!line) return null
  const urgent = line.level <= 2
  return (
    <div
      className="fl-sharp pointer-events-none fixed left-0 z-[72] px-3"
      style={{ top: "calc(max(12px, env(safe-area-inset-top)) + 96px)", paddingLeft: "max(12px, env(safe-area-inset-left))" }}
      role="status"
      aria-live="polite"
    >
      <Chamfer cut={12} border={urgent ? EVO.perigo : EVO.dourado} width={1.5} className="pointer-events-auto max-w-[min(92vw,420px)]">
        <div className="flex items-stretch gap-2.5 p-2 pr-1.5">
          {/* eslint-disable-next-line @next/next/no-img-element -- retrato pequeno, local, só no jogo (admin) */}
          <img src={PORTRAIT[body] ?? PORTRAIT.normal} alt="" width={56} height={56} className="h-14 w-14 shrink-0 rounded-full object-cover" style={{ boxShadow: `0 0 0 2px ${urgent ? EVO.perigo : EVO.dourado}` }} />
          <div className="flex min-w-0 flex-1 flex-col justify-center">
            <div className="flex items-center gap-1.5" style={{ color: urgent ? "#ff6b78" : EVO.ambar }}>
              <NeedIcon id={line.ids[0]} />
              {line.ids[1] && <NeedIcon id={line.ids[1]} />}
            </div>
            <p className={`${archivo.className} mt-0.5 text-[14px] font-semibold leading-5`} style={{ color: EVO.branco }}>
              {needText(line, t)}
            </p>
            {onOpenStatus && (
              <button type="button" onClick={onOpenStatus} className={`${archivo.className} mt-0.5 self-start text-[12px] font-semibold uppercase tracking-[0.14em] underline`} style={{ color: EVO.douradoClaro }}>
                {t("needOpenStatus", "Ver status")}
              </button>
            )}
          </div>
          <button type="button" onClick={() => setLine(null)} className="inline-flex h-8 w-8 shrink-0 items-center justify-center self-start" style={{ color: EVO.mudo }} aria-label={t("close", "Fechar")}>
            <X className="h-4 w-4" />
          </button>
        </div>
      </Chamfer>
    </div>
  )
}
