import FreelancerProfileView from "../../../freelancer/[id]/_components/freelancer-profile-view"

export default async function ManageProfilePage({
  params,
}: {
  params: Promise<{ id_profile: string }>
}) {
  const { id_profile } = await params
  
  return <FreelancerProfileView profileId={id_profile} />
}
