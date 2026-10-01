"use client"

// O SISTEMA DE MÍDIA — `ProductMedia` e o `VisualPlaceholder`.
//
// ⚠️ A IMAGEM É CONTEÚDO, A ANIMAÇÃO PERTENCE AO COMPONENTE. Sem `src`, a
// moldura desenha o estúdio da variante (fundo, as 10 unhas na cor do
// produto, grão, rótulo "PC / 001"). Com `src`, a fotografia entra NA MESMA
// moldura e herda dimensão, máscara, luz, carregamento e revelação.
//
// ⚠️ O PLACEHOLDER NÃO É UM BURACO: removidas todas as fotos, o site continua
// completo. É ele que faz isso ser verdade.
//
// ⚠️ IMAGEM QUEBRADA VOLTA AO PLACEHOLDER (`onError`), nunca ao ícone de
// imagem quebrada. E CARREGANDO não é spinner: é a silhueta com uma linha de
// reflexo atravessando (`is-loading`).
//
// ⚠️ `<img>` E NÃO `next/image`: a URL vem dos dados, e o otimizador recusa
// host fora de `remotePatterns` com erro de RUNTIME.

import { useEffect, useRef, useState } from "react"

import { displayId } from "./content/display"
import type { MediaConfig, MediaContainer, NailShape, PlaceholderVariant } from "./content/products.mock"
import { Nail } from "./nail"

/**
 * O que o placeholder desenha:
 *   tray     o set inteiro — 10 unhas em duas fileiras, como na caixa real
 *   set      o leque de 5 (vitrines editoriais)
 *   single   uma unha
 *   macro    a ponta de uma unha, de perto
 *   portrait uma unha grande, inclinada (retrato de marca)
 */
export type Composition = "tray" | "set" | "single" | "macro" | "portrait"

export type MediaProps = {
  src?: string | null
  hoverSrc?: string | null
  alt: string
  variant: PlaceholderVariant
  /** CSS aspect-ratio da MOLDURA: "4/5", "1/1", "3/4"… */
  aspect?: string
  media?: MediaConfig
  /** Como a foto é mostrada (ver `content/display.ts`). Muda só o enquadramento. */
  container?: MediaContainer
  shape: NailShape
  tint: [string, string]
  number?: string
  label?: string
  kicker?: string
  composition?: Composition
  priority?: boolean
  className?: string
}

/** O leque de 5: deslocamento em % da largura da PRÓPRIA unha. */
const FAN = [
  { r: -24, x: -150, y: 14, h: 0.8 },
  { r: -12, x: -76, y: 4, h: 0.92 },
  { r: 0, x: 0, y: 0, h: 1 },
  { r: 12, x: 76, y: 4, h: 0.92 },
  { r: 24, x: 150, y: 14, h: 0.8 },
]

/**
 * A BANDEJA: as 10 tips de um set de press-on, da maior (polegar) para a
 * menor (mindinho), em duas fileiras de cinco — a mesma disposição da caixa
 * acrílica de verdade.
 */
const TRAY = Array.from({ length: 10 }, (_, i) => ({
  col: i % 5,
  row: i < 5 ? 0 : 1,
  s: 1 - i * 0.045,
}))

export function VisualPlaceholder({
  variant,
  shape,
  tint,
  number,
  label,
  kicker,
  composition = "tray",
}: Pick<MediaProps, "variant" | "shape" | "tint" | "number" | "label" | "kicker" | "composition">) {
  return (
    <div className={`pk-ph pk-ph--${variant}`} aria-hidden="true">
      <div className="pk-ph__field" />
      {variant === "chrome-pedestal" ? <div className="pk-ph__pedestal" /> : null}
      <div className={`pk-ph__nails pk-ph__nails--${composition}`}>
        {composition === "tray"
          ? TRAY.map((t, i) => (
              <Nail
                key={i}
                shape={shape}
                tint={tint}
                className="pk-ph__nail"
                style={{
                  left: `${12 + t.col * 17.5}%`,
                  bottom: t.row ? "9%" : "52%",
                  transform: `translateX(-50%) scale(${t.s})`,
                }}
              />
            ))
          : composition === "set"
            ? FAN.map((f, i) => (
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
            : (
              <Nail shape={shape} tint={tint} className="pk-ph__nail" />
            )}
      </div>
      <div className="pk-ph__grain" />
      <div className="pk-ph__tag">
        <span>{number ? displayId(number) : kicker || "PINKORACATS"}</span>
        {label ? <span className="pk-ph__label">{label}</span> : <span className="pk-ph__label">SET PREVIEW</span>}
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
  container = "digital-case",
  shape,
  tint,
  number,
  label,
  kicker,
  composition = "tray",
  priority,
  className = "",
}: MediaProps) {
  const [broken, setBroken] = useState(false)
  const [hoverBroken, setHoverBroken] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const img = useRef<HTMLImageElement>(null)

  // ⚠️ A imagem pode terminar ANTES da hidratação — o HTML do servidor já a
  // pede, e o `onLoad`/`onError` do React só passa a escutar depois. Na
  // montagem: imagem completa sem pixel = quebrada; completa com pixel = pronta.
  useEffect(() => {
    const el = img.current
    if (!el || !el.complete) return
    if (el.naturalWidth === 0) setBroken(true)
    else setLoaded(true)
  }, [src])

  const showImage = !!src && !broken
  // Em `transparent` a peça flutua inteira; em `macro` o recorte aproxima.
  // ⚠️ editorial = foto com mão/ambiente: inteira, nunca recortada
  const fit = media?.fit || (container === "transparent" || container === "editorial" ? "contain" : "cover")
  const scale = media?.scale ?? (container === "macro" ? 1.6 : 1)
  const imgStyle: React.CSSProperties = {
    objectFit: fit,
    objectPosition: media?.position || "50% 50%",
    transform: scale !== 1 || media?.rotation ? `scale(${scale}) rotate(${media?.rotation ?? 0}deg)` : undefined,
  }

  return (
    <div
      className={`pk-media pk-media--${container} ${showImage ? "has-image" : "is-placeholder"} ${
        showImage && !loaded ? "is-loading" : ""
      } ${className}`}
      style={{ aspectRatio: aspect }}
      data-media
    >
      {/* O estúdio da variante fica SEMPRE — atrás de um PNG transparente é
          ele que faz a peça flutuar; atrás de um JPEG ele não aparece. */}
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
          fetchPriority={priority ? "high" : undefined}
          decoding="async"
          onLoad={() => setLoaded(true)}
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
      {/* carregando: a linha de reflexo que atravessa a silhueta */}
      <span className="pk-media__sheen" aria-hidden="true" />
      {container === "macro" ? <span className="pk-media__mark">DETAIL / 01</span> : null}
    </div>
  )
}
