// O VOCABULÁRIO VISUAL DA PLATAFORMA DE GAMES — fonte ÚNICA das cores e das
// peças que as telas de `/games` dividem (mesma razão do `wallet-ui.tsx`,
// do `community-ui.ts` e do `academy-ui.ts`). Tela nova de games importa daqui.
//
// O roxo é o MESMO do pill de Games no headcard do perfil (`#6D28D9`): é a
// mesma porta, e mudar de tom por superfície faria procurar duas vezes.

export const PURPLE = "#6D28D9"
export const PURPLE_DEEP = "#5B21B6"
export const PURPLE_GLOW = "#A78BFA"
export const INK = "#0B0B0D"

// As peças de estado e as iniciais são as MESMAS da Carteira — reexportadas, e
// não copiadas: uma segunda `StateBox` divergiria da primeira na primeira
// correção de espaçamento.
export { StateBox } from "@/app/(header-only)/wallet/_components/wallet-ui"
export { initialsOf } from "@/lib/initials"
