"use client"

// features/meu-mundo/ui/kit/waiting-room.tsx — a ESPERA de todo minijogo em grupo
// (regra do Alex, 2026-11-08): a mesma tela do Jetpack em todos (moldura de ouro,
// relógio grande, as vagas, "Sair da espera"), 20 s de espera e NENHUMA menção a
// computador — vaga sem ninguém é só "vaga livre".
// `docked` = cartão preso embaixo, sem cobrir a tela (o Paint vota no mapa enquanto espera).

import { useEffect, useState, type ReactNode } from "react"
import { Loader2, User, Users } from "lucide-react"
import { useTranslations } from "@/components/i18n/I18nProvider"
import { MM } from "../hud/tokens"
import { SteamFrame } from "./steam/steam-frame"
import { SP as ST } from "./steam/steam-tokens"

export interface WaitSeat {
  name: string
  /** Ícone da vaga ocupada (sem = pessoa). */
  icon?: ReactNode
  /** Texto pequeno à direita (ex.: o veículo). */
  note?: string
}

export function WaitingRoom({
  title,
  text,
  seats,
  cap,
  count,
  until,
  onCancel,
  background,
  docked = false,
  accent = ST.gold,
}: {
  title: string
  text?: string
  seats: WaitSeat[]
  cap: number
  /** "{n} de 4 no túnel" já pronto. */
  count?: string
  /** Fim da espera (ms); 0 = ainda sem relógio. */
  until: number
  onCancel: () => void
  background?: string
  docked?: boolean
  accent?: string
}) {
  const t = useTranslations("MeuMundo")
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 250)
    return () => clearInterval(id)
  }, [])
  const left = until ? Math.max(0, Math.ceil((until - now) / 1000)) : null
  const card = (
    <SteamFrame className="w-full max-w-[440px]" cornerSize={40}>
      <div className={`${docked ? "p-4" : "p-5 max-[759px]:p-4"} text-left`} style={{ color: ST.text }}>
        <div className="flex items-center gap-2 text-[12px] font-bold uppercase tracking-[0.18em]" style={{ color: ST.cyan }}>
          <Users className="h-4 w-4" /> {t("mmWaitMulti", "Multiplayer")}
        </div>
        <div className="mt-2 flex items-end justify-between gap-3">
          <h2 className="text-[22px] font-black italic leading-tight">{title}</h2>
          <span className="text-[34px] font-black italic tabular-nums leading-none" style={{ color: accent }} aria-live="polite">
            {left === null ? <Loader2 className="h-7 w-7 animate-spin" /> : `0:${String(left).padStart(2, "0")}`}
          </span>
        </div>
        {text && (
          <p className={`mt-2 text-[13px] leading-snug [@media(max-height:520px)]:hidden ${docked ? "max-[759px]:hidden" : ""}`} style={{ color: ST.muted }}>
            {text}
          </p>
        )}
        <ol className="mt-3 grid grid-cols-2 gap-1.5 max-[420px]:grid-cols-1">
          {Array.from({ length: cap }, (_, i) => {
            const s = seats[i]
            return (
              <li key={i} className="flex items-center gap-2 px-2.5 py-2 text-[13.5px]" style={{ background: s ? MM.rubySoft : MM.card, color: s ? ST.text : ST.muted }}>
                {s ? (s.icon ?? <User className="h-4 w-4 shrink-0" style={{ color: accent }} />) : <User className="h-4 w-4 shrink-0 opacity-50" />}
                <span className="min-w-0 truncate font-semibold">{s ? s.name : t("mmWaitFree", "vaga livre")}</span>
                {s?.note && (
                  <span className="ml-auto shrink-0 text-[11px]" style={{ color: ST.muted }}>
                    {s.note}
                  </span>
                )}
              </li>
            )
          })}
        </ol>
        {count && (
          <p className="mt-2 text-[12.5px]" style={{ color: ST.muted }}>
            {count}
          </p>
        )}
        <button type="button" onClick={onCancel} className="mt-4 w-full px-3 py-3 text-[15px] font-bold" style={{ background: MM.card, border: `1px solid ${MM.border}`, color: ST.text }}>
          {t("mmWaitCancel", "Sair da espera")}
        </button>
      </div>
    </SteamFrame>
  )
  if (docked) return <div className="pointer-events-auto flex w-full justify-center px-3 pb-3">{card}</div>
  return (
    <div className="absolute inset-0 flex items-center justify-center overflow-y-auto p-4" style={{ background }}>
      {card}
    </div>
  )
}
