// Tipagens globais para os scripts do Google (AdSense + Consent Mode).
export {}

declare global {
  interface Window {
    /** Fila do Google AdSense; cada push({}) renderiza um bloco <ins.adsbygoogle>. */
    adsbygoogle?: Record<string, unknown>[]
    /** dataLayer compartilhado do Google tag / Consent Mode. */
    dataLayer?: unknown[]
    /** Função gtag definida pelo snippet de Consent Mode no layout raiz. */
    gtag?: (...args: unknown[]) => void
  }
}
