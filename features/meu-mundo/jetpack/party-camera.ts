// Câmera do jetpack em grupo (mm3d-21): UMA câmera, igual em todas as telas,
// que segue o LÍDER (vivo mais à frente). Em coluna, o líder fica onde o
// jogador fica sozinho (26 % da largura); quando ele dispara no turbo, a
// câmera vai com ele e a janela se abre para a esquerda até a rabeira ficar a
// 10 % da borda — quem fica para trás é rebocado ali (PARTY.maxSpread).
//
// Só TypeScript que pode ser apagado: o teste do backend carrega este arquivo.

/** Posição horizontal do jogador na tela (fração a partir da esquerda); render/stage.ts reexporta. */
export const PLAYER_SCREEN_X = 0.26;
/** Rabeira a pelo menos 10 % da borda esquerda. */
const TAIL_MARGIN = 0.1;
/** Mola da câmera (s): o enquadramento muda suave quando o líder dispara. */
const SPRING_S = 0.25;

/**
 * Enquadramento: `focusX` = centro da janela (m); `screenX` = onde o líder
 * fica na tela (fração a partir da esquerda).
 */
export function partyCameraFocus(leaderX: number, tailX: number, viewWidth: number) {
  const left = Math.min(leaderX - PLAYER_SCREEN_X * viewWidth, tailX - TAIL_MARGIN * viewWidth);
  return { focusX: left + viewWidth / 2, screenX: (leaderX - left) / viewWidth };
}

/** Suaviza a posição do líder na tela (criticamente amortecida). */
export class CameraSpring {
  screenX = PLAYER_SCREEN_X;
  private v = 0;

  update(want: number, dt: number) {
    const w = 2 / SPRING_S;
    const a = w * w * (want - this.screenX) - 2 * w * this.v;
    this.v += a * dt;
    this.screenX += this.v * dt;
    return this.screenX;
  }

  reset(x = PLAYER_SCREEN_X) {
    this.screenX = x;
    this.v = 0;
  }
}
