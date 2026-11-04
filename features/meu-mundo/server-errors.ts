// features/meu-mundo/server-errors.ts — erro do servidor no idioma de quem joga.
//
// O servidor responde em português. Toda resposta passa por `serverErrorText`
// em data.ts, então a tela recebe o texto já traduzido e nenhum ponto novo
// precisa lembrar disso. A chave do dicionário é o próprio texto do servidor
// (namespace MeuMundoServer): texto sem entrada sai como veio.
// `node scripts/check-mm-server-errors.js` lista o que faltar.

import { useEffect } from "react"
import { useI18n } from "@/components/i18n/I18nProvider"

type Dict = Record<string, string>

const GENERIC = "Não deu certo agora. Tente de novo."
const LEVEL = /^Nível deve ser um número de 1 a (\d+)$/

let dict: Dict = {}

export function bindServerErrors(next: Dict | undefined) {
  dict = next ?? {}
}

/** "network" passa direto: quem chama decide pelo `status === 0`. */
export function serverErrorText(raw: string): string {
  if (/^http \d+$/.test(raw)) return dict[GENERIC] ?? GENERIC
  const level = LEVEL.exec(raw)
  if (level) {
    const text = dict["Nível deve ser um número de 1 a {n}"]
    return text ? text.replace("{n}", level[1]) : raw
  }
  return dict[raw] ?? raw
}

/** Fica na raiz da página do jogo: a escolha de classe abre fora da casca. */
export function useServerErrors() {
  const { messages } = useI18n()
  useEffect(() => bindServerErrors(messages.MeuMundoServer), [messages])
}
