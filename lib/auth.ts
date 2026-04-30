"use client"

const TOKEN_KEY = "token"
const USER_KEY = "user"

export interface AuthUser {
  id_user: string
  nome: string
  email: string
  is_admin?: boolean
  roles?: { id_role: string; desc_role: string }[]
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
