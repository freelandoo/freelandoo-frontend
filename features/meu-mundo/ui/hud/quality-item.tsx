"use client"

// Item "Gráficos" da gaveta (mm3d-19): o mesmo nas três telas (bairro, centro,
// casa). Cada toque passa para a próxima qualidade; a escolha fica no navegador
// (conveniência por aparelho) e vale na hora para o jogo aberto.

import { useEffect, useState } from "react"
import { Gauge } from "lucide-react"
import { useTranslations } from "@/components/i18n/I18nProvider"
import { detectTier, loadQualityChoice, saveQualityChoice, type QualityChoice } from "../../engine/quality"
import type { DrawerItem } from "./hud-kit"

const ORDER: QualityChoice[] = ["auto", "low", "mid", "high"]

const LABEL: Record<QualityChoice, [string, string]> = {
  auto: ["qualityAuto", "Automática"],
  low: ["qualityLow", "Baixa"],
  mid: ["qualityMid", "Média"],
  high: ["qualityHigh", "Alta"],
}

export function useQualityItem(apply: (c: QualityChoice) => void): DrawerItem {
  const t = useTranslations("MeuMundo")
  const [choice, setChoice] = useState<QualityChoice>("auto")
  const [tier, setTier] = useState<QualityChoice | null>(null)
  // localStorage e a GPU só existem no navegador: lê depois de montar.
  useEffect(() => {
    setChoice(loadQualityChoice())
    setTier(detectTier())
  }, [])

  const name = (c: QualityChoice) => t(LABEL[c][0], LABEL[c][1])
  const hint = choice === "auto" && tier ? `${name("auto")} · ${name(tier)}` : name(choice)
  return {
    id: "quality",
    label: t("menuQuality", "Gráficos"),
    hint,
    icon: <Gauge className="h-5 w-5" />,
    onSelect: () => {
      const next = ORDER[(ORDER.indexOf(choice) + 1) % ORDER.length]
      setChoice(next)
      saveQualityChoice(next)
      apply(next)
    },
  }
}
