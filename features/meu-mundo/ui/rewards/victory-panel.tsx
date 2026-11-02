"use client"

// features/meu-mundo/ui/rewards/victory-panel.tsx — mm3d-60: o fim da luta em celebração steampunk.
//
// Só APRESENTAÇÃO: quem decide vitória, prêmio e o que os botões fazem é quem
// chama (laminas-view: o prêmio é o recibo que o SERVIDOR conferiu). A moldura
// é opaca; luz, raios e faíscas são camadas decorativas que respeitam o nível
// de efeito (`html[data-mm-fx]`) e o movimento reduzido.

import { useId, useState, type CSSProperties, type ReactNode } from "react"
import { SteamFrame, gearPath } from "../kit/steam/steam-frame"
import { currentUiFx } from "../kit/steam/fx-tier"
import { archivo, cinzel } from "../status/evo-skin"
import v from "./victory.module.css"

const EMBERS = Array.from({ length: 12 }, (_, i) => ({
  left: `${8 + ((i * 53) % 84)}%`,
  ex: `${((i * 29) % 60) - 30}px`,
  ey: `${-140 - ((i * 41) % 90)}px`,
  delay: `${300 + ((i * 97) % 900)}ms`,
}))

/** Emblema mecânico: engrenagem de latão com o cristal (ciano na vitória, rubi na derrota). */
function Emblem({ win }: { win: boolean }) {
  const id = useId().replace(/:/g, "")
  const gem = win ? "#20D9E9" : "#FF526A"
  return (
    <svg viewBox="0 0 80 80" className={v.emblem} aria-hidden style={{ "--gem": gem } as CSSProperties}>
      <defs>
        <linearGradient id={`e${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FFE9B0" />
          <stop offset="0.4" stopColor="#E8B65B" />
          <stop offset="0.75" stopColor="#9A6424" />
          <stop offset="1" stopColor="#5E3B12" />
        </linearGradient>
      </defs>
      <g className={v.emblemGear}>
        <path d={gearPath(40, 40, 14, 37, 31)} fill={`url(#e${id})`} stroke="#2A1A07" strokeWidth="1" />
      </g>
      <circle cx="40" cy="40" r="25" fill="#10151B" stroke="#FFD68A" strokeWidth="1.6" />
      <circle cx="40" cy="40" r="21" fill="none" stroke={gem} strokeOpacity="0.55" strokeWidth="1" strokeDasharray="2 4" />
      <g className={v.emblemCrystal}>
        <path d="M40 24 50 40 40 56 30 40Z" fill={gem} />
        <path d="M40 24 44 40 40 56" fill="#FFFFFF" fillOpacity="0.45" />
      </g>
    </svg>
  )
}

export function VictoryPanel({ win, title, subtitle, children, actions }: { win: boolean; title: string; subtitle: string; children?: ReactNode; actions: ReactNode }) {
  const [fx] = useState(currentUiFx)
  return (
    <div className={`${v.veil} ${archivo.className}`}>
      <div className={`${v.wrap} ${win ? "" : v.lose}`} role="dialog" aria-modal="true" aria-label={title}>
        {win && <div className={v.rays} aria-hidden />}
        <SteamFrame cornerSize={56}>
          <div className={v.body}>
            <Emblem win={win} />
            <div className={v.titleBox}>
              <span className={v.titleGlow} aria-hidden />
              <h2 className={`${cinzel.className} ${v.title}`}>{title}</h2>
              {win && (
                <span aria-hidden className={`${cinzel.className} ${v.title} ${v.titleSweep}`}>
                  {title}
                </span>
              )}
            </div>
            <div className={v.rule} aria-hidden>
              <span className={v.ruleDot} />
            </div>
            <p className={v.sub}>{subtitle}</p>
            {children && <div className="mt-3">{children}</div>}
            <div className={v.actions}>{actions}</div>
          </div>
        </SteamFrame>
        {win &&
          fx !== "low" &&
          EMBERS.slice(0, fx === "high" ? 12 : 6).map((e, i) => (
            <span key={i} aria-hidden className={v.ember} style={{ left: e.left, "--ex": e.ex, "--ey": e.ey, animationDelay: e.delay } as CSSProperties} />
          ))}
      </div>
    </div>
  )
}

/** Botão do fim da luta: principal (ouro aceso, »») ou alternativo (metal). */
export function VictoryButton({ children, onClick, alt = false }: { children: ReactNode; onClick: () => void; alt?: boolean }) {
  return (
    <button type="button" onClick={onClick} className={`${cinzel.className} ${v.cta} ${alt ? v.ctaAlt : ""}`}>
      <span>{children}</span>
      {!alt && <span aria-hidden>»</span>}
    </button>
  )
}
