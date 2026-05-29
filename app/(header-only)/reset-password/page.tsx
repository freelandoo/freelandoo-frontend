import { Suspense } from "react"
import ResetPasswordContent from "@/components/auth/reset-password-content"

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="fl-root fl-paper-texture flex min-h-[100dvh] items-center justify-center">
          <div className="h-9 w-9 animate-spin rounded-full border-[3px] border-[#F5F1E8]/15 border-t-[#F2B705]" />
        </div>
      }
    >
      <ResetPasswordContent />
    </Suspense>
  )
}
