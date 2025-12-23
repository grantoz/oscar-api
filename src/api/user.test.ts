// import { load } from "@std/dotenv";
import "@std/dotenv/load";
import { assert, assertEquals } from '@std/assert'
import { describe, it, beforeAll, } from '@std/testing/bdd'
import ky from 'ky'
import { superEmail, superPass } from '../../prisma/seed/user.ts'
import { encodeBase64 } from "@std/encoding/base64";
import { verifyAndDecodeJwt } from '../auth/jwt.ts'

const port = Deno.env.get('PORT') || 8001 // test port
console.log('MY PORT IS', port)

interface loginOutput {
  token: string
}

let token: string
let superId: string

describe("BDD style tests", () => {
  beforeAll(async () => {
    console.log('get super user creds before all tests')
    const auth = encodeBase64(superEmail + ':' + superPass)
    const resp: loginOutput = await ky.post(`http://localhost:${port}/auth/login`, {
      headers: {
        Authorization: 'Basic ' + auth
      }
    }).json()
    assert(resp)
    token = resp.token
    const decoded = await verifyAndDecodeJwt(token)
    //    if (!decoded.sub || !decoded.email || !decoded.role || !decoded.exp) {
    assert(decoded.sub)
    superId = decoded.sub
  })

  it("get bad user ID should return 404", async () => {
    await ky.get(`http://localhost:${port}/api/user/xxxxxxxx`, {
      headers: {
        Authorization: 'Bearer ' + token,
        'Content-Type': 'application/json'
      },
      throwHttpErrors: false
    }).then(async (resp) => {
      const text = await resp.text()
      console.log('YYY', text)
      Array.from(resp.headers.entries()).forEach(([key, value]: [string, string]) => {
        console.log(key, value)
      })
    })
  })

  it("get valid user ID should return 200 and matching output", async () => {
    console.log('superId', superId)
    await ky.get(`http://localhost:${port}/api/user`, { // will get page 1 of output, up to 10 records by default
      headers: {
        Authorization: 'Bearer ' + token,
        // 'Content-Type': 'application/json'
      },
      throwHttpErrors: false
    }).then(async (resp) => {
      const output = await resp.json();
      console.log(output)
      assertEquals(200, resp.status)
      // TODO assert that output has array of userView instance
      Array.from(resp.headers.entries()).forEach(([key, value]: [string, string]) => {
        console.log(key, value)
      })
    })
  })

  it("get valid user ID should return 200 and matching output", async () => {
    console.log('superId', superId)
    await ky.get(`http://localhost:${port}/api/user/${superId}`, {
      headers: {
        Authorization: 'Bearer ' + token,
        // 'Content-Type': 'application/json'
      },
      throwHttpErrors: false
    }).then(async (resp) => {
      const output = await resp.json();
      console.log(output)
      // TODO assert that output is a userView instance
      assertEquals(200, resp.status)
    })
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
})