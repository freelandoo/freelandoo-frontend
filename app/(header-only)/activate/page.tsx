import { Suspense } from "react"
import ActivateContent from "@/components/auth/activate-content"

export default function ActivatePage() {
  return (
    <div className="bg-page-shell-dark">
      <Suspense
        fallback={
          <div className="flex min-h-[60vh] items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          </div>
        }
      >
        <ActivateContent />
      </Suspense>
    </div>
  )
}
