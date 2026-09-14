import '@std/dotenv/load'
import { assert, assertEquals } from '@std/assert'
import { before, describe, it } from 'node:test'
import ky, { KyInstance } from 'ky'
import { asSuper } from '../util/test.ts'

const port = Deno.env.get('PORT') ?? 8001

interface ApiEnvelope<T> {
  data: T
  meta?: unknown
}

interface Country {
  id: string
  name: string
  alpha3: string
  countryCode: number
  region?: string | null
  regionCode?: number | null
  subRegion?: string | null
  subRegionCode?: number | null
}

let superApi: KyInstance

describe('country endpoints', () => {
  before(async () => {
    superApi = await asSuper()
  })

  it('GET /country should return 200 with an array of countries', async () => {
    const resp = await superApi.get('country', { throwHttpErrors: false })
    const output = await resp.json() as ApiEnvelope<Country[]>
    assertEquals(200, resp.status)
    assert(Array.isArray(output.data))
    assert(output.data.length > 0)
  })

  it('GET /country/au should return 200 for a lowercase country code', async () => {
    const resp = await superApi.get('country/au', { throwHttpErrors: false })
    assertEquals(200, resp.status)
    const output = await resp.json() as ApiEnvelope<Country>
    assertEquals(output.data.id, 'AU')
    assertEquals(output.data.name, 'Australia')
  })

  it('GET /country/AU should return 200 for an uppercase country code', async () => {
    const resp = await superApi.get('country/AU', { throwHttpErrors: false })
    assertEquals(200, resp.status)
    const output = await resp.json() as ApiEnvelope<Country>
    assertEquals(output.data.id, 'AU')
  })

  it('GET /country/zz should return 404 for an unknown country code', async () => {
    const resp = await superApi.get('country/zz', { throwHttpErrors: false })
    assertEquals(404, resp.status)
  })

  it('GET /country/a should return 400 for a non 2-letter code', async () => {
    const resp = await superApi.get('country/a', { throwHttpErrors: false })
    assertEquals(400, resp.status)
  })

  it('GET /country should return 401 without a bearer token', async () => {
    const resp = await ky.get(`http://localhost:${port}/api/country`, {
      throwHttpErrors: false,
    })
    assertEquals(401, resp.status)
  })
})
