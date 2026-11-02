// features/meu-mundo/ui/rewards/reward-grammar.ts — mm3d-59: a GRAMÁTICA dos ganhos.
//
// Uma régua só para mundo, minijogos e menus: cada recurso tem símbolo, nome,
// cor e o lado "bom" da mudança (reduzir estresse é bom; aumentar é ruim).
// Os números exibidos são o delta EFETIVO que o servidor gravou no recibo
// (um item de +20 energia consumido em 95 mostra +5).

import { AE } from "../kit/aether-tokens"

export const ATTR_META = {
  strength: { icon: "⚒", labelKey: "attrStrength", label: "Força", color: "#FF8A3D" },
  intelligence: { icon: "✶", labelKey: "attrIntelligence", label: "Inteligência", color: "#3FA9FF" },
  dexterity: { icon: "◈", labelKey: "attrDexterity", label: "Destreza", color: AE.aether },
  speed: { icon: "➹", labelKey: "attrSpeed", label: "Velocidade", color: "#C6FF4D" },
} as const

/** `up` = qual direção é boa para quem joga. */
export const VITAL_META = {
  energy: { icon: "⚡", labelKey: "vitalEnergy", label: "Energia", up: true },
  stress: { icon: "◎", labelKey: "vitalStress", label: "Estresse", up: false },
  satiety: { icon: "◒", labelKey: "vitalSatiety", label: "Saciedade", up: true },
  mood: { icon: "☺", labelKey: "vitalMood", label: "Humor", up: true },
  health: { icon: "✚", labelKey: "vitalHealth", label: "Saúde", up: true },
} as const

export function toneOf(key: string, delta: number): "good" | "bad" {
  const m = VITAL_META[key as keyof typeof VITAL_META]
  const up = m ? m.up : true
  return (delta >= 0) === up ? "good" : "bad"
}

/** "+0,3" / "−5" (sinal de menos de verdade, vírgula decimal pela regra do jogo). */
export function fmtDelta(v: number, digits = 1): string {
  const abs = Math.abs(v)
  const s = digits === 0 ? String(Math.round(abs)) : abs.toFixed(digits).replace(/\.?0+$/, "").replace(".", ",")
  return `${v < 0 ? "−" : "+"}${s}`
}
