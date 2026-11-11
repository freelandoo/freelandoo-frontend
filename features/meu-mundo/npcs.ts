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

export type NpcId = "nivea" | "delegado" | "raposa_velha" | "vampiro_velho" | "vizinha_raposa" | "vizinho_vampiro"

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
  /** pensamento de quem joga ("Você", em itálico). Com personalidade, sai a resposta
   *  dela (`npc_<npc>_<conversa>_re_<p>`) no lugar desta fala, e a conversa não
   *  repete a resposta no fim (C1). */
  you?: boolean
}

export interface NpcConversation {
  id: string
  /** sem `when` = a conversa de sempre (a última da lista) */
  when?: (m: TalkMoment) => boolean
  lines: NpcLine[]
  /** fala solta: sorteia UMA das falas a cada vez que abre (07-falas §0.1, regra 3) */
  idle?: boolean
}

export interface NpcDef {
  body: BodyId
  look: string
  conversations: NpcConversation[]
  /** só ambiente (nenhum passo pede `talk:` dele): abrir não pede nada ao servidor */
  ambient?: boolean
}

const at = (chapter: string, ...steps: string[]) => (m: TalkMoment) => m.chapter === chapter && (!steps.length || (m.step !== null && steps.includes(m.step)))

export const NPCS: Record<NpcId, NpcDef> = {
  // Raposa de jaleco, pelo ruivo com mechas de geada (cap. 1): corpo de Raposa adulta.
  // Lore v2 C1: as conversas inteiras de historia/v2/07-falas-e-arquivo.md §2. A
  // escolha de classe da conta nova é a MESMA conversa, antes do jogo (clan-choice.tsx).
  nivea: {
    body: "raposa_adulta",
    look: "",
    conversations: [
      {
        id: "despertar",
        when: at("cap1", "degelo", "sol_ou_lua", "fome"),
        lines: [{ key: "despertar_1" }, { key: "despertar_2" }, { key: "despertar_3" }, { key: "despertar_4" }, { key: "classe_1", byClan: true }, { key: "despertar_5" }],
      },
      { id: "classe", when: at("cap1", "praca", "pedra"), lines: [{ key: "classe_1", byClan: true }, { key: "despertar_5" }] },
      { id: "retorno", when: at("cap1", "retorno"), lines: [{ key: "retorno_1" }, { key: "retorno_you", you: true }, { key: "retorno_2" }, { key: "retorno_3" }] },
      { id: "sempre", lines: [{ key: "sempre_1" }] },
    ],
  },
  delegado: {
    body: "strong",
    look: "4210",
    conversations: [
      { id: "tregua", when: at("cap2", "tregua"), lines: [{ key: "tregua_1" }, { key: "tregua_2" }, { key: "tregua_3" }, { key: "tregua_4" }] },
      { id: "idle", idle: true, lines: [{ key: "idle_1" }] },
    ],
  },
  raposa_velha: {
    body: "raposa_adulto",
    look: "",
    ambient: true,
    conversations: [{ id: "pedra", idle: true, lines: [{ key: "pedra_1", byClan: true }, { key: "idle_2" }] }],
  },
  vampiro_velho: {
    body: "vampiro_adulto",
    look: "",
    ambient: true,
    conversations: [{ id: "pedra", idle: true, lines: [{ key: "pedra_1", byClan: true }, { key: "idle_2" }] }],
  },
  // C1 (cap. 2): o vizinho da praça do bairro — a Vizinha nas Matas, o Vizinho na
  // Cidade Baixa (o servidor manda o certo em `neighborhood.npcs`). Só ambiente.
  vizinha_raposa: {
    body: "raposa_adulta",
    look: "",
    ambient: true,
    conversations: [{ id: "idle", idle: true, lines: [{ key: "idle_1" }, { key: "idle_2" }] }],
  },
  vizinho_vampiro: {
    body: "vampiro_adulto",
    look: "",
    ambient: true,
    conversations: [{ id: "idle", idle: true, lines: [{ key: "idle_1" }, { key: "idle_2" }] }],
  },
}

export const isNpcId = (id: string): id is NpcId => Object.prototype.hasOwnProperty.call(NPCS, id)

/** A conversa do momento: a primeira cujo `when` vale; senão a de sempre. */
export function conversationFor(npc: NpcId, m: TalkMoment): NpcConversation {
  const list = NPCS[npc].conversations
  return list.find((c) => c.when && c.when(m)) ?? list.find((c) => !c.when) ?? list[list.length - 1]
}

export interface TalkPage {
  key: string
  /** pensamento de quem joga (rótulo "Você") */
  you: boolean
}

/**
 * As páginas da conversa, já com a variante da classe (sem classe = Raposa) e a
 * fala sorteada quando é solta. `replyKey` = a resposta da personalidade de quem
 * joga, se existir: entra no lugar do pensamento ("Você") ou, sem pensamento, no fim.
 */
export function talkPages(npc: NpcId, conv: NpcConversation, clan: "raposa" | "vampiro" | null, replyKey: string | null, rnd: () => number = Math.random): TalkPage[] {
  const lines = conv.idle ? [conv.lines[Math.min(conv.lines.length - 1, Math.floor(rnd() * conv.lines.length))]] : conv.lines
  const keyOf = (l: NpcLine) => `npc_${npc}_${l.key}${l.byClan ? `_${clan ?? "raposa"}` : ""}`
  const out: TalkPage[] = lines.map((l) => (l.you ? { key: replyKey ?? keyOf(l), you: true } : { key: keyOf(l), you: false }))
  if (replyKey && !lines.some((l) => l.you)) out.push({ key: replyKey, you: true })
  return out
}

export const npcNameKey = (npc: NpcId) => `npc_${npc}_name`
