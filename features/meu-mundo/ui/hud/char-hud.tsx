"use client"

// features/meu-mundo/ui/hud/char-hud.tsx — HUD do PERSONAGEM (mm3d-60d, pedido do Alex).
//
// Canto de cima à esquerda, "igual nas batalhas, só menor": é a MESMA placa
// de luta da Arena das Lâminas (FightPlate — retrato alto chanfrado, sangue em
// paralelogramo com o número grande e o fantasma, tiras finas embaixo), numa
// escala menor. O que cada peça mostra:
//  • a barra grande = o PODER do personagem (B7, pedido do Alex: no lugar da
//    saúde, mesmo estilo); enche por faixas de 1.000, como as barras do STATUS;
//  • tira âmbar = ENERGIA;  • tira violeta = ESTRESSE (alto = mais estresse);
//  • embaixo, o nível de aventura (do personagem) e o do TREINADOR (da conta, F2).
// Só apresentação — nenhum cálculo: saúde/energia/estresse são os valores que
// o servidor manda (login e cada aviso "life" da sala, que leva `vitals`); o
// nível vem de GET /adventure uma vez e do `to` de cada recibo celebrado.
// Sem polling e sem laço por quadro.

import { useEffect, useState } from "react"
import { useTranslations } from "@/components/i18n/I18nProvider"
import { getToken } from "@/lib/auth"
import { CHARACTER_CHANGED, TRAINER_CHANGED, getAdventure, type TrainerDelta } from "../../data"
import type { BodyId } from "../../types"
import { PORTRAIT } from "../portraits"
import { onCelebrate } from "../rewards/reward-bus"
import { archivo } from "../status/evo-skin"
import { statTop } from "../status/stat-bars"
import { TYPE } from "../kit/type-scale"
import { FightPlate, plateWidth } from "./fight-plate"
import { useDrawerOpen } from "./hud-kit"
import { useGameCovered } from "./game-cover"
import c from "./char-hud.module.css"

export interface HudVitals {
  health: number
  energy: number
  stress: number
  /** Teto da saúde (cada internação deixa sequela). */
  vitality: number
}

const BAR_K = 2.6

/** Retrato menor que o das lutas (lá: 52–112 px). */
function hudPw() {
  if (typeof window === "undefined") return 64
  return Math.round(Math.max(40, Math.min(76, window.innerWidth * 0.05, window.innerHeight * 0.095)))
}

export function CharHud({ name, body, vitals, power, hidden: hiddenProp = false, onOpen }: { name: string; body: BodyId; vitals: HudVitals | null; power: number | null; hidden?: boolean; onOpen?: () => void }) {
  const t = useTranslations("MeuMundo")
  // com a gaveta aberta o HUD sai (no celular ela cobre a tela quase toda)
  const drawerOpen = useDrawerOpen()
  // dentro das lutas e minijogos fica só a placa da luta (pedido do Alex)
  const covered = useGameCovered()
  const hidden = hiddenProp || drawerOpen || covered
  // nível + XP dentro do nível (into/need) — do servidor
  const [adv, setAdv] = useState<{ level: number; into: number; need: number } | null>(null)
  // F2: nível do treinador (a conta; não zera ao trocar de personagem)
  const [trainer, setTrainer] = useState<number | null>(null)
  const [pw, setPw] = useState(64)

  // tamanho pela tela
  useEffect(() => {
    const on = () => setPw(hudPw())
    on()
    window.addEventListener("resize", on)
    return () => window.removeEventListener("resize", on)
  }, [])

  // nível de aventura: ao montar, a cada recibo celebrado e quando o personagem ativo muda
  // (o nível é de cada personagem, mig 435)
  useEffect(() => {
    let alive = true
    const load = () => {
      const token = getToken()
      if (token)
        void getAdventure(token).then((r) => {
          if (alive && r.ok) {
            setAdv({ level: r.data.adventure.level, into: r.data.adventure.into, need: r.data.adventure.need })
            if (r.data.trainer) setTrainer(r.data.trainer.level)
          }
        })
    }
    load()
    window.addEventListener(CHARACTER_CHANGED, load)
    const onTrainer = (e: Event) => {
      const d = (e as CustomEvent<TrainerDelta>).detail
      if (d && typeof d.to === "number" && d.to > 0) setTrainer(d.to)
    }
    window.addEventListener(TRAINER_CHANGED, onTrainer)
    const off = onCelebrate((r) => {
      const x = r.deltas?.xp
      if (x && typeof x.to === "number" && x.to > 0) setAdv({ level: x.to, into: x.into, need: x.need })
      const tr = r.deltas?.trainer
      if (tr && typeof tr.to === "number" && tr.to > 0) setTrainer(tr.to)
    })
    return () => {
      alive = false
      window.removeEventListener(CHARACTER_CHANGED, load)
      window.removeEventListener(TRAINER_CHANGED, onTrainer)
      off()
    }
  }, [])

  if (hidden) return null
  const v = vitals
  const pow = Math.max(0, Math.round(power ?? 0))
  const energy = v ? Math.max(0, Math.min(100, v.energy)) : 0
  const stress = v ? Math.max(0, Math.min(100, v.stress)) : 0
  const label = (k: string, f: string, n: number, m: number) => `${t(k, f)}: ${Math.round(n)} / ${m}`
  return (
    // tocar no HUD abre o STATUS (pedido do Alex)
    <div
      className={`${c.hud} ${archivo.className}`}
      aria-label={t("hudOpenStatus", "Seu personagem — abrir o STATUS")}
      role="button"
      tabIndex={0}
      data-click={onOpen ? "" : undefined}
      onPointerDown={(e) => e.stopPropagation()}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (onOpen && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault()
          onOpen()
        }
      }}
    >
      <FightPlate
        pw={pw}
        barK={BAR_K}
        portrait={PORTRAIT[body] ?? PORTRAIT.normal}
        name={name}
        hp={pow}
        hpMax={statTop(pow)}
        calm
        stam={energy / 100}
        // estresse = a tira violeta (a mesma cor do poder na luta); acende no alto
        power={{ v: stress / 100, ready: stress >= 70 }}
      >
        <div className={c.foot} style={{ marginLeft: pw + 6, width: plateWidth(pw, BAR_K) - pw - 6, fontSize: Math.max(TYPE.label, Math.min(TYPE.body, pw * 0.2)) }}>
          {adv && <span className={c.level}>{t("hudLevel", "Nv. {n}").replace("{n}", String(adv.level))}</span>}
          {trainer != null && (
            <span className={c.level} style={{ color: "#7FD8FF" }} title={t("hudTrainerHint", "Nível do treinador: é da sua conta e abre os capítulos da história")}>
              {t("hudTrainerShort", "Tr. {n}").replace("{n}", String(trainer))}
            </span>
          )}
          {v && (
            <span className={c.legend} aria-hidden>
              <i style={{ background: "#ffaa4a" }} />
              {Math.round(energy)}
              <i style={{ background: "#b98aff" }} />
              {Math.round(stress)}
            </span>
          )}
        </div>
        {/* XP do nível de aventura: um fio dourado, sem texto (apresentação 12 — nada abaixo
            de 11 px; o número está na Ficha e no rótulo do leitor de tela) */}
        {adv && (
          <div className={c.xp} title={adv.need > 0 ? `${adv.into} / ${adv.need} XP` : "MAX"} style={{ marginLeft: pw + 6, width: plateWidth(pw, BAR_K) - pw - 10, height: Math.max(6, Math.round(pw * 0.1)) }}>
            <span className={c.xpFill} style={{ transform: `translateX(${(adv.need > 0 ? Math.min(1, adv.into / adv.need) : 1) * 100 - 100}%)` }} />
          </div>
        )}
      </FightPlate>
      {/* leitor de tela: os três valores por extenso */}
      {v && (
        <ul className="sr-only">
          <li>{`${t("stPower", "PODER")}: ${pow}`}</li>
          <li>{label("vitalEnergy", "Energia", energy, 100)}</li>
          <li>{label("vitalStress", "Estresse", stress, 100)}</li>
          {adv && adv.need > 0 && <li>{`XP: ${adv.into} / ${adv.need}`}</li>}
        </ul>
      )}
    </div>
  )
}
