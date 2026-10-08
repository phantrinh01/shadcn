export const ADMIN_ROLE_ID = "role-admin"
export const ADMIN_EMAIL = "admin@claudecode.ai"
export const DOCUMENT_MANAGER_ROLE_ID = "role-document-manager"

type AdminAccessUser = {
  email?: string | null
  roles?: string[]
  isAdmin?: boolean
}

export function isAdminIdentifier(value?: string | null): boolean {
  return value?.trim().toLowerCase() === ADMIN_EMAIL
}

export function hasAdminAccess(user?: AdminAccessUser | null): boolean {
  return Boolean(
    user?.isAdmin ||
    isAdminIdentifier(user?.email) ||
    user?.roles?.includes(ADMIN_ROLE_ID)
  )
}

/**
 * Document Managers can create / update / delete documents.
 * Admins implicitly have this capability.
 */
export function hasDocumentManagerAccess(
  user?: AdminAccessUser | null
): boolean {
  return Boolean(
    hasAdminAccess(user) || user?.roles?.includes(DOCUMENT_MANAGER_ROLE_ID)
  )
}
