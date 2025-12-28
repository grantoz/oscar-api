// file: validator-wrapper.ts
import { ZodError, ZodSchema } from '@zod'
import type { ValidationTargets } from '@hono'
import { zValidator } from '@hono/zod-validator'
import { HTTPException } from '@hono/http-exception';
import { error } from 'node:console'

export const validate = <T extends ZodSchema, Target extends keyof ValidationTargets>(
  target: Target,
  schema: T
) =>
  zValidator(target, schema, (result, _c) => {
    if (!result.success) {
      console.log(result)
      const error = result.error.message
      // const foo = result.error.issues
      // throw new HTTPException(400, { cause: result.error })
      throw new HTTPException(400, { message: error })
    }
  })


  // data: { id: "019af282-f8ac-75b9-b193-fd4827821889x" },
  // success: false,
  // error: ZodError: [
  // {
  //   "origin": "string",
  //   "code": "invalid_format",
  //   "format": "uuid",
  //   "pattern": "/^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-7[0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12})$/",
  //   "path": [
  //     "id"
  //   ],
  //   "message": "Invalid UUID"
  // }