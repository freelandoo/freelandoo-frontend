// lib/i18n/index.ts
// Re-exports neutros (browser + server). Locale/país são resolvidos no CLIENTE
// pelo I18nProvider (cookie lido pós-mount) — NÃO criar helpers server que leem
// cookies(): isso força renderização dinâmica em todas as rotas (ver F3.S5).

export * from "./config"
export { type MessageDict } from "./messages"
