"use client"

import { useEffect, useState } from "react"
import { Handshake } from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"
import { useTranslations } from "@/components/i18n/I18nProvider"
import { cn } from "@/lib/utils"

interface Props {
  allowed: boolean
  onAllowedChange: (allowed: boolean) => void
  /** % do próprio valor destinada a afiliados. null = usa o padrão da plataforma. */
  percent?: number | null
  onPercentChange?: (percent: number | null) => void
  disabled?: boolean
  className?: string
  /** "dark" (padrão) para fundos escuros; "light" para modais de tema claro. */
  variant?: "dark" | "light"
}

interface Program {
  seller_percent_min: number
  seller_percent_max: number
  default_percent: number
}

const FALLBACK: Program = {
  seller_percent_min: 0,
  seller_percent_max: 50,
  default_percent: 25,
}

/**
 * Opt-in de afiliados por item (curso / produto / serviço).
 *
 * O criador aceita ou recusa e, desde a mig 192, define QUANTO do próprio valor
 * destina ao programa. Vazio = padrão da plataforma. Os trilhos (piso/teto) vêm
 * de GET /me/affiliate/program e são reaplicados no backend — aqui é só UX.
 */
export function AffiliateOptInField({
  allowed,
  onAllowedChange,
  percent = null,
  onPercentChange,
  disabled = false,
  className,
  variant = "dark",
}: Props) {
  const t = useTranslations("Account")
  const light = variant === "light"
  const [program, setProgram] = useState<Program>(FALLBACK)

  useEffect(() => {
    let cancelled = false
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null
    if (!token) return
    fetch("/api/me/affiliate/program", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (cancelled || !d?.program) return
        setProgram({
          seller_percent_min: Number(d.program.seller_percent_min ?? FALLBACK.seller_percent_min),
          seller_percent_max: Number(d.program.seller_percent_max ?? FALLBACK.seller_percent_max),
          default_percent: Number(d.program.default_percent ?? FALLBACK.default_percent),
        })
      })
      .catch(() => {
        /* silencioso: o fallback já é conservador */
      })
    return () => {
      cancelled = true
    }
  }, [])

  const sub = (key: string, fallback: string) =>
    t(key, fallback)
      .replace("{min}", String(program.seller_percent_min))
      .replace("{max}", String(program.seller_percent_max))
      .replace("{default}", String(program.default_percent))

  const handlePercent = (raw: string) => {
    if (!onPercentChange) return
    if (raw.trim() === "") {
      onPercentChange(null)
      return
    }
    const n = Number(raw.replace(",", "."))
    if (!Number.isFinite(n)) return
    onPercentChange(n)
  }

  const outOfRange =
    percent !== null &&
    percent !== undefined &&
    (percent < program.seller_percent_min || percent > program.seller_percent_max)

  return (
    <div
      className={cn(
        "border p-4",
        light
          ? "border-[#0B0B0D]/15 bg-[#0B0B0D]/[0.03]"
          : "border-white/[0.08] bg-white/[0.02]",
        className,
      )}
    >
      <label className="flex cursor-pointer items-start gap-3">
        <Checkbox
          checked={allowed}
          onCheckedChange={(v) => onAllowedChange(v === true)}
          disabled={disabled}
          className="mt-0.5"
        />
        <span className="space-y-1">
          <span
            className={cn(
              "flex items-center gap-1.5 text-sm font-medium",
              light ? "text-[#0B0B0D]" : "text-white",
            )}
          >
            <Handshake className={cn("h-4 w-4", light ? "text-[#b8860b]" : "text-amber-300")} />
            {t("affiliateOptInTitle", "Aceito que afiliados vendam este item")}
          </span>
          <span
            className={cn(
              "block text-[12px] leading-relaxed",
              light ? "text-[#5b554b]" : "text-white/55",
            )}
          >
            {t(
              "affiliateOptInDesc",
              "Afiliados divulgam e vendem por você. Você continua recebendo o mesmo valor — a comissão entra por cima do seu preço.",
            )}
          </span>
        </span>
      </label>

      {allowed && onPercentChange ? (
        <div
          className={cn(
            "mt-3 border-t pt-3",
            light ? "border-[#0B0B0D]/10" : "border-white/[0.06]",
          )}
        >
          <label
            className={cn(
              "mb-1.5 block text-[12px] font-medium",
              light ? "text-[#0B0B0D]" : "text-white/80",
            )}
          >
            {t("affiliatePercentLabel", "Comissão que você oferece")}
          </label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              inputMode="decimal"
              min={program.seller_percent_min}
              max={program.seller_percent_max}
              step="0.5"
              value={percent ?? ""}
              onChange={(e) => handlePercent(e.target.value)}
              disabled={disabled}
              placeholder={sub("affiliatePercentPlaceholder", "Padrão ({default}%)")}
              className={cn(
                "w-32 border px-3 py-2 text-sm outline-none",
                light
                  ? "border-[#0B0B0D]/20 bg-white text-[#0B0B0D] placeholder:text-[#0B0B0D]/35"
                  : "border-white/10 bg-white/[0.04] text-white placeholder:text-white/30",
                outOfRange && "border-red-500",
              )}
            />
            <span className={cn("text-sm", light ? "text-[#5b554b]" : "text-white/50")}>%</span>
          </div>
          <p
            className={cn(
              "mt-1.5 text-[11px] leading-relaxed",
              outOfRange
                ? "text-red-500"
                : light
                  ? "text-[#5b554b]"
                  : "text-white/45",
            )}
          >
            {outOfRange
              ? sub("affiliatePercentInvalid", "Use um valor entre {min}% e {max}%.")
              : sub(
                  "affiliatePercentHint",
                  "Entre {min}% e {max}% do seu valor. Vazio usa o padrão da plataforma ({default}%).",
                )}
          </p>
        </div>
      ) : null}
    </div>
  )
}
