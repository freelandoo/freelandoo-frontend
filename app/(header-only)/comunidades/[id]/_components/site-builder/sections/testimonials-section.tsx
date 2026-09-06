"use client"

// Depoimentos: carrossel horizontal de cards com foto, nome, papel, nota e data.
//
// ═══ CARROSSEL, E NÃO GRADE ═══
//
// Uma grade obriga o líder a ter três depoimentos para a seção não ficar
// esburacada, e trunca o texto para as linhas baterem. O trilho horizontal com
// `snap` mostra dois e meio, indica que há mais e aceita um, cinco ou vinte
// sem mudar de forma. É rolagem nativa: nenhum listener, nenhuma biblioteca, e
// o arrasto do dedo já funciona.

import { useCallback } from "react"
import { Plus, Star, Trash2 } from "lucide-react"
import type { SiteColorTheme, TestimonialItem, TestimonialsData } from "@/types/community-site"
import { newLocalId } from "@/types/community-site"
import { BuilderButton, EditableImage, InlineText } from "../editable"

const STARS = [1, 2, 3, 4, 5] as const

/**
 * ISO → data por extenso no idioma de quem lê.
 *
 * O documento guarda `2026-02-15` justamente para isto: "15 de fev. de 2026"
 * gravado no servidor ficaria em português para o visitante inglês.
 *
 * O `T00:00:00` sem fuso é deliberado — lido como UTC, um depoimento de 15/02
 * apareceria como 14/02 para quem está a oeste de Greenwich.
 */
function formatDate(iso: string, locale: string): string {
  if (!iso) return ""
  const d = new Date(`${iso}T00:00:00`)
  if (Number.isNaN(d.getTime())) return ""
  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(d)
}

export function TestimonialsSection({
  data,
  onChange,
  editing,
  theme,
  onUpload,
  locale,
  labels,
}: {
  data: TestimonialsData
  onChange: (next: TestimonialsData) => void
  editing: boolean
  theme: SiteColorTheme
  onUpload: (file: File) => Promise<string | null>
  locale: string
  labels: {
    name: string
    role: string
    text: string
    date: string
    addItem: string
    removeItem: string
    changeImage: string
    framing: string
    removeImage: string
    imageHint: string
    ratingLabel: string
    empty: string
  }
}) {
  const patch = useCallback(
    (itemId: string, next: Partial<TestimonialItem>) => {
      onChange({
        ...data,
        items: data.items.map((i) => (i.id === itemId ? { ...i, ...next } : i)),
      })
    },
    [data, onChange]
  )

  if (!editing && data.items.length === 0) return null

  return (
    <>
      {editing && (
        <div className="mb-5">
          <BuilderButton
            onClick={() =>
              onChange({
                ...data,
                items: [
                  ...data.items,
                  {
                    id: newLocalId(),
                    name: "",
                    role: "",
                    avatarUrl: "",
                    rating: 5,
                    text: "",
                    date: "",
                  },
                ],
              })
            }
            icon={Plus}
            tone="accent"
          >
            {labels.addItem}
          </BuilderButton>
        </div>
      )}

      {data.items.length === 0 ? (
        <p className="text-center text-sm" style={{ color: theme.textSecondary }}>
          {labels.empty}
        </p>
      ) : (
        <div
          className="flex snap-x snap-mandatory gap-6 overflow-x-auto overflow-y-hidden pb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          style={{ msOverflowStyle: "none" }}
        >
          {data.items.map((item) => (
            <figure
              key={item.id}
              className="relative flex w-[85vw] shrink-0 snap-center flex-col border-2 border-[#0B0B0D] sm:w-[380px]"
              style={{ background: theme.surface, boxShadow: `6px 6px 0 0 ${theme.background}` }}
            >
              {/* A foto ocupa o topo do card, grande. É a diferença entre um
                  depoimento que parece de gente e uma citação com um avatar de
                  11 pixels no rodapé. */}
              {(editing || item.avatarUrl) && (
                <div
                  className="aspect-[4/3] w-full border-b-2 border-[#0B0B0D]"
                  style={{ background: theme.background }}
                >
                  <EditableImage
                    url={item.avatarUrl}
                    objectPosition="center"
                    onChange={(p) => patch(item.id, { avatarUrl: p.imageUrl ?? item.avatarUrl })}
                    onUpload={onUpload}
                    editing={editing}
                    className="h-full w-full"
                    alt={item.name}
                    label={labels.changeImage}
                    framingLabel={labels.framing}
                    removeLabel={labels.removeImage}
                    emptyHint={labels.imageHint}
                  />
                </div>
              )}

              <div className="flex flex-1 flex-col p-5">
                <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <InlineText
                      editing={editing}
                      value={item.name}
                      onChange={(v) => patch(item.id, { name: v })}
                      styleKey={`item.${item.id}.name`}
                      placeholder={labels.name}
                      maxLength={80}
                      className="block text-sm font-extrabold uppercase tracking-[0.08em]"
                      style={{ color: theme.textPrimary }}
                    />
                    {(editing || item.role) && (
                      <InlineText
                        editing={editing}
                        value={item.role}
                        onChange={(v) => patch(item.id, { role: v })}
                        styleKey={`item.${item.id}.role`}
                        placeholder={labels.role}
                        maxLength={80}
                        className="mt-0.5 block text-xs font-medium"
                        style={{ color: theme.primary }}
                      />
                    )}
                  </div>

                  <div
                    className="flex shrink-0 gap-0.5"
                    role={editing ? "group" : undefined}
                    aria-label={editing ? labels.ratingLabel : undefined}
                  >
                    {STARS.map((n) =>
                      editing ? (
                        <button
                          key={n}
                          type="button"
                          aria-label={`${n}`}
                          onClick={() => patch(item.id, { rating: n })}
                        >
                          <Star
                            className="h-3.5 w-3.5"
                            style={{ color: theme.primary }}
                            fill={n <= item.rating ? theme.primary : "transparent"}
                          />
                        </button>
                      ) : (
                        <Star
                          key={n}
                          className="h-3.5 w-3.5"
                          style={{ color: theme.primary }}
                          fill={n <= item.rating ? theme.primary : "transparent"}
                        />
                      )
                    )}
                  </div>
                </div>

                {/* As aspas ficam FORA da caixa editável: dentro, o líder as
                    apagaria sem querer e um card ficaria diferente dos outros. */}
                <div className="flex flex-1 gap-1 text-sm leading-relaxed">
                  {!editing && item.text && (
                    <span aria-hidden style={{ color: theme.primary }}>
                      “
                    </span>
                  )}
                  <InlineText
                    as="div"
                    editing={editing}
                    value={item.text}
                    onChange={(v) => patch(item.id, { text: v })}
                    styleKey={`item.${item.id}.text`}
                    placeholder={labels.text}
                    maxLength={480}
                    multiline
                    className="min-w-0 flex-1 whitespace-pre-line"
                    style={{ color: theme.textSecondary }}
                  />
                  {!editing && item.text && (
                    <span aria-hidden style={{ color: theme.primary }}>
                      ”
                    </span>
                  )}
                </div>

                {/* Campo de data NATIVO, e não caixa de texto: é o que garante
                    que o que chega ao servidor seja ISO — o formato que deixa a
                    data ser escrita por extenso no idioma de quem lê. */}
                {editing ? (
                  <label className="mt-4 flex items-center gap-2">
                    <span className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#9A938A]">
                      {labels.date}
                    </span>
                    <input
                      type="date"
                      value={item.date}
                      onChange={(e) => patch(item.id, { date: e.target.value })}
                      className="border-2 border-[#0B0B0D] bg-[#1D1810] px-2 py-1 text-[11px] text-[#F5F1E8]"
                    />
                  </label>
                ) : (
                  item.date && (
                    <p className="mt-4 text-[11px]" style={{ color: theme.textSecondary }}>
                      {formatDate(item.date, locale)}
                    </p>
                  )
                )}
              </div>

              {editing && (
                <div className="absolute -right-2 -top-2 z-10">
                  <BuilderButton
                    onClick={() =>
                      onChange({ ...data, items: data.items.filter((i) => i.id !== item.id) })
                    }
                    icon={Trash2}
                    tone="danger"
                    title={labels.removeItem}
                  />
                </div>
              )}
            </figure>
          ))}
        </div>
      )}
    </>
  )
}
