import { Hono } from '@hono'
import { sign } from '@hono/jwt';
import { Context } from '@hono'
import { User } from '@mod/db'
import { log } from '../util/mod.ts'
import type { SignatureAlgorithm } from '@hono/utils/jwt/jwa';
import { authoriseLogin } from '../service/auth.ts';
import { jwtUser, refreshUser } from './types.ts';
import { z } from '@zod'
import { zValidator } from '@hono/zod-validator'

const jwtAlgo = Deno.env.get('JWT_ALGORITHM') as SignatureAlgorithm
const jwtSecret = Deno.env.get('JWT_SECRET') as string
const jwtExpiry = parseInt(Deno.env.get('JWT_EXPIRY') || '3600') * 1000 // default to 1 hour in ms
const refreshExpiry = parseInt(Deno.env.get('REFRESH_EXPIRY') || '604800') * 1000 // default to 1 hour in ms
const issuer = Deno.env.get('JWT_ISSUER') || 'oscar'

// grant_type: This parameter must be set to refresh_token.
// refresh_token: This parameter contains the actual refresh token value previously issued by the authorization server.
// client_id: The client's identifier, registered with the authorization server.
// client_secret: The client's secret, also registered with the authorization server. This is typically required for confidential clients (e.g., web applications) but may be omitted for public clients (e.g., native mobile apps) where it cannot be securely stored.
// scope (optional): A space-separated list of scopes requested for the new access token. This can be a subset of the scopes granted with the original refresh token.
const refreshTokenSchema = z.object({
  grant_type: 'refresh_token',
  refresh_token: z.string(),
  client_id: z.uuidv7()
})

type refreshTokenPayload = z.infer<typeof refreshTokenSchema>


const auth = new Hono()
.post('/login', async (c: Context) => {
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
    exp: Date.now() + jwtExpiry,
    iss: issuer,
  }
  const jwt = await sign(jwtPayload, jwtSecret, jwtAlgo)
  log.debug('login: generated JWT', jwtPayload)

  const refreshPayload: refreshUser = {
    sub: user.id,
    iss: issuer,
    role: 'refreshToken',
    exp: Date.now() + refreshExpiry,
  }
  const refreshToken = await sign(refreshPayload, jwtSecret, jwtAlgo)
  log.debug('login: generated refresh token', refreshPayload)

  const userData = Object.assign({}, user);
  userData.hash = null
  userData.salt = null

  // store the logged-in user in the kv store with an expiry matching the token
  const kv = await Deno.openKv()
  await kv.set(['login', user.id], userData, { expireIn: jwtExpiry })
  await kv.set(['refresh', user.id], userData, { expireIn: refreshExpiry })

  // TODO store hash of refresh token
  kv.close()

  // TODO emit metric for successful login
  return c.json({ token: jwt, refresh: refreshToken })
})
.post('/token', zValidator('json', refreshTokenSchema), async (c: Context) => {
  // NB here we are using application/json not application/www-form-encoded as is often done with refresh token endpoint
  const payload: refreshTokenPayload = c.req.valid('json' as never)
  // const userData: Prisma.UserCreateInput = {
  //   name: payload.name,
  //   email: payload.email,
  //   phone: payload.phone,
  //   props: {}, // Prisma.JsonNull, // or {} if you prefer
  // }

  // TODO refactor

  // 1. validate refresh token // TODO how
  // 2. DB read lookup on user
  // 3. generate new JWT
  // 4. store new JWT in KV
  // 5. generate new refresh token
  // 6. respond with

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
    exp: Date.now() + jwtExpiry,
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
  await kv.set(['login', user.id], userData, { expireIn: jwtExpiry })

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
// TODO implement reset password endpoint
// TODO implement email verification endpoint
// TODO implement refresh token endpoint
// TODO implement logout endpoint to invalidate tokens

