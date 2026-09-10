/**
 * As iniciais de um nome — o que se desenha no lugar da foto que não existe.
 *
 * ⚠️ PEÇA ÚNICA, e ela virou uma quando a SEGUNDA superfície precisou dela.
 * Nasceu dentro do `wallet-ui` servindo só a Carteira; a plataforma de games
 * mostrava um boneco cinza genérico no mesmo buraco, e as duas telas têm a
 * MESMA silhueta de propósito (mesma proporção, mesma largura, mesma pilha de
 * pills). Copiada, a segunda cópia divergiria da primeira no dia em que uma
 * das duas mudasse — que é como a Carteira e games já tinham acabado com duas
 * fontes diferentes para a mesma foto.
 *
 * O `wallet-ui` re-exporta daqui para não quebrar quem já importava de lá.
 */
export function initialsOf(name?: string | null) {
  return (
    String(name || "")
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((w) => w[0] || "")
      .join("")
      .toUpperCase() || "?"
  )
}
