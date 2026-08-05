/**
 * Identificador local do visitante, usado para atribuir conteúdo compartilhado
 * a quem ainda não fez login (mig 194).
 *
 * Vive em localStorage — ao contrário do cupom de sessão, sobrevive a fechar a
 * aba. No login o backend casa este token com a conta.
 */

const KEY = "freelandoo:visitor-token"

export function getVisitorToken(): string | null {
  if (typeof window === "undefined") return null
  try {
    return localStorage.getItem(KEY)
  } catch {
    return null
  }
}

/** Devolve o token existente ou cria um novo (32 hex). */
export function ensureVisitorToken(): string | null {
  if (typeof window === "undefined") return null
  try {
    const existing = localStorage.getItem(KEY)
    if (existing) return existing
    const bytes = new Uint8Array(16)
    crypto.getRandomValues(bytes)
    const token = Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("")
    localStorage.setItem(KEY, token)
    return token
  } catch {
    // Modo privado / quota: sem token o visitante deslogado não é atribuído,
    // mas nada quebra.
    return null
  }
}
