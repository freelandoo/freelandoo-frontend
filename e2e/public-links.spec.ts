import { test, expect, type Page } from "@playwright/test"
import { PUBLIC_ROUTES, ROUTES } from "../lib/routes"

// Texto que indica falha de renderização (overlay de erro do Next / 404 / 500).
const ERROR_PATTERNS =
  /Application error|Internal Server Error|This page could not be found|500 - Internal|404 - This page/i

/**
 * 1) Cada rota pública precisa responder sem 404/500 e renderizar sem erro.
 */
for (const route of PUBLIC_ROUTES) {
  test(`rota pública ${route} responde sem erro`, async ({ page }) => {
    const res = await page.goto(route, { waitUntil: "domcontentloaded" })
    expect(res, `sem resposta HTTP para ${route}`).toBeTruthy()
    const status = res!.status()
    expect(status, `status ${status} em ${route}`).toBeLessThan(400)

    const body = (await page.locator("body").innerText().catch(() => "")) || ""
    expect(ERROR_PATTERNS.test(body), `erro de renderização em ${route}`).toBeFalsy()
  })
}

/**
 * 2) Links internos do header e do footer não podem quebrar. Coletamos os hrefs
 *    internos nas páginas com chrome completo (home + uma página institucional)
 *    e validamos cada um via request HTTP.
 */
const CHROME_PAGES = [ROUTES.home, ROUTES.helpCenter]

async function collectInternalLinks(page: Page): Promise<string[]> {
  return page.$$eval("a[href]", (anchors) =>
    anchors
      .map((a) => (a as HTMLAnchorElement).getAttribute("href") || "")
      // Só rotas internas absolutas, sem âncoras nem query.
      .filter((href) => href.startsWith("/") && !href.startsWith("//") && !href.startsWith("/#")),
  )
}

for (const chromePage of CHROME_PAGES) {
  test(`links internos de header/footer em ${chromePage} não quebram`, async ({ page, request }) => {
    await page.goto(chromePage, { waitUntil: "domcontentloaded" })
    const links = [...new Set(await collectInternalLinks(page))]
    expect(links.length, `nenhum link interno encontrado em ${chromePage}`).toBeGreaterThan(0)

    const broken: string[] = []
    for (const href of links) {
      const res = await request.get(href)
      if (res.status() >= 400) broken.push(`${href} → ${res.status()}`)
    }
    expect(broken, `links quebrados em ${chromePage}: ${broken.join(", ")}`).toEqual([])
  })
}
