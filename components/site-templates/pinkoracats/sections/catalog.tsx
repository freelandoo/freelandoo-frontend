"use client"

// MORPHING GRID — o catálogo completo. Aqui o grid é permitido, mas com três
// leituras: GRID (2–4 colunas), EDITORIAL (assimétrico) e COMPACT (lista
// rápida). Trocar de leitura ou de coleção ANIMA a passagem com GSAP Flip:
// cada card sai de onde estava e chega onde vai, em vez de a grade piscar.
//
// ⚠️ O ESTADO DA LEITURA NÃO VAI PARA A URL: o filtro é preferência de quem
// olha, e um `?view=` mudaria o canônico que o buscador lê.
// A ÚNICA exceção é ENTRAR: `?formato=stiletto` é o link de cada unha do leque
// do herói. Ele é só LIDO, uma vez, depois da hidratação (a página é estática,
// então o servidor nunca vê a query) — e o canônico continua sem ela.

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react"
import gsap from "gsap"
import { Flip } from "gsap/Flip"

import { ProductCard } from "../commerce"
import { SHAPE_CATS, shapeCat, type ShapeSlug } from "../content/shapes"
import { useCatalog } from "../store"

type Mode = "grid" | "editorial" | "compact"

export default function MorphingCatalog({ initialCollection = "all" }: { initialCollection?: string }) {
  const [mode, setMode] = useState<Mode>("grid")
  const [col, setCol] = useState(initialCollection)
  const [form, setForm] = useState<ShapeSlug | "all">("all")
  const box = useRef<HTMLDivElement>(null)
  const flipState = useRef<Flip.FlipState | null>(null)

  const catalog = useCatalog()
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
          {(["grid", "editorial", "compact"] as Mode[]).map((m) => (
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
              {m === "grid" ? "Grid" : m === "editorial" ? "Editorial" : "Compact"}
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
            <ProductCard
              product={p}
              aspect={mode === "compact" ? "1/1" : mode === "editorial" && i % 3 === 0 ? "3/5" : "4/5"}
              size={mode === "compact" ? "sm" : "md"}
              composition={i % 2 ? "single" : "set"}
            />
          </div>
        ))}
      </div>
    </div>
  )
}
