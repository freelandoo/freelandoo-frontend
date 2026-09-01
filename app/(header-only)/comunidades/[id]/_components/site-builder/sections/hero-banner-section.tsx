"use client"

// Seção Hero: um ou mais banners com manchete, subtítulo e CTA.
//
// O carrossel só gira em modo LEITURA. Editando, o slide fica parado no que o
// líder escolheu — um banner que troca sozinho enquanto ele digita tiraria o
// texto de baixo do cursor.

import { useCallback, useEffect, useState } from "react"
import { ChevronLeft, ChevronRight, Plus, Trash2 } from "lucide-react"
import type { HeroData, HeroSlide, SiteColorTheme } from "@/types/community-site"
import { newLocalId } from "@/types/community-site"
import { BuilderButton, EditableImage, InlineText } from "../editable"

const HEIGHTS: Record<HeroData["height"], string> = {
  short: "min-h-[320px] md:min-h-[380px]",
  medium: "min-h-[420px] md:min-h-[520px]",
  tall: "min-h-[520px] md:min-h-[660px]",
}

const AUTOPLAY_MS = 6000

export function HeroBannerSection({
  data,
  onChange,
  editing,
  theme,
  onUpload,
  labels,
}: {
  data: HeroData
  onChange: (next: HeroData) => void
  editing: boolean
  theme: SiteColorTheme
  onUpload: (file: File) => Promise<string | null>
  labels: {
    headline: string
    subheadline: string
    ctaText: string
    ctaUrl: string
    addSlide: string
    removeSlide: string
    changeImage: string
    framing: string
    removeImage: string
    imageHint: string
    prev: string
    next: string
  }
}) {
  const slides = data.slides
  const [index, setIndex] = useState(0)

  // Remover o último slide deixaria o índice apontando para o vazio.
  useEffect(() => {
    if (index > slides.length - 1) setIndex(Math.max(0, slides.length - 1))
  }, [index, slides.length])

  useEffect(() => {
    if (editing || !data.autoplay || slides.length < 2) return
    const timer = setInterval(() => setIndex((i) => (i + 1) % slides.length), AUTOPLAY_MS)
    return () => clearInterval(timer)
  }, [editing, data.autoplay, slides.length])

  const patchSlide = useCallback(
    (slideId: string, patch: Partial<HeroSlide>) => {
      onChange({
        ...data,
        slides: data.slides.map((s) => (s.id === slideId ? { ...s, ...patch } : s)),
      })
    },
    [data, onChange]
  )

  const addSlide = useCallback(() => {
    const slide: HeroSlide = {
      id: newLocalId(),
      imageUrl: "",
      objectPosition: "center",
      headline: "",
      subheadline: "",
      ctaText: "",
      ctaUrl: "",
    }
    onChange({ ...data, slides: [...data.slides, slide] })
    setIndex(data.slides.length)
  }, [data, onChange])

  const removeSlide = useCallback(
    (slideId: string) => {
      onChange({ ...data, slides: data.slides.filter((s) => s.id !== slideId) })
    },
    [data, onChange]
  )

  const current = slides[index]

  if (!current) {
    // Sem slide não há hero. Em leitura, some por completo (um bloco vazio
    // ocupando meia tela seria pior do que não existir).
    if (!editing) return null
    return (
      <section
        className={`flex items-center justify-center ${HEIGHTS[data.height]}`}
        style={{ background: theme.surface }}
      >
        <BuilderButton onClick={addSlide} icon={Plus} tone="accent">
          {labels.addSlide}
        </BuilderButton>
      </section>
    )
  }

  return (
    <section className={`relative w-full overflow-hidden ${HEIGHTS[data.height]}`}>
      <div className="absolute inset-0">
        <EditableImage
          url={current.imageUrl}
          objectPosition={current.objectPosition}
          onChange={(patch) => patchSlide(current.id, patch)}
          onUpload={onUpload}
          editing={editing}
          className="h-full w-full"
          alt={current.headline}
          label={labels.changeImage}
          framingLabel={labels.framing}
          removeLabel={labels.removeImage}
          emptyHint={labels.imageHint}
          eager={index === 0}
        />
      </div>

      {/* Véu: a manchete precisa passar por cima de qualquer foto, inclusive
          uma clara. Sem ele o texto some justamente na foto que o líder achou
          mais bonita. */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: `linear-gradient(180deg, ${theme.background}22 0%, ${theme.background}cc 62%, ${theme.background} 100%)`,
        }}
      />

      <div className="relative flex h-full min-h-inherit items-end">
        <div className="w-full px-5 py-10 md:px-10 md:py-16">
          <div className="mx-auto w-full max-w-6xl">
            <InlineText
              as="h1"
              editing={editing}
              value={current.headline}
              onChange={(v) => patchSlide(current.id, { headline: v })}
              placeholder={labels.headline}
              maxLength={120}
              className="fl-display max-w-4xl text-4xl leading-[0.95] md:text-7xl"
              style={{ color: theme.textPrimary }}
            />
            {(editing || current.subheadline) && (
              <InlineText
                as="p"
                editing={editing}
                value={current.subheadline}
                onChange={(v) => patchSlide(current.id, { subheadline: v })}
                placeholder={labels.subheadline}
                maxLength={240}
                multiline
                className="mt-4 max-w-2xl text-sm leading-relaxed md:text-base"
                style={{ color: theme.textSecondary }}
              />
            )}

            {(editing || current.ctaText) && (
              <div className="mt-7 flex flex-wrap items-center gap-3">
                {editing ? (
                  <>
                    <InlineText
                      editing
                      value={current.ctaText}
                      onChange={(v) => patchSlide(current.id, { ctaText: v })}
                      placeholder={labels.ctaText}
                      maxLength={40}
                      className="border-2 border-[#0B0B0D] px-6 py-3 text-xs font-extrabold uppercase tracking-[0.14em]"
                      style={{ background: theme.primary, color: theme.background }}
                    />
                    <InlineText
                      editing
                      value={current.ctaUrl}
                      onChange={(v) => patchSlide(current.id, { ctaUrl: v })}
                      placeholder={labels.ctaUrl}
                      maxLength={600}
                      className="min-w-[180px] px-2 py-1 text-[11px]"
                      style={{ color: theme.textSecondary }}
                    />
                  </>
                ) : (
                  current.ctaText && (
                    <a
                      href={current.ctaUrl || undefined}
                      target={current.ctaUrl?.startsWith("http") ? "_blank" : undefined}
                      rel="noopener noreferrer"
                      className="inline-block border-2 border-[#0B0B0D] px-6 py-3 text-xs font-extrabold uppercase tracking-[0.14em]"
                      style={{
                        background: theme.primary,
                        color: theme.background,
                        boxShadow: `4px 4px 0 0 ${theme.background}`,
                      }}
                    >
                      {current.ctaText}
                    </a>
                  )
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {slides.length > 1 && (
        <>
          <button
            type="button"
            aria-label={labels.prev}
            onClick={() => setIndex((i) => (i - 1 + slides.length) % slides.length)}
            className="absolute left-3 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center border-2 border-[#0B0B0D]"
            style={{ background: theme.surface, color: theme.textPrimary }}
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            aria-label={labels.next}
            onClick={() => setIndex((i) => (i + 1) % slides.length)}
            className="absolute right-3 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center border-2 border-[#0B0B0D]"
            style={{ background: theme.surface, color: theme.textPrimary }}
          >
            <ChevronRight className="h-5 w-5" />
          </button>
          <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-1.5">
            {slides.map((s, i) => (
              <button
                key={s.id}
                type="button"
                aria-label={`${i + 1}`}
                onClick={() => setIndex(i)}
                className="h-1.5 w-8 border border-[#0B0B0D]"
                style={{ background: i === index ? theme.primary : `${theme.textPrimary}44` }}
              />
            ))}
          </div>
        </>
      )}

      {editing && (
        <div className="absolute right-3 top-3 z-10 flex flex-wrap items-center justify-end gap-1.5">
          <BuilderButton onClick={addSlide} icon={Plus} tone="accent" title={labels.addSlide}>
            {labels.addSlide}
          </BuilderButton>
          {slides.length > 1 && (
            <BuilderButton
              onClick={() => removeSlide(current.id)}
              icon={Trash2}
              tone="danger"
              title={labels.removeSlide}
            />
          )}
        </div>
      )}
    </section>
  )
}
