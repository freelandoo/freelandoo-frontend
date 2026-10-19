// Meu Mundo 3D — mm3d-02 (bairro persistente, multiplayer, avatares).
// Namespace "MeuMundo". Idempotente, fill-if-absent.
// Rodar: node scripts/i18n-meu-mundo-mm3d02-merge.js
const fs = require("fs")
const path = require("path")

const dir = path.join(__dirname, "..", "messages")

const MEU_MUNDO = {
  netConnecting: ["Conectando", "Connecting", "Conectando"],
  netOnline: ["Online", "Online", "En línea"],
  netReconnecting: ["Reconectando", "Reconnecting", "Reconectando"],
  netOffline: ["Conexão interrompida", "Connection lost", "Conexión interrumpida"],
  netReplaced: ["Aberto em outra janela", "Opened in another window", "Abierto en otra ventana"],
  netShort: ["Rede", "Network", "Red"],
  reconnect: ["Reconectar", "Reconnect", "Reconectar"],
  onlineNow: ["{n} conectados", "{n} online", "{n} conectados"],
  residents: ["{n} moradores", "{n} residents", "{n} residentes"],
  residentsHint: [
    "Moradores titulares do bairro",
    "Permanent residents of the neighborhood",
    "Residentes titulares del barrio",
  ],
  myHouse: ["Sua casa {n}", "Your house {n}", "Tu casa {n}"],
  yourHouse: ["Sua casa", "Your house", "Tu casa"],
  available: ["Disponível", "Available", "Disponible"],
  occupied: ["Ocupada", "Occupied", "Ocupada"],
  bodyPicker: ["Tipo físico (teste)", "Body type (test)", "Tipo físico (prueba)"],
  bodyNormal: ["Normal", "Normal", "Normal"],
  bodySlim: ["Magro", "Slim", "Delgado"],
  bodyFat: ["Gordo", "Chubby", "Gordito"],
  bodyStrong: ["Forte", "Strong", "Fuerte"],
  bodyHint: [
    "Teste visual: nenhum corpo tem vantagem de velocidade.",
    "Visual test: no body type moves faster.",
    "Prueba visual: ningún cuerpo tiene ventaja de velocidad.",
  ],
  recenter: ["Centralizar a câmera", "Center the camera", "Centrar la cámara"],
  run: ["Correr", "Run", "Correr"],
  runAria: ["Corrida lenta (liga e desliga)", "Jog (toggle)", "Trote (activar y desactivar)"],
  avatars: ["Avatares", "Avatars", "Avatares"],
  helpTouch2: [
    "Joystick: andar · Correr: corrida lenta · Arraste a tela: girar a câmera · Botão: interagir",
    "Joystick: walk · Run: jog · Drag the screen: turn the camera · Button: interact",
    "Joystick: caminar · Correr: trote · Arrastra la pantalla: girar la cámara · Botón: interactuar",
  ],
  helpDesktop2: [
    "WASD ou setas: andar · Shift: corrida lenta · Arraste: girar a câmera · Roda: zoom · E: interagir",
    "WASD or arrows: walk · Shift: jog · Drag: turn the camera · Wheel: zoom · E: interact",
    "WASD o flechas: caminar · Shift: trote · Arrastra: girar la cámara · Rueda: zoom · E: interactuar",
  ],
}

const LOCALES = ["pt-BR", "en", "es"]
let added = 0
for (const [i, locale] of LOCALES.entries()) {
  const file = path.join(dir, `${locale}.json`)
  const json = JSON.parse(fs.readFileSync(file, "utf8"))
  json.MeuMundo = json.MeuMundo || {}
  for (const [key, vals] of Object.entries(MEU_MUNDO)) {
    if (json.MeuMundo[key] === undefined) {
      json.MeuMundo[key] = vals[i]
      added++
    }
  }
  fs.writeFileSync(file, JSON.stringify(json, null, 2) + "\n")
}
console.log(`i18n mm3d-02: ${added} chaves adicionadas`)
