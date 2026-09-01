"use client"

// Catálogo de serviços/produtos: grade de cards com foto, nome, descrição,
// preço, duração e botão.
//
// O preço aqui é TEXTO, e isso é uma decisão, não um atalho: este catálogo é
// VITRINE, não caixa. Quem cobra de verdade é a Loja da comunidade, com Stripe,
// holdback e reembolso. Guardar centavos aqui sugeriria que este botão cobra —
// e criaria uma segunda verdade sobre preço dentro do mesmo produto.

import { useCallback } from "react"
import { Clock, Plus, Trash2 } from "lucide-react"
import type { ServiceItem, ServicesCatalogData, SiteColorTheme } from "@/types/community-site"
import { newLocalId } from "@/types/community-site"
import { BuilderButton, EditableImage, InlineText } from "../editable"

const COLUMN_CLASS: Record<ServicesCatalogData["columns"], string> = {
  2: "sm:grid-cols-2",
  3: "sm:grid-cols-2 lg:grid-cols-3",
  4: "sm:grid-cols-2 lg:grid-cols-4",
}

export function ServicesCatalogSection({
  data,
  onChange,
  editing,
  theme,
  onUpload,
  labels,
}: {
  data: ServicesCatalogData
  onChange: (next: ServicesCatalogData) => void
  editing: boolean
  theme: SiteColorTheme
  onUpload: (file: File) => Promise<string | null>
  labels: {
    title: string
    description: string
    price: string
    duration: string
    ctaText: string
    ctaUrl: string
    addItem: string
    removeItem: string
    changeImage: string
    framing: string
    removeImage: string
    imageHint: string
    empty: string
    columns: string
  }
}) {
  const patchItem = useCallback(
    (itemId: string, patch: Partial<ServiceItem>) => {
      onChange({
        ...data,
        items: data.items.map((it) => (it.id === itemId ? { ...it, ...patch } : it)),
      })
    },
    [data, onChange]
  )

  const addItem = useCallback(() => {
    const item: ServiceItem = {
      id: newLocalId(),
      imageUrl: "",
      objectPosition: "center",
      title: "",
      description: "",
      price: "",
      duration: "",
      ctaText: "",
      ctaLink: "",
    }
    onChange({ ...data, items: [...data.items, item] })
  }, [data, onChange])

  const removeItem = useCallback(
    (itemId: string) => onChange({ ...data, items: data.items.filter((i) => i.id !== itemId) }),
    [data, onChange]
  )

  if (!editing && data.items.length === 0) return null

  return (
    <>
      {editing && (
        <div className="mb-5 flex flex-wrap items-center gap-2">
          <BuilderButton onClick={addItem} icon={Plus} tone="accent">
            {labels.addItem}
          </BuilderButton>
          <span className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#9A938A]">
            {labels.columns}
          </span>
          {([2, 3, 4] as const).map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => onChange({ ...data, columns: n })}
              className="h-7 w-7 border-2 border-[#0B0B0D] text-[10px] font-extrabold"
              style={
                data.columns === n
                  ? { background: theme.primary, color: theme.background }
                  : { background: "#1D1810", color: "#9A938A" }
              }
            >
              {n}
            </button>
          ))}
        </div>
      )}

      {data.items.length === 0 ? (
        <p className="text-sm" style={{ color: theme.textSecondary }}>
          {labels.empty}
        </p>
      ) : (
        <div className={`grid grid-cols-1 gap-5 ${COLUMN_CLASS[data.columns]}`}>
          {data.items.map((item) => (
            <article
              key={item.id}
              className="relative flex flex-col border-2 border-[#0B0B0D]"
              style={{ background: theme.surface, boxShadow: `4px 4px 0 0 ${theme.background}` }}
            >
              <div className="aspect-[4/3] w-full overflow-hidden border-b-2 border-[#0B0B0D]">
                <EditableImage
                  url={item.imageUrl}
                  objectPosition={item.objectPosition}
                  onChange={(patch) => patchItem(item.id, patch)}
                  onUpload={onUpload}
                  editing={editing}
                  className="h-full w-full"
                  alt={item.title}
                  label={labels.changeImage}
                  framingLabel={labels.framing}
                  removeLabel={labels.removeImage}
                  emptyHint={labels.imageHint}
                />
              </div>

              <div className="flex flex-1 flex-col gap-2 p-4">
                <InlineText
                  as="h3"
                  editing={editing}
                  value={item.title}
                  onChange={(v) => patchItem(item.id, { title: v })}
                  placeholder={labels.title}
                  maxLength={120}
                  className="text-base font-extrabold uppercase tracking-[0.06em]"
                  style={{ color: theme.textPrimary }}
                />

                {(editing || item.description) && (
                  <InlineText
                    as="p"
                    editing={editing}
                    value={item.description}
                    onChange={(v) => patchItem(item.id, { description: v })}
                    placeholder={labels.description}
                    maxLength={320}
                    multiline
                    className="text-xs leading-relaxed"
                    style={{ color: theme.textSecondary }}
                  />
                )}

                <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 pt-2">
                  {(editing || item.price) && (
                    <InlineText
                      editing={editing}
                      value={item.price}
                      onChange={(v) => patchItem(item.id, { price: v })}
                      placeholder={labels.price}
                      maxLength={40}
                      className="fl-display text-xl leading-none"
                      style={{ color: theme.primary }}
                    />
                  )}
                  {(editing || item.duration) && (
                    <span className="inline-flex items-center gap-1">
                      <Clock className="h-3 w-3 shrink-0" style={{ color: theme.textSecondary }} />
                      <InlineText
                        editing={editing}
                        value={item.duration}
                        onChange={(v) => patchItem(item.id, { duration: v })}
                        placeholder={labels.duration}
                        maxLength={40}
                        className="text-[11px] font-extrabold uppercase tracking-[0.1em]"
                        style={{ color: theme.textSecondary }}
                      />
                    </span>
                  )}
                </div>

                {(editing || item.ctaText) && (
                  <div className="pt-2">
                    {editing ? (
                      <div className="flex flex-col gap-1">
                        <InlineText
                          editing
                          value={item.ctaText}
                          onChange={(v) => patchItem(item.id, { ctaText: v })}
                          placeholder={labels.ctaText}
                          maxLength={40}
                          className="border-2 border-[#0B0B0D] px-4 py-2 text-center text-[11px] font-extrabold uppercase tracking-[0.12em]"
                          style={{ background: theme.primary, color: theme.background }}
                        />
                        <InlineText
                          editing
                          value={item.ctaLink}
                          onChange={(v) => patchItem(item.id, { ctaLink: v })}
                          placeholder={labels.ctaUrl}
                          maxLength={600}
                          className="px-1 text-[10px]"
                          style={{ color: theme.textSecondary }}
                        />
                      </div>
                    ) : (
                      item.ctaText && (
                        <a
                          href={item.ctaLink || undefined}
                          target={item.ctaLink?.startsWith("http") ? "_blank" : undefined}
                          rel="noopener noreferrer"
                          className="block border-2 border-[#0B0B0D] px-4 py-2 text-center text-[11px] font-extrabold uppercase tracking-[0.12em]"
                          style={{ background: theme.primary, color: theme.background }}
                        >
                          {item.ctaText}
                        </a>
                      )
                    )}
                  </div>
                )}
              </div>

              {editing && (
                <div className="absolute -right-2 -top-2 z-10">
                  <BuilderButton
                    onClick={() => removeItem(item.id)}
                    icon={Trash2}
                    tone="danger"
                    title={labels.removeItem}
                  />
                </div>
              )}
            </article>
          ))}
        </div>
      )}
    </>
  )
}
