// B11 (cronograma 2026-11): Paint — o Morkhan persegue quem completa os 20
// gatinhos. Idempotente (fill-if-absent). node <script> [pasta dos dicionários]
const fs = require("fs")
const path = require("path")
const DIR = process.argv[2] || path.join(__dirname, "..", "messages")
const ADD = {
  "pt-BR": {
    paintHowMorkhan: "Completou os 20? O Morkhan surge atrás de você e tenta te jogar das ilhas: caiu, os gatinhos voltam ao mapa e o portal fecha. Corra para o portal!",
    paintToastMorkhanMine: "O Morkhan acordou atrás de você! Corra para o portal",
    paintToastMorkhanAlly: "O Morkhan está caçando quem leva os gatinhos do seu time",
    paintToastMorkhanOther: "O Morkhan saiu atrás do outro time",
    paintToastPortalShut: "O portal fechou — junte 20 gatinhos de novo",
    paintMorkhanChasing: "O Morkhan está atrás de você!",
    paintMorkhanDist: "{n} m",
  },
  en: {
    paintHowMorkhan: "Got all 20? Morkhan appears behind you and tries to throw you off the islands: fall, and the kittens go back to the map and the portal closes. Run for the portal!",
    paintToastMorkhanMine: "Morkhan woke up behind you! Run for the portal",
    paintToastMorkhanAlly: "Morkhan is hunting whoever carries your team's kittens",
    paintToastMorkhanOther: "Morkhan went after the other team",
    paintToastPortalShut: "The portal closed — gather 20 kittens again",
    paintMorkhanChasing: "Morkhan is right behind you!",
    paintMorkhanDist: "{n} m",
  },
  es: {
    paintHowMorkhan: "¿Juntaste los 20? Morkhan aparece detrás de ti e intenta tirarte de las islas: si caes, los gatitos vuelven al mapa y el portal se cierra. ¡Corre al portal!",
    paintToastMorkhanMine: "¡Morkhan despertó detrás de ti! Corre al portal",
    paintToastMorkhanAlly: "Morkhan está cazando a quien lleva los gatitos de tu equipo",
    paintToastMorkhanOther: "Morkhan salió tras el otro equipo",
    paintToastPortalShut: "El portal se cerró — junta 20 gatitos de nuevo",
    paintMorkhanChasing: "¡Morkhan está detrás de ti!",
    paintMorkhanDist: "{n} m",
  },
}
for (const [lang, keys] of Object.entries(ADD)) {
  const f = path.join(DIR, `${lang}.json`)
  const j = JSON.parse(fs.readFileSync(f, "utf8"))
  j.MeuMundo = j.MeuMundo || {}
  let n = 0
  for (const [k, v] of Object.entries(keys)) if (!(k in j.MeuMundo)) ((j.MeuMundo[k] = v), n++)
  fs.writeFileSync(f, JSON.stringify(j, null, 2) + "\n")
  console.log(lang, "+", n)
}
