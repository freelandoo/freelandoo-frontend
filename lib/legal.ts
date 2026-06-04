/**
 * Dados jurídicos centralizados da entidade controladora.
 *
 * Os valores reais vêm de variáveis de ambiente (não hardcodar dados sensíveis
 * no código). Enquanto a qualificação completa da empresa não estiver definida,
 * usamos um texto provisório profissional — nunca placeholders crus como
 * `[RAZÃO SOCIAL]`, `[CNPJ]` ou `[ENDEREÇO]`.
 *
 * Defina em produção:
 *   NEXT_PUBLIC_LEGAL_COMPANY_NAME
 *   NEXT_PUBLIC_LEGAL_COMPANY_DOCUMENT   (CNPJ)
 *   NEXT_PUBLIC_LEGAL_COMPANY_ADDRESS
 */

const env = (v?: string) => {
  const s = (v ?? "").trim()
  return s.length > 0 ? s : null
}

/** Nome/razão social da controladora. Fallback seguro: "Freelandoo". */
export const LEGAL_COMPANY_NAME = env(process.env.NEXT_PUBLIC_LEGAL_COMPANY_NAME) || "Freelandoo"

/** CNPJ da controladora. `null` enquanto não informado. */
export const LEGAL_COMPANY_DOCUMENT = env(process.env.NEXT_PUBLIC_LEGAL_COMPANY_DOCUMENT)

/** Endereço/sede da controladora. `null` enquanto não informado. */
export const LEGAL_COMPANY_ADDRESS = env(process.env.NEXT_PUBLIC_LEGAL_COMPANY_ADDRESS)

/** Contatos oficiais (também usados nos documentos legais). */
export const LEGAL_CONTACT_EMAIL = "freelandoogroup@gmail.com"
export const LEGAL_CONTACT_WHATSAPP = "(11) 96275-7599"

/**
 * Frase de identificação do controlador para os documentos legais, montada com
 * fallback seguro: usa os dados reais quando existem e, quando faltam, um texto
 * provisório profissional — sem colchetes/placeholders.
 */
export function legalControllerLine(): string {
  let s = `O controlador dos dados pessoais tratados na plataforma é a ${LEGAL_COMPANY_NAME}`
  if (LEGAL_COMPANY_DOCUMENT) s += `, inscrita no CNPJ sob o nº ${LEGAL_COMPANY_DOCUMENT}`
  if (LEGAL_COMPANY_ADDRESS) s += `, com sede em ${LEGAL_COMPANY_ADDRESS}`
  s += "."
  if (!LEGAL_COMPANY_DOCUMENT || !LEGAL_COMPANY_ADDRESS) {
    s +=
      " Os dados completos de qualificação da empresa controladora (razão social, CNPJ e endereço) " +
      "estão em processo de formalização e podem ser solicitados a qualquer momento pelos canais oficiais de contato."
  }
  return s
}

/**
 * Qualificação curta da empresa para cláusulas de "definições" dos termos —
 * sem colchetes/placeholders. Usa os dados reais quando existirem.
 */
export function legalCompanyQualification(): string {
  let s = LEGAL_COMPANY_NAME
  if (LEGAL_COMPANY_DOCUMENT) s += `, inscrita no CNPJ sob o nº ${LEGAL_COMPANY_DOCUMENT}`
  if (LEGAL_COMPANY_ADDRESS) s += `, com sede em ${LEGAL_COMPANY_ADDRESS}`
  return s
}
