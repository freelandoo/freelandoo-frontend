/**
 * Política de timeouts e polling — fonte da verdade.
 *
 * Categoriza cada chamada por criticidade pra que (a) login/perfil nunca
 * pendurem a UI e (b) badges/notificações não martelem o Vercel.
 *
 * Regras gerais:
 * - Camada AUTH (signin, /users/me) bloqueia render -> timeout curto e
 *   fallback claro. NUNCA fica pollando.
 * - Camada PROFILE EXTRAS (cupom, mídia) é acessório -> timeout curto e
 *   carrega em background sem bloquear isLoading.
 * - Camada BADGES (nav-counts, unread) é não-crítica -> WebSocket primário
 *   + poll longo (10min). Tolera falha silenciosa.
 * - Camada CHAT ATIVO usa WebSocket; poll é apenas fallback espaçado.
 */

// ============================================================================
// Timeouts (ms)
// ============================================================================

// AUTH — bloqueia o usuário. Tem que ser curto.
export const AUTH_PROXY_TIMEOUT_MS = 5_000   // backend fetch via proxy
export const AUTH_CLIENT_TIMEOUT_MS = 9_000  // fetch client-side
export const PROFILE_TIMEOUT_MS = 8_000      // /api/users/me no cliente
export const PROFILE_PROXY_TIMEOUT_MS = 4_000

// EXTRAS — acessórios. Falha silenciosa.
export const EXTRA_TIMEOUT_MS = 6_000
export const EXTRA_PROXY_TIMEOUT_MS = 4_000

// BADGES — proxies retornam 200 com zeros se backend demorar.
export const BADGE_PROXY_TIMEOUT_MS = 2_500
export const BADGE_CLIENT_TIMEOUT_MS = 6_000

// ============================================================================
// Polling (ms)
// ============================================================================

// nav-counts (sino, conversas, service-requests) — WebSocket primário.
export const NAV_COUNTS_POLL_MS = 10 * 60 * 1000 // 10min
export const NAV_COUNTS_MIN_CACHE_MS = 60 * 1000

// /mensagens lista (fallback do WebSocket).
export const MENSAGENS_LIST_POLL_MS = 2 * 60 * 1000 // 2min

// /mensagens thread ativa (fallback do WebSocket).
export const MENSAGENS_THREAD_POLL_MS = 45 * 1000 // 45s

// Modal de chat de service-request (raramente fica aberto).
export const SERVICE_CHAT_MODAL_POLL_MS = 90 * 1000

// Chat ao Vivo (rooms ephemeras).
export const LIVE_CHAT_POLL_MS = 10 * 1000

// useAuth — quanto tempo o user cache é considerado "fresco" antes de
// revalidar em background. Login/refresh força revalidação.
export const AUTH_STALE_MS = 5 * 60 * 1000
