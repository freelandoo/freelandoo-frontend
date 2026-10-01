"use client"

// MORPHING CATALOG — o catálogo completo. Aqui a grade é permitida, mas com
// três leituras: GALLERY (assimétrica, editorial), GRID (2–4 colunas de
// caixas) e COMPACT (lista com mais informação). Trocar de leitura, coleção
// ou formato ANIMA a passagem com GSAP Flip: cada caixa sai de onde estava e
// chega onde vai, em vez de a grade piscar. Mesmo na grade, cada produto é uma
// caixa acrílica — nunca sombra + canto arredondado genérico.
//
// ⚠️ O ESTADO DA LEITURA NÃO VAI PARA A URL: o filtro é preferência de quem
// olha, e um `?view=` mudaria o canônico que o buscador lê.
// A ÚNICA exceção é ENTRAR: `?formato=stiletto` é o link de cada unha do leque
// do herói. Ele é só LIDO, uma vez, depois da hidratação (a página é estática,
// então o servidor nunca vê a query) — e o canônico continua sem ela.

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react"
import gsap from "gsap"
import { Flip } from "gsap/Flip"

import AcrylicProductCase from "../case"
import { Price, ProductCard, TakeoverLink } from "../commerce"
import { displayId } from "../content/display"
import { pageHref } from "../lib"
import { SHAPE_CATS, shapeCat, type ShapeSlug } from "../content/shapes"
import { useStore } from "../store"

type Mode = "gallery" | "grid" | "compact"

export default function MorphingCatalog({ initialCollection = "all" }: { initialCollection?: string }) {
  const [mode, setMode] = useState<Mode>("gallery")
  const [col, setCol] = useState(initialCollection)
  const [form, setForm] = useState<ShapeSlug | "all">("all")
  const box = useRef<HTMLDivElement>(null)
  const flipState = useRef<Flip.FlipState | null>(null)

  const { catalog, links } = useStore()
  const items = useMemo(
    () =>
      catalog.products.filter(
        (p) => (col === "all" || p.collection === col) && (form === "all" || p.form === form),
      ),
    [col, form, catalog],
  )

  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get("formato")
    const cat = shapeCat(q)
    if (cat) setForm(cat.slug)
  }, [])

  const capture = () => {
    if (!box.current) return
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
    gsap.registerPlugin(Flip)
    flipState.current = Flip.getState(box.current.querySelectorAll("[data-flip]"))
  }

  useLayoutEffect(() => {
    const s = flipState.current
    if (!s || !box.current) return
    flipState.current = null
    Flip.from(s, {
      duration: 0.6,
      ease: "expo.inOut",
      absolute: true,
      stagger: 0.02,
      onEnter: (els) => gsap.fromTo(els, { opacity: 0, scale: 0.9 }, { opacity: 1, scale: 1, duration: 0.4 }),
      onLeave: (els) => gsap.to(els, { opacity: 0, scale: 0.9, duration: 0.3 }),
    })
  }, [mode, col, form])

  return (
    <div className="pk-catalog">
      <div className="pk-catalog__bar">
        <div className="pk-catalog__filters" role="group" aria-label="Coleção">
          {[{ slug: "all", name: "Tudo" }, ...catalog.collections].map((c) => (
            <button
              key={c.slug}
              type="button"
              className={`pk-chip ${col === c.slug ? "is-on" : ""}`}
              aria-pressed={col === c.slug}
              onClick={() => {
                capture()
                setCol(c.slug)
              }}
            >
              {c.name}
            </button>
          ))}
        </div>
        <div className="pk-catalog__filters" role="group" aria-label="Formato">
          {[{ slug: "all" as const, label: "Todos os formatos" }, ...SHAPE_CATS].map((c) => (
            <button
              key={c.slug}
              type="button"
              className={`pk-chip ${form === c.slug ? "is-on" : ""}`}
              aria-pressed={form === c.slug}
              onClick={() => {
                capture()
                setForm(c.slug)
              }}
            >
              {c.label}
            </button>
          ))}
        </div>
        <div className="pk-catalog__modes" role="group" aria-label="Leitura">
          {(["gallery", "grid", "compact"] as Mode[]).map((m) => (
            <button
              key={m}
              type="button"
              className={`pk-chip ${mode === m ? "is-on" : ""}`}
              aria-pressed={mode === m}
              onClick={() => {
                capture()
                setMode(m)
              }}
            >
              {m === "gallery" ? "Gallery" : m === "grid" ? "Grid" : "Compact"}
            </button>
          ))}
        </div>
      </div>
      <p className="pk-catalog__count" aria-live="polite">
        {items.length} {items.length === 1 ? "peça" : "peças"}
        {items.length === 0 && form !== "all" ? " — ainda não há peças neste formato." : ""}
      </p>
      <div ref={box} className={`pk-catalog__grid is-${mode}`}>
        {items.map((p, i) => (
          <div key={p.id} data-flip-id={p.id} data-flip className={`pk-catalog__cell c${i % 6}`}>
            {mode === "compact" ? (
              <div className="pk-row">
                <TakeoverLink product={p} className="pk-row__case">
                  <AcrylicProductCase product={p} size="xs" />
                </TakeoverLink>
                <span className="pk-mono pk-row__id">{displayId(p.number)}</span>
                <a className="pk-row__name" href={pageHref(links, p.slug)}>
                  {p.name}
                </a>
                <span className="pk-row__tag">{p.tagline || p.details[0] || ""}</span>
                <span className={`pk-row__stock ${p.stock <= 3 ? "is-low" : ""}`}>
                  {p.stock <= 0 ? "Esgotado" : p.stock <= 3 ? `Últimas ${p.stock}` : "Em estoque"}
                </span>
                <Price product={p} className="pk-row__price" />
              </div>
            ) : (
              <ProductCard product={p} size={mode === "gallery" && i % 5 === 0 ? "lg" : mode === "gallery" ? "md" : "sm"} />
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
