"use client"

// features/meu-mundo/ui/status/skin-colors.tsx — CORES do personagem (mm3d-36).
//
// Abre pelo botão "Cores" do vestuário (só no padrão e na feminina). Quatro
// linhas — camiseta, calça, pele, cabelo — com as bolinhas da paleta
// (avatar-colors.ts, espelho do back). Cada toque troca o rascunho e o palco
// mostra na hora; "Salvar cores" grava na conta (todos passam a ver). De
// graça e sem limite. Celular: bolinhas menores, sem rolagem.

import { Check, Palette, X } from "lucide-react"
import { PALETTE, PARTS, lookCode, parseLook, type ColorPart } from "../../avatar-colors"
import { EvoButton } from "../hud/hud-kit"
import { Chamfer, EVO, teko } from "./evo-skin"
import { MM } from "../hud/tokens"

type Tr = (key: string, fallback: string) => string

const PART_LABEL: Record<ColorPart, [string, string]> = {
  shirt: ["skinShirt", "Camiseta"],
  pants: ["skinPants", "Calça"],
  skin: ["skinSkinTone", "Pele"],
  hair: ["skinHair", "Cabelo"],
}

/** Nome visível de cada cor (bolinha: aria-label e dica). */
const COLOR_NAME: Record<string, string> = {
  red: "Vermelho",
  white: "Branco",
  black: "Preto",
  gray: "Cinza",
  navy: "Azul-marinho",
  sky: "Azul-céu",
  green: "Verde",
  mint: "Verde-menta",
  yellow: "Amarelo",
  orange: "Laranja",
  pink: "Rosa",
  purple: "Roxo",
  jeans: "Jeans",
  lightJeans: "Jeans claro",
  beige: "Bege",
  brown: "Marrom",
  olive: "Verde-oliva",
  wine: "Vinho",
  royal: "Azul-royal",
  s0: "Pele 1 (mais clara)",
  s1: "Pele 2",
  s2: "Pele 3",
  s3: "Pele 4",
  s4: "Pele 5",
  s5: "Pele 6",
  s6: "Pele 7",
  s7: "Pele 8 (mais escura)",
  darkBrown: "Castanho-escuro",
  copper: "Acobreado",
  darkBlonde: "Loiro-escuro",
  blonde: "Loiro",
  blue: "Azul",
}

export interface SkinColorsProps {
  t: Tr
  /** Código em edição (rascunho) e o salvo. */
  draft: string
  saved: string
  busy: boolean
  onPick: (look: string) => void
  onSave: () => void
  onClose: () => void
}

export function SkinColors({ t, draft, saved, busy, onPick, onSave, onClose }: SkinColorsProps) {
  const idx = parseLook(draft)
  const dirty = lookCode(idx) !== lookCode(parseLook(saved))
  const pick = (part: number, i: number) => {
    const next = [...idx]
    next[part] = i
    onPick(lookCode(next))
  }
  return (
    <Chamfer cut={18} fill={MM.surface} className="w-full" style={{ boxShadow: MM.shadow }}>
      <div className="flex flex-col gap-2.5 p-4 max-[759px]:gap-1.5 max-[759px]:p-2.5 [@media(max-height:520px)]:gap-1.5 [@media(max-height:520px)]:p-2.5">
        <div className="flex items-center justify-between gap-2">
          <div className={`${teko.className} flex items-center gap-2 text-[26px] font-bold uppercase leading-none max-[759px]:text-[19px] [@media(max-height:520px)]:text-[19px]`} style={{ color: EVO.branco }}>
            <Palette className="h-5 w-5 max-[759px]:h-4 max-[759px]:w-4 [@media(max-height:520px)]:h-4 [@media(max-height:520px)]:w-4" style={{ color: EVO.douradoClaro }} /> {t("skinColors", "Cores")}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("skinColorsClose", "Fechar cores")}
            className="flex h-9 w-9 items-center justify-center max-[759px]:h-7 max-[759px]:w-7 [@media(max-height:520px)]:h-7 [@media(max-height:520px)]:w-7"
            style={{ borderRadius: 999, background: MM.surface, border: `1px solid ${MM.border}`, color: EVO.branco }}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        {PARTS.map((part, p) => (
          <div key={part} className="flex items-center gap-3 max-[759px]:gap-2 [@media(max-height:520px)]:gap-2">
            <span className={`${teko.className} w-[78px] shrink-0 text-[17px] uppercase leading-none tracking-[0.1em] max-[759px]:w-[64px] max-[759px]:text-[13px] [@media(max-height:520px)]:w-[64px] [@media(max-height:520px)]:text-[13px]`} style={{ color: EVO.douradoClaro }}>
              {t(PART_LABEL[part][0], PART_LABEL[part][1])}
            </span>
            <div className="flex flex-wrap gap-1.5 max-[759px]:gap-[3px] [@media(max-height:520px)]:gap-[3px]">
              {PALETTE[part].map((sw, i) => {
                const on = idx[p] === i
                const label = t(`clr_${sw.id}`, COLOR_NAME[sw.id] ?? sw.id)
                return (
                  <button
                    key={sw.id}
                    type="button"
                    aria-label={label}
                    aria-pressed={on}
                    title={label}
                    onClick={() => pick(p, i)}
                    className="h-7 w-7 shrink-0 max-[759px]:h-5 max-[759px]:w-5 [@media(max-height:520px)]:h-5 [@media(max-height:520px)]:w-5"
                    style={{
                      borderRadius: 999,
                      background: sw.hex,
                      border: `2px solid ${on ? MM.ruby : "rgba(255,255,255,0.35)"}`,
                      boxShadow: on ? `0 0 0 2px ${EVO.branco}` : "none",
                    }}
                  />
                )
              })}
            </div>
          </div>
        ))}
        <div className="flex flex-wrap items-center justify-end gap-2 pt-1 max-[759px]:pt-0 [@media(max-height:520px)]:pt-0">
          <EvoButton variant="primary" size="lg" disabled={busy || !dirty} onClick={onSave} icon={<Check className="h-5 w-5 max-[759px]:h-4 max-[759px]:w-4 [@media(max-height:520px)]:h-4 [@media(max-height:520px)]:w-4" />}>
            {t("skinSaveColors", "Salvar cores")}
          </EvoButton>
        </div>
      </div>
    </Chamfer>
  )
}
