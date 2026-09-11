"use client"

// Áreas atendidas: as cidades e bairros até onde o negócio vai.
//
// ═══ POR QUE NÃO É PARTE DE "CONTATO" ═══
//
// Contato responde "onde você fica". Área atendida responde "até onde você
// vem" — e é esta que decide se quem está na cidade vizinha chama ou desiste.
// Juntas num bloco só, a segunda vira uma linha de rodapé que ninguém lê.
//
// ═══ O ITEM PODE LEVAR A UMA PÁGINA PRÓPRIA ═══
//
// `url` costuma apontar para uma sub-página (`pagina:aguai`): é o formato que
// responde em busca local, porque a pessoa procura "conserto de fogão em
// Aguaí" e cai numa página que fala daquela cidade. Sem link, o item é só
// informativo — e continua valendo, porque a lista já diz o que importa.

import { useCallback } from "react"
import { ArrowUpRight, Plus, Trash2 } from "lucide-react"
import type { AreaItem, AreasData, SiteColorTheme } from "@/types/community-site"
import { newLocalId } from "@/types/community-site"
import { BuilderButton, InlineText } from "../editable"
import { isExternalHref, useSiteHref } from "../site-runtime"

const COLUMN_CLASS: Record<2 | 3 | 4, string> = {
  2: "sm:grid-cols-2",
  3: "sm:grid-cols-2 lg:grid-cols-3",
  4: "sm:grid-cols-2 lg:grid-cols-4",
}

export function AreasSection({
  data,
  onChange,
  editing,
  theme,
  labels,
}: {
  data: AreasData
  onChange: (next: AreasData) => void
  editing: boolean
  theme: SiteColorTheme
  labels: {
    name: string
    uf: string
    note: string
    url: string
    sectionNote: string
    addItem: string
    removeItem: string
    empty: string
  }
}) {
  const patch = useCallback(
    (itemId: string, next: Partial<AreaItem>) => {
      onChange({ ...data, items: data.items.map((i) => (i.id === itemId ? { ...i, ...next } : i)) })
    },
    [data, onChange]
  )

  return (
    <>
      {editing && (
        <div className="mb-5">
          <BuilderButton
            onClick={() =>
              onChange({
                ...data,
                items: [
                  ...data.items,
                  { id: newLocalId(), name: "", uf: "", note: "", url: "" },
                ],
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
        <div className={`grid grid-cols-1 gap-4 ${COLUMN_CLASS[data.columns]}`}>
          {data.items.map((item) => (
            <AreaCard
              key={item.id}
              item={item}
              editing={editing}
              theme={theme}
              labels={labels}
              onPatch={(next) => patch(item.id, next)}
              onRemove={() =>
                onChange({ ...data, items: data.items.filter((i) => i.id !== item.id) })
              }
            />
          ))}
        </div>
      )}

      {(editing || data.note) && (
        <InlineText
          as="p"
          value={data.note}
          onChange={(v) => onChange({ ...data, note: v })}
          editing={editing}
          placeholder={labels.sectionNote}
          maxLength={160}
          styleKey="areas.note"
          className="mt-8 text-center text-sm"
          style={{ color: theme.textSecondary }}
        />
      )}
    </>
  )
}

/**
 * Componente à parte porque `useSiteHref` é um hook: chamá-lo dentro do `.map`
 * do pai quebraria a regra dos hooks na primeira vez que a lista mudasse de
 * tamanho.
 */
function AreaCard({
  item,
  editing,
  theme,
  labels,
  onPatch,
  onRemove,
}: {
  item: AreaItem
  editing: boolean
  theme: SiteColorTheme
  labels: { name: string; uf: string; note: string; url: string; removeItem: string }
  onPatch: (next: Partial<AreaItem>) => void
  onRemove: () => void
}) {
  const href = useSiteHref(item.url)

  const body = (
    <>
      <div className="flex items-baseline gap-2">
        <InlineText
          as="h3"
          value={item.name}
          onChange={(v) => onPatch({ name: v })}
          editing={editing}
          placeholder={labels.name}
          maxLength={60}
          styleKey={`areas.${item.id}.name`}
          className="text-lg font-semibold"
          style={{ color: theme.textPrimary }}
        />
        {(editing || item.uf) && (
          <InlineText
            as="span"
            value={item.uf}
            onChange={(v) => onPatch({ uf: v })}
            editing={editing}
            placeholder={labels.uf}
            maxLength={4}
            className="text-xs tracking-[0.18em] uppercase"
            style={{ color: theme.primary }}
          />
        )}
      </div>

      {(editing || item.note) && (
        <InlineText
          as="p"
          value={item.note}
          onChange={(v) => onPatch({ note: v })}
          editing={editing}
          placeholder={labels.note}
          maxLength={160}
          styleKey={`areas.${item.id}.note`}
          className="mt-2 text-sm leading-relaxed"
          style={{ color: theme.textSecondary }}
        />
      )}
    </>
  )

  return (
    <div
      className="relative border-2 border-[#0B0B0D] p-5"
      style={{ background: theme.surface, boxShadow: `5px 5px 0 0 ${theme.background}` }}
    >
      {editing && (
        <button
          type="button"
          onClick={onRemove}
          aria-label={labels.removeItem}
          className="absolute top-3 right-3 p-1.5 opacity-60 transition-opacity hover:opacity-100"
          style={{ color: theme.textSecondary }}
        >
          <Trash2 className="h-4 w-4" />
        </button>
      )}

      {/* Em leitura o card inteiro é o link; no construtor NÃO, senão cada
          clique para editar o nome navegaria para fora da prancheta. */}
      {!editing && href ? (
        <a
          href={href}
          target={isExternalHref(href) ? "_blank" : undefined}
          rel={isExternalHref(href) ? "noopener noreferrer" : undefined}
          className="group block"
        >
          {body}
          <span
            className="mt-3 inline-flex items-center gap-1 text-xs tracking-[0.14em] uppercase"
            style={{ color: theme.primary }}
          >
            {item.name}
            <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
          </span>
        </a>
      ) : (
        body
      )}

      {editing && (
        <InlineText
          as="p"
          value={item.url}
          onChange={(v) => onPatch({ url: v })}
          editing
          placeholder={labels.url}
          maxLength={600}
          className="mt-3 border-t pt-2 text-xs"
          style={{ color: theme.textSecondary, borderColor: `${theme.textSecondary}33` }}
        />
      )}
    </div>
  )
}
