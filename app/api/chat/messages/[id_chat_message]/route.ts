import { getBackendApiUrl } from "@/lib/backend"
import { apiFlow } from "@/lib/api-logger"

const BACKEND = getBackendApiUrl()

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id_chat_message: string }> }
) {
  const log = apiFlow("chat/messages/[id]:DELETE")
  let status = 500
  log.start(request)
  try {
    const auth = request.headers.get("Authorization")
    if (!auth) {
      status = 401
      return Response.json({ error: "Token não fornecido" }, { status: 401 })
    }
    const { id_chat_message } = await params
    const url = `${BACKEND}/chat/messages/${encodeURIComponent(id_chat_message)}`
    const r = await fetch(url, {
      method: "DELETE",
      headers: { Authorization: auth, "Content-Type": "application/json" },
    })
    log.backendFetch("DELETE", url, r.status)
    const text = await r.text()
    let data: unknown
    try { data = JSON.parse(text) } catch { data = { error: text } }
    status = r.status
    return Response.json(data, { status: r.status })
  } catch (e) {
    log.fail(e)
    return Response.json({ error: "Erro ao apagar mensagem" }, { status: 500 })
  } finally {
    log.end(status)
  }
}
