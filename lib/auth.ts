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
}

type AuthResponse = Record<string, unknown>

export function extractAuthSession(data: AuthResponse): {
  token: string
  user: AuthUser
  emailVerified: boolean | null
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
