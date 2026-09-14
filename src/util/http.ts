// file: validator-wrapper.ts
import { ZodSchema } from '@zod'
import type { ValidationTargets } from '@hono'
import { validator } from 'hono-openapi'
import { HTTPException } from '@hono/http-exception'

export const validate = <
  T extends ZodSchema,
  Target extends keyof ValidationTargets,
>(
  target: Target,
  schema: T,
) =>
  validator(target, schema, (result, _c) => {
    if (!result.success) {
      const error = result.error.map((issue) => issue.message).join(', ')
      throw new HTTPException(400, { message: error })
    }
  })
