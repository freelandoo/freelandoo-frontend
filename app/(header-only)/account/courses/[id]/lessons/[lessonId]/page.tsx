import { LessonAdminView } from "./_components/lesson-admin-view"

export default async function ManageLessonPage({
  params,
}: {
  params: Promise<{ id: string; lessonId: string }>
}) {
  const { id, lessonId } = await params
  return <LessonAdminView courseId={id} lessonId={lessonId} />
}
