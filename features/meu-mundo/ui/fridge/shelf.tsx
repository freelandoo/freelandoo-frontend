"use client"

// features/meu-mundo/ui/fridge/shelf.tsx — a PRATELEIRA EM ARCO (mm3d-28):
// cards verticais em arco, o do centro destacado. Peça única da geladeira e
// do Mercado do STATUS (pedido do Alex, 2026-10-25: as comidas em cards também
// no Mercado) — card escrito duas vezes diverge em silêncio.
// B5: a prateleira e o card moraram para o kit (kit/shelf-arc.tsx); aqui ficam
// os textos de efeito e as reexportações de sempre.

import { EVO } from "../status/evo-skin"
import { hoursText } from "../status/status-pages"
import type { Effect } from "./fridge-logic"

type Tr = (key: string, fallback: string) => string

export const ICE_DIM = "rgba(191,230,255,0.35)"

export function effectText(e: Effect, t: Tr) {
  const n = (v = 0) => `${v > 0 ? "+" : ""}${v}`
  switch (e.key) {
    case "satiety":
      return t("frEffSatiety", "{n} saciedade").replace("{n}", n(e.value))
    case "health":
      return t("frEffHealth", "{n} saúde").replace("{n}", n(e.value))
    case "energy":
      return t("frEffEnergy", "{n} energia").replace("{n}", n(e.value))
    case "mood":
      return t("frEffMood", "{n} humor").replace("{n}", n(e.value))
    case "stress":
      return t("frEffStress", "{n} estresse").replace("{n}", n(e.value))
    case "good":
      return t("mkGood", "faz bem")
    case "bad":
      return t("mkBad", "faz mal")
    case "toxic":
      return t("mkTox", "tóxico")
    case "lasts":
      return t("mkLasts", "dura {h}").replace("{h}", hoursText(e.value ?? 0))
  }
}

export const toneColor = (tone: Effect["tone"]) => (tone === "good" ? EVO.bom : tone === "bad" ? "#ff6b78" : EVO.douradoClaro)

export { Arc, Card, ICE } from "../kit/shelf-arc"
