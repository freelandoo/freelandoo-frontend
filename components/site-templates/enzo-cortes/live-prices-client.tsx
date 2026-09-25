"use client";

/**
 * Leva os preços do cadastro para as peças de CLIENTE do tema (a roda de
 * serviços, os combinados, a barra).
 *
 * ⚠️ O MÓDULO `content/prices.ts` EXISTE DUAS VEZES: uma no servidor dos
 * componentes de servidor (gravada pelo `PriceGate`) e outra no lado dos
 * componentes de cliente — no SSR e no navegador. Sem esta ponte, o HTML
 * sairia com o preço novo e o navegador hidrataria com o antigo.
 *
 * Grava DURANTE O RENDER, e de propósito: ela embrulha o site inteiro, e o
 * pai renderiza antes dos filhos — num efeito, o primeiro quadro das peças de
 * cliente já teria saído com o valor antigo.
 */

import type { ReactNode } from "react";

import { setLivePrices, type PriceMap } from "./content/prices";

export function LivePrices({ prices, children }: { prices: PriceMap; children: ReactNode }) {
  setLivePrices(prices);
  return <>{children}</>;
}
