import { Prisma, PrismaClient } from '@mod/db'
import { parse } from 'csv-parse/sync'
import { readFileSync } from 'node:fs'
import { Seeder } from './index.ts'

const text = readFileSync(
  process.cwd() + '/prisma/seed/countries.csv',
  'utf8',
)

const csvData = parse(text, {
  columns: true,
  skip_empty_lines: true,
  trim: true,
}) as Record<string, string>[]

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

export const countrySeeder: Seeder = {
  name: 'CountrySeeder',
  dev: async (_db: PrismaClient) => {},
  prod: async (_db: PrismaClient) => {},
  always: async (db: PrismaClient) => {
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
  },
}
