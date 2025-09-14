import { encodeBase64 } from "@std/encoding/base64";
import { TextLineStream } from "@std/streams";

// Generate 64 cryptographically secure random bytes
const randomBytes = crypto.getRandomValues(new Uint8Array(64));

// Encode the random bytes to a Base64 string
const jwtSecret = encodeBase64(randomBytes);
console.log(jwtSecret);


async function processEnvFile() {
  const cwd = Deno.cwd();
  console.log(`Current working directory: ${cwd}`);
  const inFile = await Deno.open(cwd + '/env/.env.dev');
  const outFile = await Deno.create(cwd + '/.env');
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

      await writer.write(new TextEncoder().encode(line + '\n'));
      // Process each line here
      console.log(line);
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

const confirmed = confirm("Are you sure you want to proceed?");
if (confirmed) {
  console.log("Proceeding...");
  await processEnvFile();
} else if (confirmed === false) {
  console.log("Aborting.");
}