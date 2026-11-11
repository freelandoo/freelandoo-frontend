"use client"

// features/meu-mundo/ui/hud/drawer-gates.tsx — a gaveta em 5 PORTÕES (apresentação 02,
// decisão D6): Personagem · Mochila · Loja · Ranking · Ajustes.
//
// Regra: o que se usa toda sessão é portão; o que se usa uma vez vai para Ajustes; o que
// já tem ícone na barra de cima (Chat, Correio, avisos) não se repete na gaveta.
// As três cenas (bairro, centro, casa) montam a gaveta por aqui, com os itens DELAS:
//   here   = o que é deste lugar (Ir ao centro, Voltar para casa, Sair da casa, Convidar,
//            Recuperar, Casa) — entra no topo de Ajustes
//   system = Câmera, Controles, Gráficos, Técnico, Reconectar, Sair do jogo — no fim
// A casca (`meu-mundo-shell.tsx`) manda os portões comuns em `extras` pelo id:
//   "bag" (Mochila), "shop" (Loja), "ranking" → portões; o resto (Compartilhar, Idioma)
//   entra em Ajustes, entre `here` e `system`.

import { Settings, UserRound } from "lucide-react"
import type { DrawerItem } from "./hud-kit"

type Tr = (key: string, fallback: string) => string

/** Ids da casca que viram portão (na ordem da gaveta). */
const GATE_IDS = ["bag", "shop", "ranking"] as const

/** O que cada cena manda para a gaveta (ver o topo do arquivo). */
export interface DrawerGates {
  status?: () => void
  extras?: DrawerItem[]
  here?: DrawerItem[]
  system?: DrawerItem[]
}

export function drawerGates(t: Tr, { status, extras = [], here = [], system = [] }: DrawerGates): DrawerItem[] {
  const gates: DrawerItem[] = []
  if (status)
    gates.push({
      id: "status",
      label: t("menuCharacter", "Personagem"),
      hint: t("menuCharacterHint", "Ficha, alma, rotina e registro"),
      icon: <UserRound className="h-5 w-5" />,
      kind: "nav",
      onSelect: status,
    })
  for (const id of GATE_IDS) {
    const it = extras.find((x) => x.id === id)
    if (it) gates.push(it)
  }
  const rest = extras.filter((x) => !(GATE_IDS as readonly string[]).includes(x.id))
  const settings = [...here, ...rest, ...system]
  if (settings.length)
    gates.push({
      id: "settings",
      label: t("menuSettings", "Ajustes"),
      hint: t("menuSettingsHint", "Idioma, gráficos, convidar e sair"),
      icon: <Settings className="h-5 w-5" />,
      kind: "nav",
      // um aviso dentro de Ajustes (ex.: Reconectar) acende o portão
      badge: settings.find((x) => x.badge)?.badge,
      onSelect: () => {},
      children: settings,
    })
  return gates
}
