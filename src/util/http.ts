// file: validator-wrapper.ts
import { ZodSchema } from '@zod'
import type { ValidationTargets } from '@hono'
import { zValidator } from '@hono/zod-validator'
import { HTTPException } from '@hono/http-exception';

export const validate = <T extends ZodSchema, Target extends keyof ValidationTargets>(
  target: Target,
  schema: T
) =>
  zValidator(target, schema, (result, _c) => {
    if (!result.success) {
      throw new HTTPException(400, { cause: result.error })
    }
  })
