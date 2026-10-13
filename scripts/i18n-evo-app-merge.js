// Namespace "EvoApp" — página /evo (vincular o app Android EVO Brazil, mig 278)
// + Profile.gameApp/gameAppAria (botão "App" ao lado do "Jogo" no headcard).
// Idempotente, fill-if-absent. Rodar: node scripts/i18n-evo-app-merge.js
const fs = require("fs")
const path = require("path")

const dir = path.join(__dirname, "..", "messages")

const EVO = {
  title: ["Vincular o app EVO Brazil", "Link the EVO Brazil app", "Vincular la app EVO Brazil"],
  intro: [
    "Abra o app EVO Brazil no celular e digite o código abaixo na tela \"Vincular conta\". Ele vale 5 minutos e uma vez só.",
    "Open the EVO Brazil app on your phone and type the code below on the \"Link account\" screen. It is valid for 5 minutes and only once.",
    "Abre la app EVO Brazil en el celular y escribe el código de abajo en la pantalla \"Vincular cuenta\". Vale 5 minutos y una sola vez.",
  ],
  genError: ["Não foi possível gerar o código.", "Could not generate the code.", "No se pudo generar el código."],
  revokeConfirm: [
    "Desligar este aparelho? O app dele vai pedir um código novo.",
    "Unlink this device? Its app will ask for a new code.",
    "¿Desvincular este dispositivo? Su app pedirá un código nuevo.",
  ],
  revokeError: [
    "Não foi possível desligar o aparelho.",
    "Could not unlink the device.",
    "No se pudo desvincular el dispositivo.",
  ],
  needLogin: [
    "Entre na sua conta da Freelandoo para gerar o código.",
    "Sign in to your Freelandoo account to generate the code.",
    "Entra en tu cuenta de Freelandoo para generar el código.",
  ],
  login: ["Entrar", "Sign in", "Entrar"],
  codeLabel: ["Seu código", "Your code", "Tu código"],
  generating: ["Gerando…", "Generating…", "Generando…"],
  expired: ["Este código venceu. Gere outro.", "This code has expired. Generate another.", "Este código venció. Genera otro."],
  expiresIn: ["Vence em {time}", "Expires in {time}", "Vence en {time}"],
  openApp: ["Abrir no app", "Open in the app", "Abrir en la app"],
  copied: ["Copiado", "Copied", "Copiado"],
  copy: ["Copiar", "Copy", "Copiar"],
  another: ["Gerar outro", "Generate another", "Generar otro"],
  openAppHint: [
    "\"Abrir no app\" só funciona no celular com o EVO Brazil instalado.",
    "\"Open in the app\" only works on a phone with EVO Brazil installed.",
    "\"Abrir en la app\" solo funciona en un celular con EVO Brazil instalado.",
  ],
  devicesTitle: ["Aparelhos vinculados", "Linked devices", "Dispositivos vinculados"],
  loading: ["Carregando…", "Loading…", "Cargando…"],
  noDevices: ["Nenhum aparelho vinculado ainda.", "No device linked yet.", "Ningún dispositivo vinculado todavía."],
  unknownDevice: ["Aparelho sem nome", "Unnamed device", "Dispositivo sin nombre"],
  lastUsed: ["Último uso: {date}", "Last used: {date}", "Último uso: {date}"],
  revoke: ["Desligar", "Unlink", "Desvincular"],
}

const PROFILE = {
  gameApp: ["App", "App", "App"],
  gameAppAria: [
    "Vincular o app EVO Brazil no celular",
    "Link the EVO Brazil app on your phone",
    "Vincular la app EVO Brazil en el celular",
  ],
}

const LOCALES = ["pt-BR", "en", "es"]
let added = 0
LOCALES.forEach((loc, i) => {
  const file = path.join(dir, `${loc}.json`)
  const dict = JSON.parse(fs.readFileSync(file, "utf8"))
  for (const [ns, map] of [["EvoApp", EVO], ["Profile", PROFILE]]) {
    dict[ns] = dict[ns] || {}
    for (const [k, v] of Object.entries(map)) {
      if (dict[ns][k] === undefined) {
        dict[ns][k] = v[i]
        added++
      }
    }
  }
  fs.writeFileSync(file, JSON.stringify(dict, null, 2) + "\n")
})
console.log(`i18n evo-app: ${added} chaves adicionadas`)
