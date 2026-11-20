"use client"

// features/meu-mundo/ui/ranking/nectar-card.tsx — lore v2 N2: a CARTEIRA DE NÉCTAR.
//
// Fica no topo da aba Semana do Ranking: quanto néctar a conta tem para entregar
// na estátua, o que a semana passada rendeu (por jogo) e quanto vale cada
// posição. Quem calcula é o servidor (utils/meuMundoNectar.js no back): a
// semana fecha depois do sábado 23:59 de Brasília e credita uma vez só. Aqui
// só se mostra.

import { useEffect, useState } from "react"
import { ChevronDown, Droplet } from "lucide-react"
import { getToken } from "@/lib/auth"
import { getNectarWallet, type NectarWallet, type WeeklyGame } from "../../data"
import { MM } from "../hud/tokens"
import { archivo, teko } from "../status/evo-skin"
import { StatueRaceBars } from "../statue/statue-race"
import { useStatueRace } from "../statue/statue-store"
import { PactList } from "../statue/pact-list"

type Tr = (key: string, fallback: string) => string

/** mL → "2,25 L" no idioma da tela. */
export const liters = (ml: number, locale: string) => `${(ml / 1000).toLocaleString(locale, { maximumFractionDigits: 2 })} L`

export function NectarCard({ t, locale, gameName }: { t: Tr; locale: string; gameName: (g: WeeklyGame) => string }) {
  const [w, setW] = useState<NectarWallet | null>(null)
  const [open, setOpen] = useState(false)
  // N3: a corrida das estátuas, ao vivo (socket mm:statue)
  const { race } = useStatueRace()

  useEffect(() => {
    const token = getToken()
    if (!token) return
    let alive = true
    void getNectarWallet(token).then((r) => {
      if (alive && r.ok) setW(r.data)
    })
    return () => {
      alive = false
    }
  }, [])

  if (!w) return <div className="mb-3 h-[74px]" style={{ background: MM.card }} aria-hidden />

  const mobName = (k: string) =>
    ({
      stone: t("laminasMobStoneGolem", "Golem de Pedra"),
      cavaleiro: t("laminasMobKnight", "Cavaleiro Dourado"),
      wolf: t("laminasMobWolf", "Lobos de Ferrugem"),
      ciborgue: t("laminasMobGolem", "Ciborgue"),
      garras: t("laminasMobHarpy", "Dama das Garras"),
      brute: t("laminasMobBrute", "Brutamontes"),
    })[k] ?? k
  const ordinal = (p: number) => t("rkNcPos", "{n}º").replace("{n}", String(p))
  return (
    <section className="mb-3 px-3 py-2.5" style={{ background: MM.rubySoft, border: `1px solid ${MM.goldBorder}` }} aria-label={t("rkNcTitle", "Néctar para entregar")}>
      <div className="flex items-center gap-3">
        <Droplet className="h-7 w-7 shrink-0" style={{ color: MM.gold }} aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: MM.gold }}>
            {t("rkNcTitle", "Néctar para entregar")}
          </p>
          <p className="text-[12px] leading-snug" style={{ color: MM.muted }}>
            {w.last.closed && w.last.ml > 0
              ? t("rkNcLast", "A semana passada rendeu {n}.").replace("{n}", liters(w.last.ml, locale))
              : t("rkNcHow", "Cada semana, a sua posição em cada jogo vira néctar. Os jogos somam.")}
          </p>
        </div>
        <span className={`${teko.className} shrink-0 text-[34px] leading-none tabular-nums`} style={{ color: MM.text }}>
          {liters(w.pendingMl, locale)}
        </span>
      </div>

      {w.last.closed && w.last.awards.length > 0 && (
        <ul className="mt-2 flex flex-wrap gap-1.5" aria-label={t("rkNcLastList", "O que cada jogo rendeu")}>
          {w.last.awards.map((a) => (
            <li key={a.game} className={`${archivo.className} px-2 py-0.5 text-[11px] font-semibold`} style={{ background: MM.card, color: MM.text, border: `1px solid ${MM.border}` }}>
              {gameName(a.game)} · {ordinal(a.position)} · <span style={{ color: MM.gold }}>+{liters(a.ml, locale)}</span>
              {a.pactMl ? <span style={{ color: MM.muted }}> ({t("rkNcPact", "{n} do pacto").replace("{n}", liters(a.pactMl, locale))})</span> : null}
            </li>
          ))}
        </ul>
      )}

      {/* O roubo da Nívea (mig 462): o contador de tudo o que os monstros levaram + o extrato da conta */}
      {w.nivea && (
        <div className="mt-2.5 px-2.5 py-2" style={{ background: "rgba(60,22,80,0.35)", border: "1px solid rgba(181,123,255,0.45)" }}>
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 shrink-0 rotate-45" style={{ background: "linear-gradient(135deg, #7CFFB0 0%, #B57BFF 100%)", boxShadow: "0 0 8px rgba(181,123,255,0.7)" }} aria-hidden />
            <p className={`${archivo.className} min-w-0 flex-1 text-[11px] font-semibold uppercase tracking-wide`} style={{ color: "#D5B3FF" }}>
              {t("rkNcNivea", "Néctar da Nívea")}
            </p>
            <span className={`${teko.className} shrink-0 text-[24px] leading-none tabular-nums`} style={{ color: "#EBDDFF" }}>
              {liters(w.nivea.totalMl, locale)}
            </span>
          </div>
          <p className="mt-1 text-[11px] leading-snug" style={{ color: MM.muted }}>
            {t("rkNcNiveaHow", "Perder ou fugir de um monstro da rua ou de um Domínio dá à Nívea {pct}% do néctar que você carrega (de {min} a {max}).")
              .replace("{pct}", String(Math.round((w.theft?.pct ?? 0.1) * 100)))
              .replace("{min}", liters(w.theft?.minMl ?? 100, locale))
              .replace("{max}", liters(w.theft?.maxMl ?? 2000, locale))}
          </p>
          {w.thefts && w.thefts.length > 0 && (
            <ul className="mt-1.5 space-y-0.5" aria-label={t("rkNcTheftList", "Extrato do roubo")}>
              {w.thefts.slice(0, 5).map((x) => (
                <li key={x.at} className="flex justify-between gap-2 text-[11px]" style={{ color: MM.text }}>
                  <span className="shrink-0 tabular-nums" style={{ color: MM.muted }}>
                    {new Date(x.at).toLocaleDateString(locale, { day: "2-digit", month: "2-digit" })}
                  </span>
                  <span className="min-w-0 flex-1 truncate">{t("rkNcTheftLine", "Roubado por um monstro: {mob}").replace("{mob}", mobName(x.kind))}</span>
                  <span className="shrink-0 tabular-nums" style={{ color: "#FF8A8A" }}>
                    −{liters(x.ml, locale)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* D4: os pactos dos deuses vencidos (néctar extra no jogo do deus para um povo) */}
      {w.pacts && w.pacts.length > 0 && (
        <div className="mt-2.5">
          <PactList pacts={w.pacts} bonus={w.pactBonus} t={t} locale={locale} gameName={gameName} mine={race?.me.clan ?? null} colors={{ text: MM.text, muted: MM.muted, accent: MM.gold, line: MM.border, bg: MM.card }} />
        </div>
      )}

      {race && (
        <div className="mt-2.5">
          <p className={`${archivo.className} mb-1 text-[11px] font-semibold uppercase tracking-wide`} style={{ color: MM.gold }}>
            {race.sunday ? t("sttRaceLive", "Domingo na estátua · ao vivo") : t("sttRaceLast", "Último domingo na estátua")}
          </p>
          <StatueRaceBars race={race} t={t} locale={locale} mine={race.me.clan} />
          <p className="mt-1 text-[11px] leading-snug" style={{ color: MM.muted }}>
            {race.me.clan === "vampiro"
              ? t("sttWhereVampiro", "No domingo, leve o néctar ao pé de Morkhan, na praça do centro.")
              : t("sttWhereRaposa", "No domingo, leve o néctar ao pé de Aurion, no meio do seu bairro.")}
          </p>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className={`${archivo.className} mt-2 flex items-center gap-1 text-[12px] font-semibold`}
        style={{ color: MM.gold }}
      >
        {t("rkNcTable", "Quanto vale cada posição")}
        <ChevronDown className="h-3.5 w-3.5 transition-transform" style={{ transform: open ? "rotate(180deg)" : undefined }} aria-hidden />
      </button>
      {open && (
        <>
          <dl className="mt-1.5 grid grid-cols-3 gap-x-3 gap-y-0.5 text-[12px] sm:grid-cols-6">
            {w.table.map((r) => (
              <div key={r.position} className={`flex justify-between gap-2 ${r.outside ? "col-span-3 sm:col-span-2" : ""}`}>
                <dt style={{ color: MM.muted }}>{r.outside ? t("rkNcOutside", "Fora do top 10") : ordinal(r.position)}</dt>
                <dd className="tabular-nums" style={{ color: MM.text }}>
                  {liters(r.ml, locale)}
                </dd>
              </div>
            ))}
          </dl>
          <p className="mt-1.5 text-[11px] leading-snug" style={{ color: MM.muted }}>
            {t("rkNcRules", "Em cada jogo vale só a posição; entre os jogos, os litros somam. Empate: quem fez primeiro. A semana fecha sábado 23:59 (Brasília) e o néctar cai aqui.")}
          </p>
        </>
      )}
    </section>
  )
}
