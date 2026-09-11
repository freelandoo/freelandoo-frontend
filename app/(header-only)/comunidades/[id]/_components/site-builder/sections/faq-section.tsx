"use client"

// Perguntas frequentes: lista de pares pergunta/resposta.
//
// ═══ POR QUE ELA NÃO É UM ACORDEÃO ═══
//
// O padrão da web é esconder a resposta atrás de um clique. Aqui não: a
// resposta nasce aberta, porque este bloco tem duas plateias e uma delas não
// clica em nada — o buscador. Google lê pergunta-e-resposta como FAQPage e
// mostra o par direto no resultado; conteúdo escondido atrás de interação é
// lido com menos peso. Para quem lê na tela, a rolagem resolve.
//
// A resposta é MULTILINHA de propósito: "quanto custa" quase nunca cabe numa
// frase, e forçar uma linha só empurra o líder a dar uma resposta pior.

import { useCallback } from "react"
import { Plus, Trash2 } from "lucide-react"
import type { FaqData, FaqItem, SiteColorTheme } from "@/types/community-site"
import { newLocalId } from "@/types/community-site"
import { BuilderButton, InlineText } from "../editable"

export function FaqSection({
  data,
  onChange,
  editing,
  theme,
  labels,
}: {
  data: FaqData
  onChange: (next: FaqData) => void
  editing: boolean
  theme: SiteColorTheme
  labels: {
    question: string
    answer: string
    addItem: string
    removeItem: string
    empty: string
  }
}) {
  const patch = useCallback(
    (itemId: string, next: Partial<FaqItem>) => {
      onChange({ ...data, items: data.items.map((i) => (i.id === itemId ? { ...i, ...next } : i)) })
    },
    [data, onChange]
  )

  const remove = useCallback(
    (itemId: string) => onChange({ ...data, items: data.items.filter((i) => i.id !== itemId) }),
    [data, onChange]
  )

  // Vazia, esta seção não chega aqui em leitura: quem corta é o canvas, pela
  // regra única de `section-content.ts`, e ele corta a MOLDURA inteira (o
  // cabeçalho é desenhado pela casca, por fora).

  return (
    <>
      {editing && (
        <div className="mb-5">
          <BuilderButton
            onClick={() =>
              onChange({
                ...data,
                items: [...data.items, { id: newLocalId(), question: "", answer: "" }],
              })
            }
            icon={Plus}
            tone="accent"
          >
            {labels.addItem}
          </BuilderButton>
        </div>
      )}

      {data.items.length === 0 ? (
        <p className="text-center text-sm" style={{ color: theme.textSecondary }}>
          {labels.empty}
        </p>
      ) : (
        <div className="mx-auto flex max-w-3xl flex-col">
          {data.items.map((item, i) => (
            <div
              key={item.id}
              className="relative border-t-2 py-7 first:border-t-0"
              style={{ borderColor: `${theme.textSecondary}33` }}
            >
              {editing && (
                <button
                  type="button"
                  onClick={() => remove(item.id)}
                  aria-label={labels.removeItem}
                  className="absolute top-6 right-0 p-2 opacity-60 transition-opacity hover:opacity-100"
                  style={{ color: theme.textSecondary }}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}

              <div className="flex gap-4">
                {/* A numeração dá ritmo à pilha e ajuda a citar a pergunta
                    ("a 3") sem depender da ordem visual da tela de quem lê. */}
                <span
                  className="mt-1 shrink-0 text-[0.75rem] tracking-[0.2em] tabular-nums"
                  style={{ color: theme.primary }}
                >
                  {String(i + 1).padStart(2, "0")}
                </span>

                <div className="min-w-0 flex-1">
                  <InlineText
                    as="h3"
                    value={item.question}
                    onChange={(v) => patch(item.id, { question: v })}
                    editing={editing}
                    placeholder={labels.question}
                    maxLength={120}
                    styleKey={`faq.${item.id}.question`}
                    className="text-lg font-semibold md:text-xl"
                    style={{ color: theme.textPrimary }}
                  />
                  <InlineText
                    as="p"
                    value={item.answer}
                    onChange={(v) => patch(item.id, { answer: v })}
                    editing={editing}
                    placeholder={labels.answer}
                    multiline
                    maxLength={640}
                    styleKey={`faq.${item.id}.answer`}
                    className="mt-3 leading-relaxed whitespace-pre-line"
                    style={{ color: theme.textSecondary }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  )
}
