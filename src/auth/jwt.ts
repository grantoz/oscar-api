import { Context } from '@hono'
import { kv, log } from '@util'
import type { SignatureAlgorithm } from '@hono/utils/jwt/jwa';
import { verify } from '@hono/jwt';
import { jwtUser } from './types.ts';

const jwtAlgo = Deno.env.get('JWT_ALGORITHM') as SignatureAlgorithm
const jwtSecret = Deno.env.get('JWT_SECRET') as string
const port = parseInt(Deno.env.get('PORT') || '8000')

// TODO remove login token from KV on user update
// this will force revalidation using refresh token
// and if successful, we will store the updated user object into kv login

const verifyAndDecodeJwt = async (token: string) => {
  return await verify(token, jwtSecret, jwtAlgo) as jwtUser;
}

const validateJwtMiddleware = async (c: Context, next: () => Promise<void>) => {
  const auth = c.req.header('Authorization');

  if (!auth || !auth.substring(0, 8).toLowerCase().startsWith('bearer ')) {
    return c.json({ error: 'Not Authorized' }, 401);
  }

  // Extract the token part
  const token = auth.substring(7);
  log.debug('validateJwt: token found in auth header', { token })

  try {
    const decoded = await verifyAndDecodeJwt(token)

    if (!decoded.sub || !decoded.email || !decoded.role || !decoded.exp) {
      log.warn('invalid JWT payload', decoded)
      return c.json({ error: 'Not Authorized' }, 401);
    }
    log.debug('JWT is valid:', decoded);

    if (decoded.exp < Date.now()) {
      return c.json({ error: 'Not Authorized' }, 401);
    }

    // check whether the token is in the kv store
    const res = await kv.get(['login', port, decoded.sub as string])
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

  await next()
}

export { validateJwtMiddleware, verifyAndDecodeJwt }
