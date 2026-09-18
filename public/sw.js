// Service worker mínimo da Freelandoo.
// Objetivo: habilitar a instalação como PWA ("Adicionar à tela inicial") e dar
// um fallback offline básico — SEM cachear conteúdo dinâmico/autenticado.
//
// Estratégias:
//  - navegações (HTML): network-first, cai pra /offline.html se sem rede.
//  - estáticos imutáveis (/_next/static, /icons, ícones): cache-first.
//  - /api/*, cross-origin e métodos não-GET: passam direto (nunca cacheados).
//
// Bump CACHE_VERSION ao mudar a lista de precache ou a lógica abaixo.
//
// ⚠️ fl-v2 (2026-09-17) — O BUMP É O CONSERTO, NÃO A ARRUMAÇÃO. Até aqui
// `isImmutableStatic` casava QUALQUER imagem da origem pela extensão, e a
// estratégia é cache-first SEM revalidação: o arquivo entrava no cache na
// primeira visita e ficava lá para sempre. Como o caminho de uma imagem de
// conteúdo não muda quando o conteúdo muda, isso CONGELAVA a imagem para quem
// já tinha visitado — e o sintoma é o pior possível, porque o servidor está
// certo, os cabeçalhos estão certos e mesmo assim a pessoa vê o arquivo velho.
// Mordeu de verdade: os 120 quadros da abertura do site da EcoLuz ficaram
// presos, e quatro trocas de vídeo seguidas não apareceram para quem tinha
// aberto a página uma vez.
//
// O `activate` apaga todo cache cujo nome não comece pela versão atual, então
// trocar este número é o que limpa o que ficou preso nos navegadores.
const CACHE_VERSION = "fl-v2"
const STATIC_CACHE = `${CACHE_VERSION}-static`
const PRECACHE = ["/offline.html", "/icons/icon-192.png", "/icons/icon-512.png"]

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(PRECACHE)).then(() => self.skipWaiting()),
  )
})

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => !k.startsWith(CACHE_VERSION)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  )
})

// ⚠️ SÓ ENTRA AQUI O QUE É IMUTÁVEL DE VERDADE, ou seja: o que muda de ENDEREÇO
// quando muda de conteúdo. `/_next/static/` tem o hash do conteúdo no nome e
// `/icons/` são os ícones do PWA, que já vão no precache.
//
// ⚠️ NÃO VOLTAR A CASAR POR EXTENSÃO. Uma imagem de conteúdo (`/sites/...`, um
// banner, um arquivo do `public/`) mora num caminho ESTÁVEL: cache-first ali
// significa "a primeira versão que a pessoa viu é a única que ela verá". O
// resto agora cai na rede e obedece ao ETag, que é exatamente o trabalho do
// cache HTTP — e ele sabe revalidar, coisa que este SW não faz.
function isImmutableStatic(url) {
  return url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/")
}

self.addEventListener("fetch", (event) => {
  const { request } = event
  if (request.method !== "GET") return

  const url = new URL(request.url)
  // Só lida com same-origin; ignora API e qualquer cross-origin (R2, Stripe, etc.)
  if (url.origin !== self.location.origin) return
  if (url.pathname.startsWith("/api/")) return

  // Navegações (páginas): network-first + fallback offline.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() =>
        caches.match(request).then((cached) => cached || caches.match("/offline.html")),
      ),
    )
    return
  }

  // Estáticos imutáveis: cache-first.
  if (isImmutableStatic(url)) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((resp) => {
            if (resp.ok) {
              const copy = resp.clone()
              caches.open(STATIC_CACHE).then((cache) => cache.put(request, copy))
            }
            return resp
          }),
      ),
    )
  }
})
