import 'jsr:@std/dotenv/load'
import { createEmailPayload, sendTestEmail } from './util/mail.ts'

const payload = createEmailPayload({
  email: 'grant@grantoz.io',
  name: 'Grant Ozolins'
})

sendTestEmail(payload);
