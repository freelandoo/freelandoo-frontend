"use client"

// features/meu-mundo/ui/archive/lore-video.tsx — lore v2 F5: o vídeo de um
// capítulo ou personagem. Toca o arquivo que o admin subiu (R2). Sem vídeo,
// mostra a imagem (a capa enviada ou a de reserva) e o texto. Regra de
// desempenho: o <video> só monta quando o quadro chega a ~600 px da tela e é
// SOLTO ao sair (src some, o navegador libera o decodificador).

import { useEffect, useRef, useState } from "react"
import { Film } from "lucide-react"
import type { LoreVideo as LoreVideoData } from "../../data"
import { AE, chamfer } from "../kit/aether-tokens"

type T = (k: string, f: string) => string

export function LoreVideo({ data, image, title, t, soon }: { data: LoreVideoData | null | undefined; image?: string | null; title: string; t: T; soon: string }) {
  const box = useRef<HTMLDivElement | null>(null)
  const [near, setNear] = useState(false)
  const src = data?.video ?? null
  const poster = data?.poster ?? image ?? null

  useEffect(() => {
    const el = box.current
    if (!el || !src) return
    const io = new IntersectionObserver(([e]) => setNear(e.isIntersecting), { rootMargin: "600px 0px" })
    io.observe(el)
    return () => io.disconnect()
  }, [src])

  return (
    <div ref={box} className="relative w-full overflow-hidden" style={{ aspectRatio: "16 / 9", background: AE.well, clipPath: chamfer(AE.cut.card), boxShadow: `inset 0 0 0 1px ${AE.brassLine}` }}>
      {src && near ? (
        <video key={src} src={src} poster={poster ?? undefined} controls playsInline preload="metadata" className="absolute inset-0 h-full w-full object-contain" aria-label={title} />
      ) : (
        <>
          {poster ? (
            // eslint-disable-next-line @next/next/no-img-element -- imagem do jogo enviada pelo admin (R2) ou retrato estático
            <img src={poster} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover opacity-80" />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <Film className="h-10 w-10" style={{ color: AE.brassLine }} aria-hidden />
            </div>
          )}
          {!src && (
            <p className="absolute inset-x-0 bottom-0 px-3 py-2 text-[12px] font-semibold leading-snug" style={{ color: AE.text, background: "linear-gradient(0deg, rgba(0,0,0,0.78), rgba(0,0,0,0))" }}>
              {soon}
            </p>
          )}
        </>
      )}
      <span className="sr-only">{t("arqPlay", "Assistir")}</span>
    </div>
  )
}
