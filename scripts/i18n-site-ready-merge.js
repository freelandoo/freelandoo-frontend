// scripts/i18n-site-ready-merge.js
// O SITE PRONTO (mig 241): o botão e o painel ao lado de "Páginas", no
// construtor — o estado do site gerenciado e a conversão do site do construtor.
//
// Tudo MERGE (fill-if-absent): são chaves que não existiam. Nada a sobrescrever
// — nenhum texto de antes mudou de significado.
//
// Idempotente: rodar de novo não muda mais nada.
const fs = require("fs")
const path = require("path")

const DIR = path.join(__dirname, "..", "messages")
const LOCALES = ["pt-BR", "en", "es"]

/** ns → chave → [pt, en, es] — só entram se a chave AINDA NÃO existir. */
const MERGE = {
  CommunitySite: {
    readyButton: ["Site pronto", "Ready-made site", "Sitio listo"],
    readyTitle: ["Site pronto", "Ready-made site", "Sitio listo"],

    // ─── o que é, para quem não administra ─────────────────────────────────
    readyPitchLead: [
      "Além do construtor, que é seu, existe o site pronto: desenhado pela Freelandoo, com uma página por serviço e uma por cidade atendida — que é o que responde em busca local.",
      "Beyond the builder, which is yours, there is the ready-made site: designed by Freelandoo, with one page per service and one per city you serve — which is what shows up in local search.",
      "Además del constructor, que es tuyo, existe el sitio listo: diseñado por Freelandoo, con una página por servicio y una por ciudad atendida — que es lo que responde en la búsqueda local.",
    ],
    readyPitchBody: [
      "O site pronto é montado e mantido pela gente a partir do que você já escreveu aqui. Enquanto ele estiver ligado, a edição fica com a Freelandoo — e desligar devolve o seu site do construtor exatamente como ele estava.",
      "The ready-made site is built and kept by us from what you have already written here. While it is on, editing stays with Freelandoo — and turning it off gives your builder site back exactly as it was.",
      "El sitio listo lo montamos y mantenemos nosotros a partir de lo que ya escribiste aquí. Mientras esté activo, la edición queda con Freelandoo — y desactivarlo devuelve tu sitio del constructor tal como estaba.",
    ],
    readyPitchHow: [
      "Fale com a gente pelo suporte para pedir o seu.",
      "Talk to us through support to request yours.",
      "Habla con nosotros por soporte para pedir el tuyo.",
    ],

    // ─── estado ────────────────────────────────────────────────────────────
    readyLoading: ["Lendo o site…", "Reading the site…", "Leyendo el sitio…"],
    readyOn: ["Este site está no tema", "This site uses the theme", "Este sitio usa el tema"],
    readyNoAddress: [
      "Ainda não publicado — o endereço só é criado ao publicar.",
      "Not published yet — the address is only created when you publish.",
      "Aún no publicado — la dirección solo se crea al publicar.",
    ],
    readyPublish: ["Publicar", "Publish", "Publicar"],
    readyUnpublish: ["Tirar do ar", "Take offline", "Quitar del aire"],
    readyRelease: [
      "Devolver ao construtor",
      "Give back to the builder",
      "Devolver al constructor",
    ],
    readyReleaseHint: [
      "Devolver não apaga nada: o site do construtor volta exatamente como estava, e a edição volta para o cliente.",
      "Giving it back erases nothing: the builder site returns exactly as it was, and editing goes back to the client.",
      "Devolverlo no borra nada: el sitio del constructor vuelve tal como estaba, y la edición regresa al cliente.",
    ],

    // ─── a conversão ───────────────────────────────────────────────────────
    readyDraftLead: [
      "Isto é o que o tema vai mostrar, lido do site que já está montado aqui. Nada é gravado até você ligar.",
      "This is what the theme will show, read from the site already built here. Nothing is saved until you turn it on.",
      "Esto es lo que el tema va a mostrar, leído del sitio ya montado aquí. Nada se guarda hasta que lo actives.",
    ],
    readyConverting: ["Convertendo…", "Converting…", "Convirtiendo…"],
    readyCountServices: ["Serviços", "Services", "Servicios"],
    readyCountCities: ["Cidades", "Cities", "Ciudades"],
    readyCountFaq: ["Perguntas", "Questions", "Preguntas"],
    readyCountReviews: ["Depoimentos", "Testimonials", "Testimonios"],
    readyBusiness: ["Negócio", "Business", "Negocio"],
    readyPhone: ["Telefone", "Phone", "Teléfono"],
    readyCity: ["Cidade", "City", "Ciudad"],
    readyPhoto: ["Foto do banner", "Banner photo", "Foto del banner"],
    readyYes: ["sim", "yes", "sí"],
    readyNo: ["não", "no", "no"],
    readyApply: ["Ligar o site pronto", "Turn the ready-made site on", "Activar el sitio listo"],
    readyApplyHint: [
      "Ligar troca o que o endereço público vai desenhar e tira a edição do cliente. Não apaga o site do construtor, e dá para devolver a qualquer momento.",
      "Turning it on changes what the public address will draw and takes editing away from the client. It does not erase the builder site, and you can give it back at any time.",
      "Activarlo cambia lo que la dirección pública va a dibujar y le quita la edición al cliente. No borra el sitio del constructor, y puedes devolverlo cuando quieras.",
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

console.log(`i18n-site-ready-merge: ${added} chaves adicionadas`)
