import { Children, type ReactNode } from "react"

interface RankingListProps {
  title: string
  subtitle?: string
  children: ReactNode
  /** frase do vazio (quando não há nem pódio) */
  emptyText?: string
}

/**
 * Lista completa do ranking, na pele escura. A cascata de entrada é CSS
 * (`rv-page-in` com atraso por linha) — sem GSAP e sem observador: a lista
 * pode ser recriada pelo cliente, e um observador montado antes não a veria.
 */
export function RankingList({ title, subtitle, children, emptyText }: RankingListProps) {
  const rows = Children.toArray(children)
  return (
    <section className="mx-auto max-w-5xl px-4 py-12 md:px-8 md:py-16">
      <div className="mb-7 flex flex-wrap items-end justify-between gap-3 border-b border-[var(--rv-line-strong)] pb-4">
        <div>
          <h2 className="rv-wide rv-grunge text-[7.4vw] leading-none md:text-5xl">{title}</h2>
          {subtitle && <p className="rv-type mt-2 text-[12px] uppercase tracking-[0.14em] text-[var(--rv-pink-ink)]">{subtitle}</p>}
        </div>
        <span className="rv-type text-[11px] uppercase tracking-[0.18em] text-[var(--rv-faint)]">
          ranking completo · {String(rows.length).padStart(2, "0")}
        </span>
      </div>
      {rows.length === 0 ? (
        <p className="rv-type border border-dashed border-[var(--rv-line-strong)] px-6 py-10 text-center text-xs uppercase text-[var(--rv-muted)]">
          {emptyText || "Só o pódio por enquanto — a lista abre quando mais gente pontuar."}
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {rows.map((row, i) => (
            <div key={i} className="rv-page-in" style={{ animationDelay: `${Math.min(i, 10) * 45}ms` }}>
              {row}
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
