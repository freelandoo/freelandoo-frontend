"use client"

// Scroll infinito das grades da vitrine (/search).
//
// Antes toda aba fazia UM fetch sem limit/offset e mostrava só a primeira
// página do backend (20 perfis / 30 produtos / 30 cursos / 30 comunidades) —
// não havia como chegar ao resto. Aqui a lista pagina sozinha quando o
// sentinela entra em cena: sem botão "carregar mais", até acabar de verdade.
//
// Detalhe importante: a /search rola num <div overflow-y-auto> (o layout é
// fixed inset-0), não na viewport. Por isso o `rootRef` — com root=null o
// IntersectionObserver só dispararia quando o sentinela já estivesse visível,
// matando o pré-carregamento do rootMargin.

import { useCallback, useEffect, useRef, useState, type RefObject } from "react"

export interface UseInfiniteFetchOptions<T> {
  /** Monta a URL de uma página. */
  buildUrl: (page: { limit: number; offset: number }) => string
  /** Extrai a lista da resposta (o formato varia por endpoint). */
  extract: (data: unknown) => T[]
  /** Identidade do item — usada pra não duplicar entre páginas. */
  getId: (item: T) => string | number
  /** Assinatura dos filtros: mudou, recomeça da primeira página. */
  filterKey: string
  pageSize?: number
  /** Container rolável. Omitido = viewport. */
  rootRef?: RefObject<HTMLElement | null>
  /** Falso segura o carregamento (ex.: filtro ainda sendo resolvido). */
  enabled?: boolean
  errorMessage?: string
}

export interface UseInfiniteFetchResult<T> {
  items: T[]
  /** Primeira página (tela inteira em branco). */
  loading: boolean
  /** Páginas seguintes (spinner no rodapé). */
  loadingMore: boolean
  error: string | null
  hasMore: boolean
  /** Elemento-gatilho: renderizar logo abaixo da grade. */
  sentinelRef: RefObject<HTMLDivElement | null>
}

export function useInfiniteFetch<T>({
  buildUrl,
  extract,
  getId,
  filterKey,
  pageSize = 24,
  rootRef,
  enabled = true,
  errorMessage = "Erro ao carregar",
}: UseInfiniteFetchOptions<T>): UseInfiniteFetchResult<T> {
  const [items, setItems] = useState<T[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(true)

  const sentinelRef = useRef<HTMLDivElement | null>(null)
  const offsetRef = useRef(0)
  const runIdRef = useRef(0)
  const busyRef = useRef(false)

  // Callbacks vivem num ref pra não entrar nas deps do efeito de carga (são
  // recriados a cada render pelos chamadores). Este efeito não tem array de
  // deps de propósito e é declarado ANTES dos que carregam, então o ref já
  // está atualizado quando eles rodam.
  const handlers = useRef({ buildUrl, extract, getId, errorMessage })
  useEffect(() => {
    handlers.current = { buildUrl, extract, getId, errorMessage }
  })

  const load = useCallback(
    async (reset: boolean) => {
      // Uma página por vez — mas um reset (troca de filtro) sempre passa na
      // frente e invalida a que estiver voando.
      if (busyRef.current && !reset) return
      busyRef.current = true
      const runId = ++runIdRef.current
      const offset = reset ? 0 : offsetRef.current

      if (reset) {
        setLoading(true)
        setError(null)
      } else {
        setLoadingMore(true)
      }

      try {
        const url = handlers.current.buildUrl({ limit: pageSize, offset })
        const res = await fetch(url, { cache: "no-store" })
        if (!res.ok) throw new Error(`Falha ${res.status}`)
        const data = await res.json()
        const page = handlers.current.extract(data)
        if (runId !== runIdRef.current) return

        offsetRef.current = offset + page.length
        // Página cheia = provavelmente tem mais. Página curta = acabou.
        setHasMore(page.length >= pageSize)
        setItems((prev) => {
          if (reset) return page
          const seen = new Set(prev.map(handlers.current.getId))
          return [...prev, ...page.filter((x) => !seen.has(handlers.current.getId(x)))]
        })
      } catch (err) {
        if (runId !== runIdRef.current) return
        setError(err instanceof Error ? err.message : handlers.current.errorMessage)
        setHasMore(false)
        if (reset) setItems([])
      } finally {
        if (runId === runIdRef.current) {
          setLoading(false)
          setLoadingMore(false)
          busyRef.current = false
        }
      }
    },
    [pageSize]
  )

  // Troca de filtro → volta pro começo.
  useEffect(() => {
    if (!enabled) return
    offsetRef.current = 0
    setHasMore(true)
    load(true)
  }, [filterKey, enabled, load])

  // Sentinela. `items.length` nas deps é intencional: o observer só dispara na
  // TRANSIÇÃO de visibilidade, então depois de anexar uma página ele precisa
  // ser recriado pra reavaliar (caso o sentinela ainda esteja em cena).
  useEffect(() => {
    if (!enabled || !hasMore || loading) return
    const el = sentinelRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) load(false)
      },
      { root: rootRef?.current ?? null, rootMargin: "600px 0px" }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [enabled, hasMore, loading, items.length, load, rootRef])

  return { items, loading, loadingMore, error, hasMore, sentinelRef }
}
