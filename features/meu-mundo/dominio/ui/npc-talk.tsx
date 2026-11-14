"use client"

// features/meu-mundo/dominio/ui/npc-talk.tsx — o chefe/monstro do Domínio FALA no card
// das notificações dos personagens (pedido do Alex, 14/11: "igual a notificação dos
// personagens, a fala e a imagem na caixa de texto"). Antes era balão 3D sobre a
// cabeça + botão "Vença os setores antes deste" + aviso amarelo no alto.
//
// Uma fala por vez (TALK_EACH), em sequência; retrato da criatura do setor (raiva,
// recorte que sai da moldura quando existe). Só apresentação, não bloqueia o toque.

import { useEffect, useState } from "react"
import type { BodyId } from "../../types"
import type { MobKind } from "../../laminas/sim/fight"
import type { DomainInfo } from "../../data"
import { emotionArt, WOLF_PORTRAIT } from "../../ui/portraits"
import { EmotionFrame } from "../../ui/inbox/emotion-frame"
import { archivo } from "../../ui/status/evo-skin"

/** Tempo de cada fala (o mesmo do balão antigo). */
export const TALK_EACH = 4200

export interface NpcSay {
  id: number
  name: string
  art: { src: string; cutout: boolean } | null
  lines: string[]
}

/** O corpo que desenha cada tipo de monstro (setor sem criatura da lore). */
const KIND_BODY: Record<MobKind, BodyId | null> = {
  cavaleiro: "cavaleiro",
  stone: "golem",
  ciborgue: "ciborgue",
  garras: "garras",
  brute: "brutamontes",
  wolf: null,
}

/** O retrato de quem guarda o setor `n` (a criatura da lore; senão o tipo do monstro). */
export function speakerArt(info: DomainInfo | null, n: number): NpcSay["art"] {
  const s = info?.sectors[n - 1]
  if (!s) return null
  const body = s.foe?.body ?? KIND_BODY[s.kind]
  if (body) return emotionArt(body, "angry")
  return s.kind === "wolf" ? { src: WOLF_PORTRAIT, cutout: false } : null
}

export function NpcTalk({ say, closeLabel, onDone }: { say: NpcSay | null; closeLabel: string; onDone: () => void }) {
  const [i, setI] = useState(0)
  useEffect(() => setI(0), [say?.id])
  useEffect(() => {
    if (!say) return
    if (i >= say.lines.length) {
      onDone()
      return
    }
    const h = setTimeout(() => setI((n) => n + 1), TALK_EACH)
    return () => clearTimeout(h)
  }, [say, i, onDone])

  if (!say || i >= say.lines.length) return null
  return (
    // logo abaixo dos pés (a câmera do Domínio deixa a pessoa no meio da tela), um card por vez
    <div className={`${archivo.className} pointer-events-none absolute inset-x-0 z-30 flex justify-center px-2`} style={{ top: "60%" }} role="status" aria-live="polite">
      <div className="max-[759px]:scale-[0.82]" style={{ transformOrigin: "top center" }}>
        <EmotionFrame key={`${say.id}:${i}`} message={say.lines[i]} extra={`— ${say.name}`} art={say.art} timerMs={TALK_EACH} closeLabel={closeLabel} onClose={onDone} />
      </div>
    </div>
  )
}
