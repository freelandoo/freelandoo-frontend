import { CommunityGamePosts } from "./_components/community-game-posts"

export default async function CommunityPostsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <CommunityGamePosts communityId={id} />
}
