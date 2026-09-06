"use client"

// Sobre nós: texto longo + destaques com ícone + mosaico de fotos.
//
// ═══ O MOSAICO É ESCALONADO DE PROPÓSITO ═══
//
// As fotos não formam uma grade regular: são duas colunas, a segunda descida
// meia altura, com os retratos alternando alto/baixo. É o que faz um punhado
// de fotos parecer um arranjo e não um contact sheet. O alternado vem do
// ÍNDICE, então funciona com uma, duas, três ou quatro fotos sem o líder
// precisar escolher tamanho nenhum.

import { useCallback } from "react"
import { Plus, Trash2 } from "lucide-react"
import type {
  AboutData,
  HighlightItem,
  PhotoItem,
  SiteColorTheme,
  SiteIcon,
} from "@/types/community-site"
import { SITE_ICONS, newLocalId } from "@/types/community-site"
import { BuilderButton, EditableImage, InlineText } from "../editable"
import { highlightIcon } from "../site-icons"

/**
 * Altura de cada foto do mosaico. Índices pares abrem baixos, ímpares altos —
 * e a coluna da direita começa descida, então o olho vê quatro alturas
 * diferentes com só dois valores.
 */
const PHOTO_HEIGHTS = ["h-44 md:h-52", "h-60 md:h-72"]

export function AboutSection({
  data,
  onChange,
  editing,
  theme,
  onUpload,
  labels,
}: {
  data: AboutData
  onChange: (next: AboutData) => void
  editing: boolean
  theme: SiteColorTheme
  onUpload: (file: File) => Promise<string | null>
  labels: {
    body: string
    highlightTitle: string
    highlightDescription: string
    addHighlight: string
    removeHighlight: string
    addPhoto: string
    removePhoto: string
    changeImage: string
    framing: string
    removeImage: string
    imageHint: string
    icon: string
  }
}) {
  const patchHighlight = useCallback(
    (itemId: string, patch: Partial<HighlightItem>) => {
      onChange({
        ...data,
        highlights: data.highlights.map((h) => (h.id === itemId ? { ...h, ...patch } : h)),
      })
    },
    [data, onChange]
  )

  const patchPhoto = useCallback(
    (photoId: string, patch: Partial<PhotoItem>) => {
      onChange({
        ...data,
        photos: data.photos.map((p) => (p.id === photoId ? { ...p, ...patch } : p)),
      })
    },
    [data, onChange]
  )

  const hasPhotos = data.photos.length > 0
  // As fotos são repartidas em duas colunas ANTES do render: é o que permite
  // descer a segunda sem quebrar a ordem em que o líder as colocou.
  const left = data.photos.filter((_, i) => i % 2 === 0)
  const right = data.photos.filter((_, i) => i % 2 === 1)

  return (
    <div className={`grid items-center gap-12 ${hasPhotos || editing ? "lg:grid-cols-2 lg:gap-16" : ""}`}>
      <div>
        {(editing || data.body) && (
          <InlineText
            as="div"
            editing={editing}
            value={data.body}
            onChange={(v) => onChange({ ...data, body: v })}
            styleKey="body"
            placeholder={labels.body}
            maxLength={2000}
            multiline
            className="space-y-5 whitespace-pre-line text-base leading-relaxed md:text-lg"
            style={{ color: theme.textSecondary }}
          />
        )}

        {(editing || data.highlights.length > 0) && (
          <div className="mt-10 grid gap-6 sm:grid-cols-2">
            {data.highlights.map((h) => {
              const Icon = highlightIcon(h.icon)
              return (
                <div key={h.id} className="relative flex gap-4">
                  {/* Quadrado do ícone. Sem ícone escolhido ele vira a barra de
                      acento — o destaque não pode ficar sem âncora visual. */}
                  <div
                    className={`flex shrink-0 items-center justify-center border-2 ${
                      Icon ? "h-12 w-12" : "h-12 w-1.5"
                    }`}
                    style={{
                      background: Icon ? `${theme.primary}22` : theme.primary,
                      borderColor: Icon ? theme.primary : theme.primary,
                    }}
                  >
                    {Icon && <Icon className="h-5 w-5" style={{ color: theme.primary }} />}
                  </div>

                  <div className="min-w-0 flex-1">
                    <InlineText
                      as="h3"
                      editing={editing}
                      value={h.title}
                      onChange={(v) => patchHighlight(h.id, { title: v })}
                      styleKey={`hl.${h.id}.title`}
                      placeholder={labels.highlightTitle}
                      maxLength={60}
                      className="mb-1 text-sm font-extrabold uppercase tracking-[0.08em]"
                      style={{ color: theme.textPrimary }}
                    />
                    <InlineText
                      as="p"
                      editing={editing}
                      value={h.description}
                      onChange={(v) => patchHighlight(h.id, { description: v })}
                      styleKey={`hl.${h.id}.desc`}
                      placeholder={labels.highlightDescription}
                      maxLength={160}
                      multiline
                      className="text-sm leading-relaxed"
                      style={{ color: theme.textSecondary }}
                    />

                    {editing && (
                      <label className="mt-2 flex items-center gap-1.5">
                        <span className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#9A938A]">
                          {labels.icon}
                        </span>
                        <select
                          value={h.icon}
                          onChange={(e) =>
                            patchHighlight(h.id, { icon: e.target.value as SiteIcon })
                          }
                          className="border-2 border-[#0B0B0D] bg-[#1D1810] px-1.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.08em] text-[#F5F1E8]"
                        >
                          {SITE_ICONS.map((name) => (
                            <option key={name} value={name}>
                              {name}
                            </option>
                          ))}
                        </select>
                      </label>
                    )}
                  </div>

                  {editing && (
                    <div className="absolute -right-2 -top-2">
                      <BuilderButton
                        onClick={() =>
                          onChange({
                            ...data,
                            highlights: data.highlights.filter((x) => x.id !== h.id),
                          })
                        }
                        icon={Trash2}
                        tone="danger"
                        title={labels.removeHighlight}
                      />
                    </div>
                  )}
                </div>
              )
            })}

            {editing && data.highlights.length < 8 && (
              <div className="flex items-center">
                <BuilderButton
                  onClick={() =>
                    onChange({
                      ...data,
                      highlights: [
                        ...data.highlights,
                        { id: newLocalId(), icon: "sparkles", title: "", description: "" },
                      ],
                    })
                  }
                  icon={Plus}
                >
                  {labels.addHighlight}
                </BuilderButton>
              </div>
            )}
          </div>
        )}
      </div>

      {(hasPhotos || editing) && (
        <div className="grid grid-cols-2 gap-4">
          {[left, right].map((column, columnIndex) => (
            <div key={columnIndex} className={`space-y-4 ${columnIndex === 1 ? "pt-8" : ""}`}>
              {column.map((p) => {
                // A altura vem do índice REAL da foto no array, não do índice
                // dentro da coluna: é o que mantém o alternado depois de
                // remover uma foto do meio.
                const height = PHOTO_HEIGHTS[data.photos.indexOf(p) % PHOTO_HEIGHTS.length]
                return (
                  <div key={p.id} className={`relative ${height} border-2 border-[#0B0B0D]`}>
                    <EditableImage
                      url={p.imageUrl}
                      objectPosition={p.objectPosition}
                      onChange={(patch) => patchPhoto(p.id, patch)}
                      onUpload={onUpload}
                      editing={editing}
                      className="h-full w-full"
                      alt={p.caption}
                      label={labels.changeImage}
                      framingLabel={labels.framing}
                      removeLabel={labels.removeImage}
                      emptyHint={labels.imageHint}
                    />
                    {editing && (
                      <div className="absolute -right-2 -top-2 z-10">
                        <BuilderButton
                          onClick={() =>
                            onChange({ ...data, photos: data.photos.filter((x) => x.id !== p.id) })
                          }
                          icon={Trash2}
                          tone="danger"
                          title={labels.removePhoto}
                        />
                      </div>
                    )}
                  </div>
                )
              })}

              {/* O botão de adicionar mora na coluna mais curta, para o mosaico
                  não ficar torto enquanto o líder monta. */}
              {editing &&
                data.photos.length < 4 &&
                columnIndex === (left.length <= right.length ? 0 : 1) && (
                  <button
                    type="button"
                    onClick={() =>
                      onChange({
                        ...data,
                        photos: [
                          ...data.photos,
                          { id: newLocalId(), imageUrl: "", objectPosition: "center", caption: "" },
                        ],
                      })
                    }
                    className="flex h-44 w-full flex-col items-center justify-center gap-2 border-2 border-dashed border-[#F5F1E8]/25 transition hover:border-[#F2B705] md:h-52"
                  >
                    <Plus className="h-6 w-6" style={{ color: theme.primary }} />
                    <span className="px-2 text-center text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#9A938A]">
                      {labels.addPhoto}
                    </span>
                  </button>
                )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
