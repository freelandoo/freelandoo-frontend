// scripts/i18n-managed-site-offer-merge.js
// A OFERTA DO SITE PRONTO (mig 242): o cliente vê o que está reservado para ele
// e aceita a troca num modal — mais a faixa que explica o construtor travado e
// os botões de reservar/retirar do lado da plataforma.
//
// Tudo MERGE (fill-if-absent): são chaves que não existiam. A única de antes
// que mudou de significado é `readyApply` — o botão que era "Ligar o site
// pronto" passou a conviver com "Reservar", e precisa dizer que ele NÃO
// pergunta nada ao cliente. Por isso ela entra em OVERRIDE: dicionário vence
// fallback inline, e trocar só o texto do componente não mudaria a tela.
//
// Idempotente: rodar de novo não muda mais nada.
const fs = require("fs")
const path = require("path")

const DIR = path.join(__dirname, "..", "messages")
const LOCALES = ["pt-BR", "en", "es"]

/** ns → chave → [pt, en, es] — só entram se a chave AINDA NÃO existir. */
const MERGE = {
  CommunitySite: {
    // ─── o cliente tem um site esperando ───────────────────────────────────
    readyWaitingLead: [
      "A Freelandoo montou um site pronto para o seu negócio. Ele fica esperando até você aceitar — nada muda no seu site antes disso.",
      "Freelandoo has built a ready-made site for your business. It waits until you accept — nothing changes on your site before that.",
      "Freelandoo montó un sitio listo para tu negocio. Se queda esperando hasta que lo aceptes — nada cambia en tu sitio antes de eso.",
    ],
    readyPagesCount: [
      "{n} páginas · uma por serviço e uma por cidade",
      "{n} pages · one per service and one per city",
      "{n} páginas · una por servicio y una por ciudad",
    ],
    readySeeSwap: ["Ver o site pronto", "See the ready-made site", "Ver el sitio listo"],
    // O rótulo do botão QUANDO há algo esperando. Chave própria e não um
    // sufixo colado no rótulo de sempre: em inglês e espanhol a palavra não
    // entra no mesmo lugar da frase.
    readyButtonWaiting: ["Site pronto · novo", "Ready-made site · new", "Sitio listo · nuevo"],


    // ─── o site já é feito por nós ─────────────────────────────────────────
    readyOnClient: [
      "O seu site é feito pela Freelandoo.",
      "Your site is made by Freelandoo.",
      "Tu sitio lo hace Freelandoo.",
    ],
    readyPagesLive: ["{n} páginas no ar", "{n} pages live", "{n} páginas en el aire"],
    readyAskChanges: [
      "Para mudar qualquer coisa, é só pedir pelo suporte que a gente aplica.",
      "To change anything, just ask through support and we apply it.",
      "Para cambiar cualquier cosa, pídelo por soporte y nosotros lo aplicamos.",
    ],
    readyBackToBuilder: [
      "Voltar a editar eu mesmo",
      "Go back to editing it myself",
      "Volver a editarlo yo mismo",
    ],
    readyBackHint: [
      "O seu site do construtor volta exatamente como estava, e o site pronto continua guardado — dá para ligá-lo de novo depois.",
      "Your builder site comes back exactly as it was, and the ready-made one stays saved — you can turn it back on later.",
      "Tu sitio del constructor vuelve tal como estaba, y el sitio listo sigue guardado — puedes activarlo de nuevo después.",
    ],

    // ─── a faixa do construtor travado ─────────────────────────────────────
    managedNotice: [
      "Este site é feito e mantido pela Freelandoo. Peça as alterações pelo suporte que a gente aplica — e, se quiser voltar a montar o seu, é no botão Site pronto aqui em cima.",
      "This site is made and kept by Freelandoo. Ask for changes through support and we apply them — and if you want to build your own again, use the Ready-made site button above.",
      "Este sitio lo hace y lo mantiene Freelandoo. Pide los cambios por soporte y nosotros los aplicamos — y si quieres volver a montar el tuyo, usa el botón Sitio listo de arriba.",
    ],

    // ─── o modal da troca ──────────────────────────────────────────────────
    swapEyebrow: ["Site pronto", "Ready-made site", "Sitio listo"],
    swapTitle: [
      "Trocar pelo seu site pronto?",
      "Switch to your ready-made site?",
      "¿Cambiar por tu sitio listo?",
    ],
    swapWhatLabel: ["O que entra no lugar", "What takes its place", "Lo que entra en su lugar"],
    swapNoName: ["Seu negócio", "Your business", "Tu negocio"],
    swapPagesCount: ["{n} páginas no total", "{n} pages in total", "{n} páginas en total"],
    swapHome: ["Início", "Home", "Inicio"],
    swapLiveNow: [
      "O seu endereço passa a mostrar o site novo agora mesmo:",
      "Your address starts showing the new site right away:",
      "Tu dirección pasa a mostrar el sitio nuevo ahora mismo:",
    ],
    swapNotLive: [
      "O site ainda não está no ar. Depois da troca, a gente publica para você.",
      "The site is not live yet. After the switch, we publish it for you.",
      "El sitio aún no está en el aire. Después del cambio, lo publicamos para ti.",
    ],
    swapEditWarn: [
      "Enquanto o site pronto estiver ligado, quem edita é a Freelandoo. Você pede as alterações e a gente aplica.",
      "While the ready-made site is on, Freelandoo does the editing. You ask for changes and we apply them.",
      "Mientras el sitio listo esté activo, quien edita es Freelandoo. Tú pides los cambios y nosotros los aplicamos.",
    ],
    swapKeepWarn: [
      "O site que você montou aqui não é apagado: ele fica guardado, e dá para voltar a editá-lo quando quiser.",
      "The site you built here is not deleted: it stays saved, and you can go back to editing it whenever you want.",
      "El sitio que montaste aquí no se borra: queda guardado, y puedes volver a editarlo cuando quieras.",
    ],
    swapConfirm: ["Trocar meu site", "Switch my site", "Cambiar mi sitio"],
    swapCancel: ["Agora não", "Not now", "Ahora no"],

    // ─── o lado da plataforma ──────────────────────────────────────────────
    readyAdminSection: ["Painel da plataforma", "Platform panel", "Panel de la plataforma"],
    readyReserve: [
      "Reservar para o cliente aceitar",
      "Reserve for the client to accept",
      "Reservar para que el cliente acepte",
    ],
    readyReservedLead: [
      "Reservado para o cliente aceitar. O site dele só troca quando ele apertar o botão.",
      "Reserved for the client to accept. Their site only changes when they press the button.",
      "Reservado para que el cliente acepte. Su sitio solo cambia cuando él aprieta el botón.",
    ],
    readyWithdraw: ["Retirar a oferta", "Withdraw the offer", "Retirar la oferta"],
  },
}

/** ns → chave → [pt, en, es] — SOBRESCREVE o que já existe. */
const OVERRIDE = {
  CommunitySite: {
    // Era "Ligar o site pronto", quando ligar era o único caminho. Agora ele
    // convive com "Reservar", e o que distingue os dois é justamente não
    // perguntar nada ao cliente — o rótulo tem que dizer isso.
    readyApply: [
      "Ligar agora, sem perguntar",
      "Turn on now, without asking",
      "Activar ahora, sin preguntar",
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
  `i18n-managed-site-offer-merge: ${added} chaves adicionadas, ${replaced} sobrescritas`
)
