/**
 * A COSTURA DO CONTADOR DE VISITAS — o lado da PLATAFORMA.
 *
 * ⚠️ ESTE É O ÚNICO ARQUIVO QUE DIFERE entre o tema aqui e o projeto de
 * origem (`SITES/barbeiro- enzo/src/site/`), e ele existe exatamente para que
 * seja só um. Lá ele devolve `null` (não há painel de Indicadores para
 * alimentar); aqui ele reexporta o contador de verdade.
 *
 * ⚠️ É O MESMO `SiteAnalytics` DO SITE DO CONSTRUTOR, e tem que ser. Um
 * segundo contador daria duas contagens da mesma visita, e o painel de
 * Indicadores do dono passaria a mostrar o dobro do movimento real — que é
 * pior do que não mostrar nada, porque parece dado.
 *
 * Sem esta costura, `index.tsx` precisaria de duas versões — e duas versões
 * da porta do tema é como uma delas fica para trás numa correção.
 */

export { SiteAnalytics } from "@/components/site/site-analytics"
