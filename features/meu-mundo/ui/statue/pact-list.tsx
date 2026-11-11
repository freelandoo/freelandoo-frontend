"use client"

// features/meu-mundo/ui/statue/pact-list.tsx — lore v2 D4: os PACTOS dos deuses vencidos.
//
// Quem vence o deus chefão do setor 10 de um Domínio força um pacto: por 7 dias, o POVO
// dele ganha néctar extra no jogável daquele deus (Noctis = Rolê Noturno). Quem decide e
// paga é o servidor (utils/meuMundoPact.js, no fechamento da semana); aqui só se mostra o
// que está de pé. Usado na aba Semana (carteira de néctar) e no painel da estátua.

import { Moon } from "lucide-react"
import type { DomainPact, WeeklyGame } from "../../data"
import { archivo } from "../status/evo-skin"

type Tr = (key: string, fallback: string) => string

/** O nome do deus de cada Domínio (o pacto é dele). */
const GOD_NAME: Record<string, [string, string]> = {
  noctis: ["pactGodNoctis", "Noctis"],
  zephyra: ["pactGodZephyra", "Zéphyra"],
  maru: ["pactGodMaru", "Marú"],
  aeryn: ["pactGodAeryn", "Aeryn"],
  kragor: ["pactGodKragor", "Kragor"],
  iris: ["pactGodIris", "Íris"],
}

export interface PactColors {
  text: string
  muted: string
  accent: string
  line: string
  bg: string
}

export function PactList({
  pacts,
  bonus = 0.5,
  t,
  locale,
  gameName,
  mine,
  colors,
}: {
  pacts: DomainPact[] | undefined
  bonus?: number
  t: Tr
  locale: string
  gameName: (g: WeeklyGame) => string
  mine?: "raposa" | "vampiro" | null
  colors: PactColors
}) {
  if (!pacts || pacts.length === 0) return null
  const pct = String(Math.round(bonus * 100))
  return (
    <ul className="flex flex-col gap-1" aria-label={t("pactListTitle", "Pactos dos deuses")}>
      {pacts.map((p) => {
        const god = GOD_NAME[p.god] ? t(GOD_NAME[p.god][0], GOD_NAME[p.god][1]) : p.god
        const clan = p.clan === "vampiro" ? t("pactClanVampiro", "Vampiros") : t("pactClanRaposa", "Raposas")
        const until = new Date(p.endsAt).toLocaleDateString(locale, { weekday: "short", day: "numeric", month: "short" })
        const ours = !!mine && mine === p.clan
        return (
          <li
            key={`${p.domain}:${p.clan}`}
            className="flex items-start gap-2 px-2 py-1.5"
            style={{ background: colors.bg, border: `1px solid ${ours ? colors.accent : colors.line}` }}
          >
            <Moon className="mt-0.5 h-4 w-4 shrink-0" style={{ color: colors.accent }} aria-hidden />
            <div className="min-w-0 flex-1">
              <p className={`${archivo.className} text-[11px] font-semibold uppercase tracking-wide`} style={{ color: colors.accent }}>
                {t("pactTitle", "Pacto de {god}").replace("{god}", god)}
              </p>
              <p className="text-[12px] leading-snug" style={{ color: colors.text }}>
                {t("pactLine", "{clan}: +{pct}% de néctar no {game} até {date}.")
                  .replace("{clan}", clan)
                  .replace("{pct}", pct)
                  .replace("{game}", gameName(p.game))
                  .replace("{date}", until)}
              </p>
              {ours && (
                <p className="text-[11px] leading-snug" style={{ color: colors.muted }}>
                  {t("pactOurs", "É do seu povo: jogue o {game} para render mais néctar nesta semana.").replace("{game}", gameName(p.game))}
                </p>
              )}
            </div>
          </li>
        )
      })}
    </ul>
  )
}
