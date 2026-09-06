"use client"

// Seção Hero: um ou mais banners com manchete, subtítulo e dois botões.
//
// O carrossel só gira em modo LEITURA. Editando, o slide fica parado no que o
// líder escolheu — um banner que troca sozinho enquanto ele digita tiraria o
// texto de baixo do cursor.
//
// ═══ O SEGUNDO BOTÃO NÃO PRECISA DE LINK ═══
//
// Sem URL, ele ancora na PRÓXIMA seção do site. É o destino óbvio ("conheça o
// espaço" leva ao bloco de baixo) e poupa o líder de descobrir e colar uma
// âncora que ele nem sabe que existe. Com URL, a escolha dele vence.

import { useCallback, useEffect, useState } from "react"
import { ChevronDown, ChevronLeft, ChevronRight, Plus, Trash2 } from "lucide-react"
import type { HeroData, HeroSlide, SiteColorTheme } from "@/types/community-site"
import { newLocalId } from "@/types/community-site"
import { BuilderButton, EditableImage, InlineText } from "../editable"
import { useSectionLayout } from "../site-style-context"
import { isExternalHref, useSiteHref, useSiteRuntime } from "../site-runtime"

const HEIGHTS: Record<HeroData["height"], string> = {
  short: "min-h-[380px] md:min-h-[460px]",
  medium: "min-h-[520px] md:min-h-[640px]",
  // O banner ocupa a tela inteira: é o enquadramento da composição de
  // referência, em que a manchete é a primeira e única coisa visível.
  tall: "min-h-[86vh] md:min-h-screen",
}

const AUTOPLAY_MS = 6000

export function HeroBannerSection({
  data,
  onChange,
  editing,
  theme,
  onUpload,
  nextAnchor,
  labels,
}: {
  data: HeroData
  onChange: (next: HeroData) => void
  editing: boolean
  theme: SiteColorTheme
  onUpload: (file: File) => Promise<string | null>
  /** Âncora da seção seguinte — destino do 2º botão e do indicador de rolagem. */
  nextAnchor: string | null
  labels: {
    headline: string
    subheadline: string
    ctaText: string
    ctaUrl: string
    ctaSecondaryText: string
    ctaSecondaryUrl: string
    addSlide: string
    removeSlide: string
    changeImage: string
    framing: string
    removeImage: string
    imageHint: string
    prev: string
    next: string
    scrollHint: string
  }
}) {
  const slides = data.slides
  const [index, setIndex] = useState(0)
  // O hero tem altura PRÓPRIA (short/medium/tall). Quando o líder puxa a alça
  // da seção, a altura escolhida por ele vence — e a classe sai de cena, senão
  // o `min-h` dela seguraria o banner acima do tamanho pedido.
  const layout = useSectionLayout()
  const customHeight = layout?.minHeight ?? null
  const heightClass = customHeight ? "" : HEIGHTS[data.height]
  const heightStyle = customHeight ? { minHeight: customHeight } : undefined

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
      ctaSecondaryText: "",
      ctaSecondaryUrl: "",
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

  // Destino resolvido: o token `agendar` vira o endereço da página de
  // agendamento DESTE site (que muda conforme por onde ele foi servido); o
  // resto passa como está. `null` = não desenha link.
  //
  // ⚠️ Antes do early return de "sem slide": hook chamado depois de um return
  // condicional muda a contagem de hooks entre renderizações.
  const primaryChosen = useSiteHref(current?.ctaUrl || "")
  // Botão sem destino escolhido vira o agendamento, quando o site tem um.
  //
  // Isto é o que traz os sites JÁ PUBLICADOS para o comportamento novo: eles
  // foram semeados com "Fale com a gente" e link vazio, o que desenhava um
  // <a> sem href — um botão que parecia vivo e não fazia nada. A alternativa
  // seria reescrever o documento deles por migration, sobrescrevendo o texto
  // que o líder possa ter mudado.
  const { bookingHref } = useSiteRuntime()
  const primaryHref = primaryChosen || bookingHref
  const secondaryChosen = useSiteHref(current?.ctaSecondaryUrl || "")
  // Sem link escolhido, o segundo botão leva à seção seguinte — é o "veja o que
  // vem abaixo" do banner de tela cheia.
  const secondaryHref = secondaryChosen || (nextAnchor ? `#${nextAnchor}` : null)

  if (!current) {
    // Sem slide não há hero — em leitura o canvas já cortou a seção inteira
    // (`section-content.ts`). O que sobra aqui é a porta do construtor para
    // criar o primeiro banner.
    return (
      <section
        className={`flex items-center justify-center ${heightClass}`}
        style={{ background: theme.surface, ...heightStyle }}
      >
        <BuilderButton onClick={addSlide} icon={Plus} tone="accent">
          {labels.addSlide}
        </BuilderButton>
      </section>
    )
  }

  return (
    <section
      className={`relative flex w-full items-center overflow-hidden ${heightClass}`}
      style={heightStyle}
    >
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
          mais bonita.
          São DUAS camadas: a horizontal escurece o lado do texto e deixa a
          foto respirar à direita; a vertical costura o banner com a seção de
          baixo. Só a horizontal deixaria uma emenda dura no rodapé do banner. */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: `linear-gradient(90deg, ${theme.background}f2 0%, ${theme.background}b3 45%, ${theme.background}33 100%)`,
        }}
      />
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3"
        style={{ background: `linear-gradient(180deg, transparent 0%, ${theme.background} 100%)` }}
      />

      <div className="relative w-full px-5 py-24 md:px-10">
        <div
          className="mx-auto w-full max-w-6xl"
          style={layout?.maxWidth ? { maxWidth: layout.maxWidth } : undefined}
        >
          <div className="max-w-2xl">
            <InlineText
              as="h1"
              editing={editing}
              value={current.headline}
              onChange={(v) => patchSlide(current.id, { headline: v })}
              styleKey={`hero.${current.id}.headline`}
              placeholder={labels.headline}
              maxLength={120}
              className="fl-display text-5xl uppercase leading-[0.9] tracking-[0.02em] md:text-7xl lg:text-8xl"
              style={{ color: theme.textPrimary }}
            />
            {(editing || current.subheadline) && (
              <InlineText
                as="p"
                editing={editing}
                value={current.subheadline}
                onChange={(v) => patchSlide(current.id, { subheadline: v })}
                styleKey={`hero.${current.id}.subheadline`}
                placeholder={labels.subheadline}
                maxLength={240}
                multiline
                className="mt-6 max-w-xl text-base leading-relaxed md:text-xl"
                style={{ color: theme.textSecondary }}
              />
            )}

            {(editing || current.ctaText || current.ctaSecondaryText) && (
              <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-start">
                {/* Botão principal */}
                {editing ? (
                  <div className="flex flex-col gap-1">
                    <InlineText
                      editing
                      value={current.ctaText}
                      onChange={(v) => patchSlide(current.id, { ctaText: v })}
                      placeholder={labels.ctaText}
                      maxLength={40}
                      className="border-2 border-[#0B0B0D] px-8 py-4 text-sm font-extrabold uppercase tracking-[0.14em]"
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
                  </div>
                ) : (
                  current.ctaText &&
                  primaryHref && (
                    <a
                      href={primaryHref}
                      target={isExternalHref(primaryHref) ? "_blank" : undefined}
                      rel="noopener noreferrer"
                      className="inline-block border-2 border-[#0B0B0D] px-8 py-4 text-center text-sm font-extrabold uppercase tracking-[0.14em]"
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

                {/* Botão secundário: contorno, peso menor. */}
                {editing ? (
                  <div className="flex flex-col gap-1">
                    <InlineText
                      editing
                      value={current.ctaSecondaryText}
                      onChange={(v) => patchSlide(current.id, { ctaSecondaryText: v })}
                      placeholder={labels.ctaSecondaryText}
                      maxLength={40}
                      className="border-2 px-8 py-4 text-sm font-extrabold uppercase tracking-[0.14em]"
                      style={{ borderColor: theme.textPrimary, color: theme.textPrimary }}
                    />
                    <InlineText
                      editing
                      value={current.ctaSecondaryUrl}
                      onChange={(v) => patchSlide(current.id, { ctaSecondaryUrl: v })}
                      placeholder={labels.ctaSecondaryUrl}
                      maxLength={600}
                      className="min-w-[180px] px-2 py-1 text-[11px]"
                      style={{ color: theme.textSecondary }}
                    />
                  </div>
                ) : (
                  current.ctaSecondaryText &&
                  secondaryHref && (
                    <a
                      href={secondaryHref}
                      target={isExternalHref(secondaryHref) ? "_blank" : undefined}
                      rel="noopener noreferrer"
                      className="inline-block border-2 px-8 py-4 text-center text-sm font-extrabold uppercase tracking-[0.14em]"
                      style={{ borderColor: theme.textPrimary, color: theme.textPrimary }}
                    >
                      {current.ctaSecondaryText}
                    </a>
                  )
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Indicador de rolagem: diz que a página continua abaixo do banner de
          tela cheia. Só em leitura — no construtor ele cobriria os controles
          de slide, e ali a rolagem é da prancheta, não da página. */}
      {!editing && nextAnchor && (
        <a
          href={`#${nextAnchor}`}
          aria-label={labels.scrollHint}
          title={labels.scrollHint}
          className="absolute bottom-6 left-1/2 grid h-10 w-10 -translate-x-1/2 animate-bounce place-items-center border-2 motion-reduce:animate-none"
          style={{ borderColor: `${theme.textPrimary}55`, color: theme.textPrimary }}
        >
          <ChevronDown className="h-5 w-5" />
        </a>
      )}

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
          <div className="absolute bottom-6 right-5 flex gap-1.5 md:right-10">
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
