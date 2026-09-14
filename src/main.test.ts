import { assert, assertEquals, assertExists } from '@std/assert'
import ky from 'ky'

const port = Deno.env.get('PORT') ?? 8001
const openApiUri = `http://localhost:${port}/openapi`

interface OpenApiOperation {
  tags?: string[]
  security?: Array<Record<string, string[]>>
  parameters?: Array<{ name: string; in: string; required?: boolean }>
  responses?: Record<string, unknown>
  requestBody?: {
    content?: Record<string, { schema?: Record<string, unknown> }>
  }
}

interface OpenApiDocument {
  openapi: string
  info: { title: string; version: string; description?: string }
  paths: Record<string, Record<string, OpenApiOperation>>
  components?: { securitySchemes?: Record<string, unknown> }
}

const fetchSpec = async (): Promise<OpenApiDocument> => {
  const resp = await ky.get(openApiUri, { throwHttpErrors: false })
  assertEquals(resp.status, 200)
  assert(resp.headers.get('content-type')?.includes('application/json'))
  return await resp.json() as OpenApiDocument
}

Deno.test('GET /openapi should return an OpenAPI 3 document', async () => {
  const spec = await fetchSpec()
  assert(spec.openapi.startsWith('3.'))
  assertEquals(spec.info.title, 'Oscar API')
  assertEquals(spec.info.version, '1.0.0')
})

Deno.test('GET /openapi should document the auth routes', async () => {
  const spec = await fetchSpec()
  for (const path of ['/auth/login', '/auth/refresh', '/auth/logout']) {
    const operation = spec.paths[path]?.post
    assertExists(operation, `missing POST ${path}`)
    assertEquals(operation.tags, ['auth'])
  }
})

Deno.test('GET /openapi should describe the auth responses', async () => {
  const spec = await fetchSpec()
  const login = spec.paths['/auth/login']?.post
  assertExists(login?.responses)
  assertExists(login.responses['200'])
  assertExists(login.responses['401'])

  const logout = spec.paths['/auth/logout']?.post
  assertExists(logout?.responses)
  assertExists(logout.responses['200'])
})

Deno.test('GET /openapi should document the refresh request body', async () => {
  const spec = await fetchSpec()
  const body = spec.paths['/auth/refresh']?.post.requestBody
  const schema = body?.content?.['application/json']?.schema
  const properties = schema?.properties as Record<string, unknown> | undefined
  assertExists(properties)
  assertExists(properties['grant_type'])
  assertExists(properties['refresh_token'])
  assertExists(properties['client_id'])
})

Deno.test('GET /openapi should document the api routes with bearer security', async () => {
  const spec = await fetchSpec()
  const paths = [
    '/api/user',
    '/api/user/{id}',
    '/api/post',
    '/api/post/{id}',
    '/api/country',
    '/api/country/{id}',
  ]
  for (const path of paths) {
    assertExists(spec.paths[path], `missing path ${path}`)
    for (const operation of Object.values(spec.paths[path])) {
      assertEquals(operation.security, [{ bearerAuth: [] }])
    }
  }
  assertExists(spec.components?.securitySchemes?.bearerAuth)
})

Deno.test('GET /openapi should document api path params and request bodies', async () => {
  const spec = await fetchSpec()

  const idParam = spec.paths['/api/user/{id}']?.get.parameters?.find((p) =>
    p.name === 'id'
  )
  assertExists(idParam)
  assertEquals(idParam.in, 'path')
  assertEquals(idParam.required, true)

  const schema = spec.paths['/api/post']?.post.requestBody?.content?.[
    'application/json'
  ]?.schema
  const properties = schema?.properties as Record<string, unknown> | undefined
  assertExists(properties)
  assertExists(properties['title'])
  assertExists(properties['content'])
})
