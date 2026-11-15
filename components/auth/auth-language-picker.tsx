"use client"

/**
 * Escolha de idioma no topo das telas de entrada (login, cadastro, senha).
 *
 * Quem chega de fora do Brasil precisa achar o idioma ANTES de ler o
 * formulário: por isso os três botões ficam à vista (não num menu), cada um
 * com o nome no próprio idioma. A troca grava o cookie `NEXT_LOCALE` pelo
 * `useLocaleSwitch` — a plataforma inteira segue nesse idioma depois de entrar.
 */
import { LOCALE_LABELS, SUPPORTED_LOCALES } from "@/lib/i18n/config"
import { useTranslations } from "@/components/i18n/I18nProvider"
import { useLocaleSwitch } from "@/components/i18n/use-locale-switch"
import { cn } from "@/lib/utils"

export function AuthLanguagePicker({ className }: { className?: string }) {
  const { locale, pending, change } = useLocaleSwitch()
  const t = useTranslations("Common")

  return (
    <div
      role="radiogroup"
      aria-label={t("language", "Idioma")}
      className={cn("relative z-10 flex items-stretch border-2 border-[#F5F1E8]/25", className)}
    >
      {SUPPORTED_LOCALES.map((code) => {
        const active = code === locale
        return (
          <button
            key={code}
            type="button"
            role="radio"
            aria-checked={active}
            lang={code}
            disabled={pending}
            onClick={() => change(code)}
            className={cn(
              "px-4 py-2 text-sm font-bold transition disabled:opacity-60",
              active
                ? "bg-[#F2B705] text-[#1A1505]"
                : "text-[#F5F1E8]/80 hover:bg-[#F5F1E8]/10 hover:text-[#F5F1E8]",
            )}
          >
            {LOCALE_LABELS[code]}
          </button>
        )
      })}
    </div>
  )
}
