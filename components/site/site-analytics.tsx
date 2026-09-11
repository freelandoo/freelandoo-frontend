"use client"

/**
 * O CONTADOR DO SITE PUBLICADO — visualizações e cliques (mig 235).
 *
 * É o que alimenta o painel de Indicadores do negócio. Não desenha nada.
 *
 * ═══ POR QUE ISTO VIVE NO CLIENTE, E NÃO NO SERVIDOR ═══
 *
 * O site é servido com ISR de 10 minutos (`/c/<slug>` e `/dominio/<host>`):
 * o HTML é montado uma vez e entregue de cache para todo mundo. Contar no
 * servidor contaria RENDERIZAÇÕES, não visitas — cem pessoas num intervalo de
 * dez minutos apareceriam como uma. E render por visita, só para contar,
 * jogaria fora o cache que existe justamente porque robô varre site publicado
 * sem parar.
 *
 * ⚠️ VAI DIRETO NO RAILWAY, nunca pelo proxy `/api/*` da Vercel. É a regra da
 * casa para chamada de alta frequência (heartbeat de XP, chat, presença): cada
 * passagem pelo proxy cobraria uma invocação, e aqui quem chama é TODO visitante
 * de TODO site publicado.
 *
 * ⚠️ O `kind` VAI NA QUERYSTRING, não no corpo. `sendBeacon` é o único jeito de
 * um clique que NAVEGA sobreviver à troca de página, e um corpo
 * `application/json` deixaria de ser uma requisição simples: viraria preflight,
 * que o beacon não negocia bem. Sem corpo, não há preflight nem parser.
 *
 * ⚠️ ESTE COMPONENTE NÃO ENTRA NO CONSTRUTOR. Ele é montado pela página
 * PÚBLICA; o canvas do líder desenha os mesmos botões (`editing`), e montá-lo
 * lá faria o dono inflar o próprio painel a cada tarde de edição.
 */

import { useEffect } from "react"
import { getPublicBackendUrl } from "@/lib/backend-public"

/** Espelho da lista fechada de `src/utils/siteEvents.js`. */
type SiteEventKind = "view" | "booking_click" | "whatsapp_click"

/** Os dois hosts que o `whatsappHref` do site produz. */
const WHATSAPP_HOSTS = new Set(["wa.me", "api.whatsapp.com"])

function send(communityId: string, kind: SiteEventKind) {
  const url = `${getPublicBackendUrl()}/communities/${communityId}/site-events?kind=${kind}`
  try {
    // `sendBeacon` é entregue pelo navegador mesmo depois de a página começar a
    // sair — que é exatamente o caso do clique em "Agendar". Um `fetch` comum
    // seria cancelado na navegação e o clique mais importante do site seria o
    // único que nunca contaria.
    if (typeof navigator !== "undefined" && navigator.sendBeacon) {
      navigator.sendBeacon(url)
      return
    }
    void fetch(url, { method: "POST", keepalive: true }).catch(() => {})
  } catch {
    /* contador nunca derruba a página de ninguém */
  }
}

/** `null` quando não dá para ler o armazenamento (aba privada, cookies off). */
function sessionOnce(key: string): boolean {
  try {
    if (sessionStorage.getItem(key)) return false
    sessionStorage.setItem(key, "1")
    return true
  } catch {
    // Sem sessionStorage não há como deduplicar. Contar é melhor do que não
    // contar: o erro vira "visitas um pouco infladas para quem navega em aba
    // privada", não um painel cego.
    return true
  }
}

export function SiteAnalytics({
  communityId,
  bookingHref,
}: {
  communityId: string | null
  /** O endereço de agendar DESTE site — é o que identifica o clique. */
  bookingHref?: string | null
}) {
  useEffect(() => {
    if (!communityId) return

    // ── a visualização ────────────────────────────────────────────────────
    // Uma por sessão do navegador, e não por carregamento: sem isto o F5 e o
    // "voltar" contariam de novo, e "visualizações" viraria "recarregamentos".
    if (sessionOnce(`fl_site_view_${communityId}`)) send(communityId, "view")

    // ── os cliques ────────────────────────────────────────────────────────
    //
    // ⚠️ UM LISTENER DELEGADO, e não um `onClick` em cada botão. O destino de
    // agendar aparece no banner, no bloco de chamada, na barra fixa, na seção
    // "quem está por trás" e em cada card de serviço (lá com `?servico=`) — e
    // vai aparecer em qualquer seção que o construtor ganhe depois. Instrumentar
    // um a um é como o próximo nasceria sem contar, em silêncio: o botão
    // funcionaria, o número é que ficaria parado.
    const bookingPath = (() => {
      if (!bookingHref) return null
      try {
        return new URL(bookingHref, window.location.href).pathname
      } catch {
        return null
      }
    })()

    const onClick = (ev: MouseEvent) => {
      const target = ev.target as HTMLElement | null
      const anchor = target?.closest?.("a")
      if (!anchor) return
      const raw = anchor.getAttribute("href")
      if (!raw) return

      let url: URL
      try {
        url = new URL(anchor.href || raw, window.location.href)
      } catch {
        return
      }

      if (WHATSAPP_HOSTS.has(url.hostname)) {
        send(communityId, "whatsapp_click")
        return
      }
      // A comparação é por CAMINHO: o card de serviço manda `?servico=<id>` no
      // mesmo endereço, e comparar a URL inteira deixaria justamente o clique
      // que já escolheu o serviço de fora da conta.
      if (bookingPath && url.pathname === bookingPath) {
        send(communityId, "booking_click")
      }
    }

    document.addEventListener("click", onClick)
    return () => document.removeEventListener("click", onClick)
  }, [communityId, bookingHref])

  return null
}
