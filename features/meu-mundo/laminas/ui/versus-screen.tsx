"use client"

// features/meu-mundo/laminas/ui/versus-screen.tsx — a tela de VERSUS antes de toda luta.
//
// Pedido do Alex (2026-11-06): os status dos dois lados, lado a lado, na moldura de
// ouro do jogo. A luta fica parada até um toque (ou Enter/Espaço). Os números são os
// que a regra vai usar (LaminasGameHandle.sheet), então o que aparece é o que vale.

import { useEffect, type ReactNode } from "react"
import { motion, useReducedMotion } from "framer-motion"
import { Feather, Heart, Shield, Swords, Target } from "lucide-react"
import { useTranslations } from "@/components/i18n/I18nProvider"
import { Gear, SteamFrame } from "../../ui/kit/steam/steam-frame"
import { anton } from "../../ui/hud/fight-plate"
import { archivo, cinzel, EVO, teko } from "../../ui/status/evo-skin"
import type { FightSheet } from "../engine/laminas-game"

export interface VersusSide {
  name: string
  level: number
  portrait: string | null
}

const CHAMFER = "polygon(14px 0, 100% 0, 100% calc(100% - 14px), calc(100% - 14px) 100%, 0 100%, 0 14px)"
const GOLD = "#FFD68A"

/** Retrato com aro de ouro; o nome e o nível ficam embaixo. */
function Fighter({ side, from, reduce }: { side: VersusSide; from: number; reduce: boolean }) {
  const t = useTranslations("MeuMundo")
  return (
    <motion.div className="flex min-w-0 flex-col items-center" initial={reduce ? false : { x: from, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ type: "spring", stiffness: 240, damping: 24 }}>
      <div className="w-full max-w-[210px] max-[759px]:max-w-[118px] [@media(max-height:520px)]:max-w-[58px]" style={{ padding: 2, clipPath: CHAMFER, background: "linear-gradient(180deg, #FFE3A3, #9A6424 50%, #5E3B12)" }}>
        <div className="relative aspect-[2/3] w-full overflow-hidden" style={{ clipPath: CHAMFER, background: "#0A0D11" }}>
          {side.portrait && <div aria-hidden className="h-full w-full bg-cover bg-top" style={{ backgroundImage: `url(${side.portrait})` }} />}
        </div>
      </div>
      <div className={`${teko.className} mt-2 line-clamp-2 w-full text-center text-[30px] font-semibold uppercase leading-none max-[759px]:text-[18px] [@media(max-height:520px)]:mt-0.5 [@media(max-height:520px)]:line-clamp-1 [@media(max-height:520px)]:text-[17px]`} style={{ color: EVO.branco, textShadow: "0 2px 0 #000" }}>
        {side.name}
      </div>
      <div className={`${archivo.className} mt-0.5 text-[13px] font-bold uppercase tracking-[0.14em] max-[759px]:text-[11px] [@media(max-height:520px)]:mt-0 [@media(max-height:520px)]:text-[10px]`} style={{ color: GOLD }}>
        {t("laminasFoeLevel", "Nv. {n}").replace("{n}", String(side.level))}
      </div>
    </motion.div>
  )
}

/** Barra inclinada; `left` cresce do centro para a esquerda. */
function Meter({ f, color, lead, left }: { f: number; color: string; lead: boolean; left?: boolean }) {
  return (
    <div className="h-[14px] min-w-0 flex-1 overflow-hidden max-[759px]:h-[10px]" style={{ background: "rgba(4,4,8,.9)", boxShadow: "inset 0 0 0 1px rgba(214,167,91,.45)", transform: `skewX(${left ? 18 : -18}deg)` }}>
      <div
        className="h-full"
        style={{
          width: `${Math.round(f * 100)}%`,
          marginLeft: left ? "auto" : undefined,
          background: lead ? `linear-gradient(180deg, ${color}, ${color}aa)` : `${color}55`,
          boxShadow: lead ? `0 0 10px ${color}` : undefined,
        }}
      />
    </div>
  )
}

function Row({ icon, label, a, b, color, i, reduce }: { icon: ReactNode; label: string; a: number; b: number; color: string; i: number; reduce: boolean }) {
  const top = Math.max(a, b, 1)
  const num = `${anton.className} w-[64px] shrink-0 text-[24px] leading-none tabular-nums max-[759px]:w-[46px] max-[759px]:text-[17px] [@media(max-height:520px)]:text-[15px]`
  return (
    <motion.div
      className="grid items-center gap-2 py-[7px] [--mid:170px] max-[759px]:gap-1.5 max-[759px]:py-[5px] max-[759px]:[--mid:126px] [@media(max-height:520px)]:py-px [@media(max-height:520px)]:[--mid:130px]"
      style={{ gridTemplateColumns: "minmax(0,1fr) var(--mid) minmax(0,1fr)" }}
      initial={reduce ? false : { y: 10, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 0.25 + i * 0.07, duration: 0.25 }}
    >
      <div className="flex min-w-0 items-center gap-2">
        <span className={`${num} text-right`} style={{ color: a >= b ? EVO.branco : EVO.mudo, fontFamily: anton.style.fontFamily }}>
          {Math.round(a)}
        </span>
        <Meter f={a / top} color={color} lead={a >= b} left />
      </div>
      <div className={`${teko.className} flex items-center justify-center gap-1.5 text-[19px] font-semibold uppercase leading-none max-[759px]:text-[15px] [@media(max-height:520px)]:text-[14px]`} style={{ color: EVO.branco }}>
        <span className="flex h-[18px] w-[18px] shrink-0 items-center justify-center [&>svg]:h-full [&>svg]:w-full" style={{ color }}>
          {icon}
        </span>
        <span className="whitespace-nowrap">{label}</span>
      </div>
      <div className="flex min-w-0 items-center gap-2">
        <Meter f={b / top} color={color} lead={b >= a} />
        <span className={num} style={{ color: b >= a ? EVO.branco : EVO.mudo, fontFamily: anton.style.fontFamily }}>
          {Math.round(b)}
        </span>
      </div>
    </motion.div>
  )
}

export function VersusScreen({ me, foe, sheet, touch, onStart }: { me: VersusSide; foe: VersusSide; sheet: FightSheet; touch: boolean; onStart: () => void }) {
  const t = useTranslations("MeuMundo")
  const reduce = !!useReducedMotion()
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.key !== "Enter" && e.key !== " ") return
      e.preventDefault()
      onStart()
    }
    window.addEventListener("keydown", key)
    return () => window.removeEventListener("keydown", key)
  }, [onStart])
  const rows = [
    { key: "hp", icon: <Heart />, label: t("vsLife", "Vida"), a: sheet.me.hp, b: sheet.foe.hp, color: "#FF3B5C" },
    { key: "atk", icon: <Swords />, label: t("stAttack", "Ataque"), a: sheet.me.atk, b: sheet.foe.atk, color: "#FF2E55" },
    { key: "def", icon: <Shield />, label: t("stDefense", "Defesa"), a: sheet.me.def, b: sheet.foe.def, color: "#2F8BFF" },
    { key: "acc", icon: <Target />, label: t("atStrength", "Acuracidade"), a: sheet.me.acc, b: sheet.foe.acc, color: "#FF9A1F" },
    { key: "spd", icon: <Feather />, label: t("atSpeed", "Velocidade"), a: sheet.me.spd, b: sheet.foe.spd, color: "#FFD21F" },
  ]
  const vs = (
    <motion.div className="relative flex items-center justify-center" initial={reduce ? false : { scale: 1.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", stiffness: 300, damping: 18, delay: 0.1 }}>
      <Gear size={92} className="absolute opacity-40 [@media(max-height:520px)]:hidden" />
      <span className={`${cinzel.className} relative text-[58px] font-black italic leading-none max-[759px]:text-[38px] [@media(max-height:520px)]:text-[28px]`} style={{ color: GOLD, textShadow: "0 3px 0 #5E3B12, 0 0 22px rgba(255,138,31,.6)" }}>
        VS
      </span>
    </motion.div>
  )
  return (
    <div role="button" tabIndex={0} aria-label={t("vsTapTouch", "Toque na tela para lutar")} onPointerDown={onStart} className="absolute inset-0 flex cursor-pointer select-none items-center justify-center p-4 max-[759px]:p-2.5 [@media(max-height:520px)]:p-1.5" style={{ background: "radial-gradient(120% 90% at 50% 45%, rgba(10,13,17,.62), rgba(5,6,9,.9))", touchAction: "none" }}>
      <SteamFrame className="w-full max-w-[960px]" innerClassName="p-5 max-[759px]:p-3 [@media(max-height:520px)]:p-2">
        {/* retratos e VS: em colunas no computador; no celular em cima das barras */}
        <div className="grid items-center gap-4 max-[759px]:gap-1.5 [@media(max-height:520px)]:gap-1" style={{ gridTemplateColumns: "minmax(0,1fr) auto minmax(0,1fr)" }}>
          <Fighter side={me} from={-60} reduce={reduce} />
          {vs}
          <Fighter side={foe} from={60} reduce={reduce} />
        </div>
        <div className="mt-3 max-[759px]:mt-2 [@media(max-height:520px)]:mt-1">
          {rows.map(({ key, ...r }, i) => (
            <Row key={key} {...r} i={i} reduce={reduce} />
          ))}
        </div>
        {sheet.count > 1 && (
          <p className={`${archivo.className} mt-1 text-center text-[12px] [@media(max-height:520px)]:hidden`} style={{ color: EVO.mudo }}>
            {t("vsPack", "A vida é a soma dos {n}. Cada um tem a sua parte.").replace("{n}", String(sheet.count))}
          </p>
        )}
        <motion.p
          className={`${cinzel.className} mt-3 text-center text-[17px] font-bold uppercase tracking-[0.12em] max-[759px]:mt-2 max-[759px]:text-[13px] [@media(max-height:520px)]:mt-1 [@media(max-height:520px)]:text-[11px]`}
          style={{ color: GOLD }}
          animate={reduce ? undefined : { opacity: [1, 0.45, 1] }}
          transition={{ duration: 1.6, repeat: Infinity }}
        >
          {touch ? t("vsTapTouch", "Toque na tela para lutar") : t("vsTapKey", "Clique ou aperte Espaço para lutar")}
        </motion.p>
      </SteamFrame>
    </div>
  )
}
