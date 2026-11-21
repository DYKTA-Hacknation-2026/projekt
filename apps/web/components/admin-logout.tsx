"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import { Loader2, LogOut } from "lucide-react"

import { Button } from "@workspace/ui/components/button"

export function AdminLogout() {
  const router = useRouter()
  const [pending, setPending] = useState(false)

  async function logout() {
    setPending(true)
    await fetch("/api/v1/admin/logout", { method: "POST" })
    router.push("/admin/login")
    router.refresh()
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={() => void logout()}
      disabled={pending}
    >
      {pending ? (
        <Loader2 aria-hidden="true" className="animate-spin" />
      ) : (
        <LogOut aria-hidden="true" />
      )}
      Wyloguj
    </Button>
  )
}
