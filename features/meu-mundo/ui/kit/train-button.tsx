"use client"

// features/meu-mundo/ui/kit/train-button.tsx — o botão TREINAR de todo minijogo (pedido do Alex,
// 2026-11-10: "em todos os mini jogos crie um botão rosa escrito treinar, e aí a pessoa entra
// sozinha"). Rosa, igual em todos: entra na hora, sem tela de espera e sem sala — o jogo roda no
// aparelho. Treino não dá prêmio (prêmio só sai da sala, que o servidor decide).

import { Dumbbell } from "lucide-react"
import { useTranslations } from "@/components/i18n/I18nProvider"

export const TRAIN_PINK = "#FF5FA8"

export function TrainButton({
  onTrain,
  sub,
  className = "",
  big = false,
}: {
  onTrain: () => void
  /** Linha de baixo; padrão "Sozinho · sem esperar". */
  sub?: string
  className?: string
  /** Altura do botão principal da tela (Jetpack, Rolê). */
  big?: boolean
}) {
  const t = useTranslations("MeuMundo")
  return (
    <button
      type="button"
      onClick={onTrain}
      className={`flex flex-col items-center justify-center rounded-none px-4 text-white transition-transform active:scale-[0.98] motion-reduce:transition-none ${big ? "min-h-[58px] max-[759px]:min-h-[52px]" : "min-h-[52px]"} ${className}`}
      style={{ background: `linear-gradient(180deg, ${TRAIN_PINK} 0%, #d93a86 100%)`, border: "1px solid rgba(255,255,255,0.35)", boxShadow: "0 0 18px rgba(255,95,168,0.35)" }}
    >
      <span className={`flex items-center gap-2 font-black uppercase italic tracking-[0.05em] ${big ? "text-[20px] max-[759px]:text-[17px]" : "text-[16px] max-[420px]:text-[14px]"}`}>
        <Dumbbell className="h-5 w-5 shrink-0" />
        {t("mmTrain", "Treinar")}
      </span>
      <span className="text-[11px] font-semibold not-italic leading-tight opacity-90">{sub ?? t("mmTrainSub", "Sozinho · sem esperar")}</span>
    </button>
  )
}
