"use client"

// Item "Som" da gaveta (áudio S1, 2026-11-11): o mesmo nas três telas (bairro, centro, casa).
// Cada toque passa para o próximo nível (ligado → baixo → desligado); a escolha fica no
// navegador (engine/audio/mixer.ts, conveniência por aparelho) e vale na hora.

import { useEffect, useState } from "react"
import { Volume1, Volume2, VolumeX } from "lucide-react"
import { useTranslations } from "@/components/i18n/I18nProvider"
import { audioPrefs, setAudioPrefs, uiSound } from "../../engine/audio"
import type { DrawerItem } from "./hud-kit"

type Level = "on" | "low" | "off"
const ORDER: Level[] = ["on", "low", "off"]
const MASTER: Record<Exclude<Level, "off">, number> = { on: 0.9, low: 0.4 }

const levelOf = (): Level => {
  const p = audioPrefs()
  return p.muted ? "off" : p.master <= 0.5 ? "low" : "on"
}

export function useSoundItem(): DrawerItem {
  const t = useTranslations("MeuMundo")
  const [level, setLevel] = useState<Level>("on")
  // localStorage só existe no navegador: lê depois de montar.
  useEffect(() => setLevel(levelOf()), [])
  const label: Record<Level, string> = {
    on: t("soundOn", "Ligado"),
    low: t("soundLow", "Baixo"),
    off: t("soundOff", "Desligado"),
  }
  return {
    id: "sound",
    label: t("menuSound", "Som"),
    hint: label[level],
    icon: level === "off" ? <VolumeX className="h-5 w-5" /> : level === "low" ? <Volume1 className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />,
    // Troca na hora e mostra o valor novo: a gaveta não fecha.
    keepOpen: true,
    onSelect: () => {
      const next = ORDER[(ORDER.indexOf(level) + 1) % ORDER.length]
      setLevel(next)
      setAudioPrefs(next === "off" ? { muted: true } : { muted: false, master: MASTER[next] })
      if (next !== "off") uiSound("click")
    },
  }
}
