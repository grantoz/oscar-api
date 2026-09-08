// import { validateJwtMiddleware } from '@/middleware/jwt.ts'
import { auth } from './auth.ts'
import { jwtUser } from './types.ts'

export { auth }
export type { jwtUser }

// TODO implement token revocation from KV
// TODO implement register endpoint
// TODO implement forgot password endpoint
// TODO implement reset password endpoint
// TODO implement email verification endpoint
// TODO implement refresh token endpoint
// TODO implement logout endpoint to invalidate tokens
