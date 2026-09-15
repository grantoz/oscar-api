import { Context } from '@hono'
import { actorStorage, kv, log } from '@util'
import type { SignatureAlgorithm } from '@hono/utils/jwt/jwa'
import { verify } from '@hono/jwt'
import { jwtUser } from '@/auth/types.ts'

const jwtAlgo = Deno.env.get('JWT_ALGORITHM') as SignatureAlgorithm
const jwtSecret = Deno.env.get('JWT_SECRET') as string
const port = parseInt(Deno.env.get('PORT') || '8000')

// TODO remove login token from KV on user update
// this will force revalidation using refresh token
// and if successful, we will store the updated user object into kv login

const verifyAndDecodeJwt = async (token: string) => {
  return await verify(token, jwtSecret, jwtAlgo) as jwtUser
}

const validateJwtMiddleware = async (c: Context, next: () => Promise<void>) => {
  const auth = c.req.header('Authorization')

  if (!auth || !auth.substring(0, 8).toLowerCase().startsWith('bearer ')) {
    return c.json({ error: 'Unauthorized' }, 401)
  }

  // Extract the token part
  const token = auth.substring(7)
  log.debug('validateJwt: token found in auth header', { token })

  try {
    const decoded = await verifyAndDecodeJwt(token)

    if (!decoded.sub || !decoded.email || !decoded.role || !decoded.exp) {
      log.info('invalid JWT payload', decoded)
      return c.json({ error: 'Unauthorized' }, 401)
    }
    log.debug('JWT is valid:', decoded)

    if (decoded.exp < Date.now()) {
      return c.json({ error: 'Unauthorized' }, 401)
    }

    // check whether the token is in the kv store
    const loginToken = await kv.get(['login', port, decoded.sub as string])
    if (!loginToken.value) {
      // is there still a refresh token in the KV store?
      const refreshToken = await kv.get(['refresh', port, decoded.sub as string])
      if (refreshToken.value) {
        log.info('requesting user not found in login KV, but found in refresh KV', { id: decoded.sub })
        c.header('WWW-Authenticate', 'Bearer error="invalid_token", error_description="The token claims are outdated or session invalidated."')
        return c.json({
          error: 'token_invalidated',
          message: 'Your session has been updated or revoked. Please refresh your token.',
          refresh_url: '/auth/refresh'
        }, 401)
      }
      log.info('requesting user not found in KV, they are logged out', { id: decoded.sub })
      c.header('WWW-Authenticate', 'Bearer realm="api", error="invalid_token", error_description="Authentication required. Please log in at /auth/login."')
      return c.json({
        error: 'unauthorized',
        message: 'Authentication required. Please log in.',
        login_url: '/auth/login'
      }, 401)
    }

    log.debug('logged-in user found in KV', { id: decoded.sub })

    // store user info in context for use in app components
    c.set('authUser', loginToken.value)
    actorStorage.enterWith(decoded.sub)
  } catch (error) {
    log.info('Invalid JWT:', { error })
    return c.json({ error: 'Unauthorized' }, 401)
  }

  await next()
}

export { validateJwtMiddleware, verifyAndDecodeJwt }
