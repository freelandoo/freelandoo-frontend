/**
 * Slugify para URLs SEO. Remove acentos, lower, troca não-alfanum por hífen,
 * colapsa hífens, faz trim. Usado para `city_slug` (gerado on-the-fly do
 * `municipio` do IBGE) e para validar canonicidade da URL recebida.
 */
const COMBINING_MARKS = /[̀-ͯ]/g

export function slugify(input: string | null | undefined): string {
  if (!input) return ""
  return input
    .normalize("NFD")
    .replace(COMBINING_MARKS, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
}

/** Remove o `@` inicial (case-insensitive). */
export function stripHandlePrefix(handle: string | null | undefined): string {
  if (!handle) return ""
  return handle.replace(/^@/, "")
}

/** Garante o `@` inicial. */
export function withHandlePrefix(handle: string | null | undefined): string {
  if (!handle) return ""
  return handle.startsWith("@") ? handle : `@${handle}`
}

/** Monta a URL canônica de um perfil. */
export function buildProfileUrl(args: {
  profession_slug: string
  municipio: string | null | undefined
  handle: string
}): string {
  const city = slugify(args.municipio) || "brasil"
  return `/${args.profession_slug}/${city}/${withHandlePrefix(args.handle)}`
}
