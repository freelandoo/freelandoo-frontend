import { CommunityOrdersView } from "./_components/community-orders-view"

export default async function CommunityOrdersPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return <CommunityOrdersView communityId={id} />
}
