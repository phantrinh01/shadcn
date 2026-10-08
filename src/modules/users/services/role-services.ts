import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  serverTimestamp,
  setDoc,
  writeBatch,
} from "firebase/firestore"

import { db } from "@/lib/firebase/client"
import { getFirestoreCollection } from "@/lib/firebase/firestore-query"

import { roleMockData } from "./role-mock-data"
import type { Role } from "./types/user-types"

const ROLES_COLLECTION = "roles"

export async function getRoles(): Promise<Role[]> {
  return getFirestoreCollection<Role>(ROLES_COLLECTION, roleMockData)
}

export async function getRole(roleId: string): Promise<Role | null> {
  const snap = await getDocs(collection(db, ROLES_COLLECTION))
  const found = snap.docs.find((d) => d.id === roleId)
  return found ? (found.data() as Role) : null
}

export async function createRole(role: Role): Promise<Role> {
  await setDoc(doc(db, ROLES_COLLECTION, role.id), {
    ...role,
    createdAt: role.createdAt ?? new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  })
  return role
}

export async function updateRole(role: Role): Promise<Role> {
  await setDoc(
    doc(db, ROLES_COLLECTION, role.id),
    { ...role, updatedAt: new Date().toISOString() },
    { merge: true }
  )
  return role
}

export async function deleteRole(roleId: string): Promise<void> {
  await deleteDoc(doc(db, ROLES_COLLECTION, roleId))
}

export async function seedRolesWithClient(): Promise<Role[]> {
  const batch = writeBatch(db)

  roleMockData.forEach((role) => {
    batch.set(doc(db, ROLES_COLLECTION, role.id), role, { merge: true })
  })

  await batch.commit()
  return getRoles()
}

/**
 * Generate a stable role id from a role name.
 * e.g. "Super Admin" -> "role-super-admin"
 */
export function generateRoleId(name: string): string {
  const slug = name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "")
  return `role-${slug}`
}