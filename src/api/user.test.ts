// import { load } from "@std/dotenv";
import "@std/dotenv/load";
import { assertEquals } from '@std/assert'
import { describe, it, before, } from 'node:test'
import { KyInstance } from 'ky'
import { asSuper, asAdmin, logHeaders, testUsers, type TestUser  } from '../util/test.ts';

interface loginOutput {
  token: string
}

let superApi: KyInstance
let _adminApi: KyInstance
let superUser: TestUser
let _adminUser: TestUser

describe("BDD-style tests", () => {
  before(async () => {
    superApi = await asSuper();
    _adminApi = await asAdmin();
    ({ superUser, adminUser: _adminUser } = testUsers)
  })

  it("should return 400 for get requests with non-uuid :id path parameter", async () => {
    await superApi.get('user/xxxxxxx', {
      throwHttpErrors: false
    }).then(async (resp) => {
      const text = await resp.text()
      console.log('raw error output:', text)
      assertEquals(400, resp.status)
      logHeaders(resp)
    })
  })

  it("get valid user ID should return 200 and matching output", async () => {
    await superApi.get('user', {
      throwHttpErrors: false
    }).then(async (resp) => {
      const output = await resp.json();
      console.log(output)
      assertEquals(200, resp.status)
      // TODO assert that output has array of userView instance
      logHeaders(resp)
    })
  })

  it("get valid user ID should return 200 and matching output", async () => {
    console.log('superId', superUser.id)
    await superApi.get(`user/${superUser.id}`, {
      throwHttpErrors: false
    }).then(async (resp) => {
      const output = await resp.json();
      console.log(output)
      // TODO assert that output is a userView instance
      assertEquals(200, resp.status)
    })
  })

 // TODO test etag
 // TODO test PATCH
})