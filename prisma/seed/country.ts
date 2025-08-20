import { db, Model } from '@mod/db'
import "jsr:@std/dotenv/load";
import { parse } from "jsr:@std/csv";

export default async () => {
  const text = Deno.readTextFileSync(Deno.cwd() + "/prisma/seed/countries.csv")

  const csvData = parse(text, {
    skipFirstRow: true,
    strip: true,
  });

  const countryData: Model.CountryCreateInput[] = csvData.map(row => ({
    id: row.id,
    name: row.name,
    alpha3: row.alpha3,
    countryCode: parseInt(row.countryCode),
    region: row.region,
    subRegion: row.subRegion,
    regionCode: parseInt(row.regionCode),
    subRegionCode: parseInt(row.subRegionCode),
  }));

  for (const d of countryData) {
    const country = await db.country.create({
      data: d,
    });
    console.log(`Created country with id: ${country.id}`);
  }
}
