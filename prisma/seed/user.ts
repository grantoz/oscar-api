import { db, Prisma } from '@mod/db'
import { faker } from "https://deno.land/x/deno_faker@v1.0.3/locale/en_AU.ts";
import { genSalt, hashPassword } from '../../src/service/user.ts';

// TODO seeds for different environments
// TODO secret storage for super passwords for stage/uat/sandbox/prod

const superSalt = genSalt()
const superHash = await hashPassword("super", superSalt) // todo random strong password generator
const superAuth = {
  salt: superSalt,
  hash: superHash
}

const testSalt = genSalt()
const testHash = await hashPassword("test", testSalt) // todo random strong password generator
const testAuth = {
  salt: testSalt,
  hash: testHash
}


export default async () => {

  const userData: Prisma.UserCreateInput[] = [
    {
      name: "Super",
      email: "super@grantoz.io",
      role: "super",
      props: Prisma.JsonNull,
      hash: superAuth.hash,
      salt: superAuth.salt,
    },
    {
      name: faker.name.findName(),
      email: faker.internet.email(),
      phone: faker.phone.phoneNumber(),
      props: {},
      hash: testAuth.hash,
      salt: testAuth.salt,
    },
  ];

  /**
   * Seed the database.
   */

  for (const u of userData) {
    const user = await db.user.create({
      data: u,
    });
    console.log(`Created user with id: ${user.id}`);
  }
}

    // {
    //   name: "Admin",
    //   email: "admin@grantoz.io",
    //   role: "admin"
    // },
    // {
    //   name: "Staff",
    //   email: "staff@grantoz.io",
    //   role: "staff"
    // },
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
    // {
    //   name: "Abelisaurus",
    //   email: "Abelisaurus@grantoz.io",
    //   phone: faker.phone.phoneNumber(),
    //   posts: {
    //     create: [{
    //       title: "Abelisaurus Info",
    //       content: "Abel's lizard has been reconstructed from a single skull.",
    //       published: true,
    //       extId: ulid()
    //     }]
    //   },
    // },
    // {
    //   name: faker.name.findName(),
    //   email: faker.internet.email(),
    //   phone: faker.phone.phoneNumber(),
    // },
