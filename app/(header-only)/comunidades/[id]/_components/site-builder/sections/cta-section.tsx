"use client"

// Bloco de chamada: selo, informações lado a lado e um botão grande.
//
// ═══ OS VALORES SÃO TEXTO DO LÍDER, NÃO AGENDA VIVA ═══
//
// Na composição de referência este bloco anuncia "próximo horário disponível:
// hoje, 19:30". Aqui ele NÃO faz isso, e a diferença é deliberada: o site da
// comunidade não consulta disponibilidade, e um bloco que dissesse "hoje às
// 19:30" a partir de nada prometeria um horário que ninguém garantiu — o
// visitante apareceria e não haveria vaga.
//
// Quem tem agenda, sinal e pagamento é o PERFIL, e é para lá que o botão leva.
// O que fica aqui é a forma (selo, informações, chamada) preenchida com o que
// o líder sabe ser verdade: dias, faixa de horário, onde.

import { useCallback } from "react"
import { CalendarDays, Clock, Plus, Trash2, UserRound } from "lucide-react"
import type { CtaData, CtaItem, SiteColorTheme } from "@/types/community-site"
import { newLocalId } from "@/types/community-site"
import { BuilderButton, InlineButton, InlineText } from "../editable"
import { useSiteHref, useSiteRuntime } from "../site-runtime"
import { useNextSlot } from "../use-next-slot"

const MAX_ITEMS = 4

/**
 * `AAAA-MM-DD` é amanhã?
 *
 * Comparação por STRING de data local: `new Date("2026-09-07")` é interpretado
 * como meia-noite UTC e, a oeste de Greenwich, volta como o dia anterior — o
 * cartão anunciaria "hoje" para um horário de amanhã.
 */
function isTomorrow(dateISO: string): boolean {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  const mm = String(d.getMonth() + 1).padStart(2, "0")
  const dd = String(d.getDate()).padStart(2, "0")
  return dateISO === `${d.getFullYear()}-${mm}-${dd}`
}

/** Data curta no idioma de quem lê ("7 de set."). */
function formatDate(dateISO: string, locale: string): string {
  const [y, m, d] = dateISO.split("-").map(Number)
  if (!y || !m || !d) return dateISO
  return new Intl.DateTimeFormat(locale, { day: "numeric", month: "short" }).format(
    new Date(y, m - 1, d)
  )
}



export function CtaSection({
  data,
  onChange,
  editing,
  theme,
  labels,
  locale,
}: {
  data: CtaData
  onChange: (next: CtaData) => void
  editing: boolean
  theme: SiteColorTheme
  labels: {
    badge: string
    itemLabel: string
    itemValue: string
    addItem: string
    removeItem: string
    ctaText: string
    ctaUrl: string
    note: string
    /** Cartão vivo: o próximo horário lido da agenda de quem atende. */
    liveTitle: string
    liveDate: string
    liveTime: string
    liveWho: string
    liveToday: string
    liveTomorrow: string
    /** "Próximo horário: {when} às {time} com {who}" */
    liveNote: string
    liveHint: string
    liveFallback: string
  }
  locale: string
}) {
  const ctaHref = useSiteHref(data.ctaUrl)
  const { communityId } = useSiteRuntime()

  // ═══ O TRIO É AGENDA VIVA, NÃO TEXTO ═══
  //
  // Data, horário e profissional saem do próximo horário livre de verdade
  // (`/site/next-slot`). Os valores digitados pelo líder continuam existindo e
  // aparecem quando NÃO há horário — agenda desligada, agenda cheia, backend
  // fora do ar. É o que impede as duas mentiras opostas: anunciar um horário
  // que não existe, e não dizer nada quando existe.
  const { slot } = useNextSlot(communityId)

  const whenLabel = slot
    ? slot.is_today
      ? labels.liveToday
      : isTomorrow(slot.date)
        ? labels.liveTomorrow
        : formatDate(slot.date, locale)
    : ""

  const patchItem = useCallback(
    (itemId: string, patch: Partial<CtaItem>) => {
      onChange({
        ...data,
        items: data.items.map((i) => (i.id === itemId ? { ...i, ...patch } : i)),
      })
    },
    [data, onChange]
  )

  // Vazia, esta seção não chega até aqui em leitura: quem corta é o canvas,
  // pela regra única de `section-content.ts` — e ele corta a MOLDURA inteira,
  // com o cabeçalho que a casca desenha por fora. Cortar aqui dentro deixaria
  // na página um título anunciando o vazio.

  return (
    <div
      className="border-2 border-[#0B0B0D] p-8 text-center md:p-12"
      style={{ background: theme.surface, boxShadow: `8px 8px 0 0 ${theme.background}` }}
    >
      {(editing || data.badge) && (
        <div className="mb-8 flex items-center justify-center gap-2">
          {/* `data-dot` é a exceção documentada do `.fl-sharp`: o ponto tem que
              continuar redondo mesmo com todo o resto do site quadrado. */}
          <span
            data-dot
            className="h-2.5 w-2.5 shrink-0 animate-pulse"
            style={{ background: theme.primary }}
          />
          <InlineText
            editing={editing}
            value={data.badge}
            onChange={(v) => onChange({ ...data, badge: v })}
            styleKey="badge"
            placeholder={labels.badge}
            maxLength={60}
            className="text-[11px] font-extrabold uppercase tracking-[0.18em]"
            style={{ color: theme.primary }}
          />
        </div>
      )}

      {slot && (
        <>
          <div className="mb-8 flex items-center justify-center gap-2">
            {/* Verde, e não a cor da paleta: aqui o ponto quer dizer "está
                livre agora", que é um estado, não identidade visual. */}
            <span data-dot className="h-2.5 w-2.5 shrink-0 animate-pulse bg-[#22C55E]" />
            <span className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-[#22C55E]">
              {labels.liveTitle}
            </span>
          </div>

          <div className="mb-10 flex flex-col items-center justify-center gap-6 md:flex-row md:gap-10">
            {[
              { icon: CalendarDays, label: labels.liveDate, value: whenLabel },
              { icon: Clock, label: labels.liveTime, value: slot.start },
              {
                icon: UserRound,
                // A profissão de quem atende quando ela foi declarada
                // ("Barbeiro"); "Profissional" quando não — o rótulo genérico é
                // melhor do que anunciar uma profissão que ninguém escolheu.
                label: slot.professional.profession || labels.liveWho,
                value: slot.professional.name,
              },
            ].map((cell, index) => (
              <div key={cell.label + index} className="flex items-center gap-6 md:gap-10">
                {index > 0 && (
                  <span
                    aria-hidden
                    className="hidden h-12 w-px shrink-0 md:block"
                    style={{ background: theme.background }}
                  />
                )}
                <div className="flex items-center gap-3">
                  <span
                    className="flex h-10 w-10 shrink-0 items-center justify-center border-2"
                    style={{ borderColor: theme.background, color: theme.primary }}
                  >
                    <cell.icon className="h-4 w-4" />
                  </span>
                  <span className="text-left">
                    <span
                      className="block text-[11px] font-extrabold uppercase tracking-[0.14em]"
                      style={{ color: theme.textSecondary }}
                    >
                      {cell.label}
                    </span>
                    <span
                      className="fl-display mt-1 block text-2xl leading-none md:text-3xl"
                      style={{ color: theme.textPrimary }}
                    >
                      {cell.value}
                    </span>
                  </span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* No construtor os valores digitados continuam à vista mesmo com agenda
          viva: são eles que o visitante vê quando não há horário livre, e o
          líder precisa poder editá-los. Em leitura, um OU outro. */}
      {editing && slot && (
        <p className="mb-3 text-[11px] leading-relaxed" style={{ color: theme.textSecondary }}>
          {labels.liveHint}
        </p>
      )}
      {editing && slot && (
        <p className="mb-4 text-[10px] font-extrabold uppercase tracking-[0.16em]" style={{ color: theme.textSecondary }}>
          {labels.liveFallback}
        </p>
      )}

      {(editing || (!slot && data.items.length > 0)) && (
        <div className="mb-10 flex flex-col items-center justify-center gap-6 md:flex-row md:gap-10">
          {data.items.map((item, index) => (
            <div key={item.id} className="flex items-center gap-6 md:gap-10">
              {/* Régua entre as informações. Some no celular, onde elas
                  empilham e a linha vertical não separaria nada. */}
              {index > 0 && (
                <span
                  aria-hidden
                  className="hidden h-12 w-px shrink-0 md:block"
                  style={{ background: theme.background }}
                />
              )}
              <div className="relative">
                <InlineText
                  editing={editing}
                  value={item.label}
                  onChange={(v) => patchItem(item.id, { label: v })}
                  styleKey={`item.${item.id}.label`}
                  placeholder={labels.itemLabel}
                  maxLength={40}
                  className="block text-[11px] font-extrabold uppercase tracking-[0.14em]"
                  style={{ color: theme.textSecondary }}
                />
                <InlineText
                  editing={editing}
                  value={item.value}
                  onChange={(v) => patchItem(item.id, { value: v })}
                  styleKey={`item.${item.id}.value`}
                  placeholder={labels.itemValue}
                  maxLength={60}
                  className="fl-display mt-1 block text-2xl leading-none md:text-3xl"
                  style={{ color: theme.textPrimary }}
                />
                {editing && (
                  <div className="absolute -right-3 -top-3">
                    <BuilderButton
                      onClick={() =>
                        onChange({ ...data, items: data.items.filter((x) => x.id !== item.id) })
                      }
                      icon={Trash2}
                      tone="danger"
                      title={labels.removeItem}
                    />
                  </div>
                )}
              </div>
            </div>
          ))}

          {editing && data.items.length < MAX_ITEMS && (
            <BuilderButton
              onClick={() =>
                onChange({
                  ...data,
                  items: [...data.items, { id: newLocalId(), label: "", value: "" }],
                })
              }
              icon={Plus}
            >
              {labels.addItem}
            </BuilderButton>
          )}
        </div>
      )}

      {(editing || data.ctaText) && (
        <div className="flex flex-col items-center gap-2">
          <InlineButton
            editing={editing}
            text={data.ctaText}
            url={data.ctaUrl}
            href={ctaHref || ""}
            onChangeText={(v) => onChange({ ...data, ctaText: v })}
            onChangeUrl={(v) => onChange({ ...data, ctaUrl: v })}
            styleKey="cta.button"
            textPlaceholder={labels.ctaText}
            urlPlaceholder={labels.ctaUrl}
            className="border-2 border-[#0B0B0D] px-10 py-4 text-sm font-extrabold uppercase tracking-[0.14em]"
            style={{
              background: theme.primary,
              color: theme.background,
              boxShadow: `4px 4px 0 0 ${theme.background}`,
            }}
            urlClassName="min-w-[220px] px-2 py-1 text-[11px]"
            urlStyle={{ color: theme.textSecondary }}
          />
        </div>
      )}

      {/* A repetição do horário embaixo do botão é do anexo, e ela ganha o
          nome de quem atende — é a diferença entre "tem vaga" e "tem vaga COM
          alguém". Fica acima da observação do líder, sem substituí-la. */}
      {slot && (
        <p className="mt-6 text-xs leading-relaxed" style={{ color: theme.textSecondary }}>
          {labels.liveNote
            .replace("{when}", whenLabel)
            .replace("{time}", slot.start)
            .replace("{who}", slot.professional.name)}
        </p>
      )}

      {(editing || data.note) && (
        <InlineText
          as="p"
          editing={editing}
          value={data.note}
          onChange={(v) => onChange({ ...data, note: v })}
          styleKey="note"
          placeholder={labels.note}
          maxLength={160}
          className="mt-6 text-xs leading-relaxed"
          style={{ color: theme.textSecondary }}
        />
      )}
    </div>
  )
}
