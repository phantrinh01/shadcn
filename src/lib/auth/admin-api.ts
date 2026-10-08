import { NextResponse } from "next/server"

import { auth } from "@/auth"
import { hasAdminAccess } from "@/lib/auth/permissions"

export async function getAdminApiErrorResponse(
  headers: HeadersInit
): Promise<NextResponse | null> {
  const session = await auth()

  if (!session?.user) {
    return NextResponse.json(
      { success: false, message: "Bạn cần đăng nhập để tiếp tục" },
      { status: 401, headers }
    )
  }

  if (!hasAdminAccess(session.user)) {
    return NextResponse.json(
      { success: false, message: "Bạn không có quyền quản trị" },
      { status: 403, headers }
    )
  }

  return null
}
