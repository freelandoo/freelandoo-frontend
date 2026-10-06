import { cn } from "@/lib/utils"

/**
 * Avatar da Casa Views. Mostra a foto quando existe; senão, um MONOGRAMA (a
 * inicial do nome num bloco colorido da paleta da Casa). A API do Instagram não
 * expõe a foto de comentaristas (audiência) — só id/username — então o
 * monograma é o fallback on-brand para esses casos.
 */

const PALETTE = [
  { bg: "#ff007a", fg: "#f4f4f0" },
  { bg: "#f4f4f0", fg: "#050505" },
  { bg: "#161616", fg: "#ff4fa3" },
] as const

function pickColor(name: string) {
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0
  return PALETTE[h % PALETTE.length]
}

function initial(name: string): string {
  const s = (name || "").replace(/^@/, "").trim()
  return s ? s[0].toUpperCase() : "?"
}

export function CasaAvatar({
  name,
  src,
  className,
  textClassName,
}: {
  name: string
  src?: string | null
  className?: string
  textClassName?: string
}) {
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={name} className={cn("object-cover", className)} />
  }
  const c = pickColor(name || "?")
  return (
    <div
      className={cn("flex select-none items-center justify-center", className)}
      style={{ background: c.bg }}
      role="img"
      aria-label={name}
    >
      <span className={cn("casa-display leading-none", textClassName)} style={{ color: c.fg }}>
        {initial(name)}
      </span>
    </div>
  )
}
