"use client"

// Vercel Web Analytics DESLIGADO (2026-06-09) para reduzir consumo na Vercel:
// cada page view enviava um beacon (1 edge request + 1 evento de Analytics) e o
// listener global de clique mandava eventos de CTA. As métricas ficam por conta
// do Google Analytics/AdSense.
//
// Para REATIVAR: reverter este arquivo (versão anterior reimporta
// `Analytics` de "@vercel/analytics/next" e `track` de "@vercel/analytics",
// renderizando <Analytics /> após o consentimento de cookies).

export function AnalyticsProvider() {
  return null
}
