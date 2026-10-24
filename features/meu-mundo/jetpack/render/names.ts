// Nomes sobre os jogadores do jetpack em grupo (mm3d-21). Etiquetas de DOM por
// cima do canvas, movidas só por transform (sem layout por quadro). A própria
// vira uma seta "VOCÊ". Cor da borda = cor do fogo da vaga.

import * as THREE from 'three';

/** Acima da cabeça (m, no plano do jogo). */
const ABOVE = 0.95;

export class NameTags {
  private readonly layer: HTMLDivElement;
  private readonly tags = new Map<number, HTMLDivElement>();
  private readonly v = new THREE.Vector3();

  constructor(host: HTMLElement) {
    this.layer = document.createElement('div');
    this.layer.className = 'jg-tags';
    this.layer.setAttribute('aria-hidden', 'true');
    host.appendChild(this.layer);
  }

  /** Cria ou atualiza a etiqueta de uma vaga. */
  set(slot: number, text: string, mine: boolean) {
    let el = this.tags.get(slot);
    if (!el) {
      el = document.createElement('div');
      el.className = 'jg-tag';
      el.dataset.slot = String(slot);
      this.layer.appendChild(el);
      this.tags.set(slot, el);
    }
    el.classList.toggle('me', mine);
    if (el.textContent !== text) el.textContent = text;
  }

  remove(slot: number) {
    this.tags.get(slot)?.remove();
    this.tags.delete(slot);
  }

  /** Posiciona sobre (x, y) do mundo; `fade` < 1 = rebocado. */
  place(slot: number, x: number, y: number, z: number, camera: THREE.Camera, w: number, h: number, visible: boolean, fade = 1) {
    const el = this.tags.get(slot);
    if (!el) return;
    if (!visible) {
      if (!el.hidden) el.hidden = true;
      return;
    }
    if (el.hidden) el.hidden = false;
    this.v.set(x, y + ABOVE, z).project(camera);
    const px = ((this.v.x + 1) / 2) * w;
    const py = ((1 - this.v.y) / 2) * h;
    el.style.transform = `translate3d(${px.toFixed(1)}px, ${py.toFixed(1)}px, 0) translate(-50%, -100%)`;
    const o = String(fade);
    if (el.style.opacity !== o) el.style.opacity = o;
  }

  hideAll() {
    for (const el of this.tags.values()) el.hidden = true;
  }

  dispose() {
    this.layer.remove();
    this.tags.clear();
  }
}
