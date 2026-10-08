import {
  collection,
  deleteDoc,
  doc,
  serverTimestamp,
  setDoc,
  writeBatch,
} from "firebase/firestore"

import { db } from "@/lib/firebase/client"

import { userMockData } from "./user-mock-data"
import type {
  CreateUserPayload,
  UpdateUserPayload,
  User,
} from "./types/user-types"

const USERS_COLLECTION = "users"

// =====================================================
// Reads — Firebase Auth is the source of truth, the
// API joins the records with the Firestore profile.
// =====================================================

export async function getUsers(): Promise<User[]> {
  try {
    const res = await fetch("/api/admin/users", {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      // Always revalidate; Auth data can change from other admin tools.
      cache: "no-store",
    })

    if (!res.ok) {
      console.warn(
        `[getUsers] /api/admin/users returned ${res.status} — falling back to mock data`
      )
      return userMockData
    }

    const json = (await res.json()) as {
      success: boolean
      data?: { users: User[] }
      message?: string
    }

    if (!json.success || !json.data) {
      console.warn(
        `[getUsers] API returned no users — falling back to mock data:`,
        json.message
      )
      return userMockData
    }

    return json.data.users
  } catch (error) {
    console.warn(
      `[getUsers] Failed to call /api/admin/users — falling back to mock data`,
      error
    )
    return userMockData
  }
}

// =====================================================
// Auth mutations — handled server-side via API routes
// (Firebase Admin SDK creates/deletes Auth accounts).
// =====================================================

interface ApiResult<T = unknown> {
  success: boolean
  message?: string
  data?: T
  errors?: Record<string, string[]>
}

export async function createUserViaApi(
  payload: CreateUserPayload
): Promise<ApiResult<{ uid: string }>> {
  try {
    const res = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
    return (await res.json()) as ApiResult<{ uid: string }>
  } catch (error) {
    console.error("Failed to create user via API:", error)
    return { success: false, message: "Không thể kết nối đến máy chủ" }
  }
}

export async function updateUserViaApi(
  uid: string,
  payload: UpdateUserPayload
): Promise<ApiResult> {
  try {
    const res = await fetch(`/api/admin/users/${uid}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
    return (await res.json()) as ApiResult
  } catch (error) {
    console.error("Failed to update user via API:", error)
    return { success: false, message: "Không thể kết nối đến máy chủ" }
  }
}

export async function deleteUserViaApi(uid: string): Promise<ApiResult> {
  try {
    const res = await fetch(`/api/admin/users/${uid}`, {
      method: "DELETE",
    })
    return (await res.json()) as ApiResult
  } catch (error) {
    console.error("Failed to delete user via API:", error)
    return { success: false, message: "Không thể kết nối đến máy chủ" }
  }
}

// =====================================================
// Local-state helpers
// =====================================================

export function generateUserAvatar(name: string) {
  const names = name.split(" ").filter(Boolean)

  if (names.length >= 2) {
    return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase()
  }

  return name.substring(0, 2).toUpperCase()
}

// =====================================================
// Profile seeder (writes only the Firestore profile,
// not the Auth user). Useful when seeding mock data.
// =====================================================

/**
 * Write a user profile to Firestore without touching Firebase Auth.
 * Use this only for development / seeding — the admin API route is
 * the correct path for real user creation.
 */
export async function upsertUserProfileDirect(user: User): Promise<void> {
  await setDoc(
    doc(db, USERS_COLLECTION, user.uid),
    {
      uid: user.uid,
      name: user.name,
      email: user.email,
      gender: user.gender,
      phone: user.phone,
      status: user.status,
      photoURL: user.photoURL ?? null,
      address: user.address ?? "",
      createdAt: user.profileCreatedAt ?? new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    { merge: true }
  )
}

export async function deleteUserProfileDirect(uid: string): Promise<void> {
  await deleteDoc(doc(db, USERS_COLLECTION, uid))
}

export async function seedUsersWithClient(): Promise<User[]> {
  const batch = writeBatch(db)

  userMockData.forEach((user) => {
    batch.set(
      doc(db, USERS_COLLECTION, user.uid),
      {
        uid: user.uid,
        name: user.name,
        email: user.email,
        gender: user.gender,
        phone: user.phone,
        status: user.status,
        photoURL: user.photoURL ?? null,
        address: user.address ?? "",
        createdAt: user.profileCreatedAt ?? new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    )
  })

  await batch.commit()
  return getUsers()
}