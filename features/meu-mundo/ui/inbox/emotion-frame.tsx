"use client"

// features/meu-mundo/ui/inbox/emotion-frame.tsx — a NOTIFICAÇÃO EMOCIONAL (2026-11-03).
//
// Desenho da referência do Alex ("moldura fantasy premium"): escudo angular à
// esquerda com o personagem de meio corpo SAINDO por cima, painel horizontal
// chanfrado à direita, ouro metálico em 4 camadas (volume escuro, ouro em
// degradê, fio de luz, brilho), vermelho/laranja aceso embaixo, sombra preta
// que segue o desenho, losango no alto do painel e alguns pontos de luz.
//
// Camadas (de trás para a frente): brilho (pulsa) → peça com sombra → retrato
// → borda de baixo do escudo (por cima do retrato) → texto, ação e fechar.
// Tudo em SVG + CSS, sem laço por quadro; só a ação e o fechar recebem toque.
//
// Ajustes: emotion-frame.module.css (.root: --glow-gold, --glow-red, --shadow,
// --portrait-h, --w). Geometria: as constantes SHIELD/PANEL abaixo (viewBox 1110 × 380).

import { useId } from "react"
import { X } from "lucide-react"
import s from "./emotion-frame.module.css"

/** Escudo do retrato (por fora e o filete de dentro). */
const SHIELD = "M22 231 L70 72 L267 55 L373 173 L373 335 L342 368 L47 368 L22 342 Z"
const SHIELD_IN = "M33 235 L77 83 L262 67 L362 178 L362 330 L337 357 L52 357 L33 337 Z"
/** Painel do texto (canto direito em recortes). */
const PANEL = "M300 165 L1030 165 L1070 198 L1070 325 L1038 358 L300 358 Z"
const PANEL_IN = "M300 175 L1026 175 L1060 203 L1060 320 L1034 348 L300 348 Z"
/** Só a parte de baixo do escudo (fica por cima do retrato). */
const SHIELD_FRONT = "M373 262 L373 335 L342 368 L47 368 L22 342 L22 262"

export interface EmotionFrameProps {
  message: string
  extra?: string | null
  action?: { label: string; run: () => void } | null
  onClose: () => void
  closeLabel: string
  /** Retrato: recorte sem fundo (sai pela moldura) ou imagem com fundo (fica dentro). */
  art?: { src: string; cutout: boolean } | null
  /** No lugar do retrato (comunicado/promoção). */
  mark?: React.ReactNode
  badge?: React.ReactNode
  leaving?: boolean
  /** Barra do tempo (ms) e se está parada. */
  timerMs?: number
  paused?: boolean
  urgent?: boolean
  className?: string
}

export function EmotionFrame({ message, extra, action, onClose, closeLabel, art, mark, badge, leaving, timerMs, paused, urgent, className }: EmotionFrameProps) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, "")
  const u = (k: string) => `${k}-${id}`
  return (
    <div className={`${s.root} ${leaving ? s.leaving : ""} ${className ?? ""}`}>
      {/* 1 · brilho atrás: dourado nas bordas + vermelho/laranja embaixo */}
      <svg className={`${s.layer} ${s.glow}`} viewBox="0 0 1110 380" aria-hidden>
        <defs>
          <filter id={u("gg")} x="-35%" y="-70%" width="170%" height="240%">
            <feGaussianBlur stdDeviation="5" />
          </filter>
          <filter id={u("gr")} x="-20%" y="-80%" width="140%" height="260%">
            <feGaussianBlur stdDeviation="12" />
          </filter>
          <radialGradient id={u("hot")}>
            <stop offset="0%" stopColor="#fffabe" stopOpacity="0.96" />
            <stop offset="14%" stopColor="#ffad2d" stopOpacity="0.84" />
            <stop offset="36%" stopColor="#ff410e" stopOpacity="0.55" />
            <stop offset="65%" stopColor="#b40000" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#b40000" stopOpacity="0" />
          </radialGradient>
        </defs>
        <path d={PANEL} fill="none" stroke="#ffb92d" strokeWidth="7" filter={`url(#${u("gg")})`} />
        <path d={SHIELD} fill="none" stroke="#ffb92d" strokeWidth="7" filter={`url(#${u("gg")})`} />
        <g className={s.red}>
          {/* vermelho largo + laranja colado na borda de baixo */}
          <path d="M60 372 L342 372 L373 340 L1038 364 L1070 330" fill="none" stroke={urgent ? "#e0101a" : "#c40d0d"} strokeWidth="34" filter={`url(#${u("gr")})`} opacity="0.9" />
          <path d="M47 368 L342 368 L373 345 L1038 358 L1070 325" fill="none" stroke="#ff6a00" strokeWidth="13" filter={`url(#${u("gg")})`} opacity="1" />
          <ellipse cx="690" cy="360" rx="240" ry="30" fill={`url(#${u("hot")})`} />
          <ellipse cx="980" cy="356" rx="120" ry="20" fill={`url(#${u("hot")})`} opacity="0.7" />
          <ellipse cx="200" cy="370" rx="120" ry="16" fill={`url(#${u("hot")})`} opacity="0.55" />
        </g>
      </svg>

      {/* 2 · a peça (sombra preta pelo CSS do .frame) */}
      <svg className={`${s.layer} ${s.frame}`} viewBox="0 0 1110 380" aria-hidden>
        <defs>
          <linearGradient id={u("metal")} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#fff0a0" />
            <stop offset="13%" stopColor="#ffc64f" />
            <stop offset="35%" stopColor="#b97715" />
            <stop offset="65%" stopColor="#edaa29" />
            <stop offset="88%" stopColor="#ffe07b" />
            <stop offset="100%" stopColor="#8c4d0d" />
          </linearGradient>
          <linearGradient id={u("panel")} x1="0" y1="0" x2="1" y2="0.42">
            {/* opacidade padrão do jogo (a mesma do menu lateral e dos modais, ~0,6) */}
            <stop offset="0%" stopColor="#1c1e28" stopOpacity="0.62" />
            <stop offset="42%" stopColor="#171820" stopOpacity="0.58" />
            <stop offset="78%" stopColor="#251c27" stopOpacity="0.62" />
            <stop offset="100%" stopColor="#17141b" stopOpacity="0.64" />
          </linearGradient>
          <radialGradient id={u("panelRed")} cx="0.9" cy="1" r="0.6">
            <stop offset="0%" stopColor="#691b23" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#691b23" stopOpacity="0" />
          </radialGradient>
          <linearGradient id={u("panelBottom")} x1="0" y1="0" x2="0" y2="1">
            <stop offset="70%" stopColor="#ff6a1a" stopOpacity="0" />
            <stop offset="100%" stopColor="#ff6a1a" stopOpacity="0.16" />
          </linearGradient>
          <radialGradient id={u("shieldFill")} cx="0.5" cy="0.35" r="0.75">
            <stop offset="0%" stopColor="#2a2430" stopOpacity="0.62" />
            <stop offset="100%" stopColor="#111118" stopOpacity="0.64" />
          </radialGradient>
          {/* fio de luz: forte em cima e à esquerda, some no meio (não é igual em toda a borda) */}
          <linearGradient id={u("hl")} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#fffbd4" stopOpacity="1" />
            <stop offset="40%" stopColor="#fff1ad" stopOpacity="0.35" />
            <stop offset="70%" stopColor="#fff1ad" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#fff1ad" stopOpacity="0.3" />
          </linearGradient>
          <radialGradient id={u("spot")}>
            <stop offset="0%" stopColor="#fffef0" stopOpacity="1" />
            <stop offset="18%" stopColor="#ffe17c" stopOpacity="0.9" />
            <stop offset="55%" stopColor="#ff9b20" stopOpacity="0.34" />
            <stop offset="100%" stopColor="#ff6a00" stopOpacity="0" />
          </radialGradient>
        </defs>
        {/* painel */}
        <path d={PANEL} fill={`url(#${u("panel")})`} />
        <path d={PANEL} fill={`url(#${u("panelRed")})`} />
        <path d={PANEL} fill={`url(#${u("panelBottom")})`} />
        <path d={PANEL} fill="none" stroke="#72400c" strokeWidth="11" strokeLinejoin="miter" />
        <path d={PANEL} fill="none" stroke={`url(#${u("metal")})`} strokeWidth="6.5" strokeLinejoin="miter" />
        <path d={PANEL} fill="none" stroke={`url(#${u("hl")})`} strokeWidth="1.6" strokeLinejoin="miter" />
        <path d={PANEL_IN} fill="none" stroke="#a6650d" strokeWidth="1.4" opacity="0.85" />
        <path d="M380 165 L1030 165" fill="none" stroke="#fffbd4" strokeWidth="2.4" strokeLinecap="round" className={s.shimmer} />
        {/* escudo (por cima do painel) */}
        <path d={SHIELD} fill={`url(#${u("shieldFill")})`} />
        <path d={SHIELD} fill="none" stroke="#72400c" strokeWidth="12" strokeLinejoin="miter" />
        <path d={SHIELD} fill="none" stroke={`url(#${u("metal")})`} strokeWidth="7" strokeLinejoin="miter" />
        <path d={SHIELD} fill="none" stroke={`url(#${u("hl")})`} strokeWidth="1.8" strokeLinejoin="miter" />
        <path d={SHIELD_IN} fill="none" stroke="#e7a62c" strokeWidth="1.6" opacity="0.8" />
        {/* losango no alto do painel */}
        {/* (a posição fica no grupo de fora: a animação do CSS mexe no transform do de dentro) */}
        <g transform="translate(690 165)">
          <g className={s.diamond}>
            <path d="M0 -21 L21 0 L0 21 L-21 0 Z" fill="#875011" stroke="#4a2a06" strokeWidth="2" />
            <path d="M0 -15 L15 0 L0 15 L-15 0 Z" fill="#ffcc45" stroke="#fff2a0" strokeWidth="2" />
            <path d="M0 -6 L6 0 L0 6 L-6 0 Z" fill="#fffbe0" />
            <circle cx="0" cy="-18" r="9" fill={`url(#${u("spot")})`} />
          </g>
        </g>
        {/* pontos de luz: junção do escudo, base, canto de baixo à direita */}
        <circle cx="373" cy="176" r="20" fill={`url(#${u("spot")})`} />
        <circle cx="690" cy="358" r="26" fill={`url(#${u("spot")})`} />
        <circle cx="1040" cy="356" r="16" fill={`url(#${u("spot")})`} />
        <circle cx="70" cy="72" r="12" fill={`url(#${u("spot")})`} />
        <path d="M373 152 L376 172 L396 176 L376 180 L373 200 L370 180 L350 176 L370 172 Z" fill="#fffbe6" opacity="0.9" />
        <path d="M690 340 L692 354 L706 358 L692 362 L690 376 L688 362 L674 358 L688 354 Z" fill="#fffbe6" opacity="0.85" />
      </svg>

      {/* 3 · o retrato */}
      {art?.cutout ? (
        <div className={s.cutout}>
          {/* eslint-disable-next-line @next/next/no-img-element -- recorte pequeno e estático, cache do navegador */}
          <img src={art.src} alt="" draggable={false} decoding="async" />
        </div>
      ) : art ? (
        <div className={s.boxed}>
          {/* eslint-disable-next-line @next/next/no-img-element -- retrato pequeno e estático */}
          <img src={art.src} alt="" draggable={false} decoding="async" />
        </div>
      ) : mark ? (
        <div className={s.mark}>{mark}</div>
      ) : null}

      {/* 4 · a borda de baixo do escudo passa por cima do retrato */}
      {art?.cutout && (
        <svg className={s.layer} viewBox="0 0 1110 380" aria-hidden>
          <defs>
            <linearGradient id={u("metal2")} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#edaa29" />
              <stop offset="60%" stopColor="#ffe07b" />
              <stop offset="100%" stopColor="#8c4d0d" />
            </linearGradient>
          </defs>
          <path d={SHIELD_FRONT} fill="none" stroke="#72400c" strokeWidth="12" strokeLinejoin="miter" />
          <path d={SHIELD_FRONT} fill="none" stroke={`url(#${u("metal2")})`} strokeWidth="7" strokeLinejoin="miter" />
          <path d={SHIELD_FRONT} fill="none" stroke="#fff1ad" strokeWidth="1.4" strokeLinejoin="miter" opacity="0.6" />
        </svg>
      )}

      {badge && <span className={s.badge}>{badge}</span>}

      {/* 5 · texto, ação e fechar */}
      <div className={s.body}>
        <p className={s.msg}>{message}</p>
        {extra && <p className={s.extra}>{extra}</p>}
        {action && (
          <button type="button" className={s.action} onClick={action.run}>
            <span>{action.label}</span>
            <svg viewBox="0 0 12 20" width="0.6em" height="1em" aria-hidden>
              <path d="M2 2 L10 10 L2 18" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        )}
      </div>
      <button type="button" className={s.close} onClick={onClose} aria-label={closeLabel}>
        <X strokeWidth={3} />
      </button>
      {timerMs ? <span aria-hidden className={s.timer} data-paused={paused || undefined} style={{ animationDuration: `${timerMs}ms` }} /> : null}
    </div>
  )
}
