"use client"

// features/meu-mundo/ui/rewards/fight-result.tsx — o resultado da luta em COLUNA (apresentação 11, 2026-11-11).
//
// Anexo A §6 convertido para o celular em pé: fundo escuro, tudo alinhado à esquerda numa
// coluna — letreiro (72 px) · frase · tempo, maior sequência e vida · a linha de quem lutou ·
// prêmios (o recibo do SERVIDOR) — e o toque em qualquer lugar continua. Só apresentação: quem
// decide vitória, prêmio e o que o toque faz é quem chama (laminas-view).
// Entra em 0,24 s por bloco (opacidade + deslize de 16 px), 60 ms entre blocos; o toque só vale
// depois de 0,8 s (quem estava martelando o ATACAR não pula o resultado sem ver).

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react"
import { useTranslations } from "@/components/i18n/I18nProvider"
import { anton } from "../hud/fight-plate"
import { archivo } from "../status/evo-skin"
import r from "./fight-result.module.css"

const ARM_MS = 800

export interface FightResultProps {
  win: boolean
  /** O letreiro (VITÓRIA / DERROTA). */
  sign: string
  subtitle: string
  /** Quem lutou: retrato, nome e nível. */
  me: { portrait: string | null; name: string; level: number }
  stats: { time: number; combo: number; hp: number } | null
  /** Prêmios (linhas do recibo) ou o aviso de conferência. */
  children?: ReactNode
  /** O toque em qualquer lugar. */
  onContinue: () => void
  continueLabel: string
  /** Botão secundário (Lutar de novo). */
  again?: { label: string; onClick: () => void }
}

const mmss = (s: number) => {
  const n = Math.max(0, Math.round(s))
  return `${String(Math.floor(n / 60)).padStart(2, "0")}:${String(n % 60).padStart(2, "0")}`
}

export function FightResult({ win, sign, subtitle, me, stats, children, onContinue, continueLabel, again }: FightResultProps) {
  const t = useTranslations("MeuMundo")
  const [armed, setArmed] = useState(false)
  const goRef = useRef(onContinue)
  useEffect(() => {
    goRef.current = onContinue
  }, [onContinue])
  useEffect(() => {
    const id = setTimeout(() => setArmed(true), ARM_MS)
    return () => clearTimeout(id)
  }, [])
  useEffect(() => {
    if (!armed) return
    const key = (e: KeyboardEvent) => {
      if (e.key !== "Enter" && e.key !== " " && e.key !== "Escape") return
      e.preventDefault()
      goRef.current()
    }
    window.addEventListener("keydown", key)
    return () => window.removeEventListener("keydown", key)
  }, [armed])
  let i = 0
  const step = () => ({ "--d": `${i++ * 60}ms` }) as CSSProperties
  return (
    <div
      className={`${r.root} ${archivo.className}`}
      data-fight-result={win ? "win" : "lose"}
      role="dialog"
      aria-modal="true"
      aria-label={sign}
      onClick={() => armed && goRef.current()}
    >
      <div className={r.col}>
        <h2 className={`${r.sign} ${win ? r.signWin : r.signLose} ${r.in}`} style={{ ...step(), fontFamily: anton.style.fontFamily }}>
          {sign}
        </h2>
        <div className={`${r.rule} ${r.in}`} style={step()} aria-hidden />
        <p className={`${r.sub} ${r.in}`} style={step()}>
          {subtitle}
        </p>
        {stats && (
          <dl className={`${r.stats} ${r.in}`} style={step()}>
            <div>
              <dt>{t("fightResTime", "Tempo")}</dt>
              <dd style={{ fontFamily: anton.style.fontFamily }}>{mmss(stats.time)}</dd>
            </div>
            <div>
              <dt>{t("fightResCombo", "Maior sequência")}</dt>
              <dd style={{ fontFamily: anton.style.fontFamily }}>{stats.combo}</dd>
            </div>
            <div>
              <dt>{t("fightResHp", "Vida restante")}</dt>
              <dd style={{ fontFamily: anton.style.fontFamily }}>{Math.round(stats.hp * 100)}%</dd>
            </div>
          </dl>
        )}
        <div className={`${r.hero} ${r.in}`} style={step()}>
          <span className={r.lv} style={{ fontFamily: anton.style.fontFamily }}>
            <small>{t("fightResLv", "Nv.")}</small>
            {me.level}
          </span>
          <span className={r.face} style={me.portrait ? { backgroundImage: `url(${me.portrait})` } : undefined} aria-hidden />
          <span className={r.name}>{me.name}</span>
        </div>
        {children && (
          <div className={`${r.prizes} ${r.in}`} style={step()}>
            <div className={r.label}>{t("fightResPrizes", "Prêmios")}</div>
            {children}
          </div>
        )}
      </div>
      <div className={`${r.foot} ${r.in}`} style={step()}>
        {again && (
          <button
            type="button"
            className={r.again}
            onClick={(e) => {
              e.stopPropagation()
              again.onClick()
            }}
          >
            {again.label}
          </button>
        )}
        <span className={r.tap} data-armed={armed ? "" : undefined}>
          {continueLabel}
        </span>
      </div>
    </div>
  )
}
