"use client"

// features/meu-mundo/ui/opening/character-card.tsx — o CARREGAMENTO disfarçado de
// abertura (apresentação 13, Anexo A §1): o retrato do personagem de quem joga e o
// nome GIGANTE (72 px, Anton; 40 se não cabe numa linha), saindo de um preto de 0,3 s.
// O que está sendo montado vira o indicador discreto do canto de baixo à esquerda
// (11 px + fio de 1 px). Sem barra no meio da tela. Tempos em opening.module.css.

import { useEffect, useState } from "react"
import { anton } from "../hud/fight-plate"
import { PORTRAIT } from "../portraits"
import { archivo } from "../status/evo-skin"
import { TYPE } from "../kit/type-scale"
import { useHero, type Hero } from "./hero"
import o from "./opening.module.css"

/** 72 se o nome cabe numa linha na largura dada; senão 40 (Anton caixa alta ≈ 0,5 em por letra). */
export function cardNameSize(name: string, width: number) {
  return name.length * 0.5 * TYPE.hero <= width ? TYPE.hero : TYPE.banner
}

export function LoadMeter({ text, done, total }: { text: string; done?: number; total?: number }) {
  const known = total != null && total > 0 && done != null
  return (
    <div className={`${o.meter} ${archivo.className}`} role="status" aria-live="polite">
      {text}
      <span className={o.meterBar} aria-hidden>
        {known ? <span className={o.meterFill} style={{ transform: `scaleX(${Math.min(1, done! / total!)})` }} /> : <span className={o.meterRun} />}
      </span>
    </div>
  )
}

export function CharacterCard({ text, hero: heroProp, inline = false }: { text: string; hero?: Hero | null; inline?: boolean }) {
  const stored = useHero()
  const hero = heroProp ?? stored
  const [width, setWidth] = useState(358)
  useEffect(() => {
    const on = () => setWidth(Math.max(200, window.innerWidth - 32))
    on()
    window.addEventListener("resize", on)
    return () => window.removeEventListener("resize", on)
  }, [])
  return (
    <div className={o.screen} data-inline={inline ? "" : undefined}>
      {hero && (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element -- retrato local, uma imagem só */}
          <img className={o.portrait} src={PORTRAIT[hero.body]} alt="" decoding="async" />
          <div className={o.cardShade} />
          <div className={o.cardText}>
            <span className={`${anton.className} ${o.cardName}`} style={{ fontFamily: anton.style.fontFamily, fontSize: cardNameSize(hero.name, width) }}>
              {hero.name}
            </span>
          </div>
        </>
      )}
      <LoadMeter text={text} />
      <div className={o.fromBlack} />
    </div>
  )
}
