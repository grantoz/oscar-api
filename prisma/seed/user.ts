import { db, Model } from '@mod/db'
import "jsr:@std/dotenv/load";
import { faker } from "https://deno.land/x/deno_faker@v1.0.3/locale/en_AU.ts";
import { ulid } from '@std/ulid/ulid'
import { Prisma } from 'generated/deno/edge.js'
// import { genSalt, hashPassword } from '../../src/service/user.ts';

// TODO seeds for different environments
// TODO secret storage for super passwords for stage/uat/sandbox/prod

export default async () => {

  const userData = [
    {
      name: "Super",
      email: "super@grantoz.io",
      role: "super",
      props: Prisma.JsonNull,
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
