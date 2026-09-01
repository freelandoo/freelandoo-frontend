"use client"

// Paleta do site: presets prontos + ajuste fino por token.
//
// Os presets vêm PRIMEIRO e os campos hexadecimais depois porque escolher seis
// cores que combinam é o trabalho difícil — quem quiser mexer em uma delas
// ainda pode, mas ninguém precisa começar de seis campos vazios.

import { useEffect, useRef, useState } from "react"
import { Check, X } from "lucide-react"
import { DEFAULT_SITE_THEME, type SiteColorTheme } from "@/types/community-site"

type Preset = { key: string; labelKey: string; fallback: string; theme: SiteColorTheme }

export const SITE_PALETTE_PRESETS: Preset[] = [
  {
    key: "freelandoo",
    labelKey: "paletteFreelandoo",
    fallback: "Dourado Freelandoo",
    theme: DEFAULT_SITE_THEME,
  },
  {
    key: "absolute",
    labelKey: "paletteAbsolute",
    fallback: "Preto absoluto",
    theme: {
      primary: "#ffffff",
      background: "#000000",
      surface: "#101010",
      textPrimary: "#fafafa",
      textSecondary: "#8a8a8a",
      accent: "#d4d4d4",
    },
  },
  {
    key: "amber",
    labelKey: "paletteAmber",
    fallback: "Âmbar escuro",
    theme: {
      primary: "#ff8c2e",
      background: "#150d05",
      surface: "#221606",
      textPrimary: "#fdf3e3",
      textSecondary: "#b39a78",
      accent: "#ffb066",
    },
  },
  {
    key: "cyberpunk",
    labelKey: "paletteCyberpunk",
    fallback: "Cyberpunk",
    theme: {
      primary: "#16c8e8",
      background: "#07070f",
      surface: "#12122a",
      textPrimary: "#eaf6ff",
      textSecondary: "#8f9ac2",
      accent: "#ff1f8e",
    },
  },
  {
    key: "minimal",
    labelKey: "paletteMinimal",
    fallback: "Minimalista claro",
    theme: {
      primary: "#0b0b0d",
      background: "#f5f1e8",
      surface: "#ffffff",
      textPrimary: "#0b0b0d",
      textSecondary: "#5f5a52",
      accent: "#7a6f5d",
    },
  },
  {
    key: "leaf",
    labelKey: "paletteLeaf",
    fallback: "Verde folha",
    theme: {
      primary: "#4fc95a",
      background: "#06120a",
      surface: "#0e2114",
      textPrimary: "#eefaf0",
      textSecondary: "#8fae96",
      accent: "#9ee6a5",
    },
  },
]

const TOKENS: { key: keyof SiteColorTheme; labelKey: string; fallback: string }[] = [
  { key: "primary", labelKey: "tokenPrimary", fallback: "Primária" },
  { key: "accent", labelKey: "tokenAccent", fallback: "Destaque" },
  { key: "background", labelKey: "tokenBackground", fallback: "Fundo" },
  { key: "surface", labelKey: "tokenSurface", fallback: "Superfície" },
  { key: "textPrimary", labelKey: "tokenTextPrimary", fallback: "Texto" },
  { key: "textSecondary", labelKey: "tokenTextSecondary", fallback: "Texto secundário" },
]

/** Mesma regra do backend: só #RGB/#RRGGBB entra. */
function isHex(value: string): boolean {
  return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(value.trim())
}

/**
 * Campo hexadecimal com rascunho local.
 *
 * Um input controlado direto pelo tema seria IMPOSSÍVEL de digitar: "#ab" não
 * é cor válida, então a mudança não subiria, o valor voltaria a ser o antigo e
 * a tecla pareceria não ter funcionado. O rascunho deixa digitar à vontade e só
 * propaga quando vira cor de verdade; ao sair do campo, um valor incompleto
 * volta para o que o tema tem — sem inventar uma cor que ninguém escolheu.
 */
function HexField({ value, onCommit }: { value: string; onCommit: (v: string) => void }) {
  const [draft, setDraft] = useState(value)

  // Preset trocado por fora tem que aparecer aqui também.
  useEffect(() => setDraft(value), [value])

  return (
    <input
      type="text"
      value={draft}
      onChange={(e) => {
        const next = e.target.value
        setDraft(next)
        if (isHex(next)) onCommit(next)
      }}
      onBlur={() => {
        if (!isHex(draft)) setDraft(value)
      }}
      spellCheck={false}
      maxLength={7}
      className="w-[86px] shrink-0 border-2 border-[#0B0B0D] bg-[#1D1810] px-2 py-1 font-mono text-[11px] text-[#F5F1E8] outline-none focus:border-[#F2B705]"
    />
  )
}

export function SiteColorPalettePicker({
  theme,
  onChange,
  onClose,
  t,
}: {
  theme: SiteColorTheme
  onChange: (next: SiteColorTheme) => void
  onClose: () => void
  t: (key: string, fallback: string) => string
}) {
  const ref = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    document.addEventListener("mousedown", onDown)
    document.addEventListener("keydown", onEsc)
    return () => {
      document.removeEventListener("mousedown", onDown)
      document.removeEventListener("keydown", onEsc)
    }
  }, [onClose])

  const activePreset = SITE_PALETTE_PRESETS.find((p) =>
    (Object.keys(p.theme) as (keyof SiteColorTheme)[]).every(
      (k) => p.theme[k].toLowerCase() === (theme[k] || "").toLowerCase()
    )
  )

  return (
    <div
      ref={ref}
      className="absolute right-0 top-full z-50 mt-2 w-[320px] border-2 border-[#0B0B0D] bg-[#15120E] p-3"
      style={{ boxShadow: "6px 6px 0 0 #0B0B0D" }}
    >
      <div className="mb-3 flex items-center justify-between">
        <span className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#9A938A]">
          {t("paletteTitle", "Paleta de cores")}
        </span>
        <button
          type="button"
          onClick={onClose}
          aria-label={t("close", "Fechar")}
          className="grid h-6 w-6 place-items-center border-2 border-[#0B0B0D] bg-[#1D1810] text-[#F5F1E8]"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {SITE_PALETTE_PRESETS.map((preset) => (
          <button
            key={preset.key}
            type="button"
            onClick={() => onChange(preset.theme)}
            className="flex flex-col gap-1.5 border-2 border-[#0B0B0D] p-2 text-left"
            style={{
              background: preset.theme.background,
              outline: activePreset?.key === preset.key ? "2px solid #F2B705" : undefined,
              outlineOffset: "2px",
            }}
          >
            <span className="flex gap-1">
              {[preset.theme.primary, preset.theme.accent, preset.theme.surface].map((c, i) => (
                <span
                  key={i}
                  className="h-4 w-4 border border-[#0B0B0D]"
                  style={{ background: c }}
                />
              ))}
              {activePreset?.key === preset.key && (
                <Check className="ml-auto h-4 w-4" style={{ color: preset.theme.primary }} />
              )}
            </span>
            <span
              className="text-[9px] font-extrabold uppercase leading-tight tracking-[0.08em]"
              style={{ color: preset.theme.textPrimary }}
            >
              {t(preset.labelKey, preset.fallback)}
            </span>
          </button>
        ))}
      </div>

      <div className="mt-3 border-t-2 border-[#0B0B0D] pt-3">
        <span className="mb-2 block text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#9A938A]">
          {t("paletteCustom", "Ajuste fino")}
        </span>
        <div className="flex flex-col gap-1.5">
          {TOKENS.map(({ key, labelKey, fallback }) => (
            <label key={key} className="flex items-center gap-2">
              {/* O seletor nativo é a única forma de escolher cor sem
                  reimplementar um color picker — e ele já devolve #rrggbb. */}
              <input
                type="color"
                value={isHex(theme[key]) ? theme[key] : "#000000"}
                onChange={(e) => onChange({ ...theme, [key]: e.target.value })}
                aria-label={t(labelKey, fallback)}
                className="h-7 w-9 shrink-0 cursor-pointer border-2 border-[#0B0B0D] bg-transparent p-0"
              />
              <span className="min-w-0 flex-1 truncate text-[10px] font-extrabold uppercase tracking-[0.1em] text-[#9A938A]">
                {t(labelKey, fallback)}
              </span>
              <HexField value={theme[key]} onCommit={(v) => onChange({ ...theme, [key]: v })} />
            </label>
          ))}
        </div>
      </div>
    </div>
  )
}
