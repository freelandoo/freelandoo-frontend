// lib/i18n/messages.ts
// Carregamento estático dos arquivos de tradução. Bundled junto com o app
// (sem fetch em runtime). Para um novo idioma, importe aqui e adicione ao
// MESSAGES.

import ptBR from "@/messages/pt-BR.json"
import en from "@/messages/en.json"
import es from "@/messages/es.json"
import { DEFAULT_LOCALE, type Locale } from "./config"

export type MessageDict = Record<string, Record<string, string>>

export const MESSAGES: Record<Locale, MessageDict> = {
  "pt-BR": ptBR as MessageDict,
  en: en as MessageDict,
  es: es as MessageDict,
}

export function getMessages(locale: Locale): MessageDict {
  return MESSAGES[locale] ?? MESSAGES[DEFAULT_LOCALE]
}
