// import { db, Prisma } from '@mod/db'
import { Prisma, PrismaClient } from '@mod/db'
import { faker } from "https://deno.land/x/deno_faker@v1.0.3/locale/en_AU.ts";
import { genSalt, hashPassword } from '../../src/service/user.ts';
import { encodeBase64 } from "@std/encoding/base64";

const test = Deno.args.includes('--test')

let superPass, adminPass = ''
if (test) {
  superPass = 'super'
  adminPass = 'admin'
} else {
  let randomBytes = crypto.getRandomValues(new Uint8Array(20));
  superPass = encodeBase64(randomBytes);
  randomBytes = crypto.getRandomValues(new Uint8Array(20));
  adminPass = encodeBase64(randomBytes);

  console.info(`SUPER password is ${superPass} - YOU WILL NOT SEE THIS AGAIN`)
}

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

export default async (db: PrismaClient) => {

  const userData: Prisma.UserCreateInput[] = [
    {
      name: "Super User",
      email: "super@grantoz.io",
      role: "super",
      props: Prisma.DbNull,
      hash: superAuth.hash,
      salt: superAuth.salt,
    },
    {
      name: "Admin User",
      email: "admin@grantoz.io",
      role: "admin",
      props: Prisma.DbNull,
      hash: adminAuth.hash,
      salt: adminAuth.salt,
    },
    // FAKER EXAMPLE
    // {
    //   name: faker.name.findName(),
    //   email: faker.internet.email(),
    //   phone: faker.phone.phoneNumber(),
    //   props: {},
    //   hash: testAuth.hash,
    //   salt: testAuth.salt,
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

// can also e.g. seed with posts:
// {
//   name: "Aardonyx",
//   email: "aardonyx@grantoz.io",
//   phone: faker.phone.phoneNumber(),
//   posts: {
//     create: [{
//       title: "Aardonyx Facts",
//       content: "Aardonyx was a prosauropod dinosaur that lived in the Early Jurassic period.",
//       published: true,
//     }]
//   },
// },

export { superPass, adminPass }