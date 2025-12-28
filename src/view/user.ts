import { User, Post } from '@mod/db'

export type UserView = Omit<User, 'hash' | 'salt' | 'props' | 'verifiedAt'>
  & { props: Record<string, unknown>, posts?: Post[] }


const userView = (user: User & { posts?: Post[] }): UserView => {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    props: (user.props || {}) as Record<string, unknown>,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    deletedAt: user.deletedAt,
    posts: user.posts
  }
}

export { userView }