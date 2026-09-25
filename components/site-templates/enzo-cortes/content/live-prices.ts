/**
 * LÊ OS PREÇOS DO CADASTRO — só no servidor.
 *
 * Chama o backend DIRETO (como `lib/community-site.ts`): isto roda no servidor
 * do Next, e o proxy `/api` só acrescentaria um salto cobrado na Vercel.
 *
 * ⚠️ A ROTA É A PÚBLICA DE SERVIÇOS DO PERFIL, não a do site: ela responde
 * com o site ainda em rascunho, e o preço do site não pode depender de ele
 * estar publicado.
 *
 * ⚠️ FALHA NUNCA QUEBRA A PÁGINA: backend fora, serviço desativado ou "sob
 * orçamento" → aquele serviço fica fora do mapa e `priceOf` cai no valor
 * original da tabela (`BASE_PRICES`). O site nunca perde um card.
 */

import { getBackendApiUrl } from "@/lib/backend";

import { CADASTRO_ID, PRICE_PROFILE_ID, type PriceMap } from "./prices";

/** Mesmo intervalo do ISR do site: o preço novo chega em até 10 minutos. */
const REVALIDATE_SECONDS = 600;

type CadastroService = {
  id_profile_service: number | string;
  price_amount: number | null;
  price_on_request?: boolean;
  is_active?: boolean;
};

export async function loadLivePrices(): Promise<PriceMap> {
  try {
    const res = await fetch(
      `${getBackendApiUrl()}/public/profile/${PRICE_PROFILE_ID}/services`,
      { next: { revalidate: REVALIDATE_SECONDS } },
    );
    if (!res.ok) return {};
    const body = (await res.json()) as { services?: CadastroService[] };
    const map: PriceMap = {};
    for (const s of body.services ?? []) {
      const slug = CADASTRO_ID[String(s.id_profile_service)];
      if (!slug || s.is_active === false || s.price_on_request) continue;
      const cents = Number(s.price_amount);
      if (!Number.isFinite(cents) || cents <= 0) continue;
      map[slug] = cents / 100;
    }
    return map;
  } catch {
    return {};
  }
}
