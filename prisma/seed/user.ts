// import { db, Prisma } from '@mod/db'
import { Prisma, PrismaClient } from '@mod/db'
// import { faker } from "https://deno.land/x/deno_faker@v1.0.3/locale/en_AU.ts";
import { genSalt, hashPassword } from '../../src/service/user.ts';
import { encodeBase64 } from "@std/encoding/base64";

const superEmail = 'super@grantoz.io'
const adminEmail = 'admin@grantoz.io'
let superPass = 'super'
let adminPass = 'admin'

const userLogins = () => {
  const testEnv = Deno.args.includes('--test') || (Deno.env.get('APP_ENV') == 'test')

  if (!testEnv) {
    if (superPass === 'super') {
      superPass = encodeBase64(crypto.getRandomValues(new Uint8Array(20)));
      console.info(`SUPER password is ${superPass} - YOU WILL NOT SEE THIS AGAIN`)
    }
    if (adminPass === 'admin') {
      adminPass = encodeBase64(crypto.getRandomValues(new Uint8Array(20)));
    }
  }
  return { superEmail, superPass, adminEmail, adminPass }
}


export default async (db: PrismaClient) => {

  const { superEmail, superPass, adminEmail, adminPass } = userLogins()

  const superSalt = genSalt()
  const superHash = await hashPassword(superPass, superSalt)
  const superAuth = {
    salt: superSalt,
    hash: superHash
  }

  const adminSalt = genSalt()
  const adminHash = await hashPassword(adminPass, adminSalt)
  const adminAuth = {
    salt: adminSalt,
    hash: adminHash
  }

  const userData: Prisma.UserCreateInput[] = [
    {
      name: "Super User",
      email: superEmail,
      role: "super",
      props: Prisma.DbNull,
      hash: superAuth.hash,
      salt: superAuth.salt,
    },
    {
      name: "Admin User",
      email: adminEmail,
      role: "admin",
      props: Prisma.DbNull,
      hash: adminAuth.hash,
      salt: adminAuth.salt,
    },
    // FAKER EXAMPLE with posts
    // {
    //   name: faker.name.findName(),
    //   email: faker.internet.email(),
    //   phone: faker.phone.phoneNumber(),
    //   props: {},
    //   hash: testAuth.hash,
    //   salt: testAuth.salt,
    //   posts: {
    //     create: [{
    //       title: "Aardonyx Facts",
    //       content: "Aardonyx was a pro-sauropod dinosaur that lived in the Early Jurassic period.",
    //       published: true,
    //     }]
    //   },
    // },
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