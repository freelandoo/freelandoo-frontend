"use client";

// O serviço que a pessoa deixou em destaque na roda — lido pelo botão final.
//
// ⚠️ É CONTEXTO VISUAL, NÃO PRÉ-SELEÇÃO NA AGENDA. A página de agendamento
// aceita `?servico=<id>`, mas esse id é o UUID do serviço no banco da
// Freelandoo, e este tema é autoral: ele não conhece os ids. Inventar um
// mapeamento slug→id aqui seria uma segunda verdade que quebra na primeira
// vez que alguém recriar um serviço. Então o botão final diz "Agendar ·
// Corte" e leva à MESMA agenda; a escolha do serviço acontece lá.
//
// Store de módulo com `useSyncExternalStore`: duas ilhas de cliente (a roda e
// o botão final) dividem um valor sem contexto de React — a porta do tema é
// componente de servidor e não tem onde pendurar um provider.

import { useSyncExternalStore } from "react";

let current: string | null = null;
const subs = new Set<() => void>();

export function setSelectedService(slug: string | null) {
  if (slug === current) return;
  current = slug;
  subs.forEach((fn) => fn());
}

function subscribe(fn: () => void) {
  subs.add(fn);
  return () => {
    subs.delete(fn);
  };
}

export function useSelectedService(): string | null {
  return useSyncExternalStore(
    subscribe,
    () => current,
    () => null,
  );
}
