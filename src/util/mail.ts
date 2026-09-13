// const payload = {
//   Attachments: [],
//   Bcc: [],
//   Cc: [],
//   From: {
//     Name: "Oscar",
//     Email: "oscar@grantoz.io"
//   },
//   HTML: "<div style=\"text-align:center\"><p style=\"font-family: arial; font-size: 24px;\">Welcome</p></div>",
//   Subject: "Mailpit message via the HTTP API",
//   // Tags: ["test", "mailpit"],
//   Text: "Welcome to Oscar!",
//   To: [
//     {
//       Email: "jane@example.com",
//       Name: "Jane Doe"
//     }
//   ]
// };

export const mailpitURL = 'http://localhost:8025/api/v1/send'

export interface mailpitEmailPerson {
  Email: string
  Name: string
}

export interface mailpitAttachment {
  Content: string
  ContentID: string
  ContentType: string
  Filename: string
}

export interface mailpitPayload {
  Attachments?: mailpitAttachment[]
  Bcc?: mailpitEmailPerson[]
  Cc?: mailpitEmailPerson[]
  From: mailpitEmailPerson
  HTML?: string
  Subject: string
  Tags?: string[]
  Text: string
  To: mailpitEmailPerson[]
}

export interface emailRecipient {
  email: string
  name: string
}

export const createEmailPayload = (recipient: emailRecipient) => {
  const emailPayload: mailpitPayload = {
    Attachments: [],
    Bcc: [],
    Cc: [],
    From: {
      Name: 'Oscar',
      Email: 'oscar@grantoz.io',
    },
    HTML:
      '<div style="text-align:center"><p style="font-family: arial; font-size: 24px;">Welcome</p></div>',
    Subject: 'Welcome to Oscar!',
    Tags: ['test', 'dev', 'oscar', 'mailpit'],
    Text: 'Welcome to Oscar!',
    To: [
      {
        Email: recipient.email,
        Name: recipient.name,
      },
    ],
  }
  return emailPayload
}

export const sendTestEmail = async (payload: mailpitPayload) => {
  console.log(payload)

  await fetch('http://localhost:8025/api/v1/send', {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })
    .then(function (res) {
      return res.json()
    })
    .then(function (data) {
      console.log(data)
    })
}
