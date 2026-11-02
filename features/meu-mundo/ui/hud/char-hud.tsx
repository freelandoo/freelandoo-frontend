"use client"

// features/meu-mundo/ui/hud/char-hud.tsx — HUD do PERSONAGEM (mm3d-60d, pedido do Alex).
//
// Canto de cima à esquerda, "igual nas batalhas, só menor": é a MESMA placa
// de luta da Arena das Lâminas (FightPlate — retrato alto chanfrado, sangue em
// paralelogramo com o número grande e o fantasma, tiras finas embaixo), numa
// escala menor. O que cada peça mostra:
//  • sangue = SAÚDE (o teto é a vitalidade);
//  • tira âmbar = ENERGIA;  • tira violeta = ESTRESSE (alto = mais estresse);
//  • embaixo, o nível de aventura.
// Só apresentação — nenhum cálculo: saúde/energia/estresse são os valores que
// o servidor manda (login e cada aviso "life" da sala, que leva `vitals`); o
// nível vem de GET /adventure uma vez e do `to` de cada recibo celebrado.
// Sem polling e sem laço por quadro.

import { useEffect, useState } from "react"
import { useTranslations } from "@/components/i18n/I18nProvider"
import { getToken } from "@/lib/auth"
import { getAdventure } from "../../data"
import type { BodyId } from "../../types"
import { PORTRAIT } from "../portraits"
import { onCelebrate } from "../rewards/reward-bus"
import { archivo } from "../status/evo-skin"
import { FightPlate, plateHeight, plateWidth } from "./fight-plate"
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

export function CharHud({ name, body, vitals, hidden = false }: { name: string; body: BodyId; vitals: HudVitals | null; hidden?: boolean }) {
  const t = useTranslations("MeuMundo")
  const [level, setLevel] = useState<number | null>(null)
  const [pw, setPw] = useState(64)

  // tamanho pela tela
  useEffect(() => {
    const on = () => setPw(hudPw())
    on()
    window.addEventListener("resize", on)
    return () => window.removeEventListener("resize", on)
  }, [])

  // nível de aventura: uma vez ao montar + cada recibo celebrado
  useEffect(() => {
    let alive = true
    const token = getToken()
    if (token)
      void getAdventure(token).then((r) => {
        if (alive && r.ok) setLevel(r.data.adventure.level)
      })
    const off = onCelebrate((r) => {
      const to = r.deltas?.xp?.to
      if (typeof to === "number" && to > 0) setLevel(to)
    })
    return () => {
      alive = false
      off()
    }
  }, [])

  // o card de missão fica logo abaixo do HUD
  const total = Math.ceil(plateHeight(pw) + pw * 0.34)
  useEffect(() => {
    const el = document.documentElement
    el.style.setProperty("--mm-hud-h", hidden ? "0px" : `${total}px`)
    return () => {
      el.style.removeProperty("--mm-hud-h")
    }
  }, [hidden, total])

  if (hidden) return null
  const v = vitals
  const health = v ? Math.max(0, v.health) : 0
  const vit = v ? Math.max(1, v.vitality || 100) : 100
  const energy = v ? Math.max(0, Math.min(100, v.energy)) : 0
  const stress = v ? Math.max(0, Math.min(100, v.stress)) : 0
  const label = (k: string, f: string, n: number, m: number) => `${t(k, f)}: ${Math.round(n)} / ${m}`
  return (
    <div className={`${c.hud} ${archivo.className}`} aria-label={t("hudAria", "Seu personagem")} role="group">
      <FightPlate
        pw={pw}
        barK={BAR_K}
        portrait={PORTRAIT[body] ?? PORTRAIT.normal}
        name={name}
        hp={health}
        hpMax={vit}
        stam={energy / 100}
        // estresse = a tira violeta (a mesma cor do poder na luta); acende no alto
        power={{ v: stress / 100, ready: stress >= 70 }}
      >
        <div className={c.foot} style={{ marginLeft: pw + 6, width: plateWidth(pw, BAR_K) - pw - 6, fontSize: Math.max(10, pw * 0.2) }}>
          {level != null && <span className={c.level}>{t("hudLevel", "Nv. {n}").replace("{n}", String(level))}</span>}
          {v && (
            <span className={c.legend} aria-hidden>
              <i style={{ background: "#ffaa4a" }} />
              {Math.round(energy)}
              <i style={{ background: "#b98aff" }} />
              {Math.round(stress)}
            </span>
          )}
        </div>
      </FightPlate>
      {/* leitor de tela: os três valores por extenso */}
      {v && (
        <ul className="sr-only">
          <li>{label("vitalHealth", "Saúde", health, Math.round(vit))}</li>
          <li>{label("vitalEnergy", "Energia", energy, 100)}</li>
          <li>{label("vitalStress", "Estresse", stress, 100)}</li>
        </ul>
      )}
    </div>
  )
}
