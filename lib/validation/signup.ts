// Validações de cadastro espelhando as do backend (src/utils/validateSignup.js).

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function isValidEmail(email: string): boolean {
  return EMAIL_RE.test((email || "").trim())
}

export function calculateAge(birthDate: string): number | null {
  if (!birthDate) return null
  const d = new Date(birthDate)
  if (Number.isNaN(d.getTime())) return null
  const today = new Date()
  let age = today.getFullYear() - d.getFullYear()
  const m = today.getMonth() - d.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < d.getDate())) age--
  return age
}

export function isAdult(birthDate: string): boolean {
  const age = calculateAge(birthDate)
  return age != null && age >= 18
}

export interface PasswordChecks {
  min_length: boolean
  uppercase: boolean
  number: boolean
  special_character: boolean
}

export function checkPassword(password: string): PasswordChecks {
  const p = password || ""
  return {
    min_length: p.length >= 8,
    uppercase: /[A-Z]/.test(p),
    number: /[0-9]/.test(p),
    special_character: /[^A-Za-z0-9]/.test(p),
  }
}

export function isPasswordStrong(password: string): boolean {
  const c = checkPassword(password)
  return c.min_length && c.uppercase && c.number && c.special_character
}
