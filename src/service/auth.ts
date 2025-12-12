import { db, User } from '@mod/db'
import { log } from '../util/mod.ts'
import { hashPassword } from '../service/user.ts'

const authoriseLogin = async (email: string, password: string): Promise<User> => {

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
      email: email
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

export { authoriseLogin }