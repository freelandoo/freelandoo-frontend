import { Suspense } from "react"
import ResetPasswordContent from "@/components/auth/reset-password-content"

export default function ResetPasswordPage() {
  return (
    <div className="bg-page-shell-dark">
      <Suspense
        fallback={
          <div className="flex min-h-[60vh] items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          </div>
        }
      >
        <ResetPasswordContent />
      </Suspense>
    </div>
  )
}
