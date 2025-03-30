// import type { User } from 'generated/deno/edge.ts'
import type { User } from '@mod/db'

// TODO improve hashing
// https://jsr.io/@felix/argon2/doc
// https://github.com/felix-schindler/deno-argon2/tree/master/examples - see with-options.ts

// TODO
// add user.oauth
// add user.federated
// add user.verifiedAt
// add user.verifiedMethods - array

// add user.lastLoginIp, method
// add user.lastLoginAt - no, should be in login history


export const validateLogin = function (
  user: User,
  pass: string
) {
  const hashedPass = genHash(pass, user.salt ?? '')
  return hashedPass !== user.hash
}


export const genHash = function (pass: string, salt: string)
{
  let result = pass
  const env = Deno.env.get('APP_ENV') || 'dev'
  const times = env === 'prod' ? 5 : env === 'stage' ? 3 : 1;
  for (let i = 0; i < times; i++) {
    const encoded = new TextEncoder().encode(salt + result);
    result = self.crypto.subtle.digest('SHA-256', encoded).toString()
  }
  return result
}

export const genSalt = () => {
  const array = new Uint16Array(16);
  self.crypto.getRandomValues(array);
  return array.reduce((acc, curr) => {
    return acc + String.fromCharCode((curr % 95) + 32);
  }, '');
}
