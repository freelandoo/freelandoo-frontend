"use client"

// features/meu-mundo/ui/hud/city-dock.tsx — o canto de baixo à direita da cidade
// (apresentação 12): a fileira de ATALHOS (Loja, Mochila) e, uma fileira acima, a
// AÇÃO DO MOMENTO — o botão principal da tela, maior; quando a ação é uma luta ele
// vira rubi, cresce e pulsa. Legenda de 11 px embaixo de cada um, sem placa.
// Mora DENTRO da cena (bairro, centro, casa): é ela que sabe quando há ficha,
// conversa ou gaveta aberta. Os atalhos saem dos portões que a casca já manda
// (`menuExtras`): nenhuma porta nova, só um toque a menos.

import type { ReactNode } from "react"
import { archivo } from "../status/evo-skin"
import type { DrawerItem } from "./hud-kit"
import c from "./city-dock.module.css"

export interface DockKey {
  id: string
  label: string
  icon: ReactNode
  onSelect: () => void
  /** "main" = a ação do momento; "fight" = a ação é uma luta; sem tom = atalho/secundária. */
  tone?: "main" | "fight"
  /** Bolinha de novidade. */
  dot?: boolean
}

/** Os portões que viram atalho, na ordem da tela (o mais usado no canto). */
const SHORTCUTS = ["shop", "bag"] as const

export function dockShortcuts(extras: DrawerItem[] | undefined): DockKey[] {
  const out: DockKey[] = []
  for (const id of SHORTCUTS) {
    const it = extras?.find((x) => x.id === id)
    if (it && !it.disabled) out.push({ id: it.id, label: it.label, icon: it.icon, onSelect: it.onSelect, dot: !!it.badge })
  }
  return out
}

function Key({ k }: { k: DockKey }) {
  return (
    <button type="button" className={c.key} data-tone={k.tone} onPointerDown={(e) => e.stopPropagation()} onClick={k.onSelect} aria-label={k.label}>
      <span className={c.wrap}>
        {k.tone === "fight" && <span className={c.pulse} aria-hidden />}
        <span className={c.face}>{k.icon}</span>
        {k.dot && <span className={c.dot} aria-hidden />}
      </span>
      <span className={c.cap}>{k.label}</span>
    </button>
  )
}

export function CityDock({ shortcuts = [], main = null, second = null }: { shortcuts?: DockKey[]; main?: DockKey | null; second?: DockKey | null }) {
  if (!shortcuts.length && !main && !second) return null
  return (
    <div className={`${c.dock} ${archivo.className}`}>
      {(main || second) && (
        <div className={c.row} data-acts="">
          {second && <Key k={second} />}
          {main && <Key k={{ ...main, tone: main.tone ?? "main" }} />}
        </div>
      )}
      {shortcuts.length > 0 && (
        <div className={c.row}>
          {shortcuts.map((k) => (
            <Key key={k.id} k={k} />
          ))}
        </div>
      )}
    </div>
  )
}
