import { loadSync } from "@std/dotenv"; 

const appEnv = Deno.env.get("APP_ENV") ?? 'dev'

const record = loadSync({ envPath: `./.env.${appEnv}`, export: true })
if (Object.keys(record).length === 0) {
  console.log(`.env.${appEnv} not found, you must use an APP_ENV value that corresponds to an existing .env file. Exiting.`)
  Deno.exit()
}

export default appEnv