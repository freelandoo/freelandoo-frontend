// A CAIXA ACRÍLICA — a identidade do site. Todo produto é exposto nela.
//
// ⚠️ SEM ESTADO E SEM HOOK: a mesma peça é desenhada pelo servidor (herói,
// parede, página do produto — o HTML que o buscador lê) e pelo cliente
// (quick view, carrinho, busca). O gesto não mora aqui: a tampa obedece a UMA
// variável CSS (`--pk-lid`, 0 = fechada · 1 = aberta), e quem a muda é o CSS
// (hover, `.is-open`) ou o GSAP (rolagem). A luz obedece a `--lx`/`--ly`, que a
// luz global escreve na raiz do tema.
//
// CAMADAS (de trás para a frente):
//   floor    a sombra no chão (e o piso espelhado, com `reflect`)
//   back     o fundo da caixa
//   product  `ProductMedia` — a foto ou o placeholder
//   front    a frente acrílica: transparência, espessura, leve refração
//   edges    as arestas que pegam luz
//   reflect  a folha de reflexo que anda com a luz global
//   lid      a tampa, presa por DUAS dobradiças no alto — abre para cima
//   plate    a plaqueta de prata escovada "PC / 001"
//
// ⚠️ NOS MODOS DE FOTO (`hybrid`, `photo`, `editorial`, `macro`) a caixa NÃO é
// desenhada: a foto já mostra a caixa real (hybrid) ou é uma composição. Aí
// sobram só moldura, luz e profundidade — nunca uma caixa digital por cima de
// uma caixa fotografada.

import { containerOf, displayId, drawsCase } from "./content/display"
import type { MediaContainer, PlaceholderVariant, Product } from "./content/products.mock"
import ProductMedia, { type Composition } from "./media"

export type CaseSize = "xs" | "sm" | "md" | "lg" | "xl"
/** `live` = a tampa obedece ao `--pk-lid` de um ancestral (rolagem, GSAP). */
export type LidState = "closed" | "ajar" | "open" | "live"

const LID: Record<Exclude<LidState, "live">, number> = { closed: 0, ajar: 0.32, open: 1 }

export type CaseProps = {
  /** `null` = a caixa vazia (carrinho vazio, 404). */
  product: Product | null
  size?: CaseSize
  lid?: LidState
  /** A plaqueta de prata com o rótulo de vitrine. */
  plate?: boolean
  /** O piso espelhado — reservado a uma ou duas cenas do site. */
  reflect?: boolean
  /** Outra foto do mesmo produto (galeria da página). */
  image?: string | null
  /** Força o modo (galeria: "macro", "photo"…). */
  container?: MediaContainer
  stage?: PlaceholderVariant
  composition?: Composition
  aspect?: string
  label?: string
  priority?: boolean
  alt?: string
  className?: string
  style?: React.CSSProperties
}

export default function AcrylicProductCase({
  product,
  size = "md",
  lid = "closed",
  plate = false,
  reflect = false,
  image,
  container,
  stage,
  composition,
  aspect,
  label,
  priority,
  alt,
  className = "",
  style,
}: CaseProps) {
  const src = image !== undefined ? image : (product?.image ?? null)
  const mode: MediaContainer = product ? container || containerOf(src, product.media) : "digital-case"
  const boxed = drawsCase(mode)
  const vars = { ...(lid === "live" ? {} : { "--pk-lid": LID[lid] }), ...style } as React.CSSProperties

  return (
    <div
      className={`pk-case pk-case--${size} pk-case--${boxed ? "box" : "frame"} pk-case--${mode} ${
        product ? "" : "is-empty"
      } ${reflect ? "pk-case--reflect" : ""} ${className}`}
      style={vars}
      data-case
      data-container={mode}
    >
      <div className={`pk-case__floor ${reflect ? "is-mirror" : ""}`} aria-hidden="true" />
      <div className="pk-case__object">
        {boxed ? <div className="pk-case__back" aria-hidden="true" /> : null}
        <div className="pk-case__product">
          {product ? (
            <ProductMedia
              src={src}
              hoverSrc={image === undefined ? product.hoverImage : null}
              alt={alt ?? `${product.name}${product.tagline ? ` — ${product.tagline}` : ""}`}
              variant={stage || product.variant}
              aspect={aspect || (boxed ? "4/5" : product.media?.aspectRatio || "4/5")}
              media={product.media}
              container={mode}
              shape={product.shape}
              tint={product.tint}
              number={product.number}
              label={label}
              composition={composition || (mode === "macro" ? "macro" : "tray")}
              priority={priority}
            />
          ) : (
            <div className="pk-case__void" style={{ aspectRatio: aspect || "4/5" }} aria-hidden="true">
              <span>EMPTY / 000</span>
            </div>
          )}
        </div>
        {boxed ? <div className="pk-case__front" aria-hidden="true" /> : null}
        <div className="pk-case__edges" aria-hidden="true" />
        <div className="pk-case__reflect" aria-hidden="true">
          <span />
        </div>
        {boxed ? (
          <div className="pk-case__lid" aria-hidden="true">
            <span className="pk-case__lid-face" />
            <span className="pk-case__lid-lip" />
          </div>
        ) : null}
        {boxed ? (
          <>
            <span className="pk-case__hinge pk-case__hinge--l" aria-hidden="true" />
            <span className="pk-case__hinge pk-case__hinge--r" aria-hidden="true" />
          </>
        ) : null}
      </div>
      {plate && product ? (
        <div className="pk-case__plate" aria-hidden="true">
          <span>{displayId(product.number)}</span>
          <span>{product.name}</span>
        </div>
      ) : null}
    </div>
  )
}
