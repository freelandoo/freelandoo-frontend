"use client"

// O SISTEMA DE MÍDIA — a peça em que o briefing mais insistiu.
//
// ⚠️ O PLACEHOLDER É PARTE DO DESENHO, NÃO UM BURACO. Sem `src`, a moldura
// desenha a composição da coleção (fundo da variante, unhas do produto na cor
// dele, grão, etiqueta de catálogo e o reflexo). Com `src`, a fotografia entra
// NA MESMA moldura e herda exatamente dimensão, máscara, reflexo, tilt e
// reveal — porque todos eles pertencem a este componente, e não à imagem.
//
// ⚠️ IMAGEM QUEBRADA VOLTA AO PLACEHOLDER (`onError`), nunca ao ícone de
// imagem quebrada do navegador. É por isso que o arquivo é de cliente.
//
// ⚠️ `<img>` E NÃO `next/image`: a URL vem dos dados, e o otimizador recusa
// host fora de `remotePatterns` com erro de RUNTIME — derrubaria a página
// por causa de onde a foto está hospedada (regra 5 do contrato de tema).

import { useEffect, useRef, useState } from "react"

import type { MediaConfig, NailShape, PlaceholderVariant } from "./content/products.mock"
import { Nail } from "./nail"

export type Composition = "set" | "single" | "macro" | "portrait"

export type MediaProps = {
  src?: string | null
  hoverSrc?: string | null
  alt: string
  variant: PlaceholderVariant
  /** CSS aspect-ratio: "4/5", "1/1", "3/4"… */
  aspect?: string
  media?: MediaConfig
  shape: NailShape
  tint: [string, string]
  number?: string
  label?: string
  kicker?: string
  composition?: Composition
  priority?: boolean
  className?: string
  /** Liga o reflexo que segue o ponteiro (`data-tilt` no ancestral). */
  tilt?: boolean
}

/** O leque do set: deslocamento em % da largura da PRÓPRIA unha. */
const FAN = [
  { r: -24, x: -150, y: 14, h: 0.8 },
  { r: -12, x: -76, y: 4, h: 0.92 },
  { r: 0, x: 0, y: 0, h: 1 },
  { r: 12, x: 76, y: 4, h: 0.92 },
  { r: 24, x: 150, y: 14, h: 0.8 },
]

export function VisualPlaceholder({
  variant,
  shape,
  tint,
  number,
  label,
  kicker,
  composition = "set",
}: Pick<MediaProps, "variant" | "shape" | "tint" | "number" | "label" | "kicker" | "composition">) {
  return (
    <div className={`pk-ph pk-ph--${variant}`} aria-hidden="true">
      <div className="pk-ph__field" />
      <div className={`pk-ph__nails pk-ph__nails--${composition}`}>
        {composition === "set" ? (
          FAN.map((f, i) => (
            <Nail
              key={i}
              shape={shape}
              tint={tint}
              className="pk-ph__nail"
              style={{
                transform: `translateX(${f.x - 50}%) translateY(${f.y}%) rotate(${f.r}deg) scale(${f.h})`,
                zIndex: 3 - Math.abs(i - 2),
              }}
            />
          ))
        ) : (
          <Nail shape={shape} tint={tint} className="pk-ph__nail" />
        )}
      </div>
      <div className="pk-ph__grain" />
      <div className="pk-ph__tag">
        <span>{kicker || "PINKORACATS"}</span>
        {label ? <span className="pk-ph__label">{label}</span> : null}
        {number ? <span>IMAGE / {number}</span> : null}
      </div>
    </div>
  )
}

export default function ProductMedia({
  src,
  hoverSrc,
  alt,
  variant,
  aspect = "4/5",
  media,
  shape,
  tint,
  number,
  label,
  kicker,
  composition = "set",
  priority,
  className = "",
  tilt = true,
}: MediaProps) {
  const [broken, setBroken] = useState(false)
  const [hoverBroken, setHoverBroken] = useState(false)
  const img = useRef<HTMLImageElement>(null)

  // ⚠️ A imagem pode falhar ANTES da hidratação — o HTML do servidor já a
  // pede, e o `onError` do React só passa a escutar depois. Nesse caso o
  // evento já passou e o navegador mostraria o texto alternativo por cima da
  // moldura. Na montagem, imagem terminada sem pixel nenhum = quebrada.
  useEffect(() => {
    const el = img.current
    if (el && el.complete && el.naturalWidth === 0) setBroken(true)
  }, [src])
  const showImage = !!src && !broken
  const imgStyle: React.CSSProperties = {
    objectFit: media?.fit || "cover",
    objectPosition: media?.position || "50% 50%",
    transform:
      media?.scale || media?.rotation
        ? `scale(${media?.scale ?? 1}) rotate(${media?.rotation ?? 0}deg)`
        : undefined,
  }

  return (
    <div
      className={`pk-media ${showImage ? "has-image" : "is-placeholder"} ${tilt ? "pk-media--tilt" : ""} ${className}`}
      style={{ aspectRatio: aspect }}
      data-media
    >
      {/* O fundo da variante fica SEMPRE — atrás de um PNG transparente é ele
          que faz a peça flutuar; atrás de um JPEG ele simplesmente não aparece. */}
      <VisualPlaceholder
        variant={variant}
        shape={shape}
        tint={tint}
        number={number}
        label={label}
        kicker={kicker}
        composition={composition}
      />
      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          ref={img}
          src={src as string}
          alt={alt}
          className="pk-media__img"
          style={imgStyle}
          loading={priority ? "eager" : "lazy"}
          decoding="async"
          onError={() => setBroken(true)}
        />
      ) : (
        <span className="sr-only">{alt}</span>
      )}
      {showImage && hoverSrc && !hoverBroken ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={hoverSrc}
          alt=""
          className="pk-media__img pk-media__img--hover"
          style={imgStyle}
          loading="lazy"
          decoding="async"
          onError={() => setHoverBroken(true)}
        />
      ) : null}
      <div className="pk-media__shine" aria-hidden="true" />
    </div>
  )
}
