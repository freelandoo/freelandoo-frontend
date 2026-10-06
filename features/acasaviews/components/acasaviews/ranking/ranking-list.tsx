import { Children, type ReactNode } from "react"

interface RankingListProps {
  title: string
  subtitle?: string
  children: ReactNode
  /** frase do vazio (quando não há nem pódio) */
  emptyText?: string
  /** nota à direita do título ("ranking atualizado em tempo real") */
  note?: string
}

/**
 * Tabela do ranking ("O resto do júri!"), na composição da referência: a
 * manchete larga com a 1ª palavra-chave em branco gasto, e as linhas dentro
 * de uma moldura de canto cortado. A cascata de entrada é CSS (`rv-page-in`
 * com atraso por linha) — sem observador: a lista pode ser recriada pelo
 * cliente, e um observador montado antes não a veria.
 */
export function RankingList({ title, subtitle, children, emptyText, note }: RankingListProps) {
  const rows = Children.toArray(children)
  return (
    <section className="relative mx-auto max-w-[1600px] px-4 py-10 md:px-8 md:py-14">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="rv-wide rv-grunge text-[8vw] leading-none md:text-5xl">{title}</h2>
          {subtitle && <p className="rv-type mt-2 text-[11px] uppercase tracking-[0.14em] text-[var(--rv-pink-ink)]">{subtitle}</p>}
        </div>
        <span className="rv-type flex items-center gap-2 text-[10px] uppercase tracking-[0.16em] text-[var(--rv-muted)]">
          <span className="rv-live-dot" aria-hidden />
          {note || "ranking atualizado em tempo real"}
          <span className="text-[var(--rv-faint)]">· {String(rows.length).padStart(2, "0")}</span>
        </span>
      </div>

      <div className="rv-frame [--c:24px] [--frame:rgba(255,0,122,0.55)]">
        <div className="rv-frame-in rv-grid p-2 md:p-4">
          {rows.length === 0 ? (
            <p className="rv-type border border-dashed border-[var(--rv-line-strong)] px-6 py-10 text-center text-xs uppercase text-[var(--rv-muted)]">
              {emptyText || "Só o pódio por enquanto — a lista abre quando mais gente pontuar."}
            </p>
          ) : (
            <div className="flex flex-col gap-1.5 md:gap-2">
              {rows.map((row, i) => (
                <div key={i} className="rv-page-in" style={{ animationDelay: `${Math.min(i, 10) * 45}ms` }}>
                  {row}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
