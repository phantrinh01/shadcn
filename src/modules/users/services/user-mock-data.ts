import usersData from "./data/users.json"

import type { User } from "./types/user-types"

/**
 * Mock data shaped like the joined `User` view (Auth record + profile).
 * Useful as a fallback when the Firebase Admin API is not configured.
 */
export const userMockData = usersData as User[]