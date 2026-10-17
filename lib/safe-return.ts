/**
 * Destino de retorno pós-login (`?next=`). Fonte ÚNICA da validação — antes
 * cada página tinha a sua (`startsWith("/") && !startsWith("//")`), que deixava
 * passar `/\evil.com` (o navegador trata a barra invertida como barra e vira
 * um endereço de outro site) e variantes codificadas.
 *
 * Aceita só caminho da MESMA origem. Recusa:
 *   - URL absoluta, `//host`, `/\host`, `javascript:` e afins;
 *   - barra invertida e caracteres de controle, também depois de decodificar;
 *   - credencial em parâmetro (`token`, `access_token`, `jwt`, `password`...);
 *   - texto longo demais.
 */
const MAX_LEN = 512
const CREDENTIAL_PARAMS = /^(token|access_token|accesstoken|jwt|id_token|password|senha|secret)$/i

function hasBadChars(s: string): boolean {
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i)
    if (c < 0x20 || c === 0x7f || c === 0x5c) return true // controle ou "\"
  }
  return false
}

export function safeInternalPath(raw: string | null | undefined): string | null {
  if (typeof raw !== "string" || !raw || raw.length > MAX_LEN) return null
  if (!raw.startsWith("/") || raw.startsWith("//")) return null
  let decoded = raw
  try {
    decoded = decodeURIComponent(raw)
  } catch {
    return null
  }
  if (hasBadChars(raw) || hasBadChars(decoded) || decoded.startsWith("//")) return null
  let url: URL
  try {
    url = new URL(raw, "https://freelandoo.invalid")
  } catch {
    return null
  }
  if (url.origin !== "https://freelandoo.invalid") return null
  for (const key of url.searchParams.keys()) {
    if (CREDENTIAL_PARAMS.test(key)) return null
  }
  return `${url.pathname}${url.search}${url.hash}`
}

/**
 * Caminhos que NÃO são páginas deste app Next (são servidos por rewrite, como
 * a Freelandoo Arena em /arena). Navegação do roteador do Next não chega lá:
 * precisa de navegação de documento inteiro.
 */
export function isOutsideNextApp(path: string): boolean {
  return path === "/arena" || path.startsWith("/arena/") || path.startsWith("/arena?")
}
