import { Context } from '@hono'
import { log } from '../util/mod.ts'
import type { SignatureAlgorithm } from '@hono/utils/jwt/jwa';
import { verify } from '@hono/jwt';
import { jwtUser } from './types.ts';

const jwtAlgo = Deno.env.get('JWT_ALGORITHM') as SignatureAlgorithm
const jwtSecret = Deno.env.get('JWT_SECRET') as string

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

export { validateJwtMiddleware }

// TODO implement token revocation from KV
// TODO implement register endpoint
// TODO implement reset password endpoint
// TODO implement email verification endpoint
// TODO implement refresh token endpoint
// TODO implement logout endpoint to invalidate tokens

