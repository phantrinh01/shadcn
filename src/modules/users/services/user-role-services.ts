import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  where,
  writeBatch,
} from "firebase/firestore"

import { db } from "@/lib/firebase/client"
import { getFirestoreCollection } from "@/lib/firebase/firestore-query"

import { userRoleMockData } from "./role-mock-data"
import type { UserRole } from "./types/user-types"

const USERS_ROLES_COLLECTION = "users_roles"

// =====================================================
// Reads (with mock fallback)
// =====================================================

export async function getUserRoles(): Promise<UserRole[]> {
  return getFirestoreCollection<UserRole>(
    USERS_ROLES_COLLECTION,
    userRoleMockData
  )
}

export async function getRolesForUser(uid: string): Promise<UserRole[]> {
  try {
    const snap = await getDocs(collection(db, USERS_ROLES_COLLECTION))
    const result = snap.docs
      .map((d) => {
        const data = d.data() as Omit<UserRole, "id">
        return { ...data, id: d.id }
      })
      .filter((ur) => ur.uid === uid)
    return JSON.parse(JSON.stringify(result))
  } catch (error) {
    console.warn("Failed to load user roles, using mock fallback:", error)
    return userRoleMockData.filter((ur) => ur.uid === uid)
  }
}

export async function getUsersForRole(roleId: string): Promise<UserRole[]> {
  try {
    const snap = await getDocs(collection(db, USERS_ROLES_COLLECTION))
    const result = snap.docs
      .map((d) => {
        const data = d.data() as Omit<UserRole, "id">
        return { ...data, id: d.id }
      })
      .filter((ur) => ur.roleId === roleId)
    return JSON.parse(JSON.stringify(result))
  } catch (error) {
    console.warn("Failed to load users for role, using mock fallback:", error)
    return userRoleMockData.filter((ur) => ur.roleId === roleId)
  }
}

// =====================================================
// Writes
// =====================================================

export async function assignRoleToUser(
  uid: string,
  roleId: string
): Promise<UserRole> {
  // Generate a stable id so that the same (uid, roleId) pair never duplicates.
  const id = `ur-${uid}-${roleId}`
  const userRole: UserRole = {
    id,
    uid,
    roleId,
    createdAt: new Date().toISOString(),
  }
  await setDoc(doc(db, USERS_ROLES_COLLECTION, id), userRole)
  return userRole
}

export async function removeRoleFromUser(
  uid: string,
  roleId: string
): Promise<void> {
  const id = `ur-${uid}-${roleId}`
  await deleteDoc(doc(db, USERS_ROLES_COLLECTION, id))
}

/**
 * Replace the entire role set for a user (used by the assign-roles dialog).
 */
export async function setRolesForUser(
  uid: string,
  roleIds: string[]
): Promise<void> {
  const batch = writeBatch(db)
  const target = new Set(roleIds)
  const snap = await getDocs(
    query(collection(db, USERS_ROLES_COLLECTION), where("uid", "==", uid))
  )

  // Delete existing assignments that are not in the new set
  snap.docs.forEach((d) => {
    const data = d.data() as UserRole
    if (!target.has(data.roleId)) {
      batch.delete(doc(db, USERS_ROLES_COLLECTION, d.id))
    }
  })

  // Add new assignments
  const existingIds = new Set(snap.docs.map((d) => d.id))
  roleIds.forEach((roleId) => {
    const id = `ur-${uid}-${roleId}`
    if (!existingIds.has(id)) {
      batch.set(doc(db, USERS_ROLES_COLLECTION, id), {
        id,
        uid,
        roleId,
        createdAt: new Date().toISOString(),
      })
    }
  })

  await batch.commit()
}

export async function seedUserRolesWithClient(): Promise<UserRole[]> {
  const batch = writeBatch(db)

  userRoleMockData.forEach((ur) => {
    batch.set(doc(db, USERS_ROLES_COLLECTION, ur.id), ur, { merge: true })
  })

  await batch.commit()
  return getUserRoles()
}

/**
 * Remove every user-role assignment referencing the given role
 * (used when deleting a role to keep the relation table consistent).
 */
export async function removeAllAssignmentsForRole(roleId: string): Promise<void> {
  const snap = await getDocs(
    query(collection(db, USERS_ROLES_COLLECTION), where("roleId", "==", roleId))
  )
  const batch = writeBatch(db)
  snap.docs.forEach((d) => batch.delete(doc(db, USERS_ROLES_COLLECTION, d.id)))
  await batch.commit()
}

/**
 * Remove every user-role assignment referencing the given user
 * (used when deleting a user to keep the relation table consistent).
 */
export async function removeAllAssignmentsForUser(uid: string): Promise<void> {
  const snap = await getDocs(
    query(collection(db, USERS_ROLES_COLLECTION), where("uid", "==", uid))
  )
  const batch = writeBatch(db)
  snap.docs.forEach((d) => batch.delete(doc(db, USERS_ROLES_COLLECTION, d.id)))
  await batch.commit()
}