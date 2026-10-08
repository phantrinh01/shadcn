import { getAdminDb } from "@/lib/firebase/admin"

import {
  ADMIN_ROLE_ID,
  isAdminIdentifier,
} from "@/lib/auth/permissions"

type UserAuthorization = {
  roles: string[]
  isAdmin: boolean
}

export async function getUserAuthorization(
  uid: string,
  email?: string | null,
  username?: string | null
): Promise<UserAuthorization> {
  if (isAdminIdentifier(email) || isAdminIdentifier(username)) {
    return { roles: [ADMIN_ROLE_ID], isAdmin: true }
  }

  try {
    const db = getAdminDb()
    const [profileSnapshot, assignmentsSnapshot] = await Promise.all([
      db.collection("users").doc(uid).get(),
      db.collection("users_roles").where("uid", "==", uid).get(),
    ])

    const profile = profileSnapshot.data()
    const roles = assignmentsSnapshot.docs
      .map((document) => document.data().roleId)
      .filter((roleId): roleId is string => typeof roleId === "string")

    const hasAdminIdentifier = [profile?.email, profile?.username, profile?.name]
      .some((value) => typeof value === "string" && isAdminIdentifier(value))
    const isAdmin =
      hasAdminIdentifier || roles.includes(ADMIN_ROLE_ID)

    return { roles, isAdmin }
  } catch (error) {
    console.error("Failed to load user authorization from Firestore:", error)
    return { roles: [], isAdmin: false }
  }
}
