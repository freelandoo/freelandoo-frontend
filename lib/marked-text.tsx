import { Fragment, type ReactNode } from "react"
import { YellowHighlight } from "@/components/home/landing/primitives"

/**
 * Converte `*trecho*` em destaque amarelo (YellowHighlight) e mantém o resto como
 * texto normal. Usado pelo EditableText — vale tanto pro fallback quanto pro texto
 * salvo pelo admin.
 */
export function renderMarkedText(input: string, mark = true): ReactNode {
  const parts = input.split(/(\*[^*]+\*)/g)
  return parts.map((part, i) => {
    if (part.length > 2 && part.startsWith("*") && part.endsWith("*")) {
      return (
        <YellowHighlight key={i} mark={mark}>
          {part.slice(1, -1)}
        </YellowHighlight>
      )
    }
    return <Fragment key={i}>{part}</Fragment>
  })
}
