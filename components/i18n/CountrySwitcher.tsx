"use client"

import { useEffect, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { MapPin } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { setCountryCookie } from "@/lib/i18n/actions"
import {
  useCountry,
  useLocale,
  useTranslations,
} from "@/components/i18n/I18nProvider"

interface Country {
  iso2: string
  name_pt: string
  name_en: string
  name_es: string
  default_locale: string
  currency: string
}

const FLAG_BY_ISO2: Record<string, string> = {
  BR: "🇧🇷",
  US: "🇺🇸",
  ES: "🇪🇸",
  MX: "🇲🇽",
  PT: "🇵🇹",
  AR: "🇦🇷",
  CL: "🇨🇱",
  CO: "🇨🇴",
  PE: "🇵🇪",
  UY: "🇺🇾",
  CA: "🇨🇦",
  GB: "🇬🇧",
}

function getName(country: Country, locale: string): string {
  if (locale === "en") return country.name_en
  if (locale === "es") return country.name_es
  return country.name_pt
}

interface CountrySwitcherProps {
  variant?: "compact" | "full"
  className?: string
  showAllOption?: boolean
}

export function CountrySwitcher({
  variant = "compact",
  className,
  showAllOption = false,
}: CountrySwitcherProps) {
  const router = useRouter()
  const country = useCountry()
  const locale = useLocale()
  const t = useTranslations("Countries")
  const [countries, setCountries] = useState<Country[]>([])
  const [pending, startTransition] = useTransition()

  useEffect(() => {
    let cancelled = false
    fetch("/api/countries")
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        if (!cancelled && Array.isArray(data)) setCountries(data)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  const handleSelect = (iso2: string) => {
    if (iso2 === country || pending) return
    startTransition(async () => {
      await setCountryCookie(iso2)
      const token = typeof window !== "undefined" ? localStorage.getItem("token") : null
      if (token && iso2 !== "ALL") {
        fetch("/api/users/me/country", {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ country: iso2 }),
        }).catch(() => {})
      }
      router.refresh()
    })
  }

  const currentFlag = FLAG_BY_ISO2[country] || "🌐"
  const currentName =
    countries.find((c) => c.iso2 === country)
      ? getName(countries.find((c) => c.iso2 === country)!, locale)
      : country

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        type="button"
        className={
          "inline-flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs text-white/80 hover:bg-white/10 hover:text-white disabled:opacity-50 " +
          (className ?? "")
        }
        disabled={pending}
        aria-label={t("selectLabel", "Selecione um país")}
      >
        <MapPin className="h-4 w-4" />
        <span aria-hidden="true">{currentFlag}</span>
        {variant === "full" && <span>{currentName}</span>}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="max-h-[320px] min-w-[200px] overflow-y-auto">
        {showAllOption && (
          <>
            <DropdownMenuItem onSelect={() => handleSelect("ALL")}>
              <span className="mr-2" aria-hidden="true">🌐</span>
              {t("allCountries", "Todos os países")}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        )}
        {countries.map((c) => (
          <DropdownMenuItem
            key={c.iso2}
            onSelect={() => handleSelect(c.iso2)}
            className={c.iso2 === country ? "font-semibold" : undefined}
          >
            <span className="mr-2" aria-hidden="true">
              {FLAG_BY_ISO2[c.iso2] || "🏳️"}
            </span>
            {getName(c, locale)}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
