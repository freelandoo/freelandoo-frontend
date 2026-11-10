// features/meu-mundo/npcs.ts — lore v2 F4: quem conversa e o que diz.
//
// O servidor só sabe QUEM existe e ONDE a conversa vale (meuMundoPlaces.js no
// back: talk:<npc> exige a última visita no lugar do NPC). Aqui mora a
// apresentação: corpo (de classe ou dos NPCs de prédio, sem modelo novo),
// retrato e as conversas, escolhidas pelo passo do capítulo em que a pessoa está.
// Texto: ui/talk/npc-text.json ([pt, en, es]; scripts/i18n-meu-mundo-npcs-merge.js).
// Fala 18+ conta o fato sem detalhar sangue; variante por classe = chave
// separada (`_raposa` / `_vampiro`), nunca `if` com texto no componente.

import type { BodyId } from "./types"

export type NpcId = "nivea" | "delegado" | "raposa_velha" | "vampiro_velho"

/** Onde a pessoa está na história quando abre a conversa. */
export interface TalkMoment {
  chapter: string | null
  step: string | null
}

export interface NpcLine {
  /** chave sem o prefixo `npc_<npc>_` */
  key: string
  /** a fala muda com a classe de quem ouve (chave + `_raposa` / `_vampiro`) */
  byClan?: boolean
}

export interface NpcConversation {
  id: string
  /** sem `when` = a conversa de sempre (a última da lista) */
  when?: (m: TalkMoment) => boolean
  lines: NpcLine[]
}

export interface NpcDef {
  body: BodyId
  look: string
  conversations: NpcConversation[]
}

const at = (chapter: string, ...steps: string[]) => (m: TalkMoment) => m.chapter === chapter && (!steps.length || (m.step !== null && steps.includes(m.step)))

export const NPCS: Record<NpcId, NpcDef> = {
  // Raposa de jaleco, pelo ruivo com mechas de geada (cap. 1): corpo de Raposa adulta
  nivea: {
    body: "raposa_adulta",
    look: "",
    conversations: [
      { id: "despertar", when: at("cap1", "degelo", "sol_ou_lua"), lines: [{ key: "despertar_1" }, { key: "despertar_2" }] },
      { id: "classe", when: at("cap1", "fome", "praca", "pedra"), lines: [{ key: "classe_1", byClan: true }] },
      { id: "retorno", when: at("cap1", "retorno"), lines: [{ key: "retorno_1" }, { key: "retorno_2" }] },
      { id: "sempre", lines: [{ key: "sempre_1" }] },
    ],
  },
  delegado: {
    body: "strong",
    look: "4210",
    conversations: [{ id: "tregua", lines: [{ key: "tregua_1" }, { key: "tregua_2" }, { key: "tregua_3" }] }],
  },
  raposa_velha: {
    body: "raposa_adulto",
    look: "",
    conversations: [{ id: "pedra", lines: [{ key: "pedra_1", byClan: true }] }],
  },
  vampiro_velho: {
    body: "vampiro_adulto",
    look: "",
    conversations: [{ id: "pedra", lines: [{ key: "pedra_1", byClan: true }] }],
  },
}

export const isNpcId = (id: string): id is NpcId => Object.prototype.hasOwnProperty.call(NPCS, id)

/** A conversa do momento: a primeira cujo `when` vale; senão a de sempre. */
export function conversationFor(npc: NpcId, m: TalkMoment): NpcConversation {
  const list = NPCS[npc].conversations
  return list.find((c) => c.when && c.when(m)) ?? list.find((c) => !c.when) ?? list[list.length - 1]
}

/** As chaves de i18n das falas, já com a variante da classe (sem classe = Raposa). */
export function lineKeys(npc: NpcId, conv: NpcConversation, clan: "raposa" | "vampiro" | null): string[] {
  return conv.lines.map((l) => `npc_${npc}_${l.key}${l.byClan ? `_${clan ?? "raposa"}` : ""}`)
}

export const npcNameKey = (npc: NpcId) => `npc_${npc}_name`
