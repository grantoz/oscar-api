import { PrismaClient } from '@mod/db'

export default async (db: PrismaClient) => {
  const roles = [
    { id: 'super', desc: 'super user' },
    { id: 'admin', desc: 'client admin user' },
    { id: 'staff', desc: 'client staff user' },
    { id: 'user', desc: 'client customer user' },
  ]

  let count = 0
  for (const r of roles) {
    await db.role.upsert({
      where: { id: r.id },
      update: { desc: r.desc },
      create: r,
    })
    count++
  }
  console.log(`Created ${count} roles`)
}
