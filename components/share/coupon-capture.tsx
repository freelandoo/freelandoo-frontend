"use client"

import { Suspense, useEffect } from "react"
import { usePathname, useSearchParams } from "next/navigation"
import { sanitizeCouponCode, setCapturedCoupon } from "@/lib/share-coupon"
import { ensureVisitorToken } from "@/lib/visitor-token"

/**
 * Descobre qual conteúdo está sendo visto, no vocabulário da atribuição
 * persistente (mig 194). Só as páginas de ITEM do regime usuário contam —
 * é o dono daquele item que paga a comissão.
 *
 * Serviço fica de fora de propósito: ele é escolhido num modal dentro da
 * página do perfil, então a URL não identifica o item. Nesses casos o cupom
 * da sessão continua atribuindo, como antes.
 */
function itemFromPath(pathname: string | null): { item_type: string; item_id: string } | null {
  if (!pathname) return null

  // /cursos/{slug} (o backend converte o slug no id do curso)
  const course = pathname.match(/^\/cursos\/([^/]+)\/?$/)
  if (course) return { item_type: "course", item_id: decodeURIComponent(course[1]) }

  // /p/{id_profile}/produto/{id}
  const product = pathname.match(/\/produto\/(\d+)\/?$/)
  if (product) return { item_type: "product", item_id: product[1] }

  return null
}

function CouponCaptureInner() {
  const searchParams = useSearchParams()
  const pathname = usePathname()

  useEffect(() => {
    const raw = searchParams?.get("cupom")
    const code = sanitizeCouponCode(raw)
    if (!code) return
    const landing = typeof window !== "undefined" ? window.location.href : pathname || ""
    // Último cupom vence — sobrescreve qualquer atribuição anterior da sessão.
    setCapturedCoupon(code, landing)

    // Atribuição PERSISTENTE do conteúdo: sobrevive a fechar a aba e a trocar
    // de dispositivo depois do login, ao contrário do sessionStorage acima.
    const item = itemFromPath(pathname)
    if (!item) return
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null
    const visitor_token = ensureVisitorToken()
    if (!token && !visitor_token) return

    fetch("/api/me/affiliate/touch", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ ...item, coupon_code: code, visitor_token }),
      keepalive: true,
    }).catch(() => {
      /* silencioso: a atribuição de sessão já foi gravada acima */
    })
  }, [searchParams, pathname])

  return null
}

/** Monta no layout raiz dentro de Suspense (useSearchParams requer). */
export function CouponCapture() {
  return (
    <Suspense fallback={null}>
      <CouponCaptureInner />
    </Suspense>
  )
}
