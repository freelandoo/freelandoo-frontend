// Submete as URLs do blog ao IndexNow (Bing, Yandex, Seznam, Naver...).
//
// O IndexNow é o único protocolo aberto de "submeter para indexação" via API.
// O Google NÃO usa IndexNow (para o Google, a indexação vem do sitemap +
// Search Console). Mas isso acelera a descoberta nos buscadores que aderiram.
//
// Pré-requisito: o arquivo de chave precisa estar acessível em
//   https://www.freelandoo.com.br/<KEY>.txt  (já está em public/).
//
// Uso:  node scripts/indexnow.mjs
//       BACKEND_API_URL=... SITE_ORIGIN=... node scripts/indexnow.mjs

const KEY = "35d3ae59d2b3fc88df995a771fcc96e9"
const SITE_ORIGIN = (process.env.SITE_ORIGIN || "https://www.freelandoo.com.br").replace(/\/$/, "")
const BACKEND =
  (process.env.BACKEND_API_URL || "https://freelandoo-backend-production.up.railway.app").replace(/\/$/, "")

async function fetchAllSlugs() {
  const slugs = []
  for (let page = 1; page <= 10; page++) {
    const qs = new URLSearchParams({ per_page: "48" })
    if (page > 1) qs.set("page", String(page))
    const res = await fetch(`${BACKEND}/blog/posts?${qs}`)
    if (!res.ok) break
    const data = await res.json()
    const posts = data.posts || []
    for (const p of posts) slugs.push(p.slug)
    if (posts.length < (data.per_page || 48)) break
  }
  return [...new Set(slugs)]
}

async function main() {
  const slugs = await fetchAllSlugs()
  const urlList = [`${SITE_ORIGIN}/blog`, ...slugs.map((s) => `${SITE_ORIGIN}/blog/${s}`)]
  console.log(`Submetendo ${urlList.length} URLs ao IndexNow...`)

  const host = new URL(SITE_ORIGIN).host
  const body = {
    host,
    key: KEY,
    keyLocation: `${SITE_ORIGIN}/${KEY}.txt`,
    urlList,
  }

  const res = await fetch("https://api.indexnow.org/indexnow", {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify(body),
  })

  console.log(`IndexNow respondeu: ${res.status} ${res.statusText}`)
  if (res.status === 200 || res.status === 202) {
    console.log("OK — URLs aceitas para indexação (Bing/Yandex/etc.).")
  } else {
    const text = await res.text().catch(() => "")
    console.log("Resposta:", text || "(vazio)")
    console.log(
      "Se deu 403/422, confira se a chave já está pública em " +
        `${SITE_ORIGIN}/${KEY}.txt (precisa do deploy do Vercel antes de re-rodar).`,
    )
    process.exitCode = 1
  }
}

main().catch((err) => {
  console.error("Falha:", err.message)
  process.exitCode = 1
})
