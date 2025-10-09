import { Post } from '@mod/db'

export type PostView = Omit<Post, 'id' | 'extId' | 'userId' >
  & { id: string }

const postView = (post: Post): PostView => {
  return {
    id: post.id,
    title: post.title,
    content: post.content,
    published: post.published,
    createdAt: post.createdAt,
    updatedAt: post.updatedAt,
    deletedAt: post.deletedAt,
  }
}

export { postView }