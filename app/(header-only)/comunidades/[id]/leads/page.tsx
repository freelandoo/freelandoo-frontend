import { CommunityLeads } from "./_components/community-leads"

export default async function CommunityLeadsPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return <CommunityLeads communityId={id} />
}
