// Pure authorization helpers for the user endpoints.
// This module has no runtime imports so it can be unit tested without DB/KV.
import { USER_ROLES, UserRole } from '@const'

export type AuthUser = { id: string; roleId: string }

export const ROLE_AUTHORITY: Record<UserRole, number> = {
  [USER_ROLES.SUPER]: 4,
  [USER_ROLES.ADMIN]: 3,
  [USER_ROLES.STAFF]: 2,
  [USER_ROLES.USER]: 1,
}

const authorityOf = (roleId: string): number | undefined =>
  ROLE_AUTHORITY[roleId as UserRole]

// A role may grant roles strictly below its own authority; 'admin' and above
// may additionally grant their own role (staff cannot mint staff peers).
export const canAssignRole = (
  actorRole: string,
  targetRole: string,
): boolean => {
  const actor = authorityOf(actorRole)
  const target = authorityOf(targetRole)
  if (actor === undefined || target === undefined) {
    return false
  }
  return target < actor ||
    (target === actor && actor >= ROLE_AUTHORITY[USER_ROLES.ADMIN])
}

export const canCreateUser = (
  authUser: AuthUser,
  roleId: UserRole,
): boolean => {
  return canAssignRole(authUser.roleId, roleId)
}

export const canPatchUser = (
  authUser: AuthUser,
  target: AuthUser,
  newRoleId?: UserRole,
): boolean => {
  if (authUser.id === target.id) {
    return newRoleId === undefined || canAssignRole(authUser.roleId, newRoleId)
  }
  const actor = authorityOf(authUser.roleId)
  if (actor === undefined || actor < ROLE_AUTHORITY[USER_ROLES.ADMIN]) {
    return false
  }
  return canAssignRole(authUser.roleId, target.roleId) &&
    (newRoleId === undefined || canAssignRole(authUser.roleId, newRoleId))
}
