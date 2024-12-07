// users.js
import sql from './db.js'

// SELECT 'CREATE DATABASE oscar_test' WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'oscar_test')

async function testQuery() {
  const result = await sql`select 1 as test_output`
  return result
}

console.log('result: ', await testQuery())

await sql.end()
Deno.exit();

/*
async function getUsersOver(age) {
  const users = await sql`
    select
      name,
      age
    from users
    where age > ${ age }
  `
  // users = Result [{ name: "Walter", age: 80 }, { name: 'Murray', age: 68 }, ...]
  return users
}


async function insertUser({ name, age }) {
  const users = await sql`
    insert into users
      (name, age)
    values
      (${ name }, ${ age })
    returning name, age
  `
  // users = Result [{ name: "Murray", age: 68 }]
  return users
}
*/
