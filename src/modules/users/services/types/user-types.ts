import { z } from "zod"

// =====================================================
// Users
// =====================================================

export const genderEnum = z.enum(["male", "female", "other"])
export type Gender = z.infer<typeof genderEnum>

export const userStatusEnum = z.enum(["active", "pending", "disabled"])
export type UserStatus = z.infer<typeof userStatusEnum>

/**
 * Firestore user profile document (doc id === uid from Firebase Auth).
 * This is the "profile" stored alongside the Auth record.
 */
export const userProfileSchema = z.object({
  uid: z.string(),
  name: z.string().min(1, "Tên không được để trống"),
  email: z.string().email("Email không hợp lệ"),
  gender: genderEnum,
  phone: z.string().min(8, "Số điện thoại không hợp lệ").max(20),
  status: userStatusEnum,
  photoURL: z.string().url().nullable().optional(),
  address: z.string().optional().default(""),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
})

export type UserProfile = z.infer<typeof userProfileSchema>

/**
 * Combined User type — joined from Firebase Auth record + Firestore profile.
 * Fields prefixed with `auth*` come from `admin.auth.UserRecord`.
 * Fields like `name`, `gender`, `phone`, `status` come from the Firestore profile doc.
 * When a profile doc is missing the system falls back to Auth data.
 */
export interface User {
  // From Firebase Auth
  uid: string
  email: string
  name: string               // Auth displayName || profile.name
  photoURL: string | null    // Auth photoURL || profile.photoURL
  disabled: boolean
  emailVerified: boolean
  creationTime: string | null
  lastSignInTime: string | null
  /** Provider IDs linked to this account, e.g. ["password"], ["google.com"], ["google.com", "github.com"] */
  providers: string[]
  // From Firestore profile (may be absent)
  gender: Gender
  phone: string
  status: UserStatus
  address: string
  profileCreatedAt: string | null
  profileUpdatedAt: string | null
}

/** Human-friendly labels for known Firebase Auth provider IDs. */
export const AUTH_PROVIDER_LABELS: Record<string, string> = {
  password: "Email / Password",
  "google.com": "Google",
  "facebook.com": "Facebook",
  "github.com": "GitHub",
  "twitter.com": "Twitter",
  "apple.com": "Apple",
  "microsoft.com": "Microsoft",
  "yahoo.com": "Yahoo",
  phone: "Phone",
  anonymous: "Anonymous",
  custom: "Custom",
}

export function getProviderLabel(providerId: string): string {
  return AUTH_PROVIDER_LABELS[providerId] ?? providerId
}

// Form values for create/edit user (client-side)
export const userFormSchema = z.object({
  name: z.string().min(2, "Tên phải có ít nhất 2 ký tự"),
  email: z.string().email("Email không hợp lệ"),
  gender: genderEnum,
  phone: z.string().min(8, "Số điện thoại không hợp lệ").optional().or(z.literal("")),
  status: userStatusEnum,
  password: z.string().min(6, "Mật khẩu phải có ít nhất 6 ký tự").optional(),
})

export type UserFormValues = z.infer<typeof userFormSchema>

// Payload for creating a user via API (Firebase Auth + Firestore profile)
export const createUserPayloadSchema = z.object({
  name: z.string().min(2, "Tên phải có ít nhất 2 ký tự"),
  email: z.string().email("Email không hợp lệ"),
  gender: genderEnum,
  phone: z.string().min(8, "Số điện thoại không hợp lệ").optional().or(z.literal("")),
  status: userStatusEnum,
  password: z.string().min(6, "Mật khẩu phải có ít nhất 6 ký tự"),
})

export type CreateUserPayload = z.infer<typeof createUserPayloadSchema>

// Payload for updating a user via API
export const updateUserPayloadSchema = z.object({
  name: z.string().min(2).optional(),
  gender: genderEnum.optional(),
  phone: z.string().min(8).max(20).optional(),
  status: userStatusEnum.optional(),
  disabled: z.boolean().optional(),
  password: z.string().min(6).optional(),
})

export type UpdateUserPayload = z.infer<typeof updateUserPayloadSchema>

// =====================================================
// Roles
// =====================================================

export const roleSchema = z.object({
  id: z.string(),
  name: z.string().min(1, "Tên role không được để trống"),
  description: z.string().default(""),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
})

export type Role = z.infer<typeof roleSchema>

export const roleFormSchema = z.object({
  name: z.string().min(1, "Tên role không được để trống"),
  description: z.string(),
})

export type RoleFormValues = z.infer<typeof roleFormSchema>

// =====================================================
// Users ↔ Roles (many-to-many)
// =====================================================

export const userRoleSchema = z.object({
  id: z.string(),
  uid: z.string(),
  roleId: z.string(),
  createdAt: z.string().optional(),
})

export type UserRole = z.infer<typeof userRoleSchema>