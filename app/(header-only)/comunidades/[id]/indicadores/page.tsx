import { CommunityIndicators } from "./_components/community-indicators"

export default async function CommunityIndicatorsPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return <CommunityIndicators communityId={id} />
}
