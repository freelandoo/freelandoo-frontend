/**
 * Os tipos da prospecção (mig 254) e o CSV.
 *
 * Mora fora do componente porque a exportação é lida em dois lugares (a busca e
 * a lista salva) e porque um `Company` copiado divergiria do que o backend
 * projeta na primeira coluna nova — e a divergência apareceria como coluna
 * vazia no CSV do cliente, não como erro de build.
 */

export type Company = {
  id_company: string
  cnpj: string | null
  legal_name: string | null
  trade_name: string | null
  display_name: string
  description: string | null
  category_key: string | null
  main_cnae: string | null
  company_size: string | null
  share_capital_cents: number | null
  opened_at: string | null
  reg_status: string | null
  is_headquarters: boolean | null
  website: string | null
  domain: string | null
  email: string | null
  phone: string | null
  whatsapp: string | null
  instagram: string | null
  facebook: string | null
  linkedin: string | null
  address: string | null
  address_number: string | null
  neighborhood: string | null
  city: string | null
  uf: string | null
  zip_code: string | null
  latitude: string | number | null
  longitude: string | number | null
  confidence: number
  enrichment_status: string
  enriched_at: string | null
  distance_m?: number | null
  in_lists?: string[]
  /** Só na leitura de uma lista salva. */
  stage?: string
  lead_note?: string | null
}

export type CompanySource = {
  field: string
  value: string | null
  source: string
  source_url: string | null
  confidence: number
  last_seen_at: string
}

export type LeadList = {
  id_list: string
  name: string
  note: string | null
  total?: number
}

export type Job = {
  id_job: number
  kind: string
  status: string
  payload: { category?: string; uf?: string; city?: string } | null
  result: Record<string, unknown> | null
  skip_reason: string | null
  created_at: string
}

export type Catalog = {
  categories: { key: string; label: string }[]
  providers: { source: string; label: string; configured: boolean }[]
  limits: { daily_discover: number; daily_enrich: number }
  costs: { enrich_polens: number; export_polens: number }
  stages: string[]
}

export const UFS = [
  "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB",
  "PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO",
] as const

/**
 * Telefone brasileiro legível. O backend guarda só dígitos (é a chave de
 * matching); quem formata é a tela, porque a máscara é apresentação.
 */
export function fmtPhone(raw: string | null): string {
  if (!raw) return ""
  const d = raw.replace(/\D/g, "")
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  return raw
}

export function fmtCnpj(raw: string | null): string {
  if (!raw) return ""
  const d = raw.replace(/\D/g, "")
  if (d.length !== 14) return raw
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`
}

/**
 * As colunas do CSV.
 *
 * ⚠️ A EXPORTAÇÃO É MONTADA NO NAVEGADOR, de propósito: o proxy catch-all das
 * comunidades devolve `Response.json`, então um CSV vindo do backend chegaria
 * embrulhado em JSON. Montá-lo aqui, sobre as MESMAS linhas que a tela está
 * mostrando, também garante que o arquivo tenha exatamente o que a pessoa vê —
 * uma segunda consulta no servidor poderia exportar um conjunto diferente do
 * que está na tela.
 */
export const CSV_COLUMNS = [
  "display_name", "legal_name", "cnpj", "category_key", "main_cnae",
  "phone", "whatsapp", "email", "website", "instagram",
  "address", "address_number", "neighborhood", "city", "uf", "zip_code",
  "company_size", "reg_status", "opened_at", "share_capital_cents",
  "confidence", "stage",
] as const

/** Escapa um valor para CSV. Sem isto, uma vírgula na razão social corta a linha. */
function csvCell(value: unknown): string {
  if (value === null || value === undefined) return ""
  const s = String(value)
  // ⚠️ O `=` NA FRENTE É DEFESA CONTRA CSV INJECTION: uma razão social que
  // começa com `=`, `+`, `-` ou `@` vira FÓRMULA quando o arquivo é aberto no
  // Excel. O apóstrofo à frente a mantém texto.
  const safe = /^[=+\-@]/.test(s) ? `'${s}` : s
  return /[",;\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe
}

export function buildCsv(rows: Company[], columns: readonly string[] = CSV_COLUMNS): string {
  const head = columns.join(";")
  const body = rows
    .map((r) => columns.map((c) => csvCell((r as unknown as Record<string, unknown>)[c])).join(";"))
    .join("\n")
  // ⚠️ BOM NA FRENTE. Sem ele o Excel em português abre o arquivo em ANSI e
  // toda empresa com acento no nome aparece com caractere quebrado — que é
  // como um export "funciona" e mesmo assim é inútil.
  return `﻿${head}\n${body}\n`
}

export function downloadCsv(filename: string, csv: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
