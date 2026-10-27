// A FAIXA DE SEÇÃO do Esportes: paralelogramo com listras de velocidade —
// a energia diagonal sem `rotate` (a pele zera o -rotate-2) e sem cantos
// arredondados. Kicker em cima, título Anton, ação opcional à direita.

import type { ReactNode } from "react"
import { BAND_CLIP, SP, TX } from "./sp-tokens"

export function SpeedBand({
  title,
  kicker,
  icon,
  action,
  color = SP.band,
  ink = SP.ink,
  className,
}: {
  title: ReactNode
  kicker?: ReactNode
  icon?: ReactNode
  action?: ReactNode
  color?: string
  ink?: string
  className?: string
}) {
  return (
    <div className={`flex items-stretch gap-2 ${className ?? ""}`}>
      <div
        className="relative flex min-w-0 flex-1 items-center gap-2 border-2 border-[#0B0B0D] py-2 pl-3 pr-6"
        style={{ background: color, color: ink, clipPath: BAND_CLIP }}
      >
        <span aria-hidden className="pointer-events-none absolute inset-0" style={{ background: TX.speed }} />
        {icon && <span className="relative shrink-0">{icon}</span>}
        <div className="relative min-w-0">
          {kicker && (
            <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] opacity-80">{kicker}</p>
          )}
          <h2 className="fl-display truncate text-xl leading-none md:text-2xl">{title}</h2>
        </div>
      </div>
      {action && <div className="flex shrink-0 items-center">{action}</div>}
    </div>
  )
}
