import { Post, User } from '@mod/db'

type UserWithRole = User & { posts?: Post[]; role?: { id: string } }

export type UserView =
  & Omit<User, 'hash' | 'seedKey' | 'props' | 'verifiedAt' | 'roleId'>
  & { props: Record<string, unknown>; posts?: Post[]; role: string }

const userView = (user: UserWithRole): UserView => {
  const role = (user as unknown as { roleId: string }).roleId ??
    user.role?.id ?? ''
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role,
    props: (user.props || {}) as Record<string, unknown>,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    deletedAt: user.deletedAt,
    posts: user.posts,
  }
}

export { userView }
