const nodemailer = require('nodemailer')

const createTransporter = () => {
  return nodemailer.createTransport({
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
    connectionTimeout: 15000,
    greetingTimeout: 15000,
    socketTimeout: 15000,
    pool: false
  })
}

const sendEmail = async (to, subject, html) => {
  const transporter = createTransporter()
  
  try {
    const info = await transporter.sendMail({
      from: `"PingMe" <${process.env.SMTP_USER}>`,
      to: to,
      subject: subject,
      html: html
    })
    console.log('Email sent successfully:', 
      info.messageId)
    transporter.close()
    return { success: true }
    
  } catch (error) {
    console.error('Email send error:', 
      error.message)
    console.error('Error code:', error.code)
    console.error('Error response:', 
      error.response)
    transporter.close()
    throw error
  }
}

module.exports = { sendEmail }
