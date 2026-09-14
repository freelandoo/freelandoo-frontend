// scripts/check-site-template.mjs
//
// Exercita a lógica pura do tema `oficina-local` (mig 241) e confere o ESPELHO
// com o normalizador do backend.
//
// ⚠️ POR QUE ESTE SCRIPT EXISTE. Três coisas aqui falham SEM SINTOMA:
//
//   1. O host do link de WhatsApp. O contador do painel de Indicadores
//      reconhece o clique pelo HOST (`wa.me`). Trocá-lo por um encurcador
//      abriria a conversa igual e pararia de contar — e o painel diria "zero
//      cliques", que é pior do que não dizer, porque parece dado.
//
//   2. A ORDEM de busca de uma sub-página. Serviços e cidades dividem um
//      namespace de endereços, e o backend deduplica GLOBALMENTE com o serviço
//      vencendo. Se o front procurasse cidade primeiro, o endereço abriria a
//      página que o backend descartou — sem erro, e diferente do que foi
//      escrito.
//
//   3. O ESPELHO. Campo declarado só no backend chega e ninguém desenha;
//      declarado só no tipo do front, chega sempre `undefined` porque o
//      normalizador descartou. Nos dois casos a tela fica correta e o dado some.
//
// Roda os MÓDULOS DE VERDADE, transpilados com o TypeScript do próprio projeto.
// Uma cópia da lógica aqui dentro não provaria nada sobre o que está no ar.
//
//   node scripts/check-site-template.mjs

import fs from "node:fs"
import path from "node:path"
import os from "node:os"
import { createRequire } from "node:module"
import { fileURLToPath } from "node:url"
import ts from "typescript"

const here = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(here, "..")
const DIR = path.join(root, "components", "site-templates", "oficina-local")

let pass = 0
const fails = []
function check(label, cond) {
  // ⚠️ SÓ BOOLEANO. Este guard nasceu de um defeito REAL deste arquivo: as
  // comparações do espelho eram escritas como `lista.length === 0 || "faltando: x"`,
  // achando que o `||` daria a mensagem — e string não vazia é TRUTHY, então a
  // asserção passava sempre. Duas das quatro conferências do espelho estavam
  // mortas e diziam "ok". Teste que não sabe falhar é pior que teste nenhum.
  if (typeof cond !== "boolean") {
    throw new Error(`check("${label}") recebeu ${typeof cond} — só booleano`)
  }
  if (cond) {
    pass++
    console.log(`  ok  ${label}`)
  } else {
    fails.push(label)
    console.log(`  FAIL ${label}`)
  }
}

// ─── carrega os módulos reais ────────────────────────────────────────────────
//
// `lib.ts` e `pages.ts` só têm `import type`, então transpilar remove o import
// e os módulos ficam sem dependência nenhuma — é o que permite carregá-los
// soltos, fora do bundler.
const tmpdir = fs.mkdtempSync(path.join(os.tmpdir(), "fl-site-template-"))
async function load(name) {
  const js = ts.transpileModule(fs.readFileSync(path.join(DIR, `${name}.ts`), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  }).outputText
  const file = path.join(tmpdir, `${name}.mjs`)
  fs.writeFileSync(file, js, "utf8")
  return import(`file://${file.split(path.sep).join("/")}`)
}

const lib = await load("lib")
const pages = await load("pages")

// ─── dados de exercício ──────────────────────────────────────────────────────
const business = {
  name: "Ricardo Fogões",
  owner: "Ricardo",
  whatsappNumber: "5519994957125",
  phoneE164: "+5519994957125",
  phoneDisplay: "(19) 99495-7125",
}
const svc = (slug, extra = {}) => ({ slug, label: slug, related: [], ...extra })
const city = (slug, extra = {}) => ({ slug, name: slug, uf: "SP", isBase: false, ...extra })

const data = {
  business,
  services: [
    svc("conserto", { related: ["reforma", "nao-existe", "conserto"] }),
    svc("reforma"),
    svc("limpeza"),
  ],
  cities: [city("aguai", { isBase: true }), city("casa-branca"), city("mogi-guacu")],
  reviews: [],
  faq: [],
  googleProfileUrl: "",
  waDefault: "Olá! Vim pelo site.",
}

const links = {
  origin: "https://ricardofogoes.com.br",
  communityId: "c1",
  home: "/",
  pageBase: "/pagina",
  booking: null,
}

// ─── 1. o link do WhatsApp ───────────────────────────────────────────────────
console.log("\n# o link do WhatsApp")
{
  const url = new URL(lib.waLink(business, "Olá"))
  check("host é wa.me — é ele que o contador de Indicadores reconhece", url.host === "wa.me")
  check("o número vai no caminho", url.pathname === "/5519994957125")
  check("a mensagem vai escrita", url.searchParams.get("text") === "Olá")

  check(
    "mensagem vazia NÃO vira ?text= — abriria o WhatsApp com uma linha em branco",
    lib.waLink(business, "") === "https://wa.me/5519994957125"
  )
  check(
    "mensagem só de espaços também não",
    lib.waLink(business, "   ") === "https://wa.me/5519994957125"
  )
  check(
    "número com máscara é limpo antes de virar link",
    lib.waLink({ whatsappNumber: "+55 (19) 99495-7125" }, "").endsWith("/5519994957125")
  )
  check(
    "sem número devolve null — sem botão, nunca um botão que abre o nada",
    lib.waLink({ whatsappNumber: "" }, "oi") === null
  )
}

// ─── 2. a mensagem de cada página ────────────────────────────────────────────
console.log("\n# a mensagem de cada página")
{
  check("a da página vence", lib.waMessageFor(data, "Quero reforma") === "Quero reforma")
  check("sem a da página, a do site", lib.waMessageFor(data, "") === "Olá! Vim pelo site.")
  check(
    "sem nenhuma, uma frase com o nome do negócio — melhor que conversa em branco",
    lib.waMessageFor({ ...data, waDefault: "" }, "").includes("Ricardo Fogões")
  )
  check(
    "sem nome e sem padrão, vazio (e aí o link sai sem ?text=)",
    lib.waMessageFor({ business: { name: "" }, waDefault: "" }, "") === ""
  )
}

// ─── 3. o telefone ───────────────────────────────────────────────────────────
console.log("\n# o telefone")
{
  check("tel: prefere o E164", lib.telHref(business) === "tel:+5519994957125")
  check(
    "sem E164 cai no número do WhatsApp",
    lib.telHref({ whatsappNumber: "5519994957125" }) === "tel:+5519994957125"
  )
  check("sem nenhum devolve null", lib.telHref({}) === null)
}

// ─── 4. os endereços ─────────────────────────────────────────────────────────
console.log("\n# os endereços")
{
  check("pageHref sai do links.pageBase", lib.pageHref(links, "aguai") === "/pagina/aguai")
  check(
    "no endereço da plataforma o prefixo é outro — e o tema não escreve nenhum à mão",
    lib.pageHref({ ...links, pageBase: "/c/padaria/pagina" }, "aguai") ===
      "/c/padaria/pagina/aguai"
  )
}

// ─── 5. a cidade-sede ────────────────────────────────────────────────────────
console.log("\n# a cidade-sede")
{
  check("a marcada vence", lib.baseCity(data).slug === "aguai")
  check(
    "sem marcada, a primeira",
    lib.baseCity({ cities: [city("x"), city("y")] }).slug === "x"
  )
  check(
    "sem cidade nenhuma devolve null — a frase some em vez de dizer 'em undefined'",
    lib.baseCity({ cities: [] }) === null
  )
}

// ─── 6. a assinatura da marca ────────────────────────────────────────────────
console.log("\n# a assinatura da marca")
{
  const duas = lib.brandLines("Ricardo Fogões")
  check("primeira palavra em cima", duas.top === "Ricardo")
  check("o resto embaixo", duas.bottom === "Fogões")
  const tres = lib.brandLines("Oficina do Zé")
  check("três palavras: só a primeira sobe", tres.top === "Oficina" && tres.bottom === "do Zé")
  check(
    "uma palavra deixa a segunda linha vazia — quem desenha omite",
    lib.brandLines("Marcenaria").bottom === ""
  )
  check("nome vazio não quebra", lib.brandLines("").top === "")
}

// ─── 7. a página pedida ──────────────────────────────────────────────────────
console.log("\n# a página pedida")
{
  const s = pages.resolveOficinaPage(data, "conserto")
  check("serviço é achado", s?.kind === "service" && s.service.slug === "conserto")
  const c = pages.resolveOficinaPage(data, "aguai")
  check("cidade é achada", c?.kind === "city" && c.city.slug === "aguai")
  check("endereço inexistente devolve null (a rota dá 404)", pages.resolveOficinaPage(data, "x") === null)
  check("slug vazio devolve null", pages.resolveOficinaPage(data, "") === null)
  check("documento nulo devolve null", pages.resolveOficinaPage(null, "aguai") === null)

  // ⚠️ O caso que amarra os dois lados: o backend deduplica GLOBALMENTE com o
  // serviço vencendo, então uma cidade de slug colidente NUNCA chega. Se o
  // front procurasse cidade primeiro, um documento antigo com a colisão abriria
  // a página que o backend descartou.
  const colidido = {
    ...data,
    services: [svc("instalacao")],
    cities: [city("instalacao")],
  }
  const dis = pages.resolveOficinaPage(colidido, "instalacao")
  check(
    "colisão serviço×cidade: o SERVIÇO ganha, na mesma ordem do dedupe do backend",
    dis?.kind === "service"
  )
}

// ─── 8. veja também ──────────────────────────────────────────────────────────
console.log("\n# veja também")
{
  const rel = pages.relatedServices(data, data.services[0])
  check("aponta o que existe", rel.map((r) => r.slug).join(",") === "reforma")
  check(
    "ponteiro pendente é IGNORADO — apagar um serviço não derruba a página dos outros",
    !rel.some((r) => r.slug === "nao-existe")
  )
  check("a própria página nunca aparece na lista", !rel.some((r) => r.slug === "conserto"))
  check("sem `related` devolve lista vazia", pages.relatedServices(data, data.services[1]).length === 0)
}

// ─── 9. as outras cidades ────────────────────────────────────────────────────
console.log("\n# as outras cidades")
{
  const outras = pages.otherCities(data, data.cities[0])
  check("lista as outras", outras.map((c) => c.slug).join(",") === "casa-branca,mogi-guacu")
  check("nunca a si mesma", !outras.some((c) => c.slug === "aguai"))
}

// ─── 10. o ESPELHO com o backend ─────────────────────────────────────────────
//
// O normalizador do backend não tem uma única dependência, então dá para
// carregá-lo daqui e comparar o que ele DEVOLVE com o que o tipo do front
// DECLARA. É o único jeito de pegar o campo que entrou num lado só.
console.log("\n# o espelho com o backend")
{
  const BACK = path.join(root, "..", "..", "freelandoo-backend", "src", "utils", "siteTemplates.js")
  if (!fs.existsSync(BACK)) {
    console.log("  --  backend não está ao lado deste repositório: espelho não conferido")
  } else {
    const require_ = createRequire(import.meta.url)
    const { normalizeTemplateData } = require_(BACK)
    const out = normalizeTemplateData("oficina-local", {}).data

    // Os nomes que o TIPO do front declara, lidos do próprio arquivo.
    const src = fs.readFileSync(path.join(root, "types", "site-template.ts"), "utf8")
    const sf = ts.createSourceFile("t.ts", src, ts.ScriptTarget.ES2022, true)
    const declared = {}
    sf.forEachChild((node) => {
      if (!ts.isTypeAliasDeclaration(node) || !ts.isTypeLiteralNode(node.type)) return
      declared[node.name.text] = node.type.members
        .filter(ts.isPropertySignature)
        .map((m) => m.name.getText(sf))
    })

    const par = [
      ["OficinaLocalData", out],
      ["TemplateBusiness", out.business],
    ]
    for (const [tipo, obj] of par) {
      const doTipo = new Set(declared[tipo] || [])
      const doBack = Object.keys(obj)
      const faltando = doBack.filter((k) => !doTipo.has(k))
      const sobrando = [...doTipo].filter((k) => !doBack.includes(k))
      check(
        `${tipo}: todo campo do backend está no tipo (senão ninguém desenha)` +
          (faltando.length ? ` — faltando no tipo: ${faltando.join(", ")}` : ""),
        faltando.length === 0
      )
      check(
        `${tipo}: todo campo do tipo existe no backend (senão chega undefined)` +
          (sobrando.length ? ` — só no tipo: ${sobrando.join(", ")}` : ""),
        sobrando.length === 0
      )
    }

    // E o campo que esta entrega acrescentou, ponta a ponta.
    check("heroPhoto atravessa o normalizador", "heroPhoto" in out.business)
    const sujo = normalizeTemplateData("oficina-local", {
      business: { heroPhoto: "javascript:alert(1)" },
    }).data
    check(
      "heroPhoto perigoso vira vazio — ela termina num src no domínio do cliente",
      sujo.business.heroPhoto === ""
    )
  }
}

// ───────────────────────────────────────────────────────────────────────────
// O ESPELHO DO TEMA AUTORAL `ecoluz` COM O RESUMO DO BACKEND
//
// ⚠️ O DEFEITO QUE ISTO PEGA É SILENCIOSO E CARO. O modal que o cliente lê
// ANTES de aceitar a troca do site dele é montado por `summarizeEcoluz`, no
// backend — uma lista ESCRITA À MÃO, porque num tema autoral o conteúdo mora
// no código do front e o backend não o enxerga. Acrescentar uma página ao tema
// e esquecer daquela lista faz o modal prometer um site com uma página a menos
// (ou a mais), e a pessoa aceita uma coisa e recebe outra. Nada estoura.
//
// ⚠️ E O NAMESPACE DE ENDEREÇO É UM SÓ: serviços, áreas e páginas fixas
// dividem `/pagina/<slug>`. Dois iguais fariam o endereço abrir um deles pela
// ordem do array — invisível para quem escreveu. O tema já trava isso no
// import (`assertNoSlugClash`), e aqui a trava é conferida de fora.
{
  console.log("\n# o espelho do tema `ecoluz` com o resumo do backend")

  const ECO = path.join(root, "components", "site-templates", "ecoluz")
  const read = (f) => fs.readFileSync(path.join(ECO, f), "utf8")

  // Os slugs saem do FONTE, e não de um import: `content/services.ts` e
  // `content/areas.ts` importam o tipo dos ícones, e transpilar a cadeia
  // inteira para colher uma lista de strings seria caro sem ser mais verdade.
  const slugsOf = (src) => [...src.matchAll(/^\s{4}slug: "([a-z0-9-]+)",$/gm)].map((m) => m[1])

  const servicos = slugsOf(read("content/services.ts"))
  const areas = slugsOf(read("content/areas.ts"))
  const fixas = [...read("lib.ts").matchAll(/^\s{2}\w+: "([a-z0-9-]+)",$/gm)].map((m) => m[1])

  check("o tema declara 5 serviços", servicos.length === 5)
  check("o tema declara 4 áreas", areas.length === 4)
  check("o tema declara 4 páginas fixas", fixas.length === 4)

  const doTema = [...servicos, ...areas, ...fixas].sort()
  check("nenhum endereço repetido — o namespace `/pagina` é UM só", new Set(doTema).size === doTema.length)

  // ⚠️ SEM O BACKEND AO LADO, AS ASSERÇÕES DO ESPELHO SÃO PULADAS, não
  // falhadas — mesma escolha do bloco acima. Este repositório é clonado
  // sozinho (worktree de validação, CI do front), e um teste que fica
  // vermelho por AUSÊNCIA DE AMBIENTE é um teste que as pessoas aprendem a
  // ignorar — e aí ele para de proteger no dia em que falhar de verdade. O
  // que é só do tema (as contagens e o namespace, acima) continua conferido.
  const BACK = path.join(root, "..", "..", "freelandoo-backend", "src", "utils", "siteTemplates.js")
  if (!fs.existsSync(BACK)) {
    console.log("  --  backend não está ao lado: o espelho do resumo não foi conferido")
  } else {
    const require_ = createRequire(import.meta.url)
    const resumo = require_(BACK).summarizeTemplateData("ecoluz", {})
    check("o backend sabe resumir o tema (sem isto o modal cai em 'Seu negócio · 1 página')", !!resumo)

    const doResumo = (resumo?.pages || []).map((p) => p.slug).sort()
    check(
      "os endereços do tema batem com os do resumo que o cliente lê",
      JSON.stringify(doTema) === JSON.stringify(doResumo)
    )
    if (JSON.stringify(doTema) !== JSON.stringify(doResumo)) {
      console.log("      tema  :", doTema.join(", "))
      console.log("      resumo:", doResumo.join(", "))
    }

    // A home entra na conta: dizer "13 páginas" e listar 14 faria o cliente
    // procurar a que sobra.
    check("counts.pages = páginas + 1 (a home)", resumo?.counts?.pages === doResumo.length + 1)

    // Este site não publica preço em lugar nenhum — ver a nota no tema e no
    // JSON-LD. Um preço aparecendo no resumo seria o primeiro sinal de que
    // alguém ligou a vitrine do cadastro nele.
    check("o resumo não carrega preço", !JSON.stringify(resumo).includes("price"))
    check("hasPhoto é false, e é verdade: o site é tipográfico", resumo?.hasPhoto === false)
  }
}

fs.rmSync(tmpdir, { recursive: true, force: true })

console.log(`\n${pass} passaram, ${fails.length} falharam`)
if (fails.length) {
  fails.forEach((f) => console.log(`  - ${f}`))
  process.exit(1)
}
