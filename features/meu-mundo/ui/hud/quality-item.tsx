"use client"

// Item "Gráficos" da gaveta (mm3d-19): o mesmo nas três telas (bairro, centro,
// casa). Cada toque passa para a próxima qualidade; a escolha fica no navegador
// (conveniência por aparelho) e vale na hora para o jogo aberto.

import { useEffect, useState } from "react"
import { Gauge } from "lucide-react"
import { useTranslations } from "@/components/i18n/I18nProvider"
import { QUALITY_EVENT, autoTier, loadQualityChoice, saveQualityChoice, type QualityChoice } from "../../engine/quality"
import type { DrawerItem } from "./hud-kit"
import { applyUiFx } from "../kit/steam/fx-tier"

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
  // No "Automática" mostra o perfil em uso: o medido pelo jogo (E7) ou o palpite do aparelho.
  useEffect(() => {
    setChoice(loadQualityChoice())
    setTier(autoTier())
    const onTier = (e: Event) => {
      setTier((e as CustomEvent<QualityChoice>).detail)
      applyUiFx()
    }
    window.addEventListener(QUALITY_EVENT, onTier)
    return () => window.removeEventListener(QUALITY_EVENT, onTier)
  }, [])

  const name = (c: QualityChoice) => t(LABEL[c][0], LABEL[c][1])
  const hint = choice === "auto" && tier ? `${name("auto")} · ${name(tier)}` : name(choice)
  return {
    id: "quality",
    label: t("menuQuality", "Gráficos"),
    hint,
    icon: <Gauge className="h-5 w-5" />,
    // Troca na hora e mostra o valor novo: a gaveta não fecha.
    keepOpen: true,
    onSelect: () => {
      const next = ORDER[(ORDER.indexOf(choice) + 1) % ORDER.length]
      setChoice(next)
      saveQualityChoice(next)
      applyUiFx()
      apply(next)
    },
  }
}
