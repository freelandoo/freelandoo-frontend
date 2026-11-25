// features/meu-mundo/npc-bodies.ts — 22/11: os corpos dos NPCs (Tripo do Alex).
//
// Cada NPC dos prédios, das praças e os figurantes viraram um corpo próprio, feito
// pela MESMA receita das classes (pipeline/build_deuses.py com os marcos medidos em
// pipeline/npcs: prep_npcs.py + npc_list.py, a fonte única de quem é quem). Usam
// todas as animações do Sergio; no jogo só ficam parados respirando
// (engine/npc-idle.ts). NÃO são corpo de jogador: ficam fora de BODY_IDS, do
// CHECK chk_mm_avatar_body e dos personagens — o servidor só manda o id para desenhar.

export const NPC_BODIES = [
  "npc_acougueiro", "npc_quirino", "npc_aluna", "npc_cliente_raposa", "npc_juca", "npc_ronaldo", "npc_leitor", "npc_aluno",
  "npc_criogenista", "npc_bento", "npc_fulvo", "npc_universitaria", "npc_academia_raposa", "npc_anselmo", "npc_tito", "npc_nivea",
  "npc_nara", "npc_neide", "npc_sacerdotisa", "npc_tiburcio", "npc_salvia", "npc_pipa", "npc_dora", "npc_arauto", "npc_kaio",
  "npc_atendente_sangue", "npc_cliente_vampiro", "npc_davi", "npc_fiel_vampiro", "npc_rosalia", "npc_beppe", "npc_edu",
  "npc_academia_vampira", "npc_cida", "npc_universitario",
] as const
export type NpcBody = (typeof NPC_BODIES)[number]

export const isNpcBody = (id: string | null | undefined): id is NpcBody => (NPC_BODIES as readonly string[]).includes(id ?? "")

/** Mapa por corpo de NPC a partir de uma função (para os Record<BodyId, …>). */
export const byNpcBody = <T>(f: (b: NpcBody) => T) => Object.fromEntries(NPC_BODIES.map((b) => [b, f(b)])) as Record<NpcBody, T>

/** Altura no jogo (m; a escala mora no GLB): adulto 2,70, jovem 1,70/1,65, criança 1,35 (npc_list.py). */
const KIDS: readonly NpcBody[] = ["npc_aluna", "npc_aluno"]
const YOUNG: Partial<Record<NpcBody, number>> = { npc_leitor: 1.7, npc_kaio: 1.7, npc_universitario: 1.7, npc_universitaria: 1.65 }
export const npcBodyHeight = (b: NpcBody) => (KIDS.includes(b) ? 1.35 : (YOUNG[b] ?? 2.7))

/** Povo e sexo (r/v + m/f) — o retrato de reserva enquanto o próprio não chega. */
export const NPC_KIN: Record<NpcBody, "rm" | "rf" | "vm" | "vf"> = { npc_acougueiro: "rm", npc_quirino: "rm", npc_aluna: "rf", npc_cliente_raposa: "rf", npc_juca: "vm", npc_ronaldo: "vm", npc_leitor: "vm", npc_aluno: "vm", npc_criogenista: "rm", npc_bento: "vm", npc_fulvo: "vm", npc_universitaria: "rf", npc_academia_raposa: "rm", npc_anselmo: "rm", npc_tito: "rm", npc_nivea: "rf", npc_nara: "vf", npc_neide: "rf", npc_sacerdotisa: "rf", npc_tiburcio: "rm", npc_salvia: "rf", npc_pipa: "rf", npc_dora: "vf", npc_arauto: "vm", npc_kaio: "rm", npc_atendente_sangue: "vf", npc_cliente_vampiro: "vm", npc_davi: "rm", npc_fiel_vampiro: "vm", npc_rosalia: "vf", npc_beppe: "vm", npc_edu: "rm", npc_academia_vampira: "vf", npc_cida: "rf", npc_universitario: "vm" }
