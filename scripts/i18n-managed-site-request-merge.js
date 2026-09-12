// scripts/i18n-managed-site-request-merge.js
// O PEDIDO DE SITE PRONTO (mig 243) + a volta do PUBLICAR ao cliente.
//
// Duas metades:
//
//   MERGE (fill-if-absent) — as chaves do pedido, que não existiam: o botão
//   "Pedir o meu site", a nota opcional, o estado "seu pedido chegou" e, do
//   lado da plataforma, o selo do pedido com o "Tirar da fila".
//
//   OVERRIDE — três chaves que MUDARAM DE VERDADE quando o Publicar voltou
//   para o cliente. Dicionário vence fallback inline, então trocar só o texto
//   do componente não mudaria uma palavra na tela:
//
//     • managedNotice  — dizia que a barra estava quase vazia. Não está mais:
//                        Publicar e Endereço voltaram.
//     • swapNotLive    — prometia "a gente publica para você". Agora quem
//                        publica é ele, e o modal do aceite não pode prometer
//                        uma coisa que a tela seguinte desmente.
//     • readyPitchBody — dizia que "a edição fica com a Freelandoo", sem
//                        separar escrever o conteúdo de controlar o site. A
//                        frase inteira é o que decide se a pessoa aceita.
//
// Idempotente: rodar de novo não muda mais nada.
const fs = require("fs")
const path = require("path")

const DIR = path.join(__dirname, "..", "messages")
const LOCALES = ["pt-BR", "en", "es"]

/** ns → chave → [pt, en, es] — só entram se a chave AINDA NÃO existir. */
const MERGE = {
  CommunitySite: {
    // ─── o cliente pede ────────────────────────────────────────────────────
    readyRequestCta: ["Pedir o meu site", "Request my site", "Pedir mi sitio"],
    readyRequestNotePlaceholder: [
      "Quer contar alguma coisa? (opcional)",
      "Anything you want to tell us? (optional)",
      "¿Quieres contarnos algo? (opcional)",
    ],
    readyRequestHint: [
      "Pedir não muda nada no seu site nem cobra nada — a gente monta e você decide depois.",
      "Requesting changes nothing on your site and costs nothing — we build it and you decide later.",
      "Pedir no cambia nada en tu sitio ni cobra nada — lo montamos y tú decides después.",
    ],

    // ─── o pedido já chegou ────────────────────────────────────────────────
    readyRequestedLead: [
      "O seu pedido chegou até a gente. Vamos montar o site e deixá-lo reservado aqui — você recebe o aviso neste mesmo botão.",
      "Your request reached us. We'll build the site and leave it reserved here — you'll get the notice on this same button.",
      "Tu pedido llegó hasta nosotros. Vamos a montar el sitio y dejarlo reservado aquí — recibirás el aviso en este mismo botón.",
    ],
    readyRequestedWhen: ["Pedido em {d}", "Requested on {d}", "Pedido el {d}"],
    readyRequestedHint: [
      "Nada muda no seu site enquanto isso — você continua editando normalmente.",
      "Nothing changes on your site meanwhile — you keep editing as usual.",
      "Mientras tanto nada cambia en tu sitio — sigues editando normalmente.",
    ],

    // ─── o lado da plataforma ──────────────────────────────────────────────
    readyRequestBadge: [
      "O cliente pediu um site",
      "The client requested a site",
      "El cliente pidió un sitio",
    ],
    readyRequestDismiss: ["Tirar da fila", "Remove from queue", "Quitar de la fila"],

    // ─── o publicar travado por plano, no site gerenciado ──────────────────
    // Chave PRÓPRIA e não um sufixo colado em `publishLocked`: o plano é outro,
    // e em inglês e espanhol o nome não entra no mesmo lugar da frase.
    publishLockedManaged: [
      "Publicar site · Plano do site",
      "Publish site · Site plan",
      "Publicar sitio · Plan del sitio",
    ],

    // ─── o que o cliente NÃO perde ao aceitar ──────────────────────────────
    swapPublishKeep: [
      "Publicar, tirar do ar e escolher o endereço continuam sendo seus. O que passa para a gente é escrever o conteúdo.",
      "Publishing, taking it down and choosing the address stay yours. What moves to us is writing the content.",
      "Publicar, sacarlo del aire y elegir la dirección siguen siendo tuyos. Lo que pasa a nosotros es escribir el contenido.",
    ],
  },
}

/** ns → chave → [pt, en, es] — SEMPRE sobrescritas (o valor é que mudou). */
const OVERRIDE = {
  CommunitySite: {
    // A faixa do construtor travado. A versão anterior explicava uma barra
    // vazia que não existe mais.
    managedNotice: [
      "Este site é feito e mantido pela Freelandoo: quem escreve o conteúdo somos nós. Publicar, tirar do ar e o endereço continuam com você. Peça as alterações pelo suporte — e, se quiser voltar a montar o seu, é no botão Site pronto aqui em cima.",
      "This site is built and maintained by Freelandoo: we write the content. Publishing, taking it down and the address stay with you. Ask for changes through support — and if you want to build your own again, it's in the Ready-made site button above.",
      "Este sitio lo hace y mantiene Freelandoo: nosotros escribimos el contenido. Publicar, sacarlo del aire y la dirección siguen contigo. Pide los cambios por soporte — y si quieres volver a montar el tuyo, es en el botón Sitio listo aquí arriba.",
    ],
    // O modal do aceite prometia que NÓS publicaríamos. Agora é ele.
    swapNotLive: [
      "O site ainda não está no ar. Depois da troca, o botão Publicar fica com você — é você quem coloca no ar e escolhe o endereço.",
      "The site isn't live yet. After the swap, the Publish button stays with you — you put it live and choose the address.",
      "El sitio aún no está en el aire. Después del cambio, el botón Publicar queda contigo — tú lo pones en el aire y eliges la dirección.",
    ],
    // O texto que explica o produto a quem ainda não pediu.
    readyPitchBody: [
      "O site pronto é montado e mantido pela gente a partir do que você já escreveu aqui. Enquanto ele estiver ligado, quem escreve o conteúdo é a Freelandoo — publicar e o endereço continuam com você, e desligar devolve o seu site do construtor exatamente como ele estava.",
      "The ready-made site is built and maintained by us from what you've already written here. While it's on, Freelandoo writes the content — publishing and the address stay with you, and turning it off gives your builder site back exactly as it was.",
      "El sitio listo lo montamos y mantenemos nosotros a partir de lo que ya escribiste aquí. Mientras esté activo, Freelandoo escribe el contenido — publicar y la dirección siguen contigo, y desactivarlo devuelve tu sitio del constructor exactamente como estaba.",
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
  `i18n-managed-site-request-merge: ${added} chaves adicionadas, ${replaced} sobrescritas`
)
