export const sendTestEmail = async () => {
  const payload = {
    Attachments: [],
    Bcc: [],
    Cc: [],
    From: {
      Name: "Oscar",
      Email: "oscar@grantoz.io"
    },
    HTML: "<div style=\"text-align:center\"><p style=\"font-family: arial; font-size: 24px;\">Hello</p></div>",
    Subject: "Mailpit message via the HTTP API",
    Tags: ["test", "mailpit"],
    Text: "Welcome to Oscar!",
    To: [
      {
        Email: "jane@example.com",
        Name: "Jane Doe"
      }
    ]
  };
  console.log(payload)

  await fetch('http://localhost:8025/api/v1/send', {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  })
  .then(function(res){ return res.json() })
  .then(function(data){ 
    console.log(data) 
  })



  // const data = new FormData();
  // data.append("json", JSON.stringify(payload));
  // await fetch("http://localhost:8025/api/v1/send",  // Replace with your Mailpit API URL
  // {
  //     method: "POST",
  //     body: data
  // })
  // .then(function(res){ return res.json() })
  // .then(function(data){ 
  //   console.log(data) 
  // })
}