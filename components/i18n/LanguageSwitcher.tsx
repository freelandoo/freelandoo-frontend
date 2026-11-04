"use client"

import { Globe } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  LOCALE_FLAGS,
  LOCALE_LABELS,
  SUPPORTED_LOCALES,
} from "@/lib/i18n/config"
import { useTranslations } from "@/components/i18n/I18nProvider"
import { useLocaleSwitch } from "@/components/i18n/use-locale-switch"

interface LanguageSwitcherProps {
  variant?: "compact" | "full" | "icon"
  className?: string
}

export function LanguageSwitcher({ variant = "compact", className }: LanguageSwitcherProps) {
  const { locale, pending, change } = useLocaleSwitch()
  const t = useTranslations("Common")

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        type="button"
        className={
          (variant === "icon"
            ? "inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-white/85 transition hover:border-primary/40 hover:bg-primary/10 hover:text-primary disabled:opacity-50 "
            : "inline-flex h-9 min-w-16 items-center justify-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-2.5 text-xs font-semibold text-white/85 transition hover:border-primary/40 hover:bg-primary/10 hover:text-primary disabled:opacity-50 ") +
          (className ?? "")
        }
        disabled={pending}
        aria-label={t("language", "Idioma")}
      >
        <Globe className="h-4 w-4" />
        {variant !== "icon" && (
          <span aria-hidden="true" className="font-mono text-[11px] leading-none">{LOCALE_FLAGS[locale]}</span>
        )}
        {variant === "full" && <span>{LOCALE_LABELS[locale]}</span>}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="z-[120] min-w-[160px]">
        {SUPPORTED_LOCALES.map((code) => (
          <DropdownMenuItem
            key={code}
            onSelect={() => change(code)}
            className={code === locale ? "font-semibold" : undefined}
          >
            <span className="mr-2" aria-hidden="true">
              {LOCALE_FLAGS[code]}
            </span>
            {LOCALE_LABELS[code]}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
