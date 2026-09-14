/**
 * A COSTURA DO CONTADOR DE VISITAS.
 *
 * ⚠️ É O MESMO `SiteAnalytics` DO SITE DO CONSTRUTOR, e tem que ser. Um
 * segundo contador daria duas contagens da mesma visita, e o painel de
 * Indicadores do dono passaria a mostrar o dobro do movimento real — que é
 * pior do que não mostrar nada, porque parece dado.
 *
 * ⚠️ E É ELE QUE RECONHECE O CLIQUE DE WHATSAPP COMO LEAD, pelo host `wa.me`
 * (ver `content/business.ts`). Trocar o host do link tira o lead da conta do
 * dono sem erro nenhum aparecer.
 *
 * O arquivo existe em vez de o `index.tsx` importar direto porque é aqui que
 * o tema ficaria diferente se um dia for desenhado fora da plataforma — num
 * projeto solto este módulo devolve `null`, e nada mais muda.
 */

export { SiteAnalytics } from "@/components/site/site-analytics"
