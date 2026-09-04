"use client"

// Galeria de fotos: grade com legenda opcional por foto.

import { useCallback } from "react"
import { Plus, Trash2 } from "lucide-react"
import type { GalleryData, PhotoItem, SiteColorTheme } from "@/types/community-site"
import { newLocalId } from "@/types/community-site"
import { BuilderButton, EditableImage, InlineText } from "../editable"

const COLUMN_CLASS: Record<GalleryData["columns"], string> = {
  2: "grid-cols-2",
  3: "grid-cols-2 md:grid-cols-3",
  4: "grid-cols-2 md:grid-cols-4",
}

const MAX_PHOTOS = 30

export function GallerySection({
  data,
  onChange,
  editing,
  theme,
  onUpload,
  labels,
}: {
  data: GalleryData
  onChange: (next: GalleryData) => void
  editing: boolean
  theme: SiteColorTheme
  onUpload: (file: File) => Promise<string | null>
  labels: {
    caption: string
    addPhoto: string
    removePhoto: string
    changeImage: string
    framing: string
    removeImage: string
    imageHint: string
    columns: string
    empty: string
  }
}) {
  const patch = useCallback(
    (photoId: string, next: Partial<PhotoItem>) => {
      onChange({
        ...data,
        photos: data.photos.map((p) => (p.id === photoId ? { ...p, ...next } : p)),
      })
    },
    [data, onChange]
  )

  if (!editing && data.photos.length === 0) return null

  return (
    <>
      {editing && (
        <div className="mb-5 flex flex-wrap items-center gap-2">
          <BuilderButton
            onClick={() =>
              onChange({
                ...data,
                photos: [
                  ...data.photos,
                  { id: newLocalId(), imageUrl: "", objectPosition: "center", caption: "" },
                ],
              })
            }
            icon={Plus}
            tone="accent"
          >
            {labels.addPhoto}
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

      {data.photos.length === 0 ? (
        <p className="text-sm" style={{ color: theme.textSecondary }}>
          {labels.empty}
        </p>
      ) : (
        <div className={`grid gap-3 ${COLUMN_CLASS[data.columns]}`}>
          {data.photos.map((p) => (
            <figure key={p.id} className="relative">
              <div className="aspect-square w-full border-2 border-[#0B0B0D]">
                <EditableImage
                  url={p.imageUrl}
                  objectPosition={p.objectPosition}
                  onChange={(next) => patch(p.id, next)}
                  onUpload={onUpload}
                  editing={editing}
                  className="h-full w-full"
                  alt={p.caption}
                  label={labels.changeImage}
                  framingLabel={labels.framing}
                  removeLabel={labels.removeImage}
                  emptyHint={labels.imageHint}
                />
              </div>
              {(editing || p.caption) && (
                <InlineText
                  as="figcaption"
                  editing={editing}
                  value={p.caption}
                  onChange={(v) => patch(p.id, { caption: v })}
                  styleKey={`photo.${p.id}.caption`}
                  placeholder={labels.caption}
                  maxLength={120}
                  className="mt-1 text-[11px]"
                  style={{ color: theme.textSecondary }}
                />
              )}
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
            </figure>
          ))}

          {editing && data.photos.length < MAX_PHOTOS && (
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
              className="flex aspect-square flex-col items-center justify-center gap-2 border-2 border-dashed border-[#F5F1E8]/25 transition hover:border-[#F2B705]"
            >
              <Plus className="h-6 w-6" style={{ color: theme.primary }} />
            </button>
          )}
        </div>
      )}
    </>
  )
}
