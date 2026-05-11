import { CourseLandingView } from "./_components/course-landing-view"

export default async function ManageCoursePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return <CourseLandingView courseId={id} />
}
