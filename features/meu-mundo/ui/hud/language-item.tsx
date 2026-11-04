"use client"

// Idioma do jogo. Na gaveta, cada toque passa para o próximo e a gaveta segue
// aberta, como em "Gráficos". O botão solto serve à escolha de classe, que abre
// antes do jogo e não tem gaveta.

import { useMemo } from "react"
import { Languages } from "lucide-react"
import { useTranslations } from "@/components/i18n/I18nProvider"
import { useLocaleSwitch } from "@/components/i18n/use-locale-switch"
import { LOCALE_FLAGS, LOCALE_LABELS } from "@/lib/i18n/config"
import type { DrawerItem } from "./hud-kit"
import { MM } from "./tokens"

export function useLanguageItem(): DrawerItem {
  const t = useTranslations("MeuMundo")
  const { locale, cycle } = useLocaleSwitch()
  return useMemo(
    () => ({
      id: "language",
      label: t("menuLanguage", "Idioma"),
      hint: LOCALE_LABELS[locale],
      icon: <Languages className="h-5 w-5" />,
      keepOpen: true,
      onSelect: cycle,
    }),
    [t, locale, cycle],
  )
}

export function LanguageButton() {
  const t = useTranslations("MeuMundo")
  const { locale, cycle } = useLocaleSwitch()
  return (
    <button
      type="button"
      onClick={cycle}
      aria-label={`${t("menuLanguage", "Idioma")}: ${LOCALE_LABELS[locale]}`}
      className="inline-flex h-7 items-center gap-1.5 rounded-lg border px-2 text-[11px] font-bold"
      style={{ borderColor: "rgba(255,255,255,.18)", color: MM.text }}
    >
      <Languages className="h-4 w-4" />
      {LOCALE_FLAGS[locale]}
    </button>
  )
}
