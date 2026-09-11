// scripts/check-site-chrome.mjs
//
// Exercita a CASCA do site (barra, rodapé e botão flutuante) quando a pilha na
// tela é a de uma SUB-PÁGINA (mig 238).
//
// ⚠️ POR QUE ESTE SCRIPT EXISTE: a casca é DERIVADA do documento — WhatsApp e
// redes saem da seção de contato, que existe só na HOME. Quem monta o canvas
// entrega `config` com `sections` trocadas pelas da página, então dentro de uma
// sub-página o contato era procurado na pilha errada e não era achado. Não há
// erro: a peça simplesmente NÃO é desenhada. Somem o botão de WhatsApp da
// barra, as redes do rodapé e o botão flutuante — na página de cidade, que é a
// que responde em busca local e por onde o cliente chega.
//
// O invariante é conferido nos DOIS sentidos: com `homeSections` o número
// aparece, e sem ele (o defeito de volta) some. Leitura de código não pega isso.
//
// Roda o MÓDULO DE VERDADE (`site-chrome.tsx`), transpilado com o TypeScript do
// próprio projeto. Uma cópia da lógica aqui dentro não provaria nada sobre o
// que está em produção.
//
//   node scripts/check-site-chrome.mjs

import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import Module, { createRequire } from "node:module"
import { fileURLToPath } from "node:url"
import ts from "typescript"

const here = path.dirname(fileURLToPath(import.meta.url))
const B = path.join(
  here,
  "..",
  "app",
  "(header-only)",
  "comunidades",
  "[id]",
  "_components",
  "site-builder"
)
const require_ = createRequire(import.meta.url)
const tmpdir = fs.mkdtempSync(path.join(os.tmpdir(), "fl-site-chrome-"))

function transpile(src, name) {
  const js = ts.transpileModule(fs.readFileSync(src, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      // JSX clássico: vira React.createElement, que o stub de react atende.
      jsx: ts.JsxEmit.React,
    },
  }).outputText
  const out = path.join(tmpdir, name)
  fs.writeFileSync(out, js, "utf8")
  return out
}

const contentMod = transpile(path.join(B, "section-content.ts"), "section-content.cjs")
const chromeMod = transpile(path.join(B, "site-chrome.tsx"), "site-chrome.cjs")

// `site-chrome` é um componente client. Para chamar só o HOOK, o que ele
// importa vira stub — `useMemo` roda a função na hora, que é o que o hook faz.
// `section-content` entra de VERDADE: é a régua de "a seção tem conteúdo?", e é
// ela que decide se o contato conta.
const STUBS = {
  react: {
    useMemo: (fn) => fn(),
    useState: (v) => [typeof v === "function" ? v() : v, () => {}],
    useEffect: () => {},
    createElement: () => null,
    Fragment: Symbol("Fragment"),
  },
  "lucide-react": new Proxy({}, { get: () => () => null }),
  "./editable": { InlineText: () => null },
  "./site-runtime": {
    isExternalHref: (u) => /^https?:\/\//i.test(u || ""),
    useSiteHref: (u) => u || "",
  },
  "./section-content": require_(contentMod),
}
const realLoad = Module._load
Module._load = function (req, parent) {
  if (parent && parent.filename === chromeMod && req in STUBS) return STUBS[req]
  // Os `import type` somem na transpilação; o que sobrar é inofensivo.
  if (req.startsWith("@/types/")) return {}
  return realLoad.apply(this, arguments)
}
const { useSiteChromeInfo, whatsappHref } = require_(chromeMod)
Module._load = realLoad

let pass = 0
const fails = []
function check(label, cond) {
  if (cond) {
    pass++
    console.log(`  ok  ${label}`)
  } else {
    fails.push(label)
    console.log(`  FAIL ${label}`)
  }
}

const WA = "5519994957125"

const about = (id, title) => ({
  id,
  kind: "about",
  enabled: true,
  title,
  subtitle: "",
  data: { body: "texto", photos: [], highlights: [] },
})
const hero = (id, ctaText, ctaUrl) => ({
  id,
  kind: "hero",
  enabled: true,
  title: "",
  subtitle: "",
  data: {
    height: "short",
    autoplay: false,
    slides: [
      {
        imageUrl: "",
        objectPosition: "center",
        headline: "h",
        subheadline: "s",
        ctaText,
        ctaUrl,
        ctaSecondaryText: "",
        ctaSecondaryUrl: "",
      },
    ],
  },
})
const contact = (whatsapp = WA) => ({
  id: "c1",
  kind: "contact",
  enabled: true,
  title: "Contato",
  subtitle: "",
  data: {
    whatsapp,
    email: "",
    phone: "",
    address: "",
    hours: "",
    socials: [{ id: "s1", label: "Instagram", url: "https://instagram.com/x" }],
  },
})

/** Home com contato; duas sub-páginas SEM contato — é o caso que quebrava. */
function doc() {
  return {
    siteName: "Ricardo",
    tagline: "t",
    theme: { primary: "#111111" },
    textStyles: {},
    sections: [hero("h0", "Orcamento", "https://wa.me/1"), about("a0", "Sobre"), contact()],
    pages: [
      {
        id: "p1",
        slug: "aguai",
        title: "Aguai",
        subtitle: "",
        enabled: true,
        sections: [hero("ph", "Falar agora", "https://wa.me/2"), about("pa", "Atendimento em Aguai")],
      },
      {
        id: "p2",
        slug: "mogi",
        title: "Mogi",
        subtitle: "",
        enabled: true,
        sections: [about("ma", "Atendimento em Mogi")],
      },
    ],
  }
}

const CTX = { serviceCount: 3 }
const nav = (activePageSlug, pages) => ({
  pages,
  activePageSlug,
  pageBase: "/c/x/pagina",
  homeHref: "/c/x",
  homeLabel: "Inicio",
})
const onPage = (d, page, homeSections) =>
  useSiteChromeInfo({ ...d, sections: page.sections }, false, CTX, nav(page.slug, d.pages), homeSections)

// ─── A home não pode ter mudado ─────────────────────────────────────────────
console.log("\nhome")
{
  const d = doc()
  const info = useSiteChromeInfo(d, false, CTX, nav(null, d.pages))
  check("WhatsApp da home", info.whatsapp === WA)
  check("link do wa.me montado", whatsappHref(info.whatsapp).startsWith("https://wa.me/"))
  check("redes da home", info.socials.length === 1)
  check("acao herdada do banner da home", info.action?.url === "https://wa.me/1")
  check("sem item de volta na home", !info.navItems.some((i) => i.id === "page:home"))
  check("as sub-paginas entram no menu", info.navItems.filter((i) => i.id.startsWith("page:")).length === 2)
}

// ─── A regressão que justifica o arquivo ────────────────────────────────────
console.log("\nsub-pagina: o contato vem da HOME")
{
  const d = doc()
  for (const page of d.pages) {
    check(
      `${page.slug}: a pagina nao tem contato (e o caso que quebrava)`,
      !page.sections.some((s) => s.kind === "contact")
    )

    const info = onPage(d, page, d.sections)
    check(`${page.slug}: WhatsApp da casca`, info.whatsapp === WA)
    check(
      `${page.slug}: botao flutuante desenhavel`,
      whatsappHref(info.whatsapp).startsWith("https://wa.me/")
    )
    check(`${page.slug}: redes do rodape`, info.socials.length === 1)
    check(`${page.slug}: menu volta para a home`, info.navItems[0]?.id === "page:home")
    check(
      `${page.slug}: nao e link para si mesma`,
      !info.navItems.some((i) => i.href?.endsWith(`/${page.slug}`))
    )
    check(
      `${page.slug}: menu tem ancora da propria pagina`,
      info.navItems.some((i) => !i.id.startsWith("page:"))
    )

    // ⚠️ O defeito de volta: sem `homeSections` o número some, em silêncio.
    const antes = onPage(d, page, undefined)
    check(`${page.slug}: SEM homeSections o WhatsApp some (o defeito)`, antes.whatsapp === "")
    check(`${page.slug}: SEM homeSections as redes somem (o defeito)`, antes.socials.length === 0)
  }
}

// ─── A ação: da página quando ela tem banner, da home quando não tem ────────
console.log("\nacao do banner")
{
  const d = doc()
  check("pagina com banner usa o CTA DELA", onPage(d, d.pages[0], d.sections).action?.url === "https://wa.me/2")
  check("pagina sem banner herda a acao da home", onPage(d, d.pages[1], d.sections).action?.url === "https://wa.me/1")
}

// ─── As âncoras continuam sendo da página aberta ────────────────────────────
console.log("\nancoras")
{
  const d = doc()
  const ancoras = onPage(d, d.pages[0], d.sections)
    .navItems.filter((i) => !i.id.startsWith("page:"))
    .map((i) => i.label)
  check("ancora e o titulo da secao DA PAGINA", ancoras.includes("Atendimento em Aguai"))
  check("ancora da home nao vaza para a sub-pagina", !ancoras.includes("Sobre"))
  check("o contato da home nao vira ancora da sub-pagina", !ancoras.includes("Contato"))
}

// ─── Contato desligado ou vazio continua significando "sem botão" ───────────
console.log("\ncontato desligado ou vazio")
{
  const d = doc()
  const off = {
    ...d,
    sections: d.sections.map((s) => (s.kind === "contact" ? { ...s, enabled: false } : s)),
  }
  check("contato desligado: sem WhatsApp", onPage(off, off.pages[0], off.sections).whatsapp === "")

  const vazio = { ...d, sections: d.sections.map((s) => (s.kind === "contact" ? contact("") : s)) }
  check("contato sem numero: sem WhatsApp", onPage(vazio, vazio.pages[0], vazio.sections).whatsapp === "")
}

// ─── Documento antigo, sem sub-página ───────────────────────────────────────
console.log("\ndocumento sem pages")
{
  const d = { ...doc(), pages: [] }
  const info = useSiteChromeInfo(d, false, CTX, nav(null, []))
  check("segue lendo o contato", info.whatsapp === WA)
  check("menu sem item de pagina", info.navItems.every((i) => !i.id.startsWith("page:")))
}

fs.rmSync(tmpdir, { recursive: true, force: true })

console.log(`\n${pass} passaram, ${fails.length} falharam`)
if (fails.length) {
  fails.forEach((f) => console.log(`  - ${f}`))
  process.exit(1)
}
