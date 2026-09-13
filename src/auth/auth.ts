import { Context, Hono } from '@hono'
import { verify } from '@hono/jwt'
import { db, User } from '@mod/db'
import { createAndStoreLoginTokens, deleteLoginTokens, kv, log } from '@util'
import type { SignatureAlgorithm } from '@hono/utils/jwt/jwa'
import { authoriseLogin } from '@/util/auth.ts'
import { validateJwtMiddleware } from '@middleware'
import { jwtUser } from './types.ts'
import { z } from '@zod'
import { zValidator } from '@hono/zod-validator'
// import { HTTPException } from '@hono/http-exception'
import { deleteCookie, getCookie, setCookie } from '@hono/cookie'

const jwtAlgo = Deno.env.get('JWT_ALGORITHM') as SignatureAlgorithm
const jwtSecret = Deno.env.get('JWT_SECRET') as string
const refreshCookieExpiry = parseInt(Deno.env.get('REFRESH_EXPIRY') || '604800') // default to 1 week in s
const port = parseInt(Deno.env.get('PORT') || '8000')

// grant_type: This parameter must be set to refresh_token.
// refresh_token: This parameter contains the actual refresh token value previously issued by the authorization server.
// client_id: The client's identifier, registered with the authorization server.
// client_secret: The client's secret, also registered with the authorization server. This is typically required for confidential clients (e.g., web applications) but may be omitted for public clients (e.g., native mobile apps) where it cannot be securely stored.
// scope (optional): A space-separated list of scopes requested for the new access token. This can be a subset of the scopes granted with the original refresh token.
const refreshTokenSchema = z.object({
  grant_type: z.string().startsWith('refresh_token').length(13),
  refresh_token: z.string(),
  client_id: z.uuidv7(),
}).strict()

// Regex for printable ASCII characters (codes 32-126)
const printableAsciiRegex = /^[\x20-\x7E]*$/

type refreshTokenPayload = z.infer<typeof refreshTokenSchema>

// TODO validate NO OTHER BODY OR QUERY PASSED TO LOGIN ENDPOINT?
const auth = new Hono()
  .post('/login', async (c: Context) => { // TODO could probably custom zValidate auth header here
    const auth = c.req.header('Authorization')

    if (!auth || !auth.startsWith('Basic ')) {
      c.res.headers.set('WWW-Authenticate', 'Basic realm="Secure Area"')
      return c.text('Not Authorized', 401)
    }

    // Extract the Base64-encoded part
    const encodedCreds = auth.substring(6)

    try {
      z.base64().parse(encodedCreds)
    } catch (_error) {
      log.debug('encoded creds is not base64')
      return c.json({ error: 'Invalid login' }, 401)
    }

    // Decode the Base64 string
    const decodedCreds = atob(encodedCreds)

    // Split into username and password
    const [email, password] = decodedCreds.split(':')

    try {
      z.email().parse(email)
      // TODO enforce sensible min password as app constant TODO updated seeders to match
      z.string().min(5).max(128).regex(printableAsciiRegex).parse(password)
    } catch (error) {
      log.info('login email or password validation error', error)
      return c.json({ error: 'Invalid login' }, 401)
    }

    let user: User
    try {
      user = await authoriseLogin(email, password)
    } catch (_e) {
      return c.json({ error: 'Invalid login' }, 401)
    }

    const { token, refresh } = await createAndStoreLoginTokens(user)

    setCookie(c, 'refresh', refresh, {
      path: '/auth/refresh', // The path for which the cookie is valid
      secure: true, // Ensures the cookie is only sent over HTTPS
      httpOnly: true, // Prevents JavaScript access, mitigating XSS attacks
      maxAge: refreshCookieExpiry, // Cookie expiry in seconds (e.g., 1 week)
      sameSite: 'Strict', // Prevents cookies from being sent with cross-site requests, mitigating CSRF attacks
    })

    // TODO emit metric for successful login
    return c.json({ token })
  })
  .post(
    '/refresh',
    zValidator('json', refreshTokenSchema),
    async (c: Context) => {
      // NB here we are using application/json not application/www-form-encoded as is often done with refresh token endpoint
      // we are also using the secure HttpOnly cookie, not one passed in the payload
      const payload: refreshTokenPayload = c.req.valid('json' as never)
      const refreshToken = getCookie(c, 'refresh') ?? ''

      let userId: string
      try {
        const decoded = await verify(
          refreshToken,
          jwtSecret,
          jwtAlgo,
        ) as jwtUser

        if (!decoded.sub || !decoded.exp) { // any more fields required?
          log.warn('invalid refresh token payload', decoded)
          return c.json({ error: 'Not Authorized' }, 401)
        }
        log.debug('refresh token is valid:', decoded)

        if (decoded.exp < Date.now() || decoded.sub != payload.client_id) {
          return c.json({ error: 'Not Authorized' }, 401)
        }

        // check whether the refresh token is in the kv store
        const res = await kv.get(['refresh', port, decoded.sub as string])
        if (!res.value) {
          log.info('refresh token for user not found in kv:', decoded)
          return c.json({ error: 'Not Authorized' }, 401)
        }

        log.debug('refresh token for user found in kv', { kvUser: res.value })
        userId = decoded.sub
      } catch (error) {
        log.warn('Invalid JWT:', { error })
        return c.json({ error: 'Not Authorized' }, 401)
      }

      const user = await db.user.findUnique({
        where: {
          id: userId,
        },
      })

      if (!user) {
        log.warn('user not found despite valid refresh token!', { id: userId })
        return c.json({ error: 'Not Authorized' }, 401)
      }

      const { token, refresh } = await createAndStoreLoginTokens(user)

      setCookie(c, 'refresh', refresh, {
        path: '/auth/refresh', // The path for which the cookie is valid
        secure: true, // Ensures the cookie is only sent over HTTPS
        httpOnly: true, // Prevents JavaScript access, mitigating XSS attacks
        maxAge: refreshCookieExpiry, // Cookie expiry in seconds (e.g., 1 week)
        sameSite: 'Strict', // Prevents cookies from being sent with cross-site requests, mitigating CSRF attacks
      })

      // TODO emit metric for successful refresh
      return c.json({ token })
    },
  )
  .post('/logout', validateJwtMiddleware, async (c: Context) => {
    const user = c.get('authUser') as User

    await deleteLoginTokens(user)

    deleteCookie(c, 'refresh', {
      path: '/auth/refresh', // must match the path used when the cookie was set
      secure: true,
      httpOnly: true,
      sameSite: 'Strict',
    })

    // TODO emit metric for successful logout
    return c.json({ message: 'Logged out' })
  })

// TODO remove login token from KV on user update
// this will force revalidation using refresh token
// and if successful, we will store the updated user object into kv login

export { auth }

// TODO implement register endpoint
// TODO implement reset password endpoint with email workflow, rather than just allow it in PATCH
// TODO implement email verification endpoint
