const nodemailer = require('nodemailer')

const transporter = nodemailer.createTransport({
  service: 'gmail',
  host: 'smtp.gmail.com',
  port: 465,
  secure: true,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  },
  tls: {
    rejectUnauthorized: false
  },
  connectionTimeout: 10000,
  greetingTimeout: 10000,
  socketTimeout: 10000
})

transporter.verify((error) => {
  if (error) {
    console.error('SMTP connection failed:',
      error.message)
    console.error('SMTP_USER is',
      process.env.SMTP_USER ? 'SET' : 'NOT SET')
    console.error('SMTP_PASS is',
      process.env.SMTP_PASS ? 'SET' : 'NOT SET')
  } else {
    console.log('SMTP ready to send emails ✓')
  }
})

module.exports = transporter

