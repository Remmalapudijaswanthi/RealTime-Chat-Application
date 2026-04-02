const nodemailer = require('nodemailer')

const createTransporter = () => {
  return nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false, // STARTTLS — required for Railway (port 465 is blocked)
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    },
    tls: {
      rejectUnauthorized: false,
      minVersion: 'TLSv1.2'
    },
    connectionTimeout: 60000,
    greetingTimeout: 60000,
    socketTimeout: 60000,
    pool: false,
    logger: false,
    debug: false
  })
}

const sendEmail = async (to, subject, html, retries = 2) => {
  let lastError = null
  
  for (let attempt = 1; attempt <= retries; attempt++) {
    const transporter = createTransporter()
    
    try {
      console.log(`Email attempt ${attempt}/${retries} to ${to}`)
      console.log('SMTP_USER:', process.env.SMTP_USER ? 'SET' : 'NOT SET')
      console.log('SMTP_PASS:', process.env.SMTP_PASS ? 'SET' : 'NOT SET')
      
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
      lastError = error
      console.error(`Email attempt ${attempt} failed:`, 
        error.message)
      console.error('Error code:', error.code)
      console.error('Error response:', 
        error.response)
      transporter.close()
      
      // If auth error, don't retry
      if (error.code === 'EAUTH') {
        throw error
      }
      
      // Wait before retry
      if (attempt < retries) {
        console.log(`Waiting 2s before retry...`)
        await new Promise(r => setTimeout(r, 2000))
      }
    }
  }
  
  throw lastError
}

module.exports = { sendEmail }
