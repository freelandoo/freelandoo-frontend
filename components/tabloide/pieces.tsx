/**
 * Peças do kit tabloide — a gramática da `/mensagens`, extraída para fora do
 * `MensagensClient.tsx` e disponível para as 148 páginas.
 *
 * A regra que resume tudo: **o fundo escuro é o jornal; cada item de conteúdo
 * é um recorte de papel colado nele.** Borda sempre 2px. Sombra sempre dura e
 * deslocada. Canto sempre reto — exceto retrato/avatar e bolinha de status.
 * Dourado só em ativo / não-lido / ação principal.
 *
 * Estes componentes são *compartilhados*: sem hooks e sem API de browser, então
 * renderizam tanto em server quanto em client component. Handlers (`onClick`,
 * `onChange`) só funcionam quando quem importa é um client component — que é o
 * caso de toda página interativa.
 *
 * ⚠️ Dependem dos tokens `--fl-*`, que só existem dentro de `.fl-root`
 * (aplicado pelo `PageShell`).
 */
import type { ReactNode, CSSProperties, InputHTMLAttributes, TextareaHTMLAttributes, SelectHTMLAttributes } from "react"
import Link from "next/link"
import { Search, X } from "lucide-react"
import { cn } from "@/lib/utils"

/* ═══════════════════════════════════════════════════════════════════════════
   1+2+3 · TabloidMasthead — manchete + sobrancelha + cinta
   ═══════════════════════════════════════════════════════════════════════ */

/**
 * Cabeçalho de coluna/painel: manchete Anton dourada, sobrancelha em versalete
 * e a cinta de 2px que fecha embaixo. É a peça 1+2+3 da `/mensagens`.
 *
 * Para a manchete gigante de página (arquétipo Índice) use `TabloidPageIntro`.
 */
export function TabloidMasthead({
  title,
  eyebrow,
  actions,
  band = true,
  size = "panel",
  className,
}: {
  title: ReactNode
  eyebrow?: ReactNode
  /** botões/menus à direita da manchete */
  actions?: ReactNode
  /** cinta inferior de 2px (peça 3) */
  band?: boolean
  /** "panel" = coluna de lista (3xl). "page" = topo de página (4xl→5xl). */
  size?: "panel" | "page"
  className?: string
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-2 px-4 py-3.5",
        band && "border-b-2 border-[#F1EDE2]/12",
        className,
      )}
    >
      <div className="min-w-0">
        <h2
          className={cn(
            "fl-display leading-none text-[#F2B705]",
            size === "page" ? "text-4xl sm:text-5xl" : "text-3xl",
          )}
        >
          {title}
        </h2>
        {eyebrow && (
          <p className="mt-1 text-[10px] font-black uppercase tracking-[0.18em] text-[#8a8275]">
            {eyebrow}
          </p>
        )}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-1.5">{actions}</div>}
    </div>
  )
}

/** Só a sobrancelha (peça 2), para reusar solta dentro de cartões. */
export function TabloidEyebrow({
  children,
  tone = "muted",
  className,
}: {
  children: ReactNode
  tone?: "muted" | "gold" | "ink"
  className?: string
}) {
  return (
    <p
      className={cn(
        "text-[10px] font-black uppercase tracking-[0.18em]",
        tone === "gold" ? "text-[#F2B705]" : tone === "ink" ? "text-[#6B6457]" : "text-[#8a8275]",
        className,
      )}
    >
      {children}
    </p>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   4 · TabloidTabs — aba com sublinhado dourado de 3px
   ═══════════════════════════════════════════════════════════════════════ */

export type TabloidTabItem = {
  key: string
  /** rótulo longo, aparece em `lg:` */
  label: string
  /** rótulo curto, aparece abaixo de `lg:` — cai no `label` se ausente */
  shortLabel?: string
  icon?: ReactNode
  /** ponto dourado de não-lido sobre o ícone */
  badge?: boolean
  dataTour?: string
  disabled?: boolean
}

/**
 * Fila de abas do painel: cada aba ocupa `flex-1`, a ativa ganha
 * `border-b-[3px]` dourada que cavalga a cinta (`-mb-[2px]`).
 */
export function TabloidTabs({
  items,
  value,
  onChange,
  className,
  band = true,
}: {
  items: TabloidTabItem[]
  value: string
  onChange: (key: string) => void
  className?: string
  band?: boolean
}) {
  return (
    <div
      role="tablist"
      className={cn("flex items-stretch", band && "border-b-2 border-[#F1EDE2]/12", className)}
    >
      {items.map(({ key, ...item }) => (
        <TabloidTab
          key={key}
          active={value === key}
          onClick={() => onChange(key)}
          {...item}
        />
      ))}
    </div>
  )
}

/** Uma aba solta — quando a fila não é uniforme o bastante para `TabloidTabs`. */
export function TabloidTab({
  active,
  onClick,
  icon,
  label,
  shortLabel,
  dataTour,
  badge = false,
  disabled = false,
  className,
}: Omit<TabloidTabItem, "key"> & {
  active: boolean
  onClick: () => void
  className?: string
}) {
  const short = shortLabel ?? label
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      disabled={disabled}
      onClick={onClick}
      data-tour={dataTour}
      className={cn(
        "relative flex min-w-0 flex-1 items-center justify-center gap-1 px-1.5 py-2.5 text-[10px] font-black uppercase tracking-[0.06em] transition-colors disabled:cursor-not-allowed disabled:opacity-45",
        active
          ? "-mb-[2px] border-b-[3px] border-[#F2B705] text-[#F2B705]"
          : "border-b-[3px] border-transparent text-[#9A938A] hover:text-[#F5F1E8]",
        className,
      )}
    >
      {icon && (
        <span className="relative shrink-0">
          {icon}
          {badge && (
            <span
              data-dot
              className="absolute -right-1.5 -top-1.5 h-2 w-2 rounded-full bg-[#F2B705] ring-2 ring-[#141009]"
            />
          )}
        </span>
      )}
      <span className="hidden truncate lg:inline">{label}</span>
      <span className="truncate lg:hidden">{short}</span>
    </button>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   5 · TabloidSearch — campo reto de 2px sobre o painel escuro
   ═══════════════════════════════════════════════════════════════════════ */

export function TabloidSearch({
  value,
  onChange,
  placeholder,
  clearLabel = "Limpar busca",
  sticky = false,
  icon,
  trailing,
  className,
  inputClassName,
  ...rest
}: {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  clearLabel?: string
  /** gruda no topo da coluna rolável, com blur */
  sticky?: boolean
  icon?: ReactNode
  trailing?: ReactNode
  className?: string
  inputClassName?: string
  name?: string
  id?: string
  autoFocus?: boolean
  "aria-label"?: string
}) {
  return (
    <div
      className={cn(
        "border-b-2 border-[#F1EDE2]/10 px-3 py-2.5",
        sticky && "sticky top-0 z-10 bg-[#0b0804]/85 backdrop-blur",
        className,
      )}
    >
      <div className="flex items-center gap-2 border-2 border-[#F1EDE2]/15 bg-[#1D1810] px-3 py-2 transition-colors focus-within:border-[#F2B705]">
        <span className="shrink-0 text-[#8a8275]">
          {icon ?? <Search className="h-3.5 w-3.5" />}
        </span>
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={cn(
            "min-w-0 flex-1 bg-transparent text-sm text-white placeholder:text-white/35 focus:outline-none",
            inputClassName,
          )}
          {...rest}
        />
        {value ? (
          <button
            type="button"
            onClick={() => onChange("")}
            className="shrink-0 text-white/40 transition-colors hover:text-white"
            aria-label={clearLabel}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        ) : null}
        {trailing}
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   6+7+8+9 · PaperRow — a linha de papel genérica
   ═══════════════════════════════════════════════════════════════════════ */

/**
 * 7 · Retrato torto com contorno dourado. Reto por dentro: o recorte é
 * retangular, o `outline` é a moldura de revista.
 */
export function PaperPortrait({
  children,
  size = 44,
  tilt = -2,
  className,
  style,
}: {
  children: ReactNode
  /** lado em px (o retrato é quadrado) */
  size?: number
  /** graus de rotação; 0 desliga */
  tilt?: number
  className?: string
  style?: CSSProperties
}) {
  return (
    <div
      className={cn("relative shrink-0 overflow-hidden border-2 border-[#0B0B0D]", className)}
      style={{
        width: size,
        height: size,
        transform: tilt ? `rotate(${tilt}deg)` : undefined,
        outline: "2px solid #F2B705",
        outlineOffset: "1px",
        ...style,
      }}
    >
      {children}
    </div>
  )
}

/** 9 · Selo de não-lidas: quadrado dourado, borda 2px, `tabular-nums`, `99+`. */
export function PaperStamp({
  children,
  tone = "gold",
  className,
}: {
  children: ReactNode
  tone?: "gold" | "ink" | "paper"
  className?: string
}) {
  return (
    <span
      className={cn(
        "inline-flex h-5 min-w-[20px] items-center justify-center border-2 px-1 text-[10px] font-black tabular-nums",
        tone === "gold"
          ? "border-[#0B0B0D] bg-[#F2B705] text-[#0B0B0D]"
          : tone === "ink"
            ? "border-[#0B0B0D] bg-[#0B0B0D] text-[#F1EDE2]"
            : "border-[#0B0B0D] bg-transparent text-[#0B0B0D]",
        className,
      )}
    >
      {children}
    </span>
  )
}

/** Formata a contagem do selo: acima de 99 vira `99+`. */
export function stampCount(n: number): string {
  return n > 99 ? "99+" : String(n)
}

/**
 * 6+7+8+9 · A linha de papel. É o átomo de lista de todo o redesign: recorte
 * de papel com borda de 2px e sombra dura; no hover sobe meio pixel, torce
 * 0.3° e a sombra vira dourada.
 *
 * Composição: `media` (retrato) · `title` (Anton) + `meta` (hora) ·
 * `subtitle` (prévia) + `badge` (selo). Passe `children` para ignorar essa
 * composição e montar o miolo à mão.
 */
export function PaperRow({
  href,
  onClick,
  active = false,
  media,
  title,
  meta,
  subtitle,
  badge,
  trailing,
  strong = false,
  disabled = false,
  className,
  children,
  "aria-label": ariaLabel,
  dataTour,
}: {
  href?: string
  onClick?: () => void
  /** linha selecionada: sobe e fixa a sombra dourada */
  active?: boolean
  media?: ReactNode
  title?: ReactNode
  /** canto superior direito — hora, status */
  meta?: ReactNode
  /** segunda linha — prévia, descrição */
  subtitle?: ReactNode
  /** selo à direita da prévia (número vira `PaperStamp`) */
  badge?: ReactNode | number
  /** bloco extra no fim da linha (ações, chevron) */
  trailing?: ReactNode
  /** prévia em negrito preto — usado quando há não-lidas */
  strong?: boolean
  disabled?: boolean
  className?: string
  children?: ReactNode
  "aria-label"?: string
  dataTour?: string
}) {
  const shell = cn(
    "group flex w-full items-center gap-3 border-2 border-[#0B0B0D] bg-[#F1EDE2] px-3 py-3 text-left text-[#0B0B0D] transition-transform duration-200",
    disabled
      ? "cursor-not-allowed opacity-60 shadow-[4px_4px_0_0_#0B0B0D]"
      : cn(
          "hover:-translate-y-0.5 hover:-rotate-[0.3deg]",
          active
            ? "-translate-y-0.5 shadow-[6px_6px_0_0_#F2B705]"
            : "shadow-[4px_4px_0_0_#0B0B0D] hover:shadow-[7px_7px_0_0_#F2B705]",
        ),
    className,
  )

  const stamp =
    typeof badge === "number"
      ? badge > 0
        ? <PaperStamp>{stampCount(badge)}</PaperStamp>
        : null
      : badge

  const body = children ?? (
    <>
      {media}
      <div className="min-w-0 flex-1">
        {(title || meta) && (
          <div className="flex items-center justify-between gap-2">
            {title && (
              <span className="fl-display inline-flex min-w-0 items-center gap-1.5 truncate text-lg leading-none text-[#0B0B0D]">
                {title}
              </span>
            )}
            {meta && (
              <span className="shrink-0 text-[9px] font-black uppercase tracking-[0.08em] text-[#8a8275]">
                {meta}
              </span>
            )}
          </div>
        )}
        {(subtitle || stamp) && (
          <div className="mt-1 flex items-center justify-between gap-2">
            {subtitle && (
              <span
                className={cn(
                  "truncate text-xs",
                  strong ? "font-bold text-[#0B0B0D]" : "font-semibold text-[#6B6457]",
                )}
              >
                {subtitle}
              </span>
            )}
            {stamp && <span className="ml-auto shrink-0">{stamp}</span>}
          </div>
        )}
      </div>
      {trailing}
    </>
  )

  if (href && !disabled) {
    return (
      <Link href={href} className={shell} aria-label={ariaLabel} data-tour={dataTour}>
        {body}
      </Link>
    )
  }
  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className={shell}
        aria-label={ariaLabel}
        data-tour={dataTour}
      >
        {body}
      </button>
    )
  }
  return (
    <div className={shell} aria-label={ariaLabel} data-tour={dataTour}>
      {body}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   PaperList — a pilha de recortes, com vazio embutido
   ═══════════════════════════════════════════════════════════════════════ */

/**
 * `ul` das linhas de papel. O espaço de 10px entre elas é o que deixa a sombra
 * dura respirar; sem ele os recortes viram uma tabela.
 */
export function PaperList({
  children,
  empty,
  isEmpty,
  className,
  ...rest
}: {
  children?: ReactNode
  /** renderizado no lugar da lista quando `isEmpty` */
  empty?: ReactNode
  isEmpty?: boolean
  className?: string
  "aria-label"?: string
}) {
  if (isEmpty && empty) return <>{empty}</>
  return (
    <ul className={cn("space-y-2.5 p-2.5", className)} {...rest}>
      {children}
    </ul>
  )
}

/** Item da `PaperList`. `relative` para acomodar links sobrepostos. */
export function PaperListItem({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return <li className={cn("relative", className)}>{children}</li>
}

/* ═══════════════════════════════════════════════════════════════════════════
   SplitShell — a grade 340px + painel, com a regra mobile
   ═══════════════════════════════════════════════════════════════════════ */

/**
 * Casca do arquétipo Caixa de entrada: coluna de lista fixa em 340px e painel
 * que ocupa o resto. Abaixo de `md` só um dos dois aparece — quem manda é
 * `detailOpen`: com item aberto, o painel toma a tela.
 *
 * `offsetTop` é a altura do header global que a grade precisa descontar.
 */
export function SplitShell({
  list,
  detail,
  detailOpen = false,
  offsetTop = "72px",
  className,
  listClassName,
  detailClassName,
}: {
  list: ReactNode
  detail: ReactNode
  /** em mobile, esconde a lista e mostra o painel */
  detailOpen?: boolean
  offsetTop?: string
  className?: string
  listClassName?: string
  detailClassName?: string
}) {
  return (
    <div
      className={cn(
        "grid grid-cols-1 overflow-hidden bg-gradient-to-b from-[#141009] via-[#141009] to-black md:grid-cols-[340px_1fr]",
        className,
      )}
      style={{ height: `calc(100dvh - ${offsetTop})` }}
    >
      <aside
        className={cn(
          "flex-col border-r-2 border-[#F1EDE2]/12",
          detailOpen ? "hidden md:flex" : "flex",
          listClassName,
        )}
      >
        {list}
      </aside>
      <section
        className={cn(
          "min-w-0 flex-col",
          detailOpen ? "flex" : "hidden md:flex",
          detailClassName,
        )}
      >
        {detail}
      </section>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   DarkPanel — o bloco escuro sobre o jornal
   ═══════════════════════════════════════════════════════════════════════ */

/** Painel escuro (`#1D1810`) de borda 2px. O contraponto do recorte de papel. */
export function DarkPanel({
  children,
  className,
  hard = false,
  id,
}: {
  children: ReactNode
  className?: string
  /** sombra dura deslocada, como o papel */
  hard?: boolean
  id?: string
}) {
  return (
    <div
      id={id}
      className={cn(
        "border-2 border-[#F1EDE2]/14 bg-[#1D1810] text-[#F1EDE2]",
        hard && "shadow-[5px_5px_0_0_#0B0B0D]",
        className,
      )}
    >
      {children}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   TabloidTable — tabela densa em md+, PaperRow abaixo. Destrava o admin.
   ═══════════════════════════════════════════════════════════════════════ */

export type TabloidColumn<T> = {
  key: string
  header: ReactNode
  cell: (row: T, index: number) => ReactNode
  /**
   * Onde a coluna cai no cartão de papel abaixo de `md`:
   * `title` = manchete · `meta` = canto superior direito ·
   * `subtitle` = segunda linha · `badge` = selo · `hidden` = some.
   * Sem papel definido, vira uma linha rótulo/valor no corpo do cartão.
   */
  role?: "title" | "meta" | "subtitle" | "badge" | "hidden"
  align?: "left" | "center" | "right"
  /** classes da célula (largura, truncamento) */
  className?: string
  headerClassName?: string
}

/**
 * A mesa de redação. Em `md+` é uma tabela de verdade — densidade acima de
 * decoração, cabeçalho em versalete, linhas separadas por hairline de tinta.
 * Abaixo de `md` cada linha vira um `PaperRow`, porque tabela em celular não é
 * tabela, é rolagem horizontal.
 */
export function TabloidTable<T>({
  columns,
  rows,
  rowKey,
  href,
  onRowClick,
  activeKey,
  empty,
  caption,
  className,
}: {
  columns: TabloidColumn<T>[]
  rows: T[]
  rowKey: (row: T, index: number) => string
  href?: (row: T) => string | null | undefined
  onRowClick?: (row: T) => void
  /** chave da linha destacada */
  activeKey?: string | null
  empty?: ReactNode
  caption?: ReactNode
  className?: string
}) {
  if (rows.length === 0 && empty) return <>{empty}</>

  const pick = (row: T, index: number, role: TabloidColumn<T>["role"]) => {
    const col = columns.find((c) => c.role === role)
    return col ? col.cell(row, index) : undefined
  }
  const bodyColumns = columns.filter((c) => !c.role)

  const align = (a?: TabloidColumn<T>["align"]) =>
    a === "right" ? "text-right" : a === "center" ? "text-center" : "text-left"

  return (
    <div className={className}>
      {/* md+ — tabela */}
      <div className="hidden overflow-x-auto border-2 border-[#0B0B0D] bg-[#F1EDE2] shadow-[5px_5px_0_0_#0B0B0D] md:block">
        <table className="w-full min-w-[640px] border-collapse text-[#0B0B0D]">
          {caption && (
            <caption className="border-b-2 border-[#0B0B0D] bg-[#0B0B0D] px-4 py-2 text-left text-[10px] font-black uppercase tracking-[0.18em] text-[#F2B705]">
              {caption}
            </caption>
          )}
          <thead>
            <tr className="border-b-2 border-[#0B0B0D]">
              {columns.map((c) => (
                <th
                  key={c.key}
                  scope="col"
                  className={cn(
                    "whitespace-nowrap px-4 py-2.5 text-[10px] font-black uppercase tracking-[0.14em] text-[#6B6457]",
                    align(c.align),
                    c.headerClassName,
                  )}
                >
                  {c.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => {
              const key = rowKey(row, index)
              const to = href?.(row)
              const isActive = activeKey != null && activeKey === key
              return (
                <tr
                  key={key}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  className={cn(
                    "border-b-2 border-[#0B0B0D]/12 transition-colors last:border-b-0",
                    isActive && "bg-[#F2B705]/22",
                    (onRowClick || to) && "cursor-pointer hover:bg-[#F2B705]/14",
                  )}
                >
                  {columns.map((c, ci) => (
                    <td
                      key={c.key}
                      className={cn("px-4 py-3 text-sm font-semibold", align(c.align), c.className)}
                    >
                      {to && ci === 0 ? (
                        <Link href={to} className="fl-display text-base leading-none hover:text-[#9a7400]">
                          {c.cell(row, index)}
                        </Link>
                      ) : (
                        c.cell(row, index)
                      )}
                    </td>
                  ))}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* abaixo de md — recortes de papel */}
      <PaperList className="md:hidden">
        {rows.map((row, index) => {
          const key = rowKey(row, index)
          const to = href?.(row)
          const badge = pick(row, index, "badge")
          return (
            <PaperListItem key={key}>
              <PaperRow
                href={to ?? undefined}
                onClick={!to && onRowClick ? () => onRowClick(row) : undefined}
                active={activeKey != null && activeKey === key}
                title={pick(row, index, "title")}
                meta={pick(row, index, "meta")}
                subtitle={pick(row, index, "subtitle")}
                badge={badge as ReactNode}
              />
              {bodyColumns.length > 0 && (
                <dl className="-mt-[2px] grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 border-x-2 border-b-2 border-[#0B0B0D] bg-[#F1EDE2] px-3 pb-3 pt-2 text-[#0B0B0D] shadow-[4px_4px_0_0_#0B0B0D]">
                  {bodyColumns.map((c) => (
                    <div key={c.key} className="contents">
                      <dt className="text-[10px] font-black uppercase tracking-[0.14em] text-[#6B6457]">
                        {c.header}
                      </dt>
                      <dd className={cn("min-w-0 text-xs font-semibold", align(c.align))}>
                        {c.cell(row, index)}
                      </dd>
                    </div>
                  ))}
                </dl>
              )}
            </PaperListItem>
          )
        })}
      </PaperList>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   TabloidField — rótulo + campo + erro, reto
   ═══════════════════════════════════════════════════════════════════════ */

/**
 * Campo de formulário do arquétipo Ficha. O erro é versalete vermelho abaixo
 * do campo — nunca um balão flutuante, que não é coisa de jornal impresso.
 */
export function TabloidField({
  label,
  htmlFor,
  hint,
  error,
  required = false,
  children,
  className,
}: {
  label?: ReactNode
  htmlFor?: string
  hint?: ReactNode
  error?: ReactNode
  required?: boolean
  children: ReactNode
  className?: string
}) {
  return (
    <div className={cn("w-full", className)}>
      {label && (
        <label htmlFor={htmlFor} className="fl-label">
          {label}
          {required && <span className="ml-1 text-[#dc2626]">*</span>}
        </label>
      )}
      {children}
      {error ? (
        <p
          id={htmlFor ? `${htmlFor}-error` : undefined}
          role="alert"
          className="mt-1.5 text-[10px] font-black uppercase tracking-[0.14em] text-[#dc2626]"
        >
          {error}
        </p>
      ) : hint ? (
        <p className="mt-1.5 text-xs font-semibold text-[#6B6457]">{hint}</p>
      ) : null}
    </div>
  )
}

/** Input reto de papel. `invalid` acende a borda vermelha. */
export function TabloidInput({
  invalid,
  ok,
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean; ok?: boolean }) {
  return (
    <input
      aria-invalid={invalid || undefined}
      className={cn("fl-input", invalid && "fl-input-error", ok && "fl-input-ok", className)}
      {...props}
    />
  )
}

export function TabloidTextarea({
  invalid,
  className,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }) {
  return (
    <textarea
      aria-invalid={invalid || undefined}
      className={cn("fl-input resize-y", invalid && "fl-input-error", className)}
      {...props}
    />
  )
}

export function TabloidSelect({
  invalid,
  className,
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & { invalid?: boolean }) {
  return (
    <select
      aria-invalid={invalid || undefined}
      className={cn("fl-input appearance-none pr-9", invalid && "fl-input-error", className)}
      {...props}
    >
      {children}
    </select>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   TabloidChip — filtro / estado
   ═══════════════════════════════════════════════════════════════════════ */

/**
 * Etiqueta reta de 2px. Como filtro (`onClick`) o estado ativo é dourado;
 * como estado (`tone`) carrega a cor do status.
 */
export function TabloidChip({
  children,
  active = false,
  onClick,
  href,
  tone = "neutral",
  icon,
  count,
  surface = "dark",
  className,
}: {
  children: ReactNode
  active?: boolean
  onClick?: () => void
  href?: string
  tone?: "neutral" | "gold" | "green" | "red" | "blue"
  icon?: ReactNode
  count?: number
  /** onde a etiqueta está colada: no jornal escuro ou no recorte de papel */
  surface?: "dark" | "paper"
  className?: string
}) {
  const toneClasses = {
    neutral:
      surface === "paper"
        ? "border-[#0B0B0D]/35 text-[#3B372F]"
        : "border-[#F1EDE2]/25 text-[#C9C2B6]",
    gold: "border-[#0B0B0D] bg-[#F2B705] text-[#0B0B0D]",
    green: "border-[#0B0B0D] bg-[#166534] text-white",
    red: "border-[#0B0B0D] bg-[#b91c1c] text-white",
    blue: "border-[#0B0B0D] bg-[#1d4ed8] text-white",
  }[tone]

  const classes = cn(
    "inline-flex items-center gap-1.5 border-2 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] transition-colors",
    active ? "border-[#0B0B0D] bg-[#F2B705] text-[#0B0B0D]" : toneClasses,
    (onClick || href) &&
      !active &&
      (surface === "paper" ? "hover:border-[#0B0B0D]" : "hover:border-[#F2B705] hover:text-[#F2B705]"),
    className,
  )

  const body = (
    <>
      {icon}
      {children}
      {count != null && <span className="tabular-nums opacity-70">{count}</span>}
    </>
  )

  if (href) return <Link href={href} className={classes}>{body}</Link>
  if (onClick)
    return (
      <button type="button" onClick={onClick} aria-pressed={active} className={classes}>
        {body}
      </button>
    )
  return <span className={classes}>{body}</span>
}

/* ═══════════════════════════════════════════════════════════════════════════
   TabloidStat — número Anton + rótulo
   ═══════════════════════════════════════════════════════════════════════ */

/** Número grande em Anton com rótulo em versalete. Usado no Placar e no admin. */
export function TabloidStat({
  value,
  label,
  hint,
  surface = "paper",
  align = "left",
  className,
}: {
  value: ReactNode
  label: ReactNode
  hint?: ReactNode
  surface?: "paper" | "dark"
  align?: "left" | "center"
  className?: string
}) {
  const paper = surface === "paper"
  return (
    <div
      className={cn(
        "border-2 px-4 py-3.5",
        paper
          ? "border-[#0B0B0D] bg-[#F1EDE2] text-[#0B0B0D] shadow-[4px_4px_0_0_#0B0B0D]"
          : "border-[#F1EDE2]/14 bg-[#1D1810] text-[#F1EDE2]",
        align === "center" && "text-center",
        className,
      )}
    >
      <div
        className={cn(
          "fl-display text-3xl leading-none tabular-nums sm:text-4xl",
          paper ? "text-[#0B0B0D]" : "text-[#F2B705]",
        )}
      >
        {value}
      </div>
      <div
        className={cn(
          "mt-1.5 text-[10px] font-black uppercase tracking-[0.18em]",
          paper ? "text-[#6B6457]" : "text-[#8a8275]",
        )}
      >
        {label}
      </div>
      {hint && (
        <div className={cn("mt-1 text-xs font-semibold", paper ? "text-[#6B6457]" : "text-[#9A938A]")}>
          {hint}
        </div>
      )}
    </div>
  )
}
