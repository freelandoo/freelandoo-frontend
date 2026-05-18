// lib/i18n/index.ts
// Re-exports neutros (browser + server). Para helpers server-only, importe de
// "@/lib/i18n/server"; para server actions, de "@/lib/i18n/actions".

export * from "./config"
export { getMessages, MESSAGES, type MessageDict } from "./messages"
