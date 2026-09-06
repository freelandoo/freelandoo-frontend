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
import { Plus, Trash2 } from "lucide-react"
import type { CtaData, CtaItem, SiteColorTheme } from "@/types/community-site"
import { newLocalId } from "@/types/community-site"
import { BuilderButton, InlineText } from "../editable"

const MAX_ITEMS = 4

export function CtaSection({
  data,
  onChange,
  editing,
  theme,
  labels,
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
  }
}) {
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

      {(editing || data.items.length > 0) && (
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
          {editing ? (
            <>
              <InlineText
                editing
                value={data.ctaText}
                onChange={(v) => onChange({ ...data, ctaText: v })}
                placeholder={labels.ctaText}
                maxLength={40}
                className="border-2 border-[#0B0B0D] px-10 py-4 text-sm font-extrabold uppercase tracking-[0.14em]"
                style={{ background: theme.primary, color: theme.background }}
              />
              <InlineText
                editing
                value={data.ctaUrl}
                onChange={(v) => onChange({ ...data, ctaUrl: v })}
                placeholder={labels.ctaUrl}
                maxLength={600}
                className="min-w-[220px] px-2 py-1 text-[11px]"
                style={{ color: theme.textSecondary }}
              />
            </>
          ) : (
            data.ctaText && (
              <a
                href={data.ctaUrl || undefined}
                target={data.ctaUrl.startsWith("http") ? "_blank" : undefined}
                rel="noopener noreferrer"
                className="inline-block border-2 border-[#0B0B0D] px-10 py-4 text-sm font-extrabold uppercase tracking-[0.14em]"
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
