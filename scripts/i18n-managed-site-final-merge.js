// scripts/i18n-managed-site-final-merge.js
// O ACEITE VIRA DEFINITIVO e o construtor dá lugar a uma tela de gestão.
//
// Duas metades:
//
//   MERGE (fill-if-absent) — as chaves da tela nova do cliente (título da
//   barra, a faixa de quem mantém o site, "Abrir o site") e as da troca de
//   tema pelo admin, que não existiam.
//
//   OVERRIDE — chaves que passaram a MENTIR quando o aceite deixou de ter
//   volta. Dicionário vence fallback inline, então trocar só o texto do
//   componente não mudaria uma palavra na tela:
//
//     • swapEditWarn — dizia "ENQUANTO o site pronto estiver ligado", que
//                      promete um estado temporário. Não é mais: quem aceita
//                      entrega a escrita do site para sempre.
//     • swapKeepWarn — prometia, com todas as letras, "dá para voltar a
//                      editá-lo quando quiser". É a promessa que a mudança
//                      desfaz. A chave ficou órfã no componente (o <li> agora
//                      é `swapFinalWarn`), mas é sobrescrita mesmo assim: dict
//                      com texto vivo é o que ressuscita a frase no dia em que
//                      alguém reusar a chave sem ler o histórico.
//     • readyOnClient — "O seu site é feito pela Freelandoo." continua certo,
//                       mas sozinho não diz que o conteúdo é pedido pelo
//                       suporte, que virou a única via.
//
// Idempotente: rodar de novo não muda mais nada.
const fs = require("fs")
const path = require("path")

const DIR = path.join(__dirname, "..", "messages")
const LOCALES = ["pt-BR", "en", "es"]

/** ns → chave → [pt, en, es] — só entram se a chave AINDA NÃO existir. */
const MERGE = {
  CommunitySite: {
    // ─── a tela do cliente (não há mais construtor aqui) ───────────────────
    managedScreenTitle: ["O seu site", "Your site", "Tu sitio"],
    managedScreenNotice: [
      "Este site é escrito e mantido pela Freelandoo. Publicar, tirar do ar e o endereço continuam com você; o conteúdo é com a gente — peça as alterações pelo suporte que a gente aplica.",
      "This site is written and maintained by Freelandoo. Publishing, taking it down and the address are still yours; the content is on us — ask support for changes and we apply them.",
      "Este sitio es escrito y mantenido por Freelandoo. Publicar, quitarlo del aire y la dirección siguen siendo tuyos; el contenido es cosa nuestra — pide los cambios al soporte y los aplicamos.",
    ],
    managedOpenSite: ["Abrir o site", "Open site", "Abrir el sitio"],

    // ─── o aceite não tem volta ────────────────────────────────────────────
    swapFinalWarn: [
      "Esta escolha não tem volta: o construtor deste perfil fecha e o site passa a ser escrito por nós. Se um dia você quiser montar um site por conta própria, será em outro perfil.",
      "This choice is final: the builder closes for this profile and we take over writing the site. If you ever want to build a site yourself, it will be on another profile.",
      "Esta elección no tiene vuelta: el constructor se cierra para este perfil y nosotros pasamos a escribir el sitio. Si algún día quieres armar un sitio por tu cuenta, será en otro perfil.",
    ],

    // ─── a plataforma troca o tema sem pedir nada ao cliente ───────────────
    readySwapTheme: ["Trocar o tema", "Change theme", "Cambiar el tema"],
    readySwapThemeHint: [
      "Troca na hora, sem pedir nada ao cliente — é o site que a gente mantém.",
      "Applies right away, nothing is asked of the client — this is the site we maintain.",
      "Cambia al instante, sin pedirle nada al cliente — es el sitio que mantenemos.",
    ],
    readyThemeCurrent: ["no ar agora", "live now", "en el aire ahora"],
  },
}

/** ns → chave → [pt, en, es] — SOBRESCREVE o que já existe. */
const OVERRIDE = {
  CommunitySite: {
    swapEditWarn: [
      "Depois de aceitar, quem escreve o site é a Freelandoo. Você pede as alterações e a gente aplica.",
      "Once you accept, Freelandoo writes the site. You ask for changes and we apply them.",
      "Después de aceptar, quien escribe el sitio es Freelandoo. Tú pides los cambios y nosotros los aplicamos.",
    ],
    swapKeepWarn: [
      "O site que você montou aqui não é apagado: ele fica guardado com a gente.",
      "The site you built here is not deleted: we keep it stored.",
      "El sitio que armaste aquí no se borra: queda guardado con nosotros.",
    ],
    readyOnClient: [
      "O seu site é escrito e mantido pela Freelandoo.",
      "Your site is written and maintained by Freelandoo.",
      "Tu sitio es escrito y mantenido por Freelandoo.",
    ],
  },
}

let added = 0
let replaced = 0

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

  for (const [ns, keys] of Object.entries(OVERRIDE)) {
    dict[ns] = dict[ns] || {}
    for (const [key, values] of Object.entries(keys)) {
      if (dict[ns][key] !== values[i]) {
        dict[ns][key] = values[i]
        replaced++
      }
    }
  }

  fs.writeFileSync(file, `${JSON.stringify(dict, null, 2)}\n`, "utf8")
})

console.log(
  `i18n-managed-site-final-merge: ${added} chaves adicionadas, ${replaced} sobrescritas`
)
