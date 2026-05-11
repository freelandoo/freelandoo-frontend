import { CourseAdminView } from "./_components/course-admin-view"

export default async function ManageCoursePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return <CourseAdminView courseId={id} />
}
