"use client"

// Vitrine de serviços: grade de cards com foto, nome, descrição, preço e duração.
//
// ═══ O CONTEÚDO NÃO MORA NO SITE (2026-09-04, decisão do Alex) ═══
//
// Os cards são os serviços REAIS cadastrados na Freelandoo, servidos pelo
// backend a cada leitura. Antes eram texto livre: o líder digitava nome, preço
// e duração no construtor. Isso dava ao site uma SEGUNDA VERDADE sobre preço —
// bastava reajustar o serviço de verdade e esquecer do site para a página
// pública seguir anunciando o valor antigo, sem erro nenhum aparecer.
//
// Por isso aqui não há nada editável dentro do card, nem em modo de edição: o
// que o líder vê no construtor é exatamente o que sai publicado, porque é a
// mesma consulta. Para mudar um serviço, muda-se o serviço.
//
// O que continua sendo do site é a APRESENTAÇÃO: quantas colunas, e o título e
// o subtítulo da seção (que vivem na casca, não aqui).

import { Clock, ExternalLink } from "lucide-react"
import type { ServicesCatalogData, ShowcaseService, SiteColorTheme } from "@/types/community-site"

const COLUMN_CLASS: Record<ServicesCatalogData["columns"], string> = {
  2: "sm:grid-cols-2",
  3: "sm:grid-cols-2 lg:grid-cols-3",
  4: "sm:grid-cols-2 lg:grid-cols-4",
}

/**
 * Preço em centavos → moeda no idioma de quem lê.
 *
 * O backend manda centavos justamente para que a formatação aconteça aqui: o
 * site é servido em três idiomas, e um texto "R$ 1.200,00" gravado no servidor
 * ficaria em português para todo mundo.
 */
function formatPrice(cents: number | null | undefined, locale: string) {
  if (cents === null || cents === undefined) return null
  const value = Number(cents)
  if (!Number.isFinite(value)) return null
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "BRL",
  }).format(value / 100)
}

/** 90 → "1h30". Minutos crus ("90min") leem pior do que a conta já feita. */
function formatDuration(minutes: number | null | undefined, hourSuffix: string, minSuffix: string) {
  const total = Number(minutes)
  if (!Number.isFinite(total) || total <= 0) return null
  const h = Math.floor(total / 60)
  const m = total % 60
  if (h === 0) return `${m}${minSuffix}`
  if (m === 0) return `${h}${hourSuffix}`
  return `${h}${hourSuffix}${String(m).padStart(2, "0")}`
}

export function ServicesCatalogSection({
  data,
  onChange,
  editing,
  theme,
  services,
  providerHref,
  locale,
  labels,
}: {
  data: ServicesCatalogData
  onChange: (next: ServicesCatalogData) => void
  editing: boolean
  theme: SiteColorTheme
  /** Os serviços ativos do cadastro. Vêm do backend, não do documento do site. */
  services: ShowcaseService[]
  /** Para onde o botão do card leva — o perfil onde o serviço é contratado. */
  providerHref: string | null
  locale: string
  labels: {
    columns: string
    cta: string
    empty: string
    emptyHint: string
    hourSuffix: string
    minSuffix: string
  }
}) {
  // Site publicado não mostra vitrine vazia: sem serviço cadastrado, a seção
  // inteira desaparece para o visitante. No construtor ela permanece, com a
  // instrução — sumir lá esconderia do líder que a seção existe.
  if (!editing && services.length === 0) return null

  return (
    <>
      {editing && (
        <div className="mb-5 flex flex-wrap items-center gap-2">
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

      {services.length === 0 ? (
        <div
          className="border-2 border-dashed p-6 text-center"
          style={{ borderColor: theme.textSecondary }}
        >
          <p className="text-sm font-extrabold" style={{ color: theme.textPrimary }}>
            {labels.empty}
          </p>
          <p className="mt-1 text-xs leading-relaxed" style={{ color: theme.textSecondary }}>
            {labels.emptyHint}
          </p>
        </div>
      ) : (
        <div className={`grid grid-cols-1 gap-5 ${COLUMN_CLASS[data.columns]}`}>
          {services.map((service) => {
            const price = formatPrice(service.price_amount, locale)
            const duration = formatDuration(
              service.duration_minutes,
              labels.hourSuffix,
              labels.minSuffix
            )
            return (
              <article
                key={service.id_profile_service}
                className="relative flex flex-col border-2 border-[#0B0B0D]"
                style={{ background: theme.surface, boxShadow: `4px 4px 0 0 ${theme.background}` }}
              >
                {service.image_url && (
                  <div className="aspect-[4/3] w-full overflow-hidden border-b-2 border-[#0B0B0D]">
                    {/* <img> e não next/image: a foto vem do R2 e é conteúdo de
                        alto volume — a política do projeto reserva a otimização
                        da Vercel para superfícies de baixa cardinalidade. É a
                        mesma escolha do `EditableImage` ao lado. */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={service.image_url}
                      alt={service.name}
                      loading="lazy"
                      className="h-full w-full object-cover"
                    />
                  </div>
                )}

                <div className="flex flex-1 flex-col gap-2 p-4">
                  <h3
                    className="text-base font-extrabold uppercase tracking-[0.06em]"
                    style={{ color: theme.textPrimary }}
                  >
                    {service.name}
                  </h3>

                  {service.description && (
                    <p
                      className="whitespace-pre-wrap text-xs leading-relaxed"
                      style={{ color: theme.textSecondary }}
                    >
                      {service.description}
                    </p>
                  )}

                  <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 pt-2">
                    {price && (
                      <span className="fl-display text-xl leading-none" style={{ color: theme.primary }}>
                        {price}
                      </span>
                    )}
                    {duration && (
                      <span className="inline-flex items-center gap-1">
                        <Clock className="h-3 w-3 shrink-0" style={{ color: theme.textSecondary }} />
                        <span
                          className="text-[11px] font-extrabold uppercase tracking-[0.1em]"
                          style={{ color: theme.textSecondary }}
                        >
                          {duration}
                        </span>
                      </span>
                    )}
                  </div>

                  {/* O botão leva ao perfil onde o serviço é contratado — é lá
                      que moram agenda, sinal e pagamento. Um botão que só
                      abrisse um formulário aqui prometeria uma contratação que
                      este site não sabe concluir.
                      Em edição ele é inerte: clicar levaria o líder para fora
                      do construtor no meio da montagem. */}
                  {providerHref && (
                    <div className="pt-2">
                      {editing ? (
                        <span
                          className="block border-2 border-[#0B0B0D] px-4 py-2 text-center text-[11px] font-extrabold uppercase tracking-[0.12em]"
                          style={{ background: theme.primary, color: theme.background }}
                        >
                          {labels.cta}
                        </span>
                      ) : (
                        <a
                          href={providerHref}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-center gap-1.5 border-2 border-[#0B0B0D] px-4 py-2 text-center text-[11px] font-extrabold uppercase tracking-[0.12em]"
                          style={{ background: theme.primary, color: theme.background }}
                        >
                          {labels.cta}
                          <ExternalLink className="h-3 w-3 shrink-0" />
                        </a>
                      )}
                    </div>
                  )}
                </div>
              </article>
            )
          })}
        </div>
      )}
    </>
  )
}
