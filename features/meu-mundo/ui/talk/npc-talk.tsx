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
import { NPCS, conversationFor, npcNameKey, talkPages, type NpcId, type TalkPage } from "../../npcs"
import { PORTRAIT } from "../portraits"
import { currentSoul } from "../../soul"
import { temperSuffix } from "../../banter"
import { AetherModal, AetherButton } from "../kit/aether-modal"
import { AE, chamfer } from "../kit/aether-tokens"
import { archivo } from "../status/evo-skin"
import TEXT from "./npc-text.json"

type T = (k: string, f: string) => string
const PT: Record<string, string[]> = TEXT
/** Texto com o pt do JSON de fallback (a chave é a mesma do merge). */
export const npcTx = (t: T, key: string) => t(key, PT[key]?.[0] ?? key)

interface Ready {
  /** as falas em ordem; `you` = pensamento/resposta de quem joga (pela personalidade) */
  pages: TalkPage[]
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
      // NPC só de ambiente (nenhum passo pede talk: dele) não pede gravação ao servidor
      const [q, m] = tk ? await Promise.all([getQuest(tk), def.ambient ? Promise.resolve(null) : markQuest(tk, "talk", npc)]) : [null, null]
      if (!alive) return
      const quest = q && q.ok ? q.data.quest : null
      const cur = quest && quest.current ? quest.current : null
      const clan = q && q.ok ? q.data.clan : null
      const conv = conversationFor(npc, { chapter: quest && !quest.locked ? quest.id : null, step: cur ? cur.key : null, clan })
      // cada personalidade responde do seu jeito (sem personalidade, a conversa acaba no NPC)
      const temper = currentSoul()?.temper
      const replyKey = temper ? `npc_${npc}_${conv.id}_re_${temperSuffix(temper)}` : ""
      const pages = talkPages(npc, conv, clan, PT[replyKey] ? replyKey : null)
      setReady({ pages, far: !!(m && !m.ok && cur && cur.check === `talk:${npc}`) })
    })()
    return () => {
      alive = false
    }
  }, [npc, def.ambient])

  const close = () => {
    // a missão reconfere (a conversa pode ter cumprido o passo)
    window.dispatchEvent(new CustomEvent(QUEST_CHANGED))
    onClose()
  }
  const pages = ready ? ready.pages : []
  const at = Math.min(i, pages.length - 1)
  const page = pages[at]
  const replying = !!page?.you
  const last = !!ready && i >= pages.length - 1

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
            <div key={i} role="status" aria-live="polite">
              {/* quem fala, em cima do balão (07-falas §0.1, regra 5): o NPC ou "Você" */}
              <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.18em]" style={{ color: replying ? AE.goldSoft : AE.dim }}>
                {replying ? npcTx(t, "npcYou") : name}
              </p>
              <p className={`text-[16px] leading-snug ${replying ? "italic" : ""}`} style={{ color: replying ? AE.goldSoft : AE.text }}>
                {page ? npcTx(t, page.key) : ""}
              </p>
            </div>
          )}
          {ready && pages.length > 1 && (
            <p className="mt-2 text-[11px] font-bold uppercase tracking-[0.18em]" style={{ color: AE.dim }}>
              {at + 1}/{pages.length}
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
