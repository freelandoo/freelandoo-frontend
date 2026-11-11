"use client"

// features/meu-mundo/ui/opening/title-screen.tsx — a TELA DE TÍTULO (apresentação 13,
// Anexo A §1). Aparece logo ao abrir o jogo, enquanto o servidor confere o acesso e o
// motor 3D baixa por trás: arte de personagens em deriva lenta, logo no canto de cima
// à esquerda, um ícone só no canto direito (voltar ao perfil), "toque para começar"
// pequeno e centrado embaixo, e o indicador discreto da pré-carga no canto de baixo à
// esquerda. Ao tocar: preto de 0,3 s e só então a troca (o cartão de personagem sai
// do preto). Tempos em opening.module.css.
//
// Arte PROVISÓRIA: dois retratos do jogo. A arte do Alex entra trocando TITLE_ART.

import { useEffect, useRef, useState } from "react"
import { LogOut } from "lucide-react"
import { useTranslations } from "@/components/i18n/I18nProvider"
import { anton } from "../hud/fight-plate"
import { PORTRAIT } from "../portraits"
import { archivo } from "../status/evo-skin"
import { LoadMeter } from "./character-card"
import o from "./opening.module.css"

/** Arte de fundo do título: [atrás, à esquerda; na frente, à direita]. */
export const TITLE_ART = [PORTRAIT.aurion, PORTRAIT.vampira] as const

const BLACK_MS = 300

export function TitleScreen({ done, total, onStart, onExit }: { done: number; total: number; onStart: () => void; onExit: () => void }) {
  const t = useTranslations("MeuMundo")
  const [leaving, setLeaving] = useState(false)
  const [touch, setTouch] = useState(true)
  const timer = useRef<number | null>(null)
  useEffect(() => {
    setTouch(window.matchMedia("(pointer: coarse)").matches)
    return () => {
      if (timer.current != null) window.clearTimeout(timer.current)
    }
  }, [])
  const start = () => {
    if (leaving) return
    setLeaving(true)
    timer.current = window.setTimeout(onStart, BLACK_MS)
  }
  const ready = done >= total
  return (
    <div className={`${o.screen} ${archivo.className}`}>
      <div className={o.art} aria-hidden>
        {/* eslint-disable-next-line @next/next/no-img-element -- arte local fixa da abertura */}
        <img className={o.artImg} data-side="a" src={TITLE_ART[0]} alt="" decoding="async" />
        {/* eslint-disable-next-line @next/next/no-img-element -- arte local fixa da abertura */}
        <img className={o.artImg} data-side="b" src={TITLE_ART[1]} alt="" decoding="async" />
        <div className={o.shade} />
      </div>
      <div className={o.logo}>
        <span className={`${anton.className} ${o.logoName}`} style={{ fontFamily: anton.style.fontFamily }}>
          {t("opLogo", "Meu Mundo")}
        </span>
        <span className={o.logoTag}>{t("opTagline", "Observatório de Éter")}</span>
      </div>
      <button type="button" className={o.start} onClick={start} aria-label={t("opStart", "Toque para começar")} />
      <span className={o.call} aria-hidden>
        {touch ? t("opStart", "Toque para começar") : t("opStartPc", "Clique para começar")}
      </span>
      <button type="button" className={o.corner} onClick={onExit} aria-label={t("back", "Voltar ao perfil")} title={t("back", "Voltar ao perfil")}>
        <LogOut />
      </button>
      <LoadMeter text={ready ? t("opReady", "Mundo pronto") : t("opPreparing", "Preparando o mundo")} done={done} total={total} />
      <div className={o.black} data-on={leaving ? "" : undefined} />
    </div>
  )
}
