// scripts/i18n-site-pages-merge.js
// Sub-páginas do site (mig 238): o construtor passou a criar páginas com
// endereço próprio, e com elas vieram duas seções novas — perguntas frequentes
// e áreas atendidas.
//
// Tudo MERGE (fill-if-absent): são chaves que não existiam. Nada a sobrescrever
// aqui — nenhum texto de antes mudou de significado.
//
// Idempotente: rodar de novo não muda mais nada.
const fs = require("fs")
const path = require("path")

const DIR = path.join(__dirname, "..", "messages")
const LOCALES = ["pt-BR", "en", "es"]

/** ns → chave → [pt, en, es] — só entram se a chave AINDA NÃO existir. */
const MERGE = {
  CommunitySite: {
    // ─── O painel de páginas ─────────────────────────────────────────────────
    pagesButton: ["Páginas", "Pages", "Páginas"],
    pagesTitle: ["Páginas do site", "Site pages", "Páginas del sitio"],
    pagesHint: [
      "Uma página por serviço ou por cidade atendida. Cada uma tem endereço próprio e aparece no menu do site.",
      "One page per service or per city you serve. Each gets its own address and shows up in the site menu.",
      "Una página por servicio o por ciudad atendida. Cada una tiene su dirección y aparece en el menú del sitio.",
    ],
    pageHome: ["Página inicial", "Home page", "Página de inicio"],
    pageCreate: ["Criar página", "Create page", "Crear página"],
    pageNewPlaceholder: [
      "Nome da página nova",
      "Name of the new page",
      "Nombre de la página nueva",
    ],
    pageTitleLabel: [
      "Título (aba e resultado de busca)",
      "Title (browser tab and search result)",
      "Título (pestaña y resultado de búsqueda)",
    ],
    pageSubtitleLabel: [
      "Descrição para o Google",
      "Description for Google",
      "Descripción para Google",
    ],
    pageSlugFrozen: [
      "O endereço não muda depois de criado: ele já pode estar publicado.",
      "The address stays as created: it may already be published.",
      "La dirección no cambia después de creada: ya puede estar publicada.",
    ],
    pageEnable: ["Colocar no ar", "Put online", "Poner en línea"],
    pageDisable: ["Tirar do ar", "Take offline", "Quitar de línea"],
    pageDelete: ["Apagar página", "Delete page", "Borrar página"],
    pageDeleteConfirm: ["Apagar a página", "Delete the page", "Borrar la página"],
    // Recusas. O backend descarta a página com endereço inválido ou reservado;
    // estas frases só adiantam a conversa, para o líder não descobrir depois.
    pageSlugInvalid: [
      "Esse nome não vira um endereço. Use letras ou números.",
      "That name can't become an address. Use letters or numbers.",
      "Ese nombre no genera una dirección. Usa letras o números.",
    ],
    pageSlugReserved: [
      "Esse endereço é usado pela plataforma. Escolha outro nome.",
      "That address is used by the platform. Pick another name.",
      "Esa dirección la usa la plataforma. Elige otro nombre.",
    ],
    pageSlugTaken: [
      "Já existe uma página nesse endereço.",
      "There's already a page at that address.",
      "Ya existe una página en esa dirección.",
    ],
    pageLimit: [
      "Este site já está no limite de páginas.",
      "This site has reached its page limit.",
      "Este sitio ya alcanzó el límite de páginas.",
    ],

    // ─── O menu da barra ─────────────────────────────────────────────────────
    // O item de volta, que só aparece quando o visitante está numa sub-página.
    navHome: ["Início", "Home", "Inicio"],

    // ─── Seções novas ────────────────────────────────────────────────────────
    sectionFaq: ["Perguntas frequentes", "Frequently asked questions", "Preguntas frecuentes"],
    sectionAreas: ["Áreas atendidas", "Service areas", "Áreas atendidas"],

    faqQuestion: [
      "A pergunta que te fazem",
      "The question people ask you",
      "La pregunta que te hacen",
    ],
    faqAnswer: [
      "A resposta, do jeito que você explicaria",
      "The answer, the way you'd explain it",
      "La respuesta, como se la explicarías",
    ],
    faqAdd: ["Nova pergunta", "New question", "Nueva pregunta"],
    faqRemove: ["Remover pergunta", "Remove question", "Quitar pregunta"],
    faqEmpty: ["Nenhuma pergunta ainda.", "No questions yet.", "Ninguna pregunta todavía."],

    areaName: ["Cidade ou bairro", "City or neighborhood", "Ciudad o barrio"],
    areaUf: ["UF", "State", "Provincia"],
    areaNote: [
      "Detalhe do atendimento (opcional)",
      "Service detail (optional)",
      "Detalle del servicio (opcional)",
    ],
    areaUrl: [
      "Destino: pagina:<endereço>, agendar ou um link",
      "Destination: pagina:<address>, agendar, or a link",
      "Destino: pagina:<dirección>, agendar o un enlace",
    ],
    areaSectionNote: [
      "Observação no rodapé da seção",
      "Note at the bottom of the section",
      "Nota al pie de la sección",
    ],
    areaAdd: ["Nova área", "New area", "Nueva área"],
    areaRemove: ["Remover área", "Remove area", "Quitar área"],
    areaEmpty: [
      "Nenhuma área atendida ainda.",
      "No service areas yet.",
      "Ninguna área atendida todavía.",
    ],
  },
}

let added = 0

LOCALES.forEach((loc, i) => {
  const file = path.join(DIR, `${loc}.json`)
  const dict = JSON.parse(fs.readFileSync(file, "utf8"))

  for (const [ns, keys] of Object.entries(MERGE)) {
    dict[ns] = dict[ns] || {}
    for (const [key, values] of Object.entries(keys)) {
      if (dict[ns][key] === undefined) {
        dict[ns][key] = values[i]
        added++
      }
    }
  }

  fs.writeFileSync(file, `${JSON.stringify(dict, null, 2)}\n`, "utf8")
})

console.log(`i18n-site-pages-merge: ${added} chaves adicionadas`)
