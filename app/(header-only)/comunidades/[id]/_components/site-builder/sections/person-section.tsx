"use client"

// Quem está por trás: retrato ao lado do texto, com selos e uma chamada.
//
// ═══ O CABEÇALHO É DESENHADO AQUI, E NÃO PELA CASCA ═══
//
// Esta é a única seção (fora o banner) em que o eyebrow, o título e o subtítulo
// não ficam acima das duas colunas: eles abrem a coluna de TEXTO, ao lado da
// foto. É o que faz a pessoa e a frase sobre ela lerem como um bloco só.
//
// Por isso ela recebe `title`/`subtitle` por prop e a casca entra com
// `hideHeader`. As chaves de tamanho (`title`, `subtitle`) são as MESMAS das
// outras seções de propósito: o líder que redimensionou o título aqui espera
// encontrar o mesmo controle que encontrou nas outras.

import { useCallback } from "react"
import { Plus, Trash2 } from "lucide-react"
import type { PersonData, PersonTag, SiteColorTheme } from "@/types/community-site"
import { newLocalId } from "@/types/community-site"
import { BuilderButton, EditableImage, InlineText } from "../editable"

export function PersonSection({
  data,
  onChange,
  editing,
  theme,
  onUpload,
  title,
  subtitle,
  onTitle,
  onSubtitle,
  eyebrow,
  labels,
}: {
  data: PersonData
  onChange: (next: PersonData) => void
  editing: boolean
  theme: SiteColorTheme
  onUpload: (file: File) => Promise<string | null>
  title: string
  subtitle: string
  onTitle: (v: string) => void
  onSubtitle: (v: string) => void
  eyebrow: string
  labels: {
    title: string
    subtitle: string
    body: string
    tag: string
    addTag: string
    removeTag: string
    ctaText: string
    ctaUrl: string
    changeImage: string
    framing: string
    removeImage: string
    imageHint: string
  }
}) {
  const patchTag = useCallback(
    (tagId: string, patch: Partial<PersonTag>) => {
      onChange({ ...data, tags: data.tags.map((t) => (t.id === tagId ? { ...t, ...patch } : t)) })
    },
    [data, onChange]
  )

  const hasPhoto = Boolean(data.photoUrl)
  // Sem retrato (e fora do construtor) o texto ocupa a largura inteira: uma
  // coluna de metade com nada ao lado leria como um bloco quebrado.
  const twoColumns = hasPhoto || editing

  return (
    <div className={`grid items-center gap-12 ${twoColumns ? "lg:grid-cols-2 lg:gap-16" : ""}`}>
      {/* No celular o retrato desce: a frase sobre a pessoa é o que precisa
          chegar primeiro numa tela estreita. */}
      {twoColumns && (
        <div className="relative order-2 lg:order-1">
          <div className="relative aspect-[4/5] w-full border-2 border-[#0B0B0D]">
            <EditableImage
              url={data.photoUrl}
              objectPosition={data.objectPosition}
              onChange={(patch) =>
                onChange({
                  ...data,
                  photoUrl: patch.imageUrl ?? data.photoUrl,
                  objectPosition: patch.objectPosition ?? data.objectPosition,
                })
              }
              onUpload={onUpload}
              editing={editing}
              className="h-full w-full"
              alt={title}
              label={labels.changeImage}
              framingLabel={labels.framing}
              removeLabel={labels.removeImage}
              emptyHint={labels.imageHint}
            />
          </div>
          {/* Molduras deslocadas atrás da foto. Decoração pura, `aria-hidden`,
              escondidas no celular — ali elas roubariam largura do retrato. */}
          <span
            aria-hidden
            className="absolute -bottom-4 -left-4 -z-10 hidden h-24 w-24 border-2 md:block"
            style={{ borderColor: theme.primary }}
          />
          <span
            aria-hidden
            className="absolute -right-4 -top-4 -z-10 hidden h-32 w-32 border-2 md:block"
            style={{ borderColor: theme.surface }}
          />
        </div>
      )}

      <div className={twoColumns ? "order-1 lg:order-2" : ""}>
        {eyebrow && (
          <span
            className="mb-4 block text-[11px] font-extrabold uppercase tracking-[0.24em]"
            style={{ color: theme.primary }}
          >
            {eyebrow}
          </span>
        )}

        <InlineText
          as="h2"
          editing={editing}
          value={title}
          onChange={onTitle}
          styleKey="title"
          placeholder={labels.title}
          maxLength={120}
          className="fl-display text-4xl uppercase leading-[0.92] tracking-[0.02em] md:text-5xl lg:text-6xl"
          style={{ color: theme.textPrimary }}
        />

        {(editing || subtitle) && (
          <InlineText
            as="p"
            editing={editing}
            value={subtitle}
            onChange={onSubtitle}
            styleKey="subtitle"
            placeholder={labels.subtitle}
            maxLength={240}
            className="mt-4 text-base leading-relaxed md:text-lg"
            style={{ color: theme.textSecondary }}
          />
        )}

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
            className="mt-6 space-y-5 whitespace-pre-line text-base leading-relaxed md:text-lg"
            style={{ color: theme.textSecondary }}
          />
        )}

        {(editing || data.tags.length > 0) && (
          <div className="mt-8 flex flex-wrap gap-3">
            {data.tags.map((tag) => (
              <span
                key={tag.id}
                className="relative inline-flex items-center border-2 px-4 py-2 text-xs font-extrabold uppercase tracking-[0.1em]"
                style={{
                  background: theme.surface,
                  borderColor: theme.background,
                  color: theme.textSecondary,
                }}
              >
                <InlineText
                  editing={editing}
                  value={tag.label}
                  onChange={(v) => patchTag(tag.id, { label: v })}
                  placeholder={labels.tag}
                  maxLength={40}
                  className="min-w-[48px]"
                />
                {editing && (
                  <span className="absolute -right-2 -top-2">
                    <BuilderButton
                      onClick={() =>
                        onChange({ ...data, tags: data.tags.filter((x) => x.id !== tag.id) })
                      }
                      icon={Trash2}
                      tone="danger"
                      title={labels.removeTag}
                    />
                  </span>
                )}
              </span>
            ))}

            {editing && data.tags.length < 8 && (
              <BuilderButton
                onClick={() =>
                  onChange({ ...data, tags: [...data.tags, { id: newLocalId(), label: "" }] })
                }
                icon={Plus}
              >
                {labels.addTag}
              </BuilderButton>
            )}
          </div>
        )}

        {(editing || data.ctaText) && (
          <div className="mt-10 flex flex-wrap items-center gap-3">
            {editing ? (
              <>
                <InlineText
                  editing
                  value={data.ctaText}
                  onChange={(v) => onChange({ ...data, ctaText: v })}
                  placeholder={labels.ctaText}
                  maxLength={40}
                  className="border-2 border-[#0B0B0D] px-6 py-3 text-xs font-extrabold uppercase tracking-[0.14em]"
                  style={{ background: theme.primary, color: theme.background }}
                />
                <InlineText
                  editing
                  value={data.ctaUrl}
                  onChange={(v) => onChange({ ...data, ctaUrl: v })}
                  placeholder={labels.ctaUrl}
                  maxLength={600}
                  className="min-w-[180px] px-2 py-1 text-[11px]"
                  style={{ color: theme.textSecondary }}
                />
              </>
            ) : (
              data.ctaText && (
                <a
                  href={data.ctaUrl || undefined}
                  target={data.ctaUrl.startsWith("http") ? "_blank" : undefined}
                  rel="noopener noreferrer"
                  className="inline-block border-2 border-[#0B0B0D] px-6 py-3 text-xs font-extrabold uppercase tracking-[0.14em]"
                  style={{
                    background: theme.primary,
                    color: theme.background,
                    boxShadow: `4px 4px 0 0 ${theme.background}`,
                  }}
                >
                  {data.ctaText}
                </a>
              )
            )}
          </div>
        )}
      </div>
    </div>
  )
}
