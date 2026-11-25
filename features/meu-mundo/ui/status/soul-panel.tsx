"use client"

// features/meu-mundo/ui/status/soul-panel.tsx — a alma do hóspede no STATUS (mm3d-72).
//
// 2026-11-25 (pedido do Alex): a página Alma sumiu. O que ele mais gosta e mais
// odeia mora no cabeçalho, logo abaixo do nível; no computador, embaixo, quanto
// gosta do dono, como chama o dono e o desejo de agora (a marca dos 200 de afeto
// é onde ele passa a chamar o dono pelo que mais gosta). O tipo (covarde…) já
// está na linha "Geração N • TIPO" e a fertilidade virou barra da Ficha.

import { useState } from "react"
import { EVO, archivo } from "./evo-skin"
import { myClan, type Clan } from "../../classes"
import { AFFECTION_NAME_AT, actLabel, callName, foodShort, wishLine, type LifeSoul } from "../../soul"

type Tr = (key: string, fallback: string) => string

const LABEL = `${archivo.className} font-bold uppercase tracking-[0.08em]`

/** `small` = cabeçalho do celular (~44 px): só a linha do gosta/odeia, alinhada à direita. */
export function SoulLine({ soul, t, small = false, clan = myClan() }: { soul: LifeSoul; t: Tr; small?: boolean; clan?: Clan | null }) {
  return (
    <div className={`${archivo.className} ${small ? "text-[10px]" : "text-[13px]"} min-w-0 leading-snug`} style={{ color: EVO.branco }}>
      <div className={`flex min-w-0 flex-wrap gap-x-4 ${small ? "justify-end" : ""}`}>
        <span className="min-w-0 truncate">
          <span className={LABEL} style={{ color: EVO.bom }}>
            {t("soulLikes", "Mais gosta")}
          </span>{" "}
          {foodShort(soul.likes.food, t, clan)} · {actLabel(soul.likes.act, t)}
        </span>
        <span className="min-w-0 truncate">
          <span className={LABEL} style={{ color: EVO.perigo }}>
            {t("soulHates", "Mais odeia")}
          </span>{" "}
          {foodShort(soul.hates.food, t, clan)} · {actLabel(soul.hates.act, t)}
        </span>
      </div>
      {!small && <SoulMore soul={soul} t={t} clan={clan} />}
    </div>
  )
}

/** Afeto, como chama o dono, apelido e o desejo de agora (só no computador). */
function SoulMore({ soul, t, clan }: { soul: LifeSoul; t: Tr; clan: Clan | null }) {
  const call = callName(soul, t, clan)
  const [now] = useState(() => Date.now())
  const left = soul.wish ? Math.max(0, Math.round((Date.parse(soul.wish.until) - now) / 3_600_000)) : 0
  return (
    <>
      <div className="truncate" style={{ color: EVO.mudo }}>
        {t("soulAffection", "Quanto gosta de você")}{" "}
        <span className="font-semibold tabular-nums" style={{ color: soul.affection >= AFFECTION_NAME_AT ? EVO.bom : soul.affection <= 0 ? EVO.perigo : EVO.douradoClaro }}>
          {soul.affection}
        </span>
        {" · "}
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
      {soul.wish && (
        <div className="truncate" style={{ color: EVO.douradoClaro }}>
          “{wishLine(soul.wish.id, t)}”{" "}
          <span style={{ color: EVO.mudo }}>{t("soulWishLeft", "({h} h para atender)").replace("{h}", String(left))}</span>
        </div>
      )}
    </>
  )
}
