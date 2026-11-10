"use client"

// features/meu-mundo/ui/talk/npc-talk.tsx — lore v2 F4: a conversa com um NPC.
//
// Retrato + nome + as falas em sequência ("Continuar" → "Encerrar"). A conversa
// do momento sai do passo do capítulo (npcs.ts) e a variante da classe de quem
// ouve. Abrir a conversa pede ao servidor para gravar talk:<npc>; ele só grava se
// a ÚLTIMA visita da pessoa foi ao lugar do NPC (a sala grava a visita). O que o
// aparelho mostra não decide nada. Molduras do kit (AetherModal); sem identidade nova.

import { useEffect, useState } from "react"
import { Loader2 } from "lucide-react"
import { getToken } from "@/lib/auth"
import { useTranslations } from "@/components/i18n/I18nProvider"
import { QUEST_CHANGED, getQuest, markQuest } from "../../data"
import { NPCS, conversationFor, lineKeys, npcNameKey, type NpcId } from "../../npcs"
import { PORTRAIT } from "../portraits"
import { AetherModal, AetherButton } from "../kit/aether-modal"
import { AE, chamfer } from "../kit/aether-tokens"
import { archivo } from "../status/evo-skin"
import TEXT from "./npc-text.json"

type T = (k: string, f: string) => string
const PT: Record<string, string[]> = TEXT
/** Texto com o pt do JSON de fallback (a chave é a mesma do merge). */
export const npcTx = (t: T, key: string) => t(key, PT[key]?.[0] ?? key)

interface Ready {
  lines: string[]
  /** o passo de agora pede esta conversa e o servidor não gravou (longe) */
  far: boolean
}

export function NpcTalk({ npc, onClose }: { npc: NpcId; onClose: () => void }) {
  const t = useTranslations("MeuMundo") as T
  const [ready, setReady] = useState<Ready | null>(null)
  const [i, setI] = useState(0)
  const def = NPCS[npc]
  const name = npcTx(t, npcNameKey(npc))

  useEffect(() => {
    let alive = true
    const tk = getToken()
    void (async () => {
      const [q, m] = tk ? await Promise.all([getQuest(tk), markQuest(tk, "talk", npc)]) : [null, null]
      if (!alive) return
      const quest = q && q.ok ? q.data.quest : null
      const cur = quest && quest.current ? quest.current : null
      const conv = conversationFor(npc, { chapter: quest && !quest.locked ? quest.id : null, step: cur ? cur.key : null })
      const lines = lineKeys(npc, conv, q && q.ok ? q.data.clan : null)
      setReady({ lines, far: !!(m && !m.ok && cur && cur.check === `talk:${npc}`) })
    })()
    return () => {
      alive = false
    }
  }, [npc])

  const close = () => {
    // a missão reconfere (a conversa pode ter cumprido o passo)
    window.dispatchEvent(new CustomEvent(QUEST_CHANGED))
    onClose()
  }
  const last = !!ready && i >= ready.lines.length - 1

  return (
    <AetherModal eyebrow={npcTx(t, "npcTalk")} title={name} onClose={close} width={520} z={90}>
      <div className={`${archivo.className} flex items-start gap-3`}>
        {/* retrato 4:5 do corpo do NPC (sem arte nova) */}
        {/* eslint-disable-next-line @next/next/no-img-element -- retrato estático do jogo, como o resto da HUD */}
        <img
          src={PORTRAIT[def.body]}
          alt=""
          width={88}
          height={110}
          className="h-[110px] w-[88px] shrink-0 object-cover"
          style={{ clipPath: chamfer(AE.cut.chip), boxShadow: `inset 0 0 0 1px ${AE.brassLine}`, background: AE.well }}
        />
        <div className="min-h-[110px] min-w-0 flex-1">
          {!ready ? (
            <Loader2 className="mt-6 h-6 w-6 animate-spin" style={{ color: AE.goldSoft }} aria-label={npcTx(t, "npcTalk")} />
          ) : (
            <p key={i} role="status" aria-live="polite" className="text-[16px] leading-snug" style={{ color: AE.text }}>
              {npcTx(t, ready.lines[Math.min(i, ready.lines.length - 1)])}
            </p>
          )}
          {ready && ready.lines.length > 1 && (
            <p className="mt-2 text-[11px] font-bold uppercase tracking-[0.18em]" style={{ color: AE.dim }}>
              {Math.min(i, ready.lines.length - 1) + 1}/{ready.lines.length}
            </p>
          )}
          {ready && ready.far && (
            <p className="mt-2 text-[12px] font-semibold" style={{ color: AE.goldSoft }}>
              {npcTx(t, "npcFar")}
            </p>
          )}
        </div>
      </div>
      <div className="mt-4 flex justify-end">
        <AetherButton disabled={!ready} onClick={() => (last ? close() : setI((n) => n + 1))}>
          {last ? npcTx(t, "npcEnd") : npcTx(t, "npcNext")}
        </AetherButton>
      </div>
    </AetherModal>
  )
}
