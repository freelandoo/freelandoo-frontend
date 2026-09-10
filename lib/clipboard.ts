/**
 * Copiar texto com o fallback antigo: `navigator.clipboard` não existe fora de
 * HTTPS (nem em alguns WebViews), e o `execCommand("copy")` ainda funciona lá.
 * Devolve `false` quando nenhum dos dois caminhos deu certo — quem chama
 * decide o que dizer; aqui nada é mostrado.
 */
export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    try {
      const el = document.createElement("textarea")
      el.value = text
      el.style.position = "fixed"
      el.style.opacity = "0"
      document.body.appendChild(el)
      el.select()
      const ok = document.execCommand("copy")
      document.body.removeChild(el)
      return ok
    } catch {
      return false
    }
  }
}
