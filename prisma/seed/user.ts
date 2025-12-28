import { Prisma, PrismaClient } from '@mod/db'
import { faker } from 'https://deno.land/x/deno_faker@v1.0.3/locale/en_AU.ts'
import { genSalt, hashPassword } from '@util'
import { encodeBase64 } from '@std/encoding/base64'

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

const genRandomStr = (length: number): string => {
  length = Math.floor(length)
  return encodeBase64(crypto.getRandomValues(new Uint8Array(length)))
}

const randomisePasswordsForDeployedEnvs = () => {
  const env = Deno.env.get('APP_ENV') ?? ''
  const live = ['prod', 'uat', 'sandbox'].includes(env)
  if (live) {
    const superPass = genRandomStr(20)
    console.info(`SUPER password is ${superPass} - YOU WILL NOT SEE THIS AGAIN`)
    seededUsers.superUser.pass = superPass
    seededUsers.adminUser.pass = genRandomStr(20)
    seededUsers.staffUser.pass = genRandomStr(20)
    seededUsers.userUser.pass = genRandomStr(20)
  }
}

export default async (db: PrismaClient) => {
  randomisePasswordsForDeployedEnvs()
  const { superUser, adminUser, staffUser, userUser } = seededUsers

  const superSalt = genSalt()
  const adminSalt = genSalt()
  const staffSalt = genSalt()
  const userSalt = genSalt()

  const userData: Prisma.UserCreateInput[] = [
    {
      name: 'Super User',
      email: superUser.email,
      role: 'super',
      props: Prisma.DbNull,
      hash: await hashPassword(superUser.pass, superSalt),
      salt: superSalt,
      // verifiedAt: Date.now()
    },
    {
      name: 'Admin User',
      email: adminUser.email,
      role: 'admin',
      props: Prisma.DbNull,
      hash: await hashPassword(adminUser.pass, adminSalt),
      salt: adminSalt,
      // verifiedAt: Date.now()
    },
    {
      name: 'Staff User',
      email: staffUser.email,
      role: 'staff',
      props: Prisma.DbNull,
      hash: await hashPassword(staffUser.pass, staffSalt),
      salt: staffSalt,
      // verifiedAt: Date.now()
    },
    {
      name: 'User User',
      email: userUser.email,
      role: 'user',
      props: Prisma.DbNull,
      hash: await hashPassword(userUser.pass, userSalt),
      salt: userSalt,
      // verifiedAt: Date.now()
    },
    // FAKER EXAMPLE with posts
    {
      name: faker.name.findName(),
      email: faker.internet.email(),
      phone: faker.phone.phoneNumber(),
      props: {},
      hash: null,
      salt: null,
      posts: {
        create: [{
          title: 'Aardonyx Facts',
          content:
            'Aardonyx was a pro-sauropod dinosaur that lived in the Early Jurassic period.',
          published: false,
        }],
      },
    },
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
