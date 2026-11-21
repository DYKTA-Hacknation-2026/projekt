import { NextResponse, type NextRequest } from "next/server"

import { ADMIN_COOKIE, verifyAdminToken } from "@/server/auth/admin-token"

function isGateEnabled(): boolean {
  return ["1", "true", "yes", "on"].includes(
    (process.env.ADMIN_GATE_ENABLED ?? "false").toLowerCase()
  )
}

export function proxy(request: NextRequest) {
  if (!isGateEnabled()) {
    return NextResponse.next()
  }

  const token = request.cookies.get(ADMIN_COOKIE)?.value
  const secret = process.env.SESSION_SECRET ?? ""
  const authenticated = verifyAdminToken(token, secret)
  const { pathname, search } = request.nextUrl

  if (pathname === "/admin/login") {
    if (authenticated) {
      return NextResponse.redirect(new URL("/admin", request.url))
    }
    return NextResponse.next()
  }

  if (!authenticated) {
    const loginUrl = new URL("/admin/login", request.url)
    loginUrl.searchParams.set("next", `${pathname}${search}`)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/admin/:path*"],
}
