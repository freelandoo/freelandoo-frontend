import { AcademyMembersView } from "./_components/academy-members-view"

export default async function AcademyMembersPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  return <AcademyMembersView slug={slug} />
}
