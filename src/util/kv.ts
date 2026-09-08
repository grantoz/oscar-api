// const port = Deno.env.get('PORT') ?? 8000
const kv = await Deno.openKv()

// You can also add helper functions here
async function getUser(id: string) {
  const res = await kv.get(['users', id])
  return res.value
}

export { getUser, kv }
