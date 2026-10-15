import { db, User } from '@mod/db'
import { Algorithm, hash, Version } from '@node-rs/argon2'
import { log } from '@util'
// https://github.com/napi-rs/node-rs/tree/main/packages/argon2

// TODO
// add user.oauth BOOL
// add user.federated BOOL
// add user.verified - JSONB key val pairs, e.g. { email: datetime, phone: datetime, oauth: datetime, federated: datetime }

// add user.lastLoginIp, method
// add user.lastLoginAt - no, should be in login history

export const hashPasswordAndSave = async (user: User, password: string) => {
  const hash = await hashPassword(password)
  try {
    await db.user.update({
      where: {
        id: user.id,
      },
      data: {
        hash,
      },
    })
    log.info({ id: user.id }, 'user: updated password')
  } catch (err: unknown) {
    log.error({ err }, 'user: failed to update password')
    throw err
  }
}

// see https://github.com/felix-schindler/deno-argon2/blob/master/examples/with-options.ts
export const hashPassword = async function (password: string) {
  const encodedSalt = new TextEncoder().encode(genSalt())
  const hashed = await hash(password, {
    salt: encodedSalt,
    algorithm: Algorithm.Argon2id,
    version: Version.V0x13,
    memoryCost: 4096,
    timeCost: 10,
    parallelism: 4,
    outputLen: 64,
    // secret UInt8Array e.g. encoded APP_KEY for platform-specific hashing
  })
  return hashed

  // await verify(hashed, password, secret, data);
}

export const genSalt = () => {
  const array = new Uint16Array(16)
  crypto.getRandomValues(array)
  return array.reduce((acc, curr) => {
    return acc + String.fromCharCode((curr % 95) + 32)
  }, '')
}
