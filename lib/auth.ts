"use client"

const TOKEN_KEY = "token"
const USER_KEY = "user"

export interface AuthUser {
  id_user: string
  nome: string
  email: string
  avatar?: string | null
  is_admin?: boolean
  roles?: { id_role: string; desc_role: string }[]
  /** false = ainda não viu o tour de boas-vindas (mostrar /bem-vindo no 1º acesso). */
  onboarding_tour_done?: boolean
}

type AuthResponse = Record<string, unknown>

export function extractAuthSession(data: AuthResponse): {
  token: string
  user: AuthUser
  emailVerified: boolean | null
  needsTerms: boolean
  termsVersion: number | null
  showTour: boolean
} | null {
  const token =
    typeof data.token === "string"
      ? data.token
      : typeof data.access_token === "string"
        ? data.access_token
        : typeof data.accessToken === "string"
          ? data.accessToken
          : typeof data.jwt === "string"
            ? data.jwt
            : null

  const rawUser = data.user || data.usuario || data.profile
  if (!token || !rawUser || typeof rawUser !== "object") return null

  const user = rawUser as AuthUser & { email_verified?: unknown }
  const responseEmailVerified =
    typeof data.email_verified === "boolean" ? data.email_verified : null
  const userEmailVerified =
    typeof user.email_verified === "boolean" ? user.email_verified : null

  return {
    token,
    user,
    emailVerified: responseEmailVerified ?? userEmailVerified,
    // Aceite dos Termos pendente (ex.: cadastro novo via Google, ou bump de versão).
    needsTerms: data.needs_terms === true,
    termsVersion:
      typeof data.terms_version === "number" ? data.terms_version : null,
    // Decisão de mostrar o tour vem do backend (respeita a config admin:
    // ligado/audiência/modo). Fallback: nunca mostrar se ausente.
    showTour: data.show_tour === true,
  }
}

export function getToken(): string | null {
  if (typeof window === "undefined") return null
  return localStorage.getItem(TOKEN_KEY)
}

export function getStoredUser(): AuthUser | null {
  if (typeof window === "undefined") return null
  const raw = localStorage.getItem(USER_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as AuthUser
  } catch {
    return null
  }
}

export function setSession(token: string, user: AuthUser) {
  if (typeof window === "undefined") return
  localStorage.setItem(TOKEN_KEY, token)
  localStorage.setItem(USER_KEY, JSON.stringify(user))
  dispatchAuthChanged()
}

export function completeAuthRedirect(target: string) {
  if (typeof window === "undefined") return
  const destination = new URL(target, window.location.origin).toString()
  window.location.replace(destination)
  window.setTimeout(() => {
    if (window.location.href !== destination) {
      window.location.href = destination
    }
  }, 250)
}

export function setStoredUser(user: AuthUser) {
  if (typeof window === "undefined") return
  localStorage.setItem(USER_KEY, JSON.stringify(user))
  dispatchAuthChanged()
}

export function clearSession() {
  if (typeof window === "undefined") return
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
  dispatchAuthChanged()
}

export function dispatchAuthChanged() {
  if (typeof window === "undefined") return
  window.dispatchEvent(new Event("auth:changed"))
}

const PROTECTED_PREFIXES = [
  "/account",
  "/admin",
  "/administracao",
  "/pagamentos",
  "/checkout",
]

export function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + "/"))
}
