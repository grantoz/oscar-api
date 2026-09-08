import { Prisma, PrismaClient } from '@mod/db'
import { parse } from '@std/csv'

export default async (db: PrismaClient) => {
  const text = Deno.readTextFileSync(Deno.cwd() + '/prisma/seed/countries.csv')

  const csvData = parse(text, {
    skipFirstRow: true,
    strip: true,
  })

  const countryData: Prisma.CountryCreateInput[] = csvData.map((row) => ({
    id: row.id,
    name: row.name,
    alpha3: row.alpha3,
    countryCode: parseInt(row.countryCode),
    region: row.region,
    subRegion: row.subRegion,
    regionCode: parseInt(row.regionCode),
    subRegionCode: parseInt(row.subRegionCode),
  }))

  // Seed db, use upsert to avoid duplicates if run multiple times.
  let count = 0
  for (const d of countryData) {
    await db.country.upsert({
      where: { id: d.id },
      update: d,
      create: d,
    })
    count++
    // console.log(`Created country with id: ${country.id}`);
  }
  console.log(`Created ${count} countries`)
}
