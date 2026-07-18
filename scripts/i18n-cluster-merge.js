// i18n dos Clusters de Live (superfície do MEMBRO: /cluster e /cluster/[id]).
// Namespace novo "Cluster". Idempotente e não-destrutivo (fill-if-absent).
// Rodar com: node scripts/i18n-cluster-merge.js
const fs = require("fs")
const path = require("path")

const dir = path.join(__dirname, "..", "messages")

const CLUSTER = {
  title: ["Clusters", "Clusters", "Clusters"],
  subtitle: [
    "Salas de live sincronizada em que você participa.",
    "Synchronized live rooms you take part in.",
    "Salas de transmisión sincronizada en las que participas.",
  ],
  refresh: ["Atualizar", "Refresh", "Actualizar"],
  retry: ["Tentar de novo", "Try again", "Intentar de nuevo"],
  back: ["Voltar", "Back", "Volver"],
  empty: [
    "Você ainda não faz parte de nenhum cluster.",
    "You are not part of any cluster yet.",
    "Todavía no formas parte de ningún cluster.",
  ],
  loadError: ["Erro ao carregar clusters", "Error loading clusters", "Error al cargar los clusters"],
  unavailable: ["Recurso indisponível.", "Feature unavailable.", "Recurso no disponible."],
  statusStarted: ["Iniciado", "Started", "Iniciado"],
  statusIdle: ["Aguardando", "Waiting", "En espera"],
  notMember: [
    "Você não faz parte deste cluster.",
    "You are not part of this cluster.",
    "No formas parte de este cluster.",
  ],
  cameraError: [
    "Não consegui acessar câmera/microfone",
    "Could not access camera/microphone",
    "No pude acceder a la cámara/micrófono",
  ],
  startFailed: ["Falha ao iniciar a sua live", "Failed to start your live", "Error al iniciar tu transmisión"],
  leave: ["Sair", "Leave", "Salir"],
  liveBadge: ["Ao vivo", "Live", "En vivo"],
  micOn: ["Ligar microfone", "Unmute microphone", "Activar micrófono"],
  micOff: ["Desligar microfone", "Mute microphone", "Silenciar micrófono"],
  endedNote: [
    "O administrador encerrou — todo mundo parou junto.",
    "The administrator ended it — everyone stopped together.",
    "El administrador finalizó — todos pararon juntos.",
  ],
  connecting: ["Iniciando a sua live…", "Starting your live…", "Iniciando tu transmisión…"],
  waitingTitle: [
    "Aguardando o administrador iniciar…",
    "Waiting for the administrator to start…",
    "Esperando a que el administrador inicie…",
  ],
  waitingHint: [
    "Fique nesta tela. Quando o administrador apertar Iniciar, a live de todo mundo começa na mesma hora — e os sinais dele aparecem aqui, bem grandes.",
    "Stay on this screen. When the administrator presses Start, everyone's live begins at the same time — and their signals show up here, big and bold.",
    "Quédate en esta pantalla. Cuando el administrador pulse Iniciar, la transmisión de todos comienza a la vez — y sus señales aparecen aquí, bien grandes.",
  ],
  broadcastAs: ["Transmitir como", "Broadcast as", "Transmitir como"],
  profilePaid: ["Ativo", "Active", "Activo"],
  profileUnpaid: ["Sem assinatura", "No subscription", "Sin suscripción"],
  cueOnlyHint: [
    "Sem subperfil com assinatura ativa você recebe os sinais do administrador, mas não transmite a sua própria live.",
    "Without a subprofile with an active subscription you receive the administrator's signals but do not broadcast your own live.",
    "Sin un subperfil con suscripción activa recibes las señales del administrador, pero no transmites tu propia transmisión.",
  ],
  preparingCamera: ["Preparando câmera…", "Preparing camera…", "Preparando cámara…"],
  liveFooter: [
    "Sua live está no ar — comandos do administrador aparecem na tela.",
    "Your live is on air — the administrator's commands show up on screen.",
    "Tu transmisión está al aire — los comandos del administrador aparecen en pantalla.",
  ],
}

const LOCALES = ["pt-BR", "en", "es"]

function mergeNamespace(json, ns, keys, localeIndex) {
  if (!json[ns]) json[ns] = {}
  let added = 0
  for (const [key, values] of Object.entries(keys)) {
    if (json[ns][key] === undefined) {
      json[ns][key] = values[localeIndex]
      added++
    }
  }
  return added
}

for (let i = 0; i < LOCALES.length; i++) {
  const file = path.join(dir, `${LOCALES[i]}.json`)
  const json = JSON.parse(fs.readFileSync(file, "utf8"))
  let added = 0
  added += mergeNamespace(json, "Cluster", CLUSTER, i)
  fs.writeFileSync(file, JSON.stringify(json, null, 2) + "\n", "utf8")
  console.log(`${LOCALES[i]}: +${added} chaves`)
}
