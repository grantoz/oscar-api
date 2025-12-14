// import { load } from "@std/dotenv";
import "@std/dotenv/load";
import { assert } from '@std/assert'
import { describe, it, beforeAll, } from '@std/testing/bdd'
import ky from 'ky'
import { superEmail, superPass } from '../../prisma/seed/user.ts'
import { encodeBase64 } from "@std/encoding/base64";

// await load({
//   envPath: '.env.test',
//   export: true
// });
const port = Deno.env.get('PORT') || 8000

interface loginOutput {
  token: string
}

let token: string

describe("BDD style tests", () => {
  beforeAll(async () => {
    console.log('get super user creds before all tests')
    const auth = encodeBase64(superEmail + ':' + superPass)
    const result: loginOutput = await ky.post(`http://localhost:${port}/auth/login`, {
      headers: {
        Authorization: 'Basic ' + auth
      }
    }).json()
    assert(result)
    console.log(result)
    token = result.token
  })

  // it("should get JSON using ky", async () => {
  //   type postComment = {
  //     userId: number,
  //     id: number,
  //     title: string,
  //     body: string
  //   }
  //   const data: Array<postComment> = await ky('https://jsonplaceholder.typicode.com/posts/1/comments').json()
  //   assertGreater(data.length, 0)
  //   assertEquals(data[0].id, 1)
  //   console.log(data)
  // })

  it("should get custom validation error message with get bad user ID", async () => {
    // const auth = encodeBase64(superEmail + ':' + superPass)
    // const login: object = await ky.post(`http://localhost:${port}/auth/login`, {
    //   headers: {
    //     Authorization: 'Basic ' + auth
    //   }
    // }).json()
    // console.log(login)

    const result: object = await ky.post(`http://localhost:${port}/user/bad-id`, {
      headers: {
        Authorization: 'Bearer ' + token
      }
    }).json()
    assert(result)
  })
})