import { type UserRecord } from "firebase-admin/auth"
import { NextRequest, NextResponse } from "next/server"

import { getAdminAuth, getAdminDb } from "@/lib/firebase/admin"
import { getAdminApiErrorResponse } from "@/lib/auth/admin-api"
import {
  createUserPayloadSchema,
  type User,
} from "@/modules/users/services/types/user-types"

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS })
}

// =====================================================
// Helpers
// =====================================================

/**
 * Convert a Firebase Auth UserRecord + an optional Firestore profile
 * into our combined `User` shape.
 */
function joinAuthAndProfile(
  record: UserRecord,
  profile: Record<string, unknown> | null
): User {
  const profileName =
    typeof profile?.name === "string" && profile.name.trim().length > 0
      ? (profile.name as string)
      : null
  const profilePhoto =
    typeof profile?.photoURL === "string" && (profile.photoURL as string).length > 0
      ? (profile.photoURL as string)
      : null

  // `providerData` is the source of truth for linked sign-in methods.
  // A user created with email/password has providerId === "password".
  // OAuth users (Google/Facebook/...) get the matching domain.
  const providers = (record.providerData ?? [])
    .map((p) => p.providerId)
    .filter((id, idx, arr) => arr.indexOf(id) === idx) // dedupe

  return {
    // Auth fields
    uid: record.uid,
    email: record.email ?? "",
    name: profileName ?? record.displayName ?? record.email?.split("@")[0] ?? "(no name)",
    photoURL: profilePhoto ?? record.photoURL ?? null,
    disabled: record.disabled,
    emailVerified: record.emailVerified,
    creationTime: record.metadata.creationTime ?? null,
    lastSignInTime: record.metadata.lastSignInTime ?? null,
    providers,
    // Profile fields
    gender:
      (profile?.gender as User["gender"]) ??
      (record.phoneNumber ? "other" : "male"),
    phone:
      (profile?.phone as string) ?? record.phoneNumber ?? "",
    status:
      record.disabled
        ? "disabled"
        : ((profile?.status as User["status"]) ?? "active"),
    address: (profile?.address as string) ?? "",
    profileCreatedAt:
      typeof profile?.createdAt === "string"
        ? (profile.createdAt as string)
        : null,
    profileUpdatedAt:
      typeof profile?.updatedAt === "string"
        ? (profile.updatedAt as string)
        : null,
  }
}

/**
 * List all Firebase Auth users (across all pages) joined with their
 * Firestore profile documents. Profiles live in `users/{uid}`.
 */
async function listAllAuthUsersWithProfiles(): Promise<User[]> {
  const auth = getAdminAuth()
  const db = getAdminDb()

  const records: UserRecord[] = []
  let pageToken: string | undefined

  // Firebase Auth allows 1–1000 per page. Loop until exhausted.
  do {
    const result = await auth.listUsers(1000, pageToken)
    records.push(...result.users)
    pageToken = result.pageToken
  } while (pageToken)

  if (records.length === 0) return []

  // Fetch all Firestore profiles for these uids.
  // We use `getAll` for efficiency (max 100 per call).
  const profileMap = new Map<string, Record<string, unknown>>()
  const uids = records.map((r) => r.uid)

  for (let i = 0; i < uids.length; i += 100) {
    const chunk = uids.slice(i, i + 100)
    const refs = chunk.map((uid) => db.collection("users").doc(uid))
    const snaps = await db.getAll(...refs)
    snaps.forEach((snap) => {
      if (snap.exists) {
        profileMap.set(snap.id, snap.data() as Record<string, unknown>)
      }
    })
  }

  return records.map((r) => joinAuthAndProfile(r, profileMap.get(r.uid) ?? null))
}

// =====================================================
// GET — list users (Auth is source of truth, profile is enrichment)
// =====================================================

export async function GET() {
  const authError = await getAdminApiErrorResponse(CORS_HEADERS)
  if (authError) return authError

  try {
    const users = await listAllAuthUsersWithProfiles()
    return NextResponse.json(
      {
        success: true,
        data: { users },
      },
      { status: 200, headers: CORS_HEADERS }
    )
  } catch (error) {
    console.error("[Admin Users GET API Error]", error)
    return NextResponse.json(
      {
        success: false,
        message:
          "Không thể tải danh sách người dùng từ Firebase Auth. " +
          "Kiểm tra cấu hình FIREBASE_SERVICE_ACCOUNT_KEY.",
        data: { users: [] },
      },
      { status: 500, headers: CORS_HEADERS }
    )
  }
}

// =====================================================
// POST — create new user (Auth + profile)
// =====================================================

export async function POST(request: NextRequest) {
  const authError = await getAdminApiErrorResponse(CORS_HEADERS)
  if (authError) return authError

  try {
    const body = await request.json()
    const parsed = createUserPayloadSchema.safeParse(body)

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

    const { name, email, password, gender, phone, status } = parsed.data

    const auth = getAdminAuth()
    const db = getAdminDb()

    // 1. Create the Firebase Auth user (server-side, no client sign-in)
    let userRecord
    try {
      userRecord = await auth.createUser({
        email,
        password,
        displayName: name,
        disabled: status === "disabled",
      })
    } catch (error: unknown) {
      const code = (error as { code?: string }).code
      if (code === "auth/email-already-exists") {
        return NextResponse.json(
          {
            success: false,
            message: "Email này đã được sử dụng",
            errors: { email: ["Email đã tồi tại trong hệ thống"] },
          },
          { status: 409, headers: CORS_HEADERS }
        )
      }
      throw error
    }

    const uid = userRecord.uid
    const now = new Date().toISOString()

    // 2. Write the Firestore profile (uid is doc id). Best-effort: if
    //    this fails the Auth user is rolled back so we don't leave orphans.
    try {
      await db.collection("users").doc(uid).set({
        uid,
        name,
        email,
        gender,
        phone: phone ?? "",
        status,
        photoURL: null,
        address: "",
        createdAt: now,
        updatedAt: now,
      })
    } catch (profileError) {
      // Rollback the Auth user so the system stays consistent.
      try {
        await auth.deleteUser(uid)
      } catch (rollbackError) {
        console.error(
          "[Admin Users POST] Failed to rollback auth user after profile write:",
          rollbackError
        )
      }
      throw profileError
    }

    return NextResponse.json(
      {
        success: true,
        message: "Tạo người dùng thành công",
        data: { uid },
      },
      { status: 201, headers: CORS_HEADERS }
    )
  } catch (error) {
    console.error("[Admin Users API Error]", error)
    return NextResponse.json(
      {
        success: false,
        message: "Đã xảy ra lỗi khi tạo người dùng",
      },
      { status: 500, headers: CORS_HEADERS }
    )
  }
}
