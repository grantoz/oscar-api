import { Hono } from '@hono'
import { sign } from '@hono/jwt';
import { Context } from '@hono'
import { User } from '@mod/db'
import { log } from '../util/mod.ts'
import type { SignatureAlgorithm } from '@hono/utils/jwt/jwa';
import { authoriseLogin } from '../service/auth.ts';
import { jwtUser } from './types.ts';

const jwtAlgo = Deno.env.get('JWT_ALGORITHM') as SignatureAlgorithm
const jwtSecret = Deno.env.get('JWT_SECRET') as string
const expiry = parseInt(Deno.env.get('JWT_EXPIRY') || '3600') * 1000 // default to 1 hour in ms
const issuer = Deno.env.get('JWT_ISSUER') || 'oscar'

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

export { auth }

// TODO implement token revocation from KV
// TODO implement register endpoint
// TODO implement forgot password endpoint
// TODO implement reset password endpoint
// TODO implement email verification endpoint
// TODO implement refresh token endpoint
// TODO implement logout endpoint to invalidate tokens

