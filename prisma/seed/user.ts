import { Prisma, PrismaClient } from '@mod/db'
import { faker } from "https://deno.land/x/deno_faker@v1.0.3/locale/en_AU.ts";
import { genSalt, hashPassword } from '../../src/service/user.ts';
import { encodeBase64 } from "@std/encoding/base64";

const superEmail = 'super@grantoz.io'
const adminEmail = 'admin@grantoz.io'
const staffEmail = 'staff@grantoz.io'
const userEmail = 'user@grantoz.io'
let superPass = 'super'
let adminPass = 'admin'
let staffPass = 'staff'
let userPass = 'user'

const genRandomStr = (length: number): string => {
  length = Math.floor(length)
  return encodeBase64(crypto.getRandomValues(new Uint8Array(length)))
}

const userLogins = () => {
  const testEnv = Deno.args.includes('--test') || (Deno.env.get('APP_ENV') == 'test')

  if (!testEnv) {
    superPass = genRandomStr(20)
    console.info(`SUPER password is ${superPass} - YOU WILL NOT SEE THIS AGAIN`)
    adminPass = genRandomStr(20)
    staffPass = genRandomStr(20)
    userPass = genRandomStr(20)
  }
  return { superEmail, superPass, adminEmail, adminPass, staffEmail, staffPass, userEmail, userPass }
}


export default async (db: PrismaClient) => {

  const { superEmail, superPass, adminEmail, adminPass } = userLogins()

  const superSalt = genSalt()
  const superHash = await hashPassword(superPass, superSalt)
  const adminSalt = genSalt()
  const adminHash = await hashPassword(adminPass, adminSalt)
  const staffSalt = genSalt()
  const staffHash = await hashPassword(staffPass, staffSalt)
  const userSalt = genSalt()
  const userHash = await hashPassword(staffPass, staffSalt)

  const userData: Prisma.UserCreateInput[] = [
    {
      name: "Super User",
      email: superEmail,
      role: "super",
      props: Prisma.DbNull,
      hash: superHash,
      salt: superSalt,
      // verifiedAt: Date.now()
    },
    {
      name: "Admin User",
      email: adminEmail,
      role: "admin",
      props: Prisma.DbNull,
      hash: adminHash,
      salt: adminSalt,
      // verifiedAt: Date.now()
    },
    {
      name: "Staff User",
      email: staffEmail,
      role: "staff",
      props: Prisma.DbNull,
      hash: staffHash,
      salt: staffSalt,
      // verifiedAt: Date.now()
    },
    {
      name: "User User",
      email: userEmail,
      role: "user",
      props: Prisma.DbNull,
      hash: userHash,
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
          title: "Aardonyx Facts",
          content: "Aardonyx was a pro-sauropod dinosaur that lived in the Early Jurassic period.",
          published: false,
        }]
      },
    },
  ];

  // Seed db, upsert to avoid duplicates if run multiple times.
  let count = 0
  for (const u of userData) {
    await db.user.upsert({
      where: { email: u.email },
      update: {},
      create: u,
    });
    count ++
  }
  console.log(`Created ${count} users`);
}

export { superEmail, adminEmail, superPass, adminPass }