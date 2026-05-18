"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
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
  LOCALE_COOKIE,
  SUPPORTED_LOCALES,
  type Locale,
} from "@/lib/i18n/config"
import { useLocale, useTranslations } from "@/components/i18n/I18nProvider"

interface LanguageSwitcherProps {
  variant?: "compact" | "full"
  className?: string
}

export function LanguageSwitcher({ variant = "compact", className }: LanguageSwitcherProps) {
  const router = useRouter()
  const locale = useLocale()
  const t = useTranslations("Common")
  const [pending, startTransition] = useTransition()

  const handleSelect = (next: Locale) => {
    if (next === locale || pending) return
    startTransition(async () => {
      // 1. Cookie (sempre)
      document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=31536000; SameSite=Lax`

      // 2. Sync backend se autenticado (best-effort, não bloqueia UX)
      const token = typeof window !== "undefined" ? localStorage.getItem("token") : null
      if (token) {
        fetch("/api/users/me/locale", {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ locale: next }),
        }).catch(() => {})
      }

      router.refresh()
    })
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        type="button"
        className={
          "inline-flex h-9 min-w-16 items-center justify-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-2.5 text-xs font-semibold text-white/85 transition hover:border-primary/40 hover:bg-primary/10 hover:text-primary disabled:opacity-50 " +
          (className ?? "")
        }
        disabled={pending}
        aria-label={t("language", "Idioma")}
      >
        <Globe className="h-4 w-4" />
        <span aria-hidden="true" className="font-mono text-[11px] leading-none">{LOCALE_FLAGS[locale]}</span>
        {variant === "full" && <span>{LOCALE_LABELS[locale]}</span>}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[160px]">
        {SUPPORTED_LOCALES.map((code) => (
          <DropdownMenuItem
            key={code}
            onSelect={() => handleSelect(code)}
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
