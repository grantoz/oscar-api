import { User, Prisma } from '@mod/db'

export type UserView = Omit<User, 'id' | 'extId' | 'hash' | 'salt' | 'props'>
  & { id: string, props: Record<string, unknown> }

// transform a User model instance to a UserView
// TODO this is a privileged view, filter based on requester's role/permissions
const userView = (user: User): UserView => {
  return {
    id: user.extId,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    props: (user.props || {}) as Record<string, unknown>,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    deletedAt: user.deletedAt,
  }
}

export { userView }