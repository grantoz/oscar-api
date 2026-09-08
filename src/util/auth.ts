import { db, User } from '@mod/db'
import { kv, log } from '@util'
import { hashPassword } from '@/util/user.ts'
import { sign } from '@hono/jwt'
import type { SignatureAlgorithm } from '@hono/utils/jwt/jwa'
import { jwtUser, refreshUser } from './types.ts'
import { HTTPException } from '@hono/http-exception'

const jwtAlgo = Deno.env.get('JWT_ALGORITHM') as SignatureAlgorithm
const jwtSecret = Deno.env.get('JWT_SECRET') as string
const jwtExpiry = parseInt(Deno.env.get('JWT_EXPIRY') || '3600') * 1000 // default to 1 hour in ms
const refreshExpiry = parseInt(Deno.env.get('REFRESH_EXPIRY') || '604800') *
  1000 // default to 1 week in ms
const issuer = Deno.env.get('JWT_ISSUER') || 'oscar'
const port = parseInt(Deno.env.get('PORT') || '8000')

const authoriseLogin = async (
  email: string,
  password: string,
): Promise<User> => {
  // TODO - currently inputs are validated in /auth/login
  // if this gets used externally elsewhere, validate email and password e.g.
  // const printableAsciiRegex = /^[\x20-\x7E]*$/;
  // try {
  //   z.email().parse(email);
  //   z.string().min(12).max(128).regex(printableAsciiRegex).parse(password)
  // } catch (_error) {
  //   return c.json({ error: 'Invalid login' }, 401)
  // }

  const user = await db.user.findUnique({
    where: {
      email: email,
    },
  })

  // TODO improve exceptions
  if (!user) {
    log.warn('login: user not found', { email }) // not a PII leak as user does not exist
    throw new Error()
  }

  // todo test that this really works for user record not found
  if (!user?.salt || !user?.hash) {
    log.warn('login: user has no auth set up', { id: user.id })
    throw new Error()
  }

  const hash = await hashPassword(password, user?.salt || '')
  if (hash !== user?.hash) {
    log.warn('login: bad password', { id: user.id })
    throw new Error()
  }
  log.info('login: authorised', { id: user.id })
  return user
}

const createAndStoreTokens = async (user: User) => {
  if (!user) {
    // TODO throw Error, have caller catch and return 401
    throw new HTTPException(401, { message: 'Not Authorized' })
  }
  const jwtPayload: jwtUser = {
    sub: user.id,
    email: user.email,
    role: user.role,
    exp: Date.now() + jwtExpiry,
    iss: issuer,
  }
  const jwt = await sign(jwtPayload, jwtSecret, jwtAlgo)
  log.debug('generated JWT', jwtPayload)

  const refreshPayload: refreshUser = {
    sub: user.id,
    iss: issuer,
    role: 'refreshToken',
    exp: Date.now() + refreshExpiry,
  }
  const refreshToken = await sign(refreshPayload, jwtSecret, jwtAlgo)
  log.debug('generated refresh token', refreshPayload)

  const userData = Object.assign({}, user)
  userData.hash = null
  userData.salt = null

  // store the logged-in user in the kv store with an expiry matching the token
  await Promise.all([
    kv.set(['login', port, user.id], userData, { expireIn: jwtExpiry }),
    kv.set(['refresh', port, user.id], userData, { expireIn: refreshExpiry }),
  ])

  // TODO emit metric for token generation
  return { token: jwt, refresh: refreshToken }
}

export { authoriseLogin, createAndStoreTokens }
