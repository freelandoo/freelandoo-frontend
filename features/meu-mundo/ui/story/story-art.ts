// features/meu-mundo/ui/story/story-art.ts — as ILUSTRAÇÕES da história (18/11, pedido
// do Alex: "gere imagens das histórias, coloque as referências").
//
// Uma imagem 16:9 por cena do roteiro de vídeo dos capítulos
// (MEU MUNDO 3D/historia/v2/05-videos-capitulos.md, cena "N.M" = `capN_M`), gerada com os
// retratos do jogo anexados como referência (MEU MUNDO 3D/arte/historias). Cada cena
// pertence a um PASSO do capítulo: aparece quando o passo é entregue (e a primeira do
// capítulo, que abre a história, desde o começo). Cena marcada com o povo só aparece
// para quem é daquele povo. Arquivos: /meu-mundo/historias/v1/<id>.webp (1280×720) e
// <id>-p.webp (480×270, cards e faixa).

export type StoryClan = "raposa" | "vampiro"
export interface StoryScene {
  id: string
  step: string
  clan?: StoryClan
}

// cap6 7–9 não estão no roteiro de vídeo: a luta contra o Ciborgue pelos dois povos e a
// luta da Ponte da Maré (pedido do Alex: "o ciborgue e um vampiro e a luta que eles tiveram").
const R: StoryClan = "raposa"
const V: StoryClan = "vampiro"
/** [cena, passo, povo?] por capítulo, na ordem do roteiro. */
const RAW: Record<string, [number, string, StoryClan?][]> = {
  cap1: [[1, "degelo"], [2, "degelo"], [3, "sol_ou_lua"], [4, "praca"], [5, "pedra"], [6, "pedra"], [7, "retorno"]],
  cap2: [[1, "portal"], [2, "portal", R], [3, "portal", V], [5, "lar"], [4, "tregua"], [6, "sonho", R], [7, "sonho", V]],
  cap3: [[1, "jogos", R], [2, "jogos", V], [3, "primeira"], [4, "tres"], [5, "oferenda"], [6, "placar"]],
  cap4: [[1, "arma"], [2, "pedra"], [3, "pedra"], [4, "forja"], [5, "noite"], [6, "noite"]],
  cap5: [[1, "ninho"], [2, "ninho"], [3, "bastor"], [4, "bastor"], [5, "matilha"], [6, "numeros"]],
  cap6: [[1, "ecos"], [2, "aco"], [7, "aco", V], [8, "aco", R], [3, "porta_azul"], [9, "porta_azul"], [4, "fulvo"], [5, "fulvo", V], [6, "fulvo", R]],
  cap7: [[1, "telhados"], [2, "telhados"], [6, "telhados", R], [7, "telhados", V], [3, "torre"], [4, "mistura"], [5, "material"]],
  cap8: [[1, "clareira"], [2, "clareira"], [3, "ringue"], [4, "campeao"], [5, "pipa"], [6, "peito"]],
  cap9: [[1, "cadeiras"], [2, "ouro"], [3, "ouro"], [4, "aldo"], [5, "aldo"], [6, "aldo"], [7, "corrida"]],
  cap10: [[1, "lua"], [2, "ceu"], [3, "preco"], [4, "preco"], [5, "sombra"], [6, "memoria", R], [7, "memoria", V], [8, "memoria"], [9, "olhos"]],
}
export const STORY_SCENES: Record<string, StoryScene[]> = Object.fromEntries(
  Object.entries(RAW).map(([cap, list]) => [cap, list.map(([n, step, clan]) => ({ id: `${cap}_${n}`, step, ...(clan ? { clan } : {}) }))]),
)

const DIR = "/meu-mundo/historias/v1"
export const sceneSrc = (id: string, small = false) => `${DIR}/${id}${small ? "-p" : ""}.webp`

const forClan = (s: StoryScene, clan: StoryClan | null) => !s.clan || s.clan === (clan ?? "raposa")

/** As cenas de um passo, para o povo do jogador. */
export function scenesOfStep(chapter: string, step: string, clan: StoryClan | null): StoryScene[] {
  return (STORY_SCENES[chapter] ?? []).filter((s) => s.step === step && forClan(s, clan))
}

/**
 * As cenas já liberadas do capítulo: a primeira sempre (abre a história) e as dos
 * passos entregues. `done` = chaves dos passos feitos.
 */
export function unlockedScenes(chapter: string, done: (step: string) => boolean, clan: StoryClan | null): StoryScene[] {
  const list = (STORY_SCENES[chapter] ?? []).filter((s) => forClan(s, clan))
  return list.filter((s, i) => i === 0 || done(s.step))
}
