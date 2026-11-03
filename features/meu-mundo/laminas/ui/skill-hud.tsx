"use client"

// features/meu-mundo/laminas/ui/skill-hud.tsx — os botões de habilidade da luta (2026-11-03).
//
// Desenho da imagem de referência do Alex ("combate mobile RPG premium"):
// ATACAR grande dourado embaixo à direita; ESQUIVAR azul à esquerda dele;
// em arco por cima: INVESTIDA (6 s), CORTE MÁGICO (8 s), PODER MÁXIMO (12 s
// depois de usar; enche com os acertos) e ESCUDO DE LUZ (18 s). Os ícones
// são os da referência (public/meu-mundo/laminas/skills, por
// pipeline/laminas/build_skill_icons.py); aro, recarga, selo de tempo e o
// texto o jogo desenha por cima (recarga ao vivo e os 3 idiomas).
//
// A recarga é a da REGRA (hud.cd, vem do fight.ts) — o botão só mostra; quem
// decide se a habilidade sai é a luta (e o servidor, na re-simulação).
// Cada botão é um elemento próprio: joystick e botões aceitam vários dedos.

import { useEffect, useRef, useState } from "react"
import { useTranslations } from "@/components/i18n/I18nProvider"
import { anton } from "../../ui/hud/fight-plate"
import { POWER, SKILLS, type Cooldowns, type SkillId } from "../sim/fight"
import s from "./skill-hud.module.css"

const ICON = "/meu-mundo/laminas/skills"

/** Posições na imagem de referência (941 × 1672): centro e diâmetro, contados do canto de baixo à direita. */
const LAYOUT = {
  attack: { r: 201, b: 242, w: 270, h: 274 },
  dodge: { r: 448, b: 150, w: 195, h: 155 },
  dash: { r: 512, b: 315, d: 160 },
  slash: { r: 459, b: 475, d: 160 },
  ult: { r: 298, b: 535, d: 160 },
  shield: { r: 124, b: 480, d: 160 },
}
/** A referência tem a margem do aparelho embutida (~16 px na tela dela). */
const REF_MARGIN = 36

const TONE: Record<SkillId | "ult", string> = { slash: "#ff8a2a", dash: "#3aa8ff", shield: "#b26bff", ult: "#ffb02e" }

export interface SkillHudProps {
  cd: Cooldowns
  power: number
  /** Escudo ainda aceso (s). */
  shield: number
  /** Computador: mostra as teclas. */
  keys: boolean
  /** Habilidade recusada agora (o botão treme). */
  denied: { id: SkillId | "ult"; n: number } | null
  onAttack: () => void
  onDodge: () => void
  onSkill: (id: SkillId) => void
  onPower: () => void
}

/** Escala: px da tela por px da referência (celular em pé ≈ largura/941). */
function useScale() {
  const [k, setK] = useState(0.42)
  useEffect(() => {
    const f = () => setK(Math.min(window.innerWidth / 941, window.innerHeight / 1500, 0.46))
    f()
    window.addEventListener("resize", f)
    return () => window.removeEventListener("resize", f)
  }, [])
  return k
}

/** `data-press` enquanto o dedo está em cima (o CSS faz o aperto e o quique). */
function usePress() {
  const [on, setOn] = useState(false)
  return {
    "data-press": on ? "1" : "0",
    onPointerUp: () => setOn(false),
    onPointerCancel: () => setOn(false),
    onPointerLeave: () => setOn(false),
    press: () => setOn(true),
  }
}

/** Liga um atributo por `ms` quando `trigger` muda (pronta de novo, recusada). */
function usePulse(trigger: unknown, ms: number, when = true) {
  const [on, setOn] = useState(false)
  const first = useRef(true)
  useEffect(() => {
    if (first.current) {
      first.current = false
      return
    }
    if (!when) return
    setOn(true)
    const id = setTimeout(() => setOn(false), ms)
    return () => clearTimeout(id)
  }, [trigger, ms, when])
  return on
}

function Stopwatch() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden>
      <circle cx="12" cy="13.5" r="7.5" />
      <path d="M12 13.5V9.5M9.5 2.5h5M12 2.5V6" />
    </svg>
  )
}

function SkillButton({
  id,
  k,
  icon,
  label,
  keyName,
  left,
  total,
  fill,
  max,
  denied,
  active,
  onFire,
}: {
  id: SkillId | "ult"
  k: number
  icon: string
  label: string
  keyName: string | null
  /** Recarga restante e a cheia (s). */
  left: number
  total: number
  /** Poder: carga 0–1 (null nas outras). */
  fill: number | null
  max: boolean
  denied: number
  /** Escudo aceso (anel violeta). */
  active: boolean
  onFire: () => void
}) {
  const L = LAYOUT[id]
  const size = L.d * k
  const cooling = left > 0.05
  const ready = usePulse(cooling, 650, !cooling)
  const shake = usePulse(denied, 320, denied > 0)
  const p = usePress()
  const frac = cooling ? left / total : 0
  const R = 46
  const C = 2 * Math.PI * R
  // aro azul: na recarga mostra o que já voltou; o poder mostra a carga
  const arc = fill !== null && !cooling ? fill : cooling ? 1 - frac : 1
  const tone = TONE[id]
  const shown = cooling ? `${Math.ceil(left)}s` : fill !== null && !max ? `${Math.round(fill * 100)}%` : `${total}s`
  return (
    <button
      type="button"
      aria-label={label}
      className={`${s.btn} ${cooling ? s.cooling : !max && fill === null ? s.idlePulse : ""} ${max ? s.max : ""}`}
      data-ready={ready ? "1" : "0"}
      data-denied={shake ? "1" : "0"}
      style={{ right: (L.r - REF_MARGIN) * k, bottom: (L.b - REF_MARGIN) * k, width: size, height: size, ["--tone" as string]: tone, fontSize: Math.max(11, size * 0.2) }}
      data-press={p["data-press"]}
      onPointerDown={(e) => {
        e.preventDefault()
        p.press()
        onFire()
      }}
      onPointerUp={p.onPointerUp}
      onPointerCancel={p.onPointerCancel}
      onPointerLeave={p.onPointerLeave}
    >
      <div className={s.face}>
        {max && <div className={s.orbit} />}
        <div className={s.art}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`${ICON}/${icon}.webp`} alt="" draggable={false} />
          {cooling && <div className={s.shade} style={{ ["--left" as string]: `${frac * 360}deg` }} />}
        </div>
        <svg className={s.ringSvg} viewBox="0 0 100 100">
          <defs>
            <linearGradient id={`mm-sk-bronze-${id}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#d9a35c" />
              <stop offset="0.5" stopColor="#7a4a22" />
              <stop offset="1" stopColor="#c48a48" />
            </linearGradient>
          </defs>
          <circle cx="50" cy="50" r="47" fill="none" stroke="#120a08" strokeWidth="5" />
          <circle cx="50" cy="50" r="46" fill="none" stroke={`url(#mm-sk-bronze-${id})`} strokeWidth="4.2" />
          <circle cx="50" cy="50" r="41.6" fill="none" stroke="#2a160c" strokeWidth="1.2" />
          <circle
            cx="50"
            cy="50"
            r={R}
            fill="none"
            stroke={max ? "#ffc44d" : active ? "#c88bff" : "#5fd2ff"}
            strokeWidth="3.4"
            strokeLinecap="round"
            strokeDasharray={`${C * arc} ${C}`}
            transform="rotate(-90 50 50)"
            style={{ filter: `drop-shadow(0 0 2px ${max ? "#ffb02e" : "#3ab8ff"})`, transition: "stroke-dasharray 120ms linear" }}
          />
        </svg>
        <div className={s.gem} />
        <div className={`${s.badge} ${anton.className}`}>
          {fill !== null && !cooling && !max ? null : <Stopwatch />}
          {shown}
        </div>
        {max && <div className={`${s.maxTag} ${anton.className}`}>MAX</div>}
        <div className={s.flash} />
        {[0, 60, 120, 180, 240, 300].map((a) => (
          <span key={a} className={s.spark} style={{ ["--a" as string]: `${a}deg` }} />
        ))}
        {keyName && <span className={s.key}>{keyName}</span>}
      </div>
    </button>
  )
}

export function SkillHud({ cd, power, shield, keys, denied, onAttack, onDodge, onSkill, onPower }: SkillHudProps) {
  const t = useTranslations("MeuMundo")
  const k = useScale()
  const atk = usePress()
  const dg = usePress()
  const fill = Math.max(0, Math.min(1, power / POWER.max))
  const max = fill >= 1 && cd.ult <= 0.05
  const deniedN = (id: SkillId | "ult") => (denied && denied.id === id ? denied.n : 0)
  const A = LAYOUT.attack
  const D = LAYOUT.dodge
  return (
    <div className={s.root} style={{ right: "max(16px, env(safe-area-inset-right))", bottom: "max(16px, env(safe-area-inset-bottom))", width: 1, height: 1 }}>
      <SkillButton id="dash" k={k} icon="dash" label={t("skillDash", "Investida Relâmpago")} keyName={keys ? "2" : null} left={cd.dash} total={SKILLS.dash.cd} fill={null} max={false} denied={deniedN("dash")} active={false} onFire={() => onSkill("dash")} />
      <SkillButton id="slash" k={k} icon="slash" label={t("skillSlash", "Corte Mágico")} keyName={keys ? "1" : null} left={cd.slash} total={SKILLS.slash.cd} fill={null} max={false} denied={deniedN("slash")} active={false} onFire={() => onSkill("slash")} />
      <SkillButton id="ult" k={k} icon="ult" label={t("skillUlt", "Poder Máximo")} keyName={keys ? "Q" : null} left={cd.ult} total={SKILLS.ult.cd} fill={fill} max={max} denied={deniedN("ult")} active={false} onFire={onPower} />
      <SkillButton id="shield" k={k} icon="shield" label={t("skillShield", "Escudo de Luz")} keyName={keys ? "3" : null} left={cd.shield} total={SKILLS.shield.cd} fill={null} max={false} denied={deniedN("shield")} active={shield > 0} onFire={() => onSkill("shield")} />
      <button
        type="button"
        aria-label={t("laminasBtnDodge", "ESQUIVAR")}
        className={s.btn}
        data-press={dg["data-press"]}
        style={{ right: (D.r - REF_MARGIN) * k, bottom: (D.b - REF_MARGIN) * k, width: D.w * k, height: D.h * k, borderRadius: "45%" }}
        onPointerDown={(e) => {
          e.preventDefault()
          dg.press()
          onDodge()
        }}
        onPointerUp={dg.onPointerUp}
        onPointerCancel={dg.onPointerCancel}
        onPointerLeave={dg.onPointerLeave}
      >
        <div className={s.face}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className={s.whole} src={`${ICON}/dodge.webp`} alt="" draggable={false} />
          <span className={`${s.label} ${anton.className}`} style={{ top: "66.5%", fontSize: D.h * k * 0.19 }}>
            {t("laminasBtnDodge", "ESQUIVAR")}
          </span>
          <div className={`${s.burst} ${s.dodgeBurst}`} />
          {keys && <span className={s.key}>K</span>}
        </div>
      </button>
      <button
        type="button"
        aria-label={t("laminasBtnAttack", "ATACAR")}
        className={s.btn}
        data-press={atk["data-press"]}
        style={{ right: (A.r - REF_MARGIN) * k, bottom: (A.b - REF_MARGIN) * k, width: A.w * k, height: A.h * k }}
        onPointerDown={(e) => {
          e.preventDefault()
          atk.press()
          onAttack()
        }}
        onPointerUp={atk.onPointerUp}
        onPointerCancel={atk.onPointerCancel}
        onPointerLeave={atk.onPointerLeave}
      >
        <div className={s.face}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className={s.whole} src={`${ICON}/attack.webp`} alt="" draggable={false} />
          <span className={`${s.label} ${anton.className}`} style={{ top: "66%", fontSize: A.h * k * 0.135 }}>
            {t("laminasBtnAttack", "ATACAR")}
          </span>
          <div className={s.burst} />
          {keys && <span className={s.key} style={{ left: "14%", top: "14%" }}>J</span>}
        </div>
      </button>
    </div>
  )
}
