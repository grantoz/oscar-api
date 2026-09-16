import { assertEquals } from '@std/assert'
import { USER_ROLES } from '@const'
import { canAssignRole, canCreateUser, canPatchUser } from './userAuthz.ts'

const actorId = '019af282-f8ac-7c1d-b193-fd4827821889'
const otherId = '019af282-f8ac-7c1d-b193-fd4827821890'

const as = (roleId: string) => ({ id: actorId, roleId })

Deno.test('canAssignRole grants roles strictly below the actor authority', () => {
  assertEquals(canAssignRole('admin', 'staff'), true)
  assertEquals(canAssignRole('admin', 'user'), true)
  assertEquals(canAssignRole('staff', 'user'), true)
  assertEquals(canAssignRole('super', 'admin'), true)
})

Deno.test('canAssignRole grants own role only to admin and above', () => {
  assertEquals(canAssignRole('super', 'super'), true)
  assertEquals(canAssignRole('admin', 'admin'), true)
  assertEquals(canAssignRole('staff', 'staff'), false)
  assertEquals(canAssignRole('user', 'user'), false)
})

Deno.test('canAssignRole denies roles at or above the actor authority', () => {
  assertEquals(canAssignRole('admin', 'super'), false)
  assertEquals(canAssignRole('staff', 'admin'), false)
  assertEquals(canAssignRole('staff', 'staff'), false)
  assertEquals(canAssignRole('user', 'staff'), false)
})

Deno.test('canAssignRole denies unknown roles', () => {
  assertEquals(canAssignRole('unknown', 'user'), false)
  assertEquals(canAssignRole('admin', 'unknown'), false)
})

Deno.test('canCreateUser denies role user from creating any record', () => {
  for (const roleId of Object.values(USER_ROLES)) {
    assertEquals(canCreateUser(as('user'), roleId), false)
  }
})

Deno.test('canCreateUser allows staff to create user records only', () => {
  assertEquals(canCreateUser(as('staff'), 'user'), true)
  assertEquals(canCreateUser(as('staff'), 'staff'), false)
  assertEquals(canCreateUser(as('staff'), 'admin'), false)
  assertEquals(canCreateUser(as('staff'), 'super'), false)
})

Deno.test('canCreateUser allows admin to create admin, staff and user records', () => {
  assertEquals(canCreateUser(as('admin'), 'admin'), true)
  assertEquals(canCreateUser(as('admin'), 'staff'), true)
  assertEquals(canCreateUser(as('admin'), 'user'), true)
  assertEquals(canCreateUser(as('admin'), 'super'), false)
})

Deno.test('canCreateUser allows super to create any record including super', () => {
  for (const roleId of Object.values(USER_ROLES)) {
    assertEquals(canCreateUser(as('super'), roleId), true)
  }
})

Deno.test('canPatchUser allows any role to edit their own record', () => {
  for (const roleId of Object.values(USER_ROLES)) {
    assertEquals(canPatchUser(as(roleId), as(roleId)), true)
  }
})

Deno.test('canPatchUser denies role changes on own record outside assignable roles', () => {
  assertEquals(canPatchUser(as('user'), as('user'), 'admin'), false)
  assertEquals(canPatchUser(as('staff'), as('staff'), 'admin'), false)
  assertEquals(canPatchUser(as('admin'), as('admin'), 'super'), false)
  assertEquals(canPatchUser(as('super'), as('super'), 'user'), true)
})

Deno.test('canPatchUser denies staff and user from editing other records', () => {
  for (const targetRole of Object.values(USER_ROLES)) {
    assertEquals(
      canPatchUser(as('staff'), { id: otherId, roleId: targetRole }),
      false,
    )
    assertEquals(
      canPatchUser(as('user'), { id: otherId, roleId: targetRole }),
      false,
    )
  }
})

Deno.test('canPatchUser denies admin from editing super records', () => {
  assertEquals(
    canPatchUser(as('admin'), { id: otherId, roleId: 'super' }),
    false,
  )
})

Deno.test('canPatchUser allows admin to edit lower-authority records', () => {
  for (const targetRole of ['admin', 'staff', 'user'] as const) {
    assertEquals(
      canPatchUser(as('admin'), { id: otherId, roleId: targetRole }),
      true,
    )
  }
})

Deno.test('canPatchUser allows super to edit any record', () => {
  for (const targetRole of Object.values(USER_ROLES)) {
    assertEquals(
      canPatchUser(as('super'), { id: otherId, roleId: targetRole }),
      true,
    )
  }
})

Deno.test('canPatchUser requires assignable role for role changes on other records', () => {
  assertEquals(canPatchUser(as('admin'), as('staff'), 'admin'), true)
  assertEquals(canPatchUser(as('admin'), as('user'), 'super'), false)
  assertEquals(canPatchUser(as('admin'), as('user'), 'staff'), true)
  assertEquals(canPatchUser(as('super'), as('user'), 'super'), true)
})

Deno.test('canPatchUser allows user to change own name but not own role', () => {
  assertEquals(canPatchUser(as('user'), as('user')), true)
  assertEquals(canPatchUser(as('user'), as('user'), 'user'), false)
})
