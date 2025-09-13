import { Hono } from '@hono'
import { sign } from '@hono/jwt';
import { hashPassword } from '../service/user.ts'
import { Context } from '@hono'
import { db } from '@mod/db'
import { log } from '../util/mod.ts'
import type { SignatureAlgorithm } from '@hono/utils/jwt/jwa';
import { verify } from '@hono/jwt';

const jwtAlgo = Deno.env.get('JWT_ALGORITHM') as SignatureAlgorithm
const jwtSecret = Deno.env.get('JWT_SECRET') as string
const expiry = parseInt(Deno.env.get('JWT_EXPIRY') || '3600') // default to 1 hour
const issuer = Deno.env.get('JWT_ISSUER') || 'oscar'

type jwtUser = {
  sub: string
  email: string
  role: string
  exp: number
  iss: string
}

const auth = new Hono().post('/login', async (c: Context) => {
  const auth = c.req.header('Authorization');

  if (!auth || !auth.startsWith('Basic ')) {
    c.res.headers.set('WWW-Authenticate', 'Basic realm="Secure Area"');
    return c.text('Not Authorized', 401);
  }

  // Extract the Base64-encoded part
  const encodedCreds = auth.substring(6);

  // Decode the Base64 string
  const decodedCreds = atob(encodedCreds);

  // Split into username and password
  const [email, password] = decodedCreds.split(':');

  const user = await db.user.findUnique({
    where: {
      email: email
    },
  })

  if (!user) {
    log.warn('login: user not found', { email }) // not a PII leak as user does not exist
    return c.json({ error: 'Invalid email or password' }, 401)
  }

  // todo test that this really works for user record not found
  if (!user?.salt || !user?.hash) {
    log.warn('login: user has no auth set up', { extId: user.extId })
    return c.json({ error: 'Invalid email or password' }, 401)
  }

  const hash = await hashPassword(password, user?.salt || '')
  if (hash !== user?.hash) {
    log.warn('login: bad password', { extId: user.extId })
    return c.json({ error: 'Invalid email or password' }, 401)
  }
  log.info('login: authorised', { extId: user.extId })

  const token = await sign(
    {
      sub: user.extId,
      email: user.email,
      role: user.role,
      // TODO add more user info to JWT payload?
      // e.g. permissions, settings, profile info
      // but keep it minimal to avoid large tokens
      // and avoid sensitive info
      exp: Math.floor(Date.now() / 1000) + expiry,
      iss: issuer,
    }, jwtSecret, jwtAlgo
  )
  log.info('login: generated JWT', { email, extId: user.extId })

  const userData = Object.assign({}, user);
  userData.hash = null
  userData.salt = null

  // store the logged-in user in the kv store with an expiry matching the token
  const kv = await Deno.openKv()
  await kv.set(['login', user.extId], userData, { expireIn: expiry * 1000 })
  kv.close()

  // TODO emit metric for successful login
  return c.json({ token })
})


// export const validateJwt = createMiddleware(async (c, next) => {
const validateJwtMiddleware = async (c: Context, next: () => Promise<void>) => {
  if (c.req.path.startsWith('/api')) {
    const auth = c.req.header('Authorization');

    if (!auth || !auth.substring(0, 8).toLowerCase().startsWith('bearer ')) {
      return c.json({ error: 'Not Authorized' }, 401);
    }

    // Extract the token part
    const token = auth.substring(7);
    log.debug('validateJwt: token found in auth header', { token })
    try {
      const decodedPayload = await verify(token, jwtSecret, jwtAlgo);
      log.debug('JWT is valid:', decodedPayload);

      // check whether the token is in the kv store
      const kv = await Deno.openKv()
      const res = await kv.get(['login', decodedPayload.sub as string])
      kv.close()
      if (!res.value) {
        log.info('logged-in user not found in store (logged out?):', decodedPayload);
        return c.json({ error: 'Not Authorized' }, 401);
      }

      log.debug('logged-in user found in KV', { kvUser: res.value });

      // store user info in context for use in app components
      c.set('authUser', res.value)
    } catch (error) {
      log.warn('Invalid JWT:', { error });
      return c.json({ error: 'Not Authorized' }, 401);
    }

    // TODO implement token validation
  }
  await next()
}

export { auth, validateJwtMiddleware }
export type { jwtUser }

// TODO implement token revocation from KV
// TODO implement register endpoint
// TODO implement forgot password endpoint
// TODO implement reset password endpoint
// TODO implement email verification endpoint
// TODO implement refresh token endpoint
// TODO implement logout endpoint to invalidate tokens

