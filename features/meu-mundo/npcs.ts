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

export type NpcId = "nivea" | "delegado" | "raposa_velha" | "vampiro_velho" | "vizinha_raposa" | "vizinho_vampiro" | "sacerdotisa" | "arauto" | "forjador" | "armeiro" | "bibliotecaria" | "ciborgue" | "fulvo"

/** Onde a pessoa está na história quando abre a conversa. */
export interface TalkMoment {
  chapter: string | null
  step: string | null
  /** classe de quem ouve (C2: o líder do outro povo responde com desprezo) */
  clan?: "raposa" | "vampiro" | null
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
  /** C3: também é "Você", mas fala FIXA (não troca pela resposta da personalidade) */
  me?: boolean
}

export interface NpcConversation {
  id: string
  /** sem `when` = a conversa de sempre (a última da lista) */
  when?: (m: TalkMoment) => boolean
  lines: NpcLine[]
  /** fala solta: sorteia UMA das falas a cada vez que abre (07-falas §0.1, regra 3) */
  idle?: boolean
  /** C3: no fim, o NPC entrega um texto do Arquivo para ler ali (o livro do Ninho) */
  archive?: string
}

export interface NpcDef {
  body: BodyId
  look: string
  conversations: NpcConversation[]
  /** só ambiente (nenhum passo pede `talk:` dele): abrir não pede nada ao servidor */
  ambient?: boolean
}

const rival = (clan: "raposa" | "vampiro") => (m: TalkMoment) => m.clan === clan
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
      // C3 (cap. 5): quem joga mostra o que notou; com personalidade, a resposta dela diz o mesmo
      {
        id: "numeros",
        when: at("cap5", "numeros"),
        lines: [{ key: "numeros_you", you: true }, { key: "numeros_1" }, { key: "numeros_2" }, { key: "numeros_you2", me: true }, { key: "numeros_3" }, { key: "numeros_4" }],
      },
      // C4 (cap. 7): por que você foi congelado. A pergunta de quem joga é fixa; a
      // personalidade responde no fim, ao "você é a cola"
      {
        id: "material",
        when: at("cap7", "material"),
        lines: [{ key: "material_1" }, { key: "material_2" }, { key: "material_you", me: true }, { key: "material_3" }, { key: "material_4" }, { key: "material_5" }],
      },
      { id: "cap7", when: at("cap7"), idle: true, lines: [{ key: "idle_1" }, { key: "idle_2" }, { key: "idle_3" }] },
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
  // C2 (cap. 3, "Néctar"): os dois líderes da corrida do néctar (07-falas §4). Só
  // ambiente: o cap. 3 não tem passo de conversa. No cap. 3 a fala inteira; depois,
  // uma delas solta (mesmas respostas da personalidade: a conversa é a mesma). Quem
  // é do outro povo ouve o desprezo. Corpo de classe (sem arte nova; a túnica dourada
  // e a azul-noite pedem máscara de cor do corpo de classe, que ainda não existe).
  // A Sacerdotisa do Sol: Bairro das Matas, em cima do pedestal do Aurion.
  sacerdotisa: {
    body: "raposa_adulta",
    look: "",
    ambient: true,
    conversations: [
      { id: "rival", when: rival("vampiro"), lines: [{ key: "idle_vampiro" }] },
      { id: "cap3", when: at("cap3"), lines: [{ key: "cap3_1" }, { key: "cap3_2" }, { key: "cap3_3" }] },
      { id: "cap3", idle: true, lines: [{ key: "cap3_1" }, { key: "cap3_2" }, { key: "cap3_3" }] },
    ],
  },
  // O Arauto da Lua: praça, em cima do pedestal de Morkhan, só de noite.
  arauto: {
    body: "vampiro_adulto",
    look: "",
    ambient: true,
    conversations: [
      { id: "rival", when: rival("raposa"), lines: [{ key: "idle_raposa" }] },
      { id: "cap3", when: at("cap3"), lines: [{ key: "cap3_1" }, { key: "cap3_2" }, { key: "cap3_3" }] },
      { id: "cap3", idle: true, lines: [{ key: "cap3_1" }, { key: "cap3_2" }, { key: "cap3_3" }] },
    ],
  },
  // C3 (cap. 4, "Ferro"; 07-falas §5): o Forjador (Forja) e o Armeiro (Arsenal), só
  // ambiente. Corpo = o do prédio (NPC_LOOK de engine/place-game.ts). No cap. 4 a fala
  // inteira; fora dele, a solta. Um Armeiro só: a fala muda pela classe de quem ouve.
  forjador: {
    body: "raposa",
    look: "",
    ambient: true,
    conversations: [
      { id: "cap4", when: at("cap4"), lines: [{ key: "cap4_1" }, { key: "cap4_2" }] },
      { id: "idle", idle: true, lines: [{ key: "idle_1" }] },
    ],
  },
  armeiro: {
    body: "vampiro",
    look: "",
    ambient: true,
    conversations: [
      { id: "cap4", when: at("cap4"), lines: [{ key: "cap4_1", byClan: true }] },
      { id: "idle", idle: true, lines: [{ key: "idle_1" }] },
    ],
  },
  // C3 (cap. 5): a bibliotecária guarda o livro do Ninho (para quem não entra nas
  // Matas, o Vampiro). No passo "ninho" ela o entrega; o servidor só grava a leitura
  // com a visita à Biblioteca (ou à ruína) — o aparelho não decide nada.
  bibliotecaria: {
    body: "female",
    look: "3546",
    ambient: true,
    conversations: [
      { id: "ninho", when: at("cap5", "ninho"), lines: [{ key: "ninho_1" }, { key: "ninho_2" }], archive: "registro_ninho" },
      { id: "idle", idle: true, lines: [{ key: "idle_1" }, { key: "idle_2" }] },
    ],
  },
  // C4 (cap. 6, 07-falas §7): o Ciborgue treina sozinho no fundo da Arena das Lâminas
  // (meuMundoCenter.js). No passo "porta_azul" a conversa inteira; a última fala é a
  // memória de quem joga, pela classe (fixa); a personalidade comenta no fim.
  ciborgue: {
    body: "ciborgue",
    look: "",
    conversations: [
      {
        id: "porta_azul",
        when: at("cap6", "porta_azul"),
        lines: [{ key: "porta_azul_1" }, { key: "porta_azul_2" }, { key: "porta_azul_3" }, { key: "porta_azul_4" }, { key: "porta_azul_you", me: true, byClan: true }],
      },
      { id: "idle", idle: true, lines: [{ key: "idle_1" }, { key: "idle_2" }] },
    ],
  },
  // Fulvo: Vampiro, líder da corrida do néctar; de noite, no pedestal de Morkhan (07-falas
  // §12, pergunta 3). Corpo de Vampiro adulto: a farda velha das Raposas com medalhas
  // é arte do Alex (o corpo de classe não tem máscara de cor).
  fulvo: {
    body: "vampiro_adulto",
    look: "",
    conversations: [
      { id: "fulvo", when: at("cap6", "fulvo"), lines: [{ key: "fulvo_1", byClan: true }, { key: "fulvo_2" }, { key: "fulvo_3" }, { key: "fulvo_4" }, { key: "fulvo_5" }] },
      { id: "idle", idle: true, lines: [{ key: "idle_1" }, { key: "idle_2" }] },
    ],
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
  const out: TalkPage[] = lines.map((l) => (l.me ? { key: keyOf(l), you: true } : l.you ? { key: replyKey ?? keyOf(l), you: true } : { key: keyOf(l), you: false }))
  if (replyKey && !lines.some((l) => l.you)) out.push({ key: replyKey, you: true })
  return out
}

export const npcNameKey = (npc: NpcId) => `npc_${npc}_name`
