// import { db } from "../db.ts"
// import * as foo from "@mod/db"
import 'jsr:@std/dotenv/load'
import { db } from '@mod/db'

export function add(a: number, b: number): number {
  return a + b
}

// Learn more at https://docs.deno.com/runtime/manual/examples/module_metadata#concepts
if (import.meta.main) {
  console.log('Add 4 + 13 =', add(4, 13))
}

const allUsers = await db.user.findMany({
  include: {
    posts: true,
  },
})
console.dir(allUsers, { depth: null })

import { hash, Variant, verify, Version } from "@felix/argon2";

export const testArgon2 = async () => {
  const salt = crypto.getRandomValues(
  	new Uint8Array(20),
  );

  const encoder = new TextEncoder();
  const password = "this-could_be/yourP4ssword";
  const secret = encoder.encode("my-super-secret");
  const data = {
  	hashedAt: Date.now(),
  	requestId: crypto.randomUUID(),
  };

  const hashed = await hash(password, {
  	salt,
  	secret,
  	variant: Variant.Argon2id,
  	version: Version.V13,
  	memoryCost: 8192,
  	timeCost: 10,
  	lanes: 4,
  	hashLength: 32,
  	data,
  });

  return await verify(hashed, password, secret, data);
}