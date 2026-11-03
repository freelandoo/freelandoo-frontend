"use client"

// features/meu-mundo/ui/hud/shape.tsx — moldura em SVG do menu lateral (mm3d-60h).
//
// O Alex pediu o menu MENOS OPACO (o mundo aparece atrás). As molduras eram
// camadas sólidas empilhadas (ouro → sulco → ciano → grafite); com o miolo
// translúcido o ouro de baixo apareceria inteiro. Aqui a forma é desenhada uma
// vez em SVG no tamanho real da caixa: miolo translúcido + contorno de ouro +
// filete ciano por dentro. Cores pelas variáveis CSS (--sh-fill, --sh-rim,
// --sh-line) para o hover/ativo mudarem só no CSS. Mede a caixa com um
// ResizeObserver (só dispara quando o tamanho muda).

import { useEffect, useId, useRef, useState } from "react"

type Kind = "oct" | "point"

function pts(kind: Kind, w: number, h: number, c: number, i: number) {
  const x0 = i
  const y0 = i
  const x1 = w - i
  const y1 = h - i
  const cc = Math.max(2, c - i * 0.42)
  const P = (x: number, y: number) => `${x.toFixed(1)},${y.toFixed(1)}`
  if (kind === "point") return [P(x0 + cc, y0), P(x1 - cc, y0), P(x1, h / 2), P(x1 - cc, y1), P(x0 + cc, y1), P(x0, h / 2)].join(" ")
  return [P(x0 + cc, y0), P(x1 - cc, y0), P(x1, y0 + cc), P(x1, y1 - cc), P(x1 - cc, y1), P(x0 + cc, y1), P(x0, y1 - cc), P(x0, y0 + cc)].join(" ")
}

export function Shape({ kind = "oct", c = 14, className }: { kind?: Kind; c?: number; className?: string }) {
  const ref = useRef<SVGSVGElement | null>(null)
  const [s, setS] = useState({ w: 0, h: 0 })
  const id = useId().replace(/:/g, "")
  useEffect(() => {
    const box = ref.current?.parentElement
    if (!box) return
    const read = () => setS((o) => (o.w === box.offsetWidth && o.h === box.offsetHeight ? o : { w: box.offsetWidth, h: box.offsetHeight }))
    read()
    const ro = new ResizeObserver(read)
    ro.observe(box)
    return () => ro.disconnect()
  }, [])
  const { w, h } = s
  return (
    <svg ref={ref} className={className} width={w || 1} height={h || 1} aria-hidden style={{ position: "absolute", inset: 0, overflow: "visible", pointerEvents: "none" }}>
      <defs>
        <linearGradient id={`g${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FFE3A3" />
          <stop offset="0.25" stopColor="#E8B65B" />
          <stop offset="0.55" stopColor="#9A6424" />
          <stop offset="0.8" stopColor="#C8913F" />
          <stop offset="1" stopColor="#5E3B12" />
        </linearGradient>
      </defs>
      {w > 0 && (
        <>
          <polygon points={pts(kind, w, h, c, 1)} style={{ fill: "var(--sh-fill)", stroke: `var(--sh-rim, url(#g${id}))`, strokeWidth: 2 }} />
          <polygon points={pts(kind, w, h, c, 4.5)} style={{ fill: "none", stroke: "var(--sh-line)", strokeWidth: 1 }} />
        </>
      )}
    </svg>
  )
}
