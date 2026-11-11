"use client"

// features/meu-mundo/ui/statue/statue-panel.tsx — lore v2 N3: a TELA DA ESTÁTUA.
//
// Abre no "E" perto de Aurion (bairro) ou de Morkhan (praça). Mostra o placar
// Raposas × Vampiros ao vivo, o néctar que tenho para entregar e o botão de
// entrega — que só funciona no domingo, na estátua do meu deus. Quem confere o
// dia, o lugar (última visita gravada pela sala) e a carteira é o servidor; a
// chave do pedido segura a repetição (resposta perdida não entrega duas vezes).

import { useRef, useState } from "react"
import { Droplet } from "lucide-react"
import { getToken } from "@/lib/auth"
import { useLocale, useTranslations } from "@/components/i18n/I18nProvider"
import { QUEST_CHANGED, deliverNectar } from "../../data"
import { AetherModal, AetherButton } from "../kit/aether-modal"
import { AE } from "../kit/aether-tokens"
import { archivo, teko } from "../status/evo-skin"
import { liters } from "../ranking/nectar-card"
import { StatueRaceBars } from "./statue-race"
import { setStatueRace, useStatueRace } from "./statue-store"

type Tr = (key: string, fallback: string) => string
const newKey = () => (typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `k${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`)

export function StatuePanel({ god, onClose }: { god: "aurion" | "morkhan"; onClose: () => void }) {
  const t = useTranslations("MeuMundo") as Tr
  const locale = useLocale()
  const { race } = useStatueRace()
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const key = useRef<string>(newKey())

  const title = god === "aurion" ? t("sttTitleAurion", "Estátua de Aurion") : t("sttTitleMorkhan", "Estátua de Morkhan")
  const me = race?.me
  const mineHere = !!me && me.god === god
  const when = race ? new Date(race.opensAt).toLocaleDateString(locale, { weekday: "long", day: "numeric", month: "long" }) : ""

  const deliver = async () => {
    const token = getToken()
    if (!token || busy) return
    setBusy(true)
    setMsg(null)
    const r = await deliverNectar(token, key.current)
    setBusy(false)
    if (!r.ok) {
      setMsg({ ok: false, text: r.error })
      return
    }
    key.current = newKey()
    setStatueRace(r.data)
    window.dispatchEvent(new CustomEvent(QUEST_CHANGED))
    const n = liters(r.data.delivery.ml, locale)
    setMsg({ ok: true, text: r.data.filled ? t("sttFilled", "Você entregou {n} e a estátua ENCHEU.").replace("{n}", n) : t("sttDone", "Você entregou {n}. A pedra bebeu.").replace("{n}", n) })
  }

  // por que o botão não aparece (o servidor confere de novo na entrega)
  const reason = !race
    ? null
    : !me?.clan
      ? t("sttNoClan", "Escolha o seu povo para entregar néctar.")
      : !mineHere
        ? t("sttOtherGod", "Esta não é a estátua do seu deus. O seu néctar vai para {god}.").replace("{god}", me.god === "aurion" ? t("sttGodAurion", "Aurion") : t("sttGodMorkhan", "Morkhan"))
        : !race.sunday
          ? t("sttNotSunday", "A estátua só recebe néctar no domingo. Abre {when}.").replace("{when}", when)
          : me.pendingMl <= 0
            ? t("sttEmpty", "Você não tem néctar para entregar. A sua posição em cada jogo vira néctar quando a semana fecha.")
            : null

  return (
    <AetherModal eyebrow={race?.sunday ? t("sttEyebrowLive", "Domingo · ao vivo") : t("sttEyebrow", "Domingo na estátua")} title={title} onClose={onClose} width={480} z={90}>
      {!race ? (
        <div className="h-[180px]" style={{ background: AE.steel }} aria-hidden />
      ) : (
        <div className="flex flex-col gap-3">
          <p className="text-[13px] leading-snug" style={{ color: AE.muted }}>
            {race.sunday ? t("sttHowLive", "Cada litro que um povo entrega empurra o seu deus para fora da pedra. A meta cresce com o número de jogadores de cada povo.") : t("sttHowLast", "Resultado do último domingo. A meta cresce com o número de jogadores de cada povo.")}
          </p>
          <StatueRaceBars race={race} t={t} locale={locale} mine={me?.clan} />
          {me?.clan && (
            <div className="flex items-center gap-3 px-2.5 py-2" style={{ background: AE.well, border: `1px solid ${AE.brassLine}` }}>
              <Droplet className="h-6 w-6 shrink-0" style={{ color: AE.gold }} aria-hidden />
              <div className="min-w-0 flex-1">
                <p className={`${archivo.className} text-[11px] font-semibold uppercase tracking-wide`} style={{ color: AE.gold }}>
                  {t("sttMine", "Seu néctar para entregar")}
                </p>
                {me.deliveredMl > 0 && (
                  <p className="text-[11px]" style={{ color: AE.muted }}>
                    {t("sttToday", "Neste domingo você entregou {n}.").replace("{n}", liters(me.deliveredMl, locale))}
                  </p>
                )}
              </div>
              <span className={`${teko.className} shrink-0 text-[28px] leading-none tabular-nums`} style={{ color: AE.text }}>
                {liters(me.pendingMl, locale)}
              </span>
            </div>
          )}
          {msg && (
            <p role="status" className="text-[13px] font-semibold leading-snug" style={{ color: msg.ok ? AE.good : AE.bad }}>
              {msg.text}
            </p>
          )}
          {msg?.ok ? null : reason ? (
            <p className="text-[13px] leading-snug" style={{ color: AE.text }}>
              {reason}
            </p>
          ) : (
            <AetherButton busy={busy} disabled={busy} onClick={() => void deliver()}>
              {busy ? t("sttDelivering", "Entregando…") : t("sttDeliver", "Entregar {n}").replace("{n}", liters(me!.pendingMl, locale))}
            </AetherButton>
          )}
        </div>
      )}
    </AetherModal>
  )
}
