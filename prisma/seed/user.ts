import { Prisma, PrismaClient } from '@mod/db'
import { faker as _faker} from '@faker'
import { hashPassword } from '@util'
import { Seeder } from './index.ts'

export interface SeededUser {
  email: string
  pass: string
}

export const seededUsers: Record<string, SeededUser> = {
  superUser: { email: 'super@grantoz.io', pass: 'superPass2025$' },
  adminUser: { email: 'admin@grantoz.io', pass: 'adminPass2025$' },
  staffUser: { email: 'staff@grantoz.io', pass: 'staffPass2025$' },
  userUser: { email: 'user@grantoz.io', pass: 'userPass2025$' },
}

// Prisma Client currently does not offer an option to pass where predicates into ON CONFLICT inference specifications.
// So seeding is with raw SQL (note that it is escaped by Prisma)

export const userSeeder: Seeder = {
  name: 'UserSeeder',
  always: async (db: PrismaClient) => {
    const { superUser } = seededUsers
    const user: Prisma.UserCreateInput = {
      name: 'Super User',
      email: superUser.email,
      role: { connect: { id: 'super' } },
      props: Prisma.DbNull,
      hash: await hashPassword(superUser.pass),
      seedKey: 'SEED DEFAULT SUPER USER'
      // verifiedAt: Date.now()
    }

    await db.user.upsert({
      where: { email: user.email, seedKey: user.seedKey as string | undefined },
      update: {},
      create: user,
    })

    // await Prisma.$executeRaw`
    //   INSERT INTO User (name, email, role, )
    //   VALUES (${user.name}, ${user.email})
    //   ON CONFLICT (seedKey) WHERE seedKey IS NOT NULL
    //   DO UPDATE SET config_value = EXCLUDED.config_value;
    // `;
    console.log(`Created 1 users`)
  },
  prod: async (_db: PrismaClient) => {},
  dev: async (db: PrismaClient) => {
    const { adminUser, staffUser, userUser } = seededUsers
    const userData: Prisma.UserCreateInput[] = [
      {
        name: 'Admin User',
        email: adminUser.email,
        role: { connect: { id: 'admin' } },
        props: Prisma.DbNull,
        hash: await hashPassword(adminUser.pass),
        // verifiedAt: Date.now()
      },
      {
        name: 'Staff User',
        email: staffUser.email,
        role: { connect: { id: 'staff' } },
        props: Prisma.DbNull,
        hash: await hashPassword(staffUser.pass),
        // verifiedAt: Date.now()
      },
      {
        name: 'User User',
        email: userUser.email,
        role: { connect: { id: 'user' } },
        props: Prisma.DbNull,
        hash: await hashPassword(userUser.pass),
        // verifiedAt: Date.now()
      },
      // FAKER EXAMPLE with posts
      // {
      //   name: faker.name.findName(),
      //   email: faker.internet.email(),
      //   phone: faker.phone.phoneNumber(),
      //   props: {},
      //   hash: null,
      //   posts: {
      //     create: [{
      //       title: faker.lorem.words(2),
      //       content: faker.lorem.words(5),
      //       published: false,
      //     }],
      //   },
      // },
    ]

    // Seed db, upsert to avoid duplicates if run multiple times.
    let count = 0
    for (const u of userData) {
      await db.user.upsert({
        where: { email: u.email },
        update: {},
        create: u,
      })
      count++
    }
    console.log(`Created ${count} users`)
  }
}
