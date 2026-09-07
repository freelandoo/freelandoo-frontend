import { CommunityRankingFull } from "./_components/community-ranking-full"

export default async function CommunityRankingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <CommunityRankingFull communityId={id} />
}
