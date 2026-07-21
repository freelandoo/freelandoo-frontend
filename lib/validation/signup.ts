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

// ── CPF ──────────────────────────────────────────────────────────────────────
// Espelha src/utils/documents.js (isValidCPF). Feedback imediato no formulário;
// a decisão continua sendo do backend, que revalida e checa duplicidade.
// O número do CPF NÃO carrega data de nascimento — a idade vem sempre do campo
// de nascimento, nunca daqui.

export function onlyDigits(value: string): string {
  return (value || "").replace(/\D/g, "")
}

export function isValidCPF(value: string): boolean {
  const cpf = onlyDigits(value)
  if (cpf.length !== 11) return false
  if (/^(\d)\1{10}$/.test(cpf)) return false // 000..., 111... passam no cálculo

  const calcDigit = (sliceLen: number): number => {
    let sum = 0
    for (let i = 0; i < sliceLen; i++) {
      sum += Number(cpf[i]) * (sliceLen + 1 - i)
    }
    const rest = (sum * 10) % 11
    return rest === 10 ? 0 : rest
  }

  return calcDigit(9) === Number(cpf[9]) && calcDigit(10) === Number(cpf[10])
}

// Máscara progressiva para digitação: 123.456.789-01
export function formatCPF(value: string): string {
  const d = onlyDigits(value).slice(0, 11)
  if (d.length <= 3) return d
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`
}
