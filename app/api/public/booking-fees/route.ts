import { getBackendApiUrl } from "@/lib/backend"
import { apiFlow } from "@/lib/api-logger"

const url = () => `${getBackendApiUrl()}/public/booking-fees`

export async function GET(request: Request) {
  const log = apiFlow("public/booking-fees:GET")
  let status = 500
  log.start(request)
  try {
    const res = await fetch(url())
    log.backendFetch("GET", url(), res.status)
    const data = await res.json()
    status = res.status
    return Response.json(data, { status: res.status })
  } catch (error) {
    log.fail(error)
    return Response.json({ stripe_fee_percent: 0, service_fee_cents: 0 }, { status: 200 })
  } finally {
    log.end(status)
  }
}
