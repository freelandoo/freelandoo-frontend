"use client"

// Depoimentos: foto, nome, papel, nota em estrelas e texto.

import { useCallback } from "react"
import { Plus, Star, Trash2 } from "lucide-react"
import type { SiteColorTheme, TestimonialItem, TestimonialsData } from "@/types/community-site"
import { newLocalId } from "@/types/community-site"
import { BuilderButton, EditableImage, InlineText } from "../editable"

const STARS = [1, 2, 3, 4, 5] as const

export function TestimonialsSection({
  data,
  onChange,
  editing,
  theme,
  onUpload,
  labels,
}: {
  data: TestimonialsData
  onChange: (next: TestimonialsData) => void
  editing: boolean
  theme: SiteColorTheme
  onUpload: (file: File) => Promise<string | null>
  labels: {
    name: string
    role: string
    text: string
    addItem: string
    removeItem: string
    changeImage: string
    framing: string
    removeImage: string
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
        <p className="text-sm" style={{ color: theme.textSecondary }}>
          {labels.empty}
        </p>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {data.items.map((item) => (
            <figure
              key={item.id}
              className="relative flex flex-col gap-3 border-2 border-[#0B0B0D] p-5"
              style={{ background: theme.surface, boxShadow: `4px 4px 0 0 ${theme.background}` }}
            >
              <div
                className="flex items-center gap-1"
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
                        className="h-4 w-4"
                        style={{ color: theme.primary }}
                        fill={n <= item.rating ? theme.primary : "transparent"}
                      />
                    </button>
                  ) : (
                    <Star
                      key={n}
                      className="h-4 w-4"
                      style={{ color: theme.primary }}
                      fill={n <= item.rating ? theme.primary : "transparent"}
                    />
                  )
                )}
              </div>

              <InlineText
                as="div"
                editing={editing}
                value={item.text}
                onChange={(v) => patch(item.id, { text: v })}
                styleKey={`item.${item.id}.text`}
                placeholder={labels.text}
                maxLength={480}
                multiline
                className="flex-1 whitespace-pre-line text-sm leading-relaxed"
                style={{ color: theme.textSecondary }}
              />

              <figcaption className="flex items-center gap-3 border-t-2 border-[#0B0B0D] pt-3">
                <div className="h-11 w-11 shrink-0 overflow-hidden border-2 border-[#0B0B0D]">
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
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <InlineText
                    editing={editing}
                    value={item.name}
                    onChange={(v) => patch(item.id, { name: v })}
                    styleKey={`item.${item.id}.name`}
                    placeholder={labels.name}
                    maxLength={80}
                    className="block text-xs font-extrabold uppercase tracking-[0.1em]"
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
                      className="block text-[11px]"
                      style={{ color: theme.textSecondary }}
                    />
                  )}
                </div>
              </figcaption>

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
