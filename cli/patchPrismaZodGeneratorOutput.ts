#!/usr/bin/env -S deno run --allow-read --allow-write
import { join } from '@std/path'

const cwd = Deno.cwd()
const targetDir = `${cwd}/prisma/zod`

const changedFiles: string[] = [];

async function walk(dir: string) {
  for await (const entry of Deno.readDir(dir)) {
    const full = join(dir, entry.name);
    if (entry.isDirectory) {
      await walk(full);
    } else if (entry.isFile && entry.name.endsWith('.ts')) {
      await processFile(full);
    }
  }
}

async function processFile(file: string) {
  try {
    const content = await Deno.readTextFile(file);

    const lines = content.split('\n')
    const processed = lines.map((line) => {
      if (line.startsWith('import ')) {
        if (line.startsWith('import * as z')) {
          line = "import * as z from '@zod'"
        }
        else {
          line = line.replace(/';?$/, ".ts';")
        }
      }
      return line
    })
    const joined = processed.join('\n')

    if (joined !== content) {
      await Deno.writeTextFile(file, joined);
      console.log("Patched:", file);
      changedFiles.push(file);
    }
  // deno-lint-ignore no-explicit-any
  } catch (err: any) {
    console.error("Error processing", file, err?.message ?? err);
  }
}

async function main() {
  try {
    const stat = await Deno.stat(targetDir);
    if (!stat.isDirectory) {
      console.error("Target is not a directory:", targetDir);
      Deno.exit(2);
    }
  } catch (_err) {
    console.error("Directory not found:", targetDir);
    Deno.exit(2);
  }

  await walk(targetDir);

  console.log(`Done. Files changed: ${changedFiles.length}`);
  Deno.exit(0);
}

if (import.meta.main) {
  main();
}
