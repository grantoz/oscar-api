import { db, User } from '@mod/db'
import { hash, Variant, Version } from '@felix/argon2'
import { log } from '@util'
// https://jsr.io/@felix/argon2/doc

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
    log.info('user: updated password', { id: user.id })
  } catch (err: unknown) {
    log.error('user: failed to update password', err)
    throw err
  }
}

// see https://github.com/felix-schindler/deno-argon2/blob/master/examples/with-options.ts
export const hashPassword = async function (password: string) {
  const encodedSalt = new TextEncoder().encode(genSalt())
  const hashed = await hash(password, {
    salt: encodedSalt,
    variant: Variant.Argon2id,
    version: Version.V13,
    timeCost: 10,
    lanes: 4,
    hashLength: 64,
    // secret UInt8Array e.g. encoded APP_KEY for platform-specific hashing
  })
  return hashed.toString()

  // await verify(hashed, password, secret, data);
}

export const genSalt = () => {
  const array = new Uint16Array(16)
  self.crypto.getRandomValues(array)
  return array.reduce((acc, curr) => {
    return acc + String.fromCharCode((curr % 95) + 32)
  }, '')
}
