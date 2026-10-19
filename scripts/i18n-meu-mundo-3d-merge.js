// Meu Mundo 3D (Babylon.js) — área de admin + botão do headcard.
// Namespaces "MeuMundo" e "Profile". Idempotente, fill-if-absent.
// Rodar: node scripts/i18n-meu-mundo-3d-merge.js
const fs = require("fs")
const path = require("path")

const dir = path.join(__dirname, "..", "messages")

const MEU_MUNDO = {
  title: ["Meu Mundo", "My World", "Mi Mundo"],
  devBadge: ["Em desenvolvimento", "In development", "En desarrollo"],
  canvasAria: ["Bairro do Meu Mundo", "My World neighborhood", "Barrio de Mi Mundo"],
  exitLabel: ["Centro da cidade", "City center", "Centro de la ciudad"],
  respawn: ["Voltar ao ponto inicial", "Back to the starting point", "Volver al punto inicial"],
  respawnShort: ["Início", "Start", "Inicio"],
  techPanel: ["Painel técnico", "Technical panel", "Panel técnico"],
  back: ["Voltar ao perfil", "Back to profile", "Volver al perfil"],
  frameMs: ["Quadro", "Frame", "Cuadro"],
  meshes: ["Malhas", "Meshes", "Mallas"],
  active: ["ativas", "active", "activas"],
  materials: ["Materiais", "Materials", "Materiales"],
  liveGames: ["Jogos ativos", "Active games", "Juegos activos"],
  helpTouch: [
    "Joystick: andar · Arraste a tela: girar a câmera · Botão: interagir",
    "Joystick: walk · Drag the screen: turn the camera · Button: interact",
    "Joystick: caminar · Arrastra la pantalla: girar la cámara · Botón: interactuar",
  ],
  helpDesktop: [
    "WASD ou setas: andar · Arraste: girar a câmera · Roda: zoom · E: interagir",
    "WASD or arrows: walk · Drag: turn the camera · Wheel: zoom · E: interact",
    "WASD o flechas: caminar · Arrastra: girar la cámara · Rueda: zoom · E: interactuar",
  ],
  hideHelp: ["(ocultar)", "(hide)", "(ocultar)"],
  seeHouse: ["Ver casa {n}", "See house {n}", "Ver casa {n}"],
  close: ["Fechar", "Close", "Cerrar"],
  houseEyebrow: ["Casa", "House", "Casa"],
  demo: ["demonstração", "demo", "demostración"],
  lot: ["Lote {n}", "Lot {n}", "Lote {n}"],
  level: ["Nível da casa", "House level", "Nivel de la casa"],
  owner: ["Proprietário", "Owner", "Propietario"],
  ownerDemo: ["Proprietário demonstrativo", "Demo owner", "Propietario de demostración"],
  noOwner: ["Sem proprietário", "No owner", "Sin propietario"],
  interiorSoon: ["Interior em construção", "Interior under construction", "Interior en construcción"],
  exitEyebrow: ["Saída do bairro", "Neighborhood exit", "Salida del barrio"],
  nextStage: ["próxima etapa", "next stage", "próxima etapa"],
  exitDesc: [
    "O centro da cidade ainda está sendo construído. Por enquanto, o portão fica fechado.",
    "The city center is still being built. For now, the gate stays closed.",
    "El centro de la ciudad aún se está construyendo. Por ahora, el portón queda cerrado.",
  ],
  ok: ["Entendi", "Got it", "Entendido"],
  loading: ["Montando o bairro…", "Building the neighborhood…", "Armando el barrio…"],
  errorTitle: ["O bairro não abriu", "The neighborhood didn't open", "El barrio no se abrió"],
  errorDesc: [
    "O navegador não conseguiu iniciar o 3D. Tente de novo; se continuar, volte ao perfil.",
    "The browser couldn't start 3D. Try again; if it keeps happening, go back to your profile.",
    "El navegador no pudo iniciar el 3D. Inténtalo de nuevo; si sigue, vuelve al perfil.",
  ],
  retry: ["Tentar de novo", "Try again", "Intentar de nuevo"],
  forbiddenTitle: ["Área restrita", "Restricted area", "Área restringida"],
  forbiddenDesc: [
    "O Meu Mundo ainda está em desenvolvimento e só abre para administradores.",
    "My World is still in development and only opens for administrators.",
    "Mi Mundo aún está en desarrollo y solo abre para administradores.",
  ],
  loadErrorTitle: ["Não foi possível abrir", "Couldn't open", "No se pudo abrir"],
  loadErrorDesc: [
    "O bairro não carregou. Confira a conexão e tente de novo.",
    "The neighborhood didn't load. Check your connection and try again.",
    "El barrio no cargó. Revisa la conexión e inténtalo de nuevo.",
  ],
}

const PROFILE = {
  meuMundo: ["Meu Mundo", "My World", "Mi Mundo"],
  meuMundoDev: ["Em desenvolvimento", "In development", "En desarrollo"],
  meuMundoAria: [
    "Abrir o Meu Mundo (em desenvolvimento)",
    "Open My World (in development)",
    "Abrir Mi Mundo (en desarrollo)",
  ],
}

const GROUPS = { MeuMundo: MEU_MUNDO, Profile: PROFILE }

function load(file) {
  return JSON.parse(fs.readFileSync(path.join(dir, file), "utf8"))
}
function save(file, obj) {
  fs.writeFileSync(path.join(dir, file), JSON.stringify(obj, null, 2) + "\n", "utf8")
}

for (const [file, idx] of [["pt-BR.json", 0], ["en.json", 1], ["es.json", 2]]) {
  const d = load(file)
  let added = 0
  for (const [ns, keys] of Object.entries(GROUPS)) {
    if (!d[ns]) d[ns] = {}
    for (const [key, vals] of Object.entries(keys)) {
      if (!(key in d[ns])) {
        d[ns][key] = vals[idx]
        added++
      }
    }
  }
  save(file, d)
  console.log(`${file}: +${added}`)
}
