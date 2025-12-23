import { encodeBase64 } from "@std/encoding/base64";
import { TextLineStream } from "@std/streams";

// Generate 64 cryptographically secure random bytes
const randomBytes = crypto.getRandomValues(new Uint8Array(64));

// Encode the random bytes to a Base64 string
const jwtSecret = encodeBase64(randomBytes);
// console.log(jwtSecret);

let outFileName = '.env'
const test = Deno.args.includes('--test')
if (test) {
  outFileName = '.env.test'
}

async function processEnvFile() {
  const cwd = Deno.cwd();
  // console.log(`Current working directory: ${cwd}`);
  const inFile = await Deno.open(cwd + '/env/.env.dev');
  const outFile = await Deno.create(cwd + '/' + outFileName); // .env or .env.test
  const writer = outFile.writable.getWriter();

  try {
    const lineStream = inFile.readable
      .pipeThrough(new TextDecoderStream())
      .pipeThrough(new TextLineStream());

    for await (let line of lineStream) {

      if (line.startsWith('JWT_SECRET=')) {
        // Replace the line with the new JWT_SECRET value
        line = `JWT_SECRET=${jwtSecret}`;
      }

      if (test) {
        if (line.startsWith('DB_DB=')) {
          // Replace the line with the new JWT_SECRET value
          line = line + '_test';
        }
        if (line.startsWith('DB_URL=')) {
          if (line.includes('?')) {
            line = line.replace('?', '_test?')
          } else {
            line = line + '_test';
          }
        }
        if (line.startsWith('LOG_DB')) {
          line = line.replace('true', 'false')
        }
        if (line.startsWith('APP_ENV')) {
          line = 'APP_ENV=test'
        }
        if (line.startsWith('PORT')) {
          line = 'PORT=8001'
        }
        if (line.startsWith('LOG_COLORS')) {
          line = 'LOG_COLORS=false'
        }
        if (line.startsWith('REFRESH_COOKIE_OPTIONS')) {
          line = 'REFRESH_COOKIE_OPTIONS="SameSite=Strict"'
        }
      }

      await writer.write(new TextEncoder().encode(line + '\n'));
      // console.log(line);
    }
  } finally {
    // Only close if it hasn't been closed already
    if (!inFile.isClosed) {
      try {
        inFile?.close();
      } catch {
        // Ignore error if file is already closed
      }
    }
    await writer.close();
    if (!outFile.isClosed) {
      try {
        outFile?.close();
      } catch {
        // Ignore error if file is already closed
      }
    }
  }
}

// const name = prompt("What is your name?", "oscar");
// if (name) {
//   console.log(`Hello, ${name}!`);
// }

const confirmed = confirm("Please confirm creating a new copy of ", outFileName);
if (confirmed) {
  console.log("Creating new copy of ", outFileName);
  await processEnvFile();
} else if (confirmed === false) {
  console.log("Will not create new ", outFileName);
}