import { encodeBase64 } from "@std/encoding/base64";
import { verifyAndDecodeJwt } from '../auth/jwt.ts'
import { assert } from '@std/assert'
import ky, { KyResponse, type KyInstance } from 'ky'
import { seededUsers, type SeededUser } from '../../prisma/seed/user.ts'

/**
 * Test utilities
 */

const port = Deno.env.get('PORT') || 8001 // test port

interface loginOutput {
  token: string
}

export interface TestUser extends SeededUser {
  id: string
  token: string
  refreshToken: string
}

export const testUsers: Record<string, TestUser> = {
  superUser: {
    ...seededUsers.superUser,
    id: '',
    token: '',
    refreshToken: ''
  },
  adminUser: {
    ...seededUsers.adminUser,
    id: '',
    token: '',
    refreshToken: ''
  },
  staffUser: {
    ...seededUsers.staffUser,
    id: '',
    token: '',
    refreshToken: ''
  },
  userUser: {
    ...seededUsers.userUser,
    id: '',
    token: '',
    refreshToken: ''
  },
}

let superToken: string
let adminToken: string
// let superId: string
let superApi: KyInstance
let adminApi: KyInstance

const apiUri = `http://localhost:${port}/api`
const authUri = `http://localhost:${port}/auth`

const api = ky.create({prefix: apiUri});
const _auth = ky.create({prefix: authUri});

const { superUser, adminUser } = seededUsers

const asSuper = async(): Promise<KyInstance> => {
  if (superApi !== undefined) {
    return superApi
  }
  const auth = encodeBase64(superUser.email + ':' + superUser.pass)
  await ky.post(`${authUri}/login`, {
    headers: {
      Authorization: 'Basic ' + auth
    }
  }).then(async(resp) => {
    const respJson: loginOutput = await resp.json()
    assert(respJson)
    superToken = respJson.token
    superApi = api.extend({headers: {
      Authorization: 'Bearer ' + superToken
    }})

    const decoded = await verifyAndDecodeJwt(superToken)
    assert(decoded.sub) // sub = id. Also, available: email, role, exp
    testUsers.superUser.id = decoded.sub

    const cookie = resp.headers.get('set-cookie')
    assert(cookie)
    testUsers.superUser.refreshToken = cookie.substring(8, cookie.indexOf(';'))
  })
  return superApi
}

const asAdmin = async() => {
  if (adminApi !== undefined) {
    return adminApi
  }
  const auth = encodeBase64(adminUser.email + ':' + adminUser.pass)
  await ky.post(`${authUri}/login`, {
    headers: {
      Authorization: 'Basic ' + auth
    }
  }).then(async(resp) => {
    const respJson: loginOutput = await resp.json()
    assert(respJson)
    adminToken = respJson.token
    adminApi = api.extend({headers: {
      Authorization: 'Bearer ' + adminToken
    }})

    const decoded = await verifyAndDecodeJwt(adminToken)
    assert(decoded.sub) // sub = id. Also, available: email, role, exp
    testUsers.adminUser.id = decoded.sub

    const cookie = resp.headers.get('set-cookie')
    assert(cookie)
    testUsers.adminUser.refreshToken = cookie.substring(8, cookie.indexOf(';'))
  })
  return adminApi
}

const logHeaders = (resp: KyResponse<unknown>) => {
  Array.from(resp.headers.entries()).forEach(([key, value]: [string, string]) => {
    console.log(key, value)
  })
}

export {
  asSuper, asAdmin, logHeaders
}