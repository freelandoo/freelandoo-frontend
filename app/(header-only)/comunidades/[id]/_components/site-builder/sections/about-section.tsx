"use client"

// Sobre nós: texto longo + tópicos em destaque + fotos lado a lado.

import { useCallback } from "react"
import { Plus, Trash2 } from "lucide-react"
import type { AboutData, HighlightItem, PhotoItem, SiteColorTheme } from "@/types/community-site"
import { newLocalId } from "@/types/community-site"
import { BuilderButton, EditableImage, InlineText } from "../editable"

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

  return (
    <div className={`grid gap-8 ${hasPhotos || editing ? "lg:grid-cols-[1.2fr_1fr]" : ""}`}>
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
            className="whitespace-pre-line text-sm leading-relaxed md:text-base"
            style={{ color: theme.textSecondary }}
          />
        )}

        {(editing || data.highlights.length > 0) && (
          <div className="mt-7 grid gap-3 sm:grid-cols-2">
            {data.highlights.map((h) => (
              <div
                key={h.id}
                className="relative border-2 border-[#0B0B0D] p-4"
                style={{ background: theme.surface }}
              >
                <div className="mb-2 h-1 w-8" style={{ background: theme.primary }} />
                <InlineText
                  as="h3"
                  editing={editing}
                  value={h.title}
                  onChange={(v) => patchHighlight(h.id, { title: v })}
                  styleKey={`hl.${h.id}.title`}
                  placeholder={labels.highlightTitle}
                  maxLength={60}
                  className="text-sm font-extrabold uppercase tracking-[0.08em]"
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
                  className="mt-1 text-xs leading-relaxed"
                  style={{ color: theme.textSecondary }}
                />
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
            ))}

            {editing && data.highlights.length < 8 && (
              <div className="flex items-center">
                <BuilderButton
                  onClick={() =>
                    onChange({
                      ...data,
                      highlights: [
                        ...data.highlights,
                        { id: newLocalId(), title: "", description: "" },
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
        <div className="grid grid-cols-2 gap-3 self-start">
          {data.photos.map((p) => (
            <div key={p.id} className="relative aspect-[3/4] border-2 border-[#0B0B0D]">
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
          ))}

          {editing && data.photos.length < 4 && (
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
              className="flex aspect-[3/4] flex-col items-center justify-center gap-2 border-2 border-dashed border-[#F5F1E8]/25 transition hover:border-[#F2B705]"
            >
              <Plus className="h-6 w-6" style={{ color: theme.primary }} />
              <span className="px-2 text-center text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#9A938A]">
                {labels.addPhoto}
              </span>
            </button>
          )}
        </div>
      )}
    </div>
  )
}
