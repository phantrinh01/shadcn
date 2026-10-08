import { NextRequest, NextResponse } from "next/server"

import { getAdminAuth, getAdminDb } from "@/lib/firebase/admin"
import { getAdminApiErrorResponse } from "@/lib/auth/admin-api"
import {
  updateUserPayloadSchema,
} from "@/modules/users/services/types/user-types"

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS })
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ uid: string }> }
) {
  const authError = await getAdminApiErrorResponse(CORS_HEADERS)
  if (authError) return authError

  try {
    const { uid } = await params
    const body = await request.json()
    const parsed = updateUserPayloadSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          message: "Dữ liệu không hợp lệ",
          errors: parsed.error.flatten().fieldErrors,
        },
        { status: 400, headers: CORS_HEADERS }
      )
    }

    const data = parsed.data
    const auth = getAdminAuth()
    const db = getAdminDb()

    // Build Auth update payload
    const authUpdate: {
      displayName?: string
      password?: string
      disabled?: boolean
    } = {}

    if (data.name !== undefined) authUpdate.displayName = data.name
    if (data.password !== undefined) authUpdate.password = data.password
    if (data.disabled !== undefined) {
      authUpdate.disabled = data.disabled
    } else if (data.status !== undefined) {
      // Status drives the Auth `disabled` flag unless caller overrides it.
      authUpdate.disabled = data.status === "disabled"
    }

    if (Object.keys(authUpdate).length > 0) {
      await auth.updateUser(uid, authUpdate)
    }

    // Build profile update payload
    const profileUpdate: Record<string, unknown> = {
      updatedAt: new Date().toISOString(),
    }
    if (data.name !== undefined) profileUpdate.name = data.name
    if (data.gender !== undefined) profileUpdate.gender = data.gender
    if (data.phone !== undefined) profileUpdate.phone = data.phone
    if (data.status !== undefined) profileUpdate.status = data.status

    await db
      .collection("users")
      .doc(uid)
      .set(profileUpdate, { merge: true })

    return NextResponse.json(
      { success: true, message: "Cập nhật người dùng thành công" },
      { status: 200, headers: CORS_HEADERS }
    )
  } catch (error) {
    console.error("[Admin Users PATCH API Error]", error)
    return NextResponse.json(
      {
        success: false,
        message: "Đã xảy ra lỗi khi cập nhật người dùng",
      },
      { status: 500, headers: CORS_HEADERS }
    )
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ uid: string }> }
) {
  const authError = await getAdminApiErrorResponse(CORS_HEADERS)
  if (authError) return authError

  try {
    const { uid } = await params
    const auth = getAdminAuth()
    const db = getAdminDb()

    // 1. Delete the user_roles assignments
    const assignments = await db
      .collection("users_roles")
      .where("uid", "==", uid)
      .get()

    const batch = db.batch()
    assignments.docs.forEach((doc) => batch.delete(doc.ref))
    await batch.commit()

    // 2. Delete the Firestore profile
    await db.collection("users").doc(uid).delete()

    // 3. Delete the Firebase Auth user
    try {
      await auth.deleteUser(uid)
    } catch (error: unknown) {
      const code = (error as { code?: string }).code
      if (code !== "auth/user-not-found") {
        throw error
      }
    }

    return NextResponse.json(
      { success: true, message: "Xóa người dùng thành công" },
      { status: 200, headers: CORS_HEADERS }
    )
  } catch (error) {
    console.error("[Admin Users DELETE API Error]", error)
    return NextResponse.json(
      {
        success: false,
        message: "Đã xảy ra lỗi khi xóa người dùng",
      },
      { status: 500, headers: CORS_HEADERS }
    )
  }
}
