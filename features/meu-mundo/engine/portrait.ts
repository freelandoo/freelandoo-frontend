// features/meu-mundo/engine/portrait.ts — tela EM PÉ (celular) afasta a câmera.
//
// A câmera do Babylon fixa o ângulo VERTICAL: no celular em pé a tela é
// estreita e o personagem enche tudo. O Jetpack já compensava (`tall` em
// jetpack-game.ts); pedido do Alex (2026-11-03): "no mobile deixa a câmera
// mais afastada" no Paint, nas lutas e no bairro/cidade, como no Jetpack.
//
// `tallness` = 0 numa tela deitada/quadrada, 1 a partir de ~9:20 em pé — a
// mesma conta do Jetpack. Cada cena decide quanto afastar com isso.

import type { Scene } from "@babylonjs/core/scene"

export function tallness(scene: Scene): number {
  const e = scene.getEngine()
  const h = e.getRenderHeight()
  if (!(h > 0)) return 0
  const aspect = e.getRenderWidth() / h
  return Math.min(1, Math.max(0, (1 - aspect) / 0.55))
}
