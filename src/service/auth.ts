import { db, User } from '@mod/db'
import { log } from '../util/mod.ts'
import { hashPassword } from '../service/user.ts'

const authoriseLogin = async (email: string, password: string): Promise<User> => {
  const user = await db.user.findUnique({
    where: {
      email: email
    },
  })

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