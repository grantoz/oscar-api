import { PrismaClient } from '@mod/db'
import { USER_ROLES, UserRole } from '@const'
import { Seeder } from './index.ts'

export const roleSeeder: Seeder = {
  name: 'RoleSeeder',
  dev: async (_db: PrismaClient) => {},
  prod: async (_db: PrismaClient) => {},
  always: async (db: PrismaClient) => {
    const roles: { id: UserRole; desc: string }[] = [
      { id: USER_ROLES.SUPER, desc: 'super user' },
      { id: USER_ROLES.ADMIN, desc: 'tenant admin user' },
      { id: USER_ROLES.STAFF, desc: 'tenant staff user' },
      { id: USER_ROLES.USER, desc: 'tenant client user' },
    ]

    let count = 0
    for (const r of roles) {
      await db.role.upsert({
        where: { id: r.id },
        update: { desc: r.desc },
        create: r,
      })
      count++
    }
    console.log(`Created ${count} user roles`)
  },
}
