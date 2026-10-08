import rolesData from "./data/roles.json"
import usersRolesData from "./data/users-roles.json"

import { roleSchema, userRoleSchema } from "./types/user-types"
import type { Role, UserRole } from "./types/user-types"

export const roleMockData = roleSchema.array().parse(rolesData) as Role[]
export const userRoleMockData = userRoleSchema
  .array()
  .parse(usersRolesData) as UserRole[]