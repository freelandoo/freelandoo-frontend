"use client"

// features/meu-mundo/ui/status/soul-panel.tsx — a alma do hóspede no STATUS (mm3d-72).
//
// No lugar dos 6 traços antigos (pedido do Alex: "troca todas as personalidades"):
// o tipo (psicopata, covarde, comilão, bondoso, competitivo), quanto ele gosta
// do dono (0 sem teto; a marca dos 200 é onde ele passa a chamar o dono pelo
// que mais gosta), o que mais gosta e mais odeia, o apelido e o desejo de agora.

import { useState } from "react"
import { Bar, EVO, archivo, teko } from "./evo-skin"
import { AFFECTION_NAME_AT, TEMPER_COLOR, actLabel, callName, foodShort, temperLabel, temperLine, wishLine, type LifeSoul } from "../../soul"

type Tr = (key: string, fallback: string) => string

/** Escala da barra: 0 até a próxima centena (no mínimo até os 200, onde fica a marca). */
const barMax = (v: number) => Math.max(AFFECTION_NAME_AT + 50, Math.ceil((v + 1) / 100) * 100)

export function SoulPanel({ soul, t, compact = false }: { soul: LifeSoul; t: Tr; compact?: boolean }) {
  const color = TEMPER_COLOR[soul.temper]
  const call = callName(soul, t)
  const max = barMax(soul.affection)
  const label = compact ? `${archivo.className} text-[10px] uppercase` : `${teko.className} text-[19px] uppercase tracking-[0.12em]`
  const body = compact ? `${archivo.className} text-[11px] leading-snug` : `${archivo.className} text-[14px] leading-snug`
  const [now] = useState(() => Date.now())
  const left = soul.wish ? Math.max(0, Math.round((Date.parse(soul.wish.until) - now) / 3_600_000)) : 0
  return (
    <div className={compact ? "space-y-1.5" : "space-y-3"}>
      <div>
        <div className={compact ? `${teko.className} text-[18px] uppercase leading-none tracking-[0.1em]` : `${teko.className} text-[30px] uppercase leading-none tracking-[0.1em]`} style={{ color }}>
          {temperLabel(soul.temper, t)}
        </div>
        {!compact && (
          <p className={`${body} mt-1`} style={{ color: EVO.mudo }}>
            {temperLine(soul.temper, t)}
          </p>
        )}
      </div>
      <div>
        <div className={`${label} flex justify-between`} style={{ color: EVO.branco }}>
          <span>{t("soulAffection", "Quanto gosta de você")}</span>
          <span style={{ color: soul.affection >= AFFECTION_NAME_AT ? EVO.bom : soul.affection <= 0 ? EVO.perigo : EVO.douradoClaro }}>{soul.affection}</span>
        </div>
        <Bar value={soul.affection} max={max} mark={AFFECTION_NAME_AT} color={`linear-gradient(90deg, ${EVO.ritual}, ${EVO.rosaClaro})`} height={compact ? 5 : 9} />
      </div>
      <div className={`grid grid-cols-2 ${compact ? "gap-x-2" : "gap-x-4"}`}>
        <div className="min-w-0">
          <div className={label} style={{ color: EVO.bom }}>
            {t("soulLikes", "Mais gosta")}
          </div>
          <div className={`${body} truncate`} style={{ color: EVO.branco }}>
            {foodShort(soul.likes.food, t)} · {actLabel(soul.likes.act, t)}
          </div>
        </div>
        <div className="min-w-0">
          <div className={label} style={{ color: EVO.perigo }}>
            {t("soulHates", "Mais odeia")}
          </div>
          <div className={`${body} truncate`} style={{ color: EVO.branco }}>
            {foodShort(soul.hates.food, t)} · {actLabel(soul.hates.act, t)}
          </div>
        </div>
      </div>
      <div className={`${body}`} style={{ color: EVO.mudo }}>
        {t("soulCallsYou", "Te chama de")}{" "}
        <span className="font-semibold" style={{ color: soul.call.kind === "hate" ? EVO.perigo : soul.call.kind === "like" ? EVO.bom : EVO.branco }}>
          {call || t("soulNoNick", "(sem apelido)")}
        </span>
        {soul.petName ? (
          <>
            {" · "}
            {t("soulPetName", "Apelido dele")} <span className="font-semibold" style={{ color: EVO.branco }}>{soul.petName}</span>
          </>
        ) : null}
      </div>
      {!compact && soul.call.kind === "nick" && (
        <p className={`${archivo.className} text-[12px] leading-snug`} style={{ color: EVO.mudoEscuro }}>
          {t("soulNameRule", "Com {n} de afeto ele passa a te chamar pelo que mais gosta. Se for maltratado, pelo que mais odeia.").replace("{n}", String(AFFECTION_NAME_AT))}
        </p>
      )}
      {soul.wish && (
        <div className={body} style={{ color: EVO.douradoClaro }}>
          “{wishLine(soul.wish.id, t)}”{" "}
          <span style={{ color: EVO.mudo }}>{t("soulWishLeft", "({h} h para atender)").replace("{h}", String(left))}</span>
        </div>
      )}
    </div>
  )
}
