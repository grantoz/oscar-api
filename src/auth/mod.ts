import { Hono } from '@hono'
import { sign } from '@hono/jwt';
import { Context } from '@hono'
import { db, User } from '@mod/db'
import { log } from '../util/mod.ts'
import type { SignatureAlgorithm } from '@hono/utils/jwt/jwa';
import { verify } from '@hono/jwt';
import { authoriseLogin } from '../service/auth.ts';

const jwtAlgo = Deno.env.get('JWT_ALGORITHM') as SignatureAlgorithm
const jwtSecret = Deno.env.get('JWT_SECRET') as string
const expiry = parseInt(Deno.env.get('JWT_EXPIRY') || '3600') * 1000 // default to 1 hour in ms
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

  let user: User
  try {
    user = await authoriseLogin(email, password)
  } catch (_e) {
    return c.json({ error: 'Invalid login' }, 401)
  }

  const jwtPayload: jwtUser = {
    sub: user.id,
    email: user.email,
    role: user.role,
    exp: Date.now() + expiry,
    iss: issuer,
  }
  const jwt = await sign(jwtPayload, jwtSecret, jwtAlgo)
  log.debug('login: generated JWT', jwtPayload)

  // const refreshPayload = {
  //   sub: user.id,
  //   iss: issuer,
  // }

  // const refreshToken = await sign(refreshPayload, jwtSecret, jwtAlgo)

  const userData = Object.assign({}, user);
  userData.hash = null
  userData.salt = null

  // store the logged-in user in the kv store with an expiry matching the token
  const kv = await Deno.openKv()
  await kv.set(['login', user.id], userData, { expireIn: expiry })

  // TODO store hash of refresh token
  kv.close()

  // TODO emit metric for successful login
  return c.json({ token: jwt })
})

// TODO remove login token from KV on user update
// this will force revalidation using refresh token
// and if successful, we will store the updated user object into kv login

const validateJwtMiddleware = async (c: Context, next: () => Promise<void>) => {
  const auth = c.req.header('Authorization');

  if (!auth || !auth.substring(0, 8).toLowerCase().startsWith('bearer ')) {
    return c.json({ error: 'Not Authorized' }, 401);
  }

  // Extract the token part
  const token = auth.substring(7);
  log.debug('validateJwt: token found in auth header', { token })

  try {
    const decoded = await verify(token, jwtSecret, jwtAlgo) as jwtUser;

    if (!decoded.sub || !decoded.email || !decoded.role || !decoded.exp) {
      log.warn('invalid JWT payload', decoded)
      return c.json({ error: 'Not Authorized' }, 401);
    }
    log.debug('JWT is valid:', decoded);

    if (decoded.exp < Date.now()) {
      // TODO look for refresh token in header and storage, use that
      return c.json({ error: 'Not Authorized' }, 401);
    }

    // check whether the token is in the kv store
    const kv = await Deno.openKv()
    const res = await kv.get(['login', decoded.sub as string])
    kv.close()
    if (!res.value) {
      log.info('logged-in user not found in store (logged out?):', decoded);
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

