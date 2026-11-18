// features/meu-mundo/gincana/ui/mem-symbol.tsx — Gincana 3 (G3-10): os 6 símbolos do Relógio da Praça
// em SVG, nas mesmas formas e cores do 3D (engine/mem-symbols.ts): engrenagem, lua, chama, gota, estrela, trevo.

import { MEM_SYMBOL_HEX } from "../engine/mem-symbols"

export function MemSymbol({ s, size = 64 }: { s: number; size?: number }) {
  const c = MEM_SYMBOL_HEX[s] ?? "#fff"
  const hi = "rgba(255,255,255,0.55)"
  let body: React.ReactNode = null
  if (s === 0) {
    const teeth = Array.from({ length: 8 }, (_, i) => {
      const a = (i / 8) * 360
      return <rect key={i} x={45} y={8} width={10} height={14} rx={2} fill={c} transform={`rotate(${a} 50 50)`} />
    })
    body = (
      <>
        {teeth}
        <circle cx={50} cy={50} r={30} fill="none" stroke={c} strokeWidth={14} />
        <circle cx={50} cy={50} r={8} fill={hi} />
      </>
    )
  } else if (s === 1) {
    body = <path d="M62 14 A36 36 0 1 0 62 86 A28 28 0 1 1 62 14 Z" fill={c} />
  } else if (s === 2) {
    body = (
      <>
        <path d="M50 8 C62 30 76 40 74 62 C72 80 60 90 50 90 C40 90 28 80 26 62 C24 40 38 30 50 8 Z" fill={c} />
        <path d="M50 46 C56 56 62 62 60 72 C58 80 54 82 50 82 C46 82 42 80 40 72 C38 62 44 56 50 46 Z" fill={hi} />
      </>
    )
  } else if (s === 3) {
    body = (
      <>
        <path d="M50 8 C60 28 80 46 80 64 C80 80 66 92 50 92 C34 92 20 80 20 64 C20 46 40 28 50 8 Z" fill={c} />
        <circle cx={38} cy={66} r={7} fill={hi} />
      </>
    )
  } else if (s === 4) {
    body = (
      <>
        <polygon points="50,6 61,38 95,38 67,58 78,92 50,71 22,92 33,58 5,38 39,38" fill={c} />
        <circle cx={50} cy={52} r={8} fill={hi} />
      </>
    )
  } else {
    body = (
      <>
        <circle cx={35} cy={35} r={17} fill={c} />
        <circle cx={65} cy={35} r={17} fill={c} />
        <circle cx={35} cy={62} r={17} fill={c} />
        <circle cx={65} cy={62} r={17} fill={c} />
        <rect x={56} y={70} width={7} height={26} rx={3} fill={c} transform="rotate(-20 60 80)" />
        <circle cx={50} cy={49} r={7} fill={hi} />
      </>
    )
  }
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden style={{ filter: `drop-shadow(0 0 10px ${c})` }}>
      {body}
    </svg>
  )
}
