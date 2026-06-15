"use client"

import dynamic from "next/dynamic"

// Overlays/efeitos globais que NÃO são necessários no first paint. Carregados
// via next/dynamic({ ssr:false }) — só dá pra fazer isso num client component,
// por isso este wrapper (o app/layout.tsx é Server Component). Tira esse JS do
// chunk inicial compartilhado e adia as requisições de mount (perf Tier 1).

const OnlineHeartbeat = dynamic(
  () => import("@/components/online-heartbeat").then((m) => m.OnlineHeartbeat),
  { ssr: false }
)
const AdminAlerts = dynamic(
  () => import("@/components/admin/admin-alerts").then((m) => m.AdminAlerts),
  { ssr: false }
)
const CommunityVoteModal = dynamic(
  () => import("@/components/community/community-vote-modal").then((m) => m.CommunityVoteModal),
  { ssr: false }
)
const InstallPrompt = dynamic(
  () => import("@/components/pwa/install-prompt").then((m) => m.InstallPrompt),
  { ssr: false }
)
const PullToRefresh = dynamic(
  () => import("@/components/pwa/pull-to-refresh").then((m) => m.PullToRefresh),
  { ssr: false }
)

export function GlobalOverlays() {
  return (
    <>
      <OnlineHeartbeat />
      <AdminAlerts />
      <CommunityVoteModal />
      <InstallPrompt />
      <PullToRefresh />
    </>
  )
}
