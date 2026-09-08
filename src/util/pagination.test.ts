import { pageOptions, prismaPagination } from '@/util/pagination.ts'
import { assertEquals } from '@std/assert'

Deno.test('parses pager params', () => {
  // note, queries are all string-based
  const pagerParams1 = {
    page: '1',
    size: '10',
    sort: 'name',
  }
  let opt: prismaPagination = pageOptions(pagerParams1)
  assertEquals({
    orderBy: { name: 'asc' },
    skip: 0,
    take: 10,
  }, opt)

  const pagerParams2 = {
    page: '3',
    size: '25',
    sort: 'field',
    dir: 'desc',
  }
  opt = pageOptions(pagerParams2)
  assertEquals({
    orderBy: { field: 'desc' },
    skip: 50,
    take: 25,
  }, opt)

  const badParams = {
    page: '3',
    size: '25',
    sort: 'field',
    dir: 'sausage',
  }
  opt = pageOptions(badParams)
  assertEquals({}, opt)
})
