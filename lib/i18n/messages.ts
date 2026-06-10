// lib/i18n/messages.ts
// Tipo dos dicionários de tradução. Os JSONs de messages/ são carregados por
// import() dinâmico no I18nProvider (chunk lazy por locale) — NÃO importar os
// JSONs estaticamente aqui: isso embutiria ~150KB no bundle compartilhado.

export type MessageDict = Record<string, Record<string, string>>
