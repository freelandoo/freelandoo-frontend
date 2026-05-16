import { getBackendApiUrl } from "@/lib/backend"
import { apiFlow } from "@/lib/api-logger"

const BACKEND = getBackendApiUrl()

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id_chat_room: string }> }
) {
  const log = apiFlow("chat/rooms/[id]/leave:POST")
  let status = 500
  log.start(request)
  try {
    const auth = request.headers.get("Authorization")
    if (!auth) {
      status = 401
      return Response.json({ error: "Token não fornecido" }, { status: 401 })
    }
    const { id_chat_room } = await params
    const url = `${BACKEND}/chat/rooms/${encodeURIComponent(id_chat_room)}/leave`
    const r = await fetch(url, {
      method: "POST",
      headers: { Authorization: auth, "Content-Type": "application/json" },
    })
    log.backendFetch("POST", url, r.status)
    const text = await r.text()
    let data: unknown
    try { data = JSON.parse(text) } catch { data = { error: text } }
    status = r.status
    return Response.json(data, { status: r.status })
  } catch (e) {
    log.fail(e)
    return Response.json({ error: "Erro ao sair da sala" }, { status: 500 })
  } finally {
    log.end(status)
  }
}
