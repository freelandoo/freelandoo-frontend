import { CommunityDeliveryBoard } from "./_components/community-delivery-board"

export default async function CommunityDeliveryPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return <CommunityDeliveryBoard communityId={id} />
}
