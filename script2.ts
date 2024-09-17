import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const someUsers = await prisma.user.findMany({
    where: {
      id: { in: [1, 2, 3] },
    },
    include: {
      posts: true,
      profile: true,
    },
  })
  console.dir(someUsers, { depth: null })
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  });
