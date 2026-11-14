// lib/json-ld.ts — Segurança A4 (XSS): JSON dentro de <script type="application/ld+json">.
//
// `JSON.stringify` NÃO escapa `<`: um nome ou bio de perfil com `</script><script>…` fechava a tag
// do JSON-LD e o resto virava script de verdade na página pública (XSS armazenado). Aqui `<`, `>`,
// `&` e os separadores de linha U+2028/U+2029 saem como escape Unicode — o JSON continua o mesmo
// para quem lê (buscador), mas o HTML não acha mais nenhuma tag dentro dele.
// Todo `dangerouslySetInnerHTML` com JSON passa por aqui (scripts/check-raw-html.js confere no lint).
export function safeJsonLd(data: unknown): string {
  return (JSON.stringify(data ?? null) ?? "null")
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .split(String.fromCharCode(0x2028)).join("\\u2028")
    .split(String.fromCharCode(0x2029)).join("\\u2029")
}
